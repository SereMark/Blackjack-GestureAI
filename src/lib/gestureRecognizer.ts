import { useSettingsStore } from '../store/settingsStore';
import { IGestureModel, IGestureRecognizer, ModelConfig, RecognitionResult } from '../types';
import { ModelRegistry, defaultModelConfigs } from './models/ModelRegistry';

export class GestureRecognizer implements IGestureRecognizer {
  private model: IGestureModel | null = null;
  private _currentModel: string | null = null;
  private lastGesture: string | null = null;
  private gestureStartTime: number = 0;
  private cooldownTimer: number | null = null;
  private video: HTMLVideoElement | null = null;

  public get currentModel(): string | null {
    return this._currentModel;
  }

  public get isReady(): boolean {
    return this.model?.isReady ?? false;
  }

  async setModel(modelType: string, config: ModelConfig = {}): Promise<void> {
    if (this.model) {
      await this.model.close();
    }

    this.resetState();

    try {
      this.model = ModelRegistry.createModel(modelType);
      this._currentModel = modelType;

      const defaultConfig = defaultModelConfigs[modelType] || {};
      const finalConfig = { ...defaultConfig, ...config };

      if (this.video) {
        await this.model.init(this.video, finalConfig);
      }
    } catch (error) {
      this.model = null;
      this._currentModel = null;
      throw new Error(`Failed to set model '${modelType}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async init(video: HTMLVideoElement, modelType: string = 'mediapipe', config: ModelConfig = {}): Promise<void> {
    this.video = video;
    await this.setModel(modelType, config);
  }

  recognize(video: HTMLVideoElement, timestamp: number): RecognitionResult | null {
    if (!this.model?.isReady) {
      return null;
    }

    const rawResult = this.model.recognize(video, timestamp);
    if (!rawResult) {
      if (!this.cooldownTimer) {
        this.lastGesture = null;
      }
      return null;
    }

    const minConfidence = useSettingsStore.getState().settings.confidence;
    if (rawResult.confidence < minConfidence) {
      if (!this.cooldownTimer) {
        this.lastGesture = null;
      }
      return null;
    }

    const currentTime = Date.now();
    const holdTime = useSettingsStore.getState().settings.holdTime;
    const gestureName = rawResult.name;

    if (this.lastGesture !== gestureName) {
      this.lastGesture = gestureName;
      this.gestureStartTime = currentTime;
      
      if (this.cooldownTimer) {
        clearTimeout(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }

    const holdDuration = currentTime - this.gestureStartTime;
    const holdProgress = Math.min(holdDuration / holdTime, 1);
    const shouldTrigger = holdProgress >= 1 && !this.cooldownTimer;

    if (shouldTrigger) {
      this.cooldownTimer = setTimeout(() => {
        this.cooldownTimer = null;
        this.lastGesture = null;
      }, 1000) as unknown as number;
    }

    return {
      name: gestureName,
      confidence: rawResult.confidence,
      holdProgress,
      shouldTrigger
    };
  }


  static getAvailableModels(): string[] {
    return ModelRegistry.getAvailableModels();
  }


  static hasModel(modelType: string): boolean {
    return ModelRegistry.hasModel(modelType);
  }


  static registerModel(modelType: string, factory: () => IGestureModel): void {
    ModelRegistry.registerModel(modelType, factory);
  }


  static getDefaultConfig(modelType: string): ModelConfig {
    return defaultModelConfigs[modelType] ? { ...defaultModelConfigs[modelType] } : {};
  }


  async close(): Promise<void> {
    this.resetState();
    
    if (this.model) {
      await this.model.close();
      this.model = null;
    }
    
    this._currentModel = null;
    this.video = null;
  }

  private resetState(): void {
    this.lastGesture = null;
    this.gestureStartTime = 0;
    
    if (this.cooldownTimer) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}