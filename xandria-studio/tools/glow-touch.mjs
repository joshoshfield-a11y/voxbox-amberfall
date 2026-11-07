// Phase 4b glow follow-up: touch-mode glow series (landscape 844x390 +
// portrait 390x844 control) with the Phase 4 portrait-series metrics.
// Boots the baked Emberwood spec in test mode (?test=1&autostart=1&splash=0)
// and reaches `playing` directly, then screenshots at 0s/1s/3s/8s after
// playing. Touch modality: browser context hasTouch:true; the rotate
// prompt (portrait only) is dismissed with a genuine CDP touch tap via
// page.touchscreen.tap. In landscape the prompt never shows (its own
// visibility rule: portrait + touch only), so the step records
// display:none and no tap is needed.
// Metrics per shot (same style as evidence/phase4/glow-portrait-series.json):
//   fullLuma, centerLuma (central 50%x50% crop), centerBlowout (fraction of
//   center-crop pixels with Rec.709 luma > 0.95), heroBoxLuma (120x120 box
//   around the projected player screen position), engine frame + state.
// Scene introspection dumps at 0s and 8s list every PointLight, Sprite,
// and near-player emissive mesh so the halo mechanism can be named from
// evidence, not guessed.
// Usage: node glow-touch.mjs <outDir>   (writes both orientations)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node glow-touch.mjs <outDir>'); process.exit(1); }
const BASE = 'http://localhost:4173/player.html?test=1&autostart=1&splash=0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const RUNS = [
  { name: 'landscape-touch', width: 844, height: 390 },
  { name: 'portrait-touch', width: 390, height: 844 },
];

async function shotMetrics(page, label) {
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
    // center crop: central 50% x 50%
    const x0 = Math.floor(W * 0.25), x1 = Math.ceil(W * 0.75);
    const y0 = Math.floor(H * 0.25), y1 = Math.ceil(H * 0.75);
    let cs = 0, cn = 0, blow = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const l = lumaAt(x, y); cs += l; cn++; if (l > 0.95) blow++;
    }
    // hero screen position: project avatar world pos through camera matrices
    const X = window.__XANDRIA__;
    let heroScreen = null;
    try {
      const av = X.engine.portalsPlayerAvatar;
      const p = av.ctrl.position;
      const cam = X.engine.camera;
      cam.updateMatrixWorld();
      const mv = cam.matrixWorldInverse.elements;
      const pr = cam.projectionMatrix.elements;
      // world -> view (column-major multiply)
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
    return {
      fullLuma: +full.toFixed(4),
      centerLuma: +(cs / cn).toFixed(4),
      centerBlowout: +(blow / cn).toFixed(4),
      heroScreen, heroBoxLuma: hs === null ? null : +hs.toFixed(4),
      width: W, height: H,
    };
  }, dataUrl);
  const st = await page.evaluate(() => {
    const X = window.__XANDRIA__;
    return { state: X.engine.state, frame: X.engine.frame, quality: X.engine.effectiveQuality() };
  });
  return { png: buf, metrics: m, engine: st, label };
}

