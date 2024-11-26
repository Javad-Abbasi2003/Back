const http = require("http");
const websocket = require("ws");
const { addPlayer, startGame, selectTrump, playCard, resetGame, newGame } = require("./game");

const server = http.createServer((req, res) => res.end("I am connected") );
const wss = new websocket.Server({ server });

//add the broadCast function for websocket
wss.broadcast = function(data) {
  wss.clients.forEach(client => client.send(data));
};

wss.on("connection", (ws, req) => {
  ws.on("message", (msg) => {
    const { type, payload } = JSON.parse(msg);
    handleWebSocketMessage(type, payload, ws);
  });
});

function handleWebSocketMessage(type, payload, ws) {
  switch (type) {
    case 'add-player':
      addPlayer(payload, ws, wss);
      break;
    case 'start-game':
      startGame(ws, wss);
      break;
    case 'select-trump':
      selectTrump(payload, ws, wss);
      break;
    case 'play-card':
      playCard(payload, ws, wss);
      break;
  //   case 'remove-player':
  //     removePlayer(payload, ws); // remove the user from game.users
  //     break;
    case 'reset-game':
      resetGame(ws, wss);
      break;
    case 'new-game':
      newGame(ws, wss);
      break;
    default:
      console.log('Unknown message type:', type);
  }
}

const port = 8000;
console.log(`listening on port ${port}...`)
server.listen(port);