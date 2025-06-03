import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import Table from "../components/Table";
import CameraFeed from "../components/CameraFeed";
import { useEffect, useState } from "react";

function GamePage() {
  const {
    gameState,
    placeBet,
    bet,
    setBet,
    hit,
    stand,
    newRound,
    playerMoney,
    resetGame,
    initializeGame,
    isLoading,
    error,
    controlMode,
    toggleControlMode,
    winner,
    message,
    isBlackjack,
    roundsWon,
    roundsLost,
    roundsPushed,
    clearError
  } = useGameStore();
  
  const [initializing, setInitializing] = useState(true);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverCountdown, setGameOverCountdown] = useState(null);
  
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        await initializeGame();
      } finally {
        setInitializing(false);
      }
    };
    
    loadInitialState();
  }, [initializeGame]);

  // Handle game over timing - show final cards before game over
  useEffect(() => {
    if (playerMoney <= 0 && gameState === "round_over") {
      // Start countdown from 3 seconds
      setGameOverCountdown(3);
      
      const countdownInterval = setInterval(() => {
        setGameOverCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowGameOver(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => {
        clearInterval(countdownInterval);
        setGameOverCountdown(null);
      };
    } else {
      setShowGameOver(false);
      setGameOverCountdown(null);
    }
  }, [playerMoney, gameState]);

  // Auto-clear errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  if (showGameOver) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/60 backdrop-blur-md p-10 rounded-2xl border border-red-500/20 shadow-2xl max-w-md w-full mx-4 text-center"
        >
          <h2 className="text-4xl mb-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">Game Over</h2>
          <p className="text-xl text-gray-300 mb-6">You have no more funds to continue playing.</p>
          <div className="mb-6 p-4 bg-black/30 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">Final Statistics:</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-green-400 font-bold">{roundsWon}</div>
                <div className="text-xs text-gray-500">Won</div>
              </div>
              <div>
                <div className="text-red-400 font-bold">{roundsLost}</div>
                <div className="text-xs text-gray-500">Lost</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold">{roundsPushed}</div>
                <div className="text-xs text-gray-500">Push</div>
              </div>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button 
              onClick={() => {
                setShowGameOver(false);
                resetGame();
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-6 py-3 rounded-xl text-white font-medium shadow-lg transition-all"
            >
              New Game
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }
  
  const headerVariants = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  const buttonVariants = {
    hover: { scale: 1.05, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)" },
    tap: { scale: 0.95 }
  };

  if (initializing) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-black/40 backdrop-blur-md p-8 rounded-xl border border-white/10 shadow-lg text-center"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <p className="text-xl text-gray-300">Loading game...</p>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 bg-red-600/90 backdrop-blur-md border border-red-500/50 rounded-lg p-4 max-w-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-red-100">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-200 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
      
      {/* Header */}
      <motion.div 
        className="flex justify-between items-center px-6 py-4 bg-black/30 backdrop-blur-md border-b border-white/10 flex-shrink-0"
        variants={headerVariants}
        initial="initial"
        animate="animate"
      >
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
          GestureAI Blackjack
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 bg-black/30 px-4 py-2 rounded-full border border-white/10"
        >
          <span className="text-sm font-medium text-gray-300">Control Mode:</span>
          <button
            onClick={toggleControlMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              controlMode === 'gesture' ? 'bg-indigo-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                controlMode === 'gesture' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
            <span className="sr-only">Toggle Control Mode</span>
          </button>
          <span className="text-sm font-medium">
            {controlMode === 'gesture' ? (
              <span className="text-indigo-400">Gesture</span>
            ) : (
              <span className="text-gray-300">Manual</span>
            )}
          </span>
        </motion.div>
      </motion.div>

      {/* Main 50/50 Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Half - Game Area */}
        <div className="w-1/2 flex flex-col p-4 overflow-y-auto game-scroll">
          
          {/* Player Info Panel */}
          <motion.div 
            className="mb-4 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-black/50 backdrop-blur-md rounded-xl shadow-2xl px-6 py-4 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-md"></div>
                    <div className="absolute inset-1 bg-gradient-to-r from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center text-yellow-900 font-bold text-sm">$</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-300">Your Balance</div>
                    <div className="text-2xl font-semibold tracking-wide">${playerMoney.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-sm px-4 py-2 bg-black/50 rounded-full text-gray-200 border border-white/10 font-medium">
                  {gameState === "idle" ? "Place Your Bet" : 
                   gameState === "in_progress" ? "In Game" : "Round Complete"}
                </div>
              </div>
              
              {/* Game Statistics */}
              {(roundsWon > 0 || roundsLost > 0 || roundsPushed > 0) && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{roundsWon}</div>
                    <div className="text-xs text-gray-400">Wins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400">{roundsLost}</div>
                    <div className="text-xs text-gray-400">Losses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-400">{roundsPushed}</div>
                    <div className="text-xs text-gray-400">Pushes</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Game Message */}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 px-6 py-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-center flex-shrink-0"
            >
              <p className="text-gray-200 font-medium">{message}</p>
              {isBlackjack && (
                <div className="mt-2 text-yellow-400 text-sm font-semibold">
                  🎉 Blackjack pays 3:2! 🎉
                </div>
              )}
            </motion.div>
          )}

          {/* Betting Interface */}
          {gameState === "idle" && (
            <motion.div 
              className="mb-4 flex-shrink-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-black/50 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20 shadow-2xl">
                <h3 className="text-xl font-semibold mb-4 text-center text-white/90">Place Your Bet</h3>
                
                <div className="space-y-4">
                  <div className="relative">
                    <motion.input
                      type="number"
                      min="1"
                      max={playerMoney}
                      value={bet}
                      onChange={(e) => setBet(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-900/90 text-white border-2 border-purple-500/40 rounded-lg py-4 px-5 text-center text-2xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent shadow-md"
                      placeholder="Bet Amount"
                      whileFocus={{ scale: 1.02 }}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-purple-400 font-semibold text-xl">$</div>
                  </div>
                  
                  <div className="flex justify-between gap-3">
                    <button 
                      onClick={() => setBet(Math.max(1, Math.floor(bet / 2)))}
                      className="flex-1 bg-gray-800/90 hover:bg-gray-700 rounded-lg py-3 text-sm font-medium transition-colors border border-white/5 shadow-sm"
                    >
                      ½ Bet
                    </button>
                    <button 
                      onClick={() => setBet(Math.min(playerMoney, bet * 2))}
                      className="flex-1 bg-gray-800/90 hover:bg-gray-700 rounded-lg py-3 text-sm font-medium transition-colors border border-white/5 shadow-sm"
                    >
                      2× Bet
                    </button>
                    <button 
                      onClick={() => setBet(playerMoney)}
                      className="flex-1 bg-gray-800/90 hover:bg-gray-700 rounded-lg py-3 text-sm font-medium transition-colors border border-white/5 shadow-sm"
                    >
                      All In
                    </button>
                  </div>
                </div>
                
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={placeBet}
                  disabled={bet < 1 || bet > playerMoney || isLoading}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 px-8 py-4 rounded-lg font-semibold shadow-lg transition-all flex items-center justify-center gap-3 text-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Place Bet
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Game Table */}
          {(gameState === "in_progress" || gameState === "round_over") && (
            <motion.div 
              className="flex-1 min-h-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Table />
            </motion.div>
          )}
          
          {/* Game Controls */}
          {gameState === "in_progress" && (
            <div className="mt-4 flex-shrink-0">
              {controlMode === 'manual' ? (
                <motion.div 
                  className="flex justify-center gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={hit}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 disabled:from-gray-600 disabled:to-gray-500 px-8 py-3 rounded-xl font-semibold shadow-lg flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Hit
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    onClick={stand}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-500 px-8 py-3 rounded-xl font-semibold shadow-lg flex items-center gap-3"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    Stand
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="px-6 py-4 bg-gradient-to-b from-black/60 to-black/40 backdrop-blur-md rounded-xl border border-indigo-500/30 shadow-lg"
                >
                  <div className="flex items-center gap-3 justify-center mb-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-indigo-500/30 rounded-full animate-ping"></div>
                      <div className="relative w-3 h-3 bg-indigo-500 rounded-full z-10"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-blue-400">
                      Gesture Control Active
                    </h3>
                  </div>
                  <p className="text-gray-300 text-sm text-center">
                    Use the camera feed on the right to control the game with hand gestures
                  </p>
                </motion.div>
              )}
            </div>
          )}
          
          {/* Round Over Controls */}
          {gameState === "round_over" && (
            <motion.div 
              className="flex flex-col items-center gap-4 mt-4 flex-shrink-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Winner Announcement */}
              {winner && (
                <div className={`text-xl font-bold px-6 py-3 rounded-full border-2 ${
                  winner === 'player' ? 'bg-green-600/20 border-green-500/50 text-green-300' :
                  winner === 'dealer' ? 'bg-red-600/20 border-red-500/50 text-red-300' :
                  'bg-yellow-600/20 border-yellow-500/50 text-yellow-300'
                }`}>
                  {winner === 'player' ? '🎉 You Win! 🎉' :
                   winner === 'dealer' ? '😔 Dealer Wins' :
                   '🤝 Push - It\'s a Tie!'}
                </div>
              )}
              
              {/* Show different content based on whether player has money left */}
              {playerMoney <= 0 ? (
                <div className="text-center">
                  <motion.div 
                    className="text-lg font-semibold px-6 py-3 bg-red-600/20 border border-red-500/50 rounded-full text-red-300 mb-4 flex items-center justify-center gap-3"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-4 h-4 bg-red-500 rounded-full"
                        animate={{ scale: [1, 0.8, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      💸 Out of Funds - Game Over in {gameOverCountdown || 0}
                    </div>
                  </motion.div>
                  <p className="text-gray-400 text-sm">
                    You've run out of money to continue playing.
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    View your final cards above before the game ends
                  </div>
                </div>
              ) : (
                <motion.button
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  onClick={newRound}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-500 px-8 py-3 rounded-xl font-semibold shadow-lg flex items-center gap-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Play Again
                </motion.button>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Half - Camera Feed */}
        <div className="w-1/2 p-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="h-full"
          >
            <CameraFeed />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;