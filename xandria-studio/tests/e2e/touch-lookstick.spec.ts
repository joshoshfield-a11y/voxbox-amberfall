/**
 * VoxBox touch view control: the third-person-action right look-stick.
 * Boots the baked Emberwood player and proves, at both landscape phone
 * sizes, with synthetic PointerEvents (same handlers real touches hit):
 * - a drag on the empty right zone turns the camera: Input.look gains
 *   deltas on the exact path the mouse/FPS look zone feed, and the
 *   floating stick visual appears at the touch point, inside the viewport;
 * - a touch starting on ATK fires attack, produces NO look delta, and
 *   never starts the stick (buttons sit on top of the zone — verified
 *   both by handler routing and by elementFromPoint hit-testing);
 * - left move stick + right look stick live simultaneously (distinct
 *   pointerIds): move axes set AND look deltas accumulate AND both stick
 *   visuals visible at once; releasing both hides both visuals;
 * - every touch button box stays inside the viewport.
 * Desktop: no touch overlay is built at all.
 */
import { test, expect } from '@playwright/test';

type X = { __XANDRIA__?: any };

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
    if (ok) break;
    if (Date.now() - t0 > 300_000) throw new Error('boot timeout');
    await page.waitForTimeout(2000);
  }
  await page.evaluate(() => {
    const X = (window as unknown as X).__XANDRIA__;
    X.engine.portalsPlayerAvatar.health = X.engine.portalsPlayerAvatar.maxHealth = 1e9;
  });
}

