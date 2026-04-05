/**
 * Alibaba Coding Plan Provider Configuration
 * 
 * Configures Claude Code and OpenCode to use Alibaba's Coding Plan
 * with Qwen, GLM, Kimi, and MiniMax models via Anthropic-compatible API.
 */

import { providers, alibabaModels } from "../models.js";

export const ALIBABA_PROVIDER = providers.alibaba;

export interface AlibabaConfig {
  provider: "alibaba";
  apiKey: string;
  model: string;
  endpoint: string;
}

export const ALIBABA_ENDPOINT = "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic";
export const ALIBABA_VERIFY_URL = "https://coding-intl.dashscope.aliyuncs.com/compatible-mode/v1/models";

export function getAlibabaConfig(apiKey: string, model?: string): AlibabaConfig {
  return {
    provider: "alibaba",
    apiKey,
    model: model || "qwen3.5-plus",
    endpoint: ALIBABA_ENDPOINT
  };
}

/**
 * Get available Alibaba models
 */
export function getAvailableModels() {
  return alibabaModels;
}

/**
 * Find a model by ID
 */
export function findModel(modelId: string) {
  return alibabaModels.find(m => m.id === modelId);
}
