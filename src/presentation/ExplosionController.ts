import * as THREE from 'three';
import type { NormalizedAssembly } from './assemblyAdapter';

export type ExplosionComponentConfig = Readonly<{
  axis: readonly [number, number, number];
  distance: number;
  start: number;
  end: number;
  order?: number;
  group?: string;
  rotation?: readonly [number, number, number];
  annotationAnchor?: readonly [number, number, number];
  highlightColor?: string;
  displayName?: string;
  description?: string;
  /**
   * Component-specific path. Each track is a list of absolute story-progress keys;
   * the offsets and Y spins of all tracks are summed. When tracks are present they
   * replace the single axis/distance move. Every value is evaluated from progress,
   * so nothing accumulates between frames.
   */
  tracks?: readonly ExplosionTrack[];
}>;

export type ExplosionKey = Readonly<{ at: number; offset: readonly [number, number, number]; spin?: number }>;
export type ExplosionTrack = readonly ExplosionKey[];

export type ExplosionMetadata = Readonly<{
  strategy: 'authored' | 'automatic';
  components?: Readonly<Record<string, ExplosionComponentConfig>>;
}>;

type Binding = {
  partId: string;
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalQuaternion: THREE.Quaternion;
  originalScale: THREE.Vector3;
  direction: THREE.Vector3;
  distance: number;
  start: number;
  end: number;
  rotation: THREE.Quaternion;
  tracks: readonly ExplosionTrack[] | null;
};

export type ExplosionDiagnostic = Readonly<{
  partId: string;
  direction: THREE.Vector3;
  distance: number;
  start: number;
  end: number;
}>;

const clamp01 = (value: number) => THREE.MathUtils.clamp(value, 0, 1);
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function stableDirection(key: string) {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  const x = ((hash & 1023) / 511.5) - 1;
  const y = (((hash >>> 10) & 1023) / 511.5) - 1;
  const z = (((hash >>> 20) & 1023) / 511.5) - 1;
  const direction = new THREE.Vector3(x, y, z);
  return direction.lengthSq() < 1e-6 ? new THREE.Vector3(0, 1, 0) : direction.normalize();
}

/** Deterministic, display-only exploded-view transforms. */
export class ExplosionController {
  private bindings: Binding[] = [];
  private readonly identity = new THREE.Quaternion();
  private readonly delta = new THREE.Quaternion();

