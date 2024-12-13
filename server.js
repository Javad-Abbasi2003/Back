const http = require("http");
const websocket = require("ws");
const { newRoom, joinRoom, startGame, selectTrump, playCard, newGame, expireOldRoomsInterval } = require("./game");

const server = http.createServer((req, res) => res.end("I am connected") );
const wss = new websocket.Server({ server });

//add the broadCast function for websocket
wss.broadcast = function(data) {
  wss.clients.forEach(client => client.send(data));
};

wss.on("connection", (ws, req) => {
  ws.on("message", (msg) => {
    handleWebSocketMessage(JSON.parse(msg), ws);
  });
});

function handleWebSocketMessage(msg, ws) {
  const { type, payload } = msg;
  switch (type) {
    case 'new-room':
      newRoom(payload, ws, wss);
      break;
    case 'join-room':
      joinRoom(payload, ws);
      break;
    case 'start-game':
      startGame(payload, ws);
      break;
    case 'select-trump':
      selectTrump(payload, ws);
      break;
    case 'play-card':
      playCard(payload, ws);
      break;
    // case 'remove-player':
    //   removePlayer(payload, ws); // remove the user from game.users
    //   break;
    case 'new-game':
      newGame(payload, ws);
      break;
    // case 'remove-room':
    //   removeRoom(payload, ws); // remove room from rooms if user is roomAdmin
    //   break;
    default:
      console.log('Unknown message type:', type);
  };
};

expireOldRoomsInterval(12*3600, 3600);// 12h, 1h

const port = 3000;
server.listen(port);

console.log(`API: \x1b[34m\x1b[4mhttp://localhost:${port}\x1b[0m\x1b[0m`);
console.log(`WS: \x1b[34m\x1b[4mws://localhost:${port}\x1b[0m\x1b[0m`);