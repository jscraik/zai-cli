/**
 * Read command - fetch web pages as markdown via Z.AI
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { output, getSchemaForCommand } from '../lib/output.js';
import { callWebReader } from '../lib/mcp-client.js';
import type { OutputOptions, ErrorCode } from '../types/index.js';

export function read(): Command {
  return new Command('read')
    .description('Fetch web page as markdown')
    .argument('<url>', 'URL to read')
    .option('--with-images-summary', 'Include image summaries')
    .option('--no-gfm', 'Disable GitHub Flavored Markdown')
    .option('--retain-images', 'Keep image data URLs')
    .action(async (url, options) => {
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
          '',
          'read',
          getSchemaForCommand('read'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      try {
        const result = await callWebReader(config.apiKey, url, {
          withImagesSummary: options.withImagesSummary,
          noGfm: options.noGfm,
          retainImages: options.retainImages,
        });

        output(result, 'read', getSchemaForCommand('read'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          '',
          'read',
          getSchemaForCommand('read'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });
}
