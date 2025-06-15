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

const App: React.FC = () => {
  const { balance } = useGameStore();
  const { settings } = useSettingsStore();
  const gestureControl = useGestureControl();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showStats, setShowStats] = useState(false);
  
  useEffect(() => {
    soundManager.init();
  }, []);
  
  return (
    <div className={`min-h-screen ${settings.highContrast ? 'bg-black text-white' : 'bg-gray-900 text-white'}`}>
      <Toaster position="top-center" />
      
      <Header
        balance={balance}
        privacyMode={settings.privacyMode}
        highContrast={settings.highContrast}
        onShowSettings={() => setShowSettings(true)}
        onShowStats={() => setShowStats(true)}
      />
      
      <main className="max-w-6xl mx-auto p-4 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GameTable />
        </div>
        
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
      </AnimatePresence>
    </div>
  );
};

export default App;