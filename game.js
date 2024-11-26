const { newShuffledDeck, canUserPlayThisCard, sortHand } = require("./helpers");

let Deck = newShuffledDeck();
let game = {
  gameIsStarted: false,
  users: [],
  teams: [{players: [], score: 0}, {players: [], score: 0}],
  trumper: "",
  hands: {},
  trump: "",
  middle: {
    cards: [],
    baseSuit: ""
  },
  userTurn: "",
  winners: null,
  // optionals: tableHistory(array of game.middle before being cleared)
}

//////////////////// Main functions ////////////////////

// get userName and add to game.users and game.teams
function addPlayer(payload, ws, wss) {
  const {userName} = payload;

  if(game.users.length < 4 && !game.users.includes(userName)){ // don't add if full or userName exists
    game.users.push(userName);

    let userTeam;

    if(game.teams[0].players.length < 2) {
      game.teams[0].players.push(userName);
      userTeam = 0;
    } else {
      game.teams[1].players.push(userName);
      userTeam = 1;
    }
    
    // data to send to user
    const resData = {
      type: "new-player",
      userName,
      users: game.users,
      teams: game.teams,
      userTeam
    };
    // wss for broadcasting data
    wss.broadcast(JSON.stringify(resData));
  } else if(game.users.includes(userName)) {
    //userName already exists
    const resData = {
      type: "error",
      message: "UserName Already Exists!"
    };
    ws.send(JSON.stringify(resData));
  } else {
    // already 4 users in the game
    const resData = {
      type: "error",
      message: "Lobby is full!"
    };
    ws.send(JSON.stringify(resData));
  }
};

// shuffle deck,choose random trumper, deal 5 card to each user
function startGame(ws, wss) {
  //no payload needed

  //are there 4 players? && game is not started yet?
  if(game.users.length == 4 && !game.gameIsStarted) {
    Deck = newShuffledDeck();

    // random 0 to 3 for random trumper
    const rnd = Math.floor(Math.random()*4);
    game.trumper = game.users[rnd];
    
    // deal 5 cards forEach player
    game.users.forEach(user => {
      // put 5 first cards of the deck in user's hand & sort them
      const newPlayerHand = sortHand([...Deck.splice(0, 5)]);
      game.hands[user] = newPlayerHand;
    });

    const resData = {
      type: "game-started",
      trumper: game.trumper,
      hands: game.hands
    }
    wss.broadcast(JSON.stringify(resData));

  } else {
    const message = game.gameIsStarted ? "Game Already Started!" : "4 players needed to start game!"
    const resData = {
      type: "error",
      message
    }
    ws.send(JSON.stringify(resData));
  }
}

// the trumper sets the game.trump, deal 8 cards to each user, set game.userTurn to trumper
function selectTrump(payload, ws, wss) {
  const {newTrump, userName} = payload;

  if(userName == game.trumper) {
    game.trump = newTrump;

    // complete each user's hand
    game.users.forEach(user => {
      // deal & sort next 8 cards
      const newPlayerHand = sortHand([...game.hands[user], ...Deck.splice(0, 8)]);
      // set player hand
      game.hands[user] = newPlayerHand;
    });

    // trumper to play
    game.userTurn = game.trumper;

    const resData = {
      type: "trump-selected",
      trump: game.trump,
      userTurn: game.userTurn,
      hands: game.hands
    };
    wss.broadcast(JSON.stringify(resData));

  } else {
    const resData = {
      type: "error",
      message: "only trumper can set the trump!"
    };
    ws.send(JSON.stringify(resData));
  }
}

