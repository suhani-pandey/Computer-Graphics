struct Uniforms {
  viewProjection: mat4x4f,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> models: array<mat4x4f>;

@vertex
fn vertexMain(@location(0) position: vec3f, @builtin(instance_index) instance: u32) -> @builtin(position) vec4f {
  return uniforms.viewProjection * models[instance] * vec4f(position, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(0.0, 0.0, 0.0, 1.0);
}
