/** Blueprint registry — genre → build function. */
import type { GameSpec, Genre } from '@spec';
import type { Engine } from '../engine/Engine';
import { buildThirdPersonAction } from './tpAction';

export type BlueprintFn = (engine: Engine, spec: GameSpec) => unknown;

// VOXBOX PHASE 1: single-blueprint fork. The other genre builders were
// stripped; the Record<Genre, …> shape is kept (via cast) so
// runtime/main.ts — BLUEPRINTS[spec.meta.genre] — compiles untouched.
// Only third-person-action specs boot; other genres are gone.
export const BLUEPRINTS: Record<Genre, BlueprintFn> = {
  'third-person-action': buildThirdPersonAction,
} as Record<Genre, BlueprintFn>;

export const GENRE_LABELS: Record<Genre, string> = {
  'third-person-action': 'Third-Person Action',
} as Record<Genre, string>;
