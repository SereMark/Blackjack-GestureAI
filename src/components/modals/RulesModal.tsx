import React from 'react';
import { motion } from 'framer-motion';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-6">Rules</h2>
        <div className="space-y-4 text-sm text-gray-300">
          <p><strong>Objective:</strong> Get as close to 21 as possible without going over.</p>
          <p><strong>Card Values:</strong> 
            - 2 through 10 are face value. 
            - J, Q, K are worth 10. 
            - Aces can be 1 or 11.
          </p>
          <p><strong>Gameplay:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>You and the dealer each get two cards.</li>
            <li>You can choose to "Hit" (take a card) or "Stand" (end your turn).</li>
            <li>You may also "Double" to double your bet and receive one more card.</li>
            <li>The dealer plays after your turn, hitting until 17 or higher.</li>
          </ul>
          <p><strong>Winning:</strong> 
            - You win if your total is higher than the dealer’s without going over 21. 
            - If you go over 21, you bust. 
            - If both you and the dealer have the same total, it’s a push (tie).
          </p>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
};
