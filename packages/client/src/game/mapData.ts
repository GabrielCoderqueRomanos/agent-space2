import type { AgentZone } from '@agent-space/shared';

/** World map size in tiles (the full canvas area incl. surrounding space) */
export const MAP_COLS = 36;
export const MAP_ROWS = 30;

/**
 * Zone rectangles in TILE coordinates (x, y, w, h).
 *
 * Ship layout (nose up):
 *
 *          ╱▔▔▔▔▔▔▔▔▔╲
 *         │   BRIDGE   │       y 3–10  (20 wide, interior 18×6)
 *         ├────────────┤
 *  ╔═══╗  │ ENG │ HAN │ ╔═══╗  y 12–20  (nacelles protrude, interior 9×7 each)
 *  ╚═══╝  ├────────────┤ ╚═══╝
 *         │  ALERT BAY │       y 22–27  (20 wide, interior 18×4)
 *          ╲   ═══    ╱
 *           [ EXHAUST ]        y 28–29
 */
export const ZONES: Record<AgentZone, { x: number; y: number; w: number; h: number }> = {
  bridge:      { x: 8,  y: 3,  w: 20, h: 8  },   // interior 18×6
  engine_room: { x: 6,  y: 12, w: 11, h: 9  },   // interior 9×7
  hangar:      { x: 19, y: 12, w: 11, h: 9  },   // interior 9×7
  alert_bay:   { x: 8,  y: 22, w: 20, h: 6  },   // interior 18×4
};

/** World pixel size (32 px per tile) */
export const WORLD_W = MAP_COLS * 32;
export const WORLD_H = MAP_ROWS * 32;

/** Returns the centre-spawn tile of a zone. */
export function zoneSpawn(zone: AgentZone): { tx: number; ty: number } {
  const z = ZONES[zone];
  return { tx: Math.floor(z.x + z.w / 2), ty: Math.floor(z.y + z.h / 2) };
}

/** Returns a random walkable tile inside a zone (1-tile inset from walls). */
export function randomInZone(zone: AgentZone): { tx: number; ty: number } {
  const z = ZONES[zone];
  return {
    tx: z.x + 1 + Math.floor(Math.random() * Math.max(1, z.w - 2)),
    ty: z.y + 1 + Math.floor(Math.random() * Math.max(1, z.h - 2)),
  };
}
