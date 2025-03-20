import { motion } from "framer-motion";

function Card({ rank, suit, hidden }) {
  let symbol =
    suit === "hearts" ? "♥"
    : suit === "diamonds" ? "♦"
    : suit === "clubs" ? "♣"
    : "♠";

  if (hidden) {
    return (
      <motion.div
        className="w-16 h-24 bg-gradient-to-br from-gray-500 to-gray-400 rounded-xl flex items-center justify-center text-3xl text-white font-extrabold shadow-xl"
        whileHover={{ scale: 1.05 }}
      >
        ?
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-16 h-24 bg-gradient-to-br from-white to-gray-200 border border-gray-800 rounded-xl shadow-xl flex flex-col items-center justify-center text-black font-bold"
      initial={{ rotateY: 180 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.05 }}
    >
      <div className="text-sm">{rank}</div>
      <div className="text-2xl">{symbol}</div>
    </motion.div>
  );
}

export default Card;