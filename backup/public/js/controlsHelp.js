// Controls help module
class ControlsHelp {
  constructor() {
    this.helpElement = null;
    this.isVisible = false;
  }
  
  init() {
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
      <p><b>↑</b> - Pitch up</p>
      <p><b>↓</b> - Pitch down</p>
      <p><b>←</b> - Rotate left</p>
      <p><b>→</b> - Rotate right</p>
      <p><b>I</b> - Pitch up (alt)</p>
      <p><b>K</b> - Pitch down (alt)</p>
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
    this.helpElement = controlsHelp;
    
    // Add toggle event listener
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyH') {
        this.toggle();
      }
    });
  }
  
  toggle() {
    this.isVisible = !this.isVisible;
    this.helpElement.style.display = this.isVisible ? 'block' : 'none';
  }
  
  show() {
    this.isVisible = true;
    this.helpElement.style.display = 'block';
  }
  
  hide() {
    this.isVisible = false;
    this.helpElement.style.display = 'none';
  }
} 