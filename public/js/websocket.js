// WebSocket Manager for handling server communication
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    
    // Determine the correct WebSocket protocol based on the page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    
    // Handle special case for production domain
    if (hostname === 'spacelog.co' || hostname.endsWith('.spacelog.co')) {
      // For production on Vercel, FORCE HTTP fallback since WebSockets aren't supported
      this.serverUrl = `${window.location.protocol}//${hostname}/ws-proxy`;
      this.isHttpFallback = true;
      log('Using HTTP fallback for production on Vercel');
    } else {
      // For development, use WebSockets with fallback options
      this.connectionOptions = [
        `${protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}/ws`,
        `${protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}`,
        `${window.location.protocol}//${hostname}${window.location.port ? ':' + window.location.port : ''}/ws-proxy`
      ];
      this.currentOptionIndex = 0;
      this.serverUrl = this.connectionOptions[0];
      this.isHttpFallback = false;
      log(`Using ${protocol} WebSocket connection for development with fallbacks`);
    }
    
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.lastMessageTime = 0;
    this.playerShipCreationAttempts = 0;
    
    this.messageCallbacks = {
      'loginResponse': [],
      'positions': [],
      'newPlayer': [],
      'playerLeft': [],
      'pong': []
    };
    
    log(`WebSocket Manager initialized for ${hostname}`);
  }
  
  // Connect to the WebSocket server
  connect() {
    if (this.socket && this.socket.readyState <= 1) {
      log('WebSocket already connected or connecting');
      return;
    }
    
    // If using HTTP fallback, connect using that method
    if (this.isHttpFallback) {
      this.connectHttpFallback();
      return;
    }
    
    // Get the current connection option for WebSocket
    this.serverUrl = this.connectionOptions[this.currentOptionIndex];
    
    log(`Connecting to WebSocket server at ${this.serverUrl}`);
    
    try {
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = this.onOpen.bind(this);
      this.socket.onmessage = this.onMessage.bind(this);
      this.socket.onclose = this.onClose.bind(this);
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connected = false;
        
        // Try next connection option if available
        if (this.currentOptionIndex < this.connectionOptions.length - 1) {
          log(`Connection failed, trying next option (${this.currentOptionIndex + 1}/${this.connectionOptions.length})`);
          this.currentOptionIndex++;
          
          // Close current socket if it exists
          if (this.socket) {
            this.socket.close();
          }
          
          // Try next connection option
          setTimeout(() => {
            this.connect();
          }, 1000);
        } else if (this.currentOptionIndex === this.connectionOptions.length - 1) {
          // Last option is HTTP fallback
          log('All WebSocket options failed, switching to HTTP fallback');
          this.isHttpFallback = true;
          this.connectHttpFallback();
        } else {
          this.onError(error);
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket server:', error);
      this.connected = false;
      
      // Try next connection option if available
      if (this.currentOptionIndex < this.connectionOptions.length - 1) {
        log(`Connection failed, trying next option (${this.currentOptionIndex + 1}/${this.connectionOptions.length})`);
        this.currentOptionIndex++;
        setTimeout(() => {
          this.connect();
        }, 1000);
      } else if (this.currentOptionIndex === this.connectionOptions.length - 1) {
        // Last option is HTTP fallback
        log('All WebSocket options failed, switching to HTTP fallback');
        this.isHttpFallback = true;
        this.connectHttpFallback();
      } else {
        this.attemptReconnect();
      }
    }
  }
  
  // Connect using HTTP fallback (long-polling)
  connectHttpFallback() {
    log('Using HTTP fallback for WebSocket communication');
    this.connected = true;
    this.onOpen();
    
    // Start long-polling
    this.pollForMessages();
    
    // When using HTTP fallback, we need to ensure the player ship is created
    // since the normal WebSocket events might not be triggered properly
    setTimeout(() => {
      this.ensurePlayerShipExists();
    }, 2000); // Wait 2 seconds to ensure login has completed
  }
  
  // Ensure the player ship exists when using HTTP fallback
  ensurePlayerShipExists() {
    if (!this.isHttpFallback) return;
    
    // Limit the number of attempts to avoid infinite loops
    if (this.playerShipCreationAttempts >= 10) {
      log('Maximum player ship creation attempts reached');
      return;
    }
    
    this.playerShipCreationAttempts++;
    log(`Checking if player ship exists in HTTP fallback mode (attempt ${this.playerShipCreationAttempts})`);
    
    if (window.gameManager && window.gameManager.initialized && 
        window.loginManager && window.loginManager.getPlayerId()) {
      
      const playerId = window.loginManager.getPlayerId();
      
      // Set the local player ID in the game manager
      if (window.gameManager.localPlayerId !== playerId) {
        log('Setting local player ID in game manager');
        window.gameManager.setLocalPlayerId(playerId);
      }
      
      // If the player ship doesn't exist, create it
      if (!window.gameManager.playerShips[playerId] && window.spaceshipManager) {
        log('Force creating player ship for HTTP fallback mode');
        
        const playerData = {
          id: playerId,
          username: window.loginManager.username || 'Player',
          position: { x: 0, y: 50, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
        };
        
        window.gameManager.addPlayer(playerData);
        
        // Trigger a check of game state to ensure everything is set up correctly
        if (typeof window.checkGameState === 'function') {
          window.checkGameState();
        }
        
        // If the ship was created successfully, we're done
        if (window.gameManager.playerShips[playerId]) {
          log('Player ship created successfully');
          return;
        }
      } else if (window.gameManager.playerShips[playerId]) {
        log('Player ship already exists');
        return;
      }
    }
    
    // If we get here, either the components aren't ready yet or the ship creation failed
    // Try again in a second, with exponential backoff
    const delay = Math.min(1000 * Math.pow(1.5, this.playerShipCreationAttempts - 1), 10000);
    log(`Will try again in ${delay}ms`);
    setTimeout(() => {
      this.ensurePlayerShipExists();
    }, delay);
  }
  
  // Poll for messages using HTTP
  pollForMessages() {
    if (!this.isHttpFallback || !this.connected) return;
    
    fetch(`${this.serverUrl}?clientId=${this.getClientId()}`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        // Update last message time
        this.lastMessageTime = Date.now();
        
        if (Array.isArray(data)) {
          data.forEach(message => {
            this.onMessage({ data: JSON.stringify(message) });
          });
        }
        // Continue polling with a short delay
        setTimeout(() => this.pollForMessages(), 100);
      })
      .catch(error => {
        console.error('Error polling for messages:', error);
        // Retry after a longer delay
        setTimeout(() => this.pollForMessages(), 2000);
      });
  }
  
  // Get or generate client ID for HTTP fallback
  getClientId() {
    if (!this._clientId) {
      this._clientId = 'client_' + Math.random().toString(36).substring(2, 10);
    }
    return this._clientId;
  }
  
  // Handle connection open
  onOpen() {
    log('Connection established');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.lastMessageTime = Date.now();
    
    // Start heartbeat to keep connection alive
    this.startHeartbeat();
  }
  
  // Start heartbeat mechanism
  startHeartbeat() {
    // Clear any existing heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Send ping every 30 seconds to keep connection alive
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        // Send ping
        this.sendMessage({ type: 'ping' });
        
        // Check if we've received any message in the last 45 seconds
        const now = Date.now();
        if (now - this.lastMessageTime > 45000) {
          log('No messages received for 45 seconds, reconnecting...');
          this.socket.close();
        }
      } else {
        // If not connected, try to reconnect
        this.attemptReconnect();
      }
    }, 30000);
  }
  
  // Stop heartbeat mechanism
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  // Handle incoming messages
  onMessage(event) {
    // Update last message time
    this.lastMessageTime = Date.now();
    
    try {
      const data = JSON.parse(event.data);
      
      if (data.type && this.messageCallbacks[data.type]) {
        // Call all registered callbacks for this message type
        this.messageCallbacks[data.type].forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in ${data.type} callback:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  // Handle connection close
  onClose(event) {
    log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.connected = false;
    this.stopHeartbeat();
    
    // Attempt to reconnect
    this.attemptReconnect();
  }
  
  // Handle connection error
  onError(error) {
    console.error('WebSocket error:', error);
    this.connected = false;
  }
  
  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Please reload the page.');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5); // Exponential backoff up to 5x
    
    log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  // Send a message to the server
  sendMessage(data) {
    if (this.isHttpFallback) {
      // Send message using HTTP POST for fallback mode
      return fetch(`${this.serverUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          clientId: this.getClientId(),
          message: data
        })
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(() => true)
      .catch(error => {
        console.error('Error sending message via HTTP fallback:', error);
        return false;
      });
    }
    
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected. Cannot send message.');
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }
  
  // Send a login request
  sendLoginRequest(username) {
    log(`Sending login request for user: ${username}`);
    return this.sendMessage({
      type: 'login',
      username: username
    });
  }
  
  // Send position update
  sendPositionUpdate(position, rotation) {
    return this.sendMessage({
      type: 'updatePosition',
      position: position,
      rotation: rotation
    });
  }
  
  // Send position update with individual components
  sendPositionUpdate(x, y, z, rotX, rotY, rotZ) {
    return this.sendMessage({
      type: 'updatePosition',
      position: { x, y, z },
      rotation: { x: rotX, y: rotY, z: rotZ }
    });
  }
  
  // Check if WebSocket is connected
  isConnected() {
    return this.connected && this.socket && this.socket.readyState === WebSocket.OPEN;
  }
  
  // Register a callback for a specific message type
  on(messageType, callback) {
    if (!this.messageCallbacks[messageType]) {
      this.messageCallbacks[messageType] = [];
    }
    
    this.messageCallbacks[messageType].push(callback);
  }
  
  // Clean up resources
  cleanup() {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.connected = false;
  }
} 