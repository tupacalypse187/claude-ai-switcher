export interface Model {
  id: string;
  name: string;
  contextWindow: number; // in tokens
  capabilities: string[];
  description: string;
}

export interface Provider {
  id: string;
  name: string;
  endpoint?: string;
  models: Model[];
}

export interface ModelTierMap {
  opus: string;
  sonnet: string;
  haiku: string;
}

// Default GLM tier map: best model per tier
export const GLM_DEFAULT_TIER_MAP: ModelTierMap = {
  opus: "glm-5.1",
  sonnet: "glm-5v-turbo",
  haiku: "glm-5-turbo"
};

// Default OpenRouter tier map
export const OPENROUTER_DEFAULT_TIER_MAP: ModelTierMap = {
  opus: "qwen/qwen3.6-plus:free",
  sonnet: "openrouter/free",
  haiku: "openrouter/free"
};

// Default Ollama tier map (via LiteLLM proxy on port 4000)
export const OLLAMA_DEFAULT_TIER_MAP: ModelTierMap = {
  opus: "deepseek-r1:latest",
  sonnet: "qwen2.5-coder:latest",
  haiku: "llama3.1:latest"
};

// Default Gemini tier map (via LiteLLM proxy on port 4001)
export const GEMINI_DEFAULT_TIER_MAP: ModelTierMap = {
  opus: "gemini-2.5-pro",
  sonnet: "gemini-2.5-flash",
  haiku: "gemini-2.5-flash-lite"
};

// For Alibaba: tier mapping based on model capabilities
// Default mapping when no specific model chosen: Opus = qwen3.6-plus, Sonnet = kimi-k2.5, Haiku = glm-5
// When specific model selected: Opus = selected model, Sonnet = qwen3.6-plus, Haiku = kimi-k2.5
export function getAlibabaTierMap(model: string): ModelTierMap {
  // Use custom defaults when using the default model
  if (model === "qwen3.6-plus") {
    return {
      opus: "qwen3.6-plus",
      sonnet: "kimi-k2.5",
      haiku: "glm-5"
    };
  } else {
    // For other specific models, use the selected model as opus
    return {
      opus: model,
      sonnet: "qwen3.6-plus",
      haiku: "kimi-k2.5"
    };
  }
}

// Format context window for display
export function formatContext(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(0)}M tokens`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K tokens`;
  }
  return `${tokens} tokens`;
}

// Alibaba Coding Plan Models
export const alibabaModels: Model[] = [
  {
    id: "qwen3.6-plus",
    name: "Qwen3.6-Plus",
    contextWindow: 1000000,
    capabilities: ["Text Generation", "Deep Thinking", "Visual Understanding"],
    description: "Balanced performance, speed, and cost. Supports thinking/non-thinking modes with 1M context window."
  },
  {
    id: "qwen3-max-2026-01-23",
    name: "Qwen3-Max (2026-01-23)",
    contextWindow: 262144,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "Most capable model for complex, multi-step tasks with enhanced reasoning."
  },
  {
    id: "qwen3-coder-next",
    name: "Qwen3-Coder-Next",
    contextWindow: 262144,
    capabilities: ["Text Generation", "Coding Agent"],
    description: "Next-generation coding model with advanced Coding Agent capabilities, tool calling, and autonomous programming."
  },
  {
    id: "qwen3-coder-plus",
    name: "Qwen3-Coder-Plus",
    contextWindow: 1000000,
    capabilities: ["Text Generation", "Coding"],
    description: "Latest code generation model with Coding Agent support, tool calling, and autonomous programming capabilities. 1M context for large codebases."
  },
  {
    id: "glm-5",
    name: "GLM-5",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "Zhipu's flagship model with enhanced reasoning and deep thinking capabilities."
  },
  {
    id: "glm-4.7",
    name: "GLM-4.7",
    contextWindow: 256000,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "Zhipu's balanced model with strong reasoning and code understanding."
  },
  {
    id: "glm-4.7-flash",
    name: "GLM-4.7-Flash",
    contextWindow: 256000,
    capabilities: ["Text Generation", "Fast Inference"],
    description: "Zhipu's fast inference model optimized for speed while maintaining quality."
  },
  {
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Deep Thinking", "Visual Understanding"],
    description: "Moonshot AI's Kimi model with 200K context and multimodal capabilities."
  },
  {
    id: "MiniMax-M2.5",
    name: "MiniMax-M2.5",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "MiniMax's advanced model with strong reasoning and generation capabilities."
  }
];

// GLM/Z.AI Models (via coding-helper)
export const glmModels: Model[] = [
  {
    id: "glm-5.1",
    name: "GLM-5.1",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "Zhipu's most advanced model with state-of-the-art reasoning and deep thinking capabilities."
  },
  {
    id: "glm-5v-turbo",
    name: "GLM-5V-Turbo",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Deep Thinking", "Visual Understanding", "Visual Programming"],
    description: "Zhipu's first multimodal coding foundation model. Natively understands images, videos, design drafts, and screenshots for visual programming."
  },
  {
    id: "glm-5-turbo",
    name: "GLM-5-Turbo",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Deep Thinking", "Fast Responses"],
    description: "Zhipu's fast turbo model combining strong reasoning with low latency."
  },
  {
    id: "glm-5",
    name: "GLM-5",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "Zhipu's flagship model with enhanced reasoning and deep thinking capabilities."
  },
  {
    id: "glm-4.7",
    name: "GLM-4.7",
    contextWindow: 256000,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "Zhipu's balanced model with strong reasoning and code understanding."
  },
  {
    id: "glm-4.7-flash",
    name: "GLM-4.7-Flash",
    contextWindow: 256000,
    capabilities: ["Text Generation", "Fast Inference"],
    description: "Zhipu's fast inference model optimized for speed while maintaining quality."
  }
];

