# Registering agent-space hooks in Claude Code

## Prerequisites

- Node.js 18+ installed (hook uses native `fetch`)
- `pnpm dev` is running (server must be up on port 3000)

---

## Step 1 — Find the absolute path to `agent-hook.js`

```bash
# From the repo root:
realpath hooks/agent-hook.js
# e.g.  /home/you/agent-space/hooks/agent-hook.js
```

On Windows (PowerShell):
```powershell
Resolve-Path .\hooks\agent-hook.js
```

---

## Step 2 — Register the hooks via `claude hooks`

Run the following command (replace `/absolute/path/to/agent-hook.js`):

```bash
claude hooks add \
  --hook PreToolUse \
  --command "node /absolute/path/to/agent-hook.js" \
  --name "agent-space-pre"

claude hooks add \
  --hook PostToolUse \
  --command "node /absolute/path/to/agent-hook.js" \
  --name "agent-space-post"

claude hooks add \
  --hook Notification \
  --command "node /absolute/path/to/agent-hook.js" \
  --name "agent-space-notify"

claude hooks add \
  --hook SubagentStop \
  --command "node /absolute/path/to/agent-hook.js" \
  --name "agent-space-subagent"

claude hooks add \
  --hook Stop \
  --command "node /absolute/path/to/agent-hook.js" \
  --name "agent-space-stop"
```

> **Note:** The exact CLI syntax may differ between Claude Code versions.
> Run `claude hooks --help` if the above fails.

---

## Step 3 — Verify

1. Open the agent-space UI at http://localhost:5173
2. In a new Claude Code session, run any command (e.g., `ls`)
3. You should see a new agent appear on the map within a second

---

## Optional: custom server URL

If you changed the server port, set the environment variable before registering:

```bash
export AGENT_SPACE_URL=http://localhost:4000
```

Or prefix each hook command:
```
AGENT_SPACE_URL=http://localhost:4000 node /path/to/agent-hook.js
```

---

## Hook → AgentStatus mapping

| Claude Code hook  | AgentStatus |
|-------------------|-------------|
| PreToolUse        | working     |
| PostToolUse       | working     |
| Notification      | waiting     |
| SubagentStop      | done        |
| Stop              | done        |

---

## Removing hooks

```bash
claude hooks remove --name agent-space-pre
claude hooks remove --name agent-space-post
claude hooks remove --name agent-space-notify
claude hooks remove --name agent-space-subagent
claude hooks remove --name agent-space-stop
```
