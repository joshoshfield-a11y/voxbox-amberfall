# Visual Breakout Plan — VoxBox: Amberfall

**Status:** plan only, for the user's approval. No game code changed by this
document. Supersedes the incremental V3-then-V4 sequence in
VISUAL-TARGET-PLAN.md (V1 palette + ground and V2 geometry smoothing stand,
committed as `316e156` and `53cfb46` on `voxbox/mobile-first`).
The pending V3 start question is replaced by the decisions in §1.

**Target, re-confirmed 2026-10-31 ~14:07 PDT:** the re-sent reference image
(FORGOTTEN VALLEY, Chapter I, blue-armor hero, glowing supply cache):
bright daylight pine forest, worn dirt paths, dense grass tufts and flowers,
tall layered pines, strong sun shadows, glowing amber accents, hero in blue
and gold popping against green.

## 0. The ceiling, verified in code (2026-10-31)

The engine is not missing graphics tech. That is why layer-by-layer polish
read as subtle, and why this plan attacks the rig as a whole:

- Shadows exist: PCFSoft, player-local ±90 m shadow camera, 2048 high /
  1024 standard (`Sky.ts`, `Engine.ts:442`). Tier caps apply on top.
- Tone mapping is ACESFilmic; materials are nearly all MeshStandardMaterial.
  The post chain exists: UnrealBloom (gated by `spec.theme.bloom`) +
  ASC-CDL grade (lift/gamma/gain, saturation, vignette) on standard/high.
- The light rig is dim by design: spec `timeOfDay: "dusk"`,
  `environment: "ruins"`, dusk sun `#ffb070` at intensity 1.6 (day: 2.2),
  low sun elevation (0.35 vs 0.75 day), sky top darkened ×0.7, warm amber
  haze fog tint (`Sky.ts:129-161`, `GenreGrade.ts`).
