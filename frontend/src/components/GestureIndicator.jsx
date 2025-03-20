import { useEffect, useState } from "react";
import { fetchGesture } from "../api/gameApi";
import { motion, AnimatePresence } from "framer-motion";

function GestureIndicator() {
  const [gesture, setGesture] = useState("");

  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      try {
        const g = await fetchGesture();
        if (mounted) setGesture(g);
      } catch {}
    }, 2000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="gestureIndicator"
        initial={{ x: 30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 30, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-md shadow-lg"
      >
        Gesture: {gesture || "None"}
      </motion.div>
    </AnimatePresence>
  );
}

export default GestureIndicator;