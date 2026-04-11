import { Router } from 'express';
import { agents, applyEvent } from './state.js';
import { broadcast } from './ws.js';
import { config } from './config.js';

export const router = Router();

// POST /agent-event
router.post('/agent-event', (req, res) => {
  const event = req.body;

  if (!event.agentId || !event.name || !event.status) {
    return res.status(400).json({ error: 'agentId, name and status are required.' });
  }

  const result = applyEvent(event, config.MAX_AWAKE_AGENTS);

  if (result.error) {
    return res.status(result.code).json({ error: result.error });
  }

  broadcast(result.wsEvent, result.state);

  return res.status(200).json(result.state);
});

// GET /agents
router.get('/agents', (_req, res) => {
  res.json(Array.from(agents.values()));
});

// DELETE /agents/:agentId
router.delete('/agents/:agentId', (req, res) => {
  const { agentId } = req.params;

  if (!agents.has(agentId)) {
    return res.status(404).json({ error: 'Agent not found.' });
  }

  agents.delete(agentId);
  broadcast('agent_removed', { agentId });
  return res.status(200).json({ agentId });
});
