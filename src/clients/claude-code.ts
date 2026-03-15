/**
 * Claude Code Client Handler
 * 
 * Manages ~/.claude/settings.json and ~/.claude.json for Claude Code
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { ModelTierMap } from "../models.js";

export interface ClaudeSettings {
  mcpServers?: Record<string, any>;
  [key: string]: any;
}

export interface ClaudeJson {
  hasCompletedOnboarding?: boolean;
  [key: string]: any;
}

export interface MCPService {
  type: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");
const CLAUDE_JSON = path.join(os.homedir(), ".claude.json");

const TIER_ENV_KEYS = {
  opus: "ANTHROPIC_DEFAULT_OPUS_MODEL",
  sonnet: "ANTHROPIC_DEFAULT_SONNET_MODEL",
  haiku: "ANTHROPIC_DEFAULT_HAIKU_MODEL"
} as const;

function applyTierMap(settings: ClaudeSettings, tierMap: ModelTierMap): void {
  settings.env = settings.env || {};
  settings.env[TIER_ENV_KEYS.opus] = tierMap.opus;
  settings.env[TIER_ENV_KEYS.sonnet] = tierMap.sonnet;
  settings.env[TIER_ENV_KEYS.haiku] = tierMap.haiku;
}

function clearTierMap(settings: ClaudeSettings): void {
  if (settings.env) {
    delete settings.env[TIER_ENV_KEYS.opus];
    delete settings.env[TIER_ENV_KEYS.sonnet];
    delete settings.env[TIER_ENV_KEYS.haiku];
    if (Object.keys(settings.env).length === 0) {
      delete settings.env;
    }
  }
}

/**
 * Check if Claude settings file exists
 */
export function claudeSettingsExists(): boolean {
  return fs.existsSync(SETTINGS_FILE);
}

/**
 * Check if ~/.claude.json exists
 */
export function claudeJsonExists(): boolean {
  return fs.existsSync(CLAUDE_JSON);
}

/**
 * Read current Claude settings
 */
export async function readClaudeSettings(): Promise<ClaudeSettings> {
  if (!claudeSettingsExists()) {
    return {};
  }
  
  const content = await fs.readFile(SETTINGS_FILE, "utf-8");
  return JSON.parse(content);
}

/**
 * Read ~/.claude.json
 */
export async function readClaudeJson(): Promise<ClaudeJson> {
  if (!claudeJsonExists()) {
    return {};
  }
  
  const content = await fs.readFile(CLAUDE_JSON, "utf-8");
  return JSON.parse(content);
}

/**
 * Write Claude settings with backup
 */
export async function writeClaudeSettings(settings: ClaudeSettings): Promise<void> {
  // Ensure directory exists
  await fs.ensureDir(CLAUDE_DIR);
  
  // Backup existing settings if they exist
  if (claudeSettingsExists()) {
    const backupPath = `${SETTINGS_FILE}.backup.${Date.now()}`;
    await fs.copyFile(SETTINGS_FILE, backupPath);
  }
  
  // Write new settings
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Write ~/.claude.json with backup
 */
export async function writeClaudeJson(config: ClaudeJson): Promise<void> {
  // Backup existing file if it exists
  if (claudeJsonExists()) {
    const backupPath = `${CLAUDE_JSON}.backup.${Date.now()}`;
    await fs.copyFile(CLAUDE_JSON, backupPath);
  }
  
  // Write new config
  await fs.writeFile(CLAUDE_JSON, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Ensure hasCompletedOnboarding is set to true in ~/.claude.json
 * This prevents "Unable to connect to Anthropic services" error
 */
export async function ensureOnboardingComplete(): Promise<void> {
  const config = await readClaudeJson();
  config.hasCompletedOnboarding = true;
  await writeClaudeJson(config);
}

/**
 * Configure Claude Code for Alibaba Coding Plan
 */
export async function configureAlibaba(apiKey: string, model: string, tierMap: ModelTierMap): Promise<void> {
  await ensureOnboardingComplete();

  const settings = await readClaudeSettings();

  settings.env = settings.env || {};
  settings.env["ANTHROPIC_AUTH_TOKEN"] = apiKey;
  settings.env["ANTHROPIC_BASE_URL"] = "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic";
  settings.env["ANTHROPIC_MODEL"] = model;

  applyTierMap(settings, tierMap);
  await writeClaudeSettings(settings);
}

/**
 * Configure Claude Code for Anthropic (default)
 * Removes MCP overrides and tier map env vars to use native Claude
 */
export async function configureAnthropic(): Promise<void> {
  await ensureOnboardingComplete();

  const settings = await readClaudeSettings();

  if (settings.mcpServers) {
    delete settings.mcpServers["alibaba-coding-plan"];
    delete settings.mcpServers["glm-coding-plan"];
  }

  // Clear Alibaba env vars
  if (settings.env) {
    delete settings.env["ANTHROPIC_AUTH_TOKEN"];
    delete settings.env["ANTHROPIC_BASE_URL"];
    delete settings.env["ANTHROPIC_MODEL"];
  }

  clearTierMap(settings);
  await writeClaudeSettings(settings);
}

/**
 * Configure Claude Code for GLM via coding-helper
 */
export async function configureGLM(tierMap: ModelTierMap): Promise<void> {
  await ensureOnboardingComplete();

  const settings = await readClaudeSettings();
  applyTierMap(settings, tierMap);
  await writeClaudeSettings(settings);
}

/**
 * Get current provider from Claude settings
 */
export async function getCurrentProvider(): Promise<{
  provider: string;
  model?: string;
  endpoint?: string;
  tierMap?: { opus?: string; sonnet?: string; haiku?: string };
} | null> {
  if (!claudeSettingsExists()) {
    return { provider: "anthropic" };
  }

  const settings = await readClaudeSettings();

  const tierMap = settings.env ? {
    opus: settings.env[TIER_ENV_KEYS.opus],
    sonnet: settings.env[TIER_ENV_KEYS.sonnet],
    haiku: settings.env[TIER_ENV_KEYS.haiku]
  } : undefined;

  // Check for Alibaba via env vars
  if (settings.env?.["ANTHROPIC_BASE_URL"]?.includes("coding-intl.dashscope.aliyuncs.com")) {
    return {
      provider: "alibaba",
      model: settings.env["ANTHROPIC_MODEL"],
      endpoint: settings.env["ANTHROPIC_BASE_URL"],
      tierMap
    };
  }

  // Check for GLM via MCP server
  if (settings.mcpServers?.["glm-coding-plan"]) {
    return {
      provider: "glm",
      model: settings.mcpServers["glm-coding-plan"].model,
      tierMap
    };
  }

  return { provider: "anthropic" };
}
