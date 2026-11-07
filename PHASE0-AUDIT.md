# Phase 0 Audit — VoxBox: Amberfall (2026-10-31)

Autonomous completion program, Phase 0. Branch `voxbox/mobile-first`,
base commit `53cfb46` (V2). Method: code reads + a live headless boot
of the freshly built single-file player (`npm run build` →
`dist/player.html`, 2,577,032 B) under Playwright/SwiftShader, plus the
full unit suite. The live probe is a single-sample diagnostic, NOT
baseline-grade perf evidence (3 s settle; chunk streaming incomplete
— see §5). Baseline-grade numbers come from the Phase 1 capture
harness (8 s settle, 8 samples, medians).

## 1. Baselines (measured this phase)

- Unit suite: **171 files / 2,680 tests, all green** (`npm run test`,
  207 s). `tsc --noEmit`: clean.
- Parent-verified V2 perf baseline (spawn view, medians of 8):
  844×390 and 915×412: 670 calls / 1,652,862 tris; desktop 1280×720:
  601 calls / 1,650,598 tris; buckets 197; zero console errors.
  (Source: `VISUAL-V2-REPORT.md`.)
- Toolchain verified present: node 24, vite 6, vitest, tsc, Playwright
  Chromium cached, Android SDK at `~/android-sdk`, Surface Wars APK
  wrapper pattern at `~/workspace/surface-wars/apk/` (proven, reusable
  for Phase 5).

## 2. What is playable — verified live (desktop probe, 2026-10-31)

Boot reaches `playing` with **zero console errors**. Evidence:
`evidence/phase0-audit/probe-desktop.{png,json}` (screenshot inspected,
not just captured).

- **HUD:** objective panel ("Chapter I — Gather the shards 0 / 14"),
  score, scrap, run timer, 3 hearts, controls line (WASD move, mouse
  look, LMB attack, Space jump, Shift dash/sprint, G deploy, Esc
  pause), factions panel (Ironfangs / Ember Order / Freeholds, all
  Neutral 0), minimap, INTEGRITY bar, PHOTO button.
- **Tutorial:** 7 steps, active on boot (STEP 1/7 MOVE), SKIP button.
- **World contents (live counts):** enemies 6/6 alive; pickups 24
  (coin 14, health 4, powerup 6); NPCs 8; vendors 3; gathering nodes
  30; stations 4; quests 17. Blueprint wires: skills, bestiary,
  achievements, companions, camp, mounts, standings, dialogue,
  abilities, radiant board, timed board, events, trade, weather,
  hazards, deployables, world boss, boss bar, shop, wallet, quest
  tracker. (Keys enumerated in `probe-desktop.json`.)
- **Core loop (mechanics verified in code + e2e, not yet played
  end-to-end in this program):** move/look/attack/jump/dash →
  collect 14 coins (the "shards") → eliminate 6 → branch-choice modal
  ("Take the high road" / "Hunt the stragglers") → reach the beacon
  (marker, win within 3.5 m) or hunt 1 → VICTORY screen with
  branch-specific winText; 3 lives → DEFEATED screen. XP per kill
  (20) and per pickup (5), level-up flow, save slots with
  export/import (HUD), pause menu (RESUME/RESTART/SETTINGS/
  QUIT TO TITLE, e2e-verified), fast-travel + world-atlas panels.
- **Systems present as modules and wired:** camp, crafting +
  stations, gathering, quests + side + radiant + timed, companions,
  mounts, skills, vendors/economy, factions, dialogue, dynamic
  events, achievements, bestiary, weather cycles, hazard zones,
  world boss, elite affixes, enemy scaling, stealth, photo mode.

## 3. Gaps, stubs, and dead-ends (honest list)

1. **Visual quality is the biggest gap.** The spawn screenshot shows
   the trap plainly: dim dusk light, flat brown ground, sparse tiny
   tufts, dead trees, hero (small, brown/orange) barely popping
   against brown ground. V1 palette + V2 smoothing are in but read
   subtle at gameplay distance. → Phase 1 (breakout B1–B7).
2. **SETTING.md named places do not exist in code.** Zero hits for
   "Hollow Camp", "Drowned Spire", or "Amberwood" under `src/`. The
   world HAS a camp site, stations, vendors, NPCs, and a beacon
   marker — but none carry the setting doc's names, and there is no
   "Drowned Spire" ruin content vs the generic beacon marker.
   → Phase 2 decision: name the existing camp site + beacon ruin
   (cheapest honest fix) vs build distinct ruin content.
3. **Region count beyond the first region is undecided** (SETTING.md
   leaves it open). → Phase 2 decision: ship ONE complete region;
   a second region is out of the complexity budget.
