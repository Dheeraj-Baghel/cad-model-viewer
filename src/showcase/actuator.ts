import * as THREE from 'three';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Hierarchy, Model, Part } from '../model';
import { GEARBOX_DATA, GEARBOX_MESHES, GEARBOX_POSITION_SCALE } from './gearboxData';

/*
 * CADmium showcase: "Axis-1" planetary servo actuator.
 *
 * ENGINEERING GEOMETRY ONLY. No presentation offsets live here. The exploded-view
 * choreography is authored separately in presentation/featuredAssembly.ts.
 *
 * Core (10 solids): Innerscene "Three-planet 4:1 gearbox open assembly", CC0 1.0.
 * Module 1.5, sun 18T, planets 18T, ring 54T (ratio 1 + 54/18 = 4:1), 108 x 108 x 31.5 mm.
 * Input = sun (from the motor above). Output = carrier hub (below).
 *
 * Additions (project-authored, mm): upper cover with 608 input bearing seat,
 * O-ring, M3 cover screws, output end plate with a 6804-2RS bearing, an anodised
 * output flange and an M8 retaining screw, input shaft, an inrunner BLDC motor
 * (flange, finned can, 12-slot stator, windings, rotor, 10 magnets, end cap) and
 * a magnetic encoder board.
 *
 * Frame: the STEP file is Z-up; here every part is Y-up. STEP (x, y, z) maps to
 * (x, z, -y), so a STEP angle t in the XY plane is world (cos t, -sin t) in XZ.
 * Interfaces taken from the source: case z -5..7 (bore R10.1), ring z 7..19,
 * carrier hub z -8..2 (bore R4.2), carrier pins R27 (pin R3, top z 23),
 * planets/sun z 7..23.5, sun bore R4, six through holes at R51.5 every 60 deg.
 * This is an illustrative digital assembly. No load, tolerance or kinematic
 * validation is claimed.
 */

const SEG = 96; // circular resolution for authored parts
const BOLT_R = 51.6; // cover screw pitch radius (measured from the six source holes, Ø3.4)
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- materials
type Finish = { color: string; metalness: number; roughness: number; clearcoat?: number; clearcoatRoughness?: number; label: string };
const FINISH = {
  graphite: { color: '#4b5158', metalness: 1, roughness: 0.4, clearcoat: 0.35, clearcoatRoughness: 0.4, label: 'Hard-anodised 6061-T6 aluminium, graphite' },
  aluminium: { color: '#c7cacf', metalness: 1, roughness: 0.27, label: 'Machined 6061-T6 aluminium, bead-blast faces' },
  steelRing: { color: '#8c9198', metalness: 1, roughness: 0.3, label: 'Through-hardened 42CrMo4 steel' },
  steelGround: { color: '#b3b8be', metalness: 1, roughness: 0.2, label: 'Case-hardened 20MnCr5 steel, ground' },
  steelDark: { color: '#6a7077', metalness: 1, roughness: 0.32, label: 'Nitrided steel' },
  bronze: { color: '#b48a55', metalness: 1, roughness: 0.32, label: 'CuSn8 phosphor bronze' },
  blackOxide: { color: '#1f2124', metalness: 0.85, roughness: 0.36, label: 'Alloy steel 12.9, black oxide' },
  chrome: { color: '#e9ebee', metalness: 1, roughness: 0.06, label: 'AISI 52100 chrome steel, polished' },
  bearingRace: { color: '#c2c6cb', metalness: 1, roughness: 0.14, label: 'AISI 52100 bearing steel' },
  rubber: { color: '#121314', metalness: 0, roughness: 0.75, label: 'NBR 70 rubber' },
  shield: { color: '#1d3f6e', metalness: 0, roughness: 0.55, label: 'NBR seal, steel insert' },
  anodBlue: { color: '#2b5c9c', metalness: 1, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.35, label: 'Anodised 7075 aluminium, instrument blue' },
  motorBlack: { color: '#26292d', metalness: 0.9, roughness: 0.46, clearcoat: 0.25, clearcoatRoughness: 0.5, label: 'Black-anodised aluminium' },
  lamination: { color: '#5b6066', metalness: 1, roughness: 0.38, label: 'M270 electrical steel laminations' },
  copper: { color: '#b76a3a', metalness: 1, roughness: 0.3, label: 'Enamelled copper winding' },
  magnet: { color: '#9a9ea4', metalness: 1, roughness: 0.2, label: 'NdFeB N42SH, Ni-Cu-Ni plated' },
  pcb: { color: '#1c4a37', metalness: 0.1, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.25, label: 'FR-4, green solder mask' },
  chip: { color: '#151617', metalness: 0.2, roughness: 0.45, label: 'Encoder IC, epoxy package' },
  nylon: { color: '#e4dfd3', metalness: 0, roughness: 0.62, label: 'PA66 connector housing' },
  brass: { color: '#c9a45c', metalness: 1, roughness: 0.28, label: 'CuZn39Pb3 brass' },
} satisfies Record<string, Finish>;
type FinishKey = keyof typeof FINISH;

