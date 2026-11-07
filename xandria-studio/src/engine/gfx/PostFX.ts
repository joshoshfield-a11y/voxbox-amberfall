/**
 * Post-processing: UnrealBloom when spec.theme.bloom, plus an optional retro pixelation pass.
 * Falls back to plain rendering if the composer fails to build (e.g. exotic drivers).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GradeShader, setGradeUniforms } from './GradeShader';
import { gradeAtmosphere } from './GenreGrade';
import type { GameSpec } from '@spec';

/**
 * VoxBox breakout B6: bloom threshold — only true HDR emitters bloom.
 * The dusk sky horizon sits at linear ~1.03 (below this threshold, so the
 * sky no longer hazes into white), while lamp orbs (2.6), doorways (2.8),
 * windows (2.8), ground lanterns (2.6), and rune strips (2.0 emissive plus
 * sun diffuse) all clear it. Sunlit ground (≤ ~0.8) stays below. The
 * Props/PropSets emissive bumps from the B6 plan (rune strips 2.0 -> 2.8,
 * crystals 1.6 -> 2.4, hero-posts/pylons) were NOT made: those files are
 * outside this builder's ownership — they need the coordinator's call.
 * Exported so tests pin the value instead of the constructor literal.
 */
export const BLOOM_THRESHOLD = 1.15;

/**
 * Retro pixelation/quantize/vignette pass. Exported for structural tests
 * (output-transform pin); the pass itself is wired in PostFX below.
 */
