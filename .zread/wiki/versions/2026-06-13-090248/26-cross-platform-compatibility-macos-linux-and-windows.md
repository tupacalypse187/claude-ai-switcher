Claude AI Switcher is engineered to run on any operating system where Node.js 18+ is available — macOS, Linux, and Windows alike. This page examines the specific strategies the codebase employs to abstract away platform differences: from home-directory path resolution, to binary-existence checks that branch on the OS, to the deliberate choices around process spawning and filesystem libraries. Understanding these patterns is essential for contributors who want to extend the tool without breaking a platform they don't personally use.

## Platform Abstraction Strategy Overview

The codebase does not rely on conditional compilation or platform-specific package variants. Instead, it achieves cross-platform support through four orthogonal mechanisms: **path normalization** via `os.homedir()` and `path.join()`, **binary detection** via `where`/`which` branching, **filesystem operations** via the `fs-extra` library, and **external tool orchestration** via `child_process` with carefully chosen `shell` flags. Each of these mechanisms operates at a different layer of the system stack, and together they form a defense-in-depth approach to platform portability.

```mermaid
graph TD
    A[Claude AI Switcher] --> B[Path Layer]
    A --> C[Binary Detection Layer]
    A --> D[Filesystem Layer]
    A --> E[Process Layer]

    B --> B1["os.homedir<br/>+ path.join()"]
    B --> B2["~/.claude-ai-switcher/<br/>~/.claude/<br/>~/.config/opencode/"]

    C --> C1{platform() === 'win32'?}
    C1 -->|Yes| C2["where <binary>"]
    C1 -->|No| C3["which <binary>"]
    C2 --> C4[litellm / ollama / coding-helper]
    C3 --> C4

    D --> D1[fs-extra]
    D1 --> D2["ensureDir / copyFile<br/>readFile / writeFile"]
    D1 --> D3[Backup timestamps]

    E --> E1[spawn detached]
    E --> E2["shell: false (Ollama)<br/>shell: true (Gemini)"]
    E --> E3["exec (which/where)<br/>execFileSync (hooks)"]
```

