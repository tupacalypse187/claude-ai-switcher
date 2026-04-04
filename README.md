# Claude AI Switcher

Switch between AI providers (Anthropic, GLM, Alibaba Qwen, OpenRouter) for **Claude Code** with ease. Also provides helper commands to manage providers for **OpenCode**.

## Features

- **Quick Switching**: Switch between Anthropic, GLM/Z.AI, Alibaba Coding Plan, and OpenRouter with a single command
- **Model Aliases**: Automatically sets `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` in Claude Code's settings so you always know what model is active
- **Custom Tier Overrides**: Use `--opus`, `--sonnet`, `--haiku` to pin specific models per tier
- **Model Information**: See model capabilities, context windows, and descriptions when switching
- **Secure Storage**: API keys stored locally in `~/.claude-ai-switcher/config.json`
- **Safe Configuration**: Backs up existing settings before any modifications
- **Auto Onboarding**: Automatically sets `hasCompletedOnboarding: true` to prevent connection errors
- **OpenCode Helper**: Add/remove provider configurations for OpenCode with simple commands

## Installation

```bash
cd claude-ai-switcher
npm install
npm run build
npm link  # Install globally
```

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Full Support | Default development platform |
| Linux | ✅ Full Support | All features supported |
| Windows 11 | ✅ Full Support | Use Git Bash, WSL, or PowerShell for build commands |

### Windows Notes

- Build commands (`npm install`, `npm run build`) should be run in Git Bash, WSL, or PowerShell
- The CLI works in any terminal after installation
- GLM/Z.AI provider requires `coding-helper` to be in your PATH
- The `clean` script uses `rimraf` for cross-platform compatibility

## Quick Start

```bash
# Run setup wizard (recommended for first-time use)
claude-switch setup

# Switch Claude Code to Alibaba Coding Plan
claude-switch alibaba

# Switch Claude Code with specific model
claude-switch alibaba qwen3.5-plus

# Switch Claude Code to OpenRouter (free models)
claude-switch openrouter

# Switch back to default Anthropic
claude-switch anthropic

# Add Alibaba provider to OpenCode
claude-switch opencode add alibaba

# Add OpenRouter provider to OpenCode
claude-switch opencode add openrouter

# Remove providers
claude-switch opencode remove alibaba
claude-switch opencode remove openrouter
```

## Commands

### Switch Claude Code (top-level commands)

```bash
claude-switch anthropic
claude-switch alibaba
claude-switch alibaba qwen3.5-plus       # specific model
claude-switch glm
claude-switch openrouter                   # default: qwen/qwen3.6-plus:free
claude-switch openrouter openrouter/free   # specific model
```

### Switch Claude Code (explicit targeting)

```bash
claude-switch claude anthropic
claude-switch claude alibaba
claude-switch claude alibaba qwen3.5-plus
claude-switch claude glm
claude-switch claude openrouter
claude-switch claude openrouter qwen/qwen3.6-plus:free
```

### OpenCode Helper Commands

Add or remove the Alibaba Coding Plan provider from OpenCode configuration:

```bash
# Add Alibaba Coding Plan provider to OpenCode
claude-switch opencode add alibaba

# Remove Alibaba Coding Plan provider from OpenCode
claude-switch opencode remove alibaba
```

**Note**: OpenCode configuration is stored at `~/.config/opencode/opencode.json`. The `add` command adds the `bailian-coding-plan` provider with all available models. The `remove` command removes only the `bailian-coding-plan` provider, preserving any other providers you have configured.

### Model Aliases (Claude Code)

When switching Claude Code to a non-Anthropic provider, the tool writes model alias env vars into `~/.claude/settings.json` so Claude Code knows which model to route each tier to:

| Env Var | Default (Alibaba) | Default (GLM) | Default (OpenRouter) |
|---------|-------------------|---------------|---------------------|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | selected model (e.g., `qwen3.5-plus`) | `glm-5-turbo` | `qwen/qwen3.6-plus:free` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `qwen3.5-plus` (balanced) | `glm-5` | `openrouter/free` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `kimi-k2.5` (fast, 1M context) | `glm-4.7` | `openrouter/free` |

Override any tier at switch time:

```bash
# Set all three tiers (default for Alibaba)
claude-switch alibaba qwen3.5-plus

# Override individual tiers
claude-switch alibaba --opus qwen3-max-2026-01-23 --sonnet qwen3.5-plus --haiku glm-5

# Custom configuration with specific model assignments
claude-switch alibaba --opus qwen3.5-plus --sonnet kimi-k2.5 --haiku glm-5

# GLM with custom haiku tier
claude-switch glm --haiku glm-4.7

# OpenRouter with custom tiers
claude-switch openrouter --sonnet qwen/qwen3.6-plus:free --haiku openrouter/free
```

