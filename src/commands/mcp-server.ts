/**
 * MCP Server command - runs zai-cli as a headless MCP server
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { startMcpServer } from '../lib/mcp-server.js';

/**
 * MCP Server command
 * Runs zai-cli as a headless MCP server using stdio transport
 */
export function mcpServerCommand(): Command {
  return new Command('mcp-server')
    .description('Run zai-cli as a headless MCP server (exposes tools via stdio)')
    .option('--api-key <key>', 'Z.AI API key (overrides environment variable)')
    .action(async (options) => {
      try {
        // Load config
        const config = await loadConfig();

        // Use provided API key or fall back to config
        const apiKey = options.apiKey || config.apiKey;

        if (!apiKey) {
          console.error('Error: Z.AI_API_KEY is required');
          console.error('Set it with: export Z_AI_API_KEY="your-api-key"');
          process.exit(1);
        }

        // Start the MCP server (this runs forever)
        await startMcpServer(apiKey);
      } catch (err) {
        console.error(`Error starting MCP server: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