Sources: [config.ts](src/config.ts#L1-L12), [claude-code.ts](src/clients/claude-code.ts#L7-L33), [ollama.ts](src/providers/ollama.ts#L14-L55), [hooks/index.ts](src/hooks/index.ts#L12-L22)

## Home-Directory Path Resolution

The foundation of cross-platform compatibility is that every configuration file path is constructed dynamically using Node's `os.homedir()` combined with `path.join()`. The `path.join()` function normalizes path separators automatically — producing backslashes (`\`) on Windows and forward slashes (`/`) on Unix-like systems — so the same source code produces correct paths regardless of the host OS. Three distinct home-directory-based locations are used throughout the codebase.

| Location | Path Template | Resolves To (Windows) | Resolves To (Unix) | Source Module |
|---|---|---|---|---|
| Claude AI Switcher config | `~/.claude-ai-switcher/config.json` | `C:\Users\<user>\.claude-ai-switcher\config.json` | `/home/<user>/.claude-ai-switcher/config.json` | `src/config.ts` |
| Claude Code settings | `~/.claude/settings.json` and `~/.claude.json` | `C:\Users\<user>\.claude\settings.json` | `/home/<user>/.claude/settings.json` | `src/clients/claude-code.ts` |
| OpenCode settings | `~/.config/opencode/opencode.json` | `C:\Users\<user>\.config\opencode\opencode.json` | `/home/<user>/.config/opencode/opencode.json` | `src/clients/opencode.ts` |

The OpenCode path follows the XDG Base Directory Specification convention (`~/.config/...`), which is native to Linux but works fine on Windows because `os.homedir()` always returns a valid directory and `fs-extra`'s `ensureDir` creates any missing intermediate directories. No special Windows registry locations or `%APPDATA%` paths are used — the tool deliberately keeps everything within the home directory for simplicity and predictability across all three platforms.

Sources: [config.ts](src/config.ts#L7-L12), [claude-code.ts](src/clients/claude-code.ts#L31-L33), [opencode.ts](src/clients/opencode.ts#L7-L24)

## Binary Existence Detection: `where` vs `which`

Several providers depend on externally-installed command-line tools — LiteLLM (for Ollama and Gemini proxy translation), Ollama itself, and the Z.AI coding-helper. Before attempting to use these tools, Claude AI Switcher checks whether they exist on the system `PATH`. Because Windows and Unix use different built-in commands for this purpose, every existence check branches on `platform()`:

```typescript
const cmd = platform() === "win32" ? "where litellm" : "which litellm";
await execAsync(cmd);
```

The `where` command (Windows) and `which` command (Unix/macOS) both search the `PATH` environment variable and succeed (exit code 0) if the binary is found. This pattern appears in four modules, each checking for a different external dependency.

| Provider Module | Binary Checked | Detection Code Location | Fallback Behavior |
|---|---|---|---|
| Ollama | `litellm` | `src/providers/ollama.ts#L48-L60` | Returns `false`; CLI prints install instructions |
| Ollama | `ollama` | `src/providers/ollama.ts#L65-L77` | Returns `false`; CLI prints download URL |
| Gemini | `litellm` | `src/providers/gemini.ts#L48-L61` | Returns `false`; CLI prints install instructions |
| GLM/Z.AI | `coding-helper` | `src/providers/glm.ts#L29-L41` | Returns `false`; CLI prints npm install command |
| Verification | `coding-helper` | `src/verify.ts#L92-L104` | Returns error status in verify results |

Note that the Alibaba, Anthropic, and OpenRouter providers do **not** require binary existence checks because they communicate purely through HTTP `fetch` calls to cloud-hosted APIs. Only providers that spawn local processes need this validation.

Sources: [ollama.ts](src/providers/ollama.ts#L48-L77), [gemini.ts](src/providers/gemini.ts#L48-L61), [glm.ts](src/providers/glm.ts#L29-L41), [verify.ts](src/verify.ts#L92-L104)

## Process Spawning: Detached Proxies and Shell Semantics

The LiteLLM proxy providers (Ollama and Gemini) spawn long-running background processes using Node's `child_process.spawn`. Both use `detached: true` and `child.unref()` to orphan the child process so it survives after Claude AI Switcher exits. However, they diverge on the `shell` option — a difference with meaningful cross-platform implications.

| Provider | `shell` Flag | Spawn Location | Implication |
|---|---|---|---|
| Ollama | `false` | `src/providers/ollama.ts#L124-L128` | Requires `litellm` to be directly executable on PATH |
| Gemini | `true` | `src/providers/gemini.ts#L113-L118` | Wraps command through the system shell interpreter |

On **Unix systems**, `spawn("litellm", [...], { shell: false })` works because `litellm` is installed as a POSIX executable script with a shebang line. On **Windows**, Python-installed packages like `litellm` typically create `.cmd` or `.bat` wrapper scripts. When `shell: false`, Node's `spawn` cannot resolve these wrapper scripts because it looks for a literal executable named `litellm`, not `litellm.cmd`. The Gemini provider avoids this issue by setting `shell: true`, which routes the command through `cmd.exe` on Windows, correctly resolving `.cmd` wrappers.

The Ollama provider also passes no environment variables, while the Gemini provider injects `GEMINI_API_KEY` into the child environment via `env: { ...process.env, GEMINI_API_KEY: apiKey }`. Both spawn configurations use `stdio: "ignore"` to suppress child process output, keeping the terminal clean during the health-check polling phase.

Sources: [ollama.ts](src/providers/ollama.ts#L116-L146), [gemini.ts](src/providers/gemini.ts#L101-L136)

## Filesystem Operations via `fs-extra`

Rather than using Node's built-in `fs` module with its callback-style API, Claude AI Switcher relies on `fs-extra` — a drop-in replacement that adds promise-based methods and convenience functions like `ensureDir`, `copy`, `pathExists`, and `remove`. This library abstracts away platform-specific filesystem quirks such as directory creation race conditions and recursive path resolution.

The backup strategy is particularly worth noting. When writing Claude Code settings or OpenCode configuration, the tool creates timestamped backups using `Date.now()` appended to the filename. This approach is platform-agnostic because timestamps are just numbers embedded in a filename string, and `path.join` handles the separator. The backup files accumulate in the same directory as the original, using the pattern `settings.json.backup.<timestamp>`.

```typescript
// Cross-platform backup pattern (from claude-code.ts)
const backupPath = `${SETTINGS_FILE}.backup.${Date.now()}`;
await fs.copyFile(SETTINGS_FILE, backupPath);
```

The `fs-extra` `ensureDir` method is used to create parent directories before writing — this is critical because on a fresh installation, directories like `~/.claude/` or `~/.config/opencode/` may not exist yet. The `ensureDir` call is idempotent and recursive, creating all intermediate directories in one call.

Sources: [claude-code.ts](src/clients/claude-code.ts#L100-L126), [config.ts](src/config.ts#L25-L27), [opencode.ts](src/clients/opencode.ts#L52-L67), [hooks/index.ts](src/hooks/index.ts#L47-L59)

## TypeScript Build Configuration

The `tsconfig.json` includes two compiler options that directly contribute to cross-platform reliability. The `forceConsistentCasingInFileNames` flag enforces that import paths match the actual casing of the source files on disk. This is essential because Windows and macOS use case-insensitive filesystems (NTFS and APFS respectively), while Linux uses case-sensitive filesystems. Without this flag, an import like `import { X } from "./Models"` would work on Windows but fail on Linux if the file is actually named `models.ts`.

| Compiler Option | Value | Cross-Platform Purpose |
|---|---|---|
| `forceConsistentCasingInFileNames` | `true` | Prevents case-sensitivity import failures on Linux |
| `target` | `ES2020` | Ensures broad Node.js compatibility |
| `module` | `commonjs` | Maximizes `require()` compatibility for CLI tools |
| `esModuleInterop` | `true` | Smooths import interop between CJS and ESM |

The `engines` field in `package.json` declares `node >= 18.0.0` as the minimum runtime. This floor is set by the use of native `fetch` — available globally in Node 18+ — which the tool relies on for all HTTP-based API key verification and health checks, eliminating the need for platform-specific HTTP libraries.

Sources: [tsconfig.json](tsconfig.json#L1-L19), [package.json](package.json#L54-L56)

## Hook Script Execution

The hooks subsystem (token tracker and visual enhancements) consists of plain JavaScript files that are installed into `~/.claude/` and executed via `node` subprocess. The hook manager uses `execFileSync("node", [scriptPath, ...args])` to run these scripts in isolated child processes. This approach is inherently cross-platform because `node` is guaranteed to be on the PATH (it's the same runtime running the main CLI), and the hook scripts themselves use only Node's built-in `fs`, `path`, and `os` modules — no native addons or platform-specific dependencies.

One subtle compatibility concern is that the hooks use raw ANSI escape codes (e.g., `\x1b[32m` for green) rather than the `chalk` library that the main CLI uses. Modern terminals on all three platforms — Windows Terminal, iTerm2, GNOME Terminal — support ANSI codes. However, legacy Windows `cmd.exe` (pre-Windows 10 build 14393) does not interpret ANSI sequences and would display them as literal characters. The main CLI avoids this issue because `chalk` automatically detects terminal capabilities and degrades gracefully.

Sources: [hooks/index.ts](src/hooks/index.ts#L152-L159), [token-tracker.js](src/hooks/token-tracker.js#L188-L192), [display.ts](src/display.ts#L1-L6)

## External Dependency Matrix

Claude AI Switcher integrates with several external tools whose availability varies by platform. The table below summarizes what each provider requires, how it's detected, and any platform-specific caveats.

| Provider | External Dependencies | Detection Method | Windows Notes | macOS/Linux Notes |
|---|---|---|---|---|
| Anthropic | None (cloud API) | N/A | — | — |
| Alibaba | None (cloud API) | N/A | — | — |
| OpenRouter | None (cloud API) | N/A | — | — |
| GLM/Z.AI | `@z_ai/coding-helper` (npm global) | `where`/`which coding-helper` | Works via npm global bin | Works via npm global bin |
| Ollama | `litellm` (pip), `ollama` (native binary) | `where`/`which litellm`, `where`/`which ollama` | LiteLLM spawn may need `shell: true`; see note below | Direct spawn works |
| Gemini | `litellm` (pip) | `where`/`which litellm` | Uses `shell: true`, handles `.cmd` wrappers | Works via system shell |

The most significant platform-specific caveat is the Ollama LiteLLM proxy spawn using `shell: false` (`src/providers/ollama.ts#L127`). On Windows, if `litellm` is installed via pip, it typically creates a `litellm.cmd` wrapper script. Node's `spawn` with `shell: false` cannot resolve `.cmd` files, which means the Ollama provider may fail to start the proxy on Windows. The Gemini provider, by contrast, uses `shell: true` and would work correctly in the same scenario. This is the primary asymmetry in cross-platform behavior within the codebase.

Sources: [ollama.ts](src/providers/ollama.ts#L48-L77), [gemini.ts](src/providers/gemini.ts#L48-L61), [glm.ts](src/providers/glm.ts#L29-L41), [index.ts](src/index.ts#L264-L323)

## Hook Installation Path Resolution

The hook installation mechanism resolves source and destination paths relative to `__dirname`, which in a CommonJS build (the project compiles to `commonjs` modules) always points to the compiled `dist/` directory. The source hook files are copied from `dist/hooks/` to `~/.claude/` during installation. The `copy-hooks.js` build script uses `path.join(__dirname, '..', 'src', 'hooks')` to locate source files and copies only `.js` files to `dist/hooks/` during the build step.

This `__dirname`-relative resolution works identically across all platforms because the compiled output maintains the same relative directory structure regardless of OS. Global npm installs place the package in a platform-specific prefix (e.g., `C:\Users\<user>\AppData\Roaming\npm\node_modules\` on Windows or `/usr/local/lib/node_modules/` on Unix), but `__dirname` always resolves to the package's `dist/` subdirectory within that prefix.

Sources: [hooks/index.ts](src/hooks/index.ts#L17-L22), [copy-hooks.js](scripts/copy-hooks.js#L1-L15)

## Platform-Safe Configuration Patterns Summary

The codebase demonstrates several patterns that contributors should follow when adding new features:

1. **Always use `path.join(os.homedir(), ...)`** for user-specific file paths — never hardcode `/home/`, `/Users/`, or `C:\Users\`.
2. **Always branch binary checks** using `platform() === "win32"` when calling `where` vs `which`.
3. **Prefer `fs-extra`** over native `fs` for its promise API, `ensureDir`, and `pathExists` convenience methods.
4. **Use `shell: true` in `spawn`** when the target binary may be a `.cmd`/`.bat` wrapper on Windows (as is common for pip-installed packages).
5. **Enable `forceConsistentCasingInFileNames`** (already done in `tsconfig.json`) and match import casing to filenames exactly.
6. **Target Node.js 18+** to guarantee native `fetch` availability without polyfills.

Sources: [config.ts](src/config.ts#L7-L12), [ollama.ts](src/providers/ollama.ts#L54-L55), [claude-code.ts](src/clients/claude-code.ts#L100-L111), [tsconfig.json](tsconfig.json#L11), [package.json](package.json#L54-L56)

## Next Steps

- Learn how to implement a new provider while following these cross-platform patterns in [Adding a New Provider: Step-by-Step Implementation Guide](27-adding-a-new-provider-step-by-step-implementation-guide).
- Understand the TypeScript build pipeline that compiles to cross-platform JavaScript in [Build Toolchain: TypeScript Configuration and npm Scripts](25-build-toolchain-typescript-configuration-and-npm-scripts).
- Explore how LiteLLM proxies are spawned and health-checked across platforms in [LiteLLM Proxy Lifecycle: Spawning, Health Checks, and Port Allocation](10-litellm-proxy-lifecycle-spawning-health-checks-and-port-allocation).