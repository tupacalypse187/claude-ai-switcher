#!/usr/bin/env node

/**
 * Claude AI Switcher
 *
 * Switch between AI providers (Anthropic, GLM, Alibaba Qwen) for Claude Code.
 * Also provides helper commands to add/remove Alibaba Coding Plan provider for OpenCode.
 */

import { Command } from "commander";
import chalk from "chalk";
import * as readline from "readline";

import {
  providers,
  getModels,
  formatContext,
  ModelTierMap,
  GLM_DEFAULT_TIER_MAP,
  OPENROUTER_DEFAULT_TIER_MAP,
  OLLAMA_DEFAULT_TIER_MAP,
  GEMINI_DEFAULT_TIER_MAP,
  getAlibabaTierMap
} from "./models";
import {
  configureAnthropic as configureClaudeAnthropic,
  configureAlibaba as configureClaudeAlibaba,
  configureGLM as configureClaudeGLM,
  configureOpenRouter as configureClaudeOpenRouter,
  configureOllama as configureClaudeOllama,
  configureGemini as configureClaudeGemini,
  getCurrentProvider as getClaudeProvider,
  claudeSettingsExists
} from "./clients/claude-code";
import {
  configureAlibaba as configureOpenCodeAlibaba,
  configureOpenRouter as configureOpenCodeOpenRouter,
  configureOllama as configureOpenCodeOllama,
  configureGemini as configureOpenCodeGemini,
  getCurrentProvider as getOpenCodeProvider,
  opencodeSettingsExists
} from "./clients/opencode";
import { getApiKey, setApiKey, hasApiKey } from "./config";
import {
  displayModels,
  displaySuccess,
  displayError,
  displayWarning,
  displayProviders
} from "./display";
import { reloadGLMConfig, isCodingHelperInstalled } from "./providers/glm";
import {
  isLitellmInstalled as isLitellmInstalledForOllama,
  isOllamaInstalled,
  isOllamaRunning,
  startLitellmProxy,
  getOllamaConfig,
  findModel as findOllamaModel
} from "./providers/ollama";
import {
  isLitellmInstalled as isLitellmInstalledForGemini,
  isGeminiKeyValid,
  startGeminiLitellmProxy,
  getGeminiConfig,
  findModel as findGeminiModel
} from "./providers/gemini";
import { verifyAllKeys, maskKey } from "./verify";
import {
  installAllHooks,
  installTokenTracker,
  installVisualEnhancements,
  removeTokenTracker,
  removeVisualEnhancements,
  removeAllHooks,
  areHooksInstalled,
  showTokenStatus,
  showVisualStatus,
  resetTokenUsage
} from "./hooks/index";

const program = new Command();

program
  .name("claude-switch")
  .description("Switch between AI providers for Claude Code. Also provides OpenCode helper commands.")
  .version("1.1.1");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function promptApiKey(provider: string, helpUrl: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(chalk.yellow(`\n⚠ ${provider} API Key not found`));
  console.log(chalk.dim(`  Get your API key from: ${helpUrl}`));
  console.log();

  const answer = await new Promise<string>((resolve) => {
    rl.question(`Enter your ${provider} API Key: `, resolve);
  });
  rl.close();

  if (!answer.trim()) {
    displayError("API Key is required");
    process.exit(1);
  }

  return answer.trim();
}

function buildTierMap(
  defaultMap: ModelTierMap,
  opts: { opus?: string; sonnet?: string; haiku?: string }
): ModelTierMap {
  return {
    opus: opts.opus || defaultMap.opus,
    sonnet: opts.sonnet || defaultMap.sonnet,
    haiku: opts.haiku || defaultMap.haiku
  };
}

function displayTierMap(tierMap: ModelTierMap): void {
  console.log(chalk.dim("  Claude model aliases:"));
  console.log(chalk.dim(`    ANTHROPIC_DEFAULT_OPUS_MODEL   → ${tierMap.opus}`));
  console.log(chalk.dim(`    ANTHROPIC_DEFAULT_SONNET_MODEL → ${tierMap.sonnet}`));
  console.log(chalk.dim(`    ANTHROPIC_DEFAULT_HAIKU_MODEL  → ${tierMap.haiku}`));
}

function addTierOptions(cmd: Command): Command {
  return cmd
    .option("--opus <model>", "Override opus tier model alias")
    .option("--sonnet <model>", "Override sonnet tier model alias")
    .option("--haiku <model>", "Override haiku tier model alias");
}

// ---------------------------------------------------------------------------
// Provider switch implementations (Claude Code)
// ---------------------------------------------------------------------------

async function switchAnthropic(): Promise<void> {
  await configureClaudeAnthropic();

  displaySuccess("Switched to Anthropic (default)");
  console.log(chalk.dim("  Provider: Anthropic"));
  console.log(chalk.dim("  Using native Claude models"));
  console.log();
}