- No baked AO exists anywhere (V3's premise, still true).
- Grass tufts exist (`Grass.ts`: instanced crossed quads, GPU wind sway,
  legacy high-quality target 4500 tufts / 220 m world) and undergrowth
  clusters exist (flower, shrub, …). Density and color, not new tech, is
  the lever.
- The spawn view is the `ruins` biome: oak + deadtree only, no pines
  (`Vegetation.ts:377`). The reference is a pine forest. A spawn-view
  comparison alone cannot show the reference look.
- Perf tiers are ceilings on mobile, not suggestions: S25 caps shadow
  1024, pixel ratio 1.5, density 1.0, detail retro, maxRealLights 1,
  MSAA 2 (`PerformanceManager.ts` TIER_FLAGS; tier-as-ceiling rule
  QA 2026-10-22). Desktop gets 2048 / 2.0 / 1.5 / high / 8 lights / MSAA 4.

## 1. Decisions needed before building (in order)

**D1 — Light direction (blocks everything).** The reference is daylight.
The world fiction is dusk-locked (SETTING.md: "The world is stuck at
dusk"; spec `timeOfDay: "dusk"`). Two honest options:

- **A (recommended): Bright golden dusk.** Keep `timeOfDay: "dusk"` and the
  fiction. Retune the dusk rig toward daylight: sun intensity and
  elevation up toward day values, sky brightened (palette sky `#8ec4e8`
  is already bright blue; the dusk grade darkens it), fog thinned and
  lifted, exposure rebalanced. What shows on screen reads as golden
  late afternoon, not moody dusk. No fiction change, but "dusk" stops
  looking dark, which is a visible fiction consequence he accepts.
- **B: True daylight.** Flip spec `timeOfDay` to day (sun 2.2, elevation
  0.75, day sky). Closest literal match to the reference. Requires a
  fiction update: the dusk lock is revised or scoped (e.g. Emberwood
  opens in daylight, dusk elsewhere).

**D2 — Showcase scene.** The reference comparison is shot in a pine
forest biome, not the ruins spawn view. Either (a) the builder's
before/after gates add a pine-forest camera alongside the spawn view,
or (b) Emberwood's opening dressing gains pines. Default: (a), no
content change to the spawn.

**D3 — Approve this scope and build order.** B1 → B2 → B3/B4 in parallel
→ B5 → B6 → B7. Any workstream can be cut by his word without killing
the rest.

## 2. Workstreams

### B1 — Light rig (the biggest single lever) — DONE, committed `e1e71ff` (2026-10-31)
Retune the dusk rig per D1: sun intensity, elevation, color; hemi/ambient
rebalance; sky dome brightness; fog density/luminance and tint; exposure.
Shadow quality: bias/radius tuning for softer, cleaner contact shadows
within the existing ±90 m camera (no frustum change without a perf case).
No new lights beyond the existing pooled budgets (AmberGlow default zero
real lights; LightLife 3 pooled; beam towers 1 each) unless a workstream
makes a costed case.
Gate: same-camera stills (spawn + pine forest + hero closeup); measured
brightness/contrast deltas; draw calls unchanged or explained.

### B2 — Baked AO (old V3, folded in) — DONE, committed `68ab94e` (2026-10-31)
Bake AO into vertex colors at chunk-build (terrain/props) and at
geometry-build (characters/props), following the existing bake-at-build
pattern (groundPaint step model).
Gate: zero per-frame cost; no new passes; before/after stills.

### B3 — Ground + dressing density — DONE, committed `fff2e4d` (2026-10-31; shared gate with B4, see report)
Grass tuft density and color toward the reference (dense, varied green
with flower specks); undergrowth flower/shrub clusters at tree bases;
dirt path readability (survey the path-strip mechanism during build —
it is not yet pinned to a file, so this item starts with a survey, not
an edit); ground mottle (V1) kept, fleck (Phase-3, halted) stays out
unless he re-opens it.
Gate: tuft counts per chunk recorded; no bucket/draw-call regression
beyond the tier plan.

### B4 — Vegetation richness — DONE, committed `b7280ae` (2026-10-31; shared gate with B3, see report)
Pine canopy layering (tiered cones, per-instance color variation),
trunk readability, hero specimens via instanceColor (existing system);
oak/deadtree at spawn get the same treatment at lower density.
Gate: triangle budget per species recorded; LOD0/1/2 deltas listed.

### B5 — Character readability — DONE, committed `65c196e` (2026-11-01)
Hero blue/gold against green: material richness on the existing
procedural models (roughness variation, gold trim accent, subtle
emissive on amber details), silhouette readability at gameplay
distance. V2's smooth/faceted split stands (eyes, horns, spikes, cape
cloth stay faceted; voxel cape untouched — its own pin decision).
Gate: hero closeup before/after at the same camera.

### B6 — Post + grade (old V4, folded in) — DONE, committed `9b74e2c` (2026-11-01)
Bloom threshold so only emissive surfaces bloom (supply cache glow,
runes, amber accents); grade toward bright + contrast (saturation,
gain, lift) under D1; vignette kept subtle.
Gate: no new fullscreen passes; mobile GPU cost re-measured against
the GradeShader ~1-2% baseline.

### B7 — Sky + atmosphere — DONE, committed `82f74cf` (2026-11-01)
Brighter sky dome, softer cloud discs (currently flat instanced
circles, 10–26), god-ray retune via the existing LightShafts grade
param. No volumetric clouds (out of scope; would break the mobile
budget this plan is built around).
Gate: same-camera sky stills; no new passes.

## 3. Tier plan (the S25 does not cap the look)

Desktop/high tier gets the full rig. S25 tier gets the same look
direction at its caps: shadow 1024, density 1.0, maxRealLights 1,
detail retro cap, MSAA 2. If a workstream cannot fit S25 at reduced
density, it ships desktop-only with the S25 fallback named in its
report — never a silent downgrade of the shared look, never a waiver
of the 150-draw S25 gate. Draw calls + triangles measured at the same
3 configs as V1/V2 (844×390, 915×412, desktop), medians of 8, zero
console errors.

## 4. Verification + delivery rules (same as V1/V2)

- Branch `voxbox/mobile-first`, local commit only. Nothing pushed,
  merged, published, or packaged as an APK without his separate word.
- Full suite green before any report; parent verification before any
  completion report to the user.
- No test assertion changes except named digest updates with his
  recorded authorization (terrain-rebase pins ground colors
  bit-identically; any digest move is deliberate and named).
- Evidence: `evidence/visual-breakout/` (before/after stills at the
  same cameras + JSON measurements), report `VISUAL-BREAKOUT-REPORT.md`,
  this plan's sections marked done as each workstream lands.
- Honest limits carried, not buried: SwiftShader numbers are not phone
  evidence; S25 real-device verification stays the final gate (V5).

## 5. Skills applied (checked 2026-10-31, from the GitHub skills repo mirror)

Three repo skills were read and folded in as guardrails, not new
workstreams. They improve quality by constraining how the breakout is
built, which is exactly where past visual passes have regressed:

- **threejs-render-patterns** — census before anything else: the §4
  gates now include geometries, textures, and compiled programs
  (`renderer.info`), not just draw calls and triangles. Pool census
  stays fixed across tiers: density changes scale placement counts
  only, never the pool census, so a budget measured on desktop holds
  on mobile. Post chain stays a per-tier budget line item.
- **procedural-worlds** — new scatter (tufts, flowers, path dressing)
  comes from salted per-chunk streams only, never `Math.random` or the
  wall clock, so the seed contract and the terrain-rebase digests
  survive B3/B4. Biomes stay content, not shaders: fog values live in
  the biome/grade tables, fog shaders live in render code, never
  mixed. Scatter gets per-species caps, LOD tiers, and shared
  instanced pools.
- **shader-craft** — any post-chain change (B6) carries an explicit
  output-transform check: the screen-writing pass must include the
  tone-mapping and color-space chunks, or HDR clips to white and the
  exposure tuning silently dies. Grade stays data (GenreGrade table),
  not code. B5 prefers material features (onBeforeCompile, emissive,
  instanceColor) over new ShaderMaterials.

## 6. Out of scope

New content/systems, rename ("Forgotten Valley" still not adopted),
engine swap, volumetric clouds, PBR texture re-authoring (materials
are already Standard; texture work beyond the baked palette path is
a separate decision), voxel-cape smoothing (its own pin decision),
push/merge/publish/APK.
