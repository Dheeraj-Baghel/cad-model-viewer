import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import { createDemo, disposeModel } from './model';
import type { Model } from './model';
import { buildTree, componentLabels, modelFingerprint, searchComponents, assembledBounds } from './workspace/modelUtils';
import { compatibility, dormantModels, loadViews, storeViews, uniqueViewName } from './workspace/savedViews';
import type { SavedView } from './workspace/savedViews';
import { compatibleMeasurements, createMeasurement, measurePoint } from './workspace/measure';
import { normalizeAssembly } from './presentation/assemblyAdapter';
import { ExplosionController } from './presentation/ExplosionController';
import { featuredExplosionMetadata } from './presentation/featuredAssembly';
import { defaultAppearance, setMaterial } from './presentation/appearance';

/** Mimics an Open Cascade import: 18 solids all named "SOLID" under repeated assembly names. */
function stepLike(): Model {
  const group = new THREE.Group();
  const parts = Array.from({ length: 6 }, (_, i) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshStandardMaterial());
    mesh.position.set(i * 20, 0, 0); mesh.userData.partId = `import-${i}`; group.add(mesh);
    return { id: `import-${i}`, name: 'SOLID', material: 'STEP appearance', color: '#888', mesh, origin: mesh.position.clone(), rotation: mesh.rotation.clone(), explode: new THREE.Vector3(0, 30, 0), stage: 'gears', description: '' };
  });
  return { name: 'as1 pe 203', source: 'STP', parts, group, size: new THREE.Vector3(110, 10, 10), triangles: 72, demo: false,
    hierarchy: { name: '', meshes: [], children: [{ name: 'ASM', meshes: [], children: [{ name: 'PLATE', meshes: [0], children: [] }, { name: 'BRACKET', meshes: [1, 2], children: [] }, { name: 'BRACKET', meshes: [3, 4], children: [] }, { name: 'ROD', meshes: [5], children: [] }] }] } };
}

describe('workspace component naming and search', () => {
  it('numbers repeated source names without changing the source name', () => {
    const model = stepLike(), labels = componentLabels(model);
    expect([...labels.values()].map(l => l.label)).toEqual(['SOLID #01', 'SOLID #02', 'SOLID #03', 'SOLID #04', 'SOLID #05', 'SOLID #06']);
    expect(model.parts.every(p => p.name === 'SOLID')).toBe(true);
    expect(labels.get('import-3')).toMatchObject({ source: 'SOLID', instance: 4, instanceCount: 6, path: ['ASM', 'BRACKET (2)'] });
  });
  it('flattens unnamed wrappers and numbers repeated sibling assemblies', () => {
    const tree = buildTree(stepLike());
    expect(tree.children.map(c => c.name)).toEqual(['ASM']);
    expect(tree.children[0].children.map(c => c.name)).toEqual(['PLATE', 'BRACKET (1)', 'BRACKET (2)', 'ROD']);
    expect(tree.all).toHaveLength(6);
  });
  it('keeps unique names untouched on the showcase and lists every part once', () => {
    const model = createDemo(), labels = componentLabels(model), tree = buildTree(model);
    expect(labels.get('sun')?.label).toBe('Sun gear');
    expect(new Set(tree.all).size).toBe(model.parts.length);
    disposeModel(model);
  });
  it('searches across label, assembly path and material, all terms required', () => {
    const model = stepLike(), labels = componentLabels(model);
    expect(searchComponents(model, labels, 'bracket (2)')).toEqual(['import-3', 'import-4']);
    expect(searchComponents(model, labels, 'solid #06')).toEqual(['import-5']);
    expect(searchComponents(model, labels, 'step plate')).toEqual(['import-0']);
    expect(searchComponents(model, labels, '  ')).toEqual([]);
  });
});

