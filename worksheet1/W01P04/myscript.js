"use strict";
window.onload = function() { main(); }

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

// Unit quad (width 1, height 1) centered at the origin, two triangles.
const positions = [
vec2(-0.5, -0.5), vec2(0.5, -0.5), vec2(0.5, 0.5),
vec2(-0.5, -0.5), vec2(0.5, 0.5), vec2(-0.5, 0.5),
];
const positionBuffer = device.createBuffer({
size: flatten(positions).byteLength,
usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(positionBuffer, /*bufferOffset=*/0, flatten(positions));
const positionBufferLayout = {
arrayStride: sizeof['vec2'],
attributes: [{
format: 'float32x2',
offset: 0,
shaderLocation: 0, // Position, see vertex shader
}],
};

// Uniform buffer holding the current rotation angle (padded to 16 bytes).
const uniformBuffer = device.createBuffer({
size: 16,
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
});

const bindGroup = device.createBindGroup({
layout: pipeline.getBindGroupLayout(0),
entries: [{
  binding: 0,
  resource: { buffer: uniformBuffer },
}],
});

const rotationsPerSecond = 0.2;

function render(timeMilliseconds)
{
const angle = timeMilliseconds * 0.001 * rotationsPerSecond * 2 * Math.PI;
device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([angle]));

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
requestAnimationFrame(render);
}

requestAnimationFrame(render);
}