//  user that's game.userTurn can play a card (forced to play middle.baseSuit if has one).
//after playin each card, remove card from user, add to game.cardInMiddle,
//change game.userTurn to users[users.indexOf(game.userTurn) + 1] (if the index is >3 set it to 0).
//  if cardsInMiddle gets 4 after action, wait 3 sec, calculate the greatest cardInMiddle,
//  give their team an score, if their team score is now 7 set the game winners, clear cardsInMiddle,
//  set game.userTurn to the greatest card owner.
function playCard(payload, ws, wss) {
  const {playedCard} = payload;

  if(playedCard.user == game.userTurn) {

    if(game.middle.cards.length == 0) {
      // if it's a new 
      
      // play card
      removeCardFromHand(playedCard);
      game.middle.cards.push(playedCard);

      // set baseSuit for next 3 turns
      game.middle.baseSuit = playedCard.suit;

      // set next user
      nextTurnUser();

      const resData = {
        type: "card-played",
        hands: game.hands,
        middle: game.middle,
        userTurn: game.userTurn
      }
      wss.broadcast(JSON.stringify(resData));

    } else {
      // if it's middle of round
      if(canUserPlayThisCard(playedCard, game)) {
        // play card
        removeCardFromHand(playedCard);
        game.middle.cards.push(playedCard);

        if(game.middle.cards.length <= 3) {
          // just play card & change turns, nothing extra
          // set next user
          nextTurnUser();
          
          const resData = {
            type: "card-played",
            hands: game.hands,
            middle: game.middle,
            userTurn: game.userTurn
          }
          wss.broadcast(JSON.stringify(resData));

        } else {
          // it's the last card for current game.middle,
          // so send "" as next turn user and played cards (for players to see the last card and result of round),
          //wait 3s then send middle result and updated score.
          const resData = {
            type: "card-played",
            hands: game.hands,
            middle: game.middle,
            userTurn: ""
          }
          wss.broadcast(JSON.stringify(resData));

          // calc then send result & next turn user
          calcRoundResult();

          // empty middle for next turn
          game.middle.baseSuit = "";
          game.middle.cards = [];

          // send results after 3 seconds for better user experience
          setTimeout(() => {
            const resData = {
              type: "round-ended",
              middle: game.middle,
              userTurn: game.userTurn,
              teams: game.teams,
              winners: game.winners
            }
            wss.broadcast(JSON.stringify(resData));
          }, 3 * 1000); // 3sec
        }

      } else {
        const resData = {
          type: "error",
          message: "use The baseSuit if possible!"
        };
        ws.send(JSON.stringify(resData));
      };
    };

  } else {
    const resData = {
      type: "error",
      message: "Wait for your turn!"
    }
    ws.send(JSON.stringify(resData));
  }
}

//reset game Object
function resetGame(ws, wss) {
  game = {
    users: [],
    teams: [{players: [], score: 0}, {players: [], score: 0}],
    trumper: "",
    hands: {},
    trump: "",
    middle: {
      cards: [],
      baseSuit: ""
    },
    userTurn: "",
    winners: null,
  }

  const date = new Date();
  const time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
  console.log("Game ReStarted at " + time);

  const resData = {
    type: "game-reseted"
  }
  wss.broadcast(JSON.stringify(resData));
}

//////////////////// dependent functions ////////////////////

function nextTurnUser() {
  const currentUserIndex = game.users.indexOf(game.userTurn);
  if(currentUserIndex == 3) {
    // if currentUser is last in array
    game.userTurn = game.users[0];
  } else {
    game.userTurn = game.users[currentUserIndex + 1];
  }
}

function removeCardFromHand(playedCard) {
  const currentHand = game.hands[playedCard.user];
  const userNewHand = currentHand.filter(function (card) {
    //don't return card if value & suit is same
    return !(playedCard.value == card.value && playedCard.suit == card.suit);
  });

  game.hands[playedCard.user] = userNewHand;
};

function calcRoundResult() {
  const middleCards = game.middle.cards;
  const baseSuit = game.middle.baseSuit;
  const trump = game.trump;

  middleCards.filter(function (card) {
    // return card only if suit is baseSuit or trump
    return (card.suit == baseSuit || card.suit == trump);
  });

  const sortedCards = middleCards.sort((A,B) => {
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


  game.userTurn = greatestCard.user;

  // add team score and check if they reached 7
  if (game.teams[0].players.includes(greatestCard.user)) {
    if((game.teams[0].score += 1) == 7) {
      game.winners = game.teams[0].players;
    }
  } else {
    if((game.teams[1].score += 1) == 7) {
      game.winners = game.teams[1].players;
    }
  };
};


module.exports = { addPlayer, startGame, selectTrump, playCard, resetGame };