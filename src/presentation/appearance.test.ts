import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { Model } from '../model';
import type { ViewOptions } from '../Viewer';
import { AppearanceLayer, defaultAppearance, materialProperties, MATERIALS, originalAppearance, sanitizeAppearance, setMaterial } from './appearance';
import { applyPreset, PRESETS, restoreOriginal } from './presets';

function fixture() {
  const texture = new THREE.DataTexture(new Uint8Array([30, 80, 180, 255]), 1, 1); texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace; texture.repeat.set(2, 3);
  const source = new THREE.MeshPhysicalMaterial({ color: '#135798', map: texture, normalMap: texture, alphaMap: texture, side: THREE.DoubleSide, transparent: true, opacity: .3, depthWrite: false, roughness: .72, metalness: .2, emissive: '#102030', emissiveIntensity: .23, alphaTest: .04, clearcoat: .37, transmission: .14 });
  source.userData = { note: 'keep original' };
  const group = new THREE.Group();
  const parts = ['a', 'b'].map(id => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), source); group.add(mesh); return { id, mesh, origin: new THREE.Vector3(), rotation: new THREE.Euler(), explode: new THREE.Vector3(), name: id, material: 'source', color: '#135798', stage: '', description: '' }; });
  const model: Model = { group, parts, demo: false, name: 'shared', source: 'OBJ', triangles: 24, size: new THREE.Vector3(5, 5, 5) };
  return { model, source, texture, layer: new AppearanceLayer(model) };
}
const array = (m: THREE.Material | THREE.Material[]) => Array.isArray(m) ? m : [m];
function options(): ViewOptions { return { mode: 'studio', appearance: defaultAppearance(true), style: 'solid', background: 'light', environmentRotation: 90, turntable: false, turntableSpeed: 2, turntableDirection: -1, projection: 'orthographic', grid: false, axes: false, explode: .3, section: true, axis: 'z', sectionFlip: true, sectionPosition: 71, measure: true, measureReset: 7, transparency: 42, theme: 'light' }; }

describe('source-safe independent display materials', () => {
  it('Original is an equivalent clone with exact source texture sampling and alpha', () => {
    const { layer, source, texture } = fixture();
    const m = array(layer.apply('a', 'original', 'solid', false, false, 0))[0] as THREE.MeshPhysicalMaterial;
    expect(m).not.toBe(source); expect(materialProperties(m)).toEqual(materialProperties(source));
    expect(m.map).toBe(texture); expect(m.transparent).toBe(true); expect(m.opacity).toBe(.3);
    expect(m.side).toBe(THREE.DoubleSide); layer.dispose();
  });
  it('keeps material shader hooks on Original clones', () => {
    const { layer, source } = fixture(); source.onBeforeCompile = vi.fn(); source.customProgramCacheKey = () => 'original-hook';
    const m = array(layer.apply('a', 'original', 'solid', false, false, 0))[0];
    expect(m.onBeforeCompile).toBe(source.onBeforeCompile); expect(m.customProgramCacheKey).toBe(source.customProgramCacheKey); layer.dispose();
  });
  it('canonical sampling evidence allows renderer UV-cache updates, not texture edits', () => {
    const { layer, texture } = fixture(); texture.updateMatrix(); // Three renderer's derived cache update
    expect(layer.evidence().sourceUnchanged).toBe(true);
    texture.repeat.x = 4; expect(layer.evidence().sourceUnchanged).toBe(false); layer.dispose();
  });
  it('shared source gives independent per-part selection, alpha and clipping', () => {
    const { layer, source } = fixture(); const before = materialProperties(source);
    const a = array(layer.apply('a', 'original', 'solid', true, false, 70, new THREE.Plane(new THREE.Vector3(1, 0, 0), 2)))[0];
    const b = array(layer.apply('b', 'original', 'solid', false, false, 0))[0];
    expect(a).not.toBe(b); expect(a.opacity).toBeCloseTo(.09); expect(b.opacity).toBe(.3);
    expect(a.clippingPlanes).toHaveLength(1); expect(b.clippingPlanes).toBeNull();
    expect(materialProperties(source)).toEqual(before); layer.dispose();
  });
  it('restores exact original after repeated finish/style/selection permutations', () => {
    const { layer, source, texture, model } = fixture(); const before = materialProperties(source), tex = texture.version, pixels = [...texture.image.data];
    const geometry = model.parts.map(p => [...p.mesh.geometry.attributes.position.array]);
    for (let round = 0; round < 5; round++) for (const c of MATERIALS) for (const style of ['solid', 'wireframe', 'edges', 'clay', 'xray'] as const) {
      layer.apply('a', c.id, style, true, true, 63, new THREE.Plane(new THREE.Vector3(0, 1, 0), 1));
      layer.apply('b', c.id, style, false, false, 0);
      const restored = array(layer.apply('a', 'original', 'solid', false, false, 0))[0];
      expect(materialProperties(restored)).toEqual(before); expect(layer.evidence().sourceUnchanged).toBe(true);
    }
    expect(texture.version).toBe(tex); expect([...texture.image.data]).toEqual(pixels);
    expect(model.parts.map(p => [...p.mesh.geometry.attributes.position.array])).toEqual(geometry); layer.dispose();
  });
  it('material disposal never disposes sources or shared textures', () => {
    const { layer, source, texture, model } = fixture(); const sourceDispose = vi.fn(), textureDispose = vi.fn(), cloneDispose = vi.fn();
    source.addEventListener('dispose', sourceDispose); texture.addEventListener('dispose', textureDispose);
    const display = layer.apply('a', 'original', 'solid', false, false, 0); array(display)[0].addEventListener('dispose', cloneDispose); model.parts[0].mesh.material = display;
    layer.apply('b', 'steel', 'edges', false, false, 0); layer.dispose();
    expect(model.parts[0].mesh.material).toBe(source); expect(cloneDispose).toHaveBeenCalledOnce();
    expect(sourceDispose).not.toHaveBeenCalled(); expect(textureDispose).not.toHaveBeenCalled();
  });
  it('keeps scalar and multi-material shapes without changing geometry groups', () => {
    const { model, source } = fixture(); const second = new THREE.MeshPhongMaterial({ color: '#aa0011', shininess: 60, side: THREE.BackSide });
    model.parts[0].mesh.material = [source, second]; const layer = new AppearanceLayer(model);
    const result = layer.apply('a', 'original', 'solid', false, false, 0);
    expect(Array.isArray(result)).toBe(true); expect(array(result)).toHaveLength(2);
    expect(materialProperties(array(result)[1])).toEqual(materialProperties(second)); layer.dispose();
  });
  it('X-ray is transparent, depth-write off; selected body stays source-shaded', () => {
    const { layer } = fixture();
    const m = array(layer.apply('a', 'original', 'xray', false, false, 0))[0];
    expect(m.type).toBe('MeshBasicMaterial'); expect(m.transparent).toBe(true); expect(m.depthWrite).toBe(false); expect(m.side).toBe(THREE.DoubleSide);
    const selected = array(layer.apply('a', 'original', 'xray', true, false, 0))[0]; expect(selected.type).toBe('MeshPhysicalMaterial'); layer.dispose();
  });
  it('clay hides albedo without modifying source maps, returning Original restores them', () => {
    const { layer, texture } = fixture();
    const m = array(layer.apply('a', 'original', 'clay', false, false, 0))[0] as THREE.MeshPhysicalMaterial;
    expect(m.map).toBeNull(); expect(m.roughness).toBe(.94); expect(m.metalness).toBe(0);
    expect((array(layer.apply('a', 'original', 'solid', false, false, 0))[0] as THREE.MeshPhysicalMaterial).map).toBe(texture); layer.dispose();
  });
  it('reuses cached material objects and does not allocate on hover/selection loops', () => {
    const { layer } = fixture(); const initial = layer.apply('a', 'original', 'solid', false, false, 0);
    for (let i = 0; i < 100; i++) expect(layer.apply('a', 'original', 'solid', i % 2 === 0, true, i % 95)).toBe(initial);
    expect(layer.evidence().cachedMaterials).toBe(1); layer.dispose();
  });
});

