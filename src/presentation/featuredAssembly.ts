import * as THREE from 'three';
import type { Model } from '../model';
import type { ExplosionComponentConfig, ExplosionMetadata, ExplosionTrack } from './ExplosionController';

/*
 * Authored disassembly choreography for the Axis-1 showcase actuator.
 * PRESENTATION ONLY: the engineering transforms in showcase/actuator.ts are never
 * edited. The ExplosionController stores the originals and recomputes every pose
 * from story progress, so reverse scrolling restores the exact assembled state.
 *
 * Story progress windows (shared with story.ts chapters):
 *   0.00-0.10 assembled hero
 *   0.10-0.34 motor module: flange screws unthread, module lifts, steps aside, opens
 *   0.30-0.52 housing reveal: cover screws unthread, cover, O-ring, 608 bearing lift
 *   0.48-0.72 staged gear disassembly: sun, planets slide off pins and fan out,
 *             ring, carrier, case, end plate, output bearing
 *   0.68-0.80 detail inspection: camera closes on the 608 bearing; its balls part radially
 *   0.80-1.00 exploded overview hold and viewer entry
 *
 * The exploded overview uses two stacks so it fits a landscape viewport:
 * gearbox stack A on the main axis, motor/encoder stack B moved sideways.
 * The output flange stays on the studio floor, so shadows stay grounded.
 */

const FLOOR = -28; // assembled underside (M8 screw head)
const SIDE = new THREE.Vector3(0.78, 0, -0.62).normalize(); // screen-right for the hero camera
const STACK_B = 172; // lateral distance of the motor stack (mm)

type Plan = {
  /** World height of the part's lowest point in the exploded overview. */
  bottom: number;
  lateral?: number; // along SIDE
  radial?: number; // outward from the main axis in XZ
  window: [number, number];
  /** Optional preliminary axial lift (unthreading, sliding off pins) before the main move. */
  pre?: { window: [number, number]; lift: number; spin?: number };
  /** Optional extra radial move (detail stage). */
  extra?: { window: [number, number]; radial: number };
  spin?: number; // degrees about the part's own vertical axis during the main move
};

const motorLift = 46; // the whole motor module rises off the cover pilot first
const plans: Record<string, Plan> = {};
const set = (ids: string[], plan: Plan | ((index: number) => Plan)) => ids.forEach((id, index) => { plans[id] = typeof plan === 'function' ? plan(index) : plan; });
const n = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);

// ---- Stack B: motor and encoder (moves aside, then opens along its own axis)
const motorPre = { window: [0.14, 0.22] as [number, number], lift: motorLift };
set(n('flange-screw', 4), i => ({ bottom: 22, lateral: STACK_B, window: [0.15 + i * 0.006, 0.24 + i * 0.006], pre: { window: [0.09, 0.15], lift: 10, spin: 1440 } }));
set(['motor-flange'], { bottom: FLOOR + 2, lateral: STACK_B, window: [0.22, 0.33], pre: motorPre });
set(['motor-can'], { bottom: 40, lateral: STACK_B, window: [0.22, 0.32], pre: motorPre });
set(['stator'], { bottom: 92, lateral: STACK_B, window: [0.23, 0.335], pre: motorPre });
set(['windings'], { bottom: 89.6, lateral: STACK_B, window: [0.23, 0.335], pre: motorPre });
set(['rotor', ...n('magnet', 10)], { bottom: 142, lateral: STACK_B, window: [0.24, 0.34], pre: motorPre });
set(['input-shaft'], { bottom: 112, lateral: STACK_B, window: [0.24, 0.34], pre: motorPre });
set(['end-cap'], { bottom: 196, lateral: STACK_B, window: [0.21, 0.31], pre: motorPre });
set(n('cap-screw', 4), i => ({ bottom: 212, lateral: STACK_B, window: [0.19 + i * 0.006, 0.29 + i * 0.006], pre: { window: [0.1, 0.16], lift: 7, spin: 1080 } }));
set(['encoder-magnet'], { bottom: 182, lateral: STACK_B, window: [0.24, 0.34], pre: motorPre });
set(['standoffs'], { bottom: 226, lateral: STACK_B, window: [0.18, 0.28], pre: { window: [0.1, 0.17], lift: 8 } });
set(['encoder-pcb', 'encoder-ic', 'connector'], { bottom: 238, lateral: STACK_B, window: [0.17, 0.27], pre: { window: [0.1, 0.17], lift: 16 } });

