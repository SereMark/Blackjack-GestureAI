import React from 'react';
import { motion } from 'framer-motion';
import { useCalibrationStore } from '../../store/calibrationStore';

interface LogsModalProps {
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ onClose }) => {
  const { gestureLogs, clearLogs } = useCalibrationStore();

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
        className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Gesture Logs</h2>
          <button onClick={clearLogs} className="text-sm text-red-400 hover:text-red-300">Clear</button>
        </div>
        <div className="space-y-2">
          {gestureLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No logs yet</p>
          ) : (
            gestureLogs.slice().reverse().map((log, i) => (
              <div key={i} className="bg-gray-700 rounded-lg p-3 text-sm font-mono">
                <div className="flex justify-between">
                  <span>
                    <span className="text-blue-400">{log.gesture}</span>
                    {log.action && (<span className="ml-2 text-green-400">→ {log.action}</span>)}
                  </span>
                  <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Confidence: {Math.round(log.confidence * 100)}% | Latency: {log.latency}ms
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Close</button>
      </motion.div>
    </motion.div>
  );
};