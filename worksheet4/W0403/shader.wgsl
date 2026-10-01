struct Uniforms {
  mvp: mat4x4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Distant, white, directional light (no distance attenuation).
const lightDirection = vec3f(0.0, 0.0, -1.0); // l_e
const lightEmission = vec3f(1.0, 1.0, 1.0);   // L_e

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

// Gouraud shading: the lighting is computed per vertex, and the resulting
// color is interpolated across each triangle.
@vertex
fn vertexMain(@location(0) position: vec3f) -> VertexOutput {
  // For a unit sphere centered at the origin, the true surface normal at a
  // point is the (normalized) position of that point.
  let normal = normalize(position);
  let kd = 0.5 * position + 0.5;
  let l = -lightDirection; // direction toward the light, w_i = l = -l_e

  var output: VertexOutput;
  output.position = uniforms.mvp * vec4f(position, 1.0);
  output.color = kd * lightEmission * max(dot(normal, l), 0.0);
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color, 1.0);
}
