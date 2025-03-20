import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";
import { useGameStore } from "../store/gameStore";

function DealerHand({ cards }) {
  const { gameState } = useGameStore();
  return (
    <div className="flex gap-2 flex-wrap justify-center mt-2">
      <AnimatePresence>
        {cards.map((card, idx) => {
          const hidden = idx === 0 && gameState === "in_progress";
          return (
            <motion.div
              key={idx}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
            >
              <Card rank={card.rank} suit={card.suit} hidden={hidden} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default DealerHand;