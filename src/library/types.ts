// Checkpoint 3: on-device collection, never a cloud upload. Source files and OBJ
// companions stay byte-exact; orientation is reversible display state on one root.
// Private g-clamp/phone-stand projects are NOT bundled samples.
import type { AppearanceState } from '../presentation/appearance';
import type { CameraState, SavedView, SectionState } from '../workspace/savedViews';
import type { Measurement } from '../workspace/measure';
export type Orientation = 'auto' | 'y' | 'z';
export type SourceFile = { name: string; mime: string; lastModified: number; hash: string; bytes: number };
export type InspectionState = { version: 1; pipeline: string; partKeys: string[]; camera: CameraState | null; hidden: string[]; selected: string | null; appearance: AppearanceState; mode: 'studio'|'inspect'; style: 'solid'|'wireframe'|'edges'|'clay'|'xray'; explode: number; section: SectionState; transparency: number; background: 'graphite'|'light'|'technical'; grid: boolean; axes: boolean; environmentRotation: number; units: 'mm'|'cm'|'in'; measurements: Measurement[]; views: SavedView[] };
export type LibraryRecord = { stateRevision?:number; version: 1; id: string; name: string; kind: 'import'|'sample'; sampleId?: string; created: number; updated: number; opened: number; favorite: boolean; format: string; category: string; description: string; files: SourceFile[]; totalBytes: number; sourceHash: string; sourceUnits: 'mm'|'cm'|'in'; quality: 'balanced'|'fine'; orientation: Orientation; partCount: number; triangles: number; bounds: [number,number,number]; state?: InspectionState; thumbnail?: Blob };
export type Sample = { id: string; name: string; description: string; category: string; format: string; files: string[]; sourceUnits: 'mm'|'cm'|'in'; orientation: Orientation; license: string; attribution: string; sourceUrl: string; assetUrl: string; hash: string; bytes: number; parts: number; triangles: number; bounds: [number,number,number]; loadMs: number };
export const PIPELINE = 'cadmium-cp3-occt-0.0.23-mesh-v1';
