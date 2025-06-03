import { create } from "zustand";
import {
  fetchGameState,
  placeBet,
  hit as apiHit,
  stand as apiStand,
  newRound,
  resetGame as apiResetGame,
  switchMode,
} from "../api/gameApi";

// Utility for async actions
const createAsyncAction = (apiCall, errorMessage) => async (set, get) => {
  try {
    set({ isLoading: true, error: null });
    const gameState = await apiCall();
    set({ ...gameState, isLoading: false });
  } catch (error) {
    set({ 
      isLoading: false, 
      error: error.message || errorMessage 
    });
  }
};

// Debounce utility for mode switching
let modeSwitchTimeout = null;

export const useGameStore = create((set, get) => ({
  // Game state
  dealerHand: [],
  playerHand: [],
  dealerScore: 0,
  playerScore: 0,
  playerMoney: 1000,
  bet: 0,
  gameState: "idle",
  winner: null,
  message: "",
  isBlackjack: false,
  roundsWon: 0,
  roundsLost: 0,
  roundsPushed: 0,
  
  // UI state
  controlMode: 'manual',
  error: null,
  isLoading: false,
  
  // Simple setters
  setBet: (value) => set({ bet: value }),
  clearError: () => set({ error: null }),
  toggleControlMode: async () => {
    const { controlMode, isLoading } = get();
    
    // Prevent rapid clicking while already switching
    if (isLoading) return;
    
    // Clear any pending mode switch
    if (modeSwitchTimeout) {
      clearTimeout(modeSwitchTimeout);
    }
    
    const newMode = controlMode === 'manual' ? 'gesture' : 'manual';
    
    // Debounce the mode switch to prevent rapid toggling
    modeSwitchTimeout = setTimeout(async () => {
      try {
        set({ isLoading: true, error: null });
        
        console.log(`Switching from ${controlMode} to ${newMode} mode...`);
        
        // Call backend to switch mode and reset gesture detector
        const response = await switchMode(newMode);
        
        console.log('Mode switch response:', response);
        
        // Update frontend state
        set({ controlMode: newMode, isLoading: false });
        
        console.log(`Successfully switched to ${newMode} mode`);
      } catch (error) {
        console.error('Mode switch error:', error);
        set({ 
          error: `Failed to switch to ${newMode} mode. Please try again.`,
          isLoading: false 
        });
      }
    }, 100);
  },
  
  // Bet action with validation
  placeBet: async () => {
    const { bet } = get();
    if (bet <= 0) {
      set({ error: "Bet amount must be greater than 0" });
      return;
    }
    
    await createAsyncAction(
      () => placeBet(bet), 
      "Failed to place bet. Please try again."
    )(set, get);
  },
  
  // Game actions
  hit: () => createAsyncAction(
    apiHit, 
    "Failed to hit. Please try again."
  )(set, get),
  
  stand: () => createAsyncAction(
    apiStand, 
    "Failed to stand. Please try again."
  )(set, get),
  
  newRound: () => createAsyncAction(
    newRound, 
    "Failed to start new round. Please try again."
  )(set, get),
  
  resetGame: () => createAsyncAction(
    apiResetGame, 
    "Failed to reset game. Please try again."
  )(set, get),
  
  initializeGame: () => createAsyncAction(
    fetchGameState, 
    "Failed to initialize game. Please check your connection."
  )(set, get),
}));