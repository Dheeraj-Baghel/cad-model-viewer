import * as THREE from 'three';
import type { Model } from '../model';
import { assembledMatrix } from './modelUtils';

/*
 * Point-to-point mesh measurements.
 *
 * A picked point is stored in its component's LOCAL frame. Its "assembled"
 * position applies the component's engineering transform (Part.origin/rotation),
 * so the reported distance never includes explosion or story offsets. In an
 * exploded view the displayed markers follow the separated components, but the
 * numbers still describe the assembled geometry.
 *
 * Points lie on tessellated surfaces (triangle meshes, including tessellated
 * STEP). This is not exact B-rep metrology.
 */

export type Vec3 = [number, number, number];
export type MeasurePoint = { partId: string; local: Vec3; assembled: Vec3 };
export type Measurement = { id: string; index: number; a: MeasurePoint; b: MeasurePoint; distance: number; delta: Vec3 };

export function measurePoint(model: Model, partId: string, local: THREE.Vector3): MeasurePoint | null {
  const matrix = assembledMatrix(model, partId);
  if (!matrix) return null;
  const assembled = local.clone().applyMatrix4(matrix);
  return { partId, local: local.toArray() as Vec3, assembled: assembled.toArray() as Vec3 };
}

export function createMeasurement(a: MeasurePoint, b: MeasurePoint, index: number): Measurement {
  const pa = new THREE.Vector3(...a.assembled), pb = new THREE.Vector3(...b.assembled);
  const d = pb.clone().sub(pa);
  return { id: `m${index}-${Math.round(performance.now())}`, index, a, b, distance: d.length(), delta: [Math.abs(d.x), Math.abs(d.y), Math.abs(d.z)] };
}

/** Only measurements whose components still exist in the model are kept (model replacement). */
export function compatibleMeasurements(list: Measurement[], model: Model) {
  const ids = new Set(model.parts.map(part => part.id));
  return list.filter(m => ids.has(m.a.partId) && ids.has(m.b.partId));
}
