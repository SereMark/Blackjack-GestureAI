import { motion, AnimatePresence } from "framer-motion";
import Card from "./Card";

function PlayerHand({ cards }) {
  return (
    <div className="flex gap-2 flex-wrap justify-center mt-2">
      <AnimatePresence>
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
          >
            <Card rank={card.rank} suit={card.suit} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default PlayerHand;