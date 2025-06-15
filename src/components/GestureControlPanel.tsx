import React from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore';
import { useCalibrationStore } from '../store/calibrationStore';

interface GestureControlPanelProps {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  currentGesture: string | null;
  gestureProgress: number;
  onShowCalibration: () => void;
  onShowLogs: () => void;
}

export const GestureControlPanel: React.FC<GestureControlPanelProps> = ({
  enabled, setEnabled, videoRef, currentGesture, gestureProgress, onShowCalibration, onShowLogs
}) => {
  const { settings } = useSettingsStore();
  const { calibrationData } = useCalibrationStore();

  return (
    <aside className={`${settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'} rounded-xl overflow-hidden shadow-xl`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Gesture Control</h3>
          <div className="flex items-center gap-2">
            <button onClick={onShowCalibration} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Calibrate">Calibrate</button>
            <button onClick={onShowLogs} className="p-2 hover:bg-gray-700 rounded-lg transition-colors" title="Logs">Logs</button>
            <button onClick={() => setEnabled(!enabled)} className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${enabled ? 'bg-green-600' : 'bg-gray-700'}`}>
              {enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="aspect-video bg-black relative">
        {enabled ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {currentGesture && (
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80">
                <p className="text-center font-semibold mb-2">{currentGesture}</p>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-green-500" style={{ width: `${gestureProgress * 100}%` }}/>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-4xl mb-2">👋</p>
              <p>Enable to use gestures</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-2 text-sm text-gray-400">
        <p>✋ {settings.hitGesture} → Hit</p>
        <p>✊ {settings.standGesture} → Stand</p>
        <p>👎 {settings.doubleGesture} → Double</p>
        {calibrationData && (<p className="text-xs text-green-400 mt-2">✓ Calibrated</p>)}
      </div>
    </aside>
  );
};