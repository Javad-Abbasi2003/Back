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

function canUserPlayThisCard(playedCard) {
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

module.exports = {newShuffledDeck, canUserPlayThisCard};