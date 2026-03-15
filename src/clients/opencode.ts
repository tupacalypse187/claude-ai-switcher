/**
 * OpenCode Client Handler
 * 
 * Manages ~/.opencode.json for OpenCode
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

export interface OpenCodeSettings {
  mcpServers?: Record<string, any>;
  providers?: Record<string, any>;
  agents?: Record<string, any>;
  [key: string]: any;
}

const OPENCODE_CONFIG_PATHS = [
  path.join(os.homedir(), ".opencode.json"),
  path.join(os.homedir(), ".config", "opencode", ".opencode.json")
];

/**
 * Find existing OpenCode config file
 */
export function findOpenCodeConfig(): string | null {
  for (const configPath of OPENCODE_CONFIG_PATHS) {
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

/**
 * Get the primary config path (first existing or default)
 */
export function getOpenCodeConfigPath(): string {
  const existing = findOpenCodeConfig();
  if (existing) return existing;
  return OPENCODE_CONFIG_PATHS[0]; // Default to ~/.opencode.json
}

/**
 * Check if OpenCode settings file exists
 */
export function opencodeSettingsExists(): boolean {
  return findOpenCodeConfig() !== null;
}

/**
 * Read current OpenCode settings
 */
export async function readOpenCodeSettings(): Promise<OpenCodeSettings> {
  const configPath = findOpenCodeConfig();
  if (!configPath) {
    return {};
  }
  
  const content = await fs.readFile(configPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Write OpenCode settings with backup
 */
export async function writeOpenCodeSettings(settings: OpenCodeSettings): Promise<void> {
  const configPath = getOpenCodeConfigPath();
  const configDir = path.dirname(configPath);
  
  // Ensure directory exists
  await fs.ensureDir(configDir);
  
  // Backup existing settings if they exist
  if (opencodeSettingsExists()) {
    const existingPath = findOpenCodeConfig();
    if (existingPath && existingPath !== configPath) {
      // Copy from existing location to new location
      await fs.copyFile(existingPath, configPath);
    }
    const backupPath = `${configPath}.backup.${Date.now()}`;
    await fs.copyFile(configPath, backupPath);
  }
  
  // Write new settings
  await fs.writeFile(configPath, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Configure OpenCode for Alibaba Coding Plan
 */
export async function configureAlibaba(apiKey: string, model: string): Promise<void> {
  const settings = await readOpenCodeSettings();
  
  // Configure provider for Alibaba (OpenAI-compatible format)
  settings.providers = settings.providers || {};
  settings.providers["alibaba"] = {
    apiKey,
    disabled: false,
    baseURL: "https://coding-intl.dashscope.aliyuncs.com/v1"
  };
  
  // Configure agents to use Alibaba model
  settings.agents = settings.agents || {};
  settings.agents["coder"] = settings.agents["coder"] || {};
  settings.agents["coder"].model = `alibaba/${model}`;
  
  await writeOpenCodeSettings(settings);
}

/**
 * Configure OpenCode for Anthropic (default)
 */
export async function configureAnthropic(): Promise<void> {
  const settings = await readOpenCodeSettings();
  
  // Remove Alibaba provider override
  if (settings.providers?.["alibaba"]) {
    delete settings.providers["alibaba"];
  }
  
  // Reset agent models to default (Anthropic)
  if (settings.agents?.["coder"]?.model?.startsWith("alibaba/")) {
    delete settings.agents["coder"].model;
  }
  
  await writeOpenCodeSettings(settings);
}

/**
 * Configure OpenCode for GLM
 */
export async function configureGLM(apiKey?: string): Promise<void> {
  const settings = await readOpenCodeSettings();
  
  // Configure provider for GLM if API key provided
  if (apiKey) {
    settings.providers = settings.providers || {};
    settings.providers["zhipu"] = {
      apiKey,
      disabled: false
    };
  }
  
  await writeOpenCodeSettings(settings);
}

/**
 * Get current provider from OpenCode settings
 */
export async function getCurrentProvider(): Promise<{
  provider: string;
  model?: string;
  endpoint?: string;
} | null> {
  if (!opencodeSettingsExists()) {
    return { provider: "anthropic" };
  }
  
  const settings = await readOpenCodeSettings();
  
  // Check for Alibaba configuration
  if (settings.providers?.["alibaba"] && !settings.providers["alibaba"].disabled) {
    const coderModel = settings.agents?.["coder"]?.model;
    const model = coderModel?.replace("alibaba/", "");
    return {
      provider: "alibaba",
      model,
      endpoint: settings.providers["alibaba"].baseURL
    };
  }
  
  // Check for GLM/Zhipu configuration
  if (settings.providers?.["zhipu"] && !settings.providers["zhipu"].disabled) {
    return {
      provider: "glm",
      model: settings.agents?.["coder"]?.model?.replace("zhipu/", "")
    };
  }
  
  return { provider: "anthropic" };
}
