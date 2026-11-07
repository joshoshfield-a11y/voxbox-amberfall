# Visual Target V1 — palette + ground — REPORT

Branch: `voxbox/mobile-first`. No push, no merge, no APK.
Authorization: user tap 2026-10-31 05:16 PDT ("Yes, start V1 (palette + ground,
digests updated on purpose)"). Plan: `VISUAL-TARGET-PLAN.md` (V1 section).

## What V1 did (and only this)

1. Retuned `theme.palette` in `xandria-studio/src/spec/emberwood.spec.json`
   (baked Emberwood spec only — the generator/editor `ruins` defaults are
   intentionally untouched; changing those is a separate decision).
2. Added one ground-color term ("sunlit mottle", step 2b) in
   `xandria-studio/src/engine/world/groundPaint.ts` `paintGroundVertex`.
3. Updated the 5 hardcoded UI `GOLD` constants to the new accent so panel
   borders/headers match the spec accent (same logical change, no test pins
   them; revert is one line per file).
4. Deliberately re-captured the 2 pinned ground-color digests in
   `tests/terrain-rebase.test.ts` (see "Digest changes" below).

Deliberately left out (per the V1 brief): geometry smoothing, character/tree
profile changes (V2); baked AO (V3); post/particle retune (V4); new content,
units, quests, systems; the Phase-3 fine-grain litter fleck (stays OUT — the
new term is a different thing, see below); any rename (spec stays
"Ancient Realm"); any push/merge/publish/APK.

## Palette: old vs new

| Key | Old | New | Why / consumers |
|-----|-----|-----|-----------------|
| `primary` | `#9a9484` | `#4a8f45` | Vibrant forest green. Foliage base (`Vegetation.ts` foliageMat), grass base (`Grass.ts`), one NPC shirt option. This is what "greens more vibrant" means in this codebase. |
| `secondary` | `#6a6558` | `#6a6558` (unchanged) | Pants/leather tones; outside the green/accents goal. |
| `accent` | `#ffd76a` | `#ff9e2e` | Vivid amber-orange (between amber and neon-orange). Glows, goal flags, projectiles, crystal-flora emissive, plus the 5 UI `GOLD` constants. |
| `sky` | `#a8bcd8` | `#8ec4e8` | Brighter soft blue sky. |
| `horizon` | `#e0d9c4` | `#f0e2b8` | Warmer golden-hour haze. |
| `ground` | `#7d7868` | `#8a8a52` | Warm olive; blended 45/55 with biome ground toward sunlit olive-green. |
| `groundAlt` | `#8a8574` | `#a3a85e` | Lighter yellow-olive sunlit variation. |
| `rock` | `#9a9484` | `#8a7a62` | Warmer brown-gray for paths/rock. Note: old `rock` equaled old `primary` — see the bucket note below. |
| `fog` | `#d8d2c0` | `#e6dcbe` | Warmer light haze. |
| `water` | `#4a8a9a` | `#2f9fd8` | Electric blue. |

No new palette keys (a schema change is out of scope). Event beacon colors
are per-type constants in `dynamicEvents.ts` (cache `#7ae2ff` was already
electric blue) and were not touched.

## Ground variation method (step 2b, "sunlit mottle")

Inserted after patchiness (step 2) and before altitude/slope/wear, so wear
still modulates it:

```ts
const mottleN = noise.get(fx * 0.13 + 11.7, fz * 0.13 - 5.3);
const mk = (mottleN + 1) / 2;
if (mk > 0.62) out.lerp(c.patchLight, ((mk - 0.62) / 0.38) * 0.22);
else if (mk < 0.38) out.lerp(c.patchDark, ((0.38 - mk) / 0.38) * 0.18);
```

- Frequency 0.13 (~7.7 m wavelength): between the macro term (0.05) and the
  patch term (0.33). Offsets +11.7/−5.3 decorrelate it from the patch
  offsets (+47.3/−23.7).
- Amplitude ±0.22/0.18 toward the existing patch light/dark colors: tonal
  mottling, not grain.
