/**
 * A stackless, object-space BVH. Built once on the CPU; all optical rays traverse
 * the STL-derived optical mesh on the GPU. Rotation never requires rebuilding it.
 *
 * Node: three vec4s (bounds minimum + escape, maximum + first, count + padding).
 * Triangle: three vec4s (origin, edge AB, edge AC). Leaves contain <= 8 triangles.
 */
import { MeshoptSimplifier } from "meshoptimizer/simplifier";

export type MeshBvh = { nodes: Float32Array<ArrayBuffer>; triangles: Float32Array<ArrayBuffer>; nodeCount: number };

/**
 * Keep the complete STL for rasterized silhouettes. A bounded-error optical LOD
 * removes small surface triangles from the ray queries only.
 */
export async function opticalMesh(vertices: Float32Array): Promise<Float32Array<ArrayBuffer>> {
  await MeshoptSimplifier.ready;
  const positions: number[] = [];
  const unique = new Map<string, number>();
  const indices = new Uint32Array(vertices.length / 6);
  for (let i = 0; i < indices.length; i++) {
    const xyz = [...vertices.subarray(i * 6, i * 6 + 3)];
    const key = xyz.map(v => Math.round(v * 100000)).join(",");
    let index = unique.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      unique.set(key, index);
      positions.push(...xyz);
    }
    indices[i] = index;
  }
  const points = new Float32Array(positions);
  // Target 384 triangles; the 1% relative error cap takes precedence.
  const [simplified] = MeshoptSimplifier.simplify(indices, points, 3, 384 * 3, 0.01);
  const result = new Float32Array(simplified.length * 6);
  simplified.forEach((index, i) => result.set(points.subarray(index * 3, index * 3 + 3), i * 6));
  return result;
}

export function buildMeshBvh(vertices: Float32Array): MeshBvh {
  if (!vertices.length || vertices.length % 18 !== 0) throw new Error("Invalid STL vertex buffer");
  const count = vertices.length / 18;
  const bounds = new Float32Array(count * 6);
  const centers = new Float32Array(count * 3);
  for (let t = 0; t < count; t++) {
    for (let axis = 0; axis < 3; axis++) {
      const a = vertices[t * 18 + axis];
      const b = vertices[t * 18 + 6 + axis];
      const c = vertices[t * 18 + 12 + axis];
      if (![a, b, c].every(Number.isFinite)) throw new Error("Non-finite STL coordinates");
      bounds[t * 6 + axis] = Math.min(a, b, c) - 1e-5;
      bounds[t * 6 + 3 + axis] = Math.max(a, b, c) + 1e-5;
      centers[t * 3 + axis] = (a + b + c) / 3;
    }
  }
  const nodes: number[] = [];
  const ordered: number[] = [];
  function branch(ids: number[]) {
    const node = nodes.length / 12;
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const id of ids) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], bounds[id * 6 + axis]);
        max[axis] = Math.max(max[axis], bounds[id * 6 + axis + 3]);
      }
    }
    nodes.push(...min, 0, ...max, ordered.length, 0, 0, 0, 0);
    if (ids.length <= 8) {
      nodes[node * 12 + 8] = ids.length;
      ordered.push(...ids);
    } else {
      const span = max.map((value, axis) => value - min[axis]);
      const axis = span.indexOf(Math.max(...span));
      ids.sort((a, b) => centers[a * 3 + axis] - centers[b * 3 + axis]);
      const middle = Math.floor(ids.length / 2);
      branch(ids.slice(0, middle));
      branch(ids.slice(middle));
    }
    nodes[node * 12 + 3] = nodes.length / 12;
  }
  branch(Array.from({ length: count }, (_, index) => index));
  const triangles = new Float32Array(count * 12);
  ordered.forEach((id, t) => {
    for (let axis = 0; axis < 3; axis++) {
      const a = vertices[id * 18 + axis];
      triangles[t * 12 + axis] = a;
      triangles[t * 12 + 4 + axis] = vertices[id * 18 + 6 + axis] - a;
      triangles[t * 12 + 8 + axis] = vertices[id * 18 + 12 + axis] - a;
    }
  });
  return { nodes: new Float32Array(nodes), triangles, nodeCount: nodes.length / 12 };
}
