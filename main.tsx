/* ── External Dependencies ─────────────────────────────────────────────────── */
import React, {
  useState, useEffect, useRef, memo, useCallback, useMemo
} from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast, { Toaster } from 'react-hot-toast';

/* ── Type Definitions ──────────────────────────────────────────────────────── */
type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

interface GestureSample {
  gesture: string;
  landmarks: number[][];
  timestamp: number;
}

interface CalibrationData {
  samples: Record<string, GestureSample[]>;
  createdAt: number;
  version: string;
}

interface GestureLog {
  timestamp: number;
  gesture: string;
  confidence: number;
  action: string | null;
  latency: number;
}

interface Settings {
  hitGesture: string;
  standGesture: string;
  doubleGesture: string;
  holdTime: number;
  confidence: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  highContrast: boolean;
  privacyMode: boolean;
}

type GamePhase = 'waiting' | 'dealing' | 'playing' | 'dealer-turn' | 'game-over';

interface GameState {
  balance: number;
  bet: number;
  deck: Card[];
  playerCards: Card[];
  dealerCards: Card[];
  phase: GamePhase;
  dealerRevealed: boolean;
  message: string;
  lastResult: 'win' | 'loss' | 'push' | null;
  isAnimating: boolean;
  stats: {
    handsPlayed: number;
    handsWon: number;
    totalWinnings: number;
    bestStreak: number;
    currentStreak: number;
  };
  
