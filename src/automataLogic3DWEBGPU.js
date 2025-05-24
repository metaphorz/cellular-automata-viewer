// automataLogic3DWEBGPU.js - WebGPU-accelerated 3D Cellular Automata Logic
// This implementation uses the WebGPU API for maximum GPU performance

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

// Validate 3D grid data
const isValid3DGrid = (grid) => {
  return grid && 
         Array.isArray(grid) && 
         grid.length > 0 && 
         Array.isArray(grid[0]) && 
         grid[0].length > 0 &&
         Array.isArray(grid[0][0]) && 
         grid[0][0].length > 0;
};

// Create a 3D grid with various seed patterns (same as other implementations)
const createInitial3DGrid = (sizeX = 30, sizeY = 30, sizeZ = 30, pattern = 'checkerboard') => {
  console.log('[3DLogicWebGPU] Creating initial 3D grid with size', sizeX, sizeY, sizeZ, 'and pattern', pattern);
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
  console.log('[3DLogicWebGPU] Created initial grid with', activeCells, 'active cells');
  
  return grid;
};

// Check if WebGPU is supported
const isWebGPUSupported = async () => {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    console.warn('[3DLogicWebGPU] WebGPU is not supported in this browser');
    return false;
  }
  
  try {
    // Request adapter (GPU)
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    
    if (!adapter) {
      console.warn('[3DLogicWebGPU] No WebGPU adapter found');
      return false;
    }
    
    // Log adapter info
    console.log('[3DLogicWebGPU] WebGPU adapter found');
    
    // Verify we can create a device
    const device = await adapter.requestDevice();
    if (!device) {
      console.warn('[3DLogicWebGPU] Failed to request WebGPU device');
      return false;
    }
    
    console.log('[3DLogicWebGPU] WebGPU is supported');
    return true;
  } catch (error) {
    console.error('[3DLogicWebGPU] Error checking WebGPU support:', error);
    return false;
  }
};

// For comparison testing during development - directly import the WebGL implementation
// We'll remove this when our WebGPU implementation is complete
import { calculateNextGeneration3D as calculateNextGeneration3DGPU } from './automataLogic3DGPU.js';

// Initialization flag for WebGPU
let webGPUInitialized = false;
let webGPUDevice = null;
let rulePipeline = null;
let ruleBindGroups = [];
let uniformBuffer = null;
let stateCellBuffers = [null, null]; // Ping-pong buffers
let resultStagingBuffer = null;
let currentBufferIndex = 0;
let gridSize = { x: 0, y: 0, z: 0 };
let generationCount = 0;

// Initialize WebGPU for compute
const initializeWebGPU = async (grid, ruleName) => {
  if (webGPUInitialized) {
    // Already initialized, just update rule if needed
    return webGPUInitialized;
  }

  if (!navigator.gpu) {
    console.error("[3DLogicWebGPU] WebGPU not supported in this browser");
    return false;
  }

  try {
    // Request adapter
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });
    
    if (!adapter) {
      console.error("[3DLogicWebGPU] Failed to get WebGPU adapter");
      return false;
    }
    
    // Request device
    webGPUDevice = await adapter.requestDevice();
    console.log("[3DLogicWebGPU] WebGPU device initialized:", webGPUDevice);

    // Validate grid data
    if (!isValid3DGrid(grid)) {
      console.error("[3DLogicWebGPU] Invalid or empty grid data provided");
      return false;
    }

    // Initialize grid dimensions
    gridSize = {
      x: grid.length,
      y: grid[0].length,
      z: grid[0][0].length
    };
    
    console.log(`[3DLogicWebGPU] Grid dimensions: ${gridSize.x}x${gridSize.y}x${gridSize.z}`);
    
    // Create buffers and pipelines
    await setupBuffers(grid);
    await createComputePipelines(ruleName);

    webGPUInitialized = true;
    return true;
  } catch (error) {
    console.error("[3DLogicWebGPU] Error initializing WebGPU:", error);
    return false;
  }
};

