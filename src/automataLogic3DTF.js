// automataLogic3DTF.js - TensorFlow.js GPGPU-accelerated 3D Cellular Automata Logic
import * as tf from '@tensorflow/tfjs';

// Rule definitions in B/S notation (same as other implementations)
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

// Create an empty 3D grid with given dimensions (same as other implementations)
const createEmpty3DGrid = (sizeX, sizeY, sizeZ) => {
  return Array(sizeX).fill().map(() => 
    Array(sizeY).fill().map(() => 
      Array(sizeZ).fill(0)
    )
  );
};

// Create a 3D grid with various seed patterns (same as other implementations)
const createInitial3DGrid = (sizeX = 30, sizeY = 30, sizeZ = 30, pattern = 'checkerboard') => {
  console.log('[3DLogicTF] Creating initial 3D grid with size', sizeX, sizeY, sizeZ, 'and pattern', pattern);
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
  console.log('[3DLogicTF] Created initial grid with', activeCells, 'active cells');
  
  return grid;
};

// Class for TensorFlow.js-based cellular automata processing
class CellularAutomataTF {
  constructor() {
    this.initialized = false;
    this.gridTensor = null;
    this.size = { x: 0, y: 0, z: 0 };
    this.currentRule = 'conway3d';
    this.convKernel = null;
    
    // Initialize TensorFlow.js backend
    this.initTF();
  }
  
  // Initialize TensorFlow.js backend
  async initTF() {
    console.log('[3DLogicTF] Initializing TensorFlow.js...');
    // Set memory growth to true to avoid OOM errors
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    tf.env().set('WEBGL_PACK_BINARY_OPERATIONS', true);
    
    // Check if WebGL is available and set it as the backend
    try {
      const backendName = tf.getBackend();
      console.log(`[3DLogicTF] Current TensorFlow.js backend: ${backendName}`);
      
      if (backendName !== 'webgl') {
        await tf.setBackend('webgl');
        console.log(`[3DLogicTF] Switched to WebGL backend: ${tf.getBackend()}`);
      }
      
      // Log GPU info
      const backend = tf.backend();
      if (backend.getGPGPUContext) {
        const gpgpuContext = backend.getGPGPUContext();
        console.log('[3DLogicTF] WebGL info:', {
          version: gpgpuContext.gl.getParameter(gpgpuContext.gl.VERSION),
          vendor: gpgpuContext.gl.getParameter(gpgpuContext.gl.VENDOR),
          renderer: gpgpuContext.gl.getParameter(gpgpuContext.gl.RENDERER)
        });
      }
    } catch (err) {
      console.warn('[3DLogicTF] Could not set WebGL backend:', err);
      console.warn('[3DLogicTF] Using default backend:', tf.getBackend());
    }
  }
  
