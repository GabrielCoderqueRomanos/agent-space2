/**
 * TilesetGenerator
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a 512 × 128 px pixel-art tileset (16 cols × 4 rows, 32 × 32 px each)
 * using the browser Canvas API with pixel-by-pixel precision.
 *
 * Every pixel is set explicitly — no browser anti-aliasing, no smooth edges.
 * Phaser's pixelArt:true renderer scales with nearest-neighbour, so these tiles
 * look crisp at any zoom level.
 *
 * Tile index layout
 * ─────────────────
 * Row 0  │  0 void  │ 1–3 bridge  │ 4–6 engine  │ 7–9 hangar  │ 10–12 alert │ 13 corridor │ 14 hull-int │ 15 space
 * Row 1  │ 16 wall-fill │ 17 wall-N │ 18 wall-S │ 19 wall-W │ 20 wall-E
 *        │ 21 wall-NW │ 22 wall-NE │ 23 wall-SW │ 24 wall-SE
 *        │ 25 wall-inNW │ 26 wall-inNE │ 27 wall-inSW │ 28 wall-inSE
 *        │ 29 wall-H │ 30 wall-V │ 31 hull-edge
 * Row 2  │ 32–47  decoration / detail tiles
 * Row 3  │ 48–63  (reserved / empty)
 */

/** Tile index constants — used by ShipTilemap to place tiles. */
export const T = {
  // ── Floor ────────────────────────────────────────────────────────────────
  VOID:       0,
  BRIDGE_A:   1,  BRIDGE_B:   2,  BRIDGE_C:   3,
  ENGINE_A:   4,  ENGINE_B:   5,  ENGINE_C:   6,
  HANGAR_A:   7,  HANGAR_B:   8,  HANGAR_C:   9,
  ALERT_A:   10,  ALERT_B:   11,  ALERT_C:   12,
  CORRIDOR:  13,
  HULL_INT:  14,
  SPACE:     15,

  // ── Walls ────────────────────────────────────────────────────────────────
  WALL_FILL: 16,   // interior wall block (no floor neighbour)
  WALL_N:    17,   // south-facing wall face (floor is to the south)
  WALL_S:    18,   // north-facing wall face
  WALL_W:    19,   // east-facing wall face
  WALL_E:    20,   // west-facing wall face
  WALL_NW:   21,   // outer corner top-left
  WALL_NE:   22,   // outer corner top-right
  WALL_SW:   23,   // outer corner bottom-left
  WALL_SE:   24,   // outer corner bottom-right
  WALL_INW:  25,   // inner corner NW (floor on N and W)
  WALL_INE:  26,   // inner corner NE
  WALL_ISW:  27,   // inner corner SW
  WALL_ISE:  28,   // inner corner SE
  WALL_H:    29,   // thin horizontal wall (corridor divider)
  WALL_V:    30,   // thin vertical wall
  HULL_EDGE: 31,
} as const;

export const TILESET_KEY  = 'ship_tileset';
export const TILESET_COLS = 16;
export const TILE_SIZE    = 32;

export class TilesetGenerator {
  static generate(scene: Phaser.Scene): void {
    const W = TILESET_COLS * TILE_SIZE;   // 512
    const H = 4 * TILE_SIZE;             // 128

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Fill entire sheet with void-black first
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, W, H);

    const g = new PixelCanvas(ctx, W);

