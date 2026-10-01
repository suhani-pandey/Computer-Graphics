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

### [Worksheet 4 — Lighting and (forward) shading](worksheet4)

Local illumination of a sphere with ambient, diffuse and specular material properties and a directional light, comparing Gouraud and Phong shading.

- [Part 1 — Subdivided sphere](worksheet4/W0401): a unit sphere made by recursively subdividing a tetrahedron, with buttons to increment and decrement the subdivision level.
- [Part 2 — Depth buffer and back face culling](worksheet4/W0402): vertex positions drawn as colors (`c = 0.5·p + 0.5`), hidden surfaces removed with the depth buffer and back face culling (with the textbook's triangle winding flipped so culling keeps the front).
- [Part 3 — Gouraud shading, diffuse](worksheet4/W0403): per-vertex diffuse lighting from a white directional light `(0, 0, −1)`, using the sphere's true normals, with the camera orbiting the sphere.
- [Part 4 — Phong reflection model (Gouraud)](worksheet4/W0404): the full Phong reflection model in the vertex shader, with sliders for `k_d`, `k_s`, `s`, `L_e` and `L_a`.
- [Part 5 — Phong shading](worksheet4/W0405): the same model evaluated per fragment, interpolating (and re-normalizing) positions and normals instead of colors.
- [Part 6 — Questions (write-up)](worksheet4/W0406): flat vs. Gouraud vs. Phong shading, directional vs. point lights, view dependence, the specular term and shininess, and the lighting's coordinate space.

### [Worksheet 5 — Rendering a triangle mesh](worksheet5)

Loading a triangle mesh from a Wavefront OBJ file and lighting it with the techniques from Worksheet 4.

- [Part 1 — Secret page on the DTU student homepage](worksheet5/W0501): step-by-step instructions for putting the solutions on a secret page (done with your own DTU login).
- [Part 2 — The 3D model](worksheet5/W0502): the Utah teapot as an OBJ triangle mesh, exported from the course's `teapotData.js` generator.
- [Part 3 — Loading the OBJ file](worksheet5/W0503): the mesh loaded with `readOBJFile` (`async`/`await`), uploaded to WebGPU buffers and drawn as an indexed face set, with normals shown as colors.
- [Part 4 — Phong shading of the mesh](worksheet5/W0504): the mesh lit with the Phong shading from Worksheet 4 Part 5, plus a write-up on how surface normals are obtained and used, and how they relate to surface smoothness.
