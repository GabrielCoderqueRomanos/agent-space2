# Agent Space

A local web app that visualises Claude Code agents as pixel-art sprites on a futuristic spaceship map.
Each agent appears, moves between zones, and reacts to other agents based on its current status.

```
BRIDGE       │  ENGINE ROOM
(idle/wait)  │  (working)
─────────────┼─────────────
HANGAR       │  ALERT BAY
(done/rest)  │  (error)
```

## Requirements

- Node.js 18+
- pnpm 8+

## Installation

```bash
pnpm install
```

## Running

```bash
pnpm dev
```

- **Client:** http://localhost:5173 (opens automatically)
- **Server:** http://localhost:3000

## Registering Claude Code hooks

After `pnpm dev` is running, follow the instructions in [`hooks/hooks-config.md`](hooks/hooks-config.md)
to register `hooks/agent-hook.js` with Claude Code.

Once registered, every tool call Claude makes will spawn/move an agent on the map.

## Simulating events (no hooks needed)

Use the **SIMULATE EVENT** form in the right-side HUD panel, or `curl`:

```bash
curl -X POST http://localhost:3000/agent-event \
  -H 'Content-Type: application/json' \
  -d '{
    "agentId": "agent-1",
    "name": "backend-agent",
    "status": "working",
    "task": "writing tests",
    "timestamp": 0
  }'
```

### Status → Map zone

| Status    | Zone        | Visual          |
|-----------|-------------|-----------------|
| `spawned` | Bridge      | blue idle       |
| `working` | Engine room | orange + sparks |
| `waiting` | Bridge      | purple idle     |
| `done`    | Hangar      | green resting   |
| `error`   | Alert bay   | red flashing    |

## Map controls

| Input           | Action         |
|-----------------|----------------|
| Arrow keys / WASD | Pan camera   |
| Mouse wheel     | Zoom in/out    |

## Project structure

```
agent-space/
├── packages/
│   ├── server/          # Express + WebSocket API
│   └── client/          # Vite + Phaser 3 (TypeScript)
├── hooks/
│   ├── agent-hook.js    # Claude Code hook script
│   └── hooks-config.md  # Hook registration guide
├── shared/
│   └── types.ts         # Shared TypeScript types
├── assets/              # Place custom sprites/tiles/maps here
├── CLAUDE.md            # Developer guide (architecture, extensions)
└── README.md
```

## Max agents

The server enforces a maximum of **10 simultaneously awake agents**.
Additional spawn attempts are rejected with `HTTP 429`.
Agents in `done` state (resting in the Hangar) do not count against this limit
and can be reawakened by sending a new `spawned` or `working` event.

## Customisation

See [`CLAUDE.md`](CLAUDE.md) for:
- Adding new agent types / visual states
- Extending the map
- Adding social dialogue phrases
- Changing config values (ports, speed, timings)
