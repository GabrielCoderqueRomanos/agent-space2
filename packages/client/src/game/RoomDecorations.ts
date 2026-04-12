/**
 * RoomDecorations
 * ─────────────────────────────────────────────────────────────────────────────
 * Draws detailed static furniture, equipment, and structural elements for every
 * room. Rendered at depth 4 (above tilemap walls depth 3, below agents depth 5).
 *
 * Each room has:
 *   Bridge      — viewscreen, crew stations, command throne, holotable, consoles
 *   Engine Room — central reactor core, power nodes, pipe conduits, coolant tanks
 *   Hangar      — docked fighter, cargo, crane rail, fuel station, tool racks
 *   Alert Bay   — emergency lockers, med-pods, weapons rack, blast doors
 */

import Phaser from 'phaser';
import { ZONES } from './mapData';

const S = 32; // tile size px

// ── Shared palette ────────────────────────────────────────────────────────────
const P = {
  // Structural
  metal:    0x1a2840,
  metalMid: 0x243858,
  metalBrt: 0x2e4870,
  metalHlt: 0x3a5e8a,
  dark:     0x080e1c,
  darker:   0x040810,

  // Zone accents
  blue:     0x2266cc,
  blueDim:  0x0f3366,
  blueBrt:  0x44aaff,
  blueGlow: 0x88ccff,

  orange:   0xcc5500,
  orangeDim:0x662200,
  orangeBrt:0xff8833,
  orangeGlw:0xffaa66,

  green:    0x00aa66,
  greenDim: 0x003322,
  greenBrt: 0x00ff99,
  greenGlw: 0x88ffcc,

  red:      0xcc1122,
  redDim:   0x550008,
  redBrt:   0xff3344,
  redGlow:  0xff8899,

  // Screens / displays
  screenOff:  0x040c14,
  screenOn:   0x061824,
  screenBrt:  0x0a2840,

  // Glass / transparent
  glass:    0x44aaff,
  glassDim: 0x1a3a66,
};

