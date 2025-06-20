import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore';
import { ModelSelector } from './ModelSelector';

interface GestureControlPanelProps {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  currentGesture: string | null;
  gestureProgress: number;
  onShowCalibration: () => void;
  onShowLogs: () => void;
  cameraError?: string | null;
  isRecognizerReady?: boolean;
  initializationStep?: string;
  currentModel?: string;
  handleModelChange?: (model: string) => void;
}

const formatGestureName = (gesture: string): string => {
  return gesture.replace(/_/g, ' ');
};

const getInitializationMessage = (step: string): string => {
  switch (step) {
    case 'waiting-for-ui':
      return 'Preparing camera interface...';
    case 'requesting-camera':
      return 'Requesting camera access...';
    case 'setting-up-video':
      return 'Setting up video...';
    case 'initializing-recognizer':
      return 'Loading gesture recognition...';
    case 'ready':
      return 'Ready!';
    case 'error':
      return 'Initialization failed';
    default:
      return 'Initializing...';
  }
};

const checkConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm/vision_wasm_internal.js', { method: 'HEAD' });
    const modelResponse = await fetch('https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task', { method: 'HEAD' });
    return response.ok && modelResponse.ok;
  } catch {
    return false;
  }
};

export const GestureControlPanel: React.FC<GestureControlPanelProps> = ({
  enabled, setEnabled, videoRef, currentGesture, gestureProgress, onShowCalibration, onShowLogs, 
  cameraError, isRecognizerReady, initializationStep = 'idle', currentModel, handleModelChange
}) => {
  const { settings } = useSettingsStore();
  const [connectivityMessage, setConnectivityMessage] = useState<string | null>(null);

  const handleConnectivityCheck = async () => {
    setConnectivityMessage('Testing connection...');
    const result = await checkConnectivity();
    if (result) {
      setConnectivityMessage('Connection successful. Try enabling gesture control again.');
    } else {
      setConnectivityMessage('Connection failed. Check your internet connection and try again later.');
    }
    setTimeout(() => setConnectivityMessage(null), 3000);
  };

  return (
    <aside className={`${settings.highContrast ? 'bg-black border-4 border-white' : 'bg-gray-800'} rounded-xl overflow-hidden shadow-xl`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Gesture Control</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={onShowCalibration} 
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-sm" 
              title="Calibrate"
            >
              Cal
            </button>
            <button 
              onClick={onShowLogs} 
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-sm" 
              title="Logs"
            >
              Log
            </button>
            <button 
              onClick={() => setEnabled(!enabled)} 
              className={`px-4 py-1 rounded-full text-sm font-medium transition-all ${
                enabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {enabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="relative h-64 bg-black flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${
            enabled && isRecognizerReady && !cameraError ? 'block' : 'hidden'
          }`}
        />
        
        {enabled ? (
          <>
            {cameraError ? (
              <div className="text-center p-4">
                <div className="text-red-400 text-lg mb-2">Error</div>
                <p className="text-gray-400 text-sm mb-3">{cameraError}</p>
                <div className="space-y-2">
                  <button 
                    onClick={() => setEnabled(false)} 
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors mr-2"
                  >
                    Reset
                  </button>
                  {(cameraError.includes('network') || cameraError.includes('MediaPipe')) && (
                    <button 
                      onClick={handleConnectivityCheck} 
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                    >
                      Check Connection
                    </button>
                  )}
                </div>
              </div>
            ) : !isRecognizerReady ? (
              <div className="text-center p-4">
                {connectivityMessage ? (
                  <div className="p-3 bg-gray-700 rounded mb-3">
                    <p className="text-white text-sm">{connectivityMessage}</p>
                  </div>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3"></div>
                    <p className="text-gray-300 text-sm font-medium mb-1">
                      {getInitializationMessage(initializationStep)}
                    </p>
                    {initializationStep === 'initializing-recognizer' && (
                      <p className="text-gray-500 text-xs">
                        Loading recognition models...
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              currentGesture && (
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80">
                  <p className="text-center font-semibold mb-2 text-white">
                    {formatGestureName(currentGesture)}
                  </p>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-green-500" 
                      style={{ width: `${gestureProgress * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-300 mt-1">
                    Hold for {Math.ceil((1 - gestureProgress) * (settings.holdTime / 1000))}s
                  </p>
                </div>
              )
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Gesture Control</p>
              <p className="text-sm">Click ON to enable gestures</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-2 text-sm">
        <div className="text-gray-300 font-medium mb-2">Gesture Mappings:</div>
        <div className="space-y-1 text-gray-400">
          <p>{formatGestureName(settings.hitGesture)} → Hit</p>
          <p>{formatGestureName(settings.standGesture)} → Stand</p>
          <p>{formatGestureName(settings.doubleGesture)} → Double</p>
        </div>
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <ModelSelector 
          currentModel={currentModel}
          onModelChange={handleModelChange}
          disabled={enabled && (!isRecognizerReady || initializationStep === 'initializing-recognizer')}
        />
      </div>
    </aside>
  );
};