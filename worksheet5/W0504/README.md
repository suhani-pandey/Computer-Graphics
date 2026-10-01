# Part 4 — Phong shading of the mesh, and surface normals

The model is lit by a distant, white, directional light with direction
`l_e = (0, 0, −1)` and shaded with the shaders from Worksheet 4 Part 5
(Phong shading with the Phong reflection model, with sliders for `k_d`, `k_s`,
`s`, `L_e`, `L_a`, `k_a = k_d`, `L_i = L_e`). The differences from the sphere
are that the normals now come from the mesh, the model matrix is no longer
the identity, and the diffuse color is the model's own material color.

## How the surface normals are obtained and used

**Obtained:** the OBJ file stores one normal per vertex (`vn` lines), and
each face corner refers to one (`f v//vn`). `readOBJFile` copies the normal
belonging to each vertex into `drawingInfo.normals` (4 floats per vertex,
with `w = 0`). For the teapot these are the exact normals of the smooth
Bézier surface the mesh approximates (the cross product of the surface's two
tangent directions), computed when the teapot was tessellated and written to
the OBJ file. If a file has no `vn` lines, OBJParser instead gives each
vertex the normal of a face that uses it, computed from the face's edges —
which is why `readOBJFile` is called with `reverse = true`: its face normals
point inward on counter-clockwise faces.

**Used:** the normals are uploaded as a vertex attribute next to the
positions. In the vertex shader they are transformed to world space with the
model matrix (it only translates and scales uniformly, so it keeps normal
directions, and `w = 0` means the translation is ignored), and passed to the
fragment shader, where the interpolated normal is re-normalized and used in
the diffuse term `max(n · l, 0)` and the specular term via `r = reflect(−l, n)`.

## How this relates to surface smoothness

A triangle mesh is made of flat faces, so its true geometric normal is
constant over each triangle and jumps at every edge. Lighting a mesh with
those face normals makes every triangle one flat shade, and the facets are
clearly visible.

The vertex normals instead approximate the normal of the smooth surface the
mesh is meant to represent, and a vertex shared by several triangles has a
single normal. Interpolating these normals across each triangle (Phong
shading) makes the normal — and therefore the shading — vary continuously
over the surface and across the edges between triangles. The teapot looks
smooth even though it is only 4032 flat triangles; only its silhouette,
which the normals cannot change, reveals the polygons.

This also means the smoothness is decided by the normals, not the geometry:
where two faces should meet at a sharp edge, the mesh gives the shared
position a separate vertex (with a different normal) on each side, so the
shading is not blended across the edge. In Blender this is the difference
between *Shade Smooth* (averaged vertex normals) and *Shade Flat* (one normal
per face) when exporting.
