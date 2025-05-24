import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as twgl from 'twgl.js';

// Shader definitions
const VS_QUAD = `
  attribute vec2 a_position;
  uniform mat4 u_matrix;
  void main() {
    gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
  }
`;

const FS_COLOR = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
  }
`;

const ALIVE_COLOR = [0.0, 0.0, 0.0, 1]; // Black
const DEAD_COLOR = [1.0, 1.0, 1.0, 1];  // White
const DYING_COLOR = [0.5, 0.5, 0.5, 1]; // Gray (for Brian's Brain)

const Automaton2DView = ({
  width = 500,
  height = 500,
  currentGrid,
  onCellToggle,
}) => {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programInfoRef = useRef(null);
  const quadBufferInfoRef = useRef(null);
  const [webGLError, setWebGLError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const lastToggledCellRef = useRef({ r: -1, c: -1 });

  console.log('[View] Automaton2DView rendering/re-rendering. Instance created or updated.');

  const getCellFromMouseEvent = useCallback((event) => {
    if (!canvasRef.current || !currentGrid || currentGrid.length === 0 || !glRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const gl = glRef.current;
    const numRows = currentGrid.length;
    const numCols = currentGrid[0].length;
    // console.log('[View] getCellFromMouseEvent: mouseX, mouseY', mouseX, mouseY, 'canvas dims:', gl.canvas.width, gl.canvas.height, 'numCols, numRows:', numCols, numRows);
    const cellWidth = gl.canvas.width / numCols;
    const cellHeight = gl.canvas.height / numRows;
    // console.log('[View] getCellFromMouseEvent: calculated cellWidth, cellHeight', cellWidth, cellHeight);
    const colIndex = Math.floor(mouseX / cellWidth);
    const rowIndex = Math.floor(mouseY / cellHeight);
    // console.log('[View] getCellFromMouseEvent: calculated rowIndex, colIndex', rowIndex, colIndex);
    if (rowIndex >= 0 && rowIndex < numRows && colIndex >= 0 && colIndex < numCols) {
      return { rowIndex, colIndex };
    }
    return null;
  }, [currentGrid]);

  const handleMouseDown = useCallback((event) => {
    console.log('[View] handleMouseDown: FIRED');
    setIsDragging(true);
    const cell = getCellFromMouseEvent(event);
    console.log('[View] handleMouseDown: cell from getCellFromMouseEvent', cell);
    if (cell && onCellToggle) {
      onCellToggle(cell.rowIndex, cell.colIndex);
      lastToggledCellRef.current = { r: cell.rowIndex, c: cell.colIndex };
      console.log('[View] handleMouseDown: onCellToggle called with', cell.rowIndex, cell.colIndex);
    }
  }, [onCellToggle, getCellFromMouseEvent]);

  const handleMouseMove = useCallback((event) => {
    console.log('[View] handleMouseMove: dragging?', isDragging); 
    if (!isDragging) return;
    const cell = getCellFromMouseEvent(event);
    console.log('[View] handleMouseMove: cell', cell);
    if (cell && onCellToggle) {
      if (cell.rowIndex !== lastToggledCellRef.current.r || cell.colIndex !== lastToggledCellRef.current.c) {
        onCellToggle(cell.rowIndex, cell.colIndex);
        lastToggledCellRef.current = { r: cell.rowIndex, c: cell.colIndex };
        console.log('[View] handleMouseMove: onCellToggle called with', cell.rowIndex, cell.colIndex);
      }
    }
  }, [isDragging, onCellToggle, getCellFromMouseEvent]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); lastToggledCellRef.current = { r: -1, c: -1 }; }, []);
  const handleMouseLeave = useCallback(() => { setIsDragging(false); lastToggledCellRef.current = { r: -1, c: -1 }; }, []);

  const drawGrid = useCallback(() => {
    const gl = glRef.current;
    const programInfo = programInfoRef.current;
    const quadBufferInfo = quadBufferInfoRef.current;

    // console.log('[View] drawGrid: Called. currentGrid dimensions:', currentGrid ? `${currentGrid.length}x${currentGrid[0]?.length}` : 'null');

    if (!gl || !programInfo || !quadBufferInfo || !currentGrid || currentGrid.length === 0) {
      console.log('[View] drawGrid: Bailing or clearing - missing GL resources or invalid grid.', {glExists: !!gl, programInfoExists: !!programInfo, quadBufferInfoExists: !!quadBufferInfo, currentGridValid: !!(currentGrid && currentGrid.length > 0)});
      if (gl) { 
        gl.clearColor(0.95, 0.95, 0.95, 1); 
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      return;
    }
    // console.log('[View] drawGrid: Proceeding with draw.');

    const numRows = currentGrid.length;
    const numCols = currentGrid[0].length;
    if (numRows === 0 || numCols === 0) { if (gl) { gl.clearColor(0.95, 0.95, 0.95, 1); gl.clear(gl.COLOR_BUFFER_BIT); } return; }
    
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.95, 0.95, 0.95, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, quadBufferInfo);
    
    // Match internal dimensions to CSS dimensions
    if (canvasRef.current) {
      const displayRect = canvasRef.current.getBoundingClientRect();
      if (gl.canvas.width !== displayRect.width || gl.canvas.height !== displayRect.height) {
        gl.canvas.width = displayRect.width;
        gl.canvas.height = displayRect.height;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      }
    }
    
    const cellWidth = gl.canvas.width / numCols;
    const cellHeight = gl.canvas.height / numRows;
    const projectionMatrix = twgl.m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const modelMatrix = twgl.m4.identity();
        twgl.m4.translate(modelMatrix, [c * cellWidth, r * cellHeight, 0], modelMatrix);
        twgl.m4.scale(modelMatrix, [cellWidth, cellHeight, 1], modelMatrix);
        const u_matrix = twgl.m4.multiply(projectionMatrix, modelMatrix);
        
        // Handle different cell states (including Brian's Brain's 3 states)
        let u_color;
        if (currentGrid[r][c] === 1) {
          u_color = ALIVE_COLOR;
        } else if (currentGrid[r][c] === 2) {
          u_color = DYING_COLOR;
        } else {
          u_color = DEAD_COLOR;
        }
        
        twgl.setUniforms(programInfo, { u_matrix, u_color });
        twgl.drawBufferInfo(gl, quadBufferInfo);
      }
    }
  }, [currentGrid]);

  // Effect 1: Setup and Cleanup GL resources (Runs on mount and unmount)
  useEffect(() => {
    console.log('[View] GL Resource Management Effect: Running setup phase.');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[View] GL Setup: Canvas ref not available.');
      return;
    }

    // Initialize GL context
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      setWebGLError('WebGL2 is not available. Please use a compatible browser.');
      console.error('[View] GL Setup: Failed to get WebGL2 context.');
      return;
    }
    glRef.current = gl;
    console.log('[View] GL Setup: WebGL2 context obtained.');

    // Create shader program
    const newProgramInfo = twgl.createProgramInfo(gl, [VS_QUAD, FS_COLOR]);
    if (!newProgramInfo || !newProgramInfo.program) {
      setWebGLError('Failed to compile/link shader program.');
      const log = gl.getProgramInfoLog(newProgramInfo && newProgramInfo.program);
      console.error('[View] GL Setup: Shader program creation failed.', log);
      glRef.current = null; // Release context if setup fails
      return;
    }
    programInfoRef.current = newProgramInfo;
    console.log('[View] GL Setup: Shader program created.');

    // Create quad buffer
    const unitQuadVertices = [0,0, 1,0, 0,1,  0,1, 1,0, 1,1];
    const newQuadBufferInfo = twgl.createBufferInfoFromArrays(gl, {
      a_position: { numComponents: 2, data: unitQuadVertices },
    });
    quadBufferInfoRef.current = newQuadBufferInfo;
    console.log('[View] GL Setup: Quad buffer created.');
    setWebGLError(''); // Clear any previous error

    return () => {
      console.log('[View] GL Resource Management Effect: Running cleanup phase.');
      const currentGl = glRef.current;
      if (currentGl) {
        if (programInfoRef.current && programInfoRef.current.program) {
          currentGl.deleteProgram(programInfoRef.current.program);
          console.log('[View] Cleanup: Program deleted.');
        }
        if (quadBufferInfoRef.current) {
          if (quadBufferInfoRef.current.attribs?.a_position?.buffer) {
            currentGl.deleteBuffer(quadBufferInfoRef.current.attribs.a_position.buffer);
            console.log('[View] Cleanup: Vertex buffer deleted.');
          }
          if (quadBufferInfoRef.current.indices) {
            currentGl.deleteBuffer(quadBufferInfoRef.current.indices);
            console.log('[View] Cleanup: Index buffer deleted (if existed).');
          }
        }
      }
      // Crucially nullify all refs
      programInfoRef.current = null;
      quadBufferInfoRef.current = null;
      glRef.current = null; 
      console.log('[View] Cleanup: GL Refs (glRef, programInfoRef, quadBufferInfoRef) nullified.');
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount

  // Effect 2: Drawing Effect (Runs when currentGrid changes)
  useEffect(() => {
    console.log('[View] Drawing Effect triggered. Checking conditions to draw.');
    if (glRef.current && programInfoRef.current && quadBufferInfoRef.current && currentGrid && currentGrid.length > 0) {
      console.log('[View] Drawing Effect: All resources ready, calling drawGrid.');
      drawGrid();
    } else {
      console.log('[View] Drawing Effect: Not drawing - GL resources or currentGrid not ready/valid.');
      if (glRef.current) { // If context exists, but other things are missing, clear canvas
        console.log('[View] Drawing Effect: Clearing canvas due to incomplete setup or invalid grid.');
        glRef.current.clearColor(0.95, 0.95, 0.95, 1); 
        glRef.current.clear(glRef.current.COLOR_BUFFER_BIT);
      }
    }
  }, [currentGrid]); 

  // Resize handler - separate effect for clarity
  useEffect(() => {
    const handleResize = () => {
      console.log('[View] Resize handler triggered.');
      if (glRef.current && programInfoRef.current && quadBufferInfoRef.current && currentGrid && currentGrid.length > 0) {
        console.log('[View] Resize handler: All resources ready, calling drawGrid.');
        drawGrid();
      } else {
        console.log('[View] Resize handler: Not redrawing - GL resources or currentGrid not ready/valid.');
      }
    };
    window.addEventListener('resize', handleResize);
    
    // Initial resize call after mount to set canvas size correctly
    // This needs to happen after GL resources are confirmed to be set up by Effect 1.
    // The Drawing Effect (Effect 2) will handle the very first draw after setup.
    if (glRef.current && programInfoRef.current && quadBufferInfoRef.current && currentGrid && currentGrid.length > 0) {
        console.log('[View] Initial resize setup: Calling handleResize for initial sizing.');
        handleResize(); 
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [drawGrid, currentGrid]); // Dependencies for resize handling

  if (webGLError) {
    return (
      <div style={{ width, height, border: '1px solid red', padding: '10px', color: 'red' }}>
        <p>Error: {webGLError}</p>
      </div>
    );
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          border: '1px solid #000', 
          display: 'block', 
          cursor: 'pointer',
          width: `${width}px`,
          height: `${height}px`
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
};

export default Automaton2DView;
