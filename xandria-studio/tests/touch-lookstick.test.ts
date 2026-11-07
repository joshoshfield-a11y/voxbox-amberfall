/**
 * VoxBox touch view control: third-person-action gets a right look-stick
 * feeding Input.look (same path as mouse / FPS look zone). Pure tests:
 * layout wiring + the dead-zone/rescale math.
 */
import { describe, it, expect } from 'vitest';
import {
  layoutForGenre, lookStickDelta, LOOKSTICK_DEADZONE, LOOKSTICK_RATE,
} from '../src/engine/game/TouchControls';

describe('third-person-action look-stick layout', () => {
  it('uses lookstick aim', () => {
    expect(layoutForGenre('third-person-action').aim).toBe('lookstick');
  });
  it('leaves every other genre aim mode untouched', () => {
    expect(layoutForGenre('fps-arena').aim).toBe('look');
    expect(layoutForGenre('top-down-shooter').aim).toBe('rstick');
    expect(layoutForGenre('survivor').aim).toBe('rstick');
    expect(layoutForGenre('racing').aim).toBe(null);
    expect(layoutForGenre('platformer').aim).toBe(null);
    expect(layoutForGenre('tower-defense').aim).toBe(null);
    expect(layoutForGenre('endless-runner').aim).toBe(null);
  });
});

describe('lookStickDelta', () => {
  it('is zero at rest and inside the dead zone', () => {
    expect(lookStickDelta(0, 0)).toEqual({ x: 0, y: 0 });
    expect(lookStickDelta(0.1, 0)).toEqual({ x: 0, y: 0 });
    expect(lookStickDelta(0, -0.1)).toEqual({ x: 0, y: 0 });
    expect(lookStickDelta(LOOKSTICK_DEADZONE, 0)).toEqual({ x: 0, y: 0 });
  });
  it('hits full rate at full deflection on each axis', () => {
    expect(lookStickDelta(1, 0)).toEqual({ x: LOOKSTICK_RATE, y: 0 });
    expect(lookStickDelta(-1, 0)).toEqual({ x: -LOOKSTICK_RATE, y: 0 });
    expect(lookStickDelta(0, -1)).toEqual({ x: 0, y: -LOOKSTICK_RATE });
  });
  it('ramps linearly from the dead-zone edge to full deflection', () => {
    const mid = lookStickDelta(0.5, 0).x;
    const expected = ((0.5 - LOOKSTICK_DEADZONE) / (1 - LOOKSTICK_DEADZONE)) * LOOKSTICK_RATE;
    expect(mid).toBeCloseTo(expected, 6);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(LOOKSTICK_RATE);
  });
  it('preserves stick direction on diagonals', () => {
    const d = lookStickDelta(0.6, 0.8); // unit magnitude
    expect(d.x / d.y).toBeCloseTo(0.75, 6);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(LOOKSTICK_RATE, 6);
  });
});
