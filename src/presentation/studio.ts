import * as THREE from 'three';

/**
 * Procedural photographic studio used only for image-based lighting (never drawn).
 * A dark graphite cyclorama with large rectangular softboxes: a warm key overhead
 * front-right, a long cool strip behind-left for rim highlights on machined edges,
 * a wide low fill and a floor bounce. Built from Three.js primitives, no HDRI asset.
 */
export function createStudioEnvironment() {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), new THREE.MeshBasicMaterial({ color: '#16191d', side: THREE.BackSide }));
  scene.add(room);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(58, 48), new THREE.MeshBasicMaterial({ color: '#24282e' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -10; scene.add(floor);
  const box = (w: number, h: number, color: string, intensity: number, position: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...position); m.lookAt(0, 0, 0); scene.add(m);
  };
  box(26, 18, '#fff3e2', 7, [16, 30, 20]); // key softbox overhead, front-right
  box(8, 40, '#cfe0ff', 5, [-34, 10, -22]); // tall cool strip, rear-left (rim)
  box(6, 36, '#f2f4f8', 3.2, [36, 6, -26]); // narrow strip, rear-right (edge line)
  box(40, 10, '#e8edf4', 1.1, [-10, -2, 38]); // low broad fill, front
  box(30, 30, '#ffffff', 2.4, [0, 44, 0]); // top light for flat faces
  return scene;
}

/** Soft radial falloff for an ambient-occlusion style contact shadow under the assembly. */
export function contactShadowTexture() {
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.55, 'rgba(0,0,0,0.55)'); g.addColorStop(0.8, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
