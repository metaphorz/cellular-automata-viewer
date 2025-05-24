import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';

// Define colors with more realistic tones
const DEFAULT_ALIVE_COLOR = 0x4CAF50; // Softer green
const DEFAULT_DYING_COLOR = 0xF44336; // Softer red

// Material preset configurations
const MATERIAL_PRESETS = {
  standard: {
    roughness: 0.2,
    metalness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3,
    reflectivity: 0.5,
    envMapIntensity: 0.8
  },
  metal: {
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9,
    envMapIntensity: 1.0
  },
  glass: {
    roughness: 0.0,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 1.0,
    envMapIntensity: 1.0,
    transmission: 0.9, // Transparent
    ior: 1.5 // Index of refraction for glass
  },
  plastic: {
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.4,
    reflectivity: 0.3,
    envMapIntensity: 0.5
  },
  ceramic: {
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.2,
    reflectivity: 0.6,
    envMapIntensity: 0.7
  },
  glow: {
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.0,
    emissive: true,
    emissiveIntensity: 0.5,
    reflectivity: 0.3,
    envMapIntensity: 0.0
  },
  pearl: {
    roughness: 0.1,
    metalness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
    envMapIntensity: 0.9,
    iridescence: 1.0,
    iridescenceIOR: 1.3
  },
  chrome: {
    roughness: 0.0,
    metalness: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    reflectivity: 1.0,
    envMapIntensity: 1.0
  }
};

