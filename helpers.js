const newShuffledDeck = () => {
  const suits = ["♥", "♦", "♣", "♠"];
  const names = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

  const cards = [];

  for (let suit of suits) {
    for (let i=0; i<names.length; i++) {
      cards.push({suit, name: names[i], value: i});
    };
  };

  cards.sort(() => Math.random() - 0.5);

  return cards;
};

function canUserPlayThisCard(playedCard, room) {
  const userHand = room.hands[playedCard.user];
  if(playedCard.suit !== room.middle.baseSuit) {
    // user didn't played baseSuit

    // check if user has baseSuit in hand?
    const i = userHand.findIndex((card => card.suit == room.middle.baseSuit));
    if (i > -1) return false;// user Had the baseSuit but didn't played it!
  };
  return true;
};

function sortHand(hand) {
  // divide cards by suit
  const spades = hand.filter(card => card.suit == "♠");
  const hearts = hand.filter(card => card.suit == "♥");
  const clubs = hand.filter(card => card.suit == "♣");
  const diamonds = hand.filter(card => card.suit == "♦");

  // sort each suit
  spades.sort((A,B)=> B.value-A.value);
  hearts.sort((A,B)=> B.value-A.value);
  clubs.sort((A,B)=> B.value-A.value);
  diamonds.sort((A,B)=> B.value-A.value);

  // concat suits for full hand (change order for a better divide of colors)
  if(!hearts.length) {
    return [...spades, ...diamonds, ...clubs];
  } else if(!clubs.length) {
    return [...hearts, ...spades, ...diamonds];
  } else {
    return [...spades, ...hearts, ...clubs, ...diamonds];
  };
};

function winnerNewScore(room) {
  const {trumper, teams} = room;
  const winnerTeamIndex = (teams[0].score == 7) ? 0 : 1;
  const loserTeamIndex = (teams[0].score == 7) ? 1 : 0;
  if (teams[loserTeamIndex].score == 0) {
    // it's flawless win
    if(teams[loserTeamIndex].players.includes(trumper)) {
      // flawless against trumper !!
      room.teams[winnerTeamIndex].totalScore += 3;
    } else {
      // trumper flawlessed
      room.teams[winnerTeamIndex].totalScore += 2;
    };
  } else {
    // regular win +1 score
    room.teams[winnerTeamIndex].totalScore += 1;
  };
};

function roomUsersBroadcast(users, broadcastData) {
  // get object of user:ws and send data each user
  const objKeys = Object.keys(users);
  objKeys.map(userName => {
    users[userName].send(JSON.stringify(broadcastData));
  });
};

function sendError(ws, message, callback="") {
  const resData = {
    type: "error",
    message,
    callback
  };
  ws.send(JSON.stringify(resData));
};

module.exports = {newShuffledDeck, canUserPlayThisCard, sortHand, winnerNewScore, roomUsersBroadcast, sendError};