describe('saved inspection views', () => {
  const store = new Map<string, string>();
  beforeEach(() => { store.clear(); (globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v); }, removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 } as Storage; });
  const view = (fingerprint: string, hidden: string[] = []): SavedView => ({ version: 1, id: `v${Math.random()}`, name: 'A', created: 1, fingerprint, modelName: 'as1', partCount: 6, camera: { projection: 'orthographic', position: [1, 2, 3], target: [0, 0, 0], up: [0, 1, 0], zoom: 1, orthoHeight: 50, fov: 34 }, hidden, explode: 0.5, section: { enabled: true, axis: 'x', position: 40, flip: false }, style: 'solid' });
  it('fingerprints by structure: same model same id, different model different id', () => {
    const a = stepLike(), b = stepLike(), demo = createDemo();
    expect(modelFingerprint(a)).toBe(modelFingerprint(b));
    expect(modelFingerprint(a)).not.toBe(modelFingerprint(demo));
    disposeModel(demo);
  });
  it('round-trips through storage and drops malformed records', () => {
    const fp = modelFingerprint(stepLike());
    storeViews([view(fp)]);
    store.set('cadmium-saved-views-v1', JSON.stringify([...JSON.parse(store.get('cadmium-saved-views-v1')!), { version: 1, id: 'bad' }]));
    expect(loadViews()).toHaveLength(1);
  });
  it('retains old v1 views and round-trips new independent lighting/material policies', () => {
    const legacy = view('demo'), next = { ...view('demo'), style: 'xray' as const, lighting: 'studio' as const, transparency: 60, appearance: setMaterial(defaultAppearance(false), 'studio', 'brass', 'import-2') };
    storeViews([legacy, next]); const loaded = loadViews();
    expect(loaded).toEqual([legacy, next]); expect(loaded[0].appearance).toBeUndefined();
    expect(loaded[1].appearance?.inspect.material).toBe('original');
    expect(loaded[1].appearance?.studio.parts['import-2']).toBe('brass');
  });
  it('refuses views for another model or with missing components', () => {
    const model = stepLike(), fp = modelFingerprint(model), ids = new Set(model.parts.map(p => p.id));
    expect(compatibility(view(fp, ['import-2']), fp, ids)).toEqual({ ok: true });
    expect(compatibility(view('other'), fp, ids).ok).toBe(false);
    expect(compatibility(view(fp, ['import-99']), fp, ids).ok).toBe(false);
    expect(dormantModels([view('other'), view('other'), view(fp)], fp)).toEqual([{ fingerprint: 'other', modelName: 'as1', partCount: 6, count: 2 }]);
    expect(uniqueViewName([view(fp)], fp)).toBe('View 2');
  });
});

describe('measurements are independent of presentation transforms', () => {
  it('uses assembled positions while the showcase is exploded', () => {
    const model = createDemo(), controller = new ExplosionController();
    controller.initialize(normalizeAssembly(model), featuredExplosionMetadata(model));
    const a = measurePoint(model, 'cover', new THREE.Vector3(0, 0, 0))!, b = measurePoint(model, 'lower-case', new THREE.Vector3(0, 0, 0))!;
    const assembled = createMeasurement(a, b, 1).distance;
    controller.setExplosionAmount(1);
    const cover = model.parts.find(p => p.id === 'cover')!, base = model.parts.find(p => p.id === 'lower-case')!;
    const displayed = cover.mesh.position.distanceTo(base.mesh.position);
    const again = createMeasurement(measurePoint(model, 'cover', new THREE.Vector3())!, measurePoint(model, 'lower-case', new THREE.Vector3())!, 2).distance;
    expect(again).toBeCloseTo(assembled, 6);
    expect(displayed).toBeGreaterThan(assembled + 50);
    expect(assembled).toBeCloseTo(cover.origin.distanceTo(base.origin), 6);
    controller.dispose(); disposeModel(model);
  });
  it('reports axis deltas and drops measurements when components disappear', () => {
    const model = stepLike();
    const m = createMeasurement(measurePoint(model, 'import-0', new THREE.Vector3(5, 0, 0))!, measurePoint(model, 'import-1', new THREE.Vector3(-5, 0, 0))!, 1);
    expect(m.distance).toBeCloseTo(10, 6);
    expect(m.delta).toEqual([10, 0, 0]);
    const other = stepLike(); other.parts.splice(1, 1);
    expect(compatibleMeasurements([m], other)).toHaveLength(0);
    expect(compatibleMeasurements([m], model)).toHaveLength(1);
    expect(assembledBounds(model).getSize(new THREE.Vector3()).x).toBeCloseTo(110, 6);
  });
});
