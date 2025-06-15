import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Card as CardType } from '../types';
import { useSettingsStore } from '../store/settingsStore';

export const Card = memo<{ card: CardType; hidden?: boolean }>(({ card, hidden = false }) => {
  const { highContrast } = useSettingsStore(s => s.settings);
  const isRed = ['♥', '♦'].includes(card.suit);
  
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      exit={{ scale: 0 }}
      className="relative"
    >
      <motion.div
        className="w-16 h-24 sm:w-20 sm:h-28 relative preserve-3d"
        animate={{ rotateY: hidden ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div className={`absolute inset-0 backface-hidden ${
          highContrast 
            ? 'bg-white border-4 border-black' 
            : 'bg-white border border-gray-200'
        } rounded-lg shadow-lg flex flex-col items-center justify-between p-2`}
        style={{ backfaceVisibility: 'hidden' }}>
          <span className={`text-sm font-bold ${
            isRed ? 'text-red-500' : 'text-black'
          }`}>
            {card.rank}
          </span>
          <span className={`text-3xl ${
            isRed ? 'text-red-500' : 'text-black'
          }`}>
            {card.suit}
          </span>
          <span className={`text-sm font-bold rotate-180 ${
            isRed ? 'text-red-500' : 'text-black'
          }`}>
            {card.rank}
          </span>
        </div>
        
        {/* Back */}
        <div className={`absolute inset-0 backface-hidden ${
          highContrast 
            ? 'bg-blue-900 border-4 border-black' 
            : 'bg-gradient-to-br from-blue-600 to-blue-800'
        } rounded-lg shadow-lg`}
        style={{ 
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)'
        }}>
          <div className="w-full h-full rounded-lg border border-white/20 flex items-center justify-center">
            <div className="text-white/10 text-4xl">♠</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});