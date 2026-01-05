/**
 * Doctor command - diagnostics and health checks
 */

import { Command } from 'commander';
import { loadConfig, validateConfig } from '../lib/config.js';
import { output, getSchemaForCommand } from '../lib/output.js';
import { connectToServer } from '../lib/mcp-client.js';
import type { OutputOptions, DoctorCheck, DoctorResult, McpServerType } from '../types/index.js';

export function doctor(): Command {
  return new Command('doctor')
    .description('Environment and connectivity checks')
    .option('--no-vision', 'Skip vision MCP server check')
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

      const checks: DoctorCheck[] = [];
      let healthy = true;

      // Check API key
      const configCheck = await validateConfig(config);
      if (configCheck.valid) {
        checks.push({
          name: 'config',
          status: 'pass',
          message: 'Configuration is valid',
        });
      } else {
        healthy = false;
        checks.push({
          name: 'config',
          status: 'fail',
          message: configCheck.error || 'Configuration validation failed',
        });
      }

      // Check Node version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
      if (majorVersion >= 22) {
        checks.push({
          name: 'node_version',
          status: 'pass',
          message: `Node.js ${nodeVersion} (>= 22.0.0 required)`,
        });
      } else {
        healthy = false;
        checks.push({
          name: 'node_version',
          status: 'fail',
          message: `Node.js ${nodeVersion} (>= 22.0.0 required)`,
        });
      }

      // Check vision MCP server (if enabled)
      if (options.vision && config.apiKey) {
        try {
          const visionClient = await connectToServer('vision' as McpServerType, config.apiKey);
          await visionClient.listTools();
          await visionClient.disconnect();
          checks.push({
            name: 'vision_mcp',
            status: 'pass',
            message: 'Vision MCP server is reachable',
          });
        } catch (err) {
          checks.push({
            name: 'vision_mcp',
            status: 'warn',
            message: `Vision MCP server check failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      // Check HTTP-based tools
      if (config.apiKey) {
        try {
          // Try a simple search to verify API key and connectivity
          const response = await fetch('https://api.z.ai/api/mcp/web_search_prime/mcp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              name: 'webSearchPrime',
              arguments: { search_query: 'test', result_count: 1 },
            }),
          });

          if (response.ok) {
            checks.push({
              name: 'http_mcp',
              status: 'pass',
              message: 'HTTP MCP servers are reachable',
            });
          } else {
            healthy = false;
            checks.push({
              name: 'http_mcp',
              status: 'fail',
              message: `HTTP MCP request failed: ${response.status} ${response.statusText}`,
            });
          }
        } catch (err) {
          checks.push({
            name: 'http_mcp',
            status: 'warn',
            message: `HTTP MCP check failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }

      const result: DoctorResult = {
        healthy,
        checks,
      };

      output(result, 'doctor', getSchemaForCommand('doctor'), outputOptions);

      // Exit with appropriate code
      process.exit(healthy ? 0 : 1);
    });
}
