/**
 * Repo command - GitHub repository exploration via ZRead
 * Supports subcommands: tree, search
 */

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import { callZRead } from '../lib/mcp-curl-client.js';
import { getSchemaForCommand, output } from '../lib/output.js';
import type { ErrorCode, OutputOptions } from '../types/index.js';

function parseOwnerRepo(input: string): { owner: string; repo: string } | null {
  const parts = input.split('/');
  if (parts.length !== 2) {
    return null;
  }
  const [owner, repo] = parts;
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

export function repo(): Command {
  const repoCmd = new Command('repo')
    .description('GitHub repository exploration via ZRead');

  repoCmd
    .command('tree')
    .description('Get repository file structure')
    .argument('<owner/repo>', 'Repository in owner/repo format')
    .option('--path <dir>', 'Subdirectory path')
    .option('--depth <n>', 'Maximum depth', '3')
    .action(async (ownerRepo, options) => {
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
          'repo',
          getSchemaForCommand('repo'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      const parsed = parseOwnerRepo(ownerRepo);
      if (!parsed) {
        output(
          null,
          'repo',
          getSchemaForCommand('repo'),
          outputOptions,
          [{ code: 'E_VALIDATION' as ErrorCode, message: 'Invalid repository format. Use owner/repo' }]
        );
        process.exit(2);
      }

      try {
        const result = await callZRead(config.apiKey, 'get_repo_structure', {
          owner: parsed.owner,
          repo: parsed.repo,
          ...(options.path && { path: options.path }),
          depth: parseInt(options.depth, 10),
        });

        output(result, 'repo', getSchemaForCommand('repo'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'repo',
          getSchemaForCommand('repo'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });

  repoCmd
    .command('search')
    .description('Search repository documentation')
    .argument('<owner/repo>', 'Repository in owner/repo format')
    .argument('<query>', 'Search query')
    .option('--language <code>', 'Language filter')
    .action(async (ownerRepo, query, options) => {
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
          'repo',
          getSchemaForCommand('repo'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      const parsed = parseOwnerRepo(ownerRepo);
      if (!parsed) {
        output(
          null,
          'repo',
          getSchemaForCommand('repo'),
          outputOptions,
          [{ code: 'E_VALIDATION' as ErrorCode, message: 'Invalid repository format. Use owner/repo' }]
        );
        process.exit(2);
      }

      try {
        const result = await callZRead(config.apiKey, 'search_doc', {
          owner: parsed.owner,
          repo: parsed.repo,
          query,
          ...(options.language && { language: options.language }),
        });

        output(result, 'repo', getSchemaForCommand('repo'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'repo',
          getSchemaForCommand('repo'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode, message }]
        );
        process.exit(5);
      }
    });

  return repoCmd;
}
