# VoxBox: Amberfall — BUILD-RECOVERY

Rebuild the stylized v1.0 game and APK from a surviving checkout.
This document, the decision log (`DECISION-LOG.md`), and the QA
report (`QA-REPORT.md`) are the program's wipe-proofing: they live
in the repo tree so they travel with the code.

## Honest limit, first

This branch has **never been pushed** (program constraint: local
commits only, no push/merge/publish without the user's separate
word). These docs rebuild the APK from a **surviving checkout**;
they are NOT a backup of the code. If this checkout itself is
lost, the branch is lost with it. Making recovery real against a
full home wipe means backing up this checkout somewhere durable —
or pushing on the user's word. That decision is the user's, not
this program's.

## Checkout

- Repo: `~/workspace/voxbox-amberfall/`
- Branch: `voxbox/mobile-first`
- Game code: `xandria-studio/src/` (NOT the fork root)
- Spec (sole source of truth): `xandria-studio/src/spec/emberwood.spec.json`
  (`src/spec/emberwood.ts` just deep-clones this JSON)
- Player entry: `xandria-studio/player.html` → `src/runtime/main.ts`
- Phase/commit map (all local, in order):
  - Phase 0 audit: `bcde0a6`
  - Phase 1 breakout B1–B7: `e1e71ff`, `68ab94e`, `fff2e4d`,
    `b7280ae`, `65c196e`, `9b74e2c`, `82f74cf`; verification `1f609bb`
  - Phase 2 gameplay: `94347dc`, `2eb647a`, `ee1b208`, `72c6dbc`,
    `d9626f2`, `fa7e683`; verification `d5112e5`
  - Phase 3 max-quality: `2cab474`, `8696604`, `7c3e103`, `43b44e9`;
    verification `b6d43bf`
  - Phase 4 beta/bug: `4892c82`, `3568b24`, `e9b4dd5`, `08d7af7`;
    Phase 4b glow: `6e05066`; verification `ef236bd`
  - Phase 5 APK: `51268bf`; verification `a4f07ac`
  - Phase 6 (this document + QA report): this commit
  - Realism phase (2026-11-02, sole writer, after the
    stylized APK): R1 `d3fe2ca`, R2+R3 `b334385`,
    docs `4ba31d4`, re-pins `888014c` + `6bacda5`,
    APK parameterization `39eac1a`, D-035 `a551dab`;
    realism docs (QA report + this document + D-036 +
    HUD probe tool): this commit
- Standing tree notes: the parent's `VISUAL-TARGET-PLAN.md`
  modification ("SUPERSEDED" annotation) is deliberately
  uncommitted — leave it alone. Most `evidence/` files are
  deliberately untracked (standing practice); the committed
  evidence sets are `evidence/phase4/` and `evidence/phase4b/`.

## Toolchain (as used for v1.0)

- node v24.22.1, npm, vite 6.4.3, vitest 2.1, three 0.182
- Playwright Chromium cached at `~/.cache/ms-playwright/`
  (chromium-1243/1248 headless shell); probes use
  `--use-angle=swiftshader --enable-unsafe-swiftshader
  --no-sandbox --disable-gpu-sandbox`
- Android SDK at `~/android-sdk`: build-tools **35.0.0**,
  platform **android-35** (36.1.0 also installed; the
  v1.0 build used 35.0.0)
- JDK 17 at `~/jdk17` (login shells put it on PATH; ad-hoc
  `apksigner` runs from a non-login shell need
  `PATH=~/jdk17/bin:$PATH` — the first coordinator
  apksigner attempt failed with `java: not found` for
  exactly this reason; `apk/build.sh` sets its own PATH,
  so the script itself is immune)
- `/tmp` is a 512 MB tmpfs — never stage builds or durable
  evidence there (a VM replacement wiped `/tmp` run logs
  mid-Phase 4; only committed JSONs are cited for beta
  results)

## Rebuild the game

```sh
cd ~/workspace/voxbox-amberfall/xandria-studio
npm run build        # vite build --mode player → dist/player.html
```

