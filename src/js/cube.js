import * as THREE from 'three';

export function initCube(element) {
  // Create scene
  const scene = new THREE.Scene();
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  camera.position.z = 3;
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(120, 120);
  renderer.setClearColor(0x000000, 0);
  element.appendChild(renderer.domElement);
  
  // Create cube geometry
  const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
  
  // Create materials for each face with different colors
  const materials = [
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, wireframe: true, transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: 0x0077ff, wireframe: true, transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, wireframe: true, transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: 0x0077ff, wireframe: true, transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: 0x00ffaa, wireframe: true, transparent: true, opacity: 0.8 }),
    new THREE.MeshBasicMaterial({ color: 0x0077ff, wireframe: true, transparent: true, opacity: 0.8 })
  ];
  
  // Create cube with materials
  const cube = new THREE.Mesh(geometry, materials);
  scene.add(cube);
  
  // Create glowing edges
  const edgesGeometry = new THREE.EdgesGeometry(geometry);
  const edgesMaterial = new THREE.LineBasicMaterial({ 
    color: 0x00ffaa,
    linewidth: 2
  });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  scene.add(edges);
  
  // Inner cube
  const innerGeometry = new THREE.BoxGeometry(1, 1, 1);
  const innerMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x00ffaa, 
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const innerCube = new THREE.Mesh(innerGeometry, innerMaterial);
  scene.add(innerCube);
  
  // Animation function
  function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the cubes
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    
    innerCube.rotation.x -= 0.015;
    innerCube.rotation.y -= 0.015;
    
    edges.rotation.x = cube.rotation.x;
    edges.rotation.y = cube.rotation.y;
    
    // Pulse effect
    const time = Date.now() * 0.001; // Convert to seconds
    const scaleFactor = 1 + 0.05 * Math.sin(time * 2);
    
    // Render the scene
    renderer.render(scene, camera);
  }
  
  // Start animation
  animate();
  
  // Handle window resizing
  window.addEventListener('resize', () => {
    // Keep aspect ratio 1:1
    renderer.setSize(120, 120);
  });
  
  return {
    scene,
    camera,
    renderer,
    cube,
    innerCube,
    edges
  };
}