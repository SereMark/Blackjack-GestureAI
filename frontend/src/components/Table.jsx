import { motion } from "framer-motion";
import { memo } from "react";
import { useGameStore } from "../store/gameStore";
import DealerHand from "./DealerHand";
import PlayerHand from "./PlayerHand";

const Table = memo(function Table() {
  const { dealerHand, playerHand, dealerScore, playerScore } = useGameStore(
    (state) => ({
      dealerHand: state.dealerHand,
      playerHand: state.playerHand,
      dealerScore: state.dealerScore,
      playerScore: state.playerScore,
    })
  );

  return (
    <motion.div
      className="flex flex-col items-center relative w-full h-full py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="absolute inset-0 bg-felt rounded-2xl shadow-2xl bg-felt-pattern" style={{ backgroundSize: '20px 20px' }}></div>
      
      <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 bg-felt-light/30 blur-sm"></div>

      {/* Dealer Section */}
      <div className="relative z-10 p-4 w-full max-w-lg flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center">
          <motion.div 
            className="mb-3 px-4 py-1.5 rounded-full bg-black/60 text-white/95 backdrop-blur-sm text-base tracking-wide font-semibold shadow-md border border-white/5"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="mr-2">Dealer</span>
            <span className="ml-1 px-2 py-0.5 bg-black/70 rounded-md text-white text-sm">{dealerScore}</span>
          </motion.div>
          <DealerHand cards={dealerHand} />
        </div>
      </div>
      
      {/* Player Section */}
      <div className="relative z-10 p-4 w-full max-w-lg flex-1 flex flex-col justify-center">
        <div className="flex flex-col items-center">
          <PlayerHand cards={playerHand} />
          <motion.div 
            className="mt-3 px-4 py-1.5 rounded-full bg-black/60 text-white/95 backdrop-blur-sm text-base tracking-wide font-semibold shadow-md border border-white/5"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="mr-2">You</span>
            <span className="ml-1 px-2 py-0.5 bg-black/70 rounded-md text-white text-sm">{playerScore}</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
});

export default Table;