// Set up buffers for computation
const setupBuffers = async (grid) => {
  const totalCells = gridSize.x * gridSize.y * gridSize.z;
  const bufferSize = totalCells * 4; // 4 bytes per cell (u32)
  
  console.log(`[3DLogicWebGPU] Setting up buffers for grid size ${gridSize.x}x${gridSize.y}x${gridSize.z}`);
  
  // Create ping-pong buffers for state
  stateCellBuffers[0] = webGPUDevice.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true,
  });
  
  stateCellBuffers[1] = webGPUDevice.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  
  // Create uniform buffer for grid dimensions and rule parameters
  uniformBuffer = webGPUDevice.createBuffer({
    size: 80, // 12 bytes for dimensions + 2 arrays of 8 u32 values for rule definition
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  
  // Create staging buffer for reading back results
  resultStagingBuffer = webGPUDevice.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });
  
  // Fill the first buffer with the initial grid state
  const cellStateArray = new Uint32Array(stateCellBuffers[0].getMappedRange());
  
  // Convert 3D grid to 1D array
  let cellIndex = 0;
  for (let z = 0; z < gridSize.z; z++) {
    for (let y = 0; y < gridSize.y; y++) {
      for (let x = 0; x < gridSize.x; x++) {
        cellStateArray[cellIndex++] = grid[x][y][z];
      }
    }
  }
  
  stateCellBuffers[0].unmap();
  currentBufferIndex = 0;
  
  console.log(`[3DLogicWebGPU] Buffers initialized with ${totalCells} cells`);
};