async function switchAlibaba(
  model: string | undefined,
  tierOpts: { opus?: string; sonnet?: string; haiku?: string }
): Promise<void> {
  const selectedModel = model || "qwen3.6-plus";

  let apiKey = await getApiKey("alibaba");
  if (!apiKey) {
    apiKey = await promptApiKey(
      "Alibaba",
      "https://modelstudio.console.alibabacloud.com/"
    );
    await setApiKey("alibaba", apiKey);
  }

  const alibabaModels = getModels("alibaba");
  const validModel = alibabaModels.find((m) => m.id === selectedModel);
  if (!validModel) {
    displayError(`Invalid model: ${selectedModel}`);
    console.log(chalk.dim("  Valid models: ") + alibabaModels.map((m) => m.id).join(", "));
    process.exit(1);
  }

  const tierMap = buildTierMap(getAlibabaTierMap(selectedModel), tierOpts);

  await configureClaudeAlibaba(apiKey, selectedModel, tierMap);

  console.log(chalk.green(`\n✓ Switched to: Alibaba Coding Plan`));
  console.log(chalk.dim("─".repeat(60)));
  console.log(`  ${chalk.cyan.bold("Model:")} ${chalk.white(validModel.name)}`);
  console.log(`  ${chalk.cyan.bold("Context:")} ${chalk.yellow(formatContext(validModel.contextWindow))}`);
  console.log(`  ${chalk.cyan.bold("Endpoint:")} ${chalk.dim("https://coding-intl.dashscope.aliyuncs.com/apps/anthropic")}`);
  console.log(`  ${chalk.cyan.bold("Capabilities:")} ${chalk.gray(validModel.capabilities.join(", "))}`);
  console.log(chalk.dim(`  ${validModel.description}`));
  console.log();
  displayTierMap(tierMap);
  console.log();
}

async function switchGLM(tierOpts: { opus?: string; sonnet?: string; haiku?: string }): Promise<void> {
  const hasCodingHelper = await isCodingHelperInstalled();

  if (!hasCodingHelper) {
    displayWarning("coding-helper not found");
    console.log(chalk.dim("  Install with: npm install -g @z_ai/coding-helper"));
    console.log(chalk.dim("  Then run: coding-helper auth"));
    console.log();
  }

  const tierMap = buildTierMap(GLM_DEFAULT_TIER_MAP, tierOpts);

  await configureClaudeGLM(tierMap);
  if (hasCodingHelper) {
    const result = await reloadGLMConfig();
    if (!result.success) {
      displayWarning("coding-helper reload failed, but local config updated");
    }
  }

  displaySuccess("Switched to GLM/Z.AI");
  console.log(chalk.dim("  Provider: GLM/Z.AI"));
  if (hasCodingHelper) console.log(chalk.dim("  Managed by: coding-helper"));
  console.log();
  displayTierMap(tierMap);
  console.log();
}

async function switchOpenRouter(
  model: string | undefined,
  tierOpts: { opus?: string; sonnet?: string; haiku?: string }
): Promise<void> {
  const selectedModel = model || "qwen/qwen3.6-plus:free";

  let apiKey = await getApiKey("openrouter");
  if (!apiKey) {
    apiKey = await promptApiKey(
      "OpenRouter",
      "https://openrouter.ai/settings/keys"
    );
    await setApiKey("openrouter", apiKey);
  }

  const openrouterModels = getModels("openrouter");
  const validModel = openrouterModels.find((m) => m.id === selectedModel);
  if (!validModel) {
    displayError(`Invalid model: ${selectedModel}`);
    console.log(chalk.dim("  Valid models: ") + openrouterModels.map((m) => m.id).join(", "));
    process.exit(1);
  }

  const tierMap = buildTierMap(OPENROUTER_DEFAULT_TIER_MAP, tierOpts);

  await configureClaudeOpenRouter(apiKey, selectedModel, tierMap);

  console.log(chalk.green(`\n✓ Switched to: OpenRouter`));
  console.log(chalk.dim("─".repeat(60)));
  console.log(`  ${chalk.cyan.bold("Model:")} ${chalk.white(validModel.name)}`);
  console.log(`  ${chalk.cyan.bold("Context:")} ${chalk.yellow(formatContext(validModel.contextWindow))}`);
  console.log(`  ${chalk.cyan.bold("Endpoint:")} ${chalk.dim("https://openrouter.ai/api/v1")}`);
  console.log(`  ${chalk.cyan.bold("Capabilities:")} ${chalk.gray(validModel.capabilities.join(", "))}`);
  console.log(chalk.dim(`  ${validModel.description}`));
  console.log();
  displayTierMap(tierMap);
  console.log();
}

