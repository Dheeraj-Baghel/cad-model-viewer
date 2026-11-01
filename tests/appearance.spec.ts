import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// CP2 actual-browser gate. No mocked parser/renderer. Run against a production
// preview with QA_BASE_URL; original import/story workflows remain in viewer.spec.
const base = process.env.QA_BASE_URL ?? 'http://127.0.0.1:4326';
const dir = 'artifacts/screenshots/explore-checkpoint2';
const evidence = 'artifacts/testing/explore-checkpoint2';
const cube = 'o Cube\nv -10 -10 -10\nv 10 -10 -10\nv 10 10 -10\nv -10 10 -10\nv -10 -10 10\nv 10 -10 10\nv 10 10 10\nv -10 10 10\nf 1 4 3 2\nf 5 6 7 8\nf 1 2 6 5\nf 4 8 7 3\nf 1 5 8 4\nf 2 3 7 6\n';
const state = (p: Page) => p.evaluate(() => (window as any).cadmiumInspect());
const canvasPixels = (p: Page) => p.evaluate(() => { const c = document.querySelector('canvas')!, small = document.createElement('canvas'); small.width = 32; small.height = 32; const ctx = small.getContext('2d')!; ctx.drawImage(c, 0, 0, 32, 32); return [...ctx.getImageData(0, 0, 32, 32).data]; });
async function settle(p: Page) { await p.mouse.move(3, 3); await p.waitForTimeout(550); await p.waitForFunction(() => document.getAnimations().every(a => !(a instanceof CSSTransition) || a.playState !== 'running')); }
async function shot(p: Page, name: string) { await settle(p); if (process.env.QA_CAPTURE !== '0') await p.screenshot({ path: `${dir}/${name}.png` }); }
async function open(p: Page) { await p.goto(base + '/#viewer'); await p.getByText('Ready to inspect', { exact: true }).waitFor({ state: 'attached' }); await expect(p.locator('canvas')).toBeVisible(); await settle(p); }
async function tool(p: Page, n: string) { if (!(await p.getByRole('region', { name: `${n} tool`, exact: true }).isVisible())) await p.getByRole('toolbar', { name: 'Viewport tools' }).getByRole('button', { name: n, exact: true }).click(); }
async function lighting(p: Page, mode: 'Studio' | 'Inspect') { await p.getByRole('group', { name: 'Viewport mode' }).getByRole('button', { name: mode, exact: true }).click(); await settle(p); }
async function material(p: Page, name: string) { await p.getByRole('group', { name: 'Material choices' }).getByRole('button', { name: `${name} material`, exact: true }).click(); await settle(p); }
async function upload(p: Page, files: Parameters<ReturnType<Page['locator']>['setInputFiles']>[0]) { await p.getByRole('button', { name: 'Upload model', exact: true }).click(); await p.locator('input[type=file]').setInputFiles(files); await expect(p.getByText(/opened locally/)).toBeVisible({ timeout: 60000 }); await settle(p); }
function watch(p: Page) { const errors: string[] = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); return errors; }
function equivalent(s: any) { expect(s.sourceUnchanged).toBe(true); for (let i = 0; i < s.materials.length; i++) expect(s.materials[i].values.map((v: any) => v.properties)).toEqual(s.sources[i].values); }
async function scan(p: Page, name: string) { await settle(p); const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); await writeFile(`${evidence}/axe-${name}.json`, JSON.stringify(r.violations, null, 2)); expect(r.violations).toEqual([]); }
test.beforeAll(async () => { await mkdir(dir, { recursive: true }); await mkdir(evidence, { recursive: true }); });

