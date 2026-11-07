// One-off debug: map window.__XANDRIA__ to find where landmarks live.
import { chromium } from '/home/hatch/workspace/voxbox-amberfall/xandria-studio/node_modules/playwright-core/index.mjs';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[page-error]', m.text()); });
await page.goto('http://localhost:4173/player.html?test=1&autostart=1&splash=0', { timeout: 120000 });
await page.waitForFunction(() => !!window.__XANDRIA__?.engine, null, { timeout: 120000 });
await new Promise((r) => setTimeout(r, 8000));
const out = await page.evaluate(() => {
  const X = window.__XANDRIA__;
  const top = Object.keys(X);
  const eng = X.engine || {};
  const engKeys = Object.keys(eng);
  // Search a bounded breadth-first walk for keys containing 'landmark'
  const hits = [];
  const seen = new Set();
  const queue = [[X, 'X']];
  let n = 0;
  while (queue.length && n < 60000 && hits.length < 40) {
    const [obj, path] = queue.shift();
    if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) continue;
    if (seen.has(obj)) continue;
    seen.add(obj); n++;
    for (const k of Object.keys(obj)) {
      if (/landmark/i.test(k)) {
        let v = obj[k];
        let desc = typeof v;
        if (Array.isArray(v)) desc = `array[${v.length}]` + (v.length ? ` firstKeys=${Object.keys(v[0] || {}).join(',')}` : '');
        else if (v && typeof v === 'object') desc = `object keys=${Object.keys(v).slice(0, 12).join(',')}`;
        hits.push(`${path}.${k} = ${desc}`);
      }
      const v = obj[k];
      if ((v && typeof v === 'object') || typeof v === 'function') {
        if (path.split('.').length < 6) queue.push([v, `${path}.${k}`]);
      }
    }
  }
  return { top, engKeys, walked: n, hits };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
