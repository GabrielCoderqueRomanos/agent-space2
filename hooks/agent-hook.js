#!/usr/bin/env node
/**
 * agent-hook.js — Claude Code hook script.
 *
 * Reads a hook event from stdin (JSON), maps it to an AgentStatus,
 * and POSTs to the agent-space server at /agent-event.
 *
 * Fails silently — never interrupts Claude Code.
 * Requires Node 18+ (uses native fetch + AbortController).
 */

const SERVER_URL = process.env.AGENT_SPACE_URL ?? 'http://localhost:3000';
const TIMEOUT_MS = 500;

/** Map Claude Code hook names to AgentStatus. */
const HOOK_TO_STATUS = {
  SubagentStop:    'done',
  Stop:            'done',
  PreToolUse:      'working',
  PostToolUse:     'working',
  Notification:    'waiting',
};

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;

  let hookData;
  try {
    hookData = JSON.parse(raw);
  } catch {
    // Ignore non-JSON input
    process.exit(0);
  }

  // Claude Code injects: hook_event_name, session_id, agent_name (may vary by version)
  const hookName  = hookData.hook_event_name ?? hookData.hookEventName ?? '';
  const agentId   = hookData.session_id      ?? hookData.sessionId     ?? 'unknown-session';
  const agentName = hookData.agent_name      ?? hookData.agentName     ?? `agent-${agentId.slice(0, 8)}`;
  const task      = hookData.tool_name       ?? hookData.toolName      ?? hookData.message ?? undefined;

  const status = HOOK_TO_STATUS[hookName];
  if (!status) {
    // Unknown hook — skip silently
    process.exit(0);
  }

  const body = JSON.stringify({
    agentId,
    name: agentName,
    status,
    task: task ? String(task).slice(0, 80) : undefined,
    timestamp: Date.now(),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    await fetch(`${SERVER_URL}/agent-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } catch {
    // Silent failure — never block Claude Code
  } finally {
    clearTimeout(timer);
  }

  process.exit(0);
}

main();
