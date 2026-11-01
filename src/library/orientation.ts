import * as THREE from 'three';
import type { Model } from '../model';
import type { Orientation } from './types';

// No STEP up-axis guessing. An importer must explicitly certify its up metadata;
// OCCT currently reports units, not up. Auto is identity absent that evidence.
export function orientationMatrix(model: Model, value: Orientation = model.orientation ?? 'auto') {
  const up = value === 'auto' ? model.sourceUp ?? 'y' : value;
  return new THREE.Matrix4().makeRotationX(up === 'z' ? -Math.PI/2 : 0);
}
export function applyOrientation(model: Model, value: Orientation) {
  model.orientation = value;
  // Exactly one reversible root transform; no vertex or component placement edits.
  model.group.quaternion.setFromRotationMatrix(orientationMatrix(model,value));
  model.group.updateMatrixWorld(true);
}
export function sourcePartMatrix(model: Model, partId: string) {
  const p = model.parts.find(p=>p.id===partId); if(!p)return null;
  return orientationMatrix(model).multiply(new THREE.Matrix4().compose(p.origin,new THREE.Quaternion().setFromEuler(p.rotation),new THREE.Vector3(1,1,1)));
}
export function orientedBounds(model: Model, ids?: ReadonlySet<string>) {
  const box = new THREE.Box3();
  for(const p of model.parts) { if(ids&&!ids.has(p.id))continue; if(!p.mesh.geometry.boundingBox)p.mesh.geometry.computeBoundingBox();box.union(p.mesh.geometry.boundingBox!.clone().applyMatrix4(sourcePartMatrix(model,p.id)!)); }
  return box;
}
