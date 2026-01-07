/**
 * Setup command - Configure environment for Claude Code and other tools
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { dirname, join } from 'path';
import { loadConfig } from '../lib/config.js';
import { getSchemaForCommand, output } from '../lib/output.js';
import type { ErrorCode, OutputOptions } from '../types/index.js';

interface ClaudeSettings {
  env?: Record<string, string>;
  mcpServers?: Record<string, unknown>;
}

/**
 * Get Claude Code settings path
 */
function getClaudeSettingsPath(): string {
  return join(homedir(), '.claude', 'settings.json');
}

/**
 * Read existing Claude settings
 */
function readClaudeSettings(): ClaudeSettings | null {
  const settingsPath = getClaudeSettingsPath();
  if (!existsSync(settingsPath)) {
    return null;
  }

  try {
    const content = readFileSync(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write Claude settings
 */
function writeClaudeSettings(settings: ClaudeSettings): void {
  const settingsPath = getClaudeSettingsPath();

  // Ensure directory exists
  const dir = dirname(settingsPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

/**
 * Setup Z.AI environment for Claude Code
 */
export function setup(): Command {
  return new Command('setup')
    .description('Configure Z.AI for Claude Code and other tools')
    .option('--claude', 'Configure for Claude Code (default)')
    .option('--list', 'List current environment configuration')
    .option('--unset', 'Remove Z.AI configuration')
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

      if (options.list) {
        // List current configuration
        const settings = readClaudeSettings();
        const result = {
          configured: !!settings?.env?.['ANTHROPIC_BASE_URL'] && settings?.env?.['ANTHROPIC_BASE_URL']?.includes('z.ai'),
          anthropicBaseUrl: settings?.env?.['ANTHROPIC_BASE_URL'] || 'not configured',
          anthropicAuthToken: settings?.env?.['ANTHROPIC_AUTH_TOKEN'] ? '*** configured ***' : 'not configured',
          apiTimeout: settings?.env?.['API_TIMEOUT_MS'] || 'not configured',
          zaiApiKey: process.env.Z_AI_API_KEY ? '*** configured ***' : 'not configured',
        };
        output(result, 'setup', getSchemaForCommand('setup'), outputOptions);
        return;
      }

      if (options.unset) {
        // Remove Z.AI configuration
        const settings = readClaudeSettings();
        if (settings?.env) {
          delete settings.env['ANTHROPIC_AUTH_TOKEN'];
          delete settings.env['ANTHROPIC_BASE_URL'];
          delete settings.env['API_TIMEOUT_MS'];

          writeClaudeSettings(settings);
          output({ message: 'Z.AI configuration removed from Claude Code' }, 'setup', getSchemaForCommand('setup'), outputOptions);
        } else {
          output({ message: 'No Z.AI configuration found' }, 'setup', getSchemaForCommand('setup'), outputOptions, [{ code: 'E_VALIDATION' as ErrorCode, message: 'Configuration not found' }]);
        }
        return;
      }

      // Configure for Claude Code
      if (!config.apiKey) {
        output(
          [],
          'setup',
          getSchemaForCommand('setup'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY environment variable is required. Run: export Z_AI_API_KEY="your-api-key"' }]
        );
        process.exit(6);
      }

      // Read existing settings or create new
      const settings = readClaudeSettings() || {};

      // Add Z.AI environment configuration
      settings.env = {
        ...settings.env,
        'ANTHROPIC_AUTH_TOKEN': config.apiKey,
        'ANTHROPIC_BASE_URL': 'https://api.z.ai/api/anthropic',
        'API_TIMEOUT_MS': '3000000',
      };

      // Add MCP servers for GLM Coding Plan
      // These provide web search, web reader, and zread capabilities
      settings.mcpServers = {
        ...settings.mcpServers,
        'zai-vision': {
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@z_ai/mcp-server'],
          env: {
            'Z_AI_API_KEY': config.apiKey,
            'Z_AI_MODE': 'ZAI',
          },
        },
        'zai-web-search': {
          type: 'http',
          url: 'https://api.z.ai/api/mcp/web_search_prime/mcp',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        },
        'zai-web-reader': {
          type: 'http',
          url: 'https://api.z.ai/api/mcp/web_reader/mcp',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        },
        'zai-zread': {
          type: 'http',
          url: 'https://api.z.ai/api/mcp/zread/mcp',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
          },
        },
      };

      // Write settings
      writeClaudeSettings(settings);

      const result = {
        message: 'Z.AI configured successfully for Claude Code',
        settingsPath: getClaudeSettingsPath(),
        configured: {
          baseUrl: 'https://api.z.ai/api/anthropic',
          authToken: '*** configured ***',
          timeout: '3000000',
          mcpServers: [
            'zai-vision (local stdio)',
            'zai-web-search (HTTP)',
            'zai-web-reader (HTTP)',
            'zai-zread (HTTP)',
          ],
        },
        nextSteps: [
          '1. Restart Claude Code: exit and run "claude" again',
          '2. Check status: run /status in Claude Code to verify connection',
          '3. MCP servers will be available for vision, web search, web reader, and zread',
          '4. Start using Z.AI models and tools for all requests',
        ],
      };

      output(result, 'setup', getSchemaForCommand('setup'), outputOptions);

      if (!options.quiet) {
        console.error('\n✅ Z.AI is now configured for Claude Code!\n');
        console.error('Claude Code will now use Z.AI GLM Coding Plan models (GLM-4.7, GLM-4.5-air) for all requests.');
        console.error('MCP servers configured for: Vision, Web Search, Web Reader, and ZRead\n');
        console.error('To verify:');
        console.error('  1. Restart Claude Code (run "claude" again)');
        console.error('  2. Run: /status (should show Z.AI models)');
        console.error('  3. Try using vision, web search, or other MCP tools in Claude Code\n');
        console.error('Next time you use Claude Code, it will automatically use Z.AI!\n');
      }
    });
}
