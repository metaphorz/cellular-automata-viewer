import React, { useState, useCallback, useEffect } from 'react';

// 1D Imports
import Automaton1DView from './components/Automaton1DView.jsx';
import Controls1D from './components/Controls1D.jsx';
import { calculateNextGeneration as calculateNextGeneration1D, decimalToBinaryArray } from './automataLogic.js'; // Assuming automataLogic.js for 1D

// 2D Imports
import Automaton2DView from './components/Automaton2DView.jsx';
import Controls2D from './components/Controls2D.jsx';
import { calculateNextGeneration2D } from './automataLogic2D.js';

// 3D Imports
import Automaton3DView from './components/Automaton3DView.jsx';
import Automaton3DViewInstanced from './components/Automaton3DViewInstanced.jsx';
import Controls3D from './components/Controls3D.jsx';
// WebGL GPU-accelerated version
import { calculateNextGeneration3D as calculateNextGeneration3DGPU, createInitial3DGrid } from './automataLogic3DGPU.js';
// TensorFlow.js GPGPU-accelerated version
import { calculateNextGeneration3D as calculateNextGeneration3DTF } from './automataLogic3DTF.js';
// WebGPU-accelerated version
import { calculateNextGeneration3D as calculateNextGeneration3DWEBGPU, isWebGPUSupported } from './automataLogic3DWEBGPU.js';

// import './App.css'; // Assuming App.css is not used / was removed

// Constants
const DEFAULT_SIMULATION_SPEED_MS = 200;

// --- 1D Constants ---
const INITIAL_1D_CELL_COUNT = 51;
const MAX_HISTORY_LENGTH_1D = 200; // Max generations for 1D history

// --- 2D Constants ---
const GRID_ROWS_APP = 50;
const GRID_COLS_APP = 50;

// --- 3D Constants ---
const DEFAULT_GRID_SIZE_3D = 20; // Default grid size for 3D (larger default for GPU acceleration)

// Helper to create initial 1D generation
const createInitial1DGeneration = (cellCount = INITIAL_1D_CELL_COUNT) => {
  const initial = Array(cellCount).fill(0);
  if (cellCount > 0) {
    initial[Math.floor(cellCount / 2)] = 1; // Middle cell active
  }
  return initial;
};

// Helper to create initial 2D grid (e.g., with a glider)
const createInitial2DGrid = () => {
  const grid = Array(GRID_ROWS_APP).fill(null).map(() => Array(GRID_COLS_APP).fill(0));
  if (GRID_ROWS_APP > 5 && GRID_COLS_APP > 5) { // Ensure grid is large enough for a glider
    grid[1][2] = 1;
    grid[2][3] = 1;
    grid[3][1] = 1;
    grid[3][2] = 1;
    grid[3][3] = 1;
  }
  return grid;
};

