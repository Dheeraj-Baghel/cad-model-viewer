import * as THREE from 'three';
export type Unit = 'mm' | 'cm' | 'in';
export type Hierarchy = { name: string; meshes: number[]; children: Hierarchy[] };
export type Part = { id: string; name: string; material: string; color: string; mesh: THREE.Mesh; origin: THREE.Vector3; rotation: THREE.Euler; explode: THREE.Vector3; stage: string; description: string; metadata?: Record<string, string | number> };
export type Model = { name: string; source: string; parts: Part[]; group: THREE.Group; size: THREE.Vector3; triangles: number; demo: boolean; hierarchy?: Hierarchy; metadata?: Record<string, string | number>; warnings?: string[]; orientation?: 'auto'|'y'|'z'; sourceUp?: 'y'|'z' };
export const MAX_BYTES = 40 * 1024 * 1024;
export const MAX_TRIANGLES = 800_000;
export const SUPPORTED_EXTENSIONS = ['stl', 'obj', 'step', 'stp'];
export function extension(name: string) { return name.split('.').pop()?.toLowerCase() ?? ''; }
export function validateFile(file: Pick<File, 'name' | 'size'>) {
  if (!SUPPORTED_EXTENSIONS.includes(extension(file.name))) throw new Error('Choose STL, STEP/STP or OBJ. OBJ may be accompanied by MTL and image files.');
  if (file.size > MAX_BYTES) throw new Error('The file exceeds the 40 MB local import limit. Export a lighter model.');
  if (!file.size) throw new Error('The file is empty. Choose a model with geometry.');
}
export function formatDimension(value: number, unit: Unit) { return (value / convertToMillimeters(1, unit)).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }); }
export function convertToMillimeters(value: number, unit: Unit) { return value * (unit === 'cm' ? 10 : unit === 'in' ? 25.4 : 1); }
export function triangleCount(geometry: THREE.BufferGeometry) { return Math.floor((geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3); }
export function materials(mesh: THREE.Mesh): THREE.Material[] { return Array.isArray(mesh.material) ? mesh.material : [mesh.material]; }
export function disposeModel(model: Model) {
  const textures = new Set<THREE.Texture>(), mats = new Set<THREE.Material>();
  model.parts.forEach(p => { p.mesh.geometry.dispose(); materials(p.mesh).forEach(m => { mats.add(m); Object.values(m).forEach(v => { if (v instanceof THREE.Texture) textures.add(v); }); }); });
  textures.forEach(t => t.dispose()); mats.forEach(m => m.dispose());
}

// The built-in sample is the Axis-1 showcase actuator (CC0 gearbox core + project-authored parts).
export { createActuator as createDemo } from './showcase/actuator';
