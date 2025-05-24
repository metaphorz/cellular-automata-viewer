import React from 'react';

const RULE_NAMES = {
  'conway': "Conway's Game of Life (B3/S23)",
  'highlife': "High Life (B36/S23)",
  'daynight': "Day & Night (B3678/S34678)",
  'seeds': "Seeds (B2/S)",
  'maze': "Maze (B3/S12345)",
  'lifewithoutdeath': "Life Without Death (B3/S012345678)",
  'replicator': "Replicator (B1357/S1357)",
  '2x2': "2x2 (B36/S125)",
  'briansbrain': "Brian's Brain (3-state)"
};

const Controls2D = ({ 
  onStart, 
  onPause, 
  onReset, 
  isRunning, 
  currentRule = 'conway', 
  onRuleChange,
  simulationSpeed = 200,
  onSpeedChange
}) => {
  // Basic inline styles or use a CSS module
  const controlStyles = { 
    controlsContainer: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' },
    button: { padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white' }, // Green for 2D
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
  
  const handleSpeedChange = (e) => {
    const newSpeed = parseInt(e.target.value, 10);
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
  };
  
  return (
    <div style={controlStyles.controlsContainer}>
      <button onClick={onStart} disabled={isRunning} style={{...controlStyles.button, ...(isRunning && controlStyles.buttonDisabled)}}>Start</button>
      <button onClick={onPause} disabled={!isRunning} style={{...controlStyles.button, ...(!isRunning && controlStyles.buttonDisabled)}}>Pause</button>
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
        <label style={controlStyles.sliderLabel}>Speed:</label>
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
export default Controls2D;