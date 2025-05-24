import React from 'react';

const RULE_NAMES = {
  'conway3d': "3D Conway (B5678/S45678)",
  'life3d': "3D Life (B45/S567)",
  'stability': "Stability (B4567/S3456)",
  'crystal': "Crystal Growth (B5678/S5678)",
  'pyroclastic': "Pyroclastic (B4567/S678)",
  'diamoeba3d': "3D Diamoeba (B5678/S5678910)",
  'hyper': "Hyperactive (B567/S5678910)",
  'briansbrain3d': "3D Brian's Brain (3-state)",
  'checkerboard': "3D Checkerboard (static test pattern)"
};

// Predefined grid size presets
const GRID_SIZE_PRESETS = {
  low: 10,     // Low resolution for slower devices
  medium: 20,  // Medium resolution - good balance
  high: 35,    // High resolution - GPU accelerated
  ultra: 50    // Ultra resolution - GPU accelerated, may be slower
};

// Material presets
const MATERIAL_TYPES = {
  standard: "Standard",       // Default material
  metal: "Metal",             // Metallic finish
  glass: "Glass",             // Transparent glass-like
  plastic: "Plastic",         // Plastic finish
  ceramic: "Ceramic",         // Ceramic-like
  glow: "Glow",               // Emissive material
  pearl: "Pearl",             // Pearlescent finish
  chrome: "Chrome"            // Chrome-like reflective finish
};

// Helper function to calculate luminance of a color to determine text color (black/white)
const luminance = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16) / 255;
  const g = parseInt(hexColor.slice(3, 5), 16) / 255;
  const b = parseInt(hexColor.slice(5, 7), 16) / 255;
  
  // Calculate luminance using the formula for relative luminance in sRGB colorspace
  // See: https://www.w3.org/WAI/GL/wiki/Relative_luminance
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  
  return luminance;
};

