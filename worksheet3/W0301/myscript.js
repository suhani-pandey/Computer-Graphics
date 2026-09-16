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
entries: [{
  binding: 0,
  resource: { buffer: uniformBuffer },
}],
});

// Isometric view: camera on the cube's (1,1,1) diagonal, looking at its center.
const model = mat4(); // identity: cube already sits at its intended world position
const view = lookAt(vec3(2.0, 2.0, 2.0), vec3(0.5, 0.5, 0.5), vec3(0.0, 1.0, 0.0));
const projection = toWebGPUDepth(ortho(-1.0, 1.0, -1.0, 1.0, 0.1, 10.0));
const mvp = mult(projection, mult(view, model));
device.queue.writeBuffer(uniformBuffer, 0, flatten(mvp));

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
