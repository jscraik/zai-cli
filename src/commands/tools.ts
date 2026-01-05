/**
 * Tools command - list available MCP tools
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { output, getSchemaForCommand } from '../lib/output.js';
import { get, toolDiscoveryKey } from '../lib/cache.js';
import { connectToServer, McpClientWrapper } from '../lib/mcp-client.js';
import type { OutputOptions, McpServerType, ErrorCode } from '../types/index.js';

export function tools(): Command {
  return new Command('tools')
    .description('List available MCP tools')
    .option('--filter <text>', 'Filter tools by name/description')
    .option('--full', 'Include full tool details with schemas')
    .option('--no-vision', 'Skip vision MCP server')
    .action(async (options) => {
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
          'tools',
          getSchemaForCommand('tools'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      try {
        // Check cache first
        const cacheKey = toolDiscoveryKey(options.filter, options.vision);
        const cached = await get(config, cacheKey);
        if (cached) {
          output(cached, 'tools', getSchemaForCommand('tools'), outputOptions);
          return;
        }

        // Collect tools from all servers
        const allTools: unknown[] = [];

        // Vision server (if enabled)
        if (options.vision) {
          try {
            const visionClient = await connectToServer('vision' as McpServerType, config.apiKey);
            const visionTools = await visionClient.listTools();
            for (const tool of visionTools) {
              if (options.filter) {
                const searchStr = `${tool.name} ${tool.description || ''}`.toLowerCase();
                if (!searchStr.includes(options.filter.toLowerCase())) {
                  continue;
                }
              }
              allTools.push(
                options.full
                  ? tool
                  : { name: tool.name, description: tool.description }
              );
            }
            await visionClient.disconnect();
          } catch (err) {
            // Continue even if vision server fails
            if (!options.quiet) {
              console.error(`Warning: Vision server unavailable: ${err}`);
            }
          }
        }

        // Add HTTP-based tools (search, read, zread)
        const httpTools = [
          {
            name: 'zai.search.webSearchPrime',
            description: 'Real-time web search',
          },
          {
            name: 'zai.read.webReader',
            description: 'Fetch web page as markdown',
          },
          {
            name: 'zai.zread.search_doc',
            description: 'Search GitHub repository documentation',
          },
          {
            name: 'zai.zread.get_repo_structure',
            description: 'Get GitHub repository file structure',
          },
        ];

        for (const tool of httpTools) {
          if (options.filter) {
            const searchStr = `${tool.name} ${tool.description || ''}`.toLowerCase();
            if (!searchStr.includes(options.filter.toLowerCase())) {
              continue;
            }
          }
          allTools.push(tool);
        }

        output(allTools, 'tools', getSchemaForCommand('tools'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          [],
          'tools',
          getSchemaForCommand('tools'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });
}
