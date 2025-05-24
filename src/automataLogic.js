// Content for automataLogic.js
const decimalToBinaryArray = (decimalRule, numBits = 8) => {
  if (typeof decimalRule !== 'number' || decimalRule < 0 || decimalRule > 255) {
    console.error('Invalid rule number. Must be between 0 and 255.');
    return Array(numBits).fill(0); // Return a default rule (e.g., all zeros)
  }
  let binaryString = decimalRule.toString(2);
  while (binaryString.length < numBits) {
    binaryString = '0' + binaryString;
  }
  return binaryString.split('').map(Number);
};

const calculateNextGeneration = (currentGeneration, ruleNumber) => {
  if (!currentGeneration || currentGeneration.length === 0) {
    return [];
  }
  const ruleBinary = decimalToBinaryArray(ruleNumber);
  const nextGeneration = [];
  const len = currentGeneration.length;

  for (let i = 0; i < len; i++) {
    const leftNeighbor = currentGeneration[(i - 1 + len) % len];
    const currentCell = currentGeneration[i];
    const rightNeighbor = currentGeneration[(i + 1) % len];
    
    // Form the 3-cell neighborhood pattern and convert to decimal index (0-7)
    const pattern = (leftNeighbor << 2) | (currentCell << 1) | rightNeighbor;
    // The ruleBinary array is indexed from right to left (7-pattern) for standard Wolfram rule representation
    nextGeneration[i] = ruleBinary[7 - pattern];
  }
  return nextGeneration;
};

export { calculateNextGeneration, decimalToBinaryArray };
