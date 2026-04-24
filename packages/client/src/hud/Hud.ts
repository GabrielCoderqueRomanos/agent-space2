import type { AgentState, AgentStatus, Skill, AgentProfile, ClaudeAgent, ClaudeTool } from '@agent-space/shared';
import { CLAUDE_TOOLS } from '@agent-space/shared';
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

type ModalType = 'claude-agents' | 'profiles' | 'skills' | null;

export class Hud {
  // ── State ─────────────────────────────────────────────────────────
  private agents:       Map<string, AgentState> = new Map();
  private skills:       Skill[]        = [];
  private profiles:     AgentProfile[] = [];
  private claudeAgents: ClaudeAgent[]  = [];

  // ── DOM refs ──────────────────────────────────────────────────────
  private container:    HTMLElement;
  private dockWrapper:  HTMLElement;
  private modalOverlay: HTMLElement;
  private wsDot:        HTMLElement | null = null;

  // ── Sidebar state ─────────────────────────────────────────────────
  private expandedAgentId: string | null = null;

  // ── Modal state ───────────────────────────────────────────────────
  private openModal:      ModalType = null;
  private modalShowForm   = false;
  private modalEditingId: string | null = null;

  // ─────────────────────────────────────────────────────────────────
  constructor(gameEvents: Phaser.Events.EventEmitter) {
    this.container = document.getElementById('hud')!;

    // Dock (injected into body, floats over game canvas)
    this.dockWrapper  = this.createDock();
    this.modalOverlay = this.createModalOverlay();
    document.body.appendChild(this.dockWrapper);
    document.body.appendChild(this.modalOverlay);

    gameEvents.on('hud_event', (evt: HudEvent) => this.onHudEvent(evt));
    gameEvents.on('ws_client_ready', (ws: { connected: boolean; onStatusChange?: (c: boolean) => void }) => {
      ws.onStatusChange = (c) => this.setWsStatus(c);
      this.setWsStatus(ws.connected);
    });

    Promise.all([this.fetchSkills(), this.fetchProfiles(), this.fetchClaudeAgents()]).then(() => this.renderSidebar());
  }

