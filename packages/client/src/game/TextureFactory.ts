import Phaser from 'phaser';

/**
 * Generates all programmatic textures.
 * No external assets required — everything is drawn with Phaser Graphics.
 *
 * Agent sprites: 24×32 px per frame, 6 frames horizontal.
 * Each frame uses 4-tone shading (shadow / base / mid / highlight) for depth.
 * Frames: 0=idle  1=walking  2=working  3=resting  4=alert  5=reawakening
 */
export class TextureFactory {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createAll() {
    this.createAgentSprites();
    this.createParticle();
    this.createGlowParticle();
    this.createSparkParticle();
    this.createSquareGlowParticle();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AGENT SPRITES
  // ═══════════════════════════════════════════════════════════════════════

  createAgentSprites() {
    const W = 24, H = 32, FRAMES = 6;
    const gfx = this.scene.add.graphics();

    const themes = [
      { suit: 0x0c3a65, armour: 0x1860a0, visor: 0x22aaff, led: 0x00ccff  }, // idle   – blue
      { suit: 0x0c4228, armour: 0x1a7044, visor: 0x22ffaa, led: 0x00ff88  }, // walk   – green
      { suit: 0x4a2800, armour: 0x884800, visor: 0xffaa22, led: 0xff8800  }, // work   – amber
      { suit: 0x181824, armour: 0x282838, visor: 0x4466aa, led: 0x3355aa  }, // rest   – grey/blue
      { suit: 0x480010, armour: 0x880020, visor: 0xff2233, led: 0xff0022  }, // alert  – red
      { suit: 0x28286e, armour: 0x4848b8, visor: 0xeeeeff, led: 0xffffff  }, // rewake – white
    ];

    for (let i = 0; i < FRAMES; i++) {
      this.drawAgent(gfx, i * W, 0, W, H, themes[i], i);
    }

    gfx.generateTexture('agent', W * FRAMES, H);
    gfx.destroy();

    const tex = this.scene.textures.get('agent');
    tex.add('idle',        0, 0 * W, 0, W, H);
    tex.add('walking',     0, 1 * W, 0, W, H);
    tex.add('working',     0, 2 * W, 0, W, H);
    tex.add('resting',     0, 3 * W, 0, W, H);
    tex.add('alert',       0, 4 * W, 0, W, H);
    tex.add('reawakening', 0, 5 * W, 0, W, H);
  }

  // ─── Agent drawing ────────────────────────────────────────────────────

