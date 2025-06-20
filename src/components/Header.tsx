import React from 'react';

interface HeaderProps {
  balance: number;
  privacyMode: boolean;
  onShowStats: () => void;
  onShowSettings: () => void;
  highContrast: boolean;
  onShowRules: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  balance,
  privacyMode,
  onShowStats,
  onShowSettings,
  highContrast,
  onShowRules, 
}) => {
  const buttonBaseClasses = `px-4 py-2 text-sm font-semibold rounded-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2`;
  const buttonBg = highContrast
    ? 'bg-black text-white border-2 border-white hover:bg-white hover:text-black focus:ring-white'
    : 'bg-gray-700 text-white border-transparent hover:bg-gray-600 focus:ring-indigo-500';

  return (
    <header className={`${highContrast ? 'bg-black border-b-2 border-white' : 'bg-gray-800 border-b border-gray-800'} px-4 py-3 mb-19`}>      
      <div className="max-w-6xl mx-auto grid grid-cols-3 items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Blackjack</h1>
          {privacyMode && <span className="text-sm text-green-400">🔒</span>}
        </div>

        <div className="text-center">
          <div className="text-sm">
            <span className="text-gray-400">Balance:</span>
            <span className="ml-2 font-mono font-bold text-lg">${balance}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onShowStats}
            className={`${buttonBaseClasses} ${buttonBg}`}
          >
            Stats
          </button>
          <button
            onClick={onShowSettings}
            className={`${buttonBaseClasses} ${buttonBg}`}
          >
            Settings
          </button>
          <button
            onClick={onShowRules}
            className={`${buttonBaseClasses} ${buttonBg}`}
          >
            Rules
          </button>
        </div>
      </div>
    </header>
  );
};