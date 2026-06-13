# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Codex AI Switcher is a TypeScript CLI tool that enables seamless switching between AI providers (Anthropic, Alibaba Coding Plan, GLM/Z.AI, OpenRouter, Ollama, Gemini) for Codex and OpenCode clients. It manages configuration files, API keys, environment variables, and model alias env vars so users always know what model is active in Codex.

## Project Structure

```
Codex-ai-switcher/
── src/
│   ├── index.ts           # Main CLI entry point (Commander.js)
│   ├── config.ts          # API key and config management
│   ├── models.ts          # Provider/model definitions + ModelTierMap
│   ├── verify.ts          # API key verification (lightweight HTTP checks)
│   ├── display.ts         # Console output utilities (chalk)
│   ├── hooks/
│   │   ├── index.ts       # Hook manager (install/remove hooks)
│   │   ├── token-tracker.js       # Token tracking script
│   │   └── visual-enhancements.js # Visual enhancements script
│   ├── clients/
│   │   ├── Codex.ts # Codex config handler (~/.Codex/)
│   │   ── opencode.ts    # OpenCode config handler (~/.opencode.json)
│   └── providers/
│       ├── anthropic.ts   # Anthropic provider config
│       ├── alibaba.ts     # Alibaba Coding Plan config
│       ├── glm.ts         # GLM/Z.AI provider (coding-helper)
│       ├── openrouter.ts # OpenRouter provider config
│       ├── ollama.ts     # Ollama provider (local, LiteLLM proxy on :4000)
│       └── gemini.ts     # Gemini provider (Google, LiteLLM proxy on :4001)
├── dist/                  # Compiled JavaScript output
├── package.json           # Dependencies and scripts
── tsconfig.json          # TypeScript configuration
└── README.md              # User documentation
```

## Build and Development Commands

### Build Commands
```bash
# Install dependencies (reproducible install from package-lock.json; does NOT modify it)
npm ci

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
npm link  # Install CLI globally as 'Codex-switch'
```

## Key Architecture Patterns

### Separation of Concerns
- `clients/` handles file I/O for specific AI clients
- `providers/` contains provider-specific configuration logic
- `models.ts` centralizes model definitions, tier maps, and ModelTierMap interface
- `display.ts` handles all console output formatting

### Model Alias Environment Variables
When switching Codex to a non-Anthropic provider, the tool writes into `~/.Codex/settings.json`:
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
| Alibaba | qwen3.7-plus (default), selected model (when specific model chosen) | qwen3.6-plus (default), qwen3.7-plus (when specific model chosen) | kimi-k2.5 (default), qwen3.6-plus (when specific model chosen) |
| GLM | glm-5.2[1m] | glm-5-turbo | glm-5v-turbo |
| OpenRouter | qwen/qwen3.6-plus:free | openrouter/free | openrouter/free |
| Ollama | deepseek-r1:latest | qwen2.5-coder:latest | llama3.1:latest |
| Gemini | gemini-2.5-pro | gemini-2.5-flash | gemini-2.5-flash-lite |
| Anthropic | (cleared) | (cleared) | (cleared) |

### Status Command
`Codex-switch status` — Shows current provider/model for both clients, displays masked API keys, and verifies each key by making a lightweight API call. Uses `src/verify.ts` which performs:
- Alibaba: GET to DashScope models endpoint
- OpenRouter: GET to OpenRouter models endpoint
- Anthropic: GET to Anthropic models endpoint (uses `ANTHROPIC_API_KEY` env var)
- GLM: Checks if `coding-helper` CLI is installed
- Ollama: Checks LiteLLM proxy on port 4000, then Ollama on port 11434
- Gemini: Checks LiteLLM proxy on port 4001, then validates Google API key

### Type Definitions
```typescript
// ModelTierMap defines which model maps to each Anthropic tier
interface ModelTierMap {
  opus: string;
  sonnet: string;
  haiku: string;
}
```

## Common Tasks

### Switch Providers
```bash
# Switch both Codex and OpenCode
Codex-switch anthropic
Codex-switch alibaba
Codex-switch glm

# Switch Codex only
Codex-switch Codex anthropic
Codex-switch Codex alibaba
Codex-switch Codex glm
Codex-switch Codex openrouter
Codex-switch Codex ollama
Codex-switch Codex gemini

# Switch OpenCode only
Codex-switch opencode anthropic
Codex-switch opencode alibaba
Codex-switch opencode glm
Codex-switch opencode openrouter
Codex-switch opencode add ollama
Codex-switch opencode add gemini
Codex-switch opencode remove ollama
Codex-switch opencode remove gemini
```

### Configure Model Tiers
```bash
# Custom model tier aliases (Codex only)
Codex-switch Codex alibaba --opus qwen3-max-2026-01-23 --sonnet qwen3-coder-plus --haiku qwen3.6-plus
Codex-switch glm --opus glm-5.2[1m] --sonnet glm-5-turbo --haiku glm-5v-turbo

# Specific configuration with qwen3.7-plus for opus, qwen3.6-plus for sonnet, kimi-k2.5 for haiku
Codex-switch Codex alibaba --opus qwen3.7-plus --sonnet qwen3.6-plus --haiku kimi-k2.5
```

