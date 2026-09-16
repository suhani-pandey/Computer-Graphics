struct Uniforms {
  mvp: mat4x4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

@vertex
fn vertexMain(@location(0) position: vec3f, @location(1) color: vec3f) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvp * vec4f(position, 1.0);
  output.color = color;
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color, 1.0);
}
