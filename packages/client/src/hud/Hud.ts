import type { AgentState, AgentStatus } from '@agent-space/shared';
import { config } from '../config';

interface HudEvent {
  type: 'spawn' | 'update' | 'remove' | 'reawaken';
  state: Partial<AgentState> & { agentId: string };
}

const STATUS_ICON: Record<AgentStatus, string> = {
  spawned: '◈',
  working: '⚙',
  waiting: '⏸',
  done:    '✓',
  error:   '✗',
};

export class Hud {
  private agents: Map<string, AgentState> = new Map();
  private container: HTMLElement;
  private wsDot: HTMLElement | null = null;

  constructor(gameEvents: Phaser.Events.EventEmitter) {
    this.container = document.getElementById('hud')!;
    this.render();

    gameEvents.on('hud_event', (evt: HudEvent) => this.onHudEvent(evt));

    gameEvents.on('ws_client_ready', (ws: { connected: boolean; onStatusChange?: (c: boolean) => void }) => {
      ws.onStatusChange = (c) => this.setWsStatus(c);
      this.setWsStatus(ws.connected);
    });
  }

  setupEvents() {
    this.container.addEventListener('click', async (e) => {
      const btn = (e.target as HTMLElement).closest('.hud-delete-btn') as HTMLElement | null;
      if (!btn) return;
      const id = btn.dataset.id;
      if (id) await fetch(`${config.SERVER_URL}/agents/${encodeURIComponent(id)}`, { method: 'DELETE' });
    });

    this.container.addEventListener('submit', async (e) => {
      if (!(e.target as HTMLElement).closest('.sim-form')) return;
      e.preventDefault();
      const get = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement).value.trim();
      const agentId = get('sim-id');
      const name    = get('sim-name');
      const status  = get('sim-status') as AgentStatus;
      const task    = get('sim-task');
      if (!agentId || !name) return;
      await fetch(`${config.SERVER_URL}/agent-event`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, name, status, task: task || undefined, timestamp: Date.now() }),
      });
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private onHudEvent(evt: HudEvent) {
    if (evt.type === 'remove') {
      this.agents.delete(evt.state.agentId);
    } else {
      this.agents.set(evt.state.agentId, evt.state as AgentState);
    }
    this.render();
  }

  private setWsStatus(connected: boolean) {
    if (!this.wsDot) this.wsDot = document.getElementById('ws-dot');
    if (this.wsDot) {
      this.wsDot.className = connected ? 'connected' : '';
      this.wsDot.title     = connected ? 'WebSocket connected' : 'WebSocket disconnected';
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  private render() {
    this.container.innerHTML = '';
    this.wsDot = null;
    this.container.appendChild(this.buildHeader());
    this.container.appendChild(this.buildAgentList());
    this.container.appendChild(this.buildSimulateForm());
    // Re-apply WS status after re-render
    this.wsDot = document.getElementById('ws-dot');
  }

  private buildHeader(): HTMLElement {
    const awake   = [...this.agents.values()].filter(a => a.isAwake).length;
    const resting = [...this.agents.values()].filter(a => !a.isAwake).length;

    const h = el('div', 'hud-header');
    h.innerHTML = `
      <div class="hud-title-row">
        <span class="hud-title">AGENT SPACE</span>
        <span id="ws-dot" title="Connecting..."></span>
      </div>
      <div class="hud-stats">
        <span class="stat-active">● ${awake} active</span>
        <span class="stat-resting">✓ ${resting} resting</span>
      </div>
    `;
    return h;
  }

  private buildAgentList(): HTMLElement {
    const section = el('div', 'hud-list');
    const title   = el('div', 'hud-section-title');
    title.textContent = 'AGENTS';
    section.appendChild(title);

    const scroll = el('div', 'hud-scroll');
    section.appendChild(scroll);

    if (this.agents.size === 0) {
      const empty = el('div', 'hud-empty');
      empty.textContent = 'NO AGENTS ACTIVE';
      scroll.appendChild(empty);
      return section;
    }

    for (const agent of this.agents.values()) {
      scroll.appendChild(this.buildAgentRow(agent));
    }

    return section;
  }

  private buildAgentRow(agent: AgentState): HTMLElement {
    const hasTask = Boolean(agent.task);
    const row     = el('div', `hud-agent-row${hasTask ? ' has-task' : ''}`);

    row.innerHTML = `
      <span class="agent-icon status-${agent.status}">${STATUS_ICON[agent.status]}</span>
      <span class="agent-name">${agent.name}</span>
      <span class="agent-zone">${agent.zone.replace('_', '\u00a0')}</span>
      <button class="hud-delete-btn" data-id="${agent.agentId}" title="Remove">✕</button>
      ${hasTask ? `<span class="agent-task-row">› ${agent.task}</span>` : ''}
    `;

    return row;
  }

  private buildSimulateForm(): HTMLElement {
    const section = el('div', 'hud-simulate');
    const title   = el('div', 'hud-section-title');
    title.textContent = 'SIMULATE EVENT';
    section.appendChild(title);

    const form = document.createElement('form');
    form.className = 'sim-form';
    form.innerHTML = `
      <input  id="sim-id"     class="sim-input" type="text"   placeholder="agent-id"       autocomplete="off" />
      <input  id="sim-name"   class="sim-input" type="text"   placeholder="name"            autocomplete="off" />
      <select id="sim-status" class="sim-input">
        <option value="spawned">spawned</option>
        <option value="working" selected>working</option>
        <option value="waiting">waiting</option>
        <option value="done">done</option>
        <option value="error">error</option>
      </select>
      <input  id="sim-task"   class="sim-input" type="text"   placeholder="task (optional)" autocomplete="off" />
      <button type="submit" class="sim-btn">▶ SEND EVENT</button>
    `;

    section.appendChild(form);
    return section;
  }
}

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
