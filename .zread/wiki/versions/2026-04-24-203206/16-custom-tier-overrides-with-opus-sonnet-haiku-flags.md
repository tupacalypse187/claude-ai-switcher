Claude Code internally references three model tiers — **opus**, **sonnet**, and **haiku** — via environment variables like `ANTHROPIC_DEFAULT_OPUS_MODEL`. When you switch to a non-Anthropic provider, Claude AI Switcher maps these tier aliases to equivalent models from the selected provider. The `--opus`, `--sonnet`, and `--haiku` CLI flags give you **per-invocation control** over those mappings, letting you override any tier's target model without modifying source code or provider defaults. This is essential when a provider adds a new model, when you want to experiment with a different capability profile, or when your workflow demands a specific model at a specific tier.

Sources: [claude-code.ts](src/clients/claude-code.ts#L35-L46), [models.ts](src/models.ts#L16-L20)

## How the Override Pipeline Works

The tier override system is a three-stage pipeline: **CLI flag capture → default merging → environment variable injection**. Each stage has a single responsibility and a well-defined contract with the next.

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Tier Override Pipeline                           │
│                                                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐  │
│  │  Stage 1:        │    │  Stage 2:         │    │  Stage 3:      │  │
│  │  addTierOptions()│───▶│  buildTierMap()   │───▶│ applyTierMap() │  │
│  │                  │    │                   │    │                │  │
│  │  Attaches --opus,│    │  Merges provider  │    │ Writes to      │  │
│  │  --sonnet,       │    │  defaults with    │    │ ~/.claude/     │  │
│  │  --haiku flags   │    │  CLI overrides    │    │ settings.json  │  │
│  │  to Commander    │    │  (CLI wins)       │    │ env vars       │  │
│  └─────────────────┘    └──────────────────┘    └────────────────┘  │
│                                                                      │
│  Commander context        Merge logic              Claude Code reads  │
│  (src/index.ts)           (src/index.ts)           at startup        │
│                                                   (claude-code.ts)  │
└──────────────────────────────────────────────────────────────────────┘
```

**Stage 1** — `addTierOptions()` is a higher-order function that wraps any Commander `Command` object and attaches three `--option` definitions. It returns the modified `Command`, enabling a fluent chaining pattern. Each option accepts a `<model>` string argument. The `anthropic` command is the only provider switch command that deliberately omits this wrapper, since switching to native Anthropic clears all tier overrides entirely.

**Stage 2** — `buildTierMap()` takes a provider's default `ModelTierMap` and the parsed CLI options object. It applies a simple fallback rule: if the user provided a flag value, use it; otherwise, fall back to the provider default. This means you can override **one, two, or all three** tiers independently in a single invocation.

**Stage 3** — `applyTierMap()` writes the resolved tier map into `~/.claude/settings.json` under the `env` key. Three environment variable names are used, each corresponding to a Claude Code tier alias: `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL`. When Claude Code starts, it reads these environment variables and routes each tier's requests to the specified model identifier.

Sources: [index.ts](src/index.ts#L100-L123), [claude-code.ts](src/clients/claude-code.ts#L35-L46)

## The buildTierMap Merge Function

The merge function is intentionally minimal — a three-line object literal with `||` fallback per tier. This design choice means **CLI flags always win** over defaults, and there is no partial merge or validation at this stage. Validation of whether the model identifier is valid happens at the provider layer, not at the merge layer.

```typescript
function buildTierMap(
  defaultMap: ModelTierMap,
  opts: { opus?: string; sonnet?: string; haiku?: string }
): ModelTierMap {
  return {
    opus:   opts.opus   || defaultMap.opus,
    sonnet: opts.sonnet || defaultMap.sonnet,
    haiku:  opts.haiku  || defaultMap.haiku
  };
}
```

The `opts` parameter comes directly from Commander's parsed options. If `--opus my-custom-model` is passed, `opts.opus` is `"my-custom-model"`; if omitted, `opts.opus` is `undefined` and the `||` falls through to the provider default. This means passing `--opus ""` (empty string) would still fall through, since `"" || default` evaluates to `default` — a subtle but correct behavior for this use case.

Sources: [index.ts](src/index.ts#L100-L109)

## Environment Variable Contract

The `TIER_ENV_KEYS` constant in the Claude Code client establishes the mapping between the abstract tier names and the concrete environment variable names that Claude Code expects:

| Tier Alias | Environment Variable | Purpose |
|------------|---------------------|---------|
| `opus` | `ANTHROPIC_DEFAULT_OPUS_MODEL` | Routes the "most capable" tier |
| `sonnet` | `ANTHROPIC_DEFAULT_SONNET_MODEL` | Routes the "balanced" tier |
| `haiku` | `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Routes the "fast/cheap" tier |

The `applyTierMap()` function ensures the `settings.env` object exists before writing, then assigns all three keys unconditionally — even if the value is the same as the provider default. This guarantees a consistent state in the settings file. The corresponding `clearTierMap()` function performs the inverse operation, deleting all three keys and cleaning up the `env` object entirely if it becomes empty. This clearing happens exclusively when switching to the `anthropic` provider.

Sources: [claude-code.ts](src/clients/claude-code.ts#L35-L57)

## Provider Default Tier Maps

Each non-Anthropic provider ships with a curated default tier map that maps Claude's opus/sonnet/haiku tiers to the closest equivalent models in that provider's catalog. These defaults are defined as either **static constants** or **factory functions** depending on the provider's complexity:

| Provider | Opus Default | Sonnet Default | Haiku Default | Definition Type |
|----------|-------------|----------------|---------------|-----------------|
| **GLM/Z.AI** | `glm-5.1` | `glm-5v-turbo` | `glm-5-turbo` | Static constant |
| **OpenRouter** | `qwen/qwen3.6-plus:free` | `openrouter/free` | `openrouter/free` | Static constant |
| **Ollama** | `deepseek-r1:latest` | `qwen2.5-coder:latest` | `llama3.1:latest` | Static constant |
| **Gemini** | `gemini-2.5-pro` | `gemini-2.5-flash` | `gemini-2.5-flash-lite` | Static constant |
| **Alibaba** | *(dynamic)* | *(dynamic)* | *(dynamic)* | Factory function |

The **Alibaba provider** is the exception — it uses `getAlibabaTierMap(model)`, a factory function that adjusts defaults based on the selected primary model. When using the default model (`qwen3.6-plus`), the tier map uses a diverse spread across three different model families (Qwen, Kimi, GLM). When a non-default model is selected, that model becomes the opus tier while the sonnet and haiku tiers shift to the standard defaults (`qwen3.6-plus` and `kimi-k2.5`). This dynamic behavior ensures the opus tier always reflects the user's chosen model while maintaining sensible fallbacks for the other tiers.

Sources: [models.ts](src/models.ts#L22-L69)

## Which Commands Support Tier Overrides

The `addTierOptions()` wrapper is applied to every provider switch command **except** `anthropic`. Both the top-level shorthand commands and the explicit `claude` subcommands receive the same tier option treatment:

| Command | Tier Overrides? | Reason |
|---------|:--------------:|--------|
| `claude-switch alibaba [model]` | ✅ | Full tier control |
| `claude-switch glm` | ✅ | Full tier control |
| `claude-switch openrouter [model]` | ✅ | Full tier control |
| `claude-switch ollama [model]` | ✅ | Full tier control |
| `claude-switch gemini [model]` | ✅ | Full tier control |
| `claude-switch anthropic` | ❌ | Clears all tier overrides |
| `claude-switch claude <subcommand>` | *(same as above)* | Mirrors top-level behavior |

When you switch to Anthropic, the `clearTierMap()` function removes all three `ANTHROPIC_DEFAULT_*_MODEL` entries from `settings.env`, restoring Claude Code's native model resolution where it uses Anthropic's own models for each tier.

Sources: [index.ts](src/index.ts#L364-L439), [index.ts](src/index.ts#L461-L524)

## Usage Examples

The tier override flags are appended to any provider switch command. Here are practical scenarios demonstrating the range of control:

**Override a single tier** — Use GLM/Z.AI but route the opus tier to `glm-5` instead of the default `glm-5.1`:
```bash
claude-switch glm --opus glm-5
```
Result: opus → `glm-5`, sonnet → `glm-5v-turbo` (default), haiku → `glm-5-turbo` (default).

**Override all three tiers** — Use OpenRouter with a completely custom model selection:
```bash
claude-switch openrouter --opus "qwen/qwen3.6-plus:free" --sonnet "meta-llama/llama-4-maverick:free" --haiku "google/gemma-3-27b-it:free"
```

**Combine with model selection** — Use Alibaba's `qwen3-coder-plus` as the primary model while overriding the haiku tier:
```bash
claude-switch alibaba qwen3-coder-plus --haiku glm-4.7-flash
```
Result: opus → `qwen3-coder-plus` (selected model becomes opus), sonnet → `qwen3.6-plus` (Alibaba default), haiku → `glm-4.7-flash` (override).

**Use Ollama with custom tier spread** — Use `deepseek-r1:latest` for opus but override sonnet and haiku to different local models:
```bash
claude-switch ollama --sonnet "codellama:latest" --haiku "phi3:latest"
```
Result: opus → `deepseek-r1:latest` (default), sonnet → `codellama:latest` (override), haiku → `phi3:latest` (override).

After any switch, the tool displays the resolved tier mapping via `displayTierMap()`:
```
  Claude model aliases:
    ANTHROPIC_DEFAULT_OPUS_MODEL   → glm-5
    ANTHROPIC_DEFAULT_SONNET_MODEL → glm-5v-turbo
    ANTHROPIC_DEFAULT_HAIKU_MODEL  → glm-5-turbo
```
This output serves as immediate confirmation that your overrides were applied correctly.

Sources: [index.ts](src/index.ts#L111-L116)

## Architectural Relationship to Tier Alias System

The custom tier override flags are the **runtime mutation layer** sitting above the static tier alias system documented in [Model Tier Alias Mapping (Opus/Sonnet/Haiku)](15-model-tier-alias-mapping-opus-sonnet-haiku). While that page describes the default mappings and the `ModelTierMap` type definition, this page covers the user-facing mechanism for overriding those defaults at invocation time. The downstream effect — how `applyTierMap()` writes to `settings.json` and how Claude Code reads those environment variables — is detailed in [Claude Code Client: Settings, Environment Variables, and Backups](12-claude-code-client-settings-environment-variables-and-backups).

The override pipeline maintains a clean separation of concerns: `models.ts` owns the data types and provider defaults, `index.ts` owns the CLI surface and merge logic, and `claude-code.ts` owns the settings file contract. No cross-cutting coupling exists between these layers — each communicates solely through the `ModelTierMap` interface.