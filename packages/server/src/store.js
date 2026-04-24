/**
 * store.js — Simple JSON file persistence for AgentProfiles, Skills and ClaudeAgents.
 *
 * Data lives in ~/.claude/agent-space/
 *   profiles.json  — AgentProfile[]
 *   skills.json    — Skill[]
 *   agents.json    — ClaudeAgent[]
 */

import fs   from 'fs';
import path from 'path';
import os   from 'os';

const DATA_DIR      = path.join(os.homedir(), '.claude', 'agent-space');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const SKILLS_FILE   = path.join(DATA_DIR, 'skills.json');
const AGENTS_FILE   = path.join(DATA_DIR, 'agents.json');

/** Ensure the data directory and all JSON files exist. */
export function initStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROFILES_FILE)) fs.writeFileSync(PROFILES_FILE, '[]', 'utf8');
  if (!fs.existsSync(SKILLS_FILE))   fs.writeFileSync(SKILLS_FILE,   '[]', 'utf8');
  if (!fs.existsSync(AGENTS_FILE))   fs.writeFileSync(AGENTS_FILE,   '[]', 'utf8');
}

// ── Skills ────────────────────────────────────────────────────────────────────

/** @returns {import('@agent-space/shared').Skill[]} */
export function loadSkills() {
  try { return JSON.parse(fs.readFileSync(SKILLS_FILE, 'utf8')); }
  catch { return []; }
}

/** @param {import('@agent-space/shared').Skill[]} skills */
export function saveSkills(skills) {
  fs.writeFileSync(SKILLS_FILE, JSON.stringify(skills, null, 2), 'utf8');
}

// ── Agent Profiles ────────────────────────────────────────────────────────────

/** @returns {import('@agent-space/shared').AgentProfile[]} */
export function loadProfiles() {
  try { return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8')); }
  catch { return []; }
}

/** @param {import('@agent-space/shared').AgentProfile[]} profiles */
export function saveProfiles(profiles) {
  fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf8');
}

// ── Claude Agents ─────────────────────────────────────────────────────────────

/** @returns {import('@agent-space/shared').ClaudeAgent[]} */
export function loadAgents() {
  try { return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8')); }
  catch { return []; }
}

/** @param {import('@agent-space/shared').ClaudeAgent[]} agents */
export function saveAgents(agents) {
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf8');
}
