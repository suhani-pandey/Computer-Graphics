struct Uniforms {
  mvp: mat4x4f,
  eye: vec4f,     // xyz: camera position (world space)
  kd: vec4f,      // rgb: diffuse reflection coefficient (also ambient, k_a = k_d)
  ks: vec4f,      // rgb: specular reflection coefficient
  Le: vec4f,      // rgb: light emission (incident light, L_i = L_e: no shadows)
  La: vec4f,      // rgb: ambient light
  shininess: f32, // s, the Phong exponent
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Distant, white, directional light (no distance attenuation).
const lightDirection = vec3f(0.0, 0.0, -1.0); // l_e

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
};

// Gouraud shading with the full Phong reflection model: the lighting is
// computed per vertex, and the resulting color is interpolated across
// each triangle.
@vertex
fn vertexMain(@location(0) position: vec3f) -> VertexOutput {
  // For a unit sphere centered at the origin, the true surface normal at a
  // point is the (normalized) position of that point.
  let n = normalize(position);
  let l = -lightDirection;                        // w_i, toward the light
  let v = normalize(uniforms.eye.xyz - position); // w_o, toward the eye
  let r = reflect(-l, n);                         // l mirrored about n

  let ka = uniforms.kd.rgb;
  let ambient = ka * uniforms.La.rgb;
  let diffuse = uniforms.kd.rgb * uniforms.Le.rgb * max(dot(n, l), 0.0);
  var specular = vec3f(0.0);
  if (dot(n, l) > 0.0) { // no highlight on the side facing away from the light
    specular = uniforms.ks.rgb * uniforms.Le.rgb * pow(max(dot(r, v), 0.0), uniforms.shininess);
  }

  var output: VertexOutput;
  output.position = uniforms.mvp * vec4f(position, 1.0);
  output.color = ambient + diffuse + specular;
  return output;
}

@fragment
fn fragmentMain(@location(0) color: vec3f) -> @location(0) vec4f {
  return vec4f(color, 1.0);
}
