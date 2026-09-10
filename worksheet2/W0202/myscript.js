"use strict";
window.onload = function() { main(); }

const MAX_POINTS = 500;
const POINT_HALF_SIZE = 10 / 256; // 20px square, in clip-space half-width (canvas is 512px)

const COLORS = {
Black: vec3(0.0, 0.0, 0.0),
Red: vec3(1.0, 0.0, 0.0),
Yellow: vec3(1.0, 1.0, 0.0),
Green: vec3(0.0, 1.0, 0.0),
Blue: vec3(0.0, 0.0, 1.0),
Magenta: vec3(1.0, 0.0, 1.0),
Cyan: vec3(0.0, 1.0, 1.0),
White: vec3(1.0, 1.0, 1.0),
Cornflower: vec3(0.3921, 0.5843, 0.9294),
};

function add_point(positions, colors, center, halfSize, color)
{
positions.push(vec2(center[0] - halfSize, center[1] - halfSize));
positions.push(vec2(center[0] + halfSize, center[1] - halfSize));
positions.push(vec2(center[0] + halfSize, center[1] + halfSize));

positions.push(vec2(center[0] - halfSize, center[1] - halfSize));
positions.push(vec2(center[0] + halfSize, center[1] + halfSize));
positions.push(vec2(center[0] - halfSize, center[1] + halfSize));

for (let i = 0; i < 6; i++) colors.push(color);
}

// Converts a mouse click event into clip-space coordinates (-1..1),
// correcting for the canvas's position on the page.
function eventToClipCoords(canvas, event)
{
const rect = event.target.getBoundingClientRect();
const x = event.clientX - rect.left;
const y = event.clientY - rect.top;
const clipX = (x / rect.width) * 2 - 1;
const clipY = 1 - (y / rect.height) * 2;
return vec2(clipX, clipY);
}

async function main()
{
const gpu = navigator.gpu;
const adapter = await gpu.requestAdapter();
const device = await adapter.requestDevice();
const canvas = document.getElementById('my-canvas');
const context = canvas.getContext('webgpu');
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
device: device,
format: canvasFormat,
});

const positions = [];
const colors = [];

const positionBuffer = device.createBuffer({
size: MAX_POINTS * 6 * sizeof['vec2'],
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
const positionBufferLayout = {
arrayStride: sizeof['vec2'],
attributes: [{
format: 'float32x2',
offset: 0,
shaderLocation: 0, // Position, see vertex shader
}],
};

const colorBuffer = device.createBuffer({
size: MAX_POINTS * 6 * sizeof['vec3'],
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
const colorBufferLayout = {
arrayStride: sizeof['vec3'],
attributes: [{
format: 'float32x3',
offset: 0,
shaderLocation: 1, // Color, see vertex shader
}],
};

const shaderCode = await fetch('shader.wgsl').then(response => response.text());
const shaderModule = device.createShaderModule({
code: shaderCode,
});

const pipeline = device.createRenderPipeline({
layout: 'auto',
vertex: {
  module: shaderModule,
  entryPoint: 'vertexMain',
  buffers: [positionBufferLayout, colorBufferLayout],
},
fragment: {
  module: shaderModule,
  entryPoint: 'fragmentMain',
  targets: [{ format: canvasFormat }],
},
});

const clearColorSelect = document.getElementById('clear-color-select');
const pointColorSelect = document.getElementById('point-color-select');
const clearButton = document.getElementById('clear-button');

function render()
{
device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));
device.queue.writeBuffer(colorBuffer, /*bufferOffset=*/0, flatten(colors));

const clearColor = COLORS[clearColorSelect.value];

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    loadOp: "clear",
    clearValue: { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: 1.0 },
    storeOp: "store",
  }]
});

pass.setPipeline(pipeline);
pass.setVertexBuffer(0, positionBuffer);
pass.setVertexBuffer(1, colorBuffer);
pass.draw(positions.length);
pass.end();

device.queue.submit([encoder.finish()]);
}

canvas.addEventListener('click', function(event) {
  const clipCoords = eventToClipCoords(canvas, event);
  add_point(positions, colors, clipCoords, POINT_HALF_SIZE, COLORS[pointColorSelect.value]);
  render();
});

clearButton.addEventListener('click', function() {
  positions.length = 0;
  colors.length = 0;
  render();
});

clearColorSelect.addEventListener('change', render);

render();
}
