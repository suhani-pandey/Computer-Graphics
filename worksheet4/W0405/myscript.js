"use strict";
window.onload = function() { main(); }

const MAX_SUBDIVISION = 8;
const ORBIT_RADIUS = 3.0;
const ORBITS_PER_SECOND = 0.1;

// Selected material and light colors; the sliders scale these.
const DIFFUSE_COLOR = vec3(0.9, 0.35, 0.2);
const SPECULAR_COLOR = vec3(1.0, 1.0, 1.0);
const WHITE = vec3(1.0, 1.0, 1.0);

// Tetrahedron inscribed in the unit sphere (Angel, Sec. 6.6).
const va = vec3(0.0, 0.0, -1.0);
const vb = vec3(0.0, 0.942809, 0.333333);
const vc = vec3(-0.816497, -0.471405, 0.333333);
const vd = vec3(0.816497, -0.471405, 0.333333);

// Splits a triangle into four using its edge midpoints, pushing the
// midpoints out onto the unit sphere, and recurses `count` times.
// The four children keep the winding order of their parent triangle.
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

// Faces ordered so every triangle is counter-clockwise seen from outside
// (see W0402 for why the textbook order had to be flipped).
function build_sphere(positions, subdivisions)
{
divide_triangle(positions, va, vc, vb, subdivisions);
divide_triangle(positions, vd, vb, vc, subdivisions);
divide_triangle(positions, va, vb, vd, subdivisions);
divide_triangle(positions, va, vd, vc, subdivisions);
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

// Matches the Uniforms struct in shader.wgsl: mvp (16 floats), then eye,
// kd, ks, Le, La (4 floats each), then shininess, padded to 160 bytes.
const uniformData = new Float32Array(40);
const uniformBuffer = device.createBuffer({
size: uniformData.byteLength,
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

// One slider per parameter. The "input" event updates the value while the
// slider is being dragged (not only when it is released).
const params = {};
function bindSlider(name)
{
const slider = document.getElementById(name + '-slider');
const label = document.getElementById(name + '-value');
function update() {
  params[name] = parseFloat(slider.value);
  label.textContent = slider.value;
}
slider.addEventListener('input', update);
update();
}
['kd', 'ks', 'shininess', 'le', 'la'].forEach(bindSlider);

const model = mat4();
const projection = toWebGPUDepth(perspective(45.0, 1.0, 0.1, 20.0));

function render(timeMilliseconds)
{
// The camera orbits the sphere in the xz-plane, always looking at its center.
const angle = timeMilliseconds * 0.001 * ORBITS_PER_SECOND * 2 * Math.PI;
const eye = vec3(ORBIT_RADIUS * Math.sin(angle), 0.0, ORBIT_RADIUS * Math.cos(angle));
const view = lookAt(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
const mvp = mult(projection, mult(view, model));

uniformData.set(flatten(mvp), 0);
uniformData.set(eye, 16);
uniformData.set(scale(params.kd, DIFFUSE_COLOR), 20);
uniformData.set(scale(params.ks, SPECULAR_COLOR), 24);
uniformData.set(scale(params.le, WHITE), 28);
uniformData.set(scale(params.la, WHITE), 32);
uniformData[36] = params.shininess;
device.queue.writeBuffer(uniformBuffer, 0, uniformData);

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
pass.draw(positions.length);
pass.end();

device.queue.submit([encoder.finish()]);
requestAnimationFrame(render);
}

document.getElementById('increment-button').addEventListener('click', function() {
  if (subdivisions < MAX_SUBDIVISION) {
    subdivisions++;
    rebuildSphere();
  }
});

document.getElementById('decrement-button').addEventListener('click', function() {
  if (subdivisions > 0) {
    subdivisions--;
    rebuildSphere();
  }
});

rebuildSphere();
requestAnimationFrame(render);
}