export const RetroShader = {
  uniforms: { tDiffuse: { value: null }, pixelSize: { value: 2.0 }, resolution: { value: new THREE.Vector2(1, 1) }, vignette: { value: 0.35 }, quantize: { value: 24.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float pixelSize; uniform vec2 resolution; uniform float vignette; uniform float quantize;
    varying vec2 vUv;
    void main(){
      vec2 d = pixelSize / resolution;
      vec2 uv = pixelSize > 0.0 ? floor(vUv / d + 0.5) * d : vUv;
      vec4 col = texture2D(tDiffuse, uv);
      // slight color quantization for the retro feel (quantize <= 1.0 disables it)
      if (quantize > 1.0) col.rgb = floor(col.rgb * quantize + 0.5) / quantize;
      float dist = distance(vUv, vec2(0.5));
      col.rgb *= smoothstep(0.95, 0.45, dist * vignette * 2.0);
      gl_FragColor = col;
      // B: output transform (D1 pattern) — ACES tone mapping + sRGB encode.
      // This pass is always last when present (PostFX adds nothing after it),
      // so the chunks resolve against the screen. The authored retro
      // character (pixelation, quantization, vignette) all runs pre-transform
      // and is preserved; the transform only adds highlight roll-off (HDR
      // values can no longer clip straight to white) and the sRGB encode the
      // retro tier already got via RenderPass-to-screen. It also puts the
      // live renderer.toneMappingExposure (per-genre sky.exposure) into
      // effect here, matching standard/high and the unfiltered retro tier.
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
};

/**
 * B: apply the D1 output-transform pattern to an UnrealBloomPass's final
 * screen-writing material. When bloom is the LAST pass in the chain (retro
 * tier, bloom on, retro filter off), EffectComposer renders its additive
 * blend straight to the canvas: the base copy already gets ACES+sRGB via the
 * pass's internal MeshBasicMaterial, but the bloom layer is a raw
 * ShaderMaterial (CopyShader + AdditiveBlending) that used to add linear HDR
 * values with no highlight roll-off — bright emitters' halos clipped to
 * white. Appending the transform includes fixes the bloom layer; when bloom
 * is mid-chain (grade or retro pass follows) the chunks compile to no-ops
 * (WebGLPrograms forces NoToneMapping for non-null render targets), so this
 * is safe to apply unconditionally.
 *
 * Reaches into UnrealBloomPass internals (blendMaterial) — three's public
 * API offers no hook for the blend shader. Throws a descriptive error if the
 * internals change, so a three.js upgrade can't silently reintroduce the
 * blowout; the PostFX constructor isolates the call so only the bloom-layer
 * transform is lost, never the whole composer.
 */
export function patchBloomOutputTransform(bloom: UnrealBloomPass): void {
  const internals = bloom as unknown as { blendMaterial?: THREE.ShaderMaterial };
  const blendMaterial = internals.blendMaterial;
  if (!blendMaterial || typeof blendMaterial.fragmentShader !== 'string') {
    throw new Error(
      'patchBloomOutputTransform: UnrealBloomPass.blendMaterial not found — ' +
      'three.js internals changed; bloom-last output transform not applied.',
    );
  }
  if (!blendMaterial.fragmentShader.includes('<tonemapping_fragment>')) {
    // Insert BEFORE main()'s closing brace: appending after it would leave
    // the chunks at global scope (shader compile error — gl_FragColor
    // assignments are only legal inside main). Anchored to the end of the
    // string so a stray '}' elsewhere can't misplace the insert.
    const fs = blendMaterial.fragmentShader;
    const patched = fs.replace(
      /\}\s*$/,
      '\t#include <tonemapping_fragment>\n\t#include <colorspace_fragment>\n}',
    );
    if (patched === fs) {
      throw new Error(
        'patchBloomOutputTransform: blend shader does not end with main()\'s closing brace — ' +
        'three.js internals changed; bloom-last output transform not applied.',
      );
    }
    blendMaterial.fragmentShader = patched;
  }
}

export class PostFX {
  private composer: EffectComposer | null = null;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private retroPass: ShaderPass | null = null;
  private gradePass: ShaderPass | null = null;
  /** true when the filmic grade pass is in the chain (standard/high, non-retro) */
  readonly gradeActive: boolean;
  /** Effective composer MSAA samples after the tier cap (QA 2026-10-22, F3).
   *  Set before the composer try-block so tests can read the resolved value
   *  even where the composer itself can't be constructed headlessly. */
  readonly msaaSamples: number;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, spec: GameSpec, opts: { bloomBoost?: number; msaaCap?: number; retroOptIn?: boolean; bloomResScale?: number } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    const quality = spec.custom?.quality ?? 'retro';
    // QA 2026-10-22 (F3): MSAA is capped by the perf tier on mobile — s25
    // gets at most 2 samples even at quality=high. Desktop cap is 4 (the
    // authored base), so desktop is unchanged. min() against the quality
    // base: retro already asks for 2.
    this.msaaSamples = Math.min(quality === 'retro' ? 2 : 4, opts.msaaCap ?? 4);
    // Graphics wave 2 (E): tier bloom multiplier for the desktop "heavier
    // post" look. 1.0 = the authored strength. Same passes, same draw calls.
    const bloomBoost = opts.bloomBoost ?? 1;
    try {
      // T1-1: MSAA inside the composer. three 0.182's EffectComposer builds its
      // default render target with samples: 0, so without an explicit
      // multisampled target every non-retro game shipped with ZERO
      // antialiasing (the renderer's antialias:true only affects the default
      // framebuffer, which the composer bypasses).
      const samples = this.msaaSamples;
      const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, {
        type: THREE.HalfFloatType,
        samples,
      });
      this.composer = new EffectComposer(renderer, target);
      this.composer.addPass(new RenderPass(scene, camera));
      if (spec.theme.bloom) {
        // Beauty wave: threshold BLOOM_THRESHOLD (was 1.0, before that
        // 0.82) — the day sky's horizon band sits at linear ~1.3-1.7 and
        // was blooming into the white wash; at dusk the horizon is ~1.03,
        // still above the old 1.0. True HDR emitters (amber glow 2.6+,
        // runes, muzzle flashes) still bloom.
        const bloom = new UnrealBloomPass(
          new THREE.Vector2(innerWidth, innerHeight),
          (quality === 'high' ? 0.35 : 0.45) * bloomBoost, 0.6, BLOOM_THRESHOLD,
        );
        // Fix build D-040: cheaper bloom on the mobile tier. The pass
        // sizes its internal targets from the composer's setSize (the
        // construction resolution is overridden on the first resize), so
        // scaling the constructor vector alone would do nothing — the
        // setSize inputs are scaled instead. 1.0 = unchanged behavior.
        // Bloom is blur by nature, so half-res bloom reads the same.
        const bloomResScale = opts.bloomResScale ?? 1;
        if (bloomResScale !== 1) {
          const origSetSize = bloom.setSize.bind(bloom);
          bloom.setSize = (w: number, h: number) =>
            origSetSize(Math.round(w * bloomResScale), Math.round(h * bloomResScale));
        }
        try {
          patchBloomOutputTransform(bloom);
        } catch (e) {
          // Isolated on purpose: a three.js internals change costs only the
          // bloom-layer output transform, never the whole composer.
          console.warn(`[xandria] postfx: ${(e as Error).message}`);
        }
        this.composer.addPass(bloom);
      }
      // Polish wave (LOOK crew, plan #7): filmic color grade after bloom —
      // lift/gamma/gain + saturation + vignette, per-genre via GenreGrade.
      // Standard/high tiers only; retro keeps its own shader (and a
      // retro-filtered standard game already gets its vignette from it).
      // VoxBox crisp-render: the retro pass also fires when the player
      // explicitly opted into the retro quality in settings
      // (Engine passes retroOptIn; the spec's retroFilter stays false for
      // the crisp default, so the opt-in is the only way back to the
      // pixelated look). Takes effect at boot — the composer is built
      // once; a pause-menu quality change does not rebuild it.
      const wantRetro = (spec.theme.retroFilter || opts.retroOptIn === true) && quality !== 'high';
      if (quality !== 'retro' && !wantRetro) {
        this.gradePass = new ShaderPass(GradeShader);
        // VoxBox breakout B6: the grade pass previously called
        // gradeAtmosphere without a biome, so the per-biome dusk grades
        // never reached the post chain. The screen-writing pass is this
        // grade pass (last in the standard chain) and GradeShader includes
        // the tonemapping + colorspace chunks — the explicit
        // output-transform check for this workstream.
        setGradeUniforms(
          this.gradePass,
          gradeAtmosphere(spec.meta.genre, spec.theme.timeOfDay, spec.theme.environment).grade,
        );
        this.composer.addPass(this.gradePass);
      }
      this.gradeActive = this.gradePass !== null;
      if (wantRetro) {
        this.retroPass = new ShaderPass(RetroShader);
        // Standard + spec retroFilter keeps its authored vignette-only
        // look; an explicit settings retro opt-in gets the FULL retro
        // shader (pixelation + quantization), otherwise the opt-in
        // would restore only a vignette and not the retro look.
        if (quality === 'standard' && opts.retroOptIn !== true) {
          this.retroPass.uniforms.pixelSize.value = 0;      // no pixelation
          this.retroPass.uniforms.quantize.value = 0;       // no color quantization
          this.retroPass.uniforms.vignette.value = 0.25;
        }
        this.composer.addPass(this.retroPass);
        this.resize(innerWidth, innerHeight);
      }
    } catch {
      this.composer = null;
      this.gradeActive = false;
    }
  }

  resize(w: number, h: number) {
    this.composer?.setSize(w, h);
    if (this.retroPass) {
      (this.retroPass.uniforms.resolution.value as THREE.Vector2).set(w, h);
    }
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() { this.composer?.dispose(); }
}
