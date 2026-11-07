/**
 * VoxBox landscape-first: the rotate-prompt visibility rule.
 * Pure function — no DOM needed. The live prompt behavior (shows in
 * portrait on touch, clears on resize to landscape, never shows on
 * non-touch desktop) is covered by tests/e2e/landscape-hud.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { shouldShowRotatePrompt } from '../src/engine/ui/RotatePrompt';

describe('shouldShowRotatePrompt', () => {
  it('shows on a touch phone held portrait', () => {
    expect(shouldShowRotatePrompt({ touch: true, width: 390, height: 844, dismissed: false })).toBe(true);
  });
  it('clears in landscape', () => {
    expect(shouldShowRotatePrompt({ touch: true, width: 844, height: 390, dismissed: false })).toBe(false);
    expect(shouldShowRotatePrompt({ touch: true, width: 915, height: 412, dismissed: false })).toBe(false);
  });
  it('never shows on non-touch desktop, even in a portrait-ish window', () => {
    expect(shouldShowRotatePrompt({ touch: false, width: 700, height: 1000, dismissed: false })).toBe(false);
  });
  it('square is not portrait', () => {
    expect(shouldShowRotatePrompt({ touch: true, width: 500, height: 500, dismissed: false })).toBe(false);
  });
  it('a portrait dismissal holds until the orientation changes', () => {
    expect(shouldShowRotatePrompt({ touch: true, width: 390, height: 844, dismissed: true })).toBe(false);
  });
  it('degenerate sizes never show', () => {
    expect(shouldShowRotatePrompt({ touch: true, width: 0, height: 0, dismissed: false })).toBe(false);
  });
});
