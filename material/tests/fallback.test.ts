import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStlMeshes } from '../src/stl.ts';
import { opticalMesh } from '../src/mesh-bvh.ts';
import { fallbackMesh, projectFallbackMesh } from '../src/fallback-mesh.ts';

const data=readFileSync(new URL('../models/8-crystals.stl',import.meta.url));
const meshes=parseStlMeshes(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
for(let index=0;index<meshes.length;index++)test(`CPU preview ${index+1} retains all simplified faces with valid normals`,async()=>{
  const source=meshes[index],before=new Float32Array(source.vertices);
  const simplified=await opticalMesh(source.vertices);
  const result=fallbackMesh(source,simplified);
  assert.equal(result.triangleCount,simplified.length/18);
  assert.equal(result.vertexCount,result.triangleCount*3);
  assert.deepEqual(source.vertices,before);
  for(let i=0;i<result.vertices.length;i+=6){
    assert.deepEqual(result.vertices.slice(i,i+3),simplified.slice(i,i+3));
    const length=Math.hypot(...result.vertices.slice(i+3,i+6));
    assert.ok(length<1e-5||Math.abs(length-1)<1e-5);
  }
  for(const [yaw,pitch] of [[0,0],[.75,.25],[1.6,-.6]]){
    const faces=projectFallbackMesh(result,yaw,pitch);
    assert.equal(faces.length,result.triangleCount,'render must not skip faces');
    assert.ok(faces.every(face=>face.points.length===6&&face.points.every(Number.isFinite)));
    assert.ok(faces.every((face,i)=>i===0||face.z>=faces[i-1].z));
  }
});
test('invalid CPU mesh input fails explicitly',()=>{
  assert.throws(()=>fallbackMesh(meshes[0],new Float32Array(0)),/Invalid/);
  assert.throws(()=>fallbackMesh(meshes[0],new Float32Array(17)),/Invalid/);
  assert.throws(()=>fallbackMesh(meshes[0],new Float32Array(18).fill(NaN)),/Invalid/);
});
