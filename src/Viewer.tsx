import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { contactShadowTexture, createStudioEnvironment } from './presentation/studio';
import type { Model, Unit } from './model';
import { formatDimension, materials } from './model';
import type { Measurement } from './workspace/measure';
import type { CameraState } from './workspace/savedViews';
import type { StoryFrame } from './story';
import { annotationsAt } from './story';
import { normalizeAssembly } from './presentation/assemblyAdapter';
import type { NormalizedAssembly } from './presentation/assemblyAdapter';
import { ExplosionController } from './presentation/ExplosionController';
import { featuredExplosionMetadata } from './presentation/featuredAssembly';
import { StoryCameraController, storySafeRect, projectBox } from './presentation/CameraController';
import { AppearanceLayer, materialProperties } from './presentation/appearance';
import type { AppearanceState, RenderStyle } from './presentation/appearance';
import { applyOrientation, orientationMatrix, orientedBounds } from './library/orientation';
import type { Orientation } from './library/types';

/** Detail-inspection subject for the built-in showcase: the 608 input bearing. */
const FOCUS_IDS=['bearing-608-outer','bearing-608-inner','bearing-608-cage',...Array.from({length:7},(_,i)=>`ball-${i+1}`)];

export type CameraView = 'iso'|'front'|'back'|'left'|'right'|'top'|'bottom';
export type ViewOptions = { orientation?:Orientation; mode:'studio'|'inspect'; appearance:AppearanceState; background:'graphite'|'light'|'technical'; environmentRotation:number; turntable:boolean; turntableSpeed:number; turntableDirection:1|-1; style: RenderStyle; projection: 'perspective'|'orthographic'; grid: boolean; axes: boolean; explode: number; section: boolean; axis: 'x'|'y'|'z'; sectionPosition: number; sectionFlip: boolean; measure: boolean; measureReset: number; transparency: number; theme: 'light'|'dark' };
export type ExportOptions = { scale: number; annotations: boolean; transparent: boolean; title: string; units: Unit };
export type PresentationDebug = { showBounds?:boolean; showDirections?:boolean; showIds?:boolean; showTarget?:boolean; annotations?:boolean; explosionAmount?:number };
export type ViewerHandle = { thumbnail:()=>Promise<Blob|null>; fit:()=>void; focus:(ids:string[])=>void; setView:(v:CameraView)=>void; snapshot:(o?:Partial<ExportOptions>)=>Promise<Blob|null>; cameraState:()=>CameraState|null; restoreCamera:(c:CameraState,animate?:boolean)=>void; orbitTo:(dir:[number,number,number])=>void; zoom:(n:number)=>void; guide:(frame:StoryFrame)=>void; settle:()=>void; nudge:(x:number,y:number)=>void; debugPresentation:(state:PresentationDebug)=>void; debug:()=>unknown };
type Label = { id:string; name:string; x:number; y:number; anchorX:number; anchorY:number; width:number };
type MeasureLabel = { id:string; index:number; text:string; x:number; y:number };
type Props = { suspended?:boolean; model:Model; options:ViewOptions; selected:string|null; hidden:Set<string>; units:Unit; landing:boolean; explore:boolean; reduced:boolean; measurements:Measurement[]; labels?:Map<string,string>; onSelect:(id:string|null)=>void; onManual:()=>void; onMeasure:(a:{partId:string;local:THREE.Vector3},b:{partId:string;local:THREE.Vector3})=>void; onCamera?:(quaternion:THREE.Quaternion)=>void; onView:(v:CameraView|'custom')=>void; onReady:(ready:boolean)=>void };
type Engine = { thumbnail?:()=>Promise<Blob|null>; materialEvidence?:()=>object; focus:(ids:string[])=>void; cameraState:()=>CameraState; restoreCamera:(c:CameraState,animate?:boolean)=>void; orbitTo:(dir:[number,number,number])=>void; snapshot:(o?:Partial<ExportOptions>)=>Promise<Blob|null>; scene:THREE.Scene; renderer:THREE.WebGLRenderer; camera:THREE.PerspectiveCamera|THREE.OrthographicCamera; controls:OrbitControls; edges:Map<string,THREE.LineSegments>; model:Model|null; assembly:NormalizedAssembly|null; explosion:ExplosionController; storyCamera:StoryCameraController; request:()=>void; fit:()=>void; setView:(v:CameraView)=>void; applyOptions:()=>void; guide:(f:StoryFrame)=>void; attach:(m:Model)=>void; clearPoints:()=>void; syncMeasurements:()=>void; setDebug:(state:PresentationDebug)=>void; dispose:()=>void; guideFrame:StoryFrame|null; grid:THREE.GridHelper; axes:THREE.AxesHelper; renderCount:number };

