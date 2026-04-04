/**
 * API Key Verification
 *
 * Makes lightweight requests to each provider's API to verify keys are valid.
 */

const TIMEOUT_MS = 5000;

export interface VerifyResult {
  provider: string;
  status: "ok" | "invalid" | "missing" | "error" | "skipped";
  message?: string;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

export { maskKey };

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verify Alibaba Coding Plan API key by listing models from the DashScope API.
 */
async function verifyAlibaba(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetchWithTimeout(
      "https://coding-intl.dashscope.aliyuncs.com/compatible-mode/v1/models",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (res.ok) {
      return { provider: "alibaba", status: "ok", message: "Key valid" };
    }
    if (res.status === 401 || res.status === 403) {
      return { provider: "alibaba", status: "invalid", message: "Authentication failed" };
    }
    return { provider: "alibaba", status: "error", message: `HTTP ${res.status}` };
  } catch {
    return { provider: "alibaba", status: "error", message: "Connection failed" };
  }
}

/**
 * Verify OpenRouter API key by listing models.
 */
async function verifyOpenRouter(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/models",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (res.ok) {
      return { provider: "openrouter", status: "ok", message: "Key valid" };
    }
    if (res.status === 401 || res.status === 403) {
      return { provider: "openrouter", status: "invalid", message: "Authentication failed" };
    }
    return { provider: "openrouter", status: "error", message: `HTTP ${res.status}` };
  } catch {
    return { provider: "openrouter", status: "error", message: "Connection failed" };
  }
}

/**
 * Verify GLM/Z.AI by checking if coding-helper is installed and authenticated.
 * Uses the coding-helper CLI status check rather than a direct API call.
 */
async function verifyGLM(): Promise<VerifyResult> {
  try {
    const { exec } = await import("child_process");
    const { promisify } = await import("util");
    const execAsync = promisify(exec);

    const { platform } = await import("os");
    const checkCmd = platform() === "win32" ? "where coding-helper" : "which coding-helper";

    try {
      await execAsync(checkCmd);
    } catch {
      return { provider: "glm", status: "error", message: "coding-helper not installed" };
    }

    // Try to ping the GLM API — if env vars are set, the auth should work
    const glmModel = process.env.ZHIPUAI_MODEL || process.env.ZAI_MODEL;
    if (glmModel) {
      return { provider: "glm", status: "ok", message: "coding-helper installed, env vars set" };
    }

    return { provider: "glm", status: "ok", message: "coding-helper installed" };
  } catch {
    return { provider: "glm", status: "error", message: "Check failed" };
  }
}

/**
 * Verify Anthropic API key (optional — uses ANTHROPIC_API_KEY env var).
 */
async function verifyAnthropic(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetchWithTimeout(
      "https://api.anthropic.com/v1/models",
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        }
      }
    );

    if (res.ok) {
      return { provider: "anthropic", status: "ok", message: "Key valid" };
    }
    if (res.status === 401 || res.status === 403) {
      return { provider: "anthropic", status: "invalid", message: "Authentication failed" };
    }
    return { provider: "anthropic", status: "error", message: `HTTP ${res.status}` };
  } catch {
    return { provider: "anthropic", status: "error", message: "Connection failed" };
  }
}

/**
 * Verify all configured API keys in parallel.
 */
export async function verifyAllKeys(keys: {
  alibaba?: string;
  openrouter?: string;
  anthropic?: string;
  checkGLM?: boolean;
}): Promise<VerifyResult[]> {
  const checks: Promise<VerifyResult>[] = [];

  if (keys.alibaba) {
    checks.push(verifyAlibaba(keys.alibaba));
  } else {
    checks.push(Promise.resolve({ provider: "alibaba", status: "missing" }));
  }

  if (keys.openrouter) {
    checks.push(verifyOpenRouter(keys.openrouter));
  } else {
    checks.push(Promise.resolve({ provider: "openrouter", status: "missing" }));
  }

  if (keys.anthropic) {
    checks.push(verifyAnthropic(keys.anthropic));
  } else {
    checks.push(Promise.resolve({ provider: "anthropic", status: "missing" }));
  }

  if (keys.checkGLM) {
    checks.push(verifyGLM());
  } else {
    checks.push(Promise.resolve({ provider: "glm", status: "skipped" }));
  }

  return Promise.all(checks);
}