// Create compute pipeline
const createComputePipelines = async (ruleName) => {
  console.log(`[3DLogicWebGPU] Creating compute pipeline for rule: ${ruleName}`);
  
  // Get rule definition
  let rule = RULE_DEFINITIONS[ruleName] || RULE_DEFINITIONS.conway3d;
  
  // Set up rule values in uniform buffer
  const birthValues = new Uint32Array(8).fill(0);
  const survivalValues = new Uint32Array(8).fill(0);
  
  // Special handling for Brian's Brain and static patterns
  if (rule.type === 'special' && ruleName === 'briansbrain3d') {
    // Brian's Brain uses a special shader, handled separately
  } else if (rule.type !== 'static') {
    // Standard B/S rule
    rule.birth.forEach(value => {
      if (value >= 3 && value <= 10) {
        birthValues[value - 3] = 1;
      }
    });
    
    rule.survival.forEach(value => {
      if (value >= 3 && value <= 10) {
        survivalValues[value - 3] = 1;
      }
    });
  }
  
  // Create uniform buffer data
  const uniformData = new ArrayBuffer(80);
  const uniformView = new DataView(uniformData);
  
  // Set grid dimensions
  uniformView.setUint32(0, gridSize.x, true);
  uniformView.setUint32(4, gridSize.y, true);
  uniformView.setUint32(8, gridSize.z, true);
  
  // Set birth and survival values
  let offset = 16; // Align to 16 bytes
  for (let i = 0; i < 8; i++) {
    uniformView.setUint32(offset + i * 4, birthValues[i], true);
  }
  
  offset = 48; // 16 + 8*4, aligned to 16 bytes
  for (let i = 0; i < 8; i++) {
    uniformView.setUint32(offset + i * 4, survivalValues[i], true);
  }
  
  // Update uniform buffer
  webGPUDevice.queue.writeBuffer(uniformBuffer, 0, uniformData);
  
  // Choose the appropriate shader based on rule type
  let computeShaderCode;
  
  // Standard B/S rule shader (used for most rules)
  if (rule.type !== 'special' && ruleName !== 'checkerboard') {
    computeShaderCode = /* wgsl */`
      struct Uniforms {
        gridSize : vec3u,              // Grid dimensions
        birthRule : array<u32, 8>,     // Birth rule values (1 if birth at neighbor count index+3)
        survivalRule : array<u32, 8>   // Survival rule values (1 if survival at neighbor count index+3)
      };
      
      @binding(0) @group(0) var<uniform> uniforms : Uniforms;
      @binding(1) @group(0) var<storage, read> cellStateIn : array<u32>;
      @binding(2) @group(0) var<storage, read_write> cellStateOut : array<u32>;
      
      // Get cell state with wrapping
      fn getCellState(x : u32, y : u32, z : u32) -> u32 {
        let wrappedX = x % uniforms.gridSize.x;
        let wrappedY = y % uniforms.gridSize.y;
        let wrappedZ = z % uniforms.gridSize.z;
        
        let index = wrappedZ * uniforms.gridSize.y * uniforms.gridSize.x + 
                   wrappedY * uniforms.gridSize.x + 
                   wrappedX;
                   
        return cellStateIn[index];
      }
      
      // Calculate 3D index from flat array index
      fn get3DCoords(index : u32) -> vec3u {
        let x = index % uniforms.gridSize.x;
        let y = (index / uniforms.gridSize.x) % uniforms.gridSize.y;
        let z = index / (uniforms.gridSize.x * uniforms.gridSize.y);
        
        return vec3u(x, y, z);
      }
      
      // Count neighbors of a cell
      fn countNeighbors(x : u32, y : u32, z : u32) -> u32 {
        var count : u32 = 0;
        
        for (var dz : i32 = -1; dz <= 1; dz++) {
          for (var dy : i32 = -1; dy <= 1; dy++) {
            for (var dx : i32 = -1; dx <= 1; dx++) {
              // Skip the cell itself
              if (dx == 0 && dy == 0 && dz == 0) {
                continue;
              }
              
              // Get wrapped coordinates
              let nx = (x + u32(dx) + uniforms.gridSize.x) % uniforms.gridSize.x;
              let ny = (y + u32(dy) + uniforms.gridSize.y) % uniforms.gridSize.y;
              let nz = (z + u32(dz) + uniforms.gridSize.z) % uniforms.gridSize.z;
              
              // Get neighbor state and add to count
              let idx = nz * uniforms.gridSize.y * uniforms.gridSize.x + ny * uniforms.gridSize.x + nx;
              count += cellStateIn[idx];
            }
          }
        }
        
        return count;
      }
      
      @compute @workgroup_size(8, 8, 1)
      fn main(@builtin(global_invocation_id) global_id : vec3u) {
        // Calculate the cell index
        let index = global_id.z * uniforms.gridSize.y * uniforms.gridSize.x + 
                  global_id.y * uniforms.gridSize.x + 
                  global_id.x;
                  
        // Check if this thread is within bounds
        if (global_id.x >= uniforms.gridSize.x || 
            global_id.y >= uniforms.gridSize.y || 
            global_id.z >= uniforms.gridSize.z) {
          return;
        }
        
        // Get current state of the cell
        let currentState = cellStateIn[index];
        
        // Count neighbors
        let neighbors = countNeighbors(global_id.x, global_id.y, global_id.z);
        
        // Apply cellular automata rules
        var newState : u32 = 0;
        
        if (currentState == 1) {
          // Cell is alive, check survival rules
          if (neighbors >= 3 && neighbors <= 10) {
            let ruleIndex = neighbors - 3;
            if (ruleIndex < 8 && uniforms.survivalRule[ruleIndex] == 1) {
              newState = 1;
            }
          }
        } else {
          // Cell is dead, check birth rules
          if (neighbors >= 3 && neighbors <= 10) {
            let ruleIndex = neighbors - 3;
            if (ruleIndex < 8 && uniforms.birthRule[ruleIndex] == 1) {
              newState = 1;
            }
          }
        }
        
        // Write new state to output buffer
        cellStateOut[index] = newState;
      }
    `;
  } 
  // Brian's Brain shader (three states: 0=dead, 1=dying, 2=alive)
  else if (ruleName === 'briansbrain3d') {
    computeShaderCode = /* wgsl */`
      struct Uniforms {
        gridSize : vec3u,  // Grid dimensions
        padding : u32      // Padding to ensure 16-byte alignment
      };
      
      @binding(0) @group(0) var<uniform> uniforms : Uniforms;
      @binding(1) @group(0) var<storage, read> cellStateIn : array<u32>;
      @binding(2) @group(0) var<storage, read_write> cellStateOut : array<u32>;
      
      @compute @workgroup_size(8, 8, 1)
      fn main(@builtin(global_invocation_id) global_id : vec3u) {
        // Calculate the cell index
        let index = global_id.z * uniforms.gridSize.y * uniforms.gridSize.x + 
                  global_id.y * uniforms.gridSize.x + 
                  global_id.x;
                  
        // Check if this thread is within bounds
        if (global_id.x >= uniforms.gridSize.x || 
            global_id.y >= uniforms.gridSize.y || 
            global_id.z >= uniforms.gridSize.z) {
          return;
        }
        
        // Get current state of the cell (0=dead, 1=dying, 2=alive)
        let currentState = cellStateIn[index];
        
        // Brian's Brain rules:
        // - If a cell is alive (2), it becomes dying (1)
        // - If a cell is dying (1), it becomes dead (0)
        // - If a cell is dead (0) and has exactly 2 alive neighbors, it becomes alive (2)
        
        var newState : u32 = 0;  // Default to dead
        
        if (currentState == 2) {
          // Currently alive, becomes dying
          newState = 1;
        } else if (currentState == 1) {
          // Currently dying, becomes dead
          newState = 0;
        } else {
          // Currently dead, check for birth condition
          var aliveNeighbors : u32 = 0;
          
          // Count alive neighbors
          for (var dz : i32 = -1; dz <= 1; dz++) {
            for (var dy : i32 = -1; dy <= 1; dy++) {
              for (var dx : i32 = -1; dx <= 1; dx++) {
                // Skip the cell itself
                if (dx == 0 && dy == 0 && dz == 0) {
                  continue;
                }
                
                // Get wrapped coordinates
                let nx = (global_id.x + u32(dx) + uniforms.gridSize.x) % uniforms.gridSize.x;
                let ny = (global_id.y + u32(dy) + uniforms.gridSize.y) % uniforms.gridSize.y;
                let nz = (global_id.z + u32(dz) + uniforms.gridSize.z) % uniforms.gridSize.z;
                
                // Get neighbor state and count if alive
                let idx = nz * uniforms.gridSize.y * uniforms.gridSize.x + ny * uniforms.gridSize.x + nx;
                if (cellStateIn[idx] == 2) {  // Only count alive cells
                  aliveNeighbors++;
                }
              }
            }
          }
          
          // Birth rule: exactly 2 alive neighbors
          if (aliveNeighbors == 2) {
            newState = 2;  // Become alive
          }
        }
        
        // Write new state to output buffer
        cellStateOut[index] = newState;
      }
    `;
  }
  // Checkerboard static pattern (just copies the input)
  else if (ruleName === 'checkerboard') {
    computeShaderCode = /* wgsl */`
      @binding(1) @group(0) var<storage, read> cellStateIn : array<u32>;
      @binding(2) @group(0) var<storage, read_write> cellStateOut : array<u32>;
      
      @compute @workgroup_size(8, 8, 1)
      fn main(@builtin(global_invocation_id) global_id : vec3u) {
        let index = global_id.z * ${gridSize.y} * ${gridSize.x} + 
                  global_id.y * ${gridSize.x} + 
                  global_id.x;
                  
        // Simple copy operation for static pattern
        cellStateOut[index] = cellStateIn[index];
      }
    `;
  }
  
  // Create the compute shader module
  const shaderModule = webGPUDevice.createShaderModule({
    code: computeShaderCode
  });

  // Create bind group layout
  const bindGroupLayout = webGPUDevice.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' }
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'read-only-storage' }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: 'storage' }
      }
    ]
  });

  // Create pipeline layout
  const pipelineLayout = webGPUDevice.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout]
  });

  // Create compute pipeline
  rulePipeline = webGPUDevice.createComputePipeline({
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: 'main'
    }
  });

  // Create bind groups for ping-pong buffers
  ruleBindGroups = [
    webGPUDevice.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer }
        },
        {
          binding: 1,
          resource: { buffer: stateCellBuffers[0] }
        },
        {
          binding: 2,
          resource: { buffer: stateCellBuffers[1] }
        }
      ]
    }),
    webGPUDevice.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer }
        },
        {
          binding: 1,
          resource: { buffer: stateCellBuffers[1] }
        },
        {
          binding: 2,
          resource: { buffer: stateCellBuffers[0] }
        }
      ]
    })
  ];
  
  console.log(`[3DLogicWebGPU] Compute pipeline created for rule: ${ruleName}`);
};

