/**
 * Graphics wave 2, workstream A — the shared ground-color recipe.
 *
 * ONE recipe, two consumers: Terrain.buildChunkGeometry (detail chunks) and
 * FarTerrain (the low-res far shell) both paint through paintGroundVertex, so
 * the shell and the detail mesh agree at the streaming seam by construction.
 *
 * The function is PURE in (world x, z, height, up-normal): chunk edge
 * vertices shared by neighbors get bit-identical colors, and the same seed
 * always produces the same ground (determinism). Wear discs/paths ride on
 * the Terrain instance and are identical for every chunk build.
 *
 * Cost: zero per-frame. Everything here is baked into the vertex color
 * attribute at chunk-build time. The close-up micro-detail normal layer is
 * the shared material's shader (gfx/Materials groundDetailUniforms), not
 * per-chunk work.
 *
 * Aesthetic: blocky, not noisy — every band is a smoothstep lerp, patch
 * noise stays at the legacy low frequencies. (A fine-grain litter
 * fleck was tried here in Phase 3 and HALTED: tests/terrain-rebase
 * pins the ground-color digests bit-identically — "future changes must
 * keep THIS digest" — so no color-term change can ship.)
 *
 * Visual Target V1 (2026-10-31) supersedes that freeze DELIBERATELY and
 * only for this change: the user authorized pinned-digest updates for the
 * palette + ground pass, and tests/terrain-rebase records the V1
 * re-capture (old digests, new digests, why). The Phase-3 litter fleck
 * itself stays OUT — V1 adds a different term instead (step 2b, sunlit
 * mottle: mid-frequency tonal variation, not fine grain).
 */
import * as THREE from 'three';
import type { Noise2D } from '../core/Rng';

/** Trampled disc: worn ground around spawn / landmark bases. */
export interface WearDisc { x: number; z: number; radius: number; strength: number; }
/** Worn path corridor between two points (e.g. spawn -> nearby landmark). */
export interface WearPath {
  ax: number; az: number; bx: number; bz: number;
  width: number; strength: number;
}

export interface GroundPaintColors {
  ground: THREE.Color; alt: THREE.Color; rock: THREE.Color;
  patchDark: THREE.Color; patchLight: THREE.Color;
  /** loose scree on moderate slopes */
  scree: THREE.Color;
  /** dark cliff faces */
  cliff: THREE.Color;
  /** sedimentary strata striping on cliffs */
  strata: THREE.Color;
  /** wet shoreline band */
  wet: THREE.Color;
  /** high-altitude caps: snow / ash / pale sand, per biome */
  high: THREE.Color;
  /** trampled/worn ground */
  wear: THREE.Color;
}

export interface GroundPaintCtx {
  colors: GroundPaintColors;
  /** level water plane Y, or null when the map has no water */
  waterY: number | null;
  maxHeight: number;
  discs: WearDisc[];
  paths: WearPath[];
}

/**
 * Build the derived color set from the three authored palette colors plus
 * the biome's high-altitude cap color (already in raw-sRGB vertex space —
 * pass colors through convertLinearToSRGB like biomeTint does).
 */
export function deriveGroundColors(
  cGround: THREE.Color, cAlt: THREE.Color, cRock: THREE.Color, cHigh: THREE.Color,
): GroundPaintColors {
  const patchDark = cGround.clone().lerp(cRock, 0.35).multiplyScalar(0.72);
  const patchLight = cGround.clone().lerp(new THREE.Color(1, 1, 1), 0.28);
  return {
    ground: cGround, alt: cAlt, rock: cRock,
    patchDark, patchLight,
    scree: cRock.clone().lerp(cGround, 0.45),
    cliff: cRock.clone().multiplyScalar(0.72),
    strata: cRock.clone().lerp(cGround, 0.3).offsetHSL(0.01, 0.05, 0.04),
    wet: cGround.clone().lerp(new THREE.Color(0.32, 0.3, 0.28), 0.45).multiplyScalar(0.62),
    high: cHigh,
    wear: cGround.clone().lerp(cRock, 0.35).multiplyScalar(0.9),
  };
}

/**
 * High-altitude cap color for a biome ground kind — snowfields go brighter
 * white, volcanic goes dark ash crust, desert pale sand, rock biomes light
 * gray, everything else lightened alt. `cAlt` must already be in raw-sRGB
 * vertex space (biomeTint output).
 */
