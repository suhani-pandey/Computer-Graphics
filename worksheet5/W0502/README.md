# Part 2 — The 3D model

The model is the Utah teapot, as a Wavefront OBJ triangle mesh:
[`teapot.obj`](teapot.obj) (2094 vertices, 4032 triangles, with per-vertex
normals, no MTL file). Parts 3 and 4 load it with `readOBJFile`.

## Where it comes from

The teapot provided for the course, `teapotData.js`, is not an OBJ file but a
JavaScript generator that tessellates the teapot's 32 Bézier patches into
triangles. [`export_teapot_obj.js`](export_teapot_obj.js) runs that generator
once (8 divisions per patch side) and writes the result as an OBJ file:

```bash
node export_teapot_obj.js
```

While exporting it:

- merges vertices that have the same position and normal, so the OBJ is a
  real indexed face set rather than a list of separate triangles,
- drops the 64 zero-area triangles where patch corners collapse to a single
  point (the top of the lid and the center of the bottom), and
- replaces the generator's zero-length normals at those two points with the
  average normal of the surrounding triangles (straight up and straight
  down), since a zero normal cannot be normalized in the shader.

All triangles are counter-clockwise seen from outside, matching the back
face culling used in Parts 3 and 4.

**Note:** the worksheet says the provided teapot is "a quick way to move on,
but not a full solution for this part". For full credit, model your own
object in Blender (for example Suzanne: *Add → Mesh → Monkey*, then *Shade
Smooth*), export it with *File → Export → Wavefront (.obj)* with
*Triangulated Mesh* and *Normals* enabled, put the `.obj` (and `.mtl`) in
this folder, and change `OBJ_FILENAME` at the top of `W0503/myscript.js` and
`W0504/myscript.js`. Both parts center and scale whatever model they load,
so no other change is needed.
