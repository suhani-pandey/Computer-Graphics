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

const positions = [ vec2(1.0, 1.0), vec2(0.0, 0.0), vec2(1.0, 0.0) ];
const colors = [ vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 0.0), vec3(1.0, 0.0, 0.0) ];

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

// Create a render pass in a command buffer and submit it
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
pass.setVertexBuffer(1, colorBuffer);
pass.draw(positions.length);
pass.end();

const commandBuffer = encoder.finish();
device.queue.submit([commandBuffer]);
}