// Update rule parameters
const updateRule = async (ruleName) => {
  console.log(`[3DLogicWebGPU] Updating rule to: ${ruleName}`);
  
  // Get rule definition
  let rule = RULE_DEFINITIONS[ruleName] || RULE_DEFINITIONS.conway3d;
  
  // Set up rule values in uniform buffer
  const birthValues = new Uint32Array(8).fill(0);
  const survivalValues = new Uint32Array(8).fill(0);
  
  // Special handling for Brian's Brain and static patterns
  if (rule.type !== 'special' && ruleName !== 'checkerboard') {
    // Standard B/S rule
    rule.birth.forEach(value => {
      if (value >= 3 && value <= 10) {
        birthValues[value - 3] = 1;
      }
    });
    
    rule.survival.forEach(value => {
      if (value >= 3 && value <= 10) {
        survivalValues[value - 3] = 1;
      }
    });
  }
  
  // Create uniform buffer data
  const uniformData = new ArrayBuffer(80);
  const uniformView = new DataView(uniformData);
  
  // Set grid dimensions
  uniformView.setUint32(0, gridSize.x, true);
  uniformView.setUint32(4, gridSize.y, true);
  uniformView.setUint32(8, gridSize.z, true);
  
  // Set birth and survival values
  let offset = 16; // Align to 16 bytes
  for (let i = 0; i < 8; i++) {
    uniformView.setUint32(offset + i * 4, birthValues[i], true);
  }
  
  offset = 48; // 16 + 8*4, aligned to 16 bytes
  for (let i = 0; i < 8; i++) {
    uniformView.setUint32(offset + i * 4, survivalValues[i], true);
  }
  
  // Update uniform buffer
  webGPUDevice.queue.writeBuffer(uniformBuffer, 0, uniformData);
  
  // For Brian's Brain or static patterns, we need to recreate the pipeline
  if (rule.type === 'special' || ruleName === 'checkerboard') {
    await createComputePipelines(ruleName);
  }
  
  console.log(`[3DLogicWebGPU] Rule updated to ${ruleName}`);
  console.log(`[3DLogicWebGPU] Birth values: [${birthValues.join(', ')}]`);
  console.log(`[3DLogicWebGPU] Survival values: [${survivalValues.join(', ')}]`);
};

