import React, { useState } from 'react';
import { GestureRecognizer } from '../lib/gestureRecognizer';
import { useSettingsStore } from '../store/settingsStore';

interface ModelSelectorProps {
  onModelChange?: (modelType: string) => void;
  currentModel?: string | null;
  disabled?: boolean;
}

export const ModelSelector = ({ onModelChange, currentModel, disabled }: ModelSelectorProps) => {
  const [isChanging, setIsChanging] = useState(false);
  const { settings } = useSettingsStore();
  
  const availableModels = GestureRecognizer.getAvailableModels();
  
  const handleModelChange = async (newModel: string) => {
    if (newModel === currentModel || isChanging) return;
    
    setIsChanging(true);
    try {
      onModelChange?.(newModel);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-white">Gesture Model</h3>
      
      <div className="relative">
        <select
          value={currentModel || ''}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={disabled || isChanging}
          className={`w-full px-3 py-2 ${settings.highContrast ? 'bg-gray-900 border-2 border-white' : 'bg-gray-700 border border-gray-600'} rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${settings.highContrast ? 'focus:border-white' : 'focus:border-blue-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {!currentModel && (
            <option value="" disabled>
              Select a gesture model
            </option>
          )}
          {availableModels.map((modelType) => (
            <option key={modelType} value={modelType}>
              {modelType.charAt(0).toUpperCase() + modelType.slice(1)}
            </option>
          ))}
        </select>
        
        {isChanging && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          </div>
        )}
      </div>
    </div>
  );
}; 