    // ── Row 0 — Floor tiles ────────────────────────────────────────────────
    g.tile(T.VOID,      (p) => TilesetGenerator.tileVoid(p));
    g.tile(T.BRIDGE_A,  (p) => TilesetGenerator.tileBridgeA(p));
    g.tile(T.BRIDGE_B,  (p) => TilesetGenerator.tileBridgeB(p));
    g.tile(T.BRIDGE_C,  (p) => TilesetGenerator.tileBridgeC(p));
    g.tile(T.ENGINE_A,  (p) => TilesetGenerator.tileEngineA(p));
    g.tile(T.ENGINE_B,  (p) => TilesetGenerator.tileEngineB(p));
    g.tile(T.ENGINE_C,  (p) => TilesetGenerator.tileEngineC(p));
    g.tile(T.HANGAR_A,  (p) => TilesetGenerator.tileHangarA(p));
    g.tile(T.HANGAR_B,  (p) => TilesetGenerator.tileHangarB(p));
    g.tile(T.HANGAR_C,  (p) => TilesetGenerator.tileHangarC(p));
    g.tile(T.ALERT_A,   (p) => TilesetGenerator.tileAlertA(p));
    g.tile(T.ALERT_B,   (p) => TilesetGenerator.tileAlertB(p));
    g.tile(T.ALERT_C,   (p) => TilesetGenerator.tileAlertC(p));
    g.tile(T.CORRIDOR,  (p) => TilesetGenerator.tileCorridor(p));
    g.tile(T.HULL_INT,  (p) => TilesetGenerator.tileHullInterior(p));
    g.tile(T.SPACE,     (p) => TilesetGenerator.tileSpace(p));

    // ── Row 1 — Wall tiles ─────────────────────────────────────────────────
    g.tile(T.WALL_FILL, (p) => TilesetGenerator.tileWallFill(p));
    g.tile(T.WALL_N,    (p) => TilesetGenerator.tileWallN(p));
    g.tile(T.WALL_S,    (p) => TilesetGenerator.tileWallS(p));
    g.tile(T.WALL_W,    (p) => TilesetGenerator.tileWallW(p));
    g.tile(T.WALL_E,    (p) => TilesetGenerator.tileWallE(p));
    g.tile(T.WALL_NW,   (p) => TilesetGenerator.tileWallNW(p));
    g.tile(T.WALL_NE,   (p) => TilesetGenerator.tileWallNE(p));
    g.tile(T.WALL_SW,   (p) => TilesetGenerator.tileWallSW(p));
    g.tile(T.WALL_SE,   (p) => TilesetGenerator.tileWallSE(p));
    g.tile(T.WALL_INW,  (p) => TilesetGenerator.tileWallInnerNW(p));
    g.tile(T.WALL_INE,  (p) => TilesetGenerator.tileWallInnerNE(p));
    g.tile(T.WALL_ISW,  (p) => TilesetGenerator.tileWallInnerSW(p));
    g.tile(T.WALL_ISE,  (p) => TilesetGenerator.tileWallInnerSE(p));
    g.tile(T.WALL_H,    (p) => TilesetGenerator.tileWallH(p));
    g.tile(T.WALL_V,    (p) => TilesetGenerator.tileWallV(p));
    g.tile(T.HULL_EDGE, (p) => TilesetGenerator.tileHullEdge(p));

    // Register with Phaser
    scene.textures.addCanvas(TILESET_KEY, canvas);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  FLOOR TILES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Deep space — near-black with a single distant pixel */
  private static tileVoid(p: TilePainter) {
    p.fill(2, 4, 8);
    // One dim star
    p.set(11, 17, 30, 35, 55);
    p.set(25, 6,  20, 28, 44);
  }

  /** Open space between hull and map edge */
  private static tileSpace(p: TilePainter) {
    p.fill(2, 3, 6);
    p.set(7,  22, 12, 18, 32);
    p.set(19, 11, 8,  12, 22);
    p.set(28, 27, 15, 22, 38);
  }

  /** Hull interior fill (structural hull between zones) */
  private static tileHullInterior(p: TilePainter) {
    p.fill(8, 12, 20);
    // Panel seam lines
    for (let x = 0; x < 32; x++) {
      if (x % 8 === 0) p.set(x, 15, 12, 18, 30);
      if (x % 8 === 0) p.set(x, 16, 5, 8, 14);
    }
    for (let y = 0; y < 32; y++) {
      if (y % 8 === 0) p.set(15, y, 12, 18, 30);
      if (y % 8 === 0) p.set(16, y, 5, 8, 14);
    }
    // Bevel edges
    for (let i = 0; i < 32; i++) {
      p.set(i,  0, 14, 20, 34);   // top highlight
      p.set(i, 31, 4,  6, 11);    // bottom shadow
      p.set(0,  i, 14, 20, 34);   // left highlight
      p.set(31, i, 4,  6, 11);    // right shadow
    }
  }

