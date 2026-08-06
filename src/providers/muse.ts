/**
 * Muse Provider Configuration
 *
 * Uses Meta's Muse Spark models via https://api.meta.ai
 * with Anthropic-compatible API. Requires MODEL_API_KEY stored
 * as museApiKey in ~/.claude-ai-switcher/config.json.
 *
 * Env vars written to ~/.claude/settings.json (per Muse docs):
 *   ANTHROPIC_BASE_URL=https://api.meta.ai
 *   ANTHROPIC_AUTH_TOKEN=$MODEL_API_KEY
 *   ANTHROPIC_MODEL=muse-spark-1.2[-contributor]
 *   ANTHROPIC_DEFAULT_OPUS_MODEL / SONNET / HAIKU — tier aliases
 *   CLAUDE_CODE_SUBAGENT_MODEL — sub-agent model
 *   ENABLE_TOOL_SEARCH=true
 */

import { providers, museModels } from "../models";

export const MUSE_PROVIDER = providers.muse;

export interface MuseConfig {
  provider: "muse";
  apiKey: string;
  model: string;
  endpoint: string;
}

export const MUSE_ENDPOINT = "https://api.meta.ai";

export function getMuseConfig(apiKey: string, model?: string): MuseConfig {
  return {
    provider: "muse",
    apiKey,
    model: model || "muse-spark-1.2-contributor",
    endpoint: MUSE_ENDPOINT
  };
}

export function getAvailableModels() {
  return museModels;
}

export function findModel(modelId: string) {
  return museModels.find(m => m.id === modelId);
}
