# Agent Space — Developer Guide

## Architecture

```
Claude Code session
  │
  ├─ PreToolUse / PostToolUse / Notification / Stop hooks
  │     │
  │     └─ hooks/agent-hook.js  (Node.js, no deps)
  │           │  POST /agent-event
  │           ▼
  │      packages/server  (Express + ws)
  │           │  WebSocket broadcast
  │           ▼
  │      packages/client  (Vite + Phaser 3)
  │           │
  │           └─ GameScene → AgentSprite (per agent)
  │                └─ HUD (vanilla DOM panel)
  │
  └─ GET /agents  ←  HUD state_sync on WS connect
```

Data flows:
1. Claude Code fires a hook → `agent-hook.js` maps it to an `AgentStatus`
2. Hook POSTs `AgentEvent` to `POST /agent-event`
3. Server updates its in-memory `Map<agentId, AgentState>` and broadcasts a WS message
4. Phaser client receives the WS message and moves/animates the corresponding `AgentSprite`
5. The DOM HUD updates its agent list

---

## How to add a new agent type

New visual variants are driven by the `AgentStatus` → sprite frame mapping.

1. **Add a new status** (if needed) in `shared/types.ts`:
   ```ts
   export type AgentStatus = 'spawned' | 'working' | ... | 'my_new_status';
   ```

2. **Add a zone mapping** in `shared/types.ts` `STATUS_TO_ZONE`.

3. **Add a sprite frame** in `packages/client/src/game/TextureFactory.ts`:
   - Increment `FRAMES` and add a new drawing block at index `FRAMES - 1`
   - Register the frame name: `tex.add('my_anim', 0, index * W, 0, W, H)`

4. **Wire the animation** in `AgentSprite.ts` → `idleAnimForState()` switch.

---

## How to extend the map

The map is generated programmatically in `packages/client/src/game/mapData.ts`.
No external Tiled file is required for the default map.

To use a **real Tiled tilemap**:

1. Create your map in [Tiled](https://www.mapeditor.org/) (JSON export, 32×32 tiles).
2. Place the exported `ship.json` in `assets/maps/` and your tileset PNG in `assets/tiles/`.
3. In `GameScene.ts`, replace the `buildTileGrid()` / `drawMap()` calls with:
   ```ts
   this.load.tilemapTiledJSON('map', '/assets/maps/ship.json');
   this.load.image('tiles', '/assets/tiles/ship.png');
   // ...
   const map = this.make.tilemap({ key: 'map' });
   const tileset = map.addTilesetImage('ship', 'tiles');
   map.createLayer('Floor', tileset!, 0, 0);
   ```
4. Update `ZONES` in `mapData.ts` to match your new tile coordinates.

To add a **new zone** without Tiled:
- Add the zone to `AgentZone` type in `shared/types.ts`
- Add a rect to `ZONES` in `mapData.ts`
- Add `fillZone(grid, 'my_zone', TILE.FLOOR_BRIDGE)` in `buildTileGrid()`
- Map statuses to the new zone in `STATUS_TO_ZONE`

---

## How to add new social dialogue phrases

Open `packages/client/src/config.ts` and extend the arrays:

```ts
export const DIALOGUE_POOL = [
  // existing phrases...
  'my new phrase',
];

export const ARRIVAL_POOL = [
  // existing...
  'welcome!',
];
```

Changes take effect immediately on next `pnpm dev` (Vite HMR).

---

## How to register the hooks

See [`hooks/hooks-config.md`](hooks/hooks-config.md) for step-by-step instructions.

---

## Development commands

```bash
# Install all dependencies
pnpm install

# Start both server and client (hot-reload)
pnpm dev

# Build for production
pnpm build

# Start production server only
pnpm start

# Simulate an event without hooks (use the HUD form at http://localhost:5173)
# Or via curl:
curl -X POST http://localhost:3000/agent-event \
  -H 'Content-Type: application/json' \
  -d '{"agentId":"test-1","name":"test-agent","status":"working","task":"running tests","timestamp":0}'

# List current agents
curl http://localhost:3000/agents

# Remove an agent
curl -X DELETE http://localhost:3000/agents/test-1
```

---

## Configuration files

| File | Purpose |
|------|---------|
| `packages/server/src/config.js` | Server port, CORS origin, max agents, WS heartbeat |
| `packages/client/src/config.ts` | Server/WS URLs, tile size, agent speed, dialogue timings |
| `shared/types.ts` | Canonical type definitions shared by both packages |
