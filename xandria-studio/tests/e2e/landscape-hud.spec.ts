/**
 * VoxBox landscape-first: HUD collision measurement, not eyeballing.
 *
 * Boots the baked Emberwood player (default boot, no fixture) and, at
 * each phone viewport, measures the bounding boxes of every named HUD
 * element and asserts each box is fully inside the viewport and no two
 * boxes overlap. The quest tracker is force-rendered with one quest
 * (its real public render method) because the default boot has no
 * active quest yet and the tracker-visible geometry (pause placement,
 * tracker band) is exactly what regressed before.
 *
 * - 844x390 + 915x412, hasTouch: landscape layout (chip row, hint on
 *   top, tutorial card clear of the buttons, compact touch rows,
 *   desktop ability bar ABSENT, exactly one control called MAP).
 * - 390x844, hasTouch: the rotate prompt is visible, clears when the
 *   viewport rotates to landscape, and reappears on rotating back.
 * - 1280x720, no touch: desktop is unchanged (ability bar present,
 *   chips at their original top-right stack, no rotate prompt).
 */
import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
type X = { __XANDRIA__?: any };
type Box = { x: number; y: number; w: number; h: number; id: string };

async function boot(page: any, errors: string[]) {
  page.on('pageerror', (e: Error) => errors.push('[pageerror] ' + e.message));
  page.on('console', (m: any) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  await page.goto('/player.html?test=1&autostart=1&splash=0');
  const t0 = Date.now();
  for (;;) {
    const ok = await page.evaluate(() => {
      const X = (window as unknown as X).__XANDRIA__;
      return !!(X?.engine && X.engine.state === 'playing' && X.engine.portalsPlayerAvatar);
    });
    if (ok) return;
    if (Date.now() - t0 > 300_000) throw new Error('boot timeout');
    await page.waitForTimeout(2000);
  }
  // God-mode so nothing mauls the player mid-measurement.
  await page.evaluate(() => {
    const X = (window as unknown as X).__XANDRIA__;
    X.engine.portalsPlayerAvatar.health = X.engine.portalsPlayerAvatar.maxHealth = 1e9;
  });
}

async function measure(page: any): Promise<Box[]> {
  return page.evaluate(() => {
    const out: Box[] = [];
    const push = (id: string, el: Element | null) => {
      if (!el) return;
      const cs = getComputedStyle(el as HTMLElement);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      out.push({ id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
    };
    push('score', document.querySelector('.xhud .score'));
    push('objective', document.querySelector('.xhud .objective'));
    push('bars', document.querySelector('.xhud .bars'));
    push('hint', document.querySelector('.xhud .hint'));
    push('tutcard', document.querySelector('.xhud .tutcard'));
    push('factions', document.getElementById('xandria-standings-panel'));
    push('tracker', document.getElementById('xandria-quest-tracker'));
    for (const id of ['xandria-skills-chip', 'xandria-bestiary-chip', 'xandria-mounts-chip',
      'xandria-companions-chip', 'xandria-fast-travel-chip', 'xandria-world-atlas-chip',
      'xandria-radiant-board-chip', 'xandria-timed-board-chip']) {
      push(id, document.getElementById(id));
    }
    push('photo', document.querySelector('.xphoto-chip'));
    push('pause', document.querySelector('.xtouch .pausebtn'));
    push('minimapchip', document.querySelector('.xmap .mchip'));
    push('minimapbox', document.querySelector('.xmap .mbox'));
    const sneak = document.querySelector('.xhud .sneakchip') as HTMLElement | null;
    if (sneak && getComputedStyle(sneak).display !== 'none') push('sneakchip', sneak);
    document.querySelectorAll('.xtouch .tbtn').forEach((b) => push('tbtn:' + (b.textContent ?? '').trim(), b));
    return out;
  });
}

function assertInsideAndDisjoint(boxes: Box[], W: number, H: number, label: string) {
  for (const b of boxes) {
    expect(b.x, `${label}: ${b.id} left >= 0`).toBeGreaterThanOrEqual(0);
    expect(b.y, `${label}: ${b.id} top >= 0`).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w, `${label}: ${b.id} right <= ${W}`).toBeLessThanOrEqual(W);
    expect(b.y + b.h, `${label}: ${b.id} bottom <= ${H}`).toBeLessThanOrEqual(H);
  }
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
        hits.push(`${a.id} x ${b.id}`);
      }
    }
  }
  expect(hits, `${label}: no HUD collisions`).toEqual([]);
}

