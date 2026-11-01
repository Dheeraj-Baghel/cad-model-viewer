import * as THREE from 'three';
import type { CameraView } from '../Viewer';

/*
 * Orientation cube. A CSS 3D cube driven by the inverse of the live camera
 * rotation, so it always shows how the model is oriented.
 * - Faces snap to the six standard views.
 * - Corner buttons give the four upper isometric views.
 * Every face is a real <button>, so the cube is keyboard and screen-reader accessible.
 */
type Props = { quaternion: [number, number, number, number]; onPick: (direction: [number, number, number], view?: CameraView) => void };

const FACES: { view: CameraView; label: string; transform: string }[] = [
  { view: 'front', label: 'Front', transform: 'translateZ(22px)' },
  { view: 'back', label: 'Back', transform: 'rotateY(180deg) translateZ(22px)' },
  { view: 'right', label: 'Right', transform: 'rotateY(90deg) translateZ(22px)' },
  { view: 'left', label: 'Left', transform: 'rotateY(-90deg) translateZ(22px)' },
  { view: 'top', label: 'Top', transform: 'rotateX(90deg) translateZ(22px)' },
  { view: 'bottom', label: 'Bottom', transform: 'rotateX(-90deg) translateZ(22px)' },
];
const CORNERS: { label: string; dir: [number, number, number]; cls: string }[] = [
  { label: 'Front right top', dir: [1, 1, 1], cls: 'fr' },
  { label: 'Front left top', dir: [-1, 1, 1], cls: 'fl' },
  { label: 'Back right top', dir: [1, 1, -1], cls: 'br' },
  { label: 'Back left top', dir: [-1, 1, -1], cls: 'bl' },
];

export default function ViewCube({ quaternion, onPick }: Props) {
  // CSS Y is down, so mirror the X and Z rotation components when going from camera space to CSS space.
  const q = new THREE.Quaternion(...quaternion).invert();
  const m = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion(-q.x, q.y, -q.z, q.w));
  const e = m.elements;
  const matrix = `matrix3d(${e[0]},${e[1]},${e[2]},0,${e[4]},${e[5]},${e[6]},0,${e[8]},${e[9]},${e[10]},0,0,0,0,1)`;
  return <nav className="view-cube" aria-label="Orientation cube">
    <div className="cube-box">
    <div className="view-cube-stage" aria-hidden="true">
      <div className="view-cube-body" style={{ transform: matrix }}>
        {FACES.map(face => <button key={face.view} className={`cube-face face-${face.view}`} style={{ transform: face.transform }} aria-hidden="true" tabIndex={-1} onClick={() => onPick([0, 0, 0], face.view)}>{face.label}</button>)}
      </div>
    </div>
    <div className="cube-corners" role="group" aria-label="Isometric corners">
      {CORNERS.map(corner => <button key={corner.cls} className={`cube-corner ${corner.cls}`} aria-label={`${corner.label} isometric`} data-tip={corner.label} onClick={() => onPick(corner.dir)} />)}
    </div>
    </div>
    {/* Faces turned away from the camera cannot be clicked, so all six views are also direct buttons. */}
    <div className="cube-views" role="group" aria-label="Standard views">
      {FACES.map(face => <button key={face.view} onClick={() => onPick([0, 0, 0], face.view)} aria-label={`Snap to ${face.label.toLowerCase()} view`} data-tip={`${face.label} view`}>{face.label[0]}{face.view === 'bottom' ? 'm' : face.view === 'back' ? 'k' : ''}</button>)}
    </div>
    <span className="cube-axes" aria-hidden="true"><i className="ax-x">X</i><i className="ax-y">Y</i><i className="ax-z">Z</i></span>
  </nav>;
}
