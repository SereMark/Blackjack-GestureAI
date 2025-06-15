import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

export const useSettingsStore = create<{
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      }))
    }),
    {
      name: 'blackjack-settings'
    }
  )
);