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

function canUserPlayThisCard(playedCard, game) {
  const userHand = game.hands[playedCard.user];
  if(playedCard.suit == game.middle.baseSuit) {
    // user played baseSuit, so it's okay.
    return true;
  } else {
    // check if user has baseSuit in hand?
    const i = userHand.findIndex((card => card.suit == game.middle.baseSuit));
    if (i > -1) {
      // user Had the baseSuit but didn't played it!
      return false;
    } else {
      // user doesn't have baseSuit so he can play other suits.
      return true;
    }
  };
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

module.exports = {newShuffledDeck, canUserPlayThisCard, sortHand};