export function highColorForGroundKind(kind: string, cAlt: THREE.Color): THREE.Color {
  switch (kind) {
    case 'snowdrift': return new THREE.Color('#f2f6fc').convertLinearToSRGB();
    case 'emberrock': return new THREE.Color('#16110d').convertLinearToSRGB();
    case 'cracked': return new THREE.Color('#e9dab9').convertLinearToSRGB();
    case 'wetsand': return new THREE.Color('#e6dcc2').convertLinearToSRGB();
    case 'rock': return new THREE.Color('#8a9298').convertLinearToSRGB();
    default: return cAlt.clone().lerp(new THREE.Color(1, 1, 1), 0.35);
  }
}

/**
 * Paint one ground vertex. `ny` is the surface up-component (1 = flat).
 * Noise MUST see Math.fround(x/z) — the exact f32 coords the legacy build
 * stored — so detail and far-shell values agree.
 */
export function paintGroundVertex(
  out: THREE.Color, ctx: GroundPaintCtx, noise: Noise2D,
  x: number, z: number, y: number, ny: number,
): void {
  const c = ctx.colors;
  const fx = Math.fround(x), fz = Math.fround(z);
  // 1. base macro variation: ground <-> alt (legacy term, verbatim)
  const slopeN = noise.get(fx * 0.05, fz * 0.05);
  out.copy(c.ground).lerp(c.alt, (slopeN + 1) / 2);
  // 2. patchiness: earthy hollows + bleached rises (legacy term, verbatim)
  const patchN = noise.get(fx * 0.33 + 47.3, fz * 0.33 - 23.7);
  const pk = (patchN + 1) / 2;
  if (pk < 0.42) out.lerp(c.patchDark, ((0.42 - pk) / 0.42) * 0.6);
  else if (pk > 0.58) out.lerp(c.patchLight, ((pk - 0.58) / 0.42) * 0.4);

  // 2b. sunlit mottle (Visual V1): mid-frequency tonal variation that
  // breaks up repeating ground tiling at a ~8 m scale. Deliberately NOT
  // the Phase-3 litter fleck (0.55 freq, ±0.22 lerp toward patch
  // light/dark with a warm cast): this term is lower frequency (0.13)
  // and smaller amplitude, a tonal variation, not grain. It runs after
  // patchiness and before altitude/slope/wear, so wear still modulates
  // it. Pure in (fx, fz) like the terms above — seams and determinism
  // are unaffected, and it costs nothing per frame (baked at build).
  const mottleN = noise.get(fx * 0.13 + 11.7, fz * 0.13 - 5.3);
  const mk = (mottleN + 1) / 2;
  if (mk > 0.62) out.lerp(c.patchLight, ((mk - 0.62) / 0.38) * 0.22);
  else if (mk < 0.38) out.lerp(c.patchDark, ((0.38 - mk) / 0.38) * 0.18);
  // 2c. realism R1 — boundary warp + feathered bands (user decision
  // 2026-11-02: terrain tiles MUST blend, no hard unblended edges
  // between terrain types). A low-frequency noise field displaces the
  // inputs to the altitude/slope/wet bands, so type transitions
  // undulate and feather instead of following exact slope/height
  // contour lines, and every band window below is widened so adjacent
  // types overlap over a real distance instead of a single step. Pure
  // in (fx, fz) like the terms above — detail chunks and the far shell
  // agree, the seam/determinism contract is intact, and the cosmetic
  // wear/overlay path (step 6) is untouched: overlays are still drawn
  // over bases, never baked into them.
  const warpN = noise.fbm(fx * 0.02 + 91.7, fz * 0.02 - 33.1, 3);
  const nyW = ny + warpN * 0.07; // ±0.07 slope-unit warp
  const yW = y + warpN * 2.2;    // ±2.2 m height warp
  // 3. altitude band: snow / ash / pale caps (window widened 0.55-0.82
  // -> 0.48-0.85 of maxHeight, on the warped height)
  const maxH = Math.max(1, ctx.maxHeight);
  const ah = THREE.MathUtils.smoothstep(yW, maxH * 0.48, maxH * 0.85);
  if (ah > 0) out.lerp(c.high, ah * 0.85);
  // 4. slope bands: scree aprons -> rock faces -> dark cliffs + strata.
  // Windows widened (scree 0.78-0.90 -> 0.72-0.92, rock 0.60-0.74 ->
  // 0.52-0.78, cliff 0.42-0.58 -> 0.34-0.64) on the warped slope, so the
  // three types overlap over ~0.3 slope units instead of touching at
  // a line. (The old 0.74 full-rock point matched the legacy 0.75
  // threshold; the feathered overlap replaces that hard point.)
  const screeF = 1 - THREE.MathUtils.smoothstep(nyW, 0.72, 0.92);
  if (screeF > 0) out.lerp(c.scree, screeF * 0.65);
  const rockF = 1 - THREE.MathUtils.smoothstep(nyW, 0.52, 0.78);
  if (rockF > 0) out.lerp(c.rock, rockF);
  const cliffF = 1 - THREE.MathUtils.smoothstep(nyW, 0.34, 0.64);
  if (cliffF > 0) {
    out.lerp(c.cliff, cliffF * 0.85);
    // sedimentary striping, horizontal bands warped by low-freq noise
    const str = 0.5 + 0.5 * Math.sin(yW * 0.85 + noise.fbm(fx * 0.008 + 3.1, fz * 0.008 - 1.7, 2) * 5.0);
    out.lerp(c.strata, cliffF * str * 0.4);
  }
  // 5. shoreline: dark wet band hugging the water level (feathered
  // both sides: -0.1/+0.5 -> -0.6/+1.2 on the warped height)
  if (ctx.waterY !== null) {
    const wetF = 1 - THREE.MathUtils.smoothstep(yW, ctx.waterY - 0.6, ctx.waterY + 1.2);
    if (wetF > 0) out.lerp(c.wet, wetF * 0.7);
  }
  // 6. worn ground: trampled discs + path corridors (spawn, landmarks)
  let w = 0;
  for (let i = 0; i < ctx.discs.length; i++) {
    const d = ctx.discs[i];
    const dist = Math.hypot(x - d.x, z - d.z);
    if (dist < d.radius) w += d.strength * (1 - THREE.MathUtils.smoothstep(dist, d.radius * 0.35, d.radius));
  }
  for (let i = 0; i < ctx.paths.length; i++) {
    const p = ctx.paths[i];
    const dx = p.bx - p.ax, dz = p.bz - p.az;
    const len2 = dx * dx + dz * dz;
    let t = len2 > 0 ? ((x - p.ax) * dx + (z - p.az) * dz) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dist = Math.hypot(x - (p.ax + dx * t), z - (p.az + dz * t));
    if (dist < p.width) {
      const endFade = Math.min(1, Math.min(t, 1 - t) * 6);
      w += p.strength * (1 - THREE.MathUtils.smoothstep(dist, p.width * 0.25, p.width)) * endFade;
    }
  }
  // Trampled look: darken toward worn earth but keep the underlying
  // variation (patchiness must survive — see the genre-grade variation gate).
  // Trampled ground: gently darken + shift toward worn earth. Deliberately
  // subtle — a multiply preserves the patch variation underneath (the
  // genre-grade variation gate requires max-min luminance > 0.15).
  if (w > 0) {
    // VoxBox breakout B3: the old term (cap 0.5, darken 0.15, lerp 0.25)
    // left spawn->landmark paths invisible in the baseline captures at
    // gameplay distance. Stronger, still subtle — patch variation under
    // the wear survives (the genre-grade variation gate still holds).
    const k = Math.min(w, 0.6);
    out.multiplyScalar(1 - k * 0.20);
    out.lerp(c.wear, k * 0.35);
  }
}

