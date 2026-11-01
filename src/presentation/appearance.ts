import * as THREE from 'three';
import type { Model } from '../model';

/* Checkpoint 2: lighting and material policy are separate. Imported Studio defaults
 * to Original; only the curated showcase defaults to its authored Studio palette.
 * All display materials are independent clones. Source materials, geometry and
 * shared textures are immutable; this layer owns/disposes materials ONLY.
 * Inspect and Studio have separate policies, so a Studio override cannot leak.
 */
export type RenderStyle = 'solid' | 'wireframe' | 'edges' | 'clay' | 'xray';
export type LightingMode = 'studio' | 'inspect';
export type MaterialChoice = 'original' | 'authored' | 'steel' | 'aluminum' | 'brass' | 'plastic';
export type MaterialPolicy = { material: MaterialChoice; parts: Record<string, MaterialChoice> };
export type AppearanceState = { studio: MaterialPolicy; inspect: MaterialPolicy };
export type MaterialSet = THREE.Material | THREE.Material[];
export const MATERIALS: { id: MaterialChoice; label: string; color: string }[] = [
  { id: 'original', label: 'Original', color: 'linear-gradient(135deg,#798da2,#d5b378,#718b79)' },
  { id: 'steel', label: 'Steel', color: '#7d8997' },
  { id: 'aluminum', label: 'Aluminum', color: '#c6cbd1' },
  { id: 'brass', label: 'Brass', color: '#b88c47' },
  { id: 'plastic', label: 'Plastic', color: '#4a6475' },
  { id: 'authored', label: 'Curated palette', color: 'linear-gradient(135deg,#737b84,#343a41,#a97649)' },
];
export function defaultAppearance(curated: boolean): AppearanceState {
  return { studio: { material: curated ? 'authored' : 'original', parts: {} }, inspect: { material: 'original', parts: {} } };
}
export function setMaterial(state: AppearanceState, mode: LightingMode, material: MaterialChoice, partId?: string): AppearanceState {
  const old = state[mode];
  // Whole-model scope deliberately replaces all overrides in this lighting mode.
  return { ...state, [mode]: partId ? { ...old, parts: { ...old.parts, [partId]: material } } : { material, parts: {} } };
}
export function originalAppearance(): AppearanceState { return defaultAppearance(false); }
export function sanitizeAppearance(value: unknown, curated: boolean, ids?: ReadonlySet<string>): AppearanceState {
  const defaults = defaultAppearance(curated), input = value as Partial<AppearanceState> | null;
  const valid = (x: unknown): x is MaterialChoice => MATERIALS.some(m => m.id === x) && (curated || x !== 'authored');
  for (const mode of ['studio', 'inspect'] as const) {
    const p = input?.[mode];
    if (!p || typeof p !== 'object') continue;
    if (valid(p.material)) defaults[mode].material = p.material;
    if (p.parts && typeof p.parts === 'object') for (const [id, choice] of Object.entries(p.parts)) {
      if ((!ids || ids.has(id)) && valid(choice) && !['__proto__', 'constructor', 'prototype'].includes(id)) defaults[mode].parts[id] = choice;
    }
  }
  return defaults;
}

const finishes = [
  { color: '#737b84', metalness: .92, roughness: .34 },
  { color: '#aab0b7', metalness: .9, roughness: .25 },
  { color: '#343a41', metalness: .82, roughness: .43 },
  { color: '#a97649', metalness: .82, roughness: .32 },
];
const finishByChoice = {
  steel: { color: '#8793a0', metalness: .92, roughness: .32 },
  aluminum: { color: '#ccd1d7', metalness: .93, roughness: .23 },
  brass: { color: '#be934d', metalness: .88, roughness: .30 },
  plastic: { color: '#4c6c80', metalness: 0, roughness: .55 },
};
function asArray(value: MaterialSet) { return Array.isArray(value) ? value : [value]; }

