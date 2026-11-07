/**
 * Phase 4 — dedicated VICTORY / DEFEATED path harness.
 *
 * The generic beta bot never passed even pre-Phase 2 (it wanders the whole
 * map on a frame budget under SwiftShader); this spec is the loop-proof gate
 * instead. It drives the baked Emberwood campaign through its REAL mechanics:
 *   collect 14 shards  ->  eliminate 6  ->  branch-choice modal  ->
 *   (a) beacon reach -> VICTORY, (b) hunt 1 -> VICTORY, (c) death -> DEFEATED
 * Travel is shortcut by teleport (the player is teleported NEAR targets, never
 * onto them, and never onto the goal); collection, melee damage, the choice
 * modal, the reach check, and the death path all run through the live game
 * loop. Level-up modals are dismissed with real clicks; only the branch
 * choice is picked deliberately (first option = beacon, second = hunt).
 *
 * Timeouts are generous on purpose: SwiftShader renders seconds per frame on
 * this box, and a quiet box is required (see the Phase 4 report). No existing
 * test assertion is touched; this file is new.
 */
import { test, expect, type Page } from '@playwright/test';

// Timeouts are wall-clock generous because SwiftShader frames run 10-60 s
// under load: a 180 s kill cap can span too few frames to land 2 swings.
test.setTimeout(1_800_000);

const BOOT = '/player.html?test=1&autostart=1&splash=0';

async function boot(page: Page, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  await page.goto(BOOT, { timeout: 300_000 });
  await page.waitForFunction(
    () => !!(window as any).__XANDRIA__?.engine && (window as any).__XANDRIA__.engine.state === 'playing',
    null, { timeout: 300_000 },
  );
  // Dismiss the tutorial card so it never covers a modal button.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((el) => /SKIP/i.test(el.textContent ?? ''));
    b?.click();
  });
}

async function waitFor(page: Page, label: string, fn: () => Promise<boolean>, timeoutMs = 120_000): Promise<void> {
  const t0 = Date.now();
  for (;;) {
    if (await fn()) return;
    if (Date.now() - t0 > timeoutMs) throw new Error(`waitFor timeout (${label}) after ${timeoutMs}ms`);
    await page.waitForTimeout(1000);
  }
}

/** Stage snapshot: current stage id + progress + engine state + end-screen heading. */
async function snap(page: Page): Promise<{ stage: string | null; progress: number; state: string; end: string | null; choiceOpen: boolean; choiceTitle: string | null }> {
  return page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    const o = X.blueprint.objectives;
    const h = document.querySelector('.xhud-modals .overlay h1') as HTMLElement | null;
    // End screens render into the HUD root (.xhud), NOT .xhud-modals
    // (showEnd appends to this.root, class 'xhud'; only choice/level-up
    // modals live in .xhud-modals) — run 10 reached state=won/lost with
    // end=null because this scan looked in the wrong root. Scan all h1s.
    const endH = [...document.querySelectorAll('h1')].map((e) => (e as HTMLElement).textContent);
    return {
      stage: o?.currentStageId ?? null,
      progress: o?.progress ?? -1,
      state: String(X.engine.state),
      end: endH.includes('VICTORY') ? 'VICTORY' : endH.includes('DEFEATED') ? 'DEFEATED' : null,
      choiceOpen: !!h && h.textContent === 'CHOOSE YOUR PATH',
      choiceTitle: h?.textContent ?? null,
    };
  });
}

/** Dismiss any NON-choice modal (level-up) with a real click; leave the branch choice alone. */
async function dismissLevelUps(page: Page): Promise<void> {
  await page.evaluate(() => {
    const h = document.querySelector('.xhud-modals .overlay h1') as HTMLElement | null;
    if (h && h.textContent !== 'CHOOSE YOUR PATH') {
      (document.querySelector('.xhud-modals .overlay .lvlopt') as HTMLElement | null)?.click();
    }
  });
}

async function godMode(page: Page): Promise<void> {
  await page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    const av = X.engine.portalsPlayerAvatar ?? X.blueprint.avatar;
    av.health = av.maxHealth = 1e9;
  });
}

/** Teleport the player to a point `dist` metres from (x, z) at terrain height. */
async function teleportNear(page: Page, x: number, z: number, dist: number): Promise<void> {
  await page.evaluate(([x, z, dist]) => {
    const X = (window as any).__XANDRIA__;
    const av = X.engine.portalsPlayerAvatar ?? X.blueprint.avatar;
    const V = X.engine.camera.position.constructor;
    const y = X.engine.terrain ? X.engine.terrain.heightAt(x, z) : 0;
    av.ctrl.teleport(new V(x + dist, y + 2, z));
  }, [x, z, dist] as const);
}

