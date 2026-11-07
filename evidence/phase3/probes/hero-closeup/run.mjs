// One-off Phase 3 hero-closeup probe (NOT committed tooling).
// Shot A: normal third-person rig (7.5 m) at spawn = gameplay distance.
// Shot B: shipped photo mode (PHOTO button), wheel-zoomed to its 3 m
// minimum orbit = close distance. No harness or game code is modified;
// zoom uses the photo controller's own wheel handler.
import { chromium } from '/home/hatch/workspace/voxbox-amberfall/xandria-studio/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/home/hatch/workspace/voxbox-amberfall/evidence/phase3/probes/hero-closeup';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
const errors = [];
async function run(viewport, tag) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:4173/player.html?test=1&autostart=1&splash=0', { timeout: 120000 });
  await page.waitForFunction(() => !!(window.__XANDRIA__ && window.__XANDRIA__.engine), null, { timeout: 120000 });
  await page.waitForFunction(() => window.__XANDRIA__.engine.state === 'playing', null, { timeout: 60000 }).catch(() => 'not-playing');
  await sleep(8000);
  await page.screenshot({ path: path.join(OUT, `hero-${tag}-gameplay.png`), animations: 'disabled', timeout: 300000 });
  console.log(tag, 'gameplay shot done');
  // Enter photo mode via the HUD PHOTO button (label is "PHOTO (O)").
  const photoBtn = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((el) => /PHOTO/.test((el.textContent ?? '').toUpperCase()));
    if (b) { b.click(); return b.textContent.trim(); }
    return btns.map((el) => el.textContent).slice(0, 40);
  });
  console.log(tag, 'photoBtn:', JSON.stringify(photoBtn));
  await sleep(1500);
  const orbit0 = await page.evaluate(() => {
    const X = window.__XANDRIA__;
    return { active: !!X.engine.photoMode?.active, orbit: X.engine.photoMode?.orbit ?? null };
  });
  console.log(tag, 'orbit0:', JSON.stringify(orbit0));
  // Close distance via the orbit test seam (the wheel-event path hung the
  // earlier run at the close screenshot; the seam is proven by the apron
  // probe). Distance 3 = PHOTO_ORBIT_MIN_DIST.
  await page.evaluate(() => {
    const X = window.__XANDRIA__;
    if (X.engine.photoMode?.active) X.engine.photoMode.setOrbit({ distance: 3, pitch: 0.25 });
  });
  await sleep(2000);
  const orbit1 = await page.evaluate(() => {
    const X = window.__XANDRIA__;
    return { active: !!X.engine.photoMode?.active, orbit: X.engine.photoMode?.orbit ?? null };
  });
  console.log(tag, 'orbit1:', JSON.stringify(orbit1));
  await page.screenshot({ path: path.join(OUT, `hero-${tag}-close.png`), animations: 'disabled', timeout: 300000 });
  const rec = { tag, viewport, photoBtn, orbit0, orbit1, errors };
  fs.writeFileSync(path.join(OUT, `hero-${tag}.json`), JSON.stringify(rec, null, 2));
  console.log(tag, JSON.stringify(rec, null, 2));
  await ctx.close();
}
await run({ width: 844, height: 390 }, '844x390');
await run({ width: 1280, height: 720 }, 'desktop');
await browser.close();
console.log('errors:', errors);
