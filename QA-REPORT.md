# VoxBox: Amberfall — QA REPORT (stylized v1.0)

Consolidated verification record for the autonomous completion
program (Phases 0–6). Method throughout: the coordinator verified
each builder's work independently — commit scope, raw gate JSONs
against report tables (never the tables alone), screenshots
inspected (not just captured), and its own suite/tsc/spec
re-runs on the final tree. Builder claims were never taken on
faith; the two corrections found that way are recorded below
(D-015 halo correction, Phase 2 recovery triage).

## Deliverable

- `~/workspace/your_files/VoxBox_Amberfall_v1.0.apk`
- 1,176,107 bytes
- SHA-256 `f2bd848fe819533008eabfb95c642fb8ee2e118bfad5f25e8a50e2a0304e06c1`
- Package `com.skit.voxboxamberfall`, versionCode 1,
  versionName 1.0, minSdk 28, targetSdk 35, launchable
  `MainActivity`, landscape, WAKE_LOCK only, no INTERNET
- apksigner verify v3 TRUE (exit 0, 1 signer, cert SHA-256
  matches D-027); zipalign `-c 4` PASS
- Packaged `player.html` byte-identical to the fresh
  `dist/player.html` (2,589,384 bytes, `cmp` clean on both
  the staging copy and the in-APK copy)
- Debug-signed. Release signing, store publish, and
  real-phone testing are user-only steps, not done here.

## Per-phase verdicts (all local commits, branch voxbox/mobile-first)

| Phase | Commits | Coordinator verdict |
|---|---|---|
| 0 audit | `bcde0a6` | Verified. Playable core loop mapped; 13 gaps logged with dispositions (see PHASE0-AUDIT.md). |
| 1 breakout B1–B7 | `e1e71ff`…`82f74cf`, verify `1f609bb` | Verified. Suite 2,704 + tsc clean on final tree. Golden dusk: spawn 844 luma 0.1994→0.2862; instances 137,379→182,019 (exact B3 grass delta). |
| 2 gameplay | `94347dc`…`fa7e683`, verify `d5112e5` | Verified (after a dead-builder recovery triage: inherited tree green, 1 overlap fixed, SaveExport header corrected, portrait guard reverted). Suite 2,718 + tsc clean. HUD zero overlaps at rest; named places; shard crystal; quest persistence ON; flash-restore fix. |
| 3 max-quality | `2cab474`…`43b44e9`, verify `b6d43bf` | Verified. Suite 2,724 + tsc clean. Bloom bumps (runestone 2.8, crystal 2.4, hero-posts 2.4, hero-pylons 2.8), threshold stays 1.15 (D-018); oak LOD pinned 80/40/20; corridor dormant accepted (D-019); apron readability achieved with caveats. |
| 4 beta/bug | `4892c82`…`08d7af7`, verify `ef236bd` | Verified. Suite 2,724 + tsc clean. Full playthroughs desktop + phone-touch; victory spec coordinator re-run 3 passed / 40.9 min; touch-pill + tracker fixes; D-015 narrowed (see below). |
| 4b glow | `6e05066`, verify `ef236bd` | Verified. Suite 2,724 + tsc clean on final tree. Landscape-touch halo ABSENT; portrait control does not reproduce the veil; D-015 CLOSED (see below). |
| 5 APK | `51268bf`, verify `a4f07ac` | Verified. All packaging gates re-run by the coordinator (see Deliverable). |
| 6 docs | this commit | BUILD-RECOVERY.md + this report + decision log. |

## Final performance gates (Phase 4b medians, medians of 8, zero console errors)

| Config / view | Calls | Tris | Geoms | Tex | Progs | Luma |
|---|---|---|---|---|---|---|
| Spawn 844×390 | 676 | 1,951,030 | 379 | 25 | 39 | 0.2787 |
| Spawn 915×412 | 676 | 1,951,030 | 379 | 25 | 39 | 0.2891 |
| Spawn desktop | 665 | 1,910,722 | 368 | 25 | 39 | 0.3309 |
| Forest 844×390 (Phase 4) | 676 | 3,223,190 | 377 | 25 | 39 | 0.2591 |
| Forest desktop (Phase 4) | 607 | 3,220,982 | 331 | 25 | 38 | 0.3051 |

