#!/usr/bin/env node

/**
 * Claude AI Switcher
 *
 * Switch between AI providers (Anthropic, GLM, Alibaba Qwen)
 * for Claude Code and OpenCode
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
  getAlibabaTierMap
} from "./models.js";
import {
  configureAnthropic as configureClaudeAnthropic,
  configureAlibaba as configureClaudeAlibaba,
  configureGLM as configureClaudeGLM,
  getCurrentProvider as getClaudeProvider,
  claudeSettingsExists
} from "./clients/claude-code.js";
import {
  configureAnthropic as configureOpenCodeAnthropic,
  configureAlibaba as configureOpenCodeAlibaba,
  configureGLM as configureOpenCodeGLM,
  getCurrentProvider as getOpenCodeProvider,
  opencodeSettingsExists
} from "./clients/opencode.js";
import { getApiKey, setApiKey, hasApiKey } from "./config.js";
import {
  displayModels,
  displaySuccess,
  displayError,
  displayWarning,
  displayProviders
} from "./display.js";
import { reloadGLMConfig, isCodingHelperInstalled } from "./providers/glm.js";

const program = new Command();

program
  .name("claude-switch")
  .description("Switch between AI providers for Claude Code and OpenCode")
  .version("1.0.0");

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
// Provider switch implementations
// ---------------------------------------------------------------------------

async function switchAnthropic(targets: { claude: boolean; opencode: boolean }): Promise<void> {
  if (targets.claude) await configureClaudeAnthropic();
  if (targets.opencode) await configureOpenCodeAnthropic();

  displaySuccess("Switched to Anthropic (default)");
  console.log(chalk.dim("  Provider: Anthropic"));
  console.log(chalk.dim("  Using native Claude models"));
  console.log();
}

async function switchAlibaba(
  model: string | undefined,
  targets: { claude: boolean; opencode: boolean },
  tierOpts: { opus?: string; sonnet?: string; haiku?: string }
): Promise<void> {
  const selectedModel = model || "qwen3.5-plus";

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

  if (targets.claude) await configureClaudeAlibaba(apiKey, selectedModel, tierMap);
  if (targets.opencode) await configureOpenCodeAlibaba(apiKey, selectedModel);

  console.log(chalk.green(`\n✓ Switched to: Alibaba Coding Plan`));
  console.log(chalk.dim("─".repeat(60)));
  console.log(`  ${chalk.cyan.bold("Model:")} ${chalk.white(validModel.name)}`);
  console.log(`  ${chalk.cyan.bold("Context:")} ${chalk.yellow(formatContext(validModel.contextWindow))}`);
  console.log(`  ${chalk.cyan.bold("Endpoint:")} ${chalk.dim("https://coding-intl.dashscope.aliyuncs.com/apps/anthropic")}`);
  console.log(`  ${chalk.cyan.bold("Capabilities:")} ${chalk.gray(validModel.capabilities.join(", "))}`);
  console.log(chalk.dim(`  ${validModel.description}`));
  if (targets.claude) {
    console.log();
    displayTierMap(tierMap);
  }
  console.log();
}

async function switchGLM(
  targets: { claude: boolean; opencode: boolean },
  tierOpts: { opus?: string; sonnet?: string; haiku?: string }
): Promise<void> {
  const hasCodingHelper = await isCodingHelperInstalled();

  if (!hasCodingHelper) {
    displayWarning("coding-helper not found");
    console.log(chalk.dim("  Install with: npm install -g @z_ai/coding-helper"));
    console.log();
  }

  const tierMap = buildTierMap(GLM_DEFAULT_TIER_MAP, tierOpts);

  if (targets.claude) {
    await configureClaudeGLM(tierMap);
    if (hasCodingHelper) {
      const result = await reloadGLMConfig();
      if (!result.success) {
        displayWarning("coding-helper reload failed, but local config updated");
      }
    }
  }
  if (targets.opencode) await configureOpenCodeGLM();

  displaySuccess("Switched to GLM/Z.AI");
  console.log(chalk.dim("  Provider: GLM/Z.AI"));
  if (hasCodingHelper) console.log(chalk.dim("  Managed by: coding-helper"));
  if (targets.claude) {
    console.log();
    displayTierMap(tierMap);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Top-level commands — update BOTH claude and opencode
// ---------------------------------------------------------------------------

program
  .command("anthropic")
  .description("Switch both Claude Code and OpenCode to Anthropic (default)")
  .action(async () => {
    try {
      await switchAnthropic({ claude: true, opencode: true });
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to switch to Anthropic");
      process.exit(1);
    }
  });

addTierOptions(
  program
    .command("alibaba [model]")
    .description("Switch both Claude Code and OpenCode to Alibaba Coding Plan")
).action(async (model, options) => {
  try {
    await switchAlibaba(model, { claude: true, opencode: true }, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Alibaba");
    process.exit(1);
  }
});

addTierOptions(
  program
    .command("glm")
    .description("Switch both Claude Code and OpenCode to GLM/Z.AI")
).action(async (options) => {
  try {
    await switchGLM({ claude: true, opencode: true }, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to GLM");
    process.exit(1);
  }
});

// ---------------------------------------------------------------------------
// `claude` subcommand — Claude Code only
// ---------------------------------------------------------------------------

const claudeCmd = program
  .command("claude")
  .description("Configure Claude Code only");

claudeCmd
  .command("anthropic")
  .description("Switch Claude Code to Anthropic (default)")
  .action(async () => {
    try {
      await switchAnthropic({ claude: true, opencode: false });
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
    await switchAlibaba(model, { claude: true, opencode: false }, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to Alibaba");
    process.exit(1);
  }
});

addTierOptions(
  claudeCmd
    .command("glm")
    .description("Switch Claude Code to GLM/Z.AI")
).action(async (options) => {
  try {
    await switchGLM({ claude: true, opencode: false }, options);
  } catch (error) {
    displayError(error instanceof Error ? error.message : "Failed to switch to GLM");
    process.exit(1);
  }
});

// ---------------------------------------------------------------------------
// `opencode` subcommand — OpenCode only
// ---------------------------------------------------------------------------

const opencodeCmd = program
  .command("opencode")
  .description("Configure OpenCode only");

opencodeCmd
  .command("anthropic")
  .description("Switch OpenCode to Anthropic (default)")
  .action(async () => {
    try {
      await switchAnthropic({ claude: false, opencode: true });
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to switch to Anthropic");
      process.exit(1);
    }
  });

opencodeCmd
  .command("alibaba [model]")
  .description("Switch OpenCode to Alibaba Coding Plan")
  .action(async (model) => {
    try {
      await switchAlibaba(model, { claude: false, opencode: true }, {});
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to switch to Alibaba");
      process.exit(1);
    }
  });

opencodeCmd
  .command("glm")
  .description("Switch OpenCode to GLM/Z.AI")
  .action(async () => {
    try {
      await switchGLM({ claude: false, opencode: true }, {});
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Failed to switch to GLM");
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Info commands
// ---------------------------------------------------------------------------

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
      displayError("Please specify a provider: anthropic, alibaba, or glm");
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

      rl.close();

      console.log(chalk.green("\n✓ Setup complete!\n"));
      console.log("Available commands:");
      console.log(chalk.dim("  claude-switch anthropic               - Switch both to Anthropic"));
      console.log(chalk.dim("  claude-switch alibaba [model]         - Switch both to Alibaba"));
      console.log(chalk.dim("  claude-switch glm                     - Switch both to GLM/Z.AI"));
      console.log(chalk.dim("  claude-switch claude anthropic        - Claude Code only"));
      console.log(chalk.dim("  claude-switch opencode alibaba        - OpenCode only"));
      console.log(chalk.dim("  claude-switch alibaba --opus <model>  - Custom model aliases"));
      console.log(chalk.dim("  claude-switch list                    - List all providers"));
      console.log(chalk.dim("  claude-switch current                 - Show current config"));
      console.log();
    } catch (error) {
      displayError(error instanceof Error ? error.message : "Setup failed");
      process.exit(1);
    }
  });

program.parse();
