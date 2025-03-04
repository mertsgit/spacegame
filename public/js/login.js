// Login Manager for handling user authentication
class LoginManager {
  constructor() {
    this.playerId = null;
    this.username = null;
    this.loginScreen = document.getElementById('login-screen');
    this.loginForm = document.getElementById('login-form');
    this.usernameInput = document.getElementById('username-input');
    this.colorInput = document.getElementById('color-input');
    this.loginButton = document.getElementById('login-button');
    this.loginStatus = document.getElementById('login-status');
    
    // Initialize login form
    this.initLoginForm();
    
    log('Login Manager initialized');
  }
  
  // Initialize login form
  initLoginForm() {
    if (!this.loginButton) {
      console.error('Login button not found!');
      return;
    }
    
    this.loginButton.addEventListener('click', () => {
      this.handleLoginClick();
    });
    
    this.usernameInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        this.handleLoginClick();
      }
    });
    
    // Focus username input
    setTimeout(() => {
      this.usernameInput.focus();
    }, 100);
  }
  
  // Handle login button click
  handleLoginClick() {
    const username = this.usernameInput.value.trim();
    const color = this.colorInput ? this.colorInput.value : '#00FFFF';
    
    if (!username) {
      this.showLoginError('Please enter a username');
      return;
    }
    
    // Show loading state
    this.loginButton.textContent = 'Connecting...';
    this.loginButton.disabled = true;
    
    // Attempt login
    this.attemptLogin(username, color);
  }
  
  // Attempt to login with WebSocket
  attemptLogin(username, color) {
    log(`Attempting login for user: ${username} with color: ${color}`);
    
    // Check if WebSocket is available and connected
    if (!window.wsManager) {
      console.error('WebSocket Manager not initialized');
      this.useTestPlayerId(username, color);
      return;
    }
    
    if (!window.wsManager.isConnected()) {
      log('WebSocket not connected. Connecting...');
      
      // Connect to WebSocket
      window.wsManager.connect();
      
      // Wait for connection
      setTimeout(() => {
        if (window.wsManager.isConnected()) {
          this.sendLoginRequest(username, color);
        } else {
          log('WebSocket connection failed. Using test player ID.');
          this.useTestPlayerId(username, color);
        }
      }, 1000);
    } else {
      this.sendLoginRequest(username, color);
    }
  }
  
  // Send login request to server
  sendLoginRequest(username, color) {
    log(`Sending login request for: ${username} with color: ${color}`);
    
    // Register login response callback
    window.wsManager.on('loginResponse', (data) => {
      if (data.success) {
        this.loginSuccess(data.playerId, username);
        
        // Process the full player list if provided
        if (data.players && window.gameManager) {
          log('Received full player list on login, updating players');
          window.gameManager.updatePlayers(data.players);
        }
      } else {
        this.showLoginError('Login failed: ' + (data.message || 'Unknown error'));
      }
    });
    
    // Send login request
    const success = window.wsManager.sendLoginRequest(username, color);
    
    if (!success) {
      log('Failed to send login request. Using test player ID.');
      this.useTestPlayerId(username, color);
    }
  }
  
  // Use a test player ID for offline testing
  useTestPlayerId(username, color) {
    const testPlayerId = 'player_' + Math.random().toString(36).substring(2, 8);
    log(`Generated test player ID: ${testPlayerId}`);
    
    this.loginSuccess(testPlayerId, username);
    
    // Add local player with test ID
    if (window.gameManager) {
      window.gameManager.addPlayer({
        id: testPlayerId,
        username: username,
        position: { x: 0, y: 50, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        color: color
      });
    }
  }
  
  // Handle successful login
  loginSuccess(playerId, username) {
    log(`Login successful, player ID: ${playerId}`);
    
    this.playerId = playerId;
    this.username = username;
    
    // Hide login screen
    if (this.loginScreen) {
      this.loginScreen.style.display = 'none';
    }
    
    // Initialize game
    this.initializeGame();
  }
  
  // Show login error
  showLoginError(message) {
    this.loginStatus.textContent = message;
    this.loginStatus.style.color = '#ff3333';
    
    // Reset button
    this.loginButton.textContent = 'Play';
    this.loginButton.disabled = false;
  }
  
  // Initialize game after login
  initializeGame() {
    if (window.gameManager) {
      if (window.gameManager.initialized) {
        log('Game already initialized, updating player ID');
        window.gameManager.setLocalPlayerId(this.playerId);
      } else {
        log('Initializing game after login');
        window.gameManager.init(this.playerId);
      }
      
      // Force create player ship if using HTTP fallback mode
      if (window.wsManager && window.wsManager.isHttpFallback) {
        log('Using HTTP fallback mode, force creating player ship after login');
        this.forceCreatePlayerShip();
        
        // Schedule additional attempts to ensure the ship is created
        setTimeout(() => this.forceCreatePlayerShip(), 1000);
        setTimeout(() => this.forceCreatePlayerShip(), 3000);
      }
    } else {
      console.error('Game Manager not initialized!');
    }
  }
  
  // Force create the player ship
  forceCreatePlayerShip() {
    if (!window.gameManager || !window.spaceshipManager) {
      log('Cannot create player ship: game manager or spaceship manager not initialized');
      return;
    }
    
    if (!this.playerId) {
      log('Cannot create player ship: no player ID');
      return;
    }
    
    // Check if ship already exists
    if (window.gameManager.playerShips && window.gameManager.playerShips[this.playerId]) {
      log('Player ship already exists, no need to create');
      return;
    }
    
    log('Force creating player ship for player ID: ' + this.playerId);
    
    // Create player data
    const playerData = {
      id: this.playerId,
      username: this.username || 'Player',
      position: { x: 0, y: 50, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    };
    
    // Add player to game
    window.gameManager.addPlayer(playerData);
    
    // Ensure local player ID is set
    window.gameManager.setLocalPlayerId(this.playerId);
  }
  
  // Get player ID
  getPlayerId() {
    return this.playerId;
  }
} 