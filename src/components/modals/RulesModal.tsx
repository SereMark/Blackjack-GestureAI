import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../store/settingsStore';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
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
        className={`${settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'} rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Blackjack Rules</h2>
        
        <div className="space-y-6 text-sm">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-green-400">Objective</h3>
            <p className="text-gray-300">
              Get your hand as close to 21 as possible without going over (busting), 
              while beating the dealer's hand.
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-yellow-400">How to Play</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                <p>Both you and the dealer receive two cards initially</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                <p>Choose your action:</p>
              </div>
              <div className="ml-9 space-y-2">
                <div className="bg-gray-600/50 rounded p-2">
                  <strong>Hit:</strong> Take another card
                </div>
                <div className="bg-gray-600/50 rounded p-2">
                  <strong>Stand:</strong> Keep your current hand
                </div>
                <div className="bg-gray-600/50 rounded p-2">
                  <strong>Double:</strong> Double your bet and receive one more card
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                <p>The dealer plays after you, hitting until reaching 17 or higher</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-purple-400">Winning Conditions</h3>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-center space-x-2">
                <span className="text-green-400">✓</span>
                <p><strong>You Win:</strong> Your total is higher than dealer's without busting</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-400">✓</span>
                <p><strong>Blackjack:</strong> 21 with your first two cards (pays 3:2)</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-red-400">✗</span>
                <p><strong>You Lose:</strong> Your total exceeds 21 (bust)</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">≈</span>
                <p><strong>Push (Tie):</strong> Same total as dealer</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`mt-6 w-full py-3 ${settings.highContrast ? 'bg-gray-900 border border-white hover:bg-gray-800' : 'bg-gray-700 hover:bg-gray-600'} rounded-lg transition-colors font-semibold`}
        >
          Got it!
        </button>
      </motion.div>
    </motion.div>
  );
};
