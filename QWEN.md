# Claude AI Switcher - Project Context

## Project Overview

**Claude AI Switcher** is a TypeScript CLI tool that enables seamless switching between AI providers (Anthropic, Alibaba Coding Plan, GLM/Z.AI) for **Claude Code** and **OpenCode** clients. It manages configuration files, API keys, environment variables, and model alias env vars so users always know what model is active in Claude Code.

### Key Features
- Quick switching between Anthropic (default), Alibaba Coding Plan, and GLM/Z.AI providers
- **Model alias env vars** written to `~/.claude/settings.json` so Claude Code routes model tiers to the correct provider model (`ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`)
- **Separate client control** — `claude-switch claude <provider>` targets Claude Code only, `claude-switch opencode <provider>` targets OpenCode only, bare `claude-switch <provider>` updates both
- **Custom tier overrides** via `--opus`, `--sonnet`, `--haiku` flags
- Model information display with context windows and capabilities
- Secure API key storage in `~/.claude-ai-switcher/config.json`
- Automatic backup of existing configurations
- Auto-onboarding to prevent Anthropic connection errors

## Project Structure

```
claude-ai-switcher/
├── src/
│   ├── index.ts           # Main CLI entry point (Commander.js)
│   ├── config.ts          # API key and config management
│   ├── models.ts          # Provider/model definitions + ModelTierMap
│   ├── display.ts         # Console output utilities (chalk)
│   ├── clients/
│   │   ├── claude-code.ts # Claude Code config handler (~/.claude/)
│   │   └── opencode.ts    # OpenCode config handler (~/.opencode.json)
│   └── providers/
│       ├── anthropic.ts   # Anthropic provider config
│       ├── alibaba.ts     # Alibaba Coding Plan config
│       └── glm.ts         # GLM/Z.AI provider (coding-helper)
├── dist/                  # Compiled JavaScript output
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # User documentation
```

## Building and Running

### Prerequisites
- Node.js >= 18.0.0
- npm

### Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run development version (ts-node)
npm run dev

# Run built version
npm start

# Clean build output
npm run clean
```

### Global Installation

```bash
npm link  # Install CLI globally as 'claude-switch'
```

### Usage

```bash
# Setup wizard (first-time use)
claude-switch setup

# Switch BOTH clients
claude-switch anthropic
claude-switch alibaba
claude-switch alibaba qwen3.6-plus
claude-switch glm

# Switch Claude Code only
claude-switch claude anthropic
claude-switch claude alibaba qwen3.6-plus
claude-switch claude glm

# Switch OpenCode only
claude-switch opencode anthropic
claude-switch opencode alibaba qwen3.6-plus
claude-switch opencode glm

# Custom model tier aliases (Claude Code only)
claude-switch claude alibaba --opus qwen3-max-2026-01-23 --sonnet qwen3.6-plus --haiku glm-5
claude-switch glm --opus glm-5-turbo --sonnet glm-5 --haiku glm-4.7

# Specific configuration with qwen3.6-plus for opus, kimi-k2.5 for sonnet, glm-5 for haiku
claude-switch claude alibaba --opus qwen3.6-plus --sonnet kimi-k2.5 --haiku glm-5

# View information
claude-switch current             # Show current configuration (both clients)
claude-switch list                # List all providers and models
claude-switch models alibaba      # Show models for specific provider

# API key management
claude-switch key alibaba         # Check if API key is set
claude-switch key alibaba <key>   # Set API key
```

## Configuration Files

| Client | Config File | Purpose |
|--------|-------------|---------|
| Claude Code | `~/.claude/settings.json` | Environment variables for provider config + model alias env vars |
| Claude Code | `~/.claude.json` | Onboarding flag (`hasCompletedOnboarding`) |
| OpenCode | `~/.opencode.json` | Provider and agent configuration |
| API Keys | `~/.claude-ai-switcher/config.json` | Secure API key storage |

## How It Works

### Alibaba Coding Plan Configuration

When switching Claude Code to Alibaba, the tool writes these environment variables to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "YOUR_API_KEY",
    "ANTHROPIC_BASE_URL": "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic",
    "ANTHROPIC_MODEL": "qwen3.6-plus",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen3.6-plus",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "kimi-k2.5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "glm-5"
  }
}
```

- `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` — Route Claude Code to Alibaba's endpoint
- `ANTHROPIC_DEFAULT_*_MODEL` — Map Claude's model tiers (opus/sonnet/haiku) to specific Alibaba models
  - **Opus**: `qwen3.6-plus` (default balanced model)
  - **Sonnet**: `kimi-k2.5` (fast with 1M context)
  - **Haiku**: `glm-5` (efficient)

Switching back to Anthropic clears all these env vars.

### GLM/Z.AI Configuration

GLM uses the `@z_ai/coding-helper` package to manage its configuration. The tool triggers `coding-helper auth reload claude` to apply GLM settings, plus sets the model tier aliases.

## Model Alias Env Vars