async function sceneDump(page) {
  return page.evaluate(() => {
    const X = window.__XANDRIA__;
    const E = X.engine;
    const av = E.portalsPlayerAvatar;
    const pp = av ? av.ctrl.position : null;
    const lights = [], sprites = [], emissives = [], shafts = [];
    E.scene.traverse((o) => {
      const t = o.type || o.constructor?.name || '?';
      if (t === 'PointLight' || (o.isLight && o.type === 'PointLight')) {
        const wp = o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)());
        lights.push({ color: '#' + o.color.getHexString(), intensity: +o.intensity.toFixed(3),
          distance: o.distance, decay: o.decay, pos: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)],
          distToPlayer: pp ? +Math.hypot(wp.x - pp.x, wp.y - pp.y, wp.z - pp.z).toFixed(2) : null,
          visible: o.visible });
      } else if (o.isSprite) {
        const wp = o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)());
        sprites.push({ scale: [+o.scale.x.toFixed(2), +o.scale.y.toFixed(2)],
          color: o.material?.color ? '#' + o.material.color.getHexString() : null,
          opacity: o.material ? +o.material.opacity.toFixed(3) : null,
          blending: o.material?.blending,
          pos: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)],
          distToPlayer: pp ? +Math.hypot(wp.x - pp.x, wp.y - pp.y, wp.z - pp.z).toFixed(2) : null });
      } else if (o.isMesh && o.material && o.material.emissive && o.material.emissiveIntensity >= 1.15) {
        const wp = o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)());
        const d = pp ? Math.hypot(wp.x - pp.x, wp.y - pp.y, wp.z - pp.z) : 999;
        if (d <= 40) emissives.push({ geo: o.geometry?.type ?? '?',
          emissive: '#' + o.material.emissive.getHexString(),
          emissiveIntensity: +o.material.emissiveIntensity.toFixed(2),
          pos: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)], distToPlayer: +d.toFixed(2) });
      } else if (o.isMesh && o.material && o.material.isShaderMaterial && o.material.blending === 2) {
        const wp = o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)());
        shafts.push({ pos: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)],
          distToPlayer: pp ? +Math.hypot(wp.x - pp.x, wp.y - pp.y, wp.z - pp.z).toFixed(2) : null });
      }
    });
    const camP = E.camera.getWorldPosition(new (Object.getPrototypeOf(E.camera.position).constructor)());
    return {
      playerPos: pp ? [+pp.x.toFixed(2), +pp.y.toFixed(2), +pp.z.toFixed(2)] : null,
      cameraPos: [+camP.x.toFixed(2), +camP.y.toFixed(2), +camP.z.toFixed(2)],
      sunPos: E.sky?.sun ? (() => { const sp = E.sky.sun.position; return [+sp.x.toFixed(1), +sp.y.toFixed(1), +sp.z.toFixed(1)]; })() : null,
      specBloom: X.spec.theme.bloom, specEnv: X.spec.theme.environment, specTod: X.spec.theme.timeOfDay,
      quality: E.effectiveQuality(), gradeActive: E.postfx.gradeActive,
      pointLights: lights, sprites, nearEmissives: emissives.slice(0, 60),
      nearEmissiveCount: emissives.length, additiveShaderMeshes: shafts,
    };
  });
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
fs.mkdirSync(OUT, { recursive: true });
for (const run of RUNS) {
  const ctx = await browser.newContext({ viewport: { width: run.width, height: run.height }, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(BASE, { timeout: 120000 });
  await page.waitForFunction(() => !!(window.__XANDRIA__ && window.__XANDRIA__.engine), null, { timeout: 120000 });
  await page.waitForFunction(() => window.__XANDRIA__.engine.state === 'playing', null, { timeout: 120000 });
  const touchCaps = await page.evaluate(() => ({
    ontouchstart: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
  }));
  const promptBefore = await page.evaluate(() => {
    const el = document.getElementById('xandria-rotate-prompt');
    return el ? getComputedStyle(el).display : 'absent';
  });
  let dismissMethod = 'none-required';
  if (promptBefore === 'flex') {
    // Genuine CDP touch tap on the dismiss button (Playwright touchscreen
    // sends Input.dispatchTouchEvent, not a synthetic mouse click).
    const btn = page.getByText('PLAY IN PORTRAIT ANYWAY');
    const box = await btn.boundingBox({ timeout: 10000 });
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    dismissMethod = 'touchscreen.tap-dismiss';
    await page.waitForFunction(() => {
      const el = document.getElementById('xandria-rotate-prompt');
      return !el || getComputedStyle(el).display === 'none';
    }, null, { timeout: 10000 });
  }
  const promptAfter = await page.evaluate(() => {
    const el = document.getElementById('xandria-rotate-prompt');
    return el ? getComputedStyle(el).display : 'absent';
  });
  const series = [];
  const delays = [['0s', 0], ['1s', 1000], ['3s', 2000], ['8s', 5000]];
  for (const [t, wait] of delays) {
    if (wait) await sleep(wait);
    const s = await shotMetrics(page, t);
    fs.writeFileSync(path.join(OUT, `glow-${run.name}-${t}.png`), s.png);
    series.push({ t, ...s.metrics, state: s.engine.state, frame: s.engine.frame, quality: s.engine.quality });
    console.log(`glow-${run.name}-${t}`, JSON.stringify(series[series.length - 1]));
    if (t === '0s' || t === '8s') {
      const dump = await sceneDump(page);
      fs.writeFileSync(path.join(OUT, `glow-${run.name}-scene-${t}.json`), JSON.stringify(dump, null, 2));
      console.log(`scene-${run.name}-${t}: lights=${dump.pointLights.length} sprites=${dump.sprites.length} nearEmissives=${dump.nearEmissiveCount} shafts=${dump.additiveShaderMeshes.length} player=${JSON.stringify(dump.playerPos)}`);
    }
  }
  const rec = { run: run.name, viewport: { width: run.width, height: run.height },
    touchCaps, promptBefore, promptAfter, dismissMethod, series, errors };
  fs.writeFileSync(path.join(OUT, `glow-${run.name}-series.json`), JSON.stringify(rec, null, 2));
  console.log(run.name, 'errors=' + errors.length, JSON.stringify(errors));
  await ctx.close();
}
await browser.close();
