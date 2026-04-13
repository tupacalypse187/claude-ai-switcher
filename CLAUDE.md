# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude AI Switcher is a TypeScript CLI tool that enables seamless switching between AI providers (Anthropic, Alibaba Coding Plan, GLM/Z.AI, OpenRouter, Ollama, Gemini) for Claude Code and OpenCode clients. It manages configuration files, API keys, environment variables, and model alias env vars so users always know what model is active in Claude Code.

## Project Structure

```
claude-ai-switcher/
├── src/
│   ├── index.ts           # Main CLI entry point (Commander.js)
│   ├── config.ts          # API key and config management
│   ├── models.ts          # Provider/model definitions + ModelTierMap
│   ├── verify.ts          # API key verification (lightweight HTTP checks)
│   ├── display.ts         # Console output utilities (chalk)
│   ├── clients/
│   │   ├── claude-code.ts # Claude Code config handler (~/.claude/)
│   │   └── opencode.ts    # OpenCode config handler (~/.opencode.json)
│   └── providers/
│       ├── anthropic.ts   # Anthropic provider config
│       ├── alibaba.ts     # Alibaba Coding Plan config
│       ├── glm.ts         # GLM/Z.AI provider (coding-helper)
│       ├── openrouter.ts # OpenRouter provider config
│       ├── ollama.ts     # Ollama provider (local, LiteLLM proxy on :4000)
│       └── gemini.ts     # Gemini provider (Google, LiteLLM proxy on :4001)
├── dist/                  # Compiled JavaScript output
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── README.md              # User documentation
```

## Build and Development Commands

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

## Key Architecture Patterns

### Separation of Concerns
- `clients/` handles file I/O for specific AI clients
- `providers/` contains provider-specific configuration logic
- `models.ts` centralizes model definitions, tier maps, and ModelTierMap interface
- `display.ts` handles all console output formatting

### Model Alias Environment Variables
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
| OpenRouter | qwen/qwen3.6-plus:free | openrouter/free | openrouter/free |
| Ollama | deepseek-r1:latest | qwen2.5-coder:latest | llama3.1:latest |
| Gemini | gemini-2.5-pro | gemini-2.5-flash | gemini-2.5-flash-lite |
| Anthropic | (cleared) | (cleared) | (cleared) |

### Status Command
`claude-switch status` — Shows current provider/model for both clients, displays masked API keys, and verifies each key by making a lightweight API call. Uses `src/verify.ts` which performs:
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
# Switch both Claude Code and OpenCode
claude-switch anthropic
claude-switch alibaba
claude-switch glm

# Switch Claude Code only
claude-switch claude anthropic
claude-switch claude alibaba
claude-switch claude glm
claude-switch claude openrouter
claude-switch claude ollama
claude-switch claude gemini

# Switch OpenCode only
claude-switch opencode anthropic
claude-switch opencode alibaba
claude-switch opencode glm
claude-switch opencode openrouter
claude-switch opencode add ollama
claude-switch opencode add gemini
claude-switch opencode remove ollama
claude-switch opencode remove gemini
```

### Configure Model Tiers
```bash
# Custom model tier aliases (Claude Code only)
claude-switch claude alibaba --opus qwen3-max-2026-01-23 --sonnet qwen3-coder-plus --haiku qwen3.6-plus
claude-switch glm --opus glm-5.1 --sonnet glm-5-turbo --haiku glm-5

# Specific configuration with qwen3.6-plus for opus, kimi-k2.5 for sonnet, glm-5 for haiku
claude-switch claude alibaba --opus qwen3.6-plus --sonnet kimi-k2.5 --haiku glm-5
```

### View Information
```bash
claude-switch status              # Show current config + verify API keys
claude-switch current             # Show current configuration (both clients)
claude-switch list                # List all providers and models
claude-switch models alibaba      # Show models for specific provider
```

### API Key Management
```bash
claude-switch key alibaba         # Check if API key is set
claude-switch key alibaba <key>   # Set API key
claude-switch setup               # Interactive setup wizard
```

## Configuration Files

| Client | Config File | Purpose |
|--------|-------------|---------|
| Claude Code | `~/.claude/settings.json` | Environment variables for provider config + model alias env vars |
| Claude Code | `~/.claude.json` | Onboarding flag (`hasCompletedOnboarding`) |
| OpenCode | `~/.opencode.json` | Provider and agent configuration |
| API Keys | `~/.claude-ai-switcher/config.json` | Secure API key storage |

## Safety Features
1. **Backup Before Modify**: All config file modifications create timestamped backups
2. **Directory Creation**: Uses `fs.ensureDir()` to safely create directories
3. **Onboarding Auto-Complete**: Sets `hasCompletedOnboarding: true` to prevent connection errors
4. **Local-Only Storage**: No cloud sync of API keys or configurations
5. **Existence Checks**: Validates config files before reading/writing
6. **Env Var Cleanup**: Clears provider-specific env vars when switching between providers

## External Dependencies
- Claude Code and/or OpenCode must be installed separately
- `@z_ai/coding-helper` package required for GLM/Z.AI provider support
- API keys required for Alibaba (from Alibaba Cloud Model Studio)
- [LiteLLM](https://github.com/BerriAI/litellm) with proxy support required for Ollama and Gemini (`pip install 'litellm[proxy]'`)
- [Ollama](https://ollama.com) must be installed and running for local model support
- Google API key (from [AI Studio](https://aistudio.google.com/apikey)) required for Gemini

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
- The tool uses Unix-style dotfiles (`~/.claude/`, `~/.opencode.json`) which matches Claude Code's cross-platform convention

**Build Scripts**:
- `rimraf` is used instead of `rm -rf` for cross-platform directory deletion
- All npm scripts work on Windows, macOS, and Linux