When switching Claude Code to a non-Anthropic provider, the tool writes into `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "<model>",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "<model>",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "<model>"
  }
}
```

Default tier maps per provider:

| Provider | opus | sonnet | haiku |
|----------|------|--------|-------|
| Alibaba | qwen3.6-plus (default), selected model (when specific model chosen) | kimi-k2.5 (default), qwen3.6-plus (when specific model chosen) | glm-5 (default), kimi-k2.5 (when specific model chosen) |
| GLM | glm-5-turbo | glm-5 | glm-4.7 |
| Anthropic | (cleared) | (cleared) | (cleared) |

These are overridable per-switch with `--opus`, `--sonnet`, `--haiku` flags. Switching to Anthropic clears all three vars.

## Provider Details

### Alibaba Coding Plan
- **Endpoint**: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic`
- **Models**: qwen3.6-plus, qwen3-max-2026-01-23, qwen3-coder-next, qwen3-coder-plus, glm-5, glm-4.7, glm-4.7-flash, kimi-k2.5, MiniMax-M2.5
- **Context Windows**: 200K - 1M tokens
- **API Key Required**: Yes (from Alibaba Cloud Model Studio)

### GLM/Z.AI
- **Managed by**: `@z_ai/coding-helper` package
- **Models**: glm-5-turbo, glm-5, glm-4.7
- **Context Windows**: 200K - 256K tokens
- **Setup**: `npm install -g @z_ai/coding-helper && coding-helper auth`

### Anthropic (Default)
- **Models**: claude-opus-4-6, claude-opus-4-5, claude-sonnet-4-6, claude-sonnet-4-5, claude-haiku-4-5
- **Context Windows**: 200K tokens
- **Configuration**: Clears all provider env vars and model alias env vars to use native Claude

## Development Conventions

### Code Style
- **TypeScript**: Strict mode enabled (`strict: true` in tsconfig.json)
- **Module System**: CommonJS with ES2020 target
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Imports**: ES module syntax with `.js` extensions for relative imports
- **Error Handling**: Try-catch blocks with user-friendly error messages via `displayError()`

### Architecture Patterns
- **Separation of Concerns**:
  - `clients/` handles file I/O for specific AI clients
  - `providers/` contains provider-specific configuration logic
  - `models.ts` centralizes model definitions, tier maps, and `ModelTierMap` interface
  - `display.ts` handles all console output formatting
- **Async/Await**: All file operations use async/await with fs-extra
- **Interface Definitions**: TypeScript interfaces for all config objects

### Key Types

```typescript
// ModelTierMap defines which model maps to each Anthropic tier
interface ModelTierMap {
  opus: string;
  sonnet: string;
  haiku: string;
}

// GLM default: best model per tier
const GLM_DEFAULT_TIER_MAP: ModelTierMap = {
  opus: "glm-5-turbo",
  sonnet: "glm-5",
  haiku: "glm-4.7"
};

// Alibaba default: opus = selected model, sonnet = qwen3.6-plus, haiku = kimi-k2.5
function getAlibabaTierMap(model: string): ModelTierMap
```

### Command Structure

```
claude-switch <provider>                    → both clients
claude-switch claude <provider>             → Claude Code only
claude-switch opencode <provider>           → OpenCode only

Tier override flags (Claude Code only):
  --opus <model>
  --sonnet <model>
  --haiku <model>
```

### Testing Practices
- Manual testing via CLI commands
- Configuration backup before modifications
- Validation of model IDs before applying configuration

### Key Dependencies
- `commander`: CLI framework
- `chalk`: Terminal styling
- `fs-extra`: Enhanced file system operations
- `ora`: Loading spinners

## External Dependencies

### Required for Full Functionality
- **Claude Code**: For Claude Code client support
- **OpenCode**: For OpenCode client support
- **@z_ai/coding-helper**: Required for GLM/Z.AI provider support

### API Key Sources
- **Alibaba**: [Alibaba Cloud Model Studio](https://modelstudio.console.alibabacloud.com/)
- **GLM/Z.AI**: Via `coding-helper auth` interactive setup
- **Anthropic**: Uses system/default Anthropic configuration

## Safety Features

1. **Backup Before Modify**: All config file modifications create timestamped backups
2. **Directory Creation**: Uses `fs.ensureDir()` to safely create directories
3. **Onboarding Auto-Complete**: Sets `hasCompletedOnboarding: true` to prevent connection errors
4. **Local-Only Storage**: No cloud sync of API keys or configurations
5. **Existence Checks**: Validates config files before reading/writing
6. **Env Var Cleanup**: Clears provider-specific env vars when switching between providers

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `coding-helper not found` | `npm install -g @z_ai/coding-helper` |
| `API Key not found` | Run `claude-switch setup` or `claude-switch key alibaba <key>` |
| `Unable to connect to Anthropic services` | Run any switch command to auto-set onboarding flag |
| Config file issues | Run `claude-switch current` to diagnose |
| Model aliases not working | Check `~/.claude/settings.json` for `env` section |
