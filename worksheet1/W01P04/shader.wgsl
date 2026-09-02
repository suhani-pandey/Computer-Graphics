struct Uniforms {
  angle: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vertexMain(@location(0) position: vec2f) -> @builtin(position) vec4f {
  let c = cos(uniforms.angle);
  let s = sin(uniforms.angle);
  let rotated = vec2f(
    position.x * c - position.y * s,
    position.x * s + position.y * c
  );
  return vec4f(rotated, 0.0, 1.0);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
  return vec4f(1.0, 1.0, 1.0, 1.0);
}
