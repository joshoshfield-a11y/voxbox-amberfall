// FIX1/FIX2 HUD overlap probe (committed tool; header comment corrected:
// it IS part of the repo). Boots the baked Emberwood spec via vite
// preview + Playwright/SwiftShader, settles 8s, then reports pairwise
// rect overlaps among visible, positioned HUD-ish elements (ancestor /
// descendant containment pairs excluded — those are layout, not
// overlaps). Usage: node probe-hud-overlaps.mjs <outJson>
// Expects vite preview on http://localhost:4173/player.html.
//
// FIX1 extension: the old KEYS filter missed the blueprint chips/panels
// entirely (ids end in -chip/-panel, no matching class), so a "0
// overlaps" run never actually covered them. KEYS now includes chip,
// panel, and the toggle ids, and the viewport-sized .xhud root itself
// is excluded (it would false-positive against every container-level
// chip, which is not its descendant).
// FIX2 extension: new configs — 1600x720 touch landscape (the moto g
// play report geometry, real touch context), the title screen at the
// same geometry (gate assertion: zero in-game chips/panels visible,
// title overlay + slot rows visible), and 390x844 portrait touch
// (regression recording).
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = process.argv[2];
const BASE = 'http://localhost:4173/player.html';
const CONFIGS = [
  { name: '844x390', width: 844, height: 390, touch: false, url: `${BASE}?test=1&autostart=1&splash=0` },
  { name: 'desktop', width: 1280, height: 720, touch: false, url: `${BASE}?test=1&autostart=1&splash=0` },
  { name: '1600x720-touch', width: 1600, height: 720, touch: true, url: `${BASE}?test=1&autostart=1&splash=0` },
  { name: '1600x720-title', width: 1600, height: 720, touch: true, url: `${BASE}?splash=0`, title: true },
  { name: 'portrait-touch', width: 390, height: 844, touch: true, url: `${BASE}?test=1&autostart=1&splash=0` },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
const results = [];
for (const cfg of CONFIGS) {
  const ctx = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    ...(cfg.touch ? { hasTouch: true } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(cfg.url, { timeout: 120000 });
  if (cfg.title) {
    await page.waitForSelector('.overlay.title-screen', { timeout: 120000 });
  } else {
    await page.waitForFunction(() => !!(window.__XANDRIA__ && window.__XANDRIA__.engine), null, { timeout: 120000 });
  }
  await sleep(8000);
  const report = await page.evaluate(() => {
    const KEYS = ['hud', 'quest', 'health', 'bar', 'button', 'stick', 'banner', 'toast', 'dialog', 'menu', 'tracker', 'compass', 'minimap', 'joystick', 'prompt', 'objective', 'shard', 'lives',
      'chip', 'panel', 'xmap', 'xphoto', 'xmenu', 'xfactions', 'tbtn', 'pausebtn', 'xabilities', 'sneakchip', 'bars', 'score', 'boss', 'ability', 'hint', 'tutcard', 'standings', 'mchip', 'mbox'];
    const els = [...document.querySelectorAll('body *')].filter((el) => {
      // the viewport-sized .xhud root is a container, not chrome: it
      // would overlap every container-level chip (not its descendant)
      if (el.className === 'xhud') return false;
      const s = (el.id + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();
      if (!KEYS.some((k) => s.includes(k))) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const rects = els.map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), id: el.id || null, cls: (typeof el.className === 'string' ? el.className : '').slice(0, 80), x: r.x, y: r.y, w: r.width, h: r.height, el };
    });
    const contains = (a, b) => a.x <= b.x + 0.5 && a.y <= b.y + 0.5 && a.x + a.w >= b.x + b.w - 0.5 && a.y + a.h >= b.y + b.h - 0.5;
    const overlaps = [];
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (contains(a, b) || contains(b, a)) continue;
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) overlaps.push({ a: `${a.tag}#${a.id || ''}.${a.cls}`, b: `${b.tag}#${b.id || ''}.${b.cls}`, area: Math.round(ox * oy) });
    }
    // FIX1 title-gate assertion: no in-game chip/panel may be visible
    // while the title screen is up; the title overlay itself (and its
    // save-slot rows) must be visible.
    let titleGate = null;
    if (document.querySelector('.overlay.title-screen')) {
      const vis = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
      };
      const chipsVisible = [...document.querySelectorAll('[id$="-chip"], [id$="-panel"], #xandria-standings-panel, #xandria-quest-tracker, #xandria-minimap, #xandria-compass, #xandria-ability-bar, #xandria-interact-prompt, #xandria-boss-bar')]
        .filter((el) => {
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        })
        .map((el) => el.id);
      const slotRows = document.querySelectorAll('.xandria-save-slot, .slots .slot-row, .slots > div').length;
      titleGate = {
        titleVisible: vis('.overlay.title-screen'),
        titleModeClass: document.getElementById('app')?.classList.contains('x-title-mode') ?? false,
        chipsVisible,
        slotRowCount: slotRows,
      };
    }
    return { elements: rects.map(({ el, ...r }) => r), overlaps, titleGate };
  });
  results.push({ config: cfg.name, elements: report.elements.length, overlaps: report.overlaps, titleGate: report.titleGate, consoleErrors: errors });
  console.log(cfg.name, 'hud elements:', report.elements.length, 'overlaps:', report.overlaps.length, 'errs:', errors.length, report.titleGate ? `titleGate: title=${report.titleGate.titleVisible} class=${report.titleGate.titleModeClass} chipsVisible=${JSON.stringify(report.titleGate.chipsVisible)} slotRows=${report.titleGate.slotRowCount}` : '');
  for (const o of report.overlaps) console.log('  OVERLAP', o.a, '<->', o.b, o.area);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log('wrote', OUT);