### View Information
```bash
Codex-switch status              # Show current config + verify API keys
Codex-switch current             # Show current configuration (both clients)
Codex-switch list                # List all providers and models
Codex-switch models alibaba      # Show models for specific provider
```

### API Key Management
```bash
Codex-switch key alibaba         # Check if API key is set
Codex-switch key alibaba <key>   # Set API key
Codex-switch setup               # Interactive setup wizard
```

### Hooks - Token Tracking & Visual Enhancements
```bash
# Install all hooks (token tracker + visual enhancements)
Codex-switch hooks install

# Install individual hooks
Codex-switch hooks install-token   # Token tracker only
Codex-switch hooks install-visual  # Visual enhancements only

# View status and manage hooks
Codex-switch hooks status          # Show current token usage and visual status
Codex-switch hooks reset           # Reset token usage counters
Codex-switch hooks remove          # Remove all hooks
Codex-switch hooks remove-token    # Remove token tracker
Codex-switch hooks remove-visual   # Remove visual enhancements
```

**Hook Files:**
- `~/.Codex/token-tracker.js` - Tracks input/output tokens with visual context bar
- `~/.Codex/visual-enhancements.js` - Shows active model, provider, context window, capabilities
- `~/.Codex/hooks-config.json` - Hook installation status
- `~/.Codex/token-usage.json` - Session token usage data

## Configuration Files

| Client | Config File | Purpose |
|--------|-------------|---------|
| Codex | `~/.Codex/settings.json` | Environment variables for provider config + model alias env vars |
| Codex | `~/.Codex.json` | Onboarding flag (`hasCompletedOnboarding`) |
| OpenCode | `~/.opencode.json` | Provider and agent configuration |
| API Keys | `~/.Codex-ai-switcher/config.json` | Secure API key storage |
| Hooks | `~/.Codex/hooks-config.json` | Hook installation status and configuration |
| Token Tracker | `~/.Codex/token-tracker.js` | Token tracking script (installed via hooks) |
| Visual Enhancements | `~/.Codex/visual-enhancements.js` | Visual enhancements script (installed via hooks) |
| Token Usage Data | `~/.Codex/token-usage.json` | Session token usage tracking |

## Safety Features
1. **Backup Before Modify**: All config file modifications create timestamped backups
2. **Directory Creation**: Uses `fs.ensureDir()` to safely create directories
3. **Onboarding Auto-Complete**: Sets `hasCompletedOnboarding: true` to prevent connection errors
4. **Local-Only Storage**: No cloud sync of API keys or configurations
5. **Existence Checks**: Validates config files before reading/writing
6. **Env Var Cleanup**: Clears provider-specific env vars when switching between providers
7. **Hook Safety**: Hooks are optional and can be removed at any time without affecting core functionality
8. **Token Usage Privacy**: Token usage data stored locally only, never transmitted

## External Dependencies
- Codex and/or OpenCode must be installed separately
- `@z_ai/coding-helper` package required for GLM/Z.AI provider support
- API keys required for Alibaba (from Alibaba Cloud Model Studio)
- [LiteLLM](https://github.com/BerriAI/litellm) with proxy support required for Ollama and Gemini (`pip install 'litellm[proxy]'`)
- [Ollama](https://ollama.com) must be installed and running for local model support
- Google API key (from [AI Studio](https://aistudio.google.com/apikey)) required for Gemini

## Zread Project Wiki

The `.zread/` directory contains an AI-generated project wiki maintained with [Zread CLI](https://zread.ai/cli).

### Structure
```
.zread/
  wiki/
    current          → pointer to latest version (e.g., "versions/2026-04-24-203206")
    versions/
      <timestamp>/   ← markdown files (the actual wiki content)
    drafts/          ← in-progress generation (gitignored)
```

### Workflow
1. After meaningful code changes, run `zread generate` to update the wiki
2. Prune old version snapshots before committing: delete all but the latest dated folder under `.zread/wiki/versions/`
3. Commit `current` (the pointer) + the single latest version folder
4. Git history tracks what changed over time — no need for multiple dated snapshots in the repo

### Guidelines
- Never commit `.zread/wiki/drafts/` (already in `.gitignore`)
- Keep only one versioned snapshot in the repo at a time to avoid accumulation
- The wiki is for developer reference and AI context — it does not affect build or runtime

## Cross-Platform Development

### Platform Support
- **macOS**: Full support (primary development platform)
- **Linux**: Full support
- **Windows 11**: Full support (use Git Bash, WSL, or PowerShell for build commands)

### Cross-Platform Code Guidelines

**Shell Commands**:
- Avoid Unix-specific commands like `which`, `rm -rf`
- Use `platform()` from Node.js `os` module for platform detection
- Example: `platform() === "win32" ? "where coding-helper" : "which coding-helper"`

**Path Handling**:
- Always use `path.join()` and `os.homedir()` for cross-platform paths
- The tool uses Unix-style dotfiles (`~/.Codex/`, `~/.opencode.json`) which matches Codex's cross-platform convention

**Build Scripts**:
- `rimraf` is used instead of `rm -rf` for cross-platform directory deletion
- All npm scripts work on Windows, macOS, and Linux