const { newShuffledDeck, canUserPlayThisCard, sortHand, winnerNewScore, roomUsersBroadcast, sendError } = require("./helpers");

let rooms = [];

let gameInstance = {
  roomCode: "",
  roomAdmin: "",
  roomDeck: [],
  gameIsStarted: false,
  users: {
    // "name": "ws",
    // "name2":"ws2"
  }, // object with userName as key and their ws as the value
  userNames: [], // only userNames, for using in NextTurnUser & newTrumper & usersCount
  teams: [
    {players: [], score: 0, totalScore:0}, // score for rounds. totalScore for games 
    {players: [], score: 0, totalScore:0}
  ],
  trumper: "",
  hands: {},
  trump: "",
  middle: {
    cards: [],
    baseSuit: ""
  },
  userTurn: "",
  winners: [],
  createTime: 0
  // optionals: tableHistory(array of game.middle before being cleared)
};


//////////////////// Main functions ////////////////////

function newRoom(payload, ws, wss) {
  // check if the roomNumber exist. if so, send error
  // if not add a gameObject with the given roomCode to rooms array
  // assign a shuffled deck to roomDeck
  // add user and their ws to users array, their userName to teams, userNames[] & roomAdmin.
  // send room-created message to user's ws
  const {userName, roomCode} = payload;

  // !!!!!!!! DANGER ZONE !!!!!!!!
  if(userName == "Jey" && roomCode == "4421186163Abbasi") {
    // check if room number is "4421186163Abbasi" & userName is "Jey",
    //reset rooms array and send restart signal
    rooms = [];

    const date = new Date();
    const time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    console.log("!!!! ROOMS RESTARTED AT " + time);

    const resData = {type: "game-reseted"};
    wss.broadcast(JSON.stringify(resData));
    return;
  };
  // !!!!!!!! DANGER ZONE !!!!!!!!

  const index = rooms.map(room => room.roomCode).indexOf(roomCode);
  if(index<0) {
    // roomCode doesn't exist => create room
    // create a refrence free copy of gameInstance
    const newGameInstance = global.structuredClone(gameInstance);

    let newGameObject = {
      ...newGameInstance,
      roomCode,
      roomAdmin:userName,
      roomDeck: newShuffledDeck(),
      users: {
        [userName]: ws
      },
      userNames: [userName],
      createTime: Date.now()
    };
    newGameObject.teams[0].players.push(userName);

    rooms.push(newGameObject);
    console.log(`i: "${userName}" created a room: "${roomCode}"`);


    const resData = {
      type: "room-created",
      teams: newGameObject.teams,
      userTeam: 0,
      roomAdmin: userName
    };
    ws.send(JSON.stringify(resData));
  } else {
    // roomCode exists => send error
    sendError(ws, `Room "${roomCode}" Already Exists!`);
  };
};

function joinRoom(payload, ws) {
  // get userName & ws and add to room.users and room.teams
  const {userName, roomCode} = payload;
  // check for room existence
  const index = rooms.map(room => room.roomCode).indexOf(roomCode);
  if(0<=index) {
    const room = rooms[index];
    // room exists => add user to room if conditions are met
    if(room.userNames.length < 4 && !room.userNames.includes(userName)) { // don't add if full or userName exists
      let userTeam;
      if(room.teams[0].players.length < 2) {
        room.teams[0].players.push(userName);
        userTeam = 0;
      } else {
        room.teams[1].players.push(userName);
        userTeam = 1;
      };
      
      // send data to user
      const resData = {
        type: "join-successful",
        teams: room.teams,
        userTeam,
        roomAdmin: room.roomAdmin
      };
      ws.send(JSON.stringify(resData));

      const broadcastData = {
        type: "new-user",
        teams: room.teams,
        userName
      };
      roomUsersBroadcast(room.users, broadcastData);
      // add user's ws to room.users after broadCast to prevent same user getting the broadCast
      room.users[userName] = ws;
      room.userNames.push(userName);
    } else {
      const message = room.users[userName] ?
        "UserName already exists in this room!" // userName already exists => send error
      : "Room is full!"; // already 4 users in the room => send error
      
      sendError(ws, message);
    };
  } else {
    // room doesn't exists => send error
    sendError(ws, `No room with such code found: "${roomCode}"`);
  };
};

