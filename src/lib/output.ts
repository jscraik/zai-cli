/**
 * Output module for zai-cli
 * Handles data-only default output, JSON wrapper, and plain text formatting
 */

import { createWriteStream } from 'node:fs';
import type { JsonOutput, OutputError, OutputOptions, SchemaVersion } from '../types/index.js';
import { getVersion } from './config.js';

/**
 * Check if stdout is a TTY
 */
function isStdoutTTY(): boolean {
  return process.stdout.isTTY;
}

/**
 * Check if stderr is a TTY
 */
function isStderrTTY(): boolean {
  return process.stderr.isTTY;
}

/**
 * Check if color should be used
 */
export function shouldUseColor(options: OutputOptions): boolean {
  if (options.noColor) {
    return false;
  }
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }
  if (process.env.TERM === 'dumb') {
    return false;
  }
  return isStdoutTTY();
}

/**
 * Create metadata for JSON output
 */
function createMeta(command: string): JsonOutput['meta'] {
  return {
    tool: 'zai-cli',
    version: getVersion(),
    timestamp: new Date().toISOString(),
    command,
  };
}

/**
 * Wrap data in standard JSON output schema
 */
export function wrapJson<T>(
  data: T,
  command: string,
  schema: SchemaVersion,
  errors: OutputError[] = [],
  status: JsonOutput['status'] = 'success'
): JsonOutput<T> {
  return {
    schema,
    meta: createMeta(command),
    status: errors.length > 0 ? 'error' : status,
    data,
    errors,
  };
}

/**
 * Format data as plain text (stable line-based format)
 */
export function formatPlain(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => JSON.stringify(item)).join('\n');
  }

  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }

  return String(data);
}

/**
 * Write data to stdout
 */
function writeStdout(data: string): void {
  process.stdout.write(data);
}

/**
 * Write data to stderr
 */
function writeStderr(data: string): void {
  process.stderr.write(data);
}

/**
 * Output data based on options
 * Default: data-only (no wrapper) for token efficiency
 * --json: Wrapped output with schema
 * --plain: Stable line-based text
 */
export function output<T>(
  data: T,
  command: string,
  schema: SchemaVersion,
  options: OutputOptions,
  errors: OutputError[] = []
): void {
  // JSON output: always wrapped
  if (options.json) {
    const wrapped = wrapJson(data, command, schema, errors);
    writeStdout(JSON.stringify(wrapped, null, 2));
    if (isStdoutTTY()) writeStdout('\n');
    return;
  }

  // If there are errors in non-JSON mode, output error info
  if (errors.length > 0) {
    for (const error of errors) {
      writeStderr(`Error: ${error.message}\n`);
      if (error.hint) {
        writeStderr(`Hint: ${error.hint}\n`);
      }
    }
    return;
  }

  // Plain output: stable line-based format
  if (options.plain) {
    writeStdout(formatPlain(data));
    if (isStdoutTTY() && typeof data === 'object') writeStdout('\n');
    return;
  }

  // Default: data-only output for token efficiency
  if (Array.isArray(data)) {
    // Output array items as JSON lines
    for (const item of data) {
      writeStdout(JSON.stringify(item) + '\n');
    }
    return;
  }

  if (typeof data === 'object' && data !== null) {
    writeStdout(JSON.stringify(data, null, 0));
    if (isStdoutTTY()) writeStdout('\n');
    return;
  }

  // Primitives: output as-is
  writeStdout(String(data));
  if (isStdoutTTY()) writeStdout('\n');
}

/**
 * Output verbose/debug diagnostics to stderr
 */
export function diagnostic(message: string, options: OutputOptions): void {
  if (options.verbose || options.debug) {
    writeStderr(`[diag] ${message}\n`);
  }
}

/**
 * Output debug information to stderr
 */
export function debug(message: string, options: OutputOptions): void {
  if (options.debug) {
    writeStderr(`[debug] ${message}\n`);
  }
}

/**
 * Output error information to stderr
 */
export function error(message: string, code: string, hint?: string): never {
  writeStderr(`Error (${code}): ${message}\n`);
  if (hint) {
    writeStderr(`Hint: ${hint}\n`);
  }
  process.exit(1);
}

/**
 * Create an error object for JSON output
 */
export function createError(
  code: OutputError['code'],
  message: string,
  details?: unknown,
  hint?: string
): OutputError {
  return {
    code,
    message,
    details,
    hint,
  };
}

/**
 * Get the appropriate schema version for a command
 */
export function getSchemaForCommand(command: string): SchemaVersion {
  const schemaMap: Record<string, SchemaVersion> = {
    vision: 'zai-cli.vision.v1',
    search: 'zai-cli.search.v1',
    read: 'zai-cli.read.v1',
    repo: 'zai-cli.repo.v1',
    tools: 'zai-cli.tools.v1',
    tool: 'zai-cli.tools.v1',
    call: 'zai-cli.call.v1',
    code: 'zai-cli.code.v1',
    doctor: 'zai-cli.doctor.v1',
    model: 'zai-cli.model.v1',
  };

  return schemaMap[command] || 'zai-cli.tools.v1';
}
