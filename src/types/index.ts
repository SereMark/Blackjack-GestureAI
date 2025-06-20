export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface GestureSample {
  gesture: string;
  landmarks: number[][];
  timestamp: number;
}

export interface CalibrationData {
  samples: Record<string, GestureSample[]>;
  createdAt: number;
  version: string;
}

export interface GestureLog {
  timestamp: number;
  gesture: string;
  confidence: number;
  action: string | null;
  latency: number;
}

export interface Settings {
  hitGesture: string;
  standGesture: string;
  doubleGesture: string;
  holdTime: number;
  confidence: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  highContrast: boolean;
  privacyMode: boolean;
}

export type GamePhase = 'waiting' | 'dealing' | 'playing' | 'dealer-turn' | 'game-over';

export interface GameState {
  balance: number;
  bet: number;
  deck: Card[];
  playerCards: Card[];
  dealerCards: Card[];
  phase: GamePhase;
  dealerRevealed: boolean;
  message: string;
  lastResult: 'win' | 'loss' | 'push' | null;
  isAnimating: boolean;
  stats: {
    handsPlayed: number;
    handsWon: number;
    totalWinnings: number;
    bestStreak: number;
    currentStreak: number;
  };
  
  // Actions
  placeBet: (amount: number) => void;
  deal: () => void;
  hit: () => void;
  stand: () => void;
  double: () => void;
  nextRound: () => void;
  reset: () => void;
}

export interface RecognitionResult {
  name: string;
  confidence: number;
  holdProgress: number;
  shouldTrigger: boolean;
}

export interface ModelConfig {
  modelPath?: string;
  confidence?: number;
  delegate?: 'CPU' | 'GPU';
  numHands?: number;
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minTrackingConfidence?: number;
  [key: string]: any;
}

export interface IGestureModel {
  readonly modelType: string;
  readonly isReady: boolean;
  
  init(video: HTMLVideoElement, config?: ModelConfig): Promise<void>;
  recognize(video: HTMLVideoElement, timestamp: number): RecognitionResult | null;
  close(): Promise<void>;
}

export interface IGestureRecognizer {
  readonly currentModel: string | null;
  readonly isReady: boolean;
  
  setModel(modelType: string, config?: ModelConfig): Promise<void>;
  recognize(video: HTMLVideoElement, timestamp: number): RecognitionResult | null;
  close(): Promise<void>;
}