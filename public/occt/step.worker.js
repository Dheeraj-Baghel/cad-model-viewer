/* Local Open Cascade/WASM tessellation. Terminating this worker is cancellation. */
importScripts('./occt-import-js.js');
self.onmessage = async event => {
  try {
    self.postMessage({ stage: 'Loading local Open Cascade / WASM' });
    const occt = await occtimportjs({ locateFile: name => new URL(name, self.location.href).href });
    self.postMessage({ stage: 'Tessellating STEP locally — this may take a moment' });
    const result = occt.ReadStepFile(new Uint8Array(event.data.bytes), { linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: event.data.quality === 'fine' ? 0.0005 : 0.002, angularDeflection: 0.35 });
    if (!result.success || !result.meshes?.length) throw new Error('Open Cascade could not find valid solid geometry in this STEP file.');
    const triangles = result.meshes.reduce((sum, m) => sum + m.index.array.length / 3, 0);
    if (triangles > 800000 || result.meshes.length > 200) throw new Error('Conversion exceeds 800k triangles or 200 components. Use Balanced tessellation or export a smaller assembly.');
    const transfers = [];
    const meshes = result.meshes.map(m => {
      const positions = new Float32Array(m.attributes.position.array), normals = m.attributes.normal ? new Float32Array(m.attributes.normal.array) : undefined, indices = new Uint32Array(m.index.array);
      for (const a of [positions, normals, indices]) if (a) transfers.push(a.buffer);
      return { name: m.name, positions, normals, indices, color: m.color, faces: m.brep_faces };
    });
    self.postMessage({ meshes, hierarchy: result.root }, transfers);
  } catch (e) { self.postMessage({ error: e.message || 'STEP tessellation failed.' }); }
};