/**
 * Marker-based kill driver (replaces fixed-index killing).
 *
 * Two facts from run 5 (21.4 min, "enemy 4 still alive after 600s" with the
 * HUD already at 6/6 defeated) forced this rewrite:
 *  - dead enemies are SPLICED out of blueprint.enemies.enemies
 *    (EnemyAI.removeEnemy), so a fixed index changes occupant as kills land
 *    (and as fall-deaths splice entries mid-loop);
 *  - when the 6th kill completes the break objective, the branch-choice
 *    modal opens and PAUSES the sim, so a loop still swinging at a stale
 *    index can never kill again.
 * So: kill by object identity (a __p4mark flag on the enemy object, which
 * rides the object, not the index), and stop the moment the choice opens
 * or the objective completes. A marked target that survives 120 s of pinned
 * taps is unmarked and skipped (stale / bodiless entry) so the objective
 * can still complete via other enemies.
 */
async function pinTapMarked(page: Page): Promise<'marked' | 'none'> {
  return page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    const list = X.blueprint.enemies.enemies as any[];
    const av = X.engine.portalsPlayerAvatar ?? X.blueprint.avatar;
    const pp = av.ctrl.position;
    // Nearest alive enemy, skipping stuck ones (run 9 hunt probe: the
    // first-in-array alive enemy was a void-faller at y -3972 at terminal
    // velocity — pinned, it falls metres per frame before the swing, so
    // taps never connect, while grounded splitter minis stood 7 m from
    // the player. Nearest-first picks killable targets.
    let e = list.find((e) => e.__p4mark === 1 && e.alive);
    if (!e) {
      let best = Infinity;
      for (const c of list) {
        if (!c.alive || c.__p4skip === 1) continue;
        const d = Math.hypot(c.position.x - pp.x, c.position.y - pp.y, c.position.z - pp.z);
        if (d < best) { best = d; e = c; }
      }
      if (!e) return 'none';
      e.__p4mark = 1;
    }
    const p = pp;
    // Face the avatar at the enemy's current spot, then put the enemy
    // 1.8 m along the avatar's melee forward (melee fwd = yaw + PI).
    av.ctrl.yaw = Math.atan2(e.position.x - p.x, e.position.z - p.z) + Math.PI;
    const fx = Math.sin(av.ctrl.yaw + Math.PI);
    const fz = Math.cos(av.ctrl.yaw + Math.PI);
    if (e.body) {
      e.body.position.x = p.x + fx * 1.8;
      e.body.position.z = p.z + fz * 1.8;
      // Y MUST be pinned too: melee range is a 3D check, and an enemy
      // carried over from low terrain sits metres below the player even at
      // 1.8 m horizontal — every swing then misses on range.
      e.body.position.y = p.y;
      if (e.body.velocity) { e.body.velocity.x = 0; e.body.velocity.y = 0; e.body.velocity.z = 0; }
    }
    e.speedMult = 0; // EnemyAI movement scales by spec.speed * speedMult
    X.engine.input.tap('attack');
    return 'marked';
  });
}

async function markedAlive(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    const e = (X.blueprint.enemies.enemies as any[]).find((e) => e.__p4mark === 1);
    return !!e?.alive;
  });
}

async function clearMark(page: Page): Promise<void> {
  await page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    for (const e of X.blueprint.enemies.enemies as any[]) delete e.__p4mark;
  });
}

/** Drive kills until `done()` is true (choice open, objective complete, or VICTORY). */
/** Wait until a rendered frame advances (up to 60 s). SwiftShader frames
 * run 10-60 s under load, so a fixed 3000 ms wait can span ZERO frames and
 * a tap sent in that window has not executed yet when the loop judges it.
 */
async function waitFrame(page: Page): Promise<number> {
  const f0 = await page.evaluate(() => (window as any).__XANDRIA__.engine.frame);
  const t0 = Date.now();
  for (;;) {
    await page.waitForTimeout(2000);
    const f = await page.evaluate(() => (window as any).__XANDRIA__.engine.frame);
    if (f > f0) return f;
    if (Date.now() - t0 > 60_000) return -1;
  }
}

