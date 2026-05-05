/**
 * Ollama Provider Configuration
 *
 * Uses local Ollama models via a LiteLLM proxy for Anthropic API compatibility.
 * Ollama only speaks OpenAI format, so LiteLLM translates Anthropic Messages API
 * requests into OpenAI Chat Completions format.
 *
 * Prerequisites:
 * - Ollama installed and running on port 11434
 * - LiteLLM installed (pip install 'litellm[proxy]')
 * - LiteLLM proxy running on port 4000
 */

import { platform } from "os";
import { providers, ollamaModels } from "../models";

export const OLLAMA_PROVIDER = providers.ollama;

export interface OllamaConfig {
  provider: "ollama";
  model: string;
  endpoint: string;
}

export const OLLAMA_ENDPOINT = "http://localhost:4000";
export const OLLAMA_LITELLM_PORT = 4000;
export const OLLAMA_PORT = 11434;

export function getOllamaConfig(model?: string): OllamaConfig {
  return {
    provider: "ollama",
    model: model || "deepseek-r1:latest",
    endpoint: OLLAMA_ENDPOINT
  };
}

export function getAvailableModels() {
  return ollamaModels;
}

export function findModel(modelId: string) {
  return ollamaModels.find(m => m.id === modelId);
}

/**
 * Check if litellm is installed
 */
export async function isLitellmInstalled(): Promise<boolean> {
  try {
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
 * Check if ollama is installed
 */
export async function isOllamaInstalled(): Promise<boolean> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const cmd = platform() === "win32" ? "where ollama" : "which ollama";
    await execAsync(cmd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Ollama is running on port 11434
 */
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`http://localhost:${OLLAMA_PORT}/api/tags`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Check if LiteLLM proxy is running on a given port
 */
export async function isLitellmProxyRunning(port: number = OLLAMA_LITELLM_PORT): Promise<boolean> {
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
 * Start LiteLLM proxy for Ollama as a detached background process
 */
export async function startLitellmProxy(model: string, port: number = OLLAMA_LITELLM_PORT): Promise<{ success: boolean; error?: string }> {
  try {
    // Already running?
    if (await isLitellmProxyRunning(port)) {
      return { success: true };
    }

    const { spawn } = await import("child_process");
    const child = spawn("litellm", ["--model", `ollama/${model}`, "--port", String(port)], {
      detached: true,
      stdio: "ignore",
      shell: false
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
