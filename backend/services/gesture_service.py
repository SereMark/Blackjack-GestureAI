import random
import time
import threading
from typing import Literal, Dict, Any
import logging

logger = logging.getLogger(__name__)

class GestureDetector:
    def __init__(self):
        self.last_gesture = "idle"
        self.gesture_confidence = 0.0
        self.last_detection_time = time.time()
        self.lock = threading.Lock()
        
        # Gesture simulation parameters
        self.gesture_weights = {
            "idle": 0.75,
            "hit": 0.12,
            "stand": 0.13
        }
        
        # Gesture persistence, prevents rapid changes
        self.gesture_persistence_duration = 1.0  # seconds
        self.min_confidence_threshold = 0.6
        
        # Gesture history
        self.gesture_history = []
        self.max_history_length = 10

    def _update_gesture_history(self, gesture: str, confidence: float):
        """Update gesture history for more realistic patterns."""
        with self.lock:
            self.gesture_history.append({
                "gesture": gesture,
                "confidence": confidence,
                "timestamp": time.time()
            })
            
            # Keep only recent history
            if len(self.gesture_history) > self.max_history_length:
                self.gesture_history.pop(0)

    def _calculate_smoothed_confidence(self, base_confidence: float, gesture: str) -> float:
        """Calculate confidence with smoothing based on history."""
        if not self.gesture_history:
            return base_confidence
        
        # Boost confidence if gesture is consistent
        recent_same_gestures = sum(1 for h in self.gesture_history[-3:] 
                                  if h["gesture"] == gesture)
        
        consistency_boost = recent_same_gestures * 0.1
        smoothed_confidence = min(base_confidence + consistency_boost, 1.0)
        
        return smoothed_confidence

    def detect_gesture(self) -> tuple[Literal["idle", "hit", "stand"], float]:
        """
        Detect gesture from camera input.
        
        Returns:
            tuple: (gesture, confidence_score)
        """
        current_time = time.time()
        
        with self.lock:
            # Gesture persistence, don't change too frequently
            time_since_last = current_time - self.last_detection_time
            
            if time_since_last < self.gesture_persistence_duration:
                # Return previous gesture with slightly adjusted confidence
                confidence_decay = max(0.1, self.gesture_confidence - (time_since_last * 0.1))
                return self.last_gesture, confidence_decay
            
            # Simulate gesture detection with weighted randomness
            gestures = list(self.gesture_weights.keys())
            weights = list(self.gesture_weights.values())
            
            detected_gesture = random.choices(gestures, weights=weights)[0]
            
            # Generate base confidence
            if detected_gesture == "idle":
                base_confidence = random.uniform(0.5, 0.8)
            else:
                base_confidence = random.uniform(0.7, 0.95)
            
            # Apply confidence smoothing
            final_confidence = self._calculate_smoothed_confidence(base_confidence, detected_gesture)
            
            # Update state
            self.last_gesture = detected_gesture
            self.gesture_confidence = final_confidence
            self.last_detection_time = current_time
            
            # Update history
            self._update_gesture_history(detected_gesture, final_confidence)
            
            logger.debug(f"Detected gesture: {detected_gesture} (confidence: {final_confidence:.2f})")
            
            return detected_gesture, final_confidence

    def is_confident_gesture(self, min_confidence: float = 0.8) -> bool:
        """Check if current gesture detection is confident enough to act upon."""
        return (self.gesture_confidence >= min_confidence and 
                self.last_gesture != "idle" and
                self.gesture_confidence >= self.min_confidence_threshold)

    def get_detection_quality(self) -> str:
        """Get a description of detection quality."""
        if self.gesture_confidence >= 0.9:
            return "excellent"
        elif self.gesture_confidence >= 0.8:
            return "good"
        elif self.gesture_confidence >= 0.6:
            return "fair"
        else:
            return "poor"

    def reset(self):
        """Reset the detector state."""
        with self.lock:
            self.last_gesture = "idle"
            self.gesture_confidence = 0.0
            self.last_detection_time = time.time()
            self.gesture_history.clear()
            logger.info("Gesture detector reset")

# Global gesture detector instance
_gesture_detector = GestureDetector()

def get_current_gesture() -> Dict[str, Any]:
    """
    Get the current detected gesture with comprehensive information.
    
    Returns:
        dict: Contains gesture type, confidence, timing, and quality metrics
    """
    gesture, confidence = _gesture_detector.detect_gesture()
    
    return {
        "gesture": gesture,
        "confidence": confidence,
        "is_confident": _gesture_detector.is_confident_gesture(),
        "timestamp": time.time(),
        "quality": _gesture_detector.get_detection_quality(),
        "detection_age": time.time() - _gesture_detector.last_detection_time
    }

def reset_gesture_detector():
    """Reset the gesture detector state."""
    global _gesture_detector
    _gesture_detector.reset()
    logger.info("Gesture detector reset by external request")

def get_gesture_statistics() -> Dict[str, Any]:
    """Get statistics about gesture detection performance."""
    history = _gesture_detector.gesture_history
    if not history:
        return {
            "total_detections": 0,
            "average_confidence": 0.0,
            "most_common_gesture": "idle",
            "detection_rate": 0.0
        }
    
    # Calculate statistics
    total_detections = len(history)
    average_confidence = sum(h["confidence"] for h in history) / total_detections
    
    # Count gesture types
    gesture_counts = {}
    for h in history:
        gesture_counts[h["gesture"]] = gesture_counts.get(h["gesture"], 0) + 1
    
    most_common_gesture = max(gesture_counts, key=gesture_counts.get)
    
    # Calculate detection rate (detections per minute)
    if len(history) >= 2:
        time_span = history[-1]["timestamp"] - history[0]["timestamp"]
        detection_rate = (total_detections / max(time_span, 1)) * 60
    else:
        detection_rate = 0.0
    
    return {
        "total_detections": total_detections,
        "average_confidence": round(average_confidence, 2),
        "most_common_gesture": most_common_gesture,
        "detection_rate": round(detection_rate, 1),
        "gesture_distribution": gesture_counts
    } 