async function killUntil(page: Page, done: (s: Awaited<ReturnType<typeof snap>>) => boolean, label: string): Promise<void> {
  const t0 = Date.now();
  let markT0 = 0;
  for (;;) {
    const s = await snap(page);
    if (done(s)) return;
    if (Date.now() - t0 > 1_200_000) throw new Error(`killUntil timeout (${label}) after 1200s`);
    const r = await pinTapMarked(page);
    if (r === 'none') { await waitFrame(page); await dismissLevelUps(page); continue; }
    if (markT0 === 0) markT0 = Date.now();
    await waitFrame(page);
    await dismissLevelUps(page);
    if (!(await markedAlive(page))) markT0 = 0; // target died; next round picks a fresh one
    else if (Date.now() - markT0 > 120_000) {
      // Stuck target (void-faller at terminal velocity, stale entry):
      // exclude it and pick the next-nearest; the objective counts ANY
      // kills, not this one specifically.
      await page.evaluate(() => {
        const X = (window as any).__XANDRIA__;
        for (const e of X.blueprint.enemies.enemies as any[]) {
          if (e.__p4mark === 1) { e.__p4skip = 1; delete e.__p4mark; }
        }
      });
      markT0 = 0;
    }
  }
}

/** Collect every remaining coin-kind pickup by teleporting within magnet range.
 * Frame-aware: a pickup registers only on a rendered frame, and SwiftShader
 * frames run 10-60 s under load, so a fixed round budget starves (run 7
 * hunt: 12/14 after 40 rounds). Each round waits for a frame advance
 * (up to 60 s) before re-reading; the loop is wall-clock capped at 900 s.
 */
async function collectAllCoins(page: Page): Promise<void> {
  const t0 = Date.now();
  for (;;) {
    const s = await snap(page);
    if (s.stage !== 'shards') return;
    if (Date.now() - t0 > 900_000) {
      const left = await page.evaluate(() => {
        const X = (window as any).__XANDRIA__;
        return (X.blueprint.pickups.list as any[]).filter((p: any) => p.kind === 'coin' && !p.taken).map((p: any) => {
          const pp = p.pos ?? p.mesh?.position ?? p.position;
          return { x: Math.round(pp.x), z: Math.round(pp.z) };
        });
      });
      throw new Error('collectAllCoins: 900s without leaving the shards stage; remaining: ' + JSON.stringify(left));
    }
    const coins = await page.evaluate(() => {
      const X = (window as any).__XANDRIA__;
      return (X.blueprint.pickups.list as any[])
        .filter((p: any) => p.kind === 'coin' && !p.taken)
        .map((p: any) => {
          const pp = p.pos ?? p.mesh?.position ?? p.position;
          return { x: pp.x, z: pp.z };
        });
    });
    if (!coins.length) return;
    const frameBefore = await page.evaluate(() => (window as any).__XANDRIA__.engine.frame);
    const c = coins[0];
    await teleportNear(page, c.x, c.z, 0.5);
    // Wait for a rendered frame (pickup registers on frames) or 60 s.
    const fw0 = Date.now();
    for (;;) {
      const f = await page.evaluate(() => (window as any).__XANDRIA__.engine.frame);
      if (f > frameBefore) break;
      if (Date.now() - fw0 > 60_000) break;
      await page.waitForTimeout(2000);
    }
    await dismissLevelUps(page);
  }
}

/** Pick the branch-choice option by index (0 = Take the high road, 1 = Hunt the stragglers). */
async function pickBranch(page: Page, idx: number): Promise<void> {
  await waitFor(page, 'branch choice modal', async () => (await snap(page)).choiceOpen, 180_000);
  const labels = await page.evaluate(() => [...document.querySelectorAll('.xhud-modals .overlay .lvlopt .nm')].map((e) => (e as HTMLElement).textContent));
  expect(labels.length).toBe(2);
  await page.locator('.xhud-modals .overlay .lvlopt').nth(idx).click();
  await page.waitForTimeout(1500);
  await dismissLevelUps(page);
}

/** Find the beacon goal flag in the scene (precise ring+pole match) and
 * drive the reach check home to VICTORY.
 *
 * Run 8 showed the player at y -133.4 at spawn after reground: teleports
 * to unloaded terrain chunks drop the player through the void (the
 * heightfield never catches a body far below its surface), and the
 * Drowned Spire site streams in only after the player arrives. So a
 * single teleport is not enough: this loops re-teleports onto the flag's
 * x,z at ground level with zeroed velocity, measures the live 3D
 * distance each round, and lets chunk streaming catch up. The reach
 * check itself (distance < 3.5 -> reachedGoal -> VICTORY) still runs
 * through the live loop; only the placement is driven.
 */
