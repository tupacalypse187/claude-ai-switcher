/**
 * OpenRouter Provider Configuration
 *
 * Configures Claude Code and OpenCode to use OpenRouter
 * with models like Qwen3.6 Plus and OpenRouter Free via Anthropic-compatible API.
 */

import { providers, openrouterModels } from "../models";

export const OPENROUTER_PROVIDER = providers.openrouter;

export interface OpenRouterConfig {
  provider: "openrouter";
  apiKey: string;
  model: string;
  endpoint: string;
}

export const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1";

export function getOpenRouterConfig(apiKey: string, model?: string): OpenRouterConfig {
  return {
    provider: "openrouter",
    apiKey,
    model: model || "qwen/qwen3.6-plus:free",
    endpoint: OPENROUTER_ENDPOINT
  };
}

/**
 * Get available OpenRouter models
 */
export function getAvailableModels() {
  return openrouterModels;
}

/**
 * Find a model by ID
 */
export function findModel(modelId: string) {
  return openrouterModels.find(m => m.id === modelId);
}
