// One-off Phase 3 apron-readability probe, attempt 3 (NOT committed tooling).
// Boots the baked game, picks the beam-tower landmark (tall, most readable;
// all four landmarks sit at -z, so none aligns with the default +z yaw),
// teleports the hero to the spawn-side apron edge, waits for live-sim rig
// sync + chunk streaming, verifies the rig group position in-session, then
// uses shipped photo mode (orbit test seam) with the camera on the spawn
// side looking along the path line past the hero toward the landmark.
// That is a genuinely path-aligned apron shot, not a wide shot.
// History: attempt 1 (gameplay rig) failed — the rig does not follow a
// multi-km teleport (camera stayed 190–1040 m away, ground-fill shot).
// Attempt 2 (photo, ~0 frames post-teleport) framed the landmark but the
// hero was absent — the rig had not synced before the sim froze.
import { chromium } from '/home/hatch/workspace/voxbox-amberfall/xandria-studio/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/home/hatch/workspace/voxbox-amberfall/evidence/phase3/probes/apron';
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
  const info = await page.evaluate(() => {
    const X = window.__XANDRIA__;
    const eng = X.engine;
    const systems = eng.portalEntities?.systems ?? [];
    const lm = systems.find((s) => s && s.id === 'landmarks');
    const placed = (lm && Array.isArray(lm.placed)) ? lm.placed : [];
    const spawn = eng.terrain ? eng.terrain.spawnXZ : { x: 0, z: 0 };
    const list = placed.map((p) => {
      const dx = p.pos.x - spawn.x, dz = p.pos.z - spawn.z;
      const d = Math.hypot(dx, dz);
      const discR = p.radius * 1.8 + 5;
      return { kind: p.kind, x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), radius: p.radius, discR: +discR.toFixed(1), dist: +d.toFixed(1), align: d > 0 ? +(dz / d).toFixed(3) : -1 };
    });
    const subject = list.find((l) => l.kind === 'beam-tower') ?? list[0] ?? null;
    const avatar = (X.blueprint ?? {}).avatar ?? null;
    return { spawn, list, subject, hasAvatar: !!avatar, avatarCtrl: !!(avatar && avatar.ctrl && avatar.ctrl.teleport) };
  });
  fs.writeFileSync(path.join(OUT, `apron-${tag}.json`), JSON.stringify({ tag, viewport, errors, info }, null, 2));
  console.log(tag, JSON.stringify(info, null, 2));
  if (!info.subject || !info.avatarCtrl) { console.log(tag, 'SKIP'); await ctx.close(); return; }
  // Teleport to the subject's spawn-side apron edge.
  const shot = await page.evaluate((subject) => {
    const X = window.__XANDRIA__;
    const eng = X.engine;
    const spawn = eng.terrain.spawnXZ;
    const dx = subject.x - spawn.x, dz = subject.z - spawn.z;
    const d = Math.hypot(dx, dz) || 1;
    const hx = subject.x - (dx / d) * subject.discR * 0.8;
    const hz = subject.z - (dz / d) * subject.discR * 0.8;
    const hy = eng.terrain.heightAt(hx, hz) + 2;
    X.blueprint.avatar.ctrl.teleport({ x: hx, y: hy, z: hz });
    return { hx: +hx.toFixed(1), hz: +hz.toFixed(1), hy: +hy.toFixed(1) };
  }, info.subject);
  // Poll (up to 60 s) until the rig GROUP POSITION tracks the body: the
  // desktop run showed a fixed 10 s wait is not enough under SwiftShader
  // (body still at teleport height, rig matrixWorld stale at origin), so
  // the photo shot froze before the hero arrived. Compare group.position
  // directly (ctrl.update sets it; matrixWorld staleness misled attempt 3).
  // rig.position.y = body.y - 0.85 by construction.
  const syncCheck = await page.evaluate(async () => {
    const X = window.__XANDRIA__;
    const eng = X.engine;
    const pa = eng.playerAvatar ?? eng.portalsPlayerAvatar ?? null;
    const bp = X.blueprint?.avatar?.ctrl ?? null;
    const g = pa?.ctrl?.rig?.group;
    for (let i = 0; i < 30; i++) {
      if (bp && g) {
        const dx = g.position.x - bp.position.x, dz = g.position.z - bp.position.z;
        const dy = (g.position.y + 0.85) - bp.position.y;
        if (Math.hypot(dx, dz) < 0.5 && Math.abs(dy) < 0.5) {
          return { synced: true, polls: i + 1,
            body: { x: +bp.position.x.toFixed(1), y: +bp.position.y.toFixed(1), z: +bp.position.z.toFixed(1) },
            rig: { x: +g.position.x.toFixed(1), y: +g.position.y.toFixed(1), z: +g.position.z.toFixed(1) },
            rigVisible: g.visible };
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return { synced: false, polls: 30,
      body: bp ? { x: +bp.position.x.toFixed(1), y: +bp.position.y.toFixed(1), z: +bp.position.z.toFixed(1) } : null,
      rig: g ? { x: +g.position.x.toFixed(1), y: +g.position.y.toFixed(1), z: +g.position.z.toFixed(1) } : null,
      rigVisible: g ? g.visible : null };
  });
  // Poll for landmark-area meshes (chunk streaming) up to 90 s.
  const streamed = await page.evaluate(async (subject) => {
    const eng = window.__XANDRIA__.engine;
    const scene = eng.scene;
    for (let i = 0; i < 18; i++) {
      let found = 0;
      scene.traverse((o) => {
        if (found > 0 || !o.isMesh || !o.matrixWorld) return;
        const e = o.matrixWorld.elements;
        if (Math.hypot(e[12] - subject.x, e[14] - subject.z) < 40) found++;
      });
      if (found > 0) return { streamed: true, polls: i + 1, builtMeshes: eng.terrain?.builtMeshCount ?? null };
      await new Promise((r) => setTimeout(r, 5000));
    }
    return { streamed: false, polls: 18, builtMeshes: eng.terrain?.builtMeshCount ?? null };
  }, info.subject);
  const photo = await page.evaluate((subject) => {
    const X = window.__XANDRIA__;
    const eng = X.engine;
    const spawn = eng.terrain.spawnXZ;
    const dx = subject.x - spawn.x, dz = subject.z - spawn.z;
    const d = Math.hypot(dx, dz) || 1;
    const ux = dx / d, uz = dz / d;
    const yaw = Math.atan2(-ux, -uz);
    const entered = eng.photoMode.enter();
    if (entered) eng.photoMode.setOrbit({ yaw, pitch: 0.2, distance: 10 });
    return { entered, yaw: +yaw.toFixed(3), orbit: eng.photoMode.orbit, state: eng.state, subject };
  }, info.subject);
  await sleep(3000);
  console.log(tag, 'shot:', JSON.stringify(shot), 'sync:', JSON.stringify(syncCheck), 'streamed:', JSON.stringify(streamed), 'photo:', JSON.stringify(photo));
  await page.screenshot({ path: path.join(OUT, `apron-${tag}.png`), animations: 'disabled', timeout: 300000 });
  fs.writeFileSync(path.join(OUT, `apron-${tag}-shot.json`), JSON.stringify({ tag, shot, syncCheck, streamed, photo, errors }, null, 2));
  await ctx.close();
}
const only = process.argv[2] ?? 'both';
if (only === 'both' || only === '844x390') await run({ width: 844, height: 390 }, '844x390');
if (only === 'both' || only === 'desktop') await run({ width: 1280, height: 720 }, 'desktop');
await browser.close();
console.log('errors:', errors);
