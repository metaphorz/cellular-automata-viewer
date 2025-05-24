// Content for components/Controls1D.jsx
import React, { useState, useEffect, useCallback } from 'react';

const Controls1D = ({ 
  onStart, 
  onPause, 
  onReset, 
  onRuleChange, 
  currentRule, 
  isRunning,
  simulationSpeed = 200,
  onSpeedChange
}) => {
  const [ruleInputValue, setRuleInputValue] = useState(currentRule.toString());

  useEffect(() => {
    setRuleInputValue(currentRule.toString());
  }, [currentRule]);

  const handleRuleInputChangeInternal = useCallback((event) => {
    const value = event.target.value;
    setRuleInputValue(value);
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 255) {
      if (onRuleChange) onRuleChange(numericValue);
    } else if (value === '') {
      if (onRuleChange) onRuleChange(0); 
    }
  }, [onRuleChange]);
  
  const handleSpeedChange = useCallback((event) => {
    const newSpeed = parseInt(event.target.value, 10);
    if (onSpeedChange) {
      onSpeedChange(newSpeed);
    }
  }, [onSpeedChange]);
  
  const controlStyles = {
    controlsContainer: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' },
    label: { marginRight: '5px' },
    input: { width: '60px', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' },
    button: { padding: '8px 15px', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white' },
    buttonDisabled: { backgroundColor: '#6c757d' },
    controlGroup: { display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' },
    slider: { width: '100px' },
    sliderLabel: { fontSize: '0.9em', color: '#333', minWidth: '100px', textAlign: 'right' }
  };

  return (
    <div style={controlStyles.controlsContainer}>
      <label htmlFor="ruleNumber" style={controlStyles.label}>Rule:</label>
      <input type="number" id="ruleNumber" value={ruleInputValue} onChange={handleRuleInputChangeInternal} min="0" max="255" style={controlStyles.input} disabled={isRunning} />
      <button onClick={onStart} disabled={isRunning} style={{...controlStyles.button, ...(isRunning && controlStyles.buttonDisabled)}}>Start</button>
      <button onClick={onPause} disabled={!isRunning} style={{...controlStyles.button, ...(!isRunning && controlStyles.buttonDisabled)}}>Pause</button>
      <button onClick={onReset} style={controlStyles.button}>Reset</button>
      
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
export default Controls1D;