Switching back to Anthropic clears these env vars so native Claude models are used again.

### View Information

```bash
# Show current configuration for both clients
claude-switch current

# List all providers and models
claude-switch list

# Show models for specific provider
claude-switch models alibaba
claude-switch models glm
claude-switch models anthropic
```

### API Key Management

```bash
# Set API key
claude-switch key alibaba <your-api-key>

# Check if API key is set
claude-switch key alibaba
```

### Setup

```bash
# Interactive setup wizard
claude-switch setup
```

## Available Models

### Alibaba Coding Plan

| Model | Context | Capabilities |
|-------|---------|--------------|
| qwen3.5-plus | 1M tokens | Text Generation, Deep Thinking, Visual Understanding |
| qwen3-max-2026-01-23 | 262K tokens | Text Generation, Deep Thinking |
| qwen3-coder-next | 262K tokens | Text Generation (Advanced Coding Agent) |
| qwen3-coder-plus | 1M tokens | Text Generation (Code, Tool Calling, Autonomous) |
| glm-5 | 200K tokens | Text Generation, Deep Thinking |
| glm-4.7 | 256K tokens | Text Generation, Deep Thinking |
| glm-4.7-flash | 256K tokens | Text Generation, Fast Inference |
| kimi-k2.5 | 1M tokens | Text Generation, Deep Thinking, Visual |
| MiniMax-M2.5 | 256K tokens | Text Generation, Deep Thinking |

### GLM/Z.AI (via coding-helper)

| Model | Context | Capabilities |
|-------|---------|--------------|
| glm-5-turbo | 200K tokens | Text Generation, Deep Thinking, Fast Responses |
| glm-5 | 200K tokens | Text Generation, Deep Thinking |
| glm-4.7 | 256K tokens | Text Generation, Deep Thinking |

### Anthropic (Default)

| Model | Context | Capabilities |
|-------|---------|--------------|
| claude-opus-4-6-20250205 | 200K tokens | Text, Code, Vision, Complex Reasoning |
| claude-opus-4-5-20251101 | 200K tokens | Text, Code, Vision, Complex Reasoning |
| claude-sonnet-4-6-20250219 | 200K tokens | Text, Code, Vision |
| claude-sonnet-4-5-20250814 | 200K tokens | Text, Code, Vision |
| claude-haiku-4-5-20251015 | 200K tokens | Text, Fast Responses |

### OpenRouter

| Model | Context | Capabilities |
|-------|---------|--------------|
| `qwen/qwen3.6-plus:free` | 131K tokens | Text Generation, Deep Thinking |
| `openrouter/free` | 131K tokens | Text Generation |

## Configuration Files

| Client | Config File | Purpose |
|--------|-------------|---------|
| Claude Code | `~/.claude/settings.json` | Environment variables for provider config + model alias env vars |
| Claude Code | `~/.claude.json` | `hasCompletedOnboarding` flag |
| OpenCode | `~/.config/opencode/opencode.json` | Provider configuration (bailian-coding-plan) |
| API Keys | `~/.claude-ai-switcher/config.json` | Secure local API key storage |

## How It Works

### Claude Code Configuration

When you switch Claude Code to Alibaba, the tool writes these environment variables to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY",
    "ANTHROPIC_BASE_URL": "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic",
    "ANTHROPIC_MODEL": "qwen3.5-plus",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen3.5-plus",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "kimi-k2.5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5"
  }
}
```

- `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` — Route Claude Code to Alibaba's endpoint
- `ANTHROPIC_DEFAULT_*_MODEL` — Map Claude's model tiers (opus/sonnet/haiku) to specific Alibaba models

Switching back to Anthropic clears all these env vars.

### OpenRouter Configuration

When you switch Claude Code to OpenRouter, the tool writes these environment variables to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "YOUR_OPENROUTER_API_KEY",
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api/v1",
    "ANTHROPIC_MODEL": "qwen/qwen3.6-plus:free",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen/qwen3.6-plus:free",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "openrouter/free",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "openrouter/free"
  }
}
```

- `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` — Route Claude Code to OpenRouter's endpoint
- `ANTHROPIC_DEFAULT_*_MODEL` — Map Claude's model tiers (opus/sonnet/haiku) to specific OpenRouter models

### OpenCode Configuration

