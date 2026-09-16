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

### [Worksheet 2 — Input devices and interaction](worksheet2)

A small 2D drawing program built with WebGPU: shapes (points, triangles, circles) of selectable colors are added interactively with mouse clicks.

- [Part 1 — Mouse-driven points](worksheet2/W0201): click the canvas to draw points, with correct mouse-offset handling via `getBoundingClientRect()`.
- [Part 2 — Colors and clearing](worksheet2/W0202): a clear-canvas button, a color picker for the clear color, and a color picker for points (colored vertex shader).
- [Part 3 — Point and triangle modes](worksheet2/W0203): two drawing modes; in triangle mode, the first two clicks show point markers that get replaced by one interpolated triangle on the third click.
- [Part 4 — Circle mode](worksheet2/W0204): a third drawing mode; the first click marks the center, the second sets the radius and replaces the marker with a circle, radially interpolated from a light center to the edge color.

### [Worksheet 3 — Projections (virtual camera) and transformations](worksheet3)

Setting up the virtual camera in 3D: model-view-projection matrices, orthographic and perspective projection, and classical one/two/three-point perspective, all drawing a unit cube with WebGPU.

- [Part 1 — Isometric wireframe cube](worksheet3/W0301): a unit cube (diagonal `(0,0,0)`–`(1,1,1)`) drawn with `line-list`, in isometric view via an orthographic MVP matrix.
- [Part 2 — Classical perspective views](worksheet3/W0302): the same cube instanced three times in one draw call under a shared 45°-FOV pinhole camera, each rotated to show one-point, two-point, and three-point perspective.
- [Part 3 — Transformation matrices (write-up)](worksheet3/W0303): a written reflection listing the general transformation matrices used and the composite MVP formula for each cube from Parts 1–2.
- [Part 4 — Simplified aircraft](worksheet3/W0304) *(optional)*: a boxes-only aircraft (fuselage, wings, stabilizers) assembled with `translate`/`rotate`/`scale`, with two ailerons that rotate around their hinge edge to demonstrate roll.
