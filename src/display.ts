/**
 * Display utilities for formatted output
 */

import chalk from "chalk";

/**
 * Format a table row with proper padding
 */
export function formatTableRow(
  columns: string[],
  widths: number[]
): string {
  return columns
    .map((col, i) => col.padEnd(widths[i]))
    .join("  ");
}

/**
 * Display model list with descriptions and context sizes
 */
export function displayModels(
  providerName: string,
  models: Array<{
    id: string;
    name: string;
    contextWindow: number;
    capabilities: string[];
    description: string;
  }>,
  currentModel?: string
): void {
  console.log(chalk.green(`\n✓ Provider: ${providerName}`));
  console.log(chalk.dim("─".repeat(80)) + "\n");

  // Calculate column widths
  const modelWidth = Math.max(20, ...models.map(m => m.id.length)) + 2;
  const contextWidth = 15;

  // Header
  console.log(
    chalk.cyan.bold(
      formatTableRow(["Model", "Context", "Capabilities"], [modelWidth, contextWidth, 40])
    )
  );
  console.log(chalk.dim("─".repeat(80)));

  // Models
  for (const model of models) {
    const isCurrent = model.id === currentModel;
    const modelDisplay = isCurrent
      ? chalk.green.bold(`● ${model.id}`)
      : chalk.white(`  ${model.id}`);

    const contextDisplay = chalk.yellow(formatContext(model.contextWindow));
    const capabilitiesDisplay = chalk.gray(model.capabilities.join(", "));

    console.log(
      formatTableRow(
        [modelDisplay, contextDisplay, capabilitiesDisplay],
        [modelWidth, contextWidth, 40]
      )
    );

    // Description on next line
    console.log(chalk.dim(`  ${model.description}`));
    console.log();
  }

  console.log(chalk.dim("─".repeat(80)));
}

/**
 * Display current provider status
 */
export function displayCurrentStatus(
  provider: string,
  model?: string,
  endpoint?: string
): void {
  console.log(chalk.green("\n✓ Current Configuration:\n"));
  console.log(`  ${chalk.cyan.bold("Provider:")} ${chalk.white(provider)}`);
  if (model) {
    console.log(`  ${chalk.cyan.bold("Model:")} ${chalk.white(model)}`);
  }
  if (endpoint) {
    console.log(`  ${chalk.cyan.bold("Endpoint:")} ${chalk.dim(endpoint)}`);
  }
  console.log();
}

/**
 * Display success message
 */
export function displaySuccess(message: string): void {
  console.log(chalk.green(`\n✓ ${message}\n`));
}

/**
 * Display error message
 */
export function displayError(message: string): void {
  console.log(chalk.red(`\n✗ Error: ${message}\n`));
}

/**
 * Display warning message
 */
export function displayWarning(message: string): void {
  console.log(chalk.yellow(`\n⚠ Warning: ${message}\n`));
}

/**
 * Display info message
 */
export function displayInfo(message: string): void {
  console.log(chalk.blue(`\nℹ ${message}\n`));
}

/**
 * Format context window for display
 */
export function formatContext(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(0)}M tokens`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K tokens`;
  }
  return `${tokens} tokens`;
}

/**
 * Display provider list
 */
export function displayProviders(providers: Array<{
  id: string;
  name: string;
  endpoint?: string;
  modelCount: number;
}>): void {
  console.log(chalk.green("\n✓ Available Providers:\n"));

  for (const provider of providers) {
    console.log(chalk.cyan.bold(`  ${provider.name} (${provider.id})`));
    console.log(chalk.dim(`    Models: ${provider.modelCount}`));
    if (provider.endpoint) {
      console.log(chalk.dim(`    Endpoint: ${provider.endpoint}`));
    }
    console.log();
  }
}