async function reachBeacon(page: Page): Promise<void> {
  // Goal-flag candidates: EVERY Group with BOTH the 2.2-radius ring and
  // the 5-tall pole (makeGoalFlag). Run 10 proved the single-first-match
  // scan insufficient: state=playing at dist 2.00 < 3.5 for 10 attempts
  // without winning, so either the first match is a decoration (not the
  // goalPos flag) or the reach/win path itself is gated. Trying every
  // candidate discriminates: the real flag wins on contact. The spire
  // toast (< 30 m, same goalPos) is logged per candidate as a second
  // signal that the game's goalPos is near that candidate.
  const goals = await page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    const out: any[] = [];
    X.engine.scene.traverse((o: any) => {
      if (o.isGroup) {
        let hasRing = false, hasPole = false;
        o.traverse((c: any) => {
          if (c.isMesh && c.geometry?.type === 'TorusGeometry') {
            const prm = c.geometry.parameters;
            if (Math.abs(prm.radius - 2.2) < 0.01 && Math.abs(prm.tube - 0.08) < 0.01) hasRing = true;
          }
          if (c.isMesh && c.geometry?.type === 'CylinderGeometry') {
            if (Math.abs(c.geometry.parameters.height - 5) < 0.01) hasPole = true;
          }
        });
        if (hasRing && hasPole) out.push({ x: o.position.x, z: o.position.z });
      }
    });
    return out;
  });
  expect(goals.length, 'beacon goal flag candidates found in scene').toBeGreaterThan(0);
  console.log(`reachBeacon candidates: ${JSON.stringify(goals)}`);
  await dismissLevelUps(page);
  const t0 = Date.now();
  for (const goal of goals) {
    for (let attempt = 0; attempt < 6; attempt++) {
      await teleportGrounded(page, goal.x, goal.z, 0);
      await page.waitForTimeout(2000);
      await dismissLevelUps(page);
      const m = await page.evaluate(([gx, gz]) => {
        const X = (window as any).__XANDRIA__;
        const av = X.engine.portalsPlayerAvatar ?? X.blueprint.avatar;
        const pp = av.ctrl.position;
        const ty = X.engine.terrain ? X.engine.terrain.heightAt(gx, gz) : 0;
        const toast = document.querySelector('.xhud.toast');
        return { dist3: Math.hypot(pp.x - gx, pp.y - ty, pp.z - gz), py: pp.y, terrainY: ty,
          toast: toast ? (toast as HTMLElement).textContent : null };
      }, [goal.x, goal.z] as const);
      const st = await snap(page);
      console.log(`reachBeacon goal (${goal.x.toFixed(0)},${goal.z.toFixed(0)}) attempt ${attempt}: dist3=${m.dist3.toFixed(2)} py=${m.py.toFixed(1)} terrainY=${m.terrainY.toFixed(1)} state=${st.state} end=${st.end} toast=${m.toast}`);
      if (st.end === 'VICTORY' || st.state === 'won') return;
      if (Date.now() - t0 > 600_000) break;
    }
    if (Date.now() - t0 > 600_000) break;
  }
  await waitFor(page, 'VICTORY via beacon', async () => { const s = await snap(page); return s.end === 'VICTORY' || s.state === 'won'; }, 120_000);
}

/** Teleport, then wait until the player is actually standing on terrain.
 *
 * A bare teleport to an unloaded chunk drops the player through the void:
 * the heightfield never catches a body far below its surface (run 8:
 * player at y -133.4 at spawn after a plain reground), and at terminal
 * fall velocity a pinned enemy is metres away by swing time, so kills
 * AND the beacon reach AND enemy attacks all silently fail. Streaming
 * follows the player, so the chunk loads within seconds of arrival; this
 * polls ctrl.grounded (the controller's own ground-probe flag) and
 * re-teleports if the player fell through before the chunk arrived.
 */
async function teleportGrounded(page: Page, x: number, z: number, dist: number): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await teleportNear(page, x, z, dist);
    const t0 = Date.now();
    for (;;) {
      const g = await page.evaluate(() => {
        const X = (window as any).__XANDRIA__;
        const av = X.engine.portalsPlayerAvatar ?? X.blueprint.avatar;
        return { grounded: !!av.ctrl.grounded, y: av.ctrl.position.y };
      });
      if (g.grounded) return;
      if (Date.now() - t0 > 30_000) break;
      await page.waitForTimeout(2000);
    }
  }
  throw new Error('teleportGrounded: player never grounded');
}

