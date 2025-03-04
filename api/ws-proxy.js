// Serverless WebSocket fallback for Vercel deployment
const { parse } = require('url');

// In-memory state (note: this resets per serverless instance)
const clients = new Map();
const players = {};
const pendingMessages = {};
const clientLastSeen = {};

// UUID generator for player IDs
function generateId() {
  return 'player_' + Math.random().toString(36).substring(2, 8);
}

// Broadcast data to all connected clients
function broadcast(message) {
  for (const clientId of clients.keys()) {
    if (!pendingMessages[clientId]) {
      pendingMessages[clientId] = [];
    }
    pendingMessages[clientId].push(message);
  }
}

// Process incoming messages
function processMessage(data, clientId) {
  try {
    const message = typeof data === 'string' ? JSON.parse(data) : data;
    
    switch (message.type) {
      case 'login':
        const playerId = generateId();
        const username = message.username || 'Player';
        console.log(`Player logged in: ${username} (${playerId})`);
        
        // Store player ID in clients map
        clients.set(clientId, { id: playerId });
        
        // Create player entry
        players[playerId] = {
          id: playerId,
          username: username,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
        };
        
        // Send login success
        if (!pendingMessages[clientId]) {
          pendingMessages[clientId] = [];
        }
        pendingMessages[clientId].push({
          type: 'loginResponse',
          success: true,
          playerId: playerId
        });
        
        // Notify all clients about new player
        broadcast({
          type: 'newPlayer',
          player: players[playerId]
        });
        
        break;
        
      case 'updatePosition':
        const clientData = clients.get(clientId);
        if (clientData && clientData.id && players[clientData.id]) {
          players[clientData.id].position = message.position;
          players[clientData.id].rotation = message.rotation;
        }
        break;
        
      case 'ping':
        // Respond with pong to keep connection alive
        if (!pendingMessages[clientId]) {
          pendingMessages[clientId] = [];
        }
        pendingMessages[clientId].push({
          type: 'pong',
          timestamp: Date.now()
        });
        break;
    }
    
    // Broadcast player positions
    broadcast({
      type: 'positions',
      players: players
    });
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

// Handle client disconnection (called when client hasn't polled for a while)
function handleDisconnect(clientId) {
  const clientData = clients.get(clientId);
  if (clientData && clientData.id) {
    // Notify all clients about player leaving
    broadcast({
      type: 'playerLeft',
      playerId: clientData.id
    });
    
    // Remove player from players object
    delete players[clientData.id];
  }
  
  // Remove from clients map and pending messages
  clients.delete(clientId);
  delete pendingMessages[clientId];
}

// Main serverless function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-ID');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Parse URL to get path and query parameters
    const { pathname, query } = parse(req.url, true);
    
    // Get client ID from query, headers, or body
    let clientId;
    if (req.method === 'GET') {
      clientId = query.clientId;
    } else if (req.method === 'POST') {
      const body = req.body || {};
      clientId = body.clientId || (req.headers && req.headers['x-client-id']);
    }
    
    if (!clientId) {
      return res.status(400).json({ 
        error: 'Missing clientId parameter',
        message: 'Please provide a clientId in the query string, request body, or X-Client-ID header'
      });
    }
    
    // Update last seen timestamp
    clientLastSeen[clientId] = Date.now();
    
    // Handle GET requests (client polling for messages)
    if (req.method === 'GET') {
      // Return any pending messages for this client
      const messages = pendingMessages[clientId] || [];
      pendingMessages[clientId] = [];
      
      return res.status(200).json(messages);
    }
    
    // Handle POST requests (client sending messages)
    if (req.method === 'POST') {
      const body = req.body || {};
      
      if (!body.message) {
        return res.status(400).json({ 
          error: 'Missing message parameter',
          message: 'Please provide a message object in the request body'
        });
      }
      
      // Process the message
      processMessage(body.message, clientId);
      
      return res.status(200).json({ success: true });
    }
    
    // Handle unsupported methods
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET, POST, and OPTIONS methods are supported'
    });
  } catch (error) {
    console.error('Error handling request:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}; 