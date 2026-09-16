"use strict";
window.onload = function() { main(); }

// A unit box (-0.5..0.5 on each axis), as 12 triangles (36 vertices),
// built once and reused (scaled/rotated/translated) for every part.
function buildUnitBoxTriangles()
{
function corner(i) {
  return vec3(i & 1 ? 0.5 : -0.5, i & 2 ? 0.5 : -0.5, i & 4 ? 0.5 : -0.5);
}
const faces = [
  [0, 2, 6, 4], // -X
  [1, 3, 7, 5], // +X
  [0, 1, 5, 4], // -Y
  [2, 3, 7, 6], // +Y
  [0, 1, 3, 2], // -Z
  [4, 5, 7, 6], // +Z
];
const triangles = [];
for (const [a, b, c, d] of faces) {
  triangles.push(corner(a), corner(b), corner(c));
  triangles.push(corner(a), corner(c), corner(d));
}
return triangles;
}

const UNIT_BOX_TRIANGLES = buildUnitBoxTriangles();

// Transforms a copy of the unit box by `model` and appends it (with a flat
// color) to the scene's vertex buffers.
function addBox(positions, colors, model, color)
{
for (const local of UNIT_BOX_TRIANGLES) {
  const world = mult(model, vec4(local[0], local[1], local[2], 1.0));
  positions.push(vec3(world[0], world[1], world[2]));
  colors.push(color);
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
const colors = [];

const gray = vec3(0.7, 0.7, 0.7);
const blue = vec3(0.3, 0.5, 0.8);
const red = vec3(0.9, 0.3, 0.2);

// Fuselage: a long thin box along Z, at the origin.
addBox(positions, colors,
  mult(translate(0, 0, 0), scalem(0.35, 0.35, 2.2)),
  gray);

// Wings: one wide flat box across X, mounted mid-fuselage.
addBox(positions, colors,
  mult(translate(0, 0, 0.1), scalem(2.6, 0.08, 0.55)),
  blue);

// Horizontal stabilizer: a smaller version of the wings, at the tail.
addBox(positions, colors,
  mult(translate(0, 0, -0.95), scalem(1.0, 0.06, 0.35)),
  blue);

// Vertical stabilizer: standing upright on top of the tail.
addBox(positions, colors,
  mult(translate(0, 0.45, -0.95), scalem(0.06, 0.55, 0.35)),
  blue);

// Ailerons: small boxes on the wings' trailing edge, near the wingtips,
// rotated around their leading edge (the hinge line) to show deflection.
// Deflecting them in opposite directions is what rolls the aircraft.
function addAileron(x, deflectionDegrees)
{
const hingeZ = 0.1 - 0.275; // wing's trailing edge (wing center z=0.1, half-depth 0.275)
const localSize = vec3(0.5, 0.05, 0.15);
const model = mult(translate(x, 0, hingeZ),
              mult(rotateX(deflectionDegrees),
              mult(translate(0, 0, -localSize[2] / 2),
                   scalem(localSize[0], localSize[1], localSize[2]))));
addBox(positions, colors, model, red);
}
addAileron(-1.0, 15.0);
addAileron(1.0, -15.0);

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

const colorBuffer = device.createBuffer({
size: flatten(colors).byteLength,
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(colorBuffer, /*bufferOffset=*/0, flatten(colors));
const colorBufferLayout = {
arrayStride: sizeof['vec3'],
attributes: [{
format: 'float32x3',
offset: 0,
shaderLocation: 1, // Color, see vertex shader
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
  buffers: [positionBufferLayout, colorBufferLayout],
},
fragment: {
  module: shaderModule,
  entryPoint: 'fragmentMain',
  targets: [{ format: canvasFormat }],
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

const view = lookAt(vec3(1.2, 2.2, 4.5), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
const projection = toWebGPUDepth(perspective(45.0, 1.0, 0.1, 20.0));
const mvp = mult(projection, view);
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
pass.setVertexBuffer(1, colorBuffer);
pass.draw(positions.length);
pass.end();

device.queue.submit([encoder.finish()]);
}
