import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as randtoken from 'rand-token';
import { AddressInfo } from 'net';
import db from './db';
import BingoGame from './bingo-model';
import Validation from './validation'
import * as cors from 'cors';

const app = express();

//In production nginx serves the frontend and proxies /api on the same origin, so CORS is only needed
//when the CRA dev server (another port) calls the backend directly
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
}

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

const validator = new Validation('cards.csv');

let getCurrentState = async (gameId: string) =>
  await BingoGame.findOne({gameId: gameId}).then(game => {
    return game;
  }).catch(() => {
    return null;
  })

app.use(express.json());

//Edit types here!
//Array of Arrays of strings: each array is displayed on a different line (max 2 lines)
app.get('/types', async (req, res) => {
  //return res.status(200).json([['b', 'i', 'n', 'g', 'o'], ['row', 'diag', 'corners', 'x', 'full']]);
  return res.status(200).json([['row', 'column', 'diag', 'corners']]);
  //return res.status(200).json([['full']]);
});

app.post('/validate', async (req, res) => {
  return res.status(200).json(validator.validate(parseInt(req.body.cardNumber), req.body.numbers, req.body.patterns));
});

app.post('/create', async (req, res) => {
  let code = randtoken.generate(12, "abcdefghijklnmopqrstuvwxyz0123456789");

  let schema = new BingoGame({gameId: req.body.gameId, code: code, isPublic: req.body.isPublic});
  if (!schema) {
    return res.status(200).json({ success: false, error: "Schema invalid" });
  }

  schema.save().then(() => {
    return res.status(200).json({ success: true, code: code });
  }).catch((error) => {
    return res.status(200).json({ success: false, error: error });
  });
});

app.get('/list', async (req, res) => {
  let isoMinLastUpdate = new Date(Date.now()-1000*86400*2).toISOString();
  BingoGame.find({isPublic: true, updatedAt: {$gte: new Date(isoMinLastUpdate)}}, 'gameId').then(games => {
    return res.status(200).json({ games: games.map(g => g.get('gameId')) });
  }).catch(err => {
    return res.status(400).json({ games: [], error: err });
  })
});

type Client = WebSocket & { gameId?: string, isAlive?: boolean };

//Fields a controller is allowed to push
const STATE_FIELDS = ['eventHistory', 'eventPosition', 'bingo', 'validationResult', 'validatedPatterns'];

//State sent to clients (never includes the control code)
let publicState = (game: any) => ({
  eventHistory: game.eventHistory,
  eventPosition: game.eventPosition,
  bingo: game.bingo,
  validationResult: game.validationResult,
  validatedPatterns: game.validatedPatterns,
  revision: game.revision ?? 0,
  lastPushId: game.lastPushId ?? null,
});

let send = (ws: WebSocket, msg: object) => {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
};

let handleRegister = async (ws: Client, msg: any) => {
  ws.gameId = String(msg.gameId);
  const game = await getCurrentState(ws.gameId);
  if (!game) return send(ws, { type: 'notFound' });
  send(ws, { type: 'state', state: publicState(game) });
};

let handlePush = async (ws: Client, msg: any) => {
  const gameId = String(msg.gameId);
  const code = String(msg.code);
  const baseRevision = Number(msg.baseRevision);
  if (!Number.isInteger(baseRevision) || typeof msg.pushId !== 'string' || typeof msg.state !== 'object' || msg.state === null) {
    return send(ws, { type: 'error', error: 'badRequest', pushId: msg.pushId });
  }

  const update: { [key: string]: unknown } = { revision: baseRevision + 1, lastPushId: msg.pushId };
  for (const field of STATE_FIELDS) {
    if (field in msg.state) update[field] = msg.state[field];
  }

  //Games created before revisions existed have no revision field
  const revisionFilter = baseRevision === 0 ? { $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { revision: baseRevision };
  const game = await BingoGame.findOneAndUpdate({ gameId, code, ...revisionFilter }, { $set: update }, { runValidators: true, returnDocument: 'after' });

  if (!game) {
    const current = await getCurrentState(gameId);
    if (!current) return send(ws, { type: 'notFound' });
    if (current.get('code') !== code) return send(ws, { type: 'error', error: 'unauthorized', pushId: msg.pushId });
    //Someone else pushed since this client's base revision
    return send(ws, { type: 'conflict', pushId: msg.pushId, state: publicState(current) });
  }

  const state = publicState(game);
  send(ws, { type: 'ack', pushId: msg.pushId, revision: state.revision });

  const broadcast = JSON.stringify({ type: 'state', state });
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN && (client as Client).gameId === gameId) {
      client.send(broadcast);
    }
  });
};

wss.on('connection', (ws: Client) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return send(ws, { type: 'error', error: 'badRequest' });
    }

    try {
      switch (msg?.action) {
        case 'register':
          await handleRegister(ws, msg);
          break;
        case 'push':
          await handlePush(ws, msg);
          break;
        case 'ping':
          send(ws, { type: 'pong' });
          break;
        default:
          send(ws, { type: 'error', error: 'unknownAction' });
      }
    } catch (err) {
      console.error(err);
      send(ws, { type: 'error', error: 'serverError', pushId: msg?.pushId });
    }
  });
});

//Terminate connections that stopped answering pings (sleeping phones, dropped networks)
const heartbeat = setInterval(() => {
  wss.clients.forEach(client => {
    const ws = client as Client;
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(heartbeat));

//start our server
server.listen(process.env.PORT || 8999, () => {
    const {port} = server.address() as AddressInfo;
    console.log(`Server started on port ${port} :)`);
});

//Close sockets on docker stop so clients see the disconnect immediately instead of after the kill timeout
let shutdown = () => {
  console.log('Shutting down');
  wss.clients.forEach(client => client.close(1001, 'Server shutting down'));
  wss.close();
  server.close(() => db.close().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
