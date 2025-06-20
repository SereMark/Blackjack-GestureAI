import { IGestureModel, ModelConfig } from '../../types';
import { MediaPipeGestureModel } from './MediaPipeGestureModel';
import { TensorFlowGestureModel } from './TensorFlowGestureModel';

export class ModelRegistry {
  private static models = new Map<string, () => IGestureModel>([
    ['mediapipe', () => new MediaPipeGestureModel()],
    ['tensorflow', () => new TensorFlowGestureModel()],
  ]);

  static getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }

  static createModel(modelType: string): IGestureModel {
    const modelFactory = this.models.get(modelType);
    if (!modelFactory) {
      throw new Error(`Unknown gesture model type: ${modelType}. Available models: ${this.getAvailableModels().join(', ')}`);
    }
    return modelFactory();
  }

  static registerModel(modelType: string, factory: () => IGestureModel): void {
    this.models.set(modelType, factory);
  }

  static hasModel(modelType: string): boolean {
    return this.models.has(modelType);
  }
}

export const defaultModelConfigs: Record<string, ModelConfig> = {
  mediapipe: {
    modelPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
    delegate: 'CPU',
    numHands: 1,
    minHandDetectionConfidence: 0.3,
    minHandPresenceConfidence: 0.3,
    minTrackingConfidence: 0.3,
  },
  tensorflow: {
    modelPath: '/models/gesture-model.json',
    delegate: 'CPU',
    inputSize: 224,
    numClasses: 10,
  },
}; 