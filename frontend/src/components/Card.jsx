import { motion } from "framer-motion";
import { memo } from "react";

const Card = memo(function Card({ rank, suit, hidden }) {
  const color = suit === "hearts" || suit === "diamonds" ? "text-red-600" : "text-black";
  
  const symbol = 
    suit === "hearts" ? "♥"
    : suit === "diamonds" ? "♦"
    : suit === "clubs" ? "♣"
    : "♠";

  if (hidden) {
    return (
      <motion.div
        className="w-[68px] h-[100px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700 flex items-center justify-center shadow-card"
        initial={{ rotateY: 0 }}
        whileHover={{ scale: 1.05, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)" }}
      >
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-5 grid-rows-7 gap-1 p-1 h-full w-full">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="bg-white/30 rounded-full"></div>
              ))}
            </div>
          </div>
          <span className="bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent text-4xl font-bold z-10">?</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`w-[68px] h-[100px] bg-gradient-to-br from-white to-gray-100 rounded-lg border border-gray-300 shadow-card flex flex-col p-2.5 ${color}`}
      initial={{ opacity: 0, rotateY: 90 }}
      animate={{ opacity: 1, rotateY: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ scale: 1.05, boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)" }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="flex justify-between items-center w-full">
        <div className="text-sm font-bold">{rank}</div>
        <div className="text-sm">{symbol}</div>
      </div>
      <div className="flex-grow flex items-center justify-center">
        <div className="text-3xl font-bold">{symbol}</div>
      </div>
      <div className="flex justify-between items-center w-full rotate-180">
        <div className="text-sm font-bold">{rank}</div>
        <div className="text-sm">{symbol}</div>
      </div>
    </motion.div>
  );
});

export default Card;