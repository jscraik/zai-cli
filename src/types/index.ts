/**
 * Shared TypeScript types for zai-cli
 */

/**
 * Error codes for stable machine-parseable error handling
 */
export enum ErrorCode {
  USAGE = 'E_USAGE',
  VALIDATION = 'E_VALIDATION',
  POLICY = 'E_POLICY',
  PARTIAL = 'E_PARTIAL',
  AUTH = 'E_AUTH',
  NETWORK = 'E_NETWORK',
  INTERNAL = 'E_INTERNAL',
}

/**
 * Exit codes for CLI processes
 */
export enum ExitCode {
  Success = 0,
  GenericFailure = 1,
  InvalidUsage = 2,
  PolicyRefusal = 3,
  PartialSuccess = 4,
  NetworkFailure = 5,
  AuthFailure = 6,
  UserAbort = 130,
}

/**
 * JSON output schema version identifier
 */
export type SchemaVersion =
  | 'zai-cli.vision.v1'
  | 'zai-cli.search.v1'
  | 'zai-cli.read.v1'
  | 'zai-cli.repo.v1'
  | 'zai-cli.tools.v1'
  | 'zai-cli.call.v1'
  | 'zai-cli.code.v1'
  | 'zai-cli.doctor.v1';

/**
 * Output status types
 */
export type OutputStatus = 'success' | 'warn' | 'error';

/**
 * Error details in JSON output
 */
export interface OutputError {
  code: ErrorCode;
  message: string;
  details?: unknown;
  hint?: string;
}

/**
 * Metadata included in JSON output
 */
export interface OutputMeta {
  tool: string;
  version: string;
  timestamp: string;
  command: string;
  requestId?: string;
}

/**
 * Standard JSON output wrapper
 */
export interface JsonOutput<T = unknown> {
  schema: SchemaVersion;
  meta: OutputMeta;
  status: OutputStatus;
  data: T;
  errors: OutputError[];
}

/**
 * Configuration loaded from environment and config files
 */
export interface Config {
  apiKey?: string;
  mode: string;
  timeout: number;
  cache: CacheConfig;
  retry: RetryConfig;
  noColor: boolean;
  quiet: boolean;
  verbose: boolean;
  debug: boolean;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttlMs: number;
  dir: string;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  vision: number;
  global: number;
}

/**
 * Output formatting options
 */
export interface OutputOptions {
  json: boolean;
  plain: boolean;
  quiet: boolean;
  verbose: boolean;
  debug: boolean;
  noColor: boolean;
}

/**
 * Command options context (passed to all commands)
 */
export interface CommandContext {
  config: Config;
  output: OutputOptions;
}

/**
 * Z.AI MCP server types
 */
export enum McpServerType {
  Vision = 'vision',
  Search = 'search',
  Read = 'read',
  Zread = 'zread',
}

/**
 * MCP tool descriptor
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
}

/**
 * MCP tool call result
 */
export interface McpToolResult {
  content: unknown;
  isError?: boolean;
}

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Vision command input
 */
export interface VisionInput {
  imagePath: string;
  prompt: string;
}

/**
 * Search command input
 */
export interface SearchInput {
  query: string;
  count?: number;
  language?: string;
  timeRange?: string;
}

/**
 * Read command input
 */
export interface ReadInput {
  url: string;
  withImagesSummary?: boolean;
  noGfm?: boolean;
  retainImages?: boolean;
}

/**
 * Repo command input
 */
export interface RepoTreeInput {
  ownerRepo: string;
  path?: string;
  depth?: number;
}

export interface RepoSearchInput {
  ownerRepo: string;
  query: string;
  language?: string;
}

/**
 * Call command input
 */
export interface CallInput {
  tool: string;
  args?: unknown;
  dryRun?: boolean;
}

/**
 * Doctor health check result
 */
export interface DoctorResult {
  healthy: boolean;
  checks: DoctorCheck[];
}

/**
 * Individual health check
 */
export interface DoctorCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: unknown;
}
