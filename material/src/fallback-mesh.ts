import type { StlMesh } from "./stl";

/**
 * A simplified mesh must keep EVERY triangle produced by the simplifier.
 * Skipping source triangles is not simplification: it opens holes in the shell.
 * opticalMesh stores positions only, so reconstruct face normals for CPU shading.
 */
export function fallbackMesh(source: StlMesh, positions: Float32Array): StlMesh {
  if (!positions.length || positions.length % 18 !== 0 || !positions.every(Number.isFinite)) {
    throw new Error("Invalid fallback mesh");
  }
  const vertices = new Float32Array(positions);
  for (let offset = 0; offset < vertices.length; offset += 18) {
    const ax = vertices[offset + 6] - vertices[offset];
    const ay = vertices[offset + 7] - vertices[offset + 1];
    const az = vertices[offset + 8] - vertices[offset + 2];
    const bx = vertices[offset + 12] - vertices[offset];
    const by = vertices[offset + 13] - vertices[offset + 1];
    const bz = vertices[offset + 14] - vertices[offset + 2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const length = Math.hypot(nx, ny, nz) || 1;
    for (let vertex = 0; vertex < 3; vertex++) {
      vertices[offset + vertex * 6 + 3] = nx / length;
      vertices[offset + vertex * 6 + 4] = ny / length;
      vertices[offset + vertex * 6 + 5] = nz / length;
    }
  }
  return { vertices, vertexCount: vertices.length / 6, triangleCount: vertices.length / 18, extent: source.extent };
}

/** Painter order uses all faces; no WebGPU dependency or source geometry mutation. */
export function projectFallbackMesh(mesh: StlMesh, yaw: number, pitch: number) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  function rotate(x: number, y: number, z: number): [number, number, number] {
    const rx = x * cy + z * sy, rz = -x * sy + z * cy;
    return [rx, y * cx - rz * sx, y * sx + rz * cx];
  }
  const triangles: Array<{ z: number; points: number[]; normal: [number, number, number] }> = [];
  for (let tri = 0; tri < mesh.triangleCount; tri++) {
    const offset = tri * 18, points: number[] = [];
    let depth = 0;
    for (let vertex = 0; vertex < 3; vertex++) {
      const base = offset + vertex * 6;
      const [x, y, z] = rotate(mesh.vertices[base], mesh.vertices[base + 1], mesh.vertices[base + 2]);
      points.push(x, -y); depth += z;
    }
    triangles.push({
      z: depth / 3, points,
      normal: rotate(mesh.vertices[offset + 3], mesh.vertices[offset + 4], mesh.vertices[offset + 5]),
    });
  }
  return triangles.sort((a, b) => a.z - b.z);
}