  // ── Bridge floor (dark blue sci-fi circuit board) ─────────────────────────

  private static tileBridgeA(p: TilePainter) {
    // Base: #071830
    p.fill(7, 24, 48);
    TilesetGenerator.floorBevel(p, 13, 42, 80,  4, 14, 30);

    // Horizontal circuit traces
    for (const ty of [7, 15, 23]) {
      for (let x = 3; x < 29; x++) {
        if ((x + ty) % 5 !== 0) p.set(x, ty, 13, 42, 80);
      }
    }
    // Vertical trace segments
    for (const tx of [9, 21]) {
      for (let y = 7; y <= 15; y++) p.set(tx, y, 13, 42, 80);
    }
    // Connection nodes (bright cyan)
    p.rect(9,  7,  2, 2, 34, 170, 255);
    p.rect(21, 15, 2, 2, 34, 170, 255);
    p.rect(14, 23, 2, 2, 20, 120, 200);
  }

  private static tileBridgeB(p: TilePainter) {
    // Same base but different trace layout
    p.fill(7, 24, 48);
    TilesetGenerator.floorBevel(p, 13, 42, 80, 4, 14, 30);

    // Vertical traces
    for (const tx of [6, 16, 26]) {
      for (let y = 4; y < 28; y++) {
        if ((y + tx) % 4 !== 0) p.set(tx, y, 13, 42, 80);
      }
    }
    // Horizontal connectors
    for (let x = 6; x <= 16; x++) p.set(x, 12, 13, 42, 80);
    for (let x = 16; x <= 26; x++) p.set(x, 20, 13, 42, 80);
    // Nodes
    p.rect(15, 11, 2, 2, 34, 170, 255);
    p.rect(15, 19, 2, 2, 34, 170, 255);
    // Inner panel border
    for (let i = 4; i < 28; i++) {
      p.set(4,  i, 10, 32, 64);
      p.set(27, i, 10, 32, 64);
    }
    for (let i = 4; i < 28; i++) {
      p.set(i, 4,  10, 32, 64);
      p.set(i, 27, 10, 32, 64);
    }
  }

  private static tileBridgeC(p: TilePainter) {
    // Vent grate variant
    p.fill(6, 20, 40);
    TilesetGenerator.floorBevel(p, 12, 36, 72, 3, 10, 22);

    // Grate grid (recessed slots)
    for (let gy = 4; gy < 28; gy += 4) {
      for (let gx = 4; gx < 28; gx += 4) {
        // Slot shadow (bottom-right of each cell)
        p.set(gx + 2, gy,     3, 10, 22);
        p.set(gx + 3, gy,     3, 10, 22);
        p.set(gx,     gy + 2, 3, 10, 22);
        p.set(gx,     gy + 3, 3, 10, 22);
        // Slot highlight (top-left)
        p.set(gx,     gy,     14, 44, 88);
        p.set(gx + 1, gy,     14, 44, 88);
        p.set(gx,     gy + 1, 14, 44, 88);
      }
    }
    // Accent lines at edges
    for (let i = 2; i < 30; i++) {
      p.set(i, 2,  10, 32, 64);
      p.set(i, 29, 10, 32, 64);
    }
  }

  // ── Engine room floor (dark amber, heat-scarred metal) ────────────────────

  private static tileEngineA(p: TilePainter) {
    p.fill(28, 12, 0);
    TilesetGenerator.floorBevel(p, 50, 22, 0, 14, 6, 0);

    // Horizontal heat vent dashes
    for (const vy of [5, 11, 17, 23]) {
      for (let x = 2; x < 30; x += 3) {
        p.set(x,     vy, 60, 26, 0);
        p.set(x + 1, vy, 60, 26, 0);
      }
    }
    // Heat glow dots (random-ish positions)
    const hotSpots = [[8, 8], [22, 14], [14, 20], [6, 26], [24, 4]];
    for (const [hx, hy] of hotSpots) {
      p.set(hx, hy,     120, 50, 0);
      p.set(hx + 1, hy, 80,  34, 0);
    }
  }

