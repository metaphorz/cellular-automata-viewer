// automataLogic3D.js - 3D Cellular Automata Logic

// Rule definitions in B/S notation (similar to 2D)
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

// Create an empty 3D grid with given dimensions
const createEmpty3DGrid = (sizeX, sizeY, sizeZ) => {
  return Array(sizeX).fill().map(() => 
    Array(sizeY).fill().map(() => 
      Array(sizeZ).fill(0)
    )
  );
};

// Create a 3D grid with various seed patterns based on the desired initial state
const createInitial3DGrid = (sizeX = 30, sizeY = 30, sizeZ = 30, pattern = 'checkerboard') => {
  console.log('[3DLogic] Creating initial 3D grid with size', sizeX, sizeY, sizeZ, 'and pattern', pattern);
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
    // Default to a simple cross plus small box pattern
    // Create a 3D "plus sign" - very prominent in center
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
          if (Math.abs(x) + Math.abs(y) + Math.abs(z) >= 2) { // Excludes center and center-adjacent
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
  console.log('[3DLogic] Created initial grid with', activeCells, 'active cells');
  
  return grid;
};

// Count live neighbors for a cell in 3D space (26 neighbors total)
const countLiveNeighbors3D = (grid, x, y, z) => {
  let count = 0;
  const sizeX = grid.length;
  const sizeY = grid[0].length;
  const sizeZ = grid[0][0].length;

  // Iterate through all 26 neighbors (3x3x3 cube minus the center)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        // Skip the cell itself
        if (dx === 0 && dy === 0 && dz === 0) continue;

        // Calculate neighbor coordinates with wraparound
        const nx = (x + dx + sizeX) % sizeX;
        const ny = (y + dy + sizeY) % sizeY;
        const nz = (z + dz + sizeZ) % sizeZ;

        if (grid[nx][ny][nz] === 1) {
          count++;
        }
      }
    }
  }
  return count;
};

// Special function for 3D Brian's Brain (3-state automaton)
const calculateBriansBrain3D = (currentGrid) => {
  const sizeX = currentGrid.length;
  const sizeY = currentGrid[0].length;
  const sizeZ = currentGrid[0][0].length;
  const nextGrid = createEmpty3DGrid(sizeX, sizeY, sizeZ);

  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        const cellState = currentGrid[x][y][z];
        
        if (cellState === 0) {
          // Empty cell
          let onNeighbors = 0;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              for (let dz = -1; dz <= 1; dz++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;
                const nx = (x + dx + sizeX) % sizeX;
                const ny = (y + dy + sizeY) % sizeY;
                const nz = (z + dz + sizeZ) % sizeZ;
                if (currentGrid[nx][ny][nz] === 1) {
                  onNeighbors++;
                }
              }
            }
          }
          // Empty cell becomes ON if exactly 2 ON neighbors
          nextGrid[x][y][z] = (onNeighbors === 2) ? 1 : 0;
        } else if (cellState === 1) {
          // ON cell always becomes dying
          nextGrid[x][y][z] = 2;
        } else if (cellState === 2) {
          // Dying cell always becomes empty
          nextGrid[x][y][z] = 0;
        }
      }
    }
  }
  return nextGrid;
};

// Calculate next generation for 3D cellular automaton
const calculateNextGeneration3D = (currentGrid, ruleName = 'conway3d') => {
  if (!currentGrid || currentGrid.length === 0 || !currentGrid[0] || 
      currentGrid[0].length === 0 || !currentGrid[0][0] || currentGrid[0][0].length === 0) {
    console.warn("[automataLogic3D] Invalid or empty 3D grid provided.");
    return createEmpty3DGrid(1, 1, 1); // Return minimal grid on error
  }

  // Handle special rule types
  if (ruleName === 'briansbrain3d') {
    return calculateBriansBrain3D(currentGrid);
  }
  
  // Static checkerboard pattern - no changes to the grid
  if (ruleName === 'checkerboard') {
    console.log('[automataLogic3D] Using static checkerboard pattern - no grid changes');
    // Return a copy of the current grid
    const sizeX = currentGrid.length;
    const sizeY = currentGrid[0].length;
    const sizeZ = currentGrid[0][0].length;
    const nextGrid = createEmpty3DGrid(sizeX, sizeY, sizeZ);
    
    for (let x = 0; x < sizeX; x++) {
      for (let y = 0; y < sizeY; y++) {
        for (let z = 0; z < sizeZ; z++) {
          nextGrid[x][y][z] = currentGrid[x][y][z];
        }
      }
    }
    return nextGrid;
  }

  // Standard B/S rules
  const rule = RULE_DEFINITIONS[ruleName] || RULE_DEFINITIONS.conway3d;
  const { birth, survival } = rule;

  const sizeX = currentGrid.length;
  const sizeY = currentGrid[0].length;
  const sizeZ = currentGrid[0][0].length;
  const nextGrid = createEmpty3DGrid(sizeX, sizeY, sizeZ);

  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      for (let z = 0; z < sizeZ; z++) {
        const liveNeighbors = countLiveNeighbors3D(currentGrid, x, y, z);
        const cellIsAlive = currentGrid[x][y][z] === 1;

        if (cellIsAlive) {
          // Check survival conditions
          nextGrid[x][y][z] = survival.includes(liveNeighbors) ? 1 : 0;
        } else {
          // Check birth conditions
          nextGrid[x][y][z] = birth.includes(liveNeighbors) ? 1 : 0;
        }
      }
    }
  }
  return nextGrid;
};

export { 
  calculateNextGeneration3D, 
  createInitial3DGrid, 
  createEmpty3DGrid, 
  RULE_DEFINITIONS 
};