/** Snapshot every enumerable rendering property, excluding object identity and engine
 * counters/listeners. Texture identity + sampling properties are recorded, not pixels;
 * shared image bytes are also protected by tests. Automatic UV matrices are derived
 * on a new Matrix3: renderer-owned cache updates are not confused with sampling edits.
 * Useful in both unit/browser gates.
 */
export function materialProperties(material: THREE.Material): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(material)) {
    if (['id', 'uuid', 'version', '_listeners'].includes(k) || k.startsWith('_')) continue;
    if (v === null || ['string', 'boolean', 'number'].includes(typeof v)) result[k] = v;
    else if (v instanceof THREE.Color) result[k] = v.toArray();
    else if (v instanceof THREE.Vector2 || v instanceof THREE.Vector3 || v instanceof THREE.Vector4 || v instanceof THREE.Matrix3 || v instanceof THREE.Matrix4) result[k] = v.toArray();
    else if (v instanceof THREE.Texture) result[k] = { uuid: v.uuid, version: v.version, source: v.source.uuid, colorSpace: v.colorSpace, wrapS: v.wrapS, wrapT: v.wrapT, minFilter: v.minFilter, magFilter: v.magFilter, flipY: v.flipY, anisotropy: v.anisotropy, offset: v.offset.toArray(), repeat: v.repeat.toArray(), rotation: v.rotation, center: v.center.toArray(), matrixAutoUpdate: v.matrixAutoUpdate, matrix: (v.matrixAutoUpdate ? new THREE.Matrix3().setUvTransform(v.offset.x, v.offset.y, v.repeat.x, v.repeat.y, v.rotation, v.center.x, v.center.y) : v.matrix).toArray() };
    else if (Array.isArray(v)) result[k] = v.map(a => a instanceof THREE.Plane ? { normal: a.normal.toArray(), constant: a.constant } : a);
    else if (k === 'userData') result[k] = structuredClone(v);
  }
  return result;
}

function displayMaterial(source: THREE.Material, choice: MaterialChoice, style: RenderStyle, index: number): THREE.Material {
  // Exact copy for Original, including Phong/Physical, maps, side and source alpha.
  const original = source as THREE.MeshStandardMaterial;
  if (style !== 'clay' && style !== 'xray' && choice === 'original') {
    const clone = source.clone();
    // Material.copy omits custom hooks; retain them by reference (never call here).
    clone.onBeforeCompile = source.onBeforeCompile; clone.onBeforeRender = source.onBeforeRender;
    clone.customProgramCacheKey = source.customProgramCacheKey;
    return clone;
  }
  const finish = choice === 'authored' ? finishes[index % finishes.length] : choice === 'original' ? finishes[0] : finishByChoice[choice];
  const material = style === 'xray'
    ? new THREE.MeshBasicMaterial({ color: '#85bbd9', opacity: .13, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true })
    : new THREE.MeshPhysicalMaterial({ color: style === 'clay' ? '#b5bcc3' : finish.color, metalness: style === 'clay' ? 0 : finish.metalness, roughness: style === 'clay' ? .94 : finish.roughness, clearcoat: style === 'clay' ? 0 : .12, clearcoatRoughness: .45, envMapIntensity: 1.15 });
  if (style !== 'xray') {
    // Keep authored translucency, sidedness and texture shape detail. Explicit finish
    // overrides hide albedo maps/vertex colours; Original always keeps all maps.
    material.side = source.side; material.opacity = source.opacity; material.transparent = source.transparent;
    material.depthWrite = source.depthWrite; material.depthTest = source.depthTest;
    material.alphaTest = source.alphaTest; material.alphaHash = source.alphaHash;
    const pbr = material as THREE.MeshPhysicalMaterial;
    pbr.alphaMap = original.alphaMap ?? null;
    if (style !== 'clay') {
      pbr.normalMap = original.normalMap ?? null; pbr.bumpMap = original.bumpMap ?? null;
      pbr.bumpScale = original.bumpScale ?? 1;
      if (original.normalScale) pbr.normalScale.copy(original.normalScale);
      // Preserve existing showcase policy (textured showcase parts retain their map).
      if (choice === 'authored' && original.map) { pbr.map = original.map; pbr.color.set('#ffffff'); pbr.metalness = Math.min(original.metalness ?? .05, .2); pbr.roughness = Math.max(original.roughness ?? .45, .38); pbr.clearcoat = 0; }
    }
  }
  return material;
}