function material(key: FinishKey) {
  const f: Finish = FINISH[key];
  return new THREE.MeshPhysicalMaterial({ color: f.color, metalness: f.metalness, roughness: f.roughness, clearcoat: f.clearcoat ?? 0, clearcoatRoughness: f.clearcoatRoughness ?? 0, envMapIntensity: 1 });
}

// ---------------------------------------------------------------- geometry helpers
/** Non-indexed, position + normal only, with creased normals: smooth curves, crisp edges. */
function finish(g: THREE.BufferGeometry, crease = 32) {
  let out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  out.deleteAttribute('uv');
  out.deleteAttribute('uv1');
  out = toCreasedNormals(out, THREE.MathUtils.degToRad(crease));
  return out;
}
function merge(parts: THREE.BufferGeometry[]) {
  const g = mergeGeometries(parts.map(p => finish(p)), false)!;
  parts.forEach(p => p.dispose());
  return g;
}
/** STEP polar coordinates (r, t) to world X/Z. */
const polar = (r: number, t: number) => new THREE.Vector2(r * Math.cos(t), -r * Math.sin(t));

/** Revolve an (r, y) profile about the Y axis. Profile runs bottom to top on the outside. */
function lathe(profile: [number, number][], segments = SEG) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), segments);
}
/** Closed lathe ring: inner bore r0, outer r1, from y0 to y1, chamfer c on all four edges. */
function ringProfile(r0: number, r1: number, y0: number, y1: number, c = 0.4, ci = c): [number, number][] {
  return [[r0 + ci, y0], [r1 - c, y0], [r1, y0 + c], [r1, y1 - c], [r1 - c, y1], [r0 + ci, y1], [r0, y1 - ci], [r0, y0 + ci], [r0 + ci, y0]];
}
function ring(r0: number, r1: number, y0: number, y1: number, c = 0.4, segments = SEG) {
  return lathe(ringProfile(r0, r1, y0, y1, c), segments);
}
function circlePath(cx: number, cy: number, r: number, hole = true) {
  const p = new THREE.Path();
  p.absarc(cx, cy, r, 0, TAU, hole);
  // Resolution scales with radius (~0.6 mm chord), so small holes stay light.
  (p as THREE.Path & { segments?: number }).segments = Math.max(16, Math.min(96, Math.round(r * 5)));
  return p;
}
/** Sample a path with its own segment budget (see circlePath), else `fallback`. */
function sampled(path: THREE.Path, fallback: number) {
  const n = (path as THREE.Path & { segments?: number }).segments ?? fallback;
  return path.getPoints(Math.max(2, Math.round(n / Math.max(path.curves.length, 1))));
}
/** Extrude a STEP-XY shape from world y0 to y1 with an exact-size chamfer (bevel inset). */
function extrudeY(shape: THREE.Shape, y0: number, y1: number, bevel = 0.5, curveSegments = 48) {
  const t = Math.min(bevel, (y1 - y0) / 2.2);
  const outline = new THREE.Shape(sampled(shape, curveSegments));
  outline.holes = shape.holes.map(hole => new THREE.Path(sampled(hole, curveSegments)));
  const g = new THREE.ExtrudeGeometry(outline, {
    depth: Math.max(y1 - y0 - 2 * t, 0.01), curveSegments: 1, steps: 1,
    bevelEnabled: t > 0, bevelThickness: t, bevelSize: t, bevelOffset: -t, bevelSegments: 1,
  });
  g.translate(0, 0, t);
  g.rotateX(-Math.PI / 2); // shape (x, y), depth z  ->  world (x, z_depth, -y)
  g.translate(0, y0, 0);
  return g;
}
function disc(r: number, holes: THREE.Path[] = []) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  (s as THREE.Shape & { segments?: number }).segments = Math.max(24, Math.min(160, Math.round(r * 3)));
  s.holes.push(...holes);
  return s;
}
function boltHoles(radius: number, count: number, r: number, phase = 0) {
  return Array.from({ length: count }, (_, i) => { const a = phase + (i / count) * TAU; return circlePath(radius * Math.cos(a), radius * Math.sin(a), r); });
}
function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  (s as THREE.Shape & { segments?: number }).segments = 8 * Math.max(2, Math.round(r * 2.5));
  return s;
}
function box(w: number, h: number, d: number, x: number, y: number, z: number, bevel = 0.25) {
  const s = roundedRect(w, d, Math.min(bevel * 2, w / 4, d / 4));
  const g = extrudeY(s, y, y + h, bevel, 8);
  g.translate(x, 0, z);
  return g;
}