4. **Branding gap (deliberate, see DECISION-LOG D-001).** Title screen
   and document title read "Ancient Realm — XANDRIA"; boot screen
   reads "XANDRIA". The baked spec name is pinned by
   `tests/e2e/preboot-modding.spec.ts:131` and cannot be renamed
   without a forbidden test-assertion change. Product title
   VoxBox: Amberfall is carried by the APK label and docs.
5. **Shards are coins mechanically.** The collect stage counts `coin`
   pickups (gold, `#ffd23f` sparkle). Shard identity exists only in
   HUD text. → Phase 2: decide whether coin pickups get an amber
   shard visual identity (small `Pickups.makeMesh` change) or stay.
6. **Powerup count unexplained.** Spec says `powerups: 2`; live list
   shows 6 powerups. Possibly effect pickups spawned by the fx
   system. Not a blocker (collect stage counts only `collect`
   events), but Phase 4 must explain it, not wave it.
7. **"SNEAKING" indicator present in HUD text at spawn.** Intent
   unclear (stealth default state?). → Phase 4: verify whether the
   player spawns sneaking and whether that is intended.
8. **Right-edge buttons (SKILLS / MOUNTS / COMPANIONS) look clipped**
   at 1280×720 in the probe screenshot (top-right, partially cut).
   Could be mid-animation panel slide. → Phase 4: verify at rest.
9. **Probe harness gap (not a game bug).** The audit probe could not
   resolve the player position (`eng.player`/`eng.avatar` shape
   differs). Phase 4 playthroughs use the beta lib's `readWorld`,
   which knows the avatar path.
10. **No real-phone verification exists for anything.** All perf and
    playability numbers are SwiftShader + unit tests. The S25
    150-draw gate and all touch ergonomics stay open until a real
    phone runs the APK. This is stated in every phase report, never
    softened.
11. **Phone-landscape HUD overlap — confirmed in screenshot, not
    transient.** At 844×390: the FACTIONS panel collides with the
    MAP and ATLAS buttons (MAP covers the Ironfangs row); the
    SKILLS / MOUNTS / COMPANIONS buttons stack over the minimap's
    top edge with SKILLS clipped at the viewport top; the tutorial
    card covers the ability bar. Desktop 1280×720 is tight but not
    overlapping. → Phase 2/4 fix: HUD layout pass at 844×390 at
    rest (after tutorial dismissed), re-measured by screenshot.
12. **Hero washout at spawn.** The phone screenshot shows a bright
    white radial glow around the hero that blows out the character.
    Cause unknown (spawn protection? AmberGlow? integrity-boost
    aura?). → Phase 4: identify and tone it; the hero must read
    against the ground, not inside a white blob.

## 4. What is NOT broken

- The win path is mechanically complete (the old staged-beacon
  `goalPos === null` unwinnable bug is already fixed in
  `tpAction.ts:949-957` + the 3.5 m reach check).
- Quest state is not persisted across runs (SaveExport header says
  so explicitly) — that is a documented limitation, not a surprise:
  profile/currency/progression persist per slot; quest *state*
  does not. Phase 2 must decide whether quest persistence is in
  scope (it is a real system change, not a tweak).
- No stub/placeholder systems were found on the player path: every
  system named in §2 is wired in `tpAction.ts` and exercised by
  e2e specs. The gaps are content/identity/tuning, not missing
  systems.

## 5. Probe numbers (diagnostic only, do not quote as baseline)

Single samples, 3 s after `playing`:
- Desktop 1280×720: 591 calls / 1,450,598 tris.
- Phone-landscape 844×390: 654 calls / 1,332,862 tris.
Both BELOW the V2 medians (601 / 1,650,598 desktop; 670 /
1,652,862 at 844×390), consistent with chunks still streaming at
sample time (V2's own artifact note: 6 chunk meshes ≈ 120,000
tris). World contents identical across both viewports (same seed:
NPCs 8, vendors 3, gathering 30, stations 4, quests 17, pickups 24,
enemies 6/6), zero console errors on both.
- Touch note: the phone-viewport probe shows keyboard controls
  (WASD…), because headless Chromium without CDP touch emulation
  reports no-touch. This is a probe artifact, not a game bug —
  Phase 4 phone playthroughs must use genuine CDP touch (as the
  Surface Wars twin-stick playthrough did) to exercise the touch
  UI, look-stick, and on-screen buttons.

## 6. Phase 1 entry state

- Capture harness: `xandria-studio/tools/capture.mjs` (spawn +
  pine-forest views, 3 configs, 8 samples, medians, mean luma,
  console errors, full census incl. textures + programs).
- Preview server: `vite preview` on port 4173 serving `dist/`.
- Baseline capture (before/after per workstream) is the Phase 1
  builder's first job, on a quiet box, before any B1 edit.
