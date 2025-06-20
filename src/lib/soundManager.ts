import { useSettingsStore } from '../store/settingsStore';
import { soundData } from './soundData';

export const soundManager = {
  sounds: new Map<string, HTMLAudioElement>(),
  initialized: false,

  async init() {
    if (this.initialized) return;
    try {
      for (const [key, data] of Object.entries(soundData)) {
        const audio = new Audio(data);
        audio.volume = 0.1;
        this.sounds.set(key, audio);
      }
      this.initialized = true;
    } catch (error) {
      
    }
  },

  play(sound: string) {
    if (!useSettingsStore.getState().settings.soundEnabled) return;

    const audio = this.sounds.get(sound);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }
};