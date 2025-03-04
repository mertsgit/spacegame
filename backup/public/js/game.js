// Game Manager
class GameManager {
  constructor() {
    // Game properties
    this.initialized = false;
    this.players = {};
    this.localPlayerId = null;
    this.playerShips = {};
    
    // Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    
    // DOM elements
    this.container = document.getElementById('game-container');
    this.playersCountElement = document.getElementById('players-count');
    
    // Game state
    this.lastUpdateTime = 0;
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      pitchUp: false,
      pitchDown: false,
      rotateLeft: false,
      rotateRight: false,
      rollLeft: false,
      rollRight: false,
      boost: false,
      brake: false
    };
    this.isRunning = false;
    this.lastTime = 0;
    this.deltaTime = 0;
    this.pointerLocked = false;
    
    // Physics properties
    this.physics = {
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      maxSpeed: 90, // Normal maximum speed in km/s
      boostSpeed: 200, // Boosted maximum speed in km/s
      acceleration: 15, // Acceleration in km/s²
      deceleration: 0.01, // Damping factor (reduced for more gliding)
      rotationAcceleration: 0.8, // Rotation speed
      rotationDeceleration: 0.03, // Damping for rotation (reduced for more momentum)
      boostMultiplier: 2.0,
      brakeMultiplier: 3.0
    };
    
    // Managers
    this.spaceshipManager = null;
    this.celestialBodiesManager = null;
    this.websocketManager = null;
    this.loginManager = null;
    
    // HUD elements
    this.speedometer = null;
    this.playerCounter = null;
    this.controlsHelp = null;
    this.gravityIndicator = null;
    
