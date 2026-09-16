"use strict";
window.onload = function() { main(); }

// Unit cube (diagonal from (0,0,0) to (1,1,1)), as 12 edges for line-list drawing.
function add_cube_edges(positions)
{
function corner(i) {
  return vec3(i & 1 ? 1 : 0, i & 2 ? 1 : 0, i & 4 ? 1 : 0);
}
for (let i = 0; i < 8; i++) {
  for (let bit = 0; bit < 3; bit++) {
    const j = i ^ (1 << bit);
    if (j > i) positions.push(corner(i), corner(j));
  }
}
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

// Builds the model matrix for one cube: rotate it about its own center
// (the cube's local geometry runs from (0,0,0) to (1,1,1), not centered
// at the origin), then place its center at the given world position.
function cubeModel(rotation, center)
{
const toOrigin = translate(-0.5, -0.5, -0.5);
const backToCorner = translate(0.5, 0.5, 0.5);
const place = translate(center[0] - 0.5, center[1] - 0.5, center[2] - 0.5);
return mult(place, mult(backToCorner, mult(rotation, toOrigin)));
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
add_cube_edges(positions);

const positionBuffer = device.createBuffer({
size: flatten(positions).byteLength,
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));
const positionBufferLayout = {
arrayStride: sizeof['vec3'],
attributes: [{
format: 'float32x3',
offset: 0,
shaderLocation: 0, // Position, see vertex shader
}],
};

const uniformBuffer = device.createBuffer({
size: sizeof['mat4'],
usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const NUM_CUBES = 3;
const modelBuffer = device.createBuffer({
size: NUM_CUBES * sizeof['mat4'],
usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
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
  topology: 'line-list',
},
});

const bindGroup = device.createBindGroup({
layout: pipeline.getBindGroupLayout(0),
entries: [
  { binding: 0, resource: { buffer: uniformBuffer } },
  { binding: 1, resource: { buffer: modelBuffer } },
],
});

// One shared pinhole camera (45 degree vertical field of view) for all three cubes.
const view = lookAt(vec3(0.0, 0.0, 7.0), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
const projection = toWebGPUDepth(perspective(45.0, 1.0, 0.1, 20.0));
const viewProjection = mult(projection, view);
device.queue.writeBuffer(uniformBuffer, 0, flatten(viewProjection));

// Three cubes, same camera, different rotation relative to the view axis:
//  - cube 0: no rotation              -> one-point (front) perspective
//  - cube 1: rotated about Y          -> two-point (X) perspective
//  - cube 2: rotated about Y and X    -> three-point perspective
const models = [
cubeModel(mat4(), vec3(-1.6, 0.0, 0.0)),
cubeModel(rotateY(35.0), vec3(0.0, 0.0, 0.0)),
cubeModel(mult(rotateX(20.0), rotateY(35.0)), vec3(1.6, 0.0, 0.0)),
];
const modelData = new Float32Array(NUM_CUBES * 16);
models.forEach((m, i) => modelData.set(flatten(m), i * 16));
device.queue.writeBuffer(modelBuffer, 0, modelData);

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
pass.draw(positions.length, NUM_CUBES);
pass.end();

device.queue.submit([encoder.finish()]);
}
