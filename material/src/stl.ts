export type StlMesh = {
  vertices: Float32Array<ArrayBuffer>;
  vertexCount: number;
  triangleCount: number;
  extent: [number, number, number];
};

export function parseStlMeshes(buffer: ArrayBuffer): StlMesh[] {
  const view = new DataView(buffer);
  if (buffer.byteLength < 84) throw new Error("STL header is incomplete");
  const triangleCount = view.getUint32(80,true);
  if (84 + triangleCount * 50 > buffer.byteLength) throw new Error("STL triangle table is incomplete");

  const centroids: Array<{triangle:number;x:number}> = new Array(triangleCount);
  for (let triangle=0; triangle<triangleCount; triangle++) {
    const base=84+triangle*50+12;
    const x=(view.getFloat32(base,true)+view.getFloat32(base+12,true)+view.getFloat32(base+24,true))/3;
    centroids[triangle]={triangle,x};
  }
  const sorted=centroids.slice().sort((a,b)=>a.x-b.x);
  const gaps=sorted.slice(1).map((item,index)=>({index:index+1,size:item.x-sorted[index].x})).sort((a,b)=>b.size-a.size).slice(0,7).sort((a,b)=>a.index-b.index);
  if(gaps.length!==7) throw new Error("STL does not contain eight spatial clusters");
  const thresholds=gaps.map((gap)=>(sorted[gap.index-1].x+sorted[gap.index].x)/2);
  const groups:number[][]=Array.from({length:8},()=>[]);
  centroids.forEach(({triangle,x})=>{
    let cluster=0; while(cluster<thresholds.length && x>thresholds[cluster]) cluster++;
    groups[cluster].push(triangle);
  });

  const meshes=groups.map((triangles,cluster):StlMesh=>{
    if(!triangles.length) throw new Error(`STL cluster ${cluster+1} is empty`);
    const min=[Infinity,Infinity,Infinity]; const max=[-Infinity,-Infinity,-Infinity];
    triangles.forEach((triangle)=>{
      const base=84+triangle*50+12;
      for(let vertex=0;vertex<3;vertex++) for(let axis=0;axis<3;axis++) {
        const value=view.getFloat32(base+vertex*12+axis*4,true);
        min[axis]=Math.min(min[axis],value); max[axis]=Math.max(max[axis],value);
      }
    });
    const center=min.map((value,axis)=>(value+max[axis])/2);
    const extent=max.map((value,axis)=>value-min[axis]) as [number,number,number];
    const normalizeScale=2.05/Math.max(...extent);
    const vertices=new Float32Array(triangles.length*18);
    let cursor=0;
    triangles.forEach((triangle)=>{
      const record=84+triangle*50;
      let nx=view.getFloat32(record,true), ny=view.getFloat32(record+4,true), nz=view.getFloat32(record+8,true);
      const normalLength=Math.hypot(nx,ny,nz)||1; nx/=normalLength; ny/=normalLength; nz/=normalLength;
      for(let vertex=0;vertex<3;vertex++) {
        const base=record+12+vertex*12;
        vertices[cursor++]=(view.getFloat32(base,true)-center[0])*normalizeScale;
        vertices[cursor++]=(view.getFloat32(base+4,true)-center[1])*normalizeScale;
        vertices[cursor++]=(view.getFloat32(base+8,true)-center[2])*normalizeScale;
        vertices[cursor++]=nx; vertices[cursor++]=ny; vertices[cursor++]=nz;
      }
    });
    return {vertices,vertexCount:triangles.length*3,triangleCount:triangles.length,extent};
  });
  return meshes;
}