export const Viewer=forwardRef<ViewerHandle,Props>(function Viewer(props,ref){
  const host=useRef<HTMLDivElement>(null),engine=useRef<Engine|null>(null),live=useRef(props);live.current=props;
  const [error,setError]=useState(''),[tooltip,setTooltip]=useState<{name:string;x:number;y:number}|null>(null),[labels,setLabels]=useState<Label[]>([]),[measureLabels,setMeasureLabels]=useState<MeasureLabel[]>([]),[pending,setPending]=useState(false);
  useImperativeHandle(ref,()=>({
    fit:()=>engine.current?.fit(),setView:v=>engine.current?.setView(v),focus:ids=>engine.current?.focus(ids),
    cameraState:()=>engine.current?.cameraState()??null,restoreCamera:(c,animate)=>engine.current?.restoreCamera(c,animate),orbitTo:dir=>engine.current?.orbitTo(dir),
    guide:f=>{if(engine.current)engine.current.guide(f);},
    settle:()=>{const e=engine.current;if(!e)return;e.scene.getObjectByName('assembly')!.rotation.y=0;e.setView('iso');const z={zoom:.84};const target=e.camera;gsap.to(z,{zoom:1,duration:live.current.reduced?0:.7,ease:'power2.out',onUpdate:()=>{target.zoom=z.zoom;target.updateProjectionMatrix();e.request();}});},
    zoom:n=>{const e=engine.current;if(!e)return;e.camera.zoom=THREE.MathUtils.clamp(e.camera.zoom*(n>0?1.2:1/1.2),.1,20);e.camera.updateProjectionMatrix();e.request();},
    nudge:(x,y)=>{const e=engine.current;if(!e)return;live.current.onManual();const offset=e.camera.position.clone().sub(e.controls.target);const spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=x;spherical.phi=THREE.MathUtils.clamp(spherical.phi+y,.05,Math.PI-.05);e.camera.position.copy(e.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));e.controls.update();e.request();},
    snapshot:async o=>engine.current?.snapshot(o)??null,
    thumbnail:async()=>engine.current?.thumbnail?.()??null,
    debugPresentation:state=>engine.current?.setDebug(state),
    debug:()=>{const e=engine.current;return e?{...e.materialEvidence?.(),projectedBounds:e.model?projectBox(new THREE.Box3().setFromObject(e.model.group),e.camera,host.current!.clientWidth,host.current!.clientHeight):[],storySafe:storySafeRect(host.current!.clientWidth,host.current!.clientHeight),edgeBodies:e.edges.size,renders:e.renderCount,assemblyId:e.assembly?.assemblyId,occurrences:e.assembly?.occurrences.map(o=>({id:o.occurrenceId,sourceId:o.sourceId,parentId:o.parentId,path:o.hierarchyPath})),parts:e.model?.parts.map(p=>({id:p.id,position:p.mesh.position.toArray(),quaternion:p.mesh.quaternion.toArray()})),materials:e.model?.parts.map(p=>({id:p.id,values:materials(p.mesh).map(m=>({properties:materialProperties(m),uuid:m.uuid,type:m.type,color:(m as THREE.MeshStandardMaterial).color?.getHexString?.()??null,map:Boolean((m as THREE.MeshStandardMaterial).map)}))})),camera:e.camera.position.toArray(),target:e.controls.target.toArray(),canvas:e.renderer.domElement.dataset.instance}:null;},
  }),[]);

  useEffect(()=>{
    const el=host.current!;let renderer:THREE.WebGLRenderer;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch{setError('WebGL is unavailable. Enable graphics acceleration or use another browser. Model information and file controls still work.');live.current.onReady(false);return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<761?1.75:2));renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.15;renderer.outputColorSpace=THREE.SRGBColorSpace;
    const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Interactive assembly. Use Explore model to orbit; arrow keys rotate. Viewer: drag to orbit, right-drag to pan, scroll to zoom.');canvas.dataset.instance=crypto.randomUUID();el.appendChild(canvas);
    // Studio: procedural softbox environment (no third-party HDRI), warm key, cool rim, grounded contact shadow.
    const scene=new THREE.Scene(),pmrem=new THREE.PMREMGenerator(renderer),studio=createStudioEnvironment(),environment=pmrem.fromScene(studio,.035);scene.environment=environment.texture;scene.environmentIntensity=.9;studio.traverse(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();(m.material as THREE.Material|undefined)?.dispose();});pmrem.dispose();
    const explosion=new ExplosionController(),storyCamera=new StoryCameraController(),debugGroup=new THREE.Group();debugGroup.name='presentation-debug';scene.add(debugGroup);
    const hemi=new THREE.HemisphereLight('#c9d4e2','#1a1d22',.35);scene.add(hemi);const key=new THREE.DirectionalLight('#fff1de',2.6);key.position.set(170,330,190);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0004;key.shadow.normalBias=.6;key.shadow.radius=6;key.target.position.set(60,60,-40);scene.add(key,key.target);const rim=new THREE.DirectionalLight('#9fc4ff',1.5);rim.position.set(-260,160,-260);scene.add(rim);const fill=new THREE.DirectionalLight('#d8e2ef',.35);fill.position.set(-200,60,220);scene.add(fill);
const perspective=new THREE.PerspectiveCamera(34,1,.1,100000),orthographic=new THREE.OrthographicCamera(-100,100,100,-100,.1,100000);
    let camera:THREE.PerspectiveCamera|THREE.OrthographicCamera=live.current.landing?perspective:orthographic;
    let controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.16;
    const grid=new THREE.GridHelper(800,80,'#5d6b7a','#3a4450');(grid.material as THREE.Material).transparent=true;(grid.material as THREE.Material).opacity=.32;(grid.material as THREE.Material).depthWrite=false;grid.position.y=-27.9;scene.add(grid);
    const axes=new THREE.AxesHelper(28);axes.position.set(-90,-27.8,90);(axes.material as THREE.Material).depthTest=false;axes.renderOrder=5;scene.add(axes);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.ShadowMaterial({color:'#000000',opacity:.5}));floor.rotation.x=-Math.PI/2;floor.position.y=-28.05;floor.receiveShadow=true;scene.add(floor);
    const contact=new THREE.Mesh(new THREE.CircleGeometry(1,64),new THREE.MeshBasicMaterial({map:contactShadowTexture(),transparent:true,depthWrite:false,opacity:.85}));contact.rotation.x=-Math.PI/2;contact.position.y=-27.95;contact.renderOrder=1;scene.add(contact);
    // Measurement overlay: markers follow the displayed (possibly exploded) parts; numbers come from assembled coordinates.
    const planeHelper=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#ffa84a',transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false}));const planeEdge=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1,1)),new THREE.LineBasicMaterial({color:'#ffa84a',transparent:true,opacity:.7}));planeHelper.add(planeEdge);planeHelper.visible=false;planeHelper.renderOrder=3;scene.add(planeHelper);
    const measureGroup=new THREE.Group();measureGroup.name='measurements';scene.add(measureGroup);let pendingPoint:{partId:string;local:THREE.Vector3}|null=null;
    let disposed=false,raf=0,remaining=0,rendering=false,hover:string|null=null,lastTime=performance.now(),direction=new THREE.Vector3(1.3,.85,1.5).normalize();const edges=new Map<string,THREE.LineSegments>();
    let appearance:AppearanceLayer|null=null;
    let debugState:PresentationDebug={annotations:true};
    const raycaster=new THREE.Raycaster();
    function request(){if(disposed||live.current.suspended)return;remaining=24;if(!raf&&!rendering)raf=requestAnimationFrame(render);}
    function controlsChange(){request();}
    function controlsStart(){if(live.current.landing)live.current.onManual();live.current.onView('custom');request();}
    function bind(){controls.addEventListener('change',controlsChange);controls.addEventListener('start',controlsStart);controls.minZoom=.1;controls.maxZoom=20;}
    bind();
    function setCamera(projection:ViewOptions['projection']){
      const next=projection==='perspective'?perspective:orthographic;if(next===camera)return;
      next.position.copy(camera.position);next.quaternion.copy(camera.quaternion);next.zoom=1;camera=next;controls.removeEventListener('change',controlsChange);controls.removeEventListener('start',controlsStart);const target=controls.target.clone();controls.dispose();controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.16;controls.target.copy(target);bind();e.camera=camera;e.controls=controls;resize();
    }
    function resize(){const w=Math.max(el.clientWidth,1),h=Math.max(el.clientHeight,1),aspect=w/h;renderer.setSize(w,h);perspective.aspect=aspect;perspective.updateProjectionMatrix();orthographic.left=-orthographic.top*aspect;orthographic.right=orthographic.top*aspect;orthographic.updateProjectionMatrix();if(live.current.landing&&e.guideFrame)guide(e.guideFrame);request();}
    function bounds(){const b=new THREE.Box3();e.model?.parts.filter(p=>!live.current.hidden.has(p.id)).forEach(p=>b.expandByObject(p.mesh));return b.isEmpty()?new THREE.Box3().setFromObject(e.model!.group):b;}
    function fit(){if(!e.model)return;const b=bounds(),center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3()),radius=Math.max(size.length()/2,1)*(live.current.landing?1:1.12),aspect=el.clientWidth/el.clientHeight;
      const distance=radius/Math.sin(THREE.MathUtils.degToRad(perspective.fov/2))*1.16/Math.min(aspect,1);camera.position.copy(center).addScaledVector(direction,distance);controls.target.copy(center);camera.lookAt(center);camera.zoom=1;
      orthographic.top=radius*1.18/Math.min(aspect,1);orthographic.bottom=-orthographic.top;orthographic.left=-orthographic.top*aspect;orthographic.right=orthographic.top*aspect;camera.updateProjectionMatrix();controls.update();request();}
    function setView(v:CameraView){direction.copy(v==='front'?new THREE.Vector3(0,0,1):v==='back'?new THREE.Vector3(0,0,-1):v==='left'?new THREE.Vector3(-1,0,0):v==='right'?new THREE.Vector3(1,0,0):v==='top'?new THREE.Vector3(0,1,.0001):v==='bottom'?new THREE.Vector3(0,-1,.0001):new THREE.Vector3(1.3,.85,1.5).normalize());fit();live.current.onView(v);}
    function disposeGroup(group:THREE.Group){group.children.forEach(o=>{const m=o as THREE.Mesh;m.geometry?.dispose();materials(m).forEach(a=>a.dispose());});group.clear();}
    function displayed(partId:string,local:THREE.Vector3|[number,number,number]){const part=e.model?.parts.find(p=>p.id===partId);if(!part)return null;part.mesh.updateMatrixWorld();return (Array.isArray(local)?new THREE.Vector3(...local):local.clone()).applyMatrix4(part.mesh.matrixWorld);}
    function syncMeasurements(){disposeGroup(measureGroup);if(!e.model){setMeasureLabels([]);return;}const r=Math.max(e.model.size.length()*.0045,.15);const color=live.current.options.theme==='light'?'#d0661a':'#ffa84a';
      const dot=(p:THREE.Vector3)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,10),new THREE.MeshBasicMaterial({color,depthTest:false,transparent:true}));m.position.copy(p);m.renderOrder=10;measureGroup.add(m);};
      live.current.measurements.forEach(m=>{const a=displayed(m.a.partId,m.a.local),b=displayed(m.b.partId,m.b.local);if(!a||!b)return;dot(a);dot(b);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([a,b]),new THREE.LineBasicMaterial({color,depthTest:false,transparent:true}));line.renderOrder=10;measureGroup.add(line);});
      if(pendingPoint){const p=displayed(pendingPoint.partId,pendingPoint.local);if(p)dot(p);}
      request();}
    function clearPoints(){pendingPoint=null;setPending(false);syncMeasurements();}
    function clearDisplayMaterials(){
      appearance?.dispose();appearance=null;
    }
    function attach(model:Model){
      if(e.model){explosion.dispose();storyCamera.dispose();clearDisplayMaterials();scene.remove(e.model.group);edges.forEach((line,id)=>{e.model!.parts.find(p=>p.id===id)?.mesh.remove(line);line.geometry.dispose();(line.material as THREE.Material).dispose();});edges.clear();}
      e.model=model;appearance=new AppearanceLayer(model);model.group.name='assembly';scene.add(model.group);
      // Explosion directions remain in source-local coordinates. Root orientation
      // is applied AFTER adapter initialization, never baked twice into offsets.
      model.group.quaternion.identity();model.group.updateMatrixWorld(true);
      e.assembly=normalizeAssembly(model);explosion.initialize(e.assembly,model.demo?featuredExplosionMetadata(model):{strategy:'automatic'});storyCamera.initialize(e.assembly);
      model.group.updateMatrixWorld(true);const base=new THREE.Box3().setFromObject(model.group),baseSize=base.getSize(new THREE.Vector3()),baseCenter=base.getCenter(new THREE.Vector3()),foot=Math.max(baseSize.x,baseSize.z,1),span=Math.max(baseSize.length(),1);floor.position.y=base.min.y-.05;contact.position.y=base.min.y+.02;contact.scale.setScalar(foot*.62);contact.position.x=baseCenter.x;contact.position.z=baseCenter.z;grid.position.y=base.min.y+.04;grid.scale.setScalar(Math.max(foot/800,.025));axes.position.set(base.min.x-foot*.16,base.min.y+.1,base.max.z+foot*.16);axes.scale.setScalar(Math.max(foot/108,.18));
      key.position.copy(baseCenter).add(new THREE.Vector3(span*.9,span*1.7,span));key.target.position.copy(baseCenter);key.shadow.camera.left=-span*.75;key.shadow.camera.right=span*.75;key.shadow.camera.top=span*.75;key.shadow.camera.bottom=-span*.75;key.shadow.camera.near=Math.max(span*.05,.1);key.shadow.camera.far=span*4;key.shadow.camera.updateProjectionMatrix();rim.position.copy(baseCenter).add(new THREE.Vector3(-span*1.4,span*.8,-span*1.2));fill.position.copy(baseCenter).add(new THREE.Vector3(-span,.35*span,span));
      clearPoints();applyOptions();if(live.current.landing&&e.guideFrame)guide(e.guideFrame);else fit();live.current.onReady(true);
    }
    function sectionPlane(){const o=live.current.options;const box=orientedBounds(e.model!,new Set(e.model!.parts.filter(p=>!live.current.hidden.has(p.id)).map(p=>p.id)));const s=o.sectionFlip?1:-1;const normal=new THREE.Vector3(o.axis==='x'?s:0,o.axis==='y'?s:0,o.axis==='z'?s:0);const at=THREE.MathUtils.lerp(box.min[o.axis],box.max[o.axis],o.sectionPosition/100);return new THREE.Plane(normal,-s*at);}
    function styleParts(){if(!e.model||!appearance)return;const o=live.current.options,landing=live.current.landing,inspect=o.mode==='inspect',plane=!landing&&o.section?sectionPlane():undefined;
      const style=landing?'solid':o.style,policy=o.appearance[o.mode];
      e.model.parts.forEach(p=>{const selected=p.id===live.current.selected;
        const choice=landing?'authored':policy.parts[p.id]??policy.material;
        p.mesh.material=appearance!.apply(p.id,choice,style,selected,p.id===hover,landing?0:o.transparency,plane);
        const needed=!landing&&(inspect||style==='edges'||style==='clay'||style==='xray'||selected);
        if(needed&&!edges.has(p.id)){const line=new THREE.LineSegments(new THREE.EdgesGeometry(p.mesh.geometry,29),new THREE.LineBasicMaterial({transparent:true,depthWrite:false}));line.renderOrder=3;p.mesh.add(line);edges.set(p.id,line);}
        const l=edges.get(p.id);if(l){const mat=l.material as THREE.LineBasicMaterial;
          l.visible=!landing&&(inspect||style==='edges'||style==='clay'||style==='xray'||selected);
          mat.color.set(selected?'#e9a252':style==='xray'?(o.background==='light'?'#2e5878':'#96cce9'):o.background==='light'?'#40505e':o.background==='technical'?'#7e98ae':'#708293');
          mat.opacity=selected?.85:style==='xray'?.22:inspect?.56:.38;
          mat.depthTest=style!=='xray';mat.clippingPlanes=plane?[plane]:null;
        }
      });
    }
    function applyOptions(){if(!e.model)return;const {options:o,landing,explore,reduced}=live.current;if(!landing||explore){perspective.clearViewOffset();}
      setCamera(landing?'perspective':o.projection);controls.enabled=!landing||explore;controls.enableZoom=!landing;controls.enablePan=!landing;canvas.style.touchAction=landing?'pan-y':'none';
      controls.autoRotate=!landing&&o.mode==='studio'&&o.turntable&&!reduced;controls.autoRotateSpeed=o.turntableDirection*o.turntableSpeed;scene.environmentRotation.set(0,THREE.MathUtils.degToRad(o.environmentRotation),0);renderer.toneMappingExposure=o.mode==='studio'?1.12:1;
      if(!landing){applyOrientation(e.model,o.orientation??'auto');explosion.setExplosionAmount(o.explode);e.model.parts.forEach(p=>{p.mesh.visible=!live.current.hidden.has(p.id);});
        const b=orientedBounds(e.model),c=b.getCenter(new THREE.Vector3()),sz=b.getSize(new THREE.Vector3()),foot=Math.max(sz.x,sz.z,1),span=Math.max(sz.length(),1);
        floor.position.y=b.min.y-.05;contact.position.set(c.x,b.min.y+.02,c.z);contact.scale.setScalar(foot*.62);grid.position.y=b.min.y+.04;grid.scale.setScalar(Math.max(foot/800,.025));axes.position.set(b.min.x-foot*.16,b.min.y+.1,b.max.z+foot*.16);axes.scale.setScalar(Math.max(foot/108,.18));key.position.copy(c).add(new THREE.Vector3(span*.9,span*1.7,span));key.target.position.copy(c);
      }
      if(!landing&&o.section){const pl=sectionPlane(),b=orientedBounds(e.model,new Set(e.model.parts.filter(p=>!live.current.hidden.has(p.id)).map(p=>p.id))),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());const along=o.axis;c[along]=-pl.constant*pl.normal[along];planeHelper.position.copy(c);planeHelper.rotation.set(along==='y'?-Math.PI/2:0,along==='x'?Math.PI/2:0,0);const w=along==='x'?sz.z:sz.x,h=along==='y'?sz.z:sz.y;planeHelper.scale.set(w*1.15+1,h*1.15+1,1);planeHelper.visible=true;}else planeHelper.visible=false;
      const studioMode=landing||o.mode==='studio';grid.visible=!landing&&(o.mode==='inspect'||o.grid||o.background==='technical');contact.visible=studioMode&&o.explode<.05&&(landing||o.style!=='xray');floor.visible=studioMode&&(landing||o.style!=='xray');axes.visible=!landing&&(o.mode==='inspect'||o.axes);measureGroup.visible=!landing;hemi.intensity=studioMode?.35:.7;key.intensity=studioMode?2.6:1.5;rim.intensity=studioMode?1.5:.35;fill.intensity=studioMode?.35:.55;syncMeasurements();styleParts();request();
    }
    function guide(f:StoryFrame){e.guideFrame={...f};if(!live.current.landing||live.current.explore||!e.model)return;
      setCamera('perspective');e.model.group.rotation.y=0;
      e.model.group.rotation.z=0;explosion.applyProgress(f.progress);e.model.parts.forEach(p=>{p.mesh.visible=true;});
      e.model.group.updateMatrixWorld(true);const posed=new THREE.Box3();e.model.parts.forEach(p=>posed.expandByObject(p.mesh));
      const focusIds=e.model.demo?FOCUS_IDS:[];let focus:THREE.Box3|null=null;if(focusIds.length){focus=new THREE.Box3();focusIds.forEach(id=>{const part=e.model!.parts.find(p=>p.id===id);if(part)focus!.expandByObject(part.mesh);});if(focus.isEmpty())focus=null;}
      const w=el.clientWidth,h=el.clientHeight,pose=storyCamera.evaluate(f.progress,{width:w,height:h},storySafeRect(w,h),posed,focus);
      camera.position.copy(pose.position);camera.quaternion.copy(pose.quaternion);controls.target.copy(pose.target);if(camera instanceof THREE.PerspectiveCamera){camera.fov=pose.fov;camera.setViewOffset(w,h,pose.viewOffset.x,pose.viewOffset.y,w,h);}camera.near=pose.near;camera.far=pose.far;camera.updateProjectionMatrix();camera.updateMatrixWorld();styleParts();refreshDebug();request();
    }
    function pick(event:PointerEvent){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);return raycaster.intersectObjects(e.model?.parts.filter(p=>p.mesh.visible).map(p=>p.mesh)??[],false).find(h=>!materials(h.object as THREE.Mesh)[0].clippingPlanes?.some(p=>p.distanceToPoint(h.point)<0));}
    let down={x:0,y:0};function onDown(event:PointerEvent){down={x:event.clientX,y:event.clientY};}
    function onMove(event:PointerEvent){if(event.pointerType==='touch')return;const hit=pick(event);hover=hit?.object.userData.partId??null;styleParts();const r=canvas.getBoundingClientRect();if(live.current.landing&&!live.current.explore&&!live.current.reduced&&e.model)e.model.group.rotation.z=((event.clientX-r.left)/r.width-.5)*.008;setTooltip(hit?{name:live.current.labels?.get(hover!)??e.model!.parts.find(p=>p.id===hover)!.name,x:Math.min(Math.max(8,event.clientX-r.left+14),r.width-200),y:Math.min(Math.max(8,event.clientY-r.top+14),r.height-46)}:null);request();}
    function onLeave(){hover=null;if(live.current.landing&&e.model)e.model.group.rotation.z=0;setTooltip(null);styleParts();request();}
    function onUp(event:PointerEvent){if(event.button!==0||Math.hypot(event.clientX-down.x,event.clientY-down.y)>5)return;const hit=pick(event);if(!hit){live.current.onSelect(null);return;}if(live.current.landing||!live.current.options.measure){live.current.onSelect(hit.object.userData.partId);return;}
      // Store the hit in the component's local frame so it is independent of display transforms.
      const mesh=hit.object as THREE.Mesh;mesh.updateMatrixWorld();const local=mesh.worldToLocal(hit.point.clone());const partId=mesh.userData.partId as string;
      if(!pendingPoint){pendingPoint={partId,local};setPending(true);syncMeasurements();}else{const first=pendingPoint;pendingPoint=null;setPending(false);live.current.onMeasure(first,{partId,local});}
    }
    // ---- camera state, focus and navigation -------------------------------------------
    let tween:gsap.core.Tween|null=null;
    function cameraState():CameraState{return {projection:camera instanceof THREE.PerspectiveCamera?'perspective':'orthographic',position:camera.position.toArray() as [number,number,number],target:controls.target.toArray() as [number,number,number],up:camera.up.toArray() as [number,number,number],zoom:camera.zoom,orthoHeight:orthographic.top,fov:perspective.fov};}
    function applyCamera(c:CameraState){camera.position.fromArray(c.position);controls.target.fromArray(c.target);camera.up.fromArray(c.up);camera.zoom=c.zoom;const aspect=el.clientWidth/Math.max(el.clientHeight,1);orthographic.top=c.orthoHeight;orthographic.bottom=-c.orthoHeight;orthographic.left=-c.orthoHeight*aspect;orthographic.right=c.orthoHeight*aspect;perspective.fov=c.fov;camera.lookAt(controls.target);camera.updateProjectionMatrix();controls.update();request();}
    /** Smoothly (or instantly, under reduced motion) move the camera; never touches geometry. */
    function moveCamera(to:CameraState,animate=true){tween?.kill();const from=cameraState();if(!animate||live.current.reduced){applyCamera(to);return;}const s={t:0};const fp=new THREE.Vector3(...from.position),tp=new THREE.Vector3(...to.position),ft=new THREE.Vector3(...from.target),tt=new THREE.Vector3(...to.target);
      const fo=fp.clone().sub(ft),to2=tp.clone().sub(tt);const fs=new THREE.Spherical().setFromVector3(fo),ts=new THREE.Spherical().setFromVector3(to2);let dTheta=ts.theta-fs.theta;if(dTheta>Math.PI)dTheta-=Math.PI*2;if(dTheta<-Math.PI)dTheta+=Math.PI*2;
      tween=gsap.to(s,{t:1,duration:.55,ease:'power3.inOut',onUpdate:()=>{const k=s.t;const sp=new THREE.Spherical(THREE.MathUtils.lerp(fs.radius,ts.radius,k),THREE.MathUtils.lerp(fs.phi,ts.phi,k),fs.theta+dTheta*k);const target=ft.clone().lerp(tt,k);applyCamera({...to,position:target.clone().add(new THREE.Vector3().setFromSpherical(sp)).toArray() as [number,number,number],target:target.toArray() as [number,number,number],zoom:THREE.MathUtils.lerp(from.zoom,to.zoom,k),orthoHeight:THREE.MathUtils.lerp(from.orthoHeight,to.orthoHeight,k)});},onComplete:()=>applyCamera(to)});}
    function restoreCamera(c:CameraState,animate=true){setCamera(c.projection);moveCamera(c,animate);}
    function framing(box:THREE.Box3,dir:THREE.Vector3):CameraState{const center=box.getCenter(new THREE.Vector3()),radius=Math.max(box.getSize(new THREE.Vector3()).length()/2,1),aspect=el.clientWidth/Math.max(el.clientHeight,1);const distance=radius/Math.sin(THREE.MathUtils.degToRad(perspective.fov/2))*1.16/Math.min(aspect,1);const up=Math.abs(dir.y)>.99?new THREE.Vector3(0,0,dir.y>0?-1:1):new THREE.Vector3(0,1,0);return {projection:camera instanceof THREE.PerspectiveCamera?'perspective':'orthographic',position:center.clone().addScaledVector(dir,distance).toArray() as [number,number,number],target:center.toArray() as [number,number,number],up:up.toArray() as [number,number,number],zoom:1,orthoHeight:radius*1.18/Math.min(aspect,1),fov:perspective.fov};}
    /** Frame the given components (in their current displayed pose). Empty list frames everything visible. */
    function focus(ids:string[]){if(!e.model)return;const box=new THREE.Box3();e.model.parts.filter(p=>ids.includes(p.id)&&p.mesh.visible).forEach(p=>box.expandByObject(p.mesh));if(box.isEmpty()){fit();return;}const dir=camera.position.clone().sub(controls.target).normalize();moveCamera(framing(box,dir));live.current.onView('custom');}
    function orbitTo(d:[number,number,number]){if(!e.model)return;const dir=new THREE.Vector3(...d).normalize();direction.copy(dir);moveCamera(framing(bounds(),dir));}

    // Consistent source-safe card poster, using this SAME renderer and a temporary
    // scene/camera. Never changes viewer camera, selection, visibility or geometry.
    async function thumbnail():Promise<Blob|null>{
      if(!e.model||!appearance)return null;
      const s=new THREE.Scene();s.background=new THREE.Color('#1b222a');s.environment=scene.environment;
      s.add(new THREE.HemisphereLight('#f0f5ff','#3b4149',1.5));const light=new THREE.DirectionalLight('#ffffff',2);light.position.set(2,4,5);s.add(light);
      const group=new THREE.Group(),clones:THREE.Material[]=[];
      for(const p of e.model.parts){const m=appearance.cloneOriginal(p.id),mesh=new THREE.Mesh(p.mesh.geometry,m);clones.push(...(Array.isArray(m)?m:[m]));mesh.position.copy(p.origin);mesh.rotation.copy(p.rotation);group.add(mesh);}
      group.quaternion.setFromRotationMatrix(orientationMatrix(e.model));s.add(group);group.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(group),c=box.getCenter(new THREE.Vector3()),radius=Math.max(box.getSize(new THREE.Vector3()).length()/2,1);
      const camera2=new THREE.PerspectiveCamera(34,4/3,.01,radius*50);camera2.position.copy(c).addScaledVector(new THREE.Vector3(1.3,.85,1.5).normalize(),radius/Math.sin(THREE.MathUtils.degToRad(17))*1.1);camera2.lookAt(c);
      const target=new THREE.WebGLRenderTarget(640,480,{samples:4,colorSpace:THREE.SRGBColorSpace});const pixels=new Uint8Array(640*480*4),previous=renderer.getRenderTarget();
      try{renderer.setRenderTarget(target);renderer.render(s,camera2);renderer.readRenderTargetPixels(target,0,0,640,480,pixels);}finally{renderer.setRenderTarget(previous);target.dispose();clones.forEach(m=>m.dispose());request();}
      const canvas2=document.createElement('canvas');canvas2.width=640;canvas2.height=480;const ctx=canvas2.getContext('2d');if(!ctx)return null;const image=ctx.createImageData(640,480);for(let y=0;y<480;y++)image.data.set(pixels.subarray((479-y)*640*4,(480-y)*640*4),y*640*4);ctx.putImageData(image,0,0);return new Promise(resolve=>canvas2.toBlob(resolve,'image/webp',.85));
    }

    // ---- high-resolution export -------------------------------------------------------
    async function snapshot(o:Partial<ExportOptions>={}):Promise<Blob|null>{
      const scale=THREE.MathUtils.clamp(o.scale??2,1,4),w=Math.round(el.clientWidth*scale),h=Math.round(el.clientHeight*scale);
      const target=new THREE.WebGLRenderTarget(w,h,{samples:4,colorSpace:THREE.SRGBColorSpace,type:THREE.UnsignedByteType});
      const previousBg=scene.background,previousGrid=grid.visible,previousPlane=planeHelper.visible;planeHelper.visible=false;if(!o.transparent){const bg=getComputedStyle(el.parentElement!).backgroundColor;scene.background=new THREE.Color(bg&&bg!=='rgba(0, 0, 0, 0)'?bg:live.current.options.theme==='light'?'#e9edf1':'#15181c');}
      const aspect=camera instanceof THREE.PerspectiveCamera?camera.aspect:0;renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);if(aspect)void aspect;
      const pixels=new Uint8Array(w*h*4);renderer.readRenderTargetPixels(target,0,0,w,h,pixels);target.dispose();scene.background=previousBg;grid.visible=previousGrid;planeHelper.visible=previousPlane;request();
      const canvas2=document.createElement('canvas');canvas2.width=w;canvas2.height=h;const ctx=canvas2.getContext('2d');if(!ctx)return null;const img=ctx.createImageData(w,h);for(let y=0;y<h;y++)img.data.set(pixels.subarray((h-1-y)*w*4,(h-y)*w*4),y*w*4);ctx.putImageData(img,0,0);
      if(o.annotations){const units=o.units??live.current.units;const light=live.current.options.theme==='light';ctx.font=`${12*scale}px 'IBM Plex Mono', monospace`;ctx.textBaseline='middle';
        live.current.measurements.forEach(m=>{const a=displayed(m.a.partId,m.a.local),b=displayed(m.b.partId,m.b.local);if(!a||!b)return;const mid=a.clone().add(b).multiplyScalar(.5).project(camera);if(mid.z>1)return;const x=(mid.x+1)/2*w,y=(-mid.y+1)/2*h;const text=`M${m.index}  ${formatDimension(m.distance,units)} ${units}`;const tw=ctx.measureText(text).width;ctx.fillStyle=light?'rgba(255,255,255,.92)':'rgba(14,17,21,.9)';ctx.strokeStyle=light?'#d0661a':'#ffa84a';ctx.lineWidth=scale;const pad=6*scale;ctx.beginPath();ctx.roundRect(x+8*scale,y-11*scale,tw+pad*2,22*scale,3*scale);ctx.fill();ctx.stroke();ctx.fillStyle=light?'#1c2228':'#eef1f4';ctx.fillText(text,x+8*scale+pad,y);});
        const sel=live.current.selected&&e.model?.parts.find(p=>p.id===live.current.selected);if(sel){const c=new THREE.Box3().setFromObject(sel.mesh).getCenter(new THREE.Vector3()).project(camera);const x=(c.x+1)/2*w,y=(-c.y+1)/2*h;const text=live.current.labels?.get(sel.id)??sel.name;const tw=ctx.measureText(text).width;ctx.fillStyle=light?'rgba(255,255,255,.92)':'rgba(14,17,21,.9)';ctx.fillRect(x+10*scale,y-11*scale,tw+12*scale,22*scale);ctx.fillStyle=light?'#1c2228':'#eef1f4';ctx.fillText(text,x+16*scale,y);ctx.fillStyle=light?'#d0661a':'#ffa84a';ctx.beginPath();ctx.arc(x,y,4*scale,0,Math.PI*2);ctx.fill();}
        // caption strip: model, units, honesty note
        const cap=`${o.title??e.model?.name??'CADmium'}  ·  ${units}  ·  ${live.current.options.section?'uncapped mesh clipping · ':''}${live.current.options.explode>0.01?'exploded display (measurements use assembled positions) · ':''}tessellated mesh inspection`;ctx.font=`${11*scale}px 'IBM Plex Mono', monospace`;ctx.fillStyle=light?'rgba(255,255,255,.85)':'rgba(10,12,15,.8)';ctx.fillRect(0,h-28*scale,w,28*scale);ctx.fillStyle=light?'#4a5560':'#9aa5b1';ctx.fillText(cap,14*scale,h-14*scale);}
      return await new Promise<Blob|null>(resolve=>canvas2.toBlob(blob=>resolve(blob),'image/png'));
    }

    function clearDebug(){debugGroup.children.forEach(child=>{const renderable=child as THREE.Mesh|THREE.LineSegments;(renderable.geometry as THREE.BufferGeometry|undefined)?.dispose();const material=(renderable as THREE.Mesh).material;if(Array.isArray(material))material.forEach(item=>item.dispose());else material?.dispose();});debugGroup.clear();}
    function refreshDebug(){clearDebug();if(!e.model||!e.assembly)return;
      if(debugState.showBounds)e.model.parts.forEach(part=>debugGroup.add(new THREE.Box3Helper(new THREE.Box3().setFromObject(part.mesh),'#22c8d0')));
      if(debugState.showDirections){const byId=new Map(explosion.diagnostics().map(item=>[item.partId,item]));e.model.parts.forEach(part=>{const item=byId.get(part.id);if(!item)return;const center=new THREE.Box3().setFromObject(part.mesh).getCenter(new THREE.Vector3());debugGroup.add(new THREE.ArrowHelper(item.direction,center,Math.min(item.distance,Math.max(e.model!.size.length()*.24,8)),'#f2a65a',4,2));});}
      if(debugState.showTarget){const radius=Math.max(e.model.size.length()*.012,1);const marker=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),new THREE.MeshBasicMaterial({color:'#22c8d0',depthTest:false}));marker.position.copy(storyCamera.getTarget());marker.renderOrder=20;debugGroup.add(marker);}
    }
    function setDebug(state:PresentationDebug){debugState={...debugState,...state};if(state.explosionAmount!==undefined)explosion.setExplosionAmount(state.explosionAmount);refreshDebug();request();}
    function updateLabels(){
      if(!live.current.landing||!e.model||debugState.annotations===false){setLabels(old=>old.length?[]:old);return;}
      const w=el.clientWidth,h=el.clientHeight,mobile=w<761,safe=storySafeRect(w,h),width=mobile?130:158;
      const automatic=e.model.demo?annotationsAt(e.guideFrame?.progress??0,mobile):[];
      const chosen=debugState.showIds?e.model.parts.slice(0,18).map(p=>p.id):[...new Set([...(live.current.selected?[live.current.selected]:[]),...automatic])].slice(0,mobile?2:6);
      const copy=document.querySelector('.chapter-copy.is-active')?.getBoundingClientRect();
      const minX=mobile?12:Math.max(safe.x-44,(copy?.right??0)+20),maxX=w-width-18;
      const minY=mobile?Math.max(safe.y,(copy?.bottom??0)+16):104,maxY=Math.max(minY+36,h-132);
      const projected=chosen.flatMap(id=>{const p=e.model!.parts.find(p=>p.id===id);if(!p)return[];const v=new THREE.Box3().setFromObject(p.mesh).getCenter(new THREE.Vector3()).project(camera);if(v.z<-1||v.z>1)return[];return[{id,name:p.name,ax:(v.x+1)*w/2,ay:(1-v.y)*h/2}];}).sort((a,b)=>a.ay-b.ay);
      const list:Label[]=[];
      projected.forEach((p,i)=>{
        const x=THREE.MathUtils.clamp(p.ax+(i%2===0?26:-width-26),minX,maxX),desired=THREE.MathUtils.clamp(p.ay-15,minY,maxY);
        const candidates=[desired,...Array.from({length:16},(_,n)=>THREE.MathUtils.clamp(desired+(n%2===0?1:-1)*Math.ceil((n+1)/2)*38,minY,maxY))];
        const y=candidates.find(y=>!list.some(l=>Math.abs(l.y-y)<34&&Math.abs(l.x-x)<width+10))??desired;
        // A centre ray through a hollow bearing/cover can hit a different part:
        // keep the exploded callout, with a leader tied to the actual part centre.
        list.push({id:p.id,name:p.name,x:Math.round(x),y:Math.round(y),anchorX:Math.round(p.ax),anchorY:Math.round(p.ay),width});
      });setLabels(old=>JSON.stringify(old)===JSON.stringify(list)?old:list);
    }
    function onKey(event:KeyboardEvent){const arrows:Record<string,[number,number]>={ArrowLeft:[-.12,0],ArrowRight:[.12,0],ArrowUp:[0,-.12],ArrowDown:[0,.12]};if(arrows[event.key]){event.preventDefault();live.current.onManual();const [x,y]=arrows[event.key],s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));s.theta+=x;s.phi=THREE.MathUtils.clamp(s.phi+y,.05,Math.PI-.05);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));camera.lookAt(controls.target);request();}if(event.key==='+'||event.key==='-'){event.preventDefault();camera.zoom*=event.key==='+'?1.15:1/1.15;camera.updateProjectionMatrix();request();}}
    function contextLost(event:Event){event.preventDefault();setError('The graphics context was interrupted. Reload to recover. Files are not uploaded.');live.current.onReady(false);}
    function updateMeasureLabels(){if(live.current.landing||!e.model||!live.current.measurements.length){setMeasureLabels(old=>old.length?[]:old);return;}const w=el.clientWidth,h=el.clientHeight,u=live.current.units;const list:MeasureLabel[]=[];live.current.measurements.forEach(m=>{const a=displayed(m.a.partId,m.a.local),b=displayed(m.b.partId,m.b.local);if(!a||!b)return;const v=a.add(b).multiplyScalar(.5).project(camera);if(v.z>1)return;list.push({id:m.id,index:m.index,text:`${formatDimension(m.distance,u)} ${u}`,x:Math.min(Math.max((v.x+1)/2*w,8),w-120),y:Math.min(Math.max((-v.y+1)/2*h,8),h-24)});});setMeasureLabels(old=>JSON.stringify(old)===JSON.stringify(list)?old:list);}
    function render(time=performance.now()){raf=0;if(disposed||live.current.suspended)return;rendering=true;const delta=Math.min((time-lastTime)/1000,.1);lastTime=time;if(!live.current.landing||live.current.explore)controls.update(delta);renderer.render(scene,camera);e.renderCount++;updateLabels();updateMeasureLabels();live.current.onCamera?.(camera.quaternion);rendering=false;if(controls.autoRotate)remaining=Math.max(remaining,2);if(--remaining>0&&!raf)raf=requestAnimationFrame(render);}
    const e:Engine={focus,cameraState,restoreCamera,orbitTo,snapshot,syncMeasurements,scene,renderer,camera,controls,edges,model:null,assembly:null,explosion,storyCamera,request,fit,setView,applyOptions,guide,attach,clearPoints,setDebug,guideFrame:null,grid,axes,renderCount:0,dispose:()=>{disposed=true;cancelAnimationFrame(raf);controls.dispose();gsap.killTweensOf(camera);observer.disconnect();canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointerleave',onLeave);canvas.removeEventListener('keydown',onKey);canvas.removeEventListener('webglcontextlost',contextLost);explosion.dispose();storyCamera.dispose();clearDebug();clearDisplayMaterials();edges.forEach(l=>{l.geometry.dispose();(l.material as THREE.Material).dispose();});clearPoints();grid.geometry.dispose();(grid.material as THREE.Material).dispose();axes.geometry.dispose();(axes.material as THREE.Material).dispose();floor.geometry.dispose();(floor.material as THREE.Material).dispose();planeHelper.geometry.dispose();(planeHelper.material as THREE.Material).dispose();planeEdge.geometry.dispose();(planeEdge.material as THREE.Material).dispose();tween?.kill();contact.geometry.dispose();(contact.material as THREE.MeshBasicMaterial).map?.dispose();(contact.material as THREE.Material).dispose();environment.dispose();renderer.dispose();canvas.remove();}};
    e.thumbnail=thumbnail;e.materialEvidence=()=>appearance?.evidence()??{};engine.current=e;const observer=new ResizeObserver(resize);observer.observe(el);resize();
    canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointerleave',onLeave);canvas.addEventListener('keydown',onKey);canvas.addEventListener('webglcontextlost',contextLost);
    return()=>{e.dispose();engine.current=null;};
  },[]);
  useEffect(()=>{engine.current?.attach(props.model);},[props.model]);
  useEffect(()=>{const e=engine.current;if(!e)return;e.applyOptions();if(props.landing&&!props.explore&&e.guideFrame)e.guide(e.guideFrame);},[props.options,props.selected,props.hidden,props.landing,props.explore,props.suspended]);
  useEffect(()=>{engine.current?.clearPoints();},[props.options.measureReset,props.options.measure,props.model]);
  useEffect(()=>{engine.current?.syncMeasurements();},[props.measurements,props.options.explode,props.hidden,props.units,props.options.theme]);
  return <div ref={host} className="viewport-render" data-testid="viewport">
    {error&&<div className="webgl-error" role="alert"><strong>Viewport unavailable</strong><p>{error}</p></div>}
    {tooltip&&<div className="part-tooltip" style={{left:tooltip.x,top:tooltip.y}}>{tooltip.name}</div>}
    {props.landing&&<div className="story-callouts" role="group" aria-label="Exploded component labels"><svg className="story-leaders" aria-hidden="true">{labels.map(l=><g key={l.id}><path d={`M${l.anchorX} ${l.anchorY} L${l.x+(l.anchorX>l.x?l.width:0)} ${l.y+15}`}/><circle cx={l.anchorX} cy={l.anchorY} r="3"/></g>)}</svg>{labels.map(l=><button className="scene-label" key={l.id} data-label-part={l.id} style={{left:l.x,top:l.y,width:l.width}} onClick={()=>props.onSelect(l.id)}><span/>{l.name}</button>)}</div>}
    {!props.landing&&measureLabels.map(l=><div className="measure-label" key={l.id} style={{left:l.x,top:l.y}}><b>M{l.index}</b>{l.text}</div>)}
    {!props.landing&&props.options.measure&&<div className="measurement-tip" role="status">{pending?'First point set. Pick a second surface point.':'Measure: pick two surface points.'}<span>{props.options.explode>0.01?'Exploded display: distances use assembled positions.':'Straight-line distance on tessellated surfaces'} · {props.units} · Esc to exit</span></div>}
  </div>;
});
