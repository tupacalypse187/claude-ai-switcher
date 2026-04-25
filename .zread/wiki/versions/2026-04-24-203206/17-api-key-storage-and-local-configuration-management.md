Claude AI Switcher maintains a **local-first credential store** at `~/.claude-ai-switcher/config.json` that holds API keys for every cloud-backed provider (Alibaba, OpenRouter, Gemini). This configuration layer is the sole persistent state the tool manages on its own — everything else lives in the target client's native settings files. The system is deliberately simple: a flat JSON file, read synchronously on demand, written atomically on update, with no encryption or platform-specific credential vault integration. Understanding this layer is essential because it is the single source of truth that feeds keys into both Claude Code's `~/.claude/settings.json` environment variables and OpenCode's `~/.config/opencode/opencode.json` provider entries.

Sources: [config.ts](src/config.ts#L1-L12), [index.ts](src/index.ts#L42-L43)

## The UserConfig Schema

The configuration file stores a single `UserConfig` object with optional fields for each provider's API key, plus optional defaults for the preferred provider and model. Because every field is optional, a fresh installation starts with an empty `{}` object, and fields appear only when the user supplies a key through a switch command, the `key` CLI command, or the interactive setup wizard.

```typescript
export interface UserConfig {
  alibabaApiKey?: string;
  openrouterApiKey?: string;
  geminiApiKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
}
```

The three key fields map directly to the providers that require authentication. Notably absent are Anthropic and GLM: Anthropic reads its key from the `ANTHROPIC_API_KEY` environment variable (the standard Claude Code convention), while GLM delegates authentication entirely to the external `@z_ai/coding-helper` CLI tool. Ollama runs locally and uses the literal string `"ollama"` as its auth token through the LiteLLM proxy. This means the config file only ever contains keys for **Alibaba**, **OpenRouter**, and **Gemini** — the three providers where the user holds a personal API key that must be persisted between sessions.

Sources: [config.ts](src/config.ts#L14-L20), [claude-code.ts](src/clients/claude-code.ts#L227-L228)

## File Location and Directory Structure

The configuration directory is resolved at runtime using `os.homedir()` and is fixed to `~/.claude-ai-switcher/`. The single config file sits at `~/.claude-ai-switcher/config.json`. The directory is created lazily on the first write operation — `ensureConfigDir()` calls `fs.ensureDir()` — so the tool can be installed and used to query status without ever creating the directory if no keys are set.

| Path | Purpose | Created When |
|------|---------|-------------|
| `~/.claude-ai-switcher/` | Configuration directory | First `writeConfig()` call |
| `~/.claude-ai-switcher/config.json` | API key store | First API key set |
| `~/.claude/settings.json` | Claude Code settings | Claude Code first run |
| `~/.claude.json` | Claude Code onboarding flag | First provider switch |
| `~/.config/opencode/opencode.json` | OpenCode settings | First OpenCode provider add |

Sources: [config.ts](src/config.ts#L11-L27), [claude-code.ts](src/clients/claude-code.ts#L31-L33), [opencode.ts](src/clients/opencode.ts#L23-L25)

## Core Read/Write Operations

The configuration manager exports four primary functions that form the entire CRUD surface for API keys. Each function follows a consistent pattern: read the file into memory, perform the operation, and (for writes) serialize back to disk with two-space indentation for human readability.

**`readConfig()`** checks whether the config file exists; if not, it returns an empty `{}` object rather than throwing. This graceful default is what allows every provider switch to call `getApiKey()` without first checking whether the config file has been initialized.

**`writeConfig(config)`** ensures the directory exists, then writes the serialized JSON with `JSON.stringify(config, null, 2)`. There is no file locking, no atomic rename, and no backup mechanism — the write is a direct overwrite. This is acceptable because the tool is inherently single-user and the config file is small enough that partial writes are extremely unlikely.

**`getApiKey(provider)`** reads the full config, then switches on the provider name to return the matching field. If the provider is unrecognized (for example, `"anthropic"` or `"glm"`), it returns `undefined`, which the calling code interprets as "no local key available — use another auth path."

**`setApiKey(provider, apiKey)`** reads the config, sets the matching field, and writes the entire object back. This is a read-modify-write cycle: concurrent calls could theoretically race, but the CLI's sequential execution model prevents this in practice.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API Key Lifecycle Flow                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User runs:  claude-switch alibaba qwen3.6-plus                    │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────┐    key found     ┌──────────────┐                 │
│  │ getApiKey() │─────────────────▶│ Use cached   │                 │
│  │             │                  │ key directly │                 │
│  └──────┬──────┘                  └──────┬───────┘                 │
│         │ no key                         │                         │
│         ▼                                │                         │
│  ┌──────────────┐                        │                         │
│  │ promptApiKey │                        │                         │
│  │  (readline)  │                        │                         │
│  └──────┬───────┘                        │                         │
│         │ user enters key                │                         │
│         ▼                                │                         │
│  ┌──────────────┐                        │                         │
│  │ setApiKey()  │                        │                         │
│  │  → write     │                        │                         │
│  │    config    │                        │                         │
│  └──────┬───────┘                        │                         │
│         │                                │                         │
│         └────────────┬───────────────────┘                         │
│                      ▼                                              │
│         ┌────────────────────────┐                                  │
│         │ configureClaudeAlibaba │                                  │
│         │  → write settings.json │                                  │
│         └────────────────────────┘                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Sources: [config.ts](src/config.ts#L32-L86), [index.ts](src/index.ts#L80-L98), [index.ts](src/index.ts#L138-L175)

## Key Acquisition: Three Entry Points

Users can supply API keys through three distinct mechanisms, all of which converge on the same `setApiKey()` → `writeConfig()` path.

### 1. Inline Prompt During Provider Switch

When a user switches to a provider that requires an API key (Alibaba, OpenRouter, or Gemini) and no key is stored locally, the tool invokes `promptApiKey()`. This function creates a `readline` interface, displays the provider name and a help URL where the user can obtain a key, and waits for input. If the user provides a non-empty string, the key is immediately persisted via `setApiKey()` before the provider configuration proceeds. If the user presses Enter without typing anything, the tool exits with an error. This just-in-time prompting means the user never needs to pre-configure keys — they are captured at the moment of first use.

Sources: [index.ts](src/index.ts#L80-L98)

### 2. The `key` CLI Command

The dedicated `claude-switch key <provider> [apikey]` command provides explicit key management. When called with a provider name and a key value, it writes the key to the config file and reports success. When called with only a provider name (no key argument), it reports whether a key is currently set without revealing the value. This is the recommended way to rotate or pre-set keys without triggering a full provider switch.

Sources: [index.ts](src/index.ts#L921-L943)

### 3. The Interactive Setup Wizard

The `claude-switch setup` command walks the user through all three key-bearing providers sequentially. For each provider, it first checks `hasApiKey()` — if a key already exists, the step is skipped entirely. Otherwise, it prompts for the key with an option to skip by pressing Enter. This wizard is the most user-friendly entry point for initial configuration because it handles all providers in a single session.

Sources: [index.ts](src/index.ts#L945-L1003)

## How Keys Flow into Client Configurations

Once an API key is stored in `~/.claude-ai-switcher/config.json`, it must be injected into the target client's configuration to take effect. The key flow differs between the two supported clients.

### Claude Code Key Injection

For Claude Code, the key is written into `~/.claude/settings.json` as an environment variable named `ANTHROPIC_AUTH_TOKEN`. Every provider that requires a key (Alibaba, OpenRouter, Gemini) uses this same environment variable slot — the differentiation between providers comes from the `ANTHROPIC_BASE_URL` env var, which points to the provider-specific endpoint. This means switching providers always overwrites the previous key in the Claude Code settings, but the **source key remains intact** in the claude-ai-switcher config. The next time the user switches back to a different provider, the correct key is re-read from the local config and written into Claude Code's settings.

```json
// ~/.claude/settings.json (after switching to OpenRouter)
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-or-v1-...",
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api/v1",
    "ANTHROPIC_MODEL": "qwen/qwen3.6-plus:free",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen/qwen3.6-plus:free",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "openrouter/free",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "openrouter/free"
  }
}
```

Sources: [claude-code.ts](src/clients/claude-code.ts#L141-L153), [claude-code.ts](src/clients/claude-code.ts#L204-L216)

### OpenCode Key Injection

For OpenCode, the key is embedded directly into `~/.config/opencode/opencode.json` as the `apiKey` field within the provider's `options` object. Unlike Claude Code's env-var approach, OpenCode stores the key inline in its provider schema. The key is read from the claude-ai-switcher config and written into the OpenCode provider configuration during `opencode add <provider>` commands.

Sources: [opencode.ts](src/clients/opencode.ts#L73-L88)

## Key Masking and Display Safety

The `maskKey()` utility in `verify.ts` provides a consistent masking format for displaying keys in terminal output. It preserves the first four and last four characters, replacing the middle with `...`. For keys eight characters or shorter, it returns the literal string `****`. This function is used exclusively in the `status` command output, where each verified key is displayed in its masked form alongside the verification result.

```
Example output from `claude-switch status`:
  ✓ alibaba      Key valid (sk-a...8f2d)
  ✗ openrouter   Authentication failed (sk-or...k9m1)
  ○ anthropic    No key configured
  ⚠ glm          coding-helper not installed
  ✓ ollama       Ollama + LiteLLM proxy running
  ✓ gemini       Key valid, proxy running (AIza...3xYp)
```

Sources: [verify.ts](src/verify.ts#L15-L20), [index.ts](src/index.ts#L810-L823)

## Provider Auth Strategy Matrix

Not every provider stores its credentials in the local config file. The following table summarizes the authentication strategy for each supported provider:

| Provider | Key Storage Location | Auth Mechanism | Config Field |
|----------|---------------------|----------------|--------------|
| **Alibaba** | `~/.claude-ai-switcher/config.json` | API key via `ANTHROPIC_AUTH_TOKEN` | `alibabaApiKey` |
| **OpenRouter** | `~/.claude-ai-switcher/config.json` | API key via `ANTHROPIC_AUTH_TOKEN` | `openrouterApiKey` |
| **Gemini** | `~/.claude-ai-switcher/config.json` | API key via `ANTHROPIC_AUTH_TOKEN` | `geminiApiKey` |
| **Anthropic** | `ANTHROPIC_API_KEY` env var | Native Claude Code auth | *(not stored locally)* |
| **GLM/Z.AI** | `@z_ai/coding-helper` CLI | External tool manages auth | *(not stored locally)* |
| **Ollama** | None (local) | Hardcoded `"ollama"` token | *(not applicable)* |

This three-tier auth architecture means the local config file serves as a credential cache for exactly the providers that sit between "fully local" (Ollama) and "fully external" (Anthropic, GLM). It is the bridge between the user's cloud API accounts and the Claude Code/OpenCode client settings.

Sources: [config.ts](src/config.ts#L52-L65), [index.ts](src/index.ts#L766-L769), [claude-code.ts](src/clients/claude-code.ts#L227-L228)

## Security Considerations

The configuration system makes a deliberate set of trade-offs that are important to understand:

**Plaintext storage.** API keys are stored as plain strings in a JSON file with standard user-level file permissions (`0o644` on most Unix systems). There is no encryption, no OS keychain integration, and no environment variable indirection. This is a conscious simplicity decision — the tool operates in a single-user CLI context where the threat model assumes the user's home directory is trusted.

**No key rotation support.** The `setApiKey()` function performs a full overwrite of the key field. There is no versioning, no expiration tracking, and no automatic rotation. To update a key, the user simply runs `claude-switch key <provider> <new-key>` or triggers a new prompt by deleting the config file.

**Backup-free config writes.** Unlike the Claude Code settings file (which creates timestamped `.backup.*` files on every write), the claude-ai-switcher config does not create backups. Since the config is regenerated on every key set operation, a corrupted file can be recovered by simply re-entering keys through the setup wizard.

**No credential sharing.** The config file is never read by any process other than `claude-switch` itself. Keys are extracted and injected into client-specific config files, but the original config file is not symlinked or referenced by Claude Code or OpenCode directly.

Sources: [config.ts](src/config.ts#L44-L47), [claude-code.ts](src/clients/claude-code.ts#L100-L112)

## CLI Commands for Key Management

The following commands provide direct access to the configuration layer:

| Command | Behavior |
|---------|----------|
| `claude-switch key <provider>` | Reports whether a key is set (without revealing it) |
| `claude-switch key <provider> <apikey>` | Sets or overwrites the key for the given provider |
| `claude-switch setup` | Interactive wizard that prompts for all missing keys |
| `claude-switch status` | Reads all keys and displays masked verification results |

The `key` command supports the three providers that use local storage: `alibaba`, `openrouter`, and `gemini`. Passing an unsupported provider name will call `setApiKey()`, which will match no case in the switch statement and write the config back unchanged — effectively a no-op with a success message, which is a known limitation of the current switch-based dispatch.

Sources: [index.ts](src/index.ts#L921-L943), [config.ts](src/config.ts#L70-L86)

## Next Steps

Now that you understand how API keys are stored and managed locally, explore how those keys are validated at runtime:

- **[API Key Verification: Lightweight HTTP Health Checks](18-api-key-verification-lightweight-http-health-checks)** — documents the verification module that confirms stored keys are valid by making lightweight requests to each provider's API.
- **[Interactive Setup Wizard](3-interactive-setup-wizard)** — covers the guided setup experience that walks users through initial key configuration.
- **[Claude Code Client: Settings, Environment Variables, and Backups](12-claude-code-client-settings-environment-variables-and-backups)** — explains how keys flow from the local config into Claude Code's settings file as environment variables.