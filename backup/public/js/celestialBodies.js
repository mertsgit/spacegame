// Celestial Bodies Manager
class CelestialBodiesManager {
  constructor() {
    this.celestialBodies = [];
    this.textures = {
      sun: null,
      earth: null,
      mars: null,
      jupiter: null,
      neptune: null,
      moon: null,
      asteroid: null,
      stars: null
    };
    
    // Gravitational constant for physics
    this.G = 6.67430e-11 * 1000000; // Scaled up for game physics
    
    // Store asteroids separately for animation
    this.asteroids = [];
    this.spaceRocks = [];
    
    // Load textures
    this.loadTextures();
  }
  
  loadTextures() {
    // Instead of loading textures that might 404, use basic colors
    this.textures = {
      sun: { color: 0xffff00 },      // Yellow
      earth: { color: 0x0099ff },    // Blue
      mars: { color: 0xff4500 },     // Red-orange
      jupiter: { color: 0xffA500 },  // Orange
      neptune: { color: 0x4169e1 },  // Royal blue
      moon: { color: 0xcccccc },     // Light gray
      asteroid: { color: 0x8b4513 }, // Brown
      stars: { color: 0xffffff }     // White
    };
  }
  
  createCelestialBodies(scene) {
    console.log('Creating celestial bodies with basic materials');
    
    // Create sun
    this.createSun(scene);
    
    // Create planets
    this.createEarth(scene);
    this.createMars(scene);
    this.createJupiter(scene);
    this.createNeptune(scene);
    
    // Create asteroid belt
    this.createAsteroidBelt(scene);
    
    // Create space rocks
    this.createSpaceRocks(scene);
    
    console.log('Celestial bodies created successfully');
  }
  
