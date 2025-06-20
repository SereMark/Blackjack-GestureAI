import { GestureRecognizer as MediaPipeGestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';
import { IGestureModel, ModelConfig, RecognitionResult } from '../../types';

let cachedFilesetResolver: any = null;

export class MediaPipeGestureModel implements IGestureModel {
  public readonly modelType = 'mediapipe';
  private recognizer: MediaPipeGestureRecognizer | null = null;
  private _isReady = false;

  public get isReady(): boolean {
    return this._isReady;
  }

  async init(video: HTMLVideoElement, config: ModelConfig = {}): Promise<void> {
    try {
      if (!cachedFilesetResolver) {
        await this.loadMediaPipeWithRetry();
      }

      const defaultConfig = {
        modelPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        delegate: 'CPU' as const,
        numHands: 1,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
        ...config
      };

      const gestureRecognizer = await MediaPipeGestureRecognizer.createFromOptions(
        cachedFilesetResolver,
        {
          baseOptions: {
            modelAssetPath: defaultConfig.modelPath,
            delegate: defaultConfig.delegate
          },
          runningMode: 'VIDEO',
          numHands: defaultConfig.numHands,
          minHandDetectionConfidence: defaultConfig.minHandDetectionConfidence,
          minHandPresenceConfidence: defaultConfig.minHandPresenceConfidence,
          minTrackingConfidence: defaultConfig.minTrackingConfidence
        }
      );

      this.recognizer = gestureRecognizer;
      this._isReady = true;
    } catch (error) {
      throw new Error(`Failed to initialize MediaPipe gesture recognizer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadMediaPipeWithRetry(maxRetries = 3): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        cachedFilesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
        );
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Network error');
        if (attempt === maxRetries) break;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error(`Failed to load MediaPipe after ${maxRetries} attempts. Please check your internet connection.`);
  }

  recognize(video: HTMLVideoElement, timestamp: number): RecognitionResult | null {
    if (!this._isReady || !this.recognizer) {
      return null;
    }

    if (!video?.videoWidth || !video?.videoHeight) {
      return null;
    }

    try {
      const results = this.recognizer.recognizeForVideo(video, timestamp);
      const gestures = results?.gestures?.[0];
      
      if (!gestures?.length) {
        return null;
      }

      const gesture = gestures[0];
      if (!gesture?.categoryName) {
        return null;
      }

      return {
        name: gesture.categoryName,
        confidence: gesture.score,
        holdProgress: 0,
        shouldTrigger: false
      };
    } catch (error) {
      return null;
    }
  }

  async close(): Promise<void> {
    this._isReady = false;
    
    if (this.recognizer) {
      this.recognizer.close();
      this.recognizer = null;
    }
  }
} 