import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { calculateHandValue } from '../utils/blackjack';
import { Card } from './Card';
import { GAME_CONFIG } from '../constants';

export const GameTable: React.FC = () => {
  const game = useGameStore();
  const { settings } = useSettingsStore();
  const [betAmount, setBetAmount] = useState(game.bet);
  
  const playerValue = useMemo(() => calculateHandValue(game.playerCards), [game.playerCards]);
  const dealerValue = useMemo(() => calculateHandValue(game.dealerCards), [game.dealerCards]);
  const dealerVisibleValue = useMemo(() => game.dealerRevealed ? dealerValue : calculateHandValue(game.dealerCards.slice(1)), [game.dealerRevealed, dealerValue, game.dealerCards]);

  useEffect(() => {
    setBetAmount(game.bet);
  }, [game.bet]);

  useEffect(() => {
    if (game.phase === 'game-over') {
      const timer = setTimeout(() => {
        if (game.balance >= GAME_CONFIG.minBet) {
          game.nextRound();
        } else {
          game.reset();
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [game.phase, game.balance, game.nextRound, game.reset]);
  
  return (
    <div className={`${settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'} rounded-xl p-6 shadow-xl`}>
      {/* Dealer Hand */}
      <div className="mb-8">
        <div className="text-center mb-4">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider">Dealer</h3>
          {game.dealerCards.length > 0 && (<p className="text-2xl font-bold mt-1">{game.dealerRevealed ? dealerValue : `?/${dealerVisibleValue}`}</p>)}
        </div>
        <div className="flex justify-center gap-2 min-h-[112px]">
          <AnimatePresence>
            {game.dealerCards.map((card, index) => (<Card key={card.id} card={card} hidden={!game.dealerRevealed && index === 0} />))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Message */}
      <div className="text-center py-8">
        <AnimatePresence mode="wait">
          <motion.p key={game.message} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`text-xl font-semibold ${game.lastResult === 'win' ? 'text-green-400' : game.lastResult === 'loss' ? 'text-red-400' : 'text-gray-300'}`}>
            {game.message}
          </motion.p>
        </AnimatePresence>
      </div>
      
      {/* Player Hand */}
      <div className="mb-8">
        <div className="text-center mb-4">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider">Your Hand</h3>
          {game.playerCards.length > 0 && (<p className={`text-2xl font-bold mt-1 ${playerValue === 21 ? 'text-green-400' : playerValue > 21 ? 'text-red-400' : ''}`}>{playerValue}</p>)}
        </div>
        <div className="flex justify-center gap-2 min-h-[112px]">
          <AnimatePresence>
            {game.playerCards.map((card) => (<Card key={card.id} card={card} />))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex justify-center">
        <AnimatePresence mode="wait">
          {game.phase === 'waiting' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${settings.highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-700'} rounded-lg px-3 py-2`}>
                <button onClick={() => setBetAmount(Math.max(GAME_CONFIG.minBet, betAmount - 10))} className={`w-8 h-8 ${settings.highContrast ? 'bg-gray-800 border border-white hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-500'} rounded transition-colors`}>-</button>
                <input type="number" value={betAmount} onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
                  onBlur={() => {
                    const validBet = Math.max(GAME_CONFIG.minBet, Math.min(betAmount, Math.min(game.balance, GAME_CONFIG.maxBet)));
                    setBetAmount(validBet);
                    game.placeBet(validBet);
                  }}
                  className="w-20 bg-transparent text-center font-mono" />
                <button onClick={() => setBetAmount(Math.min(game.balance, GAME_CONFIG.maxBet, betAmount + 10))} className={`w-8 h-8 ${settings.highContrast ? 'bg-gray-800 border border-white hover:bg-gray-700' : 'bg-gray-600 hover:bg-gray-500'} rounded transition-colors`}>+</button>
              </div>
              <button onClick={() => { game.placeBet(betAmount); game.deal(); }} disabled={betAmount > game.balance || betAmount < GAME_CONFIG.minBet}
                className={`px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors ${settings.highContrast ? 'disabled:bg-gray-900 disabled:border disabled:border-gray-500' : 'disabled:bg-gray-600'} disabled:cursor-not-allowed`}>Deal</button>
            </motion.div>
          )}
          
          {game.phase === 'playing' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3">
              <button onClick={game.hit} disabled={game.isAnimating} className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors ${settings.highContrast ? 'disabled:bg-gray-900 disabled:border disabled:border-gray-500' : 'disabled:bg-gray-600'}`}>Hit</button>
              <button onClick={game.stand} disabled={game.isAnimating} className={`px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors ${settings.highContrast ? 'disabled:bg-gray-900 disabled:border disabled:border-gray-500' : 'disabled:bg-gray-600'}`}>Stand</button>
              <button onClick={game.double} disabled={game.playerCards.length !== 2 || game.balance < game.bet || game.isAnimating} className={`px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors ${settings.highContrast ? 'disabled:bg-gray-900 disabled:border disabled:border-gray-500' : 'disabled:bg-gray-600'}`}>Double</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};