async function checkViewport(page: any, w: number, h: number) {
  const errors: string[] = [];
  await boot(page, errors);

  // Every touch button box inside the viewport.
  const buttons = await page.evaluate(() => {
    const out: Array<{ label: string; x: number; y: number; w: number; h: number }> = [];
    document.querySelectorAll('.xtouch .tbtn').forEach((b) => {
      const r = (b as HTMLElement).getBoundingClientRect();
      out.push({ label: (b.textContent ?? '').trim(), x: r.x, y: r.y, w: r.width, h: r.height });
    });
    return out;
  });
  expect(buttons.length).toBeGreaterThan(0);
  for (const b of buttons) {
    expect(b.x, `${b.label} left`).toBeGreaterThanOrEqual(0);
    expect(b.y, `${b.label} top`).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w, `${b.label} right`).toBeLessThanOrEqual(w);
    expect(b.y + b.h, `${b.label} bottom`).toBeLessThanOrEqual(h);
  }

  // Zone order: move zone first, look-stick zone second (built in that
  // order); both are the right/left 45% strips.
  const zones = await page.evaluate(() => {
    const zs = [...document.querySelectorAll('.xtouch .zone')].map((z) => {
      const r = (z as HTMLElement).getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    return zs;
  });
  expect(zones.length).toBe(2);
  const moveZone = zones[0];
  const lookZone = zones[1];
  expect(lookZone.x).toBeGreaterThanOrEqual(w * 0.5); // right side

  // Hit-testing: a bare right-zone point resolves to the zone itself
  // (stick visual is pointer-events:none), and a button center point
  // resolves to the button, never the zone.
  const hit = await page.evaluate(() => {
    const z = document.querySelectorAll('.xtouch .zone')[1] as HTMLElement;
    const zr = z.getBoundingClientRect();
    const bare = { x: zr.x + zr.width * 0.5, y: zr.y + zr.height * 0.3 };
    const bareEl = document.elementFromPoint(bare.x, bare.y);
    const atk = [...document.querySelectorAll('.xtouch .tbtn')]
      .find((b) => (b.textContent ?? '').trim() === 'ATK') as HTMLElement;
    const ar = atk.getBoundingClientRect();
    const atkEl = document.elementFromPoint(ar.x + ar.width / 2, ar.y + ar.height / 2);
    return {
      bareIsZone: bareEl === z,
      atkIsButton: atkEl === atk,
    };
  });
  expect(hit.bareIsZone).toBe(true);
  expect(hit.atkIsButton).toBe(true);

  // Look-stick drag: look deltas accumulate, stick visual appears at
  // the touch point inside the viewport.
  const look = await page.evaluate(() => {
    const X = (window as unknown as X).__XANDRIA__;
    const zones = document.querySelectorAll('.xtouch .zone');
    const z = zones[1] as HTMLElement;
    const r = z.getBoundingClientRect();
    const ox = r.x + r.width * 0.5;
    const oy = r.y + r.height * 0.3;
    const before = { x: X.engine.input.look.x, y: X.engine.input.look.y };
    z.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: ox, clientY: oy, bubbles: true, cancelable: true }));
    z.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: ox + 56, clientY: oy + 28, bubbles: true, cancelable: true }));
    z.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: ox + 56, clientY: oy + 28, bubbles: true, cancelable: true }));
    const after = { x: X.engine.input.look.x, y: X.engine.input.look.y };
    const bases = [...document.querySelectorAll('.xtouch .stickbase')]
      .map((b) => ({ display: getComputedStyle(b as HTMLElement).display, x: (b as HTMLElement).getBoundingClientRect().x, y: (b as HTMLElement).getBoundingClientRect().y }));
    z.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX: ox + 56, clientY: oy + 28, bubbles: true, cancelable: true }));
    const hidden = [...document.querySelectorAll('.xtouch .stickbase')]
      .every((b) => getComputedStyle(b as HTMLElement).display === 'none');
    return { before, after, bases, hidden };
  });
  expect(look.after.x).toBeGreaterThan(look.before.x);
  expect(look.after.y).toBeGreaterThan(look.before.y);
  expect(look.bases.some((b: any) => b.display === 'block')).toBe(true);
  const shown = look.bases.find((b: any) => b.display === 'block')!;
  expect(shown.x).toBeGreaterThanOrEqual(0);
  expect(shown.y).toBeGreaterThanOrEqual(0);
  expect(look.hidden).toBe(true);

  // Button coexistence: ATK press fires attack, starts no stick, adds
  // no look delta.
  const atk = await page.evaluate(() => {
    const X = (window as unknown as X).__XANDRIA__;
    const atk = [...document.querySelectorAll('.xtouch .tbtn')]
      .find((b) => (b.textContent ?? '').trim() === 'ATK') as HTMLElement;
    const r = atk.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const lookBefore = { x: X.engine.input.look.x, y: X.engine.input.look.y };
    atk.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 8, clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
    const down = (X.engine.input as any).down.has('attack');
    const lookAfter = { x: X.engine.input.look.x, y: X.engine.input.look.y };
    const stickShown = [...document.querySelectorAll('.xtouch .stickbase')]
      .some((b) => getComputedStyle(b as HTMLElement).display === 'block');
    atk.dispatchEvent(new PointerEvent('pointerup', { pointerId: 8, clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
    const released = !(X.engine.input as any).down.has('attack');
    return { down, released, stickShown, lookDelta: lookAfter.x - lookBefore.x };
  });
  expect(atk.down).toBe(true);
  expect(atk.released).toBe(true);
  expect(atk.stickShown).toBe(false);
  expect(atk.lookDelta).toBe(0);

  // Both sticks at once: move axes set AND look deltas accumulate AND
  // both stick visuals visible simultaneously.
  const both = await page.evaluate(() => {
    const X = (window as unknown as X).__XANDRIA__;
    const zones = document.querySelectorAll('.xtouch .zone');
    const mz = zones[0] as HTMLElement;
    const lz = zones[1] as HTMLElement;
    const mr = mz.getBoundingClientRect();
    const lr = lz.getBoundingClientRect();
    const mx = mr.x + mr.width * 0.5;
    const my = mr.y + mr.height * 0.5;
    const lx = lr.x + lr.width * 0.5;
    const ly = lr.y + lr.height * 0.3;
    mz.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 11, clientX: mx, clientY: my, bubbles: true, cancelable: true }));
    lz.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 12, clientX: lx, clientY: ly, bubbles: true, cancelable: true }));
    mz.dispatchEvent(new PointerEvent('pointermove', { pointerId: 11, clientX: mx + 40, clientY: my, bubbles: true, cancelable: true }));
    lz.dispatchEvent(new PointerEvent('pointermove', { pointerId: 12, clientX: lx + 56, clientY: ly, bubbles: true, cancelable: true }));
    const axes = (X.engine.input as any).touchAxes;
    const look = { x: X.engine.input.look.x, y: X.engine.input.look.y };
    const visible = [...document.querySelectorAll('.xtouch .stickbase')]
      .filter((b) => getComputedStyle(b as HTMLElement).display === 'block').length;
    mz.dispatchEvent(new PointerEvent('pointerup', { pointerId: 11, clientX: mx + 40, clientY: my, bubbles: true, cancelable: true }));
    lz.dispatchEvent(new PointerEvent('pointerup', { pointerId: 12, clientX: lx + 56, clientY: ly, bubbles: true, cancelable: true }));
    const hidden = [...document.querySelectorAll('.xtouch .stickbase')]
      .every((b) => getComputedStyle(b as HTMLElement).display === 'none');
    return { axes, look, visible, hidden };
  });
  expect(both.axes).not.toBeNull();
  expect(both.axes.lx).toBeGreaterThan(0);
  expect(both.look.x).toBeGreaterThan(0);
  expect(both.visible).toBe(2);
  expect(both.hidden).toBe(true);

  expect(errors).toEqual([]);
}

test.describe('landscape touch', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });
  test('look-stick at 844x390 landscape touch', async ({ page }) => {
    await checkViewport(page, 844, 390);
  });
});

test.describe('landscape touch wide', () => {
  test.use({ viewport: { width: 915, height: 412 }, hasTouch: true });
  test('look-stick at 915x412 landscape touch', async ({ page }) => {
    await checkViewport(page, 915, 412);
  });
});

test('desktop builds no touch overlay', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const errors: string[] = [];
  await boot(page, errors);
  const overlay = await page.evaluate(() => !!document.querySelector('.xtouch'));
  expect(overlay).toBe(false);
  expect(errors).toEqual([]);
});
