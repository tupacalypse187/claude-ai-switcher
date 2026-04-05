/**
 * Configuration Manager
 * 
 * Manages API keys and settings in ~/.claude-ai-switcher/config.json
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".claude-ai-switcher");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export interface UserConfig {
  alibabaApiKey?: string;
  openrouterApiKey?: string;
  geminiApiKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
}

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  await fs.ensureDir(CONFIG_DIR);
}

/**
 * Read user configuration
 */
export async function readConfig(): Promise<UserConfig> {
  if (!fs.existsSync(CONFIG_FILE)) {
    return {};
  }
  
  const content = await fs.readFile(CONFIG_FILE, "utf-8");
  return JSON.parse(content);
}

/**
 * Write user configuration
 */
export async function writeConfig(config: UserConfig): Promise<void> {
  await ensureConfigDir();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Get API key for a provider
 */
export async function getApiKey(provider: string): Promise<string | undefined> {
  const config = await readConfig();
  
  switch (provider) {
    case "alibaba":
      return config.alibabaApiKey;
    case "openrouter":
      return config.openrouterApiKey;
    case "gemini":
      return config.geminiApiKey;
    default:
      return undefined;
  }
}

/**
 * Set API key for a provider
 */
export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  const config = await readConfig();
  
  switch (provider) {
    case "alibaba":
      config.alibabaApiKey = apiKey;
      break;
    case "openrouter":
      config.openrouterApiKey = apiKey;
      break;
    case "gemini":
      config.geminiApiKey = apiKey;
      break;
  }
  
  await writeConfig(config);
}

/**
 * Check if API key is set for a provider
 */
export async function hasApiKey(provider: string): Promise<boolean> {
  const apiKey = await getApiKey(provider);
  return !!apiKey;
}

/**
 * Get config file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}
