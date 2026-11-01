import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Regression for the real-user Explore freeze: locator.click()/fill() can scroll
// an overflow:hidden ancestor programmatically, hiding a broken wheel/touch page.
// These checks use native input and hit tests, never scrollIntoView/forced clicks.
const out = 'artifacts/screenshots/explore-interaction-fix';
const reports = 'artifacts/testing/explore-interaction-fix';
const state = (p: Page) => p.evaluate(() => (window as any).cadmiumInspect());
async function pointerClick(p: Page, target: Locator) {
  const box = await target.boundingBox(); expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(await p.evaluate(() => innerHeight));
  const receives = await target.evaluate(e => { const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!h && e.contains(h); });
  expect(receives, 'ordinary pointer must reach the visible control').toBe(true);
  await p.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
}
async function wheelTo(p: Page, target: Locator) {
  for (let i = 0; i < 20; i++) {
    const b = await target.boundingBox(), h = await p.evaluate(() => innerHeight);
    if (b && b.y >= 8 && b.y + b.height <= h - 8) return;
    await p.mouse.move(12, Math.round(h * .65));
    await p.mouse.wheel(0, b && b.y < 8 ? -320 : 320); await p.waitForTimeout(90);
  }
  throw new Error('Target not reachable with real document wheel scrolling');
}
function errors(p: Page) { const list: string[] = []; p.on('pageerror', e => list.push(e.message)); p.on('console', m => { if (m.type() === 'error') list.push(m.text()); }); return list; }
test.beforeAll(async () => { await mkdir(out, { recursive: true }); await mkdir(reports, { recursive: true }); });

test('Explore direct entry accepts native wheel, search/nav/import clicks, model image and title clicks', async ({ page }) => {
  test.setTimeout(180000); const errs = errors(page);
  await page.goto('/#/explore'); await expect(page.locator('.model-card')).toHaveCount(4);
  await expect(page.locator('.cadmium-shell')).not.toHaveClass(/viewer-mode/);
  const layout = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, viewport: innerHeight, shellOverflow: getComputedStyle(document.querySelector('.cadmium-shell')!).overflow, bodyLocked: document.body.classList.contains('workspace-active') }));
  expect(layout.height).toBeGreaterThan(layout.viewport); expect(layout.shellOverflow).toBe('visible'); expect(layout.bodyLocked).toBe(false);
  const search = page.getByRole('textbox', { name: 'Search models', exact: true }); await pointerClick(page, search); await page.keyboard.type('bevel'); await expect(page.locator('.model-card')).toHaveCount(1);
  await pointerClick(page, search); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Backspace'); await expect(page.locator('.model-card')).toHaveCount(4);
  await pointerClick(page, page.getByRole('button', { name: 'Import model', exact: true })); await expect(page.getByRole('dialog')).toBeVisible(); await pointerClick(page, page.getByRole('button', { name: 'Close dialog', exact: true }));
  const image = page.locator('[data-model-id="sample:bevel"] .card-open');
  const oldY = await page.evaluate(() => scrollY); await page.mouse.move(12, 700); await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(oldY);
  await wheelTo(page, image); await pointerClick(page, image); // center of model image, NOT the arrow
  await expect(page.locator('#viewer-heading')).toHaveText('Right-angle bevel gearbox', { timeout: 60000 });
  await expect.poll(async () => (await state(page)).recordId).toBe('sample:bevel');
  expect(await page.evaluate(() => document.body.classList.contains('workspace-active'))).toBe(true);
  await pointerClick(page, page.getByRole('button', { name: 'Your Library', exact: true }));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your models');
  await pointerClick(page, page.getByRole('navigation', { name: 'Collection navigation' }).getByRole('button', { name: 'Explore', exact: true }));
  const title = page.locator('[data-model-id="sample:train"] h2 button'); await wheelTo(page, title);
  if (process.env.QA_CAPTURE !== '0') await page.screenshot({ path: `${out}/desktop-bottom-model-reachable.png` });
  await pointerClick(page, title); await expect(page.locator('#viewer-heading')).toHaveText('Electric city train', { timeout: 60000 });
  expect((await state(page)).parts).toHaveLength(4); expect(errs).toEqual([]);
  await writeFile(`${reports}/desktop.json`, JSON.stringify({ layout, nativeWheel: true, nativeSearch: true, navAndImport: true, imageCenterOpens: true, belowFoldTitleOpens: true, errors: errs }, null, 2));
});

test('Story to Explore and viewer to Library release scroll lock; hidden viewer is inert', async ({ page }) => {
  test.setTimeout(120000); const errs = errors(page);
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Engineering, revealed.' })).toBeVisible();
  await pointerClick(page, page.getByRole('button', { name: 'Explore models', exact: true })); await expect(page.locator('.library-page')).toBeVisible();
  expect(await page.locator('.persistent-scene').getAttribute('inert')).not.toBeNull();
  expect(await page.locator('.workspace-ui').getAttribute('inert')).not.toBeNull();
  await page.mouse.move(12, 700); await page.mouse.wheel(0, 600); await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  const footer = page.locator('.library-storage'); await wheelTo(page, footer); expect(await footer.isVisible()).toBe(true);
  const nav = page.getByRole('navigation', { name: 'Collection navigation' }).getByRole('button', { name: /Your Library/ }); await wheelTo(page, nav); await pointerClick(page, nav);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your models');
  await pointerClick(page, page.getByRole('button', { name: 'Resume viewer', exact: true })); await expect(page.locator('.cadmium-shell')).toHaveClass(/viewer-mode/);
  expect(await page.locator('.persistent-scene').getAttribute('inert')).toBeNull(); expect(await page.locator('.workspace-ui').getAttribute('inert')).toBeNull();
  await pointerClick(page, page.getByRole('button', { name: 'Your Library', exact: true }));
  await pointerClick(page, page.getByRole('navigation', { name: 'Collection navigation' }).getByRole('button', { name: 'Explore', exact: true }));
  await page.mouse.move(12, 700); await page.mouse.wheel(0, 700); await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(errs).toEqual([]);
});

test('Phone Explore responds to touch scrolling and model-image taps', async ({ browser }) => {
  test.setTimeout(120000); const ctx = await browser.newContext({ baseURL: process.env.QA_BASE_URL ?? 'http://127.0.0.1:4326', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const p = await ctx.newPage(), errs = errors(p); await p.goto('/#/explore'); await expect(p.locator('.model-card')).toHaveCount(4);
  expect(await p.evaluate(() => document.documentElement.scrollHeight > innerHeight)).toBe(true);
  const client = await ctx.newCDPSession(p);
  const swipe = async () => { await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 20, y: 690 }] }); for (let i = 1; i <= 8; i++) { await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 20, y: 690 - i * 55 }] }); await p.waitForTimeout(20); } await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(200); };
  await swipe(); await expect.poll(() => p.evaluate(() => scrollY)).toBeGreaterThan(0);
  const image = p.locator('[data-model-id="sample:axis-1"] .card-open'); let box = await image.boundingBox();
  for (let i = 0; i < 5 && (!box || box.y + box.height / 2 > 800); i++) { await swipe(); box = await image.boundingBox(); }
  expect(box).not.toBeNull(); expect(box!.y + box!.height / 2).toBeLessThan(800); expect(box!.y + box!.height / 2).toBeGreaterThan(0);
  if (process.env.QA_CAPTURE !== '0') await p.screenshot({ path: `${out}/phone-native-touch-scroll.png` });
  await p.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2); await expect(p.locator('#viewer-heading')).toHaveText('Axis-1 servo actuator', { timeout: 60000 });
  expect(errs).toEqual([]); await ctx.close();
});
