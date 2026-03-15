/**
 * GLM/Z.AI Provider Configuration
 * 
 * Uses coding-helper to manage GLM Coding Plan settings.
 * This provider delegates to the @z_ai/coding-helper package.
 */

import { providers, glmModels } from "../models.js";

export const GLM_PROVIDER = providers.glm;

export interface GLMConfig {
  provider: "glm";
  apiKey?: string;
  model?: string;
}

export function getGLMConfig(): GLMConfig {
  return {
    provider: "glm",
    model: process.env.ZHIPUAI_MODEL || process.env.ZAI_MODEL || "glm-5"
  };
}

/**
 * Check if coding-helper is installed
 */
export async function isCodingHelperInstalled(): Promise<boolean> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    
    await execAsync("which coding-helper");
    return true;
  } catch {
    return false;
  }
}

/**
 * Reload GLM configuration into Claude Code using coding-helper
 */
export async function reloadGLMConfig(): Promise<{ success: boolean; error?: string }> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);
    
    await execAsync("coding-helper auth reload claude");
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to reload GLM config"
    };
  }
}
