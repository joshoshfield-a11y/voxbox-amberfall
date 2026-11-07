// Phase 4b second pass: landscape-touch with the tutorial skipped, so the
// hero is visible (in the spawn framing the centered tutorial card covers
// the hero in landscape; in portrait it sits below the hero). The skip is
// a genuine CDP touch tap via page.touchscreen.tap on SKIP TUTORIAL.
// Captures 0s/3s/8s after the skip + scene dumps with particle-pool counts
// (engine.particles.aliveCount test hook) to test the spawn-transient
// hypotheses against the portrait 0s veil.
// Usage: node glow-touch-skip.mjs <outDir>
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node glow-touch-skip.mjs <outDir>'); process.exit(1); }
const BASE = 'http://localhost:4173/player.html?test=1&autostart=1&splash=0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shotMetrics(page) {
  const buf = await page.screenshot({ animations: 'disabled', timeout: 300000 });
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  const m = await page.evaluate(async (url) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const W = c.width, H = c.height;
    const d = ctx.getImageData(0, 0, W, H).data;
    const lumaAt = (x, y) => {
      const i = (y * W + x) * 4;
      return (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    };
    let full = 0; const n = W * H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) full += lumaAt(x, y);
    full /= n;
    const x0 = Math.floor(W * 0.25), x1 = Math.ceil(W * 0.75);
    const y0 = Math.floor(H * 0.25), y1 = Math.ceil(H * 0.75);
    let cs = 0, cn = 0, blow = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const l = lumaAt(x, y); cs += l; cn++; if (l > 0.95) blow++;
    }
    const X = window.__XANDRIA__;
    let heroScreen = null;
    try {
      const av = X.engine.portalsPlayerAvatar;
      const p = av.ctrl.position;
      const cam = X.engine.camera;
      cam.updateMatrixWorld();
      const mv = cam.matrixWorldInverse.elements;
      const pr = cam.projectionMatrix.elements;
      const vx = mv[0] * p.x + mv[4] * p.y + mv[8] * p.z + mv[12];
      const vy = mv[1] * p.x + mv[5] * p.y + mv[9] * p.z + mv[13];
      const vz = mv[2] * p.x + mv[6] * p.y + mv[10] * p.z + mv[14];
      const vw = mv[3] * p.x + mv[7] * p.y + mv[11] * p.z + mv[15];
      const cx = pr[0] * vx + pr[4] * vy + pr[8] * vz + pr[12] * vw;
      const cy = pr[1] * vx + pr[5] * vy + pr[9] * vz + pr[13] * vw;
      const cw = pr[3] * vx + pr[7] * vy + pr[11] * vz + pr[15] * vw;
      heroScreen = { x: Math.round((cx / cw * 0.5 + 0.5) * W), y: Math.round((-cy / cw * 0.5 + 0.5) * H) };
    } catch { /* leave null */ }
    let hs = null;
    if (heroScreen) {
      const R = 60;
      let s = 0, k = 0;
      for (let y = Math.max(0, heroScreen.y - R); y < Math.min(H, heroScreen.y + R); y++)
        for (let x = Math.max(0, heroScreen.x - R); x < Math.min(W, heroScreen.x + R); x++) { s += lumaAt(x, y); k++; }
      hs = k ? s / k : null;
    }
    return { fullLuma: +full.toFixed(4), centerLuma: +(cs / cn).toFixed(4),
      centerBlowout: +(blow / cn).toFixed(4), heroScreen, heroBoxLuma: hs === null ? null : +hs.toFixed(4) };
  }, dataUrl);
  const st = await page.evaluate(() => {
    const X = window.__XANDRIA__;
    let particles = null;
    try { particles = { additive: X.engine.particles.aliveCount('additive'), normal: X.engine.particles.aliveCount('normal') }; } catch { /* no hook */ }
    return { state: X.engine.state, frame: X.engine.frame, quality: X.engine.effectiveQuality(), particles,
      tutorialStep: X.engine.tutorial ? X.engine.tutorial.stepId : null };
  });
  return { png: buf, metrics: m, engine: st };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
fs.mkdirSync(OUT, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(BASE, { timeout: 120000 });
await page.waitForFunction(() => !!(window.__XANDRIA__ && window.__XANDRIA__.engine), null, { timeout: 120000 });
await page.waitForFunction(() => window.__XANDRIA__.engine.state === 'playing', null, { timeout: 120000 });
const promptDisplay = await page.evaluate(() => {
  const el = document.getElementById('xandria-rotate-prompt');
  return el ? getComputedStyle(el).display : 'absent';
});
// Genuine CDP touch tap on SKIP TUTORIAL.
const skipBtn = page.getByText('SKIP TUTORIAL');
const box = await skipBtn.boundingBox({ timeout: 30000 });
await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForFunction(() => {
  const X = window.__XANDRIA__;
  return !X.engine.tutorial || X.engine.tutorial.stepId === null;
}, null, { timeout: 30000 }).catch(() => undefined);
const skipped = await page.evaluate(() => {
  const X = window.__XANDRIA__;
  return { tutorialStep: X.engine.tutorial ? X.engine.tutorial.stepId : null };
});
const series = [];
for (const [t, wait] of [['0s-after-skip', 0], ['3s-after-skip', 3000], ['8s-after-skip', 5000]]) {
  if (wait) await sleep(wait);
  const s = await shotMetrics(page);
  fs.writeFileSync(path.join(OUT, `glow-landscape-touch-skip-${t}.png`), s.png);
  series.push({ t, ...s.metrics, state: s.engine.state, frame: s.engine.frame, particles: s.engine.particles, tutorialStep: s.engine.tutorialStep });
  console.log(`glow-landscape-touch-skip-${t}`, JSON.stringify(series[series.length - 1]));
}
const rec = { run: 'landscape-touch-skip', viewport: { width: 844, height: 390 },
  promptDisplay, skipTap: 'touchscreen.tap', skipped, series, errors };
fs.writeFileSync(path.join(OUT, 'glow-landscape-touch-skip-series.json'), JSON.stringify(rec, null, 2));
console.log('skip-run errors=' + errors.length, JSON.stringify(errors));
await ctx.close();
await browser.close();
