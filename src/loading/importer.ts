import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import type { Hierarchy, Model, Part, Unit } from '../model';
import { convertToMillimeters, extension, MAX_BYTES, MAX_TRIANGLES, materials, triangleCount, validateFile } from '../model';

type MeshData = { name?: string; positions: Float32Array; normals?: Float32Array; uv?: Float32Array; indices?: Uint32Array; groups?: THREE.BufferGeometry['groups']; materialNames?: string[]; color?: number[]; faces?: { first: number; last: number; color: number[] | null }[] };
type WorkerResult = { meshes: MeshData[]; hierarchy?: Hierarchy };
export type ImportProgress = { stage: string; percent?: number };
export type ImportJob = { promise: Promise<Model>; cancel: () => void };
function basename(value: string) { return decodeURIComponent(value.split(/[\\/]/).pop() || value).toLowerCase(); }

export function startImport(files: File[], units: Unit, quality: 'balanced' | 'fine', progress: (p: ImportProgress) => void): ImportJob {
  let worker: Worker | null = null, cancelled = false, rejectTask: ((e: Error) => void) | null = null;
  const urls: string[] = []; let timer: number | undefined;
  const cancel = () => { cancelled = true; worker?.terminate(); rejectTask?.(new Error('Import cancelled. The current model is unchanged.')); };
  const promise = (async () => {
    const supported = files.filter(f => ['stl','obj','step','stp'].includes(extension(f.name)));
    if (supported.length !== 1) throw new Error('Choose one STL, STEP/STP or OBJ model, plus optional OBJ material and texture files.');
    if(new Set(files.map(f=>basename(f.name))).size!==files.length)throw new Error('Duplicate companion filenames are ambiguous. Rename conflicting assets and update the MTL before importing.');
    const file = supported[0]; validateFile(file);
    if (files.reduce((s,f)=>s+f.size,0) > MAX_BYTES) throw new Error('Combined uploads exceed 40 MB. Choose a smaller model and textures.');
    progress({stage:'Reading local file',percent:0});
    const bytes = await file.arrayBuffer(); if (cancelled) throw new Error('Import cancelled.');
    progress({stage:'Reading local file',percent:100});
    const step = ['step','stp'].includes(extension(file.name));
    const result = await new Promise<WorkerResult>((resolve,reject) => {
      rejectTask = reject;
      worker = step ? new Worker('/occt/step.worker.js') : new Worker(new URL('./mesh.worker.ts',import.meta.url),{type:'module'});
      timer = window.setTimeout(() => { worker?.terminate(); reject(new Error('Import exceeded two minutes. Retry with Balanced tessellation or a smaller file.')); },120000);
      worker.onmessage = event => { const data = event.data; if(data.error) reject(new Error(data.error)); else if(data.stage)progress({stage:data.stage}); else resolve(data); };
      worker.onerror = () => reject(new Error('The local parser could not start or ran out of memory. Reload and try a smaller model.'));
      worker.postMessage({bytes,format:extension(file.name),quality},[bytes]);
    });
    (worker as Worker | null)?.terminate(); worker = null; clearTimeout(timer);
    if(cancelled) throw new Error('Import cancelled.');
    const count = result.meshes.reduce((s,m)=>s+(m.indices?.length??m.positions.length/3)/3,0);
    if(!count||count>MAX_TRIANGLES||result.meshes.length>200)throw new Error('Use geometry with 1–800,000 triangles and no more than 200 components.');
    progress({stage:'Building inspection surfaces'});
    const warnings: string[] = [];
    const textureFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
    const fileURLs = new Map<string,string>(); textureFiles.forEach(f=>{const url=URL.createObjectURL(f); urls.push(url);fileURLs.set(basename(f.name),url);});
    let creator: MTLLoader.MaterialCreator | null = null;
    const mtl = files.find(f=>extension(f.name)==='mtl');
    if(!step && extension(file.name)==='obj' && mtl){
      const text=await mtl.text();
      // Never fetch URLs found inside an uploaded material file. All texture names must resolve locally.
      for(const line of text.split(/\r?\n/))if(/^\s*(map_|bump|disp|decal)/i.test(line)){
        const name=line.trim().split(/\s+/).pop()!;
        if(!fileURLs.has(basename(name)))throw new Error(`Missing local texture: ${name}. Select the OBJ, MTL and every referenced PNG/JPEG/WebP together.`);
      }
      let finish!:()=>void; const loaded=new Promise<void>(resolve=>{finish=resolve;});let pending=0;
      const manager=new THREE.LoadingManager();manager.setURLModifier(url=>{const local=fileURLs.get(basename(url));if(!local)throw new Error('External texture requests are not permitted.');pending++;return local;});
      manager.onLoad=()=>finish();manager.onError=()=>warnings.push('A local texture could not be decoded.');
      creator=new MTLLoader(manager).parse(text,'');creator.preload();if(pending)await loaded;
    } else if(extension(file.name)==='obj') warnings.push('No MTL supplied: neutral inspection material. OBJ/STL units are user supplied.');
    if(cancelled)throw new Error('Import cancelled.');
    const group=new THREE.Group(),scale=step?1:convertToMillimeters(1,units); const created: Part[]=[];
    try {
      result.meshes.forEach((data,i)=>{
        for(const n of data.positions)if(!Number.isFinite(n))throw new Error('The model contains invalid vertex coordinates.');
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));if(data.normals)geometry.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));if(data.uv)geometry.setAttribute('uv',new THREE.BufferAttribute(data.uv,2));if(data.indices)geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
        if(!data.normals)geometry.computeVertexNormals();geometry.scale(scale,scale,scale);geometry.computeBoundingBox();const center=geometry.boundingBox!.getCenter(new THREE.Vector3());geometry.translate(-center.x,-center.y,-center.z);
        let mat: THREE.Material|THREE.Material[]=new THREE.MeshStandardMaterial({color:data.color?new THREE.Color().setRGB(...data.color as [number,number,number]):'#b9c8ce',metalness:.58,roughness:.35});
        if(creator&&data.materialNames?.length){(mat as THREE.Material).dispose();const imported=data.materialNames.map(n=>creator!.create(n));data.groups?.forEach(g=>geometry.addGroup(g.start,g.count,g.materialIndex));mat=imported.length===1?imported[0]:imported;}
        else if(data.faces?.some(f=>f.color)){
          const faceMaterials: THREE.Material[]=[]; (mat as THREE.Material).dispose();
          data.faces.forEach(face=>{const color=face.color??data.color??[.72,.77,.8];const m=new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(...color as [number,number,number]),metalness:.58,roughness:.35});faceMaterials.push(m);geometry.addGroup(face.first*3,(face.last-face.first+1)*3,faceMaterials.length-1);});mat=faceMaterials;
        }
        const mesh=new THREE.Mesh(geometry,mat);mesh.position.copy(center);mesh.userData.partId=`import-${i}`;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
        created.push({id:`import-${i}`,name:data.name||`Mesh ${i+1}`,material:creator?'Imported MTL':step?'STEP appearance':'Neutral inspection material',color:'#b9c8ce',mesh,origin:center.clone(),rotation:mesh.rotation.clone(),explode:new THREE.Vector3(),stage:'gears',description:step?'Tessellated from STEP locally. Inspection uses the resulting mesh, not exact B-rep geometry.':'Imported mesh surface. Source units are supplied by the user.',metadata:step?{'B-rep face ranges':data.faces?.length??0}:undefined});
      });
      const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
      if(!Number.isFinite(size.length())||size.length()<=0)throw new Error('The model has no measurable extent.');
      // Only actual separate meshes can explode; generic imports use a display spread, not invented mechanical semantics.
      created.forEach((p,i)=>{p.origin.sub(center);p.mesh.position.copy(p.origin);if(created.length>1){p.explode.copy(p.origin).normalize().multiplyScalar(size.length()*.45);if(!p.explode.length())p.explode.set(0,(i+1)*size.length()*.15,0);}});
      progress({stage:'Ready to inspect',percent:100});
      return {name:file.name.replace(/\.[^.]+$/,'').replace(/[_-]/g,' '),source:`${extension(file.name).toUpperCase()} · ${(file.size/1024/1024).toFixed(2)} MB · local`,parts:created,group,size,triangles:created.reduce((s,p)=>s+triangleCount(p.mesh.geometry),0),demo:false,hierarchy:result.hierarchy,warnings,metadata:{Format:extension(file.name).toUpperCase(),Units:step?'STEP units converted to mm':`${units} assumed by user`,Pipeline:step?'Open Cascade / WASM, local worker':'Three.js mesh parser, local worker',...(step?{Tessellation:quality==='fine'?'0.0005 bounding-box ratio':'0.002 bounding-box ratio'}:{})}} as Model;
    } catch(e){created.forEach(p=>{p.mesh.geometry.dispose();materials(p.mesh).forEach(m=>m.dispose());});throw e;}
  })().finally(()=>{clearTimeout(timer);worker?.terminate();urls.forEach(u=>URL.revokeObjectURL(u));});
  return {promise,cancel};
}