When you run `claude-switch opencode add alibaba`, the tool writes the `bailian-coding-plan` provider to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "bailian-coding-plan": {
      "npm": "@ai-sdk/anthropic",
      "name": "Model Studio Coding Plan",
      "options": {
        "baseURL": "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic/v1",
        "apiKey": "YOUR_API_KEY"
      },
      "models": {
        "qwen3.5-plus": { ... },
        "qwen3-max-2026-01-23": { ... },
        "qwen3-coder-next": { ... },
        "qwen3-coder-plus": { ... },
        "MiniMax-M2.5": { ... },
        "glm-5": { ... },
        "glm-4.7": { ... },
        "kimi-k2.5": { ... }
      }
    }
  }
}
```

Running `claude-switch opencode remove alibaba` removes only the `bailian-coding-plan` provider, preserving any other providers you have configured.

### GLM/Z.AI Configuration

GLM uses the `@z_ai/coding-helper` package to manage its configuration. The tool triggers `coding-helper auth reload claude` to apply GLM settings, plus sets the model tier aliases.

## Example Output

```bash
$ claude-switch alibaba qwen3.5-plus

✓ Switched to: Alibaba Coding Plan
────────────────────────────────────────────────────────────
  Model: Qwen3.5-Plus
  Context: 1M tokens
  Endpoint: https://coding-intl.dashscope.aliyuncs.com/apps/anthropic
  Capabilities: Text Generation, Deep Thinking, Visual Understanding
  Balanced performance, speed, and cost. Supports thinking/non-thinking...

  Claude model aliases:
    ANTHROPIC_DEFAULT_OPUS_MODEL   → qwen3.5-plus
    ANTHROPIC_DEFAULT_SONNET_MODEL → kimi-k2.5
    ANTHROPIC_DEFAULT_HAIKU_MODEL  → glm-5
```

```bash
$ claude-switch opencode add alibaba

✓ Added Alibaba Coding Plan provider to OpenCode
  Config: ~/.config/opencode/opencode.json
  Provider: bailian-coding-plan
  Models: qwen3.5-plus, qwen3-max-2026-01-23, qwen3-coder-next, qwen3-coder-plus, MiniMax-M2.5, glm-5, glm-4.7, kimi-k2.5
```

```bash
$ claude-switch glm --opus glm-5-turbo --sonnet glm-5 --haiku glm-4.7

✓ Switched to GLM/Z.AI

  Claude model aliases:
    ANTHROPIC_DEFAULT_OPUS_MODEL   → glm-5-turbo
    ANTHROPIC_DEFAULT_SONNET_MODEL → glm-5
    ANTHROPIC_DEFAULT_HAIKU_MODEL  → glm-4.7
```

```bash
$ claude-switch openrouter

✓ Switched to: OpenRouter
────────────────────────────────────────────────────────────
  Model: Qwen3.6 Plus (Free)
  Context: 131K tokens
  Endpoint: https://openrouter.ai/api/v1
  Capabilities: Text Generation, Deep Thinking
  Free Qwen3.6 Plus model via OpenRouter with strong reasoning capabilities.

  Claude model aliases:
    ANTHROPIC_DEFAULT_OPUS_MODEL   → qwen/qwen3.6-plus:free
    ANTHROPIC_DEFAULT_SONNET_MODEL → openrouter/free
    ANTHROPIC_DEFAULT_HAIKU_MODEL  → openrouter/free
```

## Requirements

- Node.js >= 18.0.0
- Claude Code installed (for Claude Code support)
- OpenCode installed (for OpenCode helper commands)
- Alibaba API Key (for Alibaba Coding Plan)
- `coding-helper` package (for GLM/Z.AI support)

## Getting API Keys

### Alibaba Coding Plan

1. Visit [Alibaba Cloud Model Studio](https://modelstudio.console.alibabacloud.com/)
2. Navigate to API Key management
3. Create a new API key
4. Run `claude-switch setup` or `claude-switch key alibaba <key>`

### GLM/Z.AI

1. Install coding-helper: `npm install -g @z_ai/coding-helper`
2. Run: `coding-helper auth`
3. Follow the interactive setup

### OpenRouter

1. Visit [OpenRouter Keys](https://openrouter.ai/settings/keys)
2. Create a new API key
3. Run `claude-switch setup` or `claude-switch key openrouter <key>`

## Safety Features

- Checks if config files exist before creating
- Backs up existing settings before modification
- Never overwrites without confirmation
- Auto-sets `hasCompletedOnboarding: true` in `~/.claude.json`
- Local-only storage (no cloud sync)
- Clears model alias env vars when switching between providers
- Preserves other OpenCode providers when adding/removing bailian-coding-plan

## Troubleshooting

### "coding-helper not found"

```bash
npm install -g @z_ai/coding-helper
```

### "API Key not found"

```bash
claude-switch setup
# or
claude-switch key alibaba <your-api-key>
```

### "Unable to connect to Anthropic services"

The tool automatically sets `hasCompletedOnboarding: true` in `~/.claude.json`. Run any switch command to trigger this:

```bash
claude-switch anthropic
```

### Check current configuration

```bash
claude-switch current
```

## License

MIT
