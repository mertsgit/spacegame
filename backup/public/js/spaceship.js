// Spaceship Manager
class SpaceshipManager {
  constructor() {
    // Cache for spaceship geometries
    this.spaceshipGeometry = null;
    
    // Thruster particles
    this.thrusterParticles = null;
  }
  
  createSpaceship(color = '#0088ff') {
    // Create spaceship group
    const ship = new THREE.Group();
    
    // Create a sphere for the ship body
    const radius = 1.5;
    const bodyGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 100,
      specular: 0x111111,
      flatShading: false
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    ship.add(body);
    
    // Add engine glow
    this.addEngineGlow(ship);
    
    // Add wing lights
    this.addWingLights(ship);
    
    return ship;
  }
  
  getSpaceshipGeometry() {
    // This method is no longer used for the sphere ship
    // but we'll keep it for future reference
    // Use cached geometry if available
    if (this.spaceshipGeometry) {
      return this.spaceshipGeometry;
    }
    
    // Create spaceship geometry
    const geometry = new THREE.BufferGeometry();
    
    // Define vertices for a simple spaceship shape
    const vertices = new Float32Array([
      // Top
       0.0,  0.5,  3.0,
       1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
      
      // Right side
       0.0,  0.5,  3.0,
       1.0,  0.0,  0.0,
       0.0, -0.5,  0.0,
      
      // Left side
       0.0,  0.5,  3.0,
      -1.0,  0.0,  0.0,
       0.0, -0.5,  0.0,
      
      // Bottom
       1.0,  0.0,  0.0,
      -1.0,  0.0,  0.0,
       0.0, -0.5,  0.0,
      
      // Back right
       1.0,  0.0,  0.0,
       0.0, -0.5,  0.0,
       1.5,  0.0, -2.0,
      
      // Back left
      -1.0,  0.0,  0.0,
       0.0, -0.5,  0.0,
      -1.5,  0.0, -2.0,
      
      // Back top right
       1.0,  0.0,  0.0,
       1.5,  0.0, -2.0,
       0.0,  0.5, -1.0,
      
      // Back top left
      -1.0,  0.0,  0.0,
      -1.5,  0.0, -2.0,
       0.0,  0.5, -1.0,
      
      // Back bottom
       0.0, -0.5,  0.0,
       1.5,  0.0, -2.0,
      -1.5,  0.0, -2.0,
      
      // Wing right
       1.0,  0.0,  0.0,
       3.0,  0.0, -1.0,
       2.0,  0.0,  1.0,
      
      // Wing left
      -1.0,  0.0,  0.0,
      -3.0,  0.0, -1.0,
      -2.0,  0.0,  1.0
    ]);
    
    // Scale the ship
    for (let i = 0; i < vertices.length; i++) {
      vertices[i] *= 1.5;
    }
    
    // Set vertices
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    // Compute normals
    geometry.computeVertexNormals();
    
    // Cache the geometry
    this.spaceshipGeometry = geometry;
    
    return geometry;
  }
  
  addEngineGlow(ship) {
    // No longer using point light for engine glow
    
    // Add engine glow sprite only
    const spriteMaterial = new THREE.SpriteMaterial({
      map: this.createGlowTexture(),
      color: 0x00ffff,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 2, 1);
    sprite.position.set(0, 0, 2); // Position at the back of the sphere
    ship.add(sprite);
    
    // Add smaller engine glows for maneuvering thrusters
    this.addManeuveringThrusters(ship);
  }
  
  addManeuveringThrusters(ship) {
    // Create maneuvering thruster positions for a sphere
    const thrusterPositions = [
      { pos: new THREE.Vector3(1.2, 0, 1.5), scale: 0.6 },  // Right rear
      { pos: new THREE.Vector3(-1.2, 0, 1.5), scale: 0.6 }, // Left rear
      { pos: new THREE.Vector3(1.5, 0, 0), scale: 0.4 },    // Right side
      { pos: new THREE.Vector3(-1.5, 0, 0), scale: 0.4 },   // Left side
      { pos: new THREE.Vector3(0, 1.5, 0), scale: 0.4 },    // Top
      { pos: new THREE.Vector3(0, -1.5, 0), scale: 0.4 }    // Bottom
    ];
    
    // Create thrusters
    thrusterPositions.forEach(thruster => {
      // No longer creating thruster lights to prevent flickering
      // Only create thruster sprites
      
      // Create thruster sprite
      const thrusterMaterial = new THREE.SpriteMaterial({
        map: this.createGlowTexture(),
        color: 0x00ffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0.7
      });
      
      const thrusterSprite = new THREE.Sprite(thrusterMaterial);
      thrusterSprite.scale.set(thruster.scale, thruster.scale, 1);
      thrusterSprite.position.copy(thruster.pos);
      thrusterSprite.visible = false; // Initially hidden
      ship.add(thrusterSprite);
      
      // Store reference to position for later use
      thrusterSprite.userData = { position: thruster.pos.clone() };
    });
  }
  
  addCockpit(ship, shipColor) {
    // Create cockpit geometry
    const cockpitGeometry = new THREE.SphereGeometry(0.8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // Create cockpit material with glass-like appearance
    const cockpitMaterial = new THREE.MeshPhongMaterial({
      color: 0x8888ff,
      transparent: true,
      opacity: 0.7,
      shininess: 100,
      specular: 0xffffff,
      side: THREE.DoubleSide
    });
    
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.5, 1.5);
    cockpit.rotation.x = Math.PI;
    ship.add(cockpit);
    
    // No longer using interior light
  }
  
  addWingLights(ship) {
    // Navigation lights removed to improve aesthetics
  }
  
  startBlinkingLights(leftLight, rightLight) {
    // Blinking lights removed to improve aesthetics
  }
  
  createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
      16, 16, 0, 16, 16, 16
    );
    
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}

// Create spaceship manager instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.spaceshipManager = new SpaceshipManager();
}); 