// OpenRouter Models
export const openrouterModels: Model[] = [
  {
    id: "qwen/qwen3.6-plus:free",
    name: "Qwen3.6 Plus (Free)",
    contextWindow: 131072,
    capabilities: ["Text Generation", "Deep Thinking"],
    description: "Free Qwen3.6 Plus model via OpenRouter with strong reasoning capabilities."
  },
  {
    id: "openrouter/free",
    name: "OpenRouter Free",
    contextWindow: 131072,
    capabilities: ["Text Generation"],
    description: "OpenRouter's free tier model for basic usage."
  }
];

// Ollama Models (local, via LiteLLM proxy)
export const ollamaModels: Model[] = [
  {
    id: "deepseek-r1:latest",
    name: "DeepSeek R1",
    contextWindow: 128000,
    capabilities: ["Text Generation", "Deep Thinking", "Reasoning"],
    description: "DeepSeek's reasoning model with deep thinking capabilities for complex problem-solving."
  },
  {
    id: "qwen2.5-coder:latest",
    name: "Qwen 2.5 Coder",
    contextWindow: 128000,
    capabilities: ["Text Generation", "Coding", "Tool Calling"],
    description: "Alibaba's code-specialized model with strong coding and tool calling capabilities."
  },
  {
    id: "llama3.1:latest",
    name: "Llama 3.1",
    contextWindow: 128000,
    capabilities: ["Text Generation", "Code", "Vision"],
    description: "Meta's Llama 3.1 with strong general performance, code generation, and vision support."
  },
  {
    id: "codellama:latest",
    name: "Code Llama",
    contextWindow: 100000,
    capabilities: ["Text Generation", "Coding"],
    description: "Meta's code-specialized Llama model optimized for code generation and understanding."
  }
];

// Gemini Models (via LiteLLM proxy)
export const geminiModels: Model[] = [
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    contextWindow: 1000000,
    capabilities: ["Text Generation", "Deep Thinking", "Code", "Vision"],
    description: "Google's most capable Gemini model with deep thinking, 1M context, and multimodal support."
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    contextWindow: 1000000,
    capabilities: ["Text Generation", "Fast Responses", "Code"],
    description: "Google's fast Gemini model with 1M context, optimized for speed while maintaining quality."
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    contextWindow: 1000000,
    capabilities: ["Text Generation", "Cost-optimized"],
    description: "Google's cost-optimized Gemini model with 1M context for budget-conscious usage."
  }
];

// Anthropic Models (default)
export const anthropicModels: Model[] = [
  {
    id: "claude-opus-4-6-20250205",
    name: "Claude Opus 4.6",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Code", "Vision", "Complex Reasoning"],
    description: "Anthropic's most powerful model for complex tasks requiring deep expertise."
  },
  {
    id: "claude-opus-4-5-20251101",
    name: "Claude Opus 4.5",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Code", "Vision", "Complex Reasoning"],
    description: "Previous generation Opus model with excellent performance."
  },
  {
    id: "claude-sonnet-4-6-20250219",
    name: "Claude Sonnet 4.6",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Code", "Vision"],
    description: "Balanced model offering great performance at lower cost."
  },
  {
    id: "claude-sonnet-4-5-20250814",
    name: "Claude Sonnet 4.5",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Code", "Vision"],
    description: "Previous generation Sonnet model with strong capabilities."
  },
  {
    id: "claude-haiku-4-5-20251015",
    name: "Claude Haiku 4.5",
    contextWindow: 200000,
    capabilities: ["Text Generation", "Fast Responses"],
    description: "Anthropic's fastest model for quick, simple tasks."
  }
];

// Provider definitions
export const providers: Record<string, Provider> = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Default)",
    models: anthropicModels
  },
  alibaba: {
    id: "alibaba",
    name: "Alibaba Coding Plan",
    endpoint: "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic",
    models: alibabaModels
  },
  glm: {
    id: "glm",
    name: "GLM/Z.AI",
    models: glmModels
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1",
    models: openrouterModels
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    endpoint: "http://localhost:4000",
    models: ollamaModels
  },
  gemini: {
    id: "gemini",
    name: "Gemini (Google)",
    endpoint: "http://localhost:4001",
    models: geminiModels
  }
};

// Get model by ID from a provider
export function getModel(providerId: string, modelId: string): Model | undefined {
  const provider = providers[providerId];
  if (!provider) return undefined;
  return provider.models.find(m => m.id === modelId);
}

// Get all models for a provider
export function getModels(providerId: string): Model[] {
  const provider = providers[providerId];
  if (!provider) return [];
  return provider.models;
}
