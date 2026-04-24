/**
 * manager.js — REST routes for Skills, AgentProfiles and ClaudeAgents.
 *
 * Mounted at /api/v1 in index.js.
 *
 * Skills:
 *   GET    /api/v1/skills
 *   POST   /api/v1/skills
 *   PUT    /api/v1/skills/:id
 *   DELETE /api/v1/skills/:id
 *
 * Agent Profiles (project configurations):
 *   GET    /api/v1/agent-profiles
 *   POST   /api/v1/agent-profiles
 *   PUT    /api/v1/agent-profiles/:id
 *   DELETE /api/v1/agent-profiles/:id
 *   POST   /api/v1/agent-profiles/import
 *
 * Claude Agents (native sub-agents → ~/.claude/agents/):
 *   GET    /api/v1/claude-agents
 *   POST   /api/v1/claude-agents
 *   PUT    /api/v1/claude-agents/:id
 *   DELETE /api/v1/claude-agents/:id
 */

import { Router } from 'express';
import fs         from 'fs';
import path       from 'path';
import os         from 'os';
import { randomUUID } from 'crypto';
import {
  loadSkills, saveSkills,
  loadProfiles, saveProfiles,
  loadAgents, saveAgents,
} from './store.js';

export const managerRouter = Router();

// ═══════════════════════════════════════════════════════════════════════════════
//  SKILLS
// ═══════════════════════════════════════════════════════════════════════════════

managerRouter.get('/skills', (_req, res) => {
  res.json(loadSkills());
});

managerRouter.post('/skills', (req, res) => {
  const { name, description, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: 'name and content are required.' });
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return res.status(400).json({ error: 'name must be lowercase alphanumeric with hyphens only.' });
  }

  const skills = loadSkills();
  if (skills.find(s => s.name === name)) {
    return res.status(409).json({ error: `Skill "${name}" already exists.` });
  }

  const skill = { id: randomUUID(), name, description: description ?? '', content, createdAt: new Date().toISOString() };
  skills.push(skill);
  saveSkills(skills);
  writeSkillFile(skill);

  return res.status(201).json(skill);
});

managerRouter.put('/skills/:id', (req, res) => {
  const skills = loadSkills();
  const idx    = skills.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Skill not found.' });

  const { name, description, content } = req.body;
  const old = skills[idx];

  // If name changed, remove old skill file
  if (name && name !== old.name) {
    removeSkillFile(old.name);
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ error: 'name must be lowercase alphanumeric with hyphens only.' });
    }
  }

  const updated = {
    ...old,
    name:        name        ?? old.name,
    description: description ?? old.description,
    content:     content     ?? old.content,
  };

  skills[idx] = updated;
  saveSkills(skills);
  writeSkillFile(updated);

  // Re-generate CLAUDE.md for any profiles that include this skill
  const profiles = loadProfiles();
  for (const profile of profiles) {
    if (profile.skills.includes(updated.id)) {
      writeClaude(profile, skills);
    }
  }

  return res.json(updated);
});

