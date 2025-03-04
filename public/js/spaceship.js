// Spaceship Manager for handling spaceship creation and rendering
class SpaceshipManager {
  constructor() {
    log('Spaceship Manager initialized');
  }
  
  // Create a new spaceship with the specified color
  createSpaceship(color = '#3388ff') {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create spaceship.');
      return null;
    }
    
    log(`Creating authentic Star Wars X-Wing fighter with color: ${color}`);
    
    try {
      // Create ship group
      const ship = new THREE.Group();
      
      // ===== MAIN FUSELAGE =====
      // Main fuselage - elongated body
      const bodyGeometry = new THREE.CylinderGeometry(0.6, 0.7, 6, 16);
      const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf0f0f0, 
        shininess: 70,
        specular: 0x444444
      });
      
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.rotation.x = Math.PI / 2; // Rotate to make it horizontal
      ship.add(body);
      
      // Nose cone
      const coneGeometry = new THREE.ConeGeometry(0.6, 1.5, 16);
      const coneMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf0f0f0, 
        shininess: 70,
        specular: 0x444444
      });
      
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.z = 3.7; // Position at front of ship
      cone.rotation.x = -Math.PI / 2; // Rotate to point forward
      ship.add(cone);
      
      // Add panel lines to fuselage for more detail
      for (let i = -2; i <= 2; i += 1) {
        this.addPanelLine(ship, i, 0.65);
      }
      
      // ===== COCKPIT =====
      // Cockpit base
      const cockpitBaseGeometry = new THREE.CylinderGeometry(0.7, 0.7, 1.0, 16);
      const cockpitBaseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333, 
        shininess: 70
      });
      
      const cockpitBase = new THREE.Mesh(cockpitBaseGeometry, cockpitBaseMaterial);
      cockpitBase.position.set(0, 0.7, 2.0);
      cockpitBase.rotation.x = Math.PI / 2;
      ship.add(cockpitBase);
      
      // Cockpit canopy
      const canopyGeometry = new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const canopyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffcc00, 
        transparent: true,
        opacity: 0.7,
        shininess: 100,
        specular: 0xffffff
      });
      
      const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
      canopy.position.set(0, 1.2, 2.0);
      canopy.rotation.x = Math.PI;
      ship.add(canopy);
      
      // Cockpit frame
      const frameGeometry = new THREE.TorusGeometry(0.7, 0.08, 8, 16, Math.PI * 0.6);
      const frameMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        shininess: 60
      });
      
      const cockpitFrame = new THREE.Mesh(frameGeometry, frameMaterial);
      cockpitFrame.position.set(0, 1.2, 2.0);
      cockpitFrame.rotation.x = 0;
      ship.add(cockpitFrame);
      
      // ===== WINGS - S-FOILS =====
      // Create the 4 wings in X configuration
      const createWing = (isTop, isRight) => {
        const wingGroup = new THREE.Group();
        
        // Main wing
        const wingGeometry = new THREE.BoxGeometry(5, 0.2, 0.8);
        const wingMaterial = new THREE.MeshPhongMaterial({ 
          color: color, 
          shininess: 60,
          specular: 0x444444
        });
        
        const wing = new THREE.Mesh(wingGeometry, wingMaterial);
        
        // Position wing
        const xDir = isRight ? 1 : -1;
        const yDir = isTop ? 1 : -1;
        wing.position.set(xDir * 2.5, yDir * 0.6, 0);
        
        // Rotate wing
        const rotZ = isTop ? 
          (isRight ? Math.PI / 12 : -Math.PI / 12) : 
          (isRight ? -Math.PI / 12 : Math.PI / 12);
        wing.rotation.z = rotZ;
        
        wingGroup.add(wing);
        
        // Wing details - stripes
        const stripeGeometry = new THREE.BoxGeometry(5, 0.05, 0.4);
        const stripeMaterial = new THREE.MeshPhongMaterial({
          color: 0x333333,
          shininess: 60
        });
        
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.set(0, 0.11, 0);
        wing.add(stripe);
        
        // Engine at wing tip
        const engineGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
        const engineMaterial = new THREE.MeshPhongMaterial({
          color: 0x444444,
          shininess: 70
        });
        
        const engine = new THREE.Mesh(engineGeometry, engineMaterial);
        engine.position.set(xDir * 2.5, 0, 0);
        engine.rotation.z = Math.PI / 2;
        wingGroup.add(engine);
        
        // Engine intake
        const intakeGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        const intakeMaterial = new THREE.MeshPhongMaterial({
          color: 0x222222,
          shininess: 80
        });
        
        const intake = new THREE.Mesh(intakeGeometry, intakeMaterial);
        intake.position.set(xDir * 3.1, 0, 0);
        intake.rotation.z = Math.PI / 2;
        wingGroup.add(intake);
        
        // Engine exhaust
        const exhaustGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16);
        const exhaustMaterial = new THREE.MeshPhongMaterial({
          color: 0x333333,
          shininess: 80
        });
        
        const exhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
        exhaust.position.set(xDir * 1.9, 0, 0);
        exhaust.rotation.z = Math.PI / 2;
        wingGroup.add(exhaust);
        
        // Engine glow
        const glowGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
        const glowMaterial = new THREE.MeshPhongMaterial({
          color: 0xff5500,
          emissive: 0xff3300,
          shininess: 100,
          transparent: true,
          opacity: 0.8
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(xDir * 1.8, 0, 0);
        glow.rotation.z = Math.PI / 2;
        wingGroup.add(glow);
        
        // Laser cannon
        const cannonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
        const cannonMaterial = new THREE.MeshPhongMaterial({
          color: 0x222222,
          shininess: 80
        });
        
        // Position cannons at wing tips
        const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
        cannon.position.set(xDir * 4.8, yDir * 0.2, 0);
        cannon.rotation.z = Math.PI / 2;
        wingGroup.add(cannon);
        
        // Cannon tip
        const cannonTipGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 8);
        const cannonTipMaterial = new THREE.MeshPhongMaterial({
          color: 0xff0000,
          shininess: 90
        });
        
        const cannonTip = new THREE.Mesh(cannonTipGeometry, cannonTipMaterial);
        cannonTip.position.set(xDir * 5.5, yDir * 0.2, 0);
        cannonTip.rotation.z = Math.PI / 2;
        wingGroup.add(cannonTip);
        
        return wingGroup;
      };
      
      // Add all 4 wings
      ship.add(createWing(true, true));   // Top right
      ship.add(createWing(true, false));  // Top left
      ship.add(createWing(false, true));  // Bottom right
      ship.add(createWing(false, false)); // Bottom left
      
      // ===== WING CONNECTORS =====
      // S-foil actuators - connect wings to body
      const createWingConnector = (isTop, isRight) => {
        const connectorGeometry = new THREE.BoxGeometry(2.0, 0.3, 0.3);
        const connectorMaterial = new THREE.MeshPhongMaterial({
          color: 0x888888,
          shininess: 60
        });
        
        const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
        
        // Position connector
        const xDir = isRight ? 1 : -1;
        const yDir = isTop ? 1 : -1;
        connector.position.set(xDir * 1.0, yDir * 0.3, 0);
        
        return connector;
      };
      
      // Add all 4 wing connectors
      ship.add(createWingConnector(true, true));   // Top right
      ship.add(createWingConnector(true, false));  // Top left
      ship.add(createWingConnector(false, true));  // Bottom right
      ship.add(createWingConnector(false, false)); // Bottom left
      
      // ===== ENGINES =====
      // Main engine
      const mainEngineGeometry = new THREE.CylinderGeometry(0.8, 0.9, 1, 16);
      const mainEngineMaterial = new THREE.MeshPhongMaterial({
        color: 0x444444,
        shininess: 70
      });
      
      const mainEngine = new THREE.Mesh(mainEngineGeometry, mainEngineMaterial);
      mainEngine.position.set(0, 0, -3.0);
      mainEngine.rotation.x = Math.PI / 2;
      ship.add(mainEngine);
      
      // Engine glow
      const engineGlowGeometry = new THREE.CylinderGeometry(0.6, 0.7, 0.3, 16);
      const engineGlowMaterial = new THREE.MeshPhongMaterial({
        color: 0xff5500,
        emissive: 0xff7700,
        emissiveIntensity: 0.8,
        shininess: 100
      });
      
      const engineGlow = new THREE.Mesh(engineGlowGeometry, engineGlowMaterial);
      engineGlow.position.set(0, 0, -3.5);
      engineGlow.rotation.x = Math.PI / 2;
      ship.add(engineGlow);
      
      // Add engine light
      const mainEngineLight = new THREE.PointLight(0xff7700, 1.5, 6);
      mainEngineLight.position.set(0, 0, -3.7);
      ship.add(mainEngineLight);
      
      // ===== ASTROMECH DROID (R2 UNIT) =====
      // R2 body
      const r2BodyGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16);
      const r2BodyMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 90
      });
      
      const r2Body = new THREE.Mesh(r2BodyGeometry, r2BodyMaterial);
      r2Body.position.set(0, 0.9, 0.5);
      ship.add(r2Body);
      
      // R2 head
      const r2HeadGeometry = new THREE.SphereGeometry(0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const r2HeadMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 90
      });
      
      const r2Head = new THREE.Mesh(r2HeadGeometry, r2HeadMaterial);
      r2Head.position.set(0, 1.2, 0.5);
      r2Head.rotation.x = Math.PI;
      ship.add(r2Head);
      
      // R2 details
      const r2DetailGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.15);
      const r2DetailMaterial = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 90
      });
      
      // Add colored panels to R2 unit
      const r2Detail1 = new THREE.Mesh(r2DetailGeometry, r2DetailMaterial);
      r2Detail1.position.set(0.25, 0.9, 0.5);
      ship.add(r2Detail1);
      
      const r2Detail2 = new THREE.Mesh(r2DetailGeometry, r2DetailMaterial);
      r2Detail2.position.set(-0.25, 0.9, 0.5);
      ship.add(r2Detail2);
      
      // ===== DETAILS =====
      // Add torpedo launchers
      const torpedoLauncherGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.8);
      const torpedoLauncherMaterial = new THREE.MeshPhongMaterial({
        color: 0x333333,
        shininess: 70
      });
      
      // Left torpedo launcher
      const leftTorpedoLauncher = new THREE.Mesh(torpedoLauncherGeometry, torpedoLauncherMaterial);
      leftTorpedoLauncher.position.set(-0.3, -0.2, 3.0);
      ship.add(leftTorpedoLauncher);
      
      // Right torpedo launcher
      const rightTorpedoLauncher = new THREE.Mesh(torpedoLauncherGeometry, torpedoLauncherMaterial);
      rightTorpedoLauncher.position.set(0.3, -0.2, 3.0);
      ship.add(rightTorpedoLauncher);
      
      // Add navigation lights
      const navLightGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      
      // Red navigation light (left)
      const redNavLightMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000
      });
      const redNavLight = new THREE.Mesh(navLightGeometry, redNavLightMaterial);
      redNavLight.position.set(-0.7, 0, 2.5);
      ship.add(redNavLight);
      
      // Green navigation light (right)
      const greenNavLightMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00
      });
      const greenNavLight = new THREE.Mesh(navLightGeometry, greenNavLightMaterial);
      greenNavLight.position.set(0.7, 0, 2.5);
      ship.add(greenNavLight);
      
      // White navigation light (top)
      const whiteNavLightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff
      });
      const whiteNavLight = new THREE.Mesh(navLightGeometry, whiteNavLightMaterial);
      whiteNavLight.position.set(0, 0.7, -2.5);
      ship.add(whiteNavLight);
      
      // Add antenna
      const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
      const antennaMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        shininess: 80
      });
      
      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna.position.set(0, 0.7, -1.5);
      ship.add(antenna);
      
      // Scale the ship to appropriate size
      ship.scale.set(0.6, 0.6, 0.6);
      
      return ship;
    } catch (error) {
      console.error('Error creating spaceship:', error);
      return null;
    }
  }
  
  // Create a simple planet to have something in the scene
  createPlanet(radius = 50, color = 0x999999) {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create planet.');
      return null;
    }
    
    log(`Creating planet with radius ${radius}`);
    
    try {
      const planetGeometry = new THREE.SphereGeometry(radius, 32, 32);
      
      // Create texture-based material for more realistic planets
      let planetMaterial;
      
      // Randomize planet appearance
      const planetType = Math.floor(Math.random() * 4);
      
      switch (planetType) {
        case 0: // Rocky planet
          planetMaterial = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 10,
            bumpScale: 0.5
          });
          break;
        case 1: // Gas giant
          planetMaterial = new THREE.MeshPhongMaterial({
            color: 0x6688cc,
            shininess: 20,
            transparent: true,
            opacity: 0.9
          });
          break;
        case 2: // Desert planet
          planetMaterial = new THREE.MeshPhongMaterial({
            color: 0xddaa77,
            shininess: 5
          });
          break;
        case 3: // Earth-like
          planetMaterial = new THREE.MeshPhongMaterial({
            color: 0x4488aa,
            shininess: 15
          });
          break;
      }
      
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      
      // Create a simple ring system for some planets
      if (Math.random() > 0.6) {
        const ringGeometry = new THREE.RingGeometry(radius * 1.2, radius * 1.8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        planet.add(ring);
      }
      
      return planet;
    } catch (error) {
      console.error('Error creating planet:', error);
      return null;
    }
  }
  
  // Create stars for the background
  createStars(count = 2000) {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create stars.');
      return null;
    }
    
    log(`Creating ${count} stars`);
    
    try {
      const starsGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        // Random positions for stars
        positions[i3] = (Math.random() - 0.5) * 3000; // x
        positions[i3+1] = (Math.random() - 0.5) * 3000; // y
        positions[i3+2] = (Math.random() - 0.5) * 3000; // z
        
        // Random colors for stars
        const starType = Math.random();
        if (starType > 0.95) { // Blue stars
          colors[i3] = 0.7 + Math.random() * 0.3;
          colors[i3+1] = 0.7 + Math.random() * 0.3;
          colors[i3+2] = 1.0;
          sizes[i] = 2 + Math.random() * 2;
        } else if (starType > 0.8) { // White stars
          colors[i3] = 1.0;
          colors[i3+1] = 1.0;
          colors[i3+2] = 1.0;
          sizes[i] = 1 + Math.random() * 1.5;
        } else if (starType > 0.6) { // Yellow stars
          colors[i3] = 1.0;
          colors[i3+1] = 0.9 + Math.random() * 0.1;
          colors[i3+2] = 0.5 + Math.random() * 0.3;
          sizes[i] = 1 + Math.random();
        } else { // Distant stars
          colors[i3] = 0.8 + Math.random() * 0.2;
          colors[i3+1] = 0.8 + Math.random() * 0.2;
          colors[i3+2] = 0.8 + Math.random() * 0.2;
          sizes[i] = 0.5 + Math.random() * 0.5;
        }
      }
      
      starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      const starsMaterial = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        sizeAttenuation: true
      });
      
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      return stars;
    } catch (error) {
      console.error('Error creating stars:', error);
      return null;
    }
  }
  
  // Create a spaceport with launch ramps
  createSpaceport() {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create spaceport.');
      return null;
    }
    
    log('Creating spaceport facility');
    
    try {
      // Create the spaceport group
      const spaceport = new THREE.Group();
      spaceport.userData = {
        type: 'spaceport',
        isCollidable: true,
        parts: []
      };
      
      // Main terminal/base platform - larger and more detailed
      const baseGeometry = new THREE.CylinderGeometry(120, 130, 10, 16);
      const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x2a3b4c,
        shininess: 30,
        specular: 0x111122
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = -5;
      base.userData = {
        type: 'spaceport_base',
        isCollidable: true,
        radius: 125
      };
      spaceport.add(base);
      spaceport.userData.parts.push({
        mesh: base,
        type: 'cylinder',
        radius: 125,
        height: 10
      });
      
      // Add landing pad markings
      const markingsGeometry = new THREE.RingGeometry(80, 110, 16);
      const markingsMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00aaff,
        side: THREE.DoubleSide
      });
      const markings = new THREE.Mesh(markingsGeometry, markingsMaterial);
      markings.rotation.x = Math.PI / 2;
      markings.position.y = -4.9;
      spaceport.add(markings);
      
      // Inner landing pad
      const innerPadGeometry = new THREE.CylinderGeometry(50, 50, 5, 16);
      const innerPadMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x334455,
        shininess: 50,
        specular: 0x222233
      });
      const innerPad = new THREE.Mesh(innerPadGeometry, innerPadMaterial);
      innerPad.position.y = -2.5;
      innerPad.userData = {
        type: 'spaceport_inner_pad',
        isCollidable: true,
        radius: 50
      };
      spaceport.add(innerPad);
      spaceport.userData.parts.push({
        mesh: innerPad,
        type: 'cylinder',
        radius: 50,
        height: 5
      });
      
      // Add control tower - MOVED TO THE SIDE instead of directly in front
      const towerBaseGeometry = new THREE.CylinderGeometry(10, 15, 40, 8);
      const towerMaterial = new THREE.MeshPhongMaterial({
        color: 0x445566,
        shininess: 50,
        specular: 0x222233
      });
      const towerBase = new THREE.Mesh(towerBaseGeometry, towerMaterial);
      // Position tower to the side at 45 degrees angle (NE direction)
      towerBase.position.set(70, 15, -70);
      towerBase.userData = {
        type: 'spaceport_tower',
        isCollidable: true,
        radius: 15
      };
      spaceport.add(towerBase);
      spaceport.userData.parts.push({
        mesh: towerBase,
        type: 'cylinder',
        radius: 15,
        height: 40,
        position: new THREE.Vector3(70, 15, -70)
      });
      
      // Tower top - observation deck
      const towerTopGeometry = new THREE.CylinderGeometry(18, 12, 15, 8);
      const towerGlassMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        shininess: 90,
        specular: 0xffffff,
        transparent: true,
        opacity: 0.7
      });
      const towerTop = new THREE.Mesh(towerTopGeometry, towerGlassMaterial);
      towerTop.position.set(70, 40, -70);
      towerTop.userData = {
        type: 'spaceport_tower_top',
        isCollidable: true,
        radius: 18
      };
      spaceport.add(towerTop);
      spaceport.userData.parts.push({
        mesh: towerTop,
        type: 'cylinder',
        radius: 18,
        height: 15,
        position: new THREE.Vector3(70, 40, -70)
      });
      
      // Add antenna on top of tower
      const antennaGeometry = new THREE.CylinderGeometry(1, 1, 20, 8);
      const antennaMaterial = new THREE.MeshPhongMaterial({
        color: 0xaaaaaa,
        shininess: 80,
        specular: 0xffffff
      });
      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna.position.set(70, 57.5, -70);
      spaceport.add(antenna);
      
      // Antenna dish
      const dishGeometry = new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const dish = new THREE.Mesh(dishGeometry, antennaMaterial);
      dish.position.set(70, 47.5, -70);
      dish.rotation.x = Math.PI;
      spaceport.add(dish);
      
      // Create 4 launch ramps in different directions with more space
      const rampPositions = [
        { x: 90, z: 0, rotation: 0 },           // East ramp
        { x: 0, z: 90, rotation: Math.PI/2 },   // South ramp
        { x: -90, z: 0, rotation: Math.PI },    // West ramp
        { x: 0, z: -90, rotation: -Math.PI/2 }  // North ramp
      ];
      
      this.launchPositions = [];
      
      rampPositions.forEach((pos, index) => {
        const ramp = this.createLaunchRamp();
        ramp.position.set(pos.x, 0, pos.z);
        ramp.rotation.y = pos.rotation;
        
        // Add collision data for each ramp
        ramp.userData = {
          type: 'launch_ramp',
          isCollidable: true
        };
        
        // Add ramp parts to the spaceport's collidable parts list
        ramp.children.forEach(child => {
          if (child.geometry) {
            const boundingBox = new THREE.Box3().setFromObject(child);
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            
            // Transform the position to world coordinates
            const worldPos = child.position.clone();
            worldPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), pos.rotation);
            worldPos.add(new THREE.Vector3(pos.x, 0, pos.z));
            
            spaceport.userData.parts.push({
              mesh: child,
              type: 'box',
              size: size,
              position: worldPos,
              rotation: pos.rotation
            });
          }
        });
        
        spaceport.add(ramp);
        
        // Store launch positions and directions for spawning ships
        // Position ships further out from the center for a clearer takeoff path
        const launchPos = new THREE.Vector3(
          pos.x + 40 * Math.sin(pos.rotation),
          5,
          pos.z + 40 * Math.cos(pos.rotation)
        );
        
        this.launchPositions.push({
          position: launchPos,
          rotation: { x: 0, y: pos.rotation, z: 0 },
          index: index
        });
      });
      
      // Add runway lights
      const lightGeometry = new THREE.BoxGeometry(2, 0.5, 2);
      const lightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
      
      // Create circular pattern of lights
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 12) {
        const radius = 115;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const light = new THREE.Mesh(lightGeometry, lightMaterial);
        light.position.set(x, 0.3, z);
        spaceport.add(light);
      }
      
      // Add holographic projector in the center
      const projectorGeometry = new THREE.CylinderGeometry(5, 5, 2, 16);
      const projectorMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        shininess: 80,
        specular: 0x666666
      });
      const projector = new THREE.Mesh(projectorGeometry, projectorMaterial);
      projector.position.y = -3;
      spaceport.add(projector);
      
      // Add holographic effect
      const holoGeometry = new THREE.SphereGeometry(20, 16, 16);
      const holoMaterial = new THREE.MeshBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      const hologram = new THREE.Mesh(holoGeometry, holoMaterial);
      hologram.position.y = 10;
      spaceport.add(hologram);
      
      // Add ambient light to the spaceport
      const ambientLight = new THREE.PointLight(0x6688cc, 1, 200);
      ambientLight.position.set(0, 30, 0);
      spaceport.add(ambientLight);
      
      return spaceport;
    } catch (error) {
      console.error('Error creating spaceport:', error);
      return null;
    }
  }
  
  // Create a single launch ramp
  createLaunchRamp() {
    // Create a ramp group
    const ramp = new THREE.Group();
    
    // Ramp base (flat part)
    const baseGeometry = new THREE.BoxGeometry(15, 2, 30);
    const rampMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x445566,
      shininess: 40,
      specular: 0x222233
    });
    const base = new THREE.Mesh(baseGeometry, rampMaterial);
    base.position.z = -5;
    base.position.y = 0;
    ramp.add(base);
    
    // Angled launch section
    const rampGeometry = new THREE.BoxGeometry(15, 2, 20);
    const launchRamp = new THREE.Mesh(rampGeometry, rampMaterial);
    launchRamp.position.z = 20;
    launchRamp.position.y = 3;
    launchRamp.rotation.x = -Math.PI / 12; // Slight upward angle
    ramp.add(launchRamp);
    
    // Side barriers
    const barrierGeometry = new THREE.BoxGeometry(1, 3, 45);
    const barrierMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffaa00,
      emissive: 0x553300,
      emissiveIntensity: 0.3
    });
    
    const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    leftBarrier.position.set(-8, 1, 5);
    ramp.add(leftBarrier);
    
    const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    rightBarrier.position.set(8, 1, 5);
    ramp.add(rightBarrier);
    
    // Launch lights along the ramp
    const lightGeometry = new THREE.BoxGeometry(0.8, 0.3, 3);
    const lightOnMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff88
    });
    
    for (let i = -20; i <= 20; i += 5) {
      const leftLight = new THREE.Mesh(lightGeometry, lightOnMaterial);
      leftLight.position.set(-7, 0.2, i);
      ramp.add(leftLight);
      
      const rightLight = new THREE.Mesh(lightGeometry, lightOnMaterial);
      rightLight.position.set(7, 0.2, i);
      ramp.add(rightLight);
    }
    
    return ramp;
  }
  
  // Create an asteroid field
  createAsteroidField(count = 100, spread = 300) {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create asteroid field.');
      return null;
    }
    
    log(`Creating asteroid field with ${count} asteroids`);
    
    try {
      const asteroidField = new THREE.Group();
      
      // Create asteroids with varying shapes and sizes
      for (let i = 0; i < count; i++) {
        // Random size
        const size = 1 + Math.random() * 3;
        
        // Random shape (low detail to improve performance)
        const detailLevel = 1;
        let asteroidGeometry;
        
        const shapeType = Math.floor(Math.random() * 3);
        switch (shapeType) {
          case 0:
            asteroidGeometry = new THREE.DodecahedronGeometry(size, detailLevel);
            break;
          case 1:
            asteroidGeometry = new THREE.IcosahedronGeometry(size, detailLevel);
            break;
          case 2:
            asteroidGeometry = new THREE.OctahedronGeometry(size, detailLevel);
            break;
        }
        
        // Random gray color for asteroid
        const color = 0x666666 + Math.floor(Math.random() * 0x333333);
        const asteroidMaterial = new THREE.MeshPhongMaterial({
          color: color,
          flatShading: true,
          shininess: 5
        });
        
        const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
        
        // Random position within the spread area
        asteroid.position.set(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread / 2, // Less vertical spread
          (Math.random() - 0.5) * spread
        );
        
        // Random rotation
        asteroid.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        );
        
        // Store original rotation for animation
        asteroid.userData = {
          rotationSpeed: {
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.01
          }
        };
        
        asteroidField.add(asteroid);
      }
      
      return asteroidField;
    } catch (error) {
      console.error('Error creating asteroid field:', error);
      return null;
    }
  }
  
  // Create a dust/particle nebula
  createNebula(size = 200, particleCount = 300) {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create nebula.');
      return null;
    }
    
    log(`Creating nebula with ${particleCount} particles`);
    
    try {
      // Create particle system
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      
      // Random nebula color theme
      let r, g, b;
      const nebulaType = Math.floor(Math.random() * 4);
      switch (nebulaType) {
        case 0: // Blue nebula
          r = 0.2; g = 0.3; b = 0.8;
          break;
        case 1: // Red nebula
          r = 0.8; g = 0.2; b = 0.3;
          break;
        case 2: // Green nebula
          r = 0.2; g = 0.8; b = 0.4;
          break;
        case 3: // Purple nebula
          r = 0.6; g = 0.2; b = 0.8;
          break;
      }
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Position particles in a cloud-like formation
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = size * (0.3 + Math.random() * 0.7); // Add some randomness to radius
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3+1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5; // Flatten vertically
        positions[i3+2] = radius * Math.cos(phi);
        
        // Add color variation
        const colorVar = 0.2 * Math.random();
        colors[i3] = Math.min(1, r + colorVar); 
        colors[i3+1] = Math.min(1, g + colorVar);
        colors[i3+2] = Math.min(1, b + colorVar);
        
        // Vary particle sizes
        sizes[i] = 3 + Math.random() * 5;
      }
      
      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      
      const material = new THREE.PointsMaterial({
        size: 4,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true
      });
      
      const nebula = new THREE.Points(particles, material);
      return nebula;
    } catch (error) {
      console.error('Error creating nebula:', error);
      return null;
    }
  }
  
  // Create a meteor/comet with a particle trail
  createMeteor() {
    if (!isThreeLoaded()) {
      console.error('THREE.js not loaded. Cannot create meteor.');
      return null;
    }
    
    log('Creating meteor with particle trail');
    
    try {
      const meteor = new THREE.Group();
      
      // Create meteor head
      const headGeometry = new THREE.IcosahedronGeometry(1.5, 1);
      const headMaterial = new THREE.MeshPhongMaterial({
        color: 0x888888,
        emissive: 0x331100,
        flatShading: true
      });
      
      const head = new THREE.Mesh(headGeometry, headMaterial);
      meteor.add(head);
      
      // Add glow effect
      const glowLight = new THREE.PointLight(0xff6600, 2, 10);
      head.add(glowLight);
      
      // Create particle trail
      const trailCount = 100;
      const trailGeometry = new THREE.BufferGeometry();
      const trailPositions = new Float32Array(trailCount * 3);
      const trailColors = new Float32Array(trailCount * 3);
      const trailSizes = new Float32Array(trailCount);
      
      for (let i = 0; i < trailCount; i++) {
        const i3 = i * 3;
        const t = i / trailCount;
        
        // Position particles in a trail behind the meteor
        trailPositions[i3] = -t * 15;
        trailPositions[i3+1] = (Math.random() - 0.5) * t * 1.5;
        trailPositions[i3+2] = (Math.random() - 0.5) * t * 1.5;
        
        // Color gradient from yellow to red to transparent
        trailColors[i3] = 1.0; // R
        trailColors[i3+1] = 0.5 * (1 - t); // G
        trailColors[i3+2] = 0; // B
        
        // Size gradient
        trailSizes[i] = 2 * (1 - t);
      }
      
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
      trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
      
      const trailMaterial = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true
      });
      
      const trail = new THREE.Points(trailGeometry, trailMaterial);
      meteor.add(trail);
      
      // Store animation data
      meteor.userData = {
        speed: 0.5 + Math.random() * 0.5
      };
      
      return meteor;
    } catch (error) {
      console.error('Error creating meteor:', error);
      return null;
    }
  }
  
  // Add panel line to the ship body for more detail
  addPanelLine(ship, z, radius = 0.65) {
    const lineGeometry = new THREE.TorusGeometry(radius, 0.02, 8, 16, Math.PI * 2);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    
    const line = new THREE.Mesh(lineGeometry, lineMaterial);
    line.position.set(0, 0, z);
    line.rotation.y = Math.PI / 2;
    ship.add(line);
  }
} 