export function createDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  let deck = [];
  for (let s of suits) {
    for (let r of ranks) {
      deck.push({ rank: r, suit: s });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function calculateScore(hand) {
  let total = 0;
  let aces = 0;
  for (let c of hand) {
    if (c.rank === "A") {
      total += 11;
      aces++;
    } else if (["K","Q","J"].includes(c.rank)) {
      total += 10;
    } else {
      total += parseInt(c.rank);
    }
  }
  while (aces > 0 && total > 21) {
    total -= 10;
    aces--;
  }
  return total;
}

export function dealInitialHands(deck) {
  const playerHand = deck.slice(0, 2);
  const dealerHand = deck.slice(2, 4);
  return { playerHand, dealerHand };
}