/**
 * ISO 4762 socket head cap screw standing on y = seat, shank pointing down.
 * Hex socket, chamfered head, plain shank and a modelled thread band (rings,
 * not a helix: a display approximation).
 */
function capScrew(d: number, length: number, seat: number, thread = Math.min(length, d * 4 + 4)) {
  const k = d, rh = d * 0.8, s = d * 0.45, socketDepth = k * 0.55, pitch = d * 0.17 + 0.05;
  const hex = new THREE.Shape();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; if (!i) hex.moveTo(s * 1.12 * Math.cos(a), s * 1.12 * Math.sin(a)); else hex.lineTo(s * 1.12 * Math.cos(a), s * 1.12 * Math.sin(a)); }
  const rim = disc(rh, [Object.assign(new THREE.Path(), { curves: hex.curves })]);
  // The hex recess: a rim ring with a hex hole at the top plus a socket floor.
  const top = extrudeY(rim, seat + k - socketDepth, seat + k, Math.min(0.35, d * 0.1), 32);
  const headBody = lathe([[0.001, seat], [rh - 0.25, seat], [rh, seat + 0.25], [rh, seat + k - socketDepth], [0.001, seat + k - socketDepth]], 32);
  const r = d / 2, plainEnd = seat - (length - thread);
  const shank: [number, number][] = [[0.001, seat - length], [r - 0.35, seat - length], [r, seat - length + 0.35]];
  for (let y = seat - length + 0.35 + pitch; y < plainEnd - pitch * 0.5; y += pitch) shank.push([r - pitch * 0.32, y - pitch / 2], [r, y]);
  shank.push([r, seat], [0.001, seat]);
  return merge([headBody, top, lathe(shank, 20)]);
}

