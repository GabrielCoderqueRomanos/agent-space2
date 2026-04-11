import Phaser from 'phaser';

/** GLSL fragment shader — scanlines + vignette + subtle chromatic aberration */
const FRAG = `
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D uMainSampler;
uniform float     uTime;
uniform vec2      uResolution;

varying vec2 outTexCoord;

void main () {
  vec2 uv = outTexCoord;

  // ── Chromatic aberration (0.15% of screen width) ────────────────────────
  float ca = 0.0015;
  vec4 col;
  col.r = texture2D(uMainSampler, uv + vec2( ca, 0.0)).r;
  col.g = texture2D(uMainSampler, uv              ).g;
  col.b = texture2D(uMainSampler, uv - vec2( ca, 0.0)).b;
  col.a = 1.0;

  // ── Scanlines (every 2 physical pixels, 10% darkening) ──────────────────
  float line     = mod(floor(uv.y * uResolution.y), 2.0);
  float scanline = 1.0 - line * 0.10;
  col.rgb *= scanline;

  // ── Vignette ─────────────────────────────────────────────────────────────
  vec2  vig = uv - 0.5;
  float v   = 1.0 - dot(vig, vig) * 1.6;
  col.rgb  *= clamp(v, 0.0, 1.0);

  // ── Cool blue-teal space tint ─────────────────────────────────────────────
  col.r *= 0.92;
  col.g *= 0.97;
  col.b *= 1.06;

  // ── Very subtle rolling noise flicker (amplitude 1%) ────────────────────
  float flicker = 1.0 - 0.01 * fract(sin(uTime * 7.3 + uv.y * 100.0) * 43758.5);
  col.rgb *= flicker;

  gl_FragColor = col;
}
`;

export class CrtPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  private _t = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: 'CrtPipeline', fragShader: FRAG });
  }

  onPreRender () {
    this._t += 0.016;
    this.set1f('uTime', this._t);
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
  }
}
