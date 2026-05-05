# Claude AI Switcher - Project Context

## Project Overview

**Claude AI Switcher** is a TypeScript CLI tool that enables seamless switching between AI providers (Anthropic, Alibaba Coding Plan, GLM/Z.AI) for **Claude Code** and **OpenCode** clients. It manages configuration files, API keys, environment variables, and model alias env vars so users always know what model is active in Claude Code.

### Key Features
- Quick switching between Anthropic (default), Alibaba Coding Plan, GLM/Z.AI, OpenRouter, Ollama, and Gemini providers
- **Model alias env vars** written to `~/.claude/settings.json` so Claude Code routes model tiers to the correct provider model (`ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`)
- **Separate client control** — `claude-switch claude <provider>` targets Claude Code only, `claude-switch opencode <provider>` targets OpenCode only, bare `claude-switch <provider>` updates both
- **Custom tier overrides** via `--opus`, `--sonnet`, `--haiku` flags
- Model information display with context windows and capabilities
- **Token tracking** — Visual context bar with percentage usage display (green/yellow/red/magenta color-coded)
- **Visual enhancements** — Model card showing active model, provider, context window, and capabilities
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
│   ├── verify.ts          # API key verification
│   ├── hooks/
│   │   ├── index.ts       # Hook manager (install/remove hooks)
│   │   ├── token-tracker.js       # Token tracking script
│   │   └── visual-enhancements.js # Visual enhancements script
│   ├── clients/
│   │   ├── claude-code.ts # Claude Code config handler (~/.claude/)
│   │   └── opencode.ts    # OpenCode config handler (~/.opencode.json)
│   └── providers/
│       ├── anthropic.ts   # Anthropic provider config
│       ├── alibaba.ts     # Alibaba Coding Plan config
│       ├── glm.ts         # GLM/Z.AI provider (coding-helper)
│       ├── ollama.ts      # Ollama provider (LiteLLM proxy)
│       ├── gemini.ts      # Gemini provider (LiteLLM proxy)
│       ── openrouter.ts  # OpenRouter provider config
├── dist/                  # Compiled JavaScript output
├── package.json           # Dependencies and scripts
── tsconfig.json          # TypeScript configuration
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
claude-switch openrouter
claude-switch ollama
claude-switch gemini

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
claude-switch glm --opus glm-5.1 --sonnet glm-5v-turbo --haiku glm-5-turbo

# Specific configuration with qwen3.6-plus for opus, kimi-k2.5 for sonnet, glm-5 for haiku
claude-switch claude alibaba --opus qwen3.6-plus --sonnet kimi-k2.5 --haiku glm-5

# View information
claude-switch current             # Show current configuration (both clients)
claude-switch list                # List all providers and models
claude-switch models alibaba      # Show models for specific provider

# API key management
claude-switch key alibaba         # Check if API key is set
claude-switch key alibaba <key>   # Set API key

# Hooks - Token tracking and visual enhancements
claude-switch hooks install       # Install token tracker + visual enhancements
claude-switch hooks status        # Show current token usage and visual status
claude-switch hooks reset         # Reset token usage counters
claude-switch hooks remove        # Remove all hooks
```

## Configuration Files

| Client | Config File | Purpose |
|--------|-------------|---------|
| Claude Code | `~/.claude/settings.json` | Environment variables for provider config + model alias env vars |
| Claude Code | `~/.claude.json` | Onboarding flag (`hasCompletedOnboarding`) |
| OpenCode | `~/.config/opencode/opencode.json` | Provider and agent configuration |
| API Keys | `~/.claude-ai-switcher/config.json` | Secure API key storage |
| Hooks | `~/.claude/hooks-config.json` | Hook installation status and configuration |
| Token Tracker | `~/.claude/token-tracker.js` | Token tracking script (installed via hooks) |
| Visual Enhancements | `~/.claude/visual-enhancements.js` | Visual enhancements script (installed via hooks) |
| Token Usage Data | `~/.claude/token-usage.json` | Session token usage tracking |

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
| GLM | glm-5.1 | glm-5v-turbo | glm-5-turbo |
| Anthropic | (cleared) | (cleared) | (cleared) |

These are overridable per-switch with `--opus`, `--sonnet`, `--haiku` flags. Switching to Anthropic clears all three vars.

## Provider Details

### Alibaba Coding Plan
- **Endpoint**: `https://coding-intl.dashscope.aliyuncs.com/apps/anthropic`
- **Models**: qwen3.6-plus, qwen3-max-2026-01-23, qwen3-coder-next, qwen3-coder-plus, glm-5, glm-4.7, glm-4.7-flash, kimi-k2.5, MiniMax-M2.5
- **Context Windows**: 200K - 1M tokens
  - **qwen3.6-plus**: 1M tokens (balanced, 1M context)
  - **qwen3-coder-plus**: 1M tokens (code, 1M context)
  - **qwen3-max-2026-01-23**: 262K tokens (complex reasoning)
  - **qwen3-coder-next**: 262K tokens (coding agent)
  - **glm-5**: 200K tokens (flagship GLM)
  - **glm-4.7**: 256K tokens (balanced GLM)
  - **glm-4.7-flash**: 256K tokens (fast GLM)
  - **kimi-k2.5**: 200K tokens (multimodal, 200K context)
  - **MiniMax-M2.5**: 200K tokens (reasoning, 200K context)
