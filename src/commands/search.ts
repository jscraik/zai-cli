/**
 * Search command - web search via Z.AI
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { callWebSearch } from '../lib/mcp-curl-client.js';
import { getSchemaForCommand, output } from '../lib/output.js';
import type { ErrorCode, OutputOptions } from '../types/index.js';

export function search(): Command {
  return new Command('search')
    .description('Real-time web search')
    .argument('<query>', 'search query')
    .option('-c, --count <n>', 'Number of results', '10')
    .option('--language <code>', 'Language filter')
    .option('--time-range <range>', 'Time range for results')
    .action(async (query, options) => {
      const config = await loadConfig();
      const outputOptions: OutputOptions = {
        json: options.json ?? false,
        plain: options.plain ?? false,
        quiet: options.quiet ?? false,
        verbose: options.verbose ?? false,
        debug: options.debug ?? false,
        noColor: options.noColor ?? false,
      };

      if (!config.apiKey) {
        output(
          [],
          'search',
          getSchemaForCommand('search'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      try {
        const result = await callWebSearch(config.apiKey, query, {
          count: parseInt(options.count, 10),
          language: options.language,
          timeRange: options.timeRange,
        }, config.apiBaseUrl);

        output(result, 'search', getSchemaForCommand('search'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          [],
          'search',
          getSchemaForCommand('search'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });
}
