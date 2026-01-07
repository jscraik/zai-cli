/**
 * Code command - TypeScript tool chaining
 * Uses spawn for safe command execution
 */

import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { loadConfig } from '../lib/config.js';
import { getSchemaForCommand, output } from '../lib/output.js';
import type { ErrorCode, OutputOptions } from '../types/index.js';

/**
 * Execute a command safely using spawn
 */
function execSafe(
  command: string,
  args: string[],
  env: Record<string, string>
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

export function code(): Command {
  const codeCmd = new Command('code')
    .description('TypeScript tool chaining for multi-step workflows');

  codeCmd
    .command('run')
    .description('Execute a TypeScript chain file')
    .argument('<file>', 'TypeScript file to execute')
    .action(async (file) => {
      const config = await loadConfig();
      const outputOptions: OutputOptions = {
        json: true,
        plain: false,
        quiet: false,
        verbose: false,
        debug: false,
        noColor: true,
      };

      try {
        // Use tsx to run the TypeScript file (safe execution)
        // Pass through all supported API key variants for GLM coding plan compatibility
        const { stdout, stderr, exitCode } = await execSafe('npx', ['tsx', file], {
          Z_AI_API_KEY: config.apiKey || '',
          Z_AI_MODE: config.mode,
          // GLM coding plan compatibility
          GLM_API_KEY: config.apiKey || '',
          GLM_MODE: config.mode,
        });

        if (exitCode !== 0) {
          output(
            { stdout, stderr, exitCode },
            'code',
            getSchemaForCommand('code'),
            outputOptions,
            [{ code: 'E_INTERNAL' as ErrorCode, message: `Execution failed with exit code ${exitCode}` }]
          );
          process.exit(exitCode ?? 1);
        }

        output(stdout, 'code', getSchemaForCommand('code'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'code',
          getSchemaForCommand('code'),
          outputOptions,
          [{ code: 'E_INTERNAL' as ErrorCode, message }]
        );
        process.exit(1);
      }
    });

  codeCmd
    .command('eval')
    .description('Evaluate a TypeScript expression')
    .argument('<expression>', 'TypeScript expression to evaluate')
    .action(async (expression) => {
      const config = await loadConfig();
      const outputOptions: OutputOptions = {
        json: true,
        plain: false,
        quiet: false,
        verbose: false,
        debug: false,
        noColor: true,
      };

      try {
        // Use tsx to eval the expression (safe execution)
        // Pass through all supported API key variants for GLM coding plan compatibility
        const { stdout, stderr, exitCode } = await execSafe('npx', ['tsx', '-e', expression], {
          Z_AI_API_KEY: config.apiKey || '',
          Z_AI_MODE: config.mode,
          // GLM coding plan compatibility
          GLM_API_KEY: config.apiKey || '',
          GLM_MODE: config.mode,
        });

        if (exitCode !== 0) {
          output(
            { stdout, stderr, exitCode },
            'code',
            getSchemaForCommand('code'),
            outputOptions,
            [{ code: 'E_INTERNAL' as ErrorCode, message: `Evaluation failed with exit code ${exitCode}` }]
          );
          process.exit(exitCode ?? 1);
        }

        output(stdout, 'code', getSchemaForCommand('code'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'code',
          getSchemaForCommand('code'),
          outputOptions,
          [{ code: 'E_INTERNAL' as ErrorCode, message }]
        );
        process.exit(1);
      }
    });

  codeCmd
    .command('interfaces')
    .description('List available code mode interfaces')
    .action(async () => {
      const config = await loadConfig();
      const outputOptions: OutputOptions = {
        json: false,
        plain: true,
        quiet: false,
        verbose: false,
        debug: false,
        noColor: true,
      };

      const interfaces = [
        {
          name: 'call',
          signature: 'await call(toolName, arguments)',
          description: 'Call an MCP tool by name',
        },
        {
          name: 'search',
          signature: 'await search(query, options?)',
          description: 'Web search helper',
        },
        {
          name: 'read',
          signature: 'await read(url, options?)',
          description: 'Web reader helper',
        },
      ];

      output(interfaces, 'code', getSchemaForCommand('code'), outputOptions);
    });

  return codeCmd;
}
