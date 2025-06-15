import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { GestureRecognizer } from '../lib/gestureRecognizer';
import { useSettingsStore } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { useCalibrationStore } from '../store/calibrationStore';
import { soundManager } from '../lib/soundManager';

export const useGestureControl = () => {
  const [enabled, setEnabled] = useState(false);
  const [isRecognizerReady, setIsRecognizerReady] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<string | null>(null);
  const [gestureProgress, setGestureProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  const { settings } = useSettingsStore();
  const { phase, isAnimating, playerCards, balance, bet, hit, stand, double } = useGameStore();
  const { addGestureLog } = useCalibrationStore();
  
  // Initialize camera
  useEffect(() => {
    if (!enabled) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
      setCurrentGesture(null);
      setGestureProgress(0);
      setIsRecognizerReady(false);
      return;
    }
    
    let mounted = true;
    
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
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
                  resolve();
                } catch (error) {
                  console.error('Failed to play video:', error);
                }
              };
            }
          });
          
          if (mounted && videoRef.current) {
            const recognizer = new GestureRecognizer();
            await recognizer.init(videoRef.current);
            
            if (mounted) {
              recognizerRef.current = recognizer;
              setIsRecognizerReady(true);
            } else {
              await recognizer.close();
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize gesture control:', error);
        toast.error('Camera access denied');
        setEnabled(false);
      }
    };
    
    init();
    
    return () => {
      mounted = false;
    };
  }, [enabled]);
  
  // Recognition loop
  useEffect(() => {
    if (!enabled || !isRecognizerReady || !recognizerRef.current || !videoRef.current) return;
    
    let isActive = true;
    let frameCounter = 0;
    
    const recognize = () => {
      if (!isActive || !recognizerRef.current || !videoRef.current) return;
      
      if (frameCounter++ % 2 !== 0) {
        animationFrameRef.current = requestAnimationFrame(recognize);
        return;
      }
      
      const startTime = performance.now();
      const result = recognizerRef.current.recognize(videoRef.current!, performance.now());
      const latency = performance.now() - startTime;
      
      if (result) {
        setCurrentGesture(result.name);
        setGestureProgress(result.holdProgress);
        
        if (result.shouldTrigger && phase === 'playing' && !isAnimating) {
          let action: string | null = null;
          
          if (result.name === settings.hitGesture) {
            hit();
            action = 'hit';
          } else if (result.name === settings.standGesture) {
            stand();
            action = 'stand';
          } else if (result.name === settings.doubleGesture && 
                     playerCards.length === 2 && 
                     balance >= bet) {
            double();
            action = 'double';
          }
          
          if (action) {
            soundManager.play('gesture');
            if (settings.vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate(50);
            }
            
            addGestureLog({
              timestamp: Date.now(),
              gesture: result.name,
              confidence: result.confidence,
              action,
              latency: Math.round(latency)
            });
          }
        }
      } else {
        setCurrentGesture(null);
        setGestureProgress(0);
      }
      
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(recognize);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(recognize);
    
    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, isRecognizerReady, settings, phase, isAnimating, playerCards, balance, bet, hit, stand, double, addGestureLog]);
  
  return {
    enabled,
    setEnabled,
    videoRef,
    currentGesture,
    gestureProgress
  };
};