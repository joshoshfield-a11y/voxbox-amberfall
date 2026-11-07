# VoxBox: Amberfall — Autonomous Completion Decision Log

Every decision the coordinator makes on the user's behalf under the
2026-10-31 full-autonomy grant, with its reason. Open questions are NOT
left here — a decision is recorded, or the item is explicitly deferred
with the reason it cannot be decided yet. This log lives in the repo so
it survives a source wipe.

## D-001 (2026-10-31, Phase 0): in-game world name stays "Ancient Realm"

- **Decision:** `spec.meta.name` remains `"Ancient Realm"`. The product
  title VoxBox: Amberfall is carried by the APK label, repo docs, and
  store presence — not by renaming the baked spec.
- **Reason:** the bake is seed-describing (`emberwood.ts` header:
  meta.name deliberately unedited generator output), and
  `tests/e2e/preboot-modding.spec.ts:131` pins the baked name.
  Renaming would require a test-assertion change, which the program's
  hard constraints forbid (only terrain-rebase digest updates are
  excepted, and only when a workstream genuinely requires them).
  "Emberwood" remains the development codename for this region's
  content set (SETTING.md), and "Forgotten Valley" is not adopted
  (user's prior direction, preserved).
- **Cost of the alternative:** a rename would also change the title
  screen, HUD header, and toast strings the flow e2e asserts around,
  for a cosmetic gain. Not worth breaking pins.

## D-002 (2026-10-31, Phase 0): capture harness adopted as permanent tooling

- **Decision:** the closed narrow-breakout builder's scratch harness
  (`capture-breakout.tmp.mjs`) is moved to
  `xandria-studio/tools/capture.mjs` and committed, with the audit
  probe beside it (`tools/probe-audit.mjs`).
- **Reason:** V1/V2 deleted harnesses after use, which is why V1's
  "buckets 228→227" could never be reproduced. The autonomy grant
  requires wipe-proof documentation; a committed harness is worth
  more than the deleted-after-use convention. The harness already
  implements the plan's §5 census (calls, triangles, geometries,
  textures, programs, instanced meshes, instances, buckets) plus mean
  luma for B1 brightness deltas, on spawn + pine-forest views.

## D-003 (2026-10-31, Phase 0): perf gate = measured baseline, not skill text

- **Decision:** the Phase 1/4 perf gate is NO REGRESSION vs the
  measured Phase-0 baseline at 844×390, 915×412, and desktop
  (medians of 8, zero console errors, non-blank screenshots).
- **Reason:** the automated-playtest skill names a desktop-400
  draw-call figure, but the engine's measured baseline on the real
  spawn scene is 601 calls (V2, parent-verified). A skill's generic
  number does not override a measured baseline on the real scene;
  claiming 400 as the gate would either fail a healthy build or
  force a dishonest recount. The S25 150-draw gate stays real-device
  only and open until a real phone runs it — SwiftShader numbers
  are never presented as phone evidence.

## D-004 (2026-10-31 ~21:33 PDT, user's word): stylized FIRST, realism SECOND

- **Decision:** finish the stylized game first — the full program
  (stylized breakout, gameplay completion, QA, APK) completes and is
  reported with the verified APK before ANY realism implementation
  starts. A scoped realism-phase plan is included in that final
  report as the follow-on only.
