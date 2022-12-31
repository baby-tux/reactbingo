import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import * as randtoken from 'rand-token';
import { AddressInfo } from 'net';
import db from './db';
import BingoGame from './bingo-model';
import Validation from './validation'

const app = express();

db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//initialize a simple http server
const server = http.createServer(app);

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

const validator = new Validation('cards.csv');

let getCurrentState = async (gameId: Number) =>
  await BingoGame.findOne({gameId: gameId}, (err: any, game: Document) => {
    if (!err) {
      return game;
    } else {
      return null;
    }
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
  BingoGame.find({isPublic: true, updatedAt: {$gte: new Date(isoMinLastUpdate)}}, 'gameId', (err, games) => {
    if (err) {
      return res.status(400).json({ games: [], error: err });
    }

    return res.status(200).json({ games: games.map(g => g.get('gameId')) });
  }).catch(err => console.error(err));
});

wss.on('connection', (ws: WebSocket) => {
    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {

        //log the received message and send it back to the client
        //console.log('received: %s', message);
        //ws.send(`Hello, you sent -> ${message}`);
        //send back the message to the other clients
        let msgObj = JSON.parse(message);
        switch (msgObj.action) {
          case "register":
            (ws as any).gameId = msgObj.gameId;
            //send current game state
            getCurrentState(msgObj.gameId).then(s => ws.send(JSON.stringify(s)));
            break;
          case "push":
            BingoGame.findOneAndUpdate({gameId: msgObj.gameId, code: msgObj.code}, msgObj.state, {upsert: false, runValidators: true, useFindAndModify: false}, (err: any, doc: any) => {
              if (!err) {
                wss.clients
                  .forEach(client => {
                    if (client != ws && client.readyState === WebSocket.OPEN && (client as any).gameId == msgObj.gameId) {
                      client.send(JSON.stringify(msgObj.state));
                    }
                  });
              } else {
                console.error(err);
              }
            })
            break;
        }
    });
});

//start our server
server.listen(process.env.PORT || 8999, () => {
    const {port} = server.address() as AddressInfo;
    console.log(`Server started on port ${port} :)`);
});