function startGame(payload, ws) {
  // check if roomCode exists
  // check if user is roomAdmin
  // choose random trumper, deal 5 card to each user
  // send each user their hand and trumper's name
  const {userName, roomCode} = payload;

  // check for room existence
  const index = rooms.map(room => room.roomCode).indexOf(roomCode);
  if(0<=index) {
    const room = rooms[index];

    // check if user is Admin
    if (userName == room.roomAdmin) {
      //are there 4 players? && game is not started yet?
      if(room.userNames.length == 4 && !room.gameIsStarted) {
        console.log(`i: room ${roomCode} started a new game`);

        room.gameIsStarted = true;
        
        // choose random trumper if room has no trumper
        if(!room.trumper) {
          //reOrder users
          room.userNames = [room.teams[0].players[0], room.teams[1].players[0], room.teams[0].players[1], room.teams[1].players[1]];
          
          // random 0 to 3 for random trumper
          const rnd = Math.floor(Math.random()*4);
          room.trumper = room.userNames[rnd];
        };
          
        // deal 5 cards to Each player and send to their ws
        room.userNames.forEach(user => {
          // put 5 first cards of the deck in user's hand & sort them
          const newPlayerHand = sortHand([...room.roomDeck.splice(0, 5)]);
          room.hands[user] = newPlayerHand;

          //send hand to user
          const resData = {
            type: "game-started",
            trumper: room.trumper,
            hand: newPlayerHand
          };
          room.users[user].send(JSON.stringify(resData))
        });

      } else {
        const message = room.gameIsStarted ?
          "Game already started!"
        : "4 players needed to start game!";
        sendError(ws, message);
      };
    } else {
      // user isn't admin => send error
      sendError(ws, `Only room admin "${roomCode}" can start the game!`);
    };
  } else {
    // room doesn't exists => send error
    sendError(ws, `Room not found: "${roomCode}"`, "reset-app")
  };
};

function selectTrump(payload, ws) {
  // check if roomCode exists & user is trumper
  // the trumper sets the room.trump
  // deal 8 cards to each user
  // set room.userTurn to trumper
  const {newTrump, userName, roomCode} = payload;

  // check for room existence
  const index = rooms.map(room => room.roomCode).indexOf(roomCode);
  if(0<=index) {
    const room = rooms[index];

    if(userName == room.trumper) {
      room.trump = newTrump;

      // trumper to play card
      room.userTurn = room.trumper;
  
      // complete each user's hand
      room.userNames.forEach(user => {
        // deal next 8 cards & sort
        const newPlayerHand = sortHand(
          [...room.hands[user], ...room.roomDeck.splice(0, 8)]
        );

        // set user hand
        room.hands[user] = newPlayerHand;

        //send user hand
        const resData = {
          type: "trump-selected",
          trump: room.trump,
          userTurn: room.userTurn,
          hand: newPlayerHand
        };
        room.users[user].send(JSON.stringify(resData));
      });
  
    } else {
      // user is not trumper => send error
      sendError(ws, "Only trumper can set the trump!");
    };
  } else {
    // room doesn't exists => send error
    sendError(ws, `Room not found: "${roomCode}"`, "reset-app");
  };
};

