import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStlMeshes } from '../src/stl.ts';
import { buildMeshBvh, opticalMesh } from '../src/mesh-bvh.ts';

const bytes = readFileSync(new URL('../models/8-crystals.stl', import.meta.url));
const meshes = parseStlMeshes(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));

test('the original eight STL clusters and every source triangle are retained',()=>{
  assert.equal(meshes.length,8);
  assert.equal(meshes.reduce((n,m)=>n+m.triangleCount,0),86056);
  assert.deepEqual(meshes.map(m=>m.triangleCount),[10164,4592,25340,6762,6762,10164,12096,10176]);
  for(const mesh of meshes){
    assert.equal(mesh.vertices.length,mesh.triangleCount*18);
    assert.ok(mesh.vertices.every(Number.isFinite));
    for(let i=0;i<mesh.vertices.length;i+=6){
      assert.ok(Math.max(...mesh.vertices.subarray(i,i+3).map(Math.abs))<=1.026);
      assert.ok(Math.abs(Math.hypot(...mesh.vertices.subarray(i+3,i+6))-1)<1e-5);
    }
  }
});

test('truncated or empty STL input fails instead of producing an invalid GPU buffer',()=>{
  assert.throws(()=>parseStlMeshes(new ArrayBuffer(20)),/header/);
  assert.throws(()=>parseStlMeshes(new ArrayBuffer(84)),/eight/);
  const bad=new ArrayBuffer(84);new DataView(bad).setUint32(80,999,true);
  assert.throws(()=>parseStlMeshes(bad),/incomplete/);
  assert.throws(()=>buildMeshBvh(new Float32Array(17)),/Invalid/);
  assert.throws(()=>buildMeshBvh(new Float32Array(18).fill(NaN)),/Non-finite/);
});

for(let index=0;index<8;index++)test(`optical LOD ${index+1}: bounded BVH, finite data, complete leaf coverage`,async()=>{
  const original=meshes[index];
  const lod=await opticalMesh(original.vertices);
  assert.ok(lod.length>0&&lod.length<=original.vertices.length);
  const {nodes,triangles,nodeCount}=buildMeshBvh(lod);
  assert.ok(nodes.every(Number.isFinite)&&triangles.every(Number.isFinite));
  assert.equal(nodes[3],nodeCount);
  let covered=0;
  for(let n=0;n<nodeCount;n++){
    const p=n*12,escape=nodes[p+3],first=nodes[p+7],count=nodes[p+8];
    assert.ok(escape>n&&escape<=nodeCount,'stackless traversal always advances');
    assert.ok(count>=0&&count<=8);
    for(let i=first;i<first+count;i++)for(let axis=0;axis<3;axis++){
      const a=triangles[i*12+axis];
      const values=[a,a+triangles[i*12+4+axis],a+triangles[i*12+8+axis]];
      for(const value of values)assert.ok(value>=nodes[p+axis]-1e-6&&value<=nodes[p+4+axis]+1e-6);
    }
    covered+=count;
  }
  assert.equal(covered,lod.length/18);
  assert.equal(covered,triangles.length/12);
  assert.ok(nodeCount<2048,'optical acceleration remains bounded on all eight models');
});
