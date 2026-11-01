import * as THREE from 'three';
import type { Model } from '../model';
import { componentLabels, modelFingerprint } from '../workspace/modelUtils';
import { createMeasurement, measurePoint } from '../workspace/measure';
import type { InspectionState, LibraryRecord, Sample } from './types';
import { PIPELINE } from './types';
import { sanitizeAppearance } from '../presentation/appearance';

// Stable source hierarchy/name/ordinal, independent of display-name and tessellation.
export function partKeys(model: Model) { const labels=componentLabels(model);return model.parts.map(p=>{const l=labels.get(p.id)!;return [...l.path,p.name,`#${l.instance??1}`].join('/');}); }
export function sampleRecord(s: Sample): LibraryRecord { const now=Date.now();return {version:1,id:`sample:${s.id}`,sampleId:s.id,name:s.name,kind:'sample',created:now,updated:now,opened:0,favorite:false,format:s.format,description:s.description,category:s.category,files:[],totalBytes:0,sourceHash:s.hash,sourceUnits:s.sourceUnits,quality:'balanced',orientation:s.orientation,partCount:s.parts,triangles:s.triangles,bounds:s.bounds}; }
export function compatibleState(state: InspectionState | undefined, model: Model) {
  if(!state)return {state:undefined,warning:''};
  const keys=partKeys(model);
  if(state.version!==1||state.pipeline!==PIPELINE||!Array.isArray(state.partKeys)||JSON.stringify(keys)!==JSON.stringify(state.partKeys))return {state:undefined,warning:'Saved inspection state is incompatible with this importer/component structure. Originals opened safely; prior state retained in the library for backup.'};
  try{
    const ids=new Set(model.parts.map(p=>p.id));const validVec=(x:unknown)=>Array.isArray(x)&&x.length===3&&x.every(Number.isFinite);
    const c=state.camera;
    if(c&&(!validVec(c.position)||!validVec(c.target)||!validVec(c.up)||!Number.isFinite(c.zoom)||!Number.isFinite(c.orthoHeight)||!Number.isFinite(c.fov)))throw new Error();
    if(!['solid','wireframe','edges','clay','xray'].includes(state.style)||!state.section||!['x','y','z'].includes(state.section.axis)||!Number.isFinite(state.section.position)||!Number.isFinite(state.explode))throw new Error();
    const measurements=state.measurements.map(m=>{if(!validVec(m.a.local)||!validVec(m.b.local))throw new Error();const a=measurePoint(model,m.a.partId,new THREE.Vector3(...m.a.local)),b=measurePoint(model,m.b.partId,new THREE.Vector3(...m.b.local));if(!a||!b)throw new Error();return {...createMeasurement(a,b,m.index),id:m.id};});
    const fp=modelFingerprint(model),views=state.views.map(v=>({...v,fingerprint:fp,modelName:model.name}));
    return {state:{...state,appearance:sanitizeAppearance(state.appearance,model.demo,ids),hidden:state.hidden.filter(id=>ids.has(id)),selected:state.selected&&ids.has(state.selected)?state.selected:null,measurements,views},warning:''};
  }catch{return {state:undefined,warning:'Saved inspection state was malformed. Opened original model without applying it; stored state was not overwritten.'};}
}