// ---------------------------------------------------------------- source decoding
function decodeSource() {
  const bin = Uint8Array.from(atob(GEARBOX_DATA), c => c.charCodeAt(0));
  const buffer = bin.buffer;
  const out = new Map<string, THREE.BufferGeometry>();
  for (const m of GEARBOX_MESHES) {
    const qp = new Int16Array(buffer, m.position, m.vertices * 3);
    const qn = new Int8Array(buffer, m.normal, m.vertices * 3);
    const qi = new Uint16Array(buffer, m.index, m.triangles * 3);
    const pos = new Float32Array(m.vertices * 3), nor = new Float32Array(m.vertices * 3);
    for (let i = 0; i < m.vertices; i++) {
      // STEP (x, y, z) -> world (x, z, -y)
      pos[i * 3] = qp[i * 3] * GEARBOX_POSITION_SCALE; pos[i * 3 + 1] = qp[i * 3 + 2] * GEARBOX_POSITION_SCALE; pos[i * 3 + 2] = -qp[i * 3 + 1] * GEARBOX_POSITION_SCALE;
      const nx = qn[i * 3] / 127, ny = qn[i * 3 + 2] / 127, nz = -qn[i * 3 + 1] / 127, l = Math.hypot(nx, ny, nz) || 1;
      nor[i * 3] = nx / l; nor[i * 3 + 1] = ny / l; nor[i * 3 + 2] = nz / l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setIndex(new THREE.BufferAttribute(Uint16Array.from(qi), 1));
    out.set(m.name, g);
  }
  return out;
}

// ---------------------------------------------------------------- assembly
export const ACTUATOR_GROUPS = ['Housing', 'Planetary stage', 'Output', 'Input bearing 608', 'Motor', 'Encoder', 'Fasteners'] as const;
export type ActuatorGroup = typeof ACTUATOR_GROUPS[number];

export function createActuator(): Model {
  const group = new THREE.Group();
  const parts: Part[] = [];
  const groupOf: ActuatorGroup[] = [];

  function add(id: string, name: string, geometry: THREE.BufferGeometry, finishKey: FinishKey, groupName: ActuatorGroup, description: string, metadata: Record<string, string | number> = {}) {
    geometry.computeBoundingBox();
    const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
    geometry.translate(-center.x, -center.y, -center.z); // pivot at the part centre
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material(finishKey));
    mesh.name = name;
    mesh.position.copy(center);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partId = id;
    group.add(mesh);
    const source = metadata.Source ?? 'Project-authored';
    parts.push({ id, name, material: FINISH[finishKey].label, color: FINISH[finishKey].color, mesh, origin: mesh.position.clone(), rotation: mesh.rotation.clone(), explode: new THREE.Vector3(), stage: groupName, description, metadata: { Group: groupName, Source: source, ...metadata } });
    groupOf.push(groupName);
  }

  // ---- CC0 core
  const src = decodeSource();
  const CC0 = { Source: 'Innerscene CC0 STEP' };
  const take = (name: string) => { const g = src.get(name); if (!g) throw new Error(`Showcase source solid missing: ${name}`); return g; };
  add('lower-case', 'Lower case', take('Lower_case'), 'graphite', 'Housing', 'The lower housing carries the carrier hub through a Ø20.2 mm bore and seats the ring gear.', { ...CC0, Envelope: '108 × 108 × 12 mm' });
  add('ring', 'Ring gear', take('Stationary_ring_54_teeth'), 'steelRing', 'Housing', 'A stationary 54-tooth internal ring, module 1.5. It forms the outer wall of the gear stage and reacts the planet loads.', { ...CC0, Teeth: 54, Module: '1.5 mm' });
  add('sun', 'Sun gear', take('Sun_18_teeth'), 'steelGround', 'Planetary stage', 'The 18-tooth input gear. It is driven by the motor shaft through its Ø8 mm bore.', { ...CC0, Teeth: 18, Module: '1.5 mm' });
  for (let i = 0; i < 3; i++) add(`planet-${i + 1}`, `Planet gear 0${i + 1}`, take(`Planet_${i}`), 'steelGround', 'Planetary stage', 'One of three 18-tooth planets. It meshes with the sun and ring and runs on a Ø6 mm carrier pin.', { ...CC0, Teeth: 18, Module: '1.5 mm' });
  for (let i = 0; i < 3; i++) add(`washer-${i + 1}`, `Thrust washer 0${i + 1}`, take(`Planet_washer_${i}`), 'bronze', 'Planetary stage', 'A 1 mm bronze thrust washer that separates the planet face from the carrier plate.', { ...CC0, Thickness: '1 mm' });
  add('carrier', 'Planet carrier', take('Carrier_and_three_pins'), 'steelDark', 'Planetary stage', 'The output member. Three integral pins on a 54 mm pitch circle drive the hub at a quarter of the sun speed.', { ...CC0, Ratio: '4 : 1' });

  // ---- Housing additions
  {
    const rim = extrudeY(disc(54, [circlePath(0, 0, 47.6), ...boltHoles(BOLT_R, 6, 1.7)]), 19, 23.8, 0.3, 96);
    const plate = extrudeY(disc(54, [circlePath(0, 0, 11), ...boltHoles(BOLT_R, 6, 1.7), ...boltHoles(24.5 * Math.SQRT2, 4, 1.25, Math.PI / 4)]), 23.8, 27, 0.6, 96);
    const boss = ring(11, 16, 26.9, 32, 0.5);
    add('cover', 'Upper cover', merge([rim, plate, boss]), 'aluminium', 'Housing', 'A machined cover closes the gear stage, seats the 608 input bearing and carries the motor flange.', { Thickness: '8 mm', 'Bearing seat': 'Ø22 H7' });
  }
  add('o-ring', 'Cover O-ring', new THREE.TorusGeometry(46.2, 0.9, 16, 160).rotateX(Math.PI / 2).translate(0, 19.4, 0), 'rubber', 'Housing', 'A Ø92.4 × 1.8 mm NBR O-ring, seated inside the cover skirt on the ring gear face.', { Section: '1.8 mm' });
  add('end-plate', 'Output end plate', extrudeY(disc(54, [circlePath(0, 0, 16), ...boltHoles(BOLT_R, 6, 1.25)]), -12, -5, 0.6, 96), 'aluminium', 'Housing', 'Closes the bottom of the case and holds the 6804 output bearing. The six cover screws thread into it.', { Thickness: '7 mm', 'Bearing seat': 'Ø32 H7' });

  // ---- Output
  add('output-bearing-outer', '6804 outer race', ring(14.2, 16, -12, -5, 0.3), 'bearingRace', 'Output', 'The outer ring of the 20 × 32 × 7 mm 6804-2RS deep-groove output bearing.', { Bearing: '6804-2RS' });
  add('output-bearing-inner', '6804 inner race', ring(10, 11.8, -12, -5, 0.3), 'bearingRace', 'Output', 'The inner ring rides on the carrier hub and output-flange spigot.', { Bearing: '6804-2RS' });
  add('output-seal-top', '6804 seal, upper', ring(11.8, 14.2, -5.9, -5.4, 0.08), 'shield', 'Output', 'A contact seal that retains grease and excludes dirt.', { Bearing: '6804-2RS' });
  add('output-seal-bottom', '6804 seal, lower', ring(11.8, 14.2, -11.6, -11.1, 0.08), 'shield', 'Output', 'The second seal on the flange side.', { Bearing: '6804-2RS' });
  {
    const spigot = ring(4.2, 10, -13, -8, 0.3, SEG);
    const flange = extrudeY(disc(24, [circlePath(0, 0, 7), ...boltHoles(17, 6, 1.6, Math.PI / 6), circlePath(17, 0, 1.5), circlePath(-17, 0, 1.5)]), -21.5, -13, 0.6, 96); // Ø14 counterbore for the M8 head
    add('output-flange', 'Output flange', merge([spigot, flange]), 'anodBlue', 'Output', 'The customer interface: six M4 tapped holes and two Ø3 dowel bores on a Ø34 mm circle, piloted on the carrier hub.', { Interface: '6 × M4, 2 × Ø3 dowel', Diameter: '48 mm' });
  }
  add('output-screw', 'M8 retaining screw', capScrew(8, 16, 13, 10).rotateX(Math.PI), 'blackOxide', 'Output', 'An M8 × 16 ISO 4762 screw, recessed in the flange counterbore, that clamps the flange to the carrier hub.', { Standard: 'ISO 4762 M8 × 16' });

  // ---- Input bearing 608 (8 × 22 × 7) in the cover boss
  add('input-shaft', 'Input shaft', lathe([[0.001, 8], [3.6, 8], [4, 8.4], [4, 77.6], [3.6, 78], [0.001, 78]], 48), 'steelGround', 'Motor', 'A Ø8 mm ground shaft that carries the rotor and drives the sun gear through the cover bearing.', { Diameter: 'Ø8 h6', Length: '70 mm' });
  add('bearing-608-outer', '608 outer race', lathe([[9.6 + 0.3, 25], [11 - 0.3, 25], [11, 25.3], [11, 31.7], [10.7, 32], [9.9, 32], [9.6, 31.7], [9.6, 29.6], [9.95, 28.5], [9.6, 27.4], [9.6, 25.3], [9.9, 25]]), 'bearingRace', 'Input bearing 608', 'The 22 mm outer ring, pressed into the cover boss. Its raceway groove is visible when it is lifted clear.', { Bearing: '608 open' });
  add('bearing-608-inner', '608 inner race', lathe([[4.3, 25], [5.4, 25], [5.7, 25.3], [5.7, 27.4], [5.35, 28.5], [5.7, 29.6], [5.7, 31.7], [5.4, 32], [4.3, 32], [4, 31.7], [4, 25.3], [4.3, 25]]), 'bearingRace', 'Input bearing 608', 'The 8 mm inner ring, a slip fit on the input shaft.', { Bearing: '608 open' });
  for (let i = 0; i < 7; i++) { const p = polar(7.6, (i / 7) * TAU); add(`ball-${i + 1}`, `608 ball 0${i + 1}`, new THREE.SphereGeometry(1.95, 28, 18).translate(p.x, 28.5, p.y), 'chrome', 'Input bearing 608', 'One of seven Ø3.9 mm chrome-steel balls.', { Bearing: '608 open', Diameter: 'Ø3.9 mm' }); }
  {
    const pockets = () => Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * TAU; return circlePath(7.6 * Math.cos(a), 7.6 * Math.sin(a), 0.8); });
    // Cage plates sit just outside the ball envelope (y 26.55..30.45), between the races.
    const lower = extrudeY(disc(8.7, [circlePath(0, 0, 6.5), ...pockets()]), 26.1, 26.45, 0.06, 48);
    const upper = extrudeY(disc(8.7, [circlePath(0, 0, 6.5), ...pockets()]), 30.55, 30.9, 0.06, 48);
    add('bearing-608-cage', '608 cage', merge([lower, upper]), 'brass', 'Input bearing 608', 'A two-piece pressed cage that keeps the seven balls evenly spaced.', { Bearing: '608 open' });
  }

  // ---- Motor: inrunner BLDC on a square flange
  {
    const s = roundedRect(66, 66, 7);
    s.holes.push(circlePath(0, 0, 16.3), ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, y]) => circlePath(x * 24.5, y * 24.5, 1.7)));
    add('motor-flange', 'Motor flange', extrudeY(s, 27, 33, 0.6, 48), 'aluminium', 'Motor', 'An adapter plate that centres the motor on the cover boss. Four M3 screws hold it down.', { Envelope: '66 × 66 × 6 mm' });
  }
  {
    const fins = 28, outer = new THREE.Shape();
    for (let i = 0; i <= fins * 4; i++) { const a = (i / (fins * 4)) * TAU, r = i % 4 < 2 ? 30 : 28.6; const x = r * Math.cos(a), y = r * Math.sin(a); if (!i) outer.moveTo(x, y); else outer.lineTo(x, y); }
    outer.holes.push(circlePath(0, 0, 26.2));
    add('motor-can', 'Motor housing', extrudeY(outer, 33, 73, 0.5, 96), 'motorBlack', 'Motor', 'A finned, black-anodised can that locates the stator and sheds winding heat.', { Fins: fins, Length: '40 mm' });
  }
  {
    const slots = 12, stator = disc(26.2);
    const inner = new THREE.Path();
    for (let i = 0; i < slots; i++) {
      const c = (i / slots) * TAU, tw = 0.105, shoe = 0.2;
      const pts: [number, number][] = [[21.5, c - TAU / slots / 2 + 0.02], [21.5, c - tw], [16.2, c - tw], [15.6, c - shoe], [14.5, c - shoe], [14.5, c + shoe], [15.6, c + shoe], [16.2, c + tw], [21.5, c + tw], [21.5, c + TAU / slots / 2 - 0.02]];
      pts.forEach(([r, a], j) => { if (!i && !j) inner.moveTo(r * Math.cos(a), r * Math.sin(a)); else inner.lineTo(r * Math.cos(a), r * Math.sin(a)); });
    }
    inner.closePath();
    stator.holes.push(inner);
    add('stator', 'Stator core', extrudeY(stator, 37, 69, 0.25, 96), 'lamination', 'Motor', 'A 12-slot laminated stator stack. The teeth carry the concentrated windings.', { Slots: 12, Stack: '32 mm' });
    const coils: THREE.BufferGeometry[] = [];
    for (let i = 0; i < slots; i++) {
      const c = (i / slots) * TAU, shape = new THREE.Shape();
      // a wound bundle wrapped around each tooth (U-shaped section, both slot sides)
      const a0 = c - 0.24, a1 = c + 0.24, ri = 16.6, ro = 21.2;
      shape.moveTo(ri * Math.cos(a0), ri * Math.sin(a0));
      shape.absarc(0, 0, ri, a0, a1, false);
      shape.lineTo(ro * Math.cos(a1), ro * Math.sin(a1));
      shape.absarc(0, 0, ro, a1, a0, true);
      shape.closePath();
      const tooth = new THREE.Path(); const tw = 0.11;
      tooth.moveTo(16.4 * Math.cos(c - tw), 16.4 * Math.sin(c - tw)); tooth.lineTo(21.4 * Math.cos(c - tw * 0.8), 21.4 * Math.sin(c - tw * 0.8)); tooth.lineTo(21.4 * Math.cos(c + tw * 0.8), 21.4 * Math.sin(c + tw * 0.8)); tooth.lineTo(16.4 * Math.cos(c + tw), 16.4 * Math.sin(c + tw)); tooth.closePath();
      shape.holes.push(tooth);
      coils.push(extrudeY(shape, 34.6, 71.4, 1.6, 16));
    }
    add('windings', 'Stator windings', merge(coils), 'copper', 'Motor', 'Twelve concentrated copper coils, three-phase, with end turns standing proud of the stack.', { Phases: 3, Coils: 12 });
  }
  add('rotor', 'Rotor core', lathe(ringProfile(4, 12, 38, 68, 0.5, 0.3)), 'steelDark', 'Motor', 'A solid steel rotor hub on the input shaft. It forms the magnetic back iron for the surface magnets.', { Length: '30 mm' });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU, h = 0.27, s = new THREE.Shape();
    s.absarc(0, 0, 13.8, a - h, a + h, false); s.absarc(0, 0, 12.05, a + h, a - h, true); s.closePath();
    add(`magnet-${i + 1}`, `Rotor magnet ${String(i + 1).padStart(2, '0')}`, extrudeY(s, 39, 67, 0.3, 12), 'magnet', 'Motor', 'One of ten bonded NdFeB arc magnets. Alternating poles give a 10-pole, 12-slot motor.', { Poles: 10 });
  }
  add('end-cap', 'Motor end cap', merge([extrudeY(disc(30, [circlePath(0, 0, 5.2), ...boltHoles(27.3, 4, 1.35, Math.PI / 4)]), 73, 77, 0.6, 96)]), 'motorBlack', 'Motor', 'Closes the motor and provides the datum for the encoder board.', { Thickness: '4 mm' });

  // ---- Encoder
  add('encoder-magnet', 'Encoder magnet', ring(0.001, 3, 78.2, 80.2, 0.2, 48), 'magnet', 'Encoder', 'A Ø6 mm diametrically magnetised disc on the shaft end, read by the encoder IC.', { Magnetisation: 'Diametric' });
  add('standoffs', 'PCB standoffs', merge([0, 1, 2].map(i => { const p = polar(20, Math.PI / 6 + (i / 3) * TAU); return lathe([[1.4, 77], [2.6, 77], [2.6, 81], [1.4, 81]], 6).translate(p.x, 0, p.y); })), 'brass', 'Encoder', 'Three M2.5 hex standoffs, 4 mm, that space the encoder board above the end cap.', { Count: 3 });
  add('encoder-pcb', 'Encoder board', extrudeY(disc(24, [...[0, 1, 2].map(i => { const p = polar(20, Math.PI / 6 + (i / 3) * TAU); return circlePath(p.x, -p.y, 1.35); })]), 81, 82.6, 0.2, 96), 'pcb', 'Encoder', 'A 1.6 mm FR-4 board carrying the 14-bit magnetic encoder and the motor connector.', { Resolution: '14-bit' });
  add('encoder-ic', 'Encoder IC', box(5, 0.9, 5, 0, 82.6, 0, 0.12), 'chip', 'Encoder', 'An on-axis magnetic angle sensor, centred over the shaft magnet.', { Package: 'QFN-16' });
  add('connector', 'Motor connector', box(12, 6, 5.4, 0, 82.6, -17.5, 0.3), 'nylon', 'Encoder', 'A 6-pin wire-to-board connector for phase sense and encoder signals.', { Pins: 6 });

  // ---- Fasteners (one selectable part per screw)
  for (let i = 0; i < 6; i++) { const p = polar(BOLT_R, (i / 6) * TAU); add(`cover-screw-${i + 1}`, `Cover screw 0${i + 1}`, capScrew(3, 38, 27).translate(p.x, 0, p.y), 'blackOxide', 'Fasteners', 'An M3 × 38 ISO 4762 screw that clamps the cover, ring gear and case into the end plate.', { Standard: 'ISO 4762 M3 × 38', Torque: '1.2 N·m' }); }
  [[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(([x, z], i) => add(`flange-screw-${i + 1}`, `Flange screw 0${i + 1}`, capScrew(3, 9, 33).translate(x * 24.5, 0, z * 24.5), 'blackOxide', 'Fasteners', 'An M3 × 9 screw that holds the motor flange to the cover.', { Standard: 'ISO 4762 M3 × 9' }));
  for (let i = 0; i < 4; i++) { const p = polar(27.3, Math.PI / 4 + (i / 4) * TAU); add(`cap-screw-${i + 1}`, `End-cap screw 0${i + 1}`, capScrew(2.5, 8, 77).translate(p.x, 0, p.y), 'blackOxide', 'Fasteners', 'An M2.5 × 8 screw that holds the end cap into the motor housing.', { Standard: 'ISO 4762 M2.5 × 8' }); }

  // ---- hierarchy: grouped tree, every part individually selectable
  const hierarchy: Hierarchy = { name: '', meshes: [], children: ACTUATOR_GROUPS.map(name => ({ name, meshes: parts.map((_, i) => i).filter(i => groupOf[i] === name), children: [] })) };
  group.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  const triangles = parts.reduce((sum, p) => { const g = p.mesh.geometry; return sum + Math.floor((g.index?.count ?? g.attributes.position.count) / 3); }, 0);
  return {
    name: 'Axis-1 planetary actuator', source: 'Showcase assembly · mm', parts, group, size, triangles, demo: true, hierarchy,
    metadata: { Role: 'Illustrative servo actuator', Ratio: '4 : 1 planetary', Units: 'mm', Core: 'Innerscene gearbox, CC0 1.0', Additions: 'Project-authored', Validation: 'Not manufacturing or kinematics verified' },
  };
}
