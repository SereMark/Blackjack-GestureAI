const API_BASE_URL = 'http://localhost:8000';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const timestamp = new Date().getTime();
  const url = `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${timestamp}`;
  
  console.log(`Making ${method} request to: ${url}`);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    mode: 'cors',
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    console.log('Request options:', JSON.stringify(options));
    const response = await fetch(url, options);
    
    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      let errorDetail;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || `Status: ${response.status}`;
      } catch (e) {
        errorDetail = `HTTP error, status: ${response.status}`;
      }
      throw new Error(errorDetail);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    return data;
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    throw error;
  }
}

export async function fetchGameState() {
  return apiRequest('/game/state');
}

export async function placeBet(betAmount) {
  return apiRequest('/game/bet', 'POST', { bet: betAmount });
}

export async function hit() {
  return apiRequest('/game/hit', 'POST');
}

export async function stand() {
  return apiRequest('/game/stand', 'POST');
}

export async function newRound() {
  return apiRequest('/game/new-round', 'POST');
}

export async function resetGame() {
  return apiRequest('/game/reset', 'POST');
}

export async function fetchGesture() {
  try {
    const response = await apiRequest('/game/gesture');
    return response.gesture;
  } catch (error) {
    console.error('Error fetching gesture:', error);
    return 'idle';
  }
}

export async function processGesture(gesture) {
  return apiRequest('/game/process-gesture', 'POST', { gesture });
}