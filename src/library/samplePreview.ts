import * as THREE from 'three';
import { sampleFiles } from './catalog';
import type { Sample } from './types';
import type { Model, Part } from '../model';
import { disposeModel } from '../model';
import { loadShowcase } from '../showcase/load';
import { startImport } from '../loading/importer';

type Range = {offset:number; count:number};
type MeshSpec = {name:string; color?:number[]; positions:Range; normals:Range|null; indices:Range; faces?:{first:number;last:number;color:number[]|null}[]};
type PreviewAsset = {version:number; sampleId:string; sourceHash:string; binarySha256:string; bytes:number; triangles:number; meshes:MeshSpec[]};
// Source identity includes the whole product, not just the shared gearbox hash.
export function samplePreviewKey(sample:Sample) {
  return `sample:${sample.id}|${sample.hash}|${sample.sourceUnits}|${sample.orientation}|solid-preview-v4`;
}
export async function loadSamplePreview(sample:Sample, signal:AbortSignal):Promise<Model> {
  if (sample.id==='axis-1') return loadShowcase();
  if (!['planetary','bevel'].includes(sample.id)) {
    const files=await sampleFiles(sample,signal);
    const job=startImport(files,sample.sourceUnits,'balanced',()=>{});
    const cancel=()=>job.cancel();signal.addEventListener('abort',cancel,{once:true});
    try { return await job.promise; } finally {signal.removeEventListener('abort',cancel);}
  }
  // Prepared display meshes use the exact same balanced OCCT tessellation as
  // full inspection. Never swap originals; full viewer still imports the STEP.
  const [metaResponse,binaryResponse]=await Promise.all([
    fetch(`/samples/${sample.id}/preview.json`,{signal}),fetch(`/samples/${sample.id}/preview.bin`,{signal})]);
  if(!metaResponse.ok||!binaryResponse.ok)throw new Error('Prepared preview unavailable. Open the source model to inspect.');
  const meta=await metaResponse.json() as PreviewAsset, data=await binaryResponse.arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',data);
  const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(meta.version!==1||meta.sampleId!==sample.id||meta.sourceHash!==sample.hash||hash!==meta.binarySha256||data.byteLength!==meta.bytes||meta.meshes.length!==sample.parts||meta.triangles!==sample.triangles)throw new Error('Preview source verification failed. Original model remains available.');
  const group=new THREE.Group(), parts:Part[]=[];
  const model:Model={name:sample.name,source:'Verified prepared STEP preview',group,parts,size:new THREE.Vector3(),triangles:meta.triangles,demo:false};
  try {
    meta.meshes.forEach((spec,index)=>{
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(data,spec.positions.offset,spec.positions.count),3));
      if(spec.normals)geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(data,spec.normals.offset,spec.normals.count),3));else geometry.computeVertexNormals();
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data,spec.indices.offset,spec.indices.count),1));
      geometry.computeBoundingBox();const center=geometry.boundingBox!.getCenter(new THREE.Vector3());geometry.translate(-center.x,-center.y,-center.z);
      const material=(color?:number[]|null)=>new THREE.MeshStandardMaterial({color:color?new THREE.Color().setRGB(...color as [number,number,number]):'#b9c8ce',metalness:.58,roughness:.35});
      let appearance:THREE.Material|THREE.Material[];
      if(spec.faces?.some(face=>face.color))appearance=spec.faces.map((face,i)=>{geometry.addGroup(face.first*3,(face.last-face.first+1)*3,i);return material(face.color??spec.color);});else appearance=material(spec.color);
      const mesh=new THREE.Mesh(geometry,appearance),id=`import-${index}`;mesh.position.copy(center);mesh.userData.partId=id;group.add(mesh);
      parts.push({id,name:spec.name,mesh,origin:center.clone(),rotation:mesh.rotation.clone(),explode:new THREE.Vector3(),stage:'gears',material:'STEP appearance',color:'#b9c8ce',description:'Faithful balanced tessellation of the bundled STEP.'});
    });
    const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3());box.getSize(model.size);
    parts.forEach(part=>{part.origin.sub(center);part.mesh.position.copy(part.origin);});
    return model;
  } catch(error) {disposeModel(model);throw error;}
}
