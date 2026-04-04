/**
 * OpenCode Client Handler
 *
 * Manages ~/.config/opencode/opencode.json for OpenCode
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";

export interface OpenCodeSettings {
  $schema?: string;
  provider?: Record<string, any>;
  mcpServers?: Record<string, any>;
  agents?: Record<string, any>;
  [key: string]: any;
}

/**
 * Get the OpenCode config path
 * Priority: ~/.config/opencode/opencode.json
 */
export function getOpenCodeConfigPath(): string {
  return path.join(os.homedir(), ".config", "opencode", "opencode.json");
}

/**
 * Check if OpenCode settings file exists
 */
export function opencodeSettingsExists(): boolean {
  const configPath = getOpenCodeConfigPath();
  return fs.existsSync(configPath);
}

/**
 * Read current OpenCode settings
 */
export async function readOpenCodeSettings(): Promise<OpenCodeSettings> {
  const configPath = getOpenCodeConfigPath();
  
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const content = await fs.readFile(configPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Write OpenCode settings with backup
 */
export async function writeOpenCodeSettings(settings: OpenCodeSettings): Promise<void> {
  const configPath = getOpenCodeConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure directory exists
  await fs.ensureDir(configDir);

  // Backup existing settings if they exist
  if (opencodeSettingsExists()) {
    const backupPath = `${configPath}.backup.${Date.now()}`;
    await fs.copyFile(configPath, backupPath);
  }

  // Write new settings
  await fs.writeFile(configPath, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Configure OpenCode for Alibaba Coding Plan
 * Writes the full provider configuration with all models
 */
export async function configureAlibaba(apiKey: string): Promise<void> {
  const settings = await readOpenCodeSettings();

  // Set schema
  settings.$schema = "https://opencode.ai/config.json";

  // Configure bailian-coding-plan provider with all models
  settings.provider = settings.provider || {};
  settings.provider["bailian-coding-plan"] = {
    npm: "@ai-sdk/anthropic",
    name: "Model Studio Coding Plan",
    options: {
      baseURL: "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1",
      apiKey: apiKey
    },
    models: {
      "qwen3.5-plus": {
        name: "Qwen3.5 Plus",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 8192
          }
        },
        limit: {
          context: 1000000,
          output: 65536
        }
      },
      "qwen3-max-2026-01-23": {
        name: "Qwen3 Max 2026-01-23",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        limit: {
          context: 262144,
          output: 32768
        }
      },
      "qwen3-coder-next": {
        name: "Qwen3 Coder Next",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        limit: {
          context: 262144,
          output: 65536
        }
      },
      "qwen3-coder-plus": {
        name: "Qwen3 Coder Plus",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        limit: {
          context: 1000000,
          output: 65536
        }
      },
      "MiniMax-M2.5": {
        name: "MiniMax M2.5",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 8192
          }
        },
        limit: {
          context: 196608,
          output: 24576
        }
      },
      "glm-5": {
        name: "GLM-5",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 8192
          }
        },
        limit: {
          context: 202752,
          output: 16384
        }
      },
      "glm-4.7": {
        name: "GLM-4.7",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 8192
          }
        },
        limit: {
          context: 202752,
          output: 16384
        }
      },
      "kimi-k2.5": {
        name: "Kimi K2.5",
        modalities: {
          input: ["text", "image"],
          output: ["text"]
        },
        options: {
          thinking: {
            type: "enabled",
            budgetTokens: 8192
          }
        },
        limit: {
          context: 262144,
          output: 32768
        }
      }
    }
  };

  await writeOpenCodeSettings(settings);
}

/**
 * Configure OpenCode for Anthropic (default)
 * Removes bailian-coding-plan provider to use native Anthropic
 */
export async function configureAnthropic(): Promise<void> {
  const settings = await readOpenCodeSettings();

  // Remove bailian-coding-plan provider
  if (settings.provider?.["bailian-coding-plan"]) {
    delete settings.provider["bailian-coding-plan"];
  }

  // Remove openrouter provider
  if (settings.provider?.["openrouter"]) {
    delete settings.provider["openrouter"];
  }

  // Clean up empty provider object
  if (settings.provider && Object.keys(settings.provider).length === 0) {
    delete settings.provider;
  }

  await writeOpenCodeSettings(settings);
}

/**
 * Configure OpenCode for GLM
 * GLM is managed by coding-helper, so we don't modify the config here
 */
export async function configureGLM(): Promise<void> {
  // GLM configuration is managed by coding-helper
  // No changes needed to opencode.json
}

/**
 * Configure OpenCode for OpenRouter
 * Writes the openrouter provider with available models
 */
export async function configureOpenRouter(apiKey: string): Promise<void> {
  const settings = await readOpenCodeSettings();

  // Set schema
  settings.$schema = "https://opencode.ai/config.json";

  // Configure openrouter provider with models
  settings.provider = settings.provider || {};
  settings.provider["openrouter"] = {
    npm: "@ai-sdk/openai",
    name: "OpenRouter",
    options: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey
    },
    models: {
      "qwen/qwen3.6-plus:free": {
        name: "Qwen3.6 Plus (Free)",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        limit: {
          context: 131072,
          output: 32768
        }
      },
      "openrouter/free": {
        name: "OpenRouter Free",
        modalities: {
          input: ["text"],
          output: ["text"]
        },
        limit: {
          context: 131072,
          output: 32768
        }
      }
    }
  };

  await writeOpenCodeSettings(settings);
}

/**
 * Remove a specific provider from OpenCode settings
 * Only removes the named provider, preserving others
 */
export async function removeProvider(providerKey: string): Promise<void> {
  const settings = await readOpenCodeSettings();

  if (settings.provider?.[providerKey]) {
    delete settings.provider[providerKey];
  }

  // Clean up empty provider object
  if (settings.provider && Object.keys(settings.provider).length === 0) {
    delete settings.provider;
  }

  await writeOpenCodeSettings(settings);
}

/**
 * Get current provider from OpenCode settings
 */
export async function getCurrentProvider(): Promise<{
  provider: string;
  model?: string;
  endpoint?: string;
} | null> {
  if (!opencodeSettingsExists()) {
    return { provider: "anthropic" };
  }

  const settings = await readOpenCodeSettings();

  // Check for bailian-coding-plan (Alibaba) configuration
  if (settings.provider?.["bailian-coding-plan"]) {
    return {
      provider: "alibaba",
      endpoint: settings.provider["bailian-coding-plan"].options?.baseURL
    };
  }

  // Check for openrouter configuration
  if (settings.provider?.["openrouter"]) {
    return {
      provider: "openrouter",
      endpoint: "https://openrouter.ai/api/v1"
    };
  }

  return { provider: "anthropic" };
}