async function switchOllama(
  model: string | undefined,
  tierOpts: { opus?: string; sonnet?: string; haiku?: string }
): Promise<void> {
  // Pre-flight: check litellm
  const hasLitellm = await isLitellmInstalledForOllama();
  if (!hasLitellm) {
    displayError("LiteLLM is required for Ollama support");
    console.log(chalk.dim("  Install with: pip install 'litellm[proxy]'"));
    process.exit(1);
  }

  // Pre-flight: check ollama
  const hasOllama = await isOllamaInstalled();
  if (!hasOllama) {
    displayError("Ollama is not installed");
    console.log(chalk.dim("  Install from: https://ollama.com"));
    process.exit(1);
  }

  // Check if Ollama is running
  const ollamaRunning = await isOllamaRunning();
  if (!ollamaRunning) {
    displayError("Ollama is not running");
    console.log(chalk.dim("  Start with: ollama serve"));
    process.exit(1);
  }

  const selectedModel = model || "deepseek-r1:latest";

  const validModel = findOllamaModel(selectedModel);
  if (!validModel) {
    const ollamaModels = getModels("ollama");
    displayError(`Invalid model: ${selectedModel}`);
    console.log(chalk.dim("  Valid models: ") + ollamaModels.map((m) => m.id).join(", "));
    process.exit(1);
  }

  // Start LiteLLM proxy
  const proxyResult = await startLitellmProxy(selectedModel);
  if (!proxyResult.success) {
    displayError(`Failed to start LiteLLM proxy: ${proxyResult.error}`);
    process.exit(1);
  }

  const tierMap = buildTierMap(OLLAMA_DEFAULT_TIER_MAP, tierOpts);

  await configureClaudeOllama(selectedModel, tierMap);

  console.log(chalk.green(`\n✓ Switched to: Ollama (Local)`));
  console.log(chalk.dim("─".repeat(60)));
  console.log(`  ${chalk.cyan.bold("Model:")} ${chalk.white(validModel.name)}`);
  console.log(`  ${chalk.cyan.bold("Context:")} ${chalk.yellow(formatContext(validModel.contextWindow))}`);
  console.log(`  ${chalk.cyan.bold("Endpoint:")} ${chalk.dim("http://localhost:4000 (LiteLLM proxy)")}`);
  console.log(`  ${chalk.cyan.bold("Capabilities:")} ${chalk.gray(validModel.capabilities.join(", "))}`);
  console.log(chalk.dim(`  ${validModel.description}`));
  console.log();
  displayTierMap(tierMap);
  console.log();
}

async function switchGemini(
  model: string | undefined,
  tierOpts: { opus?: string; sonnet?: string; haiku?: string }
): Promise<void> {
  // Pre-flight: check litellm
  const hasLitellm = await isLitellmInstalledForGemini();
  if (!hasLitellm) {
    displayError("LiteLLM is required for Gemini support");
    console.log(chalk.dim("  Install with: pip install 'litellm[proxy]'"));
    process.exit(1);
  }

  const selectedModel = model || "gemini-2.5-pro";

  const validModel = findGeminiModel(selectedModel);
  if (!validModel) {
    const geminiModels = getModels("gemini");
    displayError(`Invalid model: ${selectedModel}`);
    console.log(chalk.dim("  Valid models: ") + geminiModels.map((m) => m.id).join(", "));
    process.exit(1);
  }

  // Get API key
  let apiKey = await getApiKey("gemini");
  if (!apiKey) {
    apiKey = await promptApiKey(
      "Gemini",
      "https://aistudio.google.com/apikey"
    );
    await setApiKey("gemini", apiKey);
  }

  // Start LiteLLM proxy
  const proxyResult = await startGeminiLitellmProxy(apiKey, selectedModel);
  if (!proxyResult.success) {
    displayError(`Failed to start LiteLLM proxy: ${proxyResult.error}`);
    process.exit(1);
  }

  const tierMap = buildTierMap(GEMINI_DEFAULT_TIER_MAP, tierOpts);

  await configureClaudeGemini(apiKey, selectedModel, tierMap);

  console.log(chalk.green(`\n✓ Switched to: Gemini (Google)`));
  console.log(chalk.dim("─".repeat(60)));
  console.log(`  ${chalk.cyan.bold("Model:")} ${chalk.white(validModel.name)}`);
  console.log(`  ${chalk.cyan.bold("Context:")} ${chalk.yellow(formatContext(validModel.contextWindow))}`);
  console.log(`  ${chalk.cyan.bold("Endpoint:")} ${chalk.dim("http://localhost:4001 (LiteLLM proxy)")}`);
  console.log(`  ${chalk.cyan.bold("Capabilities:")} ${chalk.gray(validModel.capabilities.join(", "))}`);
  console.log(chalk.dim(`  ${validModel.description}`));
  console.log();
  displayTierMap(tierMap);
  console.log();
}

// ---------------------------------------------------------------------------
// Top-level commands — Claude Code only
// ---------------------------------------------------------------------------

