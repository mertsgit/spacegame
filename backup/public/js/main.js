// Main entry point for the game
document.addEventListener('DOMContentLoaded', function() {
  console.log('Document loaded, initializing game components');
  
  // Enable debug logging
  enableDebugLogging();
  
  // Create login manager first and expose it globally
  window.loginManager = new LoginManager();
  console.log('Login manager initialized');
  
  // Initialize components in the correct order with proper delays
  setTimeout(() => {
    // Initialize WebSocket manager
    window.wsManager = new WebSocketManager();
    logDebug('WebSocket manager initialized');
    
    // Initialize SpaceshipManager before GameManager
    window.spaceshipManager = new SpaceshipManager();
    logDebug('Spaceship manager initialized');
    
    // Initialize game manager after other dependencies are ready
    setTimeout(() => {
      // Check if THREE and OrbitControls are loaded
      if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded!');
        alert('THREE.js failed to load. Please check your internet connection and reload the page.');
        return;
      }
      
      // Initialize Game Manager but don't connect WebSocket until scene is ready
      window.gameManager = new GameManager();
      
      // Initialize scene explicitly before processing WebSocket messages
      if (window.gameManager && window.gameManager.initScene) {
        logDebug('Explicitly initializing scene before WebSocket processing');
        window.gameManager.initScene();
      }
      
      // Now connect to WebSocket server after scene is initialized
      if (window.wsManager) {
        logDebug('Connecting to WebSocket server after scene initialization');
        window.wsManager.connect();
      }
      
      // Set up periodic game state check
      setInterval(checkGameState, 5000);
      
    }, 500); // Delay game manager initialization
    
  }, 100); // Delay after login manager initialization
  
  // Log browser and screen info
  console.log('Browser: ' + navigator.userAgent);
  console.log('Screen: ' + window.innerWidth + 'x' + window.innerHeight);
});

// Check game state
function checkGameState() {
  console.log('Checking game state...');
  
  // Check login manager
  if (window.loginManager) {
    console.log('Login Manager: OK (Player ID: ' + (window.loginManager.playerId || 'Not set') + ')');
  } else {
    console.error('Login Manager: Not found');
  }
  
  // Check websocket manager
  if (window.wsManager) {
    console.log('WebSocket Manager: OK (Connected: ' + (window.wsManager.isConnected ? window.wsManager.isConnected() : 'false') + ')');
  } else {
    console.error('WebSocket Manager: Not found');
  }
  
  // Check game manager
  if (window.gameManager) {
    console.log('Game Manager: OK (Initialized: ' + (window.gameManager.initialized ? 'true' : 'false') + ')');
    console.log('Game Manager Local Player ID: ' + (window.gameManager.localPlayerId || 'Not set'));
  } else {
    console.error('Game Manager: Not found');
  }
  
  // Check player ship
  if (window.gameManager && window.gameManager.players && window.loginManager && window.loginManager.playerId) {
    const localPlayerId = window.loginManager.playerId;
    if (localPlayerId && window.gameManager.players && window.gameManager.players[localPlayerId]) {
      console.log('Player Ship: OK');
    } else {
      console.error('Player Ship: Not found');
      
      // Try to force create player ship if it doesn't exist
      if (window.gameManager.forceCreatePlayerShip) {
        console.log('Attempting to force create player ship...');
        window.gameManager.forceCreatePlayerShip();
      }
    }
  }
}

// Enable debug logging
function enableDebugLogging() {
  // Store original console.log
  const originalLog = console.log;
  
  // Override console.log to add "Debug: " prefix
  console.log = function() {
    // Convert arguments to array
    const args = Array.from(arguments);
    
    // Call original console.log with modified arguments
    originalLog.apply(console, ['Debug:'].concat(args));
  };
}

// Helper function for debug logging
function logDebug(message) {
  console.log(message);
}

