import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState } from '../types';
import { GAME_CONFIG } from '../constants';
import { createDeck, calculateHandValue } from '../utils/blackjack';
import { soundManager } from '../lib/soundManager';

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      balance: GAME_CONFIG.initialBalance,
      bet: 50,
      deck: [],
      playerCards: [],
      dealerCards: [],
      phase: 'waiting',
      dealerRevealed: false,
      message: 'Place your bet to start',
      lastResult: null,
      isAnimating: false,
      stats: {
        handsPlayed: 0,
        handsWon: 0,
        totalWinnings: 0,
        bestStreak: 0,
        currentStreak: 0
      },
      
      placeBet: (amount: number) => {
        const validBet = Math.max(
          GAME_CONFIG.minBet, 
          Math.min(amount, Math.min(get().balance, GAME_CONFIG.maxBet))
        );
        set({ bet: validBet });
      },
      
      deal: () => {
        const { bet, balance, phase, stats, isAnimating } = get();
        if (phase !== 'waiting' || bet > balance || isAnimating) return;
        
        set({ isAnimating: true });
        
        const deck = createDeck();
        const playerCards = [deck.pop()!, deck.pop()!];
        const dealerCards = [deck.pop()!, deck.pop()!];
        
        set({
          deck,
          playerCards: [],
          dealerCards: [],
          balance: balance - bet,
          phase: 'dealing',
          dealerRevealed: false,
          message: 'Dealing...',
          lastResult: null,
          stats: { ...stats, handsPlayed: stats.handsPlayed + 1 }
        });
        
        const dealSequence = async () => {
          soundManager.play('deal');
          
          await new Promise(r => setTimeout(r, 300));
          set({ playerCards: [playerCards[0]] });
          
          await new Promise(r => setTimeout(r, 300));
          set({ dealerCards: [dealerCards[0]] });
          
          await new Promise(r => setTimeout(r, 300));
          set({ playerCards });
          
          await new Promise(r => setTimeout(r, 300));
          set({ dealerCards });
          
          await new Promise(r => setTimeout(r, 400));
          
          const playerValue = calculateHandValue(playerCards);
          const dealerValue = calculateHandValue(dealerCards);
          
          if (playerValue === 21 || dealerValue === 21) {
            set({ dealerRevealed: true });
            
            if (playerValue === 21 && dealerValue === 21) {
              set({
                phase: 'game-over',
                message: 'Push! Both have Blackjack',
                balance: get().balance + bet,
                lastResult: 'push',
                isAnimating: false
              });
            } else if (playerValue === 21) {
              const winAmount = Math.floor(bet * (1 + GAME_CONFIG.blackjackPayout));
              const currentStats = get().stats;
              set({
                phase: 'game-over',
                message: `Blackjack! You win $${winAmount}`,
                balance: get().balance + winAmount,
                lastResult: 'win',
                isAnimating: false,
                stats: {
                  ...currentStats,
                  handsWon: currentStats.handsWon + 1,
                  totalWinnings: currentStats.totalWinnings + winAmount - bet,
                  currentStreak: currentStats.currentStreak + 1,
                  bestStreak: Math.max(currentStats.bestStreak, currentStats.currentStreak + 1)
                }
              });
              soundManager.play('win');
            } else {
              const currentStats = get().stats;
              set({
                phase: 'game-over',
                message: 'Dealer has Blackjack',
                lastResult: 'loss',
                isAnimating: false,
                stats: { ...currentStats, currentStreak: 0 }
              });
              soundManager.play('lose');
            }
          } else {
            set({ phase: 'playing', message: 'Your turn', isAnimating: false });
          }
        };
        
        dealSequence();
      },
      
      hit: () => {
        const { phase, deck, playerCards, isAnimating } = get();
        if (phase !== 'playing' || deck.length === 0 || isAnimating) return;
        
        set({ isAnimating: true });
        
        const newCard = deck.pop()!;
        const newPlayerCards = [...playerCards, newCard];
        const newDeck = [...deck];
        
        set({
          deck: newDeck,
          playerCards: newPlayerCards
        });
        
        setTimeout(() => {
          const value = calculateHandValue(newPlayerCards);
          
          if (value > 21) {
            const currentStats = get().stats;
            set({
              phase: 'game-over',
              message: 'Bust! You went over 21',
              dealerRevealed: true,
              lastResult: 'loss',
              isAnimating: false,
              stats: { ...currentStats, currentStreak: 0 }
            });
            soundManager.play('lose');
          } else if (value === 21) {
            set({ message: '21! Standing...', isAnimating: false });
            setTimeout(() => get().stand(), 600);
          } else {
            set({ isAnimating: false });
          }
        }, 400);
      },
      
      stand: () => {
        const { phase, isAnimating } = get();
        if (phase !== 'playing' || isAnimating) return;
        
        set({
          phase: 'dealer-turn',
          dealerRevealed: true,
          message: "Dealer's turn",
          isAnimating: true
        });
        
        const dealerPlay = async () => {
          await new Promise(r => setTimeout(r, 600));
          
          const playDealer = () => {
            const { deck, dealerCards, playerCards, bet, balance, stats } = get();
            const dealerValue = calculateHandValue(dealerCards);
            
            if (dealerValue >= GAME_CONFIG.dealerStandValue || deck.length === 0) {
              const playerValue = calculateHandValue(playerCards);
              let message = '';
              let winAmount = 0;
              let result: 'win' | 'loss' | 'push';
              let newStats = { ...stats };
              
              if (dealerValue > 21) {
                message = 'Dealer busts! You win';
                winAmount = bet * 2;
                result = 'win';
                newStats.handsWon++;
                newStats.totalWinnings += bet;
                newStats.currentStreak++;
                newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
              } else if (playerValue > dealerValue) {
                message = 'You win!';
                winAmount = bet * 2;
                result = 'win';
                newStats.handsWon++;
                newStats.totalWinnings += bet;
                newStats.currentStreak++;
                newStats.bestStreak = Math.max(newStats.bestStreak, newStats.currentStreak);
              } else if (playerValue < dealerValue) {
                message = 'Dealer wins';
                winAmount = 0;
                result = 'loss';
                newStats.currentStreak = 0;
              } else {
                message = 'Push!';
                winAmount = bet;
                result = 'push';
              }
              
              set({
                phase: 'game-over',
                message,
                balance: balance + winAmount,
                lastResult: result,
                stats: newStats,
                isAnimating: false
              });
              
              soundManager.play(result === 'win' ? 'win' : 'lose');
            } else {
              const newCard = deck.pop()!;
              set({
                deck: [...deck],
                dealerCards: [...dealerCards, newCard]
              });
              
              setTimeout(playDealer, 800);
            }
          };
          
          playDealer();
        };
        
        dealerPlay();
      },
      
      double: () => {
        const { phase, playerCards, bet, balance, isAnimating } = get();
        if (phase !== 'playing' || playerCards.length !== 2 || balance < bet || isAnimating) return;
        
        set({ balance: balance - bet, bet: bet * 2 });
        get().hit();
        
        setTimeout(() => {
          const { playerCards: newCards, phase: currentPhase } = get();
          const value = calculateHandValue(newCards);
          if (value <= 21 && currentPhase === 'playing') {
            get().stand();
          }
        }, 600);
      },
      
      nextRound: () => {
        const { balance } = get();
        
        if (balance < GAME_CONFIG.minBet) {
          set({
            phase: 'game-over',
            message: 'Game Over! Out of chips'
          });
          return;
        }
        
        set({
          deck: [],
          playerCards: [],
          dealerCards: [],
          phase: 'waiting',
          dealerRevealed: false,
          message: 'Place your bet',
          bet: Math.min(get().bet, balance),
          lastResult: null
        });
      },
      
      reset: () => {
        set({
          balance: GAME_CONFIG.initialBalance,
          bet: 50,
          deck: [],
          playerCards: [],
          dealerCards: [],
          phase: 'waiting',
          dealerRevealed: false,
          message: 'Place your bet to start',
          lastResult: null,
          isAnimating: false,
          stats: {
            handsPlayed: 0,
            handsWon: 0,
            totalWinnings: 0,
            bestStreak: 0,
            currentStreak: 0
          }
        });
      }
    }),
    {
      name: 'blackjack-game',
      partialize: (state) => ({ 
        balance: state.balance, 
        stats: state.stats,
        bet: state.bet
      })
    }
  )
);