// Converts the course's teapot generator (../teapotData.js, which tessellates
// the Utah teapot's Bezier patches in JavaScript) into a Wavefront OBJ triangle
// mesh, so that it can be loaded with readOBJFile like any other OBJ model.
//
// Usage, from this folder:  node export_teapot_obj.js
"use strict";
const fs = require("fs");
const vm = require("vm");
vm.runInThisContext(fs.readFileSync("../MV.js", "utf8"));
vm.runInThisContext(fs.readFileSync("../teapotData.js", "utf8"));

const DIVISIONS = 8;
const data = teapot(DIVISIONS);
const points = data.TriangleVertices.map(p => p.slice(0, 3));
const normals = data.Normals.map(n => n.slice(0, 3));

const positionKey = p => p.map(x => x.toFixed(6)).join(" ");
const faceNormal = (a, b, c) => cross(subtract(b, a), subtract(c, a));

// Patch corners that collapse to a single point (the top of the lid and the
// center of the bottom) produce zero-area triangles, which are skipped.
const triangles = [];
for (let i = 0; i < points.length; i += 3) {
  const [a, b, c] = [points[i], points[i + 1], points[i + 2]];
  if (length(faceNormal(a, b, c)) > 1e-9) triangles.push([i, i + 1, i + 2]);
}

// At those collapsed points the generator's normal is zero. Use the average
// of the surrounding triangles' normals there instead (straight up or down).
const averagedNormal = new Map();
for (const [i, j, k] of triangles) {
  const n = faceNormal(points[i], points[j], points[k]);
  for (const v of [i, j, k]) {
    if (length(normals[v]) > 1e-6) continue;
    const key = positionKey(points[v]);
    averagedNormal.set(key, add(averagedNormal.get(key) || [0, 0, 0], n));
  }
}
function normalAt(v) {
  if (length(normals[v]) > 1e-6) return normalize(normals[v].slice());
  return normalize(averagedNormal.get(positionKey(points[v])).slice());
}

// Vertices with the same position and normal become one OBJ vertex, so the
// result is an indexed face set rather than a list of separate triangles.
const vertexIndex = new Map();
const vLines = [], vnLines = [], fLines = [];
function objIndex(v) {
  const n = normalAt(v);
  const key = positionKey(points[v]) + " " + positionKey(n);
  if (!vertexIndex.has(key)) {
    vertexIndex.set(key, vertexIndex.size + 1); // OBJ indices are 1-based
    vLines.push("v " + positionKey(points[v]));
    vnLines.push("vn " + positionKey(n));
  }
  return vertexIndex.get(key);
}
for (const [i, j, k] of triangles) {
  const [a, b, c] = [objIndex(i), objIndex(j), objIndex(k)];
  fLines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
}

const header = [
  "# Utah teapot, exported to OBJ by export_teapot_obj.js from the course's",
  `# teapotData.js (32 Bezier patches, ${DIVISIONS} divisions per patch side).`,
  `# ${vLines.length} vertices, ${fLines.length} triangles, counter-clockwise seen from outside.`,
];
fs.writeFileSync("teapot.obj", [...header, ...vLines, ...vnLines, ...fLines].join("\n") + "\n");
console.log(`Wrote teapot.obj: ${vLines.length} vertices, ${fLines.length} triangles.`);