- NOT the Phase-3 litter fleck (0.55 freq, ±0.22 lerp toward patch
  light/dark with a warm cast). Different frequency, smaller amplitude, no
  warm cast, no grain. The fleck stays out.
- Purity preserved: the term is pure in the fround world coords `(fx, fz)`
  like every other term, so chunk edge vertices shared by neighbors stay
  bit-identical and the same seed always produces the same ground.
- Cost: zero per-frame — baked into the vertex color attribute at
  chunk-build time. No new materials, no new passes, no new InstancedMeshes.
- Both consumers (Terrain detail chunks and FarTerrain far shell) paint
  through `paintGroundVertex`, so the seam agreement holds by construction.

## Digest / bound changes (every one, with reason)

### `tests/terrain-rebase.test.ts` — 2 digests, DELIBERATE

| Test | Old | New | Why |
|------|-----|-----|-----|
| 220m hills, seed 7 | `2619648d` | `08946d8f` | Recipe change only (step 2b mottle). This test builds via `generateSpec`, not the baked spec, so the palette retune does not move it — the digest moved only via the recipe change. |
| 1000m mountains, seed 7, 16 chunks | `cc8ca994` | `e339d7f5` | Same reason. |

Proof the movement is color-only (split normals/colors digests, measured
before AND after V1 with a temporary scratch test, deleted after use):

| World | Normals before | Normals after | Colors before | Colors after |
|-------|---------------|---------------|---------------|--------------|
| 220 hills | `95182dc0` | `95182dc0` (identical) | `ba46bd20` | `04f00052` |
| 1000 mountains | `2e7c3c36` | `2e7c3c36` (identical) | `5a6aa2c7` | `d3b80b4e` |

The normals values match the pre-rebase references quoted in the test file
itself. The test's comment block records the V1 re-capture (old digests,
new digests, why, date). The 2 color-independent tests in the same file
(chunk-local magnitudes, world-position reconstruction) pass unchanged.

### `tests/perf-tiers.test.ts` — NO changes

All 20 tests pass unchanged on the final tree, so no bound was moved. V1
does not touch tier flags, density multipliers, or pool sets.

No other test expectation was edited.

## Tests

- Targeted set (terrain-rebase, perf-tiers, genre-grade, terrain-detail):
  **4 files, 58 passed, 0 failed** on the final tree.
- Full suite on the final tree: **170 files, 2,672 passed, 0 failed**.
  (An earlier full run on the pre-cleanup tree was 171 files / 2,673
  passed including the temporary scratch test, which has since been
  deleted; the final-tree run above is the one that counts.)
- Determinism evidence (not just the digest): `terrain-detail` tests pass
  for same-seed bit-identical colors (small + chunked worlds), chunk-seam
  shared-edge color equality, one shared ground material instance (zero new
  draw calls), and wear behavior. The `genre-grade` variation gate
  (max−min > 0.15) still passes — V1 preserves/increases variation.

## Before / after measurements (same configs, same scene, same spawn camera)

Harness: baked Emberwood spec via `vite preview` + Playwright/SwiftShader,
`?test=1&autostart=1&splash=0`, settle 8 s, screenshot, then 8 samples at
2 s intervals; medians reported. Zero console errors in all six runs.

| Config | Draw calls | Triangles | Geometries | InstancedMeshes | Instances | Buckets |
|--------|-----------|-----------|------------|-----------------|-----------|---------|
| 844x390 before | 670 | 1,652,862 | 373 | 237 | 137,379 | 228 |
| 844x390 after | 670 | 1,652,862 | 373 | 237 | 137,379 | 227 |
| 915x412 before | 670 | 1,652,862 | 373 | 237 | 137,379 | 228 |
| 915x412 after | 670 | 1,652,862 | 373 | 237 | 137,379 | 227 |
| desktop before | 601 | 1,650,598 | 327 | 237 | 137,379 | 228 |
| desktop after | 601 | 1,650,598 | 327 | 237 | 137,379 | 227 |

**Gate verdict: PASS — draw calls did not increase at any config
(identical at all three).** Triangles, geometries, mesh counts, and
instance counts are all identical.

