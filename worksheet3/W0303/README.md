# Part 3 — Transformation matrices used in Parts 1 and 2

This part is a written reflection (no code) on the matrices used to build the
model-view-projection (MVP) transforms in [W0301](../W0301) and [W0302](../W0302).

## Transformation matrices used

- **T(x, y, z)** — translation by (x, y, z).
- **Rx(θ), Ry(θ), Rz(θ)** — rotation by angle θ about the X, Y, or Z axis.
- **LookAt(eye, at, up)** — the view matrix that transforms world space into
  eye (camera) space, built from the camera's position, the point it looks
  at, and its up vector (`MV.js`'s `lookAt`).
- **Ortho(l, r, b, t, n, f)** — orthographic projection matrix mapping the
  box `[l,r] × [b,t] × [n,f]` (eye space) to clip space (`MV.js`'s `ortho`).
- **Perspective(fovy, aspect, n, f)** — perspective projection matrix for a
  pinhole camera with vertical field of view `fovy` (`MV.js`'s `perspective`).
- **D** — a fixed depth-remap matrix, `D = diag(1,1,0.5,1)` with `D[2][3] = 0.5`
  added on top. `MV.js`'s `Ortho`/`Perspective` map depth to OpenGL's
  `z ∈ [-1,1]`, but WebGPU expects `z ∈ [0,1]`; `D` is applied as an extra
  factor on the projection matrix to convert between the two:
  `D · Ortho(...)` or `D · Perspective(...)`.

All matrices act on column vectors (`v' = M·v`), and composing "apply A then
B" is written `B·A`, matching the convention `MV.js`'s `mult(A, B)` uses.

## Part 1 — isometric wireframe cube

The cube's own vertices already span `[0,1]³` (its diagonal goes from
`(0,0,0)` to `(1,1,1)`), so no model transform is needed beyond the identity:

```
M   = I
V   = LookAt((2,2,2), (0.5,0.5,0.5), (0,1,0))
P   = D · Ortho(-1, 1, -1, 1, 0.1, 10)
MVP = P · V · M
```

The eye sits on the cube's own diagonal direction `(1,1,1)`, which is what
produces the isometric view (equal foreshortening on all three axes).

## Part 2 — three cubes in perspective

All three cubes share one camera:

```
V = LookAt((0,0,7), (0,0,0), (0,1,0))
P = D · Perspective(45°, aspect=1, 0.1, 20)
```

Each cube's local geometry still spans `[0,1]³`, so its own center sits at
`(0.5, 0.5, 0.5)`, not at the origin — rotating it "in place" would swing it
around a corner rather than its center. Each cube's model matrix first
re-centers the cube at the origin, rotates it there, moves it back, and then
places it at its target position in the scene:

```
M(R, target) = T(target − (0.5,0.5,0.5)) · T(0.5,0.5,0.5) · R · T(-0.5,-0.5,-0.5)
```

with a different rotation `R` and `target` per cube:

| Cube | Rotation R | target | Perspective type |
|---|---|---|---|
| 1 | I | (−1.6, 0, 0) | one-point (front) |
| 2 | Ry(35°) | (0, 0, 0) | two-point (X) |
| 3 | Rx(20°) · Ry(35°) | (1.6, 0, 0) | three-point |

So the full composite matrix used in the vertex shader for cube *i* is:

```
MVPᵢ = P · V · M(Rᵢ, targetᵢ)
```

**Why these rotations produce these perspective types:** a face stays
"parallel to the picture plane" (and so its edges never converge to a
vanishing point) exactly when it is not tilted relative to the camera's view
axis. Cube 1 has `R = I`, so its front face is perfectly aligned with the
camera — only the one set of edges running *toward* the camera (depth)
converges, giving one-point perspective. Cube 2 is rotated about the
vertical axis only (`Ry`), so its vertical edges stay parallel to the
picture plane (no vertical vanishing point) while both horizontal edge sets
now recede at an angle, giving two vanishing points. Cube 3 adds a second
rotation about the horizontal axis (`Rx`) on top of that, so none of its
three edge directions stay parallel to the picture plane any more, and all
three converge — three-point perspective.

Note that in the actual WebGPU pipeline the vertex shader only ever
receives one already-multiplied matrix per draw — the concatenation above
happens once on the CPU (or per-instance, for Part 2's instanced draw) and
the vertex shader just does `mvp * vec4(position, 1.0)`.