function App() {
  // View Management
  const [activeView, setActiveView] = useState('1d'); // '1d', '2d', or '3d'

  // --- 1D State ---
  const [rule1D, setRule1D] = useState(30);
  const [generationsHistory, setGenerationsHistory] = useState([createInitial1DGeneration()]);
  const [isRunning1D, setIsRunning1D] = useState(false);
  const [generationCount1D, setGenerationCount1D] = useState(0);
  const [simulationSpeed1D, setSimulationSpeed1D] = useState(DEFAULT_SIMULATION_SPEED_MS);

  // --- 2D State ---
  const [grid2D, setGrid2D] = useState(createInitial2DGrid());
  const [isRunning2D, setIsRunning2D] = useState(false);
  const [generationCount2D, setGenerationCount2D] = useState(0);
  const [rule2D, setRule2D] = useState('conway'); // Default to Conway's Game of Life
  const [simulationSpeed2D, setSimulationSpeed2D] = useState(DEFAULT_SIMULATION_SPEED_MS);
  
  // --- 3D State ---
  const [gridSize3D, setGridSize3D] = useState(DEFAULT_GRID_SIZE_3D);
  const [grid3D, setGrid3D] = useState(() => {
    console.log('[App] Creating initial 3D grid...');
    const initialGrid = createInitial3DGrid(DEFAULT_GRID_SIZE_3D, DEFAULT_GRID_SIZE_3D, DEFAULT_GRID_SIZE_3D);
    console.log('[App] Initial 3D grid created with dimensions:', initialGrid.length, 'x', initialGrid[0].length, 'x', initialGrid[0][0].length);
    return initialGrid;
  });
  const [isRunning3D, setIsRunning3D] = useState(false);
  const [generationCount3D, setGenerationCount3D] = useState(0);
  const [rule3D, setRule3D] = useState('checkerboard'); // Start with static checkerboard for demonstration
  const [cameraDistance, setCameraDistance] = useState(20); // Very close view to guarantee visibility
  const [rotationSpeed, setRotationSpeed] = useState(0.0); // No automatic rotation
  const [cubeOpacity, setCubeOpacity] = useState(1.0); // Full opacity by default
  const [cubeColor, setCubeColor] = useState('#4CAF50'); // Default green color
  const [materialType, setMaterialType] = useState('standard'); // Default material type
  const [showHelpers, setShowHelpers] = useState(false); // Hide axis helpers by default
  const [simulationSpeed3D, setSimulationSpeed3D] = useState(DEFAULT_SIMULATION_SPEED_MS);
  const [useInstancedRendering, setUseInstancedRendering] = useState(false); // Toggle for instanced rendering
  const [showStats, setShowStats] = useState(false); // Toggle for GPU stats display
  const [gpuBackend, setGpuBackend] = useState('webgl'); // GPU backend selection ('webgl', 'tensorflow', or 'webgpu')
  const [sceneRotation, setSceneRotation] = useState({ x: 0, y: 0 }); // Track scene rotation
  const [isWebGPUAvailable, setIsWebGPUAvailable] = useState(false); // Track WebGPU availability
  
  // Logging for App re-renders and active view
  console.log('[App] App rendering/re-rendering. Active view:', activeView);

  // --- View Switching ---
  const handleViewChange = (view) => {
    console.log(`[App] Switching view to ${view}...`);
    setIsRunning1D(false); // Pause 1D simulation
    setIsRunning2D(false); // Pause 2D simulation
    setIsRunning3D(false); // Pause 3D simulation
    setActiveView(view);
  };

  // --- 1D Handlers ---
  const handleStart1D = useCallback(() => { setIsRunning1D(true); }, []);
  const handlePause1D = useCallback(() => { setIsRunning1D(false); }, []);
  const handleReset1D = useCallback(() => {
    setIsRunning1D(false);
    setGenerationsHistory([createInitial1DGeneration()]);
    setGenerationCount1D(0);
  }, []);
  const handleRuleChange1D = useCallback((newRule) => {
    const ruleValue = (newRule === '' || isNaN(parseInt(newRule,10))) ? 0 : parseInt(newRule, 10);
    setRule1D(Math.max(0, Math.min(255, ruleValue)));
    handleReset1D(); // Reset simulation when rule changes for 1D
  }, [handleReset1D]);
  
  const handleSpeedChange1D = useCallback((newSpeed) => {
    setSimulationSpeed1D(newSpeed);
  }, []);
  const handleCellClick1D = useCallback((rowIndex, cellIndex) => {
    if (!isRunning1D && rowIndex === 0 && generationsHistory.length > 0) {
      setGenerationsHistory((prevHistory) => {
        const newInitialGeneration = [...prevHistory[0]];
        newInitialGeneration[cellIndex] = newInitialGeneration[cellIndex] === 0 ? 1 : 0;
        const newHistory = [...prevHistory];
        newHistory[0] = newInitialGeneration;
        return newHistory;
      });
    }
  }, [isRunning1D, generationsHistory]);

  // --- 2D Handlers ---
  const handleStart2D = useCallback(() => { setIsRunning2D(true); }, []);
  const handlePause2D = useCallback(() => { setIsRunning2D(false); }, []);
  const handleReset2D = useCallback(() => {
    setIsRunning2D(false);
    setGrid2D(createInitial2DGrid());
    setGenerationCount2D(0);
  }, []);
  const handleRuleChange2D = useCallback((newRule) => {
    console.log(`[App] Changing 2D rule to ${newRule}`);
    setRule2D(newRule);
    setIsRunning2D(false); // Pause simulation when rule changes
  }, []);
  
  const handleSpeedChange2D = useCallback((newSpeed) => {
    setSimulationSpeed2D(newSpeed);
  }, []);
  
  // --- 3D Handlers ---
  const handleStart3D = useCallback(() => { setIsRunning3D(true); }, []);
  const handlePause3D = useCallback(() => { setIsRunning3D(false); }, []);
  const handleReset3D = useCallback(() => {
    setIsRunning3D(false);
    // Create a new grid with the current rule pattern
    const pattern = rule3D === 'checkerboard' ? 'checkerboard' : 
                   rule3D === 'briansbrain3d' ? 'random' : 'sphere';
    setGrid3D(createInitial3DGrid(gridSize3D, gridSize3D, gridSize3D, pattern));
    setGenerationCount3D(0);
  }, [rule3D, gridSize3D]);
  const handleRuleChange3D = useCallback((newRule) => {
    console.log(`[App] Changing 3D rule to ${newRule}`);
    setRule3D(newRule);
    setIsRunning3D(false); // Pause simulation when rule changes
    
    // Reset the grid with an appropriate pattern for the selected rule
    const pattern = newRule === 'checkerboard' ? 'checkerboard' : 
                   newRule === 'briansbrain3d' ? 'random' : 'sphere';
    setGrid3D(createInitial3DGrid(gridSize3D, gridSize3D, gridSize3D, pattern));
    setGenerationCount3D(0);
  }, [gridSize3D]);
  const handleCameraDistanceChange = useCallback((newDistance) => {
    setCameraDistance(newDistance);
  }, []);
  const handleRotationSpeedChange = useCallback((newSpeed) => {
    setRotationSpeed(newSpeed);
  }, []);
  const handleCubeOpacityChange = useCallback((newOpacity) => {
    setCubeOpacity(newOpacity);
  }, []);
  
  const handleCubeColorChange = useCallback((newColor) => {
    setCubeColor(newColor);
  }, []);
  
  const handleMaterialTypeChange = useCallback((newMaterial) => {
    setMaterialType(newMaterial);
  }, []);
  
  const handleToggleHelpers = useCallback((showHelpers) => {
    setShowHelpers(showHelpers);
  }, []);
  
  const handleSpeedChange3D = useCallback((newSpeed) => {
    setSimulationSpeed3D(newSpeed);
  }, []);
  
  const handleInstancedRenderingToggle = useCallback((useInstanced) => {
    setUseInstancedRendering(useInstanced);
  }, []);
  
  const handleToggleStats = useCallback((showStatsValue) => {
    setShowStats(showStatsValue);
  }, []);
  
  const handleGpuBackendChange = useCallback((backend) => {
    console.log(`[App] Changing GPU backend to ${backend}`);
    setGpuBackend(backend);
  }, []);
  
  const handleSceneRotationChange = useCallback((rotation) => {
    console.log(`[App] Updating scene rotation:`, rotation);
    setSceneRotation(rotation);
  }, []);
  const handleGridSizeChange3D = useCallback((newSize) => {
    if (newSize !== gridSize3D) {
      setGridSize3D(newSize);
      if (!isRunning3D) {
        // Only regenerate grid if simulation is not running
        const pattern = rule3D === 'checkerboard' ? 'checkerboard' : 
                       rule3D === 'briansbrain3d' ? 'random' : 'sphere';
        setGrid3D(createInitial3DGrid(newSize, newSize, newSize, pattern));
        setGenerationCount3D(0);
      }
    }
  }, [gridSize3D, isRunning3D, rule3D]);
  const handleCellToggle2D = useCallback((rowIndex, colIndex) => {
    console.log('[App] handleCellToggle2D: Called with rowIndex, colIndex', rowIndex, colIndex, 'isRunning2D:', isRunning2D);
    if (!isRunning2D) {
      setGrid2D((prevGrid) => {
        console.log('[App] handleCellToggle2D: grid2D state before toggle for cell', rowIndex, colIndex, 'Value:', prevGrid[rowIndex] ? prevGrid[rowIndex][colIndex] : 'undefined');
        const newGrid = prevGrid.map(row => [...row]);
        if (rowIndex >= 0 && rowIndex < newGrid.length && colIndex >= 0 && colIndex < newGrid[0].length) {
          newGrid[rowIndex][colIndex] = newGrid[rowIndex][colIndex] === 0 ? 1 : 0;
          console.log('[App] handleCellToggle2D: newGrid state after toggle for cell', rowIndex, colIndex, 'New Value:', newGrid[rowIndex][colIndex]);
        }
        return newGrid;
      });
    }
  }, [isRunning2D]);

  // --- Simulation `useEffect` Hooks ---
  // 1D Simulation Loop
  useEffect(() => {
    if (activeView === '1d' && isRunning1D) {
      const intervalId = setInterval(() => {
        setGenerationsHistory((prevHistory) => {
          const currentGen = prevHistory[prevHistory.length - 1];
          const nextGen = calculateNextGeneration1D(currentGen, rule1D);
          const newHistory = [...prevHistory, nextGen];
          if (newHistory.length > MAX_HISTORY_LENGTH_1D) {
            return newHistory.slice(newHistory.length - MAX_HISTORY_LENGTH_1D);
          }
          return newHistory;
        });
        setGenerationCount1D((prevCount) => prevCount + 1);
      }, simulationSpeed1D);
      return () => clearInterval(intervalId);
    }
  }, [activeView, isRunning1D, rule1D, simulationSpeed1D]); // Added simulationSpeed1D to deps

  // 2D Simulation Loop
  useEffect(() => {
    console.log('[App] 2D Simulation useEffect triggered. isRunning2D:', isRunning2D, 'activeView:', activeView, 'rule2D:', rule2D);
    if (activeView === '2d' && isRunning2D) {
      if (!grid2D || grid2D.length === 0) {
        console.warn("2D Simulation cannot start with an empty or invalid 2D grid.");
        setIsRunning2D(false);
        return;
      }
      const intervalId = setInterval(() => {
        console.log('[App] Simulation tick: updating grid2D via calculateNextGeneration2D with rule:', rule2D);
        setGrid2D((prevGrid) => calculateNextGeneration2D(prevGrid, rule2D));
        setGenerationCount2D((prevCount) => prevCount + 1);
      }, simulationSpeed2D);
      return () => clearInterval(intervalId);
    }
  }, [activeView, isRunning2D, grid2D, rule2D, simulationSpeed2D]);

  // 3D Simulation Loop
  useEffect(() => {
    console.log('[App] 3D Simulation useEffect triggered. isRunning3D:', isRunning3D, 'activeView:', activeView, 'rule3D:', rule3D, 'gpuBackend:', gpuBackend);
    if (activeView === '3d' && isRunning3D) {
      if (!grid3D || grid3D.length === 0) {
        console.warn("3D Simulation cannot start with an empty or invalid 3D grid.");
        setIsRunning3D(false);
        return;
      }
      
      // Select the appropriate calculation function based on GPU backend
      let calculateNextGen;
      if (gpuBackend === 'tensorflow') {
        calculateNextGen = calculateNextGeneration3DTF;
      } else if (gpuBackend === 'webgpu' && isWebGPUAvailable) {
        calculateNextGen = calculateNextGeneration3DWEBGPU;
      } else {
        calculateNextGen = calculateNextGeneration3DGPU;
      }
      
      const backendLabel = gpuBackend === 'webgpu' && !isWebGPUAvailable ? 'webgl (WebGPU fallback)' : gpuBackend;
      console.log(`[App] Using ${backendLabel} backend for simulation calculations`);
      
      const intervalId = setInterval(async () => {
        console.log(`[App] Simulation tick: updating grid3D via ${backendLabel} backend with rule:`, rule3D);
        // Handle both synchronous and asynchronous calculation functions
        if (gpuBackend === 'webgpu' && isWebGPUAvailable) {
          // WebGPU is async
          try {
            const nextGrid = await calculateNextGen(grid3D, rule3D);
            setGrid3D(nextGrid);
            setGenerationCount3D((prevCount) => prevCount + 1);
          } catch (error) {
            console.error("[App] Error in WebGPU calculation:", error);
          }
        } else {
          // WebGL and TensorFlow are sync
          setGrid3D((prevGrid) => calculateNextGen(prevGrid, rule3D));
          setGenerationCount3D((prevCount) => prevCount + 1);
        }
      }, simulationSpeed3D);
      return () => clearInterval(intervalId);
    }
  }, [activeView, isRunning3D, grid3D, rule3D, simulationSpeed3D, gpuBackend]);


  // Check for WebGPU support on mount
  useEffect(() => {
    const checkWebGPU = async () => {
      try {
        console.log("[App] Checking WebGPU support...");
        // Add a delay to ensure browser is fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const supported = await isWebGPUSupported();
        console.log(`[App] WebGPU supported: ${supported}`);
        setIsWebGPUAvailable(supported);
        
        // If WebGPU is not available but it's selected, fall back to WebGL
        if (!supported && gpuBackend === 'webgpu') {
          console.warn('[App] WebGPU selected but not supported. Falling back to WebGL.');
          setGpuBackend('webgl');
        }
      } catch (error) {
        console.warn('[App] Error checking WebGPU support:', error);
        setIsWebGPUAvailable(false);
        
        // Fall back to WebGL if there's an error
        if (gpuBackend === 'webgpu') {
          console.warn('[App] Falling back to WebGL due to WebGPU error.');
          setGpuBackend('webgl');
        }
      }
    };
    
    checkWebGPU();
  }, [gpuBackend]);
  
  // --- Inline Styles (Consider moving to CSS Modules or index.css if more complex) ---
  const appSpecificStyles = {
    appHeader: { backgroundColor: '#004085', padding: '15px', color: 'white', marginBottom: '25px', width: '100%', textAlign: 'center', borderRadius: '4px 4px 0 0' },
    viewSwitcher: { marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' },
    automatonDisplayContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px', padding: '10px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#fdfdfd' },
    statusText: { marginTop: '10px', fontSize: '0.9em', color: '#555' }
  };
  
  return (
    <div className="app-container">
      <header style={appSpecificStyles.appHeader}>
        <h1 style={{ color: 'white' }}>
          {activeView === '1d' ? '1D Cellular Automaton' : 
           activeView === '2d' ? '2D Cellular Automaton' : 
           '3D Cellular Automaton'}
        </h1>
      </header>

      <div style={appSpecificStyles.viewSwitcher}>
        <button onClick={() => handleViewChange('1d')} disabled={activeView === '1d'}>1D</button>
        <button onClick={() => handleViewChange('2d')} disabled={activeView === '2d'}>2D</button>
        <button onClick={() => handleViewChange('3d')} disabled={activeView === '3d'}>3D</button>
      </div>

      {activeView === '1d' && (
        <>
          <Controls1D
            onStart={handleStart1D}
            onPause={handlePause1D}
            onReset={handleReset1D}
            onRuleChange={handleRuleChange1D}
            currentRule={rule1D}
            isRunning={isRunning1D}
            simulationSpeed={simulationSpeed1D}
            onSpeedChange={handleSpeedChange1D}
          />
          <div style={appSpecificStyles.automatonDisplayContainer}>
            <Automaton1DView
              generationsHistory={generationsHistory}
              onCellClick={handleCellClick1D}
            />
            <p style={appSpecificStyles.statusText}>Generation: {generationCount1D}</p>
            <p style={appSpecificStyles.statusText}>Rule: {rule1D}</p>
          </div>
        </>
      )}

      {activeView === '2d' && (
        <>
          <Controls2D
            onStart={handleStart2D}
            onPause={handlePause2D}
            onReset={handleReset2D}
            isRunning={isRunning2D}
            currentRule={rule2D}
            onRuleChange={handleRuleChange2D}
            simulationSpeed={simulationSpeed2D}
            onSpeedChange={handleSpeedChange2D}
          />
          <div style={appSpecificStyles.automatonDisplayContainer}>
            <Automaton2DView
              currentGrid={grid2D}
              onCellToggle={handleCellToggle2D}
              // width/height for Automaton2DView can be passed if needed
            />
            <p style={appSpecificStyles.statusText}>Generation: {generationCount2D}</p>
            <p style={appSpecificStyles.statusText}>Rule: {rule2D}</p>
          </div>
        </>
      )}
      
      {activeView === '3d' && (
        <>
          <Controls3D
            onStart={handleStart3D}
            onPause={handlePause3D}
            onReset={handleReset3D}
            isRunning={isRunning3D}
            currentRule={rule3D}
            onRuleChange={handleRuleChange3D}
            cameraDistance={cameraDistance}
            onCameraDistanceChange={handleCameraDistanceChange}
            rotationSpeed={rotationSpeed}
            onRotationSpeedChange={handleRotationSpeedChange}
            gridSize={gridSize3D}
            onGridSizeChange={handleGridSizeChange3D}
            cubeOpacity={cubeOpacity}
            onCubeOpacityChange={handleCubeOpacityChange}
            cubeColor={cubeColor}
            onCubeColorChange={handleCubeColorChange}
            materialType={materialType}
            onMaterialTypeChange={handleMaterialTypeChange}
            showHelpers={showHelpers}
            onToggleHelpers={handleToggleHelpers}
            simulationSpeed={simulationSpeed3D}
            onSpeedChange={handleSpeedChange3D}
            useInstancedRendering={useInstancedRendering}
            onInstancedRenderingToggle={handleInstancedRenderingToggle}
            showStats={showStats}
            onToggleStats={handleToggleStats}
            gpuBackend={gpuBackend}
            onGpuBackendChange={handleGpuBackendChange}
          />
          <div style={appSpecificStyles.automatonDisplayContainer}>
            {useInstancedRendering ? (
              <Automaton3DViewInstanced
                gridData={grid3D}
                width={600}
                height={500}
                cameraDistance={cameraDistance}
                rotationSpeed={rotationSpeed}
                cubeOpacity={cubeOpacity}
                cubeColor={cubeColor}
                materialType={materialType}
                showHelpers={showHelpers}
                showStats={showStats}
                initialRotation={sceneRotation}
                onRotationChange={handleSceneRotationChange}
                onCameraDistanceChange={handleCameraDistanceChange}
              />
            ) : (
              <Automaton3DView
                gridData={grid3D}
                width={600}
                height={500}
                cameraDistance={cameraDistance}
                rotationSpeed={rotationSpeed}
                cubeOpacity={cubeOpacity}
                cubeColor={cubeColor}
                materialType={materialType}
                showHelpers={showHelpers}
                initialRotation={sceneRotation}
                onRotationChange={handleSceneRotationChange}
                onCameraDistanceChange={handleCameraDistanceChange}
              />
            )}
            <p style={appSpecificStyles.statusText}>Generation: {generationCount3D}</p>
            <p style={appSpecificStyles.statusText}>Rule: {rule3D}</p>
            <div style={{
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '5px',
              padding: '5px 10px',
              backgroundColor: useInstancedRendering ? '#8e44ad20' : '#00aa4420',
              borderRadius: '4px',
              margin: '5px 0'
            }}>
              <div style={{
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                backgroundColor: useInstancedRendering ? '#8e44ad' : '#00aa44',
                boxShadow: useInstancedRendering ? '0 0 5px #8e44ad' : '0 0 5px #00aa44'
              }}></div>
              <p style={{
                ...appSpecificStyles.statusText, 
                color: useInstancedRendering ? '#8e44ad' : '#00aa44', 
                fontWeight: 'bold',
                margin: 0
              }}>
                GPU Accelerated {useInstancedRendering ? '(Instanced Rendering)' : ''} 
                {gridSize3D > 30 ? `(${gridSize3D}³ High Resolution)` : ''}
              </p>
              
              <div style={{
                marginLeft: '10px',
                backgroundColor: gpuBackend === 'tensorflow' ? '#0d6efd' : 
                               gpuBackend === 'webgpu' ? 
                                 isWebGPUAvailable ? '#ff5900' : '#ff590080' : 
                               '#4CAF50',
                color: 'white',
                fontSize: '0.7em',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center'
              }}>
                {gpuBackend === 'tensorflow' ? 'TensorFlow.js' : 
                 gpuBackend === 'webgpu' ? 
                   (isWebGPUAvailable ? 'WebGPU Compute (Dev Mode)' : 'WebGPU (Falling back to WebGL)') : 
                 'WebGL Shaders'}
                {(gpuBackend === 'webgpu' && isWebGPUAvailable) && 
                  <span style={{ 
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ffcc00',
                    marginLeft: '5px',
                    animation: 'blink 1s infinite'
                  }}></span>
                }
                {gpuBackend === 'webgpu' && !isWebGPUAvailable && 
                  <span style={{ 
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ffcc00',
                    marginLeft: '5px'
                  }}></span>
                }
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
