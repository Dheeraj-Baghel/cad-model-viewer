import type { Hierarchy, Model } from '../model';
import { triangleCount } from '../model';
import { orientedBounds, sourcePartMatrix } from '../library/orientation';

/*
 * Pure workspace helpers: display labels that disambiguate repeated source names
 * (for example 18 STEP solids all called "SOLID") without renaming them, hierarchy
 * paths, component search, a stable model fingerprint and assembled bounds.
 */

export type ComponentLabel = Readonly<{
  id: string;
  /** Unique, human-readable label. Equal to the source name when it is already unique. */
  label: string;
  /** Unmodified name from the source file. */
  source: string;
  /** Ancestor assembly names, root first, with repeated sibling names numbered. */
  path: readonly string[];
  /** 1-based ordinal among parts that share the same source name, or null if unique. */
  instance: number | null;
  instanceCount: number;
}>;

export type TreeNode = Readonly<{
  key: string;
  name: string;
  parts: readonly number[];
  children: readonly TreeNode[];
  /** Every part index under this node, including descendants. */
  all: readonly number[];
}>;

/** Normalises the source hierarchy: skips unnamed wrapper nodes and numbers repeated sibling names. */
export function buildTree(model: Model): TreeNode {
  const index = new Set<number>();
  const walk = (node: Hierarchy, key: string, name: string): TreeNode => {
    const seen = new Map<string, number>();
    const counts = new Map<string, number>();
    node.children.forEach(child => counts.set(child.name || '', (counts.get(child.name || '') ?? 0) + 1));
    const children: TreeNode[] = [];
    const parts = node.meshes.filter(i => i >= 0 && i < model.parts.length && !index.has(i));
    parts.forEach(i => index.add(i));
    node.children.forEach((child, i) => {
      const raw = child.name || '';
      const n = (seen.get(raw) ?? 0) + 1;
      seen.set(raw, n);
      const label = raw ? ((counts.get(raw) ?? 0) > 1 ? `${raw} (${n})` : raw) : '';
      const built = walk(child, `${key}/${i}`, label);
      // Unnamed wrapper nodes are flattened into their parent.
      if (!label) { children.push(...built.children); (parts as number[]).push(...built.parts); }
      else children.push(built);
    });
    const all = [...parts, ...children.flatMap(child => child.all)];
    return { key, name, parts, children, all };
  };
  const root = model.hierarchy ? walk(model.hierarchy, 'root', '') : { key: 'root', name: '', parts: [], children: [], all: [] };
  // Any part not referenced by the hierarchy is still listed at the root.
  const missing = model.parts.map((_, i) => i).filter(i => !index.has(i));
  if (!missing.length) return root;
  return { ...root, parts: [...root.parts, ...missing], all: [...root.all, ...missing] };
}

export function componentLabels(model: Model, tree: TreeNode = buildTree(model)): Map<string, ComponentLabel> {
  const paths = new Map<number, string[]>();
  const visit = (node: TreeNode, path: string[]) => {
    const here = node.name ? [...path, node.name] : path;
    node.parts.forEach(i => paths.set(i, here));
    node.children.forEach(child => visit(child, here));
  };
  visit(tree, []);
  const totals = new Map<string, number>();
  model.parts.forEach(part => totals.set(part.name, (totals.get(part.name) ?? 0) + 1));
  const ordinal = new Map<string, number>();
  const out = new Map<string, ComponentLabel>();
  model.parts.forEach((part, i) => {
    const count = totals.get(part.name) ?? 1;
    const n = (ordinal.get(part.name) ?? 0) + 1;
    ordinal.set(part.name, n);
    const width = String(count).length;
    out.set(part.id, Object.freeze({
      id: part.id,
      source: part.name,
      label: count > 1 ? `${part.name} #${String(n).padStart(Math.max(width, 2), '0')}` : part.name,
      path: Object.freeze(paths.get(i) ?? []),
      instance: count > 1 ? n : null,
      instanceCount: count,
    }));
  });
  return out;
}

/** Case-insensitive search across label, source name, assembly path, material and group. */
export function searchComponents(model: Model, labels: Map<string, ComponentLabel>, query: string): string[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return model.parts.filter(part => {
    const l = labels.get(part.id);
    const hay = [l?.label, l?.source, ...(l?.path ?? []), part.material, String(part.metadata?.Group ?? '')].join(' ').toLowerCase();
    return terms.every(term => hay.includes(term));
  }).map(part => part.id);
}

/** FNV-1a 32-bit. */
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/**
 * Identifies a model by structure, not by file contents: name, component names,
 * per-component triangle counts and rounded size. Re-importing the same file with
 * the same units and tessellation quality yields the same fingerprint.
 */
export function modelFingerprint(model: Model) {
  const parts = model.parts.map(part => `${part.id}:${part.name}:${triangleCount(part.mesh.geometry)}`).join('|');
  const size = [model.size.x, model.size.y, model.size.z].map(v => v.toFixed(1)).join('x');
  return `${model.demo ? 'demo' : 'file'}-${hash(`${model.name}|${model.parts.length}|${size}|${parts}`)}`;
}

/** Bounds of the assembled model from engineering transforms (ignores presentation offsets). */
export function assembledBounds(model: Model) {
  return orientedBounds(model);
}

/** Engineering (assembled) transform of a part: independent of explosion or story offsets. */
export function assembledMatrix(model: Model, partId: string) {
  return sourcePartMatrix(model,partId);
}
