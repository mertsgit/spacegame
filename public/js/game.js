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
    this.shipPhysics = {};   // Map of player ID to physics data
    this.playerTrails = {};  // Map of player ID to trail data { mesh, segments }
    
    // Celestial objects
    this.celestialObjects = {
      planets: [],
      stars: null,
      sun: null,
      nebulae: [],
      asteroids: []
    };
    
    // Physics properties
    this.physics = {
      maxSpeed: 4.0,          // Maximum speed (equivalent to 40km/h)
      acceleration: 0.2,      // Main thruster acceleration (increased from 0.08)
      strafeAcceleration: 0.1, // Strafing acceleration (increased from 0.04)
      rotationSpeed: 0.03,    // Rotation speed (radians per frame)
      drag: 0.98,             // Drag coefficient (1.0 = no drag)
      timeStep: 1.0,          // Physics time step multiplier
      boostMultiplier: 4.0,   // Boost multiplier for acceleration
      gravity: 0.5            // Gravity strength
    };
    
    // Input state
    this.keyState = {
      thrustForward: false,
      thrustBackward: false,
      strafeLeft: false,
      strafeRight: false,
      turnLeft: false,
      turnRight: false,
      rollLeft: false,
      rollRight: false,
      pitchUp: false,
      pitchDown: false,
      yawLeft: false,
      yawRight: false,
      boost: false,
      trailActive: false
    };
    
    // Mobile detection and touch controls
    this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window);
    this.touchState = {
      leftJoystick: {
        active: false,
        id: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0
      },
      rightJoystick: {
        active: false,
        id: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        deltaX: 0,
        deltaY: 0
      },
      boostButton: {
        active: false,
        id: null
      },
      thrustButton: {
        active: false,
        id: null
      }
    };
    
    log(`Mobile device detected: ${this.isMobile}`);
  }
  
  // Initialize the game for a specific player
  init(localPlayerId) {
    if (this.initialized) {
      log('Game already initialized');
      return;
    }
    
    log(`Initializing game for player: ${localPlayerId}`);
    this.localPlayerId = localPlayerId;
    
    // Mobile-specific setup
    if (this.isMobile) {
      log('Setting up mobile-specific configurations');
      
      // Hide controls panel on mobile
      const controlsPanel = document.getElementById('controls');
      if (controlsPanel) {
        controlsPanel.style.display = 'none';
      }
      
      // Add mobile class to body if not already added
      if (!document.body.classList.contains('mobile')) {
        document.body.classList.add('mobile');
        log('Added mobile class to body');
      }
      
      // Ensure canvas is properly sized and positioned
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.display = 'block';
        log('Canvas size and position set for mobile');
      }
    }
    
    try {
      // Get player color from login manager or generate a random one
      let playerColor = '#00AAFF';
      if (window.loginManager && window.loginManager.playerColor) {
        playerColor = window.loginManager.playerColor;
      } else {
        playerColor = this.getRandomPlayerColor();
      }
      
      // Create local player data
      const localPlayerData = {
        id: this.localPlayerId,
        username: window.loginManager && window.loginManager.username ? window.loginManager.username : 'Player',
        position: { x: 0, y: 100, z: 0 }, // Start in space
        rotation: { x: -0.2, y: 0, z: 0 }, // Tilt slightly down to see Earth
        color: playerColor
      };
      
      // Initialize scene, camera, renderer
      this.initScene();
      
      // Add local player
      this.addPlayer(localPlayerData);
      
      // Initialize event listeners
      this.initEventListeners();
      
      // Create control display (now a no-op)
      this.createControlDisplay();
      
      // Set up touch controls for mobile
      if (this.isMobile) {
        log('Setting up touch controls for mobile');
        this.setupTouchControls();
        
        // Make sure mobile controls are visible
        const mobileControls = document.getElementById('mobile-controls');
        if (mobileControls) {
          mobileControls.style.display = 'block';
          log('Mobile controls display set to block');
        }
        
        // Show specific mobile control elements
        const thrustButton = document.getElementById('thrust-button');
        const rightJoystick = document.getElementById('right-joystick');
        const boostButton = document.getElementById('boost-button');
        
        if (thrustButton) thrustButton.style.display = 'flex';
        if (rightJoystick) rightJoystick.style.display = 'block';
        if (boostButton) boostButton.style.display = 'flex';
        
        log('Mobile control elements displayed');
      }
      
      // Start animation loop
      this.animate();
      
      // Mark as initialized
      this.initialized = true;
      log('Game initialized successfully');
      
      // Force a render to ensure the scene appears
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
        log('Forced initial render');
        
        // Set initial camera to look at Earth
        if (this.playerShips[this.localPlayerId]) {
          const ship = this.playerShips[this.localPlayerId];
          this.camera.position.copy(ship.position);
          this.camera.lookAt(0, -20000, -30000); // Look at Earth
          this.updateCameraForLocalPlayer(true);
          
          // Force another render after camera update
          this.renderer.render(this.scene, this.camera);
          log('Forced render after camera positioning');
        }
      }
    } catch (error) {
      console.error('Error initializing game:', error);
      this.initialized = false;
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
      const canvas = document.getElementById('game-canvas');
      if (!canvas) {
        console.error('Canvas element not found!');
        return;
      }
      
      log('Creating WebGL renderer with canvas:', canvas);
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        canvas: canvas // Use existing canvas
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      
      // Handle window resize
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
      
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
      
      // Force initial render
      this.renderer.render(this.scene, this.camera);
      log('Initial scene render complete');
      
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
    
    // Debug status display has been removed
    
  }
  
  // Create the control display in the top left corner
  createControlDisplay() {
    // Skip creating the control display
    console.log("Control display creation skipped");
    return;
  }
  
  // Update the control display content
  updateControlDisplay() {
    // Skip updating since we're not creating the control display
    return;
  }
  
  // Set the content of the control display
  updateControlDisplayContent(element) {
    // No-op since we're not using the control display
    return;
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
      case 'Space':
        this.keyState.trailActive = pressed;
        if (!pressed && this.playerTrails[this.localPlayerId]) {
          // Reset trail segments when releasing spacebar
          this.playerTrails[this.localPlayerId].segments = [];
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
    // Request next frame
    requestAnimationFrame(() => this.animate());
    
    // Log for mobile debugging (only log occasionally to avoid flooding console)
    if (this.isMobile && Math.random() < 0.01) {
      log('Mobile animation frame active');
    }
    
    // Update celestial objects
    this.animateCelestialObjects();
    
    // Update local player if available
    if (this.localPlayerId && this.playerShips[this.localPlayerId]) {
      this.updateLocalPlayer();
    }
    
    // Update camera position to follow player
    this.updateCameraForLocalPlayer();
    
    // Update username tags to follow players
    this.updateUsernameTags();
    
    // Update speed lines effect
    this.updateSpeedLines();
    
    // Update orbit controls if available
    if (this.controls) {
      this.controls.update();
    }
    
    // Render scene
    if (this.renderer && this.scene && this.camera) {
      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.error('Error during render:', error);
        
        // Try to recover renderer on error (especially for mobile)
        if (this.isMobile) {
          log('Attempting to recover renderer after error');
          const canvas = document.getElementById('game-canvas');
          if (canvas) {
            try {
              this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                canvas: canvas,
                powerPreference: "high-performance",
                alpha: true
              });
              this.renderer.setSize(window.innerWidth, window.innerHeight, false);
              this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
              log('Renderer recovery attempted');
            } catch (recoveryError) {
              console.error('Failed to recover renderer:', recoveryError);
            }
          }
        }
      }
    } else {
      console.error('Render failed: missing renderer, scene, or camera');
      
      // Log component status for debugging
      log(`Renderer: ${this.renderer ? 'OK' : 'MISSING'}, Scene: ${this.scene ? 'OK' : 'MISSING'}, Camera: ${this.camera ? 'OK' : 'MISSING'}`);
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
    
    // Update key state from touch controls if on mobile
    if (this.isMobile) {
      this.updateKeyStateFromTouchControls();
    }
    
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
    
    // Trail handling
    if (this.keyState.trailActive) {
      this.updateTrail(this.localPlayerId, ship.position.clone(), this.players[this.localPlayerId].color);
    }
    
    // Check collisions with other players' trails
    for (const id in this.playerTrails) {
      if (id !== this.localPlayerId && this.playerTrails[id] && this.playerTrails[id].mesh) {
        const collision = this.checkTrailCollision(ship.position, this.playerTrails[id]);
        if (collision) {
          this.handleCrash(this.localPlayerId, collision.position);
          break;
        }
      }
    }
    
    // Send position update to server if position changed significantly
    const positionChanged = physics.lastPosition.distanceTo(ship.position) > 0.1;
    if (positionChanged) {
      physics.lastPosition.copy(ship.position);
      
      if (window.wsManager && window.wsManager.isConnected()) {
        window.wsManager.sendPositionUpdate(
          { x: ship.position.x, y: ship.position.y, z: ship.position.z },
          { x: ship.rotation.x, y: ship.rotation.y, z: ship.rotation.z },
          this.keyState.trailActive // Send trail state
        );
      }
    }
    
    // Update camera to follow the player
    this.updateCameraForLocalPlayer();
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
    if (this.crashScreen) {
      this.crashScreen.style.display = 'flex';
      return;
    }
    
    // Create crash screen
    this.crashScreen = document.createElement('div');
    this.crashScreen.style.position = 'absolute';
    this.crashScreen.style.top = '0';
    this.crashScreen.style.left = '0';
    this.crashScreen.style.width = '100%';
    this.crashScreen.style.height = '100%';
    this.crashScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    this.crashScreen.style.display = 'flex';
    this.crashScreen.style.flexDirection = 'column';
    this.crashScreen.style.justifyContent = 'center';
    this.crashScreen.style.alignItems = 'center';
    this.crashScreen.style.zIndex = '1000';
    this.crashScreen.style.fontFamily = "'Orbitron', sans-serif";
    this.crashScreen.style.backdropFilter = 'blur(5px)';
    
    // Create title
    const title = document.createElement('h1');
    title.textContent = 'SHIP CRASHED';
    title.style.color = 'var(--accent-color, #ff00e5)';
    title.style.fontSize = '3rem';
    title.style.marginBottom = '2rem';
    title.style.textShadow = '0 0 10px var(--accent-color, #ff00e5)';
    title.style.animation = 'pulse 2s infinite';
    
    // Create restart button with improved mobile styling
    const button = document.createElement('button');
    button.textContent = 'RESTART';
    button.style.padding = '15px 40px'; // Larger padding for better touch target
    button.style.fontSize = '1.5rem'; // Larger font for better visibility
    button.style.backgroundColor = 'rgba(0, 229, 255, 0.2)'; // Light background for better visibility
    button.style.border = '2px solid var(--primary-color, #00e5ff)';
    button.style.color = 'var(--primary-color, #00e5ff)';
    button.style.cursor = 'pointer';
    button.style.fontFamily = "'Orbitron', sans-serif";
    button.style.borderRadius = '8px'; // Larger border radius
    button.style.transition = 'all 0.3s';
    button.style.textShadow = '0 0 5px var(--primary-color, #00e5ff)';
    button.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.5)'; // More visible glow
    button.style.margin = '20px'; // Add margin for better touch area
    button.style.WebkitTapHighlightColor = 'rgba(0,0,0,0)'; // Remove tap highlight on mobile
    button.style.userSelect = 'none'; // Prevent text selection
    button.style.touchAction = 'manipulation'; // Optimize for touch
    
    // Add hover effect for desktop
    button.addEventListener('mouseover', () => {
      button.style.backgroundColor = 'rgba(0, 229, 255, 0.3)';
      button.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.7)';
      button.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.backgroundColor = 'rgba(0, 229, 255, 0.2)';
      button.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.5)';
      button.style.transform = 'translateY(0)';
    });
    
    // Add touch feedback for mobile
    button.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Prevent default behavior
      button.style.backgroundColor = 'rgba(0, 229, 255, 0.4)';
      button.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.8)';
      button.style.transform = 'scale(0.98)';
    }, { passive: false });
    
    button.addEventListener('touchend', (e) => {
      e.preventDefault(); // Prevent default behavior
      button.style.backgroundColor = 'rgba(0, 229, 255, 0.2)';
      button.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.5)';
      button.style.transform = 'scale(1)';
      this.restartGame();
    }, { passive: false });
    
    // Add click event for desktop
    button.addEventListener('click', () => {
      this.restartGame();
    });
    
    // Add elements to crash screen
    this.crashScreen.appendChild(title);
    this.crashScreen.appendChild(button);
    
    // Add crash screen to document
    document.body.appendChild(this.crashScreen);
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.8; }
        50% { opacity: 1; }
        100% { opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);
    
    // Ensure the crash screen is properly sized on mobile
    if (this.isMobile) {
      // Force proper sizing on mobile
      window.setTimeout(() => {
        this.crashScreen.style.width = '100vw';
        this.crashScreen.style.height = '100vh';
        this.crashScreen.style.position = 'fixed';
      }, 100);
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
    try {
      if (!playerData || !playerData.id) {
        console.error('Invalid player data:', playerData);
        return;
      }
      
      log(`Adding player: ${playerData.id} (${playerData.username || 'Unknown'}) with color: ${playerData.color || 'default'}`);
      
      // Store player data
      this.players[playerData.id] = playerData;
      
      // If player ship already exists, just update its data
      if (this.playerShips[playerData.id]) {
        log(`Player ship already exists for ${playerData.id}, updating data`);
        
        // Update the username label if needed
        const ship = this.playerShips[playerData.id];
        if (ship) {
          // Remove old username label if it exists
          ship.children.forEach(child => {
            if (child.isSprite && child.userData && child.userData.type === 'nameTag') {
              ship.remove(child);
            }
          });
          
          // Add new username label
          const usernameLabel = this.createUsernameLabel(playerData.username || 'Unknown');
          ship.add(usernameLabel);
          ship.userData.nameTag = usernameLabel;
        }
        
        // Update player count
        this.updatePlayerCount();
        return;
      }
      
      // Create ship for the player
      if (!this.scene) {
        log('Scene not initialized, deferring ship creation');
        // Schedule a retry after scene is initialized
        setTimeout(() => {
          if (this.scene && this.players[playerData.id]) {
            log(`Retrying ship creation for player ${playerData.id} after scene init`);
            this.addPlayer(playerData);
          }
        }, 1000);
        
        // Update player count
        this.updatePlayerCount();
        return;
      }
      
      if (!window.spaceshipManager) {
        console.error('SpaceshipManager not available');
        // Schedule a retry after spaceshipManager is available
        setTimeout(() => {
          if (window.spaceshipManager && this.players[playerData.id]) {
            log(`Retrying ship creation for player ${playerData.id} after SpaceshipManager init`);
            this.addPlayer(playerData);
          }
        }, 1000);
        
        // Update player count
        this.updatePlayerCount();
        return;
      }
      
      // Use player's chosen color or fallback to default
      const playerColor = playerData.color || '#00FFFF'; // Default cyan color if no color provided
      log(`Creating ship for player ${playerData.id} with color: ${playerColor}`);
      
      const shipMesh = window.spaceshipManager.createSpaceship(playerColor);
      
      if (shipMesh) {
        // Set initial position and rotation
        if (playerData.position) {
          shipMesh.position.set(
            playerData.position.x || 0,
            playerData.position.y || 0,
            playerData.position.z || 0
          );
        } else {
          // Default position if none provided
          shipMesh.position.set(0, 50, 0);
        }
        
        if (playerData.rotation) {
          shipMesh.rotation.set(
            playerData.rotation.x || 0,
            playerData.rotation.y || 0,
            playerData.rotation.z || 0
          );
        }
        
        // Add username label above ship
        const usernameLabel = this.createUsernameLabel(playerData.username || 'Unknown');
        shipMesh.add(usernameLabel);
        shipMesh.userData.nameTag = usernameLabel;
        
        // Store the ship
        this.playerShips[playerData.id] = shipMesh;
        
        // Add to scene
        this.scene.add(shipMesh);
        
        log(`Created ship for player ${playerData.id} with color ${playerColor}`);
      } else {
        console.error(`Failed to create ship for player ${playerData.id}`);
        // Schedule a retry
        setTimeout(() => {
          if (this.players[playerData.id] && !this.playerShips[playerData.id]) {
            log(`Retrying ship creation for player ${playerData.id}`);
            this.addPlayer(playerData);
          }
        }, 1000);
      }
      
      // Initialize physics data for the player
      // ... existing code ...
    } catch (error) {
      console.error(`Error adding player ${playerData?.id}:`, error);
      // Schedule a retry after error
      setTimeout(() => {
        if (playerData && playerData.id && this.players[playerData.id] && !this.playerShips[playerData.id]) {
          log(`Retrying ship creation for player ${playerData.id} after error`);
          this.addPlayer(playerData);
        }
      }, 2000);
      
      // Still try to update player count even if there was an error
      try {
        this.updatePlayerCount();
      } catch (countError) {
        console.error('Error updating player count:', countError);
      }
    }
  }
  
  // Helper method to generate a random color for players
  getRandomPlayerColor() {
    const colors = [
      '#FF5733', // Red-Orange
      '#33FF57', // Green
      '#3357FF', // Blue
      '#FF33F5', // Pink
      '#F5FF33', // Yellow
      '#33FFF5', // Cyan
      '#FF3333', // Red
      '#33FF33', // Lime
      '#3333FF', // Blue
      '#FF33FF', // Magenta
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // Add method to create better username labels
  createUsernameLabel(username) {
    // Create a canvas for the username
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // Add a semi-transparent background for better visibility
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a border
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 3;
    context.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    
    // Set font and draw text
    context.font = 'Bold 40px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.fillText(username, 128, 64);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Create sprite material
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    
    // Create sprite
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(10, 5, 1);
    sprite.position.set(0, 12, 0); // Position higher above the ship for better visibility
    
    // Ensure the sprite is always visible
    sprite.renderOrder = 999;
    material.depthTest = false;
    
    // Store reference to the sprite
    sprite.userData = { type: 'nameTag', username: username };
    
    return sprite;
  }
  
  // Update the username tag to always face the camera
  updateUsernameTags() {
    try {
      // For each player ship, make sure the username tag faces the camera
      for (const playerId in this.playerShips) {
        const ship = this.playerShips[playerId];
        if (!ship) continue;
        
        // Find the username tag in the ship's children
        let nameTag = null;
        
        // First check if it's stored in userData
        if (ship.userData && ship.userData.nameTag) {
          nameTag = ship.userData.nameTag;
        } else {
          // Otherwise search through children
          ship.children.forEach(child => {
            if (child.isSprite && child.userData && child.userData.type === 'nameTag') {
              nameTag = child;
              // Store for future reference
              ship.userData = ship.userData || {};
              ship.userData.nameTag = nameTag;
            }
          });
        }
        
        if (nameTag) {
          // Username tags are sprites which automatically face the camera,
          // but we need to ensure they stay above the ship as it moves
          
          // Make sure the tag is visible from all angles
          nameTag.material.depthTest = false;
          nameTag.renderOrder = 999; // Render after everything else
          
          // Ensure the tag is positioned correctly above the ship
          nameTag.position.set(0, 10, 0);
          
          // If the player has a username in their data, update the tag if needed
          const player = this.players[playerId];
          if (player && player.username && nameTag.userData && 
              nameTag.userData.username !== player.username) {
            
            // Username changed, update the tag
            const newTag = this.createUsernameLabel(player.username);
            ship.remove(nameTag);
            ship.add(newTag);
            ship.userData.nameTag = newTag;
            
            log(`Updated username tag for player ${playerId} to ${player.username}`);
          }
        } else if (this.players[playerId] && this.players[playerId].username) {
          // No tag found but we have username data, create a new tag
          const newTag = this.createUsernameLabel(this.players[playerId].username);
          ship.add(newTag);
          ship.userData = ship.userData || {};
          ship.userData.nameTag = newTag;
          
          log(`Created missing username tag for player ${playerId}`);
        }
      }
    } catch (error) {
      console.error('Error updating username tags:', error);
    }
  }
  
  // Add updatePlayerCount method to GameManager class
  updatePlayerCount() {
    try {
      const count = Object.keys(this.players).length;
      const playerCountElement = document.getElementById('player-count');
      if (playerCountElement) {
        playerCountElement.innerHTML = `PILOTS ONLINE: ${count}`;
      }
      log(`Player count updated: ${count}`);
    } catch (error) {
      console.error('Error updating player count:', error);
    }
  }
  
  // Update remote players based on server data
  updatePlayers(players) {
    for (const id in players) {
      if (!this.players[id]) {
        this.addPlayer(players[id]);
      } else if (id !== this.localPlayerId) {
        const playerData = players[id];
        const ship = this.playerShips[id];
        if (ship) {
          // Update ship position and rotation with smooth interpolation
          ship.position.lerp(new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
          ), 0.2);
          
          ship.rotation.x += (playerData.rotation.x - ship.rotation.x) * 0.2;
          ship.rotation.y += (playerData.rotation.y - ship.rotation.y) * 0.2;
          ship.rotation.z += (playerData.rotation.z - ship.rotation.z) * 0.2;
          
          // Update trail for remote player
          if (playerData.trailActive) {
            this.updateTrail(id, ship.position.clone(), playerData.color);
          } else if (this.playerTrails[id] && this.playerTrails[id].segments.length > 0) {
            // Clear trail when not active
            this.playerTrails[id].segments = [];
            if (this.playerTrails[id].mesh && this.playerTrails[id].mesh.geometry) {
              this.playerTrails[id].mesh.geometry.dispose();
              this.playerTrails[id].mesh.geometry = new THREE.BufferGeometry();
            }
          }
          
          this.players[id] = playerData;
        }
      }
    }
    
    // Handle players that are no longer in the game
    for (const id in this.players) {
      if (!players[id] && id !== this.localPlayerId) {
        this.handleCrash(id, this.playerShips[id]?.position || new THREE.Vector3());
        this.removePlayer(id);
      }
    }
    
    this.updatePlayerCount();
  }
  
  // Remove a player from the game
  removePlayer(playerId) {
    try {
      if (!playerId || !this.players[playerId]) {
        return;
      }
      
      log(`Removing player: ${playerId}`);
      
      // Remove the ship from the scene
      if (this.playerShips[playerId]) {
        const ship = this.playerShips[playerId];
        
        // Clean up any materials and textures
        ship.traverse(object => {
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                if (material.map) material.map.dispose();
                material.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
          
          if (object.geometry) {
            object.geometry.dispose();
          }
        });
        
        // Remove from scene
        this.scene.remove(ship);
        delete this.playerShips[playerId];
      }
      
      // Remove physics data
      if (this.shipPhysics[playerId]) {
        delete this.shipPhysics[playerId];
      }
      
      // Remove player data
      delete this.players[playerId];
      
      // Update player count
      this.updatePlayerCount();
      
      log(`Player ${playerId} removed from game`);
    } catch (error) {
      console.error(`Error removing player ${playerId}:`, error);
    }
  }
  
  // Create speed lines for movement feedback
  createSpeedLines() {
    try {
      log('Creating speed lines for movement feedback');
      
      // Create a group to hold all speed lines
      this.speedLines = new THREE.Group();
      this.scene.add(this.speedLines);
      
      // Number of lines to create
      const lineCount = 100;
      
      // Create line material
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4
      });
      
      // Create lines
      for (let i = 0; i < lineCount; i++) {
        // Create random line geometry
        const lineGeometry = new THREE.BufferGeometry();
        
        // Create a single line segment
        const points = [];
        
        // Random position within a cylinder around the camera
        const radius = 20 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;
        const length = 2 + Math.random() * 8;
        
        const x = Math.cos(angle) * radius;
        const y = Math.random() * 40 - 20;
        const z = Math.sin(angle) * radius;
        
        // Line start and end points
        points.push(new THREE.Vector3(x, y, z));
        points.push(new THREE.Vector3(x, y, z - length));
        
        // Set geometry attributes
        lineGeometry.setFromPoints(points);
        
        // Create line
        const line = new THREE.Line(lineGeometry, lineMaterial);
        
        // Store original position for animation
        line.userData = {
          originalPosition: new THREE.Vector3(x, y, z),
          length: length,
          speed: 0.1 + Math.random() * 0.3
        };
        
        // Add to group
        this.speedLines.add(line);
      }
      
      // Initially hide speed lines
      this.speedLines.visible = false;
      
      log('Speed lines created successfully');
    } catch (error) {
      console.error('Error creating speed lines:', error);
    }
  }
  
  // Update speed lines based on player velocity
  updateSpeedLines() {
    try {
      // Skip if speed lines aren't created yet
      if (!this.speedLines) return;
      
      // Get local player and physics
      if (!this.localPlayerId || !this.playerShips[this.localPlayerId]) {
        this.speedLines.visible = false;
        return;
      }
      
      const physics = this.shipPhysics[this.localPlayerId];
      if (!physics) {
        this.speedLines.visible = false;
        return;
      }
      
      // Get velocity magnitude
      const speed = physics.velocity.length();
      
      // Show speed lines only when moving fast enough
      if (speed > 1.0) {
        this.speedLines.visible = true;
        
        // Position speed lines relative to the camera
        this.speedLines.position.copy(this.camera.position);
        this.speedLines.rotation.copy(this.camera.rotation);
        
        // Update each line
        this.speedLines.children.forEach(line => {
          // Get points from the line
          const positions = line.geometry.attributes.position.array;
          
          // Move the line forward
          positions[2] -= line.userData.speed * speed;
          positions[5] -= line.userData.speed * speed;
          
          // Reset the line if it's too far
          if (positions[2] < -50) {
            positions[0] = line.userData.originalPosition.x;
            positions[1] = line.userData.originalPosition.y;
            positions[2] = line.userData.originalPosition.z;
            
            positions[3] = line.userData.originalPosition.x;
            positions[4] = line.userData.originalPosition.y;
            positions[5] = line.userData.originalPosition.z - line.userData.length;
          }
          
          // Update the geometry
          line.geometry.attributes.position.needsUpdate = true;
        });
        
        // Adjust opacity based on speed
        const opacity = Math.min(0.1 + speed * 0.1, 0.8);
        this.speedLines.children.forEach(line => {
          line.material.opacity = opacity;
        });
      } else {
        this.speedLines.visible = false;
      }
    } catch (error) {
      console.error('Error updating speed lines:', error);
    }
  }
  
  // Apply gravitational forces from celestial objects
  applyGravitationalForces(ship, physics) {
    try {
      // Skip if no celestial objects
      if (!this.celestialObjects) return;
      
      // Gravitational constant (adjusted for gameplay)
      const G = 0.5;
      
      // Apply force from planets
      if (this.celestialObjects.planets) {
        this.celestialObjects.planets.forEach(planet => {
          // Vector from ship to planet
          const direction = new THREE.Vector3();
          direction.subVectors(planet.position, ship.position);
          
          // Distance squared (for inverse square law)
          const distanceSquared = direction.lengthSq();
          
          // Skip if too far away
          if (distanceSquared > 10000) return;
          
          // Normalize direction
          direction.normalize();
          
          // Calculate force magnitude (F = G * m1 * m2 / r^2)
          // We'll use planet.scale as a proxy for mass
          const planetMass = planet.scale.x * 10;
          const forceMagnitude = G * planetMass / distanceSquared;
          
          // Apply force to acceleration
          const force = direction.multiplyScalar(forceMagnitude);
          physics.acceleration.add(force);
        });
      }
      
      // Apply force from sun (if exists)
      if (this.celestialObjects.sun) {
        // Vector from ship to sun
        const direction = new THREE.Vector3();
        direction.subVectors(this.celestialObjects.sun.position, ship.position);
        
        // Distance squared (for inverse square law)
        const distanceSquared = direction.lengthSq();
        
        // Skip if too far away
        if (distanceSquared > 50000) return;
        
        // Normalize direction
        direction.normalize();
        
        // Calculate force magnitude (F = G * m1 * m2 / r^2)
        // Sun has much more mass than planets
        const sunMass = 100;
        const forceMagnitude = G * sunMass / distanceSquared;
        
        // Apply force to acceleration
        const force = direction.multiplyScalar(forceMagnitude);
        physics.acceleration.add(force);
      }
    } catch (error) {
      console.error('Error applying gravitational forces:', error);
    }
  }
  
  // Handle player crash
  handleCrash(playerId, position) {
    const ship = this.playerShips[playerId];
    if (!ship) return;
    
    log(`Player ${playerId} crashed at ${position.x}, ${position.y}, ${position.z}`);
    ship.visible = false;
    
    // Remove trail
    if (this.playerTrails[playerId]) {
      this.scene.remove(this.playerTrails[playerId].mesh);
      this.playerTrails[playerId].mesh.geometry.dispose();
      this.playerTrails[playerId].mesh.material.dispose();
      delete this.playerTrails[playerId];
    }
    
    this.createCollisionEffect(position);
    this.playCollisionSound();
    
    if (playerId === this.localPlayerId) {
      this.showCrashScreen();
      
      // Notify server of crash (optional for multiplayer sync)
      if (window.wsManager && window.wsManager.isConnected()) {
        window.wsManager.sendMessage({ type: 'playerCrashed', playerId });
      }
    }
  }
  
  // Create and update player trail
  updateTrail(playerId, position, color) {
    // Get player color from player data if available
    if (!color && this.players[playerId] && this.players[playerId].color) {
      color = this.players[playerId].color;
    }
    
    // Convert string color to hex if needed
    const colorHex = (typeof color === 'string') ? 
      new THREE.Color(color).getHex() : (color || 0x00ffff);
    
    if (!this.playerTrails[playerId]) {
      const material = new THREE.MeshBasicMaterial({
        color: colorHex, // Use player's color
        emissive: colorHex,
        emissiveIntensity: 1,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      const geometry = new THREE.BufferGeometry();
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
      
      // Add a point light to make the trail glow
      const light = new THREE.PointLight(colorHex, 0.5, 10);
      mesh.add(light);
      
      this.playerTrails[playerId] = { 
        mesh, 
        segments: [],
        color: colorHex
      };
      
      log(`Created trail for player ${playerId} with color ${color}`);
    }
    
    const trail = this.playerTrails[playerId];
    
    // Only add a new segment if it's far enough from the last one
    const lastPos = trail.segments.length > 0 ? trail.segments[trail.segments.length - 1] : null;
    if (!lastPos || lastPos.distanceTo(position) > 1.0) {
      trail.segments.push(position);
      
      // Update light position to follow the end of the trail
      if (trail.light) {
        trail.light.position.copy(position);
      }
      
      // Limit trail length for performance
      if (trail.segments.length > 100) {
        trail.segments.shift();
      }
      
      // Update trail geometry
      if (trail.segments.length > 1) {
        trail.mesh.geometry.dispose(); // Clean up old geometry
        
        // Create a tube geometry following the trail path
        const path = new THREE.CatmullRomCurve3(trail.segments);
        trail.mesh.geometry = new THREE.TubeGeometry(
          path,
          trail.segments.length - 1, // Segments
          0.5, // Radius
          8, // Radial segments
          false // Closed
        );
      }
    }
  }
  
  // Check if a ship collides with a trail
  checkTrailCollision(shipPosition, trail) {
    if (!trail.segments || trail.segments.length < 2) return null;
    
    const shipRadius = 5; // Approximate ship size
    const trailRadius = 0.5; // Trail radius
    const collisionThreshold = shipRadius + trailRadius;
    
    // Check each segment of the trail
    for (let i = 0; i < trail.segments.length - 1; i++) {
      const start = trail.segments[i];
      const end = trail.segments[i + 1];
      
      // Calculate closest point on line segment to ship position
      const line = end.clone().sub(start);
      const lineLength = line.length();
      const lineDirection = line.clone().normalize();
      
      const shipToStart = shipPosition.clone().sub(start);
      const projection = shipToStart.dot(lineDirection);
      
      let closestPoint;
      if (projection <= 0) {
        closestPoint = start.clone();
      } else if (projection >= lineLength) {
        closestPoint = end.clone();
      } else {
        closestPoint = start.clone().add(lineDirection.multiplyScalar(projection));
      }
      
      const distance = shipPosition.distanceTo(closestPoint);
      if (distance < collisionThreshold) {
        return { 
          collided: true, 
          position: closestPoint,
          distance: distance
        };
      }
    }
    
    return null;
  }
  
  // Setup touch controls for mobile devices
  setupTouchControls() {
    // Get control elements
    const thrustButton = document.getElementById('thrust-button');
    const rightJoystick = document.getElementById('right-joystick');
    const boostButton = document.getElementById('boost-button');
    
    if (!thrustButton || !rightJoystick) {
      console.error('Touch control elements not found in the DOM');
      return;
    }
    
    // Get joystick knob
    const rightKnob = rightJoystick.querySelector('.joystick-knob');
    
    if (!rightKnob) {
      console.error('Joystick knob element not found in the DOM');
      return;
    }
    
    // Helper function to update knob position
    const updateKnobPosition = (knob, deltaX, deltaY) => {
      const maxRadius = 35; // Maximum distance the knob can move from center
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Clamp the distance to the maximum radius
      if (distance > maxRadius) {
        deltaX = (deltaX / distance) * maxRadius;
        deltaY = (deltaY / distance) * maxRadius;
      }
      
      // Update knob position
      knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
    };
    
    // Reset knob position
    const resetKnobPosition = (knob) => {
      knob.style.transform = 'translate(-50%, -50%)';
    };
    
    // Touch start event handler
    document.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Prevent default browser behavior
      
      // Process each touch
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchX = touch.clientX;
        const touchY = touch.clientY;
        
        // Check if touch is on thrust button
        if (this.isTouchOnElement(touch, thrustButton) && !this.touchState.thrustButton.active) {
          this.touchState.thrustButton.active = true;
          this.touchState.thrustButton.id = touch.identifier;
          // Make the thrust button control yaw instead
          this.keyState.yawLeft = true;
          thrustButton.style.backgroundColor = 'rgba(0, 229, 255, 0.5)';
          thrustButton.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.7)';
          thrustButton.style.transform = 'scale(0.95)';
        }
        // Check if touch is on right joystick
        else if (this.isTouchOnElement(touch, rightJoystick) && !this.touchState.rightJoystick.active) {
          this.touchState.rightJoystick.active = true;
          this.touchState.rightJoystick.id = touch.identifier;
          this.touchState.rightJoystick.startX = touchX;
          this.touchState.rightJoystick.startY = touchY;
          this.touchState.rightJoystick.currentX = touchX;
          this.touchState.rightJoystick.currentY = touchY;
          this.touchState.rightJoystick.deltaX = 0;
          this.touchState.rightJoystick.deltaY = 0;
        }
        // Check if touch is on boost button
        else if (boostButton && this.isTouchOnElement(touch, boostButton)) {
          this.touchState.boostButton.active = true;
          this.touchState.boostButton.id = touch.identifier;
          this.keyState.boost = true;
          boostButton.style.backgroundColor = 'rgba(255, 0, 229, 0.5)';
        }
      }
    }, { passive: false });
    
    // Touch move event handler
    document.addEventListener('touchmove', (e) => {
      e.preventDefault(); // Prevent default browser behavior
      
      // Process each touch
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        // Update right joystick
        if (this.touchState.rightJoystick.active && touch.identifier === this.touchState.rightJoystick.id) {
          this.touchState.rightJoystick.currentX = touch.clientX;
          this.touchState.rightJoystick.currentY = touch.clientY;
          this.touchState.rightJoystick.deltaX = touch.clientX - this.touchState.rightJoystick.startX;
          this.touchState.rightJoystick.deltaY = touch.clientY - this.touchState.rightJoystick.startY;
          
          // Update knob position
          updateKnobPosition(rightKnob, this.touchState.rightJoystick.deltaX, this.touchState.rightJoystick.deltaY);
        }
      }
    }, { passive: false });
    
    // Touch end event handler
    document.addEventListener('touchend', (e) => {
      e.preventDefault(); // Prevent default browser behavior
      
      // Process each touch
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        
        // Reset thrust button
        if (this.touchState.thrustButton.active && touch.identifier === this.touchState.thrustButton.id) {
          this.touchState.thrustButton.active = false;
          // Reset yaw control
          this.keyState.yawLeft = false;
          thrustButton.style.backgroundColor = 'rgba(0, 229, 255, 0.2)';
          thrustButton.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.3)';
          thrustButton.style.transform = 'scale(1)';
        }
        // Reset right joystick
        else if (this.touchState.rightJoystick.active && touch.identifier === this.touchState.rightJoystick.id) {
          this.touchState.rightJoystick.active = false;
          this.touchState.rightJoystick.deltaX = 0;
          this.touchState.rightJoystick.deltaY = 0;
          resetKnobPosition(rightKnob);
        }
        // Reset boost button
        else if (this.touchState.boostButton.active && touch.identifier === this.touchState.boostButton.id) {
          this.touchState.boostButton.active = false;
          this.keyState.boost = false;
          if (boostButton) {
            boostButton.style.backgroundColor = 'rgba(255, 0, 229, 0.2)';
          }
        }
      }
    }, { passive: false });
    
    // Touch cancel event handler
    document.addEventListener('touchcancel', (e) => {
      e.preventDefault(); // Prevent default browser behavior
      
      // Reset all touch states
      this.touchState.thrustButton.active = false;
      this.touchState.rightJoystick.active = false;
      this.touchState.boostButton.active = false;
      
      // Reset key states
      this.keyState.thrustForward = false;
      this.keyState.boost = false;
      
      // Reset visual elements
      thrustButton.style.backgroundColor = 'rgba(0, 229, 255, 0.2)';
      thrustButton.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.3)';
      thrustButton.style.transform = 'scale(1)';
      
      // Reset knob position
      resetKnobPosition(rightKnob);
      
      // Reset boost button
      if (boostButton) {
        boostButton.style.backgroundColor = 'rgba(255, 0, 229, 0.2)';
      }
    }, { passive: false });
  }
  
  // Check if a touch is on a specific element
  isTouchOnElement(touch, element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    );
  }
  
  // Update key state from touch controls
  updateKeyStateFromTouchControls() {
    if (!this.isMobile) return;
    
    // Thrust button directly sets the thrustForward key state
    // (This is now handled in the touch event handlers)
    
    // Right joystick controls turning and strafing (reverting to original behavior)
    const rightJoystick = this.touchState.rightJoystick;
    if (rightJoystick.active) {
      // Normalize joystick values to -1 to 1 range
      const maxRadius = 35;
      const rightX = Math.max(-1, Math.min(1, rightJoystick.deltaX / maxRadius));
      const rightY = Math.max(-1, Math.min(1, rightJoystick.deltaY / maxRadius));
      
      // Set key states based on joystick position (reverted to original controls)
      this.keyState.strafeLeft = rightX < -0.3;
      this.keyState.strafeRight = rightX > 0.3;
      this.keyState.thrustForward = rightY < -0.3;
      this.keyState.thrustBackward = rightY > 0.3;
    }
    
    // Boost button sets the boost key state
    // (This is now handled in the touch event handlers)
  }
} 