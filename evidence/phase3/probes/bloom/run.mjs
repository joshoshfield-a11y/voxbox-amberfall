// One-off Phase 3 bloom-isolation probe driver (NOT committed tooling).
// Serves the repo root on :8901, loads probes/bloom/index.html in
// Playwright/SwiftShader, dumps window.__BLOOM_RESULTS__ to JSON.
import { chromium } from '/home/hatch/workspace/voxbox-amberfall/xandria-studio/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = '/home/hatch/workspace/voxbox-amberfall';
const OUT = process.argv[2] || '/home/hatch/workspace/voxbox-amberfall/evidence/phase3/probes/bloom/results.json';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(p, (e, data) => {
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise((r) => server.listen(8901, r));
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8901/evidence/phase3/probes/bloom/index.html', { timeout: 120000 });
  await page.waitForFunction(() => document.title === 'bloom-done', null, { timeout: 120000 });
  const results = await page.evaluate(() => window.__BLOOM_RESULTS__);
  fs.writeFileSync(OUT, JSON.stringify({ errors, results }, null, 2));
  console.log('cases:', results.length, 'errors:', errors);
  for (const r of results) {
    console.log(`${r.blooms115 ? 'BLOOM' : '  -  '} @1.15 | ${r.blooms125 ? 'BLOOM' : '  -  '} @1.25 | ${r.name} | haloDelta 1.15=${r.t115.haloDelta} 1.25=${r.t125.haloDelta} | centerDelta 1.15=${r.t115.centerDelta} 1.25=${r.t125.centerDelta}`);
  }
} finally {
  await browser.close();
  server.close();
}
