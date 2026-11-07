/**
 * VoxBox: Amberfall — the baked Emberwood spec (Phase 1b).
 *
 * The one fixed world. This is the byte-identical output of the old
 * default boot path — `generateSpec('a heroic knight adventure through
 * ancient forest ruins at dusk')` — captured once and checked in as
 * data, so boot no longer depends on the generator. The Engine still
 * applies its usual deterministic boot-time transforms to the returned
 * spec (origin-map seed derivation, item-def enrichment); those are
 * unchanged and produce the same live world as before the bake
 * (worldSeed 3712409144 → origin map seed 1963762346).
 *
 * Deliberately unedited: meta.name ("Ancient Realm"), meta.description
 * (the original intent text), and every number are verbatim generator
 * output. Renaming/reskinning is content work for a later phase; editing
 * any field here changes the world the seed describes.
 *
 * Always go through emberwoodSpec(): it returns a fresh deep clone, so
 * boot-time mutation of the live spec (portalMap stamp, item defs,
 * loadout application) can never corrupt the checked-in data, and a
 * second boot in the same page starts from pristine data.
 */
import type { GameSpec } from './schema';
import emberwoodJson from './emberwood.spec.json';

export function emberwoodSpec(): GameSpec {
  return JSON.parse(JSON.stringify(emberwoodJson)) as GameSpec;
}
