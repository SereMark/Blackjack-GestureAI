import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../store/gameStore";

function GestureIndicator() {
  const [gesture, setGesture] = useState("idle");
  const { processGestureCommand, gameState, controlMode } = useGameStore();
  
  useEffect(() => {
    let mounted = true;
    let interval = null;
    
    if (controlMode === 'gesture') {
      interval = setInterval(async () => {
        if (gameState === "in_progress" && mounted) {
          try {
            const detectedGesture = await processGestureCommand();
            if (mounted) setGesture(detectedGesture);
          } catch (error) {
            console.error("Error processing gesture:", error);
          }
        }
      }, 2000);
    } else {
      setGesture("idle");
    }
    
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [processGestureCommand, gameState, controlMode]);

  if (controlMode !== 'gesture') return null;
  
  return (
    <AnimatePresence>
      <motion.div
        key="gestureIndicator"
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 30, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 right-4 bg-gradient-to-b from-black/70 to-black/90 backdrop-blur-sm border border-white/10 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-indigo-800/30 flex items-center justify-center shadow-inner">
            {gesture === 'hit' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            )}
            {gesture === 'stand' && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
            )}
            {gesture === 'idle' && (
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-gray-300 text-xs uppercase tracking-wide">Detected Gesture</span>
            <span className={`font-semibold ${
              gesture === 'hit' ? 'text-yellow-400' : 
              gesture === 'stand' ? 'text-red-400' : 
              'text-gray-400'
            }`}>
              {gesture.charAt(0).toUpperCase() + gesture.slice(1)}
            </span>
          </div>
        </div>
        {gesture !== 'idle' && (
          <div className="ml-1 px-3 py-1 bg-gradient-to-r from-indigo-900/30 to-indigo-800/20 rounded-full shadow-inner border border-indigo-600/20">
            <span className="text-xs font-medium text-indigo-300 animate-pulse">
              {gesture === 'hit' ? 'Drawing card...' : 'Standing...'}
            </span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default GestureIndicator;