// ---- Stack A: gearbox on the main axis, bottom-up
set(n('cover-screw', 6), i => ({ bottom: 206, window: [0.37 + i * 0.008, 0.47 + i * 0.008], pre: { window: [0.3, 0.37], lift: 12, spin: 1800 } }));
set(['cover'], { bottom: 184, window: [0.39, 0.52] });
set(['o-ring'], { bottom: 172, window: [0.41, 0.53] });
set(['bearing-608-outer', 'bearing-608-inner', 'bearing-608-cage'], { bottom: 292, window: [0.4, 0.53] }); // well clear of the cover-screw heads (about 249 mm)
set(n('ball', 7), { bottom: 294.6, window: [0.4, 0.53], extra: { window: [0.71, 0.78], radial: 9 } });
set(['sun'], { bottom: 150, window: [0.48, 0.6] });
set(n('planet', 3), i => ({ bottom: 142, radial: 24, window: [0.56 + i * 0.012, 0.66 + i * 0.012], pre: { window: [0.49, 0.57], lift: 20 } }));
set(n('washer', 3), { bottom: 130, radial: 6, window: [0.55, 0.66] });
set(['ring'], { bottom: 108, window: [0.54, 0.66] });
set(['carrier'], { bottom: 66, window: [0.57, 0.68] });
set(['lower-case'], { bottom: 42, window: [0.59, 0.7] });
set(['end-plate'], { bottom: 20, window: [0.6, 0.71] });
set(['output-seal-top'], { bottom: 11.5, window: [0.62, 0.72] });
set(['output-bearing-outer', 'output-bearing-inner'], { bottom: 0, window: [0.62, 0.72] });
set(['output-seal-bottom'], { bottom: -8, window: [0.62, 0.72] });
set(['output-flange'], { bottom: FLOOR, window: [0.63, 0.72] });
set(['output-screw'], { bottom: FLOOR, lateral: -74, window: [0.64, 0.74] });

export const STORY_PATH_IDS = Object.keys(plans);

function horizontalRadial(center: THREE.Vector3) {
  const v = new THREE.Vector3(center.x, 0, center.z);
  return v.lengthSq() > 1e-6 ? v.normalize() : v;
}

/** Builds component-specific tracks from the plans and the parts' actual geometry. */
export function featuredExplosionMetadata(model: Model): ExplosionMetadata {
  const components: Record<string, ExplosionComponentConfig> = {};
  model.group.updateMatrixWorld(true);
  model.parts.forEach((part, index) => {
    const plan = plans[part.id];
    const box = new THREE.Box3().setFromObject(part.mesh);
    if (!plan) {
      // Unknown parts stay put rather than scattering.
      components[part.id] = { axis: [0, 1, 0], distance: 0, start: 0, end: 1, order: index, displayName: part.name, description: part.description };
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const radialDir = horizontalRadial(center);
    const pre = plan.pre?.lift ?? 0;
    const final = new THREE.Vector3(0, plan.bottom - box.min.y - pre, 0)
      .addScaledVector(SIDE, plan.lateral ?? 0)
      .addScaledVector(radialDir, plan.radial ?? 0);
    const tracks: ExplosionTrack[] = [];
    if (plan.pre) tracks.push([{ at: plan.pre.window[0], offset: [0, 0, 0], spin: 0 }, { at: plan.pre.window[1], offset: [0, pre, 0], spin: plan.pre.spin ?? 0 }]);
    tracks.push([{ at: plan.window[0], offset: [0, 0, 0], spin: 0 }, { at: plan.window[1], offset: final.toArray(), spin: plan.spin ?? 0 }]);
    if (plan.extra) { const e = radialDir.clone().multiplyScalar(plan.extra.radial); tracks.push([{ at: plan.extra.window[0], offset: [0, 0, 0] }, { at: plan.extra.window[1], offset: e.toArray() }]); }
    const total = final.clone().add(new THREE.Vector3(0, pre, 0));
    components[part.id] = {
      axis: (total.lengthSq() > 0 ? total.clone().normalize() : new THREE.Vector3(0, 1, 0)).toArray() as [number, number, number],
      distance: total.length(),
      start: plan.pre?.window[0] ?? plan.window[0],
      end: plan.extra?.window[1] ?? plan.window[1],
      order: index,
      group: String(part.metadata?.Group ?? part.stage),
      tracks,
      highlightColor: '#ffb054',
      displayName: part.name,
      description: part.description,
    };
  });
  return Object.freeze({ strategy: 'authored', components: Object.freeze(components) });
}
