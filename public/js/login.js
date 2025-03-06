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
        this.loginSuccess(data.playerId, username, data.players);
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
  loginSuccess(playerId, username, playerList) {
    log(`Login successful, player ID: ${playerId}`);
    
    // Store player ID and username
    this.playerId = playerId;
    this.username = username;
    this.playerColor = this.colorInput ? this.colorInput.value : '#00FFFF';
    
    // Hide login screen
    if (this.loginScreen) {
      this.loginScreen.style.display = 'none';
    }
    
    // Initialize game
    this.initializeGame();
    
    // Process player list if provided
    if (playerList && Array.isArray(playerList) && window.gameManager) {
      log(`Processing player list with ${playerList.length} players`);
      playerList.forEach(player => {
        if (player.id !== playerId) { // Don't add local player twice
          window.gameManager.addPlayer(player);
        }
      });
    }
    
    // Force multiple renders after login, especially important for mobile
    const isMobile = window.gameManager && window.gameManager.isMobile;
    
    // First render
    setTimeout(() => {
      if (window.gameManager && window.gameManager.renderer && window.gameManager.scene && window.gameManager.camera) {
        log('Forcing first render after login');
        window.gameManager.renderer.render(window.gameManager.scene, window.gameManager.camera);
        
        // On mobile, ensure controls are visible
        if (isMobile) {
          const mobileControls = document.getElementById('mobile-controls');
          if (mobileControls) {
            mobileControls.style.display = 'block';
            log('Mobile controls display set to block');
          }
          
          // Force canvas to be visible and sized correctly
          const canvas = document.getElementById('game-canvas');
          if (canvas) {
            canvas.style.display = 'block';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            log('Canvas display and size enforced');
          }
        }
      } else {
        console.error('Cannot force render after login: missing game components');
      }
    }, 100);
    
    // Second render for mobile (after a longer delay)
    if (isMobile) {
      setTimeout(() => {
        if (window.gameManager && window.gameManager.renderer) {
          log('Forcing second render for mobile');
          window.gameManager.renderer.render(window.gameManager.scene, window.gameManager.camera);
          
          // Setup touch controls again to be sure
          if (window.gameManager.setupTouchControls) {
            window.gameManager.setupTouchControls();
            log('Touch controls setup reinforced');
          }
        }
      }, 500);
    }
  }
  
  // Show login error
  showLoginError(message) {
    this.loginStatus.textContent = message;
    this.loginStatus.style.color = '#ff3333';
    
    // Reset button
    this.loginButton.textContent = 'Play';
    this.loginButton.disabled = false;
  }
  
  // Initialize the game after successful login
  initializeGame() {
    log('Initializing game after login');
    
    if (!window.gameManager) {
      console.error('Game manager not found, creating a new one');
      window.gameManager = new GameManager();
    }
    
    // Set player ID in game manager
    if (window.gameManager) {
      log(`Setting local player ID in game manager: ${this.playerId}`);
      
      // Initialize game with player ID
      window.gameManager.init(this.playerId);
      
      // Check if initialization was successful
      if (!window.gameManager.initialized) {
        console.error('Game initialization failed');
        
        // Try again with a delay and multiple attempts
        let attempts = 0;
        const maxAttempts = 3;
        const tryInitialize = () => {
          attempts++;
          log(`Retrying game initialization (attempt ${attempts}/${maxAttempts})`);
          window.gameManager.init(this.playerId);
          
          if (!window.gameManager.initialized && attempts < maxAttempts) {
            setTimeout(tryInitialize, 500);
          } else if (window.gameManager.initialized) {
            log('Game initialized successfully on retry');
            this.ensureGameRendering();
          } else {
            console.error(`Failed to initialize game after ${maxAttempts} attempts`);
          }
        };
        
        setTimeout(tryInitialize, 500);
      } else {
        log('Game initialized successfully');
        this.ensureGameRendering();
      }
    } else {
      console.error('Game manager not available after login');
    }
  }
  
  // Ensure the game renders properly after initialization
  ensureGameRendering() {
    // Force multiple renders to ensure the scene appears
    const forceRender = (count = 0) => {
      if (window.gameManager && window.gameManager.renderer && window.gameManager.scene && window.gameManager.camera) {
        log(`Forcing render after login (${count + 1}/3)`);
        window.gameManager.renderer.render(window.gameManager.scene, window.gameManager.camera);
        
        // On mobile, make sure touch controls are properly set up
        if (window.gameManager.isMobile) {
          log('Setting up mobile touch controls');
          window.gameManager.setupTouchControls();
          
          // Make sure mobile controls are visible
          const mobileControls = document.getElementById('mobile-controls');
          if (mobileControls) {
            mobileControls.style.display = 'block';
            log('Mobile controls display set to block');
          }
          
          // Force the canvas to be visible and sized correctly
          const canvas = document.getElementById('game-canvas');
          if (canvas) {
            canvas.style.display = 'block';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            log('Canvas display and size enforced');
          }
        }
        
        // Continue forcing renders a few times
        if (count < 2) {
          setTimeout(() => forceRender(count + 1), 100);
        }
      } else {
        console.error('Cannot force render after login: missing game components');
      }
    };
    
    // Start forcing renders
    setTimeout(() => forceRender(), 100);
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