managerRouter.delete('/skills/:id', (req, res) => {
  const skills = loadSkills();
  const idx    = skills.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Skill not found.' });

  const [removed] = skills.splice(idx, 1);
  saveSkills(skills);
  removeSkillFile(removed.name);

  return res.json({ id: removed.id });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  AGENT PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

managerRouter.get('/agent-profiles', (_req, res) => {
  res.json(loadProfiles());
});

// NOTE: /import must be declared BEFORE /:id so it isn't swallowed as an id
managerRouter.post('/agent-profiles/import', (_req, res) => {
  const sessionsDir = path.join(os.homedir(), '.claude', 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    return res.json({ imported: [], message: 'No ~/.claude/sessions directory found.' });
  }

  const profiles  = loadProfiles();
  const imported  = [];

  let files;
  try { files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json')); }
  catch { return res.json({ imported: [], message: 'Could not read sessions directory.' }); }

  for (const file of files) {
    try {
      const raw     = fs.readFileSync(path.join(sessionsDir, file), 'utf8');
      const session = JSON.parse(raw);
      const cwd     = session.cwd ?? session.workingDirectory ?? null;
      if (!cwd) continue;

      // Skip if already imported
      if (profiles.find(p => p.workingDir === cwd)) continue;

      // Read CLAUDE.md if present
      let claudeMd = '';
      const claudeMdPath = path.join(cwd, 'CLAUDE.md');
      if (fs.existsSync(claudeMdPath)) {
        claudeMd = fs.readFileSync(claudeMdPath, 'utf8');
      }

      const profile = {
        id:         randomUUID(),
        name:       path.basename(cwd),
        workingDir: cwd,
        skills:     [],
        claudeMd,
        hooks: { enabled: false, hookScript: '', serverUrl: '' },
        createdAt:  new Date().toISOString(),
      };

      profiles.push(profile);
      imported.push(profile);
    } catch {
      // skip malformed session file
    }
  }

  saveProfiles(profiles);
  return res.json({ imported });
});

managerRouter.post('/agent-profiles', (req, res) => {
  const { name, workingDir, skills: skillIds, claudeMd, hooks } = req.body;
  if (!name || !workingDir) {
    return res.status(400).json({ error: 'name and workingDir are required.' });
  }

  const allSkills = loadSkills();
  const profile = {
    id:         randomUUID(),
    name,
    workingDir,
    skills:     skillIds ?? [],
    claudeMd:   claudeMd ?? '',
    hooks: {
      enabled:    hooks?.enabled    ?? false,
      hookScript: hooks?.hookScript ?? '',
      serverUrl:  hooks?.serverUrl  ?? '',
    },
    createdAt: new Date().toISOString(),
  };

  const profiles = loadProfiles();
  profiles.push(profile);
  saveProfiles(profiles);

  // Write generated files
  writeClaude(profile, allSkills);
  if (profile.hooks.enabled) injectHooks(profile);

  return res.status(201).json(profile);
});

managerRouter.put('/agent-profiles/:id', (req, res) => {
  const profiles = loadProfiles();
  const idx      = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found.' });

  const old     = profiles[idx];
  const updated = { ...old, ...req.body, id: old.id, createdAt: old.createdAt };
  profiles[idx] = updated;
  saveProfiles(profiles);

  const allSkills = loadSkills();
  writeClaude(updated, allSkills);
  if (updated.hooks.enabled) injectHooks(updated);

  return res.json(updated);
});

managerRouter.delete('/agent-profiles/:id', (req, res) => {
  const profiles = loadProfiles();
  const idx      = profiles.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Profile not found.' });

  const [removed] = profiles.splice(idx, 1);
  saveProfiles(profiles);
  return res.json({ id: removed.id });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CLAUDE AGENTS  (~/.claude/agents/)
// ═══════════════════════════════════════════════════════════════════════════════

const CLAUDE_AGENTS_DIR = path.join(os.homedir(), '.claude', 'agents');

managerRouter.get('/claude-agents', (_req, res) => {
  res.json(loadAgents());
});

managerRouter.post('/claude-agents', (req, res) => {
  const { name, description, tools, systemPrompt } = req.body;
  if (!name || !systemPrompt) {
    return res.status(400).json({ error: 'name and systemPrompt are required.' });
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    return res.status(400).json({ error: 'name must be lowercase alphanumeric with hyphens only.' });
  }

  const agents = loadAgents();
  if (agents.find(a => a.name === name)) {
    return res.status(409).json({ error: `Agent "${name}" already exists.` });
  }

  const agent = {
    id: randomUUID(),
    name,
    description: description ?? '',
    tools: tools ?? [],
    systemPrompt,
    createdAt: new Date().toISOString(),
  };

  agents.push(agent);
  saveAgents(agents);
  writeAgentFile(agent);

  return res.status(201).json(agent);
});

managerRouter.put('/claude-agents/:id', (req, res) => {
  const agents = loadAgents();
  const idx    = agents.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Agent not found.' });

  const old     = agents[idx];
  const { name, description, tools, systemPrompt } = req.body;

  if (name && name !== old.name) {
    removeAgentFile(old.name);
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ error: 'name must be lowercase alphanumeric with hyphens only.' });
    }
  }

  const updated = {
    ...old,
    name:         name         ?? old.name,
    description:  description  ?? old.description,
    tools:        tools        ?? old.tools,
    systemPrompt: systemPrompt ?? old.systemPrompt,
  };

  agents[idx] = updated;
  saveAgents(agents);
  writeAgentFile(updated);

  return res.json(updated);
});

managerRouter.delete('/claude-agents/:id', (req, res) => {
  const agents = loadAgents();
  const idx    = agents.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Agent not found.' });

  const [removed] = agents.splice(idx, 1);
  saveAgents(agents);
  removeAgentFile(removed.name);

  return res.json({ id: removed.id });
});

/** Write ~/.claude/agents/[name].md with the frontmatter Claude Code requires */
function writeAgentFile(agent) {
  try {
    fs.mkdirSync(CLAUDE_AGENTS_DIR, { recursive: true });
    const toolsLine = agent.tools?.length ? `tools: ${agent.tools.join(', ')}` : '';
    const frontmatter = [
      '---',
      `name: ${agent.name}`,
      `description: ${agent.description || agent.name}`,
      toolsLine,
      '---',
    ].filter(Boolean).join('\n');

    fs.writeFileSync(
      path.join(CLAUDE_AGENTS_DIR, `${agent.name}.md`),
      `${frontmatter}\n\n${agent.systemPrompt}\n`,
      'utf8',
    );
  } catch (e) {
    console.error(`[manager] Failed to write agent file for "${agent.name}":`, e.message);
  }
}

/** Remove ~/.claude/agents/[name].md */
function removeAgentFile(name) {
  try {
    const file = path.join(CLAUDE_AGENTS_DIR, `${name}.md`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (e) {
    console.error(`[manager] Failed to remove agent file "${name}":`, e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FILE SYSTEM HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const SKILLS_DIR = path.join(os.homedir(), '.claude', 'commands');

/** Write ~/.claude/commands/[name].md with frontmatter Claude Code requires */
function writeSkillFile(skill) {
  try {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    const content = `---\ndescription: ${skill.description || skill.name}\n---\n\n${skill.content}`;
    fs.writeFileSync(path.join(SKILLS_DIR, `${skill.name}.md`), content, 'utf8');
  } catch (e) {
    console.error(`[manager] Failed to write skill file for "${skill.name}":`, e.message);
  }
}

/** Remove ~/.claude/commands/[name].md */
function removeSkillFile(name) {
  try {
    const file = path.join(SKILLS_DIR, `${name}.md`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (e) {
    console.error(`[manager] Failed to remove skill file "${name}":`, e.message);
  }
}

/**
 * Write workingDir/CLAUDE.md — preamble + injected skill sections.
 * @param {import('@agent-space/shared').AgentProfile} profile
 * @param {import('@agent-space/shared').Skill[]} allSkills
 */
function writeClaude(profile, allSkills) {
  try {
    const profileSkills = allSkills.filter(s => profile.skills.includes(s.id));
    let content = profile.claudeMd ?? '';

    if (profileSkills.length > 0) {
      content += '\n\n## Skills\n\n';
      for (const skill of profileSkills) {
        content += `### /${skill.name} — ${skill.description}\n\n${skill.content}\n\n`;
      }
    }

    fs.mkdirSync(profile.workingDir, { recursive: true });
    fs.writeFileSync(path.join(profile.workingDir, 'CLAUDE.md'), content.trim() + '\n', 'utf8');
  } catch (e) {
    console.error(`[manager] Failed to write CLAUDE.md for profile "${profile.name}":`, e.message);
  }
}

const SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');

/**
 * Merge agent-space hooks into ~/.claude/settings.json for the profile's workingDir.
 * Uses a safe read-modify-write pattern.
 * @param {import('@agent-space/shared').AgentProfile} profile
 */
function injectHooks(profile) {
  try {
    let settings = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      try { settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); }
      catch { settings = {}; }
    }

    if (!settings.hooks) settings.hooks = {};

    const hookCmd = `node ${JSON.stringify(profile.hooks.hookScript)}`;
    const envVars = `AGENT_SPACE_URL=${profile.hooks.serverUrl} `;
    const command = `${envVars}${hookCmd}`;

    const hookTypes = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop'];
    for (const hookType of hookTypes) {
      if (!Array.isArray(settings.hooks[hookType])) settings.hooks[hookType] = [];

      // Remove existing agent-space entry for this script (avoid duplicates on update)
      settings.hooks[hookType] = settings.hooks[hookType].filter(
        entry => !entry.hooks?.some(h => h.command?.includes(profile.hooks.hookScript))
      );

      settings.hooks[hookType].push({
        matcher: '',
        hooks: [{ type: 'command', command }],
      });
    }

    // Ensure directory exists
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error(`[manager] Failed to inject hooks for profile "${profile.name}":`, e.message);
  }
}
