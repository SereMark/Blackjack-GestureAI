import { useSettingsStore } from '../store/settingsStore';

export const soundManager = {
  sounds: new Map<string, HTMLAudioElement>(),
  initialized: false,
  
  async init() {
    if (this.initialized) return;
    
    const soundData = {
      deal: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi13yvLTgjMGHm7A7+OZURE',
      win: 'data:audio/wav;base64,UklGRpwGAABXQVZFZm10IBAAAAABAAEAQAcAAEAHAAABAAgAZGF0YXgGAAB6gYaIjY6Li4uNkZSOioprdHd+hoeGg4GDiY+Qi4aDfHh8gISGh4SCfnx+gYOEhYaGhYWEg4J/fX5/gYKDg4ODg4ODg4ODg4OCgYB/fn1+fn9/f39/f39+fn19fX19fX19fHx8fHx8fHx8fHx8fHx8fHx8fHx8fH',
      lose: 'data:audio/wav;base64,UklGRuYFAABXQVZFZm10IBAAAAABAAEAQAcAAEAHAAABAAgAZGF0YcIFAAB1hYuKhn15d4OKjYmCeXR5gYiKiYR+eHmAhYiHhX58eoGFhYOBfnx+gYOCgH99fYCBgH9+fX5+f39+fX19fn5+fn19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19',
      gesture: 'data:audio/wav;base64,UklGRjIBAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQ4BAACAgoSFiIqMjZCSlJaZm52foKOlp6qsrrCztLa4u72/wsTGyczO0NLV19nb3uDi5Ofo6uzu8PL09vj6/P4AAAH/'
    };
    
    try {
      for (const [key, data] of Object.entries(soundData)) {
        const audio = new Audio(data);
        audio.volume = 0.1;
        this.sounds.set(key, audio);
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Sound initialization failed:', error);
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