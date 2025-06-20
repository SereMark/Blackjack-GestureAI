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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [initializationStep, setInitializationStep] = useState<string>('idle');
  const [currentModel, setCurrentModel] = useState<string>('mediapipe');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);
  const initInProgressRef = useRef(false);
  
  const { settings } = useSettingsStore();
  const { phase, isAnimating, playerCards, balance, bet, hit, stand, double } = useGameStore();
  const { addGestureLog } = useCalibrationStore();
  
  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
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
    setCameraError(null);
    setInitializationStep('idle');
    initInProgressRef.current = false;
  };

  const waitForVideoElement = async (): Promise<HTMLVideoElement> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30;
      
      const checkVideoElement = () => {
        attempts++;
        
        if (videoRef.current?.isConnected) {
          resolve(videoRef.current);
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('Video element not available'));
        } else {
          setTimeout(checkVideoElement, 100);
        }
      };
      
      checkVideoElement();
    });
  };
  
  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    if (initInProgressRef.current) {
      return;
    }

    initInProgressRef.current = true;
    let mounted = true;
    
    const init = async () => {
      try {
        setInitializationStep('waiting-for-ui');
        setCameraError(null);
        
        const videoElement = await waitForVideoElement();
        if (!mounted) return;
        
        setInitializationStep('requesting-camera');
        
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
        
        setInitializationStep('setting-up-video');
        streamRef.current = stream;
        
        if (!videoRef.current?.isConnected) {
          throw new Error('Video element became unavailable');
        }
        
        videoRef.current.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          let resolved = false;
          
          const cleanup = () => {
            video.removeEventListener('loadeddata', onLoadedData);
            video.removeEventListener('error', onError);
          };
          
          const onLoadedData = () => {
            if (resolved) return;
            
            const checkReady = () => {
              if (resolved) return;
              if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                resolved = true;
                cleanup();
                resolve();
              } else {
                setTimeout(checkReady, 100);
              }
            };
            checkReady();
          };
          
          const onError = () => {
            if (resolved) return;
            resolved = true;
            cleanup();
            reject(new Error('Video failed to load'));
          };
          
          video.addEventListener('loadeddata', onLoadedData);
          video.addEventListener('error', onError);
          video.play().catch(onError);
          
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              cleanup();
              reject(new Error('Video setup timeout'));
            }
          }, 8000);
        });
        
        if (!mounted) return;
        
        setInitializationStep('initializing-recognizer');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (!mounted || !videoRef.current) return;
        
        const recognizer = new GestureRecognizer();
        await recognizer.init(videoRef.current, currentModel);
        
        if (mounted) {
          recognizerRef.current = recognizer;
          setIsRecognizerReady(true);
          setInitializationStep('ready');
        } else {
          await recognizer.close();
        }
        
      } catch (error) {
        if (mounted) {
          const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
          setCameraError(errorMessage);
          setInitializationStep('error');
          toast.error(`Gesture control failed: ${errorMessage}`);
        }
      } finally {
        if (mounted) {
          initInProgressRef.current = false;
        }
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      initInProgressRef.current = false;
      cleanup();
    };
  }, [enabled, currentModel]);
  
  useEffect(() => {
    if (!enabled || !isRecognizerReady || !recognizerRef.current || !videoRef.current) {
      return;
    }
    
    let isActive = true;
    let frameCounter = 0;
    const frameSkip = 5;
    
    const recognize = () => {
      if (!isActive || !recognizerRef.current || !videoRef.current) {
        return;
      }
      
      if (frameCounter++ % frameSkip !== 0) {
        animationFrameRef.current = requestAnimationFrame(recognize);
        return;
      }
      
      try {
        const startTime = performance.now();
        const result = recognizerRef.current.recognize(videoRef.current, performance.now());
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
      } catch (error) {
        console.warn('Gesture recognition frame error:', error);
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
        animationFrameRef.current = 0;
      }
    };
  }, [enabled, isRecognizerReady, settings, phase, isAnimating, playerCards, balance, bet, hit, stand, double, addGestureLog]);
  
  const handleModelChange = async (newModel: string) => {
    if (newModel === currentModel) return;
    
    if (!recognizerRef.current) {
      setCurrentModel(newModel);
      return;
    }

    if (!isRecognizerReady || initInProgressRef.current) {
      toast.error('Cannot switch models during initialization');
      return;
    }
    
    setIsRecognizerReady(false);
    setInitializationStep('initializing-recognizer');
    setCameraError(null);
    
    try {
      await recognizerRef.current.setModel(newModel);
      setCurrentModel(newModel);
      setIsRecognizerReady(true);
      setInitializationStep('ready');
      toast.success(`Switched to ${newModel} model`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Model switch failed';
      setCameraError(errorMessage);
      setInitializationStep('error');
      toast.error(`Failed to switch model: ${errorMessage}`);
    }
  };

  return {
    enabled,
    setEnabled,
    videoRef,
    currentGesture,
    gestureProgress,
    cameraError,
    isRecognizerReady,
    initializationStep,
    currentModel,
    handleModelChange
  };
};