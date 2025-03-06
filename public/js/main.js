// Main entry point for the game
document.addEventListener('DOMContentLoaded', function() {
  log('Document loaded, initializing game components');
  
  // Check if mobile device with multiple detection methods
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                  ('ontouchstart' in window) ||
                  (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  
  // Add mobile class to body if on mobile device
  if (isMobile) {
    document.body.classList.add('mobile');
    log('Mobile device detected: ' + navigator.userAgent);
    
    // Show mobile controls
    const mobileControls = document.getElementById('mobile-controls');
    if (mobileControls) {
      mobileControls.style.display = 'block';
      log('Mobile controls display set to block');
    }
    
    // Hide controls panel on mobile
    const controlsPanel = document.getElementById('controls');
    if (controlsPanel) {
      controlsPanel.style.display = 'none';
      log('Controls panel hidden on mobile');
    }
    
    // Ensure proper canvas sizing
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.display = 'block';
      log('Canvas size set to 100vw x 100vh');
    }
    
    // Prevent scrolling/zooming on mobile
    document.addEventListener('touchmove', function(e) {
      if (e.target.id !== 'game-canvas') {
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  // Ensure THREE.js is loaded before proceeding
  const waitForThree = setInterval(() => {
    if (typeof THREE !== 'undefined') {
      clearInterval(waitForThree);
      log('THREE.js is available, initializing game components');
      initGameComponents();
    } else {
      log('Waiting for THREE.js to load...');
    }
  }, 100);
});

// Initialize all game components in the correct order
function initGameComponents() {
  log('Browser: ' + navigator.userAgent);
  log('Screen: ' + window.innerWidth + 'x' + window.innerHeight);
  
  // Create SpaceshipManager first
  window.spaceshipManager = new SpaceshipManager();
  
  // Create GameManager
  window.gameManager = new GameManager();
  
  // Create WebSocketManager
  window.wsManager = new WebSocketManager();
  
  // Create LoginManager
  window.loginManager = new LoginManager();
  
  // Setup WebSocket callbacks
  setupWebSocketCallbacks();
  
  // Connect to WebSocket server
  window.wsManager.connect();
  
  // Force render after initialization
  setTimeout(() => {
    if (window.gameManager && window.gameManager.renderer && window.gameManager.scene && window.gameManager.camera) {
      log('Forcing initial render after component initialization');
      window.gameManager.renderer.render(window.gameManager.scene, window.gameManager.camera);
      
      // Additional render for mobile
      if (window.gameManager.isMobile) {
        setTimeout(() => {
          if (window.gameManager.renderer) {
            log('Forcing additional render for mobile');
            window.gameManager.renderer.render(window.gameManager.scene, window.gameManager.camera);
          }
        }, 500);
      }
    }
  }, 500);
}

// Setup WebSocket callbacks
function setupWebSocketCallbacks() {
  if (!window.wsManager) {
    console.error('WebSocket Manager not initialized');
    return;
  }
  
  // When new player joins
  window.wsManager.on('newPlayer', (data) => {
    if (window.gameManager && data.player) {
      window.gameManager.addPlayer(data.player);
    }
  });
  
  // When positions update
  window.wsManager.on('positions', (data) => {
    if (window.gameManager && data.players) {
      window.gameManager.updatePlayers(data.players);
    }
  });
}

// Debug state checking - make it globally available
window.checkGameState = function checkGameState() {
  // Get all relevant state
  const loginState = window.loginManager ? `OK (Player ID: ${window.loginManager.getPlayerId()})` : 'Not initialized';
  const wsState = window.wsManager ? `OK (Connected: ${window.wsManager.isConnected()})` : 'Not initialized';
  const gameState = window.gameManager ? `OK (Initialized: ${window.gameManager.initialized})` : 'Not initialized';
  const playerIdState = window.gameManager ? window.gameManager.localPlayerId : 'null';
  const shipState = window.gameManager && window.gameManager.localPlayerId && window.gameManager.playerShips[window.gameManager.localPlayerId] ? 'OK' : 'Missing';
  
  // Log the state
  log(`Checking game state...`);
  log(`Login Manager: ${loginState}`);
  log(`WebSocket Manager: ${wsState}`);
  log(`Game Manager: ${gameState}`);
  log(`Game Manager Local Player ID: ${playerIdState}`);
  log(`Player Ship: ${shipState}`);
  
  // Handle any issues detected
  if (window.gameManager && window.gameManager.initialized && window.loginManager && window.loginManager.getPlayerId() && 
      (!window.gameManager.localPlayerId || window.gameManager.localPlayerId !== window.loginManager.getPlayerId())) {
    log('Fixing player ID mismatch...');
    window.gameManager.setLocalPlayerId(window.loginManager.getPlayerId());
  }
  
  // Check if local player needs to be created
  if (window.gameManager && window.gameManager.initialized && window.gameManager.localPlayerId && 
      !window.gameManager.playerShips[window.gameManager.localPlayerId] && window.spaceshipManager) {
    log('Force creating player ship');
    
    const testPlayerData = {
      id: window.gameManager.localPlayerId,
      username: 'Player',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: getRandomColor()
    };
    
    window.gameManager.addPlayer(testPlayerData);
  }
  
  return shipState === 'OK';
}; 