const Automaton3DViewInstanced = ({
  width = 600,
  height = 500,
  gridData,
  cameraDistance = 20,
  rotationSpeed = 0,
  cubeOpacity = 1.0,
  cubeColor = '#4CAF50',
  materialType = 'standard',
  showHelpers = true,
  onCameraDistanceChange,
  showStats = false,
  initialRotation = { x: 0, y: 0 },
  onRotationChange,
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const instancedMeshRef = useRef(null);
  const dyingInstancedMeshRef = useRef(null);
  const helpersRef = useRef({
    axis: null,
    xLight: null,
    yLight: null,
    zLight: null,
    topLight1: null,
    topLight2: null,
    grid: null
  });
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previousMousePosition, setPreviousMousePosition] = useState({ x: 0, y: 0 });
  const [isDroppingImage, setIsDroppingImage] = useState(false);
  const [cubeTexture, setCubeTexture] = useState(null);
  const animationFrameRef = useRef(null);
  
  // Stats for performance tracking
  const [stats, setStats] = useState({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    activeCells: 0,
    lastUpdated: Date.now()
  });
  
  const statsRef = useRef({ 
    lastTime: 0, 
    frames: 0,
    fps: 0
  });
  
  // Calculate grid info once
  const gridInfo = useMemo(() => {
    if (!gridData) return { sizeX: 0, sizeY: 0, sizeZ: 0, centerX: 0, centerY: 0, centerZ: 0 };
    
    const sizeX = gridData.length;
    const sizeY = gridData[0]?.length || 0;
    const sizeZ = gridData[0]?.[0]?.length || 0;
    
    return {
      sizeX,
      sizeY,
      sizeZ,
      centerX: sizeX / 2,
      centerY: sizeY / 2,
      centerZ: sizeZ / 2,
      totalCells: sizeX * sizeY * sizeZ
    };
  }, [gridData]);

  // Initialize Three.js scene, camera, renderer
  useEffect(() => {
    console.log('[3DViewInstanced] Setting up Three.js scene');
    
    if (!containerRef.current) return;
    
    try {
      // Create scene - white room environment
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff); // White background
      
      // Apply initial rotation if provided
      if (initialRotation) {
        scene.rotation.x = initialRotation.x;
        scene.rotation.y = initialRotation.y;
        console.log(`[3DViewInstanced] Applied initial rotation: x=${initialRotation.x}, y=${initialRotation.y}`);
      }
      
      sceneRef.current = scene;
      
      // Create camera
      const aspect = width / height;
      const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
      camera.position.set(0, cameraDistance * 0.3, cameraDistance);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;
      
      // Create renderer with improved shadows and optimized for high performance
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance' // Request high-performance GPU if available
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
      renderer.outputEncoding = THREE.sRGBEncoding; // Improved color handling
      
      // Enable shader optimization for larger grids
      renderer.info.autoReset = false; // Manually manage stats for better performance
      
      // Make sure stats are properly initialized
      renderer.info.reset();
      console.log('[3DViewInstanced] Renderer info initialized:', renderer.info);
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Add lighting - improved lighting setup for realism
      // Ambient light for overall illumination
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);
      
      // X-axis light (primary) - red tint
      const xAxisLight = new THREE.DirectionalLight(0xffeeee, 0.8);
      xAxisLight.position.set(15, 5, 0);
      xAxisLight.castShadow = true;
      // Configure shadow properties
      xAxisLight.shadow.mapSize.width = 1024;
      xAxisLight.shadow.mapSize.height = 1024;
      xAxisLight.shadow.camera.near = 0.5;
      xAxisLight.shadow.camera.far = 50;
      xAxisLight.shadow.bias = -0.001;
      scene.add(xAxisLight);
      
      // Y-axis light - green tint
      const yAxisLight = new THREE.DirectionalLight(0xeeffee, 0.8);
      yAxisLight.position.set(0, 15, 5);
      yAxisLight.castShadow = true;
      yAxisLight.shadow.mapSize.width = 1024;
      yAxisLight.shadow.mapSize.height = 1024;
      yAxisLight.shadow.camera.near = 0.5;
      yAxisLight.shadow.camera.far = 50;
      yAxisLight.shadow.bias = -0.001;
      scene.add(yAxisLight);
      
      // Z-axis light - blue tint
      const zAxisLight = new THREE.DirectionalLight(0xeeeeff, 0.8);
      zAxisLight.position.set(5, 5, 15);
      zAxisLight.castShadow = true;
      zAxisLight.shadow.mapSize.width = 1024;
      zAxisLight.shadow.mapSize.height = 1024;
      zAxisLight.shadow.camera.near = 0.5;
      zAxisLight.shadow.camera.far = 50;
      zAxisLight.shadow.bias = -0.001;
      scene.add(zAxisLight);
      
      // Top light 1 - white light from top left
      const topLight1 = new THREE.DirectionalLight(0xffffff, 0.7);
      topLight1.position.set(-10, 20, -10);
      topLight1.castShadow = true;
      topLight1.shadow.mapSize.width = 1024;
      topLight1.shadow.mapSize.height = 1024;
      topLight1.shadow.camera.near = 0.5;
      topLight1.shadow.camera.far = 50;
      topLight1.shadow.bias = -0.001;
      scene.add(topLight1);
      
      // Top light 2 - white light from top right
      const topLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
      topLight2.position.set(10, 20, 10);
      topLight2.castShadow = true;
      topLight2.shadow.mapSize.width = 1024;
      topLight2.shadow.mapSize.height = 1024;
      topLight2.shadow.camera.near = 0.5;
      topLight2.shadow.camera.far = 50;
      topLight2.shadow.bias = -0.001;
      scene.add(topLight2);
      
      // Fill light from opposite direction
      const fillLight = new THREE.DirectionalLight(0xffffee, 0.3);
      fillLight.position.set(-10, 5, -10);
      scene.add(fillLight);
      
      // Rim light for highlighting edges
      const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
      rimLight.position.set(0, -10, 0);
      scene.add(rimLight);
      
      // Create room (walls, floor, ceiling)
      const roomSize = 40;
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Pure white
        side: THREE.BackSide,
        roughness: 0.9,
        metalness: 0.1
      });
      
      const room = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize, roomSize, roomSize),
        wallMaterial
      );
      room.receiveShadow = true;
      scene.add(room);
      
      // Add floor with grid pattern
      const floorSize = roomSize - 1;
      const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
      const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Pure white floor
        roughness: 0.8,
        metalness: 0.2
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -roomSize/2;
      floor.receiveShadow = true;
      scene.add(floor);
      
      // Add subtle grid lines to floor
      const gridHelper = new THREE.GridHelper(floorSize, 20, 0xeeeeee, 0xeeeeee);
      gridHelper.position.y = -roomSize/2 + 0.01; // Slightly above floor
      scene.add(gridHelper);
      helpersRef.current.grid = gridHelper;
      
      // Small axis helper for orientation
      const axisHelper = new THREE.AxesHelper(3);
      scene.add(axisHelper);
      helpersRef.current.axis = axisHelper;
      
      // Add light helpers to visualize light positions
      const xLightHelper = new THREE.DirectionalLightHelper(xAxisLight, 2, 0xff0000);
      scene.add(xLightHelper);
      helpersRef.current.xLight = xLightHelper;
      
      const yLightHelper = new THREE.DirectionalLightHelper(yAxisLight, 2, 0x00ff00);
      scene.add(yLightHelper);
      helpersRef.current.yLight = yLightHelper;
      
      const zLightHelper = new THREE.DirectionalLightHelper(zAxisLight, 2, 0x0000ff);
      scene.add(zLightHelper);
      helpersRef.current.zLight = zLightHelper;
      
      // Add helpers for the top lights
      const topLight1Helper = new THREE.DirectionalLightHelper(topLight1, 2, 0xffff00); // Yellow
      scene.add(topLight1Helper);
      helpersRef.current.topLight1 = topLight1Helper;
      
      const topLight2Helper = new THREE.DirectionalLightHelper(topLight2, 2, 0xffff00); // Yellow
      scene.add(topLight2Helper);
      helpersRef.current.topLight2 = topLight2Helper;
      
      // Set initial visibility based on showHelpers prop
      Object.values(helpersRef.current).forEach(helper => {
        if (helper) helper.visible = showHelpers;
      });
      
      // Create an environment map for realistic reflections
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      
      // Create a simple environment cubemap
      const cubeRenderTarget = pmremGenerator.fromScene(new THREE.Scene());
      const envMap = cubeRenderTarget.texture;
      scene.environment = envMap; // Apply to all materials with envMap
      
      cubeRenderTarget.dispose();
      pmremGenerator.dispose();
      
      // The animation loop will be set up in the rotation effect
      
    } catch (err) {
      console.error('[3DViewInstanced] Error setting up Three.js:', err);
      setError(`Three.js setup error: ${err.message}`);
    }
    
    // Cleanup function
    return () => {
      console.log('[3DViewInstanced] Cleaning up Three.js resources');
      cancelAnimationFrame(animationFrameRef.current);
      
      // Dispose of texture if it exists
      if (cubeTexture) {
        cubeTexture.dispose();
      }
      
      if (rendererRef.current) {
        if (containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
      }
      
      // Dispose of helpers and other objects
      if (sceneRef.current) {
        // Properly dispose of light helpers and other scene objects
        sceneRef.current.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                if (material.map) material.map.dispose();
                material.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
        });
        
        // Clear scene
        sceneRef.current.clear();
      }
    };
  }, [width, height, cameraDistance]);
  
  // Save a reference to the last valid grid data to ensure we can rebuild the view
  // even when using camera controls while the simulation is paused
  const lastValidGridDataRef = useRef(null);
  
  // Update cellular automaton cells with instanced rendering
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Save the grid data if it's valid (for later reconstruction if needed)
    if (gridData) {
      lastValidGridDataRef.current = gridData;
    } else if (!lastValidGridDataRef.current) {
      // If we don't have valid grid data or saved data, can't proceed
      return;
    }
    
    // Use either the current grid data or the last valid one
    const activeGridData = gridData || lastValidGridDataRef.current;
    
    console.log('[3DViewInstanced] Updating cell grid display with instanced rendering');
    const scene = sceneRef.current;
    
    // Remove old instanced meshes if they exist
    if (instancedMeshRef.current) {
      scene.remove(instancedMeshRef.current);
      instancedMeshRef.current.geometry.dispose();
      instancedMeshRef.current.material.dispose();
      instancedMeshRef.current = null;
    }
    
    if (dyingInstancedMeshRef.current) {
      scene.remove(dyingInstancedMeshRef.current);
      dyingInstancedMeshRef.current.geometry.dispose();
      dyingInstancedMeshRef.current.material.dispose();
      dyingInstancedMeshRef.current = null;
    }
    
    // Get grid dimensions
    const { sizeX, sizeY, sizeZ, centerX, centerY, centerZ } = gridInfo;
    
    if (sizeX === 0 || sizeY === 0 || sizeZ === 0) {
      console.warn('[3DViewInstanced] Invalid grid dimensions:', sizeX, sizeY, sizeZ);
      return;
    }
    
    console.log('[3DViewInstanced] Grid dimensions:', sizeX, sizeY, sizeZ);
    
    // Create cell geometry (slightly rounded cube)
    const cellGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9, 2, 2, 2);
    
    // Get material preset
    const materialPreset = MATERIAL_PRESETS[materialType] || MATERIAL_PRESETS.standard;
    
    // Convert hex color to THREE.js color
    const colorValue = new THREE.Color(cubeColor).getHex();
    
    // Create materials for alive and dying cells
    const aliveMaterial = new THREE.MeshPhysicalMaterial({
      color: colorValue,
      ...materialPreset,
      transparent: cubeOpacity < 1.0 || materialType === 'glass',
      opacity: cubeOpacity,
      emissive: materialPreset.emissive ? colorValue : 0x000000,
      emissiveIntensity: materialPreset.emissiveIntensity || 0,
      map: cubeTexture
    });
    
    const dyingMaterial = new THREE.MeshPhysicalMaterial({
      color: DEFAULT_DYING_COLOR,
      ...materialPreset,
      transparent: cubeOpacity < 1.0 || materialType === 'glass',
      opacity: cubeOpacity,
      map: cubeTexture
    });
    
    // Count alive and dying cells to create appropriately sized instance arrays
    let aliveCellCount = 0;
    let dyingCellCount = 0;
    
    // First pass to count cells
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const cellState = activeGridData[x][y][z];
          if (cellState === 1) {
            aliveCellCount++;
          } else if (cellState === 2) {
            dyingCellCount++;
          }
        }
      }
    }
    
    console.log(`[3DViewInstanced] Cell counts - Alive: ${aliveCellCount}, Dying: ${dyingCellCount}`);
    
    // For debugging - if no cells are alive, create a test cube to ensure rendering is working
    if (aliveCellCount === 0) {
      console.log('[3DViewInstanced] No alive cells found, creating test cube');
      // Create a single test cube at the center
      aliveCellCount = 1;
    }
    
    // Create instanced meshes if there are cells to render
    // Always create alive mesh (even if empty) to ensure consistency
    const aliveInstancedMesh = new THREE.InstancedMesh(
      cellGeometry, 
      aliveMaterial, 
      Math.max(1, aliveCellCount) // Ensure at least 1 instance
    );
    aliveInstancedMesh.castShadow = true;
    aliveInstancedMesh.receiveShadow = true;
    instancedMeshRef.current = aliveInstancedMesh;
    scene.add(aliveInstancedMesh);
    
    if (dyingCellCount > 0) {
      const dyingInstancedMesh = new THREE.InstancedMesh(cellGeometry, dyingMaterial, dyingCellCount);
      dyingInstancedMesh.castShadow = true;
      dyingInstancedMesh.receiveShadow = true;
      dyingInstancedMeshRef.current = dyingInstancedMesh;
      scene.add(dyingInstancedMesh);
    }
    
    // Second pass to set instance positions
    let aliveIndex = 0;
    let dyingIndex = 0;
    const matrix = new THREE.Matrix4();
    
    // Test cube if no alive cells
    if (aliveCellCount === 1 && !activeGridData.some(plane => plane.some(row => row.some(cell => cell === 1)))) {
      // Place a visible test cube at the center
      matrix.identity(); // Reset to identity matrix
      instancedMeshRef.current.setMatrixAt(0, matrix);
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    } else {
      // Regular cells
      for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
          for (let z = 0; z < sizeZ; z++) {
            const cellState = activeGridData[x][y][z];
            
            if (cellState === 0) continue; // Skip dead cells
            
            // Create translation matrix
            matrix.makeTranslation(
              x - centerX,
              y - centerY,
              z - centerZ
            );
            
            // Set the matrix in the appropriate instanced mesh
            if (cellState === 1 && instancedMeshRef.current) {
              instancedMeshRef.current.setMatrixAt(aliveIndex, matrix);
              aliveIndex++;
            } else if (cellState === 2 && dyingInstancedMeshRef.current) {
              dyingInstancedMeshRef.current.setMatrixAt(dyingIndex, matrix);
              dyingIndex++;
            }
          }
        }
      }
      
      // Ensure all instance matrices are updated
      if (instancedMeshRef.current) {
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        // Force an update of the bounding sphere for proper culling
        instancedMeshRef.current.computeBoundingSphere();
      }
      
      if (dyingInstancedMeshRef.current) {
        dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
        dyingInstancedMeshRef.current.computeBoundingSphere();
      }
    }
    
    // Update stats
    setStats(prevStats => ({
      ...prevStats,
      activeCells: aliveCellCount + dyingCellCount
    }));
    
    console.log(`[3DViewInstanced] Instanced rendering setup complete with ${aliveCellCount + dyingCellCount} total cells`);
    
    // Force a render to ensure the cells are visible
    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.render(scene, cameraRef.current);
    }
    
  }, [gridData, gridInfo, cubeColor, materialType, cubeOpacity, cubeTexture]);
  
  // Update helper visibility when showHelpers changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    console.log('[3DViewInstanced] Updating helper visibility:', showHelpers);
    
    // Update visibility of all helpers
    Object.values(helpersRef.current).forEach(helper => {
      if (helper) helper.visible = showHelpers;
    });
    
    // Force a render update
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [showHelpers]);
  
  // Update material properties when any related property changes
  useEffect(() => {
    // Update materials for instanced meshes
    if (instancedMeshRef.current || dyingInstancedMeshRef.current) {
      console.log('[3DViewInstanced] Updating materials with:',
        { opacity: cubeOpacity, color: cubeColor, materialType, hasTexture: !!cubeTexture });
      
      // Get material preset based on selected type
      const materialPreset = MATERIAL_PRESETS[materialType] || MATERIAL_PRESETS.standard;
      
      // Update alive cell material
      if (instancedMeshRef.current && instancedMeshRef.current.material) {
        const material = instancedMeshRef.current.material;
        
        // Update color
        material.color.set(cubeColor);
        
        // For emissive materials, update the emissive color too
        if (materialPreset.emissive) {
          material.emissive.set(cubeColor);
          material.emissiveIntensity = materialPreset.emissiveIntensity || 0;
        } else {
          material.emissive.set(0x000000);
          material.emissiveIntensity = 0;
        }
        
        // Apply material preset properties
        Object.entries(materialPreset).forEach(([key, value]) => {
          // Skip emissive properties (handled separately)
          if (key !== 'emissive' && key !== 'emissiveIntensity') {
            material[key] = value;
          }
        });
        
        // Always ensure opacity/transparency is applied
        material.transparent = cubeOpacity < 1.0 || materialType === 'glass';
        material.opacity = cubeOpacity;
        
        // Update texture
        material.map = cubeTexture;
        
        // Flag material for update
        material.needsUpdate = true;
      }
      
      // Update dying cell material with the same properties except color
      if (dyingInstancedMeshRef.current && dyingInstancedMeshRef.current.material) {
        const material = dyingInstancedMeshRef.current.material;
        
        // Apply material preset properties
        Object.entries(materialPreset).forEach(([key, value]) => {
          if (key !== 'emissive' && key !== 'emissiveIntensity') {
            material[key] = value;
          }
        });
        
        // Always ensure opacity/transparency is applied
        material.transparent = cubeOpacity < 1.0 || materialType === 'glass';
        material.opacity = cubeOpacity;
        
        // Update texture
        material.map = cubeTexture;
        
        // Flag material for update
        material.needsUpdate = true;
      }
      
      // Force a render update
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [cubeOpacity, cubeColor, materialType, cubeTexture]);
  
  // Update camera position when distance changes
  useEffect(() => {
    if (!cameraRef.current) return;
    
    console.log(`[3DViewInstanced] Updating camera distance to ${cameraDistance}`);
    
    const camera = cameraRef.current;
    const currentPosition = camera.position.clone().normalize();
    
    // Maintain direction but update distance
    camera.position.copy(currentPosition.multiplyScalar(cameraDistance));
    
    // Ensure camera is looking at the center
    camera.lookAt(0, 0, 0);
    
    // Check if instanced meshes exist and are part of the scene
    // This helps prevent meshes from disappearing during camera updates
    if (sceneRef.current) {
      const scene = sceneRef.current;
      let meshesReinstated = false;
      
      if (instancedMeshRef.current && !scene.children.includes(instancedMeshRef.current)) {
        console.log('[3DViewInstanced] Re-adding missing instanced mesh during camera update');
        scene.add(instancedMeshRef.current);
        meshesReinstated = true;
      }
      
      if (dyingInstancedMeshRef.current && !scene.children.includes(dyingInstancedMeshRef.current)) {
        console.log('[3DViewInstanced] Re-adding missing dying instanced mesh during camera update');
        scene.add(dyingInstancedMeshRef.current);
        meshesReinstated = true;
      }
      
      // If meshes were reinstated, make sure their matrices are up to date
      if (meshesReinstated) {
        if (instancedMeshRef.current) {
          instancedMeshRef.current.instanceMatrix.needsUpdate = true;
          instancedMeshRef.current.computeBoundingSphere();
        }
        
        if (dyingInstancedMeshRef.current) {
          dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
          dyingInstancedMeshRef.current.computeBoundingSphere();
        }
      }
    }
    
    // Force a render update after camera position change
    if (rendererRef.current && sceneRef.current) {
      console.log('[3DViewInstanced] Forcing render after camera position update');
      rendererRef.current.render(sceneRef.current, camera);
      
      // Schedule an additional render to ensure persistence
      requestAnimationFrame(() => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          // Re-check for mesh presence before rendering
          const scene = sceneRef.current;
          if (instancedMeshRef.current && !scene.children.includes(instancedMeshRef.current)) {
            scene.add(instancedMeshRef.current);
          }
          if (dyingInstancedMeshRef.current && !scene.children.includes(dyingInstancedMeshRef.current)) {
            scene.add(dyingInstancedMeshRef.current);
          }
          rendererRef.current.render(scene, camera);
        }
      });
    }
    
  }, [cameraDistance]);
  
  // Mouse handling for rotation
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setPreviousMousePosition({
      x: e.clientX,
      y: e.clientY,
    });
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    
    const { x, y } = previousMousePosition;
    const deltaX = e.clientX - x;
    const deltaY = e.clientY - y;
    
    setPreviousMousePosition({
      x: e.clientX,
      y: e.clientY,
    });
    
    // Rotate scene based on mouse movement
    const scene = sceneRef.current;
    scene.rotation.y += deltaX * 0.01;
    scene.rotation.x += deltaY * 0.01;
    
    // Report rotation back to parent component
    if (onRotationChange) {
      onRotationChange({
        x: scene.rotation.x,
        y: scene.rotation.y
      });
    }
    
    // Check if instanced meshes exist and are part of the scene during rotation
    // This helps prevent meshes from disappearing during rotation
    let meshesReinstated = false;
    
    if (instancedMeshRef.current && !scene.children.includes(instancedMeshRef.current)) {
      console.log('[3DViewInstanced] Re-adding missing instanced mesh during rotation');
      scene.add(instancedMeshRef.current);
      meshesReinstated = true;
    }
    
    if (dyingInstancedMeshRef.current && !scene.children.includes(dyingInstancedMeshRef.current)) {
      console.log('[3DViewInstanced] Re-adding missing dying instanced mesh during rotation');
      scene.add(dyingInstancedMeshRef.current);
      meshesReinstated = true;
    }
    
    // If meshes were reinstated, make sure their matrices are up to date
    if (meshesReinstated) {
      if (instancedMeshRef.current) {
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        instancedMeshRef.current.computeBoundingSphere();
      }
      
      if (dyingInstancedMeshRef.current) {
        dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
        dyingInstancedMeshRef.current.computeBoundingSphere();
      }
    }
    
    // Force immediate render for smooth rotation
    rendererRef.current.render(scene, cameraRef.current);
    
    // Schedule an additional render on the next frame to ensure the meshes remain visible
    requestAnimationFrame(() => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    });
    
  }, [isDragging, previousMousePosition]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // Force one more render to ensure cells are visible after drag ends
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      // Make sure our meshes are still in the scene
      const scene = sceneRef.current;
      
      let meshesReinstated = false;
      
      if (instancedMeshRef.current && !scene.children.includes(instancedMeshRef.current)) {
        console.log('[3DViewInstanced] Re-adding missing instanced mesh after drag');
        scene.add(instancedMeshRef.current);
        meshesReinstated = true;
      }
      
      if (dyingInstancedMeshRef.current && !scene.children.includes(dyingInstancedMeshRef.current)) {
        console.log('[3DViewInstanced] Re-adding missing dying instanced mesh after drag');
        scene.add(dyingInstancedMeshRef.current);
        meshesReinstated = true;
      }
      
      // If meshes were missing, update their matrices
      if (meshesReinstated) {
        if (instancedMeshRef.current) {
          instancedMeshRef.current.instanceMatrix.needsUpdate = true;
          instancedMeshRef.current.computeBoundingSphere();
        }
        
        if (dyingInstancedMeshRef.current) {
          dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
          dyingInstancedMeshRef.current.computeBoundingSphere();
        }
      }
      
      // Force a render
      rendererRef.current.render(scene, cameraRef.current);
      
      // Schedule another render in the next frame to ensure persistence
      requestAnimationFrame(() => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      });
    }
  }, [rendererRef, sceneRef, cameraRef, instancedMeshRef, dyingInstancedMeshRef]);
  
  // Mouse wheel for zooming
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!cameraRef.current || !rendererRef.current || !sceneRef.current) {
      console.warn("[3DViewInstanced] Wheel event: Missing refs");
      return;
    }
    
    // Calculate new camera distance
    const zoomSensitivity = 0.1;
    const newDistance = cameraDistance + (e.deltaY * zoomSensitivity);
    const clampedDistance = Math.max(10, Math.min(100, newDistance));
    
    console.log(`[3DViewInstanced] Wheel event - deltaY: ${e.deltaY}, newDistance: ${newDistance}, clampedDistance: ${clampedDistance}`);
    
    // Directly update camera position for immediate visual feedback
    const camera = cameraRef.current;
    const currentDirection = camera.position.clone().normalize();
    camera.position.copy(currentDirection.multiplyScalar(clampedDistance));
    camera.lookAt(0, 0, 0);
    
    // Check if instanced meshes exist and are part of the scene
    // This helps prevent meshes from disappearing after zoom operations
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    
    let meshesReinstated = false;
    
    if (instancedMeshRef.current && !scene.children.includes(instancedMeshRef.current)) {
      console.log('[3DViewInstanced] Re-adding missing instanced mesh during zoom');
      scene.add(instancedMeshRef.current);
      meshesReinstated = true;
    }
    
    if (dyingInstancedMeshRef.current && !scene.children.includes(dyingInstancedMeshRef.current)) {
      console.log('[3DViewInstanced] Re-adding missing dying instanced mesh during zoom');
      scene.add(dyingInstancedMeshRef.current);
      meshesReinstated = true;
    }
    
    // If meshes were missing and had to be reinstated, and we have valid grid data,
    // trigger a re-render of the meshes to ensure they're properly displayed
    if (meshesReinstated && lastValidGridDataRef.current) {
      console.log('[3DViewInstanced] Meshes were reinstated, rebuilding with saved grid data');
      // Force matrices to update
      if (instancedMeshRef.current) {
        instancedMeshRef.current.instanceMatrix.needsUpdate = true;
        instancedMeshRef.current.computeBoundingSphere();
      }
      
      if (dyingInstancedMeshRef.current) {
        dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
        dyingInstancedMeshRef.current.computeBoundingSphere();
      }
    }
    
    // Force immediate render with updated camera position
    renderer.render(scene, camera);
    
    // Schedule multiple renders over the next few frames to ensure visibility persists
    // This is critical for wheel events which might otherwise cause meshes to disappear
    let frameCount = 0;
    const ensureVisibility = () => {
      if (frameCount < 5) { // Schedule multiple frames to ensure persistence
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          // Re-check if meshes need to be added on each frame
          const currentScene = sceneRef.current;
          
          if (instancedMeshRef.current && !currentScene.children.includes(instancedMeshRef.current)) {
            console.log(`[3DViewInstanced] Re-adding mesh in frame ${frameCount}`);
            currentScene.add(instancedMeshRef.current);
            if (instancedMeshRef.current.instanceMatrix) {
              instancedMeshRef.current.instanceMatrix.needsUpdate = true;
              instancedMeshRef.current.computeBoundingSphere();
            }
          }
          
          if (dyingInstancedMeshRef.current && !currentScene.children.includes(dyingInstancedMeshRef.current)) {
            console.log(`[3DViewInstanced] Re-adding dying mesh in frame ${frameCount}`);
            currentScene.add(dyingInstancedMeshRef.current);
            if (dyingInstancedMeshRef.current.instanceMatrix) {
              dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
              dyingInstancedMeshRef.current.computeBoundingSphere();
            }
          }
          
          // Force another render
          rendererRef.current.render(currentScene, cameraRef.current);
          frameCount++;
          requestAnimationFrame(ensureVisibility);
        }
      }
    };
    
    // Start the sequence of renders
    requestAnimationFrame(ensureVisibility);
    
    // Also update app state for consistency
    if (onCameraDistanceChange && clampedDistance !== cameraDistance) {
      onCameraDistanceChange(clampedDistance);
    }
    
  }, [cameraDistance, onCameraDistanceChange, lastValidGridDataRef]);
  
  // Image drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDroppingImage(true);
  }, []);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDroppingImage(false);
  }, []);
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDroppingImage(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if the dropped file is an image
      if (file.type.match(/image.*/)) {
        const reader = new FileReader();
        
        reader.onload = (loadEvent) => {
          const image = new Image();
          
          image.onload = () => {
            // Create a new THREE.js texture from the image
            if (rendererRef.current && sceneRef.current) {
              const texture = new THREE.TextureLoader().load(image.src);
              texture.wrapS = THREE.RepeatWrapping;
              texture.wrapT = THREE.RepeatWrapping;
              texture.repeat.set(1, 1);
              setCubeTexture(texture);
              
              console.log('[3DViewInstanced] Texture loaded from dropped image:', file.name);
            }
          };
          
          image.src = loadEvent.target.result;
        };
        
        reader.readAsDataURL(file);
      } else {
        console.warn('[3DViewInstanced] Dropped file is not an image:', file.type);
      }
    }
  }, []);
  
  // Set up animation and rendering loop with performance monitoring
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    
    console.log('[3DViewInstanced] Setting up animation loop');
    
    let lastTime = 0;
    statsRef.current.lastTime = performance.now();
    statsRef.current.frames = 0;
    
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Create a flag to track if we need to force a render due to mesh reinstating
    let forceRenderNextFrame = false;
    
    const renderFrame = (time) => {
      // Use local refs to avoid potential null references during the frame
      const scene = sceneRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      
      // Make sure refs are still valid
      if (!scene || !renderer || !camera) {
        console.warn('[3DViewInstanced] Refs not available in animation frame, stopping loop');
        return;
      }
      
      // Calculate time delta for consistent rotation speed
      const deltaTime = lastTime ? time - lastTime : 0;
      lastTime = time;
      
      // Apply rotation if enabled
      if (scene && rotationSpeed > 0) {
        // Convert rotation speed to radians per millisecond
        scene.rotation.y += rotationSpeed * 0.0005 * deltaTime;
        
        // Report rotation back to parent component
        if (onRotationChange) {
          onRotationChange({
            x: scene.rotation.x,
            y: scene.rotation.y
          });
        }
      }
      
      try {
        // Flag to track if we need to force a render in the next frame
        forceRenderNextFrame = false;
        
        // Check if instanced meshes exist and are part of the scene
        if (instancedMeshRef.current && !scene.children.includes(instancedMeshRef.current)) {
          console.log('[3DViewInstanced] Re-adding missing instanced mesh to scene');
          scene.add(instancedMeshRef.current);
          
          // If we have valid instance matrices, ensure they're up to date
          if (instancedMeshRef.current.instanceMatrix) {
            instancedMeshRef.current.instanceMatrix.needsUpdate = true;
            instancedMeshRef.current.computeBoundingSphere();
          }
          
          forceRenderNextFrame = true;
        }
        
        if (dyingInstancedMeshRef.current && !scene.children.includes(dyingInstancedMeshRef.current)) {
          console.log('[3DViewInstanced] Re-adding missing dying instanced mesh to scene');
          scene.add(dyingInstancedMeshRef.current);
          
          // If we have valid instance matrices, ensure they're up to date
          if (dyingInstancedMeshRef.current.instanceMatrix) {
            dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
            dyingInstancedMeshRef.current.computeBoundingSphere();
          }
          
          forceRenderNextFrame = true;
        }
        
        // If meshes were reinstated and we have a valid grid, ensure instances are properly set
        if (forceRenderNextFrame && lastValidGridDataRef.current && gridInfo.sizeX > 0) {
          console.log('[3DViewInstanced] Mesh reinstated during animation, ensuring instances are set up');
          
          // Ensure the matrices are fully up to date
          if (instancedMeshRef.current) {
            // Force instance matrix update
            instancedMeshRef.current.instanceMatrix.needsUpdate = true;
            instancedMeshRef.current.computeBoundingSphere();
          }
          
          if (dyingInstancedMeshRef.current) {
            // Force instance matrix update
            dyingInstancedMeshRef.current.instanceMatrix.needsUpdate = true;
            dyingInstancedMeshRef.current.computeBoundingSphere();
          }
        }
        
        // First collect stats before rendering
        // This ensures we get accurate stats from the previous frame
        const renderInfo = renderer.info.render;
        const drawCalls = renderInfo.calls || 0;
        const triangles = renderInfo.triangles || 0;
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Update performance stats
        statsRef.current.frames++;
        const now = performance.now();
        const elapsed = now - statsRef.current.lastTime;
        
        if (elapsed >= 1000) { // Update stats every second
          const fps = Math.round((statsRef.current.frames * 1000) / elapsed);
          statsRef.current.fps = fps;
          statsRef.current.frames = 0;
          statsRef.current.lastTime = now;
          
          console.log('[3DViewInstanced] Render stats:', 
            { calls: drawCalls, triangles: triangles, frame: renderInfo.frame }
          );
          
          // Reset renderer stats for next collection cycle
          renderer.info.reset();
          
          // Update stats display
          setStats(prevStats => ({
            ...prevStats,
            fps,
            drawCalls,
            triangles,
            lastUpdated: now
          }));
        }
      } catch (error) {
        console.error('[3DViewInstanced] Error in animation frame:', error);
      }
      
      // Always continue the animation loop
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    
    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);
    console.log('[3DViewInstanced] Animation loop started');
    
    // Initial render to ensure something is displayed
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      
      // Schedule another render in the next frame to ensure everything is properly initialized
      requestAnimationFrame(() => {
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      });
    }
    
    // Cleanup function
    return () => {
      console.log('[3DViewInstanced] Cleaning up animation loop');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Force one final render to ensure the scene is in a good state
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        // Check if any meshes need to be re-added
        const scene = sceneRef.current;
        
        if (instancedMeshRef.current && !scene.children.includes(instancedMeshRef.current)) {
          scene.add(instancedMeshRef.current);
        }
        
        if (dyingInstancedMeshRef.current && !scene.children.includes(dyingInstancedMeshRef.current)) {
          scene.add(dyingInstancedMeshRef.current);
        }
        
        // Final render
        rendererRef.current.render(scene, cameraRef.current);
      }
    };
  }, [rotationSpeed]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      
      // Update camera aspect ratio
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      // Update renderer size
      renderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);
  
  if (error) {
    return (
      <div style={{ width, height, border: '1px solid red', padding: '10px', color: 'red' }}>
        <p>Error: {error}</p>
      </div>
    );
  }
  
  return (
    <div>
      <div 
        ref={containerRef}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          border: isDroppingImage ? '3px dashed #4CAF50' : '1px solid #444',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          transition: 'border 0.2s ease-in-out'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDroppingImage && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(76, 175, 80, 0.2)',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              textAlign: 'center'
            }}>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
                Drop image to use as cube texture
              </p>
            </div>
          </div>
        )}
        
        {/* Performance stats overlay - only show if showStats is true */}
        {showStats && (
          <div style={{
            position: 'absolute',
            top: 5,
            right: 5,
            padding: '8px 10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 100,
            pointerEvents: 'none',
            minWidth: '220px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              marginBottom: '5px',
              borderBottom: '1px solid rgba(255,255,255,0.4)',
              paddingBottom: '3px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>GPU Stats</span>
              <span style={{
                backgroundColor: '#8e44ad',
                color: 'white',
                fontSize: '10px',
                padding: '2px 5px',
                borderRadius: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>Instanced</span>
            </div>
            
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span>FPS:</span>
                <span style={{ 
                  backgroundColor: stats.fps > 30 ? 'rgba(76,175,80,0.2)' : stats.fps > 15 ? 'rgba(255,193,7,0.2)' : 'rgba(244,67,54,0.2)',
                  color: stats.fps > 30 ? '#4CAF50' : stats.fps > 15 ? '#FFC107' : '#F44336',
                  padding: '1px 5px',
                  borderRadius: '2px',
                  fontWeight: 'bold'
                }}>
                  {stats.fps}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span>Draw Calls:</span>
                <span style={{ 
                  color: stats.drawCalls <= 5 ? '#4CAF50' : stats.drawCalls <= 20 ? '#FFC107' : '#F44336',
                  fontWeight: 'bold'
                }}>
                  {stats.drawCalls}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span>Triangles:</span>
                <span>{stats.triangles.toLocaleString()}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Active Cells:</span>
                <span>{stats.activeCells.toLocaleString()}</span>
              </div>
            </div>
            
            <div style={{
              marginTop: '5px',
              borderTop: '1px solid rgba(255,255,255,0.3)',
              paddingTop: '5px',
            }}>
              <div style={{ 
                backgroundColor: 'rgba(142,68,173,0.2)',
                color: '#9b59b6',
                padding: '4px 6px',
                borderRadius: '3px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <span>Instancing Efficiency</span>
                <span style={{ color: 'white', fontSize: '14px' }}>
                  {`${Math.round(stats.activeCells / Math.max(1, stats.drawCalls))} cells/draw call`}
                </span>
                <span style={{ fontSize: '9px', color: '#aaa', fontStyle: 'italic' }}>
                  (Standard rendering: 1 cell/draw call)
                </span>
              </div>
            </div>
            
            <div style={{ 
              fontSize: '9px',
              marginTop: '5px',
              color: '#bbb',
              textAlign: 'right',
              fontStyle: 'italic'
            }}>
              Last updated: {new Date(stats.lastUpdated).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
      <div style={{ 
        fontSize: '0.8em', 
        color: '#333', 
        textAlign: 'center', 
        marginTop: '5px', 
        background: '#f0f0f0', 
        padding: '3px', 
        borderRadius: '4px',
        border: '1px solid #ddd',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Drag to rotate | Use mouse wheel to zoom in/out</span>
        <span style={{ 
          fontWeight: cubeTexture ? 'bold' : 'normal',
          color: cubeTexture ? '#4CAF50' : '#777'
        }}>
          {cubeTexture ? '✓ Texture applied' : 'Drag & drop image for texture'}
        </span>
      </div>
      {cubeTexture && (
        <div style={{
          marginTop: '5px',
          textAlign: 'center'
        }}>
          <button 
            onClick={() => setCubeTexture(null)}
            style={{
              padding: '3px 8px',
              fontSize: '0.8em',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Remove Texture
          </button>
        </div>
      )}
    </div>
  );
};

export default Automaton3DViewInstanced;