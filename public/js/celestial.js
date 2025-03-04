// CelestialBodiesManager - Handles celestial bodies like planets and stars
class CelestialBodiesManager {
  constructor(scene) {
    this.scene = scene;
    this.celestialBodies = [];
    
    // Initialize celestial bodies
    this.createSun();
    this.createPlanets();
  }
  
  // Create a sun at the center of the scene
  createSun() {
    const geometry = new THREE.SphereGeometry(50, 32, 32);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1
    });
    
    const sun = new THREE.Mesh(geometry, material);
    sun.position.set(0, 0, -1000);
    
    // Add a point light to make the sun illuminate the scene
    const sunLight = new THREE.PointLight(0xffffff, 1, 2000);
    sun.add(sunLight);
    
    this.scene.add(sun);
    this.celestialBodies.push(sun);
    
    return sun;
  }
  
  // Create planets orbiting the sun
  createPlanets() {
    const planetData = [
      { radius: 10, distance: 200, color: 0x3366ff, speed: 0.01 },  // Blue planet
      { radius: 15, distance: 400, color: 0xff6633, speed: 0.005 }, // Orange planet
      { radius: 8, distance: 600, color: 0x33cc33, speed: 0.003 }   // Green planet
    ];
    
    planetData.forEach(data => {
      const geometry = new THREE.SphereGeometry(data.radius, 32, 16);
      const material = new THREE.MeshPhongMaterial({ 
        color: data.color,
        shininess: 30
      });
      
      const planet = new THREE.Mesh(geometry, material);
      
      // Position the planet
      const angle = Math.random() * Math.PI * 2;
      planet.position.set(
        Math.cos(angle) * data.distance,
        0,
        Math.sin(angle) * data.distance - 1000
      );
      
      // Store additional data for animation
      planet.userData = {
        orbitDistance: data.distance,
        orbitSpeed: data.speed,
        orbitAngle: angle
      };
      
      this.scene.add(planet);
      this.celestialBodies.push(planet);
    });
  }
  
  // Animate method called by the game loop
  animate(deltaTime) {
    // Use a default deltaTime if none is provided
    deltaTime = deltaTime || 1/60; // approximately 60 FPS
    this.update(deltaTime);
  }
  
  // Update planets' positions for animation
  update(deltaTime) {
    this.celestialBodies.forEach(body => {
      if (body.userData && body.userData.orbitSpeed) {
        body.userData.orbitAngle += body.userData.orbitSpeed * deltaTime;
        
        body.position.x = Math.cos(body.userData.orbitAngle) * body.userData.orbitDistance;
        body.position.z = Math.sin(body.userData.orbitAngle) * body.userData.orbitDistance - 1000;
      }
    });
  }
} 