import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../store/settingsStore';
import { GESTURES } from '../../constants';
import { Settings } from '../../types';

interface SettingsModalProps {
  onClose: () => void;
  onShowCalibration: () => void;
  onShowLogs: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onShowCalibration, onShowLogs }) => {
  const { settings, updateSettings } = useSettingsStore();

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
        className={`${settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'} rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-6">Settings</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Gesture Control</h3>
            <div className="flex gap-3">
              <button 
                onClick={onShowCalibration}
                className={`flex-1 py-2 px-4 ${settings.highContrast ? 'bg-gray-900 border border-white hover:bg-gray-800' : 'bg-gray-700 hover:bg-gray-600'} rounded-lg transition-colors text-sm font-medium`}
              >
                Calibrate Gestures
              </button>
              <button 
                onClick={onShowLogs}
                className={`flex-1 py-2 px-4 ${settings.highContrast ? 'bg-gray-900 border border-white hover:bg-gray-800' : 'bg-gray-700 hover:bg-gray-600'} rounded-lg transition-colors text-sm font-medium`}
              >
                View Logs
              </button>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Gesture Mappings</h3>
            <div className="space-y-3">
              {[
                { key: 'hitGesture', label: 'Hit' },
                { key: 'standGesture', label: 'Stand' },
                { key: 'doubleGesture', label: 'Double' }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label} Gesture</label>
                  <select value={settings[key as keyof Settings] as string} onChange={(e) => updateSettings({ [key]: e.target.value })} className={`w-full ${settings.highContrast ? 'bg-gray-900 border border-white' : 'bg-gray-700'} rounded-lg px-3 py-2`}>
                    {GESTURES.map((gesture) => (
                      <option key={gesture} value={gesture}>{gesture.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Recognition</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Hold Time: {settings.holdTime}ms</label>
                <input type="range" min={200} max={1000} step={50} value={settings.holdTime} onChange={(e) => updateSettings({ holdTime: parseInt(e.target.value) })} className="w-full"/>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confidence: {Math.round(settings.confidence * 100)}%</label>
                <input type="range" min={0.5} max={0.95} step={0.05} value={settings.confidence} onChange={(e) => updateSettings({ confidence: parseFloat(e.target.value) })} className="w-full"/>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={settings.soundEnabled} onChange={(e) => updateSettings({ soundEnabled: e.target.checked })} className="w-4 h-4"/>
              <span>Sound Effects</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={settings.vibrationEnabled} onChange={(e) => updateSettings({ vibrationEnabled: e.target.checked })} className="w-4 h-4"/>
              <span>Vibration</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={settings.highContrast} onChange={(e) => updateSettings({ highContrast: e.target.checked })} className="w-4 h-4"/>
              <span>High Contrast</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={settings.privacyMode} onChange={(e) => updateSettings({ privacyMode: e.target.checked })} className="w-4 h-4"/>
              <span>Privacy Mode</span>
            </label>
          </div>
        </div>
        <button onClick={onClose} className={`mt-6 w-full py-2 ${settings.highContrast ? 'bg-gray-900 border border-white hover:bg-gray-800' : 'bg-gray-700 hover:bg-gray-600'} rounded-lg transition-colors`}>Close</button>
      </motion.div>
    </motion.div>
  );
};