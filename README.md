# Cellular Automata Viewer

An interactive web application for exploring cellular automata in 1D, 2D, and 3D with GPU acceleration.

## Deployment

This application is deployed on GitHub Pages at: https://metaphorz.github.io/cellular-automata-viewer/

## Features

- **1D Cellular Automata**: Explore elementary cellular automata with rules 0-255
- **2D Cellular Automata**: Interact with Conway's Game of Life and other 2D rulesets
- **3D Cellular Automata**: Visualize 3D cellular automata with multiple rule sets
- **GPU Acceleration**: Three GPU acceleration options:
  - WebGL Shaders
  - TensorFlow.js GPGPU
  - WebGPU Compute (experimental)
- **Customization**: Control visualization parameters like colors, opacity, camera distance
- **Interactive Controls**: Play, pause, reset, and modify rulesets in real-time

## GPU Acceleration Comparison

The application implements three different GPU acceleration methods:

1. **WebGL Shaders**: Uses fragment shaders to compute cell states in GPU
2. **TensorFlow.js GPGPU**: Leverages TensorFlow.js for tensor operations on GPU
3. **WebGPU Compute** (Experimental): Uses modern WebGPU compute shaders for maximum performance

## Usage

Select the dimension (1D, 2D, or 3D) and use the controls to:
- Start/pause/reset simulation
- Change rules and patterns
- Modify visualization parameters
- Toggle between GPU backends

### 3D Specific Features

- Adjust camera distance and rotation
- Change cube opacity and color
- Select material types
- Toggle between standard and instanced rendering for better performance
- Display GPU rendering stats

## Technology Stack

- React for UI components
- THREE.js for 3D rendering
- WebGL for GPU acceleration
- TensorFlow.js for tensor-based GPGPU
- WebGPU for next-gen GPU compute (experimental)

## Browser Compatibility

- WebGL mode: All modern browsers
- TensorFlow.js mode: Chrome, Firefox, Safari, Edge
- WebGPU mode: Chrome with WebGPU flag enabled, Edge (experimental)

## License

MIT