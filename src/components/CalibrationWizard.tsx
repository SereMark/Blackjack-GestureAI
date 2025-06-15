import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { useCalibrationStore } from '../store/calibrationStore';
import { GestureRecognizer } from '../lib/gestureRecognizer';
import { GestureSample, Settings } from '../types';

export const CalibrationWizard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [recognizerReady, setRecognizerReady] = useState(false);
  
  const { settings } = useSettingsStore();
  const { addCalibrationSample } = useCalibrationStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const gestures = [
    { key: 'hitGesture', label: 'Hit', icon: '✋' },
    { key: 'standGesture', label: 'Stand', icon: '✊' },
    { key: 'doubleGesture', label: 'Double', icon: '👎' }
  ];
  
  useEffect(() => {
    let mounted = true;
    
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = async () => {
                try {
                  await videoRef.current!.play();
                  if (mounted) { setCameraReady(true); resolve(); }
                } catch (error) { console.error('Failed to play video:', error); }
              };
            }
          });
          
          if (mounted && videoRef.current) {
            const recognizer = new GestureRecognizer();
            await recognizer.init(videoRef.current);
            
            if (mounted) {
              recognizerRef.current = recognizer;
              setRecognizerReady(true);
            } else { await recognizer.close(); }
          }
        }
      } catch (error) {
        toast.error('Camera access denied. Please allow camera access and reload.');
        onClose();
      }
    };
    
    initCamera();
    
    return () => {
      mounted = false;
      if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); }
      if (recognizerRef.current) { recognizerRef.current.close(); }
    };
  }, [onClose]);
  
  const startRecording = async () => {
    if (recording || !recognizerRef.current || !videoRef.current) return;
    
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setCountdown(0);
    setRecording(true);
    
    const samples: GestureSample[] = [];
    const startTime = Date.now();
    const targetGesture = settings[gestures[step].key as keyof Settings] as string;
    let frameCounter = 0;
    
    const recordLoop = () => {
      if (Date.now() - startTime > 3000 || !recognizerRef.current || !videoRef.current) {
        setRecording(false);
        if (samples.length > 0) {
          const bestSample = samples[0];
          addCalibrationSample(targetGesture, bestSample);
          toast.success(`Recorded ${gestures[step].label} gesture!`);
          
          if (step < gestures.length - 1) {
            setStep(step + 1);
          } else {
            toast.success('Calibration complete!');
            setTimeout(onClose, 1000);
          }
        } else {
          toast.error(`No ${targetGesture} gesture detected. Try again.`);
        }
        return;
      }
      
      if (frameCounter++ % 3 === 0) {
        const result = recognizerRef.current.recognize(videoRef.current!, performance.now());
        if (result && result.name === targetGesture && result.confidence > 0.8) {
          samples.push({ gesture: result.name, landmarks: [], timestamp: Date.now() });
        }
      }
      requestAnimationFrame(recordLoop);
    };
    
    requestAnimationFrame(recordLoop);
  };
  
  const currentGesture = gestures[step];
  const isReady = cameraReady && recognizerReady;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-gray-800 rounded-xl max-w-2xl w-full overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Calibrate Gestures</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">✕</button>
        </div>
        
        <div className="aspect-video bg-black relative">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraReady ? 'opacity-100' : 'opacity-0'}`} />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-gray-400">{!cameraReady ? 'Initializing camera...' : 'Loading gesture recognition...'}</p>
              </div>
            </div>
          )}
          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <motion.div key={countdown} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-8xl font-bold text-white">
                {countdown}
              </motion.div>
            </div>
          )}
          {recording && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">Recording...</span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex justify-center gap-4 mb-6">
            {gestures.map((g, i) => (
              <div key={g.key} className={`px-4 py-2 rounded-full transition-colors ${i === step ? 'bg-blue-600' : i < step ? 'bg-green-600' : 'bg-gray-700'}`}>
                {g.icon} {g.label}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-xl mb-2">Show the <span className="font-bold text-blue-400">{currentGesture.label}</span> gesture</p>
            <p className="text-gray-400 mb-6">Make the {settings[currentGesture.key as keyof Settings]} gesture</p>
            <button onClick={startRecording} disabled={recording || countdown > 0 || !isReady} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors">
              {recording ? 'Recording...' : countdown > 0 ? 'Get Ready...' : 'Start Recording'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};