- **API Key Required**: Yes (from Alibaba Cloud Model Studio)

### GLM/Z.AI
- **Managed by**: `@z_ai/coding-helper` package
- **Models**: glm-5.1, glm-5v-turbo, glm-5-turbo, glm-5, glm-4.7
- **Context Windows**: 200K - 256K tokens
- **Setup**: `npm install -g @z_ai/coding-helper && coding-helper auth`

### Anthropic (Default)
- **Models**: claude-opus-4-6, claude-opus-4-5, claude-sonnet-4-6, claude-sonnet-4-5, claude-haiku-4-5
- **Context Windows**: 200K tokens
- **Configuration**: Clears all provider env vars and model alias env vars to use native Claude

## Hooks - Token Tracking & Visual Enhancements

### Token Tracker (`~/.claude/token-tracker.js`)

Tracks token usage across Claude Code sessions with:
- **Input/Output token counting**
- **Total session token usage**
- **Visual context bar with percentage**
- **Color-coded alerts** (green <50%, yellow <75%, red <90%, magenta <100%)

#### Installation
```bash
claude-switch hooks install      # Install all hooks
claude-switch hooks install-token  # Install only token tracker
```

#### Usage
```bash
claude-switch hooks status     # Show current token usage
claude-switch hooks reset      # Reset token counters
claude-switch hooks remove-token  # Remove token tracker
```

#### Output Example
```
╔══════════════════════════════════════════════════════════════╗
║  🤖 Active Model: Qwen3 6 Plus                                ║
╠══════════════════════════════════════════════════════════════╣
║  📊 Token Usage:                                              ║
║    Input:  12,450      tokens                                   ║
║    Output: 8,320       tokens                                   ║
║    Total:  20,770      tokens                                   ║
╠══════════════════════════════════════════════════════════════╣
║   Context Window:                                           ║
║    Used:   20,770      tokens                                   ║
║    Total:  1,000,000   tokens                                   ║
║    ████░░░░░░░░░░░░░░░░   2.1%                                  ║
╚══════════════════════════════════════════════════════════════╝
```

### Visual Enhancements (`~/.claude/visual-enhancements.js`)

Provides visual display of active model and provider information:
- **Model card** with provider name, model, context window, and capabilities
- **Provider detection** from Claude Code settings
- **Context usage percentage bar**
- **Custom system prompt generation**

#### Installation
```bash
claude-switch hooks install         # Install all hooks
claude-switch hooks install-visual  # Install only visual enhancements
```

#### Usage
```bash
claude-switch hooks status          # Show visual status
claude-switch hooks remove-visual   # Remove visual enhancements
```

#### Output Example
```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Alibaba Model Studio                                          │
├─────────────────────────────────────────────────────────────┤
│ Model: qwen3.6-plus                                             │
│ Context: 1M tokens                                              │
│ Capabilities:                                                    │
│   Text Generation • Deep Thinking • Visual Understanding        │
└─────────────────────────────────────────────────────────────┘
```

### Hook Configuration

Hooks are managed via `~/.claude/hooks-config.json`:
```json
{
  "tokenTracking": true,
  "visualEnhancements": true,
  "customPrompts": false,
  "lastInstalled": "2026-05-05T07:00:00.000Z"
}
```

### Token Usage Tracking

Token usage is stored in `~/.claude/token-usage.json`:
```json
{
  "totalInputTokens": 12450,
  "totalOutputTokens": 8320,
  "sessionStart": "2026-05-05T07:00:00.000Z",
  "lastUpdated": "2026-05-05T08:30:00.000Z"
}
```

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
  opus: "glm-5.1",
  sonnet: "glm-5v-turbo",
  haiku: "glm-5-turbo"
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

Hooks commands:
  claude-switch hooks install               → Install all hooks
  claude-switch hooks install-token         → Install token tracker only
  claude-switch hooks install-visual        → Install visual enhancements only
  claude-switch hooks status                → Show current status
  claude-switch hooks reset                 → Reset token counters
  claude-switch hooks remove                → Remove all hooks
  claude-switch hooks remove-token          → Remove token tracker
  claude-switch hooks remove-visual         → Remove visual enhancements
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
7. **Hook Safety**: Hooks are optional and can be removed at any time without affecting core functionality
8. **Token Usage Privacy**: Token usage data stored locally only, never transmitted

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `coding-helper not found` | `npm install -g @z_ai/coding-helper` |
| `API Key not found` | Run `claude-switch setup` or `claude-switch key alibaba <key>` |
| `Unable to connect to Anthropic services` | Run any switch command to auto-set onboarding flag |
| Config file issues | Run `claude-switch current` to diagnose |
| Model aliases not working | Check `~/.claude/settings.json` for `env` section |
| Hooks not installed | Run `claude-switch hooks install` |
| Token tracker not showing | Check `~/.claude/token-tracker.js` exists |
| Visual enhancements not showing | Check `~/.claude/visual-enhancements.js` exists |
| Token usage not resetting | Run `claude-switch hooks reset` |