  private drawAgent(
    g: Phaser.GameObjects.Graphics,
    ox: number,
    _oy: number,
    W: number,
    H: number,
    t: { suit: number; armour: number; visor: number; led: number },
    frame: number,
  ) {
    const cx = ox + W / 2;

    // Derive shading tones from base colours
    const suitDk   = this.darken(t.suit,   0.50);
    const suitLt   = this.lighten(t.suit,  1.35);
    const armDk    = this.darken(t.armour, 0.55);
    const armLt    = this.lighten(t.armour,1.30);
    const visorLt  = this.lighten(t.visor, 1.50);

    // ── Frame-specific pose offsets ───────────────────────────────────────
    const torsoY  = frame === 3 ? 14 : frame === 2 ? 12 : 13;
    const helmetY = frame === 3 ? 7  : frame === 2 ? 1  : 2;
    const legBase = frame === 3 ? H - 6 : H - 8;

    // ── BOOTS ─────────────────────────────────────────────────────────────
    {
      // Left boot
      const lbx = ox + 4;
      const lby = frame === 1 ? legBase - 2 : legBase;
      g.fillStyle(suitDk);
      g.fillRect(lbx, lby, 6, 2);
      // toe highlight
      g.fillStyle(armLt, 0.4);
      g.fillRect(lbx + 4, lby, 2, 1);

      // Right boot
      const rbx = ox + W - 10;
      const rby = frame === 1 ? legBase + 2 : legBase;
      g.fillStyle(suitDk);
      g.fillRect(rbx, rby, 6, 2);
      g.fillStyle(armLt, 0.4);
      g.fillRect(rbx + 4, rby, 2, 1);
    }

    // ── LEGS ──────────────────────────────────────────────────────────────
    if (frame === 3) {
      // Resting — crossed/folded legs
      g.fillStyle(t.suit);
      g.fillRect(ox + 5, H - 10, 5, 4);
      g.fillRect(ox + W - 10, H - 10, 5, 4);
      // Knee pads
      g.fillStyle(t.armour);
      g.fillRect(ox + 5, H - 10, 5, 2);
      g.fillRect(ox + W - 10, H - 10, 5, 2);
    } else {
      const leftFwd  = frame === 1;   // walking: left leg forward
      const lLegY    = leftFwd  ? legBase - 4 : legBase - 2;
      const rLegY    = !leftFwd ? legBase - 4 : legBase - 2;

      // Left leg — thigh
      g.fillStyle(t.suit);
      g.fillRect(ox + 5, lLegY - 4, 5, 5);
      // Knee pad
      g.fillStyle(t.armour);
      g.fillRect(ox + 5, lLegY, 5, 3);
      // Shin
      g.fillStyle(suitLt);
      g.fillRect(ox + 6, lLegY + 3, 4, 2);
      g.fillStyle(suitDk);
      g.fillRect(ox + 9, lLegY - 4, 1, 9);   // right-edge shadow

      // Right leg — thigh
      g.fillStyle(t.suit);
      g.fillRect(ox + W - 10, rLegY - 4, 5, 5);
      // Knee pad
      g.fillStyle(t.armour);
      g.fillRect(ox + W - 10, rLegY, 5, 3);
      // Shin
      g.fillStyle(suitLt);
      g.fillRect(ox + W - 10, rLegY + 3, 4, 2);
      g.fillStyle(suitDk);
      g.fillRect(ox + W - 10, rLegY - 4, 1, 9);
    }

    // ── UTILITY BELT ─────────────────────────────────────────────────────
    const beltY = torsoY + (frame === 3 ? 8 : 11);
    g.fillStyle(suitDk);
    g.fillRect(ox + 5, beltY, 14, 2);
    // Belt buckle
    g.fillStyle(t.armour);
    g.fillRect(cx - 1, beltY, 2, 2);
    // Belt pouches
    g.fillStyle(armDk);
    g.fillRect(ox + 6, beltY, 3, 2);
    g.fillRect(ox + W - 9, beltY, 3, 2);

    // ── TORSO BODY ────────────────────────────────────────────────────────
    const torsoH = frame === 3 ? 10 : 12;
    // Main body (slightly inset)
    g.fillStyle(t.suit);
    g.fillRoundedRect(ox + 5, torsoY, 14, torsoH, 2);
    // Shadow side (right)
    g.fillStyle(suitDk);
    g.fillRoundedRect(ox + 14, torsoY, 5, torsoH, { tl: 0, tr: 2, bl: 0, br: 2 });

    // ── CHEST ARMOUR PLATE ────────────────────────────────────────────────
    g.fillStyle(t.armour);
    g.fillRoundedRect(ox + 6, torsoY + 1, 12, 8, 1);
    // Left half highlight
    g.fillStyle(armLt, 0.3);
    g.fillRoundedRect(ox + 6, torsoY + 1, 6, 8, { tl: 1, tr: 0, bl: 1, br: 0 });
    // Right half shadow
    g.fillStyle(armDk, 0.5);
    g.fillRoundedRect(ox + 12, torsoY + 1, 6, 8, { tl: 0, tr: 1, bl: 0, br: 1 });
    // Panel seam (centre line)
    g.lineStyle(1, armDk, 0.8);
    g.lineBetween(cx, torsoY + 1, cx, torsoY + 9);
    // Horizontal cross seam
    g.lineStyle(1, armDk, 0.5);
    g.lineBetween(ox + 6, torsoY + 5, ox + 18, torsoY + 5);

    // LED status indicator
    g.fillStyle(t.led, 0.95);
    g.fillRect(cx - 1, torsoY + 6, 2, 2);
    // LED glow halo
    g.fillStyle(t.led, 0.25);
    g.fillRect(cx - 2, torsoY + 5, 4, 4);

    // ── SHOULDER PADS ─────────────────────────────────────────────────────
    // Left pad
    g.fillStyle(t.armour);
    g.fillRoundedRect(ox + 1, torsoY, 5, 5, 2);
    g.fillStyle(armLt, 0.3);
    g.fillRect(ox + 2, torsoY + 1, 2, 2);
    g.lineStyle(0.5, armDk, 0.6);
    g.strokeRoundedRect(ox + 1, torsoY, 5, 5, 2);

    // Right pad
    g.fillStyle(t.armour);
    g.fillRoundedRect(ox + W - 6, torsoY, 5, 5, 2);
    g.fillStyle(armLt, 0.3);
    g.fillRect(ox + W - 5, torsoY + 1, 2, 2);
    g.lineStyle(0.5, armDk, 0.6);
    g.strokeRoundedRect(ox + W - 6, torsoY, 5, 5, 2);

    // ── ARMS ──────────────────────────────────────────────────────────────
    const armY = torsoY + 1;
    const armH = 8;

    if (frame === 1) {
      // Walking — swinging
      this.drawArm(g, ox + 1,      armY - 2, armH + 1, t.suit, t.armour, suitDk, suitLt);
      this.drawArm(g, ox + W - 5,  armY + 2, armH - 1, t.suit, t.armour, suitDk, suitLt);
    } else if (frame === 2) {
      // Working — left arm raised with tool
      this.drawArm(g, ox + 1,      armY - 4, armH + 2, t.suit, t.armour, suitDk, suitLt);
      this.drawArm(g, ox + W - 5,  armY + 1, armH,     t.suit, t.armour, suitDk, suitLt);
      // Tool tip (small bright dot at end of raised arm)
      g.fillStyle(t.led, 0.95);
      g.fillRect(ox + 1, armY - 6, 3, 2);
      g.fillStyle(0xffffff, 0.5);
      g.fillRect(ox + 2, armY - 6, 1, 1);
    } else if (frame === 4) {
      // Alert — arms out defensively
      this.drawArm(g, ox - 1,      armY - 1, armH - 1, t.suit, t.armour, suitDk, suitLt);
      this.drawArm(g, ox + W - 3,  armY - 1, armH - 1, t.suit, t.armour, suitDk, suitLt);
    } else if (frame === 5) {
      // Reawakening — arms spread wide and raised
      this.drawArm(g, ox - 2,      armY - 3, armH,     t.suit, t.armour, suitDk, suitLt);
      this.drawArm(g, ox + W - 2,  armY - 3, armH,     t.suit, t.armour, suitDk, suitLt);
    } else {
      this.drawArm(g, ox + 1,      armY,     armH,     t.suit, t.armour, suitDk, suitLt);
      this.drawArm(g, ox + W - 5,  armY,     armH,     t.suit, t.armour, suitDk, suitLt);
    }

    // ── HELMET DOME ───────────────────────────────────────────────────────
    const hy = helmetY;
    // Dome base (armour)
    g.fillStyle(t.armour);
    g.fillEllipse(cx, hy + 5, 18, 12);
    // Shadow (right side of dome)
    g.fillStyle(armDk, 0.6);
    g.fillEllipse(cx + 3, hy + 5, 12, 11);
    // Highlight arc (top-left)
    g.fillStyle(armLt, 0.35);
    g.fillEllipse(cx - 3, hy + 3, 8, 5);
    // Top antenna LED
    g.fillStyle(t.led, 0.9);
    g.fillCircle(cx, hy, 1.5);
    g.fillStyle(t.led, 0.25);
    g.fillCircle(cx, hy, 3);

    // ── VISOR ─────────────────────────────────────────────────────────────
    // Visor base (dark tint)
    g.fillStyle(this.darken(t.visor, 0.4), 0.5);
    g.fillEllipse(cx, hy + 5, 12, 7);
    // Visor main colour
    g.fillStyle(t.visor, 0.85);
    g.fillEllipse(cx, hy + 4, 12, 6);
    // Visor inner glow
    g.fillStyle(visorLt, 0.25);
    g.fillEllipse(cx, hy + 3, 10, 4);
    // Specular glare (top-left)
    g.fillStyle(0xffffff, 0.50);
    g.fillEllipse(cx - 3, hy + 3, 4, 2);
    // Visor outline
    g.lineStyle(0.5, t.led, 0.5);
    g.strokeEllipse(cx, hy + 4, 12, 6);

    // ── SIDE HELMET VENTS ─────────────────────────────────────────────────
    g.fillStyle(armDk, 0.9);
    g.fillRect(ox + 2, hy + 4, 2, 4);
    g.fillRect(ox + W - 4, hy + 4, 2, 4);
    g.lineStyle(0.5, armLt, 0.3);
    g.lineBetween(ox + 2, hy + 5, ox + 4, hy + 5);
    g.lineBetween(ox + 2, hy + 7, ox + 4, hy + 7);
    g.lineBetween(ox + W - 4, hy + 5, ox + W - 2, hy + 5);
    g.lineBetween(ox + W - 4, hy + 7, ox + W - 2, hy + 7);

    // ── CHIN GUARD ────────────────────────────────────────────────────────
    g.fillStyle(suitDk);
    g.fillRoundedRect(cx - 3, hy + 9, 6, 3, 1);
    g.lineStyle(0.5, armDk, 0.5);
    g.strokeRoundedRect(cx - 3, hy + 9, 6, 3, 1);

    // ── NECK CONNECTOR ───────────────────────────────────────────────────
    g.fillStyle(t.suit);
    g.fillRect(cx - 2, hy + 11, 4, 2);
    g.lineStyle(0.5, suitDk, 0.7);
    g.lineBetween(cx - 2, hy + 12, cx + 2, hy + 12);

    // ── STATE OVERLAYS ────────────────────────────────────────────────────

    if (frame === 2) {
      // Working — data tablet on raised arm
      g.fillStyle(0x001a2a, 0.9);
      g.fillRect(ox + 1, armY - 4, 5, 4);
      g.lineStyle(1, t.visor, 0.7);
      g.strokeRect(ox + 1, armY - 4, 5, 4);
      g.lineStyle(1, t.visor, 0.4);
      g.lineBetween(ox + 2, armY - 3, ox + 5, armY - 3);
      g.lineBetween(ox + 2, armY - 1, ox + 4, armY - 1);
    }

    if (frame === 3) {
      // Resting — ZZZ animation dots
      g.fillStyle(0x8899bb, 0.7);
      g.fillRect(cx + 5, hy - 4, 3, 2);
      g.fillStyle(0x8899bb, 0.5);
      g.fillRect(cx + 7, hy - 7, 3, 2);
      g.fillStyle(0x8899bb, 0.3);
      g.fillRect(cx + 9, hy - 10, 3, 2);
    }

    if (frame === 4) {
      // Alert — hazard chevron on chest
      g.fillStyle(0xffcc00, 0.95);
      g.fillTriangle(cx, torsoY + 1, cx - 4, torsoY + 7, cx + 4, torsoY + 7);
      g.fillStyle(0x220000, 1);
      g.fillRect(cx - 0.5, torsoY + 2, 1, 3);
      g.fillRect(cx - 0.5, torsoY + 6, 1, 1);
      // Alert glow on visor
      g.fillStyle(t.visor, 0.3);
      g.fillEllipse(cx, hy + 4, 14, 8);
    }

    if (frame === 5) {
      // Reawakening — energy halos around helmet
      g.lineStyle(1, t.visor, 0.50);
      g.strokeEllipse(cx, hy + 5, 22, 16);
      g.lineStyle(1, t.visor, 0.25);
      g.strokeEllipse(cx, hy + 5, 28, 21);
      g.lineStyle(1, t.visor, 0.10);
      g.strokeEllipse(cx, hy + 5, 34, 26);
      // Body energy lines
      g.lineStyle(1, t.led, 0.35);
      g.lineBetween(ox + 4, torsoY + 4, ox + 1, torsoY + 8);
      g.lineBetween(ox + W - 4, torsoY + 4, ox + W - 1, torsoY + 8);
    }
  }

