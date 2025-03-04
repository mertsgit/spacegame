// OrbitControls.js - Three.js OrbitControls implementation
// This allows the camera to orbit around a target.

THREE.OrbitControls = function ( object, domElement ) {

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;

	// API
	this.enabled = true;
	this.target = new THREE.Vector3();

	this.enableZoom = true;
	this.zoomSpeed = 1.0;
	this.minDistance = 0;
	this.maxDistance = Infinity;

	this.enableRotate = true;
	this.rotateSpeed = 1.0;

	this.enablePan = true;
	this.panSpeed = 1.0;
	this.screenSpacePanning = false;
	this.keyPanSpeed = 7.0;

	this.autoRotate = false;
	this.autoRotateSpeed = 2.0;

	this.minPolarAngle = 0;
	this.maxPolarAngle = Math.PI;

	this.minAzimuthAngle = - Infinity;
	this.maxAzimuthAngle = Infinity;

	this.enableDamping = false;
	this.dampingFactor = 0.05;

	// internals
	this.spherical = new THREE.Spherical();
	this.sphericalDelta = new THREE.Spherical();

	this.scale = 1;
	this.panOffset = new THREE.Vector3();
	this.zoomChanged = false;

	this.rotateStart = new THREE.Vector2();
	this.rotateEnd = new THREE.Vector2();
	this.rotateDelta = new THREE.Vector2();

	this.panStart = new THREE.Vector2();
	this.panEnd = new THREE.Vector2();
	this.panDelta = new THREE.Vector2();

	this.dollyStart = new THREE.Vector2();
	this.dollyEnd = new THREE.Vector2();
	this.dollyDelta = new THREE.Vector2();

	this.update = function () {
		var position = this.object.position;
		var offset = position.clone().sub( this.target );

		// rotate offset to "y-axis-is-up" space
		offset.applyQuaternion( this.object.quaternion.clone().invert() );

		// angle from z-axis around y-axis
		this.spherical.setFromVector3( offset );

		if ( this.autoRotate && this.enabled ) {
			this.spherical.theta += this.autoRotateSpeed / 1000;
		}

		this.spherical.theta += this.sphericalDelta.theta;
		this.spherical.phi += this.sphericalDelta.phi;

		// restrict theta to be between desired limits
		this.spherical.theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, this.spherical.theta ) );

		// restrict phi to be between desired limits
		this.spherical.phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, this.spherical.phi ) );

		this.spherical.makeSafe();

		this.spherical.radius *= this.scale;

		// restrict radius to be between desired limits
		this.spherical.radius = Math.max( this.minDistance, Math.min( this.maxDistance, this.spherical.radius ) );

		// move target to panned location
		this.target.add( this.panOffset );

		offset.setFromSpherical( this.spherical );

		// rotate offset back to "camera-up-vector-is-up" space
		offset.applyQuaternion( this.object.quaternion );

		position.copy( this.target ).add( offset );

		this.object.lookAt( this.target );

		if ( this.enableDamping === true ) {
			this.sphericalDelta.theta *= ( 1 - this.dampingFactor );
			this.sphericalDelta.phi *= ( 1 - this.dampingFactor );
			this.panOffset.multiplyScalar( 1 - this.dampingFactor );
		} else {
			this.sphericalDelta.set( 0, 0, 0 );
			this.panOffset.set( 0, 0, 0 );
		}

		this.scale = 1;

		// update condition is:
		// min(camera displacement, camera rotation in radians)^2 > EPS
		// using small-angle approximation cos(x/2) = 1 - x^2 / 8

		return true;
	};

	this.handleMouseDownRotate = function ( event ) {
		this.rotateStart.set( event.clientX, event.clientY );
	};

	this.handleMouseDownDolly = function ( event ) {
		this.dollyStart.set( event.clientX, event.clientY );
	};

	this.handleMouseDownPan = function ( event ) {
		this.panStart.set( event.clientX, event.clientY );
	};

	this.handleMouseMoveRotate = function ( event ) {
		this.rotateEnd.set( event.clientX, event.clientY );
		this.rotateDelta.subVectors( this.rotateEnd, this.rotateStart ).multiplyScalar( this.rotateSpeed );

		this.sphericalDelta.theta -= 2 * Math.PI * this.rotateDelta.x / this.domElement.clientHeight;
		this.sphericalDelta.phi -= 2 * Math.PI * this.rotateDelta.y / this.domElement.clientHeight;

		this.rotateStart.copy( this.rotateEnd );
	};

	this.handleMouseMoveDolly = function ( event ) {
		this.dollyEnd.set( event.clientX, event.clientY );
		this.dollyDelta.subVectors( this.dollyEnd, this.dollyStart );

		if ( this.dollyDelta.y > 0 ) {
			this.dollyIn( this.getZoomScale() );
		} else if ( this.dollyDelta.y < 0 ) {
			this.dollyOut( this.getZoomScale() );
		}

		this.dollyStart.copy( this.dollyEnd );
	};

	this.dollyIn = function ( dollyScale ) {
		if ( this.enableZoom === false ) return;
		this.scale /= dollyScale;
	};

	this.dollyOut = function ( dollyScale ) {
		if ( this.enableZoom === false ) return;
		this.scale *= dollyScale;
	};

	this.getZoomScale = function () {
		return Math.pow( 0.95, this.zoomSpeed );
	};

	// event listeners
	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	console.log('OrbitControls loaded successfully');
};