test('CP2 showcase styles, four presets, scoped materials and inspection-state preservation', async ({ page }) => {
  test.setTimeout(300000); // screenshot-heavy software-GL showcase; retries stay 0
  const errors = watch(page); await open(page);
  const initial = await state(page); expect(initial.appearance.studio.material).toBe('authored'); const canvas = initial.canvas;
  await shot(page, '01-curated-studio-default');
  await tool(page, 'Display'); await shot(page, '02-appearance-sidebar');
  for (const [style, file] of [['Matte / clay', '03-clay'], ['X-ray', '04-xray'], ['Wireframe', '05-wireframe'], ['Edges', '06-edges']] as const) {
    await page.getByRole('group', { name: 'Shading' }).getByRole('button', { name: style, exact: true }).click(); await shot(page, file);
    const s = await state(page); expect(s.sourceUnchanged).toBe(true); expect(s.parts).toEqual(initial.parts); expect(s.canvas).toBe(canvas);
  }
  await page.getByRole('button', { name: 'Restore original appearance', exact: true }).click(); await settle(page); equivalent(await state(page));
  await lighting(page, 'Inspect'); equivalent(await state(page));
  for (const [name, file] of [['Clean Studio', '22-preset-clean-studio'], ['Exploded Technical', '23-preset-exploded-technical'], ['Muted X-ray', '24-preset-muted-xray'], ['Section Inspection', '25-preset-section-inspection']] as const) {
    const before = await state(page); await page.getByRole('button', { name, exact: true }).click(); await settle(page);
    expect((await state(page)).camera3).toEqual(before.camera3);
    // Fit is a separate, explicit user action, not part of applying any preset.
    await page.getByRole('button', { name: 'Fit visible model (F)' }).click(); await shot(page, file);
  }
  // Establish a real measurement on an imported OBJ cube before testing preset invariants.
  await upload(page, { name: 'cp2-cube.obj', mimeType: 'text/plain', buffer: Buffer.from(cube) });
  expect((await state(page)).appearance.studio.material).toBe('original'); equivalent(await state(page));
  await page.getByRole('tab', { name: 'Properties' }).click(); await page.getByRole('button', { name: 'Front', exact: true }).click();
  await tool(page, 'Measure'); const b = (await page.locator('canvas').boundingBox())!;
  await page.mouse.click(b.x + b.width * .46, b.y + b.height * .5); await page.mouse.click(b.x + b.width * .54, b.y + b.height * .5);
  await expect(page.locator('.measure-list li')).toHaveCount(1);
  await tool(page, 'Display'); await material(page, 'Brass');
  const before = await state(page);
  for (const [preset, style, section] of [['Clean Studio', 'solid', false], ['Exploded Technical', 'edges', false], ['Muted X-ray', 'xray', false], ['Section Inspection', 'solid', true]] as const) {
    await page.getByRole('button', { name: preset, exact: true }).click(); await settle(page);
    const s = await state(page); expect(s.camera3).toEqual(before.camera3); expect(s.measurements).toEqual(before.measurements); expect(s.hidden).toEqual(before.hidden); expect(s.selected).toBe(before.selected); expect(s.style).toBe(style); expect(s.section.enabled).toBe(section); expect(s.parts).toEqual(before.parts); expect(s.sourceUnchanged).toBe(true);
  }
  await page.getByRole('button', { name: 'Restore original appearance', exact: true }).click(); await settle(page);
  const restored = await state(page); expect(restored.section.enabled).toBe(true); expect(restored.measurements).toEqual(before.measurements); expect(restored.camera3).toEqual(before.camera3);
  await scan(page, 'presets-dark'); expect(errors).toEqual([]);
});

