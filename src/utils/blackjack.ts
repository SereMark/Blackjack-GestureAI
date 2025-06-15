import { Card, Rank, Suit } from "../types";

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, id: `${rank}-${suit}-${Math.random()}` });
    }
  }
  
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
};

export const calculateHandValue = (cards: Card[]): number => {
  let value = 0;
  let aces = 0;
  
  for (const card of cards) {
    if (card.rank === 'A') {
      value += 11;
      aces++;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      value += 10;
    } else {
      value += parseInt(card.rank);
    }
  }
  
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  
  return value;
};