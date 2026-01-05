/**
 * Package entry point for zai-cli
 */

export { loadConfig, validateConfig, getVersion } from './lib/config.js';
export { output, error, shouldUseColor, getSchemaForCommand } from './lib/output.js';
export { get, set, clear, invalidate, toolDiscoveryKey } from './lib/cache.js';
export {
  connectToServer,
  McpClientWrapper,
  callHttpTool,
  callWebSearch,
  callWebReader,
  callZRead,
  withRetry,
} from './lib/mcp-client.js';

export type {
  ErrorCode,
  ExitCode,
  SchemaVersion,
  OutputStatus,
  OutputError,
  OutputMeta,
  JsonOutput,
  Config,
  CacheConfig,
  RetryConfig,
  OutputOptions,
  CommandContext,
  McpServerType,
  McpTool,
  McpToolResult,
  CacheEntry,
  VisionInput,
  SearchInput,
  ReadInput,
  RepoTreeInput,
  RepoSearchInput,
  CallInput,
  DoctorResult,
  DoctorCheck,
} from './types/index.js';
