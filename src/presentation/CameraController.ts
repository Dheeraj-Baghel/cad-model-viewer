import * as THREE from 'three';
import type { NormalizedAssembly } from './assemblyAdapter';

export type CameraPose = Readonly<{
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  target: THREE.Vector3;
  fov: number;
  near: number;
  far: number;
  /** Pixel offset that moves the framed subject into the safe rectangle. */
  viewOffset: Readonly<{ x: number; y: number }>;
}>;

/** Screen-space region (px, top-left origin) that the subject must stay inside. */
export type SafeRect = Readonly<{ x: number; y: number; width: number; height: number }>;

type Keyframe = Readonly<{
  progress: number;
  azimuth: number; // degrees, about +Y; 0 looks from +Z
  elevation: number; // degrees above the horizon
  fill: number; // fraction of the safe rectangle the subject occupies
  fov: number;
  focus: number; // 0 = whole assembly, 1 = detail focus bounds
}>;

/*
 * Authored story camera. The pose is a pure function of story progress, viewport,
 * safe rectangle and the current posed bounds (themselves a pure function of
 * progress), so forward and reverse scrolling produce identical frames.
 * Framing is exact: the eight corners of the subject box are fitted into the
 * safe rectangle for the current orientation, and a view offset centres the
 * subject there, so it never collides with chapter text or controls.
 */
const keyframes: readonly Keyframe[] = Object.freeze([
  { progress: 0, azimuth: 36, elevation: 20, fill: 0.8, fov: 26, focus: 0 },
  { progress: 0.06, azimuth: 33, elevation: 21, fill: 0.8, fov: 26, focus: 0 },
  { progress: 0.24, azimuth: 28, elevation: 19, fill: 0.88, fov: 28, focus: 0 },
  { progress: 0.36, azimuth: 24, elevation: 25, fill: 0.9, fov: 28, focus: 0 },
  { progress: 0.52, azimuth: 30, elevation: 21, fill: 0.92, fov: 28, focus: 0 },
  { progress: 0.62, azimuth: 32, elevation: 22, fill: 0.92, fov: 28, focus: 0 },
  { progress: 0.69, azimuth: 24, elevation: 24, fill: 0.6, fov: 24, focus: 1 },
  { progress: 0.78, azimuth: 12, elevation: 30, fill: 0.6, fov: 24, focus: 1 },
  { progress: 0.85, azimuth: 32, elevation: 17, fill: 0.92, fov: 28, focus: 0 },
  { progress: 0.9, azimuth: 36, elevation: 15, fill: 0.92, fov: 28, focus: 0 },
  { progress: 1, azimuth: 38, elevation: 16, fill: 0.9, fov: 28, focus: 0 },
]);

const smooth = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = THREE.MathUtils.lerp;

function sample(progress: number) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  let right = keyframes.findIndex(frame => frame.progress >= p);
  if (right <= 0) right = 1;
  const a = keyframes[right - 1], b = keyframes[right];
  const t = smooth((p - a.progress) / Math.max(b.progress - a.progress, 1e-4));
  return {
    azimuth: lerp(a.azimuth, b.azimuth, t), elevation: lerp(a.elevation, b.elevation, t),
    fill: lerp(a.fill, b.fill, t), fov: lerp(a.fov, b.fov, t), focus: lerp(a.focus, b.focus, t),
  };
}

export class StoryCameraController {
  private assembly: NormalizedAssembly | null = null;
  private lastTarget = new THREE.Vector3();

  initialize(assembly: NormalizedAssembly) {
    this.assembly = assembly;
    this.lastTarget.copy(assembly.center);
  }

