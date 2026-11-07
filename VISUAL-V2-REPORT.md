# Visual Target V2 — geometry smoothing — REPORT

Branch: `voxbox/mobile-first`. No push, no merge, no APK.
Authorization: user tapped "Yes, start V2 (geometry smoothing)" 2026-10-31
09:26 PDT. Plan: `VISUAL-TARGET-PLAN.md` (V2 section).
Base: `316e156` (V1). This report covers the V2 commit only.

## What V2 did (and only this)

1. `xandria-studio/src/engine/gfx/Characters.ts` — smooth-shaded humanoid
   profile. New helpers:
   - `smoothPart()` — like `part()`, but the geometry stays INDEXED and
     `computeVertexNormals()` averages across shared vertices, so spheres,
     cylinders, tori and capsules read as rounded volumes instead of hard
     facets. Dims and segment counts are unchanged, so triangle counts are
     identical — only the normals move. Callers must pass fresh indexed
     primitives (a de-indexed input would keep flat normals).
   - `taperedDome()` (exported for unit testing) — tapers a dome toward its
     crown: x/z scaled by `1 - taper * t`, t = normalized height within the
     geometry bbox (0 at the rim, 1 at the pole), default taper 0.28.
     Position-only: triangle count, index and bbox height unchanged;
     `smoothPart()` recomputes the normals afterwards.
   - `segment()` (limb segments) now builds through `smoothPart()` — this
     IS the "cylindrical limbs" item: limbs were already tapered cylinders,
     they now shade smooth.
   Switched from `part()` to `smoothPart()`: torso cylinder, chest-cap
   sphere, neck cylinder, hips sphere, head sphere, delt spheres (this IS
   the "rounded shoulders" item — same dims, smooth normals, no dim
   fiddling), hand spheres, boot spheres, arm/leg wrap tori, shoulder-pad
   spheres, plate shell, bandolier straps, backpack capsule, belt torus,
   skirt shell, pauldron-asym sphere, visor bands, headband, hood cone,
   antenna tip, and the helmet dome via
   `smoothPart(taperedDome(...))` (tapered helmets).
2. `xandria-studio/src/engine/world/Vegetation.ts` — pine foliage silhouette
   rounding ONLY: `pineFoliage` cone segments LOD0 7→9, LOD1 5→7, LOD2
   unchanged at 5. Deltas per pine instance: LOD0 +12 tris (3 cones × 4),
   LOD1 +8 (2 × 4), LOD2 0. Dims, layer counts and tier structure
   untouched: no new InstancedMeshes, no new buckets.
   `pineFoliage` is now exported (V2 test seam, mirrors the existing
   `undergrowthFor` export).
3. New permanent test file `xandria-studio/tests/visual-v2-geometry.test.ts`
   (8 tests — see "Tests" below).

Deliberately left out (per the V2 brief): PBR materials, heavy textures,
new fullscreen passes; new units, systems, quests, content; any rename
(spec stays "Ancient Realm"); V3 baked AO; V4 post/particle retune; any
push/merge/publish/APK.

## Kept faceted on purpose (hard details stay hard)

Eyes, horns (cones), mohawk/crest fins (octahedra), antenna shaft,
buckle, rivets, emblem (octahedron), shoulder spikes (cones), and the
polish-wave cape cloth planes (a single plane's normals are identical
either way; the segmented-cloth look is the point). Drone/turret/car/flag
builders untouched — vehicles/props, not the humanoid profile. Oak balls,
palm fronds, mushroom caps, branches, crystal shards and trunks untouched:
oak balls and trunks already carry smooth-valued normals, and crystal
shards are correctly hard by design (an oak detail bump to icosahedron
detail 1 was rejected: +240 tris/oak instance, not microscopic).

## Voxel-detail layer — interpretation, flagged for the parent

