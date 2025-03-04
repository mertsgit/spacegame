const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Set to true to enable verbose logging, false to disable
const VERBOSE_LOGGING = false;

// Debug logging function - only logs if verbose logging is enabled
function debugLog(...args) {
  if (VERBOSE_LOGGING) {
    console.log(...args);
  }
}

// UUID generator for player IDs
function generateId() {
  return 'player_' + Math.random().toString(36).substring(2, 8);
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Parse JSON bodies for HTTP fallback API
app.use(bodyParser.json());

// Store pending messages for HTTP fallback clients
const pendingMessages = {};

// HTTP fallback endpoint for receiving messages
app.post('/ws-proxy/send', (req, res) => {
  const { clientId, message } = req.body;
  
  if (!clientId || !message) {
    return res.status(400).json({ error: 'Missing clientId or message' });
  }
  
  debugLog(`Received HTTP message from client ${clientId}:`, message);
  
  // Process the message as if it came from a WebSocket
  processMessage(message, {
    type: 'http',
    clientId: clientId,
    send: (data) => {
      // Store message to be retrieved by client's next poll
      if (!pendingMessages[clientId]) {
        pendingMessages[clientId] = [];
      }
      pendingMessages[clientId].push(JSON.parse(data));
    }
  });
  
  res.json({ success: true });
});

// HTTP fallback endpoint for polling messages
app.get('/ws-proxy', (req, res) => {
  const clientId = req.query.clientId;
  
  if (!clientId) {
    return res.status(400).json({ error: 'Missing clientId' });
  }
  
  // Return any pending messages for this client
  const messages = pendingMessages[clientId] || [];
  pendingMessages[clientId] = [];
  
  res.json(messages);
});

// Check for SSL certificates in multiple possible locations
let server;
try {
  // Try to load SSL certificates from various possible locations
  const certLocations = [
    { key: path.join(__dirname, '../ssl/private.key'), cert: path.join(__dirname, '../ssl/certificate.crt') },
    { key: '/etc/ssl/private/private.key', cert: '/etc/ssl/certs/certificate.crt' },
    { key: path.join(process.env.HOME || '', '.ssl/private.key'), cert: path.join(process.env.HOME || '', '.ssl/certificate.crt') }
  ];
  
  // Try each location until we find valid certificates
  let sslOptions = null;
  for (const location of certLocations) {
    try {
      if (fs.existsSync(location.key) && fs.existsSync(location.cert)) {
        sslOptions = {
          key: fs.readFileSync(location.key),
          cert: fs.readFileSync(location.cert)
        };
        console.log(`Found SSL certificates at ${location.key} and ${location.cert}`);
        break;
      }
    } catch (e) {
      // Continue to next location
    }
  }
  
  if (sslOptions) {
    // Create HTTPS server if certificates are available
    server = https.createServer(sslOptions, app);
    console.log('HTTPS server created with SSL certificates');
  } else {
    throw new Error('No SSL certificates found');
  }
} catch (error) {
  // Fall back to HTTP if certificates are not available
  console.log('SSL certificates not found or invalid, using HTTP server');
  server = http.createServer(app);
}

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/ws' // Add explicit path for WebSocket connections
});

// Store all connected clients
const clients = new Map();
const players = {};

// Process incoming messages from both WebSocket and HTTP clients
function processMessage(data, client) {
  try {
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    
    switch(data.type) {
      case 'login':
        const playerId = generateId();
        const username = data.username || 'Player';
        
        // Only log actual player logins, not connection events
        console.log(`Player logged in: ${username} (${playerId})`);
        
        // Store player ID in clients map
        clients.set(client, { id: playerId });
        
        // Create player entry
        players[playerId] = {
          id: playerId,
          username: username,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
        };
        
        // Send login success
        client.send(JSON.stringify({
          type: 'loginResponse',
          success: true,
          playerId: playerId
        }));
        
        // Notify all clients about new player
        broadcast({
          type: 'newPlayer',
          player: players[playerId]
        });
        
        break;
        
      case 'updatePosition':
        const clientData = clients.get(client);
        if (clientData && clientData.id && players[clientData.id]) {
          players[clientData.id].position = data.position;
          players[clientData.id].rotation = data.rotation;
        }
        break;
        
      case 'ping':
        // Respond with pong to keep connection alive
        client.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        break;
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

// Broadcast data to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  
  // Send to WebSocket clients
  [...clients.keys()].forEach(client => {
    if (client.type === 'http') {
      // For HTTP clients, store the message to be retrieved on next poll
      const clientId = client.clientId;
      if (!pendingMessages[clientId]) {
        pendingMessages[clientId] = [];
      }
      pendingMessages[clientId].push(message);
    } else if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Broadcast player positions periodically
function broadcastPlayerPositions() {
  broadcast({
    type: 'positions',
    players: players
  });
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  debugLog('New client connected via WebSocket');
  
  // Add to clients map
  clients.set(ws, { id: null });
  
  // Handle messages from clients
  ws.on('message', (message) => {
    processMessage(message, ws);
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    debugLog('Client disconnected');
    
    // Remove player from game
    const clientData = clients.get(ws);
    if (clientData && clientData.id) {
      // Notify all clients about player leaving
      broadcast({
        type: 'playerLeft',
        playerId: clientData.id
      });
      
      // Remove player from players object
      delete players[clientData.id];
    }
    
    // Remove from clients map
    clients.delete(ws);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Start broadcasting player positions every 100ms
setInterval(broadcastPlayerPositions, 100);

// Start server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 