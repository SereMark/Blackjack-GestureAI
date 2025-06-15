import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalibrationData, GestureLog, GestureSample } from '../types';

export const useCalibrationStore = create<{
  calibrationData: CalibrationData | null;
  gestureLogs: GestureLog[];
  addCalibrationSample: (gesture: string, sample: GestureSample) => void;
  clearCalibration: () => void;
  addGestureLog: (log: GestureLog) => void;
  clearLogs: () => void;
}>()(
  persist(
    (set, get) => ({
      calibrationData: null,
      gestureLogs: [],
      
      addCalibrationSample: (gesture: string, sample: GestureSample) => {
        const current = get().calibrationData || {
          samples: {},
          createdAt: Date.now(),
          version: '1.0'
        };
        
        if (!current.samples[gesture]) {
          current.samples[gesture] = [];
        }
        
        current.samples[gesture].push(sample);
        
        if (current.samples[gesture].length > 5) {
          current.samples[gesture].shift();
        }
        
        set({ calibrationData: current });
      },
      
      clearCalibration: () => {
        set({ calibrationData: null });
      },
      
      addGestureLog: (log: GestureLog) => {
        set((state) => ({
          gestureLogs: [...state.gestureLogs.slice(-49), log]
        }));
      },
      
      clearLogs: () => {
        set({ gestureLogs: [] });
      }
    }),
    {
      name: 'blackjack-calibration'
    }
  )
);