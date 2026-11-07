// One-off debug: where is the render avatar after a long teleport?
import { chromium } from '/home/hatch/workspace/voxbox-amberfall/xandria-studio/node_modules/playwright-core/index.mjs';

const CHROME = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
await page.goto('http://localhost:4173/player.html?test=1&autostart=1&splash=0', { timeout: 120000 });
await page.waitForFunction(() => !!(window.__XANDRIA__ && window.__XANDRIA__.engine), null, { timeout: 120000 });
await page.waitForFunction(() => window.__XANDRIA__.engine.state === 'playing', null, { timeout: 60000 }).catch(() => 'not-playing');
await new Promise((r) => setTimeout(r, 8000));
const out = await page.evaluate(() => {
  const X = window.__XANDRIA__;
  const eng = X.engine;
  const bp = X.blueprint?.avatar?.ctrl ?? null;
  const pa = eng.playerAvatar ?? eng.portalsPlayerAvatar ?? null;
  const res = {
    bpCtrl: bp ? { x: bp.position.x, y: bp.position.y, z: bp.position.z } : null,
    paCtrl: pa?.ctrl ? { x: pa.ctrl.position.x, y: pa.ctrl.position.y, z: pa.ctrl.position.z } : null,
    sameCtrl: bp === pa?.ctrl,
    rigGroup: null,
    rigVisible: null,
  };
  try {
    const g = pa?.ctrl?.rig?.group;
    if (g) {
      const e = g.matrixWorld.elements;
      res.rigGroup = { x: e[12], y: e[13], z: e[14] };
      res.rigVisible = g.visible;
    }
  } catch (e) { res.rigGroup = 'err ' + e.message; }
  return res;
});
console.log('BEFORE teleport:', JSON.stringify(out, null, 1));
await page.evaluate(() => {
  const X = window.__XANDRIA__;
  const eng = X.engine;
  const lm = eng.portalEntities.systems.find((s) => s.id === 'landmarks');
  const best = lm.placed[0];
  const spawn = eng.terrain.spawnXZ;
  const dx = best.pos.x - spawn.x, dz = best.pos.z - spawn.z;
  const d = Math.hypot(dx, dz) || 1;
  const hx = best.pos.x - (dx / d) * (best.radius * 1.8 + 5) * 0.8;
  const hz = best.pos.z - (dz / d) * (best.radius * 1.8 + 5) * 0.8;
  X.blueprint.avatar.ctrl.teleport({ x: hx, y: eng.terrain.heightAt(hx, hz) + 2, z: hz });
  return { target: { hx, hz }, kind: best.kind };
});
await new Promise((r) => setTimeout(r, 20000));
const out2 = await page.evaluate(() => {
  const X = window.__XANDRIA__;
  const eng = X.engine;
  const bp = X.blueprint?.avatar?.ctrl ?? null;
  const pa = eng.playerAvatar ?? eng.portalsPlayerAvatar ?? null;
  const res = {
    bpCtrl: bp ? { x: +bp.position.x.toFixed(1), y: +bp.position.y.toFixed(1), z: +bp.position.z.toFixed(1) } : null,
    paCtrl: pa?.ctrl ? { x: +pa.ctrl.position.x.toFixed(1), y: +pa.ctrl.position.y.toFixed(1), z: +pa.ctrl.position.z.toFixed(1) } : null,
    sameCtrl: bp === pa?.ctrl,
    rigGroup: null, rigVisible: null, cam: null,
  };
  try {
    const g = pa?.ctrl?.rig?.group;
    if (g) {
      const e = g.matrixWorld.elements;
      res.rigGroup = { x: +e[12].toFixed(1), y: +e[13].toFixed(1), z: +e[14].toFixed(1) };
      res.rigVisible = g.visible;
    }
  } catch (e) { res.rigGroup = 'err ' + e.message; }
  const c = eng.camera?.position;
  if (c) res.cam = { x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(1) };
  return res;
});
console.log('AFTER teleport+20s:', JSON.stringify(out2, null, 1));
await browser.close();