  createSun(scene) {
    // Create sun geometry
    const geometry = new THREE.SphereGeometry(100, 32, 32);
    
    // Create sun material - using only color properties for MeshBasicMaterial
    const material = new THREE.MeshBasicMaterial({
      color: this.textures.sun.color
    });
    
    const sun = new THREE.Mesh(geometry, material);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(100 * 1.2, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.1 },
        p: { value: 1.2 },
        glowColor: { value: new THREE.Color(this.textures.sun.color) },
        viewVector: { value: new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: `
        uniform vec3 viewVector;
        uniform float c;
        uniform float p;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normal);
          vec3 vNormel = normalize(viewVector);
          intensity = pow(c - dot(vNormal, vNormel), p);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, 1.0);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true
    });
    
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(glowMesh);
    
    // No point light - using ambient light in the scene instead
    
    scene.add(sun);
    this.celestialBodies.push(sun);
  }
  
  createEarth(scene) {
    // Create earth geometry
    const geometry = new THREE.SphereGeometry(25, 32, 32);
    
    // Create earth material
    const material = new THREE.MeshStandardMaterial({
      color: this.textures.earth.color,
      roughness: 0.5,
      metalness: 0.1
    });
    
    const earth = new THREE.Mesh(geometry, material);
    earth.position.set(200, 0, -300);
    earth.userData = { type: 'earth', mass: 5.972e24 * 1e-20 }; // Scaled down for game physics
    
    scene.add(earth);
    this.celestialBodies.push(earth);
  }
  
  createMars(scene) {
    // Create mars geometry
    const geometry = new THREE.SphereGeometry(20, 32, 32);
    
    // Create mars material
    const material = new THREE.MeshStandardMaterial({
      color: this.textures.mars.color,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const mars = new THREE.Mesh(geometry, material);
    mars.position.set(-250, 50, -150);
    mars.userData = { type: 'mars', mass: 6.39e23 * 1e-20 }; // Scaled down for game physics
    
    scene.add(mars);
    this.celestialBodies.push(mars);
  }
  
  createJupiter(scene) {
    // Create jupiter geometry
    const geometry = new THREE.SphereGeometry(40, 32, 32);
    
    // Create jupiter material
    const material = new THREE.MeshStandardMaterial({
      color: this.textures.jupiter.color,
      roughness: 0.5,
      metalness: 0.1
    });
    
    const jupiter = new THREE.Mesh(geometry, material);
    jupiter.position.set(-400, -100, -500);
    jupiter.userData = { type: 'jupiter', mass: 1.898e27 * 1e-22 }; // Scaled down for game physics
    
    scene.add(jupiter);
    this.celestialBodies.push(jupiter);
  }
  
  createNeptune(scene) {
    // Create neptune geometry
    const geometry = new THREE.SphereGeometry(35, 32, 32);
    
    // Create neptune material
    const material = new THREE.MeshStandardMaterial({
      color: this.textures.neptune.color,
      roughness: 0.5,
      metalness: 0.1
    });
    
    const neptune = new THREE.Mesh(geometry, material);
    neptune.position.set(600, 150, -800);
    neptune.userData = { type: 'neptune', mass: 1.024e26 * 1e-22 }; // Scaled down for game physics
    
    scene.add(neptune);
    this.celestialBodies.push(neptune);
  }
  
  createAsteroidBelt(scene) {
    console.log('Creating asteroid belt');
    const count = 100;
    const minRadius = 800;
    const maxRadius = 1200;
    
    for (let i = 0; i < count; i++) {
      // Random size between 5 and 15
      const size = 5 + Math.random() * 10;
      
      // Random position in a ring
      const angle = Math.random() * Math.PI * 2;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 200; // Some vertical spread
      
      // Create asteroid
      const geometry = new THREE.IcosahedronGeometry(size, 0);
      const material = new THREE.MeshStandardMaterial({
        color: this.textures.asteroid.color,
        roughness: 0.8,
        metalness: 0.2
      });
      
      const asteroid = new THREE.Mesh(geometry, material);
      asteroid.position.set(x, y, z);
      
      // Random rotation
      asteroid.rotation.x = Math.random() * Math.PI;
      asteroid.rotation.y = Math.random() * Math.PI;
      asteroid.rotation.z = Math.random() * Math.PI;
      
      // Add to scene
      scene.add(asteroid);
      
      // Store for animation
      this.asteroids.push({
        mesh: asteroid,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.01,
          y: (Math.random() - 0.5) * 0.01,
          z: (Math.random() - 0.5) * 0.01
        },
        orbitSpeed: 0.0001 + Math.random() * 0.0001,
        orbitRadius: radius,
        orbitAngle: angle
      });
    }
  }
  
  createSpaceRocks(scene) {
    console.log('Creating space rocks');
    const count = 50;
    
    for (let i = 0; i < count; i++) {
      // Random size between 2 and 8
      const size = 2 + Math.random() * 6;
      
      // Random position in space
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      
      // Create rock
      const geometry = new THREE.IcosahedronGeometry(size, 0);
      const material = new THREE.MeshStandardMaterial({
        color: this.textures.asteroid.color,
        roughness: 0.9,
        metalness: 0.1
      });
      
      const rock = new THREE.Mesh(geometry, material);
      rock.position.set(x, y, z);
      
      // Random rotation
      rock.rotation.x = Math.random() * Math.PI;
      rock.rotation.y = Math.random() * Math.PI;
      rock.rotation.z = Math.random() * Math.PI;
      
      // Add to scene
      scene.add(rock);
      
      // Store for animation
      this.spaceRocks.push({
        mesh: rock,
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.1,
          y: (Math.random() - 0.5) * 0.1,
          z: (Math.random() - 0.5) * 0.1
        }
      });
    }
  }
  
  animate() {
    // Animate celestial bodies
    requestAnimationFrame(() => this.animate());
    
    this.celestialBodies.forEach(body => {
      // Rotate each body
      if (body.userData && body.userData.type) {
        const type = body.userData.type;
        const speed = body.userData.rotationSpeed;
        
        if (type === 'sun') {
          body.rotation.y += 0.0005;
        } else if (type !== 'asteroid' && type !== 'rock') {
          body.rotation.y += speed;
          
          // Add slight wobble to planets
          if (type !== 'moon') {
            body.rotation.x = Math.sin(Date.now() * 0.0001) * 0.02;
          }
        }
      }
    });
    
    // Animate asteroids in the belt
    this.asteroids.forEach(asteroid => {
      // Rotate asteroid
      asteroid.mesh.rotation.x += asteroid.rotationSpeed.x;
      asteroid.mesh.rotation.y += asteroid.rotationSpeed.y;
      asteroid.mesh.rotation.z += asteroid.rotationSpeed.z;
      
      // Update orbit position
      asteroid.orbitAngle += asteroid.orbitSpeed;
      const x = asteroid.orbitRadius * Math.cos(asteroid.orbitAngle);
      const z = asteroid.orbitRadius * Math.sin(asteroid.orbitAngle);
      
      // Keep the same height
      const y = asteroid.mesh.position.y;
      
      // Update position
      asteroid.mesh.position.set(x, y, z);
    });
    
    // Animate space rocks - only rotate them, don't move them
    this.spaceRocks.forEach(rock => {
      // Rotate rock
      rock.mesh.rotation.x += rock.rotationSpeed.x;
      rock.mesh.rotation.y += rock.rotationSpeed.y;
      rock.mesh.rotation.z += rock.rotationSpeed.z;
      
      // No drifting - rocks stay in fixed positions
    });
  }
  
  // Calculate gravitational force between two objects
  calculateGravitationalForce(obj1Position, obj1Mass, obj2Position, obj2Mass) {
    // Calculate distance between objects
    const distance = obj1Position.distanceTo(obj2Position);
    
    // Avoid division by zero or very small distances
    if (distance < 1) return new THREE.Vector3(0, 0, 0);
    
    // Calculate force magnitude: F = G * (m1 * m2) / r^2
    const forceMagnitude = this.G * (obj1Mass * obj2Mass) / (distance * distance);
    
    // Calculate force direction (from obj1 to obj2)
    const forceDirection = new THREE.Vector3().subVectors(obj2Position, obj1Position).normalize();
    
    // Return force vector
    return forceDirection.multiplyScalar(forceMagnitude);
  }
  
  // Create nebula
  createNebula(scene) {
    // Create a large sphere for the nebula
    const geometry = new THREE.SphereGeometry(1500, 32, 32);
    
    // Create material with nebula-like appearance
    const material = new THREE.MeshBasicMaterial({
      color: 0x5533aa,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    
    // Create mesh
    const nebula = new THREE.Mesh(geometry, material);
    scene.add(nebula);
  }
}

// Create celestial bodies manager instance when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.celestialBodiesManager = new CelestialBodiesManager();
}); 