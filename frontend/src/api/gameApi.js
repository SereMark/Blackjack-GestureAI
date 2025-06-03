const API_BASE_URL = 'http://localhost:8000';

// Configuration
const API_CONFIG = {
  timeout: 10000, // 10 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Session management
let sessionId = null;

function getSessionId() {
  if (!sessionId) {
    sessionId = localStorage.getItem('blackjack_session_id');
  }
  return sessionId;
}

function setSessionId(id) {
  sessionId = id;
  if (id) {
    localStorage.setItem('blackjack_session_id', id);
  } else {
    localStorage.removeItem('blackjack_session_id');
  }
}

// Utility function for delays
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiRequest(endpoint, method = 'GET', body = null, retryCount = 0) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Add session ID to headers if available
  const currentSessionId = getSessionId();
  if (currentSessionId) {
    headers['X-Session-ID'] = currentSessionId;
  }

  const options = {
    method,
    headers,
    mode: 'cors',
    credentials: 'include', // Include cookies for session management
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  options.signal = controller.signal;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    clearTimeout(timeoutId);

    // Extract session ID from response headers or cookies
    const responseSessionId = response.headers.get('X-Session-ID');
    if (responseSessionId && responseSessionId !== currentSessionId) {
      setSessionId(responseSessionId);
    }

    if (!response.ok) {
      let errorDetail;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      } catch (e) {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(errorDetail);
      }

      // Retry on server errors (5xx) or network issues
      if (retryCount < API_CONFIG.retryAttempts && response.status >= 500) {
        console.warn(`API request failed (attempt ${retryCount + 1}/${API_CONFIG.retryAttempts}): ${errorDetail}`);
        await delay(API_CONFIG.retryDelay * (retryCount + 1)); // Exponential backoff
        return apiRequest(endpoint, method, body, retryCount + 1);
      }

      throw new Error(errorDetail);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    // Handle network errors and timeouts
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error
      if (retryCount < API_CONFIG.retryAttempts) {
        console.warn(`Network error (attempt ${retryCount + 1}/${API_CONFIG.retryAttempts}): ${error.message}`);
        await delay(API_CONFIG.retryDelay * (retryCount + 1));
        return apiRequest(endpoint, method, body, retryCount + 1);
      }
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Re-throw known errors
    throw error;
  }
}

// Clean API functions
export const fetchGameState = () => apiRequest('/game/state');

export const placeBet = (betAmount) => {
  if (!betAmount || betAmount <= 0) {
    throw new Error('Bet amount must be greater than 0');
  }
  return apiRequest('/game/bet', 'POST', { bet: betAmount });
};

export const hit = () => apiRequest('/game/hit', 'POST');

export const stand = () => apiRequest('/game/stand', 'POST');

export const newRound = () => apiRequest('/game/new-round', 'POST');

export const resetGame = () => {
  // Clear session when resetting
  setSessionId(null);
  return apiRequest('/game/reset', 'POST');
};

export const fetchGestureData = async () => {
  try {
    const response = await apiRequest('/game/gesture');
    return {
      gesture: response.gesture || 'idle',
      confidence: response.confidence || 0,
      isConfident: response.is_confident || false,
      quality: response.quality || 'poor',
      status: response.status || 'idle'
    };
  } catch (error) {
    // Silent fallback for gesture detection
    return {
      gesture: 'idle',
      confidence: 0,
      isConfident: false,
      quality: 'poor',
      status: 'error'
    };
  }
};

export const switchMode = async (mode) => {
  try {
    // Use a short timeout for mode switching to prevent hanging
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add session ID to headers if available
    const currentSessionId = getSessionId();
    if (currentSessionId) {
      headers['X-Session-ID'] = currentSessionId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const options = {
      method: 'POST',
      headers,
      mode: 'cors',
      credentials: 'include',
      signal: controller.signal
    };

    const response = await fetch(`${API_BASE_URL}/game/mode/${mode}`, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
      } catch (e) {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Mode switch timed out. Please try again.');
    }
    console.error('Error switching mode:', error);
    throw error;
  }
};

// Utility functions
export const clearSession = () => setSessionId(null);

export const getConnectionStatus = () => navigator.onLine;

// Connection monitoring
export function onConnectionChange(callback) {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}