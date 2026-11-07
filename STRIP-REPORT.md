# VoxBox: Amberfall — Phase 1 Strip Report

Branch: `voxbox/phase1-strip` (from `7db1e15`, "Merge status-effects
(2026-10-28)"). No merge into the fork's main; no pushes anywhere.
Working tree left clean on the branch (only untracked `RPG-FORK-PLAN.md`
predates this work and was never touched).

## Method (import-graph evidence)

Before deleting anything, every `from '…'` / `import('…')` in
`xandria-studio/src` was parsed with alias resolution (`@spec`, `@engine`,
`@blueprints`, `@generator` → their `src/` dirs) and resolved to files.
Kept code = `src/engine/`, `src/runtime/`, `blueprints/tpAction.ts` and its
shared deps. A candidate file was deleted only if zero kept-code files
imported it, plus its now-dead tests/specs. `tsc --noEmit` was run after
each slice; the full gates ran on the final tree. No test expectation was
edited at any point. One deletion round (fpsArena/topdown) failed a gate
and was restored — see "Restored" below.

## Removed (27 files, 7,281 deletions)

Studio (11 files — zero kept-code importers; the whole Studio UI, its
editor/inspector/creators panels, auth, billing UI, tier gate, upload UI):

- `xandria-studio/src/studio/auth.ts`
- `xandria-studio/src/studio/billing.ts`
- `xandria-studio/src/studio/creators/itemEditor.ts`
- `xandria-studio/src/studio/creators/skinCreator.ts`
- `xandria-studio/src/studio/editor/editorPanel.ts`
- `xandria-studio/src/studio/inspector/inspectorPanel.ts`
- `xandria-studio/src/studio/inspector/specInspector.ts`
- `xandria-studio/src/studio/itemsPanel.ts`
- `xandria-studio/src/studio/studio.ts`
- `xandria-studio/src/studio/tierGate.ts`
- `xandria-studio/src/studio/uploadUI.ts`

Generator (1 file):

- `xandria-studio/src/generator/seedSet.ts` (only importer was
  `src/studio/studio.ts`; its test went with it)

Genre blueprints (3 files — only importer was the registry
`blueprints/index.ts`, trimmed in the same slice):

- `xandria-studio/src/blueprints/endlessRunner.ts`
- `xandria-studio/src/blueprints/survivor.ts`
- `xandria-studio/src/blueprints/towerDefense.ts`

Dead tests/specs (8 files, subjects deleted above):

- `xandria-studio/tests/billing-tiergate.test.ts`
- `xandria-studio/tests/billing/auth-phase1.test.ts`
- `xandria-studio/tests/billing/gate-action.test.ts`
- `xandria-studio/tests/qa-signin-ui.test.ts` (studio sign-in UI helpers)
- `xandria-studio/tests/editor.test.ts`
- `xandria-studio/tests/editor-xss.test.ts`
- `xandria-studio/tests/inspector.test.ts`
- `xandria-studio/tests/seedSet.test.ts`
- `xandria-studio/tests/e2e/blueprint-rollout.spec.ts` (multi-genre
  parity spec; its tpAction legs duplicate coverage in the dedicated
  dynamic-events / crafting / gear-salvage specs)

Registry trim (`xandria-studio/src/blueprints/index.ts`, the only
hand-edited source file): `BLUEPRINTS` and `GENRE_LABELS` now contain
only `third-person-action`. The `Record<Genre, …>` shape is kept via a
cast so `src/runtime/main.ts` (`BLUEPRINTS[spec.meta.genre]`) compiles
untouched — no kept code was refactored. `platformer`/`racing` were
also removed from the registry (their files are retained, see below,
so they can no longer boot through the player).

## Retained, with reason

- `src/generator/generate.ts` — imported by kept code: `src/runtime/main.ts`
  uses `generateSpec()` for the `?intent=` path AND the default boot spec
  ("a heroic knight adventure through ancient forest ruins at dusk").
  Removing it means refactoring the boot path, which this phase forbids.
- `src/generator/intent.ts` — imported by kept code: `src/spec/schema.ts`
  calls `scoreSpecFulfillment()` at runtime (line ~1842), and
  `generate.ts` depends on it.
- `src/generator/operators.ts` — no direct kept importer, but it is a
  direct dependency of retained `generate.ts`; deleting it breaks the
  typecheck. Retained as a dependency of retained code.
- `src/generator/llm.ts` — no kept-src importer, but `tests/openworld-stage1.test.ts`
  (a live engine test) imports `buildArchitectPrompt` from it. Deleting
  it breaks a live test; retained.
- `src/billing/entitlements.ts` — no kept-src importer, but `api/_lib/subscriptions.ts`,
  `api/generations.ts`, and `api/me.ts` value-import `isPaidActive` etc.
  The server billing backend is out of this phase's scope; deleting it
  breaks `tsc` (tsconfig includes `api/`). The `api/` dir and the
  `tests/billing/` api tests are untouched.
- `src/studio/editor/specOps.ts` — RESTORED after slice 1 broke `tsc`:
  despite living under `studio/`, it is generic spec-manipulation infra
  (cloneSpec, getAtPath/setAtPath, ASSET_GROUPS, applyAssetControl, skin
  accent ops) importing only `@spec` + engine code, and two live engine
  tests (`openworld-stage1`, `skins-beauty`) import it. It is the sole
  remaining file under `src/studio/`. Follow-up: relocate it to
  `src/spec/` in a later phase.
- `src/blueprints/fpsArena.ts`, `src/blueprints/topdown.ts` — RESTORED
  after the full vitest gate failed: `tests/r2-worker-c.test.ts`
  ("blueprints grant XP before recording the kill (4 combat blueprints)")
  source-audits `['fpsArena', 'tpAction', 'topdown', 'platformer']` via
  readFileSync. Editing that list would be editing a test expectation,
  so the files were restored. They are NOT re-registered: the game still
  boots only tpAction. Follow-up: when that audit test is retired or
  re-scoped by its owner, these two files can go.
- `src/blueprints/platformer.ts`, `src/blueprints/racing.ts` — retained
  (unregistered): the mixed live test file `tests/beta-fixes.test.ts`
  imports `buildPlatformer`/`buildRacing` directly, and
  `tests/racing-lap.test.ts` / `tests/vehicle-polish.test.ts` build the
  racing blueprint. Deleting them would require editing or deleting
  live tests. Same follow-up as fpsArena/topdown.
- Shared deps `blueprints/common.ts`, `itemKit.ts`, `fx.ts`,
  `dressing.ts`, `campaign.ts`, `bosses.ts`, `enemies.ts` — all kept;
  the import graph shows them live from tpAction/engine. No dead shared
  dep was found.

## Restored during the work (gate-driven, per the rules)

1. `src/studio/editor/specOps.ts` — slice 1 `tsc` failed
   (`openworld-stage1.test.ts`, `skins-beauty.test.ts` import it).
   Restored; slice 1 re-verified clean.
2. `src/blueprints/fpsArena.ts`, `src/blueprints/topdown.ts` — full
   vitest failed 1/2643 (`r2-worker-c.test.ts` source audit, ENOENT).
   Restored unregistered; the single test file re-ran 14/14, then the
   full suite re-ran green.

## Identity changes (small, safe)

- `xandria-studio/package.json`: `name` `xandria-studio` →
  `voxbox-amberfall`; `description` → "VoxBox: Amberfall — standalone
  voxel RPG built from the XANDRIA engine."
- `README.md`: first title line `# XANDRIA` → `# VoxBox: Amberfall`.
- NOT done (deferred): `window.__XANDRIA__` seams and `XANDRIA`
  identifiers in code/e2e — renaming them would churn every e2e spec.
  Follow-up for a later phase.

## Gates (final tree, branch `voxbox/phase1-strip`)

- `npx tsc --noEmit`: clean (exit 0), run after every slice and on the
  final tree.
- `npx vitest run`: **166 files, 2643 tests, all passing** (baseline on
  `7db1e15` was 174 files / 2727 tests; delta is exactly the 8 deleted
  test files, 84 test cases — no test was edited).
- `npm run build:player`: clean — `dist/player.html` 2,580.99 kB,
  gzip 1,150.91 kB (1,153,055 bytes). Baseline was 2,666.04 kB /
  1,175.36 kB; the strip shrinks the player bundle.
- Playwright `tests/e2e/gathering-nodes.spec.ts` (tpAction gameplay:
  seeded roster, harvest, regrow, portal state, minimap — the spec used
  for the 18-phase wave spot check): **1 passed**, zero console/page
  errors asserted by the spec.

## Follow-ups

1. Bake the default spec / constrain the generator: `main.ts` still
   boots through `generateSpec()`; a `?intent=` for a deleted genre now
   yields `BLUEPRINTS[genre] === undefined` at runtime (cast registry).
   A later phase should bake the Amberfall spec (or pin the generator
   to `third-person-action`) — that refactor belongs to its own phase,
   not this strip.
2. Retire/re-scope the `r2-worker-c` 4-blueprint audit and the
   racing/platformer direct-import tests, then delete
   `fpsArena.ts`, `topdown.ts`, `platformer.ts`, `racing.ts`.
3. Relocate `src/studio/editor/specOps.ts` to `src/spec/` (shared
   infra living under a deleted tree's path).
4. Studio build is dangling: `index.html` still loads
   `/src/studio/studio.ts` and `vite build --mode studio` no longer
   has an entry point. `npm run build` (player + studio) will fail on
   the studio half; `build:player` is unaffected. Remove or repurpose
   `index.html` + the studio build mode in a later phase.
5. Server billing (`api/`, `src/billing/entitlements.ts`) is untouched;
   a server-side strip is its own job.
6. `scripts/export-source.ts` still lists the deleted genres in its
   genre table (string data, no module import — tsc is unaffected, but
   the export script will fail at runtime for those genres).
7. `tests/e2e/beta/` bot/fuzz/soak specs boot deleted genres via
   `?intent=` and will fail if run (`npm run test:beta`); they were
   left in place as stale, to be re-scoped with the beta suite.
