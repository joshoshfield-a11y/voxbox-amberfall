# Visual Breakout Report — VoxBox: Amberfall (B1→B7)

Branch `voxbox/mobile-first`, local commits only, nothing pushed/merged/published/packaged.
Parent coordinator verifies independently before anything is reported as complete to the user.

## Commits

| Workstream | Commit | Files | Tests after |
|---|---|---|---|
| B1 light rig | `e1e71ff` | Sky, Atmosphere, GenreGrade + b1 test | 2,684 |
| B2 baked AO | `68ab94e` | groundPaint, Terrain, FarTerrain + b2 test + rebase digest update | 2,689 |
| B3 ground density | `fff2e4d` | Grass, Structures, groundPaint-wear + b3 test | (shared gate, see below) |
| B4 vegetation | `b7280ae` | Vegetation + b4 test | 2,694 after B3+B4 |
| B5 character | `65c196e` | Characters + b5 test | 2,698 |
| B6 post + grade | `9b74e2c` | PostFX, GenreGrade, AmberGlow + b6 test | 2,702 |
| B7 sky | `82f74cf` | GenreGrade, LightShafts + b7 test | 2,704 |

Full suite green + `tsc --noEmit` clean after every workstream. No test assertion
was changed except the single authorized B2 terrain-rebase digest update (below).
Evidence files under `evidence/visual-breakout/` are untracked and uncommitted,
per standing practice. The plan file's workstream sections are marked done.

## What each workstream did

- **B1 — bright golden dusk.** Dusk sun `#ffb070` 1.6 → `#ffc07a` 2.05, elevation
  3° → 16°, hemi 0.9 → 1.05, ambient 0.25 → 0.35, dome darkening 0.7 → 0.85,
  shadow normalBias 0.02 → 0.03; Preetham Rayleigh 4.2 → 3.2, Mie 0.012 → 0.008;
  grade fogDensity ×0.8, fogLuminance ×0.98, sky ×1.4 (capped 1). Exposure pinned
  at 0.72, night locked. Biggest single lever: spawn luma 0.1994 → 0.283.
- **B2 — baked AO in ground vertex colors.** `aoDarken` horizon rule (±10 cells,
  0.35 divisor, 0.45 strength, 0.55 floor) applied as a post-step after
  `paintGroundVertex` in detail chunks and the far shell. Zero per-frame cost.
  Honest verdict: on this gentle terrain it is a ≤1.2% depth cue, not a visible
  look change (whole-world mean 0.9952, min 0.9843; spawn disc fully flat by
  `flatRadius`). Do not crank it into mud; the visible depth comes from B3–B6.
  Per-instance prop/character AO deferred (shared instanced geometry cannot
  carry per-instance AO; character vertexColors plumbing is invasive).
- **B3 — denser grass, wider paths, stronger wear.** QUALITY_COUNT standard
  2200 → 3000, high 4500 → 5200, retro unchanged; tuft color variation widened;
  spawn→landmark corridors 4.5 → 6.0 m, strength 0.4 → 0.55; wear k cap 0.5 → 0.6,
  darkening 0.15 → 0.20, lerp 0.25 → 0.35. V1 mottle kept; Phase-3 litter fleck
  (0.55) stays out. +44,640 grass instances, +178,560 tris, calls unchanged
  (instanced). Per-chunk targets (256 m chunk): standard forest 4,062 @ dm 1.0
  (S25) / 6,093 @ dm 1.5 (desktop); plains ×0.8; high forest saturates the 6,400
  pool budget (cap, not QUALITY_COUNT).
