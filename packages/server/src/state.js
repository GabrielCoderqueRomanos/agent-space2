/**
 * In-memory agent state store.
 * Key: agentId, Value: AgentState
 */

import { STATUS_TO_ZONE } from '@agent-space/shared';

/** @type {Map<string, import('@agent-space/shared').AgentState>} */
export const agents = new Map();

/**
 * Count agents currently awake (isAwake: true).
 * @returns {number}
 */
export function awakeCount() {
  let n = 0;
  for (const a of agents.values()) if (a.isAwake) n++;
  return n;
}

/**
 * Apply an incoming AgentEvent to the state.
 * Returns { state, wsEvent } so the caller can broadcast.
 *
 * @param {import('@agent-space/shared').AgentEvent} event
 * @param {number} maxAwake
 * @returns {{ state: import('@agent-space/shared').AgentState, wsEvent: string } | { error: string, code: number }}
 */
export function applyEvent(event, maxAwake) {
  const { agentId, name, status, task, timestamp } = event;
  const zone = STATUS_TO_ZONE[status];
  const existing = agents.get(agentId);

  if (existing) {
    const wasAsleep = !existing.isAwake;
    const isReawakening =
      wasAsleep && (status === 'spawned' || status === 'working');

    if (isReawakening && awakeCount() >= maxAwake) {
      return { error: `Maximum of ${maxAwake} active agents reached.`, code: 429 };
    }

    const updated = {
      ...existing,
      name,
      status,
      task,
      timestamp,
      zone,
      isAwake: status !== 'done',
      spawnCount: isReawakening ? existing.spawnCount + 1 : existing.spawnCount,
    };

    agents.set(agentId, updated);
    return { state: updated, wsEvent: isReawakening ? 'agent_reawakened' : 'agent_updated' };
  }

  // Brand-new agent
  if (awakeCount() >= maxAwake) {
    return { error: `Maximum of ${maxAwake} active agents reached.`, code: 429 };
  }

  const newAgent = {
    agentId,
    name,
    status,
    task,
    timestamp,
    zone,
    isAwake: status !== 'done',
    spawnCount: 0,
  };

  agents.set(agentId, newAgent);
  return { state: newAgent, wsEvent: 'agent_spawned' };
}
