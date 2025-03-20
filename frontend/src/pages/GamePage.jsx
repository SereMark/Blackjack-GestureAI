import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import Table from "../components/Table";
import GestureIndicator from "../components/GestureIndicator";

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
    playerMoney
  } = useGameStore();

  if (playerMoney <= 0) {
    return (
      <div className="flex flex-col items-center justify-center">
        <h2 className="text-4xl mb-4 font-bold">Game Over</h2>
        <p className="text-lg">You have no more funds.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4">
      <div className="text-3xl font-bold mb-6">GestureAI Blackjack</div>
      <div className="flex flex-col items-center p-4 bg-black/30 backdrop-blur-md rounded-xl shadow-xl">
        <div className="text-xl mb-2 font-semibold">Balance: ${playerMoney}</div>
        {gameState === "idle" && (
          <div className="flex flex-col items-center gap-3">
            <motion.input
              type="number"
              min="1"
              max={playerMoney}
              value={bet}
              onChange={(e) => setBet(parseInt(e.target.value) || 0)}
              className="text-black rounded p-2 w-32 text-center outline-none ring-2 ring-purple-500"
              placeholder="Bet Amount"
              whileFocus={{ scale: 1.03 }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={placeBet}
              disabled={bet < 1 || bet > playerMoney}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-md disabled:bg-gray-600 shadow-md"
            >
              Place Bet
            </motion.button>
          </div>
        )}
        {gameState === "bet_placed" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRound}
            className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-md mt-3 shadow-md"
          >
            Deal
          </motion.button>
        )}
      </div>
      {(gameState === "in_progress" || gameState === "round_over") && <Table />}
      {gameState === "in_progress" && (
        <div className="flex gap-4 mt-5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={hit}
            className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-md shadow-md"
          >
            Hit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={stand}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-md shadow-md"
          >
            Stand
          </motion.button>
        </div>
      )}
      {gameState === "round_over" && (
        <div className="flex flex-col items-center gap-3 mt-6">
          <div className="text-xl font-semibold">Round Over</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={newRound}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-md shadow-md"
          >
            New Round
          </motion.button>
        </div>
      )}
      <GestureIndicator />
    </div>
  );
}

export default GamePage;