// Canonical catalogue posters: the actual hover renderer, materials, geometry,
// lighting and first-frame camera. Do not use an independent thumbnail setup.
// Run against the local Vite dev server: node scripts/build-preview-posters.mjs
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const base=process.env.POSTER_BASE_URL??'http://127.0.0.1:4326';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=metal']});
try {
  const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1});
  // Standalone harness on the app's origin, without mounting its other renderer.
  await page.route(`${base}/`,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0"><div id="poster" style="width:640px;height:480px"></div></body></html>'}));
  await page.goto(`${base}/`);
  const images=await page.evaluate(async()=>{
    // Vite serves these authoritative modules; no duplicated rendering code.
    const {PreviewController}=await import('/src/library/preview.ts');
    const {SAMPLES,sampleFiles,samplePosterUrl}=await import('/src/library/catalog.ts');
    const {loadSamplePreview,samplePreviewKey}=await import('/src/library/samplePreview.ts');
    const controller=new PreviewController(),host=document.getElementById('poster');
    const result=[];
    try {
      for(const sample of SAMPLES){
        let error='';await controller.activate(host,signal=>sampleFiles(sample,signal),sample.sourceUnits,'balanced',sample.orientation,false,message=>{error=message;},samplePreviewKey(sample),signal=>loadSamplePreview(sample,signal));
        if(error)throw new Error(`${sample.id}: ${error}`);
        const canvas=host.querySelector('canvas');if(!canvas)throw new Error(`${sample.id}: missing rendered canvas`);
        result.push({id:sample.id,url:samplePosterUrl(sample.id),dataUrl:canvas.toDataURL('image/png'),state:controller.debug()});
        controller.stop();
      }
    } finally {controller.dispose();}
    return result;
  });
  const metadata=[];
  for(const image of images){
    const bytes=Buffer.from(image.dataUrl.split(',')[1],'base64');
    const output=path.join('public',image.url.slice(1));await mkdir(path.dirname(output),{recursive:true});await writeFile(output,bytes);
    metadata.push({sampleId:image.id,url:image.url,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,width:640,height:480,key:image.state.key,parts:image.state.parts.length,angle:image.state.angle});
    console.log(`${image.id}: ${image.state.parts.length} parts, ${bytes.length} bytes -> ${output}`);
  }
  await mkdir('artifacts/testing/poster-continuity',{recursive:true});
  await writeFile('artifacts/testing/poster-continuity/generation.json',JSON.stringify(metadata,null,2));
} finally {await browser.close();}
