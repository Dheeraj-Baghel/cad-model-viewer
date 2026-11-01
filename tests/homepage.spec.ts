import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

// User correction: keep the 65-part motor on the RIGHT, not a centred substitute.
// Callouts must survive full explosion and stay outside the live editorial text.
async function seek(p:Page,progress:number){await p.evaluate(value=>{const s=document.querySelector<HTMLElement>('.story-sections')!;scrollTo(0,s.offsetTop+(s.offsetHeight-innerHeight)*value);},progress);await expect.poll(async()=>Math.abs(Number(await p.locator('.landing').getAttribute('data-progress'))-progress)).toBeLessThan(.002);await p.waitForTimeout(600);}
const state=(p:Page)=>p.evaluate(()=>(window as any).cadmiumInspect());
// Copy is visible immediately now; it is not a readiness signal for the lazy
// model/viewport. Wait on the geometry these tests actually inspect.
async function modelReady(p:Page){await expect.poll(async()=>(await state(p)).parts?.length??0).toBe(65);}
const out='artifacts/screenshots/homepage-motor-restored';
test.beforeAll(async()=>{await mkdir(out,{recursive:true});});

test('homepage restores right-hand Axis-1 motor and all exploded overview labels through final chapter',async({page})=>{
  await page.setViewportSize({width:1440,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await expect(page.getByRole('heading',{name:'Engineering, revealed.'})).toBeVisible();
  await modelReady(page);
  const before=await state(page);expect(before.parts).toHaveLength(65);expect(before.parts.some((p:any)=>p.id==='motor-can')).toBe(true);expect(before.parts.some((p:any)=>p.id==='stator')).toBe(true);
  if(process.env.QA_CAPTURE!=='0')await page.screenshot({path:`${out}/desktop-hero-confirmed.png`});
  for(const progress of [.3,.5,.9,.97]){
    await seek(page,progress);const labels=page.locator('.story-callouts .scene-label');await expect(labels).toHaveCount(progress===.3?3:progress===.5?4:6);
    const copy=(await page.locator('.chapter-copy.is-active').boundingBox())!;
    for(const label of await labels.all()){const box=(await label.boundingBox())!;expect(box.x).toBeGreaterThan(copy.x+copy.width+10);expect(box.x+box.width).toBeLessThanOrEqual(1440);expect(box.y).toBeGreaterThanOrEqual(100);expect(box.y+box.height).toBeLessThan(900-90);}
    if(progress===.97&&process.env.QA_CAPTURE!=='0')await page.screenshot({path:`${out}/desktop-exploded-confirmed.png`});
  }
  await page.locator('[data-label-part="stator"]').click();await expect(page.getByRole('complementary',{name:'Selected component annotation'})).toContainText('Stator core');await page.getByRole('button',{name:'Clear story selection'}).click();
  await seek(page,0);expect((await state(page)).parts).toEqual(before.parts);expect((await state(page)).sourceUnchanged).toBe(true);
  await page.getByRole('button',{name:'Open CAD Viewer',exact:true}).click();await expect(page.getByText('Ready to inspect',{exact:true})).toBeVisible();const viewer=await state(page);expect(viewer.canvas).toBe(before.canvas);expect(viewer.parts).toHaveLength(65);expect(errors).toEqual([]);
});

test('phone keeps the motor, labelled exploded parts below text, and reduced-motion labels remain available',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await modelReady(page);
  await seek(page,.97);const labels=page.locator('.scene-label');await expect(labels).toHaveCount(2);const copy=(await page.locator('.chapter-copy.is-active').boundingBox())!;
  for(const l of await labels.all()){const b=(await l.boundingBox())!;expect(b.y).toBeGreaterThan(copy.y+copy.height);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(390);}
  expect((await state(page)).parts).toHaveLength(65);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(process.env.QA_CAPTURE!=='0')await page.screenshot({path:`${out}/phone-exploded-confirmed.png`});
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await modelReady(page);const initial=await state(page);await page.getByLabel('Stable assembly explosion').fill('100');await expect(page.locator('.scene-label')).toHaveCount(2);const spread=await state(page);expect(spread.parts).not.toEqual(initial.parts);await page.getByLabel('Stable assembly explosion').fill('0');await expect.poll(async()=>(await state(page)).parts).toEqual(initial.parts);
});
