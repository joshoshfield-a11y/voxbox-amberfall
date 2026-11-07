# VoxBox: Amberfall — Fork Plan

Title: **VoxBox: Amberfall** (decided 2026-10-28; user's pick from the
naming options; "VoxBox" alone is crowded by a voxel asset pack and a
voxel editor on itch, "Amberfall" ties the amber-glow motif).
Working directory: `~/workspace/voxbox-amberfall/`.
XANDRIA stays the generator core / side project. This fork is the game.

## Base

- Forked 2026-10-28 from remote main `75773d2` ("Merge upgrade-loop wave:
  18 phases"), single-commit shallow clone, verified: `npm ci` (488 packages),
  `npx tsc --noEmit` clean. Folded in 2026-10-28: status-effects merge
  `7db1e15` (fast-forward, same tree, tsc clean). No pushes anywhere;
  XANDRIA repo untouched.
- Stack: TypeScript + Three.js 0.182 + cannon-es + Vite, `xandria-studio`
  1.5.0. Targets stay S25 + laptop/desktop, adaptive quality tiers.

## What carries over (already in the tree, tested)

Engine: `src/engine/` — core (Rng, Perf, Physics, Audio), gfx (Materials,
BakedTextures, SkinBuilder, VoxelArmor, Characters, ModelForge, Atmosphere,
PostFX), world (ChunkGrid/ChunkStream, Biomes, Terrain, Structures,
LandmarkSystem, Scatter, Vegetation, WorldAtlas, FastTravel), game systems,
UI, physics.

Game systems in `src/engine/game/`: companions + companion combat, camp,
mounts, gathering + crafting, dialogue + factions, quests (story / side /
radiant / timed + waypoints), loadouts, gear salvage, enchantments, elemental
damage + resistances, crit, stealth, hazard zones, dynamic events, world
bosses, daily mutators/challenges, photo mode, save export/import, ironman,
new game+, gauntlet, deployables, economy, bestiary, achievements, vehicles.

Blueprint carrying it all: `src/blueprints/tpAction.ts` (third-person
action). The other genre blueprints (FPS, racing, platformer, top-down,
tower defense, endless runner, survivor) are generator variety, not RPG.

## Keep / strip (phased, nothing deleted blind)

- Keep: engine, tpAction, all game systems above, baked textures, tests.
- Strip in Phase 1, behind verification at each step: prompt→spec generator
  UI, Studio/editor/inspector, billing/Supabase/Stripe, non-tpAction
  blueprints, genre-switching. The RPG is one fixed world, not a generator.
- Rename: package + product identity once the game has a name. Until then
  everything keeps its XANDRIA names so diffs stay readable.

## Voxel, enhanced detail (the art direction)

Stay voxel. "Enhanced detail" means more detail *inside* the voxel language,
not leaving it:

1. **Characters (Pass 1).** Sub-voxel subdivision: large armor boxes split
   into smaller quantized boxes with per-voxel palette variation, using the
   existing `VoxelGeoCache` (identical dims share one geometry, one instancer
   bucket). More armor pieces per slot on the existing rig pivots
   (head/torso/arms/elbows/knees): trim, rivets, layered plates, pauldron
   variants. Visor-slit variants per faction. Cape/cloth segmentation as
   already established. Rule: detail must be bucket-neutral — more
   instances, same bucket count — measured with `Perf.ts` before/after.
2. **Environment (Pass 2).** Denser seeded dressing through ChunkScatter /
   PropSets / Structures with per-instance variation (matrices carry variety,
   never unique geometry). Ground-paint detail, landmark detail passes,
   amber-glow motif kept as the signature accent.
3. **Textures / grade (Pass 3).** Extend the baked atlas (712K webp now)
   with detail normals/roughness for armor and fabric. Textures stay baked
   once and checked in, never runtime-generated. Dusk grading kept.

Perf guard: the S25 150-draw-call budget is still open on main (~446
measured earlier). Every detail pass ships with a draw-call/bucket delta
measured on the same scene, desktop + 390px screenshots. Detail that blows
the budget gets a quality-tier gate (S25 tier vs laptop tier), not a waiver.

## Phases

- **0 — Baseline (done).** Fork cloned, tsc clean, plan written.
- **1 — Strip + identity.** Remove generator/Studio/billing/non-tpAction
  paths in slices, each re-gated (tsc + vitest). Rename on the game's name.
- **2 — Voxel Pass 1 (characters).** As above, with screenshot + perf QC.
- **3 — Voxel Pass 2 (environment).** Dressing density + landmarks.
- **4 — Story spine.** One fixed world, one region first: main quest chain,
  NPC cast, dialogue, quest rewards. Reuses dialogue/factions/quest systems
  as-is; new content is data + writing, not new systems.
- **5 — First playable slice.** One region on foot, full loop (explore,
  fight, gather, craft, camp, quest, save), playable on S25 + laptop.
- **6 — Phone verification.** Real-device S25 run before anything is
  called done. SwiftShader numbers are never phone evidence.

## Open decisions

- Setting, structure, first region: DECIDED 2026-10-29 — see
  `SETTING.md` (dusk-locked Amberfall; blend of three progression
  tracks — Amber Spine beacons, camp tiers, free play — under hard
  freedom rules: no hard locks, danger is the gate, free retreat,
  fast travel by visiting; first region Emberwood, forest ruins at
  dusk, Hollow Camp + Drowned Spire + optional capstone beast).
  Decided by KEEL on the user's delegation ("a mixture, I'll let you
  decide"); user may override, doc gets corrected.
- Status-effects: DONE both ways 2026-10-28 — merged to XANDRIA main as
  flattened commit `7db1e15` (gates green, see above) and fast-forwarded
  into this fork (same tree, tsc clean). Live elemental→status tap is
  still NOT wired (REPORT follow-up; needs its own seeded stream — do
  not wire it silently into another change).
- DUSKFALL: shelved experiment, not a base. Nothing is taken from it.
