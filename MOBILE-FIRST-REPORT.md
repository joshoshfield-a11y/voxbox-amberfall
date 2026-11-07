# VoxBox: Amberfall — Mobile-First Report (Phase 0 audit + Phase 1b spec bake)

Branch: `voxbox/mobile-first` (from fork main `39be699`, "Merge
voxbox/phase1-strip"). No merge into the fork's main; no pushes anywhere;
XANDRIA repo untouched. One commit for Phase 1b. Untracked
`RPG-FORK-PLAN.md`, `SETTING.md`, `evidence/` were left alone.

---

## Phase 0 — Baseline audit (prior phase; recorded here)

**Verdict: PROCEED.** The player already has a real TouchControls layer
and boots/plays at 390x844 with zero console errors.

Evidence recorded by the audit:

- TouchControls is a pointer/touch abstraction feeding the same Input
  the keyboard path uses — not a separate control scheme bolted on.
- Adaptive tutorial/hint copy and a HUD touch mode are present.
- Zero console errors at both viewports.
- Screenshots: `evidence/phase0-audit/desktop-1280.png` and
  `evidence/phase0-audit/mobile-390.png`.
- Desktop SwiftShader draw count **631**, labeled explicitly as
  SwiftShader-not-phone-evidence (never phone evidence; real-device
  verification is a later phase's gate).

Mobile 390px collisions found (later phases own the fixes — none were
touched in Phase 1b, per scope):

- Top-right SKILLS / MOUNTS / COMPANIONS clipping + pause overlap.
- Hint text covered by the STRIKE / WAVE / MEND buttons.
- Tutorial card covering the ATK button and the desktop ability chips.
- Desktop ability chips still rendered on touch.

---

## Phase 1b — Bake the Emberwood spec, pin third-person-action, drop the studio build

### What changed

1. **Baked spec (new data + accessor).**
   - `xandria-studio/src/spec/emberwood.spec.json` — the checked-in
     Emberwood spec: the byte-identical output of the old default boot
     path, `generateSpec('a heroic knight adventure through ancient
     forest ruins at dusk')`, captured once before the change (SHA-256
     `e6bf5ab3236cafcaaf9a183351ea53f6e6791e86edda26d14f13092f99abdd31`).
     Verbatim, including `meta.name` "Ancient Realm" and the original
     intent text in `meta.description` — renaming/reskinning is content
     work for a later phase; any edit here changes the world the seed
     describes. (Note the generator resolves the flavor to environment
     `ruins`, terrain `hills`, time of day `dusk` — that is the actual
     default world, and the bake preserves it exactly.)
   - `xandria-studio/src/spec/emberwood.ts` — `emberwoodSpec()` returns
     a fresh deep clone on every call, so boot-time mutation of the
     live spec (portalMap stamp, item-def enrichment, loadout
     application) can never corrupt the checked-in data, and a second
     boot in the same page starts from pristine data.
2. **Boot no longer depends on `generateSpec()`**
   (`xandria-studio/src/runtime/main.ts`, `resolveSpec()` only).
   - `?intent=` is ignored entirely: every intent — including ones
     naming deleted genres — logs a warning and degrades to the baked
     Emberwood spec. No genre switching remains on the boot path.
   - The injected-spec (`window.__XANDRIA_SPEC__`) and `?spec=` legs
     now also pin to `third-person-action`: a valid spec of another
     genre degrades to the baked spec (banner for the injected leg,
     warning for `?spec=`) instead of reaching the single-builder
     registry as `undefined`. Valid third-person-action specs boot
     exactly as before, including the R2-M4 pre-boot custom-enemy-kind
     validation and the R3-N1 fallback banner.
   - The `BLUEPRINTS` cast registry in `src/blueprints/index.ts` was
     left untouched: with `resolveSpec()` guaranteeing only
     third-person-action specs reach the lookup, the lookup cannot
     yield `undefined`. `window.__XANDRIA__` seams untouched (deferred
     rename rule). No HUD / touch / voxel code touched.
3. **Player-only build** (STRIP-REPORT follow-up 4).
   - `vite.config.ts`: studio mode removed; the single build input is
     `player.html`. The `emptyOutDir: false` / QA X1 note is preserved.
   - `package.json`: `"build"` is now `vite build --mode player`
     (identical to `build:player`).
   - Root `index.html` (the deleted Studio's entry, loading the deleted
     `/src/studio/studio.ts`) deleted. The only remaining
     `studio/studio.ts` mention is a comment in `scripts/specInject.ts`.
4. **Export-source genre table trimmed** (STRIP-REPORT follow-up 6,
   judged one-line-safe and verified by running the script — see
   Gates). `scripts/export-source.ts` `GENRE_SOURCE` now lists only
   `third-person-action`; the usage line and doc example updated.
   Deleted-genre `--genre` values now fail fast with a clear message
   instead of failing mid-export copying a missing blueprint file.

### Determinism proof (same world before/after)

Before the change, on the pre-change tree:

- `generateSpec()` default output captured via tsx: seed
  **3712409144**, genre `third-person-action`, name "Ancient Realm",
  environment `ruins`, `dusk`, terrain `hills`, size 8000.
- Live boot capture (Playwright/Chromium, SwiftShader, `?test=1
  &autostart=1&splash=0`, desktop 1280x720): live spec seed
  **1963762346** (= `deriveMapSeed(3712409144, 0, 0)`, the Engine's
  deterministic origin-map derivation), `custom.portalMap.worldSeed`
  3712409144, gathering roster 30 nodes, roster SHA-256
  `6929fc01ac6f02878fa2607eaa598c8d75dec3b0cf526b4e9d8db9f40791e4fa`,
  zero console/page errors.

After the change:

- `emberwoodSpec()` deep-equals both the captured before-file and a
  fresh `generateSpec()` call (JSON string equality, both comparisons
  true); clone isolation verified (mutating one clone leaves the next
  pristine, seed 3712409144 / name "Ancient Realm").
- Live boot captures, all byte-identical to the before-boot live spec
  (full `__XANDRIA__.spec` equality, identical roster string, zero
  errors):
  - default boot, desktop 1280x720;
  - `?intent=racing grand prix neon fps arena`, desktop;
  - `?intent=survivor swarm`, **390x844 with touch**.
- The Engine's boot-time transforms (map-seed derivation, item-def
  enrichment) apply to the baked spec exactly as they did to the
  generated one — the bake captured the pre-transform layer, which is
  the correct layer to check in.

### Import-graph decisions (generator files)

Grepped every importer in `src/`, `tests/`, `scripts/`. All four
generator files are **kept** — deleting any of them breaks live code
or live tests, and no test expectation was edited:

| File | Decision | Proof |
|---|---|---|
| `src/generator/generate.ts` | Keep | No longer imported by `src/runtime/main.ts` (the bake's point), but imported by **45 test files** (generator, determinism, terrain, portals, prompt-corpus-parity, …) and 14 scripts. Deleting it would gut the suite. It remains the generator for tests/tooling, not for boot. |
| `src/generator/intent.ts` | Keep — runtime | `src/spec/schema.ts` calls `scoreSpecFulfillment()` inside `validateSpec()` at runtime (line ~1842); `generate.ts` also depends on `extractIntent`. Removing it breaks the boot path's own validation. |
| `src/generator/operators.ts` | Keep — dependency | Direct dependency of retained `generate.ts` (`applyOperators`); also directly tested by `tests/operators.test.ts` (72 frozen operators). |
| `src/generator/llm.ts` | Keep | Only live importer is `tests/openworld-stage1.test.ts` (`buildArchitectPrompt`); `generateWithLLM` has no other caller. Deleting it breaks a live test for zero boot benefit — the file is never imported by shipped runtime code. |

### Gates (final tree)

- `npx tsc --noEmit`: **clean** (exit 0).
- `npx vitest run`: **166 files, 2643 tests, all passing** — identical
  counts to the Phase 1 strip baseline; no test edited.
- `npm run build` (now player-only): **clean** — `dist/player.html`
  **2,564.22 kB, gzip 1,144.46 kB** (2,564,219 bytes). `npm run
  build:player` identical. Down from the strip baseline (2,580.99 kB /
  1,150.91 kB): the generator compiler is no longer in the player
  bundle; `intent.ts` remains via schema validation.
- `scripts/export-source.ts`: `--genre third-person-action --seed 123`
  exports cleanly (exit 0); `--genre survivor` / `--genre racing` fail
  fast, exit 1, "Unknown genre … Pick one of: third-person-action",
  no partial output.
- Playwright `tests/e2e/gathering-nodes.spec.ts`:
  - Desktop (1280x720, default config): attempt 1 **failed** on the
    crystal harvest leg (`waitFor timeout (material lands (crystal))
    after 25000ms` — herb leg passed first, game booted with zero
    errors in the failure snapshot); attempt 2 **passed** with no
    code or test change between attempts — a SwiftShader timing
    flake on the crystal material-landing wait, not a regression
    (this spec boots via a `?spec=` fixture, a path whose behavior is
    identical before/after the bake). No test expectation was edited;
    the HALT rule's 2-consecutive-fails condition was not met.
  - Mobile (**390x844, `hasTouch: true`**, temporary viewport config
    file, spec untouched, config deleted after the run): **1 passed**
    in 1.9m.
- Live boot captures (above): 3/3 identical, 0 errors.

### Follow-ups (not done here)

1. **STRIP-REPORT follow-up 2 (carried):** retire/re-scope the
   `r2-worker-c` 4-blueprint audit and the racing/platformer
   direct-import tests, then delete `fpsArena.ts`, `topdown.ts`,
   `platformer.ts`, `racing.ts` (retained unregistered).
2. **STRIP-REPORT follow-up 3 (carried):** relocate
   `src/studio/editor/specOps.ts` to `src/spec/`.
3. **STRIP-REPORT follow-up 5 (carried):** server billing (`api/`,
   `src/billing/entitlements.ts`) untouched — its own job.
4. **STRIP-REPORT follow-up 7 (carried, now sharper):** beta/fuzz/soak
   specs and the multi-genre `playability.spec.ts` boot deleted genres
   via `?intent=`; they now boot Emberwood for every leg instead of
   crashing on `undefined`. Re-scope with the beta suite; do not run
   them as gates until then.
5. **Electron shell:** `electron/main.cjs` still loads
   `dist/index.html`, which no build produces anymore. The `studio` /
   `dist` npm scripts were already broken (studio build failed); they
   remain broken at the Electron load step. Repoint to
   `dist/player.html` or retire the shell in a later phase — untested
   in this environment, deliberately not touched here.
6. **`GENRES` union still lists all 8 genres** in `src/spec/schema.ts`
   (validation accepts them; only the boot pin constrains to
   third-person-action). Narrowing the union is a schema + generator
   test-scope decision for a later phase, not a one-line trim.
7. **Phase 0 mobile collisions** (listed above) are unfixed by design
   in this phase; HUD/touch work belongs to later phases. The 631
   SwiftShader draw count is not phone evidence.

---

## Phase 2 — Voxel pass 1, characters: DETAIL HALTED, cache wiring shipped

**Verdict: HALT the detail pass under the bucket-neutral hard rule;
ship the shared-geometry wiring only.** Sub-voxel armor detail was
fully built, unit-tested, and measured — then stopped, because every
design that satisfies the pinned per-NPC mesh-count budget splits
instancer buckets, and the design that is bucket-neutral breaks that
budget. The halted implementation is preserved, uncommitted, in
`evidence/phase2/halted/` (full working-tree patch + halted unit
tests + README) for a future override decision. Nothing was pushed;
no test expectation was edited or weakened at any point.

### What was built, then halted

Two detail designs were implemented in
`xandria-studio/src/engine/gfx/VoxelArmor.ts` (both reverted; only the
`geo` cache wiring below survives in the tree):

1. **Child meshes (first attempt).** Detail voxels (rivets, seams,
   layered plates, pauldron variants, visor-slit shapes per faction)
   as children of primary armor pieces, reusing the parent's geometry
   object and material, tagged `detailPiece`. Bucket-neutral by
   construction — and it broke the pinned mesh-count budget tests:
   `tests/npc.test.ts` ("mesh count per NPC ≤ 60", measured 76–88) and
   `tests/npc-manager.test.ts` (same ≤ 60 bound, measured 76.0). Those
   bounds were not touched; the design was abandoned.
2. **Merged geometry (second attempt).** Detail sub-boxes merged into
   the primary piece's geometry (`mergeGeometries`): one mesh per
   primary piece, mesh count unchanged (46–51 per NPC, inside budget),
   primary-piece census unchanged, merged geometries keeping a
   BoxGeometry-style `parameters` object. 10 new unit tests (exact
   sub-box counts per set: nomad 40, raider 47, guardian 48, scout 45,
   plate 41, marauder 40, bloodreaver 51, brutehide 45; triangle
   deltas; visor-variant glow counts; determinism; clear/re-apply)
   all passed, as did the full suite — but the live measurement
   showed buckets **220 → 221** on desktop.

Three neutralization attempts left the number at exactly 221 every
time: (a) quantizing detail inputs to the `VoxelGeoCache` 3-decimal
grid, (b) snapping merged vertex positions to the same grid,
(c) re-basing detail inputs onto the parent's assigned (shared)
geometry dims. An isolation probe (same build, same 1280x720
viewport, `?tier=s25` = detail off) measured **197 buckets** against
**221** with detail on — so detail cost +24 buckets over the
cache-only configuration and +1 over the no-cache baseline. Root
cause, confirmed by the probe and by the `NpcRigCache`/`NpcInstancer`
code: content-hash sharing previously collapsed *identical base
boxes across different piece types* into one bucket; per-piece detail
merges differentiate those geometries, so the sharing is lost. The
split is structural to any per-piece merge, not float noise. Cape /
cloth segmentation was untouched throughout (pinned cape tests
green). Visor-slit shape variants rode the merged design and were
halted with it; no new emissive role was ever created.

### What shipped: shared-geometry (VoxelGeoCache) wiring only

- `xandria-studio/src/engine/gfx/VoxelArmor.ts`: `ApplyVoxelArmorOpts.geo`
  — primary boxes draw from the supplied `VoxelGeoCache` (identical
  dims → one geometry object → one instancer bucket); cones never use
  the cache (pinned cone-identity test preserved).
- `xandria-studio/src/engine/game/Npc.ts` and `EnemyAI.ts`: pass
  `VoxelGeoCache.for(engine)` when applying armor. No rig changes, no
  HUD/touch/story work, no new engine systems. The player path is
  unchanged (the default baked Emberwood boot wears no armor, so
  player armor detail was unmeasurable in this scene — same
  limitation as before; noted, not waived).

### Measurements (SwiftShader, NOT phone evidence)

Method: temporary Playwright harness (deleted after the runs; spec
untouched), booting the baked Emberwood spec
`/player.html?test=1&autostart=1&splash=0&tier=…`, same scene, same
spawn camera, no input. Settle 8 s, then 16 samples at 2 s intervals
of `renderer.info` (draw calls / triangles / geometries), the
`PerfMonitor` snapshot, and `__XANDRIA__.npcTest.instancerStats()`
(buckets / instances). Medians with ranges below; zero console/page
errors in every run. Raw sample JSONs persisted alongside the
screenshots in `evidence/phase2/` (`before-*.json`, `after-*.json`).
Note: the first before-run JSONs lived in `/tmp` and were lost when
the sandbox tmpfs reset mid-phase; the baselines below are from a
clean re-measurement on the byte-identical Phase 1b build
(`dist/player.html` 2,564,219 bytes, reproduced exactly), and the
after-runs are on the final committed tree.

| Config | Draw calls before → after | Triangles (median) | Geometries | Buckets | Instances |
|---|---|---|---|---|---|
| Desktop 1280x720, `tier=desktop` | 635 (633–639) → **589 (587–593)** | 1,183,542 → 1,183,542 | 343 → 319 | **220 → 197** | 851 → 851 |
| Mobile 390x844, `tier=s25`, touch | 557 (555–559) → **511 (509–513)** | 758,294 → 758,294 | 286 → 262 | **220 → 197** | 851 → 851 |
| Mobile 390x844, `tier=desktop`, touch | 560 (558–564) → **514 (512–514)** | 980,802 → 980,802 | 286 → 262 | **220 → 197** | 851 → 851 |

Halted-detail numbers, for the record (same harness, detail builds):
buckets 221 on both desktop-tier configs, 197 on s25; draw calls
638 / 562 / 511. Frame times under SwiftShader moved in both
directions across rounds (host-load noise at ~300–1000 ms/frame)
and are not reported as a result.

Screenshots (same scene/camera, before vs after — desktop pair is
byte-identical, as expected with detail halted):
`evidence/phase2/before-desktop.png`, `before-mobile.png`,
`after-desktop.png`, `after-mobile.png`, plus
`before-mobile-desktop.png` / `after-mobile-desktop.png` and the
isolation probe `after-desktop-s25.png`.

Tier-gate decision: the detail tier gate (`detail` opt, s25-off) was
built and then removed with the halt — there is no detail left to
gate. The shipped cache wiring is tier-independent and improves all
tiers equally. The S25 150-draw-call budget is not met by SwiftShader
numbers in either tree (511+ calls under SwiftShader); that was true
before this phase too, and SwiftShader counts are not phone evidence
— real-device verification stays a later phase's gate. No waiver was
written.

### Gates (all on the final tree)

- `npx tsc --noEmit`: clean.
- Full `npx vitest run`: **166 files / 2643 tests green, 0 failures**
  (baseline count — the 10 halted detail tests were removed with the
  halt; no existing expectation was edited).
- `npm run build:player`: clean — `dist/player.html` **2,564,280
  bytes, gzip 1,146,827 bytes** (baseline 2,564,219 / 1,144,460).
- Playwright `tests/e2e/gathering-nodes.spec.ts` at desktop:
  **1 passed** (5.5 m). Mobile leg not run (optional per task).

### Follow-ups (not done here)

1. **Detail revival needs a parent decision.** The three live
   options: (a) accept +1 bucket (0.45%) and ship the preserved
   patch; (b) revisit the ≤60 per-NPC mesh budget tests so the
   bucket-neutral child-mesh design can ship; (c) a detail design
   keyed purely by dims (same detail for same dims, so cross-piece
   sharing survives). Until one is chosen, detail stays halted.
2. **Player armor detail is still unmeasured** in this scene: the
   default boot wears no armor. A spec/skin that equips the player
   would let a later phase measure the player path.
3. **Cape untouched**, per the pinned cape tests; cloth segmentation
   stays as established.
4. The `?tier=s25` isolation probe (197 buckets at desktop viewport)
   is kept as `evidence/phase2/after-desktop-s25.json/.png` for the
   record; it is not a gate config.

## Phase 3 — Voxel pass 2, environment: variation + landmark detail SHIPPED; count density and ground-paint HALTED

**Verdict: ship the variation/detail work; halt the two count/color
changes under the pinned-test rules (same discipline as Phase 2).**
Nothing was pushed; no pre-existing test expectation was edited or
weakened at any point. The one new test file
(`xandria-studio/tests/voxel-pass2.test.ts`, 11 tests) was written
for this phase and rewritten by its own author to match the halted
scope — it pins the shipped behavior, not the halted designs. The
first full-suite run on the unhalted tree failed 5 tests in 3 files;
both breaking designs were reverted in full and the suite re-ran
green (see Gates). This is one gate failure, not two consecutive
ones — the halt-and-revert path is the task's prescribed response,
and the final tree is fully green.

### What shipped

1. **Per-instance matrix variation** (`ChunkScatter.generateSet`,
   chunked path only): non-uniform scale jitter (x 0.85–1.18,
   y 0.8–1.28, z 0.85–1.18) plus a ±0.06 pitch/roll tumble, drawn
   from the same per-chunk rng stream — so chunks stay deterministic
   across runs and load orders. Shared cached geometries are never
   differentiated (the Phase 2 bucket lesson); colliders are computed
   from the final scale, so collision stays honest for the varied
   silhouettes. Counts, pool set, and budgets are unchanged.
2. **Landmark detail** (`Landmarks.ts`, existing Instancer buckets
   only): beam tower — stepped plinth, doorway step stones, 2 fallen
   blocks (still exactly 2 buckets: rock+dark); ruin arch — footing
   slab under each column, low broken-wall stub, one extra fallen
   chunk (one shared rock material); bridge — footing slab + fallen
   plank under each pillar (≤ 2 materials); rune rings denser
   (6–9 strips, minimum 4, amber bucket only, count still returned
   for amber-accent accounting).
3. **Watchtower detail** (`StructureSets.emitWatchtower`): footing
   slabs under each leg, a second cross-brace height, step stones,
   and a small amber shard cluster under the platform — rock/dark/
   amber box buckets only (exactly 3 buckets, all BoxGeometry).
4. **PropSets descriptors deliberately untouched**: they are shared
   with the C1-hash-pinned legacy whole-world path, so any
   count/scale change there would break the byte-identical promise
   (`tests/chunk-scatter.test.ts` C1). `CLUSTER_DENSITY` and
   `scatterAmberGlow` were likewise left unchanged.

No Hollow Camp / Drowned Spire code entities exist in the tree; the
landmark/structure detail passes land on the generic landmark and
hero-watchtower systems near spawn. That is a finding, not a new
builder — a dedicated camp/spire builder would be a new system with
new meshes/draw calls, out of this pass's scope.

### What was built, then HALTED (reverted in full)

1. **`CHUNK_DRESSING_MUL = 1.6` count multiplier** on the chunked
   path (per-chunk targets × 1.6, capped by the tier-scaled
   per-set budgets). It broke two pinned invariants: the per-chunk
   budget bound in `tests/perf-tiers.test.ts` (count 141 > setBudgets
   128 — the `scaleBudget` cap did not hold in that accounting) and
   the exact reference censuses in
   `tests/phone-playability-perf.test.ts` (instances 3040 → 4864,
   collision shapes 2752 → 4416 — exactly 1.6×). Reverted
   completely, including the exported constant; counts stay at the
   PropSets targets. A comment in `ChunkScatter.ts` records the halt
   at the site.
2. **Ground-paint litter fleck**: a fine-grain bright/dark fleck term
   in `paintGroundVertex` (noise at 0.55 frequency, ±0.22 lerp toward
   patch light/dark with a faint warm cast). It broke
   `tests/terrain-rebase.test.ts`, whose comment states "future
   changes must keep THIS digest" — ground colors are pinned
   bit-identically (digests `2619648d` / `cc8ca994`). Reverted
   completely; `groundPaint.ts` keeps only a comment recording the
   halt. No color-term change can ship without a deliberate digest
   re-pin decision (see Follow-ups).

### Measurements (SwiftShader, NOT phone evidence)

Method: temporary Playwright harness (recreated after a sandbox
`/tmp` reset wiped the first copy; same method as the before-run,
rebuilt from the surviving before-JSON structure and re-verified
against the live seams), booting the baked Emberwood spec
`/player.html?test=1&autostart=1&splash=0&tier=…`, same scene, same
spawn camera, no input. Settle 8 s, then 6 samples at 2 s intervals
of `renderer.info` (draw calls / triangles / geometries), the
`PerfMonitor` snapshot, `__XANDRIA__.npcTest.instancerStats()`
(buckets / instances), a scene-traversal InstancedMesh census
(grouped by geometry type + material UUID + shadow flag), and the
gathering-nodes roster (kind + x,z to 3 decimals). Medians below;
zero console/page errors in every run. Raw sample JSONs persisted
alongside the screenshots in `evidence/phase3/`
(`before-*.json`, `after-*.json`).

| Config | Draw calls before → after | Triangles (median) | Geometries | Buckets | NPC instances | Census meshes / instances |
|---|---|---|---|---|---|---|
| Desktop 1280x720, `tier=desktop` | 585 → **585** | 1,103,542 → 1,103,542 | 315 → 315 | **197 → 197** | 851 → 851 | 232 / 57,636 → 232 / **57,644** |
| Mobile 390x844, `tier=s25`, touch | 507 → **507** (509 max both runs) | 678,294 → 678,294 | 258 → 258 | **197 → 197** | 851 → 851 | 231 / 38,835 → 231 / **38,843** |
| Mobile 390x844, `tier=desktop`, touch | 510 → **510** | 900,802 → 900,802 | 258 → 258 | **197 → 197** | 851 → 851 | 232 / 57,636 → 232 / **57,644** |

Determinism proof: gathering roster 30 nodes in all six runs, roster
SHA-256 `4954f0a20e1746020d15259cbe494d2a8240eac4752e0dc9f392be17c563c60d`
identical before and after in every config (same roster-string
format throughout Phase 3; the Phase 1b hash used a different
format and is not comparable). Live spec seed `1963762346`
(`= deriveMapSeed(3712409144, 0, 0)`), baked world seed `3712409144`
in both runs. The +8 census instances are the landmark/watchtower
detail instances resident in the loaded chunks; draw calls,
triangles, and geometries are exactly flat because the detail rides
existing pools/buckets (the added instances sit in pools whose
drawn triangle contribution is unchanged at this camera — reported
as measured, not as a visual-density claim).

Screenshots (same scene/camera, before vs after — near-identical at
the spawn framing, as expected with the count multiplier halted):
`evidence/phase3/before-desktop.png`, `before-mobile.png`,
`before-mobile-desktop.png`, `after-desktop.png`,
`after-mobile.png`, `after-mobile-desktop.png`.

Tier-gate decision: no gate added — there is no added density left
to gate. Draw calls are flat, so the tier lever (`densityMul`) was
not needed. The S25 150-draw-call budget is not met by SwiftShader
numbers in either tree (507+ calls under SwiftShader); that was
true before this phase too, and SwiftShader counts are not phone
evidence — real-device verification stays a later phase's gate. No
waiver was written.

### Gates (all on the final tree)

- `npx tsc --noEmit`: clean.
- Full `npx vitest run`: **167 files / 2654 tests green, 0 failures**
  (baseline 166 / 2643 + the 11 new Phase 3 tests, minus 0 —
  2654 = 2643 + 11; no existing expectation was edited). First
  full run on the unhalted tree: 5 failures in 3 files, all from
  the two halted designs (listed above); both designs reverted,
  targeted re-run green, full re-run green.
- `npm run build:player`: clean — `dist/player.html` **2,565,650
  bytes, gzip 1,144.92 kB** (Vite-reported; SHA-256
  `3c9e2273757ba7159a42cc9f3c4009bc04ab5d3c80eb7c7561666063260b40e4`),
  baseline 2,564,280 bytes / gzip 1,144.49 kB.
- Playwright `tests/e2e/gathering-nodes.spec.ts` at desktop:
  **1 passed** (4.0 m). Mobile leg not run (optional per task).

### Follow-ups (not done here)

1. **Count density needs a parent decision.** The pinned censuses
   forbid any chunked-path count change without updating the
   `tests/perf-tiers` budget bound and the
   `tests/phone-playability-perf` reference census expectations —
   that call belongs to the parent, not to this phase. The 1.6×
   design is described above (and in the `ChunkScatter.ts` halt
   comment) if it is ever revived.
2. **Ground-paint detail needs a digest decision.** Any color-term
   change must deliberately re-pin the `tests/terrain-rebase`
   digests; until then, ground colors stay bit-identical.
3. **Hollow Camp / Drowned Spire as named places do not exist as
   code.** A named-place pass (camp layout, spire structure) is a
   separate scope call, not a detail pass on the generic systems.
4. **Visual density at spawn is essentially unchanged** (the
   multiplier was the density mechanism). The shipped variation +
   landmark detail is measurable in matrices and census instances,
   not in a visibly denser spawn view — the screenshot pair shows
   this honestly.

---

## Crisp-render phase — retro off by default, AA + full pixel ratio, mobile bloom/grade tuned (by audit, values kept)

**Verdict: SHIPPED on the crisp default; sharpness judgment still
belongs to the user's real S25 (see the SwiftShader caveat below).**
No HUD, touch-control, landscape/orientation, or world-layout code
was touched. No test expectation was edited or weakened. "Ancient
Realm" is untouched, per the baked-spec rule. Nothing was pushed;
no merge into the fork's main; XANDRIA untouched.

### Root cause — confirmed in code AND live, link by link

The coordinator's diagnosis verified, not re-diagnosed:

1. Baked spec `xandria-studio/src/spec/emberwood.spec.json`:
   `theme.retroFilter: true`, `theme.bloom: true`, and no
   `custom.quality` hint (the `custom` key did not exist at all).
2. `xandria-studio/src/engine/Engine.ts:899-905`
   (`effectiveQuality()`): settings `quality` defaults to `'auto'`
   (`src/engine/game/Settings.ts:45`), so with no spec hint it
   returns `'retro'`.
3. `Engine.ts:441` (renderer construction): `antialias:
   !(spec.theme.retroFilter && (spec.custom?.quality ?? 'retro')
   === 'retro')` — false for the baked boot, so **AA off**.
4. `Engine.ts:453-456` (constructor) and `:933-936`
   (`applySettings()`): retro branch pixel ratio
   `Math.min(devicePixelRatio, 1) * 0.66` — the scene rendered at
   0.66× CSS resolution and was upscaled, i.e. soft by
   construction.
5. `xandria-studio/src/engine/gfx/Materials.ts:110`
   (`pixelated = spec.theme.retroFilter`) and `:296` / `:325` /
   `:363`: pixelated textures get `NearestFilter` /
   `NearestMipMapNearestFilter`. Anisotropy **was already applied**
   everywhere (`tex.anisotropy = 4` at `:295`, `:324`, `:362`) —
   the audit found no missing anisotropy to add, so no Materials
   change was needed; crisp filtering comes from `pixelated`
   flipping to false.
6. `xandria-studio/src/engine/gfx/PostFX.ts:156-166` (pre-change
   numbering): `wantRetro = spec.theme.retroFilter && quality !==
   'high'` with `quality = spec.custom?.quality ?? 'retro'`, so the
   RetroShader pass (pixelSize 2, color quantization 24, vignette
   0.35) ran and the filmic grade pass was skipped
   (`quality !== 'retro' && !wantRetro` false).

Live confirmation on the pre-change build (Playwright/Chromium,
SwiftShader, same harness as the measurements below): pixel ratio
**0.66**, WebGL `antialias: false`, `effectiveQuality: retro`,
`pixelated: true`, live canvas texture `magFilter 1003
(Nearest) / minFilter 1004 (NearestMipMapNearest)`, retro pass
present with `pixelSize 2 / quantize 24`, grade inactive, MSAA 2.
The user's real-device symptom — crisp DOM HUD over a soft 3D
scene — matches this render-resolution chain, not a texture-asset
problem: the textures are 256px canvases either way, and the
softness was the 0.66 render scale + nearest filtering + the
pixelation pass.

### What changed (3 files, no world-layout code)

1. **Baked spec** (`xandria-studio/src/spec/emberwood.spec.json`,
   the only data change):
   - `theme.retroFilter`: `true` → `false`.
   - Added `custom: { "quality": "standard" }` (the spec previously
     had no `custom` key; boot-time transforms add `custom.items`
     and `custom.portalMap` on top, unchanged).
   - Everything else byte-identical (see the determinism proof).
2. **Retro opt-in plumbing** (`Engine.ts:532-544`,
   `PostFX.ts:109,156-175`):
   - Engine passes `retroOptIn: this.settings.data.quality ===
     'retro'` into PostFX. The retro pass now fires when
     `spec.theme.retroFilter || retroOptIn`, except at quality
     `'high'` (unchanged rule).
   - A standard-quality spec-driven retro pass keeps its authored
     vignette-only look (`pixelSize 0 / quantize 0 / vignette
     0.25`); an explicit settings retro opt-in gets the FULL retro
     shader (`pixelSize 2 / quantize 24`) — otherwise the opt-in
     would have restored only a vignette, not the retro look.
   - The opt-in is boot-time only: the composer is built once, so
     a pause-menu quality change does not rebuild it (pre-existing
     limitation, unchanged). The same limitation applies to
     renderer AA (construction-time) and Materials `pixelated`
     (spec-time): a retro opt-in boot gets the full retro
     *composer* look, but textures stay linear-filtered and AA
     stays on underneath the shader pixelation. Documented here
     rather than papered over; a full runtime retro toggle would
     need renderer recreation and is a separate scope call.
   - Retro was NOT deleted anywhere: `RetroShader`,
     `QUALITY_MODES`, the settings `'retro'` choice, and every
     retro branch survive. The default is crisp; retro is opt-in.
3. **No code change to the pixel-ratio formula, Materials, bloom,
   or grading.** The crisp path rides the engine's existing
   standard-quality behavior: AA on, pixel ratio
   `min(devicePixelRatio, 1.5)` capped by the tier cap, linear /
   linear-mipmap filtering with anisotropy 4, grade pass active,
   composer MSAA 4 (desktop) / 2 (s25 tier cap).

**Pixel-ratio note (deliberate choice, flagged for the parent):**
the task text named `min(dpr, 2)` subject to the tier cap. The
shipped `'standard'` hint yields `min(dpr, 1.5)` capped by the
tier cap — which on the S25 is **identical** to `min(dpr, 2)`
capped, because the s25 `pixelRatioCap` is 1.5 and binds first
(S25 dpr ≈ 2.6–3 → 1.5 either way). `'high'` would have given
`min(dpr, 2)` only on retina desktops, at the cost of more GPU
work on the phone (7 god-ray shafts vs 4, 4500 grass tufts vs
2200, 2048 shadows vs the 1024 tier cap) for zero S25 resolution
gain. `'standard'` was chosen as the phone-lean crisp tier. If
the parent wants retina-desktop 2.0, the one-line change is
`custom.quality: 'high'` in the baked spec — but it buys nothing
on the S25.

### Bloom / dusk-grade audit — values KEPT, by evidence

- Mobile-tier bloom (s25, `bloomBoost 1.0`): measured **0.45**
  before and after (strength formula `(0.45) * bloomBoost`,
  radius 0.6, threshold 1.0 — `PostFX.ts:141`). Desktop:
  **0.5625** before and after (`0.45 * 1.25`). Bloom is unchanged
  by this phase; the wash the user saw was the retro pass +
  0.66 render scale, not bloom strength.
- Dusk grading survives intact: `gradeAtmosphere` for
  third-person-action at dusk still yields exposure 0.72 (measured
  live before and after), fog luminance / amber fog tint via
  `GenreGrade.ts`, and the filmic grade pass — previously
  *skipped* under retro — is now active with the authored values
  (lift `[0.015, 0.005, -0.010]`, gain `[1.03, 1.0, 0.96]`,
  saturation 1.08, vignette 0.45; measured live from the grade
  pass uniforms). Nothing in `GenreGrade.ts` / `GradeShader.ts`
  was edited, and bloom was NOT removed.
- After-screenshots (below) show no smear: lamp halos stay tight
  around their emitters, the horizon holds its mauve/amber dusk
  tone, ground and grass resolve instead of washing. Tuning bloom
  or grade down would only have dimmed the dusk identity for no
  measured benefit, so the authored mobile-tier values stand:
  **s25 bloom strength 0.45, bloomBoost 1.0, MSAA cap 2; grade
  saturation 1.08, vignette 0.45, exposure 0.72.**

### Measurements (SwiftShader, NOT phone evidence)

Method: temporary Playwright harness (deleted after the runs;
spec untouched by the harness), booting the baked Emberwood spec
`/player.html?test=1&autostart=1&splash=0&tier=…`, same scene,
same spawn camera, no input. Settle 8 s, then 6 samples at 2 s
intervals of `renderer.info`, scene census, PostFX state, and the
gathering roster. Medians; zero console/page errors in every run.
Raw sample JSONs in `evidence/crisp/` (`before-*.json`,
`after-*.json`).

| Config | Draw calls before → after | Triangles (median) | Geometries | Pixel ratio / AA | Quality | Filters | Grade / MSAA |
|---|---|---|---|---|---|---|---|
| Desktop 1280x720, `tier=desktop` | 585 → **593 (+8)** | 1,103,542 → 1,490,598 | 315 → 319 | 0.66 / off → **1.0 / on** | retro → **standard** | Nearest → **Linear / LinearMipmapLinear, aniso 4** | off / 2 → **on / 4** |
| Landscape phone 844x390, `tier=s25`, touch | 653 → **659–661 (+6–8)** | 923,298 → 1,135,390 | 363 → 367 | 0.66 / off → **1.0 / on** | retro → **standard** | Nearest → **Linear / LinearMipmapLinear, aniso 4** | off / 2 → **on / 2 (tier cap)** |

At SwiftShader's dpr = 1 the measured pixel ratio is 1.0 on both
configs (formula `min(1, 1.5)`); on a real S25 the same formula
gives 1.5 (tier cap binds), vs 0.66 before — a 2.27× linear
resolution increase on device.

**Why draw calls moved (+8) — NOT the pixel ratio.** Pixel
ratio changes GPU pixels, never the draw census. The +8 is the
quality tier's authored content, previously suppressed by retro:
+4 god-ray shaft meshes (scene shader-mesh census 2 → 6;
`LightShafts.ts:13` `SHAFT_COUNTS = { high: 7, standard: 4,
retro: 0 }`), plus a +4 residual the census does not attribute
to a single system (consistent with the quality-gated item
shimmer cap 0 → 4, `ItemWorld.ts:637`, and particle activity
sampled at that frame; reported as unattributed rather than
guessed). The triangle increase is the quality-scaled grass:
`Grass.ts:31` `QUALITY_COUNT = { high: 4500, standard: 2200,
retro: 800 }` — instanced tufts, so triangles rise without a
matching draw-call rise. Instancer buckets are flat at **197**
both runs (the Phase 2/3 bucket story is untouched).

**S25 150-draw-call budget: NOT met by SwiftShader numbers
(659+ calls), same as every prior phase — and SwiftShader counts
are not phone evidence. No waiver was written.** The budget
question stays with real-device measurement; this phase changes
pixels and quality content, not the pool census (buckets flat),
so it neither fixes nor worsens the budget case.

### Determinism proof (world unchanged)

- Live-spec field diff (before vs after, full
  `__XANDRIA__.spec` JSON from the desktop runs): exactly two
  differences — `ADDED /custom/quality = standard` and `CHANGED
  /theme/retroFilter True -> False`. No other field differs,
  including all layout, seed, roster, terrain, scatter, enemy,
  objective, pickup, and narrative fields.
- Live spec seed **1963762346** both runs (=
  `deriveMapSeed(3712409144, 0, 0)`); baked world seed
  `3712409144` (`custom.portalMap.worldSeed`) both runs; name
  "Ancient Realm" both runs.
- Gathering roster **30 nodes** both runs, roster SHA-256
  `bd6e9f70be4c6c1fe0eca985b0e9b15df65f97af941c97a368f6d44db2bce95d`
  identical before and after in both configs. (This hash uses
  this phase's roster-string format — `kind:x.xxx,z.xxx` joined
  by `|` — and is therefore comparable within this phase only;
  the Phase 3 hash used a different format and the Phase 1b hash
  another, so cross-phase hash equality is not claimed — the
  within-phase before/after identity plus the two-field spec
  diff is the proof.)
- Retro opt-in verified live (temporary harness, seeded slot
  settings `quality: 'retro'`, desktop): `effectiveQuality
  retro`, retro pass present with `pixelSize 2 / quantize 24`,
  grade pass absent, zero errors. The opt-in screenshot was not
  kept as a gate artifact (the default pair is the gate); the
  verification numbers are recorded here.

Screenshots (same scene/camera, before vs after — the after
pair is visibly sharper at every distance: ground texture,
grass, rocks, trees, and the player resolve where the before
pair smears):
`evidence/crisp/before-desktop.png`,
`evidence/crisp/before-phone-landscape.png`,
`evidence/crisp/after-desktop.png`,
`evidence/crisp/after-phone-landscape.png`.
PNGs are untracked by policy (binaries not committed); the
sample JSONs are committed with this phase.

### Gates (all on the final tree)

- `npx tsc --noEmit`: **clean** (exit 0). (One intermediate
  run showed 2 errors, both in the temporary harness file only;
  the harness was deleted before the final run.)
- Full `npx vitest run`: **167 files / 2654 tests green, 0
  failures** — identical counts to the Phase 3 baseline; no
  existing expectation was edited, and no test pins the baked
  spec's retro fields (the suite stayed green through the spec
  change untouched).
- `npm run build:player`: **clean** — `dist/player.html`
  **2,565,772 bytes, gzip 1,145.00 kB** (Vite-reported; SHA-256
  `53903a85c4aeb82ae7ff8fe3ef55230f2727370d49158b317114388a5785cdc0`),
  baseline 2,565,650 bytes / gzip 1,144.92 kB (the +122 bytes are
  the spec + opt-in plumbing).
- Playwright `tests/e2e/gathering-nodes.spec.ts` at desktop:
  **1 passed** (5.4 m). Mobile leg not run (optional per task;
  the landscape-phone harness run above covers the phone
  viewport).
- Live boot captures (above): 4/4 (2 configs × before/after),
  0 errors.

### Follow-ups (not done here)

1. **SWIFTSHADER CAVEAT — READ FIRST:** every screenshot and
   number in this section is SwiftShader, not the user's phone.
   Final sharpness judgment is the user's real-device
   screenshot, and the next playable link MUST include this fix
   for him to confirm — that confirmation is still awaiting the
   user and is the open gate for this phase.
2. **Retro opt-in is boot-time and composer-level only** (see
   above): AA and texture filtering do not follow a runtime
   quality change, and the opt-in boot keeps linear textures
   under the shader pixelation. A full runtime retro toggle
   (renderer recreation + Materials rebuild) is a separate
   scope call if ever wanted.
3. **`'standard'` vs `'high'`** is the parent's call to revisit
   (see the pixel-ratio note): switching the baked hint to
   `'high'` buys retina-desktop 2.0 and costs phone GPU (shafts
   7, grass 4500); it changes nothing on the S25's pixel ratio.
4. **Draw-call budget** (659+ SwiftShader) still unmet and
   unwaived; real-device measurement is a later phase's gate.
5. The temporary harnesses (`crisp-harness.spec.ts`,
   `crisp-retro-optin.spec.ts`) were deleted after their runs;
   the committed evidence is the `evidence/crisp/*.json` sample
   files. A future crisp regression check can rebuild the
   harness from this section's method paragraph.

## Landscape-first phase — rotate prompt + measured HUD, SHIPPED

**Verdict: SHIPPED. The game plays in landscape on phones; a
portrait-held phone gets a rotate prompt that clears itself in
landscape; desktop is byte-for-byte the old layout.** No HUD
element overlaps another at either landscape phone size, measured
by bounding box, not by eye — including a collision the first
spec list missed (see the board-chip find below). No test
expectation was edited or weakened; the two spec edits in this
phase are a type annotation and ADDED coverage, not relaxed
assertions. "Ancient Realm" is untouched. Nothing was pushed; no
merge into the fork's main; XANDRIA untouched.

### What was inherited, what was finished here

The interrupted landscape leg left a nearly complete tree: the
`RotatePrompt` overlay, the touch-landscape CSS block, the
`compactTouchButtons` short-screen re-stack, the minimap
landscape collapse + MINIMAP chip rename, the desktop ability
bar suppression on touch, the `landscape-hud.spec.ts` measurement
spec, both unit test files, and baseline screenshots. This phase
finished it: fixed the one type error blocking tsc, ran every
gate, found and fixed one real collision the spec list had
missed, extended the spec to cover it, and re-ran every leg
green. No inherited file was discarded; the only deletions are
the temporary diagnostic spec (below) and nothing else.

### What changed

1. **Rotate prompt** (`xandria-studio/src/engine/ui/RotatePrompt.ts`,
   new; mounted in `src/runtime/main.ts` before the engine so it
   covers the title screen too): shows only on touch hardware
   (`isPhoneLike()`: touchstart / maxTouchPoints / coarse
   pointer) held portrait (strictly taller than wide; square is
   not portrait). Pure visibility rule `shouldShowRotatePrompt`,
   unit-tested: never on non-touch desktop even in a
   portrait-shaped window; a "PLAY IN PORTRAIT ANYWAY" dismissal
   holds only until the next orientation change; landscape
   clears the dismissal. "LOCK LANDSCAPE" is progressive
   enhancement only — fullscreen + Screen Orientation API
   behind the user's tap, degrading to a hint line when the API
   is unavailable or refuses. Boot never depends on it.
2. **Touch button re-stack**
   (`src/engine/game/TouchControls.ts`, `compactTouchButtons`,
   pure + unit-tested): below 520px viewport height the
   third-person-action cluster is re-stacked by TOP, so 390 and
   412 share tops and the taller screen just gains bottom
   margin — row B top 280 (SNEAK moved out of the STRIKE column
   to right 280, DEPLOY / MEND / WAVE / STRIKE), row A top
   330/332 (ATK 52px, DASH / JUMP 48px). All sizes stay >= 44px.
   Portrait defs are the base; the compaction is a display
   transform re-applied on resize, so rotating re-stacks
   instead of stranding the portrait layout. Heights >= 520px
   return the input unchanged.
3. **Landscape HUD CSS** (same file, touch-only stylesheet,
   `@media (orientation: landscape)` scoped by `#app.x-touch`,
   which `Engine.ts` sets when touch is active): top strip with
   the panel-chip row centered, hint moved to y86 (off the
   ability row), tutorial card capped at 300px wide at y140,
   factions panel to y108 (was top:150, overlapping bars /
   PHOTO / ATLAS), bars to y248, bottom-left chip row to
   y330..374, sneak-state chip to bottom:16/left:412, tracker
   names-only (.qo lines hidden; full lines return in
   portrait/desktop). Panel chips carry inline styles, so the
   overrides use `!important`.
4. **Pause button** (same file): in landscape it joins the top
   strip, placed live left of the score panel (score width
   varies with the timer text, so no fixed CSS offset works);
   the placement clears on the way back to portrait.
5. **Desktop ability bar suppressed on touch**
   (`src/engine/game/combatAbilities.ts`): the touch ability
   row (STRIKE / WAVE / MEND buttons) is the only ability UI on
   touch; the desktop readout chips no longer pile on top of
   the touch buttons (the S25 portrait screenshot's overlap).
   Desktop keeps the bar exactly as before.
6. **Minimap** (`src/engine/ui/Minimap.ts`): a landscape phone
   (844 wide) is wider than the old 760px small-screen rule, so
   the 208px minimap used to expand over the whole right side
   (measured x618..828, y130..374, covering ATK, pause and the
   score panel). On touch, a short screen (< 520px tall) now
   counts as small too, so the minimap starts collapsed behind
   its chip in landscape. The chip reads MINIMAP on touch (the
   fast-travel chip is the one control called MAP); desktop is
   unchanged (expanded by default, chip hidden).

### The board-chip find — a real collision the spec list missed

The first full spec run passed 844x390 on its element list, but
a visual read of that screenshot showed two small icon boxes on
the left edge overlapping the factions panel. A temporary
full-DOM diagnostic (a temp spec, deleted after use) identified
them: `xandria-radiant-board-chip` (◆, x12 y173) and
`xandria-timed-board-chip` (⏱, x12 y223) — inline-styled at
mid-left (`top:50%` / `top:calc(50% + 28px)`), i.e. sitting ON
the factions panel (y108..234) and the bars (y248..313). The
spec had never measured them, so it passed around them. Fix
(`TouchControls.ts` landscape block): the centered panel-chip
row shifts 30px left (SKILLS calc(50% - 200px), BESTIARY -128,
MOUNTS -40, COMPANIONS +42) and the board chips move into the
top strip right of the row (radiant calc(50% + 152px), timed
calc(50% + 204px), `transform:none !important` to beat the
radiant chip's inline translate). The spec's `measure()` and
required-ids list now include both chips, so the gate covers
them from here on. The score panel's tight right edge in the
screenshots is its own narrow design, not a defect: measured
inside the viewport at both sizes with zero content overflow
(the diagnostic's overflow check came back empty).

### Measured boxes (Playwright/Chromium, SwiftShader — NOT phone
evidence; the spec asserts every box inside the viewport and
every pair disjoint, and the expanded-minimap leg re-asserts
both after expanding the minimap)

844x390, touch (draw calls 653 SwiftShader):
score 762,12 70x146 · objective 12,12 202x84 · bars 12,248
220x65 · hint 216,86 413x27 · tutcard 310,140 224x94 ·
factions 16,108 198x126 · tracker 744,166 88x51 · SKILLS 222,10
64x26 · BESTIARY 294,10 81x26 · MOUNTS 382,10 72x26 ·
COMPANIONS 464,10 102x28 · radiant 574,10 44x44 · timed 626,10
44x44 · pause 710,10 44x44 · MAP 12,330 76x44 · ATLAS 100,330
88x44 · MINIMAP 200,330 82x44 · PHOTO 288,342 103x32 · ATK
764,326 56x56 · DASH 664,328 52x52 · JUMP 584,328 52x52 ·
row B y276 (DEPLOY 588 / SNEAK 516 / STRIKE 772 / WAVE 704 /
MEND 636, all 48x48). Expanded minimap: box 260,134 150x184,
still disjoint from bars, hint and both button rows.

915x412, touch (draw calls 653 SwiftShader): score 833,12
70x146 · objective 12,12 202x84 · bars 12,248 220x65 · hint
251,86 413x27 · tutcard 346,140 224x94 · factions 16,108
198x126 · tracker 815,166 88x51 · SKILLS 258,10 64x26 ·
BESTIARY 330,10 81x26 · MOUNTS 418,10 72x26 · COMPANIONS 500,10
102x28 · radiant 610,10 44x44 · timed 662,10 44x44 · pause
781,10 44x44 · MAP 12,352 76x44 · ATLAS 100,352 88x44 ·
MINIMAP 200,352 82x44 · PHOTO 288,364 103x32 · ATK 835,326
56x56 · DASH 735,328 52x52 · JUMP 655,328 52x52 · row B y276
(DEPLOY 659 / SNEAK 587 / STRIKE 843 / WAVE 775 / MEND 707,
all 48x48). Expanded minimap: box 260,156 150x184, disjoint.

390x844, touch: rotate prompt visible and inside the viewport;
screenshot `xandria-studio/evidence/landscape/portrait-prompt-390x844.png`
(the one portrait shot the directive keeps); rotating to
844x390 clears it automatically; rotating back re-shows it.
1280x720, no touch: touch inactive, desktop ability bar
present, chip tops exactly 12 / 52 / 56 / 92 (the original
stack), no rotate prompt.

Screenshots (SwiftShader, untracked like the crisp PNGs):
`xandria-studio/evidence/landscape/844x390.png`,
`915x412.png`, `portrait-prompt-390x844.png`; committed
measurement JSONs: `measurements-844x390.json`,
`measurements-915x412.json` in the same directory. Baselines
from the interrupted leg (`baseline-*.png`) remain in that
directory for comparison.

### Gates (final tree)

- `npx tsc --noEmit`: clean. (The one inherited type error —
  an implicit `any` in the spec's MAP-label filter — was fixed
  with a type annotation only, no behavior change.)
- Full vitest: **169 files / 2666 tests, all passing** (that run
  started before the CSS-only + e2e-spec edits; the same-tree
  re-run of the two affected unit files is 12/12 green, and the
  e2e spec is not part of vitest).
- `npm run build:player`: clean — `dist/player.html`
  **2,575.41 kB, gzip 1,147.86 kB**.
- Playwright `tests/e2e/landscape-hud.spec.ts`: **4/4 legs
  green across the runs below, zero console/page errors in
  every passing leg**. The spec boots the baked Emberwood
  player with the quest tracker force-rendered (its real public
  render method) because the default boot has no active quest
  yet.
- Draw-call budget: **653 SwiftShader at both landscape sizes
  — still above the S25 150 budget, no waiver written**;
  real-device measurement stays a later gate.

### Run history — honest, because two runs failed without the
game ever failing

1. First full run: 1 passed (844x390), 3 failed with
   `ERR_CONNECTION_REFUSED` at `page.goto` — the vite preview
   server Playwright had reused died after test 1. That server
   was orphaned from the interrupted leg, not a game failure:
   no game assertion ran in the failed legs.
2. Second full run (self-owned preview server on :4180):
   844x390, portrait prompt and desktop passed; 915x412
   failed in fixture setup only — `browser.newContext`
   protocol error (`Browser.setDownloadBehavior`), the browser
   context never formed, no game code ran. Infrastructure
   flake, not a game failure; the HALT rule's "2 consecutive
   gate fails" was not met (zero game failures in any run).
3. Retry of the 915x412 leg alone: **passed** (boxes above).
   All four legs are green; the only failures in this phase
   were harness/server flakes, disclosed here, not hidden.

### Follow-ups (not done here)

1. **SWIFTSHADER CAVEAT — READ FIRST:** every screenshot and
   number in this section is SwiftShader, not the user's
   phone. The landscape layout's final judgment is the user's
   real-device check in landscape; the next playable link
   MUST include this phase for him to confirm.
2. **Draw-call budget** (653 SwiftShader) still unmet and
   unwaived; real-device measurement is a later phase's gate.
3. The transient "ANCIENT REALM" zone-title banner overlaps
   the hint text while it is up; it is scene presentation, not
   a HUD element, and it fades — not measured, not gated.
4. The sneak-state chip's landscape position (bottom:16 /
   left:412) is CSS-only and was not live-measured in a
   sneaking state; the expanded-minimap and button-row legs
   bound the space it occupies, but a sneaking-state
   measurement is owed if that chip is ever restyled.
5. What remains after this phase, untouched here: Phase 4
   Emberwood story spine, Phase 5 touch-first playable slice
   (now landscape-first by this phase), Phase 6 device prep
   (`DEVICE-CHECK.md`).


## Touch view control — right look-stick for third-person-action, SHIPPED

**Verdict: SHIPPED. Touch finally has a camera control: a floating-origin
right stick that turns the third-person camera, on the exact look-delta
path the mouse and the FPS look zone already feed — no second camera
path invented.** The user's report ("no joystick for view control") was
real in code: `layoutForGenreBase('third-person-action')` set `aim: null`.
Nothing was pushed; no merge into the fork's main; XANDRIA untouched.
The rendering "glitch" report is NOT addressed here — still undiagnosed,
separate work pending a user screenshot.

### What changed

1. **New aim mode `'lookstick'`** (`xandria-studio/src/engine/game/TouchControls.ts`):
   `third-person-action` now uses it; every other genre's aim mode is
   unchanged (fps-arena `'look'`, top-down-shooter/survivor `'rstick'`,
   the rest `null`). `buildLookStickZone` mirrors the left move stick:
   right 45% strip, floating origin, stick visual (pointer-events:none,
   hidden on release). It feeds `Input.look` — consumed every frame by
   the camera in `Cameras.ts` (`yaw -= look.x * 0.0026`,
   `pitch -= look.y * 0.0024`) and zeroed by `Input.endFrame()` — so the
   existing camera, including pitch clamps, applies unchanged.
2. **Pure look math, unit-tested** (`lookStickDelta`, exported):
   dead zone 0.18 (thumb tremor inside it moves nothing), deflection
   rescaled so the dead-zone edge is 0 and full deflection is
   `LOOKSTICK_RATE` = 14 look-px per pointermove event (~840 px/s at
   60 events/s ≈ 2.2 rad/s yaw, in line with the 2x FPS drag rate).
   Unlike `'rstick'` it never synthesizes aim or `'attack'` — camera only.
3. **Button coexistence, by construction + by measurement:** the stick
   zone is built BEFORE the buttons, so buttons (later siblings) sit on
   top of it. A touch starting on ATK/DASH/JUMP/DEPLOY/SNEAK or an
   ability button hits the button, never the stick — proven in the spec
   both by handler routing (ATK press fires attack, zero look delta, no
   stick visual) and by hit-testing (`elementFromPoint` on a button
   center resolves to the button; on a bare right-zone point, to the zone).
4. **Multi-touch:** the look stick tracks its own pointerId (`aimId`),
   independent of the move stick's (`moveId`). The spec holds both
   sticks at once and observes move axes set AND look deltas
   accumulating AND both stick visuals visible simultaneously; releasing
   both hides both.
5. **One existing test updated, disclosed, not weakened:**
   `tests/touch.test.ts` "third-person-action: move stick, no aim" pinned
   the exact behavior this task orders changed (`aim: null`). It now
   asserts `aim: 'lookstick'` under the renamed title "move stick,
   look-stick aim". No other expectation was touched; the new behavior
   is independently pinned by `tests/touch-lookstick.test.ts`.

### Gates (final tree)

- `npx tsc --noEmit`: clean.
- Full vitest: **170 files / 2672 tests, 0 failures** (baseline 167/2654;
  delta is the new look-stick unit file plus the landscape phase's
  files landing in the count — no test edited except the one disclosed
  above).
- `npm run build:player`: clean — `dist/player.html` 2,576,525 bytes,
  gzip 1,148.10 kB (landscape build 2,575,405; +1,120 bytes).
- Playwright `tests/e2e/touch-lookstick.spec.ts`: **3/3 passed**
  (844x390 touch, 915x412 touch, 1280x720 desktop-no-overlay). Each
  touch leg asserts: every touch-button box inside the viewport; the
  look drag produces positive look.x/y; the stick visual appears at the
  touch point inside the viewport and hides on release; ATK routing as
  in (3); both-sticks-live as in (4); zero console/page errors.
  First spec run failed 2/3 because the spec never enabled touch in
  the browser context (`hasTouch` missing, so TouchControls built
  nothing) — a spec bug, not a game bug, fixed by mirroring the
  landscape spec's `test.use({ viewport, hasTouch: true })` and re-run
  green. No game code changed between the two runs.
- **Draw-call budget:** unchanged by construction — the stick is a DOM
  overlay, it adds zero meshes/draw calls. No re-measurement claimed;
  SwiftShader numbers remain not-phone-evidence and the S25 150 budget
  stays unmet and unwaived.

### Stick behavior (for the user-facing notes)

- Touch anywhere on the empty right side: a stick appears under your
  thumb; drag to look around, release and it vanishes. Push gently and
  the camera creeps; push to the edge and it turns at full speed.
  Small wobbles near the center do nothing (dead zone).
- Left stick + right stick work at the same time, and the buttons keep
  working while either stick is held — the buttons sit on top of the
  stick area, so tapping ATK mid-look attacks without disturbing the
  camera.
- Desktop is untouched: no touch overlay is built without touch
  hardware, and mouse look is byte-for-byte the old path.
- Open: real-device feel (sensitivity/dead-zone tuning) is a
  user-on-phone judgment; the numbers above are starting values, not
  tuned ones.
