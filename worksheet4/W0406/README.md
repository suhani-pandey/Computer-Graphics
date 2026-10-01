# Part 6 — Questions on lighting and shading

Answers based on the implementations in [W0403](../W0403) (Gouraud, diffuse),
[W0404](../W0404) (Gouraud, full Phong reflection model) and
[W0405](../W0405) (Phong shading).

## a) Flat, Gouraud, and Phong shading

- **Flat shading** evaluates the lighting once per triangle, using one normal
  for the whole face, so every triangle gets a single constant color.
- **Gouraud shading** evaluates the lighting per *vertex* (using the vertex
  normals) and linearly interpolates the resulting *colors* across each
  triangle. This is what W0403 and W0404 do in the vertex shader.
- **Phong shading** linearly interpolates the *normals* (and positions)
  across each triangle and evaluates the lighting per *fragment*, after
  re-normalizing the interpolated normal. This is what W0405 does in the
  fragment shader.

**Implementing flat shading:** give all three vertices of a triangle the
same normal, the face normal `n = normalize(cross(b − a, c − a))`, instead of
the true per-vertex normal. Our sphere already stores separate vertices for
every triangle, so only the normal would change. Alternatively, keep the
per-vertex lighting but mark the color varying `@interpolate(flat)` in WGSL,
so the whole triangle uses the color of one of its vertices instead of an
interpolated one.

**Which is best for highlights:** Phong shading. With Gouraud shading
(W0404) the specular term is only sampled at the vertices, so a highlight
that falls between vertices is smeared out or missed entirely: at
subdivision level 3 the sphere showed almost no highlight (the brightest
point of the highlight falls inside a triangle, not on a vertex), while at
level 6 a clear highlight appeared. It also changes shape as it
moves over the mesh, revealing the triangles. With Phong shading (W0405)
the specular term is evaluated at every pixel, so the highlight is round and
sharp already at level 3, even though the sphere's silhouette is still
visibly polygonal.

## b) Directional light vs. point light

A **directional light** is infinitely far away. It is specified by a
direction only, the direction toward the light (`l = −l_e`) is the same at
every point of the scene, and there is no distance attenuation — like
sunlight. Our light, `l_e = (0, 0, −1)`, is directional.

A **point light** has a position `p_l` in the scene. The direction toward
the light varies over the surface, `l = normalize(p_l − p)`, and the incident
light falls off with the squared distance to the light,
`L_i = I / ‖p_l − p‖²`.

## c) Does the eye position influence the shading?

Yes, but only through the specular term. The specular term depends on the
direction toward the eye, `v = normalize(eye − p)`, through `(r · v)^s`, so
moving the eye moves the highlight across the surface — which is visible in
W0404/W0405, where the highlight slides over the sphere as the camera
orbits. The ambient and diffuse terms do not depend on the eye position
(diffuse reflection is view-independent), so without a specular term a
point on the surface has the same color from every viewpoint.

## d) Setting the specular term to (0, 0, 0)

The highlight disappears completely and the object looks matte: only the
ambient and diffuse (Lambertian) terms remain. This is what the `k_s` slider
at 0 shows in W0404/W0405.

## e) Increasing the shininess exponent

`max(r · v, 0)^s` falls off faster the larger `s` is, so the specular lobe
becomes narrower: the highlight gets smaller and more concentrated, and the
surface looks glossier (closer to a mirror). A small `s` gives a broad,
spread-out highlight, like a rougher surface. The peak brightness at
`r = v` stays `k_s L_e`. With Gouraud shading, a large `s` also makes the
highlight much easier to miss between vertices.

## f) In which coordinate space was the lighting computed?

In **world space**. The sphere's model matrix is the identity, so its vertex
positions — and its true normals `n = normalize(p)` — are already world
coordinates. The light direction `(0, 0, −1)` and the eye position (computed
every frame from the camera's orbit) are also given in world coordinates, so
`l`, `v`, `n` and `r` are all world-space vectors. The view and projection
matrices are only used to compute the vertex's clip-space position, not for
lighting. This is also why the light stays fixed while the camera orbits:
had the lighting been done in eye space with the same fixed light
direction, the light would have moved along with the camera.
