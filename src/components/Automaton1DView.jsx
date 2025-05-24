// Content for components/Automaton1DView.jsx
import React, { useRef, useEffect } from 'react';
import styles from './Automaton1DView.module.css';

const Automaton1DView = ({ generationsHistory, onCellClick }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [generationsHistory]);

  if (!generationsHistory || generationsHistory.length === 0) {
    return <div className={styles.automatonContainer}>No generations to display.</div>;
  }

  return (
    <div ref={scrollRef} className={styles.automatonContainer} style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #ddd', padding: '5px' }}>
      {generationsHistory.map((generation, rowIndex) => (
        <div key={rowIndex} className={styles.automatonRow}>
          {generation.map((cellState, cellIndex) => (
            <div
              key={cellIndex}
              className={`${styles.cell} ${cellState === 1 ? styles.alive : styles.dead}`}
              title={`Gen: ${rowIndex}, Cell: ${cellIndex}, State: ${cellState}`}
              onClick={() => onCellClick && onCellClick(rowIndex, cellIndex)}
              onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') onCellClick && onCellClick(rowIndex, cellIndex);}}
              role="button"
              tabIndex={0}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
export default Automaton1DView;
