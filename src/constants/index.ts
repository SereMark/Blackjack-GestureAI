import { Settings } from "../types";

export const GESTURES = [
  'Open_Palm', 'Closed_Fist', 'Thumb_Up', 'Thumb_Down',
  'Victory', 'Pointing_Up', 'OK_Sign'
];

export const DEFAULT_SETTINGS: Settings = {
  hitGesture: 'Open_Palm',
  standGesture: 'Closed_Fist',
  doubleGesture: 'Thumb_Down',
  holdTime: 500,
  confidence: 0.7,
  soundEnabled: true,
  vibrationEnabled: true,
  highContrast: false,
  privacyMode: false
};

export const GAME_CONFIG = {
  initialBalance: 1000,
  minBet: 10,
  maxBet: 500,
  blackjackPayout: 1.5,
  dealerStandValue: 17,
  animationDuration: 400
};