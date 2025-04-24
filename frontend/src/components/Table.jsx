import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import DealerHand from "./DealerHand";
import PlayerHand from "./PlayerHand";

function Table() {
  const { dealerHand, playerHand, dealerScore, playerScore } = useGameStore();

  return (
    <motion.div
      className="flex flex-col items-center mt-8 relative w-full max-w-3xl py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 bg-felt rounded-3xl shadow-game-panel bg-felt-pattern" style={{ transform: 'translateZ(-10px)', backgroundSize: '20px 20px' }}></div>
      
      <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-felt-light/30 blur-sm"></div>

      <div className="relative mb-16 z-10 p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          <motion.div 
            className="mb-4 px-5 py-1.5 rounded-full bg-black/60 text-white/95 backdrop-blur-sm text-lg tracking-wide font-semibold shadow-md border border-white/5"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="mr-2">Dealer</span><span className="ml-1 px-3 py-0.5 bg-black/70 rounded-md text-white text-sm">{dealerScore}</span>
          </motion.div>
          <DealerHand cards={dealerHand} />
        </div>
      </div>
      
      <div className="relative z-10 p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          <PlayerHand cards={playerHand} />
          <motion.div 
            className="mt-4 px-5 py-1.5 rounded-full bg-black/60 text-white/95 backdrop-blur-sm text-lg tracking-wide font-semibold shadow-md border border-white/5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="mr-2">You</span><span className="ml-1 px-3 py-0.5 bg-black/70 rounded-md text-white text-sm">{playerScore}</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export default Table;