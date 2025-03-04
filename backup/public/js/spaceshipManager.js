createSpaceship(color = 0x3366ff) {
  // Create spaceship group
  const spaceship = new THREE.Group();
  
  // Create main body
  const bodyGeometry = new THREE.ConeGeometry(5, 20, 8);
  bodyGeometry.rotateX(Math.PI / 2);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: color,
    shininess: 30,
    specular: 0x333333,
    flatShading: false
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  spaceship.add(body);
  
  // Create wings
  const wingGeometry = new THREE.BoxGeometry(30, 1, 10);
  const wingMaterial = new THREE.MeshPhongMaterial({
    color: 0x222222,
    shininess: 30,
    flatShading: false
  });
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  wings.position.set(0, 0, 0);
  spaceship.add(wings);
  
  // Create cockpit
  const cockpitGeometry = new THREE.SphereGeometry(4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  cockpitGeometry.rotateX(Math.PI);
  const cockpitMaterial = new THREE.MeshPhongMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.7,
    shininess: 100,
    flatShading: false
  });
  const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
  cockpit.position.set(0, 3, -5);
  spaceship.add(cockpit);
  
  // Create engine
  const engineGeometry = new THREE.CylinderGeometry(3, 3, 5, 16);
  engineGeometry.rotateX(Math.PI / 2);
  const engineMaterial = new THREE.MeshPhongMaterial({
    color: 0x333333,
    shininess: 30,
    flatShading: false
  });
  const engine = new THREE.Mesh(engineGeometry, engineMaterial);
  engine.position.set(0, 0, 10);
  spaceship.add(engine);
  
  // Add engine glow (particle system)
  const engineGlow = this.createEngineGlow();
  engineGlow.position.set(0, 0, 12);
  spaceship.add(engineGlow);
  
  // Add maneuvering thrusters
  this.addManeuveringThrusters(spaceship);
  
  // Set initial rotation
  spaceship.rotation.set(0, 0, 0);
  
  return spaceship;
} 