Reading note (D-006): median-to-median tris deltas are
confounded by ±1-chunk residency (±20,000 tris). The Phase 4
desktop spawn median was 664 / 1,890,722 / 367; the 4b median
is 665 / 1,910,722 / 368 — exactly 1 chunk, not a regression
(Phase 4's value lies inside the 4b sample range). Instances
stable at 182,019; programs 39 phone / 38 desktop; textures
25. SwiftShader numbers are NOT phone evidence: the S25
150-draw real-device gate stays open.

## Coverage proven

- **Full core loop, live:** boot → tutorial (skip proven) →
  move/look/attack/jump/dash → collect 14 shards → eliminate
  6 → branch-choice modal → reach beacon OR hunt 1 →
  VICTORY with branch winText; 3 lives → DEFEATED. Proven
  end-to-end by `tests/e2e/victory-path.spec.ts`: builder
  run 11 (3 passed, 40.3 min) AND coordinator re-run
  (3 passed, 40.9 min: beacon 16.8 m, hunt 18.9 m, death
  4.7 m), alone on a quiet box after a fresh build.
  Travel is shortcut by teleport (player teleported NEAR
  targets, never onto them); collection, melee damage,
  choice modal, reach check, and death all run through the
  live game loop.
- **Playthroughs:** desktop v2 + phone v2 (genuine CDP
  touch) complete — verbs, pause (KeyP AND Esc, touch
  pausebtn), resume, skills/bestiary/companions/mounts
  panels + Escape-close, camp, standings widget, boss bar
  show/clear, quit-to-title with SAVE SLOT picker
  (3 empty slots, EXPORT/IMPORT, merit shop, MODE:
  NORMAL, IRONMAN). Touch JUMP/DASH/ATK proven separately.
  Zero console errors throughout.
- **Beta:** fuzz 21 passed / 5 failed — all 5 the D-016
  stale multi-genre assertion class, NOT regressions;
  tp-action monkey passed (98 injections, 0 NaN); soak
  PASSED 600 s, heap flat 159.3 MiB, state=playing.
- **Spot-verification:** quest persistence across FULL
  reload; shard = elongated octahedron `#ffd23f`, ei 1.4
  (D-008); all three named-place toasts via `hud.toast`
  spy (Hollow Camp, The Drowned Spire, The Amberwood
  wilds); bloom bumps in-game (224 meshes emissive ≥ 2.0,
  incl. 2.4 × 9, 2.8 × 15); HUD at rest zero overlaps on
  desktop, 844 non-touch, and 844 touch; tracker overlap
  with active quest fixed and re-verified OVERLAPS [].
- **Debug findings (not bugs):** dialogue-open stall =
  SwiftShader slow-frame artifact (NPC fling out of the
  3 m prompt radius); tap interception = the rotate
  prompt by design (z 9800 above modal 9650) — portrait
  specs dismiss it first or run landscape (D-026
  convention).

## Corrections made by coordinator verification (not waived)

1. **D-015 hero glow:** the Phase 4 builder's "no halo"
   verdict did not survive inspection — the coordinator
   found a visible halo in `glow-portrait-0s.png` AND
   `glow-portrait-8s.png` (persistent, no blowout).
   Phase 4b then filled the missing landscape-touch cell
   (halo ABSENT, hero crisp, blowout 0) and ran a
   portrait control that did NOT reproduce the veil
   (frame-20 hero-box 0.2929 vs Phase 4 0s 0.3626).
   D-015 is CLOSED as: no persistent halo in any config;
   what persists is the designed emissive glow (visor
   1.8, hood eyes 2.2, buckle 2.0, rivets 2.0 through
   UnrealBloomPass 0.45/0.6/1.15). The single 0s veil
   frame's exact mechanism is honestly UNPINNED — one
   frame, one run, never reproduced in 11+ follow-up
   frames. No code changed on that basis.
2. **Phase 2 recovery triage:** the first Phase 2 builder
   errored with no report; the recovery builder verified
   the inherited tree green before keeping it, fixed one
   real overlap, corrected a false SaveExport header, and
   reverted a portrait guard that measured strictly worse
   (15 vs 3 overlaps). The dead builder's pre-fix HUD/glow
   PNGs were byte-identical to pre-fix copies and were
   never cited as post-fix evidence.

## Honest open list (only a real phone or the user can close these)

- **Real-phone everything:** install, launch, touch/stick
  feel, performance vs the S25 150-draw gate, hero/credit
  persistence across update, real-device pill-tap
  end-to-end, save-persistence-across-launch. NOTHING
  here is phone evidence.
- **Landscape glitch:** undiagnosed by design until a
  screenshot/clip arrives (user's call).
- **Splash link inert in APK:** "make your own →" does
  nothing on tap (no WebChromeClient). Follow-up if
  wanted: WebChromeClient / external-browser intent,
  rebuild, re-verify. Not a blocker.
- **Veil mechanism:** unpinned (see correction 1). Reopen
  only if it reproduces, with dense early-frame sampling.
- **D-016 stale e2e pins:** retiring/updating the
  multi-genre specs is a parent-level decision, not done
  under the autonomy grant.
- **D-018 bloom 1.25 move:** needs an explicit parent
  exception (test pins 1.15). The bumps achieve the
  shipped goal within 1.15.
- **Low-fps physics robustness:** prompt latching / dt
  clamp proposed, NOT decided, NOT implemented.
- **D-022 hero trim at gate distance:** size problem
  (~44 px figure, 1–3 px glints), no small fix; needs a
  silhouette-scale decision if ever wanted.
- **D-013 portrait layout:** deferred (portrait is not a
  gated config; landscape touch is clean).
- **D-019 corridor:** dormant paths accepted; a future
  spawn-to-hero-cluster wear path needs Structures.ts
  ownership.
- **D-004 realism phase:** scoped follow-on AFTER the
  stylized APK is presented (textured PBR bark/leaf/
  rock/wood, higher-detail trees/structures, layered
  terrain textures, phone WebView ceiling — much closer
  to real, not film photoreal). DELIVERED 2026-11-02
  (see Realism phase section below); the realism APK
  verdicts (install over v1.0, phone feel, phone perf)
  are now the open phone items.

## Realism phase (2026-11-02, sole writer, branch voxbox/mobile-first)

Scope per the user's 2026-11-02 ~09:24 PST decisions:
portal spawns NOT now (D-030, arena-mode note only),
tile blending DEFINITE (D-031), realism GO. Commits:
R1 `d3fe2ca` (groundPaint feathering + realism-blend
tests + terrain-rebase re-capture), R2+R3 `b334385`
(BakedTextures realism textures, Materials layers +
leafy, Terrain uniform, Vegetation pine/oak leafy,
realism-materials tests, 4 WebP assets), docs
`4ba31d4` (D-030–D-034), re-pins `888014c`
(cache key) + `6bacda5` (registry) + `a551dab`
(D-035 discipline note), APK build parameterization
`39eac1a`.

### What shipped, with evidence

- **Tile blending (D-031, R1):** `paintGroundVertex`
  step 2c boundary warp (fbm ±0.07 slope units, ±2.2 m
  height) + widened band windows (altitude 0.48–0.85,
  scree 0.72–0.92, rock 0.52–0.78, cliff 0.34–0.64,
  wet −0.6/+1.2; wear feathers discs 0.35, paths 0.25).
  Measured by `tests/realism-blend.test.ts` (4 tests):
  slope transition spans >= 6 samples with no
  single-step color jump >= 0.12, cap fade >= 6 m,
  wet band fades over >= 0.5 m, painting bit-identical
  on repeat. Overlay system untouched: paths/tracks/
  roads stay cosmetic overlays, never baked into bases.
  Terrain-rebase digests deliberately re-captured
  (hills 61c3dd8a, mountains 61f91658); normals
  verified bit-identical via a deleted-after-run
  scratch test (95182dc0 / 2e7c3c36) — color-only
  movement.
- **Layered terrain textures (D-033, R2):** 4 staged
  procedural 1024×1024 textures imported as 512 px WebP
  (~370 KB total) and registered as realism-grass/
  soil/rock/moss; `applyGroundLayers` samples in world
  space at 6 m tiling, selection by slope + water plane
  (Terrain sets from paintCtx, −9999 = no water),
  noise-broken, modulating (not replacing) albedo.
  Cache key `xandria-ground-layers-v1`.
- **Leaf canopies (D-034, R3):** new TexKind `leaf` +
  `Materials.leafy()` (white base so the map carries
  canopy color, vertexColors kept, roughness 0.85),
  applied to pine + oak foliage including hero
  specimens. Trunks keep baked surf-wood PBR, rocks
  keep surf-rock (already PBR, verified not re-done);
  palm/cactus/deadtree/mushroom/crystalflora unchanged.
- **Staged GLBs rejected (D-032):** pine/oak/ruin_arch/
  watchtower (qtmesh-validated, no degenerate faces)
  evaluated and NOT imported — multi-material
  primitives break the instanced pools, no measured
  gain over in-engine procedurals. Provenance for
  everything imported is in BUILD-RECOVERY.md.
- **VoxelArmor.ts and voxelGeo.ts untouched** (voxel
  cape is a separate decision). Spec timeOfDay stays
  `dusk`; fiction stays dusk-locked Amberfall.

### Performance gates (medians of 8, Playwright +
SwiftShader, same harness, zero console errors everywhere)

Spawn, same-day v1.0 baseline vs realism:

| Config | Calls base → real | Tris | Tex | Progs | Luma base → real |
|---|---|---|---|---|---|
| Spawn 844×390 | 676 → 676 | identical 1,951,030 | 25 → 31 | 39 → 42 | 0.2787 → 0.2463 |
| Spawn 915×412 | 676 → 676 | identical 1,951,030 | 25 → 31 | 39 → 42 | 0.2890 → 0.2532 |
| Spawn desktop | 664 → 664 | identical 1,890,722 | 25 → 31 | 39 → 42 | 0.3308 → 0.2838 |

Forest, realism vs Phase 4 table (cross-run reference,
same harness, same world seed 1963762346):

| Config | Calls | Tris | Tex | Progs | Luma |
|---|---|---|---|---|---|
| Forest 844×390 | 676 (P4: 676) | 3,223,190 (P4: identical) | 31 | 42 (P4: 39) | 0.2265 (P4: 0.2591) |
| Forest 915×412 | 676 | 3,223,190 | 31 | 42 | 0.2331 |
| Forest desktop | 607 (P4: 607) | 3,220,982 (P4: identical) | 31 | 41 (P4: 38) | 0.2575 (P4: 0.3051) |

Reading: ZERO new draw calls in every view/config;
textures +6 (4 ground layers + leaf map/normal twin);
programs +3 (leaf program family + ground program
split). Raw gate JSONs + screenshots in
`evidence/realism/` (baseline-* + realism-* pairs).
SwiftShader numbers are NOT phone evidence: the S25
150-draw real-device gate stays OPEN, unchanged.

### Honest trade, not waived

The realism views read darker than the bright golden
dusk target (luma −0.032 to −0.047 across configs):
wider rock/scree bands put more dark mineral on
slopes, the ground grain modulates albedo down, and
the leaf texture darkens canopies vs flat color.
Lighting is unchanged; the scene still reads as dusk
terrain with visible ground texture variation (see
before/after PNG pairs in `evidence/realism/`).
Accepted as the realism tone — NOT silently tuned
back toward the old luma, which would fight the
phase's own goal. If the user wants the golden
brightness back, that is a re-brighten pass with its
own numbers, not a correction to this one.

### Core loop + HUD + APK (all verified)

- Victory-path e2e spec re-run on the realism build:
  **3 passed in 51.7 min** (Playwright, quiet box):
  beacon branch reaches VICTORY (attempt 5, dist 1.66,
  state won, end VICTORY), hunt branch reaches
  VICTORY, death reaches DEFEATED. Full core loop
  proven live on the realism build: boot, tutorial,
  shard collection, combat, branch choice, victory.
- HUD overlap probe (`tools/probe-hud-overlaps.mjs`,
  committed with this phase): 0 overlaps at rest on
  844×390 and desktop, 0 console errors. Suite e2e
  HUD specs also green.
- Full suite on final tree: 185 files, 2,732 tests,
  ALL PASSED; `tsc --noEmit` exit 0.
- Realism APK (installs over v1.0, same keystore):
  `~/workspace/your_files/VoxBox_Amberfall_realism.apk`
  — 1,548,843 bytes, SHA-256
  `d566c1ee8cf2bb80ee01560c2f00bb22eaa30746a0535b66086fd6c519d18e3a`,
  package `com.skit.voxboxamberfall`, versionCode 2,
  versionName 1.1, minSdk 28, targetSdk 35,
  landscape, WAKE_LOCK only, no INTERNET,
  launchable `MainActivity`. apksigner verify v3
  TRUE (1 signer, cert SHA-256 matches D-027);
  zipalign `-c 4` PASS; packaged `player.html`
  byte-identical to the fresh `dist/player.html`
  (3,086,678 bytes). Debug-signed; release signing,
  store publish, and real-phone testing are
  user-only steps, not done here. The v1.0 file was
  NOT overwritten (still 1,176,107 bytes, SHA-256
  `f2bd848f…e06c1`).

## Fix build 1.2 (2026-11-02, from realism 55497d7) — the four real-phone reports, fixed

- **Fix 1, title overlap (D-038):** `.x-title-mode` gate on the
  container, set by `showTitle()`, lifted by `beginPlay()`, hiding
  every in-game chip/panel/touch control while the title shows.
  Probe title config: 0 overlaps, 0 in-game chips visible (pre-fix:
  11 visible + 2 overlaps), 5 slot rows, title + class present.
  Save export/import untouched (title-overlay buttons).
- **Fix 2, touch-landscape HUD (D-039, D-041):** compact layout for
  landscape touch viewports with height >= 520 — two tight button
  rows (>= 44px targets), one slim objective+score top strip,
  FACTIONS behind a toggle, INTEGRITY slimmed above the ability bar,
  MAP/ATLAS/MINIMAP/PHOTO behind one MENU button. Probe: 0 overlaps
  at 1600x720 touch (pre-fix: 3), 0 at 844x390 and desktop. The
  probe caught a toast<->tutcard collision the compact move
  widened (D-041: toast parked bottom-centre at bottom:220);
  re-probe 0 at every geometry. Portrait touch: 20 overlaps
  pre-fix AND post-fix, pair-for-pair identical — no regression;
  portrait layout is a separate decision, not smuggled in here.
- **Fix 3, moonwalk (D-037):** the +PI removed from
  CharacterController, Npc, and EnemyAI walker/brute (same
  makeHumanoid rig, faces +Z); flyer path and tpAction's camYaw
  +PI offset untouched. Regression test 17/17, including
  setMoveStick(null) clearing the axes (no stuck-stick path).
- **Fix 4, lag (D-040):** mobile-tier-only cuts — s25 grass x0.5
  (grass-only multiplier), s25 bloom at half resolution (setSize
  wrapper; the constructor vector alone would do nothing), s25
  pixel-ratio cap 1.5 -> 1.25. s25 gates: instances -45.9%
  (spawn) / -38.1% (forest), tris -14.2% / -9.2% (spawn/forest
  844), calls flat, luma shift <= 0.0011. Desktop control:
  instances byte-identical, calls in-band, luma within variance.
  Draw calls are NOT cut (~675 s25) — the S25 150-draw gate stays
  OPEN; cutting calls needs pool-structure surgery, out of scope.
  No phone framerate claimed (headless SwiftShader only).
- **Suite + types:** full suite 186 files, 2,755 tests, ALL PASSED
  (on the tree before the CSS-only D-041 toast rule; tsc clean and
  28/28 touched-file tests re-verified on the final tree, and the
  probe's 0-overlap result at 1600x720 touch was measured on the
  final dist). `tsc --noEmit` exit 0 on the final tree.
- **Core loop on the final dist (Playwright, run path-by-path
  after a VM replacement killed the single-run attempt):**
  beacon branch VICTORY 20.6 min, hunt branch VICTORY 19.0 min,
  death DEFEATED 2.6 min — 3 passed, zero console errors on the
  verified paths.
- **APK:** see BUILD-RECOVERY.md fix-1.2 entry (versionCode 3 /
  1.2, same debug keystore, installs over v1.0/v1.1; v1.0 and
  realism files untouched). Real-phone verification of all four
  fixes is user-only — SwiftShader gates are not phone evidence.
