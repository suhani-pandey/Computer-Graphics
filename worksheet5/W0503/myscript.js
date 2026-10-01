"use strict";
window.onload = function() { main(); }

const OBJ_FILENAME = '../W0502/teapot.obj';

// MV.js's ortho()/perspective() follow OpenGL's z in [-1,1]. WebGPU expects
// z in [0,1] (like DirectX), so remap clip-space z: z' = 0.5*z + 0.5*w.
function toWebGPUDepth(projection)
{
const remap = mat4();
remap[2][2] = 0.5;
remap[2][3] = 0.5;
return mult(remap, projection);
}

// Model matrix that centers the model at the origin and scales it uniformly
// so that its largest side is 2 long, whatever units the OBJ file uses.
// (`vertices` holds 4 floats per vertex: x, y, z, 1.)
function fitToView(vertices)
{
const min = vec3(Infinity, Infinity, Infinity);
const max = vec3(-Infinity, -Infinity, -Infinity);
for (let i = 0; i < vertices.length; i += 4) {
  for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], vertices[i + k]);
    max[k] = Math.max(max[k], vertices[i + k]);
  }
}
const center = mix(min, max, 0.5);
const s = 2.0 / Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
return mult(scalem(s, s, s), translate(-center[0], -center[1], -center[2]));
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

// reverse = true: for faces without vertex normals in the file, OBJParser
// computes a face normal that points inward on counter-clockwise faces, so
// it has to be flipped. (Normals read from the file are not affected.)
const drawingInfo = await readOBJFile(OBJ_FILENAME, 1.0, true);

// OBJParser gives 4 floats per vertex: positions (x, y, z, 1) and normals
// (x, y, z, 0), plus indices into them that make up the triangles.
const positionBuffer = device.createBuffer({
size: drawingInfo.vertices.byteLength,
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, drawingInfo.vertices);
const positionBufferLayout = {
arrayStride: sizeof['vec4'],
attributes: [{
format: 'float32x4',
offset: 0,
shaderLocation: 0, // Position, see vertex shader
}],
};

const normalBuffer = device.createBuffer({
size: drawingInfo.normals.byteLength,
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(normalBuffer, /*bufferOffset=*/0, drawingInfo.normals);
const normalBufferLayout = {
arrayStride: sizeof['vec4'],
attributes: [{
format: 'float32x4',
offset: 0,
shaderLocation: 1, // Normal, see vertex shader
}],
};

const indexBuffer = device.createBuffer({
size: drawingInfo.indices.byteLength,
usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(indexBuffer, /*bufferOffset=*/0, drawingInfo.indices);

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
  buffers: [positionBufferLayout, normalBufferLayout],
},
fragment: {
  module: shaderModule,
  entryPoint: 'fragmentMain',
  targets: [{ format: canvasFormat }],
},
primitive: {
  topology: 'triangle-list',
  frontFace: 'ccw',
  cullMode: 'back',
},
depthStencil: {
  format: 'depth24plus',
  depthWriteEnabled: true,
  depthCompare: 'less',
},
});

const depthTexture = device.createTexture({
size: [canvas.width, canvas.height],
format: 'depth24plus',
usage: GPUTextureUsage.RENDER_ATTACHMENT,
});

const bindGroup = device.createBindGroup({
layout: pipeline.getBindGroupLayout(0),
entries: [{
  binding: 0,
  resource: { buffer: uniformBuffer },
}],
});

// A 45 degree pinhole camera looking at the model from slightly above.
const model = fitToView(drawingInfo.vertices);
const view = lookAt(vec3(0.0, 1.2, 3.2), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
const projection = toWebGPUDepth(perspective(45.0, 1.0, 0.1, 20.0));
const mvp = mult(projection, mult(view, model));
device.queue.writeBuffer(uniformBuffer, 0, flatten(mvp));

const encoder = device.createCommandEncoder();
const pass = encoder.beginRenderPass({
  colorAttachments: [{
    view: context.getCurrentTexture().createView(),
    loadOp: "clear",
    clearValue: { r: 0.3921, g: 0.5843, b: 0.9294, a: 1.0 },
    storeOp: "store",
  }],
  depthStencilAttachment: {
    view: depthTexture.createView(),
    depthClearValue: 1.0,
    depthLoadOp: "clear",
    depthStoreOp: "store",
  },
});

pass.setPipeline(pipeline);
pass.setBindGroup(0, bindGroup);
pass.setVertexBuffer(0, positionBuffer);
pass.setVertexBuffer(1, normalBuffer);
pass.setIndexBuffer(indexBuffer, 'uint32');
pass.drawIndexed(drawingInfo.indices.length);
pass.end();

device.queue.submit([encoder.finish()]);
}
