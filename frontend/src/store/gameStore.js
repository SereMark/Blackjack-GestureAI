import { create } from "zustand";
import {
  fetchGameState,
  placeBet,
  hit as apiHit,
  stand as apiStand,
  newRound,
  resetGame as apiResetGame,
  fetchGesture,
  processGesture
} from "../api/gameApi";

export const useGameStore = create((set, get) => ({
  deck: [],
  dealerHand: [],
  playerHand: [],
  dealerScore: 0,
  playerScore: 0,
  playerMoney: 1000,
  bet: 0,
  gameState: "idle",
  controlMode: 'manual',
  error: null,
  isLoading: false,
  setBet: (value) => set({ bet: value }),
  placeBet: async () => {
    const { bet } = get();
    try {
      set({ isLoading: true, error: null });
      const gameState = await placeBet(bet);
      set({
        ...gameState,
        isLoading: false
      });
    } catch (error) {
      console.error('Error placing bet:', error);
      set({ isLoading: false, error: error.message });
    }
  },
  hit: async () => {
    try {
      set({ isLoading: true, error: null });
      const gameState = await apiHit();
      set({
        ...gameState,
        isLoading: false
      });
    } catch (error) {
      console.error('Error hitting:', error);
      set({ isLoading: false, error: error.message });
    }
  },
  stand: async () => {
    try {
      set({ isLoading: true, error: null });
      const gameState = await apiStand();
      set({
        ...gameState,
        isLoading: false
      });
    } catch (error) {
      console.error('Error standing:', error);
      set({ isLoading: false, error: error.message });
    }
  },
  processGestureCommand: async () => {
    try {
      const gesture = await fetchGesture();
      if (gesture !== 'idle') {
        set({ isLoading: true, error: null });
        const gameState = await processGesture(gesture);
        set({
          ...gameState,
          isLoading: false
        });
      }
      return gesture;
    } catch (error) {
      console.error('Error processing gesture:', error);
      set({ isLoading: false, error: error.message });
      return 'idle';
    }
  },
  newRound: async () => {
    try {
      set({ isLoading: true, error: null });
      const gameState = await newRound();
      set({
        ...gameState,
        isLoading: false
      });
    } catch (error) {
      console.error('Error starting new round:', error);
      set({ isLoading: false, error: error.message });
    }
  },
  resetGame: async () => {
    try {
      set({ isLoading: true, error: null });
      const gameState = await apiResetGame();
      set({
        ...gameState,
        isLoading: false
      });
    } catch (error) {
      console.error('Error resetting game:', error);
      set({ isLoading: false, error: error.message });
    }
  },
  
  initializeGame: async () => {
    try {
      set({ isLoading: true, error: null });
      const gameState = await fetchGameState();
      set({
        ...gameState,
        isLoading: false
      });
    } catch (error) {
      console.error('Error initializing game:', error);
      set({ isLoading: false, error: error.message });
    }
  },
  
  toggleControlMode: () => {
    const { controlMode } = get();
    const newMode = controlMode === 'manual' ? 'gesture' : 'manual';
    set({ controlMode: newMode });
  }
}));