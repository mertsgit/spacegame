// Standalone WebSocket server for multiplayer spaceship game
// This server can be deployed to platforms like Heroku, AWS, etc.

const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001; // Use a different port from the main app

// Serve a simple health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('WebSocket server is running');
});

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients and their player data
const clients = new Map(); // WebSocket -> { id, lastUpdate }
const players = {}; // playerId -> { position, rotation, username, color }

// Generate unique player IDs
function generateId() {
  return 'player_' + Math.random().toString(36).substring(2, 8);
}

// Broadcast player positions to all clients
function broadcastPlayerPositions() {
  const message = {
    type: 'positions',
    players: players,
    timestamp: Date.now(),
  };
  const data = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Clean up inactive players (no updates for 60 seconds)
function cleanupInactivePlayers() {
  const now = Date.now();
  const inactiveThreshold = 60000; // 60 seconds
  
  clients.forEach((data, client) => {
    if (data.lastUpdate && now - data.lastUpdate > inactiveThreshold) {
      console.log(`Player ${data.id} inactive for too long, disconnecting`);
      
      // Remove player from game
      if (data.id && players[data.id]) {
        // Notify all clients about player leaving
        const message = {
          type: 'playerLeft',
          playerId: data.id
        };
        
        wss.clients.forEach((c) => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(JSON.stringify(message));
          }
        });
        
        // Remove player from players object
        delete players[data.id];
      }
      
      // Remove from clients map
      clients.delete(client);
      
      // Close WebSocket connection
      if (client.readyState !== undefined) {
        client.close();
      }
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New client connected');

  // Assign a player ID on connection
  clients.set(ws, { id: null, lastUpdate: Date.now() });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const clientData = clients.get(ws);

      switch (data.type) {
        case 'login':
          const playerId = generateId();
          const username = data.username || 'Player';
          const color = data.color || '#00FFFF'; // Use player's chosen color with fallback
          
          clients.set(ws, { id: playerId, lastUpdate: Date.now() });
          
          players[playerId] = {
            id: playerId,
            username,
            position: data.position || { x: 0, y: 50, z: 0 },
            rotation: data.rotation || { x: 0, y: 0, z: 0 },
            color: color, // Use player's chosen color
          };
          console.log(`Player ${username} (${playerId}) logged in with color ${color}`);

          // Send login response with full player list
          ws.send(JSON.stringify({
            type: 'loginResponse',
            success: true,
            playerId,
            players: players // Include all players immediately
          }));

          // Notify all clients of new player
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'newPlayer',
                player: players[playerId],
              }));
            }
          });
          break;

        case 'updatePosition':
          if (clientData && clientData.id && players[clientData.id]) {
            players[clientData.id].position = data.position;
            players[clientData.id].rotation = data.rotation;
            players[clientData.id].trailActive = data.trailActive || false;
            clientData.lastUpdate = Date.now();
          }
          break;

        case 'playerCrashed':
          if (clientData && clientData.id && players[clientData.id]) {
            console.log(`Player ${players[clientData.id].username} (${clientData.id}) crashed`);
            
            // Notify all clients about player crash
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'playerCrashed',
                  playerId: clientData.id
                }));
              }
            });
            
            // Remove player from players object
            delete players[clientData.id];
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now(),
          }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    const clientData = clients.get(ws);
    if (clientData && clientData.id) {
      console.log(`Player ${clientData.id} disconnected`);
      delete players[clientData.id];

      // Notify all clients of player leaving
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'playerLeft',
            playerId: clientData.id,
          }));
        }
      });
    }
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Broadcast positions every 100ms (10 times per second)
setInterval(broadcastPlayerPositions, 100);

// Clean up inactive players every 30 seconds
setInterval(cleanupInactivePlayers, 30000);

// Start the server
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
}); 