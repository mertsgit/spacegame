// Game Manager for handling 3D rendering and game logic
class GameManager {
  constructor() {
    this.initialized = false;
    this.localPlayerId = null;
    
    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // Game objects
    this.playerShips = {};   // Map of player ID to ship object
    this.players = {};       // Map of player ID to player data
    
    // Physics properties
    this.physics = {
      maxSpeed: 4.0,          // Maximum speed (equivalent to 40km/h)
      acceleration: 0.2,      // Main thruster acceleration (increased from 0.08)
      strafeAcceleration: 0.1, // Strafing acceleration (increased from 0.04)
      drag: 0.995,            // Space drag (slight slowdown over time)
      rotationSpeed: 0.03,    // Rotation speed
      gravityStrength: 0.015, // Gravity force strength (reduced from 0.025)
      planetMass: 500,        // Mass of the planet (affects gravity)
      sunMass: 1000,          // Mass of the sun (affects gravity)
      timeStep: 1,            // Physics time step
      speedToKm: 10,          // Conversion factor (1 unit = 10 km/h for display)
      boostMultiplier: 5.0    // Boost multiplier (5x = 200km/h when boosting)
    };
    
    // Ship physics state (will be per-player)
    this.shipPhysics = {};
    
    // Input handling - separate thrust controls from rotation
    this.keyState = {
      // Thrusters
      thrustForward: false,   // W key
      thrustBackward: false,  // S key
      strafeLeft: false,      // A key
      strafeRight: false,     // D key
      
      // Rotation
      pitchUp: false,         // Up arrow
      pitchDown: false,       // Down arrow
      yawLeft: false,         // Left arrow
      yawRight: false,        // Right arrow
      
      // Other controls
      boost: false,           // Shift key
      reset: false            // R key
    };
    
    // Player count display
    this.playerCountElement = document.getElementById('player-count');
    
    // Game state
    this.isInitialized = false;
    this.isRunning = false;
    this.lastFrameTime = 0;
    this.speedometer = null;
    this.spaceport = null;
    this.celestialObjects = null;
    this.speedLines = null; // Speed lines for visual movement feedback
    
    log('Game Manager initialized');
  }
  
  // Initialize game with local player ID
  init(localPlayerId) {
    if (this.initialized) {
      log('Game already initialized');
      return;
    }
    
    log(`Initializing game for player: ${localPlayerId}`);
    
    try {
      this.localPlayerId = localPlayerId;
      
      // Initialize scene
      this.initScene();
      
      // Initialize event listeners
      this.initEventListeners();
      
      // Initialize camera tracking
      this.lastCameraPosition = null;
      
      // Ensure the local player's ship exists before starting animation
      if (this.localPlayerId && !this.playerShips[this.localPlayerId] && window.spaceshipManager) {
        log('Creating local player ship during initialization');
        
        const localPlayerData = {
          id: this.localPlayerId,
          username: window.loginManager && window.loginManager.username ? window.loginManager.username : 'Player',
          position: { x: 0, y: 50, z: 0 }, // Start above origin
          rotation: { x: 0, y: 0, z: 0 },
          color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
        };
        
        this.addPlayer(localPlayerData);
      }
      
      // Start animation loop
      this.animate();
      
      this.initialized = true;
      log('Game initialized successfully');
    } catch (error) {
      console.error('Error initializing game:', error);
    }
  }
  
  // Initialize Three.js scene
  initScene() {
    try {
      log('Initializing 3D scene');
      
      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000011);
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        75,                                     // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1,                                    // Near clipping plane
        2000                                    // Far clipping plane
      );
      this.camera.position.set(0, 5, 10);
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      document.body.appendChild(this.renderer.domElement);
      
