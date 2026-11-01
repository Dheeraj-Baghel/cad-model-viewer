import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

self.onmessage = (event: MessageEvent<{ bytes: ArrayBuffer; format: string }>) => {
  try {
    self.postMessage({ stage: 'Parsing mesh geometry' });
    const { bytes, format } = event.data;
    const root = format === 'stl' ? new THREE.Mesh(new STLLoader().parse(bytes)) : new OBJLoader().parse(new TextDecoder().decode(bytes));
    root.updateMatrixWorld(true);
    const meshes: { name: string; positions: Float32Array; normals: Float32Array; uv?: Float32Array; indices?: Uint32Array; groups: THREE.BufferGeometry['groups']; materialNames: string[] }[] = [];
    const transfer: Transferable[] = [];
    root.traverse(o => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const g = m.geometry; g.applyMatrix4(m.matrixWorld); g.computeVertexNormals();
      const positions = new Float32Array(g.attributes.position.array), normals = new Float32Array(g.attributes.normal.array), uv = g.attributes.uv ? new Float32Array(g.attributes.uv.array) : undefined, indices = g.index ? new Uint32Array(g.index.array) : undefined;
      const materialNames = (Array.isArray(m.material) ? m.material : [m.material]).map(mat => mat.name);
      meshes.push({ name: m.name, positions, normals, uv, indices, groups: g.groups, materialNames });
      for (const a of [positions, normals, uv, indices]) if (a) transfer.push(a.buffer);
      g.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(mat => mat.dispose());
    });
    if (!meshes.length) throw new Error('No triangle meshes were found.');
    self.postMessage({ meshes }, { transfer });
  } catch (e) { self.postMessage({ error: e instanceof Error ? e.message : 'Invalid mesh file.' }); }
};
