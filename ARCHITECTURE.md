# Architecture

## High-Level Overview

```
claude-switch CLI
       │
       ├── src/index.ts (Commander.js routing)
       │
       ├── switch functions (switchAlibaba, switchGLM, switchOpenRouter, switchAnthropic)
       │
       └── helper functions (promptApiKey, buildTierMap, displayTierMap)
               │
       ┌───────┬───────────────────────────────────────┐
       │               │                              │
  Claude Code        OpenCode                    Config Storage
  Client             Client                   (~/.claude-ai-switcher/)
       │               │                              │
~/.claude/          ~/.config/opencode/         config.json
settings.json     opencode.json              (API keys)
~/.claude.json
```

## Provider Switch Flow

When switching providers, the tool writes environment variables to `~/.claude/settings.json`:

```
                    ┌──────────────────┐
                    │  switch command  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Validate API key  │
                    │  (if required)    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Validate model   │
                    │  (if specified)   │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Build tier map   │
                    │  (opus/sonnet/haiku)│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Write settings   │
                    │  (backup first)   │
                    └────────┬─────────┘
```

## Model Tier Alias System

Claude Code uses three env vars to alias model tiers:

```
ANTHROPIC_DEFAULT_OPUS_MODEL   ── maps to provider's opus model
ANTHROPIC_DEFAULT_SONNET_MODEL ── maps to provider's sonnet model
ANTHROPIC_DEFAULT_HAIKU_MODEL  ── maps to provider's haiku model
```

### Default Tier Maps

```
Provider    │  opus                    │  sonnet           │  haiku
────────────┼────────────────────────┼─────────────────┼──────────────────
Alibaba     │  qwen3.5-plus / selected │  kimi-k2.5 / qwen3.5-plus │  glm-5 / kimi-k2.5
GLM         │  glm-5.1               │  glm-5-turbo      │  glm-5
OpenRouter  │  qwen/qwen3.6-plus:free │  openrouter/free  │  openrouter/free
Anthropic   │  (cleared)             │  (cleared)        │  (cleared)
```

Users can override tiers at switch time with `--opus`, `--sonnet`, `--haiku` flags.

## Provider Detection

`getCurrentProvider()` detects the active provider by inspecting `~/.claude/settings.json`:

```
┌───────────────────────────────────────┐
│  ANTHROPIC_BASE_URL contains               │
│  "coding-intl.dashscope.aliyuncs.com"     │──► Alibaba
│  "openrouter.ai"                         │──► OpenRouter
│  (absent)                                 │
│      └─ mcpServers["glm-coding-plan"]     │──► GLM
│      └─ (none of the above)               │──► Anthropic
└───────────────────────────────────────────┘
```

## Config File Locations

| File | Purpose | Managed By |
|------|---------|------------|
| `~/.claude/settings.json` | Env vars for provider routing + model aliases | `claude-code.ts` |
| `~/.claude.json` | Onboarding flag (`hasCompletedOnboarding`) | `claude-code.ts` |
| `~/.config/opencode/opencode.json` | OpenCode provider and model config | `opencode.ts` |
| `~/.claude-ai-switcher/config.json` | API keys per provider | `config.ts` |

## Cross-Platform Support

- All paths use `path.join()` + `os.homedir()` (no hardcoded `/home/`)
- `rimraf` for clean (no `rm -rf`)
- Platform detection for `which`/`where` commands
- Works on macOS, Linux, and Windows 11
