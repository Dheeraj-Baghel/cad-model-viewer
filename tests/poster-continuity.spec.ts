import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
const output='artifacts/testing/poster-continuity';
const state=(page:Page)=>page.evaluate(()=>(window as any).cadmiumPreview?.()??{});

// Compare actual browser pixels, not just product IDs. The former black/green
// static thumbnail passed all identity checks but visibly changed on hovering.
async function pixelDifference(page:Page,before:Buffer,after:Buffer){
  return page.evaluate(async({before,after})=>{
    const decode=async(encoded:string)=>{const image=new Image();image.src=`data:image/png;base64,${encoded}`;await image.decode();const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;const context=canvas.getContext('2d')!;context.drawImage(image,0,0,256,192);return context.getImageData(0,0,256,192).data;};
    const a=await decode(before),b=await decode(after);let sum=0,changed=0;
    for(let index=0;index<a.length;index+=4){let largest=0;for(let channel=0;channel<3;channel++){const delta=Math.abs(a[index+channel]-b[index+channel]);sum+=delta;largest=Math.max(largest,delta);}if(largest>30)changed++;}
    return {meanRGBDifference:sum/(256*192*3),changedPixelFraction:changed/(256*192)};
  },{before:before.toString('base64'),after:after.toString('base64')});
}

test.beforeAll(async()=>{await mkdir(output,{recursive:true});});
for(const width of [1440,390]){
  test(`poster matches the live first frame in finish, shape and framing at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:1000});
    // Static preview uses the identical first draw as normal hover, but disables
    // subsequent rotation so captures compare the same camera, not later poses.
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/explore');
    await expect(page.locator('.model-card')).toHaveCount(4);
    const report=[];
    for(const id of ['axis-1','planetary','bevel','train']){
      const host=page.locator(`[data-model-id="sample:${id}"] .card-model`);
      await page.mouse.move(1,1);
      await expect(host.locator('img')).toHaveAttribute('src',`/samples/${id}/thumbnail-preview-v1.png`);
      await host.locator('img').evaluate(async(image:HTMLImageElement)=>{await image.decode();});
      const before=await host.screenshot();
      await page.getByLabel('Preview model').selectOption(`sample:${id}`);
      await expect.poll(async()=>(await state(page)).key).toContain(`sample:${id}|`);
      expect((await state(page)).angle).toBe(.7);
      const after=await host.screenshot();
      const difference=await pixelDifference(page,before,after);
      await writeFile(`${output}/${width}-${id}-before.png`,before);await writeFile(`${output}/${width}-${id}-after.png`,after);
      report.push({id,...difference});
      expect(difference.meanRGBDifference).toBeLessThan(2);
      expect(difference.changedPixelFraction).toBeLessThan(.025);
      await page.getByRole('button',{name:'Stop preview',exact:true}).click();
      await expect(host.locator('canvas')).toHaveCount(0);
    }
    await writeFile(`${output}/${width}-pixel-comparison.json`,JSON.stringify(report,null,2));
  });
}

test('Explore ignores old saved sample thumbnails, including after reload; personal thumbnails remain intact',async({page})=>{
  await page.goto('/#/explore');await page.getByRole('button',{name:'Favorite Axis-1 servo actuator',exact:true}).click();
  await expect(page.getByRole('button',{name:'Unfavorite Axis-1 servo actuator',exact:true})).toBeVisible();
  await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=24;const context=canvas.getContext('2d')!;context.fillStyle='#ff00ff';context.fillRect(0,0,32,24);
    const blob=await new Promise<Blob>(resolve=>canvas.toBlob(blob=>resolve(blob!),'image/png'));
    const request=indexedDB.open('cadmium-library');const db:IDBDatabase=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
    const transaction=db.transaction('models','readwrite'),store=transaction.objectStore('models'),get=store.get('sample:axis-1');get.onsuccess=()=>store.put({...get.result,thumbnail:blob});
    await new Promise<void>((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);});db.close();window.dispatchEvent(new Event('cadmium-library-change'));
  });
  const image=page.locator('[data-model-id="sample:axis-1"] .card-model img');
  await expect(image).toHaveAttribute('src','/samples/axis-1/thumbnail-preview-v1.png');
  await page.reload();await expect(page.getByRole('button',{name:'Unfavorite Axis-1 servo actuator',exact:true})).toBeVisible();await expect(image).toHaveAttribute('src','/samples/axis-1/thumbnail-preview-v1.png');
  await page.getByRole('button',{name:'Your Library',exact:false}).click();
  await expect(image).toHaveAttribute('src',/^blob:/);
});