  initialize(assembly: NormalizedAssembly, metadata: ExplosionMetadata = { strategy: 'automatic' }) {
    this.dispose();
    const span = Math.max(assembly.size.length(), 1);
    const count = Math.max(assembly.occurrences.length, 1);
    this.bindings = assembly.occurrences.map((occurrence, index) => {
      const authored = metadata.components?.[occurrence.partId];
      let direction: THREE.Vector3;
      let distance: number;
      if (authored) {
        direction = new THREE.Vector3().fromArray(authored.axis as [number, number, number]);
        if (direction.lengthSq() < 1e-8) direction.copy(stableDirection(occurrence.occurrenceId));
        direction.normalize();
        distance = THREE.MathUtils.clamp(authored.distance, 0, span * 1.5);
      } else {
        direction = occurrence.center.clone().sub(assembly.center);
        if (direction.lengthSq() < span * span * 1e-8) direction.copy(stableDirection(occurrence.occurrenceId));
        direction.normalize();
        const sourceOffset = occurrence.part.explode.length();
        distance = sourceOffset > 0 ? THREE.MathUtils.clamp(sourceOffset, span * 0.08, span * 0.75) : THREE.MathUtils.clamp(span * (0.22 + index / count * 0.16), span * 0.12, span * 0.55);
      }
      const autoStart = 0.3 + index / count * 0.36;
      const start = clamp01(authored?.start ?? autoStart);
      const end = Math.max(start + 0.001, clamp01(authored?.end ?? Math.min(autoStart + 0.24, 0.92)));
      const degrees = authored?.rotation ?? [0, 0, 0];
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(degrees[0]),
        THREE.MathUtils.degToRad(degrees[1]),
        THREE.MathUtils.degToRad(degrees[2]),
      ));
      return {
        partId: occurrence.partId,
        mesh: occurrence.mesh,
        originalPosition: occurrence.originalLocal.position.clone(),
        originalQuaternion: occurrence.originalLocal.quaternion.clone(),
        originalScale: occurrence.originalLocal.scale.clone(),
        direction,
        distance,
        start,
        end,
        rotation,
        tracks: authored?.tracks?.length ? authored.tracks : null,
      };
    });
    const keyed = this.bindings.flatMap(binding => binding.tracks?.flat() ?? []);
    this.pathWindow = keyed.length ? [Math.min(...keyed.map(key => key.at)), Math.max(...keyed.map(key => key.at))] : null;
    this.reset();
  }

  /** Story-progress window covered by authored paths, or null for axis-based explosion. */
  pathWindow: [number, number] | null = null;

  applyProgress(progress: number) {
    const value = clamp01(progress);
    this.bindings.forEach(binding => {
      if (binding.tracks) this.applyTracks(binding, value);
      else this.applyBinding(binding, smooth((value - binding.start) / (binding.end - binding.start)));
    });
  }

  setExplosionAmount(amount: number) {
    // Authored paths: the same staged disassembly as the story, mapped onto 0..1.
    if (this.pathWindow) { this.applyProgress(THREE.MathUtils.lerp(this.pathWindow[0], this.pathWindow[1], clamp01(amount))); return; }
    const value = smooth(amount);
    this.bindings.forEach(binding => this.applyBinding(binding, value));
  }

  private readonly offset = new THREE.Vector3();
  private readonly yAxis = new THREE.Vector3(0, 1, 0);

  private applyTracks(binding: Binding, progress: number) {
    this.offset.set(0, 0, 0);
    let spin = 0;
    for (const track of binding.tracks!) {
      let previous: ExplosionKey | null = null;
      for (const key of track) {
        if (progress >= key.at) { previous = key; continue; }
        if (!previous) break;
        const t = smooth((progress - previous.at) / Math.max(key.at - previous.at, 1e-6));
        this.offset.x += THREE.MathUtils.lerp(previous.offset[0], key.offset[0], t);
        this.offset.y += THREE.MathUtils.lerp(previous.offset[1], key.offset[1], t);
        this.offset.z += THREE.MathUtils.lerp(previous.offset[2], key.offset[2], t);
        spin += THREE.MathUtils.lerp(previous.spin ?? 0, key.spin ?? 0, t);
        previous = null;
        break;
      }
      if (previous) { this.offset.x += previous.offset[0]; this.offset.y += previous.offset[1]; this.offset.z += previous.offset[2]; spin += previous.spin ?? 0; }
    }
    binding.mesh.position.copy(binding.originalPosition).add(this.offset);
    this.delta.setFromAxisAngle(this.yAxis, THREE.MathUtils.degToRad(spin));
    binding.mesh.quaternion.copy(binding.originalQuaternion).premultiply(this.delta);
    binding.mesh.scale.copy(binding.originalScale);
    binding.mesh.updateMatrix();
  }

  private applyBinding(binding: Binding, amount: number) {
    binding.mesh.position.copy(binding.originalPosition).addScaledVector(binding.direction, binding.distance * amount);
    this.delta.slerpQuaternions(this.identity, binding.rotation, amount);
    binding.mesh.quaternion.copy(binding.originalQuaternion).multiply(this.delta);
    binding.mesh.scale.copy(binding.originalScale);
    binding.mesh.updateMatrix();
  }

  reset() {
    this.bindings.forEach(binding => {
      binding.mesh.position.copy(binding.originalPosition);
      binding.mesh.quaternion.copy(binding.originalQuaternion);
      binding.mesh.scale.copy(binding.originalScale);
      binding.mesh.updateMatrix();
    });
  }

  diagnostics(): readonly ExplosionDiagnostic[] {
    return this.bindings.map(binding => Object.freeze({
      partId: binding.partId,
      direction: binding.direction.clone(),
      distance: binding.distance,
      start: binding.start,
      end: binding.end,
    }));
  }

  dispose() {
    if (this.bindings.length) this.reset();
    this.bindings = [];
  }
}
