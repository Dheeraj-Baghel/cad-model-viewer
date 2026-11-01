import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export type StoryFrame = { progress: number };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Every presentation system is reconstructed from this one normalized value. */
export function frameAtProgress(progress: number): StoryFrame {
  return { progress: clamp01(progress) };
}

export const initialFrame = () => frameAtProgress(0);
/*
 * Six chapters. `start` is the story progress at which a chapter becomes active and
 * matches the disassembly windows in presentation/featuredAssembly.ts. Section
 * spacer heights are derived from these spans, so native scrolling (no hijacking)
 * moves through every chapter at a pace proportional to its motion.
 */
export const chapters = [
  { id: 'whole', index: '01', start: 0, title: 'Engineering,\nrevealed.', copy: 'A 4 : 1 planetary servo actuator, 65 machined, wound and fastened components, held to a single axis.', kicker: 'CADMIUM / AXIS-1 ACTUATOR', label: 'Assembled' },
  { id: 'inside', index: '02', start: 0.1, title: 'Open the\nhousing.', copy: 'Screws back out of their threads. The motor module lifts off its pilot and steps aside, then the cover and O-ring rise to expose the gear stage.', kicker: 'HOUSING REVEAL', label: 'Housing' },
  { id: 'parts', index: '03', start: 0.38, title: 'Stage by\nstage.', copy: 'The sun gear rises first. Each planet slides off its pin before fanning out, and the ring, carrier, case and output bearing follow in service order.', kicker: 'STAGED DISASSEMBLY', label: 'Disassembly' },
  { id: 'detail', index: '04', start: 0.66, title: 'Inspect the\ndetail.', copy: 'The 608 input bearing up close: seven 3.9 mm chrome-steel balls, a pressed brass cage and ground races, each a separate, selectable part.', kicker: 'DETAIL INSPECTION', label: 'Detail' },
  { id: 'overview', index: '05', start: 0.82, title: 'Every part,\naccounted for.', copy: 'Two stacks, one axis each. The gearbox on the left, the motor and encoder on the right, with every fastener kept beside the part it holds.', kicker: 'EXPLODED OVERVIEW', label: 'Overview' },
  { id: 'explore', index: '06', start: 0.95, title: 'From story\nto inspection.', copy: 'Open the same assembly in the workspace to isolate, section and measure it, or bring your own STEP, STL or OBJ. Files never leave the browser.', kicker: 'ENTER THE WORKSPACE', label: 'Workspace' },
] as const;

export function chapterAt(progress: number) {
  let index = 0;
  chapters.forEach((chapter, i) => { if (progress >= chapter.start - 1e-6) index = i; });
  return index;
}

/** Viewport heights of scroll per chapter. The total scroll range is SCROLL_VH. */
export const SCROLL_VH = 640;
export function chapterHeights() {
  const tops = chapters.map(chapter => chapter.start * SCROLL_VH);
  return tops.map((top, i) => (i < tops.length - 1 ? tops[i + 1] - top : SCROLL_VH + 100 - top));
}

/** Annotation targets per chapter (part ids), capped on phones. */
export function annotationsAt(progress: number, mobile: boolean): string[] {
  const sets: string[][] = [
    [],
    ['motor-can', 'cover', 'encoder-pcb'],
    ['sun', 'planet-2', 'ring', 'carrier'],
    ['bearing-608-cage', 'ball-2', 'bearing-608-outer'],
    ['cover', 'carrier', 'stator', 'output-flange', 'encoder-pcb', 'lower-case'],
    ['cover', 'carrier', 'stator', 'output-flange', 'encoder-pcb', 'lower-case'],
  ];
  const list = sets[chapterAt(progress)] ?? [];
  return mobile ? list.slice(0, 2) : list;
}

// One scoped trigger owns one normalized story value. Reverse scrolling evaluates
// the same pure frame function, so component and camera transforms cannot drift.
export function createStory(root: HTMLElement, apply: (frame: StoryFrame) => void, update: (progress: number) => void, reduced: boolean) {
  const state = { progress: 0 };
  const render = () => {
    const frame = frameAtProgress(state.progress);
    apply(frame);
    update(frame.progress);
  };
  const timeline = gsap.timeline({ paused: true, onUpdate: render });
  timeline.to(state, { progress: 1, duration: 1, ease: 'none' });
  const trigger = reduced ? null : ScrollTrigger.create({
    id: 'cadmium-home-story',
    trigger: root.querySelector<HTMLElement>('.story-sections') ?? root,
    start: 'top top',
    end: 'bottom bottom',
    animation: timeline,
    scrub: 0.6, // light smoothing of native scroll; never pins or hijacks the page
    invalidateOnRefresh: true,
  });
  render();
  return {
    frame: () => frameAtProgress(state.progress),
    timeline,
    // Initialize/seek GSAP BEFORE assigning the explicit value; otherwise its
    // lazily captured start value can become the first nonzero slider position,
    // so returning a reduced-motion slider to zero would stay exploded.
    seek: (progress: number) => { const next=clamp01(progress);timeline.progress(next,true);state.progress=next;render(); },
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => { trigger?.kill(); timeline.kill(); },
  };
}