// Compute next generation using WebGPU
const computeNextGenerationWebGPU = async (grid, ruleName) => {
  // Validate input grid
  if (!isValid3DGrid(grid)) {
    console.error("[3DLogicWebGPU] computeNextGenerationWebGPU: Invalid grid data");
    return null;
  }
  
  // Make sure WebGPU is initialized
  if (!webGPUInitialized) {
    console.log("[3DLogicWebGPU] Initializing WebGPU for first use");
    const initialized = await initializeWebGPU(grid, ruleName);
    if (!initialized) {
      console.error("[3DLogicWebGPU] Failed to initialize WebGPU");
      return null;
    }
  }
  
  // Check if grid dimensions have changed or different rule
  if (gridSize.x !== grid.length || 
      gridSize.y !== grid[0].length || 
      gridSize.z !== grid[0][0].length) {
    console.log("[3DLogicWebGPU] Grid dimensions changed, reinitializing WebGPU");
    // Clean up previous resources
    webGPUInitialized = false;
    // Reinitialize with new dimensions
    const initialized = await initializeWebGPU(grid, ruleName);
    if (!initialized) {
      console.error("[3DLogicWebGPU] Failed to reinitialize WebGPU");
      return null;
    }
  }
  
  // Update the grid state in the input buffer if needed
  const totalCells = gridSize.x * gridSize.y * gridSize.z;
  const cellData = new Uint32Array(totalCells);
  
  // Convert 3D grid to 1D array
  let cellIndex = 0;
  for (let z = 0; z < gridSize.z; z++) {
    for (let y = 0; y < gridSize.y; y++) {
      for (let x = 0; x < gridSize.x; x++) {
        cellData[cellIndex++] = grid[x][y][z];
      }
    }
  }
  
  // Write grid data to the current buffer
  webGPUDevice.queue.writeBuffer(
    stateCellBuffers[currentBufferIndex], 
    0, 
    cellData
  );
  
  // Create command encoder
  const encoder = webGPUDevice.createCommandEncoder();
  
  // Begin compute pass
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(rulePipeline);
  computePass.setBindGroup(0, ruleBindGroups[currentBufferIndex]);
  
  // Dispatch workgroups
  const workgroupCountX = Math.ceil(gridSize.x / 8);
  const workgroupCountY = Math.ceil(gridSize.y / 8);
  const workgroupCountZ = Math.ceil(gridSize.z / 1); // Using 8,8,1 workgroup size
  
  computePass.dispatchWorkgroups(workgroupCountX, workgroupCountY, workgroupCountZ);
  computePass.end();
  
  // Copy output to staging buffer for readback
  const outputBufferIndex = 1 - currentBufferIndex;
  encoder.copyBufferToBuffer(
    stateCellBuffers[outputBufferIndex],
    0,
    resultStagingBuffer,
    0,
    totalCells * 4
  );
  
  // Submit commands
  const commandBuffer = encoder.finish();
  webGPUDevice.queue.submit([commandBuffer]);
  
  // Swap buffers for next iteration
  currentBufferIndex = outputBufferIndex;
  
  // Read back results
  await resultStagingBuffer.mapAsync(GPUMapMode.READ);
  const resultData = new Uint32Array(resultStagingBuffer.getMappedRange());
  
  // Convert 1D array back to 3D grid
  const result = createEmpty3DGrid(gridSize.x, gridSize.y, gridSize.z);
  
  cellIndex = 0;
  for (let z = 0; z < gridSize.z; z++) {
    for (let y = 0; y < gridSize.y; y++) {
      for (let x = 0; x < gridSize.x; x++) {
        result[x][y][z] = resultData[cellIndex++];
      }
    }
  }
  
  resultStagingBuffer.unmap();
  
  return result;
};