### The −1 bucket, explained (not a regression)

Buckets = distinct (geometry, material) pairings among InstancedMeshes.
V1's palette split is the cause: the old palette had `primary == rock ==
#9a9484`, so rock pools and foliage pools shared one material value. After
the split (`primary #4a8f45`, `rock #8a7a62`), a signature census (value
signatures + uuid-pair counts, run against both the V1 build and a pristine
8376a8b build) shows exactly one structural change: the pos24/idx36 rock
pools consolidated from two material values onto the single rock value
(before: 4 meshes at `#9a9484` + 1 mesh at `#8a7a62`; after: all 5 at
`#8a7a62`), eliminating one distinct (geometry, material) pairing.
Value signatures 45 → 44; uuid pairs 228 → 227, matching the capture
metric exactly. Mesh count, instance count, and draw calls are unchanged —
material consolidation cannot change call counts. A bucket *decrease* was
never a gate failure, and this one is fully accounted for.

## Screenshots (evidence/visual-v1/, untracked — same convention as prior phases)

All pairs are the same fixed spawn view, tutorial step 1/7 overlay present
in both (identical autostart state), so the comparison is valid.

- `before-844x390.png` / `after-844x390.png` — phone landscape. After:
  ground reads warmer olive (less gray), UI accents shifted gold →
  amber-orange, foliage marginally greener. Subtle at this distance under
  dusk light + overlay.
- `before-915x412.png` / `after-915x412.png` — same scene, wider phone
  landscape; same deltas as 844x390.
- `before-desktop.png` / `after-desktop.png` — clearest pair. After:
  foreground ground shows warm olive-brown tonal mottling (light sunlit
  patches + darker hollows breaking up the previous flat gray-brown),
  scattered grass tufts read vivid green, UI accents (quest counter,
  SKILLS/MOUNTS/COMPANIONS, MAP/ATLAS, tutorial header) are vivid
  amber-orange, hero gold armor pops against the ground.

Honest note: at the spawn view under dusk lighting + fog, V1's change is
visible but not dramatic — the reference target's bright sunlit look is
only partly reached here. The remaining distance is post/grade work (V4)
and geometry (V2), not more palette: V1 did exactly its scoped job.

## Harness notes for the next phase (kept out of the repo)

- The capture harness lived at `xandria-studio/scripts/v1-capture.mjs` and
  was deleted after the runs, per prior-phase precedent. Two gotchas worth
  carrying forward: (1) Playwright `page.screenshot` under SwiftShader
  needs `animations: 'disabled'` plus a long timeout — desktop (2.8x
  pixels) exceeded 120 s once, 300 s + one retry worked. (2)
  `page.waitForFunction`'s signature is `(fn, arg, options)` — passing the
  options object second silently keeps the 30 s default; the after-run
  failed exactly that way under CPU contention. Always pass `null` as arg.
- The before build was reproduced byte-size-identical (2,576,525 B) from a
  pristine 8376a8b worktree for the bucket investigation; the worktree was
  removed afterward.

## Files changed (this commit)

- `xandria-studio/src/spec/emberwood.spec.json` (palette)
- `xandria-studio/src/engine/world/groundPaint.ts` (step 2b + header note)
- `xandria-studio/src/engine/ui/AchievementsPanel.ts`,
  `CustomizationPanel.ts`, `FastTravelPanel.ts`, `JournalPanel.ts`,
  `WorldAtlasPanel.ts` (`GOLD #ffd76a → #ff9e2e`)
- `xandria-studio/tests/terrain-rebase.test.ts` (2 deliberate digest
  re-captures + comment)
- `VISUAL-V1-REPORT.md` (this file)
- `VISUAL-TARGET-PLAN.md` (V1 section marked done)

Evidence (untracked, on disk): `evidence/visual-v1/` — 6 PNGs + 6 JSONs.
Player build for the captures: `xandria-studio/dist/player.html`
(2,576,653 B after V1, vs 2,576,525 B before; `dist/` is not tracked).
