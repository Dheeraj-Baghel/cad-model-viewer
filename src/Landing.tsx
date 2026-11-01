import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, Box, ChevronLeft, ChevronRight, Layers3, Move, RotateCcw, X } from 'lucide-react';
import { chapterAt, chapterHeights, chapters, createStory, initialFrame } from './story';
import type { StoryFrame } from './story';
import type { Model } from './model';
import type { ViewerHandle } from './Viewer';
import type { RefObject } from 'react';
import PresentationDebugPanel from './presentation/PresentationDebugPanel';
import './home.css';

/*
 * Landing composition.
 * - Scroll is native. Tall chapter spacers give each chapter scroll length in proportion
 *   to its motion; ScrollTrigger only reads progress (no pinning or hijacking).
 * - Chapter copy is drawn in one fixed text column and cross-fades by active chapter,
 *   so it can never slide under the bottom controls. The camera's safe rectangle
 *   (CameraController.storySafeRect) keeps the model outside that column.
 * - As the footer enters, a CSS variable (--footer-rise) lifts the fixed scene and
 *   fades the bottom controls together, so nothing interactive floats over the footer.
 */
export default function Landing({model,viewer,explore,reduced,selected,onSelect,onExplore,onOpen,onLibrary}:{model:Model;viewer:RefObject<ViewerHandle|null>;explore:boolean;reduced:boolean;selected:string|null;onSelect:(id:string|null)=>void;onExplore:(value:boolean)=>void;onOpen:()=>void;onLibrary:()=>void}){
  const root=useRef<HTMLDivElement>(null),footer=useRef<HTMLElement>(null),latest=useRef<StoryFrame>(initialFrame()),storyRef=useRef<ReturnType<typeof createStory>|null>(null);
  const [progress,setProgress]=useState(0),[spread,setSpread]=useState(0),[partsOpen,setPartsOpen]=useState(false),[footerRise,setFooterRise]=useState(0);
  const chapter=chapterAt(progress);
  useEffect(()=>{const story=createStory(root.current!,frame=>{latest.current={...frame};viewer.current?.guide(frame);},p=>setProgress(p),reduced);storyRef.current=story;if(import.meta.env.DEV)(window as unknown as {cadmiumSeek?:(p:number)=>void}).cadmiumSeek=p=>story.seek(p);return()=>{storyRef.current=null;story.destroy();};},[reduced,viewer]);
  useEffect(()=>{if(!explore)viewer.current?.guide(latest.current);},[explore,viewer]);
  // Footer handoff: measure how far the footer has risen into the viewport (px).
  useEffect(()=>{let raf=0;const measure=()=>{raf=0;const top=footer.current?.getBoundingClientRect().top??innerHeight;const rise=Math.max(0,Math.min(innerHeight,innerHeight-top));setFooterRise(r=>Math.abs(r-rise)>.5?rise:r);};const onScroll=()=>{if(!raf)raf=requestAnimationFrame(measure);};measure();addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onScroll);return()=>{cancelAnimationFrame(raf);removeEventListener('scroll',onScroll);removeEventListener('resize',onScroll);};},[]);
  useEffect(()=>{document.documentElement.style.setProperty('--footer-rise',`${footerRise}px`);return()=>{document.documentElement.style.removeProperty('--footer-rise');};},[footerRise]);
  const chosen=model.parts.find(p=>p.id===selected);
  // Reduced motion: an explicit slider drives the same pure story frame (no automatic motion).
  function stableSpread(value:number){setSpread(value);storyRef.current?.seek(value/100*.92);}
  const debugEnabled=import.meta.env.DEV&&new URLSearchParams(location.search).has('debug');
  const heights=chapterHeights();
  const jump=(index:number)=>(event:React.MouseEvent)=>{event.preventDefault();if(reduced){stableSpread(Math.min(100,Math.round(chapters[index].start*100/.92)));return;}const sections=root.current!.querySelector<HTMLElement>('.story-sections')!;const range=sections.offsetHeight-innerHeight;scrollTo({top:Math.max(0,range*chapters[index].start+2),behavior:'smooth'});};
  const footerShown=footerRise>8;
  return <div ref={root} className={`landing active-chapter-${chapter} ${reduced?'reduced-story':''} ${footerShown?'footer-visible':''} ${explore?'is-exploring':''}`} data-progress={progress.toFixed(3)} data-chapter={chapter}>
    <header className="story-header"><a className="cadmium-brand" href="#whole" onClick={jump(0)} aria-label="CADmium home"><span><Layers3 size={23}/></span>CADmium<span className="brand-period">.</span></a><nav aria-label="Story navigation"><a href="#inside" onClick={jump(1)}>The assembly</a><a href="#detail" onClick={jump(3)}>The detail</a><button onClick={onLibrary}>Explore models</button><button className="story-open" onClick={onOpen}>Open CAD Viewer <ArrowUpRight size={16}/></button></nav></header>
    <nav className="story-rail" aria-label="Assembly story chapters">{chapters.map((c,i)=><a key={c.id} href={`#${c.id}`} onClick={jump(i)} className={chapter===i?'active':''} aria-label={`Chapter ${c.index}: ${c.label}`} aria-current={chapter===i?'step':undefined}><span>{c.index}</span><i/><em>{c.label}</em></a>)}</nav>
    {/* Scroll spacers. Anchors keep deep links working; content lives in the fixed column. */}
    <div className="story-sections">{chapters.map((c,i)=><section key={c.id} id={c.id} className={`story-chapter chapter-${i}`} style={reduced?undefined:{height:`${heights[i]}vh`}} aria-labelledby={`heading-${c.id}`}>
      <div className={`chapter-copy ${chapter===i?'is-active':''}`} aria-hidden={!reduced&&chapter!==i?true:undefined}>
        <span className="chapter-kicker"><b>{c.index}</b>{c.kicker}</span>
        {i===0?<h1 id={`heading-${c.id}`}>{c.title.split('\n').map((t,j)=><span key={j}>{t}</span>)}</h1>:<h2 id={`heading-${c.id}`}>{c.title.split('\n').map((t,j)=><span key={j}>{t}</span>)}</h2>}
        <p>{c.copy}</p>
        {(i===0||i===5)&&<button className="story-cta" tabIndex={!reduced&&chapter!==i?-1:undefined} onClick={onOpen}>{i===0?'Open CAD workspace':'Launch the workspace'} <ArrowUpRight size={18}/></button>}
        {i===0&&<a href="#inside" onClick={jump(1)} tabIndex={!reduced&&chapter!==i?-1:undefined} className="scroll-invitation"><span className="scroll-line"/><span>Scroll to disassemble</span><ArrowDown size={14}/></a>}
        {i===3&&<dl className="spec-grid"><div><dt>Bearing</dt><dd>608 · 8 × 22 × 7</dd></div><div><dt>Balls</dt><dd>7 × Ø3.9 mm</dd></div><div><dt>Cage</dt><dd>Pressed brass</dd></div></dl>}
        {i===4&&<dl className="spec-grid"><div><dt>Components</dt><dd>{model.parts.length}</dd></div><div><dt>Ratio</dt><dd>4 : 1</dd></div><div><dt>Envelope</dt><dd>Ø108 × 111 mm</dd></div></dl>}
        {i===5&&<span className="formats-line">STEP / STL / OBJ<span>100% LOCAL</span></span>}
      </div>
    </section>)}</div>
    <footer ref={footer} className="site-footer"><div><a className="cadmium-brand" href="#whole" onClick={jump(0)}><span><Layers3 size={21}/></span>CADmium<span className="brand-period">.</span></a><p>Precision CAD inspection in your browser. Local files stay local.</p></div><nav aria-label="Footer"><a href="#whole" onClick={jump(0)}>Story</a><button onClick={onOpen}>CAD workspace</button><a href="https://www.innerscene.com/tools/library/3d-parts/three-planet-4-1-gearbox-open-assembly-2dfb48c4" target="_blank" rel="noreferrer">Gearbox core · CC0</a><a href="https://github.com/kovacsv/occt-import-js" target="_blank" rel="noreferrer">Open Cascade importer</a></nav><small>Illustrative showcase assembly: Innerscene CC0 gearbox core with project-authored motor, bearings, seals and fasteners. Not a manufacturing or load-rated design.</small></footer>
    <div className="story-bottom"><div className="spec-caption"><span>AXIS-1 · {chapters[chapter].index} {chapters[chapter].label.toUpperCase()}</span><strong>Planetary servo actuator</strong><small>{model.parts.length} selectable parts · millimetres · illustrative</small></div><div className="story-controls"><button onClick={()=>onExplore(!explore)} className={explore?'manual-active':''}>{explore?<RotateCcw size={15}/>:<Move size={15}/>} {explore?'Resume guided view':'Explore model'}</button><button onClick={()=>setPartsOpen(!partsOpen)} aria-expanded={partsOpen}><Box size={15}/>Select a part</button></div><div className="story-progress" aria-hidden="true"><span>{chapters[chapter].index} / 0{chapters.length}</span><div><i style={{width:`${progress*100}%`}}/></div></div></div>
    {explore&&<div className="explore-note" role="status"><strong>Free orbit</strong><span>Drag to orbit · scrolling still advances the disassembly</span><div><button aria-label="Rotate model left" onClick={()=>viewer.current?.nudge(-.2,0)}><ChevronLeft size={16}/></button><button aria-label="Rotate model right" onClick={()=>viewer.current?.nudge(.2,0)}><ChevronRight size={16}/></button><button className="resume" onClick={()=>onExplore(false)}>Resume guided view <RotateCcw size={13}/></button></div></div>}
    {reduced&&<div className="reduced-controls"><label>Disassembly <span>{spread}%</span><input type="range" min="0" max="100" aria-label="Stable assembly explosion" value={spread} onChange={e=>stableSpread(Number(e.target.value))}/></label><p>Reduced motion: scrolling does not move the model. Use the slider or the chapter links.</p></div>}
    {partsOpen&&<div className="story-part-picker"><div><strong>Select a component</strong><button aria-label="Close part picker" onClick={()=>setPartsOpen(false)}><X size={16}/></button></div><select aria-label="Story component selection" value={selected??''} onChange={e=>onSelect(e.target.value||null)}><option value="">Choose a part</option>{model.hierarchy?model.hierarchy.children.map(g=><optgroup key={g.name} label={g.name}>{g.meshes.map(i=>model.parts[i]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>):model.parts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><p>Also hover or tap a visible part in the scene.</p></div>}
    {chosen&&<aside className="context-annotation" aria-label="Selected component annotation"><div><span>{String(chosen.metadata?.Group??'COMPONENT').toUpperCase()}</span><button aria-label="Clear story selection" onClick={()=>onSelect(null)}><X size={15}/></button></div><h3>{chosen.name}</h3><p>{chosen.description}</p><span>{chosen.material}</span></aside>}
    {debugEnabled&&<PresentationDebugPanel model={model} progress={progress} viewer={viewer} onSeek={value=>storyRef.current?.seek(value)}/>} 
  </div>;
}