      // Create controls
      if (areOrbitControlsLoaded()) {
        log('Initializing OrbitControls');
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 1.5;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        
        // Initially disable user control since we'll position the camera programmatically
        this.controls.enabled = false;
      } else {
        console.error('OrbitControls not loaded!');
        createMinimalOrbitControls();
        
        // Try again with our minimal implementation
        if (typeof THREE.OrbitControls === 'function') {
          log('Using minimal OrbitControls implementation');
          this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
          this.controls.enabled = false;
        }
      }
      
      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x404040);
      this.scene.add(ambientLight);
      
      // Add directional light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1);
      this.scene.add(directionalLight);
      
      // Initialize celestial objects tracking
      this.celestialObjects = {
        planets: [],
        asteroids: [],
        meteors: [],
        nebulae: []
      };
      
      // Add spaceport
      if (window.spaceshipManager) {
        // Create and add spaceport
        const spaceport = window.spaceshipManager.createSpaceport();
        if (spaceport) {
          this.scene.add(spaceport);
          this.spaceport = spaceport;
          log('Spaceport added to scene');
        }
        
        // Add stars (enhanced starfield with more stars)
        const stars = window.spaceshipManager.createStars(5000);
        if (stars) {
          this.scene.add(stars);
          log('Enhanced starfield added with 5000 stars');
        }

        // Add multiple planets in different positions
        const planetPositions = [
          { pos: new THREE.Vector3(200, 0, -200), radius: 50, color: 0x6699cc }, // Blue gas giant
          { pos: new THREE.Vector3(-300, 100, -400), radius: 30, color: 0xaa8866 }, // Rocky planet
          { pos: new THREE.Vector3(400, -150, -250), radius: 25, color: 0x996644 }, // Desert planet
          { pos: new THREE.Vector3(-250, -200, -600), radius: 40, color: 0x66aaff }, // Ice planet
          { pos: new THREE.Vector3(300, 200, -800), radius: 60, color: 0xaabb44 },  // Exotic planet
          { pos: new THREE.Vector3(-500, -50, -300), radius: 35, color: 0xcc6644 }, // Red planet
          { pos: new THREE.Vector3(600, 100, -700), radius: 45, color: 0x44aacc }   // Water planet
        ];
        
        planetPositions.forEach(planetData => {
          const planet = window.spaceshipManager.createPlanet(planetData.radius, planetData.color);
          if (planet) {
            planet.position.copy(planetData.pos);
            
            // Add random rotation for animation and store radius for collision detection
            planet.userData = {
              rotationSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.001,
                (Math.random() - 0.5) * 0.001,
                (Math.random() - 0.5) * 0.001
              ),
              radius: planetData.radius, // Store radius for collision detection
              isPlanet: true             // Flag to identify as a planet
            };
            
            this.scene.add(planet);
            this.celestialObjects.planets.push(planet);
            log(`Planet added at position ${planetData.pos.x}, ${planetData.pos.y}, ${planetData.pos.z}`);
          }
        });
        
        // Add asteroid fields in different regions
        const asteroidFieldPositions = [
          { pos: new THREE.Vector3(0, 0, -1000), count: 150, spread: 400 },
          { pos: new THREE.Vector3(-800, 200, -500), count: 100, spread: 300 },
          { pos: new THREE.Vector3(600, -150, -800), count: 120, spread: 350 }
        ];
        
        asteroidFieldPositions.forEach(fieldData => {
          const asteroidField = window.spaceshipManager.createAsteroidField(fieldData.count, fieldData.spread);
          if (asteroidField) {
            asteroidField.position.copy(fieldData.pos);
            this.scene.add(asteroidField);
            
            // Add each asteroid to the celestial objects for animation
            asteroidField.children.forEach(asteroid => {
              asteroid.userData = {
                rotationSpeed: new THREE.Vector3(
                  (Math.random() - 0.5) * 0.005,
                  (Math.random() - 0.5) * 0.005,
                  (Math.random() - 0.5) * 0.005
                )
              };
              this.celestialObjects.asteroids.push(asteroid);
            });
            
            log(`Asteroid field added at position ${fieldData.pos.x}, ${fieldData.pos.y}, ${fieldData.pos.z}`);
          }
        });
        
        // Add meteors for dynamic movement reference
        for (let i = 0; i < 10; i++) {
          const meteor = window.spaceshipManager.createMeteor();
          if (meteor) {
            // Random starting position far from the center
            const distance = 800 + Math.random() * 400;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            meteor.position.set(
              distance * Math.sin(phi) * Math.cos(theta),
              distance * Math.sin(phi) * Math.sin(theta) * 0.5,
              distance * Math.cos(phi)
            );
            
            // Random direction toward center (for crossing paths)
            const direction = new THREE.Vector3()
              .subVectors(new THREE.Vector3(0, 0, 0), meteor.position)
              .normalize()
              .multiplyScalar(0.8 + Math.random() * 0.4); // Randomize speed
            
            meteor.userData = {
              direction: direction,
              speed: 0.5 + Math.random() * 1.5
            };
            
            this.scene.add(meteor);
            this.celestialObjects.meteors.push(meteor);
            log(`Meteor added with speed ${meteor.userData.speed}`);
          }
        }
        
        // Add colorful nebulae for visual interest and distance reference
        const nebulaPositions = [
          { pos: new THREE.Vector3(-400, 100, -1200), size: 300, particles: 400 },
          { pos: new THREE.Vector3(800, -200, -900), size: 250, particles: 350 },
          { pos: new THREE.Vector3(200, 300, -1500), size: 400, particles: 500 }
        ];
        
        nebulaPositions.forEach(nebulaData => {
          const nebula = window.spaceshipManager.createNebula(nebulaData.size, nebulaData.particles);
          if (nebula) {
            nebula.position.copy(nebulaData.pos);
            this.scene.add(nebula);
            this.celestialObjects.nebulae.push(nebula);
            log(`Nebula added at position ${nebulaData.pos.x}, ${nebulaData.pos.y}, ${nebulaData.pos.z}`);
          }
        });
      }
      
      // Create speed lines for movement feedback
      this.createSpeedLines();
      
      // Handle window resize
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
      
      log('Scene initialization complete');
    } catch (error) {
      console.error('Error initializing scene:', error);
    }
  }
  
  // Initialize event listeners for keyboard controls
  initEventListeners() {
    document.addEventListener('keydown', (event) => {
      this.updateKeyState(event.code, true);
      this.updateControlDisplay(); // Update the control display when keys change
      
      // Special key handling for testing
      if (event.code === 'KeyQ') {
        log('Q key pressed - forcing movement');
        this.forceMoveForward();
      }
    });
    
    document.addEventListener('keyup', (event) => {
      this.updateKeyState(event.code, false);
      this.updateControlDisplay(); // Update the control display when keys change
    });
    
    // Create control information display in top left corner
    this.createControlDisplay();
    
    // Add debugging status display
    const debugDiv = document.createElement('div');
    debugDiv.style.position = 'fixed';
    debugDiv.style.bottom = '10px';
    debugDiv.style.left = '10px';
    debugDiv.style.zIndex = '1000';
    
    const debugStatus = document.createElement('div');
    debugStatus.id = 'debug-status';
    debugStatus.style.color = 'white';
    debugStatus.style.padding = '10px';
    debugStatus.style.backgroundColor = 'rgba(0,0,0,0.5)';
    debugStatus.style.margin = '10px 0';
    
    debugDiv.appendChild(debugStatus);
    document.body.appendChild(debugDiv);
    
    // Update debug status periodically
    setInterval(() => {
      if (this.localPlayerId && this.playerShips[this.localPlayerId] && this.shipPhysics[this.localPlayerId]) {
        const physics = this.shipPhysics[this.localPlayerId];
        const speed = physics.velocity.length() * this.physics.speedToKm;
        document.getElementById('debug-status').innerHTML = `Speed: ${speed.toFixed(1)} km/h`;
      }
    }, 100);
  }
  
  // Create the control display in the top left corner
  createControlDisplay() {
    // Create container for control display
    const controlDisplay = document.createElement('div');
    controlDisplay.id = 'control-display';
    controlDisplay.style.position = 'fixed';
    controlDisplay.style.top = '10px';
    controlDisplay.style.left = '10px';
    controlDisplay.style.zIndex = '1000';
    controlDisplay.style.color = 'white';
    controlDisplay.style.padding = '15px';
    controlDisplay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    controlDisplay.style.borderRadius = '5px';
    controlDisplay.style.fontFamily = 'monospace';
    controlDisplay.style.fontSize = '14px';
    controlDisplay.style.fontWeight = 'bold';
    controlDisplay.style.lineHeight = '1.5';
    controlDisplay.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    
    // Create the initial content
    this.updateControlDisplayContent(controlDisplay);
    
    // Add to document
    document.body.appendChild(controlDisplay);
  }
  
  // Update the control display content
  updateControlDisplay() {
    const controlDisplay = document.getElementById('control-display');
    if (controlDisplay) {
      this.updateControlDisplayContent(controlDisplay);
    }
  }
  
  // Set the content of the control display
  updateControlDisplayContent(element) {
    element.innerHTML = `
      <div>W KEY: ${this.keyState.thrustForward ? 'PRESSED' : 'NOT PRESSED'}</div>
      <div>A KEY: ${this.keyState.strafeLeft ? 'PRESSED' : 'NOT PRESSED'}</div>
      <div>S KEY: ${this.keyState.thrustBackward ? 'PRESSED' : 'NOT PRESSED'}</div>
      <div>D KEY: ${this.keyState.strafeRight ? 'PRESSED' : 'NOT PRESSED'}</div>
      <div>BOOST: ${this.keyState.boost ? 'ACTIVE' : 'INACTIVE'}</div>
    `;
  }
  
  // Update key state
  updateKeyState(code, pressed) {
    switch (code) {
      // Thruster controls (WASD)
      case 'KeyW':
        this.keyState.thrustForward = pressed;
        break;
      case 'KeyS':
        this.keyState.thrustBackward = pressed;
        break;
      case 'KeyA':
        this.keyState.strafeLeft = pressed;
        break;
      case 'KeyD':
        this.keyState.strafeRight = pressed;
        break;
      
      // Rotation controls (Arrow keys)
      case 'ArrowUp':
        this.keyState.pitchUp = pressed;
        break;
      case 'ArrowDown':
        this.keyState.pitchDown = pressed;
        break;
      case 'ArrowLeft':
        this.keyState.yawLeft = pressed;
        break;
      case 'ArrowRight':
        this.keyState.yawRight = pressed;
        break;
      
      // Other controls
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keyState.boost = pressed;
        break;
      case 'KeyR':
        this.keyState.reset = pressed;
        if (pressed) {
          this.resetPlayerPosition();
        }
        break;
    }
  }
  
  // Set local player ID
  setLocalPlayerId(playerId) {
    this.localPlayerId = playerId;
  }
  
  // Reset player to starting position
  resetPlayerPosition() {
    if (!this.localPlayerId || !this.playerShips[this.localPlayerId]) {
      return;
    }
    
    log('Resetting player position');
    
    // Get the player ship and its physics
    const ship = this.playerShips[this.localPlayerId];
    const physics = this.shipPhysics[this.localPlayerId];
    
    if (ship && physics) {
      // Reset position - use spaceport if available
      if (this.spaceport) {
        // Try to use a launch ramp position if available
        if (window.spaceshipManager && window.spaceshipManager.launchPositions && 
            window.spaceshipManager.launchPositions.length > 0) {
          
          // Select a random launch position
          const launchIndex = Math.floor(Math.random() * window.spaceshipManager.launchPositions.length);
          const launchData = window.spaceshipManager.launchPositions[launchIndex];
          
          // Set position and rotation
          ship.position.copy(launchData.position);
          ship.rotation.set(0, launchData.rotation.y, 0);
          
          log(`Positioned player on launch ramp ${launchIndex}`);
        } else {
          // Fallback to a safe position if no launch positions are defined
          const safePosition = new THREE.Vector3(0, 50, 150);
          ship.position.copy(safePosition);
          log('Positioned player at safe position above spaceport');
        }
      } else {
        // Fall back to random position near origin
        const spawnRadius = 150;
        const spawnHeight = 50;
        const randomAngle = Math.random() * Math.PI * 2;
        const x = Math.cos(randomAngle) * spawnRadius;
        const z = Math.sin(randomAngle) * spawnRadius;
        
        ship.position.set(x, spawnHeight, z);
        log('Positioned player at random position');
      }
      
      // Reset rotation if not already set by launch position
      if (!this.spaceport || !window.spaceshipManager || !window.spaceshipManager.launchPositions) {
        ship.rotation.set(0, 0, 0);
      }
      
      // Set an initial small velocity to help get moving
      const initialSpeed = 0.5; // Small initial speed
      physics.velocity.set(
        Math.random() * initialSpeed - initialSpeed/2,
        0,
        Math.random() * initialSpeed - initialSpeed/2
      );
      
      // Reset angular velocity
      physics.angularVelocity.set(0, 0, 0);
      
      // Update camera
      this.updateCameraForLocalPlayer(true);
      
      // Send position update to server
      if (window.wsManager && window.wsManager.isConnected()) {
        window.wsManager.sendPositionUpdate(
          ship.position.x,
          ship.position.y,
          ship.position.z,
          ship.rotation.x,
          ship.rotation.y,
          ship.rotation.z
        );
      }
    }
  }
  
  // Animation loop
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // Debug the animation frame
    const frameStart = Date.now();
    
    // Update local player ship based on key state
    if (this.localPlayerId && this.playerShips[this.localPlayerId]) {
      this.updateLocalPlayer();
    } else if (this.localPlayerId) {
      // Ship doesn't exist yet, try to create it if we have all the necessary components
      if (window.spaceshipManager && !this.playerShips[this.localPlayerId]) {
        log(`Attempting to create missing ship for player ID ${this.localPlayerId} during animation`);
        
        const localPlayerData = {
          id: this.localPlayerId,
          username: window.loginManager && window.loginManager.username ? window.loginManager.username : 'Player',
          position: { x: 0, y: 50, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
        };
        
        this.addPlayer(localPlayerData);
      } else {
        // Only log the warning every 60 frames to avoid console spam
        if (frameStart % 60 === 0) {
          console.warn(`Cannot update player: Ship does not exist for player ID ${this.localPlayerId}`);
        }
      }
    }
    
    // Update camera position to follow local player
    this.updateCameraForLocalPlayer();
    
    // Update username tags to face camera
    this.updateUsernameTags();
    
    // Update speed lines
    this.updateSpeedLines();
    
    // Animate celestial objects
    this.animateCelestialObjects();
    
    // Update controls if available (for damping effect)
    if (this.controls) {
      this.controls.update();
    }
    
    // Render scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    
    // Frame timing debug
    const frameTime = Date.now() - frameStart;
    if (frameTime > 16) { // Warn if frame takes longer than 16ms (60fps)
      console.warn(`Slow frame: ${frameTime}ms`);
    }
  }
  
  // Animate celestial objects for visual interest and movement reference
  animateCelestialObjects() {
    if (!this.celestialObjects) return;
    
    // Animate planets (rotation)
    this.celestialObjects.planets.forEach(planet => {
      if (planet && planet.userData && planet.userData.rotationSpeed) {
        planet.rotation.x += planet.userData.rotationSpeed.x;
        planet.rotation.y += planet.userData.rotationSpeed.y;
        planet.rotation.z += planet.userData.rotationSpeed.z;
      }
    });
    
    // Animate asteroids (rotation and small movements)
    this.celestialObjects.asteroids.forEach(asteroid => {
      if (asteroid && asteroid.userData && asteroid.userData.rotationSpeed) {
        asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
        asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
        asteroid.rotation.z += asteroid.userData.rotationSpeed.z;
      }
    });
    
    // Animate meteors (movement along their path)
    this.celestialObjects.meteors.forEach(meteor => {
      if (meteor && meteor.userData) {
        // Move meteor along its direction
        if (meteor.userData.direction) {
          const speed = meteor.userData.speed || 0.5;
          meteor.position.x += meteor.userData.direction.x * speed;
          meteor.position.y += meteor.userData.direction.y * speed;
          meteor.position.z += meteor.userData.direction.z * speed;
          
          // Reset position if meteor goes too far
          const distanceFromOrigin = meteor.position.length();
          if (distanceFromOrigin > 1000) {
            // Reset to opposite side of space
            meteor.position.set(
              -meteor.position.x * 0.8,
              -meteor.position.y * 0.8,
              -meteor.position.z * 0.8
            );
          }
        }
      }
    });
  }
  
  // Check for collisions with planets
  checkPlanetCollision(currentPosition, newPosition) {
    // Ship radius (approximate)
    const shipRadius = 5;
    
    // Check each planet for collisions
    if (this.celestialObjects && this.celestialObjects.planets) {
      for (const planet of this.celestialObjects.planets) {
        if (!planet || !planet.userData || !planet.userData.radius) continue;
        
        // Get the planet's radius and position
        const planetRadius = planet.userData.radius;
        const planetPosition = planet.position.clone();
        
        // Calculate distance from ship to planet center
        const distance = newPosition.distanceTo(planetPosition);
        
        // If distance is less than combined radii, we have a collision
        if (distance < (planetRadius + shipRadius)) {
          // Calculate collision normal (direction from planet center to ship)
          const normal = new THREE.Vector3()
            .subVectors(newPosition, planetPosition)
            .normalize();
          
          // Calculate collision position (on the surface of the planet)
          const collisionPosition = new THREE.Vector3()
            .addVectors(
              planetPosition,
              normal.clone().multiplyScalar(planetRadius)
            );
          
          return {
            collided: true,
            position: collisionPosition,
            normal: normal,
            part: planet
          };
        }
      }
    }
    
    return null;
  }
  
  // Update local player position and rotation with physics
  updateLocalPlayer() {
    if (!this.localPlayerId || !this.playerShips[this.localPlayerId]) {
      return;
    }
    
    const ship = this.playerShips[this.localPlayerId];
    const physics = this.shipPhysics[this.localPlayerId];
    
    if (!physics) {
      console.warn('No physics data for local player, initializing');
      this.shipPhysics[this.localPlayerId] = {
        velocity: new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        rotationVelocity: new THREE.Vector3(0, 0, 0),
        lastPosition: ship.position.clone(),
        lastUpdate: Date.now()
      };
      return;
    }
    
    // Calculate delta time for smooth, frame-rate independent physics
    const now = Date.now();
    const deltaTime = Math.min((now - physics.lastUpdate) / 16.667, 2.0); // Cap to avoid large jumps
    physics.lastUpdate = now;
    
    // Reset acceleration for this frame
    physics.acceleration.set(0, 0, 0);
    
    // Thruster boost multiplier
    let boostMultiplier = this.keyState.boost ? this.physics.boostMultiplier : 1.0;
    
    // Apply thrust based on key state
    if (this.keyState.thrustForward) {
      // Create a forward vector (in local ship space) and apply the ship's rotation
      const forwardThrust = new THREE.Vector3(0, 0, -this.physics.acceleration * boostMultiplier);
      forwardThrust.applyQuaternion(ship.quaternion);
      physics.acceleration.add(forwardThrust);
    }
    
    if (this.keyState.thrustBackward) {
      // Create a backward vector (in local ship space) and apply the ship's rotation
      const backwardThrust = new THREE.Vector3(0, 0, this.physics.acceleration * 0.5 * boostMultiplier);
      backwardThrust.applyQuaternion(ship.quaternion);
      physics.acceleration.add(backwardThrust);
    }
    
    if (this.keyState.strafeLeft) {
      // Create a left vector (in local ship space) and apply the ship's rotation
      const leftThrust = new THREE.Vector3(-this.physics.strafeAcceleration * boostMultiplier, 0, 0);
      leftThrust.applyQuaternion(ship.quaternion);
      physics.acceleration.add(leftThrust);
    }
    
    if (this.keyState.strafeRight) {
      // Create a right vector (in local ship space) and apply the ship's rotation
      const rightThrust = new THREE.Vector3(this.physics.strafeAcceleration * boostMultiplier, 0, 0);
      rightThrust.applyQuaternion(ship.quaternion);
      physics.acceleration.add(rightThrust);
    }
    
    // Apply gravitational forces from planet and sun
    this.applyGravitationalForces(ship, physics);
    
    // Update velocity based on acceleration
    physics.velocity.add(physics.acceleration.clone().multiplyScalar(deltaTime * this.physics.timeStep));
    
    // Apply drag (space has minimal drag, but we need some for gameplay)
    physics.velocity.multiplyScalar(this.physics.drag);
    
    // Enforce maximum speed
    const speed = physics.velocity.length();
    const maxAllowedSpeed = this.physics.maxSpeed * boostMultiplier;
    if (speed > maxAllowedSpeed) {
      physics.velocity.multiplyScalar(maxAllowedSpeed / speed);
    }
    
    // Apply rotation changes (arrow keys)
    // Pitch (X rotation) - up/down arrows
    if (this.keyState.pitchUp) {
      ship.rotateX(-this.physics.rotationSpeed);
    }
    if (this.keyState.pitchDown) {
      ship.rotateX(this.physics.rotationSpeed);
    }
    
    // Yaw (Y rotation) - left/right arrows
    if (this.keyState.yawLeft) {
      ship.rotateY(this.physics.rotationSpeed);
    }
    if (this.keyState.yawRight) {
      ship.rotateY(-this.physics.rotationSpeed);
    }
    
    // Calculate new position based on velocity
    const newPosition = ship.position.clone().add(physics.velocity.clone().multiplyScalar(deltaTime * this.physics.timeStep));
    
    // Check for collisions with the spaceport
    const spaceportCollision = this.checkSpaceportCollision(ship.position, newPosition);
    
    // Check for collisions with planets
    const planetCollision = this.checkPlanetCollision(ship.position, newPosition);
    
    if (spaceportCollision) {
      // Handle collision with spaceport
      this.handleSpaceportCollision(spaceportCollision, physics);
    } else if (planetCollision) {
      // Handle collision with planet
      this.handlePlanetCollision(planetCollision, physics);
    } else {
      // No collision, update position
      ship.position.copy(newPosition);
    }
    
    // Check if position has changed
    const positionChanged = !ship.position.equals(physics.lastPosition);
    physics.lastPosition.copy(ship.position);
    
    // Update player data and send to server
    if (positionChanged) {
      // Update player data
      if (this.players[this.localPlayerId]) {
        this.players[this.localPlayerId].position = {
          x: ship.position.x,
          y: ship.position.y,
          z: ship.position.z
        };
        
        this.players[this.localPlayerId].rotation = {
          x: ship.rotation.x,
          y: ship.rotation.y,
          z: ship.rotation.z
        };
      }
      
      // Send position update
      if (window.wsManager && window.wsManager.isConnected()) {
        window.wsManager.sendPositionUpdate(
          ship.position.x,
          ship.position.y,
          ship.position.z,
          ship.rotation.x,
          ship.rotation.y,
          ship.rotation.z
        );
      }
    }
  }
  
  // Check for collisions with the spaceport
  checkSpaceportCollision(currentPosition, newPosition) {
    // Find the spaceport in the scene
    if (!this.spaceport || !this.spaceport.userData || !this.spaceport.userData.isCollidable) {
      return null;
    }
    
    // Ship radius (approximate)
    const shipRadius = 5;
    
    // Check each part of the spaceport for collisions
    const parts = this.spaceport.userData.parts || [];
    for (const part of parts) {
      if (!part.mesh || !part.type) continue;
      
      // Handle different collision shapes
      if (part.type === 'cylinder') {
        // For cylindrical parts (base, tower, etc.)
        const radius = part.radius || 10;
        const height = part.height || 10;
        
        // Get the part's world position
        let partPosition;
        if (part.position) {
          partPosition = part.position.clone();
        } else {
          partPosition = part.mesh.position.clone();
          partPosition.applyMatrix4(this.spaceport.matrixWorld);
        }
        
        // Check horizontal distance (ignoring Y)
        const horizontalDist = Math.sqrt(
          Math.pow(newPosition.x - partPosition.x, 2) + 
          Math.pow(newPosition.z - partPosition.z, 2)
        );
        
        // Check if within radius and height
        if (horizontalDist < (radius + shipRadius) && 
            newPosition.y > (partPosition.y - height/2) && 
            newPosition.y < (partPosition.y + height/2)) {
          
          // Calculate collision normal (direction from cylinder center to ship)
          const normal = new THREE.Vector3(
            newPosition.x - partPosition.x,
            0, // Keep normal horizontal for cylinders
            newPosition.z - partPosition.z
          ).normalize();
          
          // Calculate collision position (on the surface of the cylinder)
          const collisionPosition = new THREE.Vector3(
            partPosition.x + normal.x * radius,
            newPosition.y, // Keep the same Y
            partPosition.z + normal.z * radius
          );
          
          return {
            collided: true,
            position: collisionPosition,
            normal: normal,
            part: part.mesh
          };
        }
      } else if (part.type === 'box') {
        // For box parts (ramps, barriers, etc.)
        const size = part.size || new THREE.Vector3(10, 10, 10);
        
        // Get the part's world position
        let partPosition;
        if (part.position) {
          partPosition = part.position.clone();
        } else {
          partPosition = part.mesh.position.clone();
          partPosition.applyMatrix4(this.spaceport.matrixWorld);
        }
        
        // Create a box for collision detection
        const halfSize = size.clone().multiplyScalar(0.5);
        const min = partPosition.clone().sub(halfSize);
        const max = partPosition.clone().add(halfSize);
        
        // Apply rotation if needed
        if (part.rotation) {
          // This is simplified - for more accurate box rotation collision,
          // we would need to transform the ship position into the box's local space
          // and then check against an axis-aligned box
          
          // For now, we'll just expand the box a bit to account for rotation
          const expansion = Math.max(size.x, size.z) * 0.2;
          min.x -= expansion;
          min.z -= expansion;
          max.x += expansion;
          max.z += expansion;
        }
        
        // Check if ship is inside the box
        if (newPosition.x > min.x && newPosition.x < max.x &&
            newPosition.y > min.y && newPosition.y < max.y &&
            newPosition.z > min.z && newPosition.z < max.z) {
          
          // Find the closest face to determine the normal
          const distances = [
            Math.abs(newPosition.x - min.x), // Distance to min X face
            Math.abs(newPosition.x - max.x), // Distance to max X face
            Math.abs(newPosition.y - min.y), // Distance to min Y face
            Math.abs(newPosition.y - max.y), // Distance to max Y face
            Math.abs(newPosition.z - min.z), // Distance to min Z face
            Math.abs(newPosition.z - max.z)  // Distance to max Z face
          ];
          
          // Find the minimum distance
          const minDistance = Math.min(...distances);
          const minIndex = distances.indexOf(minDistance);
          
          // Create normal based on the closest face
          const normal = new THREE.Vector3();
          switch (minIndex) {
            case 0: normal.set(-1, 0, 0); break; // -X face
            case 1: normal.set(1, 0, 0); break;  // +X face
            case 2: normal.set(0, -1, 0); break; // -Y face
            case 3: normal.set(0, 1, 0); break;  // +Y face
            case 4: normal.set(0, 0, -1); break; // -Z face
            case 5: normal.set(0, 0, 1); break;  // +Z face
          }
          
          // If there's a rotation, apply it to the normal
          if (part.rotation) {
            const rotationY = new THREE.Matrix4().makeRotationY(part.rotation);
            normal.applyMatrix4(rotationY);
          }
          
          // Calculate collision position
          const collisionPosition = newPosition.clone().add(
            normal.clone().multiplyScalar(minDistance + shipRadius)
          );
          
          return {
            collided: true,
            position: collisionPosition,
            normal: normal,
            part: part.mesh
          };
        }
      }
    }
    
    // No collision detected
    return null;
  }
  
  // Handle collision with the spaceport
  handleSpaceportCollision(collision, physics) {
    if (!collision || !collision.position || !collision.normal) {
      console.warn("Invalid spaceport collision object:", collision);
      return;
    }
    
    const ship = this.playerShips[this.localPlayerId];
    if (!ship) {
      console.warn("Ship not found for spaceport collision handling");
      return;
    }
    
    // Hide the ship immediately to simulate explosion
    ship.visible = false;
    
    // Set ship position to collision point
    ship.position.copy(collision.position);
    
    // Reflect velocity vector off the collision normal
    const reflectionVector = collision.normal.clone().multiplyScalar(2 * physics.velocity.dot(collision.normal));
    physics.velocity.sub(reflectionVector);
    
    // Reduce velocity (energy loss in collision)
    physics.velocity.multiplyScalar(0.5);
    
    // Create collision effect
    this.createCollisionEffect(collision.position);
    
    // Play collision sound
    this.playCollisionSound();
    
    // Show crash screen
    this.showCrashScreen();
  }
  
  // Handle collision with a planet
  handlePlanetCollision(collision, physics) {
    if (!collision || !collision.position || !collision.normal) {
      console.warn("Invalid planet collision object:", collision);
      return;
    }
    
    const ship = this.playerShips[this.localPlayerId];
    if (!ship) {
      console.warn("Ship not found for planet collision handling");
      return;
    }
    
    // Hide the ship immediately to simulate explosion
    ship.visible = false;
    
    // Set ship position to collision point
    ship.position.copy(collision.position);
    
    // Reflect velocity vector off the collision normal
    const reflectionVector = collision.normal.clone().multiplyScalar(2 * physics.velocity.dot(collision.normal));
    physics.velocity.sub(reflectionVector);
    
    // Reduce velocity (energy loss in collision)
    physics.velocity.multiplyScalar(0.5);
    
    // Create collision effect
    this.createCollisionEffect(collision.position);
    
    // Play collision sound
    this.playCollisionSound();
    
    // Show crash screen
    this.showCrashScreen();
  }
  
  // Create a particle effect at the collision point
  createCollisionEffect(position) {
    // Create a particle effect at collision point
    const particleCount = 30; // Increased particle count for more dramatic effect
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xff0000, // Red color for explosion
      size: 1.5, // Slightly larger particles
      transparent: true,
      opacity: 0.9
    });
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    // Create particles at collision point
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;
      
      // Random velocity for each particle - increased speed
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 4, // Doubled speed
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ));
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
    
    // Animate particles
    const startTime = Date.now();
    const duration = 800; // Longer duration for more dramatic effect
    
    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      const positions = particles.geometry.attributes.position.array;
      
      // Update particle positions
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] += velocities[i].x * 0.3; // Faster movement
        positions[i3 + 1] += velocities[i].y * 0.3;
        positions[i3 + 2] += velocities[i].z * 0.3;
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Fade out particles
      particles.material.opacity = 0.9 * (1 - elapsed / duration);
      
      if (elapsed < duration) {
        requestAnimationFrame(animateParticles);
      } else {
        // Remove particles from scene
        this.scene.remove(particles);
      }
    };
    
    animateParticles();
  }
  
  // Play collision sound
  playCollisionSound() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }
  
  // Show crash screen with restart button
  showCrashScreen() {
    // Create crash screen if it doesn't exist
    if (!this.crashScreen) {
      this.crashScreen = document.createElement('div');
      this.crashScreen.style.position = 'fixed';
      this.crashScreen.style.top = '0';
      this.crashScreen.style.left = '0';
      this.crashScreen.style.width = '100%';
      this.crashScreen.style.height = '100%';
      this.crashScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      this.crashScreen.style.display = 'flex';
      this.crashScreen.style.flexDirection = 'column';
      this.crashScreen.style.justifyContent = 'center';
      this.crashScreen.style.alignItems = 'center';
      this.crashScreen.style.zIndex = '1000';
      this.crashScreen.style.color = 'white';
      this.crashScreen.style.fontFamily = 'Arial, sans-serif';
      
      const crashTitle = document.createElement('h1');
      crashTitle.textContent = 'SHIP CRASHED';
      crashTitle.style.fontSize = '3rem';
      crashTitle.style.marginBottom = '2rem';
      crashTitle.style.color = '#ff3333';
      crashTitle.style.textShadow = '0 0 10px rgba(255, 0, 0, 0.7)';
      
      const restartButton = document.createElement('button');
      restartButton.textContent = 'RESTART';
      restartButton.style.padding = '1rem 2rem';
      restartButton.style.fontSize = '1.5rem';
      restartButton.style.backgroundColor = '#3366ff';
      restartButton.style.color = 'white';
      restartButton.style.border = 'none';
      restartButton.style.borderRadius = '5px';
      restartButton.style.cursor = 'pointer';
      restartButton.style.boxShadow = '0 0 10px rgba(51, 102, 255, 0.7)';
      
      restartButton.addEventListener('mouseover', () => {
        restartButton.style.backgroundColor = '#4477ff';
      });
      
      restartButton.addEventListener('mouseout', () => {
        restartButton.style.backgroundColor = '#3366ff';
      });
      
      restartButton.addEventListener('click', () => {
        this.restartGame();
      });
      
      this.crashScreen.appendChild(crashTitle);
      this.crashScreen.appendChild(restartButton);
      document.body.appendChild(this.crashScreen);
    } else {
      this.crashScreen.style.display = 'flex';
    }
  }
  
  // Restart the game after crash
  restartGame() {
    console.log("Restarting game...");
    
    // Always hide crash screen first to ensure it disappears even if there's an error
    if (this.crashScreen) {
      this.crashScreen.style.display = 'none';
    }
    
    // Check if we have a valid player ID
    if (!this.localPlayerId) {
      console.error("Cannot restart game: No local player ID");
      return;
    }
    
    try {
      // Reset physics if they exist
      if (this.shipPhysics && this.shipPhysics[this.localPlayerId]) {
        const physics = this.shipPhysics[this.localPlayerId];
        if (physics.velocity && typeof physics.velocity.set === 'function') {
          physics.velocity.set(0, 0, 0);
        } else {
          physics.velocity = new THREE.Vector3(0, 0, 0);
        }
        
        if (physics.angularVelocity && typeof physics.angularVelocity.set === 'function') {
          physics.angularVelocity.set(0, 0, 0);
        } else {
          physics.angularVelocity = new THREE.Vector3(0, 0, 0);
        }
      } else {
        // Create physics if they don't exist
        this.shipPhysics = this.shipPhysics || {};
        this.shipPhysics[this.localPlayerId] = {
          velocity: new THREE.Vector3(0, 0, 0),
          angularVelocity: new THREE.Vector3(0, 0, 0)
        };
      }
      
      // Check if ship exists
      let ship = this.playerShips ? this.playerShips[this.localPlayerId] : null;
      
      if (ship) {
        console.log("Resetting existing ship position");
        // Reset existing ship
        ship.position.set(0, 50, 0);
        ship.rotation.set(0, 0, 0);
        ship.visible = true;
      } else {
        console.log("Creating new ship");
        // Create a new ship
        if (!window.spaceshipManager) {
          console.error("Cannot create ship: spaceshipManager not available");
          return;
        }
        
        try {
          const newShip = window.spaceshipManager.createSpaceship();
          if (!newShip) {
            console.error("Failed to create new ship");
            return;
          }
          
          // Initialize the new ship
          this.playerShips = this.playerShips || {};
          this.playerShips[this.localPlayerId] = newShip;
          newShip.position.set(0, 50, 0);
          
          // Add to scene if not already added
          if (this.scene) {
            this.scene.add(newShip);
            console.log("Added new ship to scene");
          } else {
            console.error("Cannot add ship to scene: scene not available");
          }
          
          ship = newShip;
        } catch (shipError) {
          console.error("Error creating ship:", shipError);
          return;
        }
      }
      
      // Update camera if ship exists now
      if (ship && this.updateCameraForLocalPlayer) {
        try {
          this.updateCameraForLocalPlayer(true);
        } catch (cameraError) {
          console.error("Error updating camera:", cameraError);
        }
      }
      
      // Send position update to server if ship exists
      if (ship && window.wsManager && window.wsManager.isConnected && window.wsManager.isConnected()) {
        try {
          window.wsManager.sendPositionUpdate(
            ship.position.x,
            ship.position.y,
            ship.position.z,
            ship.rotation.x,
            ship.rotation.y,
            ship.rotation.z
          );
        } catch (wsError) {
          console.error("Error sending position update:", wsError);
        }
      }
      
      console.log("Game restart completed successfully");
    } catch (error) {
      console.error("Unexpected error during game restart:", error);
    }
  }
  
  // Update camera position to follow local player
  updateCameraForLocalPlayer(reset = false) {
    if (!this.localPlayerId || !this.playerShips[this.localPlayerId]) {
      return;
    }
    
    const ship = this.playerShips[this.localPlayerId];
    const physics = this.shipPhysics[this.localPlayerId];
    
    // Calculate camera position behind and slightly above the ship
    const offsetDistance = 15; // Distance behind the ship
    const heightOffset = 5;    // Height above the ship
    
    // Get ship's direction vector (forward vector)
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(ship.quaternion);
    
    // Calculate target camera position
    const cameraPosition = new THREE.Vector3();
    cameraPosition.copy(ship.position);
    
    // Move camera backwards from the ship along its direction vector
    cameraPosition.sub(direction.multiplyScalar(offsetDistance));
    
    // Raise camera above the ship
    cameraPosition.y += heightOffset;
    
    // Use velocity to look slightly ahead of the ship (anticipation)
    const lookAheadFactor = 0.5;
    const targetLookAt = new THREE.Vector3();
    
    if (physics && physics.velocity.lengthSq() > 0.001) {
      // Add a fraction of the velocity to the target look position
      const velocityDirection = physics.velocity.clone().normalize();
      targetLookAt.copy(ship.position).add(
        velocityDirection.multiplyScalar(lookAheadFactor * physics.velocity.length())
      );
    } else {
      // Just look at the ship if nearly stationary
      targetLookAt.copy(ship.position);
    }
    
    // Add small camera lag/smoothing for better feel
    if (this.lastCameraPosition) {
      const smoothFactor = 0.05;
      this.camera.position.lerp(cameraPosition, smoothFactor);
    } else {
      this.camera.position.copy(cameraPosition);
      this.lastCameraPosition = this.camera.position.clone();
    }
    
    // Make camera look at ship (or ahead of it based on velocity)
    this.camera.lookAt(targetLookAt);
    
    // If using orbit controls, update the target
    if (this.controls) {
      this.controls.target.copy(ship.position);
      
      // Disable user input for orbit controls since we're controlling the camera programmatically
      this.controls.enabled = false;
    }
    
    if (reset) {
      this.lastCameraPosition = null;
    }
  }
  
  // Add a new player to the game
  addPlayer(playerData) {
    if (!playerData || !playerData.id) {
      return;
    }
    
    log(`Adding player: ${playerData.id}`);
    
    // Don't add the player if they already exist
    if (this.players[playerData.id]) {
      log(`Player ${playerData.id} already exists, updating data`);
      this.players[playerData.id] = playerData;
      return;
    }
    
    this.players[playerData.id] = playerData;
    
    // Don't create a spaceship if the scene doesn't exist yet
    if (!this.scene || !window.spaceshipManager) {
      log('Scene or spaceship manager not ready, deferring ship creation');
      return;
    }
    
    try {
      // Create the spaceship with a random color if none provided
      const color = playerData.color || this.getRandomPlayerColor();
      const ship = window.spaceshipManager.createSpaceship(color);
      
      // Set initial position if provided
      if (playerData.position) {
        ship.position.set(
          playerData.position.x || 0,
          playerData.position.y || 0,
          playerData.position.z || 0
        );
      }
      
      // Set initial rotation if provided
      if (playerData.rotation) {
        ship.rotation.set(
          playerData.rotation.x || 0,
          playerData.rotation.y || 0,
          playerData.rotation.z || 0
        );
      }
      
      // Add username tag above the ship
      this.createUsernameTag(ship, playerData);
      
      // Initialize physics state for this ship
      this.shipPhysics[playerData.id] = {
        velocity: new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        rotationVelocity: new THREE.Vector3(0, 0, 0),
        lastPosition: ship.position.clone(),
        lastUpdate: Date.now()
      };
      
      this.scene.add(ship);
      this.playerShips[playerData.id] = ship;
      
      // Update player count
      this.updatePlayerCount();
      
      log(`Player ${playerData.id} added with ship`);
    } catch (error) {
      console.error(`Error adding player ${playerData.id}:`, error);
    }
  }
  
  // Remove a player from the game
  removePlayer(playerId) {
    if (!playerId || !this.players[playerId]) {
      return;
    }
    
    log(`Removing player: ${playerId}`);
    
    // Remove ship from scene
    if (this.playerShips[playerId]) {
      // Clean up any username tag resources
      const ship = this.playerShips[playerId];
      if (ship.userData && ship.userData.nameTag) {
        // Remove the sprite from the ship
        ship.remove(ship.userData.nameTag);
        
        // Dispose of texture and material to prevent memory leaks
        if (ship.userData.nameTag.material) {
          if (ship.userData.nameTag.material.map) {
            ship.userData.nameTag.material.map.dispose();
          }
          ship.userData.nameTag.material.dispose();
        }
        
        ship.userData.nameTag = null;
      }
      
      // Remove ship from scene
      this.scene.remove(this.playerShips[playerId]);
      delete this.playerShips[playerId];
    }
    
    // Remove physics state
    if (this.shipPhysics[playerId]) {
      delete this.shipPhysics[playerId];
    }
    
    // Remove player data
    delete this.players[playerId];
    
    // Update player count
    this.updatePlayerCount();
  }
  
  // Update player positions from server data
  updatePlayers(players) {
    // Add new players and update existing ones
    for (const id in players) {
      if (!this.players[id]) {
        // New player
        this.addPlayer(players[id]);
      } else if (id !== this.localPlayerId) {
        // Update existing player (except local player)
        const playerData = players[id];
        const ship = this.playerShips[id];
        
        if (ship) {
          // Smoothly interpolate to new position
          const targetPosition = new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
          );
          
          const targetRotation = new THREE.Euler(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
          );
          
          // Simple interpolation
          ship.position.lerp(targetPosition, 0.1);
          
          // Interpolate rotation (more complex)
          ship.rotation.x += (targetRotation.x - ship.rotation.x) * 0.1;
          ship.rotation.y += (targetRotation.y - ship.rotation.y) * 0.1;
          ship.rotation.z += (targetRotation.z - ship.rotation.z) * 0.1;
          
          // Check if username has changed and update the nametag if needed
          if (playerData.username !== this.players[id].username) {
            // Remove old nametag if it exists
            if (ship.userData && ship.userData.nameTag) {
              ship.remove(ship.userData.nameTag);
              ship.userData.nameTag = null;
            }
            
            // Create new nametag with updated username
            this.createUsernameTag(ship, playerData);
          }
          
          // Update player data
          this.players[id] = playerData;
        }
      }
    }
    
    // Remove players that no longer exist
    for (const id in this.players) {
      if (!players[id] && id !== this.localPlayerId) {
        this.removePlayer(id);
      }
    }
  }
  
  // Update player count display
  updatePlayerCount() {
    if (this.playerCountElement) {
      const count = Object.keys(this.players).length;
      this.playerCountElement.textContent = `Players: ${count}`;
    }
  }
  
  // Get a random color for player ships
  getRandomPlayerColor() {
    const colors = [
      '#3388ff', // blue
      '#ff3333', // red
      '#33ff33', // green
      '#ffaa00', // orange
      '#aa33ff', // purple
      '#33ffff', // cyan
      '#ff33ff'  // magenta
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // Apply gravitational forces from celestial bodies
  applyGravitationalForces(ship, physics) {
    // Planet gravity (assuming planet is at origin)
    const planetPos = new THREE.Vector3(0, 0, 0);
    this.applyGravityFromBody(ship.position, physics, planetPos, this.physics.planetMass);
    
    // Sun gravity (assuming sun is at a fixed position)
    const sunPos = new THREE.Vector3(200, 0, -200);
    this.applyGravityFromBody(ship.position, physics, sunPos, this.physics.sunMass);
  }
  
  // Apply gravity from a specific celestial body
  applyGravityFromBody(shipPos, physics, bodyPos, bodyMass) {
    // Calculate direction vector from ship to body
    const direction = new THREE.Vector3();
    direction.subVectors(bodyPos, shipPos);
    
    // Calculate distance (squared for efficiency)
    const distanceSq = direction.lengthSq();
    
    // Normalize direction vector
    direction.normalize();
    
    // Skip if too far away (optimization)
    if (distanceSq > 10000) {
      return;
    }
    
    // Calculate gravity force magnitude: G * m1 * m2 / r^2
    // We simplify by assuming the ship has a fixed mass of 1
    // and incorporating G (gravitational constant) into the bodyMass
    let forceMagnitude = bodyMass / Math.max(distanceSq, 100);
    
    // Scale by the gravity strength parameter
    forceMagnitude *= this.physics.gravityStrength;
    
    // Apply force as acceleration (F = ma, but since m=1 for the ship, F = a)
    const gravityForce = direction.multiplyScalar(forceMagnitude);
    physics.acceleration.add(gravityForce);
  }
  
  // Force move forward - debug method to help diagnose issues
  forceMoveForward() {
    if (!this.localPlayerId || !this.playerShips[this.localPlayerId]) {
      console.error('Cannot force movement: No local player ship');
      return;
    }
    
    log('Force-moving player forward');
    
    const ship = this.playerShips[this.localPlayerId];
    const physics = this.shipPhysics[this.localPlayerId];
    
    if (!physics) {
      console.error('Cannot force movement: No physics data');
      return;
    }
    
    // Apply a strong forward impulse
    const forwardThrust = new THREE.Vector3(0, 0, -0.5); // Much stronger than normal
    forwardThrust.applyQuaternion(ship.quaternion);
    physics.velocity.add(forwardThrust);
    
    log(`Applied impulse: ${forwardThrust.x.toFixed(2)}, ${forwardThrust.y.toFixed(2)}, ${forwardThrust.z.toFixed(2)}`);
    log(`New velocity: ${physics.velocity.length().toFixed(2)}`);
  }
  
  // Create speed lines for visual movement feedback
  createSpeedLines() {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create speed lines.');
      return;
    }
    
    log('Creating speed lines for movement feedback');
    
    try {
      // Create a particle system for speed lines
      const particleCount = 200;
      const speedLinesGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      // Initialize particles in a spherical pattern around the camera
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random position in a sphere around the origin
        const radius = 10 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3+1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3+2] = radius * Math.cos(phi);
        
        // White color with slight blue tint
        colors[i3] = 0.8 + Math.random() * 0.2;     // R
        colors[i3+1] = 0.8 + Math.random() * 0.2;   // G
        colors[i3+2] = 1.0;                         // B
        
        // Random sizes
        sizes[i] = 0.1 + Math.random() * 0.3;
      }
      
      speedLinesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      speedLinesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      speedLinesGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      // Create shader material for speed lines
      const speedLinesMaterial = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: new THREE.TextureLoader().load(createParticleTexture()) }
        },
        vertexShader: `
          attribute float size;
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform sampler2D pointTexture;
          varying vec3 vColor;
          void main() {
            gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
            if (gl_FragColor.a < 0.3) discard;
          }
        `,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        transparent: true,
        vertexColors: true
      });
      
      this.speedLines = new THREE.Points(speedLinesGeometry, speedLinesMaterial);
      this.speedLines.visible = false; // Initially hidden
      this.scene.add(this.speedLines);
      
      // Store original positions for resetting
      this.speedLines.userData = {
        originalPositions: positions.slice(),
        currentSpeed: 0
      };
      
      log('Speed lines created successfully');
    } catch (error) {
      console.error('Error creating speed lines:', error);
    }
  }
  
  // Update speed lines based on current velocity
  updateSpeedLines() {
    if (!this.speedLines || !this.localPlayerId || !this.shipPhysics[this.localPlayerId]) return;
    
    const physics = this.shipPhysics[this.localPlayerId];
    const velocity = physics.velocity;
    const speed = velocity.length();
    
    // Only show speed lines above certain speed
    this.speedLines.visible = speed > 0.2;
    if (!this.speedLines.visible) return;
    
    // Update speed lines positions
    const positions = this.speedLines.geometry.attributes.position.array;
    const originalPositions = this.speedLines.userData.originalPositions;
    const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    
    // Calculate elongation factor based on speed
    const elongationFactor = Math.min(speed * 2, 5);
    this.speedLines.userData.currentSpeed = speed;
    
    for (let i = 0; i < positions.length; i += 3) {
      // Get original position
      const originalX = originalPositions[i];
      const originalY = originalPositions[i+1];
      const originalZ = originalPositions[i+2];
      
      // Create elongated effect in the direction of movement
      positions[i] = originalX - cameraDirection.x * elongationFactor;
      positions[i+1] = originalY - cameraDirection.y * elongationFactor;
      positions[i+2] = originalZ - cameraDirection.z * elongationFactor;
      
      // Randomly reset some particles for a continuous effect
      if (Math.random() < 0.01) {
        const radius = 10 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        positions[i] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i+1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i+2] = radius * Math.cos(phi);
        
        originalPositions[i] = positions[i];
        originalPositions[i+1] = positions[i+1];
        originalPositions[i+2] = positions[i+2];
      }
    }
    
    // Update the geometry
    this.speedLines.geometry.attributes.position.needsUpdate = true;
  }

  // Create a username tag that floats above the player's ship
  createUsernameTag(ship, playerData) {
    if (!ship || !playerData || !playerData.username) return;
    
    // Create a canvas for the username text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Set canvas background to be transparent
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Style the text
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Add a background with rounded corners for better visibility
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 10);
    context.fill();
    
    // Add a border with player color
    context.strokeStyle = playerData.color || '#FFFFFF';
    context.lineWidth = 3;
    context.roundRect(10, 10, canvas.width - 20, canvas.height - 20, 10);
    context.stroke();
    
    // Draw the text
    context.fillStyle = '#FFFFFF';
    context.fillText(playerData.username, canvas.width / 2, canvas.height / 2);
    
    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Create a sprite material with the texture
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create the sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 1.25, 1);
    sprite.position.set(0, 8, 0); // Position above the ship
    
    // Add the sprite to the ship
    ship.add(sprite);
    
    // Store reference to the sprite for updates
    ship.userData = ship.userData || {};
    ship.userData.nameTag = sprite;
  }

  // Update the username tag to always face the camera
  updateUsernameTags() {
    // For each player ship, make sure the username tag faces the camera
    for (const playerId in this.playerShips) {
      const ship = this.playerShips[playerId];
      if (ship && ship.userData && ship.userData.nameTag) {
        // Username tags are sprites which automatically face the camera,
        // but we need to ensure they stay above the ship as it moves
        const nameTag = ship.userData.nameTag;
        
        // Make sure the tag is visible from all angles
        nameTag.material.depthTest = false;
        nameTag.renderOrder = 1; // Render after everything else
      }
    }
  }
} 