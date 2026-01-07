/**
 * Model command - OpenAI-compatible chat completions against GLM Coding Plan
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { chatCompletion } from '../lib/openai-client.js';
import { getSchemaForCommand, output } from '../lib/output.js';
import type { ErrorCode, OutputOptions } from '../types/index.js';

export function model(): Command {
  return new Command('model')
    .description('Call GLM via OpenAI-compatible chat/completions (no web search)')
    .argument('<prompt>', 'User prompt')
    .option('--model <name>', 'Model name', 'GLM-4.7')
    .option('--system <text>', 'Optional system prompt')
    .option('--temperature <n>', 'Sampling temperature', (v) => parseFloat(v), undefined)
    .option('--max-tokens <n>', 'Max tokens for response', (v) => parseInt(v, 10), undefined)
    .action(async (prompt, options) => {
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
          'model',
          getSchemaForCommand('model'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      const messages = [];
      if (options.system) {
        messages.push({ role: 'system' as const, content: options.system });
      }
      messages.push({ role: 'user' as const, content: prompt });

      try {
        const result = await chatCompletion(messages, {
          apiBaseUrl: config.apiBaseUrl,
          apiKey: config.apiKey,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          timeoutMs: config.timeout,
        });

        output(
          { content: result.content, raw: outputOptions.json ? result.raw : undefined },
          'model',
          getSchemaForCommand('model'),
          outputOptions
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          [],
          'model',
          getSchemaForCommand('model'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });
}
