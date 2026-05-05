/**
 * Claude Code Token Tracker
 * 
 * Tracks token usage across Claude Code sessions and displays
 * context usage percentage with visual bar.
 * 
 * Installed to: ~/.claude/token-tracker.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const TRACKER_FILE = path.join(os.homedir(), '.claude', 'token-usage.json');
const SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');

// Model context windows (matches src/models.ts)
const MODEL_CONTEXT_WINDOWS = {
  // Alibaba Models
  'qwen3.6-plus': 1000000,
  'qwen3-max-2026-01-23': 262144,
  'qwen3-coder-next': 262144,
  'qwen3-coder-plus': 1000000,
  'glm-5': 200000,
  'glm-4.7': 256000,
  'glm-4.7-flash': 256000,
  'kimi-k2.5': 200000,
  'MiniMax-M2.5': 200000,
  
  // GLM Models
  'glm-5.1': 200000,
  'glm-5v-turbo': 200000,
  'glm-5-turbo': 200000,
  
  // Anthropic Models
  'claude-opus-4-6-20250205': 200000,
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-6-20250219': 200000,
  'claude-sonnet-4-5-20250814': 200000,
  'claude-haiku-4-5-20251015': 200000,
};

/**
 * Get current model from Claude settings
 */
function getCurrentModel() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return 'claude-opus-4-6-20250205'; // Default
    }
    
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    
    // Check ANTHROPIC_MODEL env var
    if (settings.env?.ANTHROPIC_MODEL) {
      return settings.env.ANTHROPIC_MODEL;
    }
    
    // Check tier map aliases (use opus as primary)
    if (settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL) {
      return settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
    }
    
    return 'claude-opus-4-6-20250205';
  } catch (error) {
    return 'claude-opus-4-6-20250205';
  }
}

/**
 * Get context window for current model
 */
function getContextWindow(modelId) {
  return MODEL_CONTEXT_WINDOWS[modelId] || 200000; // Default to 200K
}

/**
 * Load token usage data
 */
function loadTokenUsage() {
  try {
    if (!fs.existsSync(TRACKER_FILE)) {
      return {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        sessionStart: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }
    
    return JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf-8'));
  } catch (error) {
    return {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      sessionStart: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Save token usage data
 */
function saveTokenUsage(usage) {
  try {
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(usage, null, 2), 'utf-8');
  } catch (error) {
    // Silently fail - don't break Claude Code
  }
}

/**
 * Reset token usage for new session
 */
function resetTokenUsage() {
  const usage = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    sessionStart: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
  saveTokenUsage(usage);
  return usage;
}

/**
 * Add tokens to tracker
 */
function addTokens(inputTokens, outputTokens) {
  const usage = loadTokenUsage();
  usage.totalInputTokens += inputTokens || 0;
  usage.totalOutputTokens += outputTokens || 0;
  usage.lastUpdated = new Date().toISOString();
  saveTokenUsage(usage);
  return usage;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Create visual context bar
 */
function createContextBar(percentage) {
  const barWidth = 20;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  
  const filledChar = '█';
  const emptyChar = '░';
  
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Get color based on percentage
 */
function getPercentageColor(percentage) {
  if (percentage < 50) return '\x1b[32m'; // Green
  if (percentage < 75) return '\x1b[33m'; // Yellow
  if (percentage < 90) return '\x1b[31m'; // Red
  return '\x1b[35m'; // Magenta (critical)
}

/**
 * Display token usage with context bar
 */
function displayTokenUsage() {
  const model = getCurrentModel();
  const contextWindow = getContextWindow(model);
  const usage = loadTokenUsage();
  
  const totalTokens = usage.totalInputTokens + usage.totalOutputTokens;
  const percentage = Math.min((totalTokens / contextWindow) * 100, 100);
  
  const color = getPercentageColor(percentage);
  const reset = '\x1b[0m';
  const bar = createContextBar(percentage);
  
  // Format model name
  const modelName = model.split('-').map(
    word => word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  console.log('');
  console.log(`${color}╔══════════════════════════════════════════════════════════════╗${reset}`);
  console.log(`${color}║${reset}  ${color}🤖 Active Model:${reset} ${modelName.padEnd(41)}${color}║${reset}`);
  console.log(`${color}╠══════════════════════════════════════════════════════════════╣${reset}`);
  console.log(`${color}║${reset}  ${color}📊 Token Usage:${reset}${' '.repeat(38)}${color}║${reset}`);
  console.log(`${color}║${reset}    Input:  ${formatNumber(usage.totalInputTokens).padEnd(10)}tokens${' '.repeat(18)}${color}║${reset}`);
  console.log(`${color}║${reset}    Output: ${formatNumber(usage.totalOutputTokens).padEnd(10)}tokens${' '.repeat(18)}${color}║${reset}`);
  console.log(`${color}║${reset}    Total:  ${formatNumber(totalTokens).padEnd(10)}tokens${' '.repeat(18)}${color}║${reset}`);
  console.log(`${color}╠══════════════════════════════════════════════════════════════╣${reset}`);
  console.log(`${color}║${reset}  ${color}📈 Context Window:${reset}${' '.repeat(34)}${color}║${reset}`);
  console.log(`${color}║${reset}    Used:   ${formatNumber(totalTokens).padEnd(10)}tokens${' '.repeat(18)}${color}║${reset}`);
  console.log(`${color}║${reset}    Total:  ${formatNumber(contextWindow).padEnd(10)}tokens${' '.repeat(18)}${color}║${reset}`);
  console.log(`${color}║${reset}    ${color}${bar}${reset} ${percentage.toFixed(1).padStart(5)}%${' '.repeat(10)}${color}║${reset}`);
  console.log(`${color}╚══════════════════════════════════════════════════════════════╝${reset}`);
  console.log('');
}

/**
 * Hook: Called when Claude Code starts
 */
function onSessionStart() {
  resetTokenUsage();
  displayTokenUsage();
}

/**
 * Hook: Called after each API response
 * This would need to be integrated with Claude Code's response handler
 */
function onApiResponse(inputTokens, outputTokens) {
  addTokens(inputTokens, outputTokens);
}

/**
 * Hook: Display current status (can be called manually)
 */
function showStatus() {
  displayTokenUsage();
}

/**
 * Export functions for use
 */
module.exports = {
  onSessionStart,
  onApiResponse,
  showStatus,
  addTokens,
  loadTokenUsage,
  resetTokenUsage,
  getCurrentModel,
  getContextWindow
};

// Auto-run if called directly
if (require.main === module) {
  displayTokenUsage();
}