// We're already tracking generation count above - no need to redeclare

// Calculate next generation for 3D cellular automaton using WebGPU
const calculateNextGeneration3D = async (currentGrid, ruleName = 'conway3d') => {
  // Validate input grid
  if (!isValid3DGrid(currentGrid)) {
    console.error("[WebGPU] Invalid or empty 3D grid provided");
    // Return a minimal grid as fallback
    return createEmpty3DGrid(1, 1, 1);
  }
  
  // Increment generation count for debugging
  generationCount++;
  
  console.log(`[WebGPU] Generation ${generationCount} - Computing with rule: ${ruleName}`);
  
  try {
    // Check WebGPU support
    const hasWebGPU = await isWebGPUSupported();
    
    if (!hasWebGPU) {
      console.warn("[WebGPU] WebGPU not supported, falling back to WebGL implementation");
      const result = calculateNextGeneration3DGPU(currentGrid, ruleName);
      // We'll still do the test logging for consistency
      logResults(result, ruleName, currentGrid);
      return result;
    }
    
    // TEMPORARY: For now, let's use the WebGL implementation for computation
    // while we debug the WebGPU implementation
    console.log(`[WebGPU] NOTICE: Using WebGL implementation while WebGPU is being debugged`);
    const result = calculateNextGeneration3DGPU(currentGrid, ruleName);
    
    // Log that we're using WebGL for computation but in WebGPU mode
    console.log(`[WebGPU] Using WebGL for computation in WebGPU mode`);
    
    // Once we have our WebGPU implementation working correctly, we'll uncomment this:
    /*
    console.log(`[WebGPU] Computing using WebGPU implementation`);
    const result = await computeNextGenerationWebGPU(currentGrid, ruleName);
    
    if (!result) {
      console.warn("[WebGPU] Computation failed, falling back to WebGL implementation");
      const fallbackResult = calculateNextGeneration3DGPU(currentGrid, ruleName);
      logResults(fallbackResult, ruleName, currentGrid);
      return fallbackResult;
    }
    */
    
    // Log results for testing
    logResults(result, ruleName, currentGrid);
    
    return result;
  } catch (error) {
    console.error("[WebGPU] Error computing next generation:", error);
    console.warn("[WebGPU] Error in WebGPU computation, falling back to WebGL implementation");
    const fallbackResult = calculateNextGeneration3DGPU(currentGrid, ruleName);
    logResults(fallbackResult, ruleName, currentGrid);
    return fallbackResult;
  }
};