  private static tileEngineB(p: TilePainter) {
    // Vertical vent slots
    p.fill(26, 10, 0);
    TilesetGenerator.floorBevel(p, 48, 20, 0, 12, 4, 0);

    for (const vx of [6, 13, 20, 27]) {
      for (let y = 3; y < 29; y++) {
        const shade = (y % 4 === 0) ? 14 : (y % 4 === 3) ? 60 : 40;
        p.set(vx,     y, shade, shade / 3, 0);
        p.set(vx + 1, y, shade, shade / 3, 0);
      }
    }
    // Cross braces
    for (let x = 3; x < 29; x++) {
      p.set(x, 15, 50, 22, 0);
      p.set(x, 16, 36, 16, 0);
    }
  }

  private static tileEngineC(p: TilePainter) {
    // Worn/scratched with heat spots
    p.fill(24, 10, 0);
    TilesetGenerator.floorBevel(p, 44, 18, 0, 10, 4, 0);

    // Wear scratch marks (diagonal)
    const scratches = [[3,3,10,10],[8,5,15,12],[20,8,28,16],[5,18,14,26],[22,19,30,28]];
    for (const [x1,y1,x2,y2] of scratches) {
      const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
      for (let i = 0; i <= steps; i++) {
        const sx = Math.round(x1 + (x2-x1)*i/steps);
        const sy = Math.round(y1 + (y2-y1)*i/steps);
        p.set(sx, sy, 50, 22, 0);
      }
    }
    // Heat glow cluster (centre-left)
    p.rect(10, 12, 4, 4, 90, 38, 0);
    p.rect(11, 13, 2, 2, 140, 60, 0);
    p.set(12, 14, 180, 80, 0);
  }

  // ── Hangar floor (dark teal, industrial guide lines) ─────────────────────

  private static tileHangarA(p: TilePainter) {
    p.fill(1, 24, 16);
    TilesetGenerator.floorBevel(p, 4, 42, 28, 0, 12, 8);

    // Subtle grid
    for (let i = 0; i < 32; i += 8) {
      for (let j = 0; j < 32; j++) {
        p.set(j, i, 2, 28, 18);
        p.set(i, j, 2, 28, 18);
      }
    }
    // Floor texture noise
    const noise = [3,11,19,27,5,13,21,29,7,15,23,1,9,17,25];
    for (let i = 0; i < noise.length; i++) {
      p.set(noise[i], (noise[(i+3)%noise.length] * 2 + i) % 30, 2, 30, 20);
    }
  }

  private static tileHangarB(p: TilePainter) {
    // Guide stripe tile (centre stripe)
    p.fill(1, 22, 14);
    TilesetGenerator.floorBevel(p, 3, 38, 25, 0, 11, 7);

    // Centre bright stripe
    for (let y = 0; y < 32; y++) {
      p.set(15, y, 0, 160, 100);
      p.set(16, y, 0, 140, 88);
      p.set(14, y, 0, 60, 40);
      p.set(17, y, 0, 60, 40);
    }
    // Arrow markers every 8px
    for (const ay of [4, 12, 20, 28]) {
      p.set(15, ay, 0, 200, 128);
      p.set(16, ay, 0, 200, 128);
    }
  }

  private static tileHangarC(p: TilePainter) {
    // Landing pad cross
    p.fill(1, 20, 13);
    TilesetGenerator.floorBevel(p, 3, 36, 24, 0, 10, 6);

    // Outer box
    for (let i = 4; i < 28; i++) {
      p.set(i,  4, 0, 100, 65);   p.set(i, 27, 0, 100, 65);
      p.set(4,  i, 0, 100, 65);   p.set(27, i, 0, 100, 65);
    }
    // Inner cross
    for (let i = 10; i < 22; i++) {
      p.set(i, 15, 0, 160, 104);  p.set(i, 16, 0, 140, 90);
      p.set(15, i, 0, 160, 104);  p.set(16, i, 0, 140, 90);
    }
    // Corner brackets
    for (const [bx, by] of [[4,4],[27,4],[4,27],[27,27]]) {
      p.rect(bx - 1, by - 1, 4, 4, 0, 200, 128);
    }
  }

