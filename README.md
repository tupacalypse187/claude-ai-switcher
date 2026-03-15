# Claude AI Switcher

Switch between AI providers (Anthropic, GLM, Alibaba Qwen) for **Claude Code** and **OpenCode** with ease.

## Features

- **Quick Switching**: Switch between Anthropic, GLM/Z.AI, and Alibaba Coding Plan with a single command
- **Model Aliases**: Automatically sets `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` in Claude Code's settings so you always know what model is active
- **Separate Client Control**: Target Claude Code, OpenCode, or both independently — no accidental cross-contamination
- **Custom Tier Overrides**: Use `--opus`, `--sonnet`, `--haiku` to pin specific models per tier
- **Model Information**: See model capabilities, context windows, and descriptions when switching
- **Secure Storage**: API keys stored locally in `~/.claude-ai-switcher/config.json`
- **Safe Configuration**: Backs up existing settings before any modifications
- **Auto Onboarding**: Automatically sets `hasCompletedOnboarding: true` to prevent connection errors

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

# Switch both Claude Code and OpenCode to Alibaba Coding Plan
claude-switch alibaba

# Switch only Claude Code (OpenCode unchanged)
claude-switch claude alibaba qwen3.5-plus

# Switch only OpenCode (Claude Code unchanged)
claude-switch opencode alibaba

# Switch back to default Anthropic (both clients)
claude-switch anthropic
```

## Commands

### Switch Both Clients (default)

When no client is specified, both Claude Code and OpenCode are updated.

```bash
claude-switch anthropic
claude-switch alibaba
claude-switch alibaba qwen3.5-plus       # specific model
claude-switch glm
```

### Switch Claude Code Only

```bash
claude-switch claude anthropic
claude-switch claude alibaba
claude-switch claude alibaba qwen3.5-plus
claude-switch claude glm
```

### Switch OpenCode Only

```bash
claude-switch opencode anthropic
claude-switch opencode alibaba
claude-switch opencode alibaba qwen3.5-plus
claude-switch opencode glm
```

### Model Aliases (Claude Code)

When switching Claude Code to a non-Anthropic provider, the tool writes model alias env vars into `~/.claude/settings.json` so Claude Code knows which model to route each tier to:

| Env Var | Default (Alibaba) | Default (GLM) |
|---------|-------------------|---------------|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | selected model (e.g., `qwen3.5-plus`) | `glm-5` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `qwen3.5-plus` (balanced) | `glm-4.7` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `kimi-k2.5` (fast, 1M context) | `glm-4.7-flash` |

Override any tier at switch time:

```bash
# Set all three tiers to the same model (default for Alibaba)
claude-switch claude alibaba qwen3.5-plus

# Override individual tiers
claude-switch claude alibaba --opus qwen3-max-2026-01-23 --sonnet qwen3.5-plus --haiku glm-5

# Custom configuration with specific model assignments (qwen3.5-plus for opus, kimi-k2.5 for sonnet, glm-5 for haiku)
claude-switch claude alibaba --opus qwen3.5-plus --sonnet kimi-k2.5 --haiku glm-5

# GLM with custom haiku tier
claude-switch glm --haiku glm-4.7
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
| glm-5 | 200K tokens | Text Generation, Deep Thinking |
| glm-4.7 | 256K tokens | Text Generation, Deep Thinking |
| glm-4.7-flash | 256K tokens | Text Generation, Fast Inference |

### Anthropic (Default)

| Model | Context | Capabilities |
|-------|---------|--------------|
| claude-opus-4-6-20250205 | 200K tokens | Text, Code, Vision, Complex Reasoning |
| claude-opus-4-5-20251101 | 200K tokens | Text, Code, Vision, Complex Reasoning |
| claude-sonnet-4-6-20250219 | 200K tokens | Text, Code, Vision |
| claude-sonnet-4-5-20250814 | 200K tokens | Text, Code, Vision |
| claude-haiku-4-5-20251015 | 200K tokens | Text, Fast Responses |

## Configuration Files

| Client | Config File | Purpose |
|--------|-------------|---------|
| Claude Code | `~/.claude/settings.json` | Environment variables for provider config + model alias env vars |
| Claude Code | `~/.claude.json` | `hasCompletedOnboarding` flag |
| OpenCode | `~/.opencode.json` | Provider and agent configuration |
| API Keys | `~/.claude-ai-switcher/config.json` | Secure local API key storage |

## How It Works

### Alibaba Coding Plan Configuration

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

### GLM/Z.AI Configuration

GLM uses the `@z_ai/coding-helper` package to manage its configuration. The tool triggers `coding-helper auth reload claude` to apply GLM settings, plus sets the model tier aliases.

## Example Output

```bash
$ claude-switch claude alibaba qwen3.5-plus

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
$ claude-switch glm --opus glm-5 --sonnet glm-4.7 --haiku glm-4.7-flash

✓ Switched to GLM/Z.AI

  Claude model aliases:
    ANTHROPIC_DEFAULT_OPUS_MODEL   → glm-5
    ANTHROPIC_DEFAULT_SONNET_MODEL → glm-4.7
    ANTHROPIC_DEFAULT_HAIKU_MODEL  → glm-4.7-flash
```

## Requirements

- Node.js >= 18.0.0
- Claude Code and/or OpenCode installed
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

## Safety Features

- Checks if config files exist before creating
- Backs up existing settings before modification
- Never overwrites without confirmation
- Auto-sets `hasCompletedOnboarding: true` in `~/.claude.json`
- Local-only storage (no cloud sync)
- Clears model alias env vars when switching back to Anthropic

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