v1.0 tree: `dist/player.html` 2,589,384 bytes, single-file
(vite-plugin-singlefile inlines JS/CSS). Size will vary with
code changes; what must hold is single-file + no external
fetches (see QA-REPORT.md for the v1.0 grep result).
Realism tree: `dist/player.html` 3,086,678 bytes
(+497 KB, mostly the 4 WebP ground layers ~370 KB +
leaf map/normal + shader/code); same single-file shape.
Realism gate evidence (untracked, standing practice):
`evidence/realism/` — baseline-* vs realism-* capture
JSONs/PNGs (spawn + forest, 3 configs each) and
`hud-overlaps.json`; HUD probe committed at
`xandria-studio/tools/probe-hud-overlaps.mjs`.

## Rebuild the APK

```sh
cd ~/workspace/voxbox-amberfall/apk
./build.sh
```

The script (direct SDK tools, no Gradle — adapted from
`~/workspace/surface-wars/apk/build.sh`): copies
`dist/player.html` to `apk/assets/game/player.html` and
`cmp`-verifies it byte-identical (aborts on any difference),
then javac → aapt2 compile/link → d8 dex → aapt add
classes.dex → zipalign → apksigner sign → apksigner verify
→ zipalign check → badging dump, and copies the APK to
`~/workspace/your_files/VoxBox_Amberfall_v1.0.apk`,
printing byte count + SHA-256.

- Identity (defaults in the script): package
  `com.skit.voxboxamberfall`, versionCode 1, versionName 1.0,
  minSdk 28, targetSdk 35, landscape, fullscreen,
  hardwareAccelerated, WAKE_LOCK only, no INTERNET.
- For a NEW version (realism phase, commit `39eac1a`):
  the script takes `VERSION_CODE` / `VERSION_NAME` /
  `APK_NAME` env vars (defaults reproduce v1.0
  identity); the realism APK was built as
  `VERSION_CODE=2 VERSION_NAME=1.1
  APK_NAME=VoxBox_Amberfall_realism.apk ./build.sh`
  → 1,548,843 bytes, SHA-256 d566c1ee…e3a, same
  debug keystore, installs over v1.0. Never ship two
  versions under one filename; never overwrite the
  v1.0 file.
- Keystore: `apk/debug.keystore`, alias `voxboxamberfall`,
  store/key pass `android` (debug convention), committed
  in the repo (debug-only). Cert SHA-256:
  `F4:F7:F6:50:90:C5:0A:E5:79:22:21:B6:A0:B3:B9:49:32:FA:05:86:A1:5F:1E:47:7D:23:68:21:78:A8:8B:B1`.
  **Future VoxBox updates MUST reuse this keystore to
  install over v1.0.** There is no shared cross-game
  debug keystore (Surface Wars, STARFALL, Scrap Dungeon
  each carry their own). Release signing is a user-only
  step, never this script.

## Re-run the gates

```sh
cd ~/workspace/voxbox-amberfall/xandria-studio
npm run test          # v1.0 tree: 183 files / 2,724 tests, all pass
npx tsc --noEmit      # exit 0
```

- Capture harness (medians of 8, zero console errors):
  `node tools/capture.mjs <outDir> <tag> [spawn|forest|both]`
  (spawn = baked spec; forest = same spec with
  `theme.environment='forest'` via `?spec=` base64url).
  Gate configs: 844×390, 915×412, desktop.
- Victory/DEFEATED spec (the full core-loop proof):
  `npx playwright test tests/e2e/victory-path.spec.ts`
  — run ALONE on a quiet box, AFTER a fresh `npm run
  build` (it serves `dist/` via vite preview on port
  4180). Takes ~40 min (SwiftShader). 3 tests: beacon
  VICTORY, hunt VICTORY, death DEFEATED.
- **Quiet-box rule (binding):** never run the suite
  concurrently with captures/playthroughs. A CPU-starved
  SwiftShader run produces fake results (chunk-residency
  snapshots, 81 s page gotos, 11.8 s/frame bots). Suspect
  runs are discarded and re-run on a quiet box, never
  accepted.
- **SwiftShader numbers are NOT phone evidence.** The
  S25 150-draw real-device gate stays open until a real
  phone runs the APK; label it as such, never as met.

## Gotchas recorded during the program

- Keep Java comments ASCII: em-dashes in
  `MainActivity.java` comments broke javac's default
  US-ASCII encoding (fixed by replacing with hyphens).
- `waitForFunction(fn, null, {timeout})` — Playwright
  options are the third argument, not the second.
  Screenshots: `animations:'disabled'` + 300 s timeout
  with one retry.