    // Bind methods
    this.animate = this.animate.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
  }
  
  init() {
    console.log('Game initialization started');
    
    // Get the player ID from the login manager or window global
    if (window.loginManager && window.loginManager.playerId) {
      this.localPlayerId = window.loginManager.playerId;
      console.log('Local player ID from login manager: ' + this.localPlayerId);
    } else if (window.playerID) {
      this.localPlayerId = window.playerID;
      console.log('Local player ID from window global: ' + this.localPlayerId);
    } else {
      console.error('Login manager not found or player ID not set');
      // Try to get a test player ID for debugging
      this.localPlayerId = 'test_player_' + Math.random().toString(36).substring(2, 8);
      console.log('Using test player ID: ' + this.localPlayerId);
    }
    
    // Initialize scene if not already done
    if (!this.scene) {
      console.log('Initializing scene');
      this.initScene();
    } else {
      console.log('Scene already initialized');
    }
    
    // Set up event listeners if not already done
    this.setupEventListeners();
    
    // Set last update time
    this.lastUpdateTime = performance.now();
    
    // Start animation loop if not already running
    if (!this.animationStarted) {
      console.log('Starting animation loop');
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
      this.animationStarted = true;
    }
    
    // Set initialized flag
    this.initialized = true;
    
    // Create player ship if we have a valid player ID
    if (this.localPlayerId && window.spaceshipManager) {
      setTimeout(() => {
        if (this.forceCreatePlayerShip) {
          console.log('Creating player ship for ID: ' + this.localPlayerId);
          this.forceCreatePlayerShip();
        }
      }, 500);
    }
    
    console.log('Game initialization completed');
  }
  
  initScene() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      10000
    );
    this.camera.position.set(0, 10, 30);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000);
    document.getElementById('game-container').appendChild(this.renderer.domElement);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
    this.scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
    
    // Add hemisphere light for better overall lighting
    const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    this.scene.add(hemisphereLight);
    
    // Initialize OrbitControls if available, otherwise set up to try again later
    this.initOrbitControls();
    
    // Set up retry for orbit controls
    if (!this.controls) {
      console.log('Setting up OrbitControls retry mechanism');
      this.orbitControlsRetryCount = 0;
      this.orbitControlsRetryInterval = setInterval(() => {
        this.orbitControlsRetryCount++;
        console.log(`Retrying OrbitControls initialization (attempt ${this.orbitControlsRetryCount})`);
        if (this.initOrbitControls() || this.orbitControlsRetryCount > 5) {
          clearInterval(this.orbitControlsRetryInterval);
        }
      }, 1000);
    }
    
    // Initialize physics
    this.physics = {
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      acceleration: new THREE.Vector3(0, 0, 0),
      angularAcceleration: new THREE.Vector3(0, 0, 0),
      drag: 0.1,
      angularDrag: 0.1
    };
    
    // Add stars
    this.addStars();
    
    // Create celestial bodies
    if (!this.celestialBodiesManager) {
      try {
        console.log('Creating celestial bodies with basic materials');
        this.celestialBodiesManager = new CelestialBodiesManager(this.scene);
        console.log('Celestial bodies created successfully');
      } catch (error) {
        console.error('Error creating celestial bodies:', error);
      }
    }
    
    // Initialize key state
    this.keys = {};
    
    // Initialize player collections
    this.players = {};
    this.playerShips = {};
    
    // Add HUD
    this.addHUD();
    
    // Add event listener for window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  // New method to initialize OrbitControls separately
  initOrbitControls() {
    try {
      if (typeof THREE.OrbitControls === 'function') {
        console.log('OrbitControls available, initializing...');
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        console.log('OrbitControls initialized successfully');
        return true;
      } else {
        console.log('THREE.OrbitControls not available, skipping controls initialization');
        return false;
      }
    } catch (error) {
      console.error('Error initializing OrbitControls:', error);
      return false;
    }
  }
  
  addStars() {
    // Create a detailed starfield with multiple layers
    
    // Distant stars (small, numerous)
    this.createStarLayer(20000, 4000, 0.3, 0.8, [0xffffff, 0xffffee, 0xeeeeff]);
    
    // Mid-distance stars (medium size, some color variation)
    this.createStarLayer(8000, 3000, 0.8, 1.5, [0xffff88, 0xffffaa, 0xffdddd, 0xddddff]);
    
    // Nearby bright stars (larger, colorful)
    this.createStarLayer(2000, 2500, 1.5, 3.0, [0x00ffff, 0xaaffff, 0xffaaff, 0xffaa66, 0x88aaff]);
    
    // Add a few very bright stars
    this.createBrightStars(50, 2000);
  }
  
  createStarLayer(count, distance, minSize, maxSize, colors) {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const positions = [];
    const colorArray = [];
    const sizes = [];
    
    for (let i = 0; i < count; i++) {
      // Position
      const x = THREE.MathUtils.randFloatSpread(distance);
      const y = THREE.MathUtils.randFloatSpread(distance);
      const z = THREE.MathUtils.randFloatSpread(distance);
      positions.push(x, y, z);
      
      // Random size
      const size = minSize + Math.random() * (maxSize - minSize);
      sizes.push(size);
      
      // Random color from the provided colors array
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      colorArray.push(color.r, color.g, color.b);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
    starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }
  
  createBrightStars(count, distance) {
    // Create a few very bright stars with lens flare effect
    const textureLoader = new THREE.TextureLoader();
    const flareTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/lensflare/lensflare0.png');
    
    for (let i = 0; i < count; i++) {
      // Random position
      const x = THREE.MathUtils.randFloatSpread(distance);
      const y = THREE.MathUtils.randFloatSpread(distance);
      const z = THREE.MathUtils.randFloatSpread(distance);
      
      // Create a sprite for the star
      const starMaterial = new THREE.SpriteMaterial({
        map: flareTexture,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending
      });
      
      const star = new THREE.Sprite(starMaterial);
      star.position.set(x, y, z);
      
      // Random size (larger than regular stars)
      const size = 5 + Math.random() * 15;
      star.scale.set(size, size, 1);
      
      this.scene.add(star);
    }
  }
  
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  handleKeyDown(event) {
    this.updateKeyState(event.code, true);
  }
  
  handleKeyUp(event) {
    this.updateKeyState(event.code, false);
  }
  
  updateKeyState(code, isPressed) {
    switch (code) {
      // Forward/backward acceleration
      case 'KeyW':
        this.keys.forward = isPressed;
        break;
      case 'KeyS':
        this.keys.backward = isPressed;
        break;
        
      // Left/right rotation
      case 'KeyA':
        this.keys.rotateLeft = isPressed;
        break;
      case 'KeyD':
        this.keys.rotateRight = isPressed;
        break;
        
      // Arrow keys for rotation and direction
      case 'ArrowUp':
        this.keys.pitchUp = isPressed;
        break;
      case 'ArrowDown':
        this.keys.pitchDown = isPressed;
        break;
      case 'ArrowLeft':
        this.keys.rotateLeft = isPressed;
        break;
      case 'ArrowRight':
        this.keys.rotateRight = isPressed;
        break;
        
      // Up/down
      case 'KeyQ':
        this.keys.up = isPressed;
        break;
      case 'KeyE':
        this.keys.down = isPressed;
        break;
        
      // Pitch (alternative)
      case 'KeyI':
        this.keys.pitchUp = isPressed;
        break;
      case 'KeyK':
        this.keys.pitchDown = isPressed;
        break;
        
      // Roll
      case 'KeyJ':
        this.keys.rollLeft = isPressed;
        break;
      case 'KeyL':
        this.keys.rollRight = isPressed;
        break;
        
      // Boost/brake
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.boost = isPressed;
        break;
      case 'Space':
        this.keys.brake = isPressed;
        break;
    }
  }
  
  updateLocalPlayer(deltaTime) {
    if (!this.localPlayerId || !this.playerShips[this.localPlayerId]) return;
    
    const ship = this.playerShips[this.localPlayerId];
    
    // Apply physics
    this.updateShipPhysics(ship, deltaTime);
    
    // Update camera position to follow the ship with smoother motion
    this.updateCamera(ship, deltaTime);
    
    // Send position update to server
    if (window.webSocketManager && window.webSocketManager.isConnected()) {
      window.webSocketManager.sendMessage({
        type: 'position',
        position: {
          x: ship.position.x,
          y: ship.position.y,
          z: ship.position.z
        },
        rotation: {
          x: ship.rotation.x,
          y: ship.rotation.y,
          z: ship.rotation.z
        }
      });
    }
    
    // Update HUD
    this.updateHUD();
  }
  
  updateShipPhysics(ship, deltaTime) {
    if (!ship) return;
    
    // Initialize velocity and rotationVelocity if they don't exist
    if (!ship.userData.velocity) {
      ship.userData.velocity = new THREE.Vector3(0, 0, 0);
    }
    
    if (!ship.userData.rotationVelocity) {
      ship.userData.rotationVelocity = new THREE.Vector3(0, 0, 0);
    }
    
    // Get current position and velocity
    const position = ship.position.clone();
    const velocity = ship.userData.velocity.clone();
    const rotation = ship.rotation.clone();
    const rotationVelocity = ship.userData.rotationVelocity.clone();
    
    // Get ship direction vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.quaternion);
    
    // Initialize acceleration
    let acceleration = new THREE.Vector3(0, 0, 0);
    
    // Apply boost or brake multipliers
    let accelerationMultiplier = 1.0;
    let currentMaxSpeed = this.physics.maxSpeed;
    
    if (this.keys.boost) {
      accelerationMultiplier = this.physics.boostMultiplier;
      currentMaxSpeed = this.physics.boostSpeed;
    } else if (this.keys.brake) {
      // Apply brakes (stronger deceleration)
      velocity.multiplyScalar(1 - (this.physics.brakeMultiplier * deltaTime));
    }
    
    // Track active thrusters for visual effects
    const activeThrusters = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
      pitchUp: false,
      pitchDown: false,
      yawLeft: false,
      yawRight: false,
      rollLeft: false,
      rollRight: false
    };
    
    // Apply forward/backward acceleration
    if (this.keys.forward) {
      acceleration.add(forward.clone().multiplyScalar(this.physics.acceleration * accelerationMultiplier));
      activeThrusters.forward = true;
    }
    if (this.keys.backward) {
      acceleration.add(forward.clone().multiplyScalar(-this.physics.acceleration * 0.7)); // Backward thrust is weaker
      activeThrusters.backward = true;
    }
    
    // Apply up/down acceleration
    if (this.keys.up) {
      acceleration.add(up.clone().multiplyScalar(this.physics.acceleration * 0.5)); // Vertical thrust is weaker
      activeThrusters.up = true;
    }
    if (this.keys.down) {
      acceleration.add(up.clone().multiplyScalar(-this.physics.acceleration * 0.5)); // Vertical thrust is weaker
      activeThrusters.down = true;
    }
    
    // Apply rotation
    let rotationAcceleration = new THREE.Vector3(0, 0, 0);
    
    if (this.keys.pitchUp) {
      rotationAcceleration.x -= this.physics.rotationAcceleration;
      activeThrusters.pitchUp = true;
    }
    if (this.keys.pitchDown) {
      rotationAcceleration.x += this.physics.rotationAcceleration;
      activeThrusters.pitchDown = true;
    }
    if (this.keys.rotateLeft) {
      rotationAcceleration.y -= this.physics.rotationAcceleration;
      activeThrusters.yawLeft = true;
    }
    if (this.keys.rotateRight) {
      rotationAcceleration.y += this.physics.rotationAcceleration;
      activeThrusters.yawRight = true;
    }
    if (this.keys.rollLeft) {
      rotationAcceleration.z += this.physics.rotationAcceleration;
      activeThrusters.rollLeft = true;
    }
    if (this.keys.rollRight) {
      rotationAcceleration.z -= this.physics.rotationAcceleration;
      activeThrusters.rollRight = true;
    }
    
    // Apply gravitational acceleration
    const gravitationalAcceleration = this.calculateGravitationalAcceleration(position);
    acceleration.add(gravitationalAcceleration);
    
    // Update the gravity indicator in the HUD
    this.updateGravityIndicator(gravitationalAcceleration);
    
    // Apply acceleration to velocity with momentum (reduced damping for more gliding)
    velocity.add(acceleration.clone().multiplyScalar(deltaTime));
    
    // Apply natural damping (lower value for more gliding feeling)
    velocity.multiplyScalar(1 - this.physics.deceleration);
    
    // Apply rotation acceleration to rotation velocity
    rotationVelocity.add(rotationAcceleration.clone().multiplyScalar(deltaTime));
    
    // Apply natural rotation damping (lower value for more momentum in rotation)
    rotationVelocity.multiplyScalar(1 - this.physics.rotationDeceleration);
    
    // Check if speed exceeds maximum
    const speed = velocity.length();
    if (speed > currentMaxSpeed) {
      velocity.normalize().multiplyScalar(currentMaxSpeed);
    }
    
    // Update ship's velocity
    ship.userData.velocity.copy(velocity);
    ship.userData.rotationVelocity.copy(rotationVelocity);
    
    // Calculate new position
    const newPosition = position.clone().add(velocity.clone().multiplyScalar(deltaTime));
    
    // Check for collisions
    const collision = this.checkCollisions(position, newPosition);
    if (collision) {
      this.handleCollision(collision);
      return; // Skip the rest of the physics update
    }
    
    // Update ship position
    ship.position.copy(newPosition);
    
    // Update ship rotation
    ship.rotation.x += rotationVelocity.x * deltaTime;
    ship.rotation.y += rotationVelocity.y * deltaTime;
    ship.rotation.z += rotationVelocity.z * deltaTime;
    
    // Update engine visual effects based on acceleration
    this.updateEngineEffects(ship, acceleration.length());
    
    // Update maneuvering thrusters visual effects
    this.updateManeuveringThrusters(ship, activeThrusters);
    
    // Update ship's speed display
    if (ship.userData.id === this.localPlayerId) {
      const speedKmS = speed;
      this.updateSpeedDisplay(speedKmS);
    }
    
    // Send position update to server if this is the local player
    if (ship.userData.id === this.localPlayerId && this.websocketManager) {
      this.websocketManager.sendPlayerUpdate({
        position: ship.position,
        rotation: ship.rotation,
        velocity: ship.userData.velocity
      });
    }
  }
  
  calculateGravitationalAcceleration(shipPosition) {
    // Get celestial bodies
    const celestialBodies = window.celestialBodiesManager ? window.celestialBodiesManager.celestialBodies : [];
    
    // Initialize total gravitational acceleration
    const totalAcceleration = new THREE.Vector3(0, 0, 0);
    
    // Ship mass (assumed to be 1000 kg for simplicity)
    const shipMass = 1000;
    
    // Calculate gravitational force from each celestial body
    for (const body of celestialBodies) {
      if (body.userData && body.userData.mass) {
        // Get gravitational force
        const force = window.celestialBodiesManager.calculateGravitationalForce(
          shipPosition,
          shipMass,
          body.position,
          body.userData.mass
        );
        
        // Convert force to acceleration (F = ma, so a = F/m)
        const acceleration = force.divideScalar(shipMass);
        
        // Add to total acceleration
        totalAcceleration.add(acceleration);
      }
    }
    
    return totalAcceleration;
  }
  
  checkCollisions(currentPosition, newPosition) {
    // Get celestial bodies from the manager
    const celestialBodies = window.celestialBodiesManager ? window.celestialBodiesManager.celestialBodies : [];
    
    // If no celestial bodies, return null (no collision)
    if (!celestialBodies || celestialBodies.length === 0) {
      return null;
    }
    
    // Check each celestial body
    for (const body of celestialBodies) {
      // Skip the sun (too far away and too big)
      if (body.userData && body.userData.type === 'sun') continue;
      
      // Skip if body has no position
      if (!body.position) continue;
      
      // Get body radius (default to 10 if not specified)
      const bodyRadius = body.userData && body.userData.radius ? body.userData.radius : 10;
      
      // Calculate distance from ship to celestial body
      const distance = body.position.distanceTo(newPosition);
      
      // Check if ship is inside the celestial body (collision)
      if (distance < bodyRadius + 5) { // 5 is ship radius (approximate)
        // Calculate collision normal (direction from body center to ship)
        const normal = new THREE.Vector3().subVectors(newPosition, body.position).normalize();
        
        // Calculate collision position (on the surface of the celestial body)
        const collisionPosition = body.position.clone().add(normal.clone().multiplyScalar(bodyRadius));
        
        // Return collision data
        return {
          collided: true,
          position: collisionPosition,
          normal: normal,
          celestialBody: body
        };
      }
    }
    
    // No collision detected
    return null;
  }
  
  handleCollision(collision) {
    // Check if collision object is valid
    if (!collision || !collision.position || !collision.normal) {
      console.warn("Invalid collision object:", collision);
      return;
    }
    
    // Get the ship
    const ship = this.playerShips[this.localPlayerId];
    if (!ship) {
      console.warn("Ship not found for collision handling");
      return;
    }
    
    // Set ship position to collision point
    ship.position.copy(collision.position);
    
    // Calculate reflection vector for velocity
    const reflectionVector = collision.normal.clone().multiplyScalar(2 * ship.userData.velocity.dot(collision.normal));
    ship.userData.velocity.sub(reflectionVector);
    
    // Reduce velocity (energy loss in collision)
    ship.userData.velocity.multiplyScalar(0.5);
    
    // Add some random rotation (impact effect)
    ship.userData.rotationVelocity.add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    ));
    
    // Create collision effect
    this.createCollisionEffect(collision.position);
    
    // Play collision sound
    this.playCollisionSound();
  }
  
  createCollisionEffect(position) {
    // Create a particle effect at collision point instead of a light
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1,
      transparent: true,
      opacity: 0.8
    });
    
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    
    // Create particles at collision point
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = position.x;
      positions[i3 + 1] = position.y;
      positions[i3 + 2] = position.z;
      
      // Random velocity for each particle
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ));
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
    
    // Animate particles
    const startTime = Date.now();
    const duration = 500; // ms
    
    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      const positions = particles.geometry.attributes.position.array;
      
      // Update particle positions
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] += velocities[i].x * 0.2;
        positions[i3 + 1] += velocities[i].y * 0.2;
        positions[i3 + 2] += velocities[i].z * 0.2;
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Fade out particles
      particles.material.opacity = 0.8 * (1 - elapsed / duration);
      
      if (elapsed < duration) {
        requestAnimationFrame(animateParticles);
      } else {
        this.scene.remove(particles);
      }
    };
    
    animateParticles();
  }
  
  playCollisionSound() {
    // Create audio context if it doesn't exist
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Create oscillator for collision sound
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }
  
  updateEngineEffects(ship, accelerationMagnitude) {
    // Find engine glow sprite in the ship
    const engineGlow = ship.children.find(child => child instanceof THREE.Sprite);
    
    if (engineGlow) {
      // Scale engine glow based on acceleration
      const baseScale = 2;
      const maxScale = 3.5;
      const boostMultiplier = this.keys.boost ? 1.5 : 1;
      
      // Calculate scale based on forward acceleration
      let scaleMultiplier = 1;
      if (this.keys.forward) {
        scaleMultiplier = 1 + (accelerationMagnitude * 0.5 * boostMultiplier);
      }
      
      // Apply scale
      const newScale = baseScale * scaleMultiplier;
      engineGlow.scale.set(newScale, newScale, 1);
      
      // Adjust opacity based on acceleration
      const material = engineGlow.material;
      const baseOpacity = 0.7;
      const maxOpacity = 1.0;
      
      // Calculate opacity based on forward acceleration
      let opacityMultiplier = 1;
      if (this.keys.forward) {
        opacityMultiplier = 1 + (accelerationMagnitude * 0.3 * boostMultiplier);
      }
      
      // Apply opacity
      material.opacity = Math.min(baseOpacity * opacityMultiplier, maxOpacity);
    }
  }
  
  updateManeuveringThrusters(ship, activeThrusters) {
    // Find all thruster sprites
    const thrusters = ship.children.filter(child => 
      child instanceof THREE.Sprite && 
      child.position.length() > 1 && // Skip main engine
      child.userData && 
      child.userData.position
    );
    
    // Reset all thrusters to inactive
    thrusters.forEach(thruster => {
      thruster.visible = false;
    });
    
    // Activate specific thrusters based on input
    thrusters.forEach((thruster) => {
      const pos = thruster.userData.position;
      let shouldActivate = false;
      
      // Determine if this thruster should be active based on its position and current controls
      
      // Right side thrusters
      if (pos.x > 1) {
        if (activeThrusters.left || activeThrusters.yawLeft || activeThrusters.rollRight) {
          shouldActivate = true;
        }
      }
      
      // Left side thrusters
      if (pos.x < -1) {
        if (activeThrusters.right || activeThrusters.yawRight || activeThrusters.rollLeft) {
          shouldActivate = true;
        }
      }
      
      // Top thrusters
      if (pos.y > 0.4) {
        if (activeThrusters.down || activeThrusters.pitchDown) {
          shouldActivate = true;
        }
      }
      
      // Bottom thrusters
      if (pos.y < -0.4) {
        if (activeThrusters.up || activeThrusters.pitchUp) {
          shouldActivate = true;
        }
      }
      
      // Front thrusters
      if (pos.z > 0) {
        if (activeThrusters.backward) {
          shouldActivate = true;
        }
      }
      
      // Rear thrusters (not main engine)
      if (pos.z < -1 && (pos.x !== 0 || pos.y !== 0)) {
        if (activeThrusters.forward) {
          shouldActivate = true;
        }
      }
      
      // Activate thruster if needed
      if (shouldActivate) {
        thruster.visible = true;
      }
    });
  }
  
  updateCamera(ship, deltaTime) {
    // Fixed camera position directly behind the ship
    const cameraDistance = 15; // Distance behind the ship
    const cameraHeight = 2;    // Slight height above the ship
    
    // Get ship's forward direction
    const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    
    // Calculate camera position directly behind the ship
    const cameraOffset = shipForward.clone().multiplyScalar(-cameraDistance);
    cameraOffset.y += cameraHeight; // Add slight height
    
    // Set camera position relative to ship
    const targetPosition = ship.position.clone().add(cameraOffset);
    
    // Instantly update camera position to keep ship centered
    this.camera.position.copy(targetPosition);
    
    // Always look directly at the ship
    this.camera.lookAt(ship.position);
  }
  
  updateHUD() {
    if (!this.physics.velocity) return;
    
    // Calculate speed (magnitude of velocity)
    const speed = this.physics.velocity.length();
    const speedKmS = Math.round(speed * 10) / 10;
    
    // Update speed display
    const speedDisplay = document.getElementById('speed-display');
    if (speedDisplay) {
      speedDisplay.textContent = `SPEED: ${speedKmS} km/s`;
    }
    
    // Calculate throttle percentage
    const throttlePercentage = (speed / this.physics.maxSpeed) * 100;
    
    // Update throttle bar
    const throttleLevel = document.getElementById('throttle-level');
    if (throttleLevel) {
      // Scale the throttle bar width to max 100px
      throttleLevel.style.width = `${Math.min(100, throttlePercentage)}px`;
      
      // Change color based on speed percentage
      if (throttlePercentage > 80) {
        throttleLevel.style.backgroundColor = '#ff3333'; // Red
      } else if (throttlePercentage > 50) {
        throttleLevel.style.backgroundColor = '#ffaa33'; // Orange
      } else if (throttlePercentage > 20) {
        throttleLevel.style.backgroundColor = '#33cc33'; // Green
      } else {
        throttleLevel.style.backgroundColor = '#0af';    // Blue
      }
    }
  }
  
  addPlayer(playerData) {
    console.log("Adding player:", playerData);
    
    if (this.players[playerData.id]) {
      console.log("Player already exists, updating");
      this.players[playerData.id] = playerData;
      return;
    }
    
    this.players[playerData.id] = playerData;
    
    // Create spaceship for player
    if (window.spaceshipManager) {
      console.log("Creating spaceship for player:", playerData.id);
      try {
        // Check if scene exists
        if (!this.scene) {
          console.error("Scene is not initialized. Initializing scene now.");
          this.initScene();
        }
        
        const ship = window.spaceshipManager.createSpaceship(playerData.color);
        ship.position.set(
          playerData.position.x,
          playerData.position.y,
          playerData.position.z
        );
        
        // Store player ID in ship userData
        ship.userData = ship.userData || {};
        ship.userData.id = playerData.id;
        ship.userData.velocity = new THREE.Vector3(0, 0, 0);
        ship.userData.rotationVelocity = new THREE.Vector3(0, 0, 0);
        
        // Make sure scene exists before adding the ship
        if (this.scene) {
          this.scene.add(ship);
          this.playerShips[playerData.id] = ship;
          
          // Initialize physics for local player
          if (playerData.id === this.localPlayerId) {
            console.log("Initializing physics for local player");
            this.physics.velocity = new THREE.Vector3(0, 0, 0);
            this.physics.angularVelocity = new THREE.Vector3(0, 0, 0);
          }
          
          console.log("Player ship created successfully");
        } else {
          console.error("Scene is still null after initialization attempt");
        }
      } catch (error) {
        console.error("Error creating player ship:", error);
      }
    } else {
      console.error("Spaceship manager not found!");
    }
    
    // Update player count
    this.updatePlayerCount();
  }
  
  removePlayer(playerId) {
    if (!this.playerShips[playerId]) return;
    
    // Remove ship from scene
    this.scene.remove(this.playerShips[playerId]);
    delete this.playerShips[playerId];
    delete this.players[playerId];
    
    // Update player count
    this.updatePlayerCount();
  }
  
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
          ship.position.lerp(
            new THREE.Vector3(
              playerData.position.x,
              playerData.position.y,
              playerData.position.z
            ),
            0.3
          );
          
          // Set rotation directly
          ship.rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
          );
        }
      }
    }
    
    // Remove players that no longer exist
    for (const id in this.players) {
      if (!players[id]) {
        this.removePlayer(id);
      }
    }
  }
  
  updatePlayerCount() {
    const count = Object.keys(this.players).length;
    this.playersCountElement.textContent = `Players: ${count}`;
  }
  
  addControlsHelp() {
    // Create controls help container
    const controlsHelp = document.createElement('div');
    controlsHelp.id = 'controls-help';
    controlsHelp.style.position = 'absolute';
    controlsHelp.style.top = '50%';
    controlsHelp.style.left = '20px';
    controlsHelp.style.transform = 'translateY(-50%)';
    controlsHelp.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    controlsHelp.style.color = '#0f0';
    controlsHelp.style.padding = '15px';
    controlsHelp.style.borderRadius = '5px';
    controlsHelp.style.fontFamily = 'monospace';
    controlsHelp.style.fontSize = '14px';
    controlsHelp.style.zIndex = '100';
    controlsHelp.style.display = 'none'; // Hidden by default
    controlsHelp.style.maxWidth = '300px';
    controlsHelp.style.lineHeight = '1.5';
    
    // Add controls information
    controlsHelp.innerHTML = `
      <h3 style="margin-top: 0; color: #0af;">FLIGHT CONTROLS</h3>
      <p><b>W</b> - Forward thrust</p>
      <p><b>S</b> - Backward thrust</p>
      <p><b>A</b> - Rotate left</p>
      <p><b>D</b> - Rotate right</p>
      <p><b>Q</b> - Move up</p>
      <p><b>E</b> - Move down</p>
      <p><b>↑</b> - Backward thrust (mirrored)</p>
      <p><b>↓</b> - Forward thrust (mirrored)</p>
      <p><b>←</b> - Rotate right (mirrored)</p>
      <p><b>→</b> - Rotate left (mirrored)</p>
      <p><b>I</b> - Pitch up</p>
      <p><b>K</b> - Pitch down</p>
      <p><b>J</b> - Roll left</p>
      <p><b>L</b> - Roll right</p>
      <p><b>SHIFT</b> - Boost (200 km/s)</p>
      <p><b>SPACE</b> - Brake</p>
      <p><b>H</b> - Toggle this help</p>
      <p><b>Double-click</b> - Toggle immersive mode</p>
    `;
    
    // Add to document
    document.body.appendChild(controlsHelp);
    
    // Store reference
    this.controlsHelp = controlsHelp;
    
    // Add toggle event listener
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyH') {
        controlsHelp.style.display = controlsHelp.style.display === 'none' ? 'block' : 'none';
      }
    });
  }
  
  updateGravityIndicator(gravitationalAcceleration) {
    // Get gravity magnitude in G forces (1G = 9.8 m/s²)
    const gravityMagnitude = gravitationalAcceleration.length() / 9.8;
    
    // Update gravity text display
    const gravityDisplay = document.getElementById('gravity-display');
    if (gravityDisplay) {
      gravityDisplay.textContent = `GRAVITY: ${gravityMagnitude.toFixed(2)} G`;
      
      // Change color based on gravity strength
      if (gravityMagnitude > 3) {
        gravityDisplay.style.color = '#ff3333';
      } else if (gravityMagnitude > 1) {
        gravityDisplay.style.color = '#ffaa33';
      } else {
        gravityDisplay.style.color = '#0af';
      }
    }
    
    // Update gravity direction indicator
    const gravityIndicator = document.getElementById('gravity-indicator');
    if (gravityIndicator && gravitationalAcceleration.length() > 0.01) {
      // Normalize direction
      const direction = gravitationalAcceleration.clone().normalize();
      
      // Calculate position in the circular indicator (25 = radius of container - radius of indicator)
      const x = direction.x * 20;
      const y = direction.z * 20; // Using z as y for 2D representation
      
      // Update position
      gravityIndicator.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      
      // Scale size based on gravity strength (min 8px, max 16px)
      const size = Math.min(16, Math.max(8, 8 + (gravityMagnitude * 2)));
      gravityIndicator.style.width = `${size}px`;
      gravityIndicator.style.height = `${size}px`;
    }
  }
  
  addHUD() {
    // Create HUD container
    const hudContainer = document.createElement('div');
    hudContainer.id = 'hud-container';
    hudContainer.style.position = 'absolute';
    hudContainer.style.width = '100%';
    hudContainer.style.height = '100%';
    hudContainer.style.pointerEvents = 'none';
    hudContainer.style.zIndex = '100';
    document.body.appendChild(hudContainer);
    
    // Add speedometer
    this.speedometer = document.createElement('div');
    this.speedometer.id = 'speedometer';
    this.speedometer.style.position = 'absolute';
    this.speedometer.style.bottom = '20px';
    this.speedometer.style.right = '20px';
    this.speedometer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.speedometer.style.color = '#0f0';
    this.speedometer.style.padding = '10px';
    this.speedometer.style.borderRadius = '5px';
    this.speedometer.style.fontFamily = 'monospace';
    this.speedometer.style.fontSize = '16px';
    this.speedometer.style.textAlign = 'right';
    this.speedometer.innerHTML = 'SPEED: 0.0 km/s';
    hudContainer.appendChild(this.speedometer);
    
    // Add player counter
    this.playerCounter = document.createElement('div');
    this.playerCounter.id = 'player-counter';
    this.playerCounter.style.position = 'absolute';
    this.playerCounter.style.top = '20px';
    this.playerCounter.style.right = '20px';
    this.playerCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.playerCounter.style.color = '#0f0';
    this.playerCounter.style.padding = '10px';
    this.playerCounter.style.borderRadius = '5px';
    this.playerCounter.style.fontFamily = 'monospace';
    this.playerCounter.style.fontSize = '16px';
    this.playerCounter.innerHTML = 'PLAYERS: 1';
    hudContainer.appendChild(this.playerCounter);
    
    // Add gravity indicator
    this.gravityIndicator = document.createElement('div');
    this.gravityIndicator.id = 'gravity-indicator';
    this.gravityIndicator.style.position = 'absolute';
    this.gravityIndicator.style.bottom = '20px';
    this.gravityIndicator.style.left = '20px';
    this.gravityIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.gravityIndicator.style.color = '#0f0';
    this.gravityIndicator.style.padding = '10px';
    this.gravityIndicator.style.borderRadius = '5px';
    this.gravityIndicator.style.fontFamily = 'monospace';
    this.gravityIndicator.style.fontSize = '16px';
    this.gravityIndicator.style.width = '150px';
    this.gravityIndicator.innerHTML = 'GRAVITY: 0.0 m/s²<br><div id="gravity-direction"></div>';
    hudContainer.appendChild(this.gravityIndicator);
    
    // Add immersive mode indicator
    const immersiveIndicator = document.createElement('div');
    immersiveIndicator.id = 'immersive-indicator';
    immersiveIndicator.style.position = 'absolute';
    immersiveIndicator.style.top = '20px';
    immersiveIndicator.style.left = '50%';
    immersiveIndicator.style.transform = 'translateX(-50%)';
    immersiveIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    immersiveIndicator.style.color = '#0f0';
    immersiveIndicator.style.padding = '10px';
    immersiveIndicator.style.borderRadius = '5px';
    immersiveIndicator.style.fontFamily = 'monospace';
    immersiveIndicator.style.fontSize = '16px';
    immersiveIndicator.style.textAlign = 'center';
    immersiveIndicator.innerHTML = 'Double-click to enter immersive mode';
    immersiveIndicator.style.opacity = '1';
    immersiveIndicator.style.transition = 'opacity 1s';
    
    // Hide the indicator after 5 seconds
    setTimeout(() => {
      immersiveIndicator.style.opacity = '0';
    }, 5000);
    
    hudContainer.appendChild(immersiveIndicator);
    
    // Add controls help
    this.addControlsHelp();
  }
  
  animate() {
    // Request next animation frame
    requestAnimationFrame(this.animate.bind(this));
    
    // Calculate delta time
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.lastUpdateTime = currentTime;
    
    // Skip if delta time is too large (e.g. after tab switch)
    if (deltaTime > 0.1) return;
    
    // Update local player
    if (this.localPlayerId && this.players[this.localPlayerId]) {
      this.updateLocalPlayer(deltaTime);
    }
    
    // Update celestial bodies
    if (this.celestialBodiesManager) {
      this.celestialBodiesManager.animate();
    }
    
    // Update controls if available
    if (this.controls && typeof this.controls.update === 'function') {
      this.controls.update();
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  // Add this new method to force create the player ship
  forceCreatePlayerShip() {
    console.log("Force creating player ship");
    
    if (!this.localPlayerId && window.loginManager) {
      this.localPlayerId = window.loginManager.playerId;
    }
    
    if (!this.localPlayerId) {
      console.error("Cannot create ship: No local player ID");
      return;
    }
    
    // Check if ship already exists
    if (this.playerShips && this.playerShips[this.localPlayerId]) {
      console.log("Ship already exists, repositioning it");
      const ship = this.playerShips[this.localPlayerId];
      ship.position.set(0, 0, 0);
      
      // Reset camera to follow ship
      this.camera.position.set(0, 5, 15);
      this.camera.lookAt(ship.position);
      
      return;
    }
    
    // Create default player data
    const defaultPlayerData = {
      id: this.localPlayerId,
      username: window.loginManager ? window.loginManager.username : "Player",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: "#0088ff"
    };
    
    // Add player to game
    if (!this.players[this.localPlayerId]) {
      this.players[this.localPlayerId] = defaultPlayerData;
    }
    
    // Create ship directly
    if (this.spaceshipManager) {
      const ship = this.spaceshipManager.createSpaceship(defaultPlayerData.color);
      ship.position.set(0, 0, 0);
      
      // Store ship reference
      if (!this.playerShips) {
        this.playerShips = {};
      }
      this.playerShips[this.localPlayerId] = ship;
      
      // Add ship to scene
      this.scene.add(ship);
      
      // Reset camera to follow ship
      this.camera.position.set(0, 5, 15);
      this.camera.lookAt(ship.position);
      
      console.log("Player ship created successfully");
    } else {
      console.error("Cannot create ship: Spaceship manager not found");
    }
  }
  
  handleDoubleClick(event) {
    // Request pointer lock on double click
    if (!this.pointerLocked) {
      document.body.requestPointerLock();
    } else {
      document.exitPointerLock();
    }
  }
  
  handlePointerLockChange() {
    this.pointerLocked = document.pointerLockElement === document.body;
    
    // Update cursor style
    if (this.pointerLocked) {
      document.body.style.cursor = 'none';
      // Add immersive mode message
      this.showImmersiveModeMessage(true);
    } else {
      document.body.style.cursor = 'auto';
      this.showImmersiveModeMessage(false);
    }
  }
  
  showImmersiveModeMessage(active) {
    let message = document.getElementById('immersive-mode-message');
    
    if (!message) {
      message = document.createElement('div');
      message.id = 'immersive-mode-message';
      message.style.position = 'absolute';
      message.style.top = '10px';
      message.style.left = '50%';
      message.style.transform = 'translateX(-50%)';
      message.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      message.style.color = '#fff';
      message.style.padding = '10px 20px';
      message.style.borderRadius = '5px';
      message.style.fontFamily = 'Arial, sans-serif';
      message.style.zIndex = '1000';
      message.style.transition = 'opacity 0.5s';
      document.body.appendChild(message);
    }
    
    if (active) {
      message.textContent = 'Immersive Mode Active - Double-click to exit';
      message.style.opacity = '1';
      
      // Hide the message after 3 seconds
      setTimeout(() => {
        message.style.opacity = '0';
      }, 3000);
    } else {
      message.textContent = 'Immersive Mode Deactivated';
      message.style.opacity = '1';
      
      // Hide the message after 3 seconds
      setTimeout(() => {
        message.style.opacity = '0';
      }, 3000);
    }
  }
  
  updateSpeedDisplay(speed) {
    // Format speed with one decimal place
    const formattedSpeed = speed.toFixed(1);
    
    // Update speedometer display if it exists
    if (this.speedometer) {
      this.speedometer.innerHTML = `SPEED: ${formattedSpeed} km/s`;
      
      // Change color based on speed
      if (speed > this.physics.maxSpeed * 0.8) {
        this.speedometer.style.color = '#ff3333'; // Red for near max speed
      } else if (speed > this.physics.maxSpeed * 0.5) {
        this.speedometer.style.color = '#ffaa33'; // Orange for medium-high speed
      } else if (speed > this.physics.maxSpeed * 0.2) {
        this.speedometer.style.color = '#33cc33'; // Green for medium speed
      } else {
        this.speedometer.style.color = '#0af';    // Blue for low speed
      }
    }
  }
  
  setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Check if we've already set up event listeners
    if (this.eventListenersInitialized) {
      console.log('Event listeners already initialized');
      return;
    }
    
    // Set up key event listeners
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // Set up double-click event listener for immersive mode
    this.renderer.domElement.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    
    // Set up pointer lock change event listener
    document.addEventListener('pointerlockchange', this.handlePointerLockChange.bind(this));
    
    // Set up reset game button
    const resetButton = document.getElementById('reset-game-button');
    if (resetButton) {
      resetButton.addEventListener('click', this.resetGame.bind(this));
    }
    
    // Mark event listeners as initialized
    this.eventListenersInitialized = true;
    
    console.log('Event listeners set up successfully');
  }
  
  resetGame() {
    console.log('Resetting game...');
    
    // Reset player position
    if (this.localPlayerId && this.players[this.localPlayerId]) {
      const ship = this.players[this.localPlayerId].ship;
      
      // Reset position
      ship.position.set(0, 0, 0);
      
      // Reset rotation
      ship.rotation.set(0, 0, 0);
      
      // Reset velocity
      this.players[this.localPlayerId].velocity = new THREE.Vector3(0, 0, 0);
      this.players[this.localPlayerId].rotationVelocity = new THREE.Vector3(0, 0, 0);
      
      // Reset camera
      this.camera.position.set(0, 10, 30);
      this.camera.lookAt(0, 0, 0);
      
      // Update HUD
      this.updateHUD();
      
      // Update speedometer
      this.updateSpeedDisplay(0);
      
      console.log('Game reset complete');
    } else {
      console.warn('Cannot reset game: local player not found');
    }
  }
}

// Create game manager instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gameManager = new GameManager();
}); 