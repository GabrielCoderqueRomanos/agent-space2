export type AgentStatus = 'spawned' | 'working' | 'waiting' | 'done' | 'error';

export type AgentZone = 'bridge' | 'engine_room' | 'hangar' | 'alert_bay';

export interface AgentEvent {
  agentId: string;
  name: string;
  status: AgentStatus;
  task?: string;
  timestamp: number;
}

export interface AgentState extends AgentEvent {
  zone: AgentZone;
  isAwake: boolean;
  spawnCount: number;
  /** Tool currently being used (e.g. "Bash", "Edit", "Read") */
  currentTool?: string;
  /** File path being operated on, if applicable */
  currentFile?: string;
  /** ISO timestamp of the most recent activity */
  lastActivity?: string;
}

// ─── Skill ────────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  /** Slug used as the slash command name (e.g. "review-pr") — no spaces */
  name: string;
  description: string;
  /** Markdown body — written to ~/.claude/skills/[name].md and injected into CLAUDE.md */
  content: string;
  createdAt: string;
}

// ─── ClaudeAgent (native Claude Code sub-agent) ───────────────────────────────

export const CLAUDE_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebFetch', 'WebSearch', 'TodoWrite', 'Task',
] as const;
export type ClaudeTool = typeof CLAUDE_TOOLS[number];

export interface ClaudeAgent {
  id: string;
  /** Slug used as the filename in ~/.claude/agents/ (no spaces) */
  name: string;
  description: string;
  /** Subset of Claude Code tools this agent is allowed to use */
  tools: ClaudeTool[];
  /** System prompt — the agent's instructions */
  systemPrompt: string;
  createdAt: string;
}

// ─── AgentProfile ─────────────────────────────────────────────────────────────

export interface AgentProfile {
  id: string;
  /** Human-readable display name */
  name: string;
  /** Absolute path to the project directory where Claude Code should be launched */
  workingDir: string;
  /** IDs of Skill records associated with this agent */
  skills: string[];
  /** Custom preamble written to workingDir/CLAUDE.md before skill sections */
  claudeMd: string;
  hooks: {
    enabled: boolean;
    /** Absolute path to agent-hook.js */
    hookScript: string;
    /** URL of this server, e.g. http://localhost:3000 */
    serverUrl: string;
  };
  createdAt: string;
}

export const STATUS_TO_ZONE: Record<AgentStatus, AgentZone> = {
  spawned: 'bridge',
  working: 'engine_room',
  waiting: 'bridge',
  done: 'hangar',
  error: 'alert_bay',
};

// WebSocket message format
export interface WsMessage {
  event: WsEvent;
  payload: AgentState | AgentState[];
}

export type WsEvent =
  | 'agent_spawned'
  | 'agent_updated'
  | 'agent_reawakened'
  | 'agent_removed'
  | 'state_sync';
