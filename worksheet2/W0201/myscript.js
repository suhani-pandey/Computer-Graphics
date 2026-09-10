"use strict";
window.onload = function() { main(); }

const MAX_POINTS = 500;
const POINT_HALF_SIZE = 10 / 256; // 20px square, in clip-space half-width (canvas is 512px)

function add_point(positions, center, halfSize)
{
positions.push(vec2(center[0] - halfSize, center[1] - halfSize));
positions.push(vec2(center[0] + halfSize, center[1] - halfSize));
positions.push(vec2(center[0] + halfSize, center[1] + halfSize));

positions.push(vec2(center[0] - halfSize, center[1] - halfSize));
positions.push(vec2(center[0] + halfSize, center[1] + halfSize));
positions.push(vec2(center[0] - halfSize, center[1] + halfSize));
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

const shaderCode = await fetch('shader.wgsl').then(response => response.text());
const shaderModule = device.createShaderModule({
code: shaderCode,
});

const pipeline = device.createRenderPipeline({
layout: 'auto',
vertex: {
  module: shaderModule,
  entryPoint: 'vertexMain',
  buffers: [positionBufferLayout],
},
fragment: {
  module: shaderModule,
  entryPoint: 'fragmentMain',
  targets: [{ format: canvasFormat }],
},
});

function render()
{
device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    loadOp: "clear",
    clearValue: { r: 0.3921, g: 0.5843, b: 0.9294, a: 1.0 },
    storeOp: "store",
  }]
});

pass.setPipeline(pipeline);
pass.setVertexBuffer(0, positionBuffer);
pass.draw(positions.length);
pass.end();

device.queue.submit([encoder.finish()]);
}

canvas.addEventListener('click', function(event) {
  const clipCoords = eventToClipCoords(canvas, event);
  add_point(positions, clipCoords, POINT_HALF_SIZE);
  render();
});

render();
}