test('CP2 STEP source equivalence after repeated switches, all finishes and saved appearance reload', async ({ page }) => {
  test.setTimeout(180000);
  const errors = watch(page); await open(page); await upload(page, 'node_modules/occt-import-js/test/testfiles/cax-if/as1-oc-214.stp');
  const initial = await state(page); expect(initial.parts).toHaveLength(18); equivalent(initial);
  await shot(page, '07-step-original-studio'); await tool(page, 'Display');
  for (const name of ['Steel', 'Aluminum', 'Brass', 'Plastic', 'Original']) { await material(page, name); await shot(page, `08-step-${name.toLowerCase()}`); expect((await state(page)).sourceUnchanged).toBe(true); }
  await material(page, 'Brass');
  for (let i = 0; i < 6; i++) { await lighting(page, 'Inspect'); equivalent(await state(page)); await lighting(page, 'Studio'); expect((await state(page)).appearance.studio.material).toBe('brass'); }
  expect((await state(page)).parts).toEqual(initial.parts);
  await page.getByRole('button', { name: 'Saved views', exact: true }).click(); await page.getByLabel('View name').fill('CP2 brass'); await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cadmium-saved-views-v1')!)); expect(saved[0].appearance.studio.material).toBe('brass');
  await page.reload(); await settle(page); await upload(page, 'node_modules/occt-import-js/test/testfiles/cax-if/as1-oc-214.stp');
  await page.getByRole('button', { name: 'Saved views', exact: true }).click(); await page.getByRole('button', { name: 'Restore view CP2 brass' }).click(); await settle(page);
  expect((await state(page)).appearance.studio.material).toBe('brass'); expect((await state(page)).sourceUnchanged).toBe(true);
  await page.getByRole('toolbar', { name: 'Viewport tools' }).getByRole('button', { name: 'Display', exact: true }).click();
  await page.getByRole('button', { name: 'Restore original appearance', exact: true }).click(); await settle(page); equivalent(await state(page));
  await page.getByRole('group', { name: 'Background' }).getByRole('button', { name: 'Light', exact: true }).click(); await page.getByRole('button', { name: 'Edges', exact: true }).click(); await shot(page, '09-step-original-edges-light'); await scan(page, 'step-light');
  await upload(page, 'artifacts/asset-eval/planetary-open.step');
  await tool(page, 'Display'); await page.getByRole('button', { name: 'Muted X-ray', exact: true }).click(); await shot(page, '10-gearbox-xray');
  await page.locator('canvas').press('5'); await shot(page, '11-gearbox-xray-right');
  expect((await state(page)).parts).toHaveLength(10); expect((await state(page)).sourceUnchanged).toBe(true); expect(errors).toEqual([]);
});

test('CP2 real textured OBJ shared material, selective overrides/alpha and original pixel restoration', async ({ page }) => {
  const errors = watch(page), requests: string[] = []; page.on('request', r => requests.push(r.url())); await open(page);
  const k = '../metro-rush/metro-rush-assets/assets/models/kenney-train-kit/Models/OBJ format';
  await upload(page, [{ name: 'train-electric-city-a.obj', mimeType: 'text/plain', buffer: await readFile(`${k}/train-electric-city-a.obj`) }, { name: 'train-electric-city-a.mtl', mimeType: 'text/plain', buffer: await readFile(`${k}/train-electric-city-a.mtl`) }, { name: 'colormap.png', mimeType: 'image/png', buffer: await readFile(`${k}/Textures/colormap.png`) }]);
  const initial = await state(page); equivalent(initial); expect(initial.parts).toHaveLength(4);
  const originalPixels = await canvasPixels(page);
  await shot(page, '12-obj-original-immediate'); await lighting(page, 'Inspect'); equivalent(await state(page));
  await page.getByRole('button', { name: 'wheels-front', exact: true }).click(); await tool(page, 'Inspect'); await page.getByLabel('Selected component transparency').fill('70'); await shot(page, '13-obj-inspect-selected-alpha');
  let s = await state(page); expect(s.sourceUnchanged).toBe(true);
  const selectedIndex = s.materials.findIndex((m: any) => m.id === s.selected);
  for (let i = 0; i < s.materials.length; i++) expect(s.materials[i].values[0].properties.opacity).toBeCloseTo(i === selectedIndex ? .3 : 1);
  await tool(page, 'Display'); await page.getByRole('group', { name: 'Material scope' }).getByRole('button', { name: 'Selected component' }).click(); await material(page, 'Brass');
  await shot(page, '14-obj-selected-brass');
  s = await state(page); expect(s.materials.filter((m: any) => !m.values[0].map)).toHaveLength(1);
  for (let i = 0; i < 5; i++) { await lighting(page, 'Studio'); expect((await state(page)).appearance.studio.material).toBe('original'); await lighting(page, 'Inspect'); expect((await state(page)).appearance.inspect.parts[s.selected]).toBe('brass'); }
  await page.getByRole('button', { name: 'Restore original appearance', exact: true }).click(); await settle(page);
  // Clear selection (restoring originals deliberately preserves it) to compare exact material/pixels.
  await page.locator('canvas').click({ position: { x: 12, y: 120 } }); await settle(page); equivalent(await state(page));
  await lighting(page, 'Studio'); await shot(page, '15-obj-original-restored');
  const after = await state(page); expect(after.sources).toEqual(initial.sources); expect(after.parts).toEqual(initial.parts); expect(after.camera3).toEqual(initial.camera3);
  expect(await canvasPixels(page)).toEqual(originalPixels);
  await writeFile(`${evidence}/textured-obj-roundtrip.json`, JSON.stringify({ samples: 32 * 32, rgbaBytes: originalPixels.length, exactPixelsRestored: true, sourceUnchanged: after.sourceUnchanged }, null, 2));
  await tool(page, 'Display'); await page.getByRole('button', { name: 'Matte / clay', exact: true }).click(); await shot(page, '16-obj-clay');
  await page.getByRole('button', { name: 'X-ray', exact: true }).click(); await shot(page, '17-obj-xray'); await scan(page, 'obj-xray');
  expect(requests.filter(u => !u.startsWith(base + '/') && !u.startsWith('blob:') && !u.startsWith('data:'))).toEqual([]); expect(errors).toEqual([]);
});

