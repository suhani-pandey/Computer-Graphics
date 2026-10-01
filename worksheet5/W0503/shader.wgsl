struct Uniforms {
  mvp: mat4x4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

// A simple shader: no lighting yet, the surface normal is drawn as a color
// (c = 0.5 * n + 0.5) so the shape of the model is visible.
@vertex
fn vertexMain(@location(0) position: vec4f, @location(1) normal: vec4f) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvp * position;
  output.color = 0.5 * normalize(normal.xyz) + 0.5;
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color, 1.0);
}
