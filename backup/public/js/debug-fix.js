// Debug Fix Script
console.log('Debug fix script loaded');

// Make sure OrbitControls is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Checking for OrbitControls...');
  
  // Define a minimal OrbitControls fallback
  function defineMinimalOrbitControls() {
    console.log('Defining minimal OrbitControls fallback');
    THREE.OrbitControls = function(camera, domElement) {
      this.camera = camera;
      this.domElement = domElement || document;
      this.enabled = true;
      this.target = new THREE.Vector3();
      this.enableZoom = true;
      this.zoomSpeed = 1.0;
      this.enableRotate = true;
      this.rotateSpeed = 1.0;
      this.enablePan = true;
      this.panSpeed = 1.0;
      this.enableDamping = false;
      this.dampingFactor = 0.25;
      
      // Add necessary methods
      this.update = function() { return true; };
      this.dispose = function() {
        // Do nothing but needs to exist
      };
    };
    
    return true;
  }
  
  // Function to load OrbitControls with explicit global attachment
  function loadOrbitControls() {
    console.log('Loading OrbitControls...');
    
    // First check if Three.js is loaded
    if (typeof THREE === 'undefined') {
      console.error('THREE is not defined! Cannot load OrbitControls.');
      return false;
    }
    
    // Try loading inline (safer approach)
    try {
      // Simple inline implementation of OrbitControls
      if (defineMinimalOrbitControls()) {
        console.log('Minimal OrbitControls fallback defined');
        
        // Initialize controls for the game manager if it exists
        setTimeout(function() {
          if (window.gameManager && window.gameManager.camera && window.gameManager.renderer) {
            console.log('Initializing fallback OrbitControls for game manager');
            window.gameManager.controls = new THREE.OrbitControls(
              window.gameManager.camera, 
              window.gameManager.renderer.domElement
            );
            console.log('Fallback OrbitControls initialized successfully');
          }
        }, 1000);
        
        return true;
      }
    } catch (e) {
      console.error('Error creating inline OrbitControls:', e);
    }
    
    // Create script element for OrbitControls as a fallback
    const orbitScript = document.createElement('script');
    orbitScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/examples/js/controls/OrbitControls.js';
    
    // Handle successful load
    orbitScript.onload = function() {
      console.log('OrbitControls loaded successfully from CDN!');
      
      // Initialize OrbitControls for the game manager if it exists
      setTimeout(function() {
        if (window.gameManager && window.gameManager.camera && window.gameManager.renderer) {
          console.log('Initializing OrbitControls for game manager');
          try {
            window.gameManager.controls = new THREE.OrbitControls(
              window.gameManager.camera, 
              window.gameManager.renderer.domElement
            );
            console.log('OrbitControls initialized for game manager successfully');
          } catch (error) {
            console.error('Failed to initialize OrbitControls:', error);
            // If CDN loading fails, use the minimal implementation
            defineMinimalOrbitControls();
          }
        }
      }, 1000);
    };
    
    // Handle load error
    orbitScript.onerror = function() {
      console.error('Failed to load OrbitControls from CDN!');
      // Define a minimal implementation as fallback
      defineMinimalOrbitControls();
    };
    
    // Add the script to the head
    document.head.appendChild(orbitScript);
    return true;
  }
  
  // Check if THREE is already defined
  if (typeof THREE === 'undefined') {
    console.error('THREE is not defined! Loading Three.js first...');
    
    // Create a script element to load Three.js
    const threeScript = document.createElement('script');
    threeScript.src = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
    
    // Handle successful load
    threeScript.onload = function() {
      console.log('THREE.js loaded successfully');
      loadOrbitControls();
    };
    
    // Handle load error
    threeScript.onerror = function() {
      console.error('Failed to load THREE.js! Game will not work correctly.');
      alert('Failed to load Three.js. The game will not work correctly. Please check your internet connection and try again.');
    };
    
    // Add the script to the head
    document.head.appendChild(threeScript);
  } else if (typeof THREE.OrbitControls === 'undefined') {
    console.warn('OrbitControls not loaded! Loading fallback...');
    loadOrbitControls();
  } else {
    console.log('OrbitControls already loaded');
  }
});

// Force scene visibility
window.addEventListener('load', function() {
  setTimeout(function() {
    console.log('Applying debug fixes to ensure scene visibility');
    
    // Check if game manager exists
    if (window.gameManager) {
      console.log('Game manager found, applying fixes');
      
      // Ensure scene has proper lighting
      if (window.gameManager.scene) {
        // Add strong ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        window.gameManager.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(1, 1, 1);
        window.gameManager.scene.add(directionalLight);
        
        console.log('Added extra lighting to scene');
        
        // Force a render
        if (window.gameManager.renderer && window.gameManager.camera) {
          window.gameManager.renderer.render(window.gameManager.scene, window.gameManager.camera);
          console.log('Forced scene render');
        }
      }
    }
  }, 2000);
});

// Check WebGL support
window.addEventListener('load', function() {
  // Check if WebGL is supported
  function isWebGLSupported() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }
  
  if (isWebGLSupported()) {
    console.log('WebGL is supported');
  } else {
    console.error('WebGL is not supported by your browser');
    alert('WebGL is not supported by your browser. The game may not work correctly.');
  }
}); 