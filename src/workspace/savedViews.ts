/*
 * Named inspection views.
 *
 * A saved view stores inspection STATE only: camera, component visibility,
 * explosion, clipping and display style. It never stores geometry or file data.
 * Each view is bound to a model fingerprint (see modelUtils.modelFingerprint).
 *
 * Persistence: views are kept in this browser's localStorage, so they survive
 * reloads. Imported files do NOT survive reloads. A view saved for an imported
 * model stays dormant until the same file is opened again with the same units and
 * tessellation quality. It is never applied to a different model.
 */

import type { AppearanceState, LightingMode, RenderStyle } from '../presentation/appearance';

export type CameraState = {
  projection: 'perspective' | 'orthographic';
  position: [number, number, number];
  target: [number, number, number];
  up: [number, number, number];
  zoom: number;
  orthoHeight: number;
  fov: number;
};

export type SectionState = { enabled: boolean; axis: 'x' | 'y' | 'z'; position: number; flip: boolean };

export type SavedView = {
  version: 1;
  id: string;
  name: string;
  created: number;
  fingerprint: string;
  modelName: string;
  partCount: number;
  camera: CameraState;
  hidden: string[];
  explode: number;
  section: SectionState;
  style: RenderStyle;
  // Additive CP2 fields: old v1 views remain readable; no legacy key is deleted.
  appearance?: AppearanceState;
  lighting?: LightingMode;
  transparency?: number;
  orientation?: 'auto'|'y'|'z';
};

const KEY = 'cadmium-saved-views-v1';
let memory: SavedView[] = []; // fallback when storage is blocked
let persistent = true;

function valid(value: unknown): value is SavedView {
  const v = value as SavedView;
  return !!v && v.version === 1 && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.fingerprint === 'string'
    && Array.isArray(v.hidden) && Array.isArray(v.camera?.position) && v.camera.position.length === 3 && v.camera.position.every(Number.isFinite)
    && Array.isArray(v.camera?.target) && v.camera.target.every(Number.isFinite) && typeof v.explode === 'number' && !!v.section;
}

export function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(KEY);
    persistent = true;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(valid) : [];
  } catch {
    persistent = false;
    return [...memory];
  }
}

export function storeViews(views: SavedView[]) {
  memory = [...views];
  try { localStorage.setItem(KEY, JSON.stringify(views)); persistent = true; } catch { persistent = false; }
}

/** False when the browser blocks storage. Views then last only for this tab. */
export function viewsPersist() { return persistent; }

export type Compatibility = { ok: true } | { ok: false; reason: string };

/** A view is only restorable on the exact model it was saved for. */
export function compatibility(view: SavedView, fingerprint: string, partIds: ReadonlySet<string>): Compatibility {
  if (view.fingerprint !== fingerprint) return { ok: false, reason: `Saved for “${view.modelName}” (${view.partCount} components). Open that model to restore it.` };
  const missing = view.hidden.filter(id => !partIds.has(id));
  if (missing.length) return { ok: false, reason: `${missing.length} hidden component${missing.length > 1 ? 's are' : ' is'} missing from this model.` };
  return { ok: true };
}

/** Saved views grouped by models that are not currently loaded. */
export function dormantModels(views: SavedView[], fingerprint: string) {
  const groups = new Map<string, { modelName: string; partCount: number; count: number }>();
  views.filter(view => view.fingerprint !== fingerprint).forEach(view => {
    const g = groups.get(view.fingerprint) ?? { modelName: view.modelName, partCount: view.partCount, count: 0 };
    g.count++;
    groups.set(view.fingerprint, g);
  });
  return [...groups.entries()].map(([fp, g]) => ({ fingerprint: fp, ...g }));
}

export function uniqueViewName(views: SavedView[], fingerprint: string) {
  const names = new Set(views.filter(v => v.fingerprint === fingerprint).map(v => v.name));
  let n = names.size + 1;
  while (names.has(`View ${n}`)) n++;
  return `View ${n}`;
}
