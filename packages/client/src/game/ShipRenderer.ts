import Phaser from 'phaser';
import { ZONES } from './mapData';

const S = 32; // tile size in pixels

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  // Hull layers (dark → bright for depth simulation)
  hullDeep:    0x030609,   // deepest shadow
  hullBase:    0x060c18,   // main hull base
  hullPanel:   0x0d1828,   // panel fill
  hullMid:     0x142238,   // raised panel
  hullBright:  0x1c3050,   // bright panel top
  hullBevel:   0x2a4868,   // bevel edge
  hullEdge:    0x3a6090,   // highlight edge

  // Nacelle colors
  nacelleBase: 0x080e1c,
  nacelleMid:  0x101c30,
  nacelleBright: 0x1a2e4a,
  nacelleEdge: 0x2c4870,

  // Glow trim — the primary visual accent
  trimDim:     0x1a4a88,   // dim trim
  trimMid:     0x2a6ab8,   // medium trim
  trimBright:  0x44aaff,   // bright trim
  trimHot:     0x88ccff,   // specular trim

  // Zone accent glows (for hull exterior near zone walls)
  glowBridge:  0x2255aa,
  glowEngine:  0x883300,
  glowHangar:  0x115533,
  glowAlert:   0x881122,

  // Cockpit
  cockpit:     0x44aaff,
  cockpitGlow: 0x88ccff,

  // Engine
  exhaustInner: 0x5588ff,
  exhaustOuter: 0x2244aa,

  // Navigation
  navGreen:    0x00ff88,
  navRed:      0xff3300,
  navWhite:    0xeeeeff,
};

/**
 * Draws the ship exterior hull using Phaser Graphics — no external assets.
 * Interior rooms are now handled by ShipTilemap/TilesetGenerator.
 * This class renders only the hull shell, cockpit, equipment detail,
 * nav lights, and engine exhaust.
 */