  /**
   * @param bounds   posed bounds of the whole subject at this progress
   * @param focus    posed bounds of the detail subject (optional)
   */
  evaluate(progress: number, viewport: { width: number; height: number }, safe: SafeRect, bounds?: THREE.Box3, focus?: THREE.Box3 | null): CameraPose {
    if (!this.assembly) throw new Error('Camera controller must be initialized with an assembly.');
    const k = sample(progress);
    const whole = bounds && !bounds.isEmpty() ? bounds : this.assembly.bounds;
    // Blend centre linearly and size geometrically so a 20x zoom reads as one even push-in.
    const f = focus ? k.focus : 0, detail = focus ?? whole;
    const centre = whole.getCenter(new THREE.Vector3()).lerp(detail.getCenter(new THREE.Vector3()), f);
    const sa = whole.getSize(new THREE.Vector3()), sb = detail.getSize(new THREE.Vector3());
    const half = new THREE.Vector3(Math.pow(sa.x, 1 - f) * Math.pow(Math.max(sb.x, 1e-3), f), Math.pow(sa.y, 1 - f) * Math.pow(Math.max(sb.y, 1e-3), f), Math.pow(sa.z, 1 - f) * Math.pow(Math.max(sb.z, 1e-3), f)).multiplyScalar(0.5);
    const subject = new THREE.Box3(centre.clone().sub(half), centre.clone().add(half));
    const target = subject.getCenter(new THREE.Vector3());
    const az = THREE.MathUtils.degToRad(k.azimuth), el = THREE.MathUtils.degToRad(k.elevation);
    const direction = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(direction, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)));
    const inverse = quaternion.clone().invert();

    // Exact fit of the box corners into the safe rectangle.
    const w = Math.max(viewport.width, 1), h = Math.max(viewport.height, 1);
    const tanV = Math.tan(THREE.MathUtils.degToRad(k.fov) / 2);
    const tanH = tanV * (w / h);
    const limitX = tanH * (safe.width / w) * k.fill, limitY = tanV * (safe.height / h) * k.fill;
    let distance = 1;
    const corner = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? subject.max.x : subject.min.x, i & 2 ? subject.max.y : subject.min.y, i & 4 ? subject.max.z : subject.min.z).sub(target).applyQuaternion(inverse);
      // camera looks down -Z; a corner at depth z is (distance - z) away from the camera plane
      distance = Math.max(distance, corner.z + Math.abs(corner.x) / limitX, corner.z + Math.abs(corner.y) / limitY);
    }
    const position = target.clone().addScaledVector(direction, distance);
    // Verify with the actual off-axis projection, not just tan(FOV) algebra.
    // Detail intentionally crops the rest; overview fits the current posed box.
    const offset={x:w/2-(safe.x+safe.width/2),y:h/2-(safe.y+safe.height/2)};
    const probe=new THREE.PerspectiveCamera(k.fov,w/h,.01,1e8);
    probe.quaternion.copy(quaternion);probe.setViewOffset(w,h,offset.x,offset.y,w,h);
    for(let attempt=0;attempt<32;attempt++){
      probe.position.copy(target).addScaledVector(direction,distance);probe.updateMatrixWorld(true);
      const projected=projectBox(subject,probe,w,h);
      if(projected.every(p=>p.x>=safe.x+4&&p.x<=safe.x+safe.width-4&&p.y>=safe.y+4&&p.y<=safe.y+safe.height-4))break;
      distance*=1.06;
    }
    position.copy(target).addScaledVector(direction,distance);
    const radius = subject.getSize(new THREE.Vector3()).length() / 2;
    this.lastTarget.copy(target);
    return Object.freeze({
      position, quaternion, target, fov: k.fov,
      near: Math.max(0.5, distance - radius * 4), far: distance + radius * 12 + 2000,
      viewOffset: Object.freeze({ x: w / 2 - (safe.x + safe.width / 2), y: h / 2 - (safe.y + safe.height / 2) }),
    });
  }

  getTarget() { return this.lastTarget.clone(); }
  dispose() { this.assembly = null; }
}

/** Space around chapter text and navigation, per breakpoint. */
export function storySafeRect(width: number, height: number): SafeRect {
  if (width <= 1050) {
    // Phone: chapter copy occupies a reserved top band; controls sit at the bottom.
    const top = Math.min(height * 0.42, 340), bottom = 132;
    return { x: 12, y: top, width: width - 24, height: Math.max(height - top - bottom, 160) };
  }
  const left = width * .43, top = 104, bottom = 132;
  return { x: left, y: top, width: width-left-48, height: Math.max(height-top-bottom,180) };
}

export function projectBox(box:THREE.Box3,camera:THREE.Camera,width:number,height:number){
  return Array.from({length:8},(_,i)=>{const v=new THREE.Vector3(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2,z:v.z};});
}

