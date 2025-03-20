import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import DealerHand from "./DealerHand";
import PlayerHand from "./PlayerHand";

function Table() {
  const { dealerHand, playerHand, dealerScore, playerScore } = useGameStore();

  return (
    <motion.div
      className="flex flex-col items-center mt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-6 bg-black/30 p-4 rounded-xl shadow-2xl w-[300px] text-center">
        <div className="mb-2 text-lg font-semibold">Dealer</div>
        <DealerHand cards={dealerHand} />
        <div className="mt-2 text-sm">Score: {dealerScore}</div>
      </div>
      <div className="bg-black/30 p-4 rounded-xl shadow-2xl w-[300px] text-center">
        <div className="mb-2 text-lg font-semibold">You</div>
        <PlayerHand cards={playerHand} />
        <div className="mt-2 text-sm">Score: {playerScore}</div>
      </div>
    </motion.div>
  );
}

export default Table;