  // Initialize with a grid and rule
  initialize(gridData, ruleName) {
    if (this.gridTensor) {
      this.gridTensor.dispose();
    }
    
    if (this.convKernel) {
      this.convKernel.dispose();
    }
    
    this.currentRule = ruleName;
    
    // Get the size of the grid
    const sizeX = gridData.length;
    const sizeY = gridData[0].length;
    const sizeZ = gridData[0][0].length;
    this.size = { x: sizeX, y: sizeY, z: sizeZ };
    
    console.log(`[3DLogicTF] Initializing with grid size ${sizeX}x${sizeY}x${sizeZ} and rule ${ruleName}`);
    
    // Convert JavaScript 3D array to flat array for tensor
    const flatData = new Float32Array(sizeX * sizeY * sizeZ);
    let i = 0;
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          flatData[i++] = gridData[x][y][z];
        }
      }
    }
    
    // Create a TensorFlow.js tensor with the grid data
    this.gridTensor = tf.tensor3d(flatData, [sizeX, sizeY, sizeZ]);
    
    // Create the convolution kernel for neighbor counting
    this.createConvolutionKernel();
    
    this.initialized = true;
    console.log('[3DLogicTF] Initialization complete');
  }
  
  // Create the 3D convolution kernel for counting neighbors
  createConvolutionKernel() {
    // Create a 3x3x3 convolution kernel with all 1s except the center which is 0
    const kernelSize = 3;
    const kernelData = new Float32Array(kernelSize * kernelSize * kernelSize);
    
    let i = 0;
    for (let x = 0; x < kernelSize; x++) {
      for (let y = 0; y < kernelSize; y++) {
        for (let z = 0; z < kernelSize; z++) {
          // Center element is 0, others are 1
          kernelData[i++] = (x === 1 && y === 1 && z === 1) ? 0 : 1;
        }
      }
    }
    
    // For conv3d, the filter must be 5D: [filterDepth, filterHeight, filterWidth, inChannels, outChannels]
    // We need to reshape our 3D kernel to a 5D tensor with the correct dimensions
    this.convKernel = tf.tensor5d(kernelData, [kernelSize, kernelSize, kernelSize, 1, 1]);
  }
  
  // Update the grid tensor with new data
  updateGrid(gridData) {
    if (!this.initialized) {
      this.initialize(gridData, this.currentRule);
      return;
    }
    
    // Get the size of the grid
    const sizeX = gridData.length;
    const sizeY = gridData[0].length;
    const sizeZ = gridData[0][0].length;
    
    // Check if the grid size has changed
    if (sizeX !== this.size.x || sizeY !== this.size.y || sizeZ !== this.size.z) {
      console.log(`[3DLogicTF] Grid size changed from ${this.size.x}x${this.size.y}x${this.size.z} to ${sizeX}x${sizeY}x${sizeZ}`);
      this.initialize(gridData, this.currentRule);
      return;
    }
    
    // Convert JavaScript 3D array to flat array for tensor
    const flatData = new Float32Array(sizeX * sizeY * sizeZ);
    let i = 0;
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          flatData[i++] = gridData[x][y][z];
        }
      }
    }
    
    // Update the grid tensor
    this.gridTensor.dispose();
    this.gridTensor = tf.tensor3d(flatData, [sizeX, sizeY, sizeZ]);
  }
  
  // Process standard B/S rules for 3D cellular automata
  processStandardRule(birthValues, survivalValues) {
    return tf.tidy(() => {
      // Add batch and channel dimensions for convolution
      const gridExpanded = this.gridTensor.expandDims(3).expandDims(0);
      
      // Perform 3D convolution to count neighbors
      // Options:
      // - pad: 'same' to maintain dimensions
      // - dataFormat: 'NDHWC' = [batch, depth, height, width, channels]
      // - dilations: 1 for standard convolution
      const neighborCount = tf.conv3d(
        gridExpanded,
        this.convKernel,
        [1, 1, 1], // strides: [depthStride, heightStride, widthStride]
        'same', // padding
        'NDHWC', // dataFormat
        [1, 1, 1] // dilations: [depthDilation, heightDilation, widthDilation]
      ).squeeze([0, 4]); // Remove batch and channel dimensions
      
      // Create conditions for birth and survival
      const currentState = this.gridTensor;
      
      // Create tensors for birth and survival rules
      // We need 27 elements for neighbor counts 0-26 (3D has 26 neighbors)
      const birthArray = Array(27).fill(0);
      const survivalArray = Array(27).fill(0);
      
      birthValues.forEach(v => {
        if (v >= 0 && v < 27) birthArray[v] = 1;
      });
      survivalValues.forEach(v => {
        if (v >= 0 && v < 27) survivalArray[v] = 1;
      });
      
      // Apply B/S rules
      // 1. Create masks for alive and dead cells
      const aliveMask = currentState.greater(0.5);
      const deadMask = currentState.less(0.5);
      
      // 2. For each possible neighbor count, create a mask and apply the rule
      let newState = tf.zeros(currentState.shape);
      
      // Process each possible neighbor count
      for (let i = 0; i <= 26; i++) {
        const countMask = neighborCount.equal(i);
        
        // Apply birth rule to dead cells
        if (birthArray[i] > 0) {
          const birthMask = deadMask.logicalAnd(countMask);
          const birthUpdate = birthMask.mul(tf.scalar(1.0));
          newState = newState.add(birthUpdate);
        }
        
        // Apply survival rule to alive cells
        if (survivalArray[i] > 0) {
          const survivalMask = aliveMask.logicalAnd(countMask);
          const survivalUpdate = survivalMask.mul(tf.scalar(1.0));
          newState = newState.add(survivalUpdate);
        }
      }
      
      return newState;
    });
  }
  
  // Process Brian's Brain rule (3-state CA)
  processBriansBrainRule() {
    return tf.tidy(() => {
      // Add batch and channel dimensions for convolution
      const gridExpanded = this.gridTensor.expandDims(3).expandDims(0);
      
      // Perform 3D convolution to count neighbors
      const neighborCount = tf.conv3d(
        gridExpanded,
        this.convKernel,
        [1, 1, 1], // strides: [depthStride, heightStride, widthStride]
        'same', // padding
        'NDHWC', // dataFormat
        [1, 1, 1] // dilations: [depthDilation, heightDilation, widthDilation]
      ).squeeze([0, 4]); // Remove batch and channel dimensions
      
      const currentState = this.gridTensor;
      
      // Create masks for the three states
      // State 0: dead, State 1: alive, State 0.5: dying
      const deadMask = currentState.less(0.25);
      const aliveMask = currentState.greater(0.75);
      const dyingMask = currentState.greater(0.25).logicalAnd(currentState.less(0.75));
      
      // Apply Brian's Brain rules
      
      // 1. Dead cells with exactly 2 alive neighbors become alive
      const birthNeighborsMask = neighborCount.equal(2);
      const birthMask = deadMask.logicalAnd(birthNeighborsMask);
      const birthUpdate = birthMask.mul(tf.scalar(1.0)); // State 1 (alive)
      
      // 2. Alive cells become dying
      const dyingUpdate = aliveMask.mul(tf.scalar(0.5)); // State 0.5 (dying)
      
      // 3. Dying cells become dead (default state is 0)
      // This happens implicitly by not including them in the new state
      
      // Combine the updates
      const newState = birthUpdate.add(dyingUpdate);
      
      return newState;
    });
  }
  
  // Compute the next generation
  computeNextGeneration() {
    if (!this.initialized || !this.gridTensor) {
      console.warn('[3DLogicTF] Not initialized');
      return null;
    }
    
    console.log(`[3DLogicTF] Computing next generation with rule: ${this.currentRule}`);
    
    // Process based on rule type
    let nextGenTensor;
    
    if (this.currentRule === 'briansbrain3d') {
      // Special processing for Brian's Brain
      nextGenTensor = this.processBriansBrainRule();
    } else if (this.currentRule === 'checkerboard') {
      // Static pattern - just return the current grid
      nextGenTensor = this.gridTensor.clone();
    } else {
      // Standard B/S rule
      const rule = RULE_DEFINITIONS[this.currentRule] || RULE_DEFINITIONS.conway3d;
      nextGenTensor = this.processStandardRule(rule.birth, rule.survival);
    }
    
    // Convert tensor back to JavaScript array
    const [sizeX, sizeY, sizeZ] = nextGenTensor.shape;
    const result = createEmpty3DGrid(sizeX, sizeY, sizeZ);
    
    // Get data from tensor (synchronous operation)
    const flatData = nextGenTensor.dataSync();
    
    // Convert flat data back to 3D grid
    let i = 0;
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          // For standard rules, round to 0 or 1
          // For Brian's Brain, preserve 0, 0.5, or 1
          if (this.currentRule === 'briansbrain3d') {
            const value = flatData[i++];
            if (value > 0.75) {
              result[x][y][z] = 1; // Alive
            } else if (value > 0.25) {
              result[x][y][z] = 2; // Dying (using 2 to match our existing logic)
            }
            // Dead cells stay at 0
          } else {
            result[x][y][z] = Math.round(flatData[i++]);
          }
        }
      }
    }
    
    // Update the grid tensor for the next iteration
    this.gridTensor.dispose();
    this.gridTensor = nextGenTensor;
    
    return result;
  }
  
  // Clean up TensorFlow.js resources
  dispose() {
    if (this.gridTensor) {
      this.gridTensor.dispose();
      this.gridTensor = null;
    }
    
    if (this.convKernel) {
      this.convKernel.dispose();
      this.convKernel = null;
    }
    
    this.initialized = false;
    console.log('[3DLogicTF] Resources disposed');
  }
}

