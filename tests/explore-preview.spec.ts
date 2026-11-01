import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
const output='artifacts/testing/explore-preview';
const preview=(page:Page)=>page.evaluate(()=>(window as any).cadmiumPreview?.()??{});
const card=(page:Page,id:string)=>page.locator(`[data-model-id="sample:${id}"]`);
async function hoverModel(page:Page,id:string){await card(page,id).locator('.card-model').hover();await expect.poll(async()=>(await preview(page)).key).toContain(`sample:${id}|`);}

test.beforeAll(async()=>{await mkdir(output,{recursive:true});});

test('Explore cards show only product names, retain click/favorite and external provenance, with no arrows',async({page})=>{
  await page.goto('/#/explore');await expect(page.locator('.model-card')).toHaveCount(4);
  const names=['Axis-1 servo actuator','Open planetary gearbox','Right-angle bevel gearbox','Electric city train'];
  for(let index=0;index<4;index++){
    const item=page.locator('.model-card').nth(index);await expect(item).toHaveText(names[index]);
    await expect(item.locator('.card-open-affordance,.format-chip,.card-actions,.sample-provenance')).toHaveCount(0);
  }
  await expect(page.getByText('Sources & licenses',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Favorite Axis-1 servo actuator',exact:true}).click();
  await expect(page.getByRole('button',{name:'Unfavorite Axis-1 servo actuator',exact:true})).toHaveAttribute('aria-pressed','true');
  await card(page,'axis-1').getByRole('button',{name:'Axis-1 servo actuator',exact:true}).click();
  await expect(page.getByText('Ready to inspect',{exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as any).cadmiumInspect().parts?.length??0)).toBe(65);
});

test('warm hover starts promptly with the correct Axis-1 after gearbox; continuous rotation and one renderer',async({page})=>{
  const errors:string[]=[],stepRequests:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/\.(step|stp)(\?|$)/.test(request.url())||request.url().includes('/occt/'))stepRequests.push(request.url());});
  await page.goto('/#/explore');await expect.poll(async()=>(await preview(page)).warmReady??0).toBeGreaterThanOrEqual(3);
  await hoverModel(page,'planetary');const gearbox=await preview(page);expect(gearbox.parts).toHaveLength(10);expect(gearbox.triangles).toBe(13398);
  const started=Date.now();await hoverModel(page,'axis-1');const actuator=await preview(page),switchWallMs=Date.now()-started;
  expect(actuator.parts).toHaveLength(65);expect(actuator.parts).toContain('motor-can');expect(actuator.parts).toContain('stator');expect(actuator.parts).toContain('encoder-pcb');expect(actuator.readyMs).toBeLessThan(250);
  const samples=await page.evaluate(async()=>{
    const frames:number[]=[];let previous=performance.now();
    for(let index=0;index<90;index++){await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-previous);previous=now;}
    return frames;
  });
  const after=await preview(page);expect(after.angle).toBeGreaterThan(actuator.angle);expect(after.frames-actuator.frames).toBeGreaterThan(70);expect(after.resizes).toBe(actuator.resizes);expect(after.far/after.near).toBeLessThan(3);
  await expect(page.locator('.card-preview-canvas')).toHaveCount(1);expect(after.contexts).toBe(1);expect(stepRequests).toEqual([]);expect(errors).toEqual([]);
  await page.screenshot({path:`${output}/axis-1-hover.png`});
  await writeFile(`${output}/hover-metrics.json`,JSON.stringify({switchWallMs,readyMs:actuator.readyMs,frameIntervalsMs:samples,frames:after.frames-actuator.frames,near:after.near,far:after.far,sourceNames:after.parts,stepRequests},null,2));
  await hoverModel(page,'planetary');expect((await preview(page)).parts).toHaveLength(10);
  await hoverModel(page,'axis-1');expect((await preview(page)).parts).toHaveLength(65);
  await page.mouse.move(2,2);await expect.poll(async()=>(await preview(page)).live).toBe(false);const stopped=await preview(page);await page.waitForTimeout(400);expect((await preview(page)).frames).toBe(stopped.frames);expect(stopped.memory.geometries).toBeLessThanOrEqual(200);expect(stopped.cachedBytes).toBeLessThanOrEqual(24*1048576);
});

test('model-only hover, rapid switching, filtering and route cleanup do not revive stale previews',async({page})=>{
  await page.goto('/#/explore');await expect.poll(async()=>(await preview(page)).cachedEntries??0).toBeGreaterThanOrEqual(3);
  await card(page,'axis-1').getByRole('button',{name:'Axis-1 servo actuator',exact:true}).hover();expect((await preview(page)).live).toBe(false);
  for(const id of ['axis-1','planetary','bevel','axis-1','bevel','planetary']){await card(page,id).locator('.card-model').hover();await page.waitForTimeout(25);}
  await page.getByLabel('Search models').fill('train');await expect(page.locator('.model-card')).toHaveCount(1);await expect.poll(async()=>(await preview(page)).live).toBe(false);
  await hoverModel(page,'train');expect((await preview(page)).parts).toHaveLength(4);
  await page.getByRole('button',{name:'Your Library',exact:false}).click();await expect(page.locator('.card-preview-canvas')).toHaveCount(0);
  await page.getByRole('button',{name:'Back to assembly story',exact:true}).click();await expect(page.locator('.library-page')).toHaveCount(0);expect(await page.evaluate(()=>typeof(window as any).cadmiumPreview)).toBe('undefined');
});

test('reduced motion and touch have static manual controls outside cards; mobile accessibility',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto('/#/explore');await expect(page.locator('.model-card')).toHaveCount(4);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByLabel('Preview model').selectOption('sample:train');await expect.poll(async()=>(await preview(page)).key).toContain('sample:train|');
  const initial=await preview(page);await page.waitForTimeout(600);expect((await preview(page)).frames).toBe(initial.frames);
  await page.getByRole('button',{name:'Rotate right',exact:true}).click();expect((await preview(page)).angle).toBeGreaterThan(initial.angle);
  await page.getByRole('button',{name:'Stop preview',exact:true}).click();await expect(page.locator('.card-preview-canvas')).toHaveCount(0);
  await page.screenshot({path:`${output}/phone-cards.png`});
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();await writeFile(`${output}/axe-phone.json`,JSON.stringify(scan.violations,null,2));expect(scan.violations).toEqual([]);
  await context.close();
});