export class RoomDecorations {
  constructor(scene: Phaser.Scene) {
    this.decorateBridge(scene);
    this.decorateEngineRoom(scene);
    this.decorateHangar(scene);
    this.decorateAlertBay(scene);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BRIDGE  (interior 18×6 tiles)
  // ═══════════════════════════════════════════════════════════════════════

  private decorateBridge(scene: Phaser.Scene) {
    const z  = ZONES.bridge;
    const g  = scene.add.graphics().setDepth(4);
    const g2 = scene.add.graphics().setDepth(5); // above-agent elements

    // Derived coordinates (inside walls)
    const ix = (z.x + 1) * S, iy = (z.y + 1) * S;
    const iw = (z.w - 2) * S, ih = (z.h - 2) * S;
    const cx = z.x * S + z.w * S / 2;

    // ── MAIN VIEWSCREEN (spans full top wall) ────────────────────────
    const vsX = ix, vsY = iy - 4, vsW = iw, vsH = S + 8;

    // Screen housing (dark surround with bevel)
    g.fillStyle(P.dark);
    g.fillRect(vsX - 4, vsY - 4, vsW + 8, vsH + 8);
    g.fillStyle(P.metal);
    g.fillRect(vsX - 2, vsY - 2, vsW + 4, vsH + 4);

    // Screen display
    g.fillStyle(P.screenOn);
    g.fillRect(vsX, vsY, vsW, vsH);

    // Screen content — star map grid lines
    g.lineStyle(1, P.blueDim, 0.5);
    for (let x = vsX + 16; x < vsX + vsW; x += 24) {
      g.lineBetween(x, vsY + 2, x, vsY + vsH - 2);
    }
    for (let y = vsY + 8; y < vsY + vsH; y += 12) {
      g.lineBetween(vsX + 2, y, vsX + vsW - 2, y);
    }
    // Central tactical reticle
    g.lineStyle(1, P.blueBrt, 0.6);
    g.strokeCircle(cx, vsY + vsH / 2, 10);
    g.lineBetween(cx - 14, vsY + vsH / 2, cx + 14, vsY + vsH / 2);
    g.lineBetween(cx, vsY + vsH / 2 - 14, cx, vsY + vsH / 2 + 14);
    // Side data readouts
    g.lineStyle(1, P.blueDim, 0.8);
    for (let i = 0; i < 5; i++) {
      const bw = 20 + Math.sin(i * 1.3) * 15;
      g.fillStyle(P.blueDim, 0.6);
      g.fillRect(vsX + 6, vsY + 6 + i * 7, bw, 4);
      g.fillRect(vsX + vsW - 6 - bw, vsY + 6 + i * 7, bw, 4);
    }
    // Screen edge glow
    g2.lineStyle(3, P.blue, 0.1);
    g2.strokeRect(vsX, vsY, vsW, vsH);
    g2.lineStyle(1, P.blueBrt, 0.5);
    g2.strokeRect(vsX, vsY, vsW, vsH);
    // Corner brackets
    for (const [bx, by] of [[vsX, vsY], [vsX + vsW, vsY], [vsX, vsY + vsH], [vsX + vsW, vsY + vsH]] as [number, number][]) {
      const dx = bx === vsX ? 1 : -1, dy = by === vsY ? 1 : -1;
      g2.lineStyle(2, P.blueGlow, 0.9);
      g2.lineBetween(bx, by, bx + dx * 10, by);
      g2.lineBetween(bx, by, bx, by + dy * 10);
    }

    // ── CREW STATIONS — forward row (5 stations) ─────────────────────
    const stY = iy + S + 4;
    const stPositions = [0.12, 0.28, 0.5, 0.72, 0.88].map(t => ix + t * iw);
    const stColors = [P.blue, P.green, P.blueBrt, P.orange, P.blue];

    for (let i = 0; i < 5; i++) {
      const sx = stPositions[i] - 22, sy = stY;
      this.drawConsole(g, g2, sx, sy, 44, 20, stColors[i]);
    }

    // ── COMMAND THRONE (center, row 3 from top) ───────────────────────
    const thrX = cx, thrY = iy + S * 2.5;

    // Throne base ring
    g.fillStyle(P.metalMid);
    g.fillCircle(thrX, thrY + 8, S * 0.75);
    g.fillStyle(P.darker);
    g.fillCircle(thrX, thrY + 8, S * 0.55);

    // Chair body
    g.fillStyle(P.metal);
    g.fillRect(thrX - 14, thrY - 4, 28, 22);
    g.fillRect(thrX - 16, thrY - 20, 32, 18); // back
    g.fillStyle(P.metalHlt);
    g.fillRect(thrX - 14, thrY - 20, 28, 3);  // top highlight

    // Armrests
    g.fillStyle(P.metalBrt);
    g.fillRect(thrX - 20, thrY - 2, 6, 16);
    g.fillRect(thrX + 14, thrY - 2, 6, 16);

    // Armrest control panels
    g.fillStyle(P.screenOn);
    g.fillRect(thrX - 19, thrY, 4, 8);
    g.fillRect(thrX + 15, thrY, 4, 8);
    for (let j = 0; j < 3; j++) {
      g.fillStyle([P.blueBrt, P.green, P.orange][j], 0.9);
      g.fillRect(thrX - 18, thrY + 1 + j * 3, 2, 2);
      g.fillRect(thrX + 16, thrY + 1 + j * 3, 2, 2);
    }

    // Throne glow ring
    g2.lineStyle(4, P.blue, 0.08);
    g2.strokeCircle(thrX, thrY + 8, S * 0.75);
    g2.lineStyle(1, P.blueBrt, 0.4);
    g2.strokeCircle(thrX, thrY + 8, S * 0.75);

    // ── HOLOGRAPHIC TABLE (center-rear) ──────────────────────────────
    const htX = cx, htY = iy + ih - S * 1.4;

    g.fillStyle(P.metalMid);
    g.fillRect(htX - 36, htY - 4, 72, 28);
    g.fillStyle(P.metalBrt);
    g.fillRect(htX - 36, htY - 4, 72, 3);   // top edge highlight
    g.fillStyle(P.screenBrt);
    g.fillRect(htX - 34, htY - 1, 68, 22);  // holographic surface

    // Hologram grid on surface
    g.lineStyle(1, P.blue, 0.3);
    for (let x = htX - 30; x < htX + 34; x += 10) g.lineBetween(x, htY - 1, x, htY + 21);
    for (let y = htY + 3; y < htY + 21; y += 8) g.lineBetween(htX - 34, y, htX + 34, y);
    // Table legs
    g.fillStyle(P.metal);
    for (const lx of [htX - 30, htX + 30]) {
      g.fillRect(lx - 3, htY + 24, 6, 10);
    }
    // Glow
    g2.lineStyle(3, P.blue, 0.08);
    g2.strokeRect(htX - 34, htY - 1, 68, 22);
    g2.lineStyle(1, P.blueBrt, 0.35);
    g2.strokeRect(htX - 34, htY - 1, 68, 22);

    // ── SIDE REAR STATIONS (communications & ops) ─────────────────────
    const rearY = iy + ih - S * 0.9;
    for (const [rx, flip] of [[ix + S * 0.6, false], [ix + iw - S * 0.6 - 48, true]] as [number, boolean][]) {
      this.drawConsole(g, g2, rx, rearY, 48, 22, flip ? P.orange : P.green);
    }

    // ── FLOOR ACCENT — command ring ───────────────────────────────────
    g.lineStyle(2, P.blueDim, 0.5);
    g.strokeCircle(cx, iy + ih / 2, S * 2.2);
    g.lineStyle(1, P.blue, 0.3);
    g.strokeCircle(cx, iy + ih / 2, S * 2.2);

    // Floor directional chevrons toward throne
    g.fillStyle(P.blueDim, 0.5);
    for (let i = 0; i < 3; i++) {
      const fy = iy + S * 1.8 + i * 10;
      g.fillTriangle(cx - 6, fy, cx + 6, fy, cx, fy + 7);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ENGINE ROOM  (interior 9×7 tiles)
  // ═══════════════════════════════════════════════════════════════════════

  private decorateEngineRoom(scene: Phaser.Scene) {
    const z  = ZONES.engine_room;
    const g  = scene.add.graphics().setDepth(4);
    const g2 = scene.add.graphics().setDepth(5);

    const ix = (z.x + 1) * S, iy = (z.y + 1) * S;
    const iw = (z.w - 2) * S, ih = (z.h - 2) * S;
    const cx = z.x * S + z.w * S / 2;
    const cy = z.y * S + z.h * S / 2;

    // ── MAIN REACTOR CORE (center, 3×3 tile structure) ───────────────
    const rcR = S * 1.35; // outer radius

    // Containment housing (octagonal shadow)
    g.fillStyle(P.darker);
    g.fillCircle(cx, cy, rcR + 8);

    // Outer containment ring
    g.fillStyle(P.metalMid);
    g.fillCircle(cx, cy, rcR);
    g.fillStyle(P.dark);
    g.fillCircle(cx, cy, rcR - 6);

    // Ring segments — 8 structural bolts
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2;
      const bx = cx + Math.cos(angle) * (rcR - 3);
      const by = cy + Math.sin(angle) * (rcR - 3);
      g.fillStyle(P.metalBrt);
      g.fillCircle(bx, by, 4);
      g.fillStyle(P.dark);
      g.fillCircle(bx, by, 2);
    }

    // Middle ring (energy transfer ring)
    g.lineStyle(4, P.orangeDim, 0.9);
    g.strokeCircle(cx, cy, rcR * 0.7);
    g.lineStyle(2, P.orange, 0.6);
    g.strokeCircle(cx, cy, rcR * 0.7);

    // Inner core
    g.fillStyle(0x1a0800);
    g.fillCircle(cx, cy, rcR * 0.45);
    g.fillStyle(P.orangeDim);
    g.fillCircle(cx, cy, rcR * 0.30);
    g.fillStyle(P.orange, 0.5);
    g.fillCircle(cx, cy, rcR * 0.18);

    // Core glow
    g2.fillStyle(P.orangeGlw, 0.1);
    g2.fillCircle(cx, cy, rcR * 0.55);
    g2.lineStyle(4, P.orange, 0.06);
    g2.strokeCircle(cx, cy, rcR * 0.45);
    g2.lineStyle(1, P.orangeBrt, 0.4);
    g2.strokeCircle(cx, cy, rcR * 0.45);

    // ── POWER NODE CONNECTORS (4 nodes around reactor) ────────────────
    for (const [ndx, ndy] of [
      [cx - S * 2.2, cy], [cx + S * 2.2, cy],
      [cx, cy - S * 2.2], [cx, cy + S * 2.2],
    ] as [number, number][]) {
      // Power cable (line from reactor to node)
      g.lineStyle(3, P.orangeDim, 0.9);
      g.lineBetween(cx + Math.sign(ndx - cx) * rcR * 0.8,
                    cy + Math.sign(ndy - cy) * rcR * 0.8, ndx, ndy);
      g.lineStyle(1, P.orange, 0.5);
      g.lineBetween(cx + Math.sign(ndx - cx) * rcR * 0.8,
                    cy + Math.sign(ndy - cy) * rcR * 0.8, ndx, ndy);
      // Node housing
      g.fillStyle(P.metal);
      g.fillRect(ndx - 8, ndy - 8, 16, 16);
      g.fillStyle(P.orangeDim);
      g.fillRect(ndx - 5, ndy - 5, 10, 10);
      g2.lineStyle(1, P.orangeBrt, 0.7);
      g2.strokeRect(ndx - 8, ndy - 8, 16, 16);
    }

    // ── PIPE CONDUITS (left & right walls, vertical runs) ────────────
    for (const px of [ix + 2, ix + iw - 14]) {
      // Main pipe
      g.fillStyle(P.metal);
      g.fillRect(px, iy, 12, ih);
      g.fillStyle(P.metalMid);
      g.fillRect(px + 2, iy, 4, ih);   // pipe highlight

      // Pipe joints / flanges every 2 tiles
      for (let jy = iy + S; jy < iy + ih; jy += S * 1.5) {
        g.fillStyle(P.metalBrt);
        g.fillRect(px - 2, jy - 4, 16, 8);
        g.lineStyle(1, P.metalHlt, 0.6);
        g.strokeRect(px - 2, jy - 4, 16, 8);
        // Pressure gauge
        g.fillStyle(P.screenOn);
        g.fillCircle(px + 6, jy, 4);
        g.fillStyle(P.orange, 0.8);
        g.fillCircle(px + 6, jy, 2);
      }

      // Pipe glow (hot coolant)
      g2.lineStyle(4, P.orange, 0.04);
      g2.lineBetween(px + 6, iy, px + 6, iy + ih);
      g2.lineStyle(1, P.orange, 0.2);
      g2.lineBetween(px + 6, iy, px + 6, iy + ih);
    }

    // ── ENGINEERING CONSOLES (top wall, 2 stations) ───────────────────
    const ecY = iy + 4;
    this.drawConsole(g, g2, ix + 4, ecY, S * 2, 22, P.orange);
    this.drawConsole(g, g2, ix + iw - S * 2 - 4, ecY, S * 2, 22, P.orange);

    // ── COOLANT TANKS (bottom corners) ───────────────────────────────
    for (const [tx, flip] of [[ix + 4, false], [ix + iw - 28, true]] as [number, boolean][]) {
      const ty = iy + ih - 44;
      // Tank body
      g.fillStyle(P.metal);
      g.fillRect(tx, ty, 24, 40);
      g.fillStyle(P.metalMid);
      g.fillRect(tx + 2, ty + 2, 8, 36); // highlight stripe
      // Tank caps
      g.fillStyle(P.metalBrt);
      g.fillRect(tx - 2, ty - 3, 28, 6);
      g.fillRect(tx - 2, ty + 37, 28, 6);
      // Fill level indicator
      g.fillStyle(P.darker);
      g.fillRect(tx + 14, ty + 6, 6, 28);
      g.fillStyle(P.orangeDim);
      g.fillRect(tx + 14, ty + 6 + 10, 6, 18);  // 65% full
      g.lineStyle(1, P.metalHlt, 0.5);
      g.strokeRect(tx + 14, ty + 6, 6, 28);
      // Valve handle
      g.fillStyle(P.metalHlt);
      g.fillRect(flip ? tx - 6 : tx + 24, ty + 16, 4, 8);
    }

    // ── FLOOR CAUTION MARKING (around reactor) ────────────────────────
    g.lineStyle(2, P.orangeDim, 0.4);
    g.strokeCircle(cx, cy, rcR + 14);
    g.lineStyle(1, P.orange, 0.2);
    g.strokeCircle(cx, cy, rcR + 14);
    // Caution chevrons at 4 compass points
    for (let a = 0; a < 4; a++) {
      const angle = (a / 4) * Math.PI * 2 + Math.PI / 4;
      const mx = cx + Math.cos(angle) * (rcR + 22);
      const my = cy + Math.sin(angle) * (rcR + 22);
      g.fillStyle(P.orangeDim, 0.7);
      g.fillTriangle(mx - 5, my + 5, mx + 5, my + 5, mx, my - 5);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  HANGAR  (interior 9×7 tiles)
  // ═══════════════════════════════════════════════════════════════════════

  private decorateHangar(scene: Phaser.Scene) {
    const z  = ZONES.hangar;
    const g  = scene.add.graphics().setDepth(4);
    const g2 = scene.add.graphics().setDepth(5);

    const ix = (z.x + 1) * S, iy = (z.y + 1) * S;
    const iw = (z.w - 2) * S;
    const cx = z.x * S + z.w * S / 2;
    const cy = z.y * S + z.h * S / 2;

    // ── CRANE RAIL (top wall, full width) ─────────────────────────────
    g.fillStyle(P.metalMid);
    g.fillRect(ix - 2, iy, iw + 4, 8);
    g.fillStyle(P.metalBrt);
    g.fillRect(ix - 2, iy, iw + 4, 2);  // top highlight

    // Rail I-beam detail
    g.fillStyle(P.metal);
    g.fillRect(ix - 2, iy + 3, iw + 4, 2);
    // Rail endcaps
    g.fillStyle(P.metalHlt);
    g.fillRect(ix - 2, iy - 2, 10, 12);
    g.fillRect(ix + iw - 8, iy - 2, 10, 12);

    // ── CARGO CRATES (left wall, 3 stacks) ───────────────────────────
    const crateColors = [P.metal, P.metalMid, P.metalBrt];
    for (let i = 0; i < 3; i++) {
      const ccx = ix + 4, ccy = iy + 4 + i * (S + 6);
      const cw = S - 4 + (i % 2) * 8, ch = S - 8;
      g.fillStyle(crateColors[i]);
      g.fillRect(ccx, ccy, cw, ch);
      // Crate corner reinforcements
      g.fillStyle(P.metalHlt);
      g.fillRect(ccx, ccy, 4, ch); g.fillRect(ccx + cw - 4, ccy, 4, ch);
      g.fillRect(ccx, ccy, cw, 3); g.fillRect(ccx, ccy + ch - 3, cw, 3);
      // Crate label / stencil
      g.fillStyle(P.greenDim, 0.7);
      g.fillRect(ccx + 6, ccy + ch / 2 - 4, cw - 12, 8);
      g.lineStyle(1, P.green, 0.5);
      g.strokeRect(ccx + 6, ccy + ch / 2 - 4, cw - 12, 8);
    }
    // Stacked crate on top of first stack
    g.fillStyle(P.metalMid);
    g.fillRect(ix + 8, iy + 2, S - 12, S / 2 - 2);
    g.fillStyle(P.metalHlt);
    g.fillRect(ix + 8, iy + 2, S - 12, 3);

    // ── FUEL/SERVICE STATION (right wall) ─────────────────────────────
    const fsX = ix + iw - S + 2, fsY = iy + 4;

    // Service terminal
    g.fillStyle(P.metal);
    g.fillRect(fsX, fsY, S - 6, S * 1.5);
    g.fillStyle(P.screenOn);
    g.fillRect(fsX + 4, fsY + 4, S - 14, S * 0.6);
    // Screen display bars
    for (let j = 0; j < 4; j++) {
      g.fillStyle(P.green, 0.7);
      g.fillRect(fsX + 6, fsY + 6 + j * 8, 14 + j * 4, 4);
    }
    g.lineStyle(1, P.green, 0.6);
    g.strokeRect(fsX + 4, fsY + 4, S - 14, S * 0.6);

    // Fuel hose reel
    g.fillStyle(P.metalMid);
    g.fillCircle(fsX + S / 2 - 4, fsY + S * 1.2, 10);
    g.lineStyle(2, P.green, 0.5);
    g.strokeCircle(fsX + S / 2 - 4, fsY + S * 1.2, 10);
    g.lineStyle(1, P.greenBrt, 0.8);
    g.strokeCircle(fsX + S / 2 - 4, fsY + S * 1.2, 5);

    // ── TOOL RACKS (right wall, lower) ────────────────────────────────
    const trY = iy + S * 3;
    g.fillStyle(P.metal);
    g.fillRect(fsX, trY, S - 6, S * 2);
    g.fillStyle(P.metalMid);
    g.fillRect(fsX + 2, trY + 4, S - 10, 2);
    g.fillRect(fsX + 2, trY + S / 2, S - 10, 2);
    g.fillRect(fsX + 2, trY + S, S - 10, 2);
    g.fillRect(fsX + 2, trY + S * 1.5, S - 10, 2);
    // Tools hanging
    for (let t = 0; t < 4; t++) {
      g.fillStyle(P.metalBrt);
      g.fillRect(fsX + 5 + t * 5, trY + 6, 3, 12);
    }

    // ── LANDING PAD FLOOR MARKINGS ─────────────────────────────────────
    g.lineStyle(2, P.greenDim, 0.6);
    g.strokeRect(cx - S * 1.5, cy - S * 1.8, S * 3, S * 3.6);
    // Corner brackets
    for (const [bx, by] of [
      [cx - S * 1.5, cy - S * 1.8], [cx + S * 1.5, cy - S * 1.8],
      [cx - S * 1.5, cy + S * 1.8], [cx + S * 1.5, cy + S * 1.8],
    ] as [number, number][]) {
      const dx = bx < cx ? 1 : -1, dy = by < cy ? 1 : -1;
      g2.lineStyle(2, P.greenBrt, 0.7);
      g2.lineBetween(bx, by, bx + dx * 14, by);
      g2.lineBetween(bx, by, bx, by + dy * 14);
    }
    // Center X
    g.lineStyle(2, P.greenDim, 0.5);
    g.lineBetween(cx - 10, cy - 10, cx + 10, cy + 10);
    g.lineBetween(cx + 10, cy - 10, cx - 10, cy + 10);
    g.lineStyle(1, P.greenBrt, 0.4);
    g.strokeCircle(cx, cy, 12);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ALERT BAY  (interior 18×4 tiles — emergency/medical/armory)
  // ═══════════════════════════════════════════════════════════════════════

  private decorateAlertBay(scene: Phaser.Scene) {
    const z  = ZONES.alert_bay;
    const g  = scene.add.graphics().setDepth(4);
    const g2 = scene.add.graphics().setDepth(5);

    const ix = (z.x + 1) * S, iy = (z.y + 1) * S;
    const iw = (z.w - 2) * S, ih = (z.h - 2) * S;
    const cx = z.x * S + z.w * S / 2;

    // ── EMERGENCY LOCKER BANK (full top wall) ─────────────────────────
    const numLockers = 9;
    const lkW = Math.floor(iw / numLockers);
    const lkH = S - 4;

    for (let i = 0; i < numLockers; i++) {
      const lx = ix + i * lkW, ly = iy + 2;
      // Locker body
      g.fillStyle(P.metal);
      g.fillRect(lx + 1, ly, lkW - 2, lkH);
      // Locker door highlight (bevel)
      g.fillStyle(P.metalBrt);
      g.fillRect(lx + 2, ly + 1, lkW - 4, 2);
      g.fillRect(lx + 2, ly + 1, 2, lkH - 3);
      g.fillStyle(P.dark);
      g.fillRect(lx + lkW - 4, ly + 2, 2, lkH - 3);
      g.fillRect(lx + 2, ly + lkH - 3, lkW - 4, 2);
      // Handle
      g.fillStyle(P.metalHlt);
      g.fillRect(lx + lkW / 2 - 4, ly + lkH / 2 - 2, 8, 4);
      // Status indicator
      const statusColor = i === 3 ? P.redBrt : (i === 7 ? P.orange : P.green);
      g.fillStyle(statusColor, 0.9);
      g.fillRect(lx + lkW / 2 - 2, ly + 4, 4, 4);
      // Locker label (number)
      g2.lineStyle(1, P.red, 0.25);
      g2.strokeRect(lx + 1, ly, lkW - 2, lkH);
    }

    // ── MEDICAL PODS (left section, 2 pods) ───────────────────────────
    if (ih >= S * 2) {
      for (let p = 0; p < 2; p++) {
        const mpX = ix + 4 + p * (S * 2 + 8), mpY = iy + S;
        // Pod outer shell
        g.fillStyle(P.metal);
        g.fillRoundedRect(mpX, mpY, S * 2, S * 1.8, 8);
        // Pod interior (glass)
        g.fillStyle(P.screenOn);
        g.fillRoundedRect(mpX + 4, mpY + 4, S * 2 - 8, S * 1.8 - 8, 5);
        // Medical cross on pod
        g.fillStyle(P.red, 0.8);
        g.fillRect(mpX + S - 4, mpY + 8, 8, 22);
        g.fillRect(mpX + S - 12, mpY + 16, 24, 8);
        // Status light
        g2.fillStyle(p === 0 ? P.green : P.redBrt, 0.9);
        g2.fillCircle(mpX + S * 2 - 8, mpY + 8, 3);
        // Pod edge glow
        g2.lineStyle(2, P.red, 0.08);
        g2.strokeRoundedRect(mpX, mpY, S * 2, S * 1.8, 8);
        g2.lineStyle(1, P.redBrt, 0.3);
        g2.strokeRoundedRect(mpX, mpY, S * 2, S * 1.8, 8);
      }
    }

    // ── WEAPONS RACK (center) ──────────────────────────────────────────
    const wrX = cx - S, wrY = iy + (ih > S ? S : 4);
    const wrW = S * 2, wrH = ih > S ? ih - S - 4 : S - 4;

    g.fillStyle(P.metal);
    g.fillRect(wrX, wrY, wrW, wrH);
    // Rack horizontal dividers
    g.fillStyle(P.metalMid);
    for (let r = 0; r < 3; r++) {
      g.fillRect(wrX + 2, wrY + 4 + r * (wrH / 3), wrW - 4, 3);
    }
    // Weapons (simplified rifle silhouettes)
    g.fillStyle(P.metalBrt);
    for (let r = 0; r < 3; r++) {
      const wy = wrY + 10 + r * (wrH / 3);
      for (let c = 0; c < 3; c++) {
        const wx = wrX + 8 + c * 18;
        g.fillRect(wx, wy, 3, 14);   // stock
        g.fillRect(wx - 3, wy + 5, 10, 3);  // barrel
        g.fillRect(wx - 1, wy + 2, 6, 2);   // sight
      }
    }
    g.lineStyle(1, P.red, 0.4);
    g.strokeRect(wrX, wrY, wrW, wrH);
    // Biometric lock
    g.fillStyle(P.screenOn);
    g.fillRect(wrX + wrW - 14, wrY + wrH / 2 - 8, 10, 16);
    g.fillStyle(P.red, 0.8);
    g.fillRect(wrX + wrW - 12, wrY + wrH / 2 - 4, 6, 4);
    g.fillRect(wrX + wrW - 12, wrY + wrH / 2 + 2, 6, 4);

    // ── EMERGENCY CONTROL PANEL (right section) ────────────────────────
    const ecpX = ix + iw - S * 3 - 4, ecpY = iy + (ih > S ? S : 4);
    const ecpH = ih > S ? ih - S - 4 : S - 4;

    g.fillStyle(P.metal);
    g.fillRect(ecpX, ecpY, S * 3, ecpH);
    // Panel screen
    g.fillStyle(P.screenOn);
    g.fillRect(ecpX + 4, ecpY + 4, S * 3 - 8, ecpH * 0.55);
    // Alert bars on screen
    for (let b = 0; b < 4; b++) {
      g.fillStyle(b < 2 ? P.red : P.orange, 0.7);
      g.fillRect(ecpX + 6, ecpY + 6 + b * 7, S * 3 - 14 - b * 8, 5);
    }
    g.lineStyle(1, P.redBrt, 0.5);
    g.strokeRect(ecpX + 4, ecpY + 4, S * 3 - 8, ecpH * 0.55);

    // Control buttons (lower panel area)
    const btnY = ecpY + ecpH * 0.6;
    const buttons: [number, number][] = [
      [P.red, 0.9], [P.red, 0.9], [P.orange, 0.9],
      [P.green, 0.9], [P.green, 0.9], [0x888888, 0.6],
    ];
    buttons.forEach(([col, alpha], bi) => {
      const bx = ecpX + 6 + (bi % 3) * 22, by = btnY + Math.floor(bi / 3) * 14;
      g.fillStyle(col, alpha);
      g.fillRect(bx, by, 16, 10);
      g.fillStyle(0x000000, 0.3);
      g.fillRect(bx + 1, by + 1, 14, 9);
    });

    // ── FLOOR EMERGENCY MARKINGS ──────────────────────────────────────
    g.lineStyle(2, P.redDim, 0.6);
    g.lineBetween(ix, iy + ih / 2, ix + iw, iy + ih / 2);
    // Arrow chevrons pointing to emergency exits (left and right)
    for (let i = 0; i < 4; i++) {
      const ax = ix + 20 + i * 22;
      g.fillStyle(P.redDim, 0.5);
      g.fillTriangle(ax, iy + ih / 2 - 6, ax + 10, iy + ih / 2, ax, iy + ih / 2 + 6);
    }
    for (let i = 0; i < 4; i++) {
      const ax = ix + iw - 20 - i * 22;
      g.fillStyle(P.redDim, 0.5);
      g.fillTriangle(ax, iy + ih / 2 - 6, ax - 10, iy + ih / 2, ax, iy + ih / 2 + 6);
    }

    // Blast door indicator (bottom wall)
    g.fillStyle(P.redDim, 0.4);
    g.fillRect(cx - 28, iy + ih - 6, 56, 6);
    g.fillStyle(P.redBrt, 0.7);
    g.fillRect(cx - 28, iy + ih - 6, 4, 6);
    g.fillRect(cx + 24, iy + ih - 6, 4, 6);
    g2.lineStyle(1, P.redBrt, 0.5);
    g2.lineBetween(cx - 28, iy + ih - 3, cx + 28, iy + ih - 3);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════════════

  /** Draws a crew console with monitor, keyboard detail, and status LEDs. */
  private drawConsole(
    g: Phaser.GameObjects.Graphics,
    g2: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    accent: number,
  ) {
    // Console body
    g.fillStyle(P.metal);
    g.fillRect(x, y, w, h);
    // Top bevel highlight
    g.fillStyle(P.metalBrt);
    g.fillRect(x, y, w, 2);
    g.fillRect(x, y, 2, h);
    // Monitor screen
    const mw = w - 8, mh = Math.max(6, h - 8);
    g.fillStyle(P.screenOn);
    g.fillRect(x + 4, y + 3, mw, mh);
    // Screen content (data bars)
    g.fillStyle(accent, 0.6);
    for (let i = 0; i < 3; i++) {
      const bw = mw * (0.3 + Math.random() * 0.5);
      g.fillRect(x + 5, y + 4 + i * Math.floor(mh / 3.5), bw, 2);
    }
    // Screen glow
    g2.lineStyle(2, accent, 0.06);
    g2.strokeRect(x + 4, y + 3, mw, mh);
    g2.lineStyle(1, accent, 0.4);
    g2.strokeRect(x + 4, y + 3, mw, mh);
    // Status LED strip
    g.fillStyle(accent, 0.9);
    g.fillRect(x + 4, y + h - 3, 4, 2);
    g.fillStyle(P.green, 0.8);
    g.fillRect(x + 10, y + h - 3, 4, 2);
  }
}
