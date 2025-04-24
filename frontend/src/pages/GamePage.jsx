import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import Table from "../components/Table";
import GestureIndicator from "../components/GestureIndicator";
import { Link } from "react-router-dom";
import { useEffect } from "react";

function GamePage() {
  const {
    gameState,
    startRound,
    placeBet,
    bet,
    setBet,
    hit,
    stand,
    newRound,
    playerMoney,
    resetGame
  } = useGameStore();
  
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  if (playerMoney <= 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/40 backdrop-blur-md p-10 rounded-2xl border border-red-500/20 shadow-game-panel max-w-md w-full text-center"
        >
          <h2 className="text-4xl mb-4 font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">Game Over</h2>
          <p className="text-xl text-gray-300 mb-6">You have no more funds to continue playing.</p>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/" className="inline-block bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 rounded-full text-white font-medium shadow-button">
              Back to Home
            </Link>
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

  return (
    <div className="flex flex-col items-center min-h-[80vh] p-4 relative">
      <motion.div 
        className="w-full flex justify-between items-center mb-8 px-6 py-3"
        variants={headerVariants}
        initial="initial"
        animate="animate"
      >
        <Link to="/" className="text-gray-200 hover:text-white transition-colors flex items-center gap-2 px-3 py-1.5 bg-black/30 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span>Home</span>
        </Link>
        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500 px-4 py-2">
          GestureAI Blackjack
        </div>
      </motion.div>
      
      <motion.div 
        className="w-full max-w-3xl mb-8 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-black/50 backdrop-blur-md rounded-xl shadow-game-panel px-6 py-4 flex justify-between items-center border border-white/10">
          <div className="flex items-center gap-3">
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
             gameState === "bet_placed" ? "Ready to Deal" : 
             gameState === "in_progress" ? "In Game" : "Round Complete"}
          </div>
        </div>
      </motion.div>

      {gameState === "idle" && (
        <motion.div 
          className="mb-8 w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-black/50 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20 shadow-game-panel">
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
              
              <div className="flex justify-between gap-3 mt-3">
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
              disabled={bet < 1 || bet > playerMoney}
              className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 px-8 py-4 rounded-lg font-semibold shadow-button transition-all flex items-center justify-center gap-3 text-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Place Bet
            </motion.button>
          </div>
        </motion.div>
      )}

      {(gameState === "in_progress" || gameState === "round_over") && (
        <motion.div 
          className="w-full max-w-4xl mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Table />
        </motion.div>
      )}
      
      {gameState === "in_progress" && (
        <motion.div 
          className="flex gap-6 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={hit}
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 px-10 py-4 rounded-xl font-semibold shadow-button flex items-center gap-3 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Hit
          </motion.button>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={stand}
            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-10 py-4 rounded-xl font-semibold shadow-button flex items-center gap-3 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            Stand
          </motion.button>
        </motion.div>
      )}
      
      {gameState === "round_over" && (
        <motion.div 
          className="flex flex-col items-center gap-4 mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-xl font-semibold px-6 py-2.5 bg-black/40 backdrop-blur-sm rounded-full border border-white/10 mb-2 shadow-md">Round Complete</div>
          <motion.button
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={newRound}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-10 py-4 rounded-xl font-semibold shadow-button flex items-center gap-3 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Play Again
          </motion.button>
        </motion.div>
      )}
      
      <div className="mt-auto pt-8 pb-4">
        <GestureIndicator />
      </div>
    </div>
  );
}

export default GamePage;