// Content for automataLogic2D.js

// Rule definitions in B/S notation
const RULE_DEFINITIONS = {
  'conway': { birth: [3], survival: [2, 3] },                   // Conway's Game of Life (B3/S23)
  'highlife': { birth: [3, 6], survival: [2, 3] },              // High Life (B36/S23)
  'daynight': { birth: [3, 6, 7, 8], survival: [3, 4, 6, 7, 8] }, // Day & Night (B3678/S34678)
  'seeds': { birth: [2], survival: [] },                        // Seeds (B2/S)
  'maze': { birth: [3], survival: [1, 2, 3, 4, 5] },            // Maze (B3/S12345)
  'lifewithoutdeath': { birth: [3], survival: [0, 1, 2, 3, 4, 5, 6, 7, 8] }, // Life Without Death (B3/S012345678)
  'replicator': { birth: [1, 3, 5, 7], survival: [1, 3, 5, 7] }, // Replicator (B1357/S1357)
  '2x2': { birth: [3, 6], survival: [1, 2, 5] },                // 2x2 (B36/S125)
  'briansbrain': { type: 'special' }                            // Brian's Brain (3-state)
};

// Count all neighbors with value 1 (for standard 2D rules)
const countLiveNeighbors = (grid, r, c) => {
  let count = 0;
  const numRows = grid.length;
  const numCols = grid[0].length;

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      if (i === 0 && j === 0) continue; // Skip the cell itself

      const nr = (r + i + numRows) % numRows; // Wrap around rows
      const nc = (c + j + numCols) % numCols; // Wrap around columns

      if (grid[nr][nc] === 1) {
        count++;
      }
    }
  }
  return count;
};

// Special function for Brian's Brain (3-state automaton)
const calculateBriansBrain = (currentGrid) => {
  const numRows = currentGrid.length;
  const numCols = currentGrid[0].length;
  const nextGrid = Array(numRows).fill(null).map(() => Array(numCols).fill(0));

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const cellState = currentGrid[r][c];
      
      if (cellState === 0) {
        // Empty cell
        let onNeighbors = 0;
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nr = (r + i + numRows) % numRows;
            const nc = (c + j + numCols) % numCols;
            if (currentGrid[nr][nc] === 1) {
              onNeighbors++;
            }
          }
        }
        // Empty cell becomes ON if exactly 2 ON neighbors
        nextGrid[r][c] = (onNeighbors === 2) ? 1 : 0;
      } else if (cellState === 1) {
        // ON cell always becomes dying
        nextGrid[r][c] = 2;
      } else if (cellState === 2) {
        // Dying cell always becomes empty
        nextGrid[r][c] = 0;
      }
    }
  }
  return nextGrid;
};

const calculateNextGeneration2D = (currentGrid, ruleName = 'conway') => {
  if (!currentGrid || currentGrid.length === 0 || !currentGrid[0] || currentGrid[0].length === 0) {
    console.warn("[automataLogic2D] Invalid or empty grid provided.");
    return []; // Or return currentGrid if preferred for empty inputs
  }

  // Handle special rule types
  if (ruleName === 'briansbrain') {
    return calculateBriansBrain(currentGrid);
  }

  // Standard B/S rules
  const rule = RULE_DEFINITIONS[ruleName] || RULE_DEFINITIONS.conway;
  const { birth, survival } = rule;

  const numRows = currentGrid.length;
  const numCols = currentGrid[0].length;
  const nextGrid = Array(numRows).fill(null).map(() => Array(numCols).fill(0));

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const liveNeighbors = countLiveNeighbors(currentGrid, r, c);
      const cellIsAlive = currentGrid[r][c] === 1;

      if (cellIsAlive) {
        // Check survival conditions
        nextGrid[r][c] = survival.includes(liveNeighbors) ? 1 : 0;
      } else {
        // Check birth conditions
        nextGrid[r][c] = birth.includes(liveNeighbors) ? 1 : 0;
      }
    }
  }
  return nextGrid;
};

export { calculateNextGeneration2D, countLiveNeighbors }; // Exporting countLiveNeighbors can be useful for other rules later