addTierOptions(
  program
    .command("alibaba [model]")
    .description("Switch Claude Code to Alibaba Coding Plan")
).action(async (model, options) => {
  try {
    await switchAlibaba(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Alibaba");
    process.exit(1);
  }
});

program
  .command("anthropic")
  .description("Switch Claude Code to Anthropic (default)")
  .action(async () => {
    try {
      await switchAnthropic();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to switch to Anthropic");
      process.exit(1);
    }
  });

addTierOptions(
  program
    .command("glm")
    .description("Switch Claude Code to GLM/Z.AI (requires @z_ai/coding-helper)")
).action(async (options) => {
  try {
    await switchGLM(options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to GLM");
    process.exit(1);
  }
});

addTierOptions(
  program
    .command("openrouter [model]")
    .description("Switch Claude Code to OpenRouter")
).action(async (model, options) => {
  try {
    await switchOpenRouter(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to OpenRouter");
    process.exit(1);
  }
});

addTierOptions(
  program
    .command("ollama [model]")
    .description("Switch Claude Code to Ollama (local models, requires LiteLLM proxy)")
).action(async (model, options) => {
  try {
    await switchOllama(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Ollama");
    process.exit(1);
  }
});

addTierOptions(
  program
    .command("gemini [model]")
    .description("Switch Claude Code to Gemini (Google, requires LiteLLM proxy)")
).action(async (model, options) => {
  try {
    await switchGemini(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Gemini");
    process.exit(1);
  }
});

// ---------------------------------------------------------------------------
// `claude` subcommand — explicit Claude Code targeting
// ---------------------------------------------------------------------------

const claudeCmd = program
  .command("claude")
  .description("Configure Claude Code (explicit targeting)");

claudeCmd
  .command("anthropic")
  .description("Switch Claude Code to Anthropic (default)")
  .action(async () => {
    try {
      await switchAnthropic();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to switch to Anthropic");
      process.exit(1);
    }
  });

addTierOptions(
  claudeCmd
    .command("alibaba [model]")
    .description("Switch Claude Code to Alibaba Coding Plan")
).action(async (model, options) => {
  try {
    await switchAlibaba(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Alibaba");
    process.exit(1);
  }
});

addTierOptions(
  claudeCmd
    .command("glm")
    .description("Switch Claude Code to GLM/Z.AI (requires @z_ai/coding-helper)")
).action(async (options) => {
  try {
    await switchGLM(options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to GLM");
    process.exit(1);
  }
});

addTierOptions(
  claudeCmd
    .command("openrouter [model]")
    .description("Switch Claude Code to OpenRouter")
).action(async (model, options) => {
  try {
    await switchOpenRouter(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to OpenRouter");
    process.exit(1);
  }
});

addTierOptions(
  claudeCmd
    .command("ollama [model]")
    .description("Switch Claude Code to Ollama (local models, requires LiteLLM proxy)")
).action(async (model, options) => {
  try {
    await switchOllama(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Ollama");
    process.exit(1);
  }
});

addTierOptions(
  claudeCmd
    .command("gemini [model]")
    .description("Switch Claude Code to Gemini (Google, requires LiteLLM proxy)")
).action(async (model, options) => {
  try {
    await switchGemini(model, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Gemini");
    process.exit(1);
  }
});

// ---------------------------------------------------------------------------
// `opencode` subcommand — OpenCode helper commands
// ---------------------------------------------------------------------------

const opencodeCmd = program
  .command("opencode")
  .description("OpenCode helper commands");

const opencodeAddCmd = opencodeCmd
  .command("add")
  .description("Add a provider to OpenCode");

opencodeAddCmd
  .command("alibaba")
  .description("Add Alibaba Coding Plan provider to OpenCode")
  .action(async () => {
    try {
      let apiKey = await getApiKey("alibaba");
      if (!apiKey) {
        apiKey = await promptApiKey(
          "Alibaba",
          "https://modelstudio.console.alibabacloud.com/"
        );
        await setApiKey("alibaba", apiKey);
      }

      await configureOpenCodeAlibaba(apiKey);

      displaySuccess("Added Alibaba Coding Plan provider to OpenCode");
      console.log(chalk.dim("  Config: ~/.config/opencode/opencode.json"));
      console.log(chalk.dim("  Provider: bailian-coding-plan"));
      console.log(chalk.dim("  Models: qwen3.6-plus, qwen3-max-2026-01-23, qwen3-coder-next, qwen3-coder-plus, MiniMax-M2.5, glm-5, glm-4.7, kimi-k2.5"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to add Alibaba provider");
      process.exit(1);
    }
  });

opencodeAddCmd
  .command("openrouter")
  .description("Add OpenRouter provider to OpenCode")
  .action(async () => {
    try {
      let apiKey = await getApiKey("openrouter");
      if (!apiKey) {
        apiKey = await promptApiKey(
          "OpenRouter",
          "https://openrouter.ai/settings/keys"
        );
        await setApiKey("openrouter", apiKey);
      }

      await configureOpenCodeOpenRouter(apiKey);

      displaySuccess("Added OpenRouter provider to OpenCode");
      console.log(chalk.dim("  Config: ~/.config/opencode/opencode.json"));
      console.log(chalk.dim("  Provider: openrouter"));
      console.log(chalk.dim("  Models: qwen/qwen3.6-plus:free, openrouter/free"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to add OpenRouter provider");
      process.exit(1);
    }
  });

opencodeAddCmd
  .command("ollama")
  .description("Add Ollama provider to OpenCode (requires LiteLLM proxy)")
  .action(async () => {
    try {
      await configureOpenCodeOllama();

      displaySuccess("Added Ollama provider to OpenCode");
      console.log(chalk.dim("  Config: ~/.config/opencode/opencode.json"));
      console.log(chalk.dim("  Provider: ollama"));
      console.log(chalk.dim("  Models: deepseek-r1:latest, qwen2.5-coder:latest, llama3.1:latest, codellama:latest"));
      console.log(chalk.yellow("  Note: Requires LiteLLM proxy running on port 4000"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to add Ollama provider");
      process.exit(1);
    }
  });

opencodeAddCmd
  .command("gemini")
  .description("Add Gemini provider to OpenCode (requires LiteLLM proxy)")
  .action(async () => {
    try {
      let apiKey = await getApiKey("gemini");
      if (!apiKey) {
        apiKey = await promptApiKey(
          "Gemini",
          "https://aistudio.google.com/apikey"
        );
        await setApiKey("gemini", apiKey);
      }

      await configureOpenCodeGemini(apiKey);

      displaySuccess("Added Gemini provider to OpenCode");
      console.log(chalk.dim("  Config: ~/.config/opencode/opencode.json"));
      console.log(chalk.dim("  Provider: gemini"));
      console.log(chalk.dim("  Models: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite"));
      console.log(chalk.yellow("  Note: Requires LiteLLM proxy running on port 4001"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to add Gemini provider");
      process.exit(1);
    }
  });

const opencodeRemoveCmd = opencodeCmd
  .command("remove")
  .description("Remove a provider from OpenCode");

opencodeRemoveCmd
  .command("alibaba")
  .description("Remove Alibaba Coding Plan provider from OpenCode")
  .action(async () => {
    try {
      const { removeProvider } = await import("./clients/opencode");
      await removeProvider("bailian-coding-plan");

      displaySuccess("Removed Alibaba Coding Plan provider from OpenCode");
      console.log(chalk.dim("  Other providers remain unchanged"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to remove Alibaba provider");
      process.exit(1);
    }
  });

opencodeRemoveCmd
  .command("openrouter")
  .description("Remove OpenRouter provider from OpenCode")
  .action(async () => {
    try {
      const { removeProvider } = await import("./clients/opencode");
      await removeProvider("openrouter");

      displaySuccess("Removed OpenRouter provider from OpenCode");
      console.log(chalk.dim("  Other providers remain unchanged"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to remove OpenRouter provider");
      process.exit(1);
    }
  });

opencodeRemoveCmd
  .command("ollama")
  .description("Remove Ollama provider from OpenCode")
  .action(async () => {
    try {
      const { removeProvider } = await import("./clients/opencode");
      await removeProvider("ollama");

      displaySuccess("Removed Ollama provider from OpenCode");
      console.log(chalk.dim("  Other providers remain unchanged"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to remove Ollama provider");
      process.exit(1);
    }
  });

opencodeRemoveCmd
  .command("gemini")
  .description("Remove Gemini provider from OpenCode")
  .action(async () => {
    try {
      const { removeProvider } = await import("./clients/opencode");
      await removeProvider("gemini");

      displaySuccess("Removed Gemini provider from OpenCode");
      console.log(chalk.dim("  Other providers remain unchanged"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to remove Gemini provider");
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Info commands
// ---------------------------------------------------------------------------

program
  .command("status")
  .description("Show current config and verify API keys")
  .action(async () => {
    try {
      // ── Current Configuration ──
      console.log(chalk.green("\n=== Claude AI Switcher Status ===\n"));

      // Claude Code
      console.log(chalk.cyan.bold("  Claude Code:"));
      if (claudeSettingsExists()) {
        const claudeProvider = await getClaudeProvider();
        if (claudeProvider) {
          console.log(`    Provider: ${chalk.white(claudeProvider.provider)}`);
          if (claudeProvider.model) console.log(`    Model: ${chalk.white(claudeProvider.model)}`);
          if (claudeProvider.endpoint) console.log(`    Endpoint: ${chalk.dim(claudeProvider.endpoint)}`);
          if (claudeProvider.tierMap?.opus) {
            console.log(chalk.dim("    Aliases:"));
            console.log(chalk.dim(`      opus   → ${claudeProvider.tierMap.opus}`));
            console.log(chalk.dim(`      sonnet → ${claudeProvider.tierMap.sonnet}`));
            console.log(chalk.dim(`      haiku  → ${claudeProvider.tierMap.haiku}`));
          }
        } else {
          console.log(chalk.dim("    Unable to read configuration"));
        }
      } else {
        console.log(chalk.dim("    Not configured (using defaults)"));
      }

      console.log();

      // OpenCode
      console.log(chalk.cyan.bold("  OpenCode:"));
      if (opencodeSettingsExists()) {
        const opencodeProvider = await getOpenCodeProvider();
        if (opencodeProvider) {
          console.log(`    Provider: ${chalk.white(opencodeProvider.provider)}`);
          if (opencodeProvider.model) console.log(`    Model: ${chalk.white(opencodeProvider.model)}`);
          if (opencodeProvider.endpoint) console.log(`    Endpoint: ${chalk.dim(opencodeProvider.endpoint)}`);
        } else {
          console.log(chalk.dim("    Unable to read configuration"));
        }
      } else {
        console.log(chalk.dim("    Not installed"));
      }

      // ── API Key Verification ──
      console.log();
      console.log(chalk.cyan.bold("  API Key Verification:"));
      console.log(chalk.dim("─".repeat(50)));

      const alibabaKey = await getApiKey("alibaba");
      const openrouterKey = await getApiKey("openrouter");
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      const geminiKey = await getApiKey("gemini");

      // Show spinner while verifying
      const ora = (await import("ora")).default;
      const spinner = ora("Verifying API keys...").start();

      const results = await verifyAllKeys({
        alibaba: alibabaKey,
        openrouter: openrouterKey,
        anthropic: anthropicKey,
        checkGLM: true,
        checkOllama: true,
        gemini: geminiKey
      });

      spinner.stop();

      for (const result of results) {
        const label = result.provider.padEnd(12);
        let icon: string;
        let detail = result.message || "";

        switch (result.status) {
          case "ok":
            icon = chalk.green("✓");
            break;
          case "invalid":
            icon = chalk.red("✗");
            break;
          case "missing":
            icon = chalk.dim("○");
            detail = "No key configured";
            break;
          case "error":
            icon = chalk.yellow("⚠");
            break;
          default:
            icon = chalk.dim("–");
            detail = "Skipped";
        }

        // Show masked key if available
        let keyDisplay = "";
        if (result.provider === "alibaba" && alibabaKey) {
          keyDisplay = chalk.dim(` (${maskKey(alibabaKey)})`);
        } else if (result.provider === "openrouter" && openrouterKey) {
          keyDisplay = chalk.dim(` (${maskKey(openrouterKey)})`);
        } else if (result.provider === "anthropic" && anthropicKey) {
          keyDisplay = chalk.dim(` (${maskKey(anthropicKey)})`);
        } else if (result.provider === "gemini" && geminiKey) {
          keyDisplay = chalk.dim(` (${maskKey(geminiKey)})`);
        }

        console.log(`    ${icon} ${chalk.white(label)} ${chalk.gray(detail)}${keyDisplay}`);
      }

      console.log(chalk.dim("─".repeat(50)));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to get status");
      process.exit(1);
    }
  });

program
  .command("current")
  .description("Show current provider and model for both clients")
  .action(async () => {
    try {
      console.log(chalk.green("\nCurrent Configuration:\n"));

      console.log(chalk.cyan.bold("  Claude Code:"));
      if (claudeSettingsExists()) {
        const claudeProvider = await getClaudeProvider();
        if (claudeProvider) {
          console.log(`    Provider: ${chalk.white(claudeProvider.provider)}`);
          if (claudeProvider.model) console.log(`    Model: ${chalk.white(claudeProvider.model)}`);
          if (claudeProvider.endpoint) console.log(`    Endpoint: ${chalk.dim(claudeProvider.endpoint)}`);
          if (claudeProvider.tierMap?.opus) {
            console.log(chalk.dim("    Model aliases:"));
            console.log(chalk.dim(`      opus   → ${claudeProvider.tierMap.opus}`));
            console.log(chalk.dim(`      sonnet → ${claudeProvider.tierMap.sonnet}`));
            console.log(chalk.dim(`      haiku  → ${claudeProvider.tierMap.haiku}`));
          }
        } else {
          console.log(chalk.dim("    Unable to read configuration"));
        }
      } else {
        console.log(chalk.dim("    Not configured (using defaults)"));
      }

      console.log();

      console.log(chalk.cyan.bold("  OpenCode:"));
      if (opencodeSettingsExists()) {
        const opencodeProvider = await getOpenCodeProvider();
        if (opencodeProvider) {
          console.log(`    Provider: ${chalk.white(opencodeProvider.provider)}`);
          if (opencodeProvider.model) console.log(`    Model: ${chalk.white(opencodeProvider.model)}`);
          if (opencodeProvider.endpoint) console.log(`    Endpoint: ${chalk.dim(opencodeProvider.endpoint)}`);
        } else {
          console.log(chalk.dim("    Unable to read configuration"));
        }
      } else {
        console.log(chalk.dim("    Not configured (using defaults)"));
      }

      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to get current provider");
      process.exit(1);
    }
  });

program
  .command("list")
  .description("List all providers and their models")
  .action(() => {
    const providerList = Object.values(providers).map((p) => ({
      id: p.id,
      name: p.name,
      endpoint: p.endpoint,
      modelCount: p.models.length
    }));

    displayProviders(providerList);

    for (const provider of Object.values(providers)) {
      displayModels(provider.name, provider.models);
    }
  });

program
  .command("models [provider]")
  .description("Show models for a specific provider")
  .action((providerName) => {
    if (!providerName) {
      displayError("Please specify a provider: anthropic, alibaba, openrouter, glm, ollama, or gemini");
      console.log(chalk.dim("  Example: claude-switch models alibaba"));
      process.exit(1);
    }

    const provider = providers[providerName.toLowerCase()];
    if (!provider) {
      displayError(`Unknown provider: ${providerName}`);
      console.log(chalk.dim("  Valid providers: ") + Object.keys(providers).join(", "));
      process.exit(1);
    }

    displayModels(provider.name, provider.models);
  });

program
  .command("key <provider> [apikey]")
  .description("Set or show API key for a provider")
  .action(async (provider, apikey) => {
    try {
      if (!apikey) {
        const hasKey = await hasApiKey(provider);
        if (hasKey) {
          displaySuccess(`API key is set for ${provider}`);
        } else {
          displayWarning(`No API key set for ${provider}`);
          console.log(chalk.dim("  Set with: claude-switch key " + provider + " <your-key>"));
        }
        return;
      }

      await setApiKey(provider, apikey);
      displaySuccess(`API key set for ${provider}`);
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to manage API key");
      process.exit(1);
    }
  });

program
  .command("setup")
  .description("Interactive setup wizard")
  .action(async () => {
    try {
      console.log(chalk.green("\n=== Claude AI Switcher Setup ===\n"));

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

      const hasAlibabaKey = await hasApiKey("alibaba");
      if (!hasAlibabaKey) {
        console.log(chalk.yellow("Alibaba Coding Plan Setup"));
        console.log(chalk.dim("  Get your API key from: https://modelstudio.console.alibabacloud.com/"));
        console.log();

        const answer = await new Promise<string>((resolve) => {
          rl.question("Enter your Alibaba API Key (or press Enter to skip): ", resolve);
        });

        if (answer.trim()) {
          await setApiKey("alibaba", answer.trim());
          displaySuccess("Alibaba API key saved");
        }
      }

      const hasOpenRouterKey = await hasApiKey("openrouter");
      if (!hasOpenRouterKey) {
        console.log(chalk.yellow("\nOpenRouter Setup"));
        console.log(chalk.dim("  Get your API key from: https://openrouter.ai/settings/keys"));
        console.log();

        const answer = await new Promise<string>((resolve) => {
          rl.question("Enter your OpenRouter API Key (or press Enter to skip): ", resolve);
        });

        if (answer.trim()) {
          await setApiKey("openrouter", answer.trim());
          displaySuccess("OpenRouter API key saved");
        }
      }

      const hasGeminiKey = await hasApiKey("gemini");
      if (!hasGeminiKey) {
        console.log(chalk.yellow("\nGemini Setup"));
        console.log(chalk.dim("  Get your API key from: https://aistudio.google.com/apikey"));
        console.log();

        const answer = await new Promise<string>((resolve) => {
          rl.question("Enter your Gemini API Key (or press Enter to skip): ", resolve);
        });

        if (answer.trim()) {
          await setApiKey("gemini", answer.trim());
          displaySuccess("Gemini API key saved");
        }
      }

      rl.close();

      console.log(chalk.green("\n✓ Setup complete!\n"));
      console.log("Available commands:");
      console.log(chalk.dim("  claude-switch alibaba [model]          - Switch Claude Code to Alibaba"));
      console.log(chalk.dim("  claude-switch anthropic                - Switch Claude Code to Anthropic"));
      console.log(chalk.dim("  claude-switch glm                      - Switch Claude Code to GLM/Z.AI"));
      console.log(chalk.dim("  claude-switch openrouter [model]       - Switch Claude Code to OpenRouter"));
      console.log(chalk.dim("  claude-switch ollama [model]           - Switch Claude Code to Ollama"));
      console.log(chalk.dim("  claude-switch gemini [model]           - Switch Claude Code to Gemini"));
      console.log(chalk.dim("  claude-switch claude alibaba           - Explicit Claude Code targeting"));
      console.log(chalk.dim("  claude-switch opencode add alibaba     - Add Alibaba provider to OpenCode"));
      console.log(chalk.dim("  claude-switch opencode add openrouter  - Add OpenRouter provider to OpenCode"));
      console.log(chalk.dim("  claude-switch opencode add ollama      - Add Ollama provider to OpenCode"));
      console.log(chalk.dim("  claude-switch opencode add gemini      - Add Gemini provider to OpenCode"));
      console.log(chalk.dim("  claude-switch opencode remove alibaba  - Remove Alibaba from OpenCode"));
      console.log(chalk.dim("  claude-switch opencode remove openrouter - Remove OpenRouter from OpenCode"));
      console.log(chalk.dim("  claude-switch opencode remove ollama   - Remove Ollama from OpenCode"));
      console.log(chalk.dim("  claude-switch opencode remove gemini   - Remove Gemini from OpenCode"));
      console.log(chalk.dim("  claude-switch openrouter --opus <model> - Custom model aliases"));
      console.log(chalk.dim("  claude-switch list                     - List all providers"));
      console.log(chalk.dim("  claude-switch status                   - Show current config + verify API keys"));
      console.log(chalk.dim("  claude-switch current                  - Show current config"));
      console.log(chalk.dim("  claude-switch hooks install            - Install token tracking & visual enhancements"));
      console.log(chalk.dim("  claude-switch hooks status             - Show token usage and visual status"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Setup failed");
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Hooks commands - Token tracking and visual enhancements
// ---------------------------------------------------------------------------

const hooksCmd = program
  .command("hooks")
  .description("Manage Claude Code hooks (token tracking, visual enhancements)");

hooksCmd
  .command("install")
  .description("Install all visual enhancements and token tracking")
  .action(async () => {
    try {
      const ora = await import("ora").catch(() => null);
      const spinner = ora ? ora.default("Installing hooks...").start() : null;

      await installAllHooks();

      spinner?.stop();
      
      console.log(chalk.green("\n✓ Hooks installed successfully!\n"));
      console.log(chalk.cyan.bold("  Installed:"));
      console.log(chalk.dim("    • Token Tracker (~/.claude/token-tracker.js)"));
      console.log(chalk.dim("    • Visual Enhancements (~/.claude/visual-enhancements.js)"));
      console.log();
      console.log(chalk.yellow("  Usage:"));
      console.log(chalk.dim("    • Token usage is tracked automatically"));
      console.log(chalk.dim("    • Run 'claude-switch hooks status' to see current usage"));
      console.log(chalk.dim("    • Run 'claude-switch hooks reset' to reset counters"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to install hooks");
      process.exit(1);
    }
  });

hooksCmd
  .command("install-token")
  .description("Install only token tracker")
  .action(async () => {
    try {
      await installTokenTracker();
      displaySuccess("Token tracker installed");
      console.log(chalk.dim("  Location: ~/.claude/token-tracker.js"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to install token tracker");
      process.exit(1);
    }
  });

hooksCmd
  .command("install-visual")
  .description("Install only visual enhancements")
  .action(async () => {
    try {
      await installVisualEnhancements();
      displaySuccess("Visual enhancements installed");
      console.log(chalk.dim("  Location: ~/.claude/visual-enhancements.js"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to install visual enhancements");
      process.exit(1);
    }
  });

hooksCmd
  .command("status")
  .description("Show token usage and visual status")
  .action(async () => {
    try {
      const installed = await areHooksInstalled();
      
      console.log(chalk.green("\n=== Hooks Status ===\n"));
      console.log(`  Token Tracker: ${installed.tokenTracking ? chalk.green("✓ Installed") : chalk.red("Not installed")}`);
      console.log(`  Visual Enhancements: ${installed.visualEnhancements ? chalk.green("✓ Installed") : chalk.red("Not installed")}`);
      console.log();
      
      if (installed.tokenTracking) {
        await showTokenStatus();
      }
      
      if (installed.visualEnhancements) {
        await showVisualStatus();
      }
      
      if (!installed.tokenTracking && !installed.visualEnhancements) {
        console.log(chalk.yellow("  Run 'claude-switch hooks install' to install hooks"));
        console.log();
      }
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to get hooks status");
      process.exit(1);
    }
  });

hooksCmd
  .command("reset")
  .description("Reset token usage counters")
  .action(async () => {
    try {
      await resetTokenUsage();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to reset token usage");
      process.exit(1);
    }
  });

hooksCmd
  .command("remove")
  .description("Remove all hooks")
  .action(async () => {
    try {
      await removeAllHooks();
      displaySuccess("All hooks removed");
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to remove hooks");
      process.exit(1);
    }
  });

hooksCmd
  .command("remove-token")
  .description("Remove token tracker")
  .action(async () => {
    try {
      await removeTokenTracker();
      displaySuccess("Token tracker removed");
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to remove token tracker");
      process.exit(1);
    }
  });

hooksCmd
  .command("remove-visual")
  .description("Remove visual enhancements")
  .action(async () => {
    try {
      await removeVisualEnhancements();
      displaySuccess("Visual enhancements removed");
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to remove visual enhancements");
      process.exit(1);
    }
  });

program.parse();
