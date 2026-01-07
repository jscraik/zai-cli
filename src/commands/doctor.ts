/**
 * Doctor command - diagnostics and health checks
 */

import { Command } from 'commander';
import { loadConfig, validateConfig } from '../lib/config.js';
import { connectToServer } from '../lib/mcp-client.js';
import { getSchemaForCommand, output } from '../lib/output.js';
import type { DoctorCheck, DoctorResult, McpServerType, OutputOptions } from '../types/index.js';

/**
 * Perform an API reachability/auth check against the web search MCP endpoint.
 * Exported for unit testing.
 */
export async function checkApiAccess(apiKey: string): Promise<{ healthy: boolean; check: DoctorCheck }> {
  try {
    const response = await fetch('https://api.z.ai/api/mcp/web_search_prime/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
    });

    if (response.ok) {
      return {
        healthy: true,
        check: {
          name: 'api_access',
          status: 'pass',
          message: 'Z.AI MCP API is reachable and authenticated',
        },
      };
    }

    const errorData = await response.json().catch(() => ({
      error: { message: response.statusText, code: response.status },
    })) as { error?: { message?: string; code?: string } };

    if (response.status === 401 || response.status === 403) {
      return {
        healthy: false,
        check: {
          name: 'api_access',
          status: 'fail',
          message: 'API authentication failed. Check your API key.',
        },
      };
    }

    return {
      healthy: false,
      check: {
        name: 'api_access',
        status: 'fail',
        message: `API request failed: ${response.status} ${errorData.error?.message || response.statusText}`,
      },
    };
  } catch (err) {
    return {
      healthy: true, // warn does not flip global healthy
      check: {
        name: 'api_access',
        status: 'warn',
        message: `API check failed: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }
}

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

      // Check HTTP-based MCP tools (GLM Coding Plan)
      if (config.apiKey) {
        const apiResult = await checkApiAccess(config.apiKey);
        if (!apiResult.healthy) {
          healthy = false;
        }
        checks.push(apiResult.check);
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
