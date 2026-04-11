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

  // Rooms
  bridgeFloor:   0x071830,
  bridgeAccent:  0x1a4a90,
  bridgeGrid:    0x0e2a50,

  engineFloor:   0x1c0800,
  engineAccent:  0x993300,
  engineGlow:    0xdd5500,

  hangarFloor:   0x011a10,
  hangarAccent:  0x006040,
  hangarMark:    0x00cc88,

  alertFloor:    0x1c0008,
  alertAccent:   0x990022,
  alertGlow:     0xff3344,

  // Structural
  wall:          0x0c1322,
  wallEdge:      0x1a3055,
  corridor:      0x0a1020,
  corridorLine:  0x1a4070,

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
    this.drawRoomFloors();
    this.drawInteriorWalls();
    this.drawCorridors();
    this.drawRoomDecorations();
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
  //  ROOM FLOORS
  // ═══════════════════════════════════════════════════════════════════════

  private drawRoomFloors() {
    const g = this.scene.add.graphics().setDepth(2);

    this.drawBridgeFloor(g);
    this.drawEngineFloor(g);
    this.drawHangarFloor(g);
    this.drawAlertFloor(g);
  }

  private drawBridgeFloor(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.bridge;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;

    // Base
    g.fillStyle(C.bridgeFloor);
    g.fillRect(px, py, pw, ph);

    // Hexagonal-like grid (horizontal lines + offset verticals)
    g.lineStyle(1, C.bridgeGrid, 0.5);
    for (let row = 0; row <= z.h; row++) {
      g.lineBetween(px, py + row * S, px + pw, py + row * S);
    }
    for (let col = 0; col <= z.w; col += 2) {
      g.lineBetween(px + col * S, py, px + col * S, py + ph);
    }

    // Glowing centre diamond (command table)
    const cx = px + pw / 2, cy = py + ph / 2;
    g.fillStyle(C.bridgeAccent, 0.15);
    g.fillRect(cx - 3 * S, cy - S, 6 * S, 2 * S);
    g.lineStyle(1, C.bridgeAccent, 0.6);
    g.strokeRect(cx - 3 * S, cy - S, 6 * S, 2 * S);

    // Corner accent dots
    g.fillStyle(C.bridgeAccent, 0.7);
    for (const [dx, dy] of [[1, 1], [z.w - 1, 1], [1, z.h - 1], [z.w - 1, z.h - 1]]) {
      g.fillRect(px + dx * S - 2, py + dy * S - 2, 4, 4);
    }
  }

  private drawEngineFloor(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.engine_room;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;

    g.fillStyle(C.engineFloor);
    g.fillRect(px, py, pw, ph);

    // Heat lanes (horizontal gradient bars)
    for (let row = 1; row < z.h; row++) {
      g.lineStyle(1, C.engineAccent, 0.1 + (row / z.h) * 0.2);
      g.lineBetween(px + S, py + row * S, px + pw - S, py + row * S);
    }

    // Central reactor ring
    const cx = px + pw / 2, cy = py + ph / 2;
    g.lineStyle(2, C.engineAccent, 0.5);
    g.strokeCircle(cx, cy, 2.5 * S);
    g.lineStyle(1, C.engineGlow, 0.3);
    g.strokeCircle(cx, cy, 1.5 * S);
    g.fillStyle(C.engineGlow, 0.08);
    g.fillCircle(cx, cy, 2.5 * S);
  }

  private drawHangarFloor(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.hangar;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;

    g.fillStyle(C.hangarFloor);
    g.fillRect(px, py, pw, ph);

    // Landing pad centre marker
    const cx = px + pw / 2, cy = py + ph / 2;
    g.lineStyle(2, C.hangarAccent, 0.5);
    g.strokeRect(cx - 2 * S, cy - 2 * S, 4 * S, 4 * S);
    g.lineStyle(1, C.hangarMark, 0.6);
    g.lineBetween(cx - 2 * S, cy, cx + 2 * S, cy);
    g.lineBetween(cx, cy - 2 * S, cx, cy + 2 * S);

    // Guide stripes along sides
    g.lineStyle(2, C.hangarMark, 0.25);
    for (let i = 1; i <= 3; i++) {
      g.lineBetween(px + i * S, py + S, px + i * S, py + ph - S);
      g.lineBetween(px + pw - i * S, py + S, px + pw - i * S, py + ph - S);
    }
  }

  private drawAlertFloor(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.alert_bay;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;

    g.fillStyle(C.alertFloor);
    g.fillRect(px, py, pw, ph);

    // Diagonal warning stripes
    g.lineStyle(2, C.alertAccent, 0.3);
    for (let i = -2; i < z.w + 2; i += 3) {
      g.lineBetween(px + i * S, py, px + (i + z.h) * S, py + ph);
    }

    // Border warning line
    g.lineStyle(2, C.alertGlow, 0.5);
    g.strokeRect(px + S, py + 4, pw - 2 * S, ph - 8);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  INTERIOR WALLS
  // ═══════════════════════════════════════════════════════════════════════

  private drawInteriorWalls() {
    const g = this.scene.add.graphics().setDepth(3);
    g.fillStyle(C.wall);
    g.lineStyle(2, C.wallEdge, 0.8);

    // Draw a 1-tile-thick wall around every zone
    for (const zone of Object.values(ZONES)) {
      const px = zone.x * S, py = zone.y * S, pw = zone.w * S, ph = zone.h * S;
      g.fillRect(px, py, pw, S);         // top wall
      g.fillRect(px, py + ph - S, pw, S); // bottom wall
      g.fillRect(px, py, S, ph);         // left wall
      g.fillRect(px + pw - S, py, S, ph); // right wall
      // Edge highlight
      g.strokeRect(px, py, pw, ph);
    }

    // Wall between engine_room and hangar (shared vertical)
    const ey = ZONES.engine_room;
    g.fillStyle(C.wall);
    g.fillRect(ey.x * S + ey.w * S - S, ey.y * S, 2 * S, ey.h * S);

    // Thick accent line at top of each zone
    g.lineStyle(2, C.hullAccent, 0.5);
    for (const zone of Object.values(ZONES)) {
      g.lineBetween(zone.x * S, zone.y * S, (zone.x + zone.w) * S, zone.y * S);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CORRIDORS
  // ═══════════════════════════════════════════════════════════════════════

  private drawCorridors() {
    const g = this.scene.add.graphics().setDepth(1);
    g.fillStyle(C.corridor);

    const bz = ZONES.bridge;
    const ez = ZONES.engine_room;
    const az = ZONES.alert_bay;

    // Bridge → mid section (horizontal band between bridge and engine/hangar)
    const corridorY1 = (bz.y + bz.h) * S;
    g.fillRect(6 * S, corridorY1, 24 * S, S);

    // Mid section → alert bay (horizontal band)
    const corridorY2 = (ez.y + ez.h) * S;
    g.fillRect(6 * S, corridorY2, 24 * S, az.y * S - corridorY2);

    // Glowing centre line in corridors
    g.lineStyle(1, C.corridorLine, 0.6);
    const cy1 = corridorY1 + S / 2;
    g.lineBetween(6 * S, cy1, 30 * S, cy1);
    const cy2 = corridorY2 + S / 2;
    g.lineBetween(6 * S, cy2, 30 * S, cy2);

    // Dots along corridors
    g.fillStyle(C.corridorLine, 0.5);
    for (let x = 8; x < 30; x += 3) {
      g.fillRect(x * S + S / 2 - 1, cy1 - 1, 2, 2);
      g.fillRect(x * S + S / 2 - 1, cy2 - 1, 2, 2);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ROOM DECORATIONS (furniture/equipment silhouettes)
  // ═══════════════════════════════════════════════════════════════════════

  private drawRoomDecorations() {
    const g = this.scene.add.graphics().setDepth(4);

    this.decorateBridge(g);
    this.decorateEngineRoom(g);
    this.decorateHangar(g);
    this.decorateAlertBay(g);
  }

  private decorateBridge(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.bridge;
    const px = z.x * S, py = z.y * S, pw = z.w * S;

    // Viewscreen along the top wall (glowing rectangle)
    g.fillStyle(C.bridgeAccent, 0.2);
    g.fillRect(px + 2 * S, py + S, pw - 4 * S, S + 8);
    g.lineStyle(1, C.bridgeAccent, 0.8);
    g.strokeRect(px + 2 * S, py + S, pw - 4 * S, S + 8);

    // Scan lines on viewscreen
    g.lineStyle(1, C.bridgeAccent, 0.2);
    for (let i = 4; i < S; i += 6) {
      g.lineBetween(px + 2 * S, py + S + i, px + pw - 2 * S, py + S + i);
    }

    // Console desks (two rows)
    g.fillStyle(C.wall);
    g.fillRect(px + 2 * S, py + 3 * S, pw - 4 * S, 10);
    g.fillRect(px + 2 * S, py + 4 * S + 8, pw - 4 * S, 10);
    g.lineStyle(1, C.bridgeGrid, 0.6);
    g.strokeRect(px + 2 * S, py + 3 * S, pw - 4 * S, 10);
    g.strokeRect(px + 2 * S, py + 4 * S + 8, pw - 4 * S, 10);

    // Console lights
    const colors = [C.bridgeAccent, 0x00ff88, 0xffaa00, 0xff4444, C.bridgeAccent];
    for (let i = 0; i < 5; i++) {
      g.fillStyle(colors[i % colors.length], 0.8);
      g.fillRect(px + (2 + i * 2.5) * S, py + 3 * S + 2, 6, 6);
    }

    // Captain's chair (centre bottom area)
    g.fillStyle(C.hullMid);
    g.fillRoundedRect(px + pw / 2 - S, py + 5 * S, 2 * S, S + 8, 4);
    g.lineStyle(1, C.bridgeAccent, 0.4);
    g.strokeRoundedRect(px + pw / 2 - S, py + 5 * S, 2 * S, S + 8, 4);
  }

  private decorateEngineRoom(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.engine_room;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;
    const cx = px + pw / 2, cy = py + ph / 2;

    // Reactor core (large cylinder)
    g.fillStyle(C.engineAccent, 0.12);
    g.fillCircle(cx, cy, 2 * S);
    g.lineStyle(2, C.engineAccent, 0.7);
    g.strokeCircle(cx, cy, 2 * S);
    g.lineStyle(1, C.engineGlow, 0.5);
    g.strokeCircle(cx, cy, S);

    // Core cross
    g.lineStyle(1, C.engineAccent, 0.4);
    g.lineBetween(cx - 2 * S, cy, cx + 2 * S, cy);
    g.lineBetween(cx, cy - 2 * S, cx, cy + 2 * S);

    // Pipe conduits along walls
    g.fillStyle(C.hullMid);
    g.fillRect(px + S, py + S, 6, ph - 2 * S);
    g.fillRect(px + pw - S - 6, py + S, 6, ph - 2 * S);
    g.lineStyle(1, C.engineAccent, 0.4);
    g.strokeRect(px + S, py + S, 6, ph - 2 * S);
    g.strokeRect(px + pw - S - 6, py + S, 6, ph - 2 * S);
  }

  private decorateHangar(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.hangar;
    const px = z.x * S, py = z.y * S, pw = z.w * S, ph = z.h * S;
    const cx = px + pw / 2, cy = py + ph / 2;

    // Parked ship silhouette (small ship shape)
    g.fillStyle(C.hullMid);
    g.fillTriangle(cx, cy - S, cx - S, cy + 8, cx + S, cy + 8);
    g.fillRect(cx - S, cy + 8, 2 * S, 14);
    g.lineStyle(1, C.hangarAccent, 0.5);
    g.strokeTriangle(cx, cy - S, cx - S, cy + 8, cx + S, cy + 8);

    // Storage crates along left wall
    g.fillStyle(C.hullPanel);
    for (let i = 0; i < 3; i++) {
      g.fillRect(px + S + 2, py + (2 + i * 2) * S, S - 4, S - 4);
      g.lineStyle(1, C.hangarAccent, 0.3);
      g.strokeRect(px + S + 2, py + (2 + i * 2) * S, S - 4, S - 4);
    }

    // Crane rail at top
    g.fillStyle(C.hullMid);
    g.fillRect(px + S, py + S, pw - 2 * S, 6);
    g.lineStyle(1, C.hangarMark, 0.4);
    g.strokeRect(px + S, py + S, pw - 2 * S, 6);
  }

  private decorateAlertBay(g: Phaser.GameObjects.Graphics) {
    const z = ZONES.alert_bay;
    const px = z.x * S, py = z.y * S, pw = z.w * S;

    // Emergency lockers
    const numLockers = 5;
    const lockerW = (pw - 4 * S) / numLockers;
    for (let i = 0; i < numLockers; i++) {
      const lx = px + 2 * S + i * lockerW;
      g.fillStyle(C.hullPanel);
      g.fillRect(lx + 2, py + S + 4, lockerW - 4, S - 8);
      g.lineStyle(1, C.alertAccent, 0.6);
      g.strokeRect(lx + 2, py + S + 4, lockerW - 4, S - 8);
      g.fillStyle(C.alertGlow, 0.8);
      g.fillRect(lx + lockerW / 2 - 2, py + S + 8, 4, 4);
    }
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
