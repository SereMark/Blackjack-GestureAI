import React, { memo, useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { createWithEqualityFn } from 'zustand/traditional';
import { shallow } from "zustand/shallow";
import "./index.css";
import {
  FilesetResolver,
  GestureRecognizer
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7";

// --- CONSTANTS --- //
const CONSTANTS = {
  TIMINGS: {
    ACTION_DELAY_MS: 500,
    DEALER_DELAY_MS: 800,
    END_ROUND_DELAY_MS: 1000,
  },
  GAME_RULES: {
    DEALER_STANDS_ON: 17,
    BLACKJACK_SCORE: 21,
  },
  DEFAULTS: {
    PLAYER_MONEY: 1000,
    BET_AMOUNT: 50,
  },
  GAME_STATES: {
    IDLE: "idle",
    IN_PROGRESS: "in_progress",
    ROUND_OVER: "round_over",
  },
  PLAYER_TYPES: {
    PLAYER: "player",
    DEALER: "dealer",
  },
  WINNER_TYPES: {
    PLAYER: "player",
    DEALER: "dealer",
    PUSH: "push",
  },
  CONTROL_MODES: {
    MANUAL: "manual",
    GESTURE: "gesture",
  },
  CARDS: {
    SUITS: ["hearts", "diamonds", "clubs", "spades"],
    RANKS: ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"],
  },
  GESTURE: {
    MAP: {
      'Open_Palm': 'hit',
      'Thumb_Up': 'hit',
      'ILoveYou': 'hit',
      'Closed_Fist': 'stand',
      'Victory': 'stand',
      'Thumb_Down': 'stand',
      'Pointing_Up': 'stand'
    },
    CONFIDENCE_THRESHOLD: 0.8,
    ACTION_COOLDOWN_MS: 2000,
  },
  API: {
    MODEL_PATH: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
    WASM_BASE: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7/wasm",
  },
};

// --- GAME LOGIC UTILITIES --- //

/**
 * Creates and shuffles a standard 52-card deck.
 * @returns {Array<Object>} A shuffled array of card objects.
 */
const createDeck = () => {
  const deck = [];
  for (const suit of CONSTANTS.CARDS.SUITS) {
    for (const rank of CONSTANTS.CARDS.RANKS) {
      deck.push({ rank, suit, id: `${rank}-${suit}` });
    }
  }
  // Fisher-Yates shuffle algorithm for an unbiased shuffle.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

/**
 * Calculates the score of a given hand of cards, handling Aces correctly.
 * @param {Array<Object>} hand - An array of card objects.
 * @returns {number} The calculated score of the hand.
 */
const calculateScore = (hand) => {
  if (!hand?.length) return 0;

  let score = 0;
  let aceCount = 0;
  
  for (const card of hand) {
    if (card.rank === "A") {
      aceCount += 1;
      score += 11;
    } else if (["K", "Q", "J"].includes(card.rank)) {
      score += 10;
    } else {
      score += parseInt(card.rank, 10);
    }
  }
  
  // Adjust for Aces if the score is over 21
  while (score > CONSTANTS.GAME_RULES.BLACKJACK_SCORE && aceCount > 0) {
    score -= 10;
    aceCount -= 1;
  }
  
  return score;
};

// --- HOOKS --- //
/**
 * A declarative timeout hook that automatically handles cleanup.
 * @returns {function(function, number): void} A function to set a timeout.
 */
function useTimeout() {
  const timeoutId = useRef();
  useEffect(() => () => clearTimeout(timeoutId.current), []);
  return useCallback((fn, ms) => {
    clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(fn, ms);
  }, []);
}

// --- ZUSTAND GAME STORE --- //
const useGameStore = createWithEqualityFn((set, get) => ({
  // State
  deck: [],
  dealerHand: [],
  playerHand: [],
  playerMoney: CONSTANTS.DEFAULTS.PLAYER_MONEY,
  bet: CONSTANTS.DEFAULTS.BET_AMOUNT,
  roundsWon: 0,
  roundsLost: 0,
  roundsPushed: 0,
  gameState: CONSTANTS.GAME_STATES.IDLE,
  winner: null,
  message: "Welcome! Place your bet to start.",
  controlMode: CONSTANTS.CONTROL_MODES.MANUAL,
  error: null,
  isLoading: false,
  isDealerTurn: false,
  
  // Actions
  /** Sets the player's bet amount, clamping it between 0 and player's total money. */
  setBet: (value) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    set(state => ({ bet: Math.min(Math.max(0, numValue), state.playerMoney) }));
  },
  
  /** Clears any active error message. */
  clearError: () => set({ error: null }),
  
  /** Toggles the control mode between Manual and Gesture. */
  toggleControlMode: () => set(state => ({
    controlMode: state.controlMode === CONSTANTS.CONTROL_MODES.MANUAL 
      ? CONSTANTS.CONTROL_MODES.GESTURE 
      : CONSTANTS.CONTROL_MODES.MANUAL
  })),
  
  /** Places the bet and starts a new round by dealing cards. */
  placeBet: () => {
    const { bet, playerMoney, isLoading, gameState } = get();
    if (isLoading || gameState !== CONSTANTS.GAME_STATES.IDLE) return;
    if (bet <= 0) return set({ error: "Please enter a positive bet amount." });
    if (bet > playerMoney) return set({ error: "Insufficient funds." });

    set({ isLoading: true, error: null });
    
    setTimeout(() => {
      const newDeck = createDeck();
      const playerHand = [newDeck.pop(), newDeck.pop()];
      const dealerHand = [newDeck.pop(), newDeck.pop()];
      
      const playerScore = calculateScore(playerHand);
      const dealerScore = calculateScore(dealerHand);
      
      const playerHasBlackjack = playerScore === CONSTANTS.GAME_RULES.BLACKJACK_SCORE;
      const dealerHasBlackjack = dealerScore === CONSTANTS.GAME_RULES.BLACKJACK_SCORE;

      set({
        deck: newDeck, playerHand, dealerHand,
        gameState: CONSTANTS.GAME_STATES.IN_PROGRESS,
        winner: null,
        message: "Game in progress. Hit or Stand?",
        isDealerTurn: false,
        isLoading: false,
      });

      // If the round ends immediately (e.g., Blackjack), call endRound.
      if (playerHasBlackjack || dealerHasBlackjack) {
        setTimeout(() => get().endRound(), CONSTANTS.TIMINGS.END_ROUND_DELAY_MS);
      }
    }, CONSTANTS.TIMINGS.ACTION_DELAY_MS);
  },
  
  /** Deals one card to the player. Automatically stands if player busts or hits 21. */
  hit: () => {
    const { isLoading, gameState, isDealerTurn } = get();
    if (isLoading || gameState !== CONSTANTS.GAME_STATES.IN_PROGRESS || isDealerTurn) return;

    set({ isLoading: true });
    setTimeout(() => {
      const newDeck = [...get().deck];
      const newPlayerHand = [...get().playerHand, newDeck.pop()];
      const playerScore = calculateScore(newPlayerHand);
      
      set({ deck: newDeck, playerHand: newPlayerHand, isLoading: false });
      
      if (playerScore >= CONSTANTS.GAME_RULES.BLACKJACK_SCORE) {
        setTimeout(() => get().stand(), CONSTANTS.TIMINGS.ACTION_DELAY_MS);
      }
    }, CONSTANTS.TIMINGS.ACTION_DELAY_MS);
  },
  
  /** Ends the player's turn and initiates the dealer's turn. */
  stand: () => {
    const { isLoading, gameState, isDealerTurn } = get();
    if (isLoading || gameState !== CONSTANTS.GAME_STATES.IN_PROGRESS || isDealerTurn) return;
    
    set({ isLoading: true, isDealerTurn: true, message: "Dealer is playing..." });
    
    const dealerPlay = async () => {
      let currentDeck = [...get().deck];
      let currentDealerHand = [...get().dealerHand];
      
      while (calculateScore(currentDealerHand) < CONSTANTS.GAME_RULES.DEALER_STANDS_ON) {
        await new Promise(resolve => setTimeout(resolve, CONSTANTS.TIMINGS.DEALER_DELAY_MS));
        const newCard = currentDeck.pop();
        currentDealerHand = [...currentDealerHand, newCard];
        set({ deck: [...currentDeck], dealerHand: [...currentDealerHand] });
      }
      
      get().endRound();
    };
    
    dealerPlay().catch(error => {
      console.error("Dealer play error:", error);
      set({ error: "An error occurred during the dealer's turn.", isLoading: false });
    });
  },
  
  /** Determines the winner, updates scores and money, and ends the round. */
  endRound: () => {
    const { playerHand, dealerHand, bet, playerMoney } = get();
    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand);
    
    let winner, message, moneyChange = 0;
    
    const playerHasBlackjack = playerScore === CONSTANTS.GAME_RULES.BLACKJACK_SCORE && playerHand.length === 2;
    const dealerHasBlackjack = dealerScore === CONSTANTS.GAME_RULES.BLACKJACK_SCORE && dealerHand.length === 2;

    if (playerScore > CONSTANTS.GAME_RULES.BLACKJACK_SCORE) {
      winner = CONSTANTS.WINNER_TYPES.DEALER;
      message = `Bust! You lose with ${playerScore}.`;
      moneyChange = -bet;
    } else if (playerHasBlackjack && !dealerHasBlackjack) {
      winner = CONSTANTS.WINNER_TYPES.PLAYER;
      message = "Blackjack! You win 3:2!";
      moneyChange = Math.floor(bet * 1.5);
    } else if (dealerHasBlackjack && !playerHasBlackjack) {
      winner = CONSTANTS.WINNER_TYPES.DEALER;
      message = "Dealer has Blackjack! You lose.";
      moneyChange = -bet;
    } else if (dealerScore > CONSTANTS.GAME_RULES.BLACKJACK_SCORE) {
      winner = CONSTANTS.WINNER_TYPES.PLAYER;
      message = `Dealer busts with ${dealerScore}! You win!`;
      moneyChange = bet;
    } else if (playerScore > dealerScore) {
      winner = CONSTANTS.WINNER_TYPES.PLAYER;
      message = `You win! ${playerScore} beats ${dealerScore}.`;
      moneyChange = bet;
    } else if (dealerScore > playerScore) {
      winner = CONSTANTS.WINNER_TYPES.DEALER;
      message = `Dealer wins. ${dealerScore} beats ${playerScore}.`;
      moneyChange = -bet;
    } else {
      winner = CONSTANTS.WINNER_TYPES.PUSH;
      message = `Push! Both have ${playerScore}.`;
    }

    const won = winner === CONSTANTS.WINNER_TYPES.PLAYER ? 1 : 0;
    const lost = winner === CONSTANTS.WINNER_TYPES.DEALER ? 1 : 0;
    const pushed = winner === CONSTANTS.WINNER_TYPES.PUSH ? 1 : 0;
    
    set(state => ({
      winner, message,
      playerMoney: state.playerMoney + moneyChange,
      roundsWon: state.roundsWon + won,
      roundsLost: state.roundsLost + lost,
      roundsPushed: state.roundsPushed + pushed,
      gameState: CONSTANTS.GAME_STATES.ROUND_OVER,
      isLoading: false,
      isDealerTurn: true,
    }));
  },
  
  /** Prepares the game for a new round without resetting scores. */
  newRound: () => {
    const { isLoading, playerMoney, bet } = get();
    if (isLoading) return;
    
    set({
      deck: [], dealerHand: [], playerHand: [],
      bet: Math.min(bet, playerMoney),
      gameState: CONSTANTS.GAME_STATES.IDLE,
      winner: null,
      message: "Place your bet for the next round.",
      error: null,
      isLoading: false,
      isDealerTurn: false
    });
  },
  
  /** Resets the entire game state to its initial values. */
  resetGame: () => set({
    deck: [], dealerHand: [], playerHand: [],
    playerMoney: CONSTANTS.DEFAULTS.PLAYER_MONEY,
    bet: CONSTANTS.DEFAULTS.BET_AMOUNT,
    roundsWon: 0, roundsLost: 0, roundsPushed: 0,
    gameState: CONSTANTS.GAME_STATES.IDLE,
    winner: null,
    message: "Welcome! Place your bet to start.",
    error: null,
    isLoading: false,
    isDealerTurn: false,
  })
}), shallow);

// --- UI COMPONENTS --- //

const Card = memo(({ rank, suit, isHidden }) => {
  const color = ["hearts", "diamonds"].includes(suit) ? "text-red-500" : "text-gray-900";
  const symbol = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" }[suit];
  
  return (
    <div className="w-[80px] h-[112px]" style={{ perspective: '1000px' }}>
      <motion.div 
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: isHidden ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        {/* Card Front */}
        <div className={`absolute inset-0 bg-white rounded-lg shadow-lg p-1.5 ${color} flex flex-col justify-between`} style={{ backfaceVisibility: 'hidden' }}>
          <div className="text-left"><div className="font-bold text-lg leading-none">{rank}</div><div className="text-sm leading-none">{symbol}</div></div>
          <div className="text-center text-4xl">{symbol}</div>
          <div className="text-right rotate-180"><div className="font-bold text-lg leading-none">{rank}</div><div className="text-sm leading-none">{symbol}</div></div>
        </div>
        
        {/* Card Back */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg flex items-center justify-center" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
          <div className="w-[90%] h-[90%] border-2 border-white/30 rounded bg-blue-700/50" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)' }} />
        </div>
      </motion.div>
    </div>
  );
});

const Hand = memo(({ cards, playerType }) => {
  const gameState = useGameStore(s => s.gameState);
  const isDealerTurn = useGameStore(s => s.isDealerTurn);
  const score = calculateScore(cards);

  const isDealer = playerType === CONSTANTS.PLAYER_TYPES.DEALER;
  const isDealerCardHidden = isDealer && !isDealerTurn && gameState === CONSTANTS.GAME_STATES.IN_PROGRESS;
  
  return (
    <div>
      <div className="flex justify-center items-center relative h-[120px]">
        <AnimatePresence>
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, y: isDealer ? -50 : 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: (idx - (cards.length - 1) / 2) * 50 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute"
              style={{ zIndex: idx }}
            >
              <Card 
                rank={card.rank} 
                suit={card.suit} 
                isHidden={isDealer && idx === 0 && isDealerCardHidden}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="text-center mt-4">
        <span className="bg-black/40 px-4 py-1 rounded-full text-sm font-medium">
          {isDealer ? 'Dealer' : 'You'}: {isDealerCardHidden ? '?' : score}
        </span>
      </div>
    </div>
  );
});

const CameraFeed = memo(() => {
  const videoRef = useRef(null);
  const recognizerRef = useRef(null);
  const lastActionTimeRef = useRef(0);
  const frameIdRef = useRef();
  
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing', 'active', 'denied', 'unavailable', 'error'
  const [gestureInfo, setGestureInfo] = useState({ gesture: 'None', confidence: 0 });
  const [recognizerReady, setRecognizerReady] = useState(false);
  
  const { controlMode, gameState, isLoading, hit, stand } = useGameStore(state => ({
    controlMode: state.controlMode,
    gameState: state.gameState,
    isLoading: state.isLoading,
    hit: state.hit,
    stand: state.stand
  }), shallow);
  
  const isGestureControlActive = controlMode === CONSTANTS.CONTROL_MODES.GESTURE;

  useEffect(() => {
    if (!isGestureControlActive) {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
        setCameraStatus('initializing');
      }
      return;
    }

    // Pre-fetch WASM assets to potentially speed up initialization
    fetch(`${CONSTANTS.API.WASM_BASE}/vision_wasm_internal.js`, { cache: "force-cache" }).catch(() => {});

    const abortController = new AbortController();
    let isCancelled = false;

    async function init() {
      // 1. Initialize Camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, signal: abortController.signal });
        if (videoRef.current && !isCancelled) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraStatus("active");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("Camera Error:", err.name, err.message);
        setCameraStatus(err.name === "NotAllowedError" || err.name === "SecurityError" ? "denied" : "unavailable");
      }

      // 2. Initialize Gesture Recognizer
      try {
        const vision = await FilesetResolver.forVisionTasks(CONSTANTS.API.WASM_BASE);
        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: { modelAssetPath: CONSTANTS.API.MODEL_PATH, delegate: "GPU" },
          runningMode: "VIDEO", numHands: 1
        });
        recognizerRef.current = recognizer;
        if (!isCancelled) {
          setRecognizerReady(true);
          setGestureInfo({ gesture: "Ready", confidence: 0 });
        }
      } catch (e) {
        if (!isCancelled) {
          console.error("Recognizer init error:", e);
          setCameraStatus("error");
        }
      }
    }
    
    init();

    return () => {
      isCancelled = true;
      abortController.abort();
      recognizerRef.current?.close();
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [isGestureControlActive]);
  
  const handleGestureResult = useCallback((result) => {
    const gesture = result.gestures[0]?.[0];
    if (!gesture) return;

    setGestureInfo({ gesture: gesture.categoryName, confidence: gesture.score });
    const action = CONSTANTS.GESTURE.MAP[gesture.categoryName];
    const now = Date.now();

    const canPerformAction = action &&
      gesture.score > CONSTANTS.GESTURE.CONFIDENCE_THRESHOLD &&
      (now - lastActionTimeRef.current > CONSTANTS.GESTURE.ACTION_COOLDOWN_MS) &&
      gameState === CONSTANTS.GAME_STATES.IN_PROGRESS && !isLoading;
      
    if (canPerformAction) {
      lastActionTimeRef.current = now;
      if (action === 'hit') hit();
      else if (action === 'stand') stand();
    }
  }, [gameState, isLoading, hit, stand]);
  
  useEffect(() => {
    if (!recognizerReady || !isGestureControlActive || !videoRef.current) return;
    
    let lastVideoTime = -1;
    const renderLoop = (now, metadata) => {
      if (videoRef.current.readyState < 2) {
        frameIdRef.current = videoRef.current.requestVideoFrameCallback(renderLoop);
        return;
      }
      if (metadata.mediaTime !== lastVideoTime) {
        const result = recognizerRef.current.recognizeForVideo(videoRef.current, now);
        if (result?.gestures?.length) {
          handleGestureResult(result);
        }
        lastVideoTime = metadata.mediaTime;
      }
      frameIdRef.current = videoRef.current.requestVideoFrameCallback(renderLoop);
    };

    frameIdRef.current = videoRef.current.requestVideoFrameCallback(renderLoop);
    
    return () => {
      if (videoRef.current && frameIdRef.current) {
        videoRef.current.cancelVideoFrameCallback(frameIdRef.current);
      }
    };
  }, [recognizerReady, isGestureControlActive, handleGestureResult]);

  const gestureHintText = useMemo(() => {
      const hitGestures = Object.entries(CONSTANTS.GESTURE.MAP).filter(([,v]) => v === 'hit').map(([k]) => k.replace(/_/g, ' ')).join(' / ');
      const standGestures = Object.entries(CONSTANTS.GESTURE.MAP).filter(([,v]) => v === 'stand').map(([k]) => k.replace(/_/g, ' ')).join(' / ');
      return `${hitGestures}: Hit | ${standGestures}: Stand`;
  }, []);
  
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden h-full flex flex-col border border-gray-700 shadow-lg">
      <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
        <h3 className="text-white font-medium">Gesture Control</h3>
        <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${isGestureControlActive && cameraStatus === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
          ● {isGestureControlActive ? cameraStatus : 'Disabled'}
        </div>
      </div>
      
      <div className="flex-1 relative bg-black flex items-center justify-center text-center p-4">
        {!isGestureControlActive ? (
          <div>
            <p className="text-gray-400 mb-2">Gesture control is off.</p>
            <p className="text-gray-500 text-sm">Toggle controls in the header to enable.</p>
          </div>
        ) : cameraStatus === "denied" ? (
          <div>
            <p className="text-red-400 mb-2">Camera Access Denied</p>
            <p className="text-gray-400 text-sm">Please allow camera permissions in your browser settings to use gesture controls.</p>
          </div>
        ) : cameraStatus === "unavailable" ? (
          <div>
            <p className="text-red-400 mb-2">No Camera Available</p>
            <p className="text-gray-400 text-sm">Please ensure your camera is connected and not in use by another application.</p>
          </div>
        ) : cameraStatus === 'error' ? (
          <div>
            <p className="text-red-400 mb-2">Initialization Error</p>
            <p className="text-gray-400 text-sm">Could not load the gesture model. Please check your connection and refresh.</p>
          </div>
        ) : (
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }}/>
        )}
      </div>
      
      {isGestureControlActive && (
        <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Gesture:</span>
            <span className="text-white font-medium">{gestureInfo.gesture}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div className="bg-blue-500 h-full" animate={{ width: `${gestureInfo.confidence * 100}%` }} transition={{ duration: 0.2 }} />
          </div>
          <p className="mt-2 text-xs text-gray-400 text-center" role="button">{gestureHintText}</p>
        </div>
      )}
    </div>
  );
});

