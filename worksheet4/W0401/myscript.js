"use strict";
window.onload = function() { main(); }

const MAX_SUBDIVISION = 8;

// Tetrahedron inscribed in the unit sphere (Angel, Sec. 6.6).
const va = vec3(0.0, 0.0, -1.0);
const vb = vec3(0.0, 0.942809, 0.333333);
const vc = vec3(-0.816497, -0.471405, 0.333333);
const vd = vec3(0.816497, -0.471405, 0.333333);

// Splits a triangle into four using its edge midpoints, pushing the
// midpoints out onto the unit sphere, and recurses `count` times.
function divide_triangle(positions, a, b, c, count)
{
if (count > 0) {
  const ab = normalize(mix(a, b, 0.5));
  const ac = normalize(mix(a, c, 0.5));
  const bc = normalize(mix(b, c, 0.5));
  divide_triangle(positions, a, ab, ac, count - 1);
  divide_triangle(positions, ab, b, bc, count - 1);
  divide_triangle(positions, bc, c, ac, count - 1);
  divide_triangle(positions, ab, bc, ac, count - 1);
} else {
  positions.push(a, b, c);
}
}

function build_sphere(positions, subdivisions)
{
divide_triangle(positions, va, vb, vc, subdivisions);
divide_triangle(positions, vd, vc, vb, subdivisions);
divide_triangle(positions, va, vd, vb, subdivisions);
divide_triangle(positions, va, vc, vd, subdivisions);
}

// MV.js's ortho()/perspective() follow OpenGL's z in [-1,1]. WebGPU expects
// z in [0,1] (like DirectX), so remap clip-space z: z' = 0.5*z + 0.5*w.
function toWebGPUDepth(projection)
{
const remap = mat4();
remap[2][2] = 0.5;
remap[2][3] = 0.5;
return mult(remap, projection);
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

let subdivisions = 3;
let positions = [];
let positionBuffer = null;

const positionBufferLayout = {
arrayStride: sizeof['vec3'],
attributes: [{
format: 'float32x3',
offset: 0,
shaderLocation: 0, // Position, see vertex shader
}],
};

// The sphere's size changes with the subdivision level, so its vertex
// buffer is rebuilt whenever the level changes.
function rebuildSphere()
{
positions = [];
build_sphere(positions, subdivisions);
if (positionBuffer) positionBuffer.destroy();
positionBuffer = device.createBuffer({
size: flatten(positions).byteLength,
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));
document.getElementById('level-label').textContent = 'Subdivision level: ' + subdivisions;
}

const uniformBuffer = device.createBuffer({
size: sizeof['mat4'],
usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

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
primitive: {
  topology: 'triangle-list',
},
});

const bindGroup = device.createBindGroup({
layout: pipeline.getBindGroupLayout(0),
entries: [{
  binding: 0,
  resource: { buffer: uniformBuffer },
}],
});

// One sphere in the image center, seen through a 45 degree pinhole camera.
const model = mat4();
const view = lookAt(vec3(0.0, 0.0, 3.0), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
const projection = toWebGPUDepth(perspective(45.0, 1.0, 0.1, 20.0));
const mvp = mult(projection, mult(view, model));
device.queue.writeBuffer(uniformBuffer, 0, flatten(mvp));

function render()
{
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
pass.setBindGroup(0, bindGroup);
pass.setVertexBuffer(0, positionBuffer);
pass.draw(positions.length);
pass.end();

device.queue.submit([encoder.finish()]);
}

document.getElementById('increment-button').addEventListener('click', function() {
  if (subdivisions < MAX_SUBDIVISION) {
    subdivisions++;
    rebuildSphere();
    render();
  }
});

document.getElementById('decrement-button').addEventListener('click', function() {
  if (subdivisions > 0) {
    subdivisions--;
    rebuildSphere();
    render();
  }
});

rebuildSphere();
render();
}
