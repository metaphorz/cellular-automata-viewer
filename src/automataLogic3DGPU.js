// automataLogic3DGPU.js - GPU-accelerated 3D Cellular Automata Logic using WebGL compute shaders
import * as THREE from 'three';

// Rule definitions in B/S notation (same as CPU version)
const RULE_DEFINITIONS = {
  'conway3d': { birth: [5, 6, 7], survival: [4, 5, 6] },               // 3D Conway's Game of Life
  'life3d': { birth: [4, 5], survival: [5, 6, 7] },                    // 3D Life
  'stability': { birth: [4, 5, 6, 7], survival: [3, 4, 5, 6] },        // Stability
  'crystal': { birth: [5, 6, 7, 8], survival: [5, 6, 7, 8] },          // Crystal Growth
  'pyroclastic': { birth: [4, 5, 6, 7], survival: [6, 7, 8] },         // Pyroclastic
  'diamoeba3d': { birth: [5, 6, 7, 8], survival: [5, 6, 7, 8, 9, 10] }, // 3D Diamoeba
  'hyper': { birth: [5, 6, 7], survival: [5, 6, 7, 8, 9, 10] },        // Hyperactive
  'briansbrain3d': { type: 'special' },                                // 3D Brian's Brain (3-state)
  'checkerboard': { type: 'static' }                                   // Static checkerboard pattern (no changes)
};

// Create an empty 3D grid with given dimensions (same as CPU version)
const createEmpty3DGrid = (sizeX, sizeY, sizeZ) => {
  return Array(sizeX).fill().map(() => 
    Array(sizeY).fill().map(() => 
      Array(sizeZ).fill(0)
    )
  );
};

// Create a 3D grid with various seed patterns (same as CPU version)
const createInitial3DGrid = (sizeX = 30, sizeY = 30, sizeZ = 30, pattern = 'checkerboard') => {
  console.log('[3DLogicGPU] Creating initial 3D grid with size', sizeX, sizeY, sizeZ, 'and pattern', pattern);
  const grid = createEmpty3DGrid(sizeX, sizeY, sizeZ);
  
  const centerX = Math.floor(sizeX / 2);
  const centerY = Math.floor(sizeY / 2);
  const centerZ = Math.floor(sizeZ / 2);
  
  if (pattern === 'checkerboard' || pattern === 'default') {
    // Fill with a checkerboard pattern
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          if ((x + y + z) % 2 === 0) {
            grid[x][y][z] = 1;
          }
        }
      }
    }
  } else if (pattern === 'cross') {
    // Create a 3D cross pattern
    for (let i = -Math.min(3, Math.floor(sizeX/4)); i <= Math.min(3, Math.floor(sizeX/4)); i++) {
      // X-axis line
      grid[centerX + i][centerY][centerZ] = 1;
      // Y-axis line
      grid[centerX][centerY + i][centerZ] = 1;
      // Z-axis line
      grid[centerX][centerY][centerZ + i] = 1;
    }
  } else if (pattern === 'random') {
    // Fill with random cells (30% density)
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          if (Math.random() < 0.3) {
            grid[x][y][z] = 1;
          }
        }
      }
    }
  } else if (pattern === 'sphere') {
    // Create a sphere-like structure
    const radius = Math.min(sizeX, sizeY, sizeZ) / 4;
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dz = z - centerZ;
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
          
          // Points close to the surface of the sphere
          if (Math.abs(distance - radius) < 0.8) {
            grid[x][y][z] = 1;
          }
        }
      }
    }
  } else {
    // Default pattern
    for (let i = -2; i <= 2; i++) {
      // X-axis line
      grid[centerX + i][centerY][centerZ] = 1;
      // Y-axis line
      grid[centerX][centerY + i][centerZ] = 1;
      // Z-axis line
      grid[centerX][centerY][centerZ + i] = 1;
    }
    
    // Add a box around the center
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (Math.abs(x) + Math.abs(y) + Math.abs(z) >= 2) {
            grid[centerX + x][centerY + y][centerZ + z] = 1;
          }
        }
      }
    }
    
    // Add some random cells around the center
    for (let x = centerX - 4; x <= centerX + 4; x++) {
      for (let y = centerY - 4; y <= centerY + 4; y++) {
        for (let z = centerZ - 4; z <= centerZ + 4; z++) {
          if (x >= 0 && x < sizeX && y >= 0 && y < sizeY && z >= 0 && z < sizeZ) {
            if (Math.random() < 0.3) {
              grid[x][y][z] = 1;
            }
          }
        }
      }
    }
  }
  
  // Count active cells for debugging
  let activeCells = 0;
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        if (grid[x][y][z] === 1) activeCells++;
      }
    }
  }
  console.log('[3DLogicGPU] Created initial grid with', activeCells, 'active cells');
  
  return grid;
};

