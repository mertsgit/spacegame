const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected players
const players = {};

// WebSocket connection handler
wss.on('connection', (ws) => {
  let playerId = null;
  
  console.log('New client connected');
  
  // Handle messages from clients
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    // Handle player login
    if (data.type === 'login') {
      playerId = uuidv4();
      players[playerId] = {
        id: playerId,
        username: data.username,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        color: getRandomColor()
      };
      
      // Send player ID back to client
      ws.send(JSON.stringify({
        type: 'login',
        success: true,
        playerId: playerId,
        players: players
      }));
      
      // Broadcast new player to all connected clients
      broadcastToAll({
        type: 'newPlayer',
        player: players[playerId]
      });
    }
    
    // Handle position updates
    if (data.type === 'position' && playerId) {
      players[playerId].position = data.position;
      players[playerId].rotation = data.rotation;
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
    if (playerId) {
      // Remove player from players object
      delete players[playerId];
      
      // Broadcast player disconnection
      broadcastToAll({
        type: 'playerDisconnected',
        playerId: playerId
      });
    }
  });
  
  // Send error message if something goes wrong
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast positions to all clients every 100ms (10 times per second)
setInterval(() => {
  broadcastToAll({
    type: 'positions',
    players: players
  });
}, 100);

// Helper function to broadcast to all connected clients
function broadcastToAll(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Generate random color for player ships
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 