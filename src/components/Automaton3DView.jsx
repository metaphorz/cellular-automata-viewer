import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';

// Define colors with more realistic tones
// Default colors - these will be overridden by the cubeColor prop
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

const Automaton3DView = ({
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
  onToggleHelpers,
  initialRotation = { x: 0, y: 0 },
  onRotationChange,
}) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const cellsRef = useRef([]);
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

  // Initialize Three.js scene, camera, renderer
  useEffect(() => {
    console.log('[3DView] Setting up Three.js scene');
    
    if (!containerRef.current) return;
    
    try {
      // Create scene - white room environment
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xffffff); // White background
      
      // Apply initial rotation if provided
      if (initialRotation) {
        scene.rotation.x = initialRotation.x;
        scene.rotation.y = initialRotation.y;
        console.log(`[3DView] Applied initial rotation: x=${initialRotation.x}, y=${initialRotation.y}`);
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
      console.error('[3DView] Error setting up Three.js:', err);
      setError(`Three.js setup error: ${err.message}`);
    }
    
    // Cleanup function
    return () => {
      console.log('[3DView] Cleaning up Three.js resources');
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
      
      // Clear cell references
      cellsRef.current = [];
    };
  }, []);
  
  // Update cellular automaton cells
  useEffect(() => {
    if (!sceneRef.current || !gridData) return;
    
    console.log('[3DView] Updating cell grid display');
    const scene = sceneRef.current;
    
    // Remove old cells
    cellsRef.current.forEach(cell => {
      scene.remove(cell);
      if (cell.geometry) cell.geometry.dispose();
      if (cell.material) cell.material.dispose();
    });
    cellsRef.current = [];
    
    // Create shared geometry for all cells with slightly rounded edges for a more realistic look
    const cellGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9, 2, 2, 2);
    
    // Create cells
    const sizeX = gridData.length;
    const sizeY = gridData[0]?.length || 0;
    const sizeZ = gridData[0]?.[0]?.length || 0;
    
    if (!sizeX || !sizeY || !sizeZ) {
      console.warn('[3DView] Invalid grid dimensions:', sizeX, sizeY, sizeZ);
      return;
    }
    
    console.log('[3DView] Grid dimensions:', sizeX, sizeY, sizeZ);
    
    const centerX = sizeX / 2;
    const centerY = sizeY / 2;
    const centerZ = sizeZ / 2;
    
    let activeCellCount = 0;
    
    // Add new cells
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const cellState = gridData[x][y][z];
          
          // Skip dead cells
          if (cellState === 0) continue;
          
          activeCellCount++;
          
          // Convert hex color to THREE.js color for alive cells, or use default dying color
          const colorValue = cellState === 1 
            ? new THREE.Color(cubeColor).getHex() 
            : DEFAULT_DYING_COLOR;
          
          // Get material preset based on selected type
          const materialPreset = MATERIAL_PRESETS[materialType] || MATERIAL_PRESETS.standard;
          
          // Create material with selected properties and color
          const material = new THREE.MeshPhysicalMaterial({
            color: colorValue,
            
            // Apply all properties from the material preset
            ...materialPreset,
            
            // Always ensure opacity/transparency is applied
            transparent: cubeOpacity < 1.0 || materialType === 'glass',
            opacity: cubeOpacity,
            
            // For emissive materials
            emissive: materialPreset.emissive ? colorValue : 0x000000,
            emissiveIntensity: materialPreset.emissiveIntensity || 0,
            
            // Apply texture if available
            map: cubeTexture
          });
          
          // Create mesh
          const cell = new THREE.Mesh(cellGeometry, material);
          
          // Enable shadows for the cell
          cell.castShadow = true;
          cell.receiveShadow = true;
          
          // Position cell
          cell.position.set(
            x - centerX,
            y - centerY,
            z - centerZ
          );
          
          // Add to scene and tracking array
          scene.add(cell);
          cellsRef.current.push(cell);
        }
      }
    }
    
    console.log(`[3DView] Added ${activeCellCount} active cells to scene`);
    
  }, [gridData, cubeTexture]);
  
  // Update camera position when distance changes
  useEffect(() => {
    if (!cameraRef.current) return;
    
    const camera = cameraRef.current;
    const currentPosition = camera.position.clone().normalize();
    
    // Maintain direction but update distance
    camera.position.copy(currentPosition.multiplyScalar(cameraDistance));
    
  }, [cameraDistance]);
  
  // Update helper visibility when showHelpers changes
  useEffect(() => {
    if (!sceneRef.current) return;
    
    console.log('[3DView] Updating helper visibility:', showHelpers);
    
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
    // Update all existing cells
    if (cellsRef.current.length > 0) {
      console.log('[3DView] Updating materials with:',
        { opacity: cubeOpacity, color: cubeColor, materialType, hasTexture: !!cubeTexture });
      
      // Get material preset based on selected type
      const materialPreset = MATERIAL_PRESETS[materialType] || MATERIAL_PRESETS.standard;
      
      cellsRef.current.forEach(cell => {
        if (cell.material) {
          // Only change color for alive cells (we keep dying cells red)
          if (cell.material.color && cell.material.color.getHex() !== DEFAULT_DYING_COLOR) {
            cell.material.color.set(cubeColor);
            
            // For emissive materials, update the emissive color too
            if (materialPreset.emissive) {
              cell.material.emissive.set(cubeColor);
              cell.material.emissiveIntensity = materialPreset.emissiveIntensity || 0;
            } else {
              cell.material.emissive.set(0x000000);
              cell.material.emissiveIntensity = 0;
            }
          }
          
          // Apply material preset properties
          Object.entries(materialPreset).forEach(([key, value]) => {
            // Skip emissive properties (handled separately)
            if (key !== 'emissive' && key !== 'emissiveIntensity') {
              cell.material[key] = value;
            }
          });
          
          // Always ensure opacity/transparency is applied
          cell.material.transparent = cubeOpacity < 1.0 || materialType === 'glass';
          cell.material.opacity = cubeOpacity;
          
          // Update texture
          cell.material.map = cubeTexture;
          
          // Flag material for update
          cell.material.needsUpdate = true;
        }
      });
      
      // Force a render update
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [cubeOpacity, cubeColor, materialType, cubeTexture]);
  
  // Mouse handling for rotation
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setPreviousMousePosition({
      x: e.clientX,
      y: e.clientY,
    });
  }, []);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !sceneRef.current) return;
    
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
    
  }, [isDragging, previousMousePosition]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Mouse wheel for zooming
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    // Calculate new camera distance
    const zoomSensitivity = 0.1;
    const newDistance = cameraDistance + (e.deltaY * zoomSensitivity);
    const clampedDistance = Math.max(10, Math.min(100, newDistance));
    
    if (clampedDistance !== cameraDistance && onCameraDistanceChange) {
      onCameraDistanceChange(clampedDistance);
    }
    
  }, [cameraDistance, onCameraDistanceChange]);
  
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
              
              console.log('[3DView] Texture loaded from dropped image:', file.name);
            }
          };
          
          image.src = loadEvent.target.result;
        };
        
        reader.readAsDataURL(file);
      } else {
        console.warn('[3DView] Dropped file is not an image:', file.type);
      }
    }
  }, []);
  
  // Set up animation and rendering loop
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;
    
    let lastTime = 0;
    
    const renderFrame = (time) => {
      // Calculate time delta for consistent rotation speed
      const deltaTime = lastTime ? time - lastTime : 0;
      lastTime = time;
      
      // Apply rotation if enabled
      if (sceneRef.current && rotationSpeed > 0) {
        // Convert rotation speed to radians per millisecond
        sceneRef.current.rotation.y += rotationSpeed * 0.0005 * deltaTime;
        
        // Report rotation back to parent component
        if (onRotationChange) {
          onRotationChange({
            x: sceneRef.current.rotation.x,
            y: sceneRef.current.rotation.y
          });
        }
      }
      
      // Render the scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    };
    
    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(renderFrame);
    
    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
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

export default Automaton3DView;