/**
 * Configuration module for zai-cli
 * Handles environment variables, config files, and validation
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import type { CacheConfig, RetryConfig } from '../types/index.js';
import type { Config } from '../types/index.js';

// Re-export Config type for use in other modules
export type { Config } from '../types/index.js';

const PACKAGE_VERSION = '0.1.0';

/**
 * Get XDG config directory with fallback
 */
function getXDGConfigPath(): string {
  const xdgConfig = process.env.XDG_CONFIG_HOME;
  if (xdgConfig) {
    return join(xdgConfig, 'zai-cli');
  }
  return join(homedir(), '.config', 'zai-cli');
}

/**
 * Get cache directory with fallback
 */
function getCacheDir(): string {
  const cacheEnv = process.env.ZAI_MCP_CACHE_DIR;
  if (cacheEnv) {
    return cacheEnv;
  }
  const xdgCache = process.env.XDG_CACHE_HOME;
  if (xdgCache) {
    return join(xdgCache, 'zai-cli');
  }
  return join(homedir(), '.cache', 'zai-cli');
}

/**
 * Parse cache TTL from environment
 */
function parseCacheTTL(): number {
  const ttlEnv = process.env.ZAI_MCP_TOOL_CACHE_TTL_MS;
  if (ttlEnv) {
    const parsed = parseInt(ttlEnv, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 86400000; // 24 hours default
}

/**
 * Parse timeout from environment
 */
function parseTimeout(): number {
  const timeoutEnv = process.env.Z_AI_TIMEOUT;
  if (timeoutEnv) {
    const parsed = parseInt(timeoutEnv, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 30000; // 30 seconds default
}

/**
 * Parse retry counts from environment
 */
function parseRetryConfig(): RetryConfig {
  return {
    vision: parseInt(process.env.ZAI_MCP_VISION_RETRY_COUNT || '2', 10),
    global: parseInt(process.env.ZAI_MCP_RETRY_COUNT || '0', 10),
  };
}

/**
 * Check if caching is enabled
 */
function isCacheEnabled(): boolean {
  return process.env.ZAI_MCP_TOOL_CACHE !== '0';
}

/**
 * Read and parse a JSON config file
 */
async function readConfigFile(path: string): Promise<Record<string, unknown> | null> {
  try {
    if (!existsSync(path)) {
      return null;
    }
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Load configuration from all sources with proper precedence
 * Precedence: env > project config > user config > system config > defaults
 */
export async function loadConfig(): Promise<Config> {
  // Start with defaults
  const config: Config = {
    apiKey: process.env.Z_AI_API_KEY,
    mode: process.env.Z_AI_MODE || 'ZAI',
    timeout: parseTimeout(),
    cache: {
      enabled: isCacheEnabled(),
      ttlMs: parseCacheTTL(),
      dir: getCacheDir(),
    },
    retry: parseRetryConfig(),
    noColor: process.env.NO_COLOR !== undefined,
    quiet: false,
    verbose: false,
    debug: false,
  };

  // Load config files in reverse precedence order (later overrides earlier)
  const configPaths = [
    '/etc/zai-cli/config.json', // System
    getXDGConfigPath() + '/config.json', // User
    process.cwd() + '/.zai-cli.json', // Project
  ];

  for (const path of configPaths) {
    const fileConfig = await readConfigFile(path);
    if (fileConfig) {
      // Merge config (file values override defaults but not env)
      if (fileConfig.mode && !process.env.Z_AI_MODE) {
        config.mode = fileConfig.mode as string;
      }
      if (fileConfig.timeout && !process.env.Z_AI_TIMEOUT) {
        config.timeout = fileConfig.timeout as number;
      }
      if (fileConfig.cache) {
        const cache = fileConfig.cache as Partial<CacheConfig>;
        if (cache.enabled !== undefined && !process.env.ZAI_MCP_TOOL_CACHE) {
          config.cache.enabled = cache.enabled;
        }
        if (cache.ttlMs !== undefined && !process.env.ZAI_MCP_TOOL_CACHE_TTL_MS) {
          config.cache.ttlMs = cache.ttlMs;
        }
        if (cache.dir !== undefined && !process.env.ZAI_MCP_CACHE_DIR) {
          config.cache.dir = cache.dir;
        }
      }
      if (fileConfig.retry) {
        const retry = fileConfig.retry as Partial<RetryConfig>;
        if (retry.vision !== undefined && !process.env.ZAI_MCP_VISION_RETRY_COUNT) {
          config.retry.vision = retry.vision;
        }
        if (retry.global !== undefined && !process.env.ZAI_MCP_RETRY_COUNT) {
          config.retry.global = retry.global;
        }
      }
    }
  }

  return config;
}

/**
 * Get the API key (returns undefined if not set)
 */
export function getApiKey(): string | undefined {
  return process.env.Z_AI_API_KEY;
}

/**
 * Validate that required configuration is present
 */
export async function validateConfig(config: Config): Promise<{ valid: boolean; error?: string }> {
  if (!config.apiKey) {
    return {
      valid: false,
      error: 'Z_AI_API_KEY environment variable is required. Set it with: export Z_AI_API_KEY="your-api-key"',
    };
  }

  if (config.apiKey.length < 10) {
    return {
      valid: false,
      error: 'Z_AI_API_KEY appears to be invalid (too short)',
    };
  }

  return { valid: true };
}

/**
 * Get the package version
 */
export function getVersion(): string {
  return PACKAGE_VERSION;
}
