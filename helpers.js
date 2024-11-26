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

function sortHand(hand) {
  const sortedhand = hand.sort((A,B) => {
    // sort by order of ♠>♥>♣>♦
    if (A.suit == "♠") return -1;

    if (A.suit == "♥" && B.suit != "♠") return -1;
    if (A.suit == "♥" && B.suit == "♠") return 1;

    if (A.suit == "♣" && B.suit == "♦") return -1;
    if (A.suit == "♣" && (B.suit == "♥" || B.suit == "♠")) return 1;

    if (A.suit == "♦") return 1;

    
    // if A.value is larger than B.value, A is greater (so move index -1)
    if(A.value > B.value) return -1;
    // if A.value is smaller than B.value, A is weaker (so move index -1)
    if(A.value < B.value) return 1;

    //if both their suit and value is equal (which isn't possible), don't change index
    return 0;
  });

  return sortedhand;
}

module.exports = {newShuffledDeck, canUserPlayThisCard, sortHand};