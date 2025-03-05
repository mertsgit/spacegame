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
      // For production, connect to our Heroku WebSocket server
      this.serverUrl = 'wss://space-game-ws-server-bbc33b3e43a1.herokuapp.com';
      this.isHttpFallback = false;
      log('Using production WebSocket server on Heroku');
    } else {
      // For local development, use local WebSocket server
      this.serverUrl = `${protocol}//${hostname}:3001`;
      this.isHttpFallback = false;
      log(`Using local WebSocket server at ${this.serverUrl}`);
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
    
    log(`WebSocket Manager initialized with URL: ${this.serverUrl}`);
  }
  
  // Connect to the WebSocket server
  connect() {
    if (this.socket && this.socket.readyState <= 1) {
      log('WebSocket already connected or connecting');
      return;
    }
    
    log(`Connecting to WebSocket server at ${this.serverUrl}`);
    try {
      this.socket = new WebSocket(this.serverUrl);
      
      this.socket.onopen = this.onOpen.bind(this);
      this.socket.onmessage = this.onMessage.bind(this);
      this.socket.onclose = this.onClose.bind(this);
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connected = false;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket server:', error);
      this.connected = false;
      this.attemptReconnect();
    }
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
  sendLoginRequest(username, color) {
    log(`Sending login request for user: ${username} with color: ${color}`);
    return this.sendMessage({
      type: 'login',
      username: username,
      color: color || '#00FFFF', // Include color with fallback
      position: { x: 0, y: 50, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    });
  }
  
  // Send position update to server
  sendPositionUpdate(position, rotation, trailActive = false) {
    return this.sendMessage({
      type: 'updatePosition',
      position,
      rotation,
      trailActive
    });
  }
  
  // Send position update with individual components - deprecated, use object version
  // This is kept for backward compatibility
  sendPositionUpdateLegacy(x, y, z, rotX, rotY, rotZ) {
    return this.sendPositionUpdate(
      { x, y, z },
      { x: rotX, y: rotY, z: rotZ },
      false
    );
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