- **Scope of the follow-on (user's words, recorded, not started):**
  textured PBR assets for bark / leaf / rock / wood with proper
  material response; higher-detail tree and structure models
  replacing low-poly procedurals where it counts; layered terrain
  textures replacing painted vertex colors — all within the phone
  WebView ceiling: much closer to real, NOT film photoreal.
- **Guardrails:** no realism work is folded into the stylized
  finish (the breakout plan's §6 out-of-scope — PBR texture
  re-authoring — stands for the stylized line); no realism
  implementation begins before the stylized APK report. The
  realism phase launches only after the stylized APK is presented.
- **Status note (recorded 2026-10-31 ~21:33 PDT):** at decision
  time, breakout B1–B6 were already committed on
  `voxbox/mobile-first` and B7 (sky) was in progress with
  uncommitted `GenreGrade.ts` / `LightShafts.ts` changes. This
  entry is intentionally left UNCOMMITTED until the B7 work lands,
  so the decision-log commit does not diverge the builder's
  branch — it will ride the next coordinator commit after B7.

## D-005 (2026-11-01, coordinator, under the autonomy grant): B6 bloom threshold ACCEPTED at 1.15

- **Decision:** the stylized finish ships with `BLOOM_THRESHOLD` 1.15,
  not the planned 1.25. The Props/PropSets emissive bumps (rune
  strips 2.0 → 2.8, crystal 1.6 → 2.4, hero-posts 1.6 → 2.4,
  hero-pylons 2.0 → 2.8) and the 1.25 threshold move to the Phase 3
  maximum-quality pass, where they get a bloom-isolation
  measurement (which emissives actually bloom at each threshold)
  before any value changes.
- **Reason:** lit rune strips (2.0) already clear 1.15, so the
  stylized gate — emissive-only bloom, no new passes, threshold as
  a zero-cost uniform — is met. Crystalflora (1.3) and mushroom
  (0.25) not reliably blooming at 1.15 is an honestly stated gap,
  not a blocker, and chasing it inside Phase 1 would have meant
  re-opening two files outside the builder's ownership for a
  tuning change that belongs in the quality pass anyway.

## D-006 (2026-11-01, coordinator verification): Phase 1 breakout VERIFIED complete

- **Verified independently, not taken on the builder's word:**
  commits B1–B7 (`e1e71ff`, `68ab94e`, `fff2e4d`, `b7280ae`,
  `65c196e`, `9b74e2c`, `82f74cf`) present in order on
  `voxbox/mobile-first`, local only; diff scope 21 files, all
  inside builder ownership (no voxelGeo / VoxelArmor / runtime /
  blueprints / engine/ui / spec / harness touches); the single
  test-assertion change is the authorized B2 digest update, with
  its comment citing the approved plan, the AO mechanism, the
  previous digests, and the normals control (hills normals
  `f55c0c26` identical both sides); evidence dir holds all 84
  files (7 tags × 3 configs × 2 views × JSON+PNG); plan sections
  B1–B7 marked DONE with SHAs; full suite + tsc re-run by the
  coordinator (see below).
- **Gate numbers spot-checked against raw JSONs (not the report
  table):** spawn 844×390 before 676 / 1,772,862 / 379 / 25 / 39,
  luma 0.1994, 0 errors; b7 674 / 1,911,422 / 377 / 25 / 39, luma
  0.2862, 0 errors; instances 137,379 → 182,019 (+44,640, the
  exact B3 grass increase — the clean proof of the grass delta,
  independent of residency noise). Forest desktop luma
  0.2039 → 0.3071. Programs 39 phone / 38 desktop stable; textures
  25 stable; instancedMeshes 237 stable; zero console errors in
  every sampled JSON.
- **Residency finding (strengthens the builder's claim):** the
  desktop-spawn "667 → 603 drop" is median-position noise, not a
  workstream effect — the before range [601, 667] and the b7
  range [597, 665] essentially coincide, and b7 desktop
  (603 / 329) matches the parent-verified V2 desktop (601 / 327).
  Median-to-median tris deltas are confounded by ±2–4-chunk
  residency; the instance-count delta is the trustworthy B3
  proof. This is now the documented way to read all breakout
  gate tables.
- **Screenshots inspected (not just captured):** b7 spawn reads as
  bright golden dusk — pale warm sky, lighter warmer ground,
  amber tower lights blooming, hero popping — against the dim
  before. The Phase 0 white glow blob is NOT visible in the b7
  captures at either desktop or phone size; new hypothesis for
  Phase 2/4: a timing-dependent spawn glow (Phase 0 probe shot
  at 3 s after `playing`, breakout harness at 8 s + samples) —
  check at 3 s / 8 s / 30 s after boot. Phone HUD overlap (item
  11) is CONFIRMED still present in the b7 phone shot and goes to
  Phase 2.
- **Open items carried forward (not waived):** B3 path readability
  at gameplay distance (path-aligned camera check, Phase 2
  verdict, any wear change in Phase 3); B5 hero readability at
  gate distance (hero ~20 px in gate framings); the combat-flash
  finding (humanoid `animate` overwrites owned emissive without
  restoring — Phase 2 investigates whether materials stay
  flashed); oak LOD counts estimated, not pinned; harness buckets
  null (V2's 197 came from another method); S25 150-draw gate
  stays real-device only.
- **Coordinator suite/tsc re-run (2026-11-01, final tree
  `82f74cf`):** full suite 178 files / 2,704 tests, all passed
  (248.9 s); `tsc --noEmit` exit 0, no output. Matches the
  builder's claimed count exactly. Phase 1 is VERIFIED complete;
  the verification commit below carries this log entry, the
  breakout report, and the marked-done plan (raw 25 MB evidence
  stays untracked per standing practice, paths in the report).

## D-007 (2026-11-01, Phase 2): quest persistence is ON

- **Decision:** quest state now persists per save slot, closing
  the SaveExport header's documented limitation. Mechanism: the
  existing QuestManager `portalSnapshot()` / `portalRestore()`
  pair (unknown ids dropped, progress/elapsed clamped). Profile
  gains an additive optional `questState` field, validated on
  migrate (malformed → undefined, no version bump); old saves
  get fresh quests. No large system was built; the schema
  supported it cleanly.

## D-008 (2026-11-01, Phase 2): shard visual = amber crystal

- **Decision:** collect-stage pickups render as an elongated
  octahedron (0.85/1.5/0.85) in the shared `#ffd23f` material.
  Geometry only; the pickup `kind` stays `coin` and all counts
  are unchanged. Reason: the collect stage IS the shard quest,
  so the shards should look like amber, not coins.

## D-009 (2026-11-01, Phase 2): powerup count 6 is INTENDED

- **Decision:** no fix. Spec says 2; `tpAction.ts` scatters 2
  vanilla powerups (SPEED SURGE) PLUS 4 fx effect shells
  (shield/rapid/mult/magnet) = 6 live `powerup` entries. The
  collect stage counts only `collect` events, so the loop is
  unaffected. Phase 4 must not re-litigate this.

## D-010 (2026-11-01, Phase 2): sneaking at spawn is NOT sneaking

- **Decision:** no fix. `sneaking` defaults false and the sneak
  chip is `display:none` at boot; the audit's "SNEAKING" was
  hidden DOM text. Intended state, misread indicator.

## D-011 (2026-11-01, Phase 2): combat-flash restore fix

- **Decision:** real bug, fixed. The humanoid blink loop ended
  on black (wiping any pre-flash skin glow) and the drone loop
  ended RED at 0.9 forever (floor(negative×20)%2 is -1, truthy,
  once flashTime goes negative); RigAdapter had the same wipe.
  All three loops now snapshot emissive hex+intensity at
  `flash()` (kept across mid-flash re-hits) and restore on
  envelope expiry. Base flat materials are black/0, so default
  rigs look identical.

## D-012 (2026-11-01, Phase 2): named places as implemented

- **Decision:** Hollow Camp = CampPanel title (fast-travel
  anchor rows keep their pinned `⛺ Camp` label); The Drowned
  Spire = toast on beacon-goal approach <30 m; The Amberwood
  wilds = Forager brief + first-harvest toast. Toasts only via
  existing `hud.toast`; no new systems, no `meta.name` rename.

## D-013 (2026-11-01, Phase 2): portrait non-touch layout deferred

- **Decision:** the desktop CSS block stays UNGUARDED for
  portrait (3 rest overlaps at 390×844 non-touch) because the
  guarded variant measured strictly worse (15 rest overlaps).
  A proper portrait layout is a future item, not invented here.
  Caveat recorded: portrait TOUCH was not measured (only
  landscape touch, which is clean); portrait is not a gated
  config (gates are 844×390, 915×412, desktop).

## D-014 (2026-11-01, Phase 2): B3 corridor strengthening is DORMANT, not broken

- **Decision (carried to Phase 3):** the recovery probe found
  NO corridor in the baked spec (`corridor: null`): the 4 placed
  landmarks sit 2,396–4,230 m from spawn while the corridor band
  is 40–220 m, and landmarks scatter over ±3,988 m, so
  P(none in band) ≈ 98.8%. B3's wear strengthening (width
  4.5→6.0, strength 0.4→0.55) therefore never activates in the
  shipped game. Phase 3 must decide: widen the band, relocate
  a landmark into the band, or accept dormant paths — with
  gates, not silently. The apron readability shot stays open
  (camera-orbit rig limits + a sun-glare framing; 4 attempts,
  none usable).

## D-015 (2026-11-01, coordinator CORRECTION): hero white glow, landscape closed / portrait open

- **Correction to the Phase 2 recovery report:** its claim that
  "Phase 0 probe crops also show no blowout" does NOT hold for
  `evidence/phase0-audit/mobile-390.png`, which the coordinator
  re-inspected: that portrait frame-0 touch shot DOES show a
  bright white-yellow radial halo around the hero. The
  landscape glow series (1 s / 3 s / 8 s / 30 s, 844×390 and
  desktop) is clean, with flat center-crop luma and no halo.
  Verdict: item 12 is closed for landscape; the remaining
  question — frame-0-only artifact vs portrait-persistent
  glow — goes to Phase 4 as a portrait-touch capture series
  (0 s / 1 s / 3 s / 8 s). No fix is invented before that
  measurement.

## D-016 (2026-11-01, coordinator): stale e2e pins LEFT UNCHANGED

- **Decision:** the stale e2e expectations found by Phase 2
  are NOT updated, because the hard constraint allows no test
  assertion changes except genuine terrain-rebase digest
  updates. (a) Flow pause expects no CUSTOMIZE, but CUSTOMIZE
  is present at base `1f609bb` (HUD.ts, from the 2026-10-28
  upgrade-loop merge). (b) Playability/offline-export specs
  expect multi-genre `?intent=` / `?spec=` behavior that
  VoxBox 1b deliberately removed (`main.ts: resolveSpec()`:
  "`?intent=` is ignored entirely"; every non-tp-action intent
  degrades to baked Emberwood by design). Phase 4 will use the
  beta harness + targeted specs, not these stale specs.
  Retiring or updating them needs a parent-level decision if
  ever wanted; it is not done under the autonomy grant.

## D-017 (2026-11-01, coordinator verification): Phase 2 VERIFIED complete

- **Verified independently:** commits `94347dc`, `2eb647a`,
  `ee1b208`, `72c6dbc`, `d9626f2`, `fa7e683` in order on top of
  `1f609bb`, local only; diff scope 9 code files + 3 NEW test
  files, no forbidden files, no existing-test edits, no test
  assertion changes anywhere; evidence commit `fa7e683`
  carries 53 recovery-builder files only (dead builder's
  pre-fix-identical files left untracked deliberately).
- **Gate numbers spot-checked against raw JSONs:** p2rec-after
  spawn 844×390 = 676 / 1,951,030 / 379 / 25 / 39, luma 0.2787,
  0 errors; base identical except luma 0.2790; desktop after =
  603 / 1,868,822 / 329 / 25 / 38, luma 0.3308; forest desktop
  after = 607 / 3,220,982 / 331 / 25 / 38, luma 0.3051. Base→
  after identical on every scene stat; luma moves ≤0.0005.
  Phase 2 is perf-neutral, as claimed.
- **HUD overlaps recomputed independently from probe rects:**
  844 non-touch post-fix ZERO at rest and tutorial (pre-fix
  probe had exactly the hint/tutcard 6 px edge-touch the
  builder fixed: tutcard top 140→148, hint pill ends at 146);
  844 touch ZERO; desktop ZERO (item 8 was mid-animation
  slide, confirmed). Portrait non-touch 3 vs guarded 15
  confirms the D-013 revert. HUD rest screenshot inspected:
  clean top chip row, no FACTIONS/MAP/ATLAS collision,
  minimap clear, hero visible.
- **Diff spot-checks:** CampPanel change is title-only with a
  comment preserving the pinned fast-travel label; flash fix
  matches its stated mechanism; quest persistence is additive
  + validated, reusing portalSnapshot/portalRestore.
- **Carried to Phase 4 (not waived):** portrait-touch glow
  series (D-015); quests story-line dialogue-open stall +
  mobile touch-tap interception (reproduced twice, need a
  dedicated debug pass on a quieter box); full scripted
  VICTORY/DEFEATED playthrough harness (no dedicated spec;
  beta bot never passed even pre-Phase 2 — 2026-10-28
  `passed:false`, and Phase 2's run failed on the 12-min
  real-time cap at 61/180 frames under tenant contention,
  0 errors). The 20 targeted-e2e failures classify as
  pre-existing/environmental per D-016 and code-path analysis
  (CampPanel change is title-only; quest-restore is a no-op
  on fresh contexts; HUD CSS is inert at 360×780 touch by
  `:not(.x-touch)` and landscape scoping) — Phase 4 re-verifies
  rather than re-litigating.
- **Coordinator suite/tsc re-run (final tree `fa7e683`):**
  full suite 2,718 tests passed (236.1 s); `tsc --noEmit`
  exit 0. Matches the builder's claimed count exactly. Phase
  2 is VERIFIED complete.

## D-018 (2026-11-01, coordinator): bloom threshold STAYS 1.15 — the 1.25 move is NOT authorized

- **Decision:** the stylized finish ships with
  `BLOOM_THRESHOLD` 1.15 and the Phase 3 bumps (runestone
  2.0→2.8, crystal 1.6→2.4, hero-posts 1.6→2.4, hero-pylons
  2.0→2.8). The 1.25 move is NOT made, even though the Phase
  3 measurement supports it (only losses at 1.25: platformer
  white wisps @1.2, not a VoxBox species, and the sun-facing
  char-trim @2.0 halo, sub-visible at gate distance).
- **Reason:** `tests/visual-breakout-b6.test.ts:14` pins the
  threshold to exactly 1.15, and the parent's hard constraint
  allows NO test assertion changes except terrain-rebase
  digest updates. Changing the pin + threshold would violate
  that constraint, and the autonomy grant explicitly does not
  override hard constraints. The bumps achieve the shipped
  goal within 1.15 (runestones bloom in all orientations,
  crystals bloom when lit), so nothing is lost in the game.
  The 1.25 move is surfaced to the parent in the final report
  as a possible follow-up requiring an explicit exception —
  it is NOT decided here.
- **Corrected accounting (for future threshold discussions):**
  UnrealBloomPass compares linear Rec.709 luminance, not
  intensity. Amber accent `#ff9e2e` luminance ≈ 0.459×
  intensity (so @2.8 = 1.29, @2.4 = 1.10, @2.0 = 0.92,
  @1.6 = 0.73 — all probe-measured, 31 cases, errors: []).

## D-019 (2026-11-01, Phase 3): corridor decision (iii) accept dormant paths (D-014 closure)

- **Decision:** accept dormant paths; no code change, no
  digest impact. Reasons: band 40–220 m vs landmarks
  2,396–4,230 m (re-verified live: beam-tower 2,396.6,
  ruin-arch 4,230, bridges 3,722.6 / 3,234.9); widening the
  band would paint absurd 2.4–4.2 km worn strips world-wide;
  relocating seeded gameplay colliders for a cosmetic strip
  is unjustified. Still functioning: spawn wear disc +
  landmark apron discs. Future proposal (NOT Phase 3, needs
  Structures.ts ownership): a wear path from spawn to the
  nearest `structureSets` hero cluster (30–55 m, in-band by
  construction).

## D-020 (2026-11-01, Phase 3): oak LOD counts MEASURED and pinned: 80 / 40 / 20

- **Decision:** the Phase 1 estimate is now a measurement.
  `oakFoliage` (4/2/1 icosahedron balls × 20 faces) is
  test-measured via an exported seam mirroring pine
  (54/28/10). The Vegetation.ts change is export-keyword
  only; no geometry was altered.

## D-021 (2026-11-01, Phase 3): apron readability ACHIEVED, with caveats

- **Decision:** the path-aligned apron shot is accepted as
  evidence: hero standing on the apron edge, beam-tower
  beyond, worn ground in the foreground — genuinely
  path-aligned (photo mode, spawn→beam-tower line), not a
  wide shot. Caveats, coordinator-inspected: the wear-disc
  edge itself is subtle under dusk fog/sun-glare (the shot
  proves hero-on-apron + landmark alignment; the boundary
  is not crisp in this light), and it required photo mode
  (frozen sim) because the gameplay rig will not follow a
  multi-km teleport. Coordinator note: the apron shot shows
  a bright halo around the hero, consistent with sun-glare
  backlight bloom in that framing — distinct from the Phase
  0 portrait boot-halo question, which Phase 4's portrait
  series must still settle (D-015).

## D-022 (2026-11-01, Phase 3): hero trim at gate distance = size problem, no small fix

- **Decision:** no Characters change. The closeup probe
  (3 m photo orbit) shows B5's work clearly legible — helmet
  visor band, bandolier strap, buckle glow at 2.0,
  tunic/strap contrast. At 7.5 m gameplay distance the
  figure is ~44 px and trim is 1–3 px glints — sub-visible,
  as predicted. That is a size problem, not a material
  problem; a fix would need silhouette-scale intervention
  (bigger hero, outline, nameplate), which is a separate
  decision, not Phase 3.

## D-023 (2026-11-01, Phase 3): pseudo-AO grass-base shading REJECTED

- **Decision:** left out with reasons: Grass.ts was outside
  the granted file list; no gate can measure it (0.45 m
  tufts are sub-resolution at gate distance, and B2's baked
  ground AO already darkens bases); it would add a
  shader/material program variant for an unmeasured
  aesthetic. Feasible for a future phase with ownership +
  a readability metric. No assets downloaded, no tools
  installed in Phase 3 (provenance: none — procedural
  generation covers the stylized look, as expected).

## D-024 (2026-11-01, coordinator verification): Phase 3 VERIFIED complete

- **Verified independently:** commits `2cab474`,
  `8696604`, `7c3e103`, `43b44e9` in order on top of
  `d5112e5`, local only; diff scope Props.ts (9 lines),
  PropSets.ts (8), Vegetation.ts (3, export only), 2 NEW
  test files, probe scripts + evidence — no forbidden
  files (no Structures, Grass, Characters, voxelGeo,
  VoxelArmor, runtime, blueprints, engine/ui, engine/game,
  decision log, audit, report, harness, spec); no existing
  test assertion changed (the b6 pin at 1.15 untouched,
  per D-018).
- **Gate numbers spot-checked against raw JSONs:** p3after
  spawn 844×390 = 676 / 1,951,030 / 379 / 25 / 39, luma
  0.2787, 0 errors — identical to p3base; forest desktop
  identical; desktop spawn base 664 / 1,890,722 / 367 vs
  after 665 / 1,910,722 / 368 — ranges [597,665] vs
  [601,667] overlap heavily, tris delta +20,000 = exactly
  1 chunk, instances identical (182,019), luma identical
  (0.3308): textbook 1-chunk residency, not a regression.
- **Probe data spot-checked:** bloom results.json is real
  per-case probe data (center/halo deltas at both
  thresholds, errors: []); values are internally
  consistent with the 0.459 accent factor and with prior
  claims (sky 1.03, ground 0.8, mushroom 0.25 all
  non-blooming; white @1.2 blooms at 1.15 only).
- **Screenshots inspected:** apron shot (hero on apron,
  tower beyond, edge subtle — see D-021); hero closeup
  (visor band, strap, buckle glow all legible — see
  D-022). The builder's two VM replacements mid-capture
  were handled by clean re-runs from fresh previews; the
  cited runs are the completed re-runs.
- **Coordinator suite/tsc re-run (final tree `43b44e9`):**
  full suite 2,724 tests passed (345.3 s); `tsc --noEmit`
  exit 0. Matches the builder's claimed count exactly.
  Phase 3 is VERIFIED complete.

## D-025 (2026-11-02, coordinator verification): Phase 4 VERIFIED complete

- **Verified independently:** commits `4892c82`,
  `3568b24`, `e9b4dd5`, `08d7af7` in order on top of
  `b6d43bf`, local only; diff scope (non-evidence):
  `victory-path.spec.ts` (NEW, 464 lines),
  `InteractionPrompt.ts` (+48), `HUD.ts` (+16/−1),
  beta results JSONs (run outputs, not assertions).
  No forbidden files (no voxelGeo, VoxelArmor,
  runtime/main, spec JSON, decision log, audit, report,
  harness, VISUAL-TARGET-PLAN.md); no existing test
  assertion changed; all `p4-*.tmp.mjs` probe scripts
  deleted; previews stopped.
- **Gate numbers spot-checked against raw JSONs:**
  p4after spawn 844×390 = 676 / 1,951,030 / 379 / 25 /
  39, luma 0.2787, 0 errors; p4after desktop = 664 /
  1,890,722 / 367 / 25 / 39, luma 0.3308; p4base spawn
  844 identical. Base→after identical on every scene
  stat, luma moves ≤0.0005 — perf-neutral.
- **Playthroughs (builder, corroborated):** desktop v2
  (1280×720) COMPLETE — boot, tutorial skip, verbs
  (W walk + dash, 19.5 m), pause via KeyP AND Esc,
  resume, panels skills/bestiary/companions/mounts +
  Escape-close, camp, standings widget, boss bar
  show/clear, quit-to-title with SAVE SLOT picker.
  Phone v2 (844×390, genuine CDP touch) COMPLETE
  except the camp leg became Fix 1 — boot, tutorial
  skip, touch sticks, pause via touch pausebtn +
  resume, all four panels via chip taps, boss bar,
  quit-to-title (JSON-verified: titleScreen=true,
  slotRows=6, state=title). Touch JUMP/DASH/ATK
  proven separately (JUMP y 0.85→1.84; DASH 8.4 m;
  ATK 30→5 = one 25-damage hit). Zero console errors.
  Honest caveats carried, not smoothed: phone title
  screenshot is a mid-transition frame, not a clean
  title shot (that leg rests on JSON verification);
  trade not live in either v2 run (no vendorId NPC at
  boot — proven); standings row-count difference is a
  selector difference, not a game difference.
- **Victory/DEFEATED harness — coordinator re-run:**
  `victory-path.spec.ts` run ALONE on a quiet box
  after a fresh `npm run build` (it serves `dist/` via
  vite preview on 4180): 3 passed in 40.9 min (beacon
  VICTORY 16.8 m, hunt VICTORY 18.9 m, death DEFEATED
  4.7 m) — independent confirmation of the builder's
  run 11 (3 passed, 40.3 m). The beacon-reach curiosity
  reproduced (dist 2.00 not firing, loop passes).
- **Beta regression classified, not waived:** fuzz 21
  passed / 5 failed — all 5 the SAME stale multi-genre
  assertion (`beta/lib.ts:53` boot asserts genre ==
  expectedGenre after `?intent=` navigation; VoxBox 1b
  `resolveSpec` ignores `?intent=` by design) — the
  D-016 class, NOT regressions. Soak PASSED: 600 s,
  heap flat 159.3 MiB, state=playing throughout.
- **Debug pass (builder, corroborated):** dialogue
  stall explained as a SwiftShader slow-frame artifact
  (NPC physics flings nearby NPCs out of the 3 m prompt
  radius within 1–2 frames of the prompt win; on a real
  device at 60 fps the NPC stays in radius) — no
  game-code fix. Tap interception root-caused, not a
  game bug: the interceptor is the ROTATE PROMPT itself
  (z 9800, full-screen, above the modal layer 9650), by
  design for a landscape-first game; the hud-polish and
  camp-upgrades mobile specs never dismiss it.
- **Fix wave 1 — touch pill (verified):** phone
  players had NO touch affordance for interact prompts
  (pill `pointer-events:none`, KeyE handler only, no
  INTERACT button in the touch layout). Fix
  (InteractionPrompt only): on touch devices the pill
  becomes `pointer-events:auto` and a tap synthesizes
  the KeyE the five capture-phase handlers already
  listen for. Honest boundary: sandbox CDP touch fires
  neither pointerdown nor touchstart on the pill, so
  the sandbox proves pointerdown→camp, not a
  real-device tap end-to-end — real-device pill-tap
  feel stays a real-phone item.
- **Fix wave 2 — quest tracker overlap (verified):**
  with an ACTIVE quest the tracker overlapped the
  mounts/companions chips on desktop and the minimap
  on 844×390. NOT a Phase 2 regression — Phase 2's
  zero-overlap check ran with no quest accepted
  (tracker hidden). Fix (HUD.ts layout blocks only):
  desktop tracker to `right:150px`, landscape tracker
  to `right:180px`; touch rules untouched.
  Re-verified with an active quest: desktop OVERLAPS
  [] (tracker 985–1130), 844×390 OVERLAPS [] (tracker
  578–664, 14 px from the minimap). Coordinator
  inspected `tracker-fixed-desktop.png`: QUESTS panel
  clear of the chip column, no overlap, hero visible
  with no white blob at desktop.
- **Spot-verification (builder, corroborated):** quest
  persistence across FULL reload PROVEN; shard visual
  PROVEN (OctahedronGeometry, `#ffd23f`, emissive
  `#ffd23f`, ei 1.4, exactly D-008 — earlier nulls were
  a probe accessor issue, pickups expose a Group
  root); all three named-place toasts PROVEN via a
  `hud.toast` spy; bloom bumps in-game PROVEN (224
  meshes with emissive ≥ 2.0, incl. 2.4 × 9 and
  2.8 × 15 per Phase 3).
- **Coordinator correction carried:** the builder's
  "D-015 CLOSED, no halo" verdict was superseded in
  part — the coordinator inspected
  `evidence/phase4/glow-portrait-0s.png` AND
  `glow-portrait-8s.png` and found a VISIBLE bright
  halo around the hero, persistent 0s→8s, with NO
  blowout (centerBlowout 0.0001, hero readable). D-015
  therefore stayed OPEN in narrowed form into Phase
  4b (see D-026).
- **Coordinator suite/tsc re-run (Phase 4 tree
  `08d7af7`):** 2,724 tests passed; `tsc --noEmit`
  exit 0. Phase 4 is VERIFIED complete.

## D-026 (2026-11-02, coordinator verification): Phase 4b glow follow-up VERIFIED; D-015 CLOSED

- **Verified independently:** commit `6e05066` on top
  of `08d7af7`, local only; diff scope: 2 NEW durable
  tools (`xandria-studio/tools/glow-touch.mjs`,
  `glow-touch-skip.mjs`) + 24 NEW files under
  `evidence/phase4b/`. No game code, no test
  assertions, no spec change (`timeOfDay` still
  `dusk`), no voxelGeo/VoxelArmor, no decision log,
  no VISUAL-TARGET-PLAN.md annotation, no
  victory-path.spec.ts / beta/lib.ts. Previews stopped;
  ports 4173/4180 clear.
- **Landscape-touch — the missing cell, filled:**
  genuine CDP touch (`hasTouch:true`, verified
  in-page), 844×390. The rotate prompt is
  `display:none` before and after — in landscape it
  never shows by its own rule (portrait + touch only,
  `engine/ui/RotatePrompt.ts`), so no dismissal tap
  was required. Series 0/1/3/8 s: fullLuma
  0.2944→0.2942, centerLuma ~0.2656, centerBlowout 0,
  errors []. The spawn framing's centered tutorial
  card covers the hero, so a skip pass was required
  for a hero-visible verdict: genuine touchscreen.tap
  on SKIP TUTORIAL, hero projected at screen
  (422,235), tutorialStep null, particle pools 0/0 —
  heroBoxLuma 0.2986→0.2990 flat 0s→8s, blowout 0,
  errors []. Coordinator inspected
  `glow-landscape-touch-skip-8s-after-skip.png`:
  hero crisp against uniform ground, NO halo, only
  visor slit + buckle dots glowing. **Halo ABSENT in
  landscape-touch.**
- **Portrait-touch control — veil does NOT
  reproduce:** prompt `flex`→`none` via tap dismiss,
  0 s frame 20 hero-box luma 0.2929 vs Phase 4's 0 s
  0.3626 — identical to Phase 4's own 8 s frame
  (0.2911). Coordinator inspected
  `glow-portrait-touch-0s.png`: no veil, no white
  blob. The veil is therefore NOT portrait-only
  either — it does not reproduce under identical
  frame timing in either orientation.
- **Mechanism — coordinator spot-checked in code:**
  `Materials.glow()` (`engine/gfx/Materials.ts:507-509`,
  flat + emissive); visor slit 1.8
  (`Characters.ts:251`), hood eyes 2.2 (`:265`), belt
  buckle 2.0 (`:320`), glow rivets 2.0 (`:331`);
  `UnrealBloomPass` strength 0.45 standard / 0.35
  high, radius 0.6, threshold 1.15 (`PostFX.ts:156`,
  `BLOOM_THRESHOLD` export 1.15). Scene dumps: 0
  sprites, 0 live player lights (only 3 pooled
  LightLife flash lights at intensity 0/invisible + 1
  amber landmark light 2,396 m away), 4 additive
  light-shaft cylinders (nearest 11.0 m). NO
  player-highlight sprite, aura mesh, or hero light
  exists to fix. The grade vignette is
  screen-centered, not hero-centered, so it is not
  the halo.
- **D-015 CLOSED:** no persistent halo in any config;
  what persists is the DESIGNED emissive glow of the
  hero's own parts through the standard bloom pass.
  Honest caveat, carried: the exact mechanism of
  Phase 4's single 0 s veil frame is UNPINNED — it
  appears in exactly one frame of one run, is gone by
  Phase 4's 1 s frame, and never recurs in 11+
  follow-up frames across 3 series (landscape, skip,
  portrait control). No code change was made on the
  basis of one frame: a global bloom change would
  alter the designed dusk look for all players. If the
  veil ever reproduces, reopen with a dense
  early-frame sampling run. (Phase 4's capture script
  was never committed, so its exact boot path cannot
  be replayed — a process note for future capture
  work: commit the capture script with the series.)
- **Gates:** p4bafter spawn 844×390 IDENTICAL to
  Phase 4 after on every number (676 / 1,951,030 /
  379 / 25 / 39, luma 0.2787, errs 0); desktop
  665 / 1,910,722 / 368, luma 0.3309 = +1 chunk
  residency, not a regression (Phase 4's tris value
  lies inside the 4b sample range [1,828,822,
  1,910,722]).
- **Coordinator suite/tsc re-run (final tree
  `6e05066`):** 2,724 tests passed; `tsc --noEmit`
  exit 0. (One coordinator suite re-run was SIGTERM-
  killed at 80 s with zero output — an external kill,
  not a test result — and re-ran cleanly to green.)
  Phase 4b is VERIFIED complete.
- **Acknowledgments (landed, logged):** tracker fix
  placement — desktop `right:150px` clears the chip
  column's W-128 left edge by 22 px at any width;
  landscape `right:180px` clears the minimap's W-166
  left edge by 14 px; touch rules untouched because
  the touch minimap is left-side. Touch pill-tap via
  synthetic KeyE — InteractionPrompt only, no
  call-site changes, desktop unchanged.
- **Harness convention (decision):** portrait specs
  dismiss the rotate prompt first, or run landscape.
  The prompt is landscape-first by design; taps
  landing on it are a harness gap, not a game bug.
- **Proposal, NOT decided:** low-fps physics
  robustness (prompt target latching and/or a physics
  dt clamp) — needs a parent decision; NOT implemented
  under this program.
- **D-016 re-confirmed:** fuzz's 5 non-tpa failures
  are the stale-genre class by construction
  (`beta/lib.ts` boot assertion vs `?intent=` ignored
  by design). Retiring or updating those pins remains
  a parent-level decision if ever wanted.

## D-027 (2026-11-02, coordinator): APK identity

- **Decision:** package `com.skit.voxboxamberfall`,
  versionCode 1, versionName 1.0, minSdk 28,
  targetSdk 35 (the Surface Wars v1.4 values),
  debug-signed. Wrapper: landscape, fullscreen,
  hardwareAccelerated, WAKE_LOCK + keep-screen-on,
  JavaScript on, DOM storage ON (save persistence
  depends on localStorage — the Surface Wars Phase C
  lesson), zoom controls off, no INTERNET permission.
- **Keystore correction:** no shared cross-game debug
  keystore exists — Surface Wars, STARFALL, and Scrap
  Dungeon each carry their own, with different
  passwords. Since no prior VoxBox build exists, a NEW
  per-game debug keystore is the correct invariant:
  `apk/debug.keystore`, alias `voxboxamberfall`,
  committed in the repo (debug-only; a release
  keystore would never be committed). Cert SHA-256
  `F4:F7:F6:50:90:C5:0A:E5:79:22:21:B6:A0:B3:B9:49:32:FA:05:86:A1:5F:1E:47:7D:23:68:21:78:A8:8B:B1`.
  **Future VoxBox updates MUST reuse this keystore to
  install over v1.0.** Release signing remains a
  user-only step, not done here.

## D-028 (2026-11-02, coordinator verification): Phase 5 VERIFIED complete

- **Verified independently:** commit `51268bf` on top
  of `ef236bd`, local only; diff scope exactly 6 NEW
  files under `apk/` — `build.sh` (executable,
  direct-SDK pipeline adapted from Surface Wars:
  javac → aapt2 compile/link → d8 → aapt add
  classes.dex → zipalign → apksigner), `AndroidManifest.xml`,
  `src/com/skit/voxboxamberfall/MainActivity.java`,
  `res/values/strings.xml`,
  `res/mipmap-xxxhdpi/ic_launcher.png` (generated
  amber/voxel icon, 11,443 bytes),
  `debug.keystore`. No game code, spec, tests,
  decision log, or VISUAL-TARGET-PLAN.md touched.
  `apk/assets/` and `apk/out/` are build staging only
  and were NOT committed. One build hiccup, fixed in
  the wrapper file only: em-dashes in Java comments
  broke javac's default US-ASCII encoding — replaced
  with hyphens, then the build passed clean.
- **Deliverable:** `~/workspace/your_files/VoxBox_Amberfall_v1.0.apk`,
  **1,176,107 bytes**,
  SHA-256 `f2bd848fe819533008eabfb95c642fb8ee2e118bfad5f25e8a50e2a0304e06c1`.
- **Gates, coordinator re-run (JDK 17 on PATH —
  the first coordinator apksigner attempt failed with
  `java: not found` because the exec shell does not
  inherit the login-shell PATH; re-run with
  `~/jdk17/bin` on PATH): apksigner verify v3 scheme
  TRUE, exit 0, 1 signer, cert SHA-256 matches D-027;
  zipalign `-c 4` PASS; badging:
  `package: name='com.skit.voxboxamberfall'
  versionCode='1' versionName='1.0'`,
  `minSdkVersion:'28'`, `targetSdkVersion:'35'`,
  `launchable-activity:
  name='com.skit.voxboxamberfall.MainActivity'`,
  `uses-feature: android.hardware.screen.landscape`
  (implied by the landscape activity),
  `application-label:'VoxBox: Amberfall'`,
  permissions `WAKE_LOCK` ONLY.
- **Packaged HTML:** fresh `npm run build` →
  `dist/player.html` 2,589,384 bytes; packaged staging
  copy identical byte count; in-APK copy
  (`assets/game/player.html` via `unzip -p`) `cmp`
  BYTE-IDENTICAL to the fresh build — verified by the
  coordinator, not just the builder.
- **External-fetch grep (coordinator re-run):**
  exactly 4 literal URLs in the built HTML, none a
  fetch target: `http://www.w3.org/1999/xhtml` and
  `http://www.w3.org/2000/svg` (XML namespaces in
  the data-URI SVG favicon); `https://jcgt.org/published/0007/04/01/`
  (GLSL shader comment citing the GGX VNDF paper in
  three.js code); `https://xandria-taylorchristian-mattheisens-projects.vercel.app`
  (the `href` of the decorative "make your own →"
  link on the Made-with-XANDRIA splash overlay,
  `src/runtime/splash.ts` `DEFAULT_GENERATOR_URL`).
  No `src="http` anywhere; bundle `fetch()` sites are
  local/bundled-asset loaders only. Hence NO INTERNET
  permission — correct.
- **Known behavior, disclosed (not a gate failure):**
  in this wrapper the splash "make your own →" link
  is inert (target=`_blank` with no WebChromeClient
  opens nothing). Enabling it is a follow-up, not a
  blocker: add a WebChromeClient / external-browser
  intent handler (no INTERNET permission needed for
  an external-browser intent), rebuild, re-verify.
  The game itself is complete without it.
- **Honest remaining unverified step:** real-phone
  install, launch, touch, performance, and
  save-persistence-across-launch are UNVERIFIED from
  the sandbox — no device install was performed or
  claimed. Phase 5 is VERIFIED complete.

## D-029 (2026-11-02, coordinator): Phase 6 complete — program complete

- **Written:** `BUILD-RECOVERY.md` (rebuild from a
  surviving checkout: branch, commands, tools, keystore
  notes, asset provenance, gate re-runs, gotchas) and
  `QA-REPORT.md` (consolidated verification record:
  per-phase verdicts, final gate tables, coverage,
  coordinator corrections, honest open list).
- **Program state at completion:** all phases verified
  (D-006, D-017, D-024, D-025, D-026, D-028); deliverable
  `~/workspace/your_files/VoxBox_Amberfall_v1.0.apk`
  (1,176,107 bytes, SHA-256
  `f2bd848fe819533008eabfb95c642fb8ee2e118bfad5f25e8a50e2a0304e06c1`,
  `com.skit.voxboxamberfall` 1/1.0, debug-signed).
- **Carried to the final report (not decided here):**
  real-phone verification (install/launch/touch/perf/
  persistence); release signing; store publish; push/
  merge; the D-018 bloom 1.25 exception; the D-016
  stale-pin question; the low-fps robustness proposal;
  the splash-link follow-up; the D-004 realism phase
  (launches only after the stylized APK is presented).

## D-030 (2026-11-02, realism phase): portal spawns are a FUTURE arena mode, not this phase

- **User decision 2026-11-02 ~09:24 PST (binding):** portal
  spawns are NOT in this phase. Enemy spawning stays normal
  (chapter-scripted) for the realism phase. The portal concept
  is recorded here as a FUTURE arena-game-mode/activity design
  note ONLY: a later arena mode/activity within the game in
  which enemies emerge from a portal somewhere on the map.
- **No code for it in this phase:** no arena-mode code, no
  portal spawn code, no portal placement, no spawn-table
  change. Any future arena work starts from this note and
  needs its own go-word; it must not be smuggled into a
  realism or polish pass.
- **Why it stays a note:** the realism phase scope is
  terrain/material/model realism (D-031–D-034). Changing
  spawn rules would change gameplay balance and chapter
  scripting, which the user explicitly deferred ("keep
  enemy spawning normal until then").

## D-031 (2026-11-02, realism phase): tile blending is definite — feathered terrain-type transitions

- **User decision 2026-11-02 ~09:24 PST (binding):** terrain
  tiles must blend/feather into each other — no hard
  unblended edges between terrain types.
- **Implementation (commit d3fe2ca, R1):**
  `engine/world/groundPaint.ts` `paintGroundVertex` gained
  step 2c, a boundary warp: a low-frequency fbm field
  displaces the altitude/slope/wet band inputs (±0.07
  slope units, ±2.2 m height), and every band window was
  widened (altitude 0.55-0.82 -> 0.48-0.85 of maxHeight,
  scree 0.78-0.90 -> 0.72-0.92, rock 0.60-0.74 ->
  0.52-0.78, cliff 0.42-0.58 -> 0.34-0.64, wet
  -0.1/+0.5 -> -0.6/+1.2) with wider wear feathers
  (discs 0.55 -> 0.35, paths 0.45 -> 0.25).
- **Contracts preserved:** the function stays pure in
  world coords, so detail chunks and the far shell still
  agree at the streaming seam and determinism holds; the
  cosmetic wear/overlay path is untouched — paths,
  tracks, roads stay overlays drawn over bases, never
  baked into base tiles (the 2026-10-30 tile-overlay
  rule still stands).
- **Measured:** new `tests/realism-blend.test.ts` (4
  tests) measures the feather on transects: slope
  transition spans >= 6 samples with no single-step
  color jump >= 0.12, cap fade spans >= 6 m, wet band
  fades over >= 0.5 m, painting is bit-identical on
  repeat. `tests/terrain-rebase.test.ts` digests were
  deliberately re-captured (hills 61c3dd8a, mountains
  61f91658); normals verified bit-identical via a
  normals-only scratch digest run (95182dc0 /
  2e7c3c36) — color-only movement, same discipline as
  V1/B2. The scratch test file was deleted after the
  run.

## D-032 (2026-11-02, realism phase): staged GLB candidates evaluated, NOT imported

- **Candidates (asset-pipeline/staging/voxbox-realism,
  qtmesh-validated, no degenerate faces):**
  pine_realistic (426 verts / 244 tris, 10 prims, 3
  materials), oak_realistic (2,708 / 1,288, 6 prims, 3
  materials), ruin_arch (192 / 96, 8 prims, 2
  materials), watchtower (264 / 156, 5 prims, 4
  materials). All are Blender primitive assemblies
  (boxes, cones, blob spheres), not sculpted models.
- **Rejection, measured not aesthetic:** importing them
  would break the instanced vegetation/structure pools
  — one InstancedMesh per material, so pine alone
  becomes 3 instanced meshes per LOD tier instead of
  2, and landmarks would need a separate GLB loader
  path outside the procedural StructureSets, for
  geometry no more detailed than the in-engine tiered
  cones/balls and procedural ruin arches already in
  place. Forcing them in would cost draw calls (the
  S25 gate is already open, not met) for no measured
  gain. Per the brief, a candidate that measures worse
  is not force-fit.
- **What WAS imported from the staged pack:** the four
  procedural terrain textures (D-033). The GLBs stay
  staged; if a future pass wants them, it needs a
  merged-geometry import that preserves the pool
  counts, and a side-by-side look at gate distance.

## D-033 (2026-11-02, realism phase): layered terrain textures replace painted-only ground

- **Implementation (commit b334385, R2):** the staged
  procedural terrain textures (PIL speckle, 1024px
  masters, downsampled to 512px WebP, ~370 KB total)
  are registered as realism-grass/soil/rock/moss in
  `gfx/BakedTextures.ts` and sampled in world space
  at 6 m tiling by `gfx/Materials.ts`
  `applyGroundLayers`, wired into `biomeGroundDef`
  so detail chunks and the far shell share the one
  layer program (cache key
  `xandria-ground-layers-v1`). Selection by slope
  (normal.y) and height (water plane via the shared
  `groundLayerUniforms`, set by Terrain from its
  paint context, -9999 default = no water), broken by
  a slow value-noise field so no contour line shows.
- **Honest layering:** the layer MODULATES the existing
  albedo (vertex colors + biome map survive), it does
  not replace it — flat ground keeps its grass macro
  look with grass grain, mid slopes pick up soil
  grain, steep faces rock grain, the shoreline moss
  grain. "Layered terrain textures" means exactly
  this, not four opaque zone paints.
- **Cost:** zero new draw calls, zero new programs,
  +4 textures on the gate (25 -> 29 expected at
  spawn). Provenance: staged pack MANIFEST.md
  (PROCEDURAL, Blender + PIL, asset-pipeline round
  2026-11-01); the WebP conversion is a format/size
  change only, same pixels.

## D-034 (2026-11-02, realism phase): leaf-textured canopies; bark/rock/wood PBR verified, not re-done

- **Implementation (commit b334385, R3):** new
  `TexKind 'leaf'` (leaf-blotch fbm + fine speckle,
  with Sobel normal twin) and
  `Materials.leafy()`, used by pine and oak foliage
  (hero specimens included — same species materials).
  White base color so the map carries the canopy
  color (the flat() path's color=hex would
  double-tint); vertexColors kept so per-instance
  canopy tints and undergrowth variation still
  multiply. Roughness 0.85.
- **What was NOT re-done, and why:** trunks already
  use the baked surf-wood albedo + normal pair, and
  rocks/structures already use surf-rock /
  surf-concrete baked pairs — those ARE textured PBR
  assets, verified in this pass, and re-authoring
  them would change nothing measurable. The new PBR
  work in this phase is leaf + ground layers (D-033).
  Palm, cactus, deadtree, mushroom, crystalflora
  keep their flat/emissive materials (deadwood and
  glowing flora are not leaf canopies; changing them
  would fight their art direction).
- **Measured:** `tests/realism-materials.test.ts` (4
  tests): biomeGroundDef stamps the layers program
  on both baked and canvas paths; leafy carries a
  map + normal twin with vertexColors true and a
  white base color; leafy is cached per color.

## D-035 (2026-11-02, realism phase): R2 test re-pins are deliberate, not weakenings

- **Cache key (commit 888014c):** `tests/terrain-detail.test.ts`
  pinned `xandria-ground-detail-v1`; the ground program gained
  the R2 layered-texture stage on top of the detail injection
  (which still runs first in the onBeforeCompile chain), so
  its key is now `xandria-ground-layers-v1`. The test still
  asserts one shared material, a real onBeforeCompile, and
  one exact program key — the re-pin is justified in the
  test comment, same discipline as the terrain-rebase
  digest re-captures.
- **Registry (commit 6bacda5):** `tests/gfx-baked-spike.test.ts`
  pinned the exact BAKED_TEXTURES key list; R2 added
  realism-grass/moss/rock/soil by design, so the list is
  now four entries longer. The test still asserts the
  exact full list — it pins MORE, not less.
- **Rule restated:** a test pin moves only when the pinned
  thing deliberately changed by design, the new value is
  named in the test comment, and the assertion keeps its
  strength. A pin is never edited to make a red test green
  without a design reason.

## D-036 (2026-11-02, realism phase): realism verification complete — gates, loop, APK

- **Suite + types:** 185 files, 2,732 tests, ALL PASSED
  (2,724 stylized baseline + 8 new realism tests);
  `tsc --noEmit` exit 0 on the final tree.
- **Perf gates (medians of 8, SwiftShader, zero
  console errors everywhere):** zero new draw calls
  in all 6 view/config cells (spawn 676/676/664,
  forest 676/676/607 — forest cells identical to the
  Phase 4 table on calls/tris/geoms); textures 25 →
  31 (+4 ground layers + leaf map/normal twin);
  programs 39 → 42 phone / 38 → 41 desktop forest
  (+3). Luma darker by 0.032–0.047 (accepted realism
  tone, see QA-REPORT.md — lighting unchanged).
  Raw gate JSONs + before/after PNGs in
  `evidence/realism/` (untracked, standing practice
  for evidence sets).
- **Core loop:** victory-path spec 3 passed in
  51.7 min on the realism build (beacon VICTORY,
  hunt VICTORY, death DEFEATED).
- **HUD:** probe 0 overlaps at rest (844 + desktop),
  0 console errors; suite e2e HUD specs green.
- **APK:** code 2 / 1.1, 1,548,843 bytes, SHA-256
  d566c1ee…e3a, same debug keystore (cert matches
  D-027), installs over v1.0; v1.0 file untouched.
- **Still open (user-only):** real-phone install /
  feel / perf vs the S25 150-draw gate, hero/credit
  persistence across the update, push/merge/publish,
  release signing. The S25 gate stays OPEN — sandbox
  calls are not phone evidence.

## D-037 (2026-11-02, fix build): humanoid facing follows travel — the +PI moonwalk

- **Report:** first real-phone playtest (moto g play 2024, 1600x720
  touch landscape) — "the character is stuck running backwards, and
  facing backwards."
- **Root cause, verified in code:** every humanoid rig is makeHumanoid,
  whose model faces +Z — visor band is a cylinder arc centered on +Z,
  eye spheres and boot toes sit at +Z, cape root and backpack sit at
  -Z, and the run-cycle lean pitches the top toward +Z. But
  CharacterController.update() set rotation to `this.yaw + Math.PI`,
  and Npc + EnemyAI walker/brute used `atan2(dir.x, dir.z) + Math.PI` —
  exactly opposite travel. The model walked away from the camera
  showing its face: the reported moonwalk.
- **Fix:** the +PI removed in all three places. Untouched by design:
  tpAction's camYaw +PI offset (that one makes the movement direction
  itself correct away from the camera — a different thing), and the
  flyer path (makeDrone rig, already bare atan2).
- **Regression test** (`tests/facing-direction.test.ts`, 17 tests):
  +Z maps onto travel for 7 directions, the old +PI maps onto exactly
  backwards, boot toe +Z / cape root -Z pin the model-forward evidence,
  and setMoveStick(null) clears the axes — the "stuck running" report
  had no stuck-stick code path (releaseAll() clears stick +
  setMoveStick(null)), and this test proves the release path rather
  than assuming it.

## D-038 (2026-11-02, fix build): title-mode gate hides in-game chrome

- **Report:** "opening screen has issues and is overlapping things" —
  SKILLS/BESTIARY/MOUNTS/COMPANIONS chips, the FACTIONS panel, and
  MAP/ATLAS/MINIMAP/PHOTO chips painted over the title + save-slot
  overlay.
- **Mechanism, confirmed:** those chips/panels are created by the
  blueprint and appended to the container outside the HUD overlay
  lifecycle, so HUD.clearOverlays() never hides them.
- **Fix:** Engine.showTitle() sets `.x-title-mode` on the container,
  beginPlay() lifts it, and a HUD stylesheet gate hides every in-game
  chip/panel/touch control while it is set. Slot callbacks re-show the
  title through showTitle(), so the gate re-applies on every call;
  showTitle() also drops stale `.x-menu-open`/`.x-factions-open` so
  the compact drawers cannot re-show chips over the title.
- **Deliberately NOT hidden:** the title overlay itself and its
  internals (save-slot rows, backup row, dead notice, ironman button
  and confirm, journal/customize buttons) — none match the gate
  selectors. Save export/import keep working: they are title-overlay
  buttons, untouched by the gate.
- **Trade-off, logged:** the WorldAtlas chip's old comment called it
  an entry point "on the title screen too". Hiding it on title is
  deliberate — a title screen must not show in-game chrome.
- **Specificity trap found and fixed:** the compact block
  (TouchControls CSS, injected later) shows the MENU/FACTIONS toggles
  at the same specificity as the gate, so the later sheet would have
  won on title. The gate now carries `.x-title-mode.x-touch`
  qualified rules for both toggles (and the photo chip) that outrank
  it. Verified by the extended probe's title config, not by reasoning.

## D-039 (2026-11-02, fix build): touch-landscape compact layout (height >= 520)

- **Report:** at 1600x720 touch landscape, neither the <500px-height
  narrow layout nor the non-touch desktop layout applies, so the base
  layout showed eight large buttons (ATK 88px, others 56-64px) spread
  down the right side plus full objective, FACTIONS, score, INTEGRITY,
  and chip rows.
- **Fix:** a compact mode for landscape touch viewports with height
  >= 520 (pure function `compactTouchButtonsLandscape`, wired into
  applyButtonLayout after the short-screen compactor):
  - buttons re-stacked into two tight bottom-right rows — row A:
    ATK 64 + DASH/JUMP 56 at bottom 16; row B: STRIKE/WAVE/MEND/DEPLOY/
    SNEAK 52 at bottom 88 (8px row gap, every target >= 44px; row B's
    left edge at x1292 on a 1600px screen, clear of the centred bars
    ending at x910);
  - objective + score slimmed into one top strip (objective desc
    hidden, progress 12px, score val 17px);
  - FACTIONS collapsed behind a HUD toggle (panel parks at top:116,
    clear of the 44px toggle at top:66);
  - INTEGRITY slimmed (8px bars) and parked bottom-centre ABOVE the
    ability bar — bottom:132, not bottom:16, which would have sat on
    the ability bar (bottom:64, ~54px tall);
  - MAP/ATLAS/MINIMAP/PHOTO hidden behind a single HUD MENU button,
    revealed as one row at bottom:64 (4px above the 44px MENU button).
- **Probe gap found and fixed:** the old probe KEYS filter missed the
  blueprint chips/panels entirely (ids end in -chip/-panel, no
  matching class), so "0 overlaps" never covered them. KEYS now
  includes chip/panel/toggle ids, the viewport-sized .xhud root is
  excluded (it would false-positive against every container-level
  chip), and configs now cover 1600x720 touch, the title screen at
  that geometry (gate assertion), and 390x844 portrait touch.

## D-040 (2026-11-02, fix build): mobile-tier perf cuts — grass, bloom, pixel ratio

- **Report:** lag on a moto g play 2024, weaker than the S25 the mobile
  tier was tuned for. The phone runs the s25 tier via auto-detect
  (coarse pointer + small screen); the APK passes no tier override.
- **What was cut (all mobile-tier only; desktop flags byte-identical,
  so desktop is the control):**
  - grassMul: s25 grass tufts halved (new TierFlags field, plumbed
    Scatter -> ChunkedScatter -> Grass only; trees/props keep
    densityMul). Grass is pure decoration and the largest instance
    contributor. Unit test pins grass-only halving + flat pool set.
  - bloomResScale: s25 bloom targets at half resolution. Found by
    reading three's UnrealBloomPass: it sizes its targets from the
    composer's setSize, so scaling the constructor vector alone would
    do nothing — PostFX wraps the pass's setSize instead. Bloom is
    blur by nature, so half-res reads the same.
  - pixelRatioCap: s25 1.5 -> 1.25 (about 30% fewer shaded pixels at
    the same CSS size).
- **Measured gates (medians of 8, SwiftShader, zero console errors
  everywhere; `evidence/fix1/`, tags baseline-s25 / fix1-s25):**
  - s25 spawn 844: instances 121,653 -> 65,877 (-45.9%),
    tris 1,574,038 -> 1,350,934 (-14.2%), calls 675 -> 675,
    luma 0.2477 -> 0.2467.
  - s25 spawn 1600: instances 121,653 -> 65,877,
    tris 1,614,038 -> 1,390,934 (-13.8%), calls 677 -> 677,
    luma 0.2893 -> 0.2882.
  - s25 forest 844: instances 146,485 -> 90,709 (-38.1%),
    tris 2,435,710 -> 2,212,606 (-9.2%), calls 677 -> 677,
    luma 0.2324 -> 0.2313.
  - s25 forest 1600: instances 146,485 -> 90,709,
    tris 2,435,710 -> 2,132,606 (-12.4%), calls 677 -> 673,
    luma 0.2710 -> 0.2703. The extra -80,000 tris vs the 844 cell is
    residency variance, NOT claimed as a gain: instance counts are
    identical across both forest after-cells while geometries differ
    (377 vs 381) — a chunk-residency difference at sample time.
  - Desktop control (tags baseline / fix1): instances byte-identical
    in every cell (182,019 spawn / 219,267 forest), calls in-band,
    luma deltas <= 0.0054 — all within the live game's run-to-run
    view-state variance (tri sample ranges overlap baseline ranges).
    The look is preserved: no re-brightening, no darkening.
- **NOT cut, stated plainly:** draw calls. No lever here touches the
  pool structure, which is tier-independent by design, so calls stay
  ~675 on s25 and ~670-676 on desktop. The S25 150-draw gate stays
  OPEN — cutting calls needs pool-structure surgery, out of
  fix-build scope. No phone framerate is claimed: headless runs at
  devicePixelRatio 1, so the pixel-ratio cap and bloom resolution do
  not move headless counters at all; their effect is computed pixel
  math (backing pixels -30%, bloom pixels -75%), not a measured
  frame time.

## D-041 (2026-11-02, fix build): compact-mode toast parked bottom-centre

- **Probe catch:** after D-038/D-039, the extended probe found one
  overlap at 1600x720 touch: toast <-> tutprompt. Diagnosis: the
  toast (top:18%, centered) painted over the tutorial card (top:104,
  centered) across the whole compact range — and the pre-fix probe
  run proved the collision class was pre-existing (the base
  landscape block already put the tutcard at top:140, inside the
  toast band; the compact move to 104 only widened it).
- **Fix:** in the compact block only, the toast is bottom-anchored
  at bottom:220 — above the slim INTEGRITY bars (bottom:132, ~70px
  tall, top edge bottom:202), a constant ~18px gap at every height,
  because both anchors are bottom-relative. A px top would
  re-collide at tall viewports (18% grows with height). The base
  landscape block (H<520) never collided and is untouched.
- **Probe table, new probe vs old dist (pre-fix) vs new dist (fix),
  zero console errors everywhere:**
  - 844x390: 0 -> 0. Desktop: 0 -> 0.
  - 1600x720 touch: 3 -> 0 (toast<->tutcard and the photo-chip <->
    minimap/mbox pile both gone).
  - 1600x720 title: 2 overlaps + 11 chips/panels visible -> 0 +
    zero chips visible, 5 slot rows, title + x-title-mode present.
  - Portrait touch: 20 -> 20, pair-for-pair identical areas — NO
    REGRESSION. Portrait was never a target geometry (the game is
    landscape-only per manifest); the compact block is
    landscape-gated, so portrait keeps its base-layout collisions
    untouched. Fixing portrait layout is a separate decision, not
    smuggled into this fix build.
