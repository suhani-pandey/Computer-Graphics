struct Uniforms {
  offsetY: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(@location(0) position: vec2f) -> @builtin(position) vec4f {
  return vec4f(position.x, position.y + uniforms.offsetY, 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(1.0, 1.0, 1.0, 1.0);
}