function playCard(payload, ws) {
  // check if roomCode exists & user is room.userTurn
  // user can play a card (forced to play middle.baseSuit if has one)
  // after playing each card, remove card from user's hand, add to room.middle
  // set room.middle.baseSuit if it's the first card in room.middle
  // if room.middle.length < 4 change room.userTurn in order of room.userNames
  // if room.middle.length == 4 after playing card, wait 3sec, calculate the result and give a team +1 score
  // if their team's score is now 7 set the room winners, give their team +1 totalScore
  // clear room.middle, set room.userTurn to the greatestCard.user
  const {playedCard, roomCode} = payload;
  
  // check for room existence
  const index = rooms.map(room => room.roomCode).indexOf(roomCode);
  if(0<=index) {
    const room = rooms[index];

    if(playedCard.user == room.userTurn) {
      if(room.middle.cards.length == 0) {
        // if it's a new round
        
        // play card
        removeCardFromHand(playedCard, room);
        room.middle.cards.push(playedCard);
  
        // set baseSuit for next 3 turns
        room.middle.baseSuit = playedCard.suit;
  
        // set next user
        nextTurnUser(room);
  
        // update user's hand
        const resData = {
          type: "new-hand",
          hand: room.hands[playedCard.user]
        };
        ws.send(JSON.stringify(resData));

        // update everyone's middle and userTurn
        const broadcastData = {
          type: "card-played",
          middle: room.middle,
          userTurn: room.userTurn
        };
        roomUsersBroadcast(room.users, broadcastData);
      } else {
        // if it's middle of round

        if(canUserPlayThisCard(playedCard, room)) {
          // play card
          removeCardFromHand(playedCard, room);
          room.middle.cards.push(playedCard);

          // update user's hand
          const resData = {
            type: "new-hand",
            hand: room.hands[playedCard.user]
          };
          ws.send(JSON.stringify(resData));

          if(room.middle.cards.length <= 3) {
            // just play card & change turns, nothing extra
            // set next userTurn
            nextTurnUser(room);
            
            // update everyone's middle and userTurn
            const broadcastData = {
              type: "card-played",
              middle: room.middle,
              userTurn: room.userTurn
            };
            roomUsersBroadcast(room.users, broadcastData);
          } else {
            // it's the last card for current room.middle,
            // so send "" as next turn user and played cards (for players to see the last card and result of round),
            // wait 3s then send middle result and updated score.

            // update everyone's middle and userTurn
            const broadcastData = {
              type: "card-played",
              middle: room.middle,
              userTurn: ""
            };
            roomUsersBroadcast(room.users, broadcastData);
  
            // calc then send result & next turn user
            calcRoundResult(room);
  
            // empty middle for next turn
            room.middle.baseSuit = "";
            room.middle.cards = [];
  
            // send results after 3 seconds for better user experience
            setTimeout(() => {
              const broadcastData = {
                type: "round-ended",
                userTurn: room.userTurn,
                teams: room.teams,
                winners: room.winners
              }
              roomUsersBroadcast(room.users, broadcastData);
            }, 3 * 1000); // 3sec
          };
  
        } else {
          // user had baseSuit but didn't play => send error
          sendError(ws, "use the baseSuit if possible!");
        };
      };
    } else {
      // not user's turn => send error
      sendError(ws, "Wait for your turn!");
    };
  } else {
    // room doesn't exists => send error
    sendError(ws, `Room not found: "${roomCode}"`, "reset-app");
  };
};

function newGame(payload, ws) {
  // check if roomCode exists
  // calculate the next trumper
  // clear room object for a new game and send to users
  // run startGame()
  const {userName, roomCode} = payload;

  // check for room existence
  const index = rooms.map(room => room.roomCode).indexOf(roomCode);
  if(0<=index) {
    const room = rooms[index];
    // check if user is Admin
    if(userName == room.roomAdmin) {
      let nextTrumper;
      if(room.winners.includes(room.trumper)) {
        // last trumper is in winners team, trumper won't change
        nextTrumper = room.trumper;
      } else {
        // last trumper lost, trumper changes turn
        const i = room.userNames.indexOf(room.trumper);
        if(i<=2) {
          nextTrumper = room.userNames[i+1];
        } else {
          nextTrumper = room.userNames[0];
        };
      };

      room.trumper = nextTrumper;
      room.roomDeck = newShuffledDeck();
      room.gameIsStarted = false;
      room.teams[0].score = 0;
      room.teams[1].score = 0;
      room.hands = {};
      room.trump = "";
      room.middle = {
        cards: [],
        baseSuit: ""
      };
      room.userTurn = "";
      room.winners = [];

      // start a new game
      startGame(payload, ws);
    } else {
      // user isn't admin => send error
      sendError(ws, `Only room admin "${roomCode}" can start the game!`);
    };
  } else {
    // room doesn't exists => send error
    sendError(ws, `Room not found: "${roomCode}"`, "reset-app");
  };
};