test('CP2 authored MTL translucency, phone controls, reduced motion and disposal regression', async ({ page, browser }) => {
  const errors = watch(page); await open(page);
  const obj = 'mtllib pair.mtl\no back\nv -10 -10 -5\nv 10 -10 -5\nv 10 10 -5\nv -10 10 -5\nusemtl red\nf 1 2 3\nf 1 3 4\no front\nv -10 -10 0\nv 10 -10 0\nv 10 10 0\nv -10 10 0\nusemtl glass\nf 5 6 7\nf 5 7 8\n';
  await upload(page, [{ name: 'pair.obj', mimeType: 'text/plain', buffer: Buffer.from(obj) }, { name: 'pair.mtl', mimeType: 'text/plain', buffer: Buffer.from('newmtl red\nKd 1 0 0\nnewmtl glass\nKd 0 0 1\nd 0.3\n') }]);
  await page.locator('canvas').press('2'); await settle(page); equivalent(await state(page)); await shot(page, '18-translucent-original-studio');
  const pixel = () => page.evaluate(() => { const c = document.querySelector('canvas')!, x = document.createElement('canvas'); x.width = c.width; x.height = c.height; const ctx = x.getContext('2d')!; ctx.drawImage(c, 0, 0); return [...ctx.getImageData(Math.round(c.width / 2), Math.round(c.height / 2), 1, 1).data]; });
  const studioPixel = await pixel(); expect(studioPixel[0]).toBeGreaterThan(40); // red behind blue really visible
  await lighting(page, 'Inspect'); const sourcePixel = await pixel(); expect(sourcePixel[0]).toBeGreaterThan(40); equivalent(await state(page)); await shot(page, '19-translucent-original-inspect');
  await tool(page, 'Display'); await material(page, 'Steel'); await page.getByRole('button', { name: 'Restore original appearance', exact: true }).click(); await settle(page);
  expect(await pixel()).toEqual(sourcePixel); equivalent(await state(page));
  await writeFile(`${evidence}/translucency-pixels.json`, JSON.stringify({ studioPixel, sourcePixel, restoredPixel: await pixel() }, null, 2));
  // Model replacement cleans clones and allows a new import/render using unchanged parser.
  for (let i = 0; i < 3; i++) await upload(page, { name: `cube-${i}.obj`, mimeType: 'text/plain', buffer: Buffer.from(cube) });
  equivalent(await state(page)); expect(errors).toEqual([]);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }); const p = await phone.newPage(); const phoneErrors = watch(p); await open(p); await tool(p, 'Display');
  await shot(p, '20-phone-appearance'); await p.getByRole('button', { name: 'Muted X-ray', exact: true }).click(); await shot(p, '21-phone-xray');
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await expect(p.getByRole('switch', { name: 'Turntable rotation' })).toBeDisabled(); await scan(p, 'phone'); expect(phoneErrors).toEqual([]); await phone.close();
});
