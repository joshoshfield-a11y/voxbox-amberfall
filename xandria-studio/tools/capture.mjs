// Visual-breakout capture harness (scratch, not part of the repo).
// Boots the baked Emberwood spec in test mode via vite preview + Playwright/SwiftShader.
// Views: spawn (baked spec) and forest (same spec, theme.environment='forest' via ?spec=).
// For each view/config: 8s settle, screenshot, 8 samples at 2s intervals, medians.
// Usage: node capture.mjs <outDir> <tag> [spawn|forest|both]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2], TAG = process.argv[3], WHICH = process.argv[4] || 'both';
const BASE = 'http://localhost:4173/player.html';
const CONFIGS = [
  { name: '844x390', width: 844, height: 390 },
  { name: '915x412', width: 915, height: 412 },
  { name: 'desktop', width: 1280, height: 720 },
];

function b64url(s) { return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
const baked = JSON.parse(fs.readFileSync('/home/hatch/workspace/voxbox-amberfall/xandria-studio/src/spec/emberwood.spec.json', 'utf8'));
const forestSpec = JSON.parse(JSON.stringify(baked)); forestSpec.theme.environment = 'forest';
const VIEWS = [];
if (WHICH === 'both' || WHICH === 'spawn') VIEWS.push({ name: 'spawn', url: `${BASE}?test=1&autostart=1&splash=0` });
if (WHICH === 'both' || WHICH === 'forest') VIEWS.push({ name: 'forest', url: `${BASE}?test=1&autostart=1&splash=0&spec=${b64url(JSON.stringify(forestSpec))}` });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

async function readStats(page) {
  return page.evaluate(() => {
    const X = window.__XANDRIA__;
    const r = X.engine.renderer;
    const info = r.info.render, mem = r.info.memory, progs = r.info.programs ? r.info.programs.length : null;
    let instanced = 0, instances = 0, populated = 0, visible = 0;
    X.engine.scene.traverse((o) => {
      if (o.isInstancedMesh) {
        instanced++;
        instances += o.count;
        if (o.count > 0) populated++;
        if (o.visible) visible++;
      }
    });
    // NpcInstancer buckets: walk the blueprint graph for an object with stats()+bucketCount.
    let buckets = null;
    try {
      const seen = new Set(); const stack = [X.blueprint];
      while (stack.length) {
        const o = stack.pop();
        if (!o || typeof o !== 'object' || seen.has(o)) continue;
        seen.add(o);
        const p = Object.getPrototypeOf(o);
        if (p && typeof p.stats === 'function' && 'bucketCount' in o) { buckets = o.bucketCount; break; }
        if (seen.size > 5000) break;
        for (const v of Object.values(o)) if (v && typeof v === 'object') stack.push(v);
      }
    } catch { /* leave null */ }
    const spec = X.spec;
    return {
      calls: info.calls, triangles: info.triangles, geometries: mem.geometries,
      textures: mem.textures, programs: progs,
      instancedMeshes: instanced, instances, populatedMeshes: populated,
      visibleInstancedMeshes: visible, buckets,
      specEnv: spec.theme.environment, specTod: spec.theme.timeOfDay,
      specSeed: spec.meta.seed, specGenre: spec.meta.genre,
    };
  });
}

async function meanLuma(page) {
  // Mean Rec.709 luminance of the current canvas frame via a screenshot data URL.
  const buf = await page.screenshot({ animations: 'disabled', timeout: 300000 });
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64');
  const luma = await page.evaluate(async (url) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let sum = 0; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) sum += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    return sum / n;
  }, dataUrl);
  return { png: buf, luma };
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
fs.mkdirSync(OUT, { recursive: true });
for (const view of VIEWS) {
  for (const cfg of CONFIGS) {
    const ctx = await browser.newContext({ viewport: { width: cfg.width, height: cfg.height } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(view.url, { timeout: 120000 });
    await page.waitForFunction(() => !!(window.__XANDRIA__ && window.__XANDRIA__.engine), null, { timeout: 120000 });
    await sleep(8000);
    const { png, luma } = await meanLuma(page);
    const samples = [];
    for (let i = 0; i < 8; i++) { samples.push(await readStats(page)); await sleep(2000); }
    const med = {};
    for (const k of Object.keys(samples[0])) {
      if (typeof samples[0][k] === 'number') med[k] = median(samples.map((s) => s[k]));
      else med[k] = samples[0][k];
    }
    const stem = `${TAG}-${view.name}-${cfg.name}`;
    fs.writeFileSync(path.join(OUT, stem + '.png'), png);
    const rec = { view: view.name, config: cfg.name, tag: TAG, samples: 8, medians: med,
      sampleRanges: Object.fromEntries(Object.keys(samples[0]).filter((k) => typeof samples[0][k] === 'number')
        .map((k) => [k, [Math.min(...samples.map((s) => s[k])), Math.max(...samples.map((s) => s[k]))]])),
      meanLuma: +luma.toFixed(4), consoleErrors: errors };
    fs.writeFileSync(path.join(OUT, stem + '.json'), JSON.stringify(rec, null, 2));
    console.log(stem, 'calls=' + med.calls, 'tris=' + med.triangles, 'geoms=' + med.geometries,
      'tex=' + med.textures, 'progs=' + med.programs, 'inst=' + med.instancedMeshes,
      'buckets=' + med.buckets, 'luma=' + rec.meanLuma, 'errs=' + errors.length);
    await ctx.close();
  }
}
await browser.close();
