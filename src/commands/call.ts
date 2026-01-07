/**
 * Call command - invoke an MCP tool directly
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { loadConfig } from '../lib/config.js';
import { connectToServer } from '../lib/mcp-client.js';
import { callWebReader, callWebSearch, callZRead } from '../lib/mcp-curl-client.js';
import { getSchemaForCommand, output } from '../lib/output.js';
import type { ErrorCode, McpServerType, OutputOptions } from '../types/index.js';

export function call(): Command {
  return new Command('call')
    .description('Invoke an MCP tool directly')
    .argument('<tool>', 'Tool name to call')
    .option('--json <json>', 'Tool arguments as JSON string')
    .option('--file <path>', 'Tool arguments from JSON file')
    .option('--stdin', 'Read tool arguments from stdin')
    .option('--dry-run', 'Show what would be called without executing')
    .action(async (toolName, options) => {
      const config = await loadConfig();
      const outputOptions: OutputOptions = {
        json: true, // Always JSON for call command
        plain: false,
        quiet: options.quiet ?? false,
        verbose: options.verbose ?? false,
        debug: options.debug ?? false,
        noColor: options.noColor ?? false,
      };

      if (!config.apiKey) {
        output(
          null,
          'call',
          getSchemaForCommand('call'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      // Parse arguments
      let args: unknown = null;

      if (options.json) {
        try {
          args = JSON.parse(options.json);
        } catch {
          output(
            null,
            'call',
            getSchemaForCommand('call'),
            outputOptions,
            [{ code: 'E_VALIDATION' as ErrorCode, message: 'Invalid JSON in --json option' }]
          );
          process.exit(2);
        }
      } else if (options.file) {
        try {
          const content = readFileSync(options.file, 'utf-8');
          args = JSON.parse(content);
        } catch {
          output(
            null,
            'call',
            getSchemaForCommand('call'),
            outputOptions,
            [{ code: 'E_VALIDATION' as ErrorCode, message: `Failed to read or parse file: ${options.file}` }]
          );
          process.exit(2);
        }
      } else if (options.stdin) {
        // Read from stdin
        let stdinData = '';
        for await (const chunk of process.stdin) {
          stdinData += chunk;
        }
        try {
          args = JSON.parse(stdinData);
        } catch {
          output(
            null,
            'call',
            getSchemaForCommand('call'),
            outputOptions,
            [{ code: 'E_VALIDATION' as ErrorCode, message: 'Invalid JSON from stdin' }]
          );
          process.exit(2);
        }
      }

      // Dry run
      if (options.dryRun) {
        output(
          {
            tool: toolName,
            arguments: args,
            dryRun: true,
          },
          'call',
          getSchemaForCommand('call'),
          outputOptions
        );
        return;
      }

      try {
        let result: unknown;

        // Route to appropriate handler
        if (toolName === 'zai.search.webSearchPrime') {
          result = await callWebSearch(config.apiKey, (args as any)?.search_query || '', args as any, config.apiBaseUrl);
        } else if (toolName === 'zai.read.webReader') {
          result = await callWebReader(config.apiKey, (args as any)?.url || '', args as any, config.apiBaseUrl);
        } else if (toolName.startsWith('zai.zread.')) {
          const method = toolName.replace('zai.zread.', '') as 'search_doc' | 'get_repo_structure';
          result = await callZRead(config.apiKey, method, args as Record<string, unknown>);
        } else if (toolName.startsWith('zai.vision.')) {
          // Vision tools need stdio MCP
          const client = await connectToServer('vision' as McpServerType, config.apiKey);
          result = await client.callTool(toolName, (args as Record<string, unknown>) || {});
          await client.disconnect();
        } else {
          output(
            null,
            'call',
            getSchemaForCommand('call'),
            outputOptions,
            [{ code: 'E_VALIDATION' as ErrorCode, message: `Unknown tool: ${toolName}` }]
          );
          process.exit(2);
        }

        output(result, 'call', getSchemaForCommand('call'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'call',
          getSchemaForCommand('call'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });
}
