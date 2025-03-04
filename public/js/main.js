// Main entry point for the game
document.addEventListener('DOMContentLoaded', function() {
  log('Document loaded, initializing game components');
  
  // Initialize components in the correct order with proper delays
  initGameComponents();
});

// Initialize all game components in the correct order
function initGameComponents() {
  log('Browser: ' + navigator.userAgent);
  log('Screen: ' + window.innerWidth + 'x' + window.innerHeight);
  
  // Create SpaceshipManager first
  window.spaceshipManager = new SpaceshipManager();
  
  // Create GameManager
  window.gameManager = new GameManager();
  
  // Initialize WebSocket manager
  window.wsManager = new WebSocketManager();
  
  // Create LoginManager last (after all dependencies)
  window.loginManager = new LoginManager();
  
  // Handle WebSocket callbacks
  setupWebSocketCallbacks();
  
  // Register player left event handler
  window.wsManager.on('playerLeft', (data) => {
    if (window.gameManager) {
      window.gameManager.removePlayer(data.playerId);
    }
  });
  
  // Connect to WebSocket server
  window.wsManager.connect();
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