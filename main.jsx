import React, { memo, useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import { shallow } from "zustand/shallow";
import "./index.css";

const GESTURE_POLL_INTERVAL = 1500;
const ACTION_DELAY = 400;

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const createDeck = () => {
  const deck = SUITS.flatMap(suit => RANKS.map(rank => ({ rank, suit, id: `${rank}-${suit}` })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.map((card) => ({ ...card, key: `${card.id}-${Math.random()}` }));
};

const calculateScore = (hand) => {
  let score = 0, aces = 0;
  for (const card of hand) {
    if (!card) continue;
    if (card.rank === "A") { score += 11; aces += 1; } 
    else if (["K", "Q", "J"].includes(card.rank)) { score += 10; } 
    else { score += parseInt(card.rank, 10); }
  }
  while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
  return score;
};

const gestureDetector = {
  gestureWeights: { idle: 0.75, hit: 0.12, stand: 0.13 },
  minConfidenceThreshold: 0.8,
  detectGesture() {
    const gestures = Object.keys(this.gestureWeights);
    const weights = Object.values(this.gestureWeights);
    let sum = 0;
    const cumulativeWeights = weights.map(w => sum += w);
    const rand = Math.random() * sum;
    const detectedGesture = gestures[cumulativeWeights.findIndex(cw => rand < cw)] || 'idle';
    const confidence = detectedGesture !== "idle" ? Math.random() * (0.95 - 0.7) + 0.7 : Math.random() * (0.8 - 0.5) + 0.5;
    const isConfident = detectedGesture !== "idle" && confidence >= this.minConfidenceThreshold;
    return { gesture: detectedGesture, confidence: parseFloat(confidence.toFixed(2)), isConfident };
  }
};

const useGameStore = create((set, get) => {
  const withLoading = (action) => (...args) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    setTimeout(() => {
      try {
        action(...args);
      } catch (error) {
        console.error(error);
        set({ error: error.message || "An unknown error occurred." });
      } finally {
        if (get().isLoading) set({ isLoading: false });
      }
    }, ACTION_DELAY);
  };
  
  const handleRoundOver = (winner, message) => {
    const { bet, isBlackjack, playerMoney, roundsWon, roundsLost, roundsPushed } = get();
    let newPlayerMoney = playerMoney, newRoundsWon = roundsWon, newRoundsLost = roundsLost, newRoundsPushed = roundsPushed;
    if (winner === "player") { newPlayerMoney += isBlackjack ? Math.floor(bet * 1.5) : bet; newRoundsWon++; } 
    else if (winner === "dealer") { newPlayerMoney -= bet; newRoundsLost++; } 
    else { newRoundsPushed++; }
    set({ winner, message, playerMoney: newPlayerMoney, roundsWon: newRoundsWon, roundsLost: newRoundsLost, roundsPushed: newRoundsPushed, gameState: "round_over", isDealerTurn: true });
  };

  const initialGameState = {
    deck: [], dealerHand: [], playerHand: [], dealerScore: 0, playerScore: 0, playerMoney: 1000,
    bet: 0, gameState: "idle", winner: null, message: "Welcome! Place your bet to start.", isBlackjack: false,
    roundsWon: 0, roundsLost: 0, roundsPushed: 0, controlMode: 'manual',
    error: null, isLoading: false, isDealerTurn: false,
  };

  return {
    ...initialGameState,
    setBet: (value) => set(state => ({ bet: Math.min(Math.max(0, parseInt(value, 10) || 0), state.playerMoney) })),
    clearError: () => set({ error: null }),
    initializeGame: () => set(initialGameState),
    toggleControlMode: () => set(state => ({ controlMode: state.controlMode === 'manual' ? 'gesture' : 'manual' })),
    placeBet: withLoading(() => {
      const { bet, playerMoney } = get();
      if (bet > playerMoney) return set({ error: "Insufficient funds." });
      if (bet <= 0) return set({ error: "Bet must be greater than zero." });

      const newDeck = createDeck();
      const playerHand = [newDeck.pop(), newDeck.pop()];
      const dealerHand = [newDeck.pop(), newDeck.pop()];
      const playerScore = calculateScore(playerHand);
      const dealerScore = calculateScore(dealerHand);
      const playerHasBJ = playerScore === 21;
      const dealerHasBJ = dealerScore === 21;

      set({ deck: newDeck, playerHand, dealerHand, playerScore, dealerScore, bet, winner: null, isBlackjack: playerHasBJ, gameState: "in_progress", message: "Game in progress. Hit or Stand?" });
      if (playerHasBJ || dealerHasBJ) {
          if (playerHasBJ && dealerHasBJ) handleRoundOver("push", "Push! You and the dealer both have Blackjack.");
          else if (playerHasBJ) handleRoundOver("player", "Blackjack! You win!");
          else handleRoundOver("dealer", "Dealer has Blackjack. You lose.");
      }
    }),
    hit: withLoading(() => {
        if (get().gameState !== "in_progress" || get().playerScore >= 21) return;
        const newDeck = [...get().deck];
        const playerHand = [...get().playerHand, newDeck.pop()];
        set({ deck: newDeck, playerHand, playerScore: calculateScore(playerHand) });
        if (calculateScore(playerHand) > 21) handleRoundOver("dealer", "Bust! You went over 21.");
    }),
    stand: async () => {
        if (get().gameState !== "in_progress" || get().isLoading) return;
        set({ isLoading: true, message: "Dealer is playing...", isDealerTurn: true });
        try {
            const delay = (ms) => new Promise(res => setTimeout(res, ms));
            await delay(1000);
            let dealerHand = [...get().dealerHand], dealerScore = calculateScore(dealerHand), currentDeck = [...get().deck];
            while (dealerScore < 17) {
                await delay(800);
                const newCard = currentDeck.pop();
                if (!newCard) break;
                dealerHand.push(newCard);
                dealerScore = calculateScore(dealerHand);
                set({ dealerHand: [...dealerHand], dealerScore, deck: [...currentDeck] });
            }
            await delay(500);
            const playerScore = get().playerScore;
            let winner, message;
            if (dealerScore > 21) { winner = "player"; message = `Dealer busts with ${dealerScore}! You win!`; }
            else if (playerScore > dealerScore) { winner = "player"; message = `You win! Your ${playerScore} beats dealer's ${dealerScore}.`; }
            else if (dealerScore > playerScore) { winner = "dealer"; message = `Dealer wins! Their ${dealerScore} beats your ${playerScore}.`; }
            else { winner = "push"; message = `Push! Both have ${playerScore}.`; }
            handleRoundOver(winner, message);
        } catch (e) { set({ error: "An error occurred during the dealer's turn." }); } 
        finally { set({ isLoading: false }); }
    },
    newRound: () => {
        if(get().isLoading) return;
        set(state => ({ ...initialGameState, playerMoney: state.playerMoney, roundsWon: state.roundsWon, roundsLost: state.roundsLost, roundsPushed: state.roundsPushed, controlMode: state.controlMode, message: "Place your bet for the next round." }));
    },
    resetGame: () => get().initializeGame(),
  };
});

const MOTION_VARIANTS = {
  panel: { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.5 } } },
  button: { hover: { scale: 1.05, boxShadow: "var(--tw-shadow-button-hover)" }, tap: { scale: 0.95 } }
};

