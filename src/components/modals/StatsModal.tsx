import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';

interface StatsModalProps {
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ onClose }) => {
  const { stats } = useGameStore();
  const { settings } = useSettingsStore();

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
        className={`${settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'} rounded-xl p-6 max-w-md w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-6">Statistics</h2>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Hands Played</span>
            <span className="font-bold">{stats.handsPlayed}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Hands Won</span>
            <span className="font-bold">{stats.handsWon}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Win Rate</span>
            <span className="font-bold">
              {stats.handsPlayed > 0 ? Math.round((stats.handsWon / stats.handsPlayed) * 100) + '%' : '0%'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Winnings</span>
            <span className={`font-bold ${stats.totalWinnings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${stats.totalWinnings >= 0 ? '+' : ''}{stats.totalWinnings}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Best Streak</span>
            <span className="font-bold">{stats.bestStreak}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Current Streak</span>
            <span className="font-bold text-yellow-400">{stats.currentStreak} 🔥</span>
          </div>
        </div>
        <button onClick={onClose} className={`mt-6 w-full py-2 ${settings.highContrast ? 'bg-gray-900 border border-white hover:bg-gray-800' : 'bg-gray-700 hover:bg-gray-600'} rounded-lg transition-colors`}>Close</button>
      </motion.div>
    </motion.div>
  );
};