// Helper function to log results for testing
const logResults = (result, ruleName, currentGrid) => {
  if (!isValid3DGrid(result) || !isValid3DGrid(currentGrid)) {
    console.warn("[WebGPU] Cannot log results: invalid grid data");
    return;
  }
  
  // Log input grid sample
  console.log(`[WebGPU] Generation ${generationCount} - Input grid sample:`);
  let inputActiveCells = 0;
  for (let x = 0; x < Math.min(3, currentGrid.length); x++) {
    for (let y = 0; y < Math.min(3, currentGrid[0].length); y++) {
      for (let z = 0; z < Math.min(3, currentGrid[0][0].length); z++) {
        if (currentGrid[x][y][z] > 0) inputActiveCells++;
        console.log(`  Cell at (${x},${y},${z}): ${currentGrid[x][y][z]}`);
      }
    }
  }
  
  // Log result grid sample
  console.log(`[WebGPU] Generation ${generationCount} - Result grid sample:`);
  let resultActiveCells = 0;
  for (let x = 0; x < Math.min(3, result.length); x++) {
    for (let y = 0; y < Math.min(3, result[0].length); y++) {
      for (let z = 0; z < Math.min(3, result[0][0].length); z++) {
        if (result[x][y][z] > 0) resultActiveCells++;
        console.log(`  Cell at (${x},${y},${z}): ${result[x][y][z]}`);
      }
    }
  }
  
  // Count total active cells
  let totalActiveCells = 0;
  for (let x = 0; x < result.length; x++) {
    for (let y = 0; y < result[0].length; y++) {
      for (let z = 0; z < result[0][0].length; z++) {
        if (result[x][y][z] > 0) totalActiveCells++;
      }
    }
  }
  
  console.log(`[WebGPU] Generation ${generationCount} - Total active cells: ${totalActiveCells}`);
  
  // Save detailed generation data to compare with WebGL implementation
  if (generationCount <= 3) {
    console.log(`[WebGPU-Test] GENERATION ${generationCount} DATA FOR COMPARISON`);
    console.log(`Rule: ${ruleName}, Active cells: ${totalActiveCells}`);
    
    // First 3x3x3 region (corner)
    console.log(`[WebGPU-Test] Corner region (0,0,0) to (2,2,2):`);
    for (let x = 0; x < Math.min(3, result.length); x++) {
      for (let y = 0; y < Math.min(3, result[0].length); y++) {
        for (let z = 0; z < Math.min(3, result[0][0].length); z++) {
          console.log(`  Cell at (${x},${y},${z}): ${result[x][y][z]}`);
        }
      }
    }
    
    // Log detailed 3x3x3 subset from center for fine-grained comparison
    const centerX = Math.floor(result.length / 2);
    const centerY = Math.floor(result[0].length / 2);
    const centerZ = Math.floor(result[0][0].length / 2);
    
    console.log(`[WebGPU-Test] Center region (${centerX-1},${centerY-1},${centerZ-1}) to (${centerX+1},${centerY+1},${centerZ+1}):`);
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
    
    console.log(`[WebGPU-Test] Generation ${generationCount} fingerprint: ${fingerprint}`);
  }
  
  // Reset counter after 3 generations
  if (generationCount >= 3) {
    generationCount = 0;
  }
};

// Clean up resources when no longer needed
const cleanupWebGPU = () => {
  if (webGPUInitialized) {
    console.log("[3DLogicWebGPU] Cleaning up WebGPU resources");
    
    // Reset flags and references
    webGPUInitialized = false;
    webGPUDevice = null;
    rulePipeline = null;
    ruleBindGroups = [];
    uniformBuffer = null;
    stateCellBuffers = [null, null];
    resultStagingBuffer = null;
    currentBufferIndex = 0;
    
    console.log("[3DLogicWebGPU] WebGPU resources cleaned up");
  }
};

// Export the WebGPU-accelerated functions
export { 
  calculateNextGeneration3D, 
  createInitial3DGrid, 
  createEmpty3DGrid, 
  RULE_DEFINITIONS,
  isWebGPUSupported,
  cleanupWebGPU,
  isValid3DGrid
};