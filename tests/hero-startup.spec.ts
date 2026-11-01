import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// The hero must occupy its final position from its first paint, not transition
// from top:50% with no centering transform while lazy styles/fonts arrive.
const output = 'artifacts/testing/hero-startup';
async function watchStartup(page: Page) {
  await page.addInitScript(() => {
    const samples: any[] = [];
    (window as any).heroStartup = samples;
    let started = 0;
    const sample = (time: number) => {
      const copy = document.querySelector<HTMLElement>('.chapter-0 .chapter-copy');
      if (copy) {
        if (!started) started = time;
        const style = getComputedStyle(copy), box = copy.getBoundingClientRect();
        samples.push({ elapsed: time - started, y: box.y, height: box.height,
          transform: style.transform, transition: style.transitionProperty,
          animation: style.animationName, opacity: Number(style.opacity),
          fonts: document.fonts.status });
      }
      if (!started || time - started < 1800) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

for (const viewport of [{width:1440,height:900}, {width:1280,height:720}, {width:1000,height:800}, {width:390,height:844}]) {
  test(`hero first paint is in place at ${viewport.width}px, including delayed fonts and reload`, async ({page}) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await watchStartup(page);
    await page.route('**/fonts/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 700));
      await route.continue();
    });
    await page.goto('/');
    await expect(page.getByRole('heading', {name:'Engineering, revealed.'})).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).heroStartup.at(-1)?.elapsed ?? 0)).toBeGreaterThanOrEqual(1800);
    const samples = await page.evaluate(() => (window as any).heroStartup);
    await mkdir(output, {recursive:true});
    await writeFile(`${output}/${viewport.width}-startup.json`, JSON.stringify(samples, null, 2));
    expect(samples.length).toBeGreaterThan(10);
    expect(samples[0].opacity).toBe(1);
    // No layout tween or intro animation may override the final transform.
    for (const sample of samples) {
      expect(sample.transition).not.toMatch(/transform|all/);
      expect(sample.animation).toBe('none');
    }
    const settled = samples.filter((sample:any) => sample.fonts === 'loaded');
    expect(settled.length).toBeGreaterThan(2);
    expect(Math.max(...settled.map((sample:any) => sample.y)) - Math.min(...settled.map((sample:any) => sample.y))).toBeLessThan(1);
    expect(Math.abs(samples[0].y - samples.at(-1).y)).toBeLessThan(20);
    const copy = (await page.locator('.chapter-copy.is-active').boundingBox())!;
    const controls = (await page.locator('.story-bottom').boundingBox())!;
    expect(copy.y + copy.height).toBeLessThan(controls.y);
    if (viewport.width === 1440) await page.screenshot({path:`${output}/desktop-final.png`});
    await page.unroute('**/fonts/**');
    await page.reload();
    await expect(page.getByRole('heading', {name:'Engineering, revealed.'})).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as any).heroStartup.at(-1)?.elapsed ?? 0)).toBeGreaterThanOrEqual(1800);
    const reload = await page.evaluate(() => (window as any).heroStartup);
    expect(Math.max(...reload.map((sample:any) => sample.y)) - Math.min(...reload.map((sample:any) => sample.y))).toBeLessThan(1);
    expect(errors).toEqual([]);
  });
}

test('reverse chapters and return from viewer never reintroduce a copy-position animation', async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const hero = page.locator('.chapter-0 .chapter-copy');
  const initial = (await hero.boundingBox())!;
  for (const progress of [.5, .97, .5, .3, 0]) {
    await page.evaluate(value => {
      const sections = document.querySelector<HTMLElement>('.story-sections')!;
      scrollTo(0, sections.offsetTop + (sections.offsetHeight - innerHeight) * value);
    }, progress);
    await expect.poll(async () => Math.abs(Number(await page.locator('.landing').getAttribute('data-progress')) - progress)).toBeLessThan(.002);
    const samples = await page.evaluate(async () => {
      const copy = document.querySelector<HTMLElement>('.chapter-copy.is-active')!;
      const points: {y:number; transition:string; animation:string}[] = [];
      for (let i = 0; i < 20; i++) {
        await new Promise(requestAnimationFrame);
        const style = getComputedStyle(copy);
        points.push({y:copy.getBoundingClientRect().y, transition:style.transitionProperty, animation:style.animationName});
      }
      return points;
    });
    expect(Math.max(...samples.map(sample => sample.y)) - Math.min(...samples.map(sample => sample.y))).toBeLessThan(1);
    samples.forEach(sample => {
      expect(sample.transition).not.toMatch(/transform|all/);
      expect(sample.animation).toBe('none');
    });
  }
  expect(Math.abs((await hero.boundingBox())!.y - initial.y)).toBeLessThan(1);
  await page.getByRole('button', {name:'Open CAD Viewer', exact:true}).click();
  await expect(page.getByText('Ready to inspect', {exact:true})).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', {name:'Engineering, revealed.'})).toBeVisible();
  expect(Math.abs((await hero.boundingBox())!.y - initial.y)).toBeLessThan(1);
  const returned = await hero.evaluate(async copy => {
    const positions: number[] = [];
    for (let i = 0; i < 60; i++) {
      await new Promise(requestAnimationFrame);
      positions.push(copy.getBoundingClientRect().y);
    }
    return {positions, animation:getComputedStyle(copy).animationName};
  });
  expect(returned.animation).toBe('none');
  expect(Math.max(...returned.positions) - Math.min(...returned.positions)).toBeLessThan(1);
});
