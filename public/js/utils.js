// Utility functions for the game

// Debug logging
const DEBUG = false;

function log(message) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

// Generate a random color for the spaceship
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Check if Three.js is loaded
function isThreeLoaded() {
  return typeof THREE !== 'undefined';
}

// Check if OrbitControls is loaded
function areOrbitControlsLoaded() {
  return isThreeLoaded() && typeof THREE.OrbitControls === 'function';
}

// Create a minimal OrbitControls implementation if the real one fails to load
function createMinimalOrbitControls() {
  log('Creating minimal OrbitControls implementation');
  
  if (!isThreeLoaded()) {
    console.error('THREE is not loaded, cannot create minimal OrbitControls');
    return;
  }
  
  // Create a minimal OrbitControls class
  THREE.OrbitControls = function(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;
    this.target = new THREE.Vector3();
    this.minDistance = 0;
    this.maxDistance = Infinity;
    this.enableZoom = true;
    this.zoomSpeed = 1.0;
    this.enableRotate = true;
    this.rotateSpeed = 1.0;
    this.enablePan = true;
    this.keyPanSpeed = 7.0;
    this.autoRotate = false;
    this.autoRotateSpeed = 2.0;
    this.enableDamping = true;
    this.dampingFactor = 0.05;
    
    this.update = function() {
      // Very simple update that just looks at the target
      if (this.enabled) {
        this.camera.lookAt(this.target);
      }
      return true;
    };
    
    this.dispose = function() {
      // Nothing to do in minimal implementation
    };
    
    log('Minimal OrbitControls created');
  };
}

// Load the Three.js libraries with fallbacks
function ensureLibrariesLoaded() {
  // Check Three.js
  if (!isThreeLoaded()) {
    console.error('THREE.js is not loaded! Attempting to load it dynamically...');
    
    const threeScript = document.createElement('script');
    threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
    document.head.appendChild(threeScript);
    
    threeScript.onload = function() {
      log('THREE.js loaded dynamically');
      
      // Now load OrbitControls
      if (!areOrbitControlsLoaded()) {
        const orbitScript = document.createElement('script');
        orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/controls/OrbitControls.js';
        document.head.appendChild(orbitScript);
        
        orbitScript.onload = function() {
          log('OrbitControls loaded dynamically');
        };
        
        orbitScript.onerror = function() {
          console.error('Failed to load OrbitControls! Creating minimal implementation...');
          createMinimalOrbitControls();
        };
      }
    };
    
    threeScript.onerror = function() {
      console.error('Failed to load THREE.js! Game cannot run.');
      alert('Failed to load THREE.js! Please check your internet connection and reload the page.');
    };
  } else if (!areOrbitControlsLoaded()) {
    log('THREE.js is loaded but OrbitControls is not. Attempting to load it...');
    
    const orbitScript = document.createElement('script');
    orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/controls/OrbitControls.js';
    document.head.appendChild(orbitScript);
    
    orbitScript.onload = function() {
      log('OrbitControls loaded dynamically');
    };
    
    orbitScript.onerror = function() {
      console.error('Failed to load OrbitControls! Creating minimal implementation...');
      createMinimalOrbitControls();
    };
  }
}

// Ensure libraries are loaded
ensureLibrariesLoaded();

// Create a particle texture programmatically and return the data URL
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  // Create a radial gradient for a soft particle
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  return canvas.toDataURL();
}

// Add roundRect method to CanvasRenderingContext2D prototype if it doesn't exist
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
    if (typeof radius === 'undefined') {
      radius = 5;
    }
    
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.arcTo(x + width, y, x + width, y + radius, radius);
    this.lineTo(x + width, y + height - radius);
    this.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    this.lineTo(x + radius, y + height);
    this.arcTo(x, y + height, x, y + height - radius, radius);
    this.lineTo(x, y + radius);
    this.arcTo(x, y, x + radius, y, radius);
    this.closePath();
    return this;
  };
} 