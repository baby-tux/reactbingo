import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
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

wss.on('connection', (ws: WebSocket) => {

    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {

        //log the received message and send it back to the client
        //console.log('received: %s', message);
        //ws.send(`Hello, you sent -> ${message}`);
        //send back the message to the other clients
        let game = JSON.parse(message);
        game.gameId = 1;

        BingoGame.findOneAndUpdate({gameId: 1}, game, {upsert: true, runValidators: true, useFindAndModify: false}, (err: any, doc: any) => {
          if (!err) {
            wss.clients
                .forEach(client => {
                    if (client != ws) {
                        client.send(message);
                    }
                });
          } else {
            console.log(err)
          }
        })
    });

    //send immediatly a feedback to the incoming connection
    getCurrentState(1).then(s => ws.send(JSON.stringify(s)));
});

//start our server
server.listen(process.env.PORT || 8999, () => {
    const {port} = server.address() as AddressInfo;
    console.log(`Server started on port ${port} :)`);
});