  /** Draw one arm with upper/elbow/forearm/glove segments at given x-offset. */
  private drawArm(
    g: Phaser.GameObjects.Graphics,
    ax: number, ay: number, ah: number,
    suit: number, armour: number, shadow: number, light: number,
  ) {
    // Upper arm
    g.fillStyle(suit);
    g.fillRect(ax, ay, 4, Math.ceil(ah * 0.45));
    g.fillStyle(shadow, 0.5);
    g.fillRect(ax + 3, ay, 1, Math.ceil(ah * 0.45));
    // Elbow pad
    g.fillStyle(armour);
    g.fillRect(ax, ay + Math.ceil(ah * 0.45), 4, 3);
    g.fillStyle(light, 0.25);
    g.fillRect(ax, ay + Math.ceil(ah * 0.45), 2, 1);
    // Forearm
    g.fillStyle(suit);
    g.fillRect(ax, ay + Math.ceil(ah * 0.45) + 3, 4, Math.floor(ah * 0.4));
    // Glove
    g.fillStyle(shadow);
    g.fillRect(ax, ay + ah - 2, 4, 2);
    g.fillStyle(light, 0.2);
    g.fillRect(ax, ay + ah - 2, 2, 1);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PARTICLE TEXTURES
  // ═══════════════════════════════════════════════════════════════════════

  createParticle() {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffffff);
    gfx.fillCircle(4, 4, 4);
    gfx.generateTexture('particle', 8, 8);
    gfx.destroy();
  }

