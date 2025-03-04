# 3D Multiplayer Spaceship Game

A browser-based 3D multiplayer game where players control spaceships in a space environment with planets and a sun.

## Features

- 3D graphics using Three.js
- Multiplayer functionality with WebSockets
- Real-time position updates (10 times per second)
- Username-based login system
- Third-person spaceship controls
- Realistic space flight mechanics with physics and inertia
- Gravitational effects from celestial bodies
- Collision detection and response
- Beautiful space environment with planets and a sun

## Requirements

- Node.js (v14 or higher)
- Modern web browser with WebGL and WebSocket support

## Installation

1. Clone this repository:
```
git clone <repository-url>
cd space-multiplayer
```

2. Install dependencies:
```
npm install
```

## Running the Game

1. Start the server:
```
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## How to Play

1. Enter your username (at least 3 characters) and click "Join Game"
2. Control your spaceship using:
   - W/S: Thrust forward/backward
   - A/D: Strafe left/right
   - Arrow Up/Down: Pitch up/down
   - Arrow Left/Right: Yaw left/right
   - Q/E: Roll left/right
   - Space: Move up
   - Shift: Move down
   - R: Boost (increased speed)
   - F: Brake

## Flight Mechanics

The game features a realistic space flight model with the following characteristics:

- **Inertia**: Your ship will continue moving in a direction until you apply thrust in the opposite direction
- **Six Degrees of Freedom**: Full control over pitch, yaw, roll, and translation in all directions
- **Momentum**: Acceleration and deceleration are gradual, requiring planning for maneuvers
- **Boost and Brake**: Special controls for rapid acceleration or deceleration
- **Visual Feedback**: Engine glow changes based on thrust level and boost status
- **HUD Display**: Shows current speed, throttle level, and gravitational forces

## Physics System

The game includes a comprehensive physics system:

- **Gravitational Forces**: Planets and the sun exert gravitational pull on your ship
- **Gravity Indicator**: Visual display showing the direction and strength of gravitational forces
- **Collision Detection**: Realistic collision response when hitting planets
- **Maneuvering Thrusters**: Visual effects show which thrusters are active during different maneuvers
- **Realistic Spaceship Model**: Includes cockpit, navigation lights, and engine effects

## Technologies Used

- **Frontend**:
  - Three.js for 3D rendering
  - HTML5/CSS3 for UI
  - JavaScript for game logic

- **Backend**:
  - Node.js
  - Express for serving static files
  - ws (WebSocket library) for real-time communication

## Project Structure

```
├── public/             # Client-side files
│   ├── js/             # JavaScript files
│   │   ├── login.js            # Login handling
│   │   ├── websocket.js        # WebSocket communication
│   │   ├── game.js             # Main game logic
│   │   ├── spaceship.js        # Spaceship models
│   │   ├── celestialBodies.js  # Planets and sun
│   │   └── main.js             # Entry point
│   ├── index.html      # Main HTML file
│   └── styles.css      # CSS styles
├── server/             # Server-side files
│   └── server.js       # WebSocket server
├── package.json        # Project dependencies
└── README.md           # This file
```

## License

MIT 

### HTTPS Support for Production

The game automatically uses secure WebSockets (WSS) when loaded over HTTPS. To enable HTTPS on your server:

1. Create an `ssl` directory in the project root:
   ```
   mkdir -p ssl
   ```

2. Add your SSL certificates to the `ssl` directory:
   - `ssl/private.key`: Your private key file
   - `ssl/certificate.crt`: Your SSL certificate file

3. The server will automatically detect these certificates and use HTTPS if they exist.

#### Obtaining SSL Certificates

For production use, you can obtain SSL certificates from:

- Let's Encrypt (free): https://letsencrypt.org/
- Your hosting provider
- A certificate authority like DigiCert or Comodo

For local development, you can generate self-signed certificates:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl/private.key -out ssl/certificate.crt
```

Note: Self-signed certificates will show security warnings in browsers.

## Controls

- **W**: Forward thrust
- **S**: Backward thrust
- **A**: Strafe left
- **D**: Strafe right
- **Arrow Keys**: Rotate ship
- **Shift**: Boost speed

## Troubleshooting

### Mixed Content Errors

If you see "Mixed Content" errors in the console when deployed to production, ensure:

1. Your site is properly configured for HTTPS
2. You have valid SSL certificates in the `ssl` directory
3. The WebSocket connection is using WSS instead of WS

The client automatically uses WSS when loaded over HTTPS, but the server must be configured to support it. 