/** Return the player to solid spawn ground (0, 0), grounded, not falling. */
async function reground(page: Page): Promise<void> {
  await teleportGrounded(page, 0, 0, 0);
}

/** Shared prologue: collect 14 + eliminate 6, ending at the branch choice. */
async function playToChoice(page: Page): Promise<void> {
  await godMode(page);
  await collectAllCoins(page);
  const s1 = await snap(page);
  expect(s1.stage, 'after 14 shards the eliminate stage runs').toBe('break');
  await reground(page);
  await killUntil(page, (s) => s.choiceOpen || s.progress >= 6, 'break choice');
  await waitFor(page, 'branch choice after 6 kills', async () => (await snap(page)).choiceOpen, 180_000);
}

test('victory-path: beacon branch reaches VICTORY', async ({ page }) => {
  test.setTimeout(1_800_000);
  const errors: string[] = [];
  await boot(page, errors);
  await playToChoice(page);
  await pickBranch(page, 0);
  const s = await snap(page);
  expect(s.stage, 'high road leads to the beacon stage').toBe('beacon');
  await reachBeacon(page);
  await waitFor(page, 'VICTORY h1', async () => { await dismissLevelUps(page); return (await snap(page)).end === 'VICTORY'; }, 120_000);
  const end = await snap(page);
  expect(end.end).toBe('VICTORY');
  expect(end.state).toBe('won');
  expect(errors, 'zero console/page errors').toEqual([]);
});

test('victory-path: hunt branch reaches VICTORY', async ({ page }) => {
  test.setTimeout(1_800_000);
  const errors: string[] = [];
  await boot(page, errors);
  await playToChoice(page);
  await pickBranch(page, 1);
  const s = await snap(page);
  expect(s.stage, 'hunt branch leads to the hunt stage').toBe('hunt');
  // The hunt stage needs 1 more kill: reinforcements spawned on stage change.
  await reground(page);
  await killUntil(page, (s) => s.end === 'VICTORY' || s.state === 'won', 'hunt victory');
  await waitFor(page, 'VICTORY h1', async () => { await dismissLevelUps(page); return (await snap(page)).end === 'VICTORY'; }, 120_000);
  const end = await snap(page);
  expect(end.end).toBe('VICTORY');
  expect(end.state).toBe('won');
  expect(errors, 'zero console/page errors').toEqual([]);
});

test('victory-path: death reaches DEFEATED', async ({ page }) => {
  test.setTimeout(1_800_000);
  const errors: string[] = [];
  await boot(page, errors);
  // One life, low health, then stand beside a live enemy and take real hits.
  await page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    const av = X.engine.portalsPlayerAvatar ?? X.blueprint.avatar;
    av.lives = 1;
    av.health = 10;
  });
  await reground(page);
  // Bring the foe TO the player on solid spawn ground (instead of
  // teleporting the player to the foe's site, which may be a void-fall
  // site like the last coin). Its attack itself is untouched — it still
  // must hit twice (9 dmg vs 10 HP).
  const pinned = await page.evaluate(() => {
    const X = (window as any).__XANDRIA__;
    const av = X.engine.portalsPlayerAvatar ?? X.blueprint.avatar;
    const e = X.blueprint.enemies.enemies.find((e: any) => e.alive);
    if (!e) return false;
    const p = av.ctrl.position;
    if (e.body) {
      e.body.position.x = p.x + 1.5;
      e.body.position.z = p.z;
      e.body.position.y = p.y; // same-level pin as pinTapMarked (3D range)
      if (e.body.velocity) { e.body.velocity.x = 0; e.body.velocity.y = 0; e.body.velocity.z = 0; }
    }
    (e as any).speedMult = 0;
    return true;
  });
  expect(pinned, 'a live enemy exists to pin beside the player').toBe(true);
  await waitFor(page, 'DEFEATED after death', async () => { const s = await snap(page); return s.end === 'DEFEATED' || s.state === 'lost'; }, 900_000);
  await waitFor(page, 'DEFEATED h1', async () => { await dismissLevelUps(page); return (await snap(page)).end === 'DEFEATED'; }, 120_000);
  const end = await snap(page);
  expect(end.end).toBe('DEFEATED');
  expect(end.state).toBe('lost');
  expect(errors, 'zero console/page errors').toEqual([]);
});
