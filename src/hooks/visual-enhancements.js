/**
 * Claude Code Visual Enhancements
 * 
 * Provides visual enhancements for Claude Code including:
 * - Active model display with provider info
 * - Context usage bar (percentage)
 * - Provider endpoint display
 * - Custom system prompt injection
 * 
 * Installed to: ~/.claude/visual-enhancements.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');
const PROMPT_FILE = path.join(os.homedir(), '.claude', 'prompt.json');

// Provider information
const PROVIDER_INFO = {
  anthropic: {
    name: 'Anthropic',
    endpoint: 'api.anthropic.com',
    icon: '🎭'
  },
  alibaba: {
    name: 'Alibaba Model Studio',
    endpoint: 'coding-intl.dashscope.aliyuncs.com',
    icon: ''
  },
  glm: {
    name: 'GLM/Z.AI',
    endpoint: 'z.ai',
    icon: '🤖'
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'openrouter.ai',
    icon: '🌐'
  },
  ollama: {
    name: 'Ollama (Local)',
    endpoint: 'localhost:4000',
    icon: ''
  },
  gemini: {
    name: 'Gemini (Google)',
    endpoint: 'localhost:4001',
    icon: '💎'
  }
};

// Model capabilities for display
const MODEL_CAPABILITIES = {
  // Alibaba Models
  'qwen3.6-plus': ['Text Generation', 'Deep Thinking', 'Visual Understanding'],
  'qwen3-max-2026-01-23': ['Text Generation', 'Deep Thinking'],
  'qwen3-coder-next': ['Text Generation', 'Coding Agent'],
  'qwen3-coder-plus': ['Text Generation', 'Coding', '1M Context'],
  'glm-5': ['Text Generation', 'Deep Thinking'],
  'glm-4.7': ['Text Generation', 'Deep Thinking'],
  'glm-4.7-flash': ['Text Generation', 'Fast Inference'],
  'kimi-k2.5': ['Text Generation', 'Deep Thinking', 'Visual Understanding'],
  'MiniMax-M2.5': ['Text Generation', 'Deep Thinking'],

  // GLM Models
  'glm-5.1': ['Text Generation', 'Deep Thinking', 'Most Advanced'],
  'glm-5v-turbo': ['Text Generation', 'Deep Thinking', 'Multimodal'],
  'glm-5-turbo': ['Text Generation', 'Deep Thinking', 'Fast'],

  // OpenRouter Models
  'qwen/qwen3.6-plus:free': ['Text Generation', 'Deep Thinking'],
  'openrouter/free': ['Text Generation'],

  // Ollama Models
  'deepseek-r1:latest': ['Text Generation', 'Deep Thinking', 'Reasoning'],
  'qwen2.5-coder:latest': ['Text Generation', 'Coding', 'Tool Calling'],
  'llama3.1:latest': ['Text Generation', 'Code', 'Vision'],
  'codellama:latest': ['Text Generation', 'Coding'],

  // Gemini Models
  'gemini-2.5-pro': ['Text Generation', 'Deep Thinking', 'Code', 'Vision'],
  'gemini-2.5-flash': ['Text Generation', 'Fast Responses', 'Code'],
  'gemini-2.5-flash-lite': ['Text Generation', 'Cost-optimized'],

  // Anthropic Models
  'claude-opus-4-6-20250205': ['Text Generation', 'Code', 'Vision', 'Complex Reasoning'],
  'claude-opus-4-5-20251101': ['Text Generation', 'Code', 'Vision', 'Complex Reasoning'],
  'claude-sonnet-4-6-20250219': ['Text Generation', 'Code', 'Vision'],
  'claude-sonnet-4-5-20250814': ['Text Generation', 'Code', 'Vision'],
  'claude-haiku-4-5-20251015': ['Text Generation', 'Fast Responses'],
};

/**
 * Detect current provider from settings
 */
function detectProvider() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return 'anthropic';
    }
    
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    const baseUrl = settings.env?.ANTHROPIC_BASE_URL || '';
    
    if (baseUrl.includes('coding-intl.dashscope.aliyuncs.com')) {
      return 'alibaba';
    }
    if (baseUrl.includes('openrouter.ai')) {
      return 'openrouter';
    }
    if (baseUrl.includes('localhost:4000')) {
      return 'ollama';
    }
    if (baseUrl.includes('localhost:4001')) {
      return 'gemini';
    }
    if (baseUrl.includes('z.ai')) {
      return 'glm';
    }
    
    // Check tier map aliases (GLM indicator)
    if (settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL && !baseUrl) {
      return 'glm';
    }
    
    return 'anthropic';
  } catch (error) {
    return 'anthropic';
  }
}

/**
 * Get current model from settings
 */
function getCurrentModel() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return 'claude-opus-4-6-20250205';
    }
    
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    
    if (settings.env?.ANTHROPIC_MODEL) {
      return settings.env.ANTHROPIC_MODEL;
    }
    
    if (settings.env?.ANTHROPIC_DEFAULT_OPUS_MODEL) {
      return settings.env.ANTHROPIC_DEFAULT_OPUS_MODEL;
    }
    
    return 'claude-opus-4-6-20250205';
  } catch (error) {
    return 'claude-opus-4-6-20250205';
  }
}

/**
 * Get context window for model
 */