// Singleton instance for the TensorFlow-based CA processing
let tfInstance = null;

// Calculate next generation for 3D cellular automaton using TensorFlow.js GPGPU
const calculateNextGeneration3DTF = (currentGrid, ruleName = 'conway3d') => {
  if (!currentGrid || currentGrid.length === 0 || !currentGrid[0] || 
      currentGrid[0].length === 0 || !currentGrid[0][0] || currentGrid[0][0].length === 0) {
    console.warn("[automataLogic3DTF] Invalid or empty 3D grid provided.");
    return createEmpty3DGrid(1, 1, 1); // Return minimal grid on error
  }
  
  // Initialize TensorFlow compute if needed
  if (!tfInstance) {
    console.log('[automataLogic3DTF] Creating new TensorFlow.js instance');
    tfInstance = new CellularAutomataTF();
  }
  
  // Check if we need to reinitialize (grid size changed or first run)
  const sizeX = currentGrid.length;
  const sizeY = currentGrid[0].length;
  const sizeZ = currentGrid[0][0].length;
  
  if (!tfInstance.initialized || 
      tfInstance.size.x !== sizeX || 
      tfInstance.size.y !== sizeY || 
      tfInstance.size.z !== sizeZ ||
      tfInstance.currentRule !== ruleName) {
    // Full initialization for new size or rule change
    console.log(`[automataLogic3DTF] Initializing TensorFlow compute. Size: ${sizeX}x${sizeY}x${sizeZ}, Rule: ${ruleName}`);
    tfInstance.initialize(currentGrid, ruleName);
  } else {
    // Just update the grid data
    tfInstance.updateGrid(currentGrid);
  }
  
  // Compute next generation using TensorFlow.js
  return tfInstance.computeNextGeneration();
};

// Export the TensorFlow.js-accelerated functions
export { 
  calculateNextGeneration3DTF as calculateNextGeneration3D, 
  createInitial3DGrid, 
  createEmpty3DGrid, 
  RULE_DEFINITIONS 
};