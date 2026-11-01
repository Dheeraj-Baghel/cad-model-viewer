import * as THREE from 'three';
import type { Hierarchy, Model, Part } from '../model';

export type ImmutableTransform = Readonly<{
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  matrix: THREE.Matrix4;
}>;

export type AssemblyOccurrence = Readonly<{
  occurrenceId: string;
  sourceId: string;
  partId: string;
  name: string;
  parentId: string | null;
  hierarchyPath: readonly string[];
  mesh: THREE.Mesh;
  part: Part;
  originalLocal: ImmutableTransform;
  originalWorld: ImmutableTransform;
  worldPosition: THREE.Vector3;
  center: THREE.Vector3;
  bounds: THREE.Box3;
  materialNames: readonly string[];
  colors: readonly string[];
  metadata?: Readonly<Record<string, string | number>>;
}>;

export type NormalizedAssembly = Readonly<{
  assemblyId: string;
  name: string;
  units: string;
  scale: number;
  root: THREE.Group;
  bounds: THREE.Box3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  occurrences: readonly AssemblyOccurrence[];
  occurrenceById: ReadonlyMap<string, AssemblyOccurrence>;
  occurrenceByPartId: ReadonlyMap<string, AssemblyOccurrence>;
}>;

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'assembly';
}

function hierarchyPaths(root: Hierarchy | undefined) {
  const paths = new Map<number, string[]>();
  if (!root) return paths;
  const visit = (node: Hierarchy, parent: string[]) => {
    const own = [...parent, node.name || 'assembly'];
    node.meshes.forEach(index => { if (!paths.has(index)) paths.set(index, own); });
    node.children.forEach(child => visit(child, own));
  };
  visit(root, []);
  return paths;
}

function transform(object: THREE.Object3D, world: boolean): ImmutableTransform {
  object.updateWorldMatrix(true, false);
  const matrix = (world ? object.matrixWorld : object.matrix).clone();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return Object.freeze({ position, quaternion, scale, matrix });
}

function materialFacts(mesh: THREE.Mesh) {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const names: string[] = [];
  const colors: string[] = [];
  list.forEach((material, index) => {
    names.push(material.name || `${material.type} ${index + 1}`);
    const color = (material as THREE.MeshStandardMaterial).color;
    if (color?.isColor) colors.push(`#${color.getHexString()}`);
  });
  return { names, colors };
}

/**
 * Creates a read-only presentation index over the viewer's real mesh hierarchy.
 * Geometry and source transforms remain owned by the viewer. The adapter does not
 * merge meshes, invent parts, or write animation state into model metadata.
 */
export function normalizeAssembly(model: Model): NormalizedAssembly {
  model.group.updateWorldMatrix(true, true);
  const assemblyId = `${slug(model.name)}--${slug(model.source.split(' · ')[0])}`;
  const paths = hierarchyPaths(model.hierarchy);
  const occurrences: AssemblyOccurrence[] = model.parts.map((part, index) => {
    const path = paths.get(index) ?? [model.name, part.name];
    const parentPath = path.slice(0, -1);
    const occurrenceId = `${assemblyId}/${path.map(slug).join('/')}/${slug(part.name)}[${index}]`;
    const bounds = new THREE.Box3().setFromObject(part.mesh);
    const facts = materialFacts(part.mesh);
    return Object.freeze({
      occurrenceId,
      sourceId: part.id,
      partId: part.id,
      name: part.name,
      parentId: parentPath.length ? `${assemblyId}/${parentPath.map(slug).join('/')}` : null,
      hierarchyPath: Object.freeze([...path]),
      mesh: part.mesh,
      part,
      originalLocal: transform(part.mesh, false),
      originalWorld: transform(part.mesh, true),
      worldPosition: part.mesh.getWorldPosition(new THREE.Vector3()),
      center: bounds.getCenter(new THREE.Vector3()),
      bounds,
      materialNames: Object.freeze(facts.names),
      colors: Object.freeze(facts.colors),
      metadata: part.metadata ? Object.freeze({ ...part.metadata }) : undefined,
    });
  });
  const bounds = new THREE.Box3().setFromObject(model.group);
  const occurrenceById = new Map(occurrences.map(item => [item.occurrenceId, item]));
  const occurrenceByPartId = new Map(occurrences.map(item => [item.partId, item]));
  return Object.freeze({
    assemblyId,
    name: model.name,
    units: String(model.metadata?.Units ?? (model.source.includes('mm') ? 'mm' : 'source units')),
    scale: 1,
    root: model.group,
    bounds,
    center: bounds.getCenter(new THREE.Vector3()),
    size: bounds.getSize(new THREE.Vector3()),
    occurrences: Object.freeze(occurrences),
    occurrenceById,
    occurrenceByPartId,
  });
}
