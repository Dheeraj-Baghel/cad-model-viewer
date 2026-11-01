// Prepare faithful hover meshes from the bundled, hash-verified STEP originals.
// No simplification/quantization: exact Float32 positions/normals and Uint32
// indices from the same OCCT settings as the balanced inspection importer.
// Full inspection still opens the untouched STEP. These are display assets only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const occt = require('occt-import-js');
const root = path.resolve(__dirname, '../public/samples');
const settings = {linearUnit:'millimeter', linearDeflectionType:'bounding_box_ratio', linearDeflection:0.002, angularDeflection:0.35};
(async () => {
  const engine = await occt();
  for (const id of ['planetary', 'bevel']) {
    const folder = path.join(root, id), source = fs.readFileSync(path.join(folder, `${id}.step`));
    const provenance = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json')));
    const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
    if (sourceHash !== provenance.files[0].sha256) throw new Error(`${id}: original source hash mismatch`);
    const result = engine.ReadStepFile(new Uint8Array(source), settings);
    if (!result.success || !result.meshes.length) throw new Error(`${id}: tessellation failed`);
    const chunks = []; let offset = 0;
    const add = array => {
      const data = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
      const spec = {offset, count:array.length}; chunks.push(data); offset += data.length;
      return spec;
    };
    const meshes = result.meshes.map(mesh => ({
      name:mesh.name, color:mesh.color, faces:mesh.brep_faces,
      positions:add(new Float32Array(mesh.attributes.position.array)),
      normals:mesh.attributes.normal ? add(new Float32Array(mesh.attributes.normal.array)) : null,
      indices:add(new Uint32Array(mesh.index.array)),
    }));
    const binary = Buffer.concat(chunks);
    const metadata = {version:1, sampleId:id, sourceHash, settings, binarySha256:crypto.createHash('sha256').update(binary).digest('hex'), bytes:binary.length,
      triangles:result.meshes.reduce((n,m) => n + m.index.array.length/3, 0), meshes};
    if (meshes.length !== provenance.acceptance.parts || metadata.triangles !== provenance.acceptance.triangles) throw new Error(`${id}: component/triangle acceptance mismatch`);
    fs.writeFileSync(path.join(folder, 'preview.bin'), binary);
    fs.writeFileSync(path.join(folder, 'preview.json'), JSON.stringify(metadata));
    console.log(`${id}: ${meshes.length} components, ${metadata.triangles} triangles, ${binary.length} bytes, ${sourceHash}`);
  }
})().catch(error => {console.error(error); process.exitCode=1;});
