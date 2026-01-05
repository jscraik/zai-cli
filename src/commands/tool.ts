/**
 * Tool command - show details for a specific tool
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { output, getSchemaForCommand } from '../lib/output.js';
import { connectToServer } from '../lib/mcp-client.js';
import type { OutputOptions, McpServerType, McpTool, ErrorCode } from '../types/index.js';

export function tool(): Command {
  return new Command('tool')
    .description('Show details for a specific MCP tool')
    .argument('<name>', 'Tool name')
    .option('--no-vision', 'Skip vision MCP server')
    .action(async (name, options) => {
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
          null,
          'tool',
          getSchemaForCommand('tool'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      try {
        let toolDetails: McpTool | null = null;

        // Check if it's a vision tool
        if (name.startsWith('zai.vision.') && options.vision) {
          try {
            const visionClient = await connectToServer('vision' as McpServerType, config.apiKey);
            const tools = await visionClient.listTools();
            toolDetails = tools.find((t) => t.name === name) || null;
            await visionClient.disconnect();
          } catch (err) {
            // Continue
          }
        }

        // Check if it's an HTTP tool (return static details)
        if (!toolDetails) {
          const httpToolDetails: Record<string, McpTool> = {
            'zai.search.webSearchPrime': {
              name: 'zai.search.webSearchPrime',
              description: 'Real-time web search with filtering options',
              inputSchema: {
                type: 'object',
                properties: {
                  search_query: { type: 'string' },
                  result_count: { type: 'number', default: 10 },
                  language: { type: 'string' },
                  time_range: { type: 'string' },
                },
                required: ['search_query'],
              },
            },
            'zai.read.webReader': {
              name: 'zai.read.webReader',
              description: 'Fetch web page content as markdown',
              inputSchema: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  with_images_summary: { type: 'boolean' },
                  no_gfm: { type: 'boolean' },
                  keep_img_data_url: { type: 'boolean' },
                },
                required: ['url'],
              },
            },
            'zai.zread.search_doc': {
              name: 'zai.zread.search_doc',
              description: 'Search documentation in a GitHub repository',
              inputSchema: {
                type: 'object',
                properties: {
                  owner: { type: 'string' },
                  repo: { type: 'string' },
                  query: { type: 'string' },
                },
                required: ['owner', 'repo', 'query'],
              },
            },
            'zai.zread.get_repo_structure': {
              name: 'zai.zread.get_repo_structure',
              description: 'Get file structure of a GitHub repository',
              inputSchema: {
                type: 'object',
                properties: {
                  owner: { type: 'string' },
                  repo: { type: 'string' },
                  path: { type: 'string' },
                  depth: { type: 'number' },
                },
                required: ['owner', 'repo'],
              },
            },
          };

          toolDetails = httpToolDetails[name] || null;
        }

        if (!toolDetails) {
          output(
            null,
            'tool',
            getSchemaForCommand('tool'),
            outputOptions,
            [{ code: 'E_VALIDATION' as ErrorCode, message: `Tool not found: ${name}` }]
          );
          process.exit(2);
        }

        output(toolDetails, 'tool', getSchemaForCommand('tool'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'tool',
          getSchemaForCommand('tool'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });
}
