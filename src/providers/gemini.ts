/**
 * Gemini Provider Configuration
 *
 * Uses Google Gemini models via a LiteLLM proxy for Anthropic API compatibility.
 * Gemini only speaks OpenAI format, so LiteLLM translates Anthropic Messages API
 * requests into OpenAI Chat Completions format.
 *
 * Prerequisites:
 * - LiteLLM installed (pip install 'litellm[proxy]')
 * - Google API key from https://aistudio.google.com/apikey
 * - LiteLLM proxy running on port 4001
 */

import { providers, geminiModels } from "../models.js";

export const GEMINI_PROVIDER = providers.gemini;

export interface GeminiConfig {
  provider: "gemini";
  apiKey: string;
  model: string;
  endpoint: string;
}

export const GEMINI_ENDPOINT = "http://localhost:4001";
export const GEMINI_LITELLM_PORT = 4001;

export function getGeminiConfig(apiKey: string, model?: string): GeminiConfig {
  return {
    provider: "gemini",
    apiKey,
    model: model || "gemini-2.5-pro",
    endpoint: GEMINI_ENDPOINT
  };
}

export function getAvailableModels() {
  return geminiModels;
}

export function findModel(modelId: string) {
  return geminiModels.find(m => m.id === modelId);
}

/**
 * Check if litellm is installed
 */
export async function isLitellmInstalled(): Promise<boolean> {
  try {
    const { platform } = await import("os");
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const cmd = platform() === "win32" ? "where litellm" : "which litellm";
    await execAsync(cmd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a Gemini API key by hitting the models endpoint
 */
export async function isGeminiKeyValid(apiKey: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Check if LiteLLM proxy is running on the Gemini port
 */
export async function isLitellmProxyRunning(port: number = GEMINI_LITELLM_PORT): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`http://localhost:${port}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Start LiteLLM proxy for Gemini as a detached background process
 */
export async function startGeminiLitellmProxy(
  apiKey: string,
  model: string,
  port: number = GEMINI_LITELLM_PORT
): Promise<{ success: boolean; error?: string }> {
  try {
    // Already running?
    if (await isLitellmProxyRunning(port)) {
      return { success: true };
    }

    const { spawn } = await import("child_process");
    const child = spawn("litellm", ["--model", `gemini/${model}`, "--port", String(port)], {
      detached: true,
      stdio: "ignore",
      shell: true,
      env: { ...process.env, GEMINI_API_KEY: apiKey }
    });
    child.unref();

    // Poll health endpoint for up to 5 seconds
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (await isLitellmProxyRunning(port)) {
        return { success: true };
      }
    }

    return { success: false, error: "LiteLLM proxy did not start within 5 seconds" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start LiteLLM proxy"
    };
  }
}
