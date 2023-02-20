import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import Stats from 'stats.js'

// FPS Counter

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()

// Lights

const ambientLight = new THREE.AmbientLight(0xffffff, 1);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(23, 30, -30);
directionalLight.castShadow = true;

directionalLight.shadow.mapSize.width = 512;
directionalLight.shadow.mapSize.height = 512;
directionalLight.shadow.camera.near = 2;
directionalLight.shadow.camera.far = 5;

scene.add(directionalLight);
scene.add(ambientLight);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1200)
camera.position.x = -22
camera.position.y = 11
camera.position.z = 0

const helper = new THREE.CameraHelper(camera);


scene.add(camera);
// scene.add(helper);



const cameraPointLight = new THREE.PointLight(0xffffff, 2, 100, 0.3);
camera.add(cameraPointLight);

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true;

controls.addEventListener( "change", event => {  
    console.log( controls.object.position ); 
    console.log( controls.object.rotation ); 
});

const loader = new GLTFLoader();

loader.load('/telescope/scene.gltf', function(gltf){
    const telescope = gltf.scene.children[0];
    telescope.scale.set(0.05, 0.05, 0.05);
    telescope.position.set(0, 7.5, 0);
    telescope.castShadow = true;
    scene.add(telescope);
    directionalLight.target = telescope;
});

// loader.load('/telescope/scene.gltf', function(gltf){
//     const telescope2 = gltf.scene.children[0];
//     telescope2.scale.set(0.05, 0.05, 0.05);
//     telescope2.position.set(-1,0,-6);
//     telescope2.castShadow = true;
//     camera.add(telescope2);
//     telescope2.rotateY(180);
// });

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

renderer.setClearColor(0x1e1f29);

const stars=[];
let star;

function addSphere(){
    for (let x = -1000; x < 1000; x+= 20){
        let geometry = new THREE.SphereGeometry(0.5, 32, 32);
        let material = new THREE.MeshBasicMaterial({color:0xffffff});
        let sphere = new THREE.Mesh(geometry, material);

        sphere.position.z = Math.random() * 1000 - 500;
		    sphere.position.y = Math.random() * 1000 - 500;

        sphere.position.x = x;
        sphere.scale.z = sphere.scale.y = 2;

        scene.add( sphere );
		stars.push(sphere);
    }
}

function animateStars() { 		
    // loop through each star
    for(var i=0; i<stars.length; i++) {
        
        star = stars[i]; 
            
        // and move it forward dependent on the mouseY position. 
        star.position.x +=  i/10;
            
        // if the particle is too close move it to the back
        if(star.position.x>1000) star.position.x-=2000;  
    }
}




function zoomIn(){
  const zoomButton = document.querySelector('button');
  zoomButton.addEventListener('click', function(e){
    console.log(e.target);
      if(e.target.getAttribute('zoom') === "in"){
        camera.position.set(-22,11,0);
        zoomButton.innerHTML = "Zoom In";
        zoomButton.setAttribute('zoom', 'out');
        controls.target.set(0,0,1);
    } else {
      camera.position.set(3.6,10.1,0);
      zoomButton.setAttribute('zoom', 'in');
      zoomButton.innerHTML = "Zoom Out";
      controls.target.set(4,10,0);
    }
  })
}

//

////////////
// MATERIAL
////////////

const vertexShader = `
  varying vec2 vUv;
  uniform float time;
  
  ${simpleNoise}
  
	void main() {

    vUv = uv;
    float t = time * 2.;
    
    // VERTEX POSITION
    
    vec4 mvPosition = vec4( position, 1.0 );
    #ifdef USE_INSTANCING
    	mvPosition = instanceMatrix * mvPosition;
    #endif
    
    // DISPLACEMENT
    
    float noise = smoothNoise(mvPosition.xz * 0.5 + vec2(0., t));
    noise = pow(noise * 0.5 + 0.5, 2.) * 2.;
    
    // here the displacement is made stronger on the blades tips.
    float dispPower = 1. - cos( uv.y * 3.1416 * 0.5 );
    
    float displacement = noise * ( 0.3 * dispPower );
    mvPosition.z -= displacement;
    
    //
    
    vec4 modelViewPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * modelViewPosition;

	}
`;

const fragmentShader = `
  varying vec2 vUv;
  
  void main() {
  	vec3 baseColor = vec3( 0.41, 1.0, 0.5 );
    float clarity = ( vUv.y * 0.875 ) + 0.125;
    gl_FragColor = vec4( baseColor * clarity, 1 );
  }
`;

const uniforms = {
	time: {
  	value: 0
  }
}

const leavesMaterial = new THREE.ShaderMaterial({
	vertexShader,
  fragmentShader,
  uniforms,
  side: THREE.DoubleSide
});

const instanceNumber = 350000;
const dummy = new THREE.Object3D();

const geometry = new THREE.PlaneGeometry( 0.05, 2.5, 1, 4 );
geometry.translate( 0, 0.5, 0 ); // move grass blade geometry lowest point at 0.

const instancedMesh = new THREE.InstancedMesh( geometry, leavesMaterial, instanceNumber );

const grassGeometry = new THREE.PlaneGeometry(160,120);
const grassMaterial = new THREE.MeshBasicMaterial( {color: 0x149118, side: THREE.DoubleSide})

const grassPlane = new THREE.Mesh(grassGeometry, grassMaterial);

scene.add( instancedMesh );
scene.add(grassPlane);
grassPlane.rotation.set(1.57, 0, 0)
grassPlane.receiveShadow = true;

// Position and scale the grass blade instances randomly.

for ( let i=0 ; i<instanceNumber ; i++ ) {

	dummy.position.set(
  	( Math.random() - 0.5 ) * 160,
    0,
    ( Math.random() - 0.5 ) * 120
  );
  
  dummy.scale.setScalar( 0.5 + Math.random() * 0.5 );
  
  dummy.rotation.y = Math.random() * Math.PI;
  
  dummy.updateMatrix();
  instancedMesh.setMatrixAt( i, dummy.matrix );

}

//


/**
 * Animate
 */
const clock = new THREE.Clock()
let lastElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - lastElapsedTime
    lastElapsedTime = elapsedTime

    //
    leavesMaterial.uniforms.time.value = elapsedTime;
    leavesMaterial.uniformsNeedUpdate = true;
    //

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
    // animateStars();


    stats.update();

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

addSphere();
tick();
zoomIn();