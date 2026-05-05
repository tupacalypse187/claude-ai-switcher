/**
 * Hook Manager
 *
 * Installs and manages Claude Code hooks for:
 * - Token tracking
 * - Visual enhancements (context bar, model display)
 * - Custom system prompts
 *
 * Hooks are installed to ~/.claude/ directory
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const TOKEN_TRACKER_SRC = path.join(__dirname, "..", "hooks", "token-tracker.js");
const VISUAL_ENHANCEMENTS_SRC = path.join(__dirname, "..", "hooks", "visual-enhancements.js");
const TOKEN_TRACKER_DEST = path.join(CLAUDE_DIR, "token-tracker.js");
const VISUAL_ENHANCEMENTS_DEST = path.join(CLAUDE_DIR, "visual-enhancements.js");
const HOOKS_CONFIG = path.join(CLAUDE_DIR, "hooks-config.json");

export interface HooksConfig {
  tokenTracking: boolean;
  visualEnhancements: boolean;
  customPrompts: boolean;
  lastInstalled?: string;
}

/**
 * Check if hooks are installed
 */
export async function areHooksInstalled(): Promise<{
  tokenTracking: boolean;
  visualEnhancements: boolean;
}> {
  return {
    tokenTracking: await fs.pathExists(TOKEN_TRACKER_DEST),
    visualEnhancements: await fs.pathExists(VISUAL_ENHANCEMENTS_DEST)
  };
}

/**
 * Install token tracker hook
 */
export async function installTokenTracker(): Promise<void> {
  if (!await fs.pathExists(TOKEN_TRACKER_SRC)) {
    throw new Error("Token tracker source not found. Please rebuild the project.");
  }

  await fs.ensureDir(CLAUDE_DIR);
  await fs.copy(TOKEN_TRACKER_SRC, TOKEN_TRACKER_DEST, { overwrite: true });
  
  // Update hooks config
  const config = await readHooksConfig();
  config.tokenTracking = true;
  config.lastInstalled = new Date().toISOString();
  await writeHooksConfig(config);
}

/**
 * Install visual enhancements hook
 */
export async function installVisualEnhancements(): Promise<void> {
  if (!await fs.pathExists(VISUAL_ENHANCEMENTS_SRC)) {
    throw new Error("Visual enhancements source not found. Please rebuild the project.");
  }

  await fs.ensureDir(CLAUDE_DIR);
  await fs.copy(VISUAL_ENHANCEMENTS_SRC, VISUAL_ENHANCEMENTS_DEST, { overwrite: true });
  
  // Update hooks config
  const config = await readHooksConfig();
  config.visualEnhancements = true;
  config.lastInstalled = new Date().toISOString();
  await writeHooksConfig(config);
}

/**
 * Install all hooks
 */
export async function installAllHooks(): Promise<void> {
  await installTokenTracker();
  await installVisualEnhancements();
}

/**
 * Remove token tracker hook
 */
export async function removeTokenTracker(): Promise<void> {
  if (await fs.pathExists(TOKEN_TRACKER_DEST)) {
    await fs.remove(TOKEN_TRACKER_DEST);
  }
  
  const config = await readHooksConfig();
  config.tokenTracking = false;
  await writeHooksConfig(config);
}

/**
 * Remove visual enhancements hook
 */
export async function removeVisualEnhancements(): Promise<void> {
  if (await fs.pathExists(VISUAL_ENHANCEMENTS_DEST)) {
    await fs.remove(VISUAL_ENHANCEMENTS_DEST);
  }
  
  const config = await readHooksConfig();
  config.visualEnhancements = false;
  await writeHooksConfig(config);
}

/**
 * Remove all hooks
 */
export async function removeAllHooks(): Promise<void> {
  await removeTokenTracker();
  await removeVisualEnhancements();
}

/**
 * Read hooks configuration
 */
async function readHooksConfig(): Promise<HooksConfig> {
  if (!await fs.pathExists(HOOKS_CONFIG)) {
    return {
      tokenTracking: false,
      visualEnhancements: false,
      customPrompts: false
    };
  }

  try {
    const content = await fs.readFile(HOOKS_CONFIG, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      tokenTracking: false,
      visualEnhancements: false,
      customPrompts: false
    };
  }
}

/**
 * Write hooks configuration
 */
async function writeHooksConfig(config: HooksConfig): Promise<void> {
  await fs.writeFile(HOOKS_CONFIG, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Run token tracker display
 */
export async function showTokenStatus(): Promise<void> {
  if (!await fs.pathExists(TOKEN_TRACKER_DEST)) {
    console.log("Token tracker not installed. Run: claude-switch hooks install");
    return;
  }

  try {
    delete require.cache[require.resolve(TOKEN_TRACKER_DEST)];
    const tracker = require(TOKEN_TRACKER_DEST);
    tracker.showStatus();
  } catch (error) {
    console.error("Failed to run token tracker:", error);
  }
}

/**
 * Run visual enhancements display
 */
export async function showVisualStatus(): Promise<void> {
  if (!await fs.pathExists(VISUAL_ENHANCEMENTS_DEST)) {
    console.log("Visual enhancements not installed. Run: claude-switch hooks install");
    return;
  }

  try {
    delete require.cache[require.resolve(VISUAL_ENHANCEMENTS_DEST)];
    const visuals = require(VISUAL_ENHANCEMENTS_DEST);
    visuals.displayStatus();
  } catch (error) {
    console.error("Failed to run visual enhancements:", error);
  }
}

/**
 * Reset token usage
 */
export async function resetTokenUsage(): Promise<void> {
  if (!await fs.pathExists(TOKEN_TRACKER_DEST)) {
    console.log("Token tracker not installed. Run: claude-switch hooks install");
    return;
  }

  try {
    delete require.cache[require.resolve(TOKEN_TRACKER_DEST)];
    const tracker = require(TOKEN_TRACKER_DEST);
    tracker.resetTokenUsage();
    console.log("Token usage reset complete.");
  } catch (error) {
    console.error("Failed to reset token usage:", error);
  }
}
