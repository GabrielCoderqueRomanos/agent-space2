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