/**
 * VoxBox breakout B2 — baked ambient occlusion, build-time only.
 *
 * Given the vertex height `y` and horizon samples `{ h, d }` (neighbor
 * height and horizontal distance), returns a darkening factor in
 * [0.55, 1.0]: a neighbor rising above the vertex occludes skylight in
 * proportion to its horizon angle, approximated as rise / (0.35 * distance)
 * and averaged over all samples. Ridges (neighbors below) occlude nothing.
 * The 0.35 divisor is deliberately sensitive: the baked world is gentle
 * hills (14 m relief), and the 0.6-divisor first pass measured <1%
 * darkening world-wide — a no-op. At 0.35 with a 25 m radius, valley
 * floors read ~5-10% darker: depth without mud.
 *
 * Applied by the callers AFTER paintGroundVertex, so it darkens valleys,
 * gullies, and cliff bases without touching the recipe's hue terms. Zero
 * per-frame cost — it is baked into the vertex color attribute. The two
 * samplers are both deterministic in world coords (detail chunks sample
 * the extended height grid, the far shell samples terrain.heightAt), so
 * no seam step appears where detail meets shell.
 */
export function aoDarken(y: number, samples: Array<{ h: number; d: number }>): number {
  let occ = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const r = (s.h - y) / (s.d * 0.35);
    occ += r < 0 ? 0 : r > 1 ? 1 : r;
  }
  return 1 - 0.45 * (occ / samples.length);
}
