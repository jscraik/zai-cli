/**
 * Main CLI entry point for zai-cli
 */

import { Command } from 'commander';
import { loadConfig, validateConfig, getVersion } from './lib/config.js';
import { output, error, shouldUseColor, diagnostic } from './lib/output.js';
import type { OutputOptions, Config } from './types/index.js';

// Import commands (we'll create these next)
import { search } from './commands/search.js';
import { read } from './commands/read.js';
import { repo } from './commands/repo.js';
import { tools } from './commands/tools.js';
import { tool } from './commands/tool.js';
import { call } from './commands/call.js';
import { code } from './commands/code.js';
import { doctor } from './commands/doctor.js';
import { vision } from './commands/vision.js';

/**
 * Main program
 */
const program = new Command();

/**
 * Parse global options and create context
 */
function getGlobalOptions(): OutputOptions {
  const opts = program.opts();
  return {
    json: opts.json ?? false,
    plain: opts.plain ?? false,
    quiet: opts.quiet ?? false,
    verbose: opts.verbose ?? false,
    debug: opts.debug ?? false,
    noColor: opts.noColor ?? false,
  };
}

/**
 * Set up the CLI program
 */
async function setup() {
  // Load configuration
  const config = await loadConfig();

  // Validate configuration (only warn for now, allow commands to handle errors)
  const validation = await validateConfig(config);
  if (!validation.valid && !config.quiet) {
    diagnostic(`Configuration warning: ${validation.error}`, getGlobalOptions());
  }

  // Configure the program
  program
    .name('zai-cli')
    .description('Z.AI capabilities CLI for agents and automation')
    .version(getVersion())
    .option('--json', 'Output wrapped JSON with schema')
    .option('--plain', 'Stable line-based text output')
    .option('-q, --quiet', 'Suppress non-essential output')
    .option('-v, --verbose', 'Include diagnostics')
    .option('--debug', 'Include internal detail')
    .option('--no-color', 'Disable color output')
    .option('--timeout <ms>', 'Request timeout in milliseconds', '30000');

  // Add commands
  program.addCommand(vision());
  program.addCommand(search());
  program.addCommand(read());
  program.addCommand(repo());
  program.addCommand(tools());
  program.addCommand(tool());
  program.addCommand(call());
  program.addCommand(code());
  program.addCommand(doctor());

  // Parse arguments
  await program.parseAsync(process.argv);
}

/**
 * Entry point
 */
setup().catch((err) => {
  error(err.message, 'E_INTERNAL', err.hint);
});

// Export for testing
export { program };
