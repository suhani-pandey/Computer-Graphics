struct Uniforms {
  mvp: mat4x4f,
  model: mat4x4f,
  eye: vec4f,     // xyz: camera position (world space)
  ks: vec4f,      // rgb: specular reflection coefficient
  Le: vec4f,      // rgb: light emission (incident light, L_i = L_e: no shadows)
  La: vec4f,      // rgb: ambient light
  kdScale: f32,   // scales the model's own diffuse color (from its material)
  shininess: f32, // s, the Phong exponent
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Distant, white, directional light (no distance attenuation).
const lightDirection = vec3f(0.0, 0.0, -1.0); // l_e

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
  @location(1) normal: vec3f,
  @location(2) kd: vec3f,
};

// Phong shading, as in Worksheet 4 Part 5: the vertex shader passes on the
// position and normal, which are interpolated across each triangle, and the
// Phong reflection model is evaluated per fragment. Unlike the sphere, the
// normals now come from the mesh, and the model matrix is not the identity.
@vertex
fn vertexMain(@location(0) position: vec4f, @location(1) normal: vec4f, @location(2) color: vec4f) -> VertexOutput {
  var output: VertexOutput;
  output.position = uniforms.mvp * position;
  output.worldPosition = (uniforms.model * position).xyz;
  // The model matrix only translates and scales uniformly, so it maps
  // normals to world space too (the normal has w = 0, so it isn't translated).
  output.normal = normalize((uniforms.model * normal).xyz);
  output.kd = uniforms.kdScale * color.rgb;
  return output;
}

@fragment
fn fragmentMain(@location(0) worldPosition: vec3f, @location(1) normal: vec3f, @location(2) kd: vec3f) -> @location(0) vec4f {
  // Linear interpolation shortens the normal between vertices, so it must be
  // re-normalized before it is used as a direction.
  let n = normalize(normal);
  let l = -lightDirection;                             // w_i, toward the light
  let v = normalize(uniforms.eye.xyz - worldPosition); // w_o, toward the eye
  let r = reflect(-l, n);                              // l mirrored about n

  let ka = kd;
  let ambient = ka * uniforms.La.rgb;
  let diffuse = kd * uniforms.Le.rgb * max(dot(n, l), 0.0);
  var specular = vec3f(0.0);
  if (dot(n, l) > 0.0) { // no highlight on the side facing away from the light
    specular = uniforms.ks.rgb * uniforms.Le.rgb * pow(max(dot(r, v), 0.0), uniforms.shininess);
  }

  return vec4f(ambient + diffuse + specular, 1.0);
}