  setupEvents() {
    // ── Sidebar events ────────────────────────────────────────────
    this.container.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      const delBtn = target.closest('.hud-delete-btn') as HTMLElement | null;
      if (delBtn?.dataset.id) {
        e.stopPropagation();
        await fetch(`${config.SERVER_URL}/agents/${encodeURIComponent(delBtn.dataset.id)}`, { method: 'DELETE' });
        return;
      }

      const agentRow = target.closest('.hud-agent-row') as HTMLElement | null;
      if (agentRow?.dataset.agentId) {
        const id = agentRow.dataset.agentId;
        this.expandedAgentId = this.expandedAgentId === id ? null : id;
        this.renderSidebar();
        return;
      }
    });

    // ── Dock events ───────────────────────────────────────────────
    this.dockWrapper.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.dock-btn') as HTMLElement | null;
      if (!btn?.dataset.modal) return;
      const modal = btn.dataset.modal as ModalType;
      this.openModal    = this.openModal === modal ? null : modal;
      this.modalShowForm   = false;
      this.modalEditingId  = null;
      this.renderDock();
      this.renderModal();
    });

    // ── Modal events ──────────────────────────────────────────────
    this.modalOverlay.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Close on backdrop click
      if (target === this.modalOverlay) {
        this.closeModal();
        return;
      }

      // Close button
      if (target.closest('.modal-close')) {
        this.closeModal();
        return;
      }

      // New button
      if (target.closest('.modal-new-btn')) {
        this.modalShowForm  = !this.modalShowForm;
        this.modalEditingId = null;
        this.renderModal();
        return;
      }

      // Edit (skill or claude-agent — both use modal-edit-btn)
      const editBtn = target.closest('.modal-edit-btn') as HTMLElement | null;
      if (editBtn?.dataset.id) {
        this.modalEditingId = editBtn.dataset.id;
        this.modalShowForm  = true;
        this.renderModal();
        return;
      }

      // Delete skill
      const skillDelBtn = target.closest('.modal-delete-btn[data-type="skill"]') as HTMLElement | null;
      if (skillDelBtn?.dataset.id) {
        await fetch(`${config.SERVER_URL}/api/v1/skills/${encodeURIComponent(skillDelBtn.dataset.id)}`, { method: 'DELETE' });
        await this.fetchSkills();
        this.renderModal();
        return;
      }

      // Delete profile
      const profDelBtn = target.closest('.modal-delete-btn[data-type="profile"]') as HTMLElement | null;
      if (profDelBtn?.dataset.id) {
        await fetch(`${config.SERVER_URL}/api/v1/agent-profiles/${encodeURIComponent(profDelBtn.dataset.id)}`, { method: 'DELETE' });
        await this.fetchProfiles();
        this.renderModal();
        return;
      }

      // Delete claude agent
      const agentDelBtn = target.closest('.modal-delete-btn[data-type="claude-agent"]') as HTMLElement | null;
      if (agentDelBtn?.dataset.id) {
        await fetch(`${config.SERVER_URL}/api/v1/claude-agents/${encodeURIComponent(agentDelBtn.dataset.id)}`, { method: 'DELETE' });
        await this.fetchClaudeAgents();
        this.renderModal();
        return;
      }

      // Import button
      if (target.closest('.modal-import-btn')) {
        const res  = await fetch(`${config.SERVER_URL}/api/v1/agent-profiles/import`, { method: 'POST' });
        const data = await res.json();
        if (data.imported?.length) {
          await this.fetchProfiles();
          this.renderModal();
          this.renderSidebar();
        }
        return;
      }
    });

    this.modalOverlay.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target as HTMLElement;

      // ── Skill form ───────────────────────────────────────────────
      if (form.classList.contains('modal-skill-form')) {
        const val = (name: string) => (form.querySelector(`[name="${name}"]`) as HTMLInputElement)?.value.trim() ?? '';
        const name = val('name'), description = val('description'), content = val('content');

        if (this.modalEditingId) {
          await fetch(`${config.SERVER_URL}/api/v1/skills/${encodeURIComponent(this.modalEditingId)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, content }),
          });
        } else {
          await fetch(`${config.SERVER_URL}/api/v1/skills`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, content }),
          });
        }
        this.modalEditingId = null;
        this.modalShowForm  = false;
        await this.fetchSkills();
        this.renderModal();
        return;
      }

      // ── Claude agent form ────────────────────────────────────────
      if (form.classList.contains('modal-claude-agent-form')) {
        const val = (name: string) => (form.querySelector(`[name="${name}"]`) as HTMLInputElement)?.value.trim() ?? '';
        const selectedTools = [...form.querySelectorAll('.modal-tool-check-input:checked')]
          .map(el => (el as HTMLInputElement).value as ClaudeTool);

        if (this.modalEditingId) {
          await fetch(`${config.SERVER_URL}/api/v1/claude-agents/${encodeURIComponent(this.modalEditingId)}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: val('name'), description: val('description'), tools: selectedTools, systemPrompt: val('systemPrompt') }),
          });
        } else {
          await fetch(`${config.SERVER_URL}/api/v1/claude-agents`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: val('name'), description: val('description'), tools: selectedTools, systemPrompt: val('systemPrompt') }),
          });
        }
        this.modalEditingId = null;
        this.modalShowForm  = false;
        await this.fetchClaudeAgents();
        this.renderModal();
        return;
      }

      // ── Agent profile form ───────────────────────────────────────
      if (form.classList.contains('modal-agent-form')) {
        const val     = (name: string) => (form.querySelector(`[name="${name}"]`) as HTMLInputElement)?.value.trim() ?? '';
        const checked = (name: string) => (form.querySelector(`[name="${name}"]`) as HTMLInputElement)?.checked ?? false;

        const selectedSkills = [...form.querySelectorAll('.modal-skill-check-input:checked')]
          .map(el => (el as HTMLInputElement).value);

        await fetch(`${config.SERVER_URL}/api/v1/agent-profiles`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:       val('name'),
            workingDir: val('workingDir'),
            claudeMd:   val('claudeMd'),
            skills:     selectedSkills,
            hooks: {
              enabled:    checked('hooksEnabled'),
              hookScript: val('hookScript'),
              serverUrl:  val('serverUrl'),
            },
          }),
        });
        this.modalShowForm = false;
        await this.fetchProfiles();
        this.renderModal();
        this.renderSidebar();
        return;
      }
    });
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  private async fetchSkills() {
    try { this.skills   = await (await fetch(`${config.SERVER_URL}/api/v1/skills`)).json(); }
    catch { this.skills = []; }
  }

  private async fetchProfiles() {
    try { this.profiles   = await (await fetch(`${config.SERVER_URL}/api/v1/agent-profiles`)).json(); }
    catch { this.profiles = []; }
  }

  private async fetchClaudeAgents() {
    try { this.claudeAgents   = await (await fetch(`${config.SERVER_URL}/api/v1/claude-agents`)).json(); }
    catch { this.claudeAgents = []; }
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private onHudEvent(evt: HudEvent) {
    if (evt.type === 'remove') this.agents.delete(evt.state.agentId);
    else                       this.agents.set(evt.state.agentId, evt.state as AgentState);
    this.renderSidebar();
    // Refresh modal detail if open
    if (this.openModal === 'claude-agents') this.renderModal();
  }

  private setWsStatus(connected: boolean) {
    if (!this.wsDot) this.wsDot = document.getElementById('ws-dot');
    if (this.wsDot) {
      this.wsDot.className = connected ? 'connected' : '';
      this.wsDot.title     = connected ? 'WebSocket connected' : 'WebSocket disconnected';
    }
  }

  private closeModal() {
    this.openModal     = null;
    this.modalShowForm = false;
    this.modalEditingId = null;
    this.renderDock();
    this.renderModal();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SIDEBAR
  // ═══════════════════════════════════════════════════════════════════════════

  private renderSidebar() {
    this.container.innerHTML = '';
    this.wsDot = null;
    this.container.appendChild(this.buildHeader());
    this.container.appendChild(this.buildAgentList());
    this.wsDot = document.getElementById('ws-dot');
  }

  private buildHeader(): HTMLElement {
    const awake   = [...this.agents.values()].filter(a => a.isAwake).length;
    const resting = [...this.agents.values()].filter(a => !a.isAwake).length;
    const h = el('div', 'hud-header');
    h.innerHTML = `
      <div class="hud-title-row">
        <span class="hud-title">AGENT SPACE</span>
        <span id="ws-dot" title="Connecting…"></span>
      </div>
      <div class="hud-stats">
        <span class="stat-active">● ${awake} active</span>
        <span class="stat-resting">✓ ${resting} resting</span>
        <span class="stat-resting">/ ${this.skills.length} skills</span>
      </div>
    `;
    return h;
  }

  private buildAgentList(): HTMLElement {
    const section = el('div', 'hud-list');
    const title   = el('div', 'hud-section-title');
    title.textContent = 'LIVE AGENTS';
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
      if (this.expandedAgentId === agent.agentId) {
        scroll.appendChild(this.buildAgentDetail(agent));
      }
    }
    return section;
  }

  private buildAgentRow(agent: AgentState): HTMLElement {
    const hasTask  = Boolean(agent.task);
    const expanded = this.expandedAgentId === agent.agentId;
    const row      = el('div', `hud-agent-row${hasTask ? ' has-task' : ''}${expanded ? ' expanded' : ''}`);
    row.dataset.agentId = agent.agentId;
    row.innerHTML = `
      <span class="agent-icon status-${agent.status}">${STATUS_ICON[agent.status]}</span>
      <span class="agent-name">${agent.name}</span>
      <span class="agent-zone">${agent.zone.replace('_', '\u00a0')}</span>
      <button class="hud-delete-btn" data-id="${agent.agentId}" title="Remove">✕</button>
      ${hasTask ? `<span class="agent-task-row">› ${agent.task}</span>` : ''}
    `;
    return row;
  }

  private buildAgentDetail(agent: AgentState): HTMLElement {
    const d       = el('div', 'agent-detail');
    const profile = this.profiles.find(p => p.name === agent.name) ?? null;
    const skillNames = profile
      ? this.skills.filter(s => profile.skills.includes(s.id)).map(s => `/${s.name}`).join(', ') || 'none'
      : '—';
    const toolHtml = agent.currentTool
      ? `<span class="agent-detail-tool">⚙ ${agent.currentTool}${agent.currentFile ? `: ${agent.currentFile}` : ''}</span>`
      : '<span style="opacity:0.35">idle</span>';

    d.innerHTML = `
      <div class="agent-detail-row"><span class="agent-detail-label">ID</span><span class="agent-detail-value">${agent.agentId.slice(0, 16)}…</span></div>
      <hr class="agent-detail-sep">
      <div class="agent-detail-row"><span class="agent-detail-label">Dir</span><span class="agent-detail-value">${profile?.workingDir ?? '—'}</span></div>
      <div class="agent-detail-row"><span class="agent-detail-label">Skills</span><span class="agent-detail-value">${skillNames}</span></div>
      <hr class="agent-detail-sep">
      <div class="agent-detail-row"><span class="agent-detail-label">Tool</span><span class="agent-detail-value">${toolHtml}</span></div>
      ${agent.lastActivity ? `<div class="agent-detail-row"><span class="agent-detail-label">Last seen</span><span class="agent-detail-value" style="opacity:0.4">${new Date(agent.lastActivity).toLocaleTimeString()}</span></div>` : ''}
      <div class="agent-detail-row"><span class="agent-detail-label">Spawns</span><span class="agent-detail-value">${agent.spawnCount}</span></div>
    `;
    return d;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  DOCK
  // ═══════════════════════════════════════════════════════════════════════════

  private createDock(): HTMLElement {
    const wrapper = el('div', '');
    wrapper.id = 'dock-wrapper';
    wrapper.innerHTML = `
      <div id="dock">
        <button class="dock-btn" data-modal="claude-agents">
          <span class="dock-icon dock-icon-agents">◈</span>
          <span class="dock-label">Agents</span>
        </button>
        <div class="dock-sep"></div>
        <button class="dock-btn" data-modal="profiles">
          <span class="dock-icon dock-icon-profiles">⬡</span>
          <span class="dock-label">Profiles</span>
        </button>
        <div class="dock-sep"></div>
        <button class="dock-btn" data-modal="skills">
          <span class="dock-icon dock-icon-skills">✦</span>
          <span class="dock-label">Skills</span>
        </button>
      </div>
    `;
    return wrapper;
  }

  private renderDock() {
    const btns = this.dockWrapper.querySelectorAll('.dock-btn');
    btns.forEach(btn => {
      const b = btn as HTMLElement;
      b.classList.toggle('active', b.dataset.modal === this.openModal);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  private createModalOverlay(): HTMLElement {
    const overlay = el('div', '');
    overlay.id = 'modal-overlay';
    overlay.style.display = 'none';
    overlay.innerHTML = `<div id="modal-panel"><div class="modal-header"></div><div class="modal-body"></div></div>`;
    return overlay;
  }

  private renderModal() {
    if (!this.openModal) {
      this.modalOverlay.style.display = 'none';
      return;
    }
    this.modalOverlay.style.display = 'flex';

    const header = this.modalOverlay.querySelector('.modal-header')!;
    const body   = this.modalOverlay.querySelector('.modal-body')!;

    const titles: Record<NonNullable<ModalType>, string> = {
      'claude-agents': 'AGENTS',
      'profiles':      'PROFILES',
      'skills':        'SKILLS',
    };

    header.innerHTML = `
      <span class="modal-title">${titles[this.openModal]}</span>
      <button class="modal-close" title="Close">✕</button>
    `;

    body.innerHTML = '';

    if (this.openModal === 'skills') {
      body.appendChild(this.buildModalSkillsContent());
    } else if (this.openModal === 'profiles') {
      body.appendChild(this.buildModalAgentsContent());
    } else {
      body.appendChild(this.buildModalClaudeAgentsContent());
    }
  }

  // ─── Claude Agents modal content ─────────────────────────────────────────

  private buildModalClaudeAgentsContent(): HTMLElement {
    const wrap = el('div', '');

    const newBtn = el('button', 'modal-new-btn');
    newBtn.innerHTML = `<span class="plus">+</span> New Agent`;
    wrap.appendChild(newBtn);

    if (this.claudeAgents.length === 0) {
      const empty = el('div', 'modal-empty');
      empty.textContent = 'NO AGENTS DEFINED YET';
      wrap.appendChild(empty);
    }

    for (const agent of this.claudeAgents) {
      const item = el('div', 'modal-item');
      const toolBadges = agent.tools.length
        ? agent.tools.map(t => `<span class="modal-tool-badge">${t}</span>`).join('')
        : '<span style="opacity:0.3;font-size:9px">all tools</span>';

      item.innerHTML = `
        <div>
          <div class="modal-item-name">${agent.name}</div>
          ${agent.description ? `<div class="modal-item-sub">${agent.description}</div>` : ''}
          <div class="modal-tools-row">${toolBadges}</div>
        </div>
        <div class="modal-item-actions">
          <button class="modal-edit-btn" data-id="${agent.id}" title="Edit">✎</button>
          <button class="modal-delete-btn" data-type="claude-agent" data-id="${agent.id}" title="Delete">✕</button>
        </div>
      `;
      wrap.appendChild(item);
    }

    if (this.modalShowForm) {
      const editing = this.modalEditingId
        ? this.claudeAgents.find(a => a.id === this.modalEditingId)
        : null;
      wrap.appendChild(this.buildClaudeAgentForm(editing ?? null));
    }

    return wrap;
  }

  private buildClaudeAgentForm(editing: ClaudeAgent | null): HTMLElement {
    const toolCheckboxes = CLAUDE_TOOLS.map(tool => {
      const checked = editing?.tools.includes(tool) ? 'checked' : '';
      return `
        <label class="modal-skill-check">
          <input type="checkbox" class="modal-tool-check-input" value="${tool}" ${checked}>
          <span>${tool}</span>
        </label>
      `;
    }).join('');

    const section = el('div', 'modal-form-section');
    section.innerHTML = `
      <div class="modal-form-title">${editing ? '✎ EDIT AGENT' : '+ NEW AGENT'}</div>
      <form class="modal-form modal-claude-agent-form">
        <div class="modal-label">NAME — used as identifier (e.g. code-reviewer)</div>
        <input name="name" class="modal-input" type="text" placeholder="code-reviewer"
          value="${editing?.name ?? ''}" autocomplete="off" ${editing ? 'readonly style="opacity:0.5"' : ''}>
        <div class="modal-label">DESCRIPTION — shown in Claude Code's agent picker</div>
        <input name="description" class="modal-input" type="text"
          placeholder="Reviews code for quality and security"
          value="${editing?.description ?? ''}" autocomplete="off">
        <div class="modal-label">ALLOWED TOOLS — leave all unchecked to allow all tools</div>
        <div class="modal-skills-select" style="max-height:130px">${toolCheckboxes}</div>
        <div class="modal-label">SYSTEM PROMPT — the agent's instructions</div>
        <textarea name="systemPrompt" class="modal-input" rows="6"
          placeholder="You are a specialized code reviewer. When invoked, you…">${editing?.systemPrompt ?? ''}</textarea>
        <div class="modal-btn-row">
          <button type="submit" class="modal-btn">${editing ? '▶ UPDATE' : '▶ CREATE AGENT'}</button>
        </div>
      </form>
    `;
    return section;
  }

  // ─── Skills modal content ─────────────────────────────────────────────────

  private buildModalSkillsContent(): HTMLElement {
    const frag = document.createDocumentFragment();
    const wrap = el('div', '');

    // New skill button
    const newBtn = el('button', 'modal-new-btn');
    newBtn.innerHTML = `<span class="plus">+</span> New Skill`;
    wrap.appendChild(newBtn);

    // List
    if (this.skills.length === 0) {
      const empty = el('div', 'modal-empty');
      empty.textContent = 'NO SKILLS DEFINED YET';
      wrap.appendChild(empty);
    }

    for (const skill of this.skills) {
      const item = el('div', 'modal-item');
      item.innerHTML = `
        <div>
          <div class="modal-item-name"><span class="modal-skill-slash">/</span>${skill.name}</div>
          ${skill.description ? `<div class="modal-item-sub">${skill.description}</div>` : ''}
        </div>
        <div class="modal-item-actions">
          <button class="modal-edit-btn" data-id="${skill.id}" title="Edit">✎</button>
          <button class="modal-delete-btn" data-type="skill" data-id="${skill.id}" title="Delete">✕</button>
        </div>
      `;
      wrap.appendChild(item);
    }

    // Form
    if (this.modalShowForm) {
      wrap.appendChild(this.buildSkillForm());
    }

    frag.appendChild(wrap);
    const container = el('div', '');
    container.appendChild(frag);
    return container;
  }

  private buildSkillForm(): HTMLElement {
    const editing = this.modalEditingId ? this.skills.find(s => s.id === this.modalEditingId) : null;
    const section = el('div', 'modal-form-section');
    section.innerHTML = `
      <div class="modal-form-title">${editing ? '✎ EDIT SKILL' : '+ NEW SKILL'}</div>
      <form class="modal-form modal-skill-form">
        <div class="modal-label">NAME — slash command slug (e.g. review-pr)</div>
        <input name="name" class="modal-input" type="text" placeholder="review-pr" value="${editing?.name ?? ''}" autocomplete="off">
        <div class="modal-label">DESCRIPTION</div>
        <input name="description" class="modal-input" type="text" placeholder="What this skill does" value="${editing?.description ?? ''}" autocomplete="off">
        <div class="modal-label">CONTENT (markdown — becomes the skill file + CLAUDE.md section)</div>
        <textarea name="content" class="modal-input" rows="5" placeholder="When invoked, do the following…">${editing?.content ?? ''}</textarea>
        <div class="modal-btn-row">
          <button type="submit" class="modal-btn">${editing ? '▶ UPDATE' : '▶ CREATE'}</button>
        </div>
      </form>
    `;
    return section;
  }

  // ─── Agent profiles modal content ─────────────────────────────────────────

  private buildModalAgentsContent(): HTMLElement {
    const wrap = el('div', '');

    // New + Import buttons
    const btnRow = el('div', '');
    btnRow.style.cssText = 'display:flex;';

    const newBtn = el('button', 'modal-new-btn');
    newBtn.style.flex = '1';
    newBtn.innerHTML  = `<span class="plus">+</span> New Profile`;
    btnRow.appendChild(newBtn);

    const importBtn = el('button', 'modal-new-btn modal-import-btn');
    importBtn.style.cssText = 'flex:1;border-left:1px solid rgba(0,255,170,0.08);';
    importBtn.innerHTML = `<span class="plus" style="color:var(--hud-blue)">⬇</span> Import from Claude`;
    btnRow.appendChild(importBtn);

    wrap.appendChild(btnRow);

    // List
    if (this.profiles.length === 0) {
      const empty = el('div', 'modal-empty');
      empty.textContent = 'NO PROFILES YET';
      wrap.appendChild(empty);
    }

    for (const profile of this.profiles) {
      const liveAgent = [...this.agents.values()].find(a => a.name === profile.name);
      const skillNames = this.skills.filter(s => profile.skills.includes(s.id)).map(s => `/${s.name}`).join(', ');

      const item = el('div', 'modal-item');
      item.innerHTML = `
        <div>
          <div class="modal-item-name">${profile.name}${liveAgent ? ' <span style="color:var(--hud-cyan);font-size:10px;">● live</span>' : ''}</div>
          <div class="modal-item-sub">${profile.workingDir}</div>
          ${skillNames ? `<div class="modal-item-sub" style="color:rgba(0,255,170,0.45)">${skillNames}</div>` : ''}
        </div>
        <div class="modal-item-actions">
          <button class="modal-delete-btn" data-type="profile" data-id="${profile.id}" title="Delete">✕</button>
        </div>
      `;
      wrap.appendChild(item);
    }

    // Form
    if (this.modalShowForm) {
      wrap.appendChild(this.buildAgentProfileForm());
    }

    return wrap;
  }

  private buildAgentProfileForm(): HTMLElement {
    const skillCheckboxes = this.skills.map(s => `
      <label class="modal-skill-check">
        <input type="checkbox" class="modal-skill-check-input" value="${s.id}">
        <span>/${s.name}</span>
        ${s.description ? `<span style="color:rgba(0,255,170,0.3);font-size:10px;">— ${s.description}</span>` : ''}
      </label>
    `).join('');

    const section = el('div', 'modal-form-section');
    section.innerHTML = `
      <div class="modal-form-title">+ NEW AGENT PROFILE</div>
      <form class="modal-form modal-agent-form">
        <div class="modal-label">DISPLAY NAME</div>
        <input name="name" class="modal-input" type="text" placeholder="my-agent" autocomplete="off">
        <div class="modal-label">WORKING DIRECTORY</div>
        <input name="workingDir" class="modal-input" type="text" placeholder="/path/to/your/project" autocomplete="off">
        ${skillCheckboxes ? `
          <div class="modal-label">SKILLS TO INJECT</div>
          <div class="modal-skills-select">${skillCheckboxes}</div>
        ` : `<div style="font-size:10px;color:rgba(0,255,170,0.25);padding:4px 0">No skills yet — create some in the Skills menu</div>`}
        <div class="modal-label">CLAUDE.MD PREAMBLE</div>
        <textarea name="claudeMd" class="modal-input" rows="3" placeholder="Custom instructions for this agent…"></textarea>
        <label class="modal-checkbox-row">
          <input type="checkbox" name="hooksEnabled"> Enable agent-space hooks (auto-tracking)
        </label>
        <div class="modal-label">HOOK SCRIPT PATH</div>
        <input name="hookScript" class="modal-input" type="text" placeholder="/absolute/path/to/agent-hook.js" autocomplete="off">
        <div class="modal-label">SERVER URL</div>
        <input name="serverUrl" class="modal-input" type="text" value="${config.SERVER_URL}" autocomplete="off">
        <div class="modal-btn-row">
          <button type="submit" class="modal-btn">▶ CREATE PROFILE</button>
        </div>
      </form>
    `;
    return section;
  }
}

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