  createGlowParticle() {
    const gfx = this.scene.add.graphics();
    for (let r = 6; r >= 1; r--) {
      gfx.fillStyle(0xffffff, r / 6);
      gfx.fillCircle(6, 6, r);
    }
    gfx.generateTexture('glow_particle', 12, 12);
    gfx.destroy();
  }

  createSparkParticle() {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffffff);
    gfx.fillRect(0, 1, 6, 1);
    gfx.fillRect(2, 0, 2, 3);
    gfx.generateTexture('spark_particle', 6, 3);
    gfx.destroy();
  }

  /** Small glowing square for additive blending effects. */
  createSquareGlowParticle() {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(0xffffff, 0.9);
    gfx.fillRect(1, 1, 4, 4);
    gfx.fillStyle(0xffffff, 0.4);
    gfx.fillRect(0, 0, 6, 6);
    gfx.fillStyle(0xffffff, 0.15);
    gfx.fillRect(-1, -1, 8, 8);
    gfx.generateTexture('square_particle', 8, 8);
    gfx.destroy();
  }

  // ─── Colour utilities ─────────────────────────────────────────────────────

  private darken(color: number, factor: number): number {
    const r = ((color >> 16) & 0xff) * factor;
    const g = ((color >> 8)  & 0xff) * factor;
    const b = ( color        & 0xff) * factor;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private lighten(color: number, factor: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) * factor);
    const g = Math.min(255, ((color >> 8)  & 0xff) * factor);
    const b = Math.min(255, ( color        & 0xff) * factor);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
}
