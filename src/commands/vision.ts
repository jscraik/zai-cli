/**
 * Vision command - image/video analysis via Z.AI
 * Supports subcommands: analyze, ocr, ui-diff, video
 */

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { loadConfig } from '../lib/config.js';
import { output, getSchemaForCommand } from '../lib/output.js';
import { connectToServer } from '../lib/mcp-client.js';
import type { OutputOptions, McpServerType, ErrorCode } from '../types/index.js';

/**
 * Get output options from the parent command options
 */
function getOutputOptions(opts: any): OutputOptions {
  return {
    json: opts.json ?? false,
    plain: opts.plain ?? false,
    quiet: opts.quiet ?? false,
    verbose: opts.verbose ?? false,
    debug: opts.debug ?? false,
    noColor: opts.noColor ?? false,
  };
}

export function vision(): Command {
  const visionCmd = new Command('vision')
    .description('Image/video analysis via Z.AI vision API');

  visionCmd
    .command('analyze')
    .description('General image analysis')
    .argument('<image>', 'Path to image file')
    .argument('<prompt>', 'Analysis prompt')
    .action(async (image, prompt, options) => {
      const config = await loadConfig();
      const outputOptions = getOutputOptions(options.opts?.());

      if (!config.apiKey) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      if (!existsSync(image)) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_VALIDATION' as ErrorCode as ErrorCode, message: `Image file not found: ${image}` }]
        );
        process.exit(2);
      }

      try {
        const client = await connectToServer('vision' as McpServerType, config.apiKey);
        const result = await client.callTool('zai.vision.image_analysis', {
          image_path: image,
          prompt,
        });
        await client.disconnect();

        output(result, 'vision', getSchemaForCommand('vision'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode as ErrorCode, message }]
        );
        process.exit(5);
      }
    });

  visionCmd
    .command('ocr')
    .description('Extract text from image')
    .argument('<image>', 'Path to image file')
    .action(async (image, options) => {
      const config = await loadConfig();
      const outputOptions = getOutputOptions(options.opts?.());

      if (!config.apiKey) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      if (!existsSync(image)) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_VALIDATION' as ErrorCode as ErrorCode, message: `Image file not found: ${image}` }]
        );
        process.exit(2);
      }

      try {
        const client = await connectToServer('vision' as McpServerType, config.apiKey);
        const result = await client.callTool('zai.vision.extract_text_from_screenshot', {
          image_path: image,
        });
        await client.disconnect();

        output(result, 'vision', getSchemaForCommand('vision'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode as ErrorCode, message }]
        );
        process.exit(5);
      }
    });

  visionCmd
    .command('ui-diff')
    .description('Compare two UI screenshots')
    .argument('<before>', 'Path to "before" image')
    .argument('<after>', 'Path to "after" image')
    .action(async (before, after, options) => {
      const config = await loadConfig();
      const outputOptions = getOutputOptions(options.opts?.());

      if (!config.apiKey) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      if (!existsSync(before)) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_VALIDATION' as ErrorCode as ErrorCode, message: `Before image not found: ${before}` }]
        );
        process.exit(2);
      }

      if (!existsSync(after)) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_VALIDATION' as ErrorCode as ErrorCode, message: `After image not found: ${after}` }]
        );
        process.exit(2);
      }

      try {
        const client = await connectToServer('vision' as McpServerType, config.apiKey);
        const result = await client.callTool('zai.vision.ui_diff_check', {
          image_path_before: before,
          image_path_after: after,
        });
        await client.disconnect();

        output(result, 'vision', getSchemaForCommand('vision'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode as ErrorCode, message }]
        );
        process.exit(5);
      }
    });

  visionCmd
    .command('video')
    .description('Analyze video content')
    .argument('<video>', 'Path to video file')
    .argument('<prompt>', 'Analysis prompt')
    .action(async (video, prompt, options) => {
      const config = await loadConfig();
      const outputOptions = getOutputOptions(options.opts?.());

      if (!config.apiKey) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_AUTH' as ErrorCode as ErrorCode, message: 'Z_AI_API_KEY is required' }]
        );
        process.exit(6);
      }

      if (!existsSync(video)) {
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_VALIDATION' as ErrorCode as ErrorCode, message: `Video file not found: ${video}` }]
        );
        process.exit(2);
      }

      try {
        const client = await connectToServer('vision' as McpServerType, config.apiKey);
        const result = await client.callTool('zai.vision.video_analysis', {
          video_path: video,
          prompt,
        });
        await client.disconnect();

        output(result, 'vision', getSchemaForCommand('vision'), outputOptions);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        output(
          null,
          'vision',
          getSchemaForCommand('vision'),
          outputOptions,
          [{ code: 'E_NETWORK' as ErrorCode as ErrorCode, message }]
        );
        process.exit(5);
      }
    });

  return visionCmd;
}
