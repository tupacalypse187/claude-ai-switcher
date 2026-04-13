# Architecture

## High-Level Overview

```
claude-switch CLI
       |
       +-- src/index.ts (Commander.js routing)
       |
       +-- switch functions (switchAlibaba, switchGLM, switchOpenRouter, switchOllama, switchGemini, switchAnthropic)
       |
       +-- helper functions (promptApiKey, buildTierMap, displayTierMap)
               |
       +-------+-------------------------------+
       |               |                       |
  Claude Code        OpenCode              Config Storage
  Client             Client             (~/.claude-ai-switcher/)
       |               |                       |
 ~/.claude/        ~/.config/opencode/      config.json
 settings.json    opencode.json           (API keys)
 ~/.claude.json
```

## Provider Architecture

```
                    Claude Code / OpenCode
                            |
                    +-------+-------+
                    | ANTHROPIC_    |
                    | BASE_URL      |
                    +-------+-------+
                            |
        +-------------------+-----------------------+
        |                   |                       |
   Direct Providers    LiteLLM Proxy Layer     No Config
   (Anthropic API)    (OpenAI -> Anthropic)  (coding-helper)
        |                   |                       |
   +----+----+        +----+----+              +---+---+
   |Alibaba  |        | :4000   |              |  GLM  |
   |OpenRouter|       |  |      |              |(MCP)  |
   |Anthropic |        | Ollama  |              +-------+
   +---------+        | :4001   |
                      |  |      |
                      | Gemini  |
                      +---------+
```

Anthropic, Alibaba, and OpenRouter speak the Anthropic Messages API natively.
Ollama and Gemini only speak OpenAI format, so LiteLLM translates between protocols.
GLM uses the coding-helper MCP server which handles its own configuration.

## Provider Switch Flow

When switching providers, the tool writes environment variables to `~/.claude/settings.json`:

```
                    +------------------+
                    |  switch command  |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Validate API key  |
                    |  (if required)    |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Validate model   |
                    |  (if specified)   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Build tier map   |
                    | (opus/sonnet/haiku)|
                    +--------+---------+
                             |
                    +--------v---------+
                    | Start LiteLLM     |  <-- Ollama/Gemini only
                    | proxy if needed   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Write settings   |
                    |  (backup first)   |
                    +--------+---------+
```

## Model Tier Alias System

Claude Code uses three env vars to alias model tiers:

```
ANTHROPIC_DEFAULT_OPUS_MODEL   -- maps to provider's opus model
ANTHROPIC_DEFAULT_SONNET_MODEL -- maps to provider's sonnet model
ANTHROPIC_DEFAULT_HAIKU_MODEL  -- maps to provider's haiku model
```

### Default Tier Maps

```
Provider    |  opus                     |  sonnet                   |  haiku
------------+---------------------------+---------------------------+---------------------------
Alibaba     |  qwen3.6-plus / selected  |  kimi-k2.5 / qwen3.6-plus|  glm-5 / kimi-k2.5
GLM         |  glm-5.1                  |  glm-5v-turbo             |  glm-5-turbo
OpenRouter  |  qwen/qwen3.6-plus:free   |  openrouter/free          |  openrouter/free
Ollama      |  deepseek-r1:latest       |  qwen2.5-coder:latest     |  llama3.1:latest
Gemini      |  gemini-2.5-pro           |  gemini-2.5-flash         |  gemini-2.5-flash-lite
Anthropic   |  (cleared)                |  (cleared)                |  (cleared)
```

Users can override tiers at switch time with `--opus`, `--sonnet`, `--haiku` flags.

## Provider Detection

`getCurrentProvider()` detects the active provider by inspecting `~/.claude/settings.json`:

```
+-------------------------------------------+
|  ANTHROPIC_BASE_URL contains              |
|  "coding-intl.dashscope.aliyuncs.com"     |--> Alibaba
|  "openrouter.ai"                          |--> OpenRouter
|  "localhost:4000"                         |--> Ollama (via LiteLLM)
|  "localhost:4001"                         |--> Gemini (via LiteLLM)
|  "z.ai"                                   |--> GLM (via coding-helper)
|  (absent)                                 |
|      +- mcpServers["glm-coding-plan"]     |--> GLM
|      +- tier map set but no BASE_URL      |--> GLM
|      +- (none of the above)               |--> Anthropic
+-------------------------------------------+
```

## LiteLLM Proxy Layer

Ollama and Gemini require a LiteLLM proxy to translate between Claude Code's Anthropic Messages API format and their native OpenAI Chat Completions format.

```
Claude Code (Anthropic API)
        |
        v
LiteLLM Proxy (translation layer)
        |
        +-- Port 4000 --> Ollama (localhost:11434)
        +-- Port 4001 --> Gemini API (generativelanguage.googleapis.com)
```

The proxy is automatically started as a detached background process when switching to Ollama or Gemini. Health checks poll `/health` on the respective port for up to 5 seconds.

## Config File Locations

| File | Purpose | Managed By |
|------|---------|------------|
| `~/.claude/settings.json` | Env vars for provider routing + model aliases | `claude-code.ts` |
| `~/.claude.json` | Onboarding flag (`hasCompletedOnboarding`) | `claude-code.ts` |
| `~/.config/opencode/opencode.json` | OpenCode provider and model config | `opencode.ts` |
| `~/.claude-ai-switcher/config.json` | API keys per provider (alibaba, openrouter, gemini) | `config.ts` |

## Cross-Platform Support

- All paths use `path.join()` + `os.homedir()` (no hardcoded `/home/`)
- `rimraf` for clean (no `rm -rf`)
- Platform detection for `which`/`where` commands (`platform() === "win32"`)
- Works on macOS, Linux, and Windows 11
