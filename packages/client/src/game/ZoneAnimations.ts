import Phaser from 'phaser';
import { ZONES } from './mapData';

const S = 32; // pixels per tile

/**
 * Adds animated machinery to each ship zone.
 * Called once after ShipRenderer draws the static ship.
 * Every room gets its own living atmosphere.
 */
export class ZoneAnimations {
  constructor(scene: Phaser.Scene) {
    this.animateBridge(scene);
    this.animateEngineRoom(scene);
    this.animateHangar(scene);
    this.animateAlertBay(scene);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BRIDGE — Radar, viewscreen, console banks, holographic displays
  // ═══════════════════════════════════════════════════════════════════════

  private animateBridge(scene: Phaser.Scene) {
    const z  = ZONES.bridge;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;

    // ── Radar unit (bottom-right corner) ─────────────────────────────────
    const rCX = px + pw - 2.5 * S;
    const rCY = py + ph - 2.5 * S;
    const rR  = 1.5 * S;

    // Background rings + crosshair
    const radarBg = scene.add.graphics().setDepth(5);
    radarBg.fillStyle(0x002211, 0.7);
    radarBg.fillCircle(rCX, rCY, rR + 2);
    radarBg.lineStyle(1, 0x00aa55, 0.4);
    radarBg.strokeCircle(rCX, rCY, rR);
    radarBg.strokeCircle(rCX, rCY, rR * 0.66);
    radarBg.strokeCircle(rCX, rCY, rR * 0.33);
    radarBg.lineStyle(1, 0x00aa55, 0.2);
    radarBg.lineBetween(rCX - rR, rCY, rCX + rR, rCY);
    radarBg.lineBetween(rCX, rCY - rR, rCX, rCY + rR);
    radarBg.lineStyle(1, 0x00ff88, 0.6);
    radarBg.strokeCircle(rCX, rCY, rR + 2);

    // Sweep wedge (inside a container so rotation is easy)
    const sweepCt = scene.add.container(rCX, rCY).setDepth(7);
    const sweep   = scene.add.graphics();
    sweep.fillStyle(0x00ff88, 0.22);
    sweep.fillTriangle(0, 0, rR, -8, rR, 8);
    sweep.lineStyle(1, 0x00ff88, 0.8);
    sweep.lineBetween(0, 0, rR, 0);
    sweepCt.add(sweep);
    scene.tweens.add({ targets: sweepCt, angle: 360, duration: 3200, repeat: -1, ease: 'Linear' });

    // Blips that fade in/out at random positions
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = (0.25 + Math.random() * 0.7) * rR;
      const blip  = scene.add.graphics().setDepth(8);
      blip.fillStyle(0x00ff88, 1);
      blip.fillCircle(rCX + Math.cos(angle) * dist, rCY + Math.sin(angle) * dist, 1.5);
      scene.tweens.add({
        targets:     blip,
        alpha:       { from: 0.1, to: 1 },
        duration:    300 + Math.random() * 500,
        yoyo:        true,
        repeat:      -1,
        delay:       Math.random() * 3000,
        repeatDelay: Math.random() * 2000,
      });
    }

    // ── Main viewscreen — animated waveform ──────────────────────────────
    const vsX = px + 2 * S;
    const vsY = py + S + 2;
    const vsW = pw - 4 * S;
    const vsH = S + 6;

    const vsGfx  = scene.add.graphics().setDepth(7);
    let   vsPhase = 0;

    scene.time.addEvent({
      delay:    40,
      loop:     true,
      callback: () => {
        vsGfx.clear();
        vsPhase += 0.07;

        // Channel A — cyan sine
        vsGfx.lineStyle(1, 0x22aaff, 0.75);
        vsGfx.beginPath();
        for (let x = 0; x < vsW; x += 2) {
          const y = vsY + vsH * 0.3
            + Math.sin((x * 0.04) + vsPhase) * 5
            + Math.sin((x * 0.09) + vsPhase * 1.3) * 2.5;
          x === 0 ? vsGfx.moveTo(vsX + x, y) : vsGfx.lineTo(vsX + x, y);
        }
        vsGfx.strokePath();

        // Channel B — dimmer green
        vsGfx.lineStyle(1, 0x00ff88, 0.4);
        vsGfx.beginPath();
        for (let x = 0; x < vsW; x += 2) {
          const y = vsY + vsH * 0.65
            + Math.sin((x * 0.06) + vsPhase * 0.7 + 1.2) * 3
            + Math.cos((x * 0.12) + vsPhase) * 2;
          x === 0 ? vsGfx.moveTo(vsX + x, y) : vsGfx.lineTo(vsX + x, y);
        }
        vsGfx.strokePath();
      },
    });

    // Scanline overlay on screen
    const scanOverlay = scene.add.graphics().setDepth(8);
    scanOverlay.fillStyle(0x000000, 0.12);
    for (let row = 0; row < vsH; row += 2) {
      scanOverlay.fillRect(vsX, vsY + row, vsW, 1);
    }

    // ── Console bank — independently blinking status LEDs ────────────────
    const ledColors = [0x00ff88, 0x22aaff, 0xffaa00, 0x22aaff, 0x00ff88,
                       0xff3344, 0x22aaff, 0xffaa00, 0x00ff88, 0x22aaff];

    for (let i = 0; i < ledColors.length; i++) {
      const dx = px + 2 * S + i * 14;
      const dot = scene.add.graphics().setDepth(7);
      dot.fillStyle(ledColors[i], 1);
      dot.fillRect(dx, py + 3 * S + 2, 7, 5);
      dot.fillStyle(0xffffff, 0.4);
      dot.fillRect(dx + 1, py + 3 * S + 2, 2, 1);

      scene.tweens.add({
        targets:     dot,
        alpha:       { from: 1, to: 0.15 },
        duration:    150 + Math.random() * 800,
        yoyo:        true,
        repeat:      -1,
        delay:       Math.random() * 1500,
        repeatDelay: 200 + Math.random() * 2000,
        ease:        'Stepped',
      });
    }

    // Second console row
    for (let i = 0; i < 7; i++) {
      const dx = px + 2 * S + 7 + i * 18;
      const dot = scene.add.graphics().setDepth(7);
      dot.fillStyle(ledColors[(i + 3) % ledColors.length], 0.8);
      dot.fillRect(dx, py + 4 * S + 10, 12, 4);
      scene.tweens.add({
        targets:     dot,
        alpha:       { from: 0.8, to: 0.1 },
        duration:    300 + Math.random() * 1200,
        yoyo:        true,
        repeat:      -1,
        delay:       Math.random() * 2000,
        ease:        'Stepped',
      });
    }

    // ── Holographic data column (left side of bridge) ─────────────────────
    const holoX = px + S + 2;
    const holoGfx = scene.add.graphics().setDepth(7);

    scene.time.addEvent({
      delay:    600,
      loop:     true,
      callback: () => {
        holoGfx.clear();
        holoGfx.lineStyle(1, 0x22aaff, 0.5);
        for (let row = 0; row < 8; row++) {
          const y  = py + S + 4 + row * 6;
          const w  = 10 + Math.floor(Math.random() * (3 * S - 20));
          const x2 = holoX + w;
          if (Math.random() > 0.25) {
            holoGfx.lineBetween(holoX, y, x2, y);
          }
          // Occasional bright node
          if (Math.random() > 0.7) {
            holoGfx.fillStyle(0x44ddff, 0.9);
            holoGfx.fillRect(x2 - 2, y - 1, 3, 3);
          }
        }
      },
    });

    // ── Ambient room tint pulse ──────────────────────────────────────────
    const ambBridge = scene.add.graphics().setDepth(2);
    ambBridge.fillStyle(0x1a4a90, 0.04);
    ambBridge.fillRect(px + S, py + S, pw - 2 * S, ph - 2 * S);
    scene.tweens.add({
      targets:  ambBridge,
      alpha:    { from: 0.5, to: 1 },
      duration: 2800,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ENGINE ROOM — Fans, pulsing reactor, pipe flow, sparks, heat haze
  // ═══════════════════════════════════════════════════════════════════════

  private animateEngineRoom(scene: Phaser.Scene) {
    const z  = ZONES.engine_room;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;
    const cx = px + pw / 2, cy = py + ph / 2;

    // ── Ventilation fans (top-left and top-right of room) ─────────────────
    for (const [fx, fy] of [
      [px + 1.5 * S, py + 1.5 * S],
      [px + pw - 1.5 * S, py + 1.5 * S],
    ] as [number, number][]) {
      // Housing circle
      const housing = scene.add.graphics().setDepth(5);
      housing.fillStyle(0x0a1828, 0.9);
      housing.fillCircle(fx, fy, 14);
      housing.lineStyle(1.5, 0x2a4a70, 0.9);
      housing.strokeCircle(fx, fy, 14);
      housing.lineStyle(1, 0x3a6a99, 0.5);
      housing.strokeCircle(fx, fy, 10);

      // Fan blades (4) in a container
      const fanCt = scene.add.container(fx, fy).setDepth(6);
      const blades = scene.add.graphics();
      for (let b = 0; b < 4; b++) {
        const a = (b / 4) * Math.PI * 2;
        const bx = Math.cos(a) * 5;
        const by = Math.sin(a) * 5;
        blades.fillStyle(0x1e3d5a, 0.95);
        blades.fillEllipse(bx, by, 16, 5);
        blades.lineStyle(0.5, 0x4488aa, 0.4);
        blades.strokeEllipse(bx, by, 16, 5);
      }
      // Hub
      blades.fillStyle(0x3a6a99, 1);
      blades.fillCircle(0, 0, 3);
      blades.fillStyle(0x7abadd, 0.6);
      blades.fillCircle(-1, -1, 1);
      fanCt.add(blades);
      scene.tweens.add({ targets: fanCt, angle: 360, duration: 900, repeat: -1, ease: 'Linear' });

      // Fan glow
      const fanGlow = scene.add.graphics().setDepth(5);
      fanGlow.fillStyle(0x2266aa, 0.08);
      fanGlow.fillCircle(fx, fy, 13);
      scene.tweens.add({
        targets:  fanGlow,
        alpha:    { from: 0.5, to: 1 },
        duration: 900,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }

    // ── Reactor — multi-ring color shift pulse ────────────────────────────
    const reactorColors  = [0xdd4400, 0xff7700, 0xffaa33, 0xffdd88, 0xffffff];
    const reactorRadii   = [2.6 * S, 2.1 * S, 1.6 * S, 1.1 * S, 0.6 * S];
    const reactorAlphas  = [0.35,    0.45,    0.55,    0.65,    0.80   ];

    for (let i = 0; i < reactorColors.length; i++) {
      const ring = scene.add.graphics().setDepth(5);
      ring.lineStyle(i === 4 ? 3 : 1.5, reactorColors[i], reactorAlphas[i]);
      ring.strokeCircle(cx, cy, reactorRadii[i]);

      // Fill innermost
      if (i === 4) {
        ring.fillStyle(reactorColors[i], 0.15);
        ring.fillCircle(cx, cy, reactorRadii[i]);
      }

      scene.tweens.add({
        targets:  ring,
        alpha:    { from: 0.4, to: 1.0 },
        scaleX:   { from: 0.94, to: 1.06 },
        scaleY:   { from: 0.94, to: 1.06 },
        duration: 700 + i * 180,
        yoyo:     true,
        repeat:   -1,
        delay:    i * 120,
        ease:     'Sine.easeInOut',
      });
    }

    // Reactor floor glow
    const reactorFloorGlow = scene.add.graphics().setDepth(3);
    reactorFloorGlow.fillStyle(0xff6600, 0.06);
    reactorFloorGlow.fillCircle(cx, cy, 3 * S);
    scene.tweens.add({
      targets:  reactorFloorGlow,
      alpha:    { from: 0.5, to: 1 },
      duration: 900,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // ── Pipe flow — animated energy dots moving downward ─────────────────
    for (const pipeX of [px + S + 3, px + pw - S - 3]) {
      for (let i = 0; i < 4; i++) {
        const dot = scene.add.graphics().setDepth(6);
        dot.fillStyle(0xff6600, 0.9);
        dot.fillCircle(pipeX, py + S, 2.5);

        scene.tweens.add({
          targets:  dot,
          y:        { from: py + S, to: py + ph - S },
          alpha:    { from: 1, to: 0.1 },
          duration: 1400,
          delay:    i * 350,
          repeat:   -1,
          ease:     'Power1',
        });
      }
    }

    // Pipe connectors (horizontal blobs)
    for (const pipeX of [px + S + 3, px + pw - S - 3]) {
      for (const connY of [py + ph / 3, py + ph * 0.66]) {
        const conn = scene.add.graphics().setDepth(5);
        conn.fillStyle(0x2a4060, 1);
        conn.fillRect(pipeX - 6, connY - 4, 12, 8);
        conn.lineStyle(1, 0x4488aa, 0.5);
        conn.strokeRect(pipeX - 6, connY - 4, 12, 8);
      }
    }

    // ── Sparks from reactor core ──────────────────────────────────────────
    const sparks = scene.add.particles(cx, cy, 'spark_particle', {
      speed:    { min: 30, max: 90 },
      angle:    { min: 0,  max: 360 },
      scale:    { start: 0.6, end: 0 },
      alpha:    { start: 1,   end: 0 },
      lifespan: 350,
      frequency: 200,
      quantity:  1,
      tint:     [0xff9900, 0xffcc44, 0xffee88, 0xffffff],
      blendMode: Phaser.BlendModes.ADD,
    });
    sparks.setDepth(8);

    // ── Heat haze — rising translucent blobs ─────────────────────────────
    const heat = scene.add.particles(cx, cy + 0.5 * S, 'particle', {
      speed:    { min: 12, max: 30 },
      angle:    { min: 262, max: 278 },
      scale:    { start: 0.2, end: 0.9 },
      alpha:    { start: 0.18, end: 0 },
      lifespan: 1800,
      frequency: 70,
      quantity:  1,
      tint:     [0xff7700, 0xff9933],
      blendMode: Phaser.BlendModes.ADD,
    });
    heat.setDepth(7);

    // ── Temperature readout display ───────────────────────────────────────
    const tempX = px + S + 6;
    const tempY = py + ph - S - 10;
    const tempGfx = scene.add.graphics().setDepth(6);
    let   tempVal = 0.7;
    let   tempDir = 1;

    scene.time.addEvent({
      delay:    800,
      loop:     true,
      callback: () => {
        tempGfx.clear();
        tempVal += (Math.random() * 0.05 - 0.02) * tempDir;
        if (tempVal > 0.92) tempDir = -1;
        if (tempVal < 0.55) tempDir = 1;
        tempVal = Phaser.Math.Clamp(tempVal, 0.5, 0.98);

        const barH   = 20;
        const fillH  = Math.floor(barH * tempVal);
        const tColor = tempVal > 0.85 ? 0xff2200 : tempVal > 0.7 ? 0xff8800 : 0xffcc44;

        // Frame
        tempGfx.lineStyle(1, 0x3a5580, 0.7);
        tempGfx.strokeRect(tempX, tempY, 8, barH);
        // Fill
        tempGfx.fillStyle(tColor, 0.9);
        tempGfx.fillRect(tempX + 1, tempY + (barH - fillH), 6, fillH);
        // Label
        tempGfx.fillStyle(tColor, 0.6);
        tempGfx.fillRect(tempX - 4, tempY + (barH - fillH) - 1, 3, 2);
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HANGAR — Crane, ship nav lights, force field, scan beam, cargo
  // ═══════════════════════════════════════════════════════════════════════

  private animateHangar(scene: Phaser.Scene) {
    const z  = ZONES.hangar;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;
    const cx = px + pw / 2;

    // ── Overhead crane on top rail ────────────────────────────────────────
    const railY   = py + S + 3;
    const craneGfx = scene.add.graphics().setDepth(7);
    const cranePos = { x: px + 2 * S };

    const drawCrane = () => {
      craneGfx.clear();
      const cr = cranePos.x;

      // Crane body
      craneGfx.fillStyle(0x1a3355, 1);
      craneGfx.fillRoundedRect(cr - 12, railY - 2, 24, 10, 2);
      craneGfx.lineStyle(1, 0x3a6a99, 0.8);
      craneGfx.strokeRoundedRect(cr - 12, railY - 2, 24, 10, 2);

      // Crane wheels on rail
      craneGfx.fillStyle(0x2a4a70, 1);
      craneGfx.fillCircle(cr - 8, railY - 2, 3);
      craneGfx.fillCircle(cr + 8, railY - 2, 3);

      // Cable
      craneGfx.lineStyle(1, 0x5588aa, 0.8);
      craneGfx.lineBetween(cr, railY + 8, cr, railY + 22);

      // Hook
      craneGfx.lineStyle(1.5, 0x7aaacc, 0.9);
      craneGfx.beginPath();
      craneGfx.moveTo(cr - 5, railY + 22);
      craneGfx.lineTo(cr + 5, railY + 22);
      craneGfx.lineTo(cr + 5, railY + 28);
      craneGfx.lineTo(cr, railY + 32);
      craneGfx.strokePath();

      // Indicator light
      craneGfx.fillStyle(0xff8800, 0.9);
      craneGfx.fillCircle(cr + 10, railY + 2, 2);
    };

    drawCrane();
    scene.tweens.add({
      targets:   cranePos,
      x:         { from: px + 2 * S, to: px + pw - 2 * S },
      duration:  7000,
      yoyo:      true,
      repeat:    -1,
      ease:      'Sine.easeInOut',
      onUpdate:  drawCrane,
    });

    // ── Parked ship navigation lights ─────────────────────────────────────
    const shipCY = py + ph / 2;
    const navLights: { x: number; y: number; color: number; period: number }[] = [
      { x: cx,       y: shipCY - S,      color: 0xffffff, period: 1100 },
      { x: cx - S,   y: shipCY + 8,      color: 0xff3300, period: 700  },
      { x: cx + S,   y: shipCY + 8,      color: 0x00ff88, period: 700  },
      { x: cx,       y: shipCY + S + 10, color: 0x4488ff, period: 1600 },
    ];
    for (const nl of navLights) {
      const nlg = scene.add.graphics().setDepth(8);
      nlg.fillStyle(nl.color, 0.95);
      nlg.fillCircle(nl.x, nl.y, nl.color === 0xffffff ? 2 : 1.5);
      scene.tweens.add({
        targets:     nlg,
        alpha:       { from: 1, to: 0 },
        duration:    nl.period * 0.4,
        yoyo:        true,
        repeat:      -1,
        delay:       Math.random() * nl.period,
        repeatDelay: nl.period * 0.6,
        ease:        'Stepped',
      });
    }

    // ── Force field at bay opening (bottom interior wall) ─────────────────
    const ffY    = py + ph - S + 4;
    const ffLine = scene.add.graphics().setDepth(6);
    ffLine.lineStyle(2, 0x4488ff, 0.3);
    ffLine.lineBetween(px + 2 * S, ffY, px + pw - 2 * S, ffY);
    scene.tweens.add({
      targets:  ffLine,
      alpha:    { from: 0.15, to: 0.5 },
      duration: 600,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // Shimmering dots along force field
    for (let i = 0; i < 6; i++) {
      const fdx = px + 2 * S + i * ((pw - 4 * S) / 5);
      const ffd = scene.add.graphics().setDepth(7);
      ffd.fillStyle(0x88ccff, 0.7);
      ffd.fillCircle(fdx, ffY, 2);
      scene.tweens.add({
        targets:  ffd,
        alpha:    { from: 0.1, to: 0.9 },
        y:        { from: ffY - 2, to: ffY + 2 },
        duration: 250 + i * 50,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }

    // ── Green scan beam sweeping the landing pad ──────────────────────────
    const scanGfx = scene.add.graphics().setDepth(7);
    const scanPos = { y: shipCY - 2 * S };
    const drawScan = () => {
      scanGfx.clear();
      scanGfx.lineStyle(1, 0x00ff88, 0.5);
      scanGfx.lineBetween(px + S + 4, scanPos.y, px + pw - S - 4, scanPos.y);
      scanGfx.fillStyle(0x00ff88, 0.04);
      scanGfx.fillRect(px + S + 4, scanPos.y - 3, pw - 2 * S - 8, 6);
    };
    drawScan();
    scene.tweens.add({
      targets:  scanPos,
      y:        { from: shipCY - 2.5 * S, to: shipCY + 2.5 * S },
      duration: 2800,
      yoyo:     true,
      repeat:   -1,
      ease:     'Linear',
      onUpdate: drawScan,
    });

    // ── Cargo activity indicator (right wall) ────────────────────────────
    const cargoGfx = scene.add.graphics().setDepth(7);
    let   cargoPhase = 0;
    scene.time.addEvent({
      delay:    1200,
      loop:     true,
      callback: () => {
        cargoPhase = (cargoPhase + 1) % 3;
        cargoGfx.clear();
        for (let i = 0; i < 3; i++) {
          const active = i === cargoPhase;
          cargoGfx.fillStyle(active ? 0x00ff88 : 0x224433, active ? 0.9 : 0.4);
          cargoGfx.fillRect(px + S + 4, py + (2 + i * 2) * S + 4, S - 8, S - 8);
          if (active) {
            cargoGfx.lineStyle(1, 0x00ff88, 0.7);
            cargoGfx.strokeRect(px + S + 4, py + (2 + i * 2) * S + 4, S - 8, S - 8);
          }
        }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ALERT BAY — Strobes, ambient pulse, chevrons, door edge
  // ═══════════════════════════════════════════════════════════════════════

  private animateAlertBay(scene: Phaser.Scene) {
    const z  = ZONES.alert_bay;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;

    // ── Strobe lights (3 units with housing, offset timing) ───────────────
    const strobeXs = [px + 2 * S, px + pw / 2, px + pw - 2 * S];
    for (let i = 0; i < strobeXs.length; i++) {
      const sx = strobeXs[i];
      const sy = py + S * 0.5;

      // Housing (static)
      const housing = scene.add.graphics().setDepth(6);
      housing.fillStyle(0x1a0008, 1);
      housing.fillRect(sx - 7, sy - 5, 14, 10);
      housing.lineStyle(1, 0x440011, 0.9);
      housing.strokeRect(sx - 7, sy - 5, 14, 10);
      // Vents
      housing.lineStyle(1, 0x330011, 0.5);
      housing.lineBetween(sx - 5, sy - 5, sx - 5, sy + 5);
      housing.lineBetween(sx + 5, sy - 5, sx + 5, sy + 5);

      // Lamp (blinks)
      const lamp = scene.add.graphics().setDepth(7);
      lamp.fillStyle(0xff0022, 1);
      lamp.fillRect(sx - 5, sy - 3, 10, 6);
      lamp.fillStyle(0xff8888, 0.7);
      lamp.fillRect(sx - 4, sy - 2, 3, 2);

      // Floor cone glow when lit
      const cone = scene.add.graphics().setDepth(4);
      cone.fillStyle(0xff0022, 0.06);
      cone.fillTriangle(sx - 7, sy + 5, sx + 7, sy + 5, sx, sy + ph - 2);

      scene.tweens.add({
        targets:     [lamp, cone],
        alpha:       { from: 1, to: 0 },
        duration:    80,
        yoyo:        true,
        repeat:      -1,
        delay:       i * 300 + 100,
        repeatDelay: 1200,
        ease:        'Stepped',
      });
    }

    // ── Whole-room red ambient pulse ──────────────────────────────────────
    const ambient = scene.add.graphics().setDepth(3);
    ambient.fillStyle(0xff0022, 0.06);
    ambient.fillRect(px + S, py, pw - 2 * S, ph);
    scene.tweens.add({
      targets:  ambient,
      alpha:    { from: 0, to: 1 },
      duration: 400,
      yoyo:     true,
      repeat:   -1,
      repeatDelay: 1000,
      ease:     'Power2',
    });

    // ── Scrolling warning chevrons (bottom strip) ──────────────────────────
    const chevGfx = scene.add.graphics().setDepth(7);
    let   chevOffset = 0;
    scene.time.addEvent({
      delay:    25,
      loop:     true,
      callback: () => {
        chevGfx.clear();
        chevOffset = (chevOffset + 0.6) % (S * 2);
        const stripY = py + ph - 6;

        chevGfx.fillStyle(0xffcc00, 0.55);
        for (let x = px + S - chevOffset; x < px + pw - S; x += 24) {
          if (x + 16 > px + S && x < px + pw - S) {
            const x1 = Math.max(x, px + S);
            const x2 = Math.min(x + 16, px + pw - S);
            const wid = x2 - x1;
            if (wid > 0) {
              chevGfx.fillTriangle(x1, stripY, x1 + wid, stripY, x1, stripY - 5);
              chevGfx.fillStyle(0xffcc00, 0.2);
              chevGfx.fillTriangle(x1, stripY, x1 + wid, stripY, x1, stripY - 5);
            }
          }
        }
        // Base strip
        chevGfx.fillStyle(0x880000, 0.3);
        chevGfx.fillRect(px + S, stripY - 6, pw - 2 * S, 6);
        chevGfx.lineStyle(1, 0xff0022, 0.3);
        chevGfx.lineBetween(px + S, stripY - 6, px + pw - S, stripY - 6);
      },
    });

    // ── Emergency door frame pulsing red ──────────────────────────────────
    const doorFrame = scene.add.graphics().setDepth(7);
    doorFrame.lineStyle(2, 0xff0022, 0.7);
    doorFrame.strokeRect(px + S, py + 2, pw - 2 * S, ph - 4);
    scene.tweens.add({
      targets:  doorFrame,
      alpha:    { from: 0.2, to: 0.95 },
      duration: 500,
      yoyo:     true,
      repeat:   -1,
      ease:     'Sine.easeInOut',
    });

    // Corner indicators
    const cornerAlerts: Phaser.GameObjects.Graphics[] = [];
    for (const [cx2, cy2] of [
      [px + S + 4, py + 4], [px + pw - S - 4, py + 4],
      [px + S + 4, py + ph - 4], [px + pw - S - 4, py + ph - 4],
    ] as [number, number][]) {
      const ca = scene.add.graphics().setDepth(8);
      ca.fillStyle(0xff3300, 0.9);
      ca.fillTriangle(cx2, cy2 - 4, cx2 - 4, cy2 + 4, cx2 + 4, cy2 + 4);
      ca.fillStyle(0xffcc00, 1);
      ca.fillRect(cx2 - 0.5, cy2 - 2, 1, 3);
      ca.fillRect(cx2 - 0.5, cy2 + 2, 1, 1);
      cornerAlerts.push(ca);
    }
    scene.tweens.add({
      targets:     cornerAlerts,
      alpha:       { from: 1, to: 0.1 },
      duration:    200,
      yoyo:        true,
      repeat:      -1,
      repeatDelay: 1100,
      ease:        'Stepped',
    });
  }
}