const Card = memo(({ rank, suit, isHidden, isFlipping }) => {
  const color = suit === "hearts" || suit === "diamonds" ? "text-red-600" : "text-gray-900";
  const symbol = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" }[suit];
  const cardVariants = { hidden: { rotateY: 180 }, visible: { rotateY: 0 } };
  return (
    <div className="w-[80px] h-[112px] [perspective:1000px]">
      <motion.div className="relative w-full h-full shadow-card hover:shadow-card-hover transition-shadow duration-300 rounded-lg [transform-style:preserve-3d]" variants={cardVariants} animate={isHidden && !isFlipping ? "hidden" : "visible"} transition={{ duration: 0.6, ease: "easeInOut" }}>
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg border-2 border-blue-500/50 p-2 flex items-center justify-center [backface-visibility:hidden]"><div className="w-full h-full border-2 border-white/20 rounded-md bg-blue-800 bg-repeat" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '5px 5px' }}/></div>
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-br from-white to-gray-100 rounded-lg border border-gray-300 flex flex-col p-2 ${color} [transform:rotateY(180deg)] [backface-visibility:hidden]`}><div className="flex justify-between items-start h-1/4"><div className="text-xl font-bold leading-none">{rank}</div><div className="text-lg leading-none">{symbol}</div></div><div className="flex-grow flex items-center justify-center text-4xl font-bold">{symbol}</div><div className="flex justify-between items-end h-1/4 rotate-180"><div className="text-xl font-bold leading-none">{rank}</div><div className="text-lg leading-none">{symbol}</div></div></div>
      </motion.div>
    </div>
  );
});

const Hand = memo(({ cards, type }) => {
  const { gameState, isDealerTurn } = useGameStore(state => ({ gameState: state.gameState, isDealerTurn: state.isDealerTurn }), shallow);
  const isRoundActive = gameState === 'in_progress';
  return (
    <div className="flex justify-center items-center relative" style={{ height: '112px', minWidth: `${80 + (Math.max(0, cards.length - 1)) * 45}px`}}>
      <AnimatePresence>{cards.map((card, idx) => (<motion.div key={card.key} layoutId={card.key} initial={{ opacity: 0, y: type === 'player' ? 20 : -20 }} animate={{ opacity: 1, y: 0, x: (idx - (cards.length -1) / 2) * 45, zIndex: idx }} exit={{ opacity: 0, y: type === 'player' ? 20 : -20 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="absolute"><Card rank={card.rank} suit={card.suit} isHidden={type === 'dealer' && isRoundActive && idx === 0} isFlipping={type === 'dealer' && isDealerTurn && idx === 0} /></motion.div>))}</AnimatePresence>
    </div>
  );
});

const Table = memo(() => {
  const { dealerHand, playerHand, dealerScore, playerScore, gameState, isDealerTurn } = useGameStore(state => state, shallow);
  const showDealerScore = isDealerTurn || gameState === 'round_over';
  return (<motion.div layout className="flex flex-col items-center justify-around relative w-full h-full p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}><div className="absolute inset-0 bg-felt rounded-2xl shadow-2xl bg-felt-pattern" style={{ backgroundSize: '40px 40px' }}></div><div className="absolute left-1/2 top-0 bottom-0 w-1.5 -translate-x-1/2 bg-felt-light/20 blur-sm"></div><div className="relative z-10 p-4 w-full flex-1 flex flex-col justify-end items-center"><motion.div className="mb-4 px-4 py-1.5 rounded-full bg-black/60 text-white/95 backdrop-blur-sm text-base tracking-wide font-semibold shadow-md border border-white/10" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}><span className="mr-2 opacity-80">Dealer</span><span className="ml-1 px-3 py-1 bg-black/70 rounded-md text-white text-sm font-mono">{showDealerScore ? dealerScore : '?'}</span></motion.div><Hand cards={dealerHand} type="dealer" /></div><div className="relative z-10 p-4 w-full flex-1 flex flex-col justify-start items-center"><Hand cards={playerHand} type="player" /><motion.div className="mt-4 px-4 py-1.5 rounded-full bg-black/60 text-white/95 backdrop-blur-sm text-base tracking-wide font-semibold shadow-md border border-white/10" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}><span className="mr-2 opacity-80">You</span><span className="ml-1 px-3 py-1 bg-black/70 rounded-md text-white text-sm font-mono">{playerScore}</span></motion.div></div></motion.div>);
});

const useGestureDetection = () => {
    const { hit, stand, gameState, controlMode, isLoading } = useGameStore(state => state, shallow);
    const [gestureData, setGestureData] = useState({ gesture: "idle", confidence: 0 });
    useEffect(() => {
        if (controlMode !== 'gesture') return;
        let mounted = true;
        const intervalId = setInterval(() => {
            if (!mounted) return;
            const data = gestureDetector.detectGesture();
            setGestureData(data);
            if (data.isConfident && gameState === "in_progress" && !isLoading) {
                if (data.gesture === "hit") hit();
                else if (data.gesture === "stand") stand();
            }
        }, GESTURE_POLL_INTERVAL);
        return () => { mounted = false; clearInterval(intervalId); };
    }, [controlMode, gameState, isLoading, hit, stand]);
    return { gestureData };
};

const CameraFeed = () => {
    const videoRef = useRef(null);
    const [isStreamActive, setIsStreamActive] = useState(false);
    const [streamError, setStreamError] = useState(null);
    const { controlMode, isLoading } = useGameStore(state => ({ controlMode: state.controlMode, isLoading: state.isLoading }), shallow);
    const { gestureData } = useGestureDetection();
    
    useEffect(() => {
      let stream;
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, facingMode: "user" }, audio: false });
          if (videoRef.current) { videoRef.current.srcObject = stream; setIsStreamActive(true); setStreamError(null); }
        } catch (error) {
          let msg = "Camera access denied or unavailable.";
          if (error.name === 'NotAllowedError') msg = "Please allow camera permissions.";
          else if (error.name === 'NotFoundError') msg = "No camera was found.";
          setStreamError(msg);
        }
      };
      startCamera();
      return () => { stream?.getTracks().forEach(track => track.stop()); };
    }, []);
    
    return (
        <div className="bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-game-panel overflow-hidden h-full flex flex-col">
            <div className="px-4 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${isStreamActive ? 'bg-purple-500 animate-pulse' : 'bg-gray-600'}`}></div><h3 className="text-lg font-semibold text-white">Camera Feed</h3></div>
                <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${isStreamActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}><div className={`w-2 h-2 rounded-full ${isStreamActive ? 'bg-green-500' : 'bg-red-500'}`}></div>{isStreamActive ? 'Live' : 'Offline'}</div>
            </div>
            <div className="flex-1 flex flex-col">
                <div className="relative w-full aspect-[16/9] bg-gray-900">
                    {streamError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                            <svg className="h-12 w-12 text-red-400 mb-3" fill="currentColor" viewBox="0 0 24 24"><path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
                            <h3 className="text-lg font-semibold text-red-400 mb-2">Camera Unavailable</h3>
                            <p className="text-gray-400 text-sm max-w-xs">{streamError}</p>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                            {controlMode === 'gesture' && isStreamActive && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className={`w-56 h-56 rounded-lg transition-all duration-300 ${isLoading ? 'border-4 border-blue-400 shadow-2xl shadow-blue-500/50' : 'border-2 border-dashed border-white/40 animate-pulse'}`}></div>
                                </div>
                            )}
                            {controlMode === 'manual' && isStreamActive && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20 text-center">
                                        <div className="text-white font-medium mb-1">Manual Mode Active</div>
                                        <div className="text-gray-300 text-sm">Switch to gesture mode</div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="px-4 py-3 bg-black/30 border-t border-white/5 flex-shrink-0 h-[74px] flex items-center">
                    {controlMode === 'gesture' ? (
                        <div className="space-y-3 w-full animate-fadeZoomIn">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-400">Status:</span>
                                <span className={`text-sm font-medium ${isLoading ? 'text-blue-400' : 'text-gray-400'}`}>{isLoading ? "Processing Action..." : "Awaiting Gesture"}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-green-500" initial={{ width: 0 }} animate={{ width: `${isLoading ? 100 : gestureData.confidence * 100}%` }} transition={{ duration: isLoading ? 0.5 : 0.3, ease: 'easeOut' }}/>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center w-full"><p className="text-gray-400 text-sm">Enable gesture mode to use AI detection.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

const GamePage = () => {
    const { gameState, bet, playerMoney, isLoading, error, controlMode, winner, message, isBlackjack, roundsWon, roundsLost, roundsPushed, playerScore } = useGameStore(state => state, shallow);
    const { initializeGame, clearError, toggleControlMode, setBet, placeBet, hit, stand, newRound, resetGame } = useGameStore.getState();
    const [initializing, setInitializing] = useState(true);
    const [showGameOver, setShowGameOver] = useState(false);
    const [gameOverCountdown, setGameOverCountdown] = useState(null);
    useEffect(() => { initializeGame(); setInitializing(false); }, []);
    useEffect(() => { if (error) { const timer = setTimeout(clearError, 5000); return () => clearTimeout(timer); } }, [error, clearError]);
    useEffect(() => {
        if (playerMoney <= 0 && gameState === "round_over" && !showGameOver) {
            let count = 3;
            setGameOverCountdown(count);
            const timer = setInterval(() => { count--; setGameOverCountdown(count); if (count <= 0) { clearInterval(timer); setShowGameOver(true); }}, 1000);
            return () => clearInterval(timer);
        }
    }, [playerMoney, gameState, showGameOver]);

    if (initializing) return <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md"><div className="w-16 h-16 border-t-2 border-b-2 border-casino-500 rounded-full animate-spin"></div></div>;
    if (showGameOver) return <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50"><motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-black/60 backdrop-blur-md p-10 rounded-2xl border border-red-500/20 shadow-2xl max-w-md w-full mx-4 text-center"><h2 className="text-4xl mb-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">Game Over</h2><p className="text-xl text-gray-300 mb-6">You've run out of money.</p><div className="mb-8 p-4 bg-black/30 rounded-lg"><p className="text-sm text-gray-400 mb-2">Final Statistics:</p><div className="grid grid-cols-3 gap-2 text-center"><div><div className="text-2xl text-green-400 font-bold">{roundsWon}</div><div className="text-xs text-gray-500">Won</div></div><div><div className="text-2xl text-red-400 font-bold">{roundsLost}</div><div className="text-xs text-gray-500">Lost</div></div><div><div className="text-2xl text-yellow-400 font-bold">{roundsPushed}</div><div className="text-xs text-gray-500">Pushes</div></div></div></div><motion.button {...MOTION_VARIANTS.button} onClick={() => { setShowGameOver(false); resetGame(); }} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 rounded-xl text-white font-semibold shadow-lg transition-all text-lg">Start New Game</motion.button></motion.div></div>;
    
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
            {isLoading && (<div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"><div className="w-12 h-12 border-t-2 border-b-2 border-casino-500 rounded-full animate-spin"></div></div>)}
            <header className="flex justify-between items-center px-6 py-4 bg-black/30 backdrop-blur-md border-b border-white/10 flex-shrink-0"><motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}><h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">GestureAI Blackjack</h1></motion.div><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 bg-black/30 px-3 py-1.5 rounded-full border border-white/10"><span className="text-sm font-medium text-gray-300">Controls:</span><button onClick={toggleControlMode} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${controlMode === 'gesture' ? 'bg-indigo-600' : 'bg-gray-700'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${controlMode === 'gesture' ? 'translate-x-6' : 'translate-x-1'}`}/></button><span className={`text-sm font-medium w-16 text-center ${controlMode === 'gesture' ? 'text-indigo-400' : 'text-gray-300'}`}>{controlMode === 'gesture' ? 'Gesture' : 'Manual'}</span></motion.div></header>
            <main className="flex-1 flex overflow-hidden">
                <div className="w-3/5 flex flex-col p-4 overflow-y-auto game-scroll">
                    <motion.div variants={MOTION_VARIANTS.panel} className="mb-4 flex-shrink-0"><div className="bg-black/50 backdrop-blur-md rounded-xl shadow-game-panel p-5 border border-white/10"><div className="flex justify-between items-center mb-4"><div className="flex items-center gap-4"><div className="relative w-14 h-14"><div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full shadow-lg"></div><div className="absolute inset-1 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center text-yellow-900 font-bold text-2xl">$</div></div><div><div className="text-sm text-gray-300">Your Balance</div><div className="text-3xl font-semibold tracking-wide">${playerMoney.toLocaleString()}</div></div></div><div className="text-sm px-4 py-2 bg-black/50 rounded-full text-gray-200 border border-white/10 font-medium">{gameState === "idle" ? "Place Bet" : gameState === "in_progress" ? "In Game" : "Round Over"}</div></div>{(roundsWon > 0 || roundsLost > 0 || roundsPushed > 0) && (<div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-white/10"><div className="text-center"><div className="text-lg font-bold text-green-400">{roundsWon}</div><div className="text-xs text-gray-400">Wins</div></div><div className="text-center"><div className="text-lg font-bold text-red-400">{roundsLost}</div><div className="text-xs text-gray-400">Losses</div></div><div className="text-center"><div className="text-lg font-bold text-yellow-400">{roundsPushed}</div><div className="text-xs text-gray-400">Pushes</div></div></div>)}</div></motion.div>
                    <AnimatePresence mode="wait">{message && (<motion.div key={message} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 px-6 py-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-center flex-shrink-0"><p className="text-gray-200 font-medium">{message}</p>{isBlackjack && winner === 'player' && (<div className="mt-2 text-yellow-400 text-sm font-semibold">🎉 Blackjack pays 3 to 2! 🎉</div>)}</motion.div>)}</AnimatePresence>
                    {gameState === "idle" && (<motion.div variants={MOTION_VARIANTS.panel} className="mb-4 flex-shrink-0"><div className="bg-black/50 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20 shadow-game-panel"><h3 className="text-xl font-semibold mb-4 text-center text-white/90">Place Your Bet</h3><div className="space-y-4"><div className="relative"><input type="number" min="1" max={playerMoney} value={bet || ''} onChange={(e) => setBet(e.target.value)} className="w-full bg-gray-900/80 text-white border-2 border-purple-500/40 rounded-lg py-4 px-5 text-center text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent shadow-md" placeholder="0" /><div className="absolute right-5 top-1/2 -translate-y-1/2 text-purple-400 font-semibold text-xl">$</div></div><div className="flex justify-between gap-3"><button onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))} className="flex-1 bg-gray-800/90 hover:bg-gray-700 rounded-lg py-2 text-sm font-medium transition-colors border border-white/10 shadow-sm">½ Bet</button><button onClick={() => setBet(Math.min(playerMoney, bet * 2 || 2))} className="flex-1 bg-gray-800/90 hover:bg-gray-700 rounded-lg py-2 text-sm font-medium transition-colors border border-white/10 shadow-sm">2× Bet</button><button onClick={() => setBet(playerMoney)} className="flex-1 bg-gradient-to-r from-red-600/80 to-purple-600/80 hover:from-red-600 hover:to-purple-600 rounded-lg py-2 text-sm font-bold transition-all border border-red-500/50 shadow-md">All In</button></div></div><motion.button {...MOTION_VARIANTS.button} onClick={placeBet} disabled={!bet || bet <= 0 || bet > playerMoney || isLoading} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:filter disabled:grayscale disabled:cursor-not-allowed px-8 py-3 rounded-lg font-semibold shadow-lg transition-all flex items-center justify-center gap-3 text-lg">Place Bet</motion.button></div></motion.div>)}
                    {(gameState === "in_progress" || gameState === "round_over") && (<motion.div className="flex-1 min-h-[350px]"><Table /></motion.div>)}
                    <div className="mt-auto pt-4 flex-shrink-0">
                        {gameState === "in_progress" && (<div className="flex flex-col items-center">{controlMode === 'manual' ? (<motion.div className="flex justify-center gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}><motion.button {...MOTION_VARIANTS.button} onClick={hit} disabled={isLoading || playerScore >= 21} className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 disabled:filter disabled:grayscale disabled:cursor-not-allowed px-8 py-3 rounded-xl font-semibold shadow-lg flex items-center gap-2 text-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>Hit</motion.button><motion.button {...MOTION_VARIANTS.button} onClick={stand} disabled={isLoading} className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:filter disabled:grayscale disabled:cursor-not-allowed px-8 py-3 rounded-xl font-semibold shadow-lg flex items-center gap-2 text-lg"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>Stand</motion.button></motion.div>) : (<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="px-6 py-4 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md rounded-xl border border-indigo-500/30 shadow-lg"><div className="flex items-center gap-3 justify-center mb-1"><div className="relative flex items-center justify-center"><div className="absolute w-3 h-3 bg-indigo-500/50 rounded-full animate-ping"></div><div className="relative w-2 h-2 bg-indigo-500 rounded-full"></div></div><h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-400">Gesture Control Active</h3></div><p className="text-gray-300 text-sm text-center">Use camera feed to Hit or Stand</p></motion.div>)}</div>)}
                        {gameState === "round_over" && (<motion.div className="flex flex-col items-center gap-4 mt-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>{winner && (<div className={`text-xl font-bold px-6 py-3 rounded-full border-2 ${winner === 'player' ? 'bg-green-600/20 border-green-500/50 text-green-300' : winner === 'dealer' ? 'bg-red-600/20 border-red-500/50 text-red-300' : 'bg-yellow-600/20 border-yellow-500/50 text-yellow-300'}`}>{winner === 'player' ? '🎉 You Win! 🎉' : winner === 'dealer' ? '😔 Dealer Wins' : '🤝 Push - Tie'}</div>)}<AnimatePresence mode="wait"><motion.div key={playerMoney > 0 ? 'play' : 'over'} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>{playerMoney > 0 ? (<motion.button {...MOTION_VARIANTS.button} onClick={newRound} disabled={isLoading} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:filter disabled:grayscale disabled:cursor-not-allowed px-8 py-3 rounded-xl font-semibold shadow-lg flex items-center gap-3 text-lg">Play Again</motion.button>) : (<div className="text-lg font-semibold px-6 py-3 mt-2 bg-red-600/20 border border-red-500/50 rounded-full text-red-300 animate-pulse">Game over in {gameOverCountdown}...</div>)}</motion.div></AnimatePresence></motion.div>)}
                    </div>
                </div>
                <aside className="w-2/5 p-4 flex-shrink-0"><motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4, duration: 0.5 }} className="h-full"><CameraFeed /></motion.div></aside>
            </main>
        </motion.div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GamePage />
  </React.StrictMode>
);