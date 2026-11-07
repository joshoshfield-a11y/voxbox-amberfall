// Phase 0 live-boot audit probe for VoxBox: Amberfall.
// Boots the baked spec in test mode, reports HUD + world state, screenshots.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const OUT = '/home/hatch/workspace/voxbox-amberfall/evidence/phase0-audit';
fs.mkdirSync(OUT, { recursive: true });
let chromePath;
try {
  chromePath = execSync('ls -d $HOME/.cache/ms-playwright/chromium-*/chrome-linux/chrome 2>/dev/null | sort -V | tail -1', { encoding: 'utf8' }).trim() || undefined;
} catch { chromePath = undefined; }
console.log('chrome:', chromePath);

const browser = await chromium.launch({
  executablePath: chromePath,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});

async function probe(viewport, tag) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:4173/player.html?test=1&autostart=1&splash=0', { timeout: 120000 });
  await page.waitForFunction(() => !!(window.__XANDRIA__ && window.__XANDRIA__.engine), null, { timeout: 120000 });
  await page.waitForFunction(() => window.__XANDRIA__.engine.state === 'playing', null, { timeout: 60000 }).catch(() => 'not-playing');
  await new Promise((r) => setTimeout(r, 3000));
  const snap = await page.evaluate(() => {
    const X = window.__XANDRIA__;
    const b = X.blueprint ?? {};
    const eng = X.engine;
    const keys = Object.keys(b);
    const countOf = (v) => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : null);
    const enemies = b.enemies?.enemies ?? [];
    const pickups = b.pickups?.list ?? [];
    const byKind = {};
    for (const p of pickups) byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    const hudText = (document.querySelector('.xhud')?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 1200);
    const buttons = [...document.querySelectorAll('.xhud button')].map((el) => el.textContent).slice(0, 40);
    const overlays = [...document.querySelectorAll('.xhud .overlay, .xhud .panel, .xhud .modal')].map((el) => el.className).slice(0, 20);
    // Hunt for managers by key name across blueprint (one level + nested 'manager' keys).
    const found = {};
    for (const k of keys) {
      const v = b[k];
      if (v && typeof v === 'object') {
        if (Array.isArray(v.list)) found[k + '.list'] = v.list.length;
        if (Array.isArray(v.quests)) found[k + '.quests'] = v.quests.length;
        if (typeof v.count === 'number') found[k + '.count'] = v.count;
      }
    }
    const player = eng.player ?? eng.avatar ?? null;
    const pos = player?.position ?? player?.group?.position ?? null;
    return {
      state: eng.state,
      specName: X.spec?.meta?.name, specEnv: X.spec?.theme?.environment, specTod: X.spec?.theme?.timeOfDay,
      objective: X.spec?.objective,
      blueprintKeys: keys,
      found, enemiesTotal: enemies.length, enemiesAlive: enemies.filter((e) => e.alive !== false).length,
      pickupsTotal: pickups.length, pickupsByKind: byKind,
      playerPos: pos ? { x: +pos.x.toFixed(1), y: +pos.y.toFixed(1), z: +pos.z.toFixed(1) } : null,
      calls: eng.renderer?.info?.render?.calls ?? null, triangles: eng.renderer?.info?.render?.triangles ?? null,
      hudText, buttons, overlays,
      titleText: document.title,
    };
  });
  await page.screenshot({ path: path.join(OUT, `probe-${tag}.png`), animations: 'disabled', timeout: 300000 });
  fs.writeFileSync(path.join(OUT, `probe-${tag}.json`), JSON.stringify({ tag, viewport, errors, snap }, null, 2));
  console.log('=== ' + tag + ' ===');
  console.log(JSON.stringify(snap, null, 2));
  console.log('errors:', errors);
  await ctx.close();
}

await probe({ width: 1280, height: 720 }, 'desktop');
await probe({ width: 844, height: 390 }, 'phone-landscape');
await browser.close();