// GPU-accelerated class for 3D cellular automata
class CellularAutomataGPU {
  constructor() {
    this.initialized = false;
    this.renderer = null;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Textures to store the cellular automata state
    this.textureA = null;
    this.textureB = null;
    this.currentTexture = 'A';
    this.size = { x: 0, y: 0, z: 0 };
    
    // GPU compute materials
    this.standardRuleMaterial = null;
    this.briansBrainMaterial = null;
    this.copyMaterial = null;
    
    // GPU compute mesh
    this.computeMesh = null;
    
    // Render targets
    this.renderTargetA = null;
    this.renderTargetB = null;
    
    // Current rule
    this.currentRule = 'conway3d';
  }
  
  // Initialize the GPU compute system
  initialize(gridData, ruleName) {
    if (this.initialized) {
      this.dispose();
    }
    
    this.currentRule = ruleName;
    
    // Get the size of the grid
    const sizeX = gridData.length;
    const sizeY = gridData[0].length;
    const sizeZ = gridData[0][0].length;
    this.size = { x: sizeX, y: sizeY, z: sizeZ };
    
    // Create a WebGL renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      powerPreference: 'high-performance', // Request high-performance GPU mode
      precision: sizeX * sizeY * sizeZ > 15000 ? 'mediump' : 'highp' // Use medium precision for very large grids
    });
    this.renderer.setSize(1, 1); // Just need minimal size for compute
    
    // Create the data textures
    const totalSize = sizeX * sizeY * sizeZ;
    const sliceSize = sizeX * sizeY;
    
    // Convert 3D grid to flat data array for texture
    const data = new Uint8Array(totalSize * 4); // RGBA format
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = (z * sliceSize + y * sizeX + x) * 4;
          data[index] = gridData[x][y][z] * 255; // Store state in R channel
          data[index + 1] = 0; // G
          data[index + 2] = 0; // B
          data[index + 3] = 255; // A (fully opaque)
        }
      }
    }
    
    // Create the data textures
    // We'll use 2D textures with a clever layout to represent 3D data
    // Each row will contain one Z-slice of the 3D volume
    // Width = sizeX, Height = sizeY * sizeZ
    const texWidth = sizeX;
    const texHeight = sizeY * sizeZ;
    
    this.textureA = new THREE.DataTexture(
      data, 
      texWidth, 
      texHeight, 
      THREE.RGBAFormat
    );
    this.textureA.needsUpdate = true;
    
    this.textureB = this.textureA.clone();
    
    // Create render targets
    this.renderTargetA = new THREE.WebGLRenderTarget(texWidth, texHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType
    });
    
    this.renderTargetB = this.renderTargetA.clone();
    
    // Create compute shader materials
    this.createComputeShaders();
    
    // Create compute mesh (a simple quad to render to the texture)
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.computeMesh = new THREE.Mesh(quadGeometry, this.standardRuleMaterial);
    this.scene.add(this.computeMesh);
    
    // Set initial texture
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    
    this.initialized = true;
    console.log('[3DLogicGPU] Initialized with grid size', sizeX, sizeY, sizeZ);
  }
  
  // Create the compute shaders for the cellular automata rules
  createComputeShaders() {
    // Define shader code for standard B/S rules
    const standardVertexShader = `
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
    
    const standardFragmentShader = `
      varying vec2 vUv;
      uniform sampler2D tState;
      uniform vec3 gridSize;
      uniform float birthValues[8];   // 1 where birth rule applies, 0 elsewhere
      uniform float survivalValues[8]; // 1 where survival rule applies, 0 elsewhere
      
      float getCellState(vec3 pos) {
        // Handle wrapping around edges
        pos.x = mod(pos.x, gridSize.x);
        pos.y = mod(pos.y, gridSize.y);
        pos.z = mod(pos.z, gridSize.z);
        
        // Convert 3D position to 2D texture coordinates
        float zSlice = floor(pos.z);
        vec2 texCoord = vec2(
          pos.x / gridSize.x,
          (pos.y + zSlice * gridSize.y) / (gridSize.y * gridSize.z)
        );
        
        return texture2D(tState, texCoord).r;
      }
      
      void main() {
        // Convert texture coordinate to 3D grid position
        float texY = vUv.y * gridSize.y * gridSize.z;
        float z = floor(texY / gridSize.y);
        float y = mod(texY, gridSize.y);
        float x = vUv.x * gridSize.x;
        
        vec3 pos = vec3(x, y, z);
        
        // Get current cell state (0 or 1)
        float currentState = getCellState(pos);
        
        // Count live neighbors (26 neighbors in 3D)
        float neighbors = 0.0;
        for (float dx = -1.0; dx <= 1.0; dx += 1.0) {
          for (float dy = -1.0; dy <= 1.0; dy += 1.0) {
            for (float dz = -1.0; dz <= 1.0; dz += 1.0) {
              // Skip the center cell
              if (dx == 0.0 && dy == 0.0 && dz == 0.0) continue;
              
              vec3 neighborPos = vec3(pos.x + dx, pos.y + dy, pos.z + dz);
              neighbors += getCellState(neighborPos);
            }
          }
        }
        
        // Apply cellular automata rules
        float newState = 0.0;
        
        // If alive
        if (currentState > 0.5) {
          // Check survival rules
          float floorNeighbors = floor(neighbors);
          if (floorNeighbors >= 3.0 && floorNeighbors <= 10.0) {
            int idx = int(floorNeighbors) - 3;
            if (survivalValues[idx] > 0.5) {
              newState = 1.0;
            }
          }
        } else {
          // Check birth rules
          float floorNeighbors = floor(neighbors);
          if (floorNeighbors >= 3.0 && floorNeighbors <= 10.0) {
            int idx = int(floorNeighbors) - 3;
            if (birthValues[idx] > 0.5) {
              newState = 1.0;
            }
          }
        }
        
        // Output result - red channel contains state
        gl_FragColor = vec4(newState, 0.0, 0.0, 1.0);
      }
    `;
    
    // Create the standard rule material
    this.standardRuleMaterial = new THREE.ShaderMaterial({
      vertexShader: standardVertexShader,
      fragmentShader: standardFragmentShader,
      uniforms: {
        tState: { value: this.textureA },
        gridSize: { value: new THREE.Vector3(this.size.x, this.size.y, this.size.z) },
        birthValues: { value: [0, 0, 0, 0, 0, 0, 0, 0] },
        survivalValues: { value: [0, 0, 0, 0, 0, 0, 0, 0] }
      }
    });
    
    // Initialize with a default rule (Conway3D)
    const defaultRule = RULE_DEFINITIONS['conway3d'];
    if (defaultRule) {
      const birthValues = [0, 0, 0, 0, 0, 0, 0, 0];
      const survivalValues = [0, 0, 0, 0, 0, 0, 0, 0];
      
      defaultRule.birth.forEach(value => {
        if (value >= 3 && value <= 10) {
          birthValues[value - 3] = 1;
        }
      });
      
      defaultRule.survival.forEach(value => {
        if (value >= 3 && value <= 10) {
          survivalValues[value - 3] = 1;
        }
      });
      
      this.standardRuleMaterial.uniforms.birthValues.value = birthValues;
      this.standardRuleMaterial.uniforms.survivalValues.value = survivalValues;
    }
    
    // Create a special shader for Brian's Brain
    const briansBrainFragmentShader = `
      varying vec2 vUv;
      uniform sampler2D tState;
      uniform vec3 gridSize;
      
      float getCellState(vec3 pos) {
        // Handle wrapping around edges
        pos.x = mod(pos.x, gridSize.x);
        pos.y = mod(pos.y, gridSize.y);
        pos.z = mod(pos.z, gridSize.z);
        
        // Convert 3D position to 2D texture coordinates
        float zSlice = floor(pos.z);
        vec2 texCoord = vec2(
          pos.x / gridSize.x,
          (pos.y + zSlice * gridSize.y) / (gridSize.y * gridSize.z)
        );
        
        return texture2D(tState, texCoord).r;
      }
      
      void main() {
        // Convert texture coordinate to 3D grid position
        float texY = vUv.y * gridSize.y * gridSize.z;
        float z = floor(texY / gridSize.y);
        float y = mod(texY, gridSize.y);
        float x = vUv.x * gridSize.x;
        
        vec3 pos = vec3(x, y, z);
        
        // Get current cell state (0, 0.5, or 1)
        float currentState = getCellState(pos);
        float newState = 0.0;
        
        // Brian's Brain rules:
        // 0 = Dead, 0.5 = Dying, 1 = Alive
        if (currentState < 0.25) { // Dead
          // Count live neighbors
          float onNeighbors = 0.0;
          for (float dx = -1.0; dx <= 1.0; dx += 1.0) {
            for (float dy = -1.0; dy <= 1.0; dy += 1.0) {
              for (float dz = -1.0; dz <= 1.0; dz += 1.0) {
                // Skip the center cell
                if (dx == 0.0 && dy == 0.0 && dz == 0.0) continue;
                
                vec3 neighborPos = vec3(pos.x + dx, pos.y + dy, pos.z + dz);
                float state = getCellState(neighborPos);
                if (state > 0.75) { // Alive
                  onNeighbors += 1.0;
                }
              }
            }
          }
          // Dead cell becomes alive if exactly 2 alive neighbors
          if (onNeighbors >= 1.5 && onNeighbors <= 2.5) {
            newState = 1.0; // Alive
          }
        } else if (currentState > 0.75) { // Alive
          // Alive cell always becomes dying
          newState = 0.5; // Dying
        }
        // Dying cell always becomes dead (default newState = 0.0)
        
        // Output result - red channel contains state
        gl_FragColor = vec4(newState, 0.0, 0.0, 1.0);
      }
    `;
    
    // Create the Brian's Brain material
    this.briansBrainMaterial = new THREE.ShaderMaterial({
      vertexShader: standardVertexShader,
      fragmentShader: briansBrainFragmentShader,
      uniforms: {
        tState: { value: this.textureA },
        gridSize: { value: new THREE.Vector3(this.size.x, this.size.y, this.size.z) }
      }
    });
    
    // Create a simple copy shader for static patterns
    const copyFragmentShader = `
      varying vec2 vUv;
      uniform sampler2D tState;
      
      void main() {
        gl_FragColor = texture2D(tState, vUv);
      }
    `;
    
    // Create the copy material
    this.copyMaterial = new THREE.ShaderMaterial({
      vertexShader: standardVertexShader,
      fragmentShader: copyFragmentShader,
      uniforms: {
        tState: { value: this.textureA }
      }
    });
  }
  
  // Set the rule parameters based on rule name
  setRule(ruleName) {
    this.currentRule = ruleName;
    
    // Special cases
    if (ruleName === 'briansbrain3d' || ruleName === 'checkerboard') {
      console.log(`[3DLogicGPU] Using special rule: ${ruleName}`);
      return; // These use different materials
    }
    
    // Get the rule definition
    const rule = RULE_DEFINITIONS[ruleName] || RULE_DEFINITIONS.conway3d;
    const { birth, survival } = rule;
    
    console.log(`[3DLogicGPU] Setting rule: ${ruleName}`);
    console.log(`[3DLogicGPU] Birth values: ${birth.join(', ')}`);
    console.log(`[3DLogicGPU] Survival values: ${survival.join(', ')}`);
    
    // Create arrays with 1s at indices that correspond to rule values
    const birthValues = [0, 0, 0, 0, 0, 0, 0, 0];
    const survivalValues = [0, 0, 0, 0, 0, 0, 0, 0];
    
    // Set birth values
    birth.forEach(value => {
      if (value >= 3 && value <= 10) {
        birthValues[value - 3] = 1;
      }
    });
    
    // Set survival values
    survival.forEach(value => {
      if (value >= 3 && value <= 10) {
        survivalValues[value - 3] = 1;
      }
    });
    
    console.log(`[3DLogicGPU] Birth values array: ${birthValues.join(', ')}`);
    console.log(`[3DLogicGPU] Survival values array: ${survivalValues.join(', ')}`);
    
    // Update the shader uniforms
    this.standardRuleMaterial.uniforms.birthValues.value = birthValues;
    this.standardRuleMaterial.uniforms.survivalValues.value = survivalValues;
    
    // Ensure all uniforms are properly updated
    this.standardRuleMaterial.needsUpdate = true;
    this.standardRuleMaterial.uniformsNeedUpdate = true;
  }
  
  // Compute the next generation
  computeNextGeneration() {
    if (!this.initialized) {
      console.warn('[3DLogicGPU] Not initialized');
      return null;
    }
    
    console.log(`[3DLogicGPU] Computing next generation with rule: ${this.currentRule}`);
    console.log(`[3DLogicGPU] Current texture: ${this.currentTexture}, Grid size: ${this.size.x}x${this.size.y}x${this.size.z}`);
    
    // Select the appropriate shader based on the rule
    if (this.currentRule === 'briansbrain3d') {
      console.log('[3DLogicGPU] Using Brian\'s Brain shader');
      this.computeMesh.material = this.briansBrainMaterial;
      this.briansBrainMaterial.uniforms.tState.value = 
        this.currentTexture === 'A' ? this.textureA : this.textureB;
    } else if (this.currentRule === 'checkerboard') {
      console.log('[3DLogicGPU] Using static checkerboard (copy) shader');
      this.computeMesh.material = this.copyMaterial;
      this.copyMaterial.uniforms.tState.value = 
        this.currentTexture === 'A' ? this.textureA : this.textureB;
    } else {
      console.log('[3DLogicGPU] Using standard B/S rule shader');
      this.computeMesh.material = this.standardRuleMaterial;
      this.standardRuleMaterial.uniforms.tState.value = 
        this.currentTexture === 'A' ? this.textureA : this.textureB;
      
      // Make sure rule parameters are set
      this.setRule(this.currentRule);
    }
    
    // Identify source and destination
    const srcTexture = this.currentTexture === 'A' ? this.textureA : this.textureB;
    const destTarget = this.currentTexture === 'A' ? this.renderTargetB : this.renderTargetA;
    
    // Render to the target
    this.renderer.setRenderTarget(destTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    
    // Update current texture
    this.currentTexture = this.currentTexture === 'A' ? 'B' : 'A';
    console.log(`[3DLogicGPU] Swapped textures - new current texture: ${this.currentTexture}`);
    
    // Read back the result to CPU memory
    // This is a performance bottleneck, but necessary to integrate with existing visualization
    const pixelBuffer = new Uint8Array(this.size.x * this.size.y * this.size.z * 4);
    this.renderer.readRenderTargetPixels(
      destTarget,
      0, 0,
      this.size.x, this.size.y * this.size.z,
      pixelBuffer
    );
    
    // Convert the flat texture data back to 3D grid
    const result = createEmpty3DGrid(this.size.x, this.size.y, this.size.z);
    const sliceSize = this.size.x * this.size.y;
    
    for (let z = 0; z < this.size.z; z++) {
      for (let y = 0; y < this.size.y; y++) {
        for (let x = 0; x < this.size.x; x++) {
          const index = (z * sliceSize + y * this.size.x + x) * 4;
          // Get state from red channel
          result[x][y][z] = pixelBuffer[index] > 127 ? 1 : 0;
        }
      }
    }
    
    return result;
  }
  
  // Clean up resources
  dispose() {
    if (this.textureA) this.textureA.dispose();
    if (this.textureB) this.textureB.dispose();
    if (this.renderTargetA) this.renderTargetA.dispose();
    if (this.renderTargetB) this.renderTargetB.dispose();
    if (this.standardRuleMaterial) this.standardRuleMaterial.dispose();
    if (this.briansBrainMaterial) this.briansBrainMaterial.dispose();
    if (this.copyMaterial) this.copyMaterial.dispose();
    if (this.computeMesh) {
      this.scene.remove(this.computeMesh);
      this.computeMesh.geometry.dispose();
    }
    if (this.renderer) this.renderer.dispose();
    
    this.initialized = false;
    console.log('[3DLogicGPU] Resources disposed');
  }
}

// GPU instance
let gpuInstance = null;

// Calculate next generation for 3D cellular automaton using GPU
const calculateNextGeneration3DGPU = (currentGrid, ruleName = 'conway3d') => {
  if (!currentGrid || currentGrid.length === 0 || !currentGrid[0] || 
      currentGrid[0].length === 0 || !currentGrid[0][0] || currentGrid[0][0].length === 0) {
    console.warn("[automataLogic3DGPU] Invalid or empty 3D grid provided.");
    return createEmpty3DGrid(1, 1, 1); // Return minimal grid on error
  }
  
  // Initialize GPU compute if needed
  if (!gpuInstance) {
    gpuInstance = new CellularAutomataGPU();
  }
  
  // Check if we need to reinitialize (grid size changed or first run)
  const sizeX = currentGrid.length;
  const sizeY = currentGrid[0].length;
  const sizeZ = currentGrid[0][0].length;
  
  if (!gpuInstance.initialized || 
      gpuInstance.size.x !== sizeX || 
      gpuInstance.size.y !== sizeY || 
      gpuInstance.size.z !== sizeZ ||
      gpuInstance.currentRule !== ruleName) {
    // Full initialization for new size or rule change
    console.log(`[automataLogic3DGPU] Reinitializing GPU compute instance. Size: ${sizeX}x${sizeY}x${sizeZ}, Rule: ${ruleName}`);
    gpuInstance.initialize(currentGrid, ruleName);
  } else {
    // Just update the texture data with the current grid
    // This ensures that any external modifications to the grid are reflected
    const sliceSize = sizeX * sizeY;
    const data = new Uint8Array(sizeX * sizeY * sizeZ * 4);
    
    for (let z = 0; z < sizeZ; z++) {
      for (let y = 0; y < sizeY; y++) {
        for (let x = 0; x < sizeX; x++) {
          const index = (z * sliceSize + y * sizeX + x) * 4;
          data[index] = currentGrid[x][y][z] * 255; // Store state in R channel
          data[index + 1] = 0; // G
          data[index + 2] = 0; // B
          data[index + 3] = 255; // A (fully opaque)
        }
      }
    }
    
    // Update the texture that's about to be used as source
    const textureToUpdate = gpuInstance.currentTexture === 'A' 
      ? gpuInstance.textureA : gpuInstance.textureB;
    
    textureToUpdate.image.data.set(data);
    textureToUpdate.needsUpdate = true;
  }
  
  // Compute next generation
  // Track generation data for debugging comparison with WebGPU
  const result = gpuInstance.computeNextGeneration();
  
  // Log generation data for comparison with WebGPU implementation
  // Use a static counter to track generations
  if (!calculateNextGeneration3DGPU.generationCount) {
    calculateNextGeneration3DGPU.generationCount = 1;
  } else {
    calculateNextGeneration3DGPU.generationCount++;
  }
  
  // Log data for the first 3 generations
  if (calculateNextGeneration3DGPU.generationCount <= 3) {
    // Count active cells
    let totalActiveCells = 0;
    for (let x = 0; x < result.length; x++) {
      for (let y = 0; y < result[0].length; y++) {
        for (let z = 0; z < result[0][0].length; z++) {
          if (result[x][y][z] > 0) totalActiveCells++;
        }
      }
    }
    
    console.log(`[WebGL] GENERATION ${calculateNextGeneration3DGPU.generationCount} DATA FOR COMPARISON`);
    console.log(`Rule: ${ruleName}, Active cells: ${totalActiveCells}`);
    
    // First 3x3x3 region (corner)
    console.log(`[WebGL] Corner region (0,0,0) to (2,2,2):`);
    for (let x = 0; x < Math.min(3, result.length); x++) {
      for (let y = 0; y < Math.min(3, result[0].length); y++) {
        for (let z = 0; z < Math.min(3, result[0][0].length); z++) {
          console.log(`  Cell at (${x},${y},${z}): ${result[x][y][z]}`);
        }
      }
    }
    
    // Log detailed 3x3x3 subset from center
    const centerX = Math.floor(result.length / 2);
    const centerY = Math.floor(result[0].length / 2);
    const centerZ = Math.floor(result[0][0].length / 2);
    
    console.log(`[WebGL] Center region (${centerX-1},${centerY-1},${centerZ-1}) to (${centerX+1},${centerY+1},${centerZ+1}):`);
    for (let x = centerX-1; x <= centerX+1; x++) {
      for (let y = centerY-1; y <= centerY+1; y++) {
        for (let z = centerZ-1; z <= centerZ+1; z++) {
          if (x >= 0 && x < result.length && 
              y >= 0 && y < result[0].length && 
              z >= 0 && z < result[0][0].length) {
            console.log(`  Cell at (${x},${y},${z}): ${result[x][y][z]}`);
          }
        }
      }
    }
    
    // Create a fingerprint of each generation
    let fingerprint = '';
    // Sample cells at strategic locations - corner, center, and some points in between
    const checkpoints = [
      [0, 0, 0], // Corner
      [centerX, centerY, centerZ], // Center
      [result.length-1, result[0].length-1, result[0][0].length-1], // Far corner
      [Math.floor(centerX/2), Math.floor(centerY/2), Math.floor(centerZ/2)], // Between corner and center
      [centerX + Math.floor((result.length-centerX)/2), centerY, centerZ] // Between center and far edge
    ];
    
    checkpoints.forEach(([x, y, z]) => {
      if (x >= 0 && x < result.length && y >= 0 && y < result[0].length && z >= 0 && z < result[0][0].length) {
        fingerprint += result[x][y][z];
      }
    });
    
    console.log(`[WebGL] Generation ${calculateNextGeneration3DGPU.generationCount} fingerprint: ${fingerprint}`);
    
    // Reset counter after 3 generations
    if (calculateNextGeneration3DGPU.generationCount >= 3) {
      calculateNextGeneration3DGPU.generationCount = 0;
    }
  }
  
  return result;
};

// Export the GPU-accelerated functions
export { 
  calculateNextGeneration3DGPU as calculateNextGeneration3D, 
  createInitial3DGrid, 
  createEmpty3DGrid, 
  RULE_DEFINITIONS 
};