const Controls3D = ({ 
  onStart, 
  onPause, 
  onReset, 
  isRunning, 
  currentRule = 'conway3d', 
  onRuleChange,
  cameraDistance = 100,
  onCameraDistanceChange,
  rotationSpeed = 0,
  onRotationSpeedChange,
  gridSize = 10,
  onGridSizeChange,
  cubeOpacity = 1.0,
  onCubeOpacityChange,
  cubeColor = '#4CAF50', // Default green color
  onCubeColorChange,
  materialType = 'standard',
  onMaterialTypeChange,
  showHelpers = true,
  onToggleHelpers,
  simulationSpeed = 200,
  onSpeedChange,
  useInstancedRendering = false,
  onInstancedRenderingToggle,
  showStats = false,
  onToggleStats,
  gpuBackend = 'webgl',
  onGpuBackendChange
}) => {
  // Basic inline styles
  const controlStyles = { 
    controlsContainer: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' },
    button: { padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#8e44ad', color: 'white' }, // Purple for 3D
    buttonDisabled: { backgroundColor: '#6c757d' },
    ruleText: { fontSize: '1em', color: '#333', fontWeight: 'bold' },
    select: { padding: '8px 15px', borderRadius: '4px', marginLeft: '10px' },
    controlGroup: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' },
    slider: { width: '100px' },
    sliderLabel: { fontSize: '0.9em', color: '#333', minWidth: '100px', textAlign: 'right' }
  };
  
  const handleRuleChange = (e) => {
    if (onRuleChange) {
      onRuleChange(e.target.value);
    }
  };

  const handleCameraDistanceChange = (e) => {
    if (onCameraDistanceChange) {
      onCameraDistanceChange(parseFloat(e.target.value));
    }
  };

  const handleRotationSpeedChange = (e) => {
    if (onRotationSpeedChange) {
      onRotationSpeedChange(parseFloat(e.target.value));
    }
  };
  
  const handleGridSizeChange = (e) => {
    if (onGridSizeChange) {
      onGridSizeChange(parseInt(e.target.value, 10));
    }
  };
  
  const handleGridSizePresetChange = (e) => {
    const preset = e.target.value;
    if (preset && GRID_SIZE_PRESETS[preset] && onGridSizeChange) {
      onGridSizeChange(GRID_SIZE_PRESETS[preset]);
    }
  };
  
  const handleCubeOpacityChange = (e) => {
    if (onCubeOpacityChange) {
      onCubeOpacityChange(parseFloat(e.target.value));
    }
  };
  
  const handleCubeColorChange = (e) => {
    if (onCubeColorChange) {
      onCubeColorChange(e.target.value);
    }
  };
  
  const handleMaterialTypeChange = (e) => {
    if (onMaterialTypeChange) {
      onMaterialTypeChange(e.target.value);
    }
  };
  
  const handleToggleHelpers = (e) => {
    if (onToggleHelpers) {
      onToggleHelpers(e.target.checked);
    }
  };
  
  const handleSpeedChange = (e) => {
    const newSpeed = parseInt(e.target.value, 10);
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
  };
  
  const handleInstancedRenderingToggle = (e) => {
    if (onInstancedRenderingToggle) {
      onInstancedRenderingToggle(e.target.checked);
    }
  };
  
  const handleToggleStats = (e) => {
    if (onToggleStats) {
      onToggleStats(e.target.checked);
    }
  };
  
  const handleGpuBackendChange = (e) => {
    if (onGpuBackendChange) {
      onGpuBackendChange(e.target.value);
    }
  };
  
  return (
    <div style={controlStyles.controlsContainer}>
      <button 
        onClick={onStart} 
        disabled={isRunning} 
        style={{...controlStyles.button, ...(isRunning && controlStyles.buttonDisabled)}}
      >
        Start
      </button>
      <button 
        onClick={onPause} 
        disabled={!isRunning} 
        style={{...controlStyles.button, ...(!isRunning && controlStyles.buttonDisabled)}}
      >
        Pause
      </button>
      <button onClick={onReset} style={controlStyles.button}>Reset</button>
      
      <div>
        <label style={controlStyles.ruleText}>Rule:</label>
        <select 
          value={currentRule} 
          onChange={handleRuleChange} 
          style={controlStyles.select}
          disabled={isRunning}
        >
          {Object.entries(RULE_NAMES).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>

      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Camera Distance:</label>
        <input
          type="range"
          min="10"
          max="100"
          value={cameraDistance}
          onChange={handleCameraDistanceChange}
          style={controlStyles.slider}
        />
        <span style={{ marginLeft: '5px', fontSize: '0.9em' }}>{Math.round(cameraDistance)}</span>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Auto-Rotation:</label>
        <input
          type="range"
          min="0"
          max="5"
          step="0.1"
          value={rotationSpeed}
          onChange={handleRotationSpeedChange}
          style={controlStyles.slider}
        />
        <span style={{ marginLeft: '5px', fontSize: '0.9em' }}>{rotationSpeed.toFixed(1)}</span>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Grid Resolution:</label>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={gridSize}
          onChange={handleGridSizeChange}
          disabled={isRunning}
          style={controlStyles.slider}
        />
        <span style={{ marginLeft: '5px', fontSize: '0.9em' }}>{gridSize}³</span>
        <span style={{ marginLeft: '10px', fontSize: '0.75em', color: gridSize > 30 ? '#ff9800' : '#555' }}>
          {gridSize > 30 ? 'GPU-powered high resolution' : ''}
        </span>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Resolution Preset:</label>
        <select 
          value={Object.entries(GRID_SIZE_PRESETS).find(([k, v]) => v === gridSize)?.[0] || ''}
          onChange={handleGridSizePresetChange}
          disabled={isRunning}
          style={controlStyles.select}
        >
          <option value="">Custom</option>
          <option value="low">Low (10³)</option>
          <option value="medium">Medium (20³)</option>
          <option value="high">High - GPU (35³)</option>
          <option value="ultra">Ultra - GPU (50³)</option>
        </select>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Cube Opacity:</label>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          value={cubeOpacity}
          onChange={handleCubeOpacityChange}
          style={controlStyles.slider}
        />
        <span style={{ marginLeft: '5px', fontSize: '0.9em' }}>{Math.round(cubeOpacity * 100)}%</span>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Cube Color:</label>
        <input
          type="color"
          value={cubeColor}
          onChange={handleCubeColorChange}
          style={{ 
            width: '40px', 
            height: '25px', 
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px',
            boxShadow: '0 0 3px rgba(0,0,0,0.3)'
          }}
        />
        <span style={{ 
          marginLeft: '5px', 
          fontSize: '0.9em',
          display: 'inline-block',
          width: '60px',
          textAlign: 'center',
          backgroundColor: cubeColor,
          color: luminance(cubeColor) > 0.5 ? '#000' : '#fff',
          borderRadius: '3px',
          padding: '2px 5px'
        }}>
          {cubeColor}
        </span>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Material Type:</label>
        <select
          value={materialType}
          onChange={handleMaterialTypeChange}
          style={controlStyles.select}
        >
          {Object.entries(MATERIAL_TYPES).map(([key, name]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={{...controlStyles.sliderLabel, textAlign: 'left', minWidth: 'auto'}}>
          <input
            type="checkbox"
            checked={showHelpers}
            onChange={handleToggleHelpers}
            style={{ marginRight: '5px' }}
          />
          Show Axis Helpers
        </label>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={{...controlStyles.sliderLabel, textAlign: 'left', minWidth: 'auto', display: 'flex', alignItems: 'center'}}>
          <input
            type="checkbox"
            checked={useInstancedRendering}
            onChange={handleInstancedRenderingToggle}
            style={{ marginRight: '5px' }}
          />
          <span style={{ display: 'flex', alignItems: 'center' }}>
            Use Instanced Rendering 
            <span style={{ 
              marginLeft: '5px', 
              fontSize: '0.7em', 
              padding: '2px 5px', 
              backgroundColor: '#8e44ad', 
              color: 'white', 
              borderRadius: '4px',
              fontWeight: 'bold' 
            }}>
              GPU
            </span>
          </span>
        </label>
      </div>
      
      {useInstancedRendering && (
        <div style={controlStyles.controlGroup}>
          <label style={{...controlStyles.sliderLabel, textAlign: 'left', minWidth: 'auto', display: 'flex', alignItems: 'center'}}>
            <input
              type="checkbox"
              checked={showStats}
              onChange={handleToggleStats}
              style={{ marginRight: '5px' }}
            />
            <span style={{ display: 'flex', alignItems: 'center' }}>
              Show GPU Stats
              <span style={{ 
                marginLeft: '5px', 
                fontSize: '0.7em', 
                padding: '2px 5px', 
                backgroundColor: '#ff9800', 
                color: 'white', 
                borderRadius: '4px',
                fontWeight: 'bold' 
              }}>
                FPS
              </span>
            </span>
          </label>
        </div>
      )}
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>GPU Backend:</label>
        <select
          value={gpuBackend}
          onChange={handleGpuBackendChange}
          style={{
            ...controlStyles.select, 
            backgroundColor: gpuBackend === 'tensorflow' ? '#0d6efd20' : 
                            gpuBackend === 'webgpu' ? '#ff590020' : '#4CAF5020'
          }}
          disabled={isRunning}
        >
          <option value="webgl">WebGL Shaders</option>
          <option value="tensorflow">TensorFlow.js GPGPU</option>
          <option value="webgpu">WebGPU Compute</option>
        </select>
        <span style={{ 
          marginLeft: '5px', 
          fontSize: '0.7em', 
          padding: '2px 5px', 
          backgroundColor: gpuBackend === 'tensorflow' ? '#0d6efd' : 
                          gpuBackend === 'webgpu' ? '#ff5900' : '#4CAF50', 
          color: 'white', 
          borderRadius: '4px',
          fontWeight: 'bold' 
        }}>
          {gpuBackend === 'tensorflow' ? 'TF' : 
           gpuBackend === 'webgpu' ? 'WGPU' : 'GL'}
        </span>
      </div>
      
      <div style={controlStyles.controlGroup}>
        <label style={controlStyles.sliderLabel}>Simulation Speed:</label>
        <input
          type="range"
          min="50"
          max="1000"
          step="50"
          value={simulationSpeed}
          onChange={handleSpeedChange}
          style={controlStyles.slider}
        />
        <span style={{ marginLeft: '5px', fontSize: '0.9em' }}>
          {simulationSpeed}ms
        </span>
      </div>
    </div>
  );
};

export default Controls3D;