`engine/game/voxelGeo.ts` and `VoxelArmor.ts` are UNTOUCHED. Reading of
the brief's item 3 ("the voxel-detail layer follows the SAME smoothed
profile; it does NOT get a separate blocky pass"): no separate blocky
pass was built, and the parked Phase 2 halted patch in
`evidence/phase2/halted/` was NOT revived. The voxel cape/armor are
opt-in cosmetics with their own art direction, and
`artdir-voxel-cape.test.ts` PINS the blocky panels (BoxGeometry
parameters, per-variant segment counts) — smoothing the cape would
deliberately break pinned tests and change an opt-in cosmetic's art
direction. The base profile (what V2 smooths) is the humanoid rig above.
If the parent wanted actual cape smoothing, that is a separate decision
with its own pin changes — it was NOT done on this task's authority.

## Mesh-budget verification (measured, not asserted)

- Existing bound `tests/npc.test.ts` ("mesh count per NPC stays within
  budget"): max ≤ 60. On the V2 tree the measured counts are
  46,47,46,47,47,51 — max 51, inside the test's documented 46..54 range.
- New guard in `visual-v2-geometry.test.ts`: rig mesh counts ≤ 60 across
  seeds 11, 21, 33, 47, 99.
- No mesh was added or removed by V2 anywhere: the smoothing changes
  normals (and one dome's vertex positions), never mesh counts. Capture
  medians confirm: instancedMeshes 237→237, instances 137379→137379,
  NpcInstancer buckets 197→197 at all three configs (see below).

## Pin changes

NONE to any test assertion. The only touch to an existing test file is a
COMMENT in `tests/characters-joints.test.ts` (torso bbox test): old text
"faceted() de-indexes geometry, so measure the torso cylinder's own
bounding box rather than constructor parameters" → new text "V2: the
torso cylinder is smooth-shaded (indexed) now, but this bounding-box
measurement reads dims, not normals — unchanged." The assertion itself
is byte-identical in behavior.

## Tests

- Targeted gate set (Characters, ModelForge, Vegetation, voxelGeo,
  perf-tiers, terrain, npc, drawcall-diet, engine-perf): 18 files,
  214 tests, all green on the edited tree (209 baseline + 5 new
  character tests at that point).
- New file `tests/visual-v2-geometry.test.ts`, final 8 tests, all green:
  torso/head/limb geometries indexed (smooth path) with discriminating
  vertex-count bounds; helmet dome tapered on a helmet-style rig
  (crown narrower than rim); horned rig keeps faceted horns + smooth
  visor band; `taperedDome` unit behavior (triangle count, index, bbox
  height, rim width unchanged; crown strictly narrower); rig mesh counts
  ≤ 60; pine foliage triangles LOD0 54 (was 42), LOD1 28 (was 20),
  LOD2 10 (unchanged) — pure-cone merged geometry via an empty
  undergrowth ctx.
- Full suite on the final tree: 171 files, 2,680 tests, all green
  (V1 baseline 170 / 2,672; delta is exactly this file: +1 file, +8 tests).
- `tsc --noEmit`: clean.

## Before/after measurements (same configs, same spawn view as V1)

Harness: baked Emberwood spec via `vite preview` + Playwright/SwiftShader,
`?test=1&autostart=1&splash=0`, 8 s settle, screenshot, then 8 samples at
2 s intervals; medians reported, all sample ranges singletons (the scene
is fully deterministic in test mode). JSON fields: calls, triangles,
geometries, instancedMeshes, instances, buckets (NpcInstancer stats),
populatedMeshes (InstancedMesh with count > 0), visibleInstancedMeshes.
V1 gotchas honored: `waitForFunction(fn, null, {timeout})` (options third),
screenshot `animations:'disabled'` + 300 s timeout with one retry.

| Config | Calls before → after | Triangles before → after | Geoms | Instanced | Instances | Buckets | Console errors |
|---|---|---|---|---|---|---|---|
| 844x390 | 670 → 670 | 1,652,862 → 1,652,862 | 373 → 373 | 237 → 237 | 137,379 → 137,379 | 197 → 197 | 0 → 0 |
| 915x412 | 670 → 670 | 1,652,862 → 1,652,862 | 373 → 373 | 237 → 237 | 137,379 → 137,379 | 197 → 197 | 0 → 0 |
| desktop 1280x720 | 601 → 601 | 1,650,598 → 1,650,598 | 327 → 327 | 237 → 237 | 137,379 → 137,379 | 197 → 197 | 0 → 0 |

Populated/visible meshes identical at all configs (233 / 235).
Gate verdict: draw calls did NOT increase (identical); triangles
identical in the spawn view; buckets identical; zero console errors.

Why triangles are identical in the spawn view (expected, not a miss):
Emberwood's spec environment is `ruins`, whose species mix is
oak + deadtree — there are NO pines in the spawn view, so the pine
segment change contributes 0 triangles there. The pine delta is proven
at unit level instead (54/28/10 above) and applies in forest/arctic
biomes. Character smoothing likewise changes normals, not triangles,
so a 0 triangle delta is the correct signature for V2.

### The 844x390 first AFTER run — artifact, caught and re-run

The first AFTER run at 844x390 reported 664 calls / 1,532,862 tris /
367 geometries (−6 calls, exactly −120,000 tris, −6 geometries) while
the same build at 915x412 and desktop reported zero delta. That run
overlapped the full vitest suite (CPU-starved SwiftShader); the
suspected mechanism is 6 terrain-chunk meshes not streamed in during
its sampling window (the engine streams chunks through a per-frame
budget). It was NOT accepted: the 844x390 AFTER capture was re-run on a
quiet box and came back 670 / 1,652,862 / 373 — identical to BEFORE —
and the re-run file replaced the suspect one. The re-run, not the
loaded run, is the evidence on disk.

### V1 "buckets" figure — open definition gap, stated plainly

V1's report lists buckets 228→227, but the surviving V1 JSONs do not
record how "buckets" was counted, and the V1 harness was deleted after
use per convention. On the identical scene this harness measures
NpcInstancer buckets 197, populated InstancedMesh 233, visible 235 —
none equals 227 — so V1's 227 could not be reproduced. V2 therefore
gates on the consistently measured set above (all identical
before/after) rather than claiming comparability to an unreproducible
figure. If the parent wants a V1-buckets reconciliation, that needs the
V1 harness definition, not a new measurement.

## Screenshots

Required set (same pattern as `evidence/visual-v1/` — 6 PNGs + 6 JSONs):
`evidence/visual-v2/before-844x390.{png,json}`,
`before-915x412.{png,json}`, `before-desktop.{png,json}`,
`after-844x390.{png,json}`, `after-915x412.{png,json}`,
`after-desktop.{png,json}`.

Supplementary pair (extra, same framing via the photo-mode test seam,
orbit distance 3.5 around the player — the wide spawn view renders the
player ~20 px tall, so character smoothing is not legible there):
`evidence/visual-v2/closeup-before.png`,
`evidence/visual-v2/closeup-after.png`.
Honest reading: framing identical, and at SwiftShader quality the
smoothing reads as subtler helmet/torso shading plus a narrower dome
crown — not a dramatic restyle. V2 is the smoothing step toward the
reference look; the remaining distance is V3 (baked AO) + V4 (grade)
work, not more geometry.

## Anything deliberately left out

- Voxel cape smoothing (see interpretation above — separate decision).
- Oak/palm/mushroom/crystal/trunk foliage changes (see kept list).
- Drone/turret/car/flag builders (vehicles/props).
- V3 baked AO, V4 post/particle retune, new content, rename, push,
  merge, publish, APK.
- Temporary harnesses (`capture-v2.tmp.mjs`, `closeup-v2.tmp.mjs`) were
  deleted after use, as V1 did; only the evidence and this report remain.
