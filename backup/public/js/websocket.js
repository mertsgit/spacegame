// WebSocket Manager
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second delay
    this.connectionEstablished = false;
    
    // Delay connection slightly to ensure all managers are initialized
    setTimeout(() => {
      this.connect();
    }, 500);
  }
  
  connect() {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log(`Connecting to WebSocket server at ${wsUrl}`);
    
    try {
      this.socket = new WebSocket(wsUrl);
      
      // Setup event handlers
      this.socket.onopen = this.onOpen.bind(this);
      this.socket.onmessage = this.onMessage.bind(this);
      this.socket.onclose = this.onClose.bind(this);
      this.socket.onerror = this.onError.bind(this);
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.attemptReconnect();
    }
  }
  
  onOpen() {
    console.log('WebSocket connection established');
    this.connectionEstablished = true;
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    
    // If we're already logged in, re-send login info
    if (window.loginManager && window.loginManager.username) {
      console.log('Re-sending login information after reconnect');
      this.sendMessage({
        type: 'login',
        username: window.loginManager.username
      });
    }
  }
  
  onMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (window.DEBUG) {
        console.log('WebSocket message received:', data.type);
      }
      
      // Handle different message types
      switch (data.type) {
        case 'login':
          if (data.success && window.loginManager) {
            console.log('Login successful, player ID:', data.playerId);
            window.loginManager.loginSuccess(data.playerId);
            
            // Force initialization of game if not already done
            if (window.gameManager && !window.gameManager.initialized) {
              console.log('Forcing game initialization');
              window.gameManager.init();
            }
          } else {
            console.error('Login failed:', data);
          }
          break;
          
        case 'positions':
          if (window.gameManager) {
            // Ensure scene is initialized before updating players
            if (!window.gameManager.scene && window.gameManager.initScene) {
              console.log('Scene not initialized. Initializing scene before updating players.');
              window.gameManager.initScene();
            }
            window.gameManager.updatePlayers(data.players);
          }
          break;
          
        case 'newPlayer':
          if (window.gameManager) {
            console.log('New player joined:', data.player.username);
            // Ensure scene is initialized before adding player
            if (!window.gameManager.scene && window.gameManager.initScene) {
              console.log('Scene not initialized. Initializing scene before adding player.');
              window.gameManager.initScene();
            }
            window.gameManager.addPlayer(data.player);
          }
          break;
          
        case 'playerDisconnected':
          if (window.gameManager) {
            console.log('Player disconnected:', data.playerId);
            window.gameManager.removePlayer(data.playerId);
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  onClose(event) {
    this.connectionEstablished = false;
    
    if (!event.wasClean && !this.isReconnecting) {
      console.warn('WebSocket connection closed unexpectedly');
      this.attemptReconnect();
    } else if (event.wasClean) {
      console.log('WebSocket connection closed cleanly');
    }
  }
  
  onError(error) {
    console.error('WebSocket error:', error);
    
    // Try to reconnect on error
    if (!this.isReconnecting) {
      this.attemptReconnect();
    }
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Please refresh the page.');
      
      // Show reconnect button
      this.showReconnectButton();
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    // Exponential backoff for reconnect
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  showReconnectButton() {
    // Create reconnect button
    const reconnectButton = document.createElement('button');
    reconnectButton.textContent = 'Reconnect to Server';
    reconnectButton.style.position = 'fixed';
    reconnectButton.style.top = '50%';
    reconnectButton.style.left = '50%';
    reconnectButton.style.transform = 'translate(-50%, -50%)';
    reconnectButton.style.padding = '15px 30px';
    reconnectButton.style.backgroundColor = '#0af';
    reconnectButton.style.color = 'white';
    reconnectButton.style.border = 'none';
    reconnectButton.style.borderRadius = '5px';
    reconnectButton.style.fontSize = '18px';
    reconnectButton.style.cursor = 'pointer';
    reconnectButton.style.zIndex = '9999';
    
    // Add click event
    reconnectButton.addEventListener('click', () => {
      // Reset reconnect attempts
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      
      // Remove button
      document.body.removeChild(reconnectButton);
      
      // Try to connect again
      this.connect();
    });
    
    // Add to body
    document.body.appendChild(reconnectButton);
  }
  
  sendMessage(data) {
    if (this.isConnected()) {
      if (window.DEBUG) {
        console.log('Sending WebSocket message:', data.type);
      }
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
      
      // Store message to send when reconnected
      this.pendingMessage = data;
      
      // Try to reconnect
      if (!this.isReconnecting) {
        this.attemptReconnect();
      }
    }
  }
  
  // Add a dedicated method for sending login requests
  sendLoginRequest(username) {
    console.log('Sending login request for username:', username);
    this.sendMessage({
      type: 'login',
      username: username
    });
  }
  
  isConnected() {
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
}

// Create WebSocket manager instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.webSocketManager = new WebSocketManager();
}); 