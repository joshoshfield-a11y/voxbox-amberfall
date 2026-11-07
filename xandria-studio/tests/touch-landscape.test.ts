/**
 * VoxBox landscape-first: short-screen touch-button compaction.
 * Pure function — the live stacking (including the resize re-stack
 * and the pause button's landscape top-strip placement) is covered
 * by tests/e2e/landscape-hud.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import {
  compactTouchButtons, compactTouchButtonsLandscape, layoutForGenre,
} from '../src/engine/game/TouchControls';

const TPA = () => layoutForGenre('third-person-action').buttons;

describe('compactTouchButtons', () => {
  it('returns the portrait defs unchanged at >= 520px height', () => {
    const base = TPA();
    expect(compactTouchButtons(base, 520)).toBe(base);
    expect(compactTouchButtons(base, 844)).toBe(base);
  });
  it('re-stacks the third-person-action cluster by top at 390px', () => {
    const out = compactTouchButtons(TPA(), 390);
    const top = (label: string) => {
      const b = out.find((x) => x.label === label)!;
      return 390 - b.bottom - b.size;
    };
    expect(top('SNEAK')).toBe(280);
    expect(top('DEPLOY')).toBe(280);
    expect(top('STRIKE')).toBe(280);
    expect(top('WAVE')).toBe(280);
    expect(top('MEND')).toBe(280);
    expect(top('ATK')).toBe(330);
    expect(top('DASH')).toBe(332);
    expect(top('JUMP')).toBe(332);
  });
  it('keeps the same tops at 412px (taller screen gains bottom margin)', () => {
    const out = compactTouchButtons(TPA(), 412);
    const top = (label: string) => {
      const b = out.find((x) => x.label === label)!;
      return 412 - b.bottom - b.size;
    };
    expect(top('ATK')).toBe(330);
    expect(top('SNEAK')).toBe(280);
    expect(out.find((x) => x.label === 'ATK')!.bottom).toBe(412 - 330 - 52);
  });
  it('moves SNEAK out of the STRIKE column and keeps every size >= 44px', () => {
    const out = compactTouchButtons(TPA(), 390);
    expect(out.find((x) => x.label === 'SNEAK')!.right).toBe(280);
    for (const b of out) expect(b.size).toBeGreaterThanOrEqual(44);
  });
  it('passes unknown labels through untouched', () => {
    const out = compactTouchButtons(
      [{ label: 'BOOST', action: 'boost', kind: 'hold', right: 24, bottom: 96, size: 88 }],
      390,
    );
    expect(out[0]).toEqual({ label: 'BOOST', action: 'boost', kind: 'hold', right: 24, bottom: 96, size: 88 });
  });
  it('does not mutate the portrait defs', () => {
    const base = TPA();
    const before = JSON.stringify(base);
    compactTouchButtons(base, 390);
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe('compactTouchButtonsLandscape (FIX2, 1600x720 touch)', () => {
  it('returns the input unchanged for portrait, desktop, and short landscape', () => {
    const base = TPA();
    expect(compactTouchButtonsLandscape(base, 720, 1600)).toBe(base);
    expect(compactTouchButtonsLandscape(base, 1280, 720)).not.toBe(base); // landscape 720 tall: applies
    expect(compactTouchButtonsLandscape(base, 844, 390)).toBe(base);
    expect(compactTouchButtonsLandscape(base, 900, 519)).toBe(base);
  });
  it('re-stacks the cluster into two tight bottom-right rows at 1600x720', () => {
    const out = compactTouchButtonsLandscape(TPA(), 1600, 720);
    const b = (label: string) => out.find((x) => x.label === label)!;
    expect(b('ATK')).toMatchObject({ size: 64, right: 16, bottom: 16 });
    expect(b('DASH')).toMatchObject({ size: 56, right: 88, bottom: 16 });
    expect(b('JUMP')).toMatchObject({ size: 56, right: 152, bottom: 16 });
    expect(b('STRIKE')).toMatchObject({ size: 52, right: 16, bottom: 88 });
    expect(b('WAVE')).toMatchObject({ size: 52, right: 76, bottom: 88 });
    expect(b('MEND')).toMatchObject({ size: 52, right: 136, bottom: 88 });
    expect(b('DEPLOY')).toMatchObject({ size: 52, right: 196, bottom: 88 });
    expect(b('SNEAK')).toMatchObject({ size: 52, right: 256, bottom: 88 });
  });
  it('keeps every size >= 44px and the rows clear of the bottom-centre bars', () => {
    const out = compactTouchButtonsLandscape(TPA(), 1600, 720);
    for (const b of out) expect(b.size).toBeGreaterThanOrEqual(44);
    // row B left edge: 1600 - 256 - 52 = 1292; centred 220px bars end at 910
    const leftmost = Math.min(...out.map((b) => 1600 - b.right - b.size));
    expect(leftmost).toBe(1292);
    expect(leftmost).toBeGreaterThan(910);
    // 8px vertical gap between the rows: row A tops out at bottom 16+64=80,
    // row B starts at bottom 88
    const atk = out.find((x) => x.label === 'ATK')!;
    const strike = out.find((x) => x.label === 'STRIKE')!;
    expect(strike.bottom - (atk.bottom + atk.size)).toBe(8);
  });
  it('passes unknown labels through untouched', () => {
    const out = compactTouchButtonsLandscape(
      [{ label: 'BOOST', action: 'boost', kind: 'hold', right: 24, bottom: 96, size: 88 }],
      1600, 720,
    );
    expect(out[0]).toEqual({ label: 'BOOST', action: 'boost', kind: 'hold', right: 24, bottom: 96, size: 88 });
  });
  it('does not mutate the portrait defs', () => {
    const base = TPA();
    const before = JSON.stringify(base);
    compactTouchButtonsLandscape(base, 1600, 720);
    expect(JSON.stringify(base)).toBe(before);
  });
});
