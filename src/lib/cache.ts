/**
 * Cache module for zai-cli
 * File-based caching with TTL for tool discovery results
 */

import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CacheEntry } from '../types/index.js';
import type { Config } from './config.js';

/**
 * Get cache file path for a key
 */
function getCachePath(cacheDir: string, key: string): string {
  // Use a safe filename encoding
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(cacheDir, `${safeKey}.json`);
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDir(cacheDir: string): Promise<void> {
  if (!existsSync(cacheDir)) {
    await mkdir(cacheDir, { recursive: true });
  }
}

/**
 * Read a cache entry
 */
async function readCacheEntry<T>(path: string): Promise<CacheEntry<T> | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as CacheEntry<T>;
  } catch {
    return null;
  }
}

/**
 * Write a cache entry
 */
async function writeCacheEntry<T>(path: string, entry: CacheEntry<T>): Promise<void> {
  await writeFile(path, JSON.stringify(entry), 'utf-8');
}

/**
 * Get a value from cache
 * Returns null if not found, expired, or caching is disabled
 */
export async function get<T>(
  config: Config,
  key: string
): Promise<T | null> {
  // Check if caching is enabled
  if (!config.cache.enabled) {
    return null;
  }

  const path = getCachePath(config.cache.dir, key);
  const entry = await readCacheEntry<T>(path);

  if (!entry) {
    return null;
  }

  // Check if entry has expired
  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    // Entry expired, delete it
    await unlink(path).catch(() => {});
    return null;
  }

  return entry.data;
}

/**
 * Set a value in cache
 */
export async function set<T>(
  config: Config,
  key: string,
  data: T,
  customTtl?: number
): Promise<void> {
  // Don't cache if disabled
  if (!config.cache.enabled) {
    return;
  }

  await ensureCacheDir(config.cache.dir);

  const path = getCachePath(config.cache.dir, key);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: customTtl ?? config.cache.ttlMs,
  };

  await writeCacheEntry(path, entry);
}

/**
 * Clear all cache entries
 */
export async function clear(config: Config): Promise<void> {
  // Use cache directory directly - will expand later
  // For now, this is a placeholder
}

/**
 * Invalidate a specific cache entry
 */
export async function invalidate(config: Config, key: string): Promise<void> {
  const path = getCachePath(config.cache.dir, key);
  try {
    await unlink(path);
  } catch {
    // Ignore errors if file doesn't exist
  }
}

/**
 * Generate a cache key for tool discovery
 */
export function toolDiscoveryKey(filter?: string, includeVision = true): string {
  const parts = ['tools'];
  if (filter) parts.push(filter);
  if (includeVision) parts.push('vision');
  return parts.join(':');
}
