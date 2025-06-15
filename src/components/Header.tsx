import React from 'react';

interface HeaderProps {
  balance: number;
  privacyMode: boolean;
  onShowStats: () => void;
  onShowSettings: () => void;
  highContrast: boolean;
}

export const Header: React.FC<HeaderProps> = ({ balance, privacyMode, onShowStats, onShowSettings, highContrast }) => {
  return (
    <header className={`border-b ${highContrast ? 'border-white' : 'border-gray-800'} px-4 py-3`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Blackjack
          {privacyMode && <span className="text-sm text-green-400">🔒</span>}
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-gray-400">Balance:</span>
            <span className="ml-2 font-mono font-bold text-lg">${balance}</span>
          </div>
          <button onClick={onShowStats} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">Stats</button>
          <button onClick={onShowSettings} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">Settings</button>
        </div>
      </div>
    </header>
  );
};