describe('lighting-independent choices, defaults and presets', () => {
  it('imports default Original, curated showcase keeps authored palette, Inspect defaults Original', () => {
    expect(defaultAppearance(false)).toEqual(originalAppearance());
    expect(defaultAppearance(true).studio.material).toBe('authored'); expect(defaultAppearance(true).inspect.material).toBe('original');
  });
  it('scope changes only requested lighting mode; Studio choice never leaks to Inspect', () => {
    const s = defaultAppearance(false), selected = setMaterial(s, 'studio', 'brass', 'a');
    expect(selected.studio.parts.a).toBe('brass'); expect(selected.inspect).toBe(s.inspect);
    const all = setMaterial(selected, 'studio', 'steel'); expect(all.studio).toEqual({ material: 'steel', parts: {} }); expect(s.studio.material).toBe('original');
  });
  it('validates imported choices and drops missing component ids', () => {
    expect(sanitizeAppearance({ studio: { material: 'authored', parts: { a: 'brass', b: 'unsupported' } } }, false, new Set(['a']))).toEqual({ studio: { material: 'original', parts: { a: 'brass' } }, inspect: { material: 'original', parts: {} } });
    expect(sanitizeAppearance(null, true)).toEqual(defaultAppearance(true));
  });
  for (const p of PRESETS) it(`${p.label} patches only documented fields; unrelated state unchanged`, () => {
    const o = options(), snapshot = structuredClone(o), { next, changed } = applyPreset(o, p.id, 65);
    for (const key of Object.keys(o) as (keyof ViewOptions)[]) if (!Object.hasOwn(p.patch, key)) expect(next[key]).toEqual(o[key]);
    expect(o).toEqual(snapshot); expect(changed.every(k => Object.hasOwn(p.patch, k))).toBe(true);
    expect(next.appearance).toBe(o.appearance); expect(next.axis).toBe('z'); expect(next.sectionPosition).toBe(71);
  });
  it('technical preset never invents components for a single mesh', () => { expect(applyPreset(options(), 'technical', 1).next.explode).toBe(0); });
  it('restore clears both material policies/style/alpha only, not camera/section/etc', () => {
    const o = options(), r = restoreOriginal(o); expect(r.appearance).toEqual(originalAppearance());
    expect(r.style).toBe('solid'); expect(r.transparency).toBe(0);
    for (const key of Object.keys(o) as (keyof ViewOptions)[]) if (!['appearance', 'style', 'transparency'].includes(key)) expect(r[key]).toEqual(o[key]);
  });
});
