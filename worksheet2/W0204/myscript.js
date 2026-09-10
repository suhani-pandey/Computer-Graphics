"use strict";
window.onload = function() { main(); }

const MAX_VERTICES = 12000;
const POINT_HALF_SIZE = 10 / 256; // 20px square, in clip-space half-width (canvas is 512px)
const CIRCLE_SEGMENTS = 64;

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

function add_triangle(positions, colors, p0, p1, p2, c0, c1, c2)
{
positions.push(p0, p1, p2);
colors.push(c0, c1, c2);
}

// Circle built from independent triangles (center + two edge points each),
// with the color interpolated radially from centerColor to edgeColor.
function add_circle(positions, colors, center, radius, segments, centerColor, edgeColor)
{
for (let i = 0; i < segments; i++) {
  const theta0 = (i / segments) * 2 * Math.PI;
  const theta1 = ((i + 1) / segments) * 2 * Math.PI;
  positions.push(vec2(center[0], center[1]));
  positions.push(vec2(center[0] + radius * Math.cos(theta0), center[1] + radius * Math.sin(theta0)));
  positions.push(vec2(center[0] + radius * Math.cos(theta1), center[1] + radius * Math.sin(theta1)));
  colors.push(centerColor, edgeColor, edgeColor);
}
}

function distance(p0, p1)
{
const dx = p1[0] - p0[0];
const dy = p1[1] - p0[1];
return Math.sqrt(dx * dx + dy * dy);
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

// Finalized shapes (points, triangles, circles) that stay on the canvas.
const shapePositions = [];
const shapeColors = [];

// The record of points clicked so far while building a triangle.
const pendingTriangle = [];
// The record of the center point clicked so far while building a circle.
let pendingCircle = null;

let mode = 'point';

const positionBuffer = device.createBuffer({
size: MAX_VERTICES * sizeof['vec2'],
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
size: MAX_VERTICES * sizeof['vec3'],
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
primitive: {
  topology: 'triangle-list',
},
});

const clearColorSelect = document.getElementById('clear-color-select');
const pointColorSelect = document.getElementById('point-color-select');
const clearButton = document.getElementById('clear-button');
const pointModeButton = document.getElementById('point-mode-button');
const triangleModeButton = document.getElementById('triangle-mode-button');
const circleModeButton = document.getElementById('circle-mode-button');
const modeLabel = document.getElementById('mode-label');

function clearPendingRecords()
{
pendingTriangle.length = 0;
pendingCircle = null;
}

function render()
{
// Combine the finalized shapes with point markers for any shape
// still being built (the "record" of clicks placed so far).
const positions = shapePositions.slice();
const colors = shapeColors.slice();
for (const clicked of pendingTriangle) {
  add_point(positions, colors, clicked.pos, POINT_HALF_SIZE, clicked.color);
}
if (pendingCircle !== null) {
  add_point(positions, colors, pendingCircle.center, POINT_HALF_SIZE, pendingCircle.color);
}

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
  const clip = eventToClipCoords(canvas, event);
  const color = COLORS[pointColorSelect.value];

  if (mode === 'point') {
    add_point(shapePositions, shapeColors, clip, POINT_HALF_SIZE, color);
  } else if (mode === 'triangle') {
    pendingTriangle.push({ pos: clip, color: color });
    if (pendingTriangle.length === 3) {
      add_triangle(shapePositions, shapeColors,
        pendingTriangle[0].pos, pendingTriangle[1].pos, pendingTriangle[2].pos,
        pendingTriangle[0].color, pendingTriangle[1].color, pendingTriangle[2].color);
      pendingTriangle.length = 0;
    }
  } else if (mode === 'circle') {
    if (pendingCircle === null) {
      pendingCircle = { center: clip, color: color };
    } else {
      const radius = distance(pendingCircle.center, clip);
      const edgeColor = pendingCircle.color;
      const centerColor = mix(edgeColor, vec3(1.0, 1.0, 1.0), 0.6);
      add_circle(shapePositions, shapeColors, pendingCircle.center, radius, CIRCLE_SEGMENTS, centerColor, edgeColor);
      pendingCircle = null;
    }
  }
  render();
});

pointModeButton.addEventListener('click', function() {
  mode = 'point';
  clearPendingRecords();
  modeLabel.textContent = 'Mode: points';
  render();
});

triangleModeButton.addEventListener('click', function() {
  mode = 'triangle';
  clearPendingRecords();
  modeLabel.textContent = 'Mode: triangles';
  render();
});

circleModeButton.addEventListener('click', function() {
  mode = 'circle';
  clearPendingRecords();
  modeLabel.textContent = 'Mode: circles';
  render();
});

clearButton.addEventListener('click', function() {
  shapePositions.length = 0;
  shapeColors.length = 0;
  clearPendingRecords();
  render();
});

clearColorSelect.addEventListener('change', render);

render();
}
