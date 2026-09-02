# Computer-Graphics

Coursework for DTU course [02561 Computer Graphics](https://courses.compute.dtu.dk/02561/).

## Worksheets

### [Worksheet 1 — Getting started with WebGPU](worksheet1)

Setting up a WebGPU application from scratch: creating a canvas and WebGPU context, compiling and using simple shader programs, setting up vertex/color buffers, and drawing and animating simple shapes.

- [Part 1 — Basic WebGPU setup](worksheet1/W01P01): canvas + WebGPU context, render pass clearing the canvas to cornflower blue.
- [Part 2 — Shaders and buffers](worksheet1/W01P02): shader module, render pipeline, and a vertex buffer drawing three points.
- [Part 3 — Triangles](worksheet1/W01P03): draw a triangle instead of points, with a second buffer for vertex colors interpolated across red, green, and blue.
- [Part 4 — A rotating square](worksheet1/W01P04): two triangles forming a centered unit quad, animated rotation via `requestAnimationFrame`.
- [Part 5 — A bouncing circle](worksheet1/W01P05): a circle drawn with the `triangle-list` primitive topology, animated bouncing up and down over time.
