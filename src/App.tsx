import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import { useGameStore } from './store/gameStore';
import { useSettingsStore } from './store/settingsStore';
import { useGestureControl } from './hooks/useGestureControl';
import { soundManager } from './lib/soundManager';

import { Header } from './components/Header';
import { GameTable } from './components/GameTable';
import { GestureControlPanel } from './components/GestureControlPanel';
import { SettingsModal } from './components/modals/SettingsModal';
import { StatsModal } from './components/modals/StatsModal';
import { LogsModal } from './components/modals/LogsModal';
import { CalibrationWizard } from './components/CalibrationWizard';
import { RulesModal } from './components/modals/RulesModal';


const svgPattern = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
  <defs>
    <pattern id="suits" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
      <text x="2" y="43" font-size="16" fill="rgb(255,0,0)">♠</text>
      <text x="50" y="30" font-size="16" fill="rgb(255, 0, 0)">♥</text>
      <text x="2" y="30" font-size="16" fill="rgb(255, 0, 0)">♦</text>
      <text x="50" y="43" font-size="16" fill="rgb(255,0, 0)">♣</text>
    </pattern>
  </defs>
  <rect width="60" height="60" fill="url(#suits)" />
</svg>
`);

const App: React.FC = () => {
  const { balance } = useGameStore();
  const { settings } = useSettingsStore();
  const gestureControl = useGestureControl();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    soundManager.init();
  }, []);

  return (
    <div
      className="min-h-screen bg-cover bg-center text-white"
      style={{
        backgroundColor: '#000',
        backgroundImage: settings.highContrast
          ? 'none'
          : `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url("data:image/svg+xml,${svgPattern}")`,
      }}
    >
      <Toaster position="top-center" />

      <Header
        balance={balance}
        privacyMode={settings.privacyMode}
        highContrast={settings.highContrast}
        onShowSettings={() => setShowSettings(true)}
        onShowStats={() => setShowStats(true)}
        onShowRules={() => setShowRules(true)}
      />

      <main className="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><GameTable /></div>
        <GestureControlPanel
          {...gestureControl}
          onShowCalibration={() => setShowCalibration(true)}
          onShowLogs={() => setShowLogs(true)}
        />
      </main>

      <AnimatePresence>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {showStats && <StatsModal onClose={() => setShowStats(false)} />}
        {showLogs && <LogsModal onClose={() => setShowLogs(false)} />}
        {showCalibration && <CalibrationWizard onClose={() => setShowCalibration(false)} />}
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default App;