type Cached = { value: MaterialSet; base: THREE.Material[] };
export class AppearanceLayer {
  private sources = new Map<string, MaterialSet>();
  private initial = new Map<string, Record<string, unknown>[]>();
  private cache = new Map<string, Cached>();
  constructor(private model: Model) {
    for (const p of model.parts) { this.sources.set(p.id, p.mesh.material); this.initial.set(p.id, asArray(p.mesh.material).map(materialProperties)); }
  }
  apply(partId: string, choice: MaterialChoice, style: RenderStyle, selected: boolean, hover: boolean, transparency: number, plane?: THREE.Plane): MaterialSet {
    const index = this.model.parts.findIndex(p => p.id === partId), source = this.sources.get(partId)!;
    // Selected X-ray body is solid and uses the current chosen finish/source.
    const actualStyle = style === 'xray' && selected ? 'solid' : style;
    const key = `${partId}|${choice}|${actualStyle}`;
    let entry = this.cache.get(key);
    if (!entry) {
      const display = asArray(source).map((m, i) => displayMaterial(m, choice, actualStyle, index + i));
      entry = { value: Array.isArray(source) ? display : display[0], base: display.map(m => m.clone()) };
      this.cache.set(key, entry);
    }
    asArray(entry.value).forEach((m, i) => {
      const b = entry!.base[i], raw = m as THREE.MeshStandardMaterial, base = b as THREE.MeshStandardMaterial;
      if (raw.emissive && base.emissive) { raw.emissive.copy(base.emissive); if (selected || hover) raw.emissive.lerp(new THREE.Color(selected ? '#ff9a3c' : '#7fb0ff'), .5); raw.emissiveIntensity = base.emissiveIntensity + (selected ? .35 : hover ? .14 : 0); }
      const opacity = b.opacity * (selected ? 1 - transparency / 100 : 1), transparent = b.transparent || opacity < 1;
      const wire = actualStyle === 'wireframe' || Boolean(base.wireframe);
      const planes = [...(b.clippingPlanes ?? []), ...(plane ? [plane] : [])];
      if (raw.wireframe !== wire || m.transparent !== transparent || Boolean(m.clippingPlanes?.length) !== Boolean(planes.length)) m.needsUpdate = true;
      raw.wireframe = wire; m.opacity = opacity; m.transparent = transparent;
      m.depthWrite = b.depthWrite && !(selected && transparency > 0); m.clippingPlanes = plane ? planes : b.clippingPlanes;
      m.clipShadows = plane ? true : b.clipShadows;
    });
    return entry.value;
  }
  cloneOriginal(partId: string): MaterialSet { const source=this.sources.get(partId)!; const copy=asArray(source).map(m=>m.clone()); return Array.isArray(source)?copy:copy[0]; }
  evidence() {
    return { sources: this.model.parts.map(p => ({ id: p.id, values: asArray(this.sources.get(p.id)!).map(materialProperties) })), sourceUnchanged: this.model.parts.every(p => JSON.stringify(asArray(this.sources.get(p.id)!).map(materialProperties)) === JSON.stringify(this.initial.get(p.id))), cachedMaterials: [...this.cache.values()].reduce((n, c) => n + asArray(c.value).length, 0) };
  }
  dispose() {
    // Restore references FIRST so model teardown can dispose owned source assets.
    for (const p of this.model.parts) p.mesh.material = this.sources.get(p.id)!;
    for (const c of this.cache.values()) for (const m of [...asArray(c.value), ...c.base]) m.dispose();
    this.cache.clear(); this.sources.clear(); this.initial.clear();
    // Material.dispose does not dispose textures. Never do that here.
  }
}
