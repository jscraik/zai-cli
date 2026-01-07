/**
 * MCP Client module for zai-cli - GLM Coding Plan SSE implementation
 * Handles communication with Z.AI MCP servers via SSE streams
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpTool, McpToolResult } from '../types/index.js';
import { McpServerType } from '../types/index.js';
import { getSession } from './mcp-session-manager.js';
/**
 * Timeout for MCP server connections (ms)
 */
const MCP_CONNECTION_TIMEOUT = 30000;

/**
 * Timeout for MCP tool calls (ms)
 */
const MCP_TOOL_TIMEOUT = 120000;

/**
 * GLM Coding Plan MCP SSE endpoints
 */
const MCP_SSE_ENDPOINTS = {
    webSearch: 'https://api.z.ai/api/mcp/web_search_prime/sse',
    webReader: 'https://api.z.ai/api/mcp/web_reader/sse',
    zread: 'https://api.z.ai/api/mcp/zread/sse',
};

/**
 * Call a remote HTTP MCP server tool via SSE
 */
async function callRemoteMcpTool(
    sseEndpoint: string,
    apiKey: string,
    toolName: string,
    args: Record<string, unknown>
): Promise<unknown> {
    // Step 1: Get or reuse session ID
    const sessionId = await getSession(sseEndpoint, apiKey);

    // Step 2: Build message URL
    const basePath = sseEndpoint.replace(/\/sse$/, '').replace(/^https?:\/\/[^\/]+/, '');
    const messageUrl = `https://api.z.ai${basePath}/message?sessionId=${sessionId}&Authorization=${apiKey}`;

    // Step 3: Make the tool call
    const jsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
            name: toolName,
            arguments: args,
        },
    };

    const response = await fetch(messageUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonRpcRequest),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP request failed: ${response.status} ${errorText}`);
    }

    if (!response.body) {
        throw new Error('No response body from MCP message endpoint');
    }

    // Step 4: Read the SSE stream response with timeout
    return new Promise((resolve, reject) => {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let hasResult = false;

        // Set timeout to prevent hanging
        const timeout = setTimeout(() => {
            if (!hasResult) {
                reader.cancel();
                reject(new Error('MCP request timed out waiting for response'));
            }
        }, 30000); // 30 second timeout

        const processStream = async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            const data = line.slice(5).trim();
                            if (data) {
                                try {
                                    const json = JSON.parse(data);

                                    // Check for errors
                                    if (json.result?.isError || json.error) {
                                        const errorMsg = json.result?.content?.[0]?.text || json.error?.message || 'MCP tool call failed';
                                        hasResult = true;
                                        clearTimeout(timeout);
                                        reader.cancel();
                                        reject(new Error(errorMsg));
                                        return;
                                    }

                                    // Extract content
                                    if (json.result?.content) {
                                        const content = json.result.content;
                                        let result: unknown;

                                        if (Array.isArray(content)) {
                                            const textContent = content.map((c: any) => c.text || c).join('\n');
                                            if (textContent.trim().startsWith('{') || textContent.trim().startsWith('[')) {
                                                try {
                                                    result = JSON.parse(textContent);
                                                } catch {
                                                    result = textContent;
                                                }
                                            } else {
                                                result = textContent;
                                            }
                                        } else {
                                            result = content;
                                        }

                                        hasResult = true;
                                        clearTimeout(timeout);
                                        reader.cancel();
                                        resolve(result);
                                        return;
                                    }

                                    if (json.result) {
                                        hasResult = true;
                                        clearTimeout(timeout);
                                        reader.cancel();
                                        resolve(json.result);
                                        return;
                                    }
                                } catch (e) {
                                    if (e instanceof Error && (e.message.includes('MCP') || e.message.includes('error'))) {
                                        hasResult = true;
                                        clearTimeout(timeout);
                                        reader.cancel();
                                        reject(e);
                                        return;
                                    }
                                    // Continue reading if JSON parse failed
                                }
                            }
                        }
                    }
                }

                // Stream ended without result
                clearTimeout(timeout);
                if (!hasResult) {
                    reject(new Error('MCP stream ended without result'));
                }
            } catch (error) {
                clearTimeout(timeout);
                reader.cancel();
                reject(error);
            } finally {
                reader.releaseLock();
            }
        };

        processStream();
    });
}

/**
 * Call web search via Z.AI MCP endpoint
 */
export async function callWebSearch(
    apiKey: string,
    query: string,
    options?: { count?: number; language?: string; timeRange?: string },
    _apiBaseUrl?: string
): Promise<unknown> {
    return callRemoteMcpTool(
        MCP_SSE_ENDPOINTS.webSearch,
        apiKey,
        'webSearchPrime',
        {
            search_query: query,
            count: options?.count ?? 10,
            ...(options?.timeRange && { search_recency_filter: options.timeRange }),
        }
    );
}

/**
 * Call web reader via Z.AI MCP endpoint
 */
export async function callWebReader(
    apiKey: string,
    url: string,
    options?: { withImagesSummary?: boolean; noGfm?: boolean; retainImages?: boolean },
    _apiBaseUrl?: string
): Promise<unknown> {
    return callRemoteMcpTool(
        MCP_SSE_ENDPOINTS.webReader,
        apiKey,
        'webReader',
        {
            url,
            ...(options?.retainImages !== undefined && { retain_images: options.retainImages }),
        }
    );
}

/**
 * Call ZRead via Z.AI MCP endpoint
 */
export async function callZRead(
    apiKey: string,
    method: 'search_doc' | 'get_repo_structure' | 'read_file',
    args: Record<string, unknown>
): Promise<unknown> {
    return callRemoteMcpTool(
        MCP_SSE_ENDPOINTS.zread,
        apiKey,
        method,
        args
    );
}

// Stdio MCP client functions below (for vision server)

/**
 * Wrap a promise with a timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
    ]);
}

/**
 * MCP Server configuration
 */
interface McpServerConfig {
    command: string;
    args: string[];
    env: Record<string, string>;
}

/**
 * Get the server config for a given server type
 */
function getServerConfig(serverType: McpServerType, apiKey: string): McpServerConfig {
    const baseEnv = {
        Z_AI_API_KEY: apiKey,
        Z_AI_MODE: 'ZAI',
    };

    switch (serverType) {
        case McpServerType.Vision:
        case McpServerType.Zread:
            return {
                command: 'npx',
                // Use @latest to avoid stale npx cache and ensure newest vision server (>=0.1.2)
                args: ['-y', '@z_ai/mcp-server@latest'],
                env: baseEnv,
            };
        case McpServerType.Search:
            throw new Error('Search is HTTP-based, not stdio');
        case McpServerType.Read:
            throw new Error('Read is HTTP-based, not stdio');
        default:
            throw new Error(`Unknown server type: ${serverType}`);
    }
}

/**
 * MCP Client wrapper class for stdio connections
 */
export class McpClientWrapper {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private connected = false;

    async connect(serverType: McpServerType, apiKey: string): Promise<void> {
        const config = getServerConfig(serverType, apiKey);

        this.client = new Client(
            {
                name: 'zai-cli',
                version: '0.1.0',
            },
            {
                capabilities: {},
            }
        );

        this.transport = new StdioClientTransport({
            command: config.command,
            args: config.args,
            env: config.env,
        });

        await withTimeout(
            this.client.connect(this.transport),
            MCP_CONNECTION_TIMEOUT,
            `MCP server connection (${serverType})`
        );

        this.connected = true;
    }

    isConnected(): boolean {
        return this.connected;
    }

    async listTools(): Promise<McpTool[]> {
        if (!this.client || !this.connected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await withTimeout(
            this.client.listTools(),
            MCP_TOOL_TIMEOUT,
            'list tools'
        );

        return response.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        }));
    }

    async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
        if (!this.client || !this.connected) {
            throw new Error('Not connected to MCP server');
        }

        const response = await withTimeout(
            this.client.callTool({
                name,
                arguments: args,
            }),
            MCP_TOOL_TIMEOUT,
            `tool call: ${name}`
        );

        return {
            content: response.content,
            isError: response.isError as boolean | undefined,
        };
    }

    async disconnect(): Promise<void> {
        if (this.transport) {
            await this.transport.close();
            this.transport = null;
        }
        this.client = null;
        this.connected = false;
    }
}

/**
 * Connect to an MCP server and return a client wrapper
 */
export async function connectToServer(
    serverType: McpServerType,
    apiKey: string
): Promise<McpClientWrapper> {
    const wrapper = new McpClientWrapper();
    await wrapper.connect(serverType, apiKey);
    return wrapper;
}

/**
 * Retry logic for transient failures with exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    retryCount: number
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (attempt < retryCount) {
                const delay = Math.min(100 * Math.pow(2, attempt), 2000);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}
