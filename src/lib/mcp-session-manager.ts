/**
 * MCP Session Manager for persistent SSE connections
 * Manages long-lived sessions with Z.AI MCP servers
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

interface SessionInfo {
    sessionId: string;
    endpoint: string;
    createdAt: number;
    expiresAt: number;
}

interface SessionCache {
    sessions: Record<string, SessionInfo>;
}

const SESSION_CACHE_DIR = join(homedir(), '.cache', 'zai-cli');
const SESSION_CACHE_FILE = join(SESSION_CACHE_DIR, 'mcp-sessions.json');
const SESSION_TTL = 3600000; // 1 hour

/**
 * Load sessions from cache
 */
function loadSessions(): SessionCache {
    try {
        if (existsSync(SESSION_CACHE_FILE)) {
            const data = readFileSync(SESSION_CACHE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch {
        // Ignore errors
    }
    return { sessions: {} };
}

/**
 * Save sessions to cache
 */
function saveSessions(cache: SessionCache): void {
    try {
        if (!existsSync(SESSION_CACHE_DIR)) {
            mkdirSync(SESSION_CACHE_DIR, { recursive: true });
        }
        writeFileSync(SESSION_CACHE_FILE, JSON.stringify(cache, null, 2));
    } catch {
        // Ignore errors
    }
}

/**
 * Get or create a session for an endpoint
 */
export async function getSession(sseEndpoint: string, apiKey: string): Promise<string> {
    const cache = loadSessions();
    const now = Date.now();
    const cacheKey = `${sseEndpoint}|${apiKey}`;

    // Check if we have a valid cached session
    const cached = cache.sessions[cacheKey];
    if (cached && cached.expiresAt > now) {
        return cached.sessionId;
    }

    // Create new session
    const sessionId = await createSession(sseEndpoint, apiKey);

    // Cache it
    cache.sessions[cacheKey] = {
        sessionId,
        endpoint: sseEndpoint,
        createdAt: now,
        expiresAt: now + SESSION_TTL,
    };

    saveSessions(cache);
    return sessionId;
}

/**
 * Create a new session by connecting to SSE endpoint
 */
async function createSession(sseEndpoint: string, apiKey: string): Promise<string> {
    const response = await fetch(`${sseEndpoint}?Authorization=${apiKey}`, {
        method: 'GET',
        headers: {
            'Accept': 'text/event-stream',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to connect to MCP SSE endpoint: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
        throw new Error('No response body from SSE endpoint');
    }

    // Read the SSE stream until we get the session ID
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        // Set a timeout for reading
        const timeout = setTimeout(() => {
            reader.cancel();
        }, 5000);

        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Look for session ID in the buffer
            const match = buffer.match(/sessionId=([^&\s\n]+)/);
            if (match) {
                clearTimeout(timeout);
                reader.cancel();
                return match[1];
            }

            // If we've read enough data without finding session ID, something is wrong
            if (buffer.length > 1000) {
                clearTimeout(timeout);
                reader.cancel();
                throw new Error('Failed to extract session ID from MCP SSE response');
            }
        }

        clearTimeout(timeout);
    } finally {
        reader.releaseLock();
    }

    throw new Error('Failed to extract session ID from MCP SSE response');
}

/**
 * Clear expired sessions from cache
 */
export function clearExpiredSessions(): void {
    const cache = loadSessions();
    const now = Date.now();

    for (const [key, session] of Object.entries(cache.sessions)) {
        if (session.expiresAt <= now) {
            delete cache.sessions[key];
        }
    }

    saveSessions(cache);
}

/**
 * Clear all sessions
 */
export function clearAllSessions(): void {
    saveSessions({ sessions: {} });
}