function getContextWindow(modelId) {
  const CONTEXT_WINDOWS = {
    'qwen3.6-plus': 1000000,
    'qwen3-max-2026-01-23': 262144,
    'qwen3-coder-next': 262144,
    'qwen3-coder-plus': 1000000,
    'glm-5': 200000,
    'glm-4.7': 256000,
    'glm-4.7-flash': 256000,
    'kimi-k2.5': 200000,
    'MiniMax-M2.5': 200000,
    'glm-5.1': 200000,
    'glm-5v-turbo': 200000,
    'glm-5-turbo': 200000,
    'qwen/qwen3.6-plus:free': 131072,
    'openrouter/free': 131072,
    'deepseek-r1:latest': 128000,
    'qwen2.5-coder:latest': 128000,
    'llama3.1:latest': 128000,
    'codellama:latest': 100000,
    'gemini-2.5-pro': 1000000,
    'gemini-2.5-flash': 1000000,
    'gemini-2.5-flash-lite': 1000000,
    'claude-opus-4-6-20250205': 200000,
    'claude-opus-4-5-20251101': 200000,
    'claude-sonnet-4-6-20250219': 200000,
    'claude-sonnet-4-5-20250814': 200000,
    'claude-haiku-4-5-20251015': 200000,
  };
  
  return CONTEXT_WINDOWS[modelId] || 200000;
}

/**
 * Format context number
 */
function formatContext(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return tokens.toString();
}

/**
 * Create visual model card
 */
function createModelCard() {
  const provider = detectProvider();
  const model = getCurrentModel();
  const contextWindow = getContextWindow(model);
  const providerInfo = PROVIDER_INFO[provider];
  const capabilities = MODEL_CAPABILITIES[model] || [];
  
  const reset = '\x1b[0m';
  const bold = '\x1b[1m';
  const dim = '\x1b[2m';
  
  // Colors
  const headerColor = '\x1b[36m'; // Cyan
  const accentColor = '\x1b[33m'; // Yellow
  const infoColor = '\x1b[37m'; // White
  const dimColor = '\x1b[90m'; // Gray
  
  const modelName = model.includes('claude-') ? model.replace('claude-', 'Claude ').replace(/-/g, ' ') : model;
  
  let output = '';
  output += `${dimColor}┌─────────────────────────────────────────────────────────────┐${reset}\n`;
  output += `${dimColor}│${reset} ${headerColor}${bold}${providerInfo.icon} ${providerInfo.name}${reset}${dimColor}${' '.repeat(48)}│${reset}\n`;
  output += `${dimColor}├─────────────────────────────────────────────────────────────┤${reset}\n`;
  output += `${dimColor}│${reset} ${accentColor}Model:${reset} ${infoColor}${modelName}${' '.repeat(Math.max(0, 35 - modelName.length))}${dimColor}│${reset}\n`;
  output += `${dimColor}│${reset} ${accentColor}Context:${reset} ${infoColor}${formatContext(contextWindow)} tokens${' '.repeat(Math.max(0, 31 - formatContext(contextWindow).length - 8))}${dimColor}│${reset}\n`;

  if (capabilities.length > 0) {
    const capStr = capabilities.slice(0, 3).join(' • ');
    output += `${dimColor}│${reset} ${accentColor}Capabilities:${reset}${' '.repeat(Math.max(0, 38 - capStr.length - 14))}${dimColor}│${reset}\n`;
    output += `${dimColor}│${reset} ${dimColor}${capStr}${' '.repeat(Math.max(0, 52 - capStr.length))}${dimColor}│${reset}\n`;
  }
  
  output += `${dimColor}└─────────────────────────────────────────────────────────────┘${reset}\n`;
  
  return output;
}

/**
 * Create context usage bar
 */
function createContextBar(usedTokens, totalTokens) {
  const percentage = Math.min((usedTokens / totalTokens) * 100, 100);
  const barWidth = 30;
  const filled = Math.round((percentage / 100) * barWidth);
  const empty = barWidth - filled;
  
  const reset = '\x1b[0m';
  const filledChar = '█';
  const emptyChar = '░';
  
  // Color based on usage
  let color;
  if (percentage < 50) {
    color = '\x1b[32m'; // Green
  } else if (percentage < 75) {
    color = '\x1b[33m'; // Yellow
  } else if (percentage < 90) {
    color = '\x1b[31m'; // Red
  } else {
    color = '\x1b[35m'; // Magenta
  }
  
  const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);
  
  return `${color}${bar}${reset} ${percentage.toFixed(1).padStart(5)}%`;
}

/**
 * Display full status (called on session start)
 */
function displayStatus() {
  console.log('');
  console.log(createModelCard());
}

/**
 * Generate custom system prompt based on provider and model
 */
function generateSystemPrompt() {
  const provider = detectProvider();
  const model = getCurrentModel();
  const providerInfo = PROVIDER_INFO[provider];
  
  const prompt = {
    system: [
      `You are running on ${providerInfo.name} using the ${model} model.`,
      `Provider endpoint: ${providerInfo.endpoint}`,
      ``,
      `Current configuration:`,
      `- Provider: ${providerInfo.name}`,
      `- Model: ${model}`,
      `- Context Window: ${formatContext(getContextWindow(model))} tokens`,
    ].join('\n')
  };
  
  return prompt;
}

/**
 * Write custom prompt to prompt.json
 */
function writeCustomPrompt() {
  try {
    const prompt = generateSystemPrompt();
    fs.writeFileSync(PROMPT_FILE, JSON.stringify(prompt, null, 2), 'utf-8');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Initialize visual enhancements
 */
function init() {
  displayStatus();
  writeCustomPrompt();
}

/**
 * Update visual enhancements (called after provider switch)
 */
function update() {
  displayStatus();
  writeCustomPrompt();
}

/**
 * Export functions
 */
module.exports = {
  init,
  update,
  displayStatus,
  createModelCard,
  createContextBar,
  generateSystemPrompt,
  writeCustomPrompt,
  detectProvider,
  getCurrentModel,
  getContextWindow
};

// Auto-run if called directly
if (require.main === module) {
  init();
}