async function landscapeLeg(page: any, W: number, H: number, shot: string, json: string) {
  test.setTimeout(900_000);
  const errors: string[] = [];
  await boot(page, errors);
  const touch = await page.evaluate(() => !!(window as unknown as X).__XANDRIA__?.engine?.touch?.active);
  expect(touch, 'touch controls active on the touch context').toBe(true);
  // Force the tracker visible with one quest (real render path).
  await page.evaluate(() => {
    const X = (window as unknown as X).__XANDRIA__;
    X.blueprint.questTracker.render([{ name: 'TEST QUEST', status: 'active', lines: ['Do the test thing'] }]);
  });
  await page.waitForTimeout(800);
  const boxes = await measure(page);
  console.log(`[landscape-hud ${W}x${H}] boxes=${JSON.stringify(boxes)}`);
  writeFileSync(resolve(HERE, `../../evidence/landscape/${json}`), JSON.stringify({ viewport: { W, H }, boxes }, null, 2));
  assertInsideAndDisjoint(boxes, W, H, `${W}x${H}`);
  const ids = new Set(boxes.map((b) => b.id));
  for (const need of ['score', 'objective', 'bars', 'hint', 'tutcard', 'factions', 'tracker',
    'xandria-skills-chip', 'xandria-bestiary-chip', 'xandria-mounts-chip', 'xandria-companions-chip',
    'xandria-fast-travel-chip', 'xandria-world-atlas-chip', 'xandria-radiant-board-chip', 'xandria-timed-board-chip',
    'photo', 'pause', 'minimapchip',
    'tbtn:ATK', 'tbtn:DASH', 'tbtn:JUMP', 'tbtn:DEPLOY', 'tbtn:SNEAK', 'tbtn:STRIKE', 'tbtn:WAVE', 'tbtn:MEND']) {
    expect(ids.has(need), `${W}x${H}: ${need} measured`).toBe(true);
  }
  // Desktop ability chips must NOT render on touch.
  const barPresent = await page.evaluate(() => !!document.getElementById('xandria-ability-bar'));
  expect(barPresent, 'desktop ability bar absent on touch').toBe(false);
  // Exactly one visible control called MAP (fast travel); the minimap
  // chip reads MINIMAP on touch.
  const mapLabels = await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((b) => {
      const cs = getComputedStyle(b);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })
    .map((b) => (b.textContent ?? '').trim()));
  expect(mapLabels.filter((t: string) => t === 'MAP' || t === '🗺 MAP').length, 'exactly one MAP control on touch').toBe(1);
  expect(mapLabels, 'minimap chip reads MINIMAP on touch').toContain('MINIMAP');
  // Rotate prompt must be hidden in landscape.
  const promptVisible = await page.evaluate(() => {
    const el = document.getElementById('xandria-rotate-prompt') as HTMLElement | null;
    return !!el && getComputedStyle(el).display !== 'none';
  });
  expect(promptVisible, 'rotate prompt hidden in landscape').toBe(false);
  // Draw calls (SwiftShader — NOT phone evidence, reported as such).
  const draws = await page.evaluate(() => {
    const X = (window as unknown as X).__XANDRIA__;
    return X.engine?.renderer?.info?.render?.calls ?? null;
  });
  console.log(`[landscape-hud ${W}x${H}] drawCalls(SwiftShader, not phone evidence)=${draws}`);
  await page.screenshot({ path: `evidence/landscape/${shot}` });
  // Expanded-minimap leg (tutorial dismissed first, so the card is out
  // of the way): the compact docked box must also fit inside the
  // viewport without colliding with the bars, bottom chip row or hint.
  await page.locator('.tutcard button').click();
  await page.waitForFunction(() => !document.querySelector('.xhud .tutcard'), null, { timeout: 15_000 });
  await page.locator('.xmap .mchip').click();
  await page.waitForFunction(() => {
    const box = document.querySelector('.xmap .mbox') as HTMLElement | null;
    return !!box && getComputedStyle(box).display !== 'none';
  }, null, { timeout: 60_000 });
  await page.waitForTimeout(500);
  const expanded = await measure(page);
  console.log(`[landscape-hud ${W}x${H}] expanded-minimap boxes=${JSON.stringify(expanded)}`);
  const mbox = expanded.find((b) => b.id === 'minimapbox');
  expect(mbox, 'minimap box measured after expanding').toBeTruthy();
  assertInsideAndDisjoint(expanded, W, H, `${W}x${H} expanded-minimap`);
  expect(errors, 'zero console/page errors').toEqual([]);
}

