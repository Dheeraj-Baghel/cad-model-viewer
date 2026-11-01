import * as THREE from 'three';
import { startImport } from '../loading/importer';
import { disposeModel } from '../model';
import { loadShowcase } from '../showcase/load';
import type { Model } from '../model';
import { AppearanceLayer } from '../presentation/appearance';
import { createStudioEnvironment } from '../presentation/studio';
import { applyOrientation } from './orientation';
import type { Orientation } from './types';

type Loader=(signal:AbortSignal)=>Promise<Model>;
type Entry={model:Model;bytes:number;used:number};
// One shared renderer. Keep a bounded CPU mesh cache instead of serializing and
// reparsing all geometry on every hover. A bounded warm GPU cache avoids shader
// stalls on re-entry; all cached assets are freed on eviction/route exit.
export class PreviewController {
  private renderer:THREE.WebGLRenderer|null=null;
  private environment:THREE.WebGLRenderTarget|null=null;
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(34,4/3,.1,1000);
  private model:Model|null=null;
  private generation=0;private raf=0;private disposed=false;
  private host:HTMLElement|null=null;private angle=.7;private radius=1;
  private center=new THREE.Vector3();private offset=new THREE.Vector3();
  private observer:ResizeObserver|null=null;private frames=0;private releases=0;private lastTime=0;
  private width=0;private height=0;private resizes=0;private conversions=0;private hits=0;
  private cache=new Map<string,Entry>();
  private pending=new Map<string,{promise:Promise<Model>;abort:AbortController}>();
  private liveKey='';private readyMs=0;
  private warmed=new Set<Model>();private warmQueue:Promise<void>=Promise.resolve();
  private warmTarget:THREE.WebGLRenderTarget|null=null;
  private layers=new Map<Model,AppearanceLayer>();
  private appearanceFor(model:Model){let layer=this.layers.get(model);if(!layer){layer=new AppearanceLayer(model);this.layers.set(model,layer);}for(const part of model.parts)part.mesh.material=layer.apply(part.id,model.demo?'authored':'original','solid',false,false,0);return layer;}
  private releaseModel(model:Model){this.layers.get(model)?.dispose();this.layers.delete(model);this.warmed.delete(model);disposeModel(model);}
  constructor(){
    this.scene.background=new THREE.Color('#1b222a');
    this.scene.add(new THREE.HemisphereLight('#f0f5ff','#3b4149',1.2));
    const light=new THREE.DirectionalLight('#fff2df',2);light.position.set(2,4,5);this.scene.add(light);
    const fill=new THREE.DirectionalLight('#b9d4ff',.7);fill.position.set(-3,1,-3);this.scene.add(fill);
  }
  private ensureRenderer(){
    if(this.renderer)return;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.toneMapping=THREE.AgXToneMapping;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.domElement.className='card-preview-canvas';this.renderer.domElement.setAttribute('aria-hidden','true');
    // Metal surfaces need soft image-based light; directional light alone made
    // the authored actuator dark and faceted. Reuse the inspection studio.
    const pmrem=new THREE.PMREMGenerator(this.renderer),studio=createStudioEnvironment();
    this.environment=pmrem.fromScene(studio,.035);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.9;
    studio.traverse(object=>{const mesh=object as THREE.Mesh;mesh.geometry?.dispose();(mesh.material as THREE.Material|undefined)?.dispose();});pmrem.dispose();
  }
  private bytes(model:Model){
    const geometries=new Set<THREE.BufferGeometry>(),textures=new Set<THREE.Texture>();let bytes=0;
    model.parts.forEach(part=>{if(!geometries.has(part.mesh.geometry)){geometries.add(part.mesh.geometry);for(const attribute of Object.values(part.mesh.geometry.attributes))bytes+=attribute.array.byteLength;bytes+=part.mesh.geometry.index?.array.byteLength??0;}for(const material of Array.isArray(part.mesh.material)?part.mesh.material:[part.mesh.material])for(const value of Object.values(material))if(value instanceof THREE.Texture&&!textures.has(value)){textures.add(value);const image=value.source.data;bytes+=(image?.width??0)*(image?.height??0)*4;}});
    return bytes;
  }
  private async prepare(key:string,load:Loader):Promise<Model>{
    if(this.disposed)throw new Error('Preview closed.');
    const cached=this.cache.get(key);if(cached){cached.used=performance.now();this.hits++;return cached.model;}
    const pending=this.pending.get(key);if(pending)return pending.promise;
    const abort=new AbortController();this.conversions++;
    const promise=load(abort.signal).then(model=>{
      if(this.disposed||abort.signal.aborted){disposeModel(model);throw new Error('Preview closed.');}
      const bytes=this.bytes(model);
      // Four catalogue products fit without churn. Larger imported previews
      // are not retained; vertex/index arrays and decoded textures total 24 MiB.
      if(bytes<=24*1048576){
        while(this.cache.size>=4||Array.from(this.cache.values()).reduce((n,entry)=>n+entry.bytes,0)+bytes>24*1048576){
          const oldest=Array.from(this.cache).filter(([,entry])=>entry.model!==this.model).sort((a,b)=>a[1].used-b[1].used)[0];
          if(!oldest)break;this.releaseModel(oldest[1].model);this.cache.delete(oldest[0]);
        }
        if(Array.from(this.cache.values()).reduce((n,entry)=>n+entry.bytes,0)+bytes<=24*1048576)this.cache.set(key,{model,bytes,used:performance.now()});
      }
      return model;
    }).finally(()=>this.pending.delete(key));
    this.pending.set(key,{promise,abort});return promise;
  }
  async preload(key:string,load:Loader){
    try{
      const model=await this.prepare(key,load);
      this.warmQueue=this.warmQueue.then(async()=>{
        if(this.disposed||this.host||this.warmed.has(model)||!Array.from(this.cache.values()).some(entry=>entry.model===model))return;
        this.ensureRenderer();
        this.appearanceFor(model);
        // A separate scene and off-screen target cannot put a second product in
        // the visible preview. Compile and upload before hover, not during it.
        const scene=new THREE.Scene();scene.environment=this.scene.environment;scene.environmentIntensity=.9;
        this.scene.children.filter(child=>(child as THREE.Light).isLight).forEach(light=>scene.add(light.clone()));scene.add(model.group);
        const box=new THREE.Box3().setFromObject(model.group),center=box.getCenter(new THREE.Vector3()),radius=Math.max(box.getSize(new THREE.Vector3()).length()/2,.0001),distance=radius/Math.sin(THREE.MathUtils.degToRad(17))*1.2;
        const camera=new THREE.PerspectiveCamera(34,4/3,Math.max(distance-radius*1.3,.00001),distance+radius*1.3);camera.position.copy(center).add(new THREE.Vector3(Math.sin(.7),.42,Math.cos(.7)).normalize().multiplyScalar(distance));camera.lookAt(center);
        try{
          await this.renderer!.compileAsync(scene,camera);
          if(this.disposed||this.host)return;
          this.warmTarget??=new THREE.WebGLRenderTarget(160,120);
          const target=this.renderer!.getRenderTarget();this.renderer!.setRenderTarget(this.warmTarget);this.renderer!.render(scene,camera);this.renderer!.setRenderTarget(target);this.warmed.add(model);
        }finally{scene.remove(model.group);}
      }).catch(()=>{});
      await this.warmQueue;
    }catch{/* Poster remains available; report failures only on an actual activation. */}
  }
  async activate(host:HTMLElement,files:(signal:AbortSignal)=>Promise<File[]>,units:'mm'|'cm'|'in',quality:'balanced'|'fine',orientation:Orientation,animate:boolean,onError:(message:string)=>void,cacheKey='',prepared?:Loader){
    this.stop();const generation=++this.generation,started=performance.now();this.host=host;
    try{
      const load:Loader=prepared??(async signal=>{
        const raw=await files(signal);if(signal.aborted)throw new Error('Preview closed.');
        if(!raw.length)return loadShowcase();
        const job=startImport(raw,units,quality,()=>{}),cancel=()=>job.cancel();signal.addEventListener('abort',cancel,{once:true});
        try{return await job.promise;}finally{signal.removeEventListener('abort',cancel);}
      });
      const model=await this.prepare(cacheKey,load);
      if(generation!==this.generation){if(!Array.from(this.cache.values()).some(entry=>entry.model===model))disposeModel(model);return;}
      this.model=model;this.liveKey=cacheKey;applyOrientation(model,orientation);this.appearanceFor(model);
      // Match the curated homepage's bronze/graphite finish for Axis-1; imported
      // samples retain Original. Solid only, never workspace wireframe/X-ray.
      this.scene.add(model.group);const box=new THREE.Box3().setFromObject(model.group);box.getCenter(this.center);this.radius=Math.max(box.getSize(this.offset).length()/2,.0001);this.angle=.7;
      this.ensureRenderer();this.width=0;this.height=0;
      host.appendChild(this.renderer!.domElement);this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(host);this.draw();
      this.readyMs=performance.now()-started;onError('');
      if(animate){this.lastTime=performance.now();const tick=(time:number)=>{this.angle+=Math.min(time-this.lastTime,50)*.00025;this.lastTime=time;this.draw();this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);}
    }catch(error){if(generation===this.generation){this.stop();onError(error instanceof Error?error.message:'Live preview unavailable. Open the model to inspect.');}}
  }
  step(delta:number){this.angle+=delta*.2;this.draw();}
  private draw(){
    if(!this.renderer||!this.model||!this.host)return;
    const w=Math.max(this.host.clientWidth,1),h=Math.max(this.host.clientHeight,1);
    if(w!==this.width||h!==this.height){this.renderer.setSize(w,h,false);this.width=w;this.height=h;this.resizes++;this.camera.aspect=w/h;}
    const halfAngle=Math.min(THREE.MathUtils.degToRad(17),Math.atan(Math.tan(THREE.MathUtils.degToRad(17))*w/h));
    const distance=this.radius/Math.sin(halfAngle)*1.2;
    this.offset.set(Math.sin(this.angle),.42,Math.cos(this.angle)).normalize().multiplyScalar(distance);
    this.camera.position.copy(this.center).add(this.offset);this.camera.lookAt(this.center);
    // Match clipping planes to the actual model scale, not .001..100000.
    // The enormous former depth ratio caused shimmering overlapping surfaces.
    this.camera.near=Math.max(distance-this.radius*1.3,.00001);this.camera.far=distance+this.radius*1.3;this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene,this.camera);this.frames++;
  }
  stop(){
    this.generation++;cancelAnimationFrame(this.raf);this.raf=0;this.observer?.disconnect();this.observer=null;
    if(this.model){this.scene.remove(this.model.group);if(!Array.from(this.cache.values()).some(entry=>entry.model===this.model))this.releaseModel(this.model);this.model=null;this.releases++;}
    this.renderer?.domElement.remove();this.renderer?.renderLists.dispose();this.host=null;this.liveKey='';
  }
  debug(){
    return {conversions:this.conversions,cacheHits:this.hits,cachedEntries:this.cache.size,warmReady:this.warmed.size,cachedBytes:Array.from(this.cache.values()).reduce((n,entry)=>n+entry.bytes,0),live:Boolean(this.model),contexts:this.renderer?1:0,frames:this.frames,resizes:this.resizes,releases:this.releases,memory:this.renderer?.info.memory??{geometries:0,textures:0},pending:this.pending.size>0,key:this.liveKey,name:this.model?.name,parts:this.model?.parts.map(part=>part.id),triangles:this.model?.triangles,angle:this.angle,near:this.camera.near,far:this.camera.far,readyMs:this.readyMs};
  }
  dispose(){this.disposed=true;this.stop();for(const entry of this.pending.values())entry.abort.abort();for(const entry of this.cache.values())this.releaseModel(entry.model);this.cache.clear();this.warmed.clear();this.warmTarget?.dispose();this.warmTarget=null;this.environment?.dispose();this.environment=null;this.scene.environment=null;this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer=null;}
}
