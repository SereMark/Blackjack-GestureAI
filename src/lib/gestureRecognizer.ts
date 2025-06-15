import { useSettingsStore } from "../store/settingsStore";

export class GestureRecognizer {
  private recognizer: any = null;
  private ready = false;
  private lastGesture: string | null = null;
  private lastGestureTime = 0;
  private cooldownTimer: any = null;
  
  async init(video: HTMLVideoElement) {
    try {
      const { GestureRecognizer, FilesetResolver } = await import('@mediapipe/tasks-vision');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
      );
      
      this.recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize MediaPipe:', error);
      throw error;
    }
  }
  
  recognize(video: HTMLVideoElement, timestamp: number) {
    if (!this.ready || !this.recognizer || !video.videoWidth) return null;
    
    try {
      const results = this.recognizer.recognizeForVideo(video, timestamp);
      const gesture = results.gestures?.[0]?.[0];
      
      if (gesture && gesture.score >= useSettingsStore.getState().settings.confidence) {
        const now = Date.now();
        
        if (gesture.categoryName !== this.lastGesture) {
          this.lastGesture = gesture.categoryName;
          this.lastGestureTime = now;
          return {
            name: gesture.categoryName,
            confidence: gesture.score,
            holdProgress: 0,
            shouldTrigger: false
          };
        }
        
        const holdDuration = now - this.lastGestureTime;
        const holdTime = useSettingsStore.getState().settings.holdTime;
        const holdProgress = Math.min(holdDuration / holdTime, 1);
        
        if (holdProgress === 1 && !this.cooldownTimer) {
          this.cooldownTimer = setTimeout(() => {
            this.cooldownTimer = null;
            this.lastGesture = null;
          }, 1000);
          
          return {
            name: gesture.categoryName,
            confidence: gesture.score,
            holdProgress: 1,
            shouldTrigger: true
          };
        }
        
        return {
          name: gesture.categoryName,
          confidence: gesture.score,
          holdProgress,
          shouldTrigger: false
        };
      }
      
      if (!this.cooldownTimer) {
        this.lastGesture = null;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  async close() {
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    if (this.recognizer) {
      await this.recognizer.close();
      this.recognizer = null;
      this.ready = false;
    }
  }
}