export class ShipRenderer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.drawHullBase();
    this.drawHullPanels();
    this.drawNacelleDetail();
    this.drawHullTrimGlow();
    this.drawCockpitWindows();
    this.drawHullEquipment();
    this.drawZoneLabels();
    this.createNavigationLights();
    this.createEngineExhaust();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HULL BASE — silhouette fills, deepest layer
  // ═══════════════════════════════════════════════════════════════════════

  private drawHullBase() {
    const g = this.scene.add.graphics().setDepth(0);

    // ── Atmospheric glow / shadow behind ship ────────────────────────
    for (let i = 10; i >= 1; i--) {
      g.fillStyle(0x001428, 0.022 * i);
      g.fillEllipse(18 * S, 13.5 * S, (26 + i * 2.5) * S, (30 + i * 2.5) * S);
    }
    // Subtle blue-tinted hull reflection on space
    for (let i = 4; i >= 1; i--) {
      g.fillStyle(0x112244, 0.015 * i);
      g.fillEllipse(18 * S, 13.5 * S, (20 + i * 1.5) * S, (24 + i * 1.5) * S);
    }

    // ── Main hull silhouette ─────────────────────────────────────────
    g.fillStyle(C.hullBase);

    // Main body
    g.fillRect(6 * S, 3 * S, 24 * S, 25 * S);

    // Nose / prow — pointed triangle
    g.fillTriangle(18 * S, 0, 6 * S, 3 * S, 30 * S, 3 * S);

    // Engine bay protrusion at bottom
    g.fillRect(8 * S, 28 * S, 20 * S, S);

    // ── Nacelles ────────────────────────────────────────────────────
    g.fillStyle(C.nacelleBase);

    // Left nacelle — main body
    g.fillRect(1 * S, 12 * S, 5 * S, 10 * S);
    // Left nacelle — forward swept fillet
    g.fillTriangle(6 * S, 11 * S, 6 * S, 12 * S, 2 * S, 12 * S);
    // Left nacelle — aft swept fillet
    g.fillTriangle(6 * S, 22 * S, 6 * S, 23 * S, 2 * S, 22 * S);
    // Left nacelle — pointed tip (arrow-head shape)
    g.fillTriangle(1 * S, 12 * S, 0, 16 * S, 1 * S, 22 * S);

    // Right nacelle (mirrored)
    g.fillRect(30 * S, 12 * S, 5 * S, 10 * S);
    g.fillTriangle(30 * S, 11 * S, 30 * S, 12 * S, 34 * S, 12 * S);
    g.fillTriangle(30 * S, 22 * S, 30 * S, 23 * S, 34 * S, 22 * S);
    g.fillTriangle(35 * S, 12 * S, 36 * S, 16 * S, 35 * S, 22 * S);

    // ── Wing root connectors (where nacelles meet body) ──────────────
    g.fillStyle(C.hullPanel);
    g.fillRect(5 * S, 11 * S, 2 * S, 12 * S);   // left root
    g.fillRect(29 * S, 11 * S, 2 * S, 12 * S);  // right root
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HULL PANELS — armor plate layers, depth shading
  // ═══════════════════════════════════════════════════════════════════════

  private drawHullPanels() {
    const g = this.scene.add.graphics().setDepth(1);

    // ── Forward section (bridge area, rows 3–11) — slightly raised ──
    g.fillStyle(C.hullPanel);
    g.fillRect(8 * S, 4 * S, 20 * S, 7 * S);

    // Forward-section nose bevel (gives the nose a chunky look)
    g.fillStyle(C.hullMid);
    g.fillTriangle(18 * S, S, 9 * S, 4 * S, 27 * S, 4 * S);

    // ── Dorsal spine (center raised ridge, 4-tile wide) ─────────────
    g.fillStyle(C.hullMid);
    g.fillRect(14 * S, 3 * S, 8 * S, 25 * S);

    // Spine raised cap (top highlight strip)
    g.fillStyle(C.hullBright);
    g.fillRect(15 * S, 3 * S, 6 * S, 3);

    // ── Mid-section side panels (rows 11–22, outside spine) ─────────
    g.fillStyle(C.hullPanel);
    g.fillRect(6 * S, 11 * S, 8 * S, 11 * S);   // left mid
    g.fillRect(22 * S, 11 * S, 8 * S, 11 * S);  // right mid

    // ── Aft section (alert bay + engine, rows 22–28) ─────────────────
    g.fillStyle(C.hullPanel);
    g.fillRect(6 * S, 22 * S, 24 * S, 6 * S);

    // Engine bay rear panel
    g.fillStyle(C.hullMid);
    g.fillRect(8 * S, 26 * S, 20 * S, 2 * S);
    g.fillRect(9 * S, 28 * S, 18 * S, S);

    // ── Large armor plate seams ──────────────────────────────────────
    // These add "plate gap" shadows between sections

    // Horizontal seams
    g.lineStyle(2, C.hullDeep, 0.8);
    g.lineBetween(6 * S, 11 * S, 30 * S, 11 * S);  // body/mid seam
    g.lineBetween(6 * S, 22 * S, 30 * S, 22 * S);  // mid/aft seam
    g.lineBetween(6 * S, 26 * S, 30 * S, 26 * S);  // aft/engine seam

    // Vertical seams — divide body into plates
    g.lineBetween(14 * S, 3 * S,  14 * S, 28 * S); // spine left
    g.lineBetween(22 * S, 3 * S,  22 * S, 28 * S); // spine right

    // Forward section divisions
    g.lineStyle(1, C.hullDeep, 0.6);
    g.lineBetween(10 * S, 4 * S, 10 * S, 11 * S);
    g.lineBetween(26 * S, 4 * S, 26 * S, 11 * S);

    // Mid section divisions
    g.lineBetween(10 * S, 11 * S, 10 * S, 22 * S);
    g.lineBetween(26 * S, 11 * S, 26 * S, 22 * S);

    // ── Panel edge highlights (simulate top-lit armor plates) ────────
    g.lineStyle(1, C.hullBevel, 0.5);
    // Top of each panel section
    g.lineBetween(8 * S + 1, 4 * S, 28 * S - 1, 4 * S);
    g.lineBetween(6 * S + 1, 11 * S + 1, 14 * S, 11 * S + 1);
    g.lineBetween(22 * S, 11 * S + 1, 30 * S - 1, 11 * S + 1);
    g.lineBetween(6 * S + 1, 22 * S + 1, 30 * S - 1, 22 * S + 1);

    // ── Fine panel lines (rivet rows, structural detail) ─────────────
    g.lineStyle(1, C.hullDeep, 0.45);
    for (const ty of [6, 8, 14, 17, 20, 24]) {
      g.lineBetween(7 * S, ty * S, 29 * S, ty * S);
    }
    g.lineStyle(1, C.hullBevel, 0.15);
    for (const ty of [6, 8, 14, 17, 20, 24]) {
      g.lineBetween(7 * S, ty * S + 1, 29 * S, ty * S + 1);
    }

    // ── Nacelle panel detail ─────────────────────────────────────────
    g.fillStyle(C.nacelleMid);
    // Nacelle raised ribs
    for (let i = 0; i < 4; i++) {
      const ry = (13 + i * 2) * S;
      g.fillRect(1 * S + 2, ry, 4 * S - 4, 6);
      g.fillRect(31 * S + 2, ry, 4 * S - 4, 6);
    }

    // Nacelle center stripe (longitudinal accent)
    g.lineStyle(1, C.nacelleBright, 0.6);
    g.lineBetween(3 * S, 12 * S, 3 * S, 22 * S);
    g.lineBetween(33 * S, 12 * S, 33 * S, 22 * S);

    // Nacelle rib highlights
    g.lineStyle(1, C.nacelleEdge, 0.4);
    for (let i = 0; i < 4; i++) {
      const ry = (13 + i * 2) * S;
      g.lineBetween(1 * S + 2, ry, 5 * S - 2, ry);
      g.lineBetween(31 * S + 2, ry, 35 * S - 2, ry);
    }

    // ── Body edge highlights (top-lit bevel simulation) ──────────────
    g.lineStyle(2, C.hullEdge, 0.35);
    // Outer body edge (left)
    g.lineBetween(6 * S, 3 * S, 6 * S, 26 * S);
    // Outer body edge (right)
    g.lineBetween(30 * S, 3 * S, 30 * S, 26 * S);
    // Nose edges
    g.lineBetween(18 * S, 0, 6 * S, 3 * S);
    g.lineBetween(18 * S, 0, 30 * S, 3 * S);

    // ── Hull markings (ship ID / registry bars) ──────────────────────
    g.fillStyle(C.trimDim, 0.5);
    g.fillRect(7 * S + 4,  5 * S, 3 * S, 4);
    g.fillRect(7 * S + 4,  5 * S + 8, 3 * S, 4);
    g.fillRect(26 * S - 4, 5 * S, 3 * S, 4);
    g.fillRect(26 * S - 4, 5 * S + 8, 3 * S, 4);
    // Larger registry block on the forward hull
    g.fillStyle(C.trimDim, 0.2);
    g.fillRect(7 * S, 6 * S, S + 8, 3 * S);
    g.fillRect(28 * S - 8, 6 * S, S + 8, 3 * S);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  NACELLE DETAIL — strakes, fins, tip pods
  // ═══════════════════════════════════════════════════════════════════════

  private drawNacelleDetail() {
    const g = this.scene.add.graphics().setDepth(1);

    // ── Nacelle tip pods ─────────────────────────────────────────────
    // Left tip pod (small oval sensor at tip)
    g.fillStyle(C.nacelleMid);
    g.fillEllipse(0.5 * S, 17 * S, S - 4, S - 4);
    g.lineStyle(1, C.nacelleEdge, 0.7);
    g.strokeEllipse(0.5 * S, 17 * S, S - 4, S - 4);
    // Pod sensor dot
    g.fillStyle(C.trimBright, 0.6);
    g.fillCircle(0.5 * S, 17 * S, 3);

    // Right tip pod
    g.fillStyle(C.nacelleMid);
    g.fillEllipse(35.5 * S, 17 * S, S - 4, S - 4);
    g.lineStyle(1, C.nacelleEdge, 0.7);
    g.strokeEllipse(35.5 * S, 17 * S, S - 4, S - 4);
    g.fillStyle(C.trimBright, 0.6);
    g.fillCircle(35.5 * S, 17 * S, 3);

    // ── Nacelle engine nozzle (rear) ──────────────────────────────────
    g.fillStyle(C.hullDeep);
    g.fillEllipse(3 * S, 22 * S - 4, 3 * S - 8, 10);
    g.lineStyle(1, C.exhaustOuter, 0.7);
    g.strokeEllipse(3 * S, 22 * S - 4, 3 * S - 8, 10);
    g.fillStyle(0x4466aa, 0.25);
    g.fillEllipse(3 * S, 22 * S - 4, 2 * S - 8, 8);

    g.fillStyle(C.hullDeep);
    g.fillEllipse(33 * S, 22 * S - 4, 3 * S - 8, 10);
    g.lineStyle(1, C.exhaustOuter, 0.7);
    g.strokeEllipse(33 * S, 22 * S - 4, 3 * S - 8, 10);
    g.fillStyle(0x4466aa, 0.25);
    g.fillEllipse(33 * S, 22 * S - 4, 2 * S - 8, 8);

    // ── Wing strakes (forward fins) ───────────────────────────────────
    // Left: diagonal fin from body-forward to nacelle-forward
    g.fillStyle(C.hullMid);
    g.fillTriangle(6 * S, 11 * S, 3 * S, 12 * S, 6 * S, 13 * S);
    g.lineStyle(1, C.hullEdge, 0.5);
    g.lineBetween(6 * S, 11 * S, 3 * S, 12 * S);

    // Right forward fin
    g.fillStyle(C.hullMid);
    g.fillTriangle(30 * S, 11 * S, 33 * S, 12 * S, 30 * S, 13 * S);
    g.lineStyle(1, C.hullEdge, 0.5);
    g.lineBetween(30 * S, 11 * S, 33 * S, 12 * S);

    // Aft wing strakes
    g.fillStyle(C.hullMid);
    g.fillTriangle(6 * S, 23 * S, 3 * S, 22 * S, 6 * S, 21 * S);
    g.lineStyle(1, C.hullEdge, 0.5);
    g.lineBetween(6 * S, 23 * S, 3 * S, 22 * S);

    g.fillStyle(C.hullMid);
    g.fillTriangle(30 * S, 23 * S, 33 * S, 22 * S, 30 * S, 21 * S);
    g.lineStyle(1, C.hullEdge, 0.5);
    g.lineBetween(30 * S, 23 * S, 33 * S, 22 * S);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HULL TRIM GLOW — glowing edge accent lines (the defining sci-fi look)
  // ═══════════════════════════════════════════════════════════════════════

  private drawHullTrimGlow() {
    const g = this.scene.add.graphics().setDepth(2);

    // Helper: draw a glow path with multiple widths for soft glow effect
    const glowPath = (
      points: [number, number][],
      color: number,
      closed = false,
    ) => {
      for (const [lw, alpha] of [[10, 0.04], [6, 0.08], [3, 0.15], [1.5, 0.4]] as [number, number][]) {
        g.lineStyle(lw, color, alpha);
        g.beginPath();
        g.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
        if (closed) g.closePath();
        g.strokePath();
      }
      // Bright specular line on top
      g.lineStyle(1, C.trimHot, 0.6);
      g.beginPath();
      g.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
      if (closed) g.closePath();
      g.strokePath();
    };

    // ── Main hull outline trim ───────────────────────────────────────
    glowPath([
      [18 * S, 0],
      [6 * S,  3 * S],
      [6 * S,  26 * S],
      [9 * S,  26 * S],
      [9 * S,  28 * S],
      [9 * S,  29 * S],
      [27 * S, 29 * S],
      [27 * S, 28 * S],
      [27 * S, 26 * S],
      [30 * S, 26 * S],
      [30 * S, 3 * S],
      [18 * S, 0],
    ], C.trimBright);

    // ── Left nacelle outline trim ────────────────────────────────────
    glowPath([
      [6 * S,  11 * S],
      [2 * S,  12 * S],
      [0,      16 * S],
      [2 * S,  22 * S],
      [6 * S,  23 * S],
    ], C.trimMid);

    // ── Right nacelle outline trim ───────────────────────────────────
    glowPath([
      [30 * S, 11 * S],
      [34 * S, 12 * S],
      [36 * S, 16 * S],
      [34 * S, 22 * S],
      [30 * S, 23 * S],
    ], C.trimMid);

    // ── Dorsal spine accent strip ─────────────────────────────────────
    g.lineStyle(3, C.trimDim, 0.12);
    g.lineBetween(14 * S, 3 * S, 22 * S, 3 * S);
    g.lineStyle(1, C.trimMid, 0.3);
    g.lineBetween(14 * S, 3 * S, 22 * S, 3 * S);

    // ── Horizontal accent strips along body sides ─────────────────────
    for (const [row, alpha] of [[10, 0.5], [15, 0.35], [20, 0.5]] as [number, number][]) {
      // Left side
      g.lineStyle(4, C.trimDim, alpha * 0.4);
      g.lineBetween(6 * S, row * S, 10 * S, row * S);
      g.lineStyle(1, C.trimBright, alpha);
      g.lineBetween(6 * S, row * S, 10 * S, row * S);
      // Right side
      g.lineStyle(4, C.trimDim, alpha * 0.4);
      g.lineBetween(26 * S, row * S, 30 * S, row * S);
      g.lineStyle(1, C.trimBright, alpha);
      g.lineBetween(26 * S, row * S, 30 * S, row * S);
    }

    // ── Zone-proximity hull glow (inner hull face toward each zone) ───
    // Bridge side — blue glow on forward hull walls
    g.lineStyle(4, C.glowBridge, 0.12);
    g.lineBetween(10 * S, 3 * S, 26 * S, 3 * S);
    g.lineStyle(1, C.glowBridge, 0.4);
    g.lineBetween(10 * S, 3 * S, 26 * S, 3 * S);

    // Engine glow on left side wall
    g.lineStyle(4, C.glowEngine, 0.12);
    g.lineBetween(6 * S, 12 * S, 6 * S, 21 * S);
    g.lineStyle(1, C.glowEngine, 0.3);
    g.lineBetween(6 * S, 12 * S, 6 * S, 21 * S);

    // Hangar glow on right side wall
    g.lineStyle(4, C.glowHangar, 0.12);
    g.lineBetween(30 * S, 12 * S, 30 * S, 21 * S);
    g.lineStyle(1, C.glowHangar, 0.3);
    g.lineBetween(30 * S, 12 * S, 30 * S, 21 * S);

    // Alert glow on aft edge
    g.lineStyle(4, C.glowAlert, 0.12);
    g.lineBetween(10 * S, 26 * S, 26 * S, 26 * S);
    g.lineStyle(1, C.glowAlert, 0.35);
    g.lineBetween(10 * S, 26 * S, 26 * S, 26 * S);

    // ── Antenna / sensor mast at nose tip ─────────────────────────────
    g.lineStyle(1, C.trimBright, 0.7);
    g.lineBetween(18 * S, 0, 18 * S, -S - 8);
    // Crossbar
    g.lineBetween(17 * S - 4, -S + 4, 19 * S + 4, -S + 4);
    // Tip glow
    g.fillStyle(C.trimHot, 0.9);
    g.fillCircle(18 * S, -S - 8, 3);
    g.fillStyle(C.trimBright, 0.3);
    g.fillCircle(18 * S, -S - 8, 6);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COCKPIT WINDOWS
  // ═══════════════════════════════════════════════════════════════════════

  private drawCockpitWindows() {
    const g = this.scene.add.graphics().setDepth(5);
    const cx = 18 * S;

    // ── Main cockpit canopy ──────────────────────────────────────────
    // Outer frame
    g.fillStyle(C.hullMid);
    g.fillTriangle(cx, S / 2, cx - 3.5 * S, 3 * S, cx + 3.5 * S, 3 * S);
    g.lineStyle(1, C.hullEdge, 0.6);
    g.strokeTriangle(cx, S / 2, cx - 3.5 * S, 3 * S, cx + 3.5 * S, 3 * S);

    // Glass fill
    g.fillStyle(C.cockpit, 0.18);
    g.fillTriangle(cx, S * 0.6, cx - 3 * S, 3 * S, cx + 3 * S, 3 * S);

    // Glass panes — structural dividers
    g.lineStyle(1, C.cockpit, 0.45);
    g.lineBetween(cx, S * 0.7, cx, 3 * S);            // center spine
    g.lineBetween(cx - S, 2 * S, cx + S, 2 * S);      // lower cross
    g.lineBetween(cx - 2 * S, 2.6 * S, cx + 2 * S, 2.6 * S);  // upper cross
    g.lineBetween(cx - 1.5 * S, S * 1.4, cx, S * 0.7);  // left diagonal
    g.lineBetween(cx + 1.5 * S, S * 1.4, cx, S * 0.7);  // right diagonal

    // Interior glow
    g.fillStyle(C.cockpit, 0.08);
    g.fillEllipse(cx, 2.2 * S, 5 * S, 2.5 * S);

    // Canopy edge glow
    g.lineStyle(4, C.cockpit, 0.06);
    g.strokeTriangle(cx, S / 2, cx - 3 * S, 3 * S, cx + 3 * S, 3 * S);
    g.lineStyle(1, C.cockpitGlow, 0.5);
    g.strokeTriangle(cx, S / 2, cx - 3 * S, 3 * S, cx + 3 * S, 3 * S);

    // ── Side port windows ────────────────────────────────────────────
    for (const [wx, wy] of [[cx - 5.5 * S, 2.2 * S], [cx + 4.5 * S, 2.2 * S]] as [number, number][]) {
      g.fillStyle(C.cockpit, 0.15);
      g.fillEllipse(wx, wy, S * 1.2, S * 0.5);
      g.lineStyle(1, C.cockpit, 0.6);
      g.strokeEllipse(wx, wy, S * 1.2, S * 0.5);
      // Glare
      g.fillStyle(C.cockpitGlow, 0.3);
      g.fillEllipse(wx - S * 0.2, wy - 3, S * 0.3, S * 0.15);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HULL EQUIPMENT — vents, sensors, hardpoints, antenna arrays
  // ═══════════════════════════════════════════════════════════════════════

  private drawHullEquipment() {
    const g = this.scene.add.graphics().setDepth(5);

    // ── Forward sensor cluster (on nose, just below cockpit) ──────────
    const noseX = 18 * S, noseY = 3.5 * S;
    g.fillStyle(C.hullMid);
    g.fillRect(noseX - 12, noseY - 4, 24, 8);
    g.lineStyle(1, C.hullEdge, 0.6);
    g.strokeRect(noseX - 12, noseY - 4, 24, 8);
    // Sensor dots
    for (let i = -2; i <= 2; i++) {
      g.fillStyle(C.trimDim, 0.8);
      g.fillCircle(noseX + i * 5, noseY, 2);
    }
    g.fillStyle(C.trimBright, 0.9);
    g.fillCircle(noseX, noseY, 2.5);  // center active sensor

    // ── Hull vent banks (left and right sides) ─────────────────────────
    for (const vx of [7 * S, 28 * S - 8]) {
      for (let row = 0; row < 4; row++) {
        const vy = 13 * S + row * 16;
        g.fillStyle(C.hullDeep);
        g.fillRect(vx, vy, 8, 6);
        g.lineStyle(1, C.hullBevel, 0.4);
        g.strokeRect(vx, vy, 8, 6);
        // Vent slats (3 horizontal lines inside)
        g.lineStyle(1, C.hullPanel, 0.8);
        g.lineBetween(vx + 1, vy + 2, vx + 7, vy + 2);
        g.lineBetween(vx + 1, vy + 4, vx + 7, vy + 4);
      }
    }

    // ── Hardpoints (weapon/equipment blister on wings) ────────────────
    for (const [hx, hy] of [[2.5 * S, 14.5 * S], [2.5 * S, 19.5 * S],
                             [33.5 * S, 14.5 * S], [33.5 * S, 19.5 * S]] as [number, number][]) {
      g.fillStyle(C.nacelleMid);
      g.fillCircle(hx, hy, 6);
      g.lineStyle(1, C.nacelleEdge, 0.7);
      g.strokeCircle(hx, hy, 6);
      g.fillStyle(C.hullDeep);
      g.fillCircle(hx, hy, 3);
    }

    // ── Lateral hull sensor pods (mid-body) ───────────────────────────
    // Left side
    g.fillStyle(C.hullMid);
    g.fillEllipse(6 * S - 4, 17 * S, 10, 16);
    g.lineStyle(1, C.hullEdge, 0.7);
    g.strokeEllipse(6 * S - 4, 17 * S, 10, 16);
    g.fillStyle(C.trimDim, 0.6);
    g.fillCircle(6 * S - 4, 17 * S, 2);

    // Right side
    g.fillStyle(C.hullMid);
    g.fillEllipse(30 * S + 4, 17 * S, 10, 16);
    g.lineStyle(1, C.hullEdge, 0.7);
    g.strokeEllipse(30 * S + 4, 17 * S, 10, 16);
    g.fillStyle(C.trimDim, 0.6);
    g.fillCircle(30 * S + 4, 17 * S, 2);

    // ── Aft sensor/weapon turret blister ──────────────────────────────
    g.fillStyle(C.hullMid);
    g.fillCircle(18 * S, 26.5 * S, S * 0.6);
    g.lineStyle(1, C.hullEdge, 0.6);
    g.strokeCircle(18 * S, 26.5 * S, S * 0.6);
    g.fillStyle(C.hullDeep);
    g.fillCircle(18 * S, 26.5 * S, S * 0.3);
    g.lineStyle(1, C.hullBevel, 0.4);
    g.strokeCircle(18 * S, 26.5 * S, S * 0.3);
    // Turret barrel
    g.lineStyle(2, C.hullMid);
    g.lineBetween(18 * S, 26.5 * S, 18 * S, 27.5 * S);
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
  //  NAVIGATION LIGHTS
  // ═══════════════════════════════════════════════════════════════════════

  private createNavigationLights() {
    const lights: { x: number; y: number; color: number; r: number; period: number }[] = [
      // Nose tip
      { x: 18 * S,  y: -S - 8,  color: C.navWhite, r: 2.5, period: 1200 },
      // Left nacelle tip
      { x: 0.5 * S, y: 16 * S,  color: C.navRed,   r: 3,   period: 850  },
      { x: 0.5 * S, y: 13 * S,  color: C.navRed,   r: 1.5, period: 850  },
      // Right nacelle tip
      { x: 35.5 * S, y: 16 * S, color: C.navGreen, r: 3,   period: 850  },
      { x: 35.5 * S, y: 13 * S, color: C.navGreen, r: 1.5, period: 850  },
      // Engine bay
      { x: 9 * S,  y: 28.5 * S, color: C.navWhite, r: 2,   period: 1800 },
      { x: 27 * S, y: 28.5 * S, color: C.navWhite, r: 2,   period: 1800 },
      // Hull midpoints
      { x: 6 * S,  y: 8 * S,   color: C.navWhite, r: 1.5, period: 2200 },
      { x: 30 * S, y: 8 * S,   color: C.navWhite, r: 1.5, period: 2200 },
      // Aft
      { x: 12 * S, y: 28 * S,  color: C.navWhite, r: 1.5, period: 1600 },
      { x: 24 * S, y: 28 * S,  color: C.navWhite, r: 1.5, period: 1600 },
    ];

    for (const lt of lights) {
      const dot = this.scene.add.graphics().setDepth(8);
      // Glow halo
      dot.fillStyle(lt.color, 0.2);
      dot.fillCircle(lt.x, lt.y, lt.r * 2.5);
      // Main dot
      dot.fillStyle(lt.color, 0.95);
      dot.fillCircle(lt.x, lt.y, lt.r);
      // Specular
      dot.fillStyle(0xffffff, 0.7);
      dot.fillCircle(lt.x - lt.r * 0.3, lt.y - lt.r * 0.3, lt.r * 0.4);

      this.scene.tweens.add({
        targets:  dot,
        alpha:    { from: 1, to: 0.05 },
        duration: lt.period,
        yoyo:     true,
        repeat:   -1,
        delay:    Math.random() * lt.period,
        ease:     'Stepped',
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ENGINE EXHAUST
  // ═══════════════════════════════════════════════════════════════════════

  private createEngineExhaust() {
    // Main thruster nozzles
    const nozzles = [
      { x: 11 * S, y: 29 * S, size: 1.2 },
      { x: 15 * S, y: 29 * S, size: 1.4 },
      { x: 18 * S, y: 29 * S, size: 1.6 },
      { x: 21 * S, y: 29 * S, size: 1.4 },
      { x: 25 * S, y: 29 * S, size: 1.2 },
    ];

    for (const nz of nozzles) {
      const W = nz.size * S;
      const H = W * 0.45;

      // Nozzle bell (dark surround)
      const ring = this.scene.add.graphics().setDepth(7);
      ring.fillStyle(C.hullDeep);
      ring.fillEllipse(nz.x, nz.y, W, H);
      ring.lineStyle(2, C.exhaustOuter, 0.85);
      ring.strokeEllipse(nz.x, nz.y, W, H);
      ring.lineStyle(1, C.hullBevel, 0.4);
      ring.strokeEllipse(nz.x, nz.y, W * 0.7, H * 0.7);

      // Animated inner glow
      const glow = this.scene.add.graphics().setDepth(7);
      glow.fillStyle(C.exhaustInner, 0.45);
      glow.fillEllipse(nz.x, nz.y, W * 0.55, H * 0.55);

      this.scene.tweens.add({
        targets:  glow,
        scaleY:   { from: 1, to: 1.25 },
        alpha:    { from: 0.9, to: 0.4 },
        duration: 350 + Math.random() * 250,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });

      // Particle exhaust stream
      const emitter = this.scene.add.particles(nz.x, nz.y + H * 0.4, 'glow_particle', {
        speed:     { min: 25, max: 80 },
        angle:     { min: 82, max: 98 },
        scale:     { start: nz.size * 0.5, end: 0 },
        alpha:     { start: 0.7, end: 0 },
        lifespan:  { min: 400, max: 700 },
        frequency: 40,
        tint:      [0x5588ff, 0x3366dd, 0x88aaff, 0xaabbff],
        quantity:  1,
      });
      emitter.setDepth(8);
    }

    // Nacelle micro-thrusters (small blue glow at rear of nacelles)
    for (const nx of [3 * S, 33 * S]) {
      const glow = this.scene.add.graphics().setDepth(6);
      glow.fillStyle(0x4466cc, 0.35);
      glow.fillEllipse(nx, 22 * S, 2 * S, 10);

      this.scene.tweens.add({
        targets:  glow,
        alpha:    { from: 0.7, to: 0.2 },
        scaleX:   { from: 1, to: 0.8 },
        duration: 600 + Math.random() * 300,
        yoyo:     true,
        repeat:   -1,
        ease:     'Sine.easeInOut',
      });
    }
  }
}
