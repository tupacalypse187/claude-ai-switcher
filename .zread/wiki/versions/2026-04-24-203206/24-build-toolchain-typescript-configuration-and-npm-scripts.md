Claude AI Switcher is a pure TypeScript CLI application that compiles to a single CommonJS entry point distributed via npm. The build pipeline is deliberately minimalist — four npm scripts, a zero-config compilation step, and no bundler — yet it produces a production-ready CLI tool with full type declarations and source maps. This page deconstructs every layer of that toolchain: the TypeScript compiler configuration, the package manifest that governs distribution, the npm script lifecycle, and the module resolution strategy that ties source to output.

Sources: [tsconfig.json](tsconfig.json#L1-L19), [package.json](package.json#L1-L46)

## TypeScript Compiler Configuration

The project's `tsconfig.json` is compact but encodes several deliberate architectural decisions that shape how the source is compiled, how modules resolve, and what developer experience artifacts are emitted alongside the JavaScript output.

Sources: [tsconfig.json](tsconfig.json#L1-L19)

### Compilation Target and Module System

The compiler targets **ES2020** as both the language feature level (`target`) and the standard library baseline (`lib`). This is a pragmatic choice: ES2020 includes `BigInt`, optional chaining (`?.`), nullish coalescing (`??`), and `Promise.allSettled` — all features available in Node.js 14+, well within the project's stated minimum of Node.js 18. The module output format is **CommonJS** (`"module": "commonjs"`), which is the native module system for Node.js and required for the CLI entry point to work as a plain `node` executable without ESM file extensions or `package.json` `"type": "module"` declarations.

Sources: [tsconfig.json](tsconfig.json#L2-L5), [package.json](package.json#L44-L45)

### Path Mapping and Directory Layout

The compilation maps the source tree one-to-one into the output directory via two options:

| Option | Value | Purpose |
|---|---|---|
| `rootDir` | `./src` | Establishes the source root; TypeScript preserves the directory structure relative to this root |
| `outDir` | `./dist` | All emitted files land here; `rootDir` structure is mirrored exactly |
| `include` | `src/**/*` | Explicitly scopes compilation to source files only |
| `exclude` | `node_modules`, `dist` | Prevents accidental compilation of dependencies or stale output |

The result is a `dist/` directory that is an exact structural mirror of `src/`, with each `.ts` file producing up to four artifacts: `.js` (compiled JavaScript), `.d.ts` (type declarations), `.js.map` (source map), and `.d.ts.map` (declaration map).

Sources: [tsconfig.json](tsconfig.json#L6-L18)

### Strictness and Safety Flags

Three flags enforce type-system rigor across the codebase:

- **`strict: true`** — enables the full suite of strict checks (`strictNullChecks`, `strictFunctionTypes`, `strictBindIsCallApply`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`). This is the single most impactful setting for catching null-pointer errors and implicit `any` types at compile time.
- **`forceConsistentCasingInFileNames: true`** — prevents case-sensitivity mismatches in import paths, a critical guard for cross-platform compatibility since macOS is case-insensitive by default while Linux CI environments are case-sensitive. This directly supports the project's cross-platform goals documented in [Cross-Platform Compatibility (macOS, Linux, Windows)](22-cross-platform-compatibility-macos-linux-windows).
- **`skipLibCheck: true`** — skips type-checking of declaration files in `node_modules`, reducing compile time without sacrificing the project's own type safety.

Sources: [tsconfig.json](tsconfig.json#L8-L11)

### Interop and Declaration Emission

The **`esModuleInterop: true`** flag is essential for this project because its runtime dependencies include ESM-only packages — notably `chalk@^5.3.0` and `ora@^8.0.1`. This flag enables the `import chalk from "chalk"` syntax in TypeScript source, which compiles to `__importDefault(require("chalk"))` in the CommonJS output. The interop helper correctly unwraps the `default` export from ESM modules at runtime. This also enables `resolveJsonModule: true`, allowing JSON config files to be imported as typed objects.

The declaration generation trio — **`declaration: true`**, **`declarationMap: true`**, and **`sourceMap: true`** — ensures that downstream consumers (or the project's own IDE) can navigate from compiled output back to original TypeScript source. Declaration maps link `.d.ts` files to `.ts` sources; source maps link `.js` files to `.ts` sources.

Sources: [tsconfig.json](tsconfig.json#L9-L15), [dist/display.js](dist/display.js#L18)

## Package Manifest and Distribution

The `package.json` file serves triple duty: it defines the npm package metadata, declares the CLI entry point, and specifies the dependency graph that shapes both the runtime bundle and the development toolchain.

Sources: [package.json](package.json#L1-L46)

### Entry Points and Binary Registration

```json
"main": "dist/index.js",
"bin": {
  "claude-switch": "./dist/index.js"
}
```

The `"main"` field points to the compiled entry point, making the package consumable as a library via `require("claude-ai-switcher")`. The `"bin"` field registers the `claude-switch` command globally when the package is installed with `npm install -g`. This works because the source file `src/index.ts` opens with a shebang line (`#!/usr/bin/env node`), which TypeScript faithfully preserves through compilation — the emitted `dist/index.js` retains the shebang as its first line, making it directly executable.

Sources: [package.json](package.json#L5-L8), [src/index.ts](src/index.ts#L1), [dist/index.js](dist/index.js#L1)

### Dependency Architecture

The dependency graph is split between runtime dependencies (shipped to end users) and development dependencies (used only during build):

| Category | Package | Version | Role |
|---|---|---|---|
| **Runtime** | `commander` | `^11.1.0` | CLI argument parser and command definition |
| **Runtime** | `chalk` | `^5.3.0` | Terminal color output (ESM-only) |
| **Runtime** | `ora` | `^8.0.1` | Terminal spinner for async operations (ESM-only) |
| **Runtime** | `fs-extra` | `^11.2.0` | Enhanced file system operations with promise support |
| **Development** | `typescript` | `^5.3.0` | TypeScript compiler |
| **Development** | `ts-node` | `^10.9.2` | Direct `.ts` execution for the `dev` script |
| **Development** | `rimraf` | `^5.0.0` | Cross-platform `rm -rf` for the `clean` script |
| **Development** | `@types/node` | `^20.10.0` | Node.js type definitions |
| **Development** | `@types/fs-extra` | `^11.0.4` | fs-extra type definitions |

The runtime dependencies map directly to the architectural modules documented in [Project Architecture and Module Responsibilities](7-project-architecture-and-module-responsibilities): `commander` drives the CLI layer, `chalk` and `ora` power the display formatting described in [Console Output Formatting with Chalk and Ora](21-console-output-formatting-with-chalk-and-ora), and `fs-extra` underpins the configuration management in [API Key Storage and Local Configuration Management](17-api-key-storage-and-local-configuration-management).

Sources: [package.json](package.json#L30-L42)

### Engine Constraints

```json
"engines": {
  "node": ">=18.0.0"
}
```

The Node.js 18 minimum is set to guarantee availability of `fetch` (globally available since Node.js 18), `structuredClone`, and the full set of ES2020+ features. This floor also ensures compatibility with the ESM/CJS interop requirements of `chalk@5` and `ora@8`, which rely on Node.js's ability to `require()` ESM-only packages — a capability that became stable in Node.js 22 but is handled by the `esModuleInterop` shim in earlier versions.

Sources: [package.json](package.json#L43-L45)

## npm Script Lifecycle

The project defines four npm scripts that form a complete build-run-clean cycle:

```
┌─────────────┐    tsc     ┌────────────┐   node dist/index.js   ┌──────────────┐
│  TypeScript  │ ────────▶  │   dist/     │ ────────────────────▶  │  CLI Output   │
│   src/       │            │  (JS + maps)│                        │              │
└─────────────┘            └────────────┘                        └──────────────┘
       │                          │                                      │
       │  ts-node src/index.ts    │  rimraf dist/                       │
       │  (dev: skip build)       │  (clean: reset)                     │
       └──────────────────────────┘                                      │
```

### `npm run build` — TypeScript Compilation

Executes `tsc` with no additional flags. This reads `tsconfig.json`, compiles every file matching `src/**/*`, and emits the mirrored output tree into `dist/`. The compilation produces the following artifact matrix per source file:

```
src/
├── index.ts              ──▶  dist/index.js, index.d.ts, index.js.map, index.d.ts.map
├── config.ts             ──▶  dist/config.js, config.d.ts, config.js.map, config.d.ts.map
├── display.ts            ──▶  dist/display.js, display.d.ts, display.js.map, display.d.ts.map
├── models.ts             ──▶  dist/models.js, models.d.ts, models.js.map, models.d.ts.map
├── verify.ts             ──▶  dist/verify.js, verify.d.ts, verify.js.map, verify.d.ts.map
├── clients/
│   ├── claude-code.ts    ──▶  dist/clients/claude-code.js, ...
│   └── opencode.ts       ──▶  dist/clients/opencode.js, ...
└── providers/
    ├── anthropic.ts      ──▶  dist/providers/anthropic.js, ...
    ├── alibaba.ts        ──▶  dist/providers/alibaba.js, ...
    ├── gemini.ts         ──▶  dist/providers/gemini.js, ...
    ├── glm.ts            ──▶  dist/providers/glm.js, ...
    ├── ollama.ts         ──▶  dist/providers/ollama.js, ...
    └── openrouter.ts     ──▶  dist/providers/openrouter.js, ...
```

Each source file generates four output artifacts. The declaration files (`.d.ts`) enable downstream TypeScript consumers to get full type information. The source maps (`.js.map` and `.d.ts.map`) enable debugger and IDE navigation back to original source.

Sources: [package.json](package.json#L10)

### `npm start` — Production Execution

Runs `node dist/index.js` directly. This is the production execution path — it requires a prior `npm run build` to generate the `dist/` directory. The shebang line in the compiled output ensures the file is executable as a standalone script. This is also the path used when the package is installed globally via `npm install -g`, where the `bin` field creates a symlink from `claude-switch` to `dist/index.js`.

Sources: [package.json](package.json#L11)

### `npm run dev` — Development Execution

Runs `ts-node src/index.ts`, which compiles and executes TypeScript in a single step without producing persistent output files. This is the primary development workflow for iterating on the CLI. `ts-node` reads the same `tsconfig.json` configuration, so the module resolution and compilation behavior matches the production build. The trade-off is slower startup time due to on-the-fly compilation, which is acceptable for development but unsuitable for production.

Sources: [package.json](package.json#L12)

### `npm run clean` — Output Reset

Runs `rimraf dist/`, which recursively deletes the entire build output directory. The use of `rimraf` instead of a raw `rm -rf` is intentional for cross-platform compatibility — `rimraf` works identically on Windows, macOS, and Linux, as noted in [Cross-Platform Compatibility (macOS, Linux, Windows)](22-cross-platform-compatibility-macos-linux-windows). This script is typically run before `npm run build` to ensure a clean compilation without stale artifacts.

Sources: [package.json](package.json#L13)

## Module Resolution Strategy

One of the most distinctive patterns in this codebase is the use of **`.js` extensions in local imports from `.ts` source files**:

```typescript
// src/index.ts — importing from sibling modules with .js extension
import { providers, getModels } from "./models.js";
import { getApiKey, setApiKey, hasApiKey } from "./config.js";
import { displaySuccess, displayError } from "./display.js";
```

This pattern is a TypeScript best practice for projects that may one day migrate to native ESM. TypeScript resolves these `.js` specifiers to the corresponding `.ts` files during compilation, and the emitted JavaScript code references `.js` paths that correctly match the output file names. If the project were to switch `"module"` to `"node16"` or `"nodenext"` with `"type": "module"` in `package.json`, these imports would work as-is without modification.

Sources: [src/index.ts](src/index.ts#L14-L67)

### Dynamic Imports for Lazy Loading

The project employs dynamic `import()` for optional dependencies that may not be needed on every invocation:

```typescript
// Lazy-loaded in verify.ts — only imported when API key verification runs
const { exec } = await import("child_process");
const { promisify } = await import("util");
const { platform } = await import("os");
```

This pattern defers loading of `child_process`, `util`, and `os` until the verification logic in [API Key Verification: Lightweight HTTP Health Checks](18-api-key-verification-lightweight-http-health-checks) is actually invoked, reducing the initial module load overhead for commands that don't need subprocess execution.

Similarly, `src/index.ts` uses dynamic imports for the `removeProvider` function from `./clients/opencode.js`, loading it only when the `remove` subcommand is executed.

Sources: [src/verify.ts](src/verify.ts#L93-L97), [src/index.ts](src/index.ts#L648)

## Build Configuration as a Complete Reference

The following table consolidates every `tsconfig.json` option with its architectural justification:

| Option | Value | Why It Matters for This Project |
|---|---|---|
| `target` | `ES2020` | Matches Node.js 18+ capabilities; enables optional chaining, nullish coalescing, BigInt |
| `module` | `commonjs` | Required for Node.js CLI execution without ESM configuration |
| `lib` | `["ES2020"]` | Restricts type-checking to ES2020 standard library; prevents accidental use of newer APIs |
| `outDir` | `./dist` | Isolated build output; excluded from Git via `.gitignore` |
| `rootDir` | `./src` | Establishes structural root; ensures `dist/` mirrors `src/` exactly |
| `strict` | `true` | Full strict mode; catches null errors and implicit `any` at compile time |
| `esModuleInterop` | `true` | Enables `import X from` syntax for ESM-only packages (chalk, ora) compiled to CJS |
| `skipLibCheck` | `true` | Skips type-checking `node_modules` declarations; faster builds with no safety trade-off |
| `forceConsistentCasingInFileNames` | `true` | Prevents case-mismatch bugs between macOS (case-insensitive) and Linux (case-sensitive) |
| `resolveJsonModule` | `true` | Allows importing JSON configuration files as typed objects |
| `declaration` | `true` | Emits `.d.ts` files for downstream type consumption |
| `declarationMap` | `true` | Links `.d.ts` back to `.ts` source for IDE "Go to Definition" |
| `sourceMap` | `true` | Links `.js` back to `.ts` source for debugging |

Sources: [tsconfig.json](tsconfig.json#L1-L19)

## Typical Development Workflows

### Iterative Development Cycle

For day-to-day development, the `dev` script provides the fastest feedback loop:

```bash
# Edit source, then test immediately — no manual build step
npm run dev switch anthropic
npm run dev status
```

Each invocation recompiles via `ts-node`, so changes are picked up automatically. This is the recommended workflow for feature development and debugging.

Sources: [package.json](package.json#L12)

### Production Build and Global Installation

For testing the actual CLI experience or preparing for distribution:

```bash
# Clean build from scratch
npm run clean && npm run build

# Test locally via node
npm start -- switch anthropic

# Or install globally and test the actual CLI binary
npm install -g .
claude-switch status
```

The `clean` step ensures no stale `.js` files remain from deleted or renamed source modules, which could otherwise cause confusing runtime errors.

Sources: [package.json](package.json#L10-L13), [package.json](package.json#L5-L8)

### Adding a New Source Module

When adding a new provider or client module (as described in [Adding a New Provider: Step-by-Step Implementation Guide](23-adding-a-new-provider-step-by-step-implementation-guide)), the build toolchain requires no configuration changes. Create the new `.ts` file in the appropriate `src/` subdirectory, import it from other modules using the `.js` extension convention, and run `npm run build`. TypeScript's `include: ["src/**/*"]` glob automatically picks up new files.

Sources: [tsconfig.json](tsconfig.json#L17)

---

**Next Steps**: Now that you understand how the project is compiled and distributed, explore the type definitions that underpin the provider system in [Model and Provider Type Definitions](14-model-and-provider-type-definitions), or see the complete provider integration workflow in [Adding a New Provider: Step-by-Step Implementation Guide](23-adding-a-new-provider-step-by-step-implementation-guide).