// Check if WebGL is supported
function isWebGLSupported() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// Show error message
function showError(message) {
  // Create error overlay
  const errorOverlay = document.createElement('div');
  errorOverlay.style.position = 'fixed';
  errorOverlay.style.top = '0';
  errorOverlay.style.left = '0';
  errorOverlay.style.width = '100%';
  errorOverlay.style.height = '100%';
  errorOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  errorOverlay.style.display = 'flex';
  errorOverlay.style.flexDirection = 'column';
  errorOverlay.style.justifyContent = 'center';
  errorOverlay.style.alignItems = 'center';
  errorOverlay.style.zIndex = '9999';
  errorOverlay.style.padding = '20px';
  errorOverlay.style.textAlign = 'center';
  
  // Create error message
  const errorMessage = document.createElement('div');
  errorMessage.style.color = '#ff3333';
  errorMessage.style.fontSize = '24px';
  errorMessage.style.marginBottom = '20px';
  errorMessage.textContent = 'Error';
  
  // Create error details
  const errorDetails = document.createElement('div');
  errorDetails.style.color = '#ffffff';
  errorDetails.style.fontSize = '16px';
  errorDetails.style.maxWidth = '600px';
  errorDetails.textContent = message;
  
  // Add elements to overlay
  errorOverlay.appendChild(errorMessage);
  errorOverlay.appendChild(errorDetails);
  
  // Add overlay to body
  document.body.appendChild(errorOverlay);
  
  console.error(message);
}

// Add debug overlay
function addDebugOverlay() {
  // Create debug container
  const debugContainer = document.createElement('div');
  debugContainer.id = 'debug-overlay';
  debugContainer.style.position = 'fixed';
  debugContainer.style.top = '10px';
  debugContainer.style.left = '10px';
  debugContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  debugContainer.style.color = '#00ff00';
  debugContainer.style.padding = '10px';
  debugContainer.style.borderRadius = '5px';
  debugContainer.style.fontFamily = 'monospace';
  debugContainer.style.fontSize = '12px';
  debugContainer.style.zIndex = '1000';
  debugContainer.style.maxHeight = '300px';
  debugContainer.style.overflowY = 'auto';
  debugContainer.style.width = '300px';
  
  // Add debug header
  const debugHeader = document.createElement('div');
  debugHeader.textContent = 'DEBUG INFO';
  debugHeader.style.fontWeight = 'bold';
  debugHeader.style.marginBottom = '5px';
  debugHeader.style.borderBottom = '1px solid #00ff00';
  debugContainer.appendChild(debugHeader);
  
  // Add debug content
  const debugContent = document.createElement('div');
  debugContent.id = 'debug-content';
  debugContainer.appendChild(debugContent);
  
  // Add reset button
  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset Game';
  resetButton.style.marginTop = '10px';
  resetButton.style.padding = '5px';
  resetButton.style.backgroundColor = '#ff3333';
  resetButton.style.color = 'white';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '3px';
  resetButton.style.cursor = 'pointer';
  resetButton.addEventListener('click', () => {
    window.location.reload();
  });
  debugContainer.appendChild(resetButton);
  
  // Add to body after game is loaded
  setTimeout(() => {
    document.body.appendChild(debugContainer);
    
    // Start debug logging
    startDebugLogging();
  }, 1000);
}

// Start debug logging
function startDebugLogging() {
  const debugContent = document.getElementById('debug-content');
  if (!debugContent) return;
  
  // Override console.log
  const originalLog = console.log;
  console.log = function() {
    // Call original console.log
    originalLog.apply(console, arguments);
    
    // Add to debug overlay
    const message = Array.from(arguments).join(' ');
    const logEntry = document.createElement('div');
    logEntry.textContent = `> ${message}`;
    logEntry.style.marginBottom = '3px';
    debugContent.appendChild(logEntry);
    
    // Scroll to bottom
    debugContent.scrollTop = debugContent.scrollHeight;
  };
  
  // Override console.error
  const originalError = console.error;
  console.error = function() {
    // Call original console.error
    originalError.apply(console, arguments);
    
    // Add to debug overlay
    const message = Array.from(arguments).join(' ');
    const logEntry = document.createElement('div');
    logEntry.textContent = `ERROR: ${message}`;
    logEntry.style.color = '#ff3333';
    logEntry.style.marginBottom = '3px';
    debugContent.appendChild(logEntry);
    
    // Scroll to bottom
    debugContent.scrollTop = debugContent.scrollHeight;
  };
  
  // Log initial debug info
  console.log('Debug logging started');
  console.log(`Browser: ${navigator.userAgent}`);
  console.log(`Screen: ${window.innerWidth}x${window.innerHeight}`);
  
  // Check game state
  setTimeout(checkGameState, 2000);
} 