import type { ViewOptions } from '../Viewer';
import { originalAppearance } from './appearance';

// Presets are explicit, reviewable option patches, never imperative camera resets.
// Do not touch selection/visibility, measurement data, units, or named views.
export const PRESETS = [
  { id: 'studio', label: 'Clean Studio', description: 'Studio lighting · solid · assembled · section/grid/axes off. Keeps materials and background.', patch: { mode: 'studio', style: 'solid', explode: 0, section: false, grid: false, axes: false } },
  { id: 'technical', label: 'Exploded Technical', description: 'Inspect lighting · edges · explode 65% · grid/axes on · section off. Keeps materials and camera; F fits.', patch: { mode: 'inspect', style: 'edges', explode: .65, section: false, grid: true, axes: true } },
  { id: 'xray', label: 'Muted X-ray', description: 'X-ray visualization · graphite background · assembled. Keeps the clipping plane and lighting; no geometry cut.', patch: { style: 'xray', background: 'graphite', explode: 0 } },
  { id: 'section', label: 'Section Inspection', description: 'Inspect lighting · solid · section on · assembled. Keeps your plane axis/position/direction and materials.', patch: { mode: 'inspect', style: 'solid', section: true, explode: 0 } },
] as const;
export type PresetId = typeof PRESETS[number]['id'];
export function applyPreset(options: ViewOptions, id: PresetId, components: number) {
  const preset = PRESETS.find(p => p.id === id)!;
  const patch: Partial<ViewOptions> = { ...preset.patch };
  if (id === 'technical' && components < 2) patch.explode = 0;
  const changed = Object.keys(patch).filter(k => options[k as keyof ViewOptions] !== patch[k as keyof ViewOptions]);
  return { next: { ...options, ...patch }, changed, description: preset.description };
}
export function restoreOriginal(options: ViewOptions): ViewOptions {
  return { ...options, appearance: originalAppearance(), style: 'solid', transparency: 0 };
}
