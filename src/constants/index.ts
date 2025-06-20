import { Settings } from "../types";

export const GESTURES = [
  'Open_Palm',
  'Closed_Fist', 
  'Thumb_Up',
  'Thumb_Down',
  'Victory',
  'Pointing_Up',
  'ILoveYou'
] as const;

export const DEFAULT_GESTURE_MAPPINGS = {
  hitGesture: 'Open_Palm',
  standGesture: 'Closed_Fist',
  doubleGesture: 'Thumb_Up'
} as const;

export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_GESTURE_MAPPINGS,
  holdTime: 1500,
  confidence: 0.7,
  soundEnabled: true,
  vibrationEnabled: true,
  highContrast: false,
  privacyMode: false
};

export const GAME_CONFIG = {
  initialBalance: 1000,
  minBet: 5,
  maxBet: 500,
  blackjackPayout: 1.5,
  dealerStandValue: 17,
  cardAnimationDuration: 800,
  dealerRevealDelay: 1000
} as const;