  // Actions
  placeBet: (amount: number) => void;
  deal: () => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  nextRound: () => void;
  reset: () => void;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */
const GESTURES = [
  'Open_Palm', 'Closed_Fist', 'Thumb_Up', 'Thumb_Down',
  'Victory', 'Pointing_Up', 'OK_Sign'
];

const DEFAULT_SETTINGS: Settings = {
  hitGesture: 'Open_Palm',
  standGesture: 'Closed_Fist',
  doubleGesture: 'Thumb_Down',
  holdTime: 500,
  confidence: 0.7,
  soundEnabled: true,
  vibrationEnabled: true,
  highContrast: false,
  privacyMode: false
};

const GAME_CONFIG = {
  initialBalance: 1000,
  minBet: 10,
  maxBet: 500,
  blackjackPayout: 1.5,
  dealerStandValue: 17,
  animationDuration: 400
};

/* ── Utility Functions ─────────────────────────────────────────────────────── */
const createDeck = (): Card[] => {
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

const calculateHandValue = (cards: Card[]): number => {
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

/* ── Sound Manager ─────────────────────────────────────────────────────────── */
const soundManager = {
  sounds: new Map<string, HTMLAudioElement>(),
  initialized: false,
  
  async init() {
    if (this.initialized) return;
    
    const soundData = {
      deal: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi13yvLTgjMGHm7A7+OZURE',
      win: 'data:audio/wav;base64,UklGRpwGAABXQVZFZm10IBAAAAABAAEAQAcAAEAHAAABAAgAZGF0YXgGAAB6gYaIjY6Li4uNkZSOioprdHd+hoeGg4GDiY+Qi4aDfHh8gISGh4SCfnx+gYOEhYaGhYWEg4J/fX5/gYKDg4ODg4ODg4ODg4OCgYB/fn1+fn9/f39/f39+fn19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fH',
      lose: 'data:audio/wav;base64,UklGRuYFAABXQVZFZm10IBAAAAABAAEAQAcAAEAHAAABAAgAZGF0YcIFAAB1hYuKhn15d4OKjYmCeXR5gYiKiYR+eHmAhYiHhX58eoGFhYOBfnx+gYOCgH99fYCBgH9+fX5+f39+fX19fn5+fn19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19',
      gesture: 'data:audio/wav;base64,UklGRjIBAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQ4BAACAgoSFiIqMjZCSlJaZm52foKOlp6qsrrCztLa4u72/wsTGyczO0NLV19nb3uDi5Ofo6uzu8PL09vj6/P4AAAH/'
    };
    
    try {
      for (const [key, data] of Object.entries(soundData)) {
        const audio = new Audio(data);
        audio.volume = 0.1;
        this.sounds.set(key, audio);
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Sound initialization failed:', error);
    }
  },
  
  play(sound: string) {
    if (!useSettingsStore.getState().settings.soundEnabled) return;
    
    const audio = this.sounds.get(sound);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }
};

/* ── MediaPipe Gesture Recognition ─────────────────────────────────────────── */
class GestureRecognizer {
  private recognizer: any = null;
  private ready = false;
  private lastGesture: string | null = null;
  private lastGestureTime = 0;
  private cooldownTimer: any = null;
  
  async init(video: HTMLVideoElement) {
    try {
      const { GestureRecognizer, FilesetResolver } = await import('@mediapipe/tasks-vision');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
      );
      
      this.recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      throw error;
    }
  }
  
  recognize(video: HTMLVideoElement, timestamp: number) {
    if (!this.ready || !this.recognizer || !video.videoWidth) return null;
    
    try {
      const results = this.recognizer.recognizeForVideo(video, timestamp);
      const gesture = results.gestures?.[0]?.[0];
      
      if (gesture && gesture.score >= useSettingsStore.getState().settings.confidence) {
        const now = Date.now();
        
        // New gesture detected
        if (gesture.categoryName !== this.lastGesture) {
          this.lastGesture = gesture.categoryName;
          this.lastGestureTime = now;
          return {
            name: gesture.categoryName,
            confidence: gesture.score,
            holdProgress: 0,
            shouldTrigger: false
          };
        }
        
        // Check if held long enough
        const holdDuration = now - this.lastGestureTime;
        const holdTime = useSettingsStore.getState().settings.holdTime;
        const holdProgress = Math.min(holdDuration / holdTime, 1);
        
        if (holdProgress === 1 && !this.cooldownTimer) {
          // Set cooldown
          this.cooldownTimer = setTimeout(() => {
            this.cooldownTimer = null;
            this.lastGesture = null;
          }, 1000);
          
          return {
            name: gesture.categoryName,
            confidence: gesture.score,
            holdProgress: 1,
            shouldTrigger: true
          };
        }
        
        return {
          name: gesture.categoryName,
          confidence: gesture.score,
          holdProgress,
          shouldTrigger: false
        };
      }
      
      // No gesture detected
      if (!this.cooldownTimer) {
        this.lastGesture = null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  async close() {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    if (this.recognizer) {
      await this.recognizer.close();
      this.recognizer = null;
      this.ready = false;
    }
  }
}

/* ── Zustand Stores ────────────────────────────────────────────────────────── */
const useGameStore = create<GameState>()(
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
        
        // Animate dealing
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
        
        soundManager.play('deal');
        
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
              
              soundManager.play('deal');
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

const useSettingsStore = create<{
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      }))
    }),
    {
      name: 'blackjack-settings'
    }
  )
);

const useCalibrationStore = create<{
  calibrationData: CalibrationData | null;
  gestureLogs: GestureLog[];
  addCalibrationSample: (gesture: string, sample: GestureSample) => void;
  clearCalibration: () => void;
  addGestureLog: (log: GestureLog) => void;
  clearLogs: () => void;
}>()(
  persist(
    (set, get) => ({
      calibrationData: null,
      gestureLogs: [],
      
      addCalibrationSample: (gesture: string, sample: GestureSample) => {
        const current = get().calibrationData || {
          samples: {},
          createdAt: Date.now(),
          version: '1.0'
        };
        
        if (!current.samples[gesture]) {
          current.samples[gesture] = [];
        }
        
        current.samples[gesture].push(sample);
        
        if (current.samples[gesture].length > 5) {
          current.samples[gesture].shift();
        }
        
        set({ calibrationData: current });
      },
      
      clearCalibration: () => {
        set({ calibrationData: null });
      },
      
      addGestureLog: (log: GestureLog) => {
        set((state) => ({
          gestureLogs: [...state.gestureLogs.slice(-49), log]
        }));
      },
      
      clearLogs: () => {
        set({ gestureLogs: [] });
      }
    }),
    {
      name: 'blackjack-calibration'
    }
  )
);

/* ── Card Component ────────────────────────────────────────────────────────── */
const Card = memo<{ card: Card; hidden?: boolean }>(({ card, hidden = false }) => {
  const { highContrast } = useSettingsStore(s => s.settings);
  const isRed = ['♥', '♦'].includes(card.suit);
  
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0 }}
      className="relative"
    >
      <motion.div
        className="w-16 h-24 sm:w-20 sm:h-28 relative preserve-3d"
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div className={`absolute inset-0 backface-hidden ${
          highContrast 
            ? 'bg-white border-4 border-black' 
            : 'bg-white border border-gray-200'
        } rounded-lg shadow-lg flex flex-col items-center justify-between p-2`}
        style={{ backfaceVisibility: 'hidden' }}>
          <span className={`text-sm font-bold ${
            isRed ? 'text-red-500' : 'text-black'
          }`}>
            {card.rank}
          </span>
          <span className={`text-3xl ${
            isRed ? 'text-red-500' : 'text-black'
          }`}>
            {card.suit}
          </span>
          <span className={`text-sm font-bold rotate-180 ${
            isRed ? 'text-red-500' : 'text-black'
          }`}>
            {card.rank}
          </span>
        </div>
        
