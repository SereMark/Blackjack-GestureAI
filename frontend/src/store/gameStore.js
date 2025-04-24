import { create } from "zustand";
import {
  createDeck,
  shuffleDeck,
  calculateScore,
  dealInitialHands
} from "../utils/blackjackLogic";

export const useGameStore = create((set, get) => ({
  deck: [],
  dealerHand: [],
  playerHand: [],
  dealerScore: 0,
  playerScore: 0,
  playerMoney: 1000,
  bet: 0,
  gameState: "idle",
  setBet: (value) => set({ bet: value }),
  placeBet: () => {
    const { bet, playerMoney } = get();
    if (bet >= 1 && bet <= playerMoney) {
      const deck = shuffleDeck(createDeck());
      const { dealerHand, playerHand } = dealInitialHands(deck);
      set({
        deck,
        dealerHand,
        playerHand,
        dealerScore: calculateScore(dealerHand),
        playerScore: calculateScore(playerHand),
        gameState: "in_progress"
      });
    }
  },
  hit: () => {
    const { deck, playerHand } = get();
    if (!deck.length) return;
    const card = deck[0];
    const newDeck = deck.slice(1);
    const newPlayerHand = [...playerHand, card];
    const score = calculateScore(newPlayerHand);
    set({ deck: newDeck, playerHand: newPlayerHand, playerScore: score });
    if (score > 21) get().handleRoundOver("dealer");
  },
  stand: () => {
    const { deck, dealerHand } = get();
    let newDealerHand = [...dealerHand];
    let newDeck = [...deck];
    let dealerScore = calculateScore(newDealerHand);
    while (dealerScore < 17 && newDeck.length > 0) {
      newDealerHand.push(newDeck[0]);
      newDeck = newDeck.slice(1);
      dealerScore = calculateScore(newDealerHand);
    }
    set({ dealerHand: newDealerHand, deck: newDeck, dealerScore });
    get().decideWinner();
  },
  decideWinner: () => {
    const { dealerScore, playerScore } = get();
    if (dealerScore > 21) get().handleRoundOver("player");
    else if (dealerScore > playerScore) get().handleRoundOver("dealer");
    else if (dealerScore < playerScore) {
      if (playerScore <= 21) get().handleRoundOver("player");
      else get().handleRoundOver("dealer");
    } else get().handleRoundOver("push");
  },
  handleRoundOver: (winner) => {
    const { playerMoney, bet } = get();
    if (winner === "player") set({ playerMoney: playerMoney + bet });
    else if (winner === "dealer") set({ playerMoney: playerMoney - bet });
    set({ gameState: "round_over" });
  },
  newRound: () => {
    set({
      deck: [],
      dealerHand: [],
      playerHand: [],
      dealerScore: 0,
      playerScore: 0,
      bet: 0,
      gameState: "idle"
    });
  },
  resetGame: () => {
    set({
      deck: [],
      dealerHand: [],
      playerHand: [],
      dealerScore: 0,
      playerScore: 0,
      playerMoney: 1000,
      bet: 0,
      gameState: "idle"
    });
  }
}));