- **B4 — foliage variation, canopy tint gradient, pine trunk readability.**
  Deterministic per-instance `foliageVariation` (hash, no RNG stream) on all
  foliage tiers; pine/oak multi-layer canopies get a bottom→top tint gradient
  (`#d8e4cc` → `#e6efe0` → `#ffffff`); single-layer LOD2 stays white (a first
  pass broke `vegetation-env2`'s tinted-verts pin and was fixed); pine trunk
  `#5a4230` → `#6b4a33` (separate cached material, no new program). Triangle
  counts unchanged: pine LOD0/1/2 = 54/28/10 (test-pinned); oak 80/40/20 is an
  estimate from geometry construction, NOT test-measured.
- **B5 — hero material richness, flash-proof.** Shirt roughness 0.85 → 0.75;
  accent/accentDS 0.5/0.3 → 0.35/0.6 (roughness/metalness); bandolier buckle
  and armor rivet glows 1.6/1.2 → 2.0. No permanent emissive on owned materials:
  the humanoid `animate` flash loop overwrites owned emissive and never
  restores it, so only shared cached `mats.glow` instances were brightened.
  V2 smooth/faceted split stands; voxel cape untouched.
- **B6 — emissive-only bloom, biome grade in post.** `BLOOM_THRESHOLD` exported
  from PostFX, 1.0 → 1.15 (dusk sky horizon ~1.03 below; orbs 2.6, doorways/
  windows 2.8, lanterns 2.6, rune strips 2.0 + sun diffuse above; sunlit ground
  ≤ ~0.8 below). PostFX grade pass now receives `spec.theme.environment` —
  previously the per-biome dusk grades never reached the post chain. Ruins
  gain [1.04,1.00,0.93] → [1.06,1.02,0.94], saturation 1.08 → 1.14; forest
  [1.02,1.03,0.94] → [1.05,1.04,0.94], 1.10 → 1.15; lifts within biome-sanity
  bounds. AmberGlow window 2.0 → 2.8, lantern 2.4 → 2.6. No new passes; threshold
  and grade values are uniforms (zero cost); the ~1–2% GradeShader GPU baseline
  stands (SwiftShader cannot measure mobile GPU — stated plainly). Output
  transform checked: GradeShader is last in the standard chain and includes the
  tonemapping + colorspace chunks (pinned by the b6 test).
- **B7 — sky.** Dusk cloudColor `#ffd9b0` → `#ffe6c8`, dusk clouds ×0.9 opacity;
  shaft base alpha 0.015–0.03 → 0.02–0.038 (dusk effective 0.034–0.0646 via the
  ×1.7 god-ray boost; day moves too but VoxBox is dusk-locked). The brighter
  dome landed in B1 (sky ×1.4) and is attributed there, not re-claimed here.
  No volumetric clouds.

## Gate table — medians of 8, zero console errors, buckets null throughout

Calls / tris / geometries / textures / programs / mean luma.

| Config | View | Baseline | B7 final | Luma baseline → final |
|---|---|---|---|---|
| 844×390 | spawn | 676 / 1,772,862 / 379 / 25 / 39 | 674 / 1,911,422 / 377 / 25 / 39 | 0.1994 → 0.2862 |
| 915×412 | spawn | 676 / 1,772,862 / 379 / 25 / 39 | 672 / 1,871,422 / 375 / 25 / 39 | 0.2028 → 0.2942 |
| desktop | spawn | 667 / 1,772,498 / 370 / 25 / 39 | 603 / 1,869,158 / 329 / 25 / 38 | 0.2208 → 0.3318 |
| 844×390 | forest | 676 / 3,045,022 / 377 / 25 / 39 | 676 / 3,223,582 / 377 / 25 / 39 | 0.1826 → 0.2605 |
| 915×412 | forest | 676 / 3,045,022 / 377 / 25 / 39 | 676 / 3,223,582 / 377 / 25 / 39 | 0.1855 → 0.2684 |
| desktop | forest | 605 / 3,002,758 / 329 / 25 / 38 | 607 / 3,221,318 / 331 / 25 / 38 | 0.2039 → 0.3071 |

Luma journey (spawn-844): baseline 0.1994 → B1 0.283 → B2 0.283 → B3+B4 0.2813
→ B5 0.2814 → B6 0.2862 → B7 0.2862. Forest-844: 0.1826 → 0.2526 → 0.2526 →
0.2496 → 0.2497 → 0.2605 → 0.2605. The two real brightness steps are B1 (light
rig) and B6 (biome grade reaching post + grade brightening); B2/B5/B7 are
sub-luma-resolution in the gate framings and are pinned by unit tests instead.

## Census variance — read this before comparing numbers

Chunk residency varies ±2–4 chunks run-to-run (±40,000–80,000 tris, ±2–4 calls)
under SwiftShader; it is handled by comparing medians to sample-range maxima
and stable luma, not by chasing exact equality. At steady state, calls are
unchanged across the whole breakout except the B3 grass instance increase;
no workstream added a draw call or a program. The desktop-spawn 667 → 603 call
drop from b3b4 onward is desktop chunk residency (twice-reproduced), not a
workstream effect — no B3–B7 change touches geometry, streaming, or LOD.
Textures stayed 25 throughout; programs 39 phone / 38 desktop throughout.

## Digest update (the single authorized exception)

`tests/terrain-rebase.test.ts`: 220 m hills `08946d8f` → `f25bc35b`, 1000 m
mountains `e339d7f5` → `6c204883` (colors only; normals verified unchanged by
a consistent-method control run at pre-B2 HEAD: hills `f55c0c26`, mountains
`25008303` on both sides). Comment in the test cites this breakout approval,
the AO mechanism, and the previous digests. B3's wear change did not move
these digests (rebase worlds have no wear points).

## Honest limits and open items (not closed claims)

1. **B3 path readability unproven.** The strengthened wear is baked (colors
   changed, luma moved), but no clearly readable worn path corridor is
   discernible in the spawn gate screenshot at gameplay distance. A
   path-focused check (camera aligned to a corridor) is an open follow-up.
2. **B5 hero readability at gate distance unproven.** The hero is ~20 px tall
   in the gate framings; trim brightening is test-pinned but sub-visible there
   (B5 luma deltas ≤ +0.0003). The harness has no hero-closeup view and is out
   of this builder's ownership, so no closeup was produced. The white glow blob
   (Phase 0 item 12) persists — still undiagnosed, untouched by B5.
3. **B6 Props/PropSets bumps NOT made — parent decision needed.** The B6 plan
   called for rune strips 2.0 → 2.8, crystal clusters 1.6 → 2.4 (gfx/Props.ts)
   and hero-posts 1.6 → 2.4, hero-pylons 2.0 → 2.8 (world/PropSets.ts). Both
   files are outside this builder's ownership, so they were left alone and the
   threshold was set to 1.15 (not the planned 1.25) so lit rune strips still
   clear it. Options: grant ownership for those two files (then threshold can
   go to 1.25), or accept 1.15. Crystalflora (1.3) and mushroom (0.25) do not
   reliably clear 1.15; they stay bright emissive surfaces without halos.
4. **B3/B4 shared gate.** B3 and B4 were gated with one shared full-suite run
   and one shared `b3b4` capture (parallel workstreams, disjoint files), then
   committed separately. Split per-workstream captures are available on
   request; they were not run.
5. **SwiftShader numbers are NOT phone evidence.** The S25 150-draw
   real-device gate stays open. HUD overlap (Phase 0 item 11) is out of scope
   (`engine/ui/` not owned) and still visible in gate screenshots.
6. **Harness buckets null** in every capture JSON (blueprint walk reports null
   in this build); the V2 197-bucket figure came from another method.
7. **Oak triangle counts (80/40/20) are estimated**, not test-measured; only
   pine (54/28/10) is test-pinned.
8. No new real lights, no new fullscreen passes, no volumetric clouds, no
   flower geometry in grass tufts, no pine cone layer — all out of scope for
   the reasons recorded in the plan and this report.

## Evidence

`evidence/visual-breakout/` (untracked): tags `before`, `b1`, `b2`, `b3b4`,
`b5`, `b6`, `b7` — each with 3 configs × 2 views (JSON census + PNG). Logs on
home disk: `~/workspace/capture-b5.log`, `capture-b6.log`, `capture-b7.log`,
`full-suite-b5.log`, `full-suite-b6.log`, `full-suite-b7.log` (earlier /tmp
logs were lost in sandbox recycles; JSONs/PNGs survived).

## Incidents during B5–B7

A third sandbox recycle hit during the first `b7` capture (preview dead,
capture killed, no b7 files written). Recovery per established pattern:
restart preview, re-run the full `b7 both` capture. The completed b7 run is
the one cited above. Separately: `DECISION-LOG.md` shows as modified in
`git status` — that edit is not this builder's (coordinator-owned file, never
touched here); it appeared during this session and is left alone.

## Decisions needing the decision log

- B6 threshold 1.15 vs planned 1.25 + the Props/PropSets ownership question
  (item 3 above) — coordinator's call.
- Nothing else: D1/D2, the B2 digest update, and the B3/B4 shared gate are
  already covered by the breakout approval and this report.