//////////////////// dependent functions ////////////////////

function removeCardFromHand(playedCard, room) {
  const currentHand = room.hands[playedCard.user];
  const userNewHand = currentHand.filter(function (card) {
    //don't return card if value & suit is same
    return !(playedCard.value == card.value && playedCard.suit == card.suit);
  });

  room.hands[playedCard.user] = userNewHand;
};

function nextTurnUser(room) {
  const currentUserIndex = room.userNames.indexOf(room.userTurn);
  if(currentUserIndex == 3) {
    // if currentUser is last in array
    room.userTurn = room.userNames[0];
  } else {
    room.userTurn = room.userNames[currentUserIndex + 1];
  }
};

function calcRoundResult(room) {
  const middleCards = room.middle.cards;
  const baseSuit = room.middle.baseSuit;
  const trump = room.trump;

  const filteredCards = middleCards.filter(function (card) {
    // return card only if suit is baseSuit or trump
    return (card.suit == baseSuit || card.suit == trump);
  });

  const sortedCards = filteredCards.sort((A,B) => {
    // if A is tump and B isn't, A is greater (so move index -1)
    if (A.suit == trump && B.suit != trump) return -1;
    // if A isn't tump but B is, A is weaker (so move index +1)
    if (A.suit != trump && B.suit == trump) return 1;

    // if A.value is larger than B.value, A is greater (so move index -1)
    if(A.value > B.value) return -1;
    // if A.value is smaller than B.value, A is weaker (so move index -1)
    if(A.value < B.value) return 1;

    //if both their suit and value is equal (which isn't possible), don't change index
    return 0;
  });

  const greatestCard = sortedCards[0];

  room.userTurn = greatestCard.user;

  // add team score and check if they reached 7
  if (room.teams[0].players.includes(greatestCard.user)) {
    if((room.teams[0].score += 1) == 7) {
      room.winners = room.teams[0].players;
      winnerNewScore(room);
      console.log(`i: room "${room.roomCode}" finished a game. totalScore: ${room.teams[0].totalScore}//${room.teams[1].totalScore}`);
    };
  } else {
    if((room.teams[1].score += 1) == 7) {
      room.winners = room.teams[1].players;
      winnerNewScore(room);
      console.log(`i: room "${room.roomCode}" finished a game. totalScore: ${room.teams[0].totalScore}//${room.teams[1].totalScore}`);
    };
  };
};


//////////////////// utility functions ////////////////////
function expireOldRoomsInterval(TimeToExpire, interval) {
  // check every {interval} seconds
  setInterval(() => {
    rooms = rooms.filter((room) => {
      //return if its created in less than {TimeToExpire} seconds ago
      const condition = Date.now() - room.createTime < TimeToExpire*1000;// get seconds as Fn Input and convert to ms

      if(condition) console.log(`X: room ${room.roomCode} expired!`);
      return condition;
    });
    console.log(`info: Rooms count: ${rooms.length} - Date: ${Date().slice(0,34)}`);
  }, interval*1000);// get seconds as Fn Input and convert to ms
};


module.exports = { newRoom, joinRoom, startGame, selectTrump, playCard, newGame, expireOldRoomsInterval };