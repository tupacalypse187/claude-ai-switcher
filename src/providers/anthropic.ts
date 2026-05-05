/**
 * Anthropic Provider Configuration
 * 
 * Sets Claude Code and OpenCode to use native Anthropic models
 * by removing MCP overrides and using default settings.
 */

import { providers } from "../models";

export const ANTHROPIC_PROVIDER = providers.anthropic;

export interface AnthropicConfig {
  provider: "anthropic";
  apiKey?: string;
  model?: string;
}

export function getAnthropicConfig(): AnthropicConfig {
  return {
    provider: "anthropic",
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-6-20250205"
  };
}