test.describe('landscape-hud 844x390 touch', () => {
  test.describe.configure({ timeout: 900_000 });
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });
  test('no HUD collisions at 844x390', async ({ page }) => {
    await landscapeLeg(page, 844, 390, '844x390.png', 'measurements-844x390.json');
  });
});

test.describe('landscape-hud 915x412 touch', () => {
  test.describe.configure({ timeout: 900_000 });
  test.use({ viewport: { width: 915, height: 412 }, hasTouch: true });
  test('no HUD collisions at 915x412', async ({ page }) => {
    await landscapeLeg(page, 915, 412, '915x412.png', 'measurements-915x412.json');
  });
});

test.describe('landscape-hud portrait prompt', () => {
  test.describe.configure({ timeout: 900_000 });
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('rotate prompt shows in portrait and clears on rotation', async ({ page }) => {
    test.setTimeout(900_000);
    const errors: string[] = [];
    await boot(page, errors);
    const promptBox = await page.evaluate(() => {
      const el = document.getElementById('xandria-rotate-prompt') as HTMLElement | null;
      if (!el || getComputedStyle(el).display === 'none') return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    });
    expect(promptBox, 'rotate prompt visible in portrait').toBeTruthy();
    expect(promptBox!.x, 'prompt inside viewport').toBeGreaterThanOrEqual(0);
    expect(promptBox!.y, 'prompt inside viewport').toBeGreaterThanOrEqual(0);
    expect(promptBox!.x + promptBox!.w, 'prompt inside viewport').toBeLessThanOrEqual(390);
    expect(promptBox!.y + promptBox!.h, 'prompt inside viewport').toBeLessThanOrEqual(844);
    await page.screenshot({ path: 'evidence/landscape/portrait-prompt-390x844.png' });
    // Rotate to landscape: the prompt clears automatically.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForFunction(() => {
      const el = document.getElementById('xandria-rotate-prompt') as HTMLElement | null;
      return !el || getComputedStyle(el).display === 'none';
    }, null, { timeout: 60_000 });
    // Rotate back: it reappears (the landscape pass cleared the dismissal).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => {
      const el = document.getElementById('xandria-rotate-prompt') as HTMLElement | null;
      return !!el && getComputedStyle(el).display !== 'none';
    }, null, { timeout: 60_000 });
    expect(errors, 'zero console/page errors').toEqual([]);
  });
});

test.describe('landscape-hud desktop unchanged', () => {
  test.describe.configure({ timeout: 900_000 });
  test.use({ viewport: { width: 1280, height: 720 } });
  test('desktop keeps the ability bar and original chip stack, no prompt', async ({ page }) => {
    test.setTimeout(900_000);
    const errors: string[] = [];
    await boot(page, errors);
    const touch = await page.evaluate(() => !!(window as unknown as X).__XANDRIA__?.engine?.touch?.active);
    expect(touch, 'touch controls inactive on desktop').toBe(false);
    const barPresent = await page.evaluate(() => !!document.getElementById('xandria-ability-bar'));
    expect(barPresent, 'desktop ability bar present').toBe(true);
    const tops = await page.evaluate(() => {
      const out: Record<string, number> = {};
      for (const id of ['xandria-skills-chip', 'xandria-bestiary-chip', 'xandria-mounts-chip', 'xandria-companions-chip']) {
        const el = document.getElementById(id);
        out[id] = el ? Math.round(el.getBoundingClientRect().top) : -1;
      }
      return out;
    });
    expect(tops, 'desktop chip stack tops unchanged').toEqual({
      'xandria-skills-chip': 12,
      'xandria-bestiary-chip': 52,
      'xandria-mounts-chip': 56,
      'xandria-companions-chip': 92,
    });
    const promptVisible = await page.evaluate(() => {
      const el = document.getElementById('xandria-rotate-prompt') as HTMLElement | null;
      return !!el && getComputedStyle(el).display !== 'none';
    });
    expect(promptVisible, 'no rotate prompt on desktop').toBe(false);
    expect(errors, 'zero console/page errors').toEqual([]);
  });
});
