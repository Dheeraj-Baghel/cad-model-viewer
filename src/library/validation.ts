import type { LibraryRecord,InspectionState } from './types';
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const string=(v:unknown,max=1000)=>typeof v==='string'&&v.length<=max;
const num=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const vec=(v:unknown)=>Array.isArray(v)&&v.length===3&&v.every(x=>num(x,-1e12,1e12));
const strings=(v:unknown,max=1000)=>Array.isArray(v)&&v.length<=max&&v.every(x=>string(x));
const one=(v:unknown,values:string[])=>typeof v==='string'&&values.includes(v);
const orientation=(v:unknown)=>one(v,['auto','y','z']);
export function validCamera(c:unknown){return object(c)&&one(c.projection,['perspective','orthographic'])&&vec(c.position)&&vec(c.target)&&vec(c.up)&&c.up.some((v:number)=>Math.abs(v)>0)&&num(c.zoom,.001,1000)&&num(c.orthoHeight,.001,1e12)&&num(c.fov,1,170);}
const section=(s:unknown)=>object(s)&&typeof s.enabled==='boolean'&&one(s.axis,['x','y','z'])&&num(s.position,0,100)&&typeof s.flip==='boolean';
const style=(s:unknown)=>one(s,['solid','wireframe','edges','clay','xray']);
const appearance=(s:unknown)=>object(s)&&['studio','inspect'].every(mode=>object(s[mode])&&one(s[mode].material,['original','authored','steel','aluminum','brass','plastic'])&&object(s[mode].parts)&&Object.keys(s[mode].parts).length<=200&&Object.entries(s[mode].parts).every(([id,v])=>!['__proto__','constructor','prototype'].includes(id)&&one(v,['original','authored','steel','aluminum','brass','plastic'])));
export function validView(v:unknown){return object(v)&&v.version===1&&string(v.id)&&string(v.name)&&string(v.fingerprint)&&string(v.modelName)&&num(v.created)&&num(v.partCount,0,200)&&validCamera(v.camera)&&strings(v.hidden,200)&&num(v.explode,0,1)&&section(v.section)&&style(v.style)&&(v.appearance===undefined||appearance(v.appearance))&&(v.lighting===undefined||one(v.lighting,['studio','inspect']))&&(v.orientation===undefined||orientation(v.orientation))&&(v.transparency===undefined||num(v.transparency,0,95));}
export function validInspection(s:unknown):s is InspectionState{
 if(!object(s)||s.version!==1||!string(s.pipeline)||!strings(s.partKeys,200)||!(s.camera===null||validCamera(s.camera))||!strings(s.hidden,200)||!(s.selected===null||string(s.selected))||!appearance(s.appearance)||!one(s.mode,['studio','inspect'])||!style(s.style)||!num(s.explode,0,1)||!section(s.section)||!num(s.transparency,0,95)||!one(s.background,['graphite','light','technical'])||typeof s.grid!=='boolean'||typeof s.axes!=='boolean'||!num(s.environmentRotation,-180,180)||!one(s.units,['mm','cm','in'])||!Array.isArray(s.measurements)||s.measurements.length>1000||!Array.isArray(s.views)||s.views.length>1000||!s.views.every(validView))return false;
 return s.measurements.every(m=>object(m)&&string(m.id)&&num(m.index,1,100000)&&num(m.distance)&&vec(m.delta)&&[m.a,m.b].every(p=>object(p)&&string(p.partId)&&vec(p.local)&&vec(p.assembled)));
}
export function validateRecord(v:unknown):v is LibraryRecord{
 if(!object(v)||v.version!==1||!string(v.id,200)||!string(v.name,500)||!one(v.kind,['import','sample'])||!string(v.sourceHash)||! /^[a-f0-9]{64}$/.test(v.sourceHash)||!Array.isArray(v.files)||v.files.length>64)return false;
 if(!v.files.every(f=>object(f)&&string(f.name,500)&&string(f.mime,200)&&num(f.lastModified)&&string(f.hash)&&/^[a-f0-9]{64}$/.test(f.hash)&&num(f.bytes,0,40*1024*1024)))return false;
 return v.files.reduce((n,f)=>n+f.bytes,0)<=40*1024*1024&&num(v.created)&&num(v.updated)&&num(v.opened)&&typeof v.favorite==='boolean'&&string(v.format,100)&&string(v.category,100)&&string(v.description,10000)&&num(v.totalBytes,0,40*1024*1024)&&num(v.partCount,0,200)&&num(v.triangles,0,800000)&&vec(v.bounds)&&v.bounds.every((x:number)=>x>=0)&&orientation(v.orientation)&&one(v.sourceUnits,['mm','cm','in'])&&one(v.quality,['balanced','fine'])&&(v.stateRevision===undefined||num(v.stateRevision,0,1e12))&&(v.state===undefined||validInspection(v.state))&&(v.thumbnail===undefined||v.thumbnail instanceof Blob&&v.thumbnail.size<=4*1024*1024);
}
