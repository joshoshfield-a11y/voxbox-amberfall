# VoxBox: Amberfall — Visual Target Plan

**SUPERSEDED in sequence 2026-10-31 ~14:07 PDT:** the incremental
V3-then-V4 sequence below is replaced by VISUAL-BREAKOUT-PLAN.md (one big
graphics push: light rig + baked AO + ground/dressing + vegetation +
character readability + post/grade + sky, tiered). V1/V2 stand as built.
The pending V3 start question is replaced by the breakout plan's
decisions D1–D3, awaiting his approval. This document is kept as the
record of the original plan, not deleted.

**Target adopted 2026-10-31 (user's word: "Make this the target look").**
Reference: the user's screenshot `workspace/user/files/1000005834_2_es30.jpg`
(Forgotten Valley chapter shot: vibrant stylized low-poly forest, readable
hero, glowing supply cache, high-contrast accents) + the stylized
low-poly / retro-modern brief pasted with it.

**Standing rules that still bind this work:**
- S25 150-draw-call budget is a gate with tiering, never a waiver.
  Real-device (S25) verification is the gate for any visual claim.
- Nothing pushed, merged, or published without the user's word.
- Pinned tests are never weakened silently. Updating a pin is a deliberate
  decision, named in the report, with before/after evidence.
- Graphics wave 2 binding rule carries over: no new InstancedMeshes,
  no new fullscreen passes; draw-call count unchanged by construction
  unless the user explicitly approves a measured increase.

## What the code already has (verified 2026-10-31, not assumed)

- Three.js engine. Characters are procedural low-poly humanoids built by
  `ModelForge` (`engine/gfx/Characters.ts`, "PS2-era: chunky geometry,
  flat colors"). The "voxel" layer (`engine/game/voxelGeo.ts`,
  `VoxelGeoCache`) is a detail system on top, not the whole renderer.
- Vegetation (`engine/world/Vegetation.ts`) is species-driven with 3 LOD
  tiers and **GPU wind sway already** (vertex-shader `aSway` weights,
  zero per-frame CPU). Brief point 5's wind sway is DONE.
- Ground color is baked at chunk-build time into vertex colors via
  `paintGroundVertex` (`engine/world/groundPaint.ts`), zero per-frame cost.
  **Constraint:** `tests/terrain-rebase.test.ts` pins ground-color digests
  bit-identically ("future changes must keep THIS digest"). Any palette
  or ground-color change REQUIRES a deliberate digest update.
- Post chain already exists (`engine/gfx/PostFX.ts`): UnrealBloom gated
  by `spec.theme.bloom` (currently true) + `GradeShader` (lift/gamma/gain,
  saturation, vignette, ~1-2% GPU on the mobile floor). Brief point 4 is
  mostly a RETUNE, not new passes.
- Palette lives in spec: `spec/emberwood.spec.json` `theme.palette`
  (currently muted: ground `#7d7868`, accent amber `#ffd76a`).
- Baked textures exist (`engine/gfx/BakedTextures.ts`, WebP bakes with
  palette fallback). Vertex-baked ambient occlusion does NOT exist yet;
  it fits the existing bake-at-build pattern.

## Phases (in order; each freezes with evidence before the next starts)

### V0 — Lock the target (docs only, no game edits)
- Record the target swatches/geometry notes from the reference shot in
  this file's appendix when the first visual pass lands.
- Open, NOT decided by the look pick: the "Forgotten Valley" name. The
  spec still says "Ancient Realm"; no rename happens on this plan's
  authority.

### V1 — Palette + ground ✅ DONE 2026-10-31 — report: `VISUAL-V1-REPORT.md`
- Retune `theme.palette`: greens more vibrant/stylized, interactive
  elements (supply caches, UI overlays) in high-saturation amber /
  electric-blue / neon-orange accents.
- Ground variation through `paintGroundVertex` (vertex-color variation
  to break tiling; the fine-grain litter fleck tried in Phase 3 stays
  OUT unless the digest decision explicitly re-admits it).
- **Gate:** terrain-rebase digests + perf-tiers bounds are updated
  deliberately and listed in the report, with before/after screenshots
  at fixed configs (844x390, 915x412, desktop). No silent pin edits.
- **Outcome:** palette retuned (foliage/grass `#4a8f45`, accent `#ff9e2e`,
  ground olive `#8a8a52`, water electric blue `#2f9fd8`, + 5 UI GOLD
  constants); sunlit-mottle term added (0.13 freq, NOT the fleck);
  2 digests deliberately re-captured (`2619648d→08946d8f`,
  `cc8ca994→e339d7f5`, normals proven identical); perf-tiers bounds
  unmoved (20/20 unchanged); full suite 170 files / 2,672 tests green;
  draw calls identical at all 3 configs (670/670/601); buckets 228→227
  explained (primary/rock split consolidation, not a regression).
  Evidence: `evidence/visual-v1/` (6 PNGs + 6 JSONs).

### V2 — Geometry smoothing (the "drop hard voxels" step) — DONE
- `ModelForge` / `Characters` profiles: slightly rounded shoulders,
  cylindrical limbs, tapered helmets, smoothed vertex normals where it
  reads. Same for tree foliage profiles in `Vegetation`.
- The voxel-detail layer follows the same profile; it does not get a
  separate blocky pass.
- **Gate:** bucket-neutral (no new InstancedMeshes), NPC mesh budget
  (≤60/NPC) held, draw calls + triangles measured before/after at the
  same configs. Poly counts stay microscopic; no PBR, no heavy textures
  (per the brief itself).
- **Outcome:** `smoothPart()` (indexed, averaged normals) + `taperedDome()`
  in `Characters.ts`; limbs via smooth segments, shoulders/head/torso/
  armor shells smooth, horns/fins/spikes/eyes/rivets/emblem/cape kept
  faceted; pine cones LOD0 7→9 / LOD1 5→7 / LOD2 5 (54/28/10 tris proven
  in tests); voxelGeo/VoxelArmor untouched (cape smoothing flagged as a
  separate decision — pinned blocky panels); NPC meshes 46..51 ≤ 60;
  no test assertion changed (one comment-only touch); full suite
  171 files / 2,680 tests green; draw calls + triangles identical at
  all 3 configs (670/670/601; spawn view has no pines — Emberwood is
  `ruins`/oak+deadtree — so the 0 tri delta is expected); buckets
  identical (197 NpcInstancer; V1's 227 definition unreproducible from
  surviving JSONs, see report); zero console errors. Report:
  `VISUAL-V2-REPORT.md`. Evidence: `evidence/visual-v2/` (6 PNGs +
  6 JSONs + supplementary close-up pair).

### V3 — Baked ambient occlusion
- Bake AO into vertex colors at chunk-build (terrain/props) and at
  geometry-build (characters/props), following the existing
  bake-at-build pattern.
- **Gate:** zero per-frame cost; no new passes; before/after stills at
  the same camera.

### V4 — Post + particle retune
- Bloom threshold tuned so only emissive surfaces bloom (supply cache
  lights, glowing runes); grade values toward a warm-to-cool unified
  mood; vignette kept subtle. Particles retuned to soft additive
  sprites (`engine/gfx/Particles.ts`).
- **Gate:** no new fullscreen passes; mobile GPU cost re-measured
  against the GradeShader ~1-2% baseline.

### V5 — Playable verification
- Fresh playable link carrying the view-stick build + the visual work.
- User playtest on the S25 is the gate (stick feel, glitch clip still
  owed from the landscape build, visual verdict). No claim ships on
  emulation alone.

## Explicitly OUT of this plan

- New units, systems, quests, or content. Visuals only.
- A rename to "Forgotten Valley" (open decision, separate).
- PBR materials, hyper-realistic textures, heavy post chains.
- Any push, merge, publish, or APK — each needs its own word.
- Weakening a pinned test without naming it as a deliberate update.

## Supersession notes (do not regress)

- The Phase 2 voxel-detail revival options (accept +1 bucket / revisit
  mesh budget / dims-keyed design) are PARKED by this direction, not
  deleted. The preserved halted patch stays in `evidence/phase2/halted/`
  and can be revisited if the smooth direction ever reverses.
- Phase 3's ground-paint halt is folded into V1 (still needs the digest
  decision). Phase 3's count-density halt stands unless the user calls
  it separately.
- The view-stick playable link still expires 2026-10-31 ~23:48 PDT;
  the user's playtest verdict + landscape glitch clip are still owed
  and are unaffected by this plan.