        {/* Back */}
        <div className={`absolute inset-0 backface-hidden ${
          highContrast 
            ? 'bg-blue-900 border-4 border-black' 
            : 'bg-gradient-to-br from-blue-600 to-blue-800'
        } rounded-lg shadow-lg`}
        style={{ 
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}>
          <div className="w-full h-full rounded-lg border border-white/20 flex items-center justify-center">
            <div className="text-white/10 text-4xl">♠</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

/* ── Calibration Wizard ────────────────────────────────────────────────────── */
const CalibrationWizard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [recognizerReady, setRecognizerReady] = useState(false);
  
  const { settings } = useSettingsStore();
  const { addCalibrationSample } = useCalibrationStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const gestures = [
    { key: 'hitGesture', label: 'Hit', icon: '✋' },
    { key: 'standGesture', label: 'Stand', icon: '✊' },
    { key: 'doubleGesture', label: 'Double', icon: '👎' }
  ];
  
  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready and playing
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = async () => {
                try {
                  await videoRef.current!.play();
                  if (mounted) {
                    setCameraReady(true);
                    resolve();
                  }
                } catch (error) {
                  console.error('Failed to play video:', error);
                }
              };
            }
          });
          
          // Now initialize MediaPipe with the playing video
          if (mounted && videoRef.current) {
            const recognizer = new GestureRecognizer();
            await recognizer.init(videoRef.current);
            
            if (mounted) {
              recognizerRef.current = recognizer;
              setRecognizerReady(true);
            } else {
              await recognizer.close();
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize camera:', error);
        toast.error('Camera access denied. Please allow camera access and reload.');
        onClose();
      }
    };
    
    initCamera();
    
    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recognizerRef.current) {
        recognizerRef.current.close();
      }
    };
  }, [onClose]);
  
  const startRecording = async () => {
    if (recording || !recognizerRef.current || !videoRef.current) return;
    
    setCountdown(3);
    
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setCountdown(0);
    setRecording(true);
    
    const samples: GestureSample[] = [];
    const startTime = Date.now();
    const targetGesture = settings[gestures[step].key as keyof Settings] as string;
    let frameCounter = 0;
    
    const recordLoop = () => {
      if (Date.now() - startTime > 3000 || !recognizerRef.current || !videoRef.current) {
        setRecording(false);
        
        if (samples.length > 0) {
          const bestSample = samples[0];
          addCalibrationSample(targetGesture, bestSample);
          toast.success(`Recorded ${gestures[step].label} gesture!`);
          
          if (step < gestures.length - 1) {
            setStep(step + 1);
          } else {
            toast.success('Calibration complete!');
            setTimeout(onClose, 1000);
          }
        } else {
          toast.error(`No ${targetGesture} gesture detected. Try again.`);
        }
        return;
      }
      
      // Only process every 3rd frame for performance
      if (frameCounter++ % 3 === 0) {
        const result = recognizerRef.current.recognize(videoRef.current!, performance.now());
        if (result && result.name === targetGesture && result.confidence > 0.8) {
          samples.push({
            gesture: result.name,
            landmarks: [],
            timestamp: Date.now()
          });
        }
      }
      
      requestAnimationFrame(recordLoop);
    };
    
    requestAnimationFrame(recordLoop);
  };
  
  const currentGesture = gestures[step];
  const isReady = cameraReady && recognizerReady;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-gray-800 rounded-xl max-w-2xl w-full overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Calibrate Gestures</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="aspect-video bg-black relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
          />
          
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400">
                  {!cameraReady ? 'Initializing camera...' : 'Loading gesture recognition...'}
                </p>
              </div>
            </div>
          )}
          
          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-8xl font-bold text-white"
              >
                {countdown}
              </motion.div>
            </div>
          )}
          
          {recording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex justify-center gap-4 mb-6">
            {gestures.map((g, i) => (
              <div
                key={g.key}
                className={`px-4 py-2 rounded-full transition-colors ${
                  i === step ? 'bg-blue-600' : 
                  i < step ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                {g.icon} {g.label}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <p className="text-xl mb-2">
              Show the <span className="font-bold text-blue-400">{currentGesture.label}</span> gesture
            </p>
            <p className="text-gray-400 mb-6">
              Make the {settings[currentGesture.key as keyof Settings]} gesture
            </p>
            <button
              onClick={startRecording}
              disabled={recording || countdown > 0 || !isReady}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {recording ? 'Recording...' : countdown > 0 ? 'Get Ready...' : 'Start Recording'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── Gesture Control Hook ──────────────────────────────────────────────────── */
const useGestureControl = () => {
  const [enabled, setEnabled] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [gestureProgress, setGestureProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  const { settings } = useSettingsStore();
  const game = useGameStore();
  const { addGestureLog } = useCalibrationStore();
  
  // Initialize camera
  useEffect(() => {
    if (!enabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
      setCurrentGesture(null);
      setGestureProgress(0);
      return;
    }
    
    let mounted = true;
    
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = async () => {
                try {
                  await videoRef.current!.play();
                  resolve();
                } catch (error) {
                  console.error('Failed to play video:', error);
                }
              };
            }
          });
          
          if (mounted && videoRef.current) {
            const recognizer = new GestureRecognizer();
            await recognizer.init(videoRef.current);
            
            if (mounted) {
              recognizerRef.current = recognizer;
            } else {
              await recognizer.close();
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize gesture control:', error);
        toast.error('Camera access denied');
        setEnabled(false);
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [enabled]);
  
  // Recognition loop
  useEffect(() => {
    if (!enabled || !recognizerRef.current || !videoRef.current) return;
    
    let isActive = true;
    let frameCounter = 0;
    
    const recognize = () => {
      if (!isActive || !recognizerRef.current || !videoRef.current) return;
      
      // Skip frames for performance
      if (frameCounter++ % 2 !== 0) {
        animationFrameRef.current = requestAnimationFrame(recognize);
        return;
      }
      
      const startTime = performance.now();
      const result = recognizerRef.current.recognize(videoRef.current, performance.now());
      const latency = performance.now() - startTime;
      
      if (result) {
        setCurrentGesture(result.name);
        setGestureProgress(result.holdProgress);
        
        if (result.shouldTrigger && game.phase === 'playing' && !game.isAnimating) {
          let action: string | null = null;
          
          if (result.name === settings.hitGesture) {
            game.hit();
            action = 'hit';
          } else if (result.name === settings.standGesture) {
            game.stand();
            action = 'stand';
          } else if (result.name === settings.doubleGesture && 
                     game.playerCards.length === 2 && 
                     game.balance >= game.bet) {
            game.double();
            action = 'double';
          }
          
          if (action) {
            soundManager.play('gesture');
            if (settings.vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate(50);
            }
            
            addGestureLog({
              timestamp: Date.now(),
              gesture: result.name,
              confidence: result.confidence,
              action,
              latency: Math.round(latency)
            });
          }
        }
      } else {
        setCurrentGesture(null);
        setGestureProgress(0);
      }
      
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(recognize);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(recognize);
    
    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, settings, game, addGestureLog]);
  
  return {
    enabled,
    setEnabled,
    videoRef,
    currentGesture,
    gestureProgress
  };
};

/* ── Main App Component ────────────────────────────────────────────────────── */
const App: React.FC = () => {
  const game = useGameStore();
  const { settings, updateSettings } = useSettingsStore();
  const { calibrationData, gestureLogs, clearLogs } = useCalibrationStore();
  const { enabled, setEnabled, videoRef, currentGesture, gestureProgress } = useGestureControl();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [betAmount, setBetAmount] = useState(game.bet);
  
  const playerValue = useMemo(() => calculateHandValue(game.playerCards), [game.playerCards]);
  const dealerValue = useMemo(() => calculateHandValue(game.dealerCards), [game.dealerCards]);
  const dealerVisibleValue = useMemo(() => 
    game.dealerRevealed ? dealerValue : calculateHandValue(game.dealerCards.slice(1)),
    [game.dealerRevealed, dealerValue, game.dealerCards]
  );
  
  useEffect(() => {
    setBetAmount(game.bet);
  }, [game.bet]);
  
  useEffect(() => {
    soundManager.init();
  }, []);
  
  return (
    <div className={`min-h-screen ${
      settings.highContrast ? 'bg-black text-white' : 'bg-gray-900 text-white'
    }`}>
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className={`border-b ${
        settings.highContrast ? 'border-white' : 'border-gray-800'
      } px-4 py-3`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Blackjack
            {settings.privacyMode && <span className="text-sm text-green-400">🔒</span>}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-400">Balance:</span>
              <span className="ml-2 font-mono font-bold text-lg">${game.balance}</span>
            </div>
            <button
              onClick={() => setShowStats(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Stats
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-6">
        {/* Game Table */}
        <div className="lg:col-span-2">
          <div className={`${
            settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'
          } rounded-xl p-6 shadow-xl`}>
            
            {/* Dealer Hand */}
            <div className="mb-8">
              <div className="text-center mb-4">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider">Dealer</h3>
                {game.dealerCards.length > 0 && (
                  <p className="text-2xl font-bold mt-1">
                    {game.dealerRevealed ? dealerValue : `?/${dealerVisibleValue}`}
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-2 min-h-[112px]">
                <AnimatePresence>
                  {game.dealerCards.map((card, index) => (
                    <Card
                      key={card.id}
                      card={card}
                      hidden={!game.dealerRevealed && index === 0}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Message */}
            <div className="text-center py-8">
              <AnimatePresence mode="wait">
                <motion.p
                  key={game.message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`text-xl font-semibold ${
                    game.lastResult === 'win' ? 'text-green-400' :
                    game.lastResult === 'loss' ? 'text-red-400' :
                    'text-gray-300'
                  }`}
                >
                  {game.message}
                </motion.p>
              </AnimatePresence>
            </div>
            
            {/* Player Hand */}
            <div className="mb-8">
              <div className="text-center mb-4">
                <h3 className="text-sm text-gray-400 uppercase tracking-wider">Your Hand</h3>
                {game.playerCards.length > 0 && (
                  <p className={`text-2xl font-bold mt-1 ${
                    playerValue === 21 ? 'text-green-400' :
                    playerValue > 21 ? 'text-red-400' : ''
                  }`}>
                    {playerValue}
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-2 min-h-[112px]">
                <AnimatePresence>
                  {game.playerCards.map((card) => (
                    <Card key={card.id} card={card} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex justify-center">
              <AnimatePresence mode="wait">
                {game.phase === 'waiting' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2">
                      <button
                        onClick={() => setBetAmount(Math.max(GAME_CONFIG.minBet, betAmount - 10))}
                        className="w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                        onBlur={() => {
                          const validBet = Math.max(
                            GAME_CONFIG.minBet, 
                            Math.min(betAmount, Math.min(game.balance, GAME_CONFIG.maxBet))
                          );
                          setBetAmount(validBet);
                          game.placeBet(validBet);
                        }}
                        className="w-20 bg-transparent text-center font-mono"
                      />
                      <button
                        onClick={() => setBetAmount(Math.min(game.balance, GAME_CONFIG.maxBet, betAmount + 10))}
                        className="w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        game.placeBet(betAmount);
                        game.deal();
                      }}
                      disabled={betAmount > game.balance || betAmount < GAME_CONFIG.minBet}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                    >
                      Deal
                    </button>
                  </motion.div>
                )}
                
                {game.phase === 'playing' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <button
                      onClick={game.hit}
                      disabled={game.isAnimating}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
                    >
                      Hit
                    </button>
                    <button
                      onClick={game.stand}
                      disabled={game.isAnimating}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
                    >
                      Stand
                    </button>
                    <button
                      onClick={game.double}
                      disabled={game.playerCards.length !== 2 || game.balance < game.bet || game.isAnimating}
                      className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                    >
                      Double
                    </button>
                  </motion.div>
                )}
                
                {game.phase === 'game-over' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <button
                      onClick={game.balance >= GAME_CONFIG.minBet ? game.nextRound : game.reset}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
                    >
                      {game.balance >= GAME_CONFIG.minBet ? 'Next Round' : 'New Game'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        
        {/* Gesture Control Panel */}
        <aside className={`${
          settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'
        } rounded-xl overflow-hidden shadow-xl`}>
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Gesture Control</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCalibration(true)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Calibrate"
                >
                  Calibrate
                </button>
                <button
                  onClick={() => setShowLogs(true)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Logs"
                >
                  Logs
                </button>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                    enabled ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  {enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="aspect-video bg-black relative">
            {enabled ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {currentGesture && (
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80">
                    <p className="text-center font-semibold mb-2">{currentGesture}</p>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-green-500"
                        style={{ width: `${gestureProgress * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-4xl mb-2">👋</p>
                  <p>Enable to use gestures</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 space-y-2 text-sm text-gray-400">
            <p>✋ {settings.hitGesture} → Hit</p>
            <p>✊ {settings.standGesture} → Stand</p>
            <p>👎 {settings.doubleGesture} → Double</p>
            {calibrationData && (
              <p className="text-xs text-green-400 mt-2">
                ✓ Calibrated
              </p>
            )}
          </div>
        </aside>
      </main>
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-6">Settings</h2>
              
              <div className="space-y-6">
                {/* Gesture Mappings */}
                <div>
                  <h3 className="font-semibold mb-3">Gesture Mappings</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'hitGesture', label: 'Hit' },
                      { key: 'standGesture', label: 'Stand' },
                      { key: 'doubleGesture', label: 'Double' }
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-sm text-gray-400 mb-1">
                          {label} Gesture
                        </label>
                        <select
                          value={settings[key as keyof Settings] as string}
                          onChange={(e) => updateSettings({ [key]: e.target.value })}
                          className="w-full bg-gray-700 rounded-lg px-3 py-2"
                        >
                          {GESTURES.map((gesture) => (
                            <option key={gesture} value={gesture}>
                              {gesture.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Recognition Settings */}
                <div>
                  <h3 className="font-semibold mb-3">Recognition</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Hold Time: {settings.holdTime}ms
                      </label>
                      <input
                        type="range"
                        min={200}
                        max={1000}
                        step={50}
                        value={settings.holdTime}
                        onChange={(e) => updateSettings({ holdTime: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">
                        Confidence: {Math.round(settings.confidence * 100)}%
                      </label>
                      <input
                        type="range"
                        min={0.5}
                        max={0.95}
                        step={0.05}
                        value={settings.confidence}
                        onChange={(e) => updateSettings({ confidence: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span>Sound Effects</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.vibrationEnabled}
                      onChange={(e) => updateSettings({ vibrationEnabled: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span>Vibration</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span>High Contrast</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.privacyMode}
                      onChange={(e) => updateSettings({ privacyMode: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span>Privacy Mode</span>
                  </label>
                </div>
              </div>
              
              <button
                onClick={() => setShowSettings(false)}
                className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
        
        {showCalibration && (
          <CalibrationWizard onClose={() => setShowCalibration(false)} />
        )}
        
        {showLogs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowLogs(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Gesture Logs</h2>
                <button
                  onClick={clearLogs}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2">
                {gestureLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No logs yet</p>
                ) : (
                  gestureLogs.slice().reverse().map((log, i) => (
                    <div
                      key={i}
                      className="bg-gray-700 rounded-lg p-3 text-sm font-mono"
                    >
                      <div className="flex justify-between">
                        <span>
                          <span className="text-blue-400">{log.gesture}</span>
                          {log.action && (
                            <span className="ml-2 text-green-400">→ {log.action}</span>
                          )}
                        </span>
                        <span className="text-gray-400">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Confidence: {Math.round(log.confidence * 100)}% | Latency: {log.latency}ms
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button
                onClick={() => setShowLogs(false)}
                className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
        
        {showStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowStats(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-6">Statistics</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Hands Played</span>
                  <span className="font-bold">{game.stats.handsPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Hands Won</span>
                  <span className="font-bold">{game.stats.handsWon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Win Rate</span>
                  <span className="font-bold">
                    {game.stats.handsPlayed > 0 
                      ? Math.round((game.stats.handsWon / game.stats.handsPlayed) * 100) + '%'
                      : '0%'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Winnings</span>
                  <span className={`font-bold ${
                    game.stats.totalWinnings >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${game.stats.totalWinnings >= 0 ? '+' : ''}{game.stats.totalWinnings}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Best Streak</span>
                  <span className="font-bold">{game.stats.bestStreak}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Streak</span>
                  <span className="font-bold text-yellow-400">
                    {game.stats.currentStreak} 🔥
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setShowStats(false)}
                className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── CSS Injection ─────────────────────────────────────────────────────────── */
const styles = document.createElement('style');
styles.textContent = `
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden;
  }
`;
document.head.appendChild(styles);

/* ── App Bootstrap ─────────────────────────────────────────────────────────── */
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}