import Phaser from 'phaser';
import { ZONES } from './mapData';

const S = 32; // tile size in pixels

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  // Hull
  hullBase:   0x090f1e,
  hullPanel:  0x10192e,
  hullMid:    0x16243d,
  hullEdge:   0x2a4060,
  hullAccent: 0x1e5080,
  hullGlow:   0x3377aa,

  // Exterior
  navGreen:  0x00ff88,
  navRed:    0xff3300,
  navWhite:  0xeeeeff,
  cockpit:   0x44aaff,
  exhaust:   0x2266aa,
};

/**
 * Draws the complete spaceship visual using Phaser Graphics.
 * No external assets required — everything is procedural.
 */
export class ShipRenderer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.drawHullExterior();
    this.drawCockpitWindows();
    this.drawHullDetails();
    this.drawZoneLabels();
    this.createNavigationLights();
    this.createEngineExhaust();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HULL EXTERIOR
  // ═══════════════════════════════════════════════════════════════════════

  private drawHullExterior() {
    const g = this.scene.add.graphics().setDepth(0);

    // ── Shadow / glow behind ship ────────────────────────────────────────
    for (let i = 6; i >= 1; i--) {
      g.fillStyle(0x001830, 0.04 * i);
      g.fillEllipse(18 * S, 14 * S, (24 + i * 2) * S, (28 + i * 2) * S);
    }

    // ── Main body ────────────────────────────────────────────────────────
    g.fillStyle(C.hullBase);
    // Core rectangle
    g.fillRect(6 * S, 3 * S, 24 * S, 23 * S);

    // ── Nose (pointed) ───────────────────────────────────────────────────
    g.fillStyle(C.hullBase);
    g.fillTriangle(
      18 * S, 0,
      6 * S, 3 * S,
      30 * S, 3 * S,
    );

    // ── Wing nacelles ────────────────────────────────────────────────────
    g.fillStyle(C.hullPanel);
    // Left nacelle
    g.fillRect(1 * S, 12 * S, 5 * S, 10 * S);
    g.fillTriangle(1 * S, 12 * S,  6 * S, 12 * S, 1 * S, 14 * S); // taper top
    g.fillTriangle(1 * S, 22 * S,  6 * S, 22 * S, 1 * S, 20 * S); // taper bot
    // Right nacelle
    g.fillRect(30 * S, 12 * S, 5 * S, 10 * S);
    g.fillTriangle(35 * S, 12 * S, 30 * S, 12 * S, 35 * S, 14 * S);
    g.fillTriangle(35 * S, 22 * S, 30 * S, 22 * S, 35 * S, 20 * S);

    // ── Engine exhaust section ───────────────────────────────────────────
    g.fillStyle(C.hullPanel);
    g.fillRect(9 * S, 26 * S, 18 * S, 2 * S);

    // ── Hull bevel edges ─────────────────────────────────────────────────
    g.lineStyle(2, C.hullEdge, 0.7);

    // Nose outline
    g.beginPath();
    g.moveTo(18 * S, 0);
    g.lineTo(6 * S, 3 * S);
    g.lineTo(6 * S, 26 * S);
    g.lineTo(9 * S, 26 * S);
    g.lineTo(9 * S, 28 * S);
    g.lineTo(27 * S, 28 * S);
    g.lineTo(27 * S, 26 * S);
    g.lineTo(30 * S, 26 * S);
    g.lineTo(30 * S, 3 * S);
    g.closePath();
    g.strokePath();

    // Nacelle outlines
    g.lineStyle(1, C.hullEdge, 0.5);
    g.strokeRect(1 * S, 12 * S, 5 * S, 10 * S);
    g.strokeRect(30 * S, 12 * S, 5 * S, 10 * S);

    // ── Inner hull accent line (parallel to outer edge, inset) ───────────
    g.lineStyle(1, C.hullAccent, 0.35);
    g.beginPath();
    g.moveTo(18 * S, 2 * S);
    g.lineTo(7 * S, 4 * S);
    g.lineTo(7 * S, 25 * S);
    g.lineTo(29 * S, 25 * S);
    g.lineTo(29 * S, 4 * S);
    g.closePath();
    g.strokePath();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COCKPIT WINDOWS
  // ═══════════════════════════════════════════════════════════════════════

  private drawCockpitWindows() {
    const g = this.scene.add.graphics().setDepth(5);
    const cx = 18 * S;

    // Main cockpit glass
    g.fillStyle(C.cockpit, 0.15);
    g.fillTriangle(cx, S / 2, cx - 3 * S, 3 * S, cx + 3 * S, 3 * S);
    g.lineStyle(1, C.cockpit, 0.7);
    g.strokeTriangle(cx, S / 2, cx - 3 * S, 3 * S, cx + 3 * S, 3 * S);

    // Window panes (subdivided)
    g.lineStyle(1, C.cockpit, 0.35);
    g.lineBetween(cx, S / 2 + 4, cx, 3 * S);         // centre spine
    g.lineBetween(cx - 2 * S, 2.5 * S, cx + 2 * S, 2.5 * S); // cross bar

    // Interior glow
    g.fillStyle(C.cockpit, 0.06);
    g.fillEllipse(cx, 2.5 * S, 4 * S, 2 * S);

    // Side port windows
    for (const wx of [cx - 5 * S, cx + 4 * S]) {
      g.fillStyle(C.cockpit, 0.15);
      g.fillEllipse(wx, 2 * S, S, S / 2);
      g.lineStyle(1, C.cockpit, 0.5);
      g.strokeEllipse(wx, 2 * S, S, S / 2);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HULL DETAILS (panel lines, markings, structural elements)
  // ═══════════════════════════════════════════════════════════════════════

  private drawHullDetails() {
    const g = this.scene.add.graphics().setDepth(5);
    g.lineStyle(1, C.hullEdge, 0.2);

    // Horizontal panel seams on main body
    for (const ty of [5, 8, 11, 14, 17, 20, 23]) {
      g.lineBetween(6 * S, ty * S, 30 * S, ty * S);
    }

    // Vertical panel seams
    for (const tx of [8, 10, 14, 18, 22, 26, 28]) {
      g.lineBetween(tx * S, 3 * S, tx * S, 26 * S);
    }

    // Nacelle panel lines
    g.lineStyle(1, C.hullEdge, 0.3);
    g.lineBetween(1 * S, 15 * S, 6 * S, 15 * S);
    g.lineBetween(1 * S, 17 * S, 6 * S, 17 * S);
    g.lineBetween(1 * S, 19 * S, 6 * S, 19 * S);
    g.lineBetween(30 * S, 15 * S, 35 * S, 15 * S);
    g.lineBetween(30 * S, 17 * S, 35 * S, 17 * S);
    g.lineBetween(30 * S, 19 * S, 35 * S, 19 * S);

    // Hull registry text (drawn as simple line patterns)
    g.lineStyle(1, C.hullAccent, 0.25);
    // Left side markings
    g.fillStyle(C.hullAccent, 0.2);
    g.fillRect(7 * S, 5 * S, 2 * S, 6);
    g.fillRect(7 * S, 5 * S + 10, 2 * S, 6);
    // Right side
    g.fillRect(27 * S, 5 * S, 2 * S, 6);
    g.fillRect(27 * S, 5 * S + 10, 2 * S, 6);

    // Structural ribs on nacelles
    g.fillStyle(C.hullEdge, 0.4);
    for (const [nx, nw] of [[1, 5], [30, 5]]) {
      for (let i = 0; i < 4; i++) {
        g.fillRect(nx * S + 2, (13 + i * 2) * S, nw * S - 4, 4);
      }
    }

    // Antenna mast at nose
    g.lineStyle(1, C.hullGlow, 0.6);
    g.lineBetween(18 * S, 0, 18 * S, -S);
    g.fillStyle(C.hullGlow, 0.8);
    g.fillCircle(18 * S, -S, 3);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ZONE LABELS
  // ═══════════════════════════════════════════════════════════════════════

  private drawZoneLabels() {
    const labelConfig: Record<string, { text: string; color: string }> = {
      bridge:      { text: 'BRIDGE',      color: '#4499cc' },
      engine_room: { text: 'ENGINE ROOM', color: '#dd6622' },
      hangar:      { text: 'HANGAR',      color: '#22bb88' },
      alert_bay:   { text: 'ALERT BAY',   color: '#dd3355' },
    };

    for (const [key, zone] of Object.entries(ZONES)) {
      const lc = labelConfig[key];
      this.scene.add.text(
        zone.x * S + S + 2,
        zone.y * S + S + 2,
        lc.text,
        {
          fontSize:        '8px',
          color:           lc.color,
          fontFamily:      'monospace',
          stroke:          '#000000',
          strokeThickness: 2,
        },
      ).setAlpha(0.75).setDepth(6);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  NAVIGATION LIGHTS (blinking, on hull exterior)
  // ═══════════════════════════════════════════════════════════════════════

  private createNavigationLights() {
    const lights: { x: number; y: number; color: number; period: number }[] = [
      // Nose tip
      { x: 18 * S, y: 0,         color: C.navWhite, period: 1200 },
      // Left wing tip
      { x: 1 * S,  y: 17 * S,    color: C.navRed,   period: 800  },
      // Right wing tip
      { x: 35 * S, y: 17 * S,    color: C.navGreen, period: 800  },
      // Engine section
      { x: 9 * S,  y: 27 * S,    color: C.navWhite, period: 1600 },
      { x: 27 * S, y: 27 * S,    color: C.navWhite, period: 1600 },
      // Hull midpoints
      { x: 6 * S,  y: 10 * S,    color: C.navWhite, period: 2000 },
      { x: 30 * S, y: 10 * S,    color: C.navWhite, period: 2000 },
    ];

    for (const lt of lights) {
      const dot = this.scene.add.graphics().setDepth(8);
      dot.fillStyle(lt.color, 0.9);
      dot.fillCircle(lt.x, lt.y, 2.5);
      dot.fillStyle(0xffffff, 0.5);
      dot.fillCircle(lt.x, lt.y, 1);

      this.scene.tweens.add({
        targets:  dot,
        alpha:    { from: 1, to: 0 },
        duration: lt.period,
        yoyo:     true,
        repeat:   -1,
        delay:    Math.random() * lt.period,
        ease:     'Stepped',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ENGINE EXHAUST (animated glow + particles)
  // ═══════════════════════════════════════════════════════════════════════

  private createEngineExhaust() {
    const nozzles = [
      { x: 12 * S, y: 28 * S },
      { x: 18 * S, y: 28 * S },
      { x: 24 * S, y: 28 * S },
    ];

    for (const nz of nozzles) {
      // Static nozzle ring
      const ring = this.scene.add.graphics().setDepth(7);
      ring.lineStyle(2, C.exhaust, 0.8);
      ring.strokeEllipse(nz.x, nz.y, S - 4, S / 2);
      ring.fillStyle(C.exhaust, 0.1);
      ring.fillEllipse(nz.x, nz.y, S - 4, S / 2);

      // Animated inner glow
      const glow = this.scene.add.graphics().setDepth(7);
      glow.fillStyle(0x4488ff, 0.3);
      glow.fillEllipse(nz.x, nz.y, S / 2, S / 3);

      this.scene.tweens.add({
        targets:  glow,
        scaleY:   { from: 1, to: 1.3 },
        alpha:    { from: 0.8, to: 0.4 },
        duration: 400 + Math.random() * 200,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });

      // Exhaust particle stream
      const emitter = this.scene.add.particles(nz.x, nz.y + S / 4, 'glow_particle', {
        speed:    { min: 20, max: 60 },
        angle:    { min: 80, max: 100 },
        scale:    { start: 0.5, end: 0 },
        alpha:    { start: 0.6, end: 0 },
        lifespan: 600,
        frequency: 60,
        tint:     [0x4488ff, 0x2266cc, 0x88aaff],
        quantity:  1,
      });
      emitter.setDepth(8);
    }
  }
}