  // ── Alert Bay floor (dark crimson, warning markings) ─────────────────────

  private static tileAlertA(p: TilePainter) {
    p.fill(28, 0, 8);
    TilesetGenerator.floorBevel(p, 50, 0, 14, 14, 0, 4);

    // Subtle hex-ish pattern
    for (let y = 0; y < 32; y += 6) {
      for (let x = 0; x < 32; x += 6) {
        const ox = (Math.floor(y / 6) % 2) * 3;
        p.set((x + ox) % 32, y, 40, 0, 12);
      }
    }
  }

  private static tileAlertB(p: TilePainter) {
    // Diagonal warning stripe (left-leaning)
    p.fill(26, 0, 7);
    TilesetGenerator.floorBevel(p, 46, 0, 12, 12, 0, 3);

    for (let d = -4; d < 36; d += 8) {
      for (let i = 0; i < 32; i++) {
        const x = d + i;
        if (x >= 0 && x < 32) {
          p.set(x, i,     100, 0, 28);
          if (x + 1 < 32) p.set(x + 1, i, 80, 0, 22);
        }
      }
    }
    // Warning amber strip at bottom
    for (let x = 0; x < 32; x++) {
      p.set(x, 30, 140, 80, 0);
      p.set(x, 31, 100, 60, 0);
    }
  }

  private static tileAlertC(p: TilePainter) {
    // Diagonal stripe (right-leaning) — alternates with B
    p.fill(26, 0, 7);
    TilesetGenerator.floorBevel(p, 46, 0, 12, 12, 0, 3);

    for (let d = -4; d < 36; d += 8) {
      for (let i = 0; i < 32; i++) {
        const x = d + (31 - i);
        if (x >= 0 && x < 32) {
          p.set(x, i,     100, 0, 28);
          if (x - 1 >= 0) p.set(x - 1, i, 80, 0, 22);
        }
      }
    }
    for (let x = 0; x < 32; x++) {
      p.set(x, 30, 140, 80, 0);
      p.set(x, 31, 100, 60, 0);
    }
  }

  // ── Corridor (very dark with glowing centre line) ─────────────────────────

  private static tileCorridor(p: TilePainter) {
    p.fill(8, 12, 22);
    // Subtle grid
    for (let i = 0; i < 32; i += 8) {
      for (let j = 0; j < 32; j++) {
        p.set(j, i, 10, 16, 28);
        p.set(i, j, 10, 16, 28);
      }
    }
    // Glowing centre line (vertical)
    for (let y = 0; y < 32; y++) {
      p.set(15, y, 20, 48, 100);
      p.set(16, y, 26, 64, 130);
      p.set(14, y, 12, 28, 60);
      p.set(17, y, 12, 28, 60);
    }
    // Edge shadows
    for (let y = 0; y < 32; y++) {
      p.set(0,  y, 4,  6, 12);
      p.set(31, y, 4,  6, 12);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  WALL TILES
  //  Light source: top-left. Highlight = NW face. Shadow = SE face.
  //  Wall base colour: #0e1a2e  highlight: #2a4060  shadow: #060c18
  // ═══════════════════════════════════════════════════════════════════════════

  private static tileWallFill(p: TilePainter) {
    // Solid wall block — panel rivets, no floor contact
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
  }

  private static tileWallN(p: TilePainter) {
    // Floor is to the SOUTH — top half is wall face (lighter), bottom is floor edge
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    // Bright top-facing surface (light from above)
    for (let x = 0; x < 32; x++) {
      p.set(x, 28, 32, 56, 88);
      p.set(x, 29, 26, 46, 74);
      p.set(x, 30, 20, 36, 58);
      p.set(x, 31, 14, 26, 46);
    }
    // Shadow underneath the ledge
    for (let x = 0; x < 32; x++) p.set(x, 27, 8, 14, 24);
  }

  private static tileWallS(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    // Dark underside
    for (let x = 0; x < 32; x++) {
      p.set(x, 0, 32, 56, 88);
      p.set(x, 1, 26, 46, 74);
      p.set(x, 2, 20, 36, 58);
      p.set(x, 3, 14, 24, 40);
    }
    for (let x = 0; x < 32; x++) p.set(x, 4, 8, 14, 24);
  }

  private static tileWallW(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let y = 0; y < 32; y++) {
      p.set(29, y, 32, 56, 88);
      p.set(30, y, 26, 46, 74);
      p.set(31, y, 20, 36, 58);
    }
    for (let y = 0; y < 32; y++) p.set(28, y, 8, 14, 24);
  }

  private static tileWallE(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let y = 0; y < 32; y++) {
      p.set(0, y, 32, 56, 88);
      p.set(1, y, 26, 46, 74);
      p.set(2, y, 20, 36, 58);
    }
    for (let y = 0; y < 32; y++) p.set(3, y, 8, 14, 24);
  }

