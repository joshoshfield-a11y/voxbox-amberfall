# Phase 2 detail — HALTED, preserved here (not shipped)

Voxel pass 1 character detail (sub-voxel subdivision of armor, visor-slit
variants per faction, tier gate) was BUILT, unit-tested (10 new tests, all
green), and MEASURED — then HALTED under the Phase 2 hard rule
(bucket-neutral) because merged detail split instancer buckets 220 → 221
on desktop (+24 over the cache-only configuration), and three
neutralization attempts (input quantization, vertex snapping, shared-dims
re-basing) all left the number at exactly 221. The child-mesh design that
IS bucket-neutral by construction is blocked by the pinned per-NPC
mesh-count budget tests (≤60; child detail measured 76–88), which must not
be weakened. Full evidence in MOBILE-FIRST-REPORT.md (Phase 2 section).

What SHIPPED instead: VoxelGeoCache wiring only (Npc/EnemyAI pass the
shared cache) — buckets 220 → 197, draw calls flat-to-down, zero new
meshes. See the Phase 2 commit.

To revive detail, a parent/agent decision is needed (override the +1, or
revisit the mesh-budget tests, or a detail design keyed purely by dims).
The full working-tree diff of the halted work is in
`phase2-detail-work.patch` (applies to the Phase 1b tree, e6d6ba6, plus the
cache wiring already shipped — re-apply by hand, do not `git apply`
blindly); the halted unit tests are in
`voxel-pass1-detail.HALTED.test.ts` (kept out of `tests/` so vitest
does not run them).
