import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../store/gameStore";
import { fetchGestureData } from "../api/gameApi";

function CameraFeed() {
  const videoRef = useRef(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [gestureData, setGestureData] = useState({
    gesture: "idle",
    confidence: 0,
    isConfident: false,
    quality: "poor",
    status: "idle"
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { hit, stand, gameState, controlMode } = useGameStore();

  // Initialize webcam stream
  useEffect(() => {
    let stream = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            aspectRatio: { ideal: 16/9 },
            facingMode: "user"
          },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreamActive(true);
          setStreamError(null);
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        let errorMessage = "Camera access denied or unavailable";
        
        if (error.name === 'NotAllowedError') {
          errorMessage = "Camera access denied. Please allow camera permissions and refresh.";
        } else if (error.name === 'NotFoundError') {
          errorMessage = "No camera found. Please connect a camera and refresh.";
        } else if (error.name === 'NotReadableError') {
          errorMessage = "Camera is being used by another application.";
        }
        
        setStreamError(errorMessage);
        setIsStreamActive(false);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Gesture detection polling
  useEffect(() => {
    let mounted = true;
    let interval = null;
    
    // Clear processing state immediately when switching modes
    if (controlMode === 'manual') {
      setIsProcessing(false);
      setGestureData({
        gesture: "idle",
        confidence: 0,
        isConfident: false,
        quality: "poor",
        status: "idle"
      });
    }
    
    if (controlMode === 'gesture' && isStreamActive) {
      console.log('Starting gesture polling...');
      interval = setInterval(async () => {
        if (gameState === "in_progress" && mounted) {
          try {
            const data = await fetchGestureData();
            if (mounted) {
              setGestureData(data);
              
              if (data.isConfident && data.gesture !== "idle" && !isProcessing) {
                setIsProcessing(true);
                try {
                  if (data.gesture === "hit") {
                    await hit();
                  } else if (data.gesture === "stand") {
                    await stand();
                  }
                } finally {
                  if (mounted) {
                    setIsProcessing(false);
                  }
                }
              }
            }
          } catch (error) {
            if (mounted) {
              setGestureData(prev => ({ ...prev, status: "error" }));
            }
          }
        }
      }, 1500);
    }
    
    return () => {
      mounted = false;
      if (interval) {
        console.log('Clearing gesture polling interval');
        clearInterval(interval);
      }
    };
  }, [hit, stand, gameState, controlMode, isStreamActive, isProcessing]);

  const getGestureIcon = (gesture) => {
    switch (gesture) {
      case 'hit':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        );
      case 'stand':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-4a1 1 0 01.707-.293l2 2a1 1 0 010 1.414l-2 2A1 1 0 018 18v-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "text-green-400";
    if (confidence >= 0.6) return "text-yellow-400";
    return "text-red-400";
  };

  const getStatusColor = () => {
    if (gestureData.status === "error") return "bg-red-500/20 border-red-500/50";
    if (isProcessing) return "bg-blue-500/20 border-blue-500/50";
    if (gestureData.isConfident && gestureData.gesture !== "idle") return "bg-green-500/20 border-green-500/50";
    return "bg-gray-500/20 border-gray-500/50";
  };

  const retryCamera = async () => {
    setStreamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          aspectRatio: { ideal: 16/9 },
          facingMode: "user"
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreamActive(true);
        setStreamError(null);
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      let errorMessage = "Camera access denied or unavailable";
      
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera access denied. Please allow camera permissions.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found. Please connect a camera.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is being used by another application.";
      }
      
      setStreamError(errorMessage);
      setIsStreamActive(false);
    }
  };

  return (
    <div className="bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-white">Camera Feed</h3>
          </div>
          <div className="flex items-center gap-2">
            {isStreamActive ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-400 font-medium">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-xs text-red-400 font-medium">Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Feed Container, 16:9 Aspect Ratio */}
      <div className="flex-1 flex flex-col">
        <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
          {streamError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gray-900">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm1 1v6h12V5H4z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M5 8a1 1 0 011-1h2a1 1 0 010 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-red-400 mb-2">Camera Unavailable</h3>
              <p className="text-gray-400 text-sm mb-3 max-w-xs">{streamError}</p>
              <motion.button
                onClick={retryCamera}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-4 py-2 rounded-lg text-white font-medium text-sm shadow-lg transition-all"
              >
                Retry Camera
              </motion.button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover bg-gray-900"
                style={{ transform: 'scaleX(-1)' }} // Mirror the video
              />
              
              {/* Gesture Detection Overlay */}
              {controlMode === 'gesture' && isStreamActive && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner Detection Frame */}
                  <div className="absolute top-3 left-3 w-12 h-12 border-l-2 border-t-2 border-blue-400/60"></div>
                  <div className="absolute top-3 right-3 w-12 h-12 border-r-2 border-t-2 border-blue-400/60"></div>
                  <div className="absolute bottom-3 left-3 w-12 h-12 border-l-2 border-b-2 border-blue-400/60"></div>
                  <div className="absolute bottom-3 right-3 w-12 h-12 border-r-2 border-b-2 border-blue-400/60"></div>
                  
                  {/* Center Detection Area */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-24 h-24 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
                      <span className="text-white/50 text-xs font-medium">Hand Area</span>
                    </div>
                  </div>
                  
                  {/* Gesture Status Overlay */}
                  <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
                    <div className={`px-3 py-2 rounded-full border backdrop-blur-md ${getStatusColor()}`}>
                      <div className="flex items-center gap-2">
                        {getGestureIcon(gestureData.gesture)}
                        <span className="text-white font-medium capitalize text-sm">
                          {gestureData.gesture}
                        </span>
                        {gestureData.confidence > 0 && (
                          <span className={`text-xs font-mono ${getConfidenceColor(gestureData.confidence)}`}>
                            {(gestureData.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Processing Indicator */}
                  {isProcessing && (
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
                      <div className="px-3 py-2 bg-blue-600/80 backdrop-blur-md rounded-full border border-blue-400/50">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-t-2 border-white rounded-full animate-spin"></div>
                          <span className="text-white font-medium text-sm">
                            {gestureData.gesture === 'hit' ? 'Taking card...' : 'Standing...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Manual Mode Overlay */}
              {controlMode === 'manual' && isStreamActive && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md px-4 py-3 rounded-lg border border-white/20">
                    <div className="text-center">
                      <div className="text-white font-medium mb-1">Manual Mode</div>
                      <div className="text-gray-300 text-sm">Enable gesture mode to use AI detection</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Control Panel */}
        <div className="px-4 py-3 bg-black/30 border-t border-white/5 flex-shrink-0">
          {controlMode === 'gesture' ? (
            <div className="space-y-3">
              {/* Gesture Status */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">AI Detection:</span>
                {gestureData.status === "error" ? (
                  <span className="text-red-400 text-sm font-medium">Error</span>
                ) : isProcessing ? (
                  <span className="text-blue-400 text-sm font-medium">Processing...</span>
                ) : gestureData.isConfident && gestureData.gesture !== "idle" ? (
                  <span className="text-green-400 text-sm font-medium">Confident</span>
                ) : (
                  <span className="text-gray-400 text-sm font-medium">Detecting</span>
                )}
              </div>
              
              {/* Confidence Bar */}
              {gestureData.confidence > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Confidence</span>
                    <span className={getConfidenceColor(gestureData.confidence)}>
                      {(gestureData.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full transition-colors duration-300 ${
                        gestureData.confidence >= 0.8 ? 'bg-green-400' :
                        gestureData.confidence >= 0.6 ? 'bg-yellow-400' :
                        'bg-red-400'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${gestureData.confidence * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
              
              {/* Gesture Instructions */}
              <div className="text-xs text-gray-500 text-center pt-2 border-t border-white/5">
                Hold your hand in the detection area and make clear gestures
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 text-sm">Enable gesture mode to use AI detection</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CameraFeed; 