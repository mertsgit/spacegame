// Login handling
class LoginManager {
  constructor() {
    this.playerId = null;
    
    // Get login elements
    this.loginScreen = document.getElementById('login-screen');
    this.gameScreen = document.getElementById('game-screen');
    this.usernameInput = document.getElementById('username-input');
    this.loginButton = document.getElementById('login-button');
    this.usernameDisplay = document.getElementById('username-display');
    
    // Setup event listener for login button
    if (this.loginButton) {
      this.loginButton.addEventListener('click', this.handleLoginClick.bind(this));
    }
    
    // Setup event listener for Enter key in username input
    if (this.usernameInput) {
      this.usernameInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          this.handleLoginClick();
        }
      });
    }
    
    console.log('Login manager initialized');
  }
  
  handleLoginClick() {
    const username = this.usernameInput.value.trim();
    if (username) {
      this.attemptLogin(username);
    } else {
      alert('Please enter a username');
    }
  }
  
  attemptLogin(username) {
    // Set button to loading state
    this.loginButton.disabled = true;
    this.loginButton.textContent = 'Connecting...';
    
    // Check if the WebSocket is available and connected
    if (window.wsManager && typeof window.wsManager.isConnected === 'function' && window.wsManager.isConnected()) {
      // Log status
      console.log('Sending login request to server for username:', username);
      
      // Try to send login request to server
      try {
        if (typeof window.wsManager.sendLoginRequest === 'function') {
          window.wsManager.sendLoginRequest(username);
        } else if (typeof window.wsManager.sendMessage === 'function') {
          // Fallback to using sendMessage directly if sendLoginRequest is not available
          console.log('Using sendMessage fallback for login');
          window.wsManager.sendMessage({
            type: 'login',
            username: username
          });
        } else {
          throw new Error('No suitable method to send login request');
        }
      } catch (err) {
        console.error('Failed to send login request:', err);
        // Fall back to test player ID
        this.useTestPlayerId(username);
      }
      
      // Set up temporary failsafe in case of no response
      setTimeout(() => {
        if (!this.playerId) {
          console.log('No response from server, using local fallback');
          this.useTestPlayerId(username);
        }
      }, 3000);
    } else {
      console.error('WebSocket connection not available');
      this.useTestPlayerId(username);
    }
  }
  
  // Helper method to use a test player ID
  useTestPlayerId(username) {
    const testPlayerId = 'player_' + Math.random().toString(36).substring(2, 8);
    console.log('Generated test player ID:', testPlayerId);
    this.loginSuccess(testPlayerId, username);
  }
  
  loginSuccess(playerId, username) {
    // Store player ID
    this.playerId = playerId;
    console.log('Login successful, player ID:', playerId);
    
    // Update UI
    this.loginScreen.style.display = 'none';
    this.gameScreen.style.display = 'block';
    if (this.usernameDisplay) {
      this.usernameDisplay.textContent = username;
    }
    
    // Reset login button
    this.loginButton.disabled = false;
    this.loginButton.textContent = 'Join Game';
    
    // Make the player ID globally available
    window.playerID = playerId;
    
    // Initialize the game manager
    console.log('Initializing game after login');
    
    // Check if game manager exists, if not, create it
    if (!window.gameManager) {
      console.error('Game manager not found, creating a new one');
      window.gameManager = new GameManager();
    }
    
    // Ensure the game manager has the correct player ID
    if (window.gameManager) {
      // Initialize the game with the player ID
      window.gameManager.localPlayerId = playerId;
      
      // Initialize the game if not already initialized
      if (!window.gameManager.initialized) {
        window.gameManager.init();
      } else {
        console.log('Game already initialized, updating player ID');
        // If the game is already initialized, just update the player ID
        window.gameManager.localPlayerId = playerId;
      }
    } else {
      console.error('Game manager not available after login');
    }
  }
  
  // Getter for player ID to ensure it's always accessible
  getPlayerId() {
    return this.playerId;
  }
}

// Create login manager instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.loginManager = new LoginManager();
}); 