- Median-to-median tris deltas are confounded by
  ±2–4-chunk residency (±20,000 tris ≈ 1 chunk); the
  instance-count delta is the trustworthy proof of a
  scatter change (B3 grass: 137,379 → 182,019, exactly
  the +44,640 tuft increase).
- No test assertion changes, except a terrain-rebase
  digest update a workstream genuinely requires —
  deliberate, named, justified in the test comment,
  flagged in the report. Never silently edit a pin.
  (This is why the bloom threshold stays 1.15 — see
  D-018. The 1.25 move needs an explicit parent
  exception.)
- Do NOT touch `engine/game/voxelGeo.ts` /
  `engine/gfx/VoxelArmor.ts` (voxel cape pinned by its
  own art-direction tests). Do NOT change spec
  `timeOfDay` away from `dusk`. Phase-3 litter fleck
  (0.55 freq) stays OUT.

## Asset provenance (complete)

**No assets were downloaded in Phases 1–5.** All visuals
are procedural/engine-generated; the launcher icon
(`apk/res/mipmap-xxxhdpi/ic_launcher.png`, 11,443 bytes)
is a simple generated amber/voxel PNG. No third-party
assets, no licenses to track, nothing pirated or
unclear-license. The only third-party code is the
engine's own three.js bundle (already in-repo) and one
GLSL comment citing the GGX VNDF paper (Heitz 2018,
comment only, not a fetched asset). The splash overlay's
"make your own →" link points to the XANDRIA generator
page on the web; in the APK wrapper it is inert (see
D-028) — enabling it is a follow-up, not a rebuild
blocker.

## What recovery does NOT cover

- Real-phone install/launch/touch/performance/save-
  persistence — never verified from the sandbox; needs
  the user's phone.
- Release signing, store publish, push/merge — all
  user-only steps, none done by this program.
- The realism phase (D-004: textured PBR bark/leaf/
  rock/wood, higher-detail trees/structures, layered
  terrain textures, phone WebView ceiling) — a separate
  later phase that launches only after the stylized APK
  is presented. Nothing in this tree is realism work.

## Fix build 1.2 (2026-11-02) — build + verification record

- **Source:** branch `voxbox/mobile-first`, tip `ebfb00d` (chain:
  `55497d7` realism base -> `17d3be3` facing [D-037] ->
  `d4585e7` title gate + compact layout [D-038, D-039] ->
  `889a1be` probe extension -> `1b788e0` docs D-037-D-039 ->
  `9e87a96` perf [D-040] -> `4407c88` toast fix [D-041] ->
  `23f0721` docs D-040-D-041 -> `ebfb00d` QA report).
  LOCAL COMMITS ONLY. No push, no merge, no publish, no
  release signing.
- **Build:** `npm run build` in `xandria-studio` ->
  `dist/player.html` 3,095,602 bytes; `apk/build.sh` with
  `VERSION_CODE=3 VERSION_NAME=1.2
  APK_NAME=VoxBox_Amberfall_fix1.apk`.
- **APK:** `~/workspace/your_files/VoxBox_Amberfall_fix1.apk`
  — 1,552,939 bytes, SHA-256
  `93e78ea189e772c3981dda194145c640d196a2b971716778696833ed695dabf5`.
  Badging: package `com.skit.voxboxamberfall`, versionCode 3,
  versionName 1.2, minSdk 28, targetSdk 35, landscape,
  WAKE_LOCK only, NO INTERNET, launchable
  `com.skit.voxboxamberfall.MainActivity`.
- **Signature:** apksigner verify v3 TRUE, 1 signer, cert
  SHA-256 `f4f7f650…a88bb1` — identical to the v1.0/v1.1 cert,
  so 1.2 installs over both in place. zipalign `-c 4` PASS.
  Packaged `assets/game/player.html` byte-identical to the
  fresh `dist/player.html` (verified via `unzip -p | cmp`,
  on top of build.sh's own `cmp`).
- **Siblings untouched:** v1.0 still 1,176,107 bytes, SHA-256
  `f2bd848f…e06c1`; realism still 1,548,843 bytes, SHA-256
  `d566c1ee…d18e3a`.
- **Still user-only:** real-phone install + verdicts on all
  four fixes (title, HUD, facing, lag), S25 150-draw gate,
  hero/credit persistence across the update, push/merge/
  publish, release signing. The splash link stays inert in
  the APK (D-028, unchanged).
