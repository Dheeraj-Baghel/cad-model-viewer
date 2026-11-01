import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SAMPLES } from './catalog';
import { samplePreviewKey } from './samplePreview';

// Regression: Axis-1 and its planetary core share the vendor STEP hash, but are
// different whole products. Preview caching must never identify them by hash alone.
describe('faithful prepared collection previews',()=>{
  it('whole-product keys are unique even when source hashes are shared',()=>{
    expect(SAMPLES[0].hash).toBe(SAMPLES[1].hash);
    expect(new Set(SAMPLES.map(samplePreviewKey)).size).toBe(SAMPLES.length);
    expect(samplePreviewKey(SAMPLES[0])).toContain('sample:axis-1|');
    expect(samplePreviewKey(SAMPLES[1])).toContain('sample:planetary|');
  });
  for(const id of ['planetary','bevel']){
    it(`${id}: original and prepared binary hashes, components and triangles match acceptance`,()=>{
      const sample=SAMPLES.find(sample=>sample.id===id)!;
      const original=readFileSync(`public/samples/${id}/${id}.step`);
      const meta=JSON.parse(readFileSync(`public/samples/${id}/preview.json`,'utf8'));
      const binary=readFileSync(`public/samples/${id}/preview.bin`);
      expect(createHash('sha256').update(original).digest('hex')).toBe(sample.hash);
      expect(meta.sourceHash).toBe(sample.hash);expect(meta.sampleId).toBe(id);
      expect(createHash('sha256').update(binary).digest('hex')).toBe(meta.binarySha256);
      expect(meta.bytes).toBe(binary.length);expect(meta.meshes).toHaveLength(sample.parts);expect(meta.triangles).toBe(sample.triangles);
      expect(meta.settings).toEqual({linearUnit:'millimeter',linearDeflectionType:'bounding_box_ratio',linearDeflection:0.002,angularDeflection:0.35});
    });
    it(`${id}: full precision geometry, indices, normals and millimetre bounds are retained`,()=>{
      const sample=SAMPLES.find(sample=>sample.id===id)!;
      const meta=JSON.parse(readFileSync(`public/samples/${id}/preview.json`,'utf8'));
      const file=readFileSync(`public/samples/${id}/preview.bin`);
      const buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength);
      const minimum=[Infinity,Infinity,Infinity],maximum=[-Infinity,-Infinity,-Infinity];let triangles=0;
      for(const mesh of meta.meshes){
        const positions=new Float32Array(buffer,mesh.positions.offset,mesh.positions.count),indices=new Uint32Array(buffer,mesh.indices.offset,mesh.indices.count);
        expect(positions.length%3).toBe(0);expect(indices.length%3).toBe(0);triangles+=indices.length/3;
        for(const index of indices)expect(index).toBeLessThan(positions.length/3);
        positions.forEach((value,index)=>{expect(Number.isFinite(value)).toBe(true);const axis=index%3;minimum[axis]=Math.min(minimum[axis],value);maximum[axis]=Math.max(maximum[axis],value);});
        expect(mesh.normals.count).toBe(positions.length);
        const normals=new Float32Array(buffer,mesh.normals.offset,mesh.normals.count);for(const value of normals){expect(Number.isFinite(value)).toBe(true);expect(Math.abs(value)).toBeLessThanOrEqual(1.001);}
      }
      expect(triangles).toBe(sample.triangles);
      maximum.map((value,index)=>value-minimum[index]).forEach((size,index)=>expect(size).toBeCloseTo(sample.bounds[index],2));
    });
  }
});