  private static tileWallNW(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    // Corner ledge: bottom and right edges exposed
    for (let x = 0; x < 32; x++) p.set(x, 28, 32, 56, 88);
    for (let y = 0; y < 32; y++) p.set(28, y, 32, 56, 88);
    p.rect(28, 28, 4, 4, 42, 70, 110);
  }

  private static tileWallNE(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let x = 0; x < 32; x++) p.set(x, 28, 32, 56, 88);
    for (let y = 0; y < 32; y++) p.set(3,  y, 32, 56, 88);
    p.rect(0, 28, 4, 4, 42, 70, 110);
  }

  private static tileWallSW(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let x = 0; x < 32; x++) p.set(x, 3, 32, 56, 88);
    for (let y = 0; y < 32; y++) p.set(28, y, 32, 56, 88);
    p.rect(28, 0, 4, 4, 42, 70, 110);
  }

  private static tileWallSE(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let x = 0; x < 32; x++) p.set(x, 3, 32, 56, 88);
    for (let y = 0; y < 32; y++) p.set(3,  y, 32, 56, 88);
    p.rect(0, 0, 4, 4, 42, 70, 110);
  }

  private static tileWallInnerNW(p: TilePainter) {
    // Inner concave corner: floor on N and W, wall fills SE quadrant
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    // Curved inner edge
    for (let i = 0; i < 5; i++) {
      p.set(i, 4, 26, 46, 74);
      p.set(4, i, 26, 46, 74);
    }
  }

  private static tileWallInnerNE(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let i = 27; i < 32; i++) p.set(i, 4, 26, 46, 74);
    for (let i = 0;  i < 5;  i++) p.set(27, i, 26, 46, 74);
  }

  private static tileWallInnerSW(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let i = 0; i < 5;  i++) p.set(i, 27, 26, 46, 74);
    for (let i = 27; i < 32; i++) p.set(4, i, 26, 46, 74);
  }

  private static tileWallInnerSE(p: TilePainter) {
    p.fill(14, 26, 46);
    TilesetGenerator.wallPanel(p);
    for (let i = 27; i < 32; i++) {
      p.set(i, 27, 26, 46, 74);
      p.set(27, i, 26, 46, 74);
    }
  }

  private static tileWallH(p: TilePainter) {
    // Thin horizontal divider wall
    p.fill(14, 26, 46);
    for (let x = 0; x < 32; x++) {
      p.set(x, 14, 42, 70, 110);   // highlight
      p.set(x, 15, 14, 26, 46);
      p.set(x, 16, 14, 26, 46);
      p.set(x, 17, 6,  10, 18);    // shadow
    }
  }

  private static tileWallV(p: TilePainter) {
    p.fill(14, 26, 46);
    for (let y = 0; y < 32; y++) {
      p.set(14, y, 42, 70, 110);
      p.set(15, y, 14, 26, 46);
      p.set(16, y, 14, 26, 46);
      p.set(17, y, 6,  10, 18);
    }
  }

  private static tileHullEdge(p: TilePainter) {
    // Outer hull plate — riveted steel
    p.fill(10, 16, 28);
    for (let i = 0; i < 32; i++) {
      p.set(i,  0, 22, 36, 60);
      p.set(i, 31, 4,  6, 12);
      p.set(0,  i, 22, 36, 60);
      p.set(31, i, 4,  6, 12);
    }
    // Rivet pattern
    for (const [rx, ry] of [[4,4],[28,4],[4,28],[28,28],[16,16]]) {
      p.set(rx, ry,     30, 50, 80);
      p.set(rx+1, ry,   18, 30, 50);
      p.set(rx, ry+1,   8,  14, 24);
    }
    // Panel seam
    for (let i = 0; i < 32; i++) p.set(i, 15, 16, 26, 44);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SHARED HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Standard floor bevel: 1-px edge highlight (NW) and shadow (SE). */
  private static floorBevel(
    p: TilePainter,
    hr: number, hg: number, hb: number,   // highlight colour
    sr: number, sg: number, sb: number,   // shadow colour
  ) {
    for (let i = 0; i < 32; i++) {
      p.set(i,  0, hr, hg, hb);
      p.set(0,  i, hr, hg, hb);
      p.set(i, 31, sr, sg, sb);
      p.set(31, i, sr, sg, sb);
    }
  }

  /** Recessed panel detail inside a wall tile. */
  private static wallPanel(p: TilePainter) {
    // Outer bevel
    for (let i = 0; i < 32; i++) {
      p.set(i,  0, 42, 70, 110);   // top highlight
      p.set(0,  i, 42, 70, 110);   // left highlight
      p.set(i, 31, 6,  10, 18);    // bottom shadow
      p.set(31, i, 6,  10, 18);    // right shadow
    }
    // Inner recessed panel
    for (let i = 5; i < 27; i++) {
      p.set(i,  5, 10, 18, 32);
      p.set(5,  i, 10, 18, 32);
      p.set(i, 26, 20, 34, 54);
      p.set(26, i, 20, 34, 54);
    }
    // Rivet dots at inner panel corners
    for (const [rx, ry] of [[6,6],[25,6],[6,25],[25,25]]) {
      p.set(rx, ry, 50, 80, 120);
      p.set(rx+1, ry, 24, 40, 64);
    }
    // Panel surface texture (subtle horizontal lines)
    for (const ly of [10, 15, 20]) {
      for (let x = 7; x < 25; x++) {
        if (x % 3 !== 0) p.set(x, ly, 16, 28, 48);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PIXEL CANVAS — thin wrapper around Canvas 2D for pixel-level drawing
// ═══════════════════════════════════════════════════════════════════════════════

class PixelCanvas {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D, _sheetWidth: number) {
    this.ctx = ctx;
  }

  /** Execute a drawing function clipped to one tile's pixel space. */
  tile(index: number, fn: (p: TilePainter) => void) {
    const col = index % TILESET_COLS;
    const row = Math.floor(index / TILESET_COLS);
    const ox  = col * TILE_SIZE;
    const oy  = row * TILE_SIZE;
    fn(new TilePainter(this.ctx, ox, oy));
  }
}

/** Draws pixels relative to a tile's top-left corner. */
class TilePainter {
  private ctx: CanvasRenderingContext2D;
  private ox: number;
  private oy: number;

  constructor(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
    this.ctx = ctx;
    this.ox  = ox;
    this.oy  = oy;
  }

  /** Set a single pixel. */
  set(x: number, y: number, r: number, g: number, b: number) {
    if (x < 0 || x >= TILE_SIZE || y < 0 || y >= TILE_SIZE) return;
    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
    this.ctx.fillRect(this.ox + x, this.oy + y, 1, 1);
  }

  /** Fill the entire tile with one colour. */
  fill(r: number, g: number, b: number) {
    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
    this.ctx.fillRect(this.ox, this.oy, TILE_SIZE, TILE_SIZE);
  }

  /** Fill a rectangle within the tile. */
  rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
    this.ctx.fillRect(this.ox + x, this.oy + y, w, h);
  }
}