const GameOverModal = memo(({ onReset }) => {
  const { roundsWon, roundsLost, roundsPushed } = useGameStore(s => ({
      roundsWon: s.roundsWon,
      roundsLost: s.roundsLost,
      roundsPushed: s.roundsPushed
  }), shallow);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-900 p-8 rounded-xl max-w-md w-full text-center border border-gray-700 shadow-2xl"
      >
        <h2 className="text-3xl font-bold text-red-400 mb-4">Game Over</h2>
        <p className="text-gray-300 mb-6">You've run out of money!</p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div><div className="text-2xl font-bold text-green-400">{roundsWon}</div><div className="text-sm text-gray-400">Won</div></div>
          <div><div className="text-2xl font-bold text-red-400">{roundsLost}</div><div className="text-sm text-gray-400">Lost</div></div>
          <div><div className="text-2xl font-bold text-yellow-400">{roundsPushed}</div><div className="text-sm text-gray-400">Pushed</div></div>
        </div>
        <button
          onClick={onReset}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors w-full"
        >
          New Game
        </button>
      </motion.div>
    </div>
  );
});

const GameInterface = () => {
  // --- State Selection from Zustand Store ---
  const { playerMoney, bet, roundsWon, roundsLost, roundsPushed, gameState, message, controlMode, error, isLoading, isDealerTurn, dealerHand, playerHand } = useGameStore(s => s, shallow);
  const { setBet, clearError, toggleControlMode, placeBet, hit, stand, newRound, resetGame } = useGameStore(s => s);
  

  // The player score is derived from the playerHand state.
  // useMemo prevents recalculating the score on every render, only when playerHand changes.
  const playerScore = useMemo(() => calculateScore(playerHand), [playerHand]);

  const [isGameOver, setIsGameOver] = useState(false);
  const setTimedError = useTimeout();
  const setTimedGameOver = useTimeout();
  
  // --- Effects ---
  useEffect(() => {
    if (error) {
      setTimedError(() => clearError(), 3000);
    }
  }, [error, clearError, setTimedError]);
  
  useEffect(() => {
    if (playerMoney <= 0 && gameState === CONSTANTS.GAME_STATES.ROUND_OVER) {
      setTimedGameOver(() => setIsGameOver(true), 1500);
    }
  }, [playerMoney, gameState, setTimedGameOver]);
  
  // --- Event Handlers ---
  const handleResetGame = () => {
    setIsGameOver(false);
    resetGame();
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-950 text-white font-poppins flex flex-col">
      <AnimatePresence>
        {isGameOver && <GameOverModal onReset={handleResetGame} />}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
            className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-2 rounded-lg z-50 shadow-lg text-sm font-medium"
          >{error}</motion.div>
        )}
      </AnimatePresence>
      
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">GestureAI Blackjack</h1>
        <button
          onClick={toggleControlMode}
          aria-label="Toggle control mode"
          className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <span className="text-sm text-gray-400">Controls:</span>
          <span className={`font-medium capitalize ${controlMode === CONSTANTS.CONTROL_MODES.GESTURE ? 'text-blue-400' : 'text-gray-300'}`}>
            {controlMode}
          </span>
        </button>
      </header>
      
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 p-6 flex flex-col gap-6">
          <div className="bg-gray-900 rounded-xl p-4 flex justify-between items-center shadow-md">
            <div>
              <div className="text-sm text-gray-400">Balance</div>
              <div className="text-2xl font-bold">${playerMoney}</div>
            </div>
            <div className="flex gap-6">
              <div className="text-center"><div className="text-lg font-bold text-green-400">{roundsWon}</div><div className="text-xs text-gray-400">Won</div></div>
              <div className="text-center"><div className="text-lg font-bold text-red-400">{roundsLost}</div><div className="text-xs text-gray-400">Lost</div></div>
              <div className="text-center"><div className="text-lg font-bold text-yellow-400">{roundsPushed}</div><div className="text-xs text-gray-400">Push</div></div>
            </div>
          </div>
          
          <div className="flex-1 bg-green-800/50 rounded-xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-center items-center gap-4 bg-gradient-to-br from-green-800 to-green-900">
            {gameState === CONSTANTS.GAME_STATES.IDLE ? (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-medium mb-4 text-center">Place Your Bet</h3>
                <div className="flex gap-3 mb-4">
                  <input type="number" value={bet} onChange={(e) => setBet(e.target.value)} min="1" max={playerMoney} className="flex-1 bg-gray-800 rounded-lg px-4 py-2 text-center text-xl font-mono" aria-label="Bet amount" />
                  <button onClick={() => setBet(Math.floor(bet / 2))} className="bg-gray-800 hover:bg-gray-700 px-4 rounded-lg" aria-label="Halve bet">½</button>
                  <button onClick={() => setBet(Math.min(bet * 2, playerMoney))} className="bg-gray-800 hover:bg-gray-700 px-4 rounded-lg" aria-label="Double bet">2×</button>
                  <button onClick={() => setBet(playerMoney)} className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 rounded-lg" aria-label="Max bet">Max</button>
                </div>
                <button onClick={placeBet} disabled={bet <= 0 || bet > playerMoney || isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors" aria-label="Deal Cards">Deal Cards</button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-around">
                <Hand cards={dealerHand} playerType={CONSTANTS.PLAYER_TYPES.DEALER} />
                <div className="text-center h-16 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.p key={message} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="text-lg font-semibold text-white/90"><span role="status" aria-live="polite">{message}</span></motion.p>
                  </AnimatePresence>
                </div>
                <Hand cards={playerHand} playerType={CONSTANTS.PLAYER_TYPES.PLAYER} />
              </div>
            )}
          </div>
          
          <div className="h-24 flex items-center justify-center">
            {gameState === CONSTANTS.GAME_STATES.IN_PROGRESS && !isDealerTurn && (
              controlMode === CONSTANTS.CONTROL_MODES.MANUAL ? (
                <div className="flex justify-center gap-4">
                  <button onClick={hit} disabled={isLoading || playerScore >= 21} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-medium transition-colors" aria-label="Hit">Hit</button>
                  <button onClick={stand} disabled={isLoading} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-medium transition-colors" aria-label="Stand">Stand</button>
                </div>
              ) : (
                <div className="bg-gray-900 px-6 py-3 rounded-lg text-center"><p className="text-sm text-gray-400">Use hand gestures to play.</p></div>
              )
            )}
            {gameState === CONSTANTS.GAME_STATES.ROUND_OVER && playerMoney > 0 && (
              <button onClick={newRound} className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-medium transition-colors" aria-label="Next Round">Next Round</button>
            )}
          </div>
        </div>
        
        <aside className="w-full md:w-96 p-6 bg-gray-900/50 border-l border-gray-800">
          <CameraFeed />
        </aside>
      </main>
    </div>
  );
};

function App() {
  return <GameInterface />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);