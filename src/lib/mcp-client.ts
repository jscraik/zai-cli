/**
 * MCP Client module for zai-cli
 * Handles communication with Z.AI MCP servers
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Config } from './config.js';
import { McpServerType } from '../types/index.js';
import type { McpTool, McpToolResult } from '../types/index.js';

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
      return {
        command: 'npx',
        args: ['-y', '@z_ai/mcp-server'],
        env: baseEnv,
      };
    case McpServerType.Search:
      // HTTP-based - handled differently
      throw new Error('Search is HTTP-based, not stdio');
    case McpServerType.Read:
      // HTTP-based - handled differently
      throw new Error('Read is HTTP-based, not stdio');
    case McpServerType.Zread:
      // HTTP-based - handled differently
      throw new Error('Zread is HTTP-based, not stdio');
    default:
      throw new Error(`Unknown server type: ${serverType}`);
  }
}

/**
 * MCP Client wrapper class
 */
export class McpClientWrapper {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected = false;

  /**
   * Connect to an MCP server via stdio
   */
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

    await this.client.connect(this.transport);
    this.connected = true;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * List available tools from the connected server
   */
  async listTools(): Promise<McpTool[]> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MCP server');
    }

    const response = await this.client.listTools();
    return response.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Call a tool on the connected server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
    if (!this.client || !this.connected) {
      throw new Error('Not connected to MCP server');
    }

    const response = await this.client.callTool({
      name,
      arguments: args,
    });

    return {
      content: response.content,
      isError: response.isError as boolean | undefined,
    };
  }

  /**
   * Disconnect from the server
   */
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
 * HTTP-based MCP tool calls (for search/read/zread)
 */
interface HttpCallOptions {
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * Make an HTTP request to an HTTP-based MCP server
 */
export async function callHttpTool(options: HttpCallOptions): Promise<unknown> {
  const response = await fetch(options.url, {
    method: options.body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Call web search via HTTP MCP
 */
export async function callWebSearch(
  apiKey: string,
  query: string,
  options?: { count?: number; language?: string; timeRange?: string }
): Promise<unknown> {
  const url = new URL('https://api.z.ai/api/mcp/web_search_prime/mcp');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  // The MCP server expects a tool call payload
  const body = {
    name: 'webSearchPrime',
    arguments: {
      search_query: query,
      result_count: options?.count ?? 10,
      ...(options?.language && { language: options.language }),
      ...(options?.timeRange && { time_range: options.timeRange }),
    },
  };

  return callHttpTool({ url: url.toString(), headers, body });
}

/**
 * Call web reader via HTTP MCP
 */
export async function callWebReader(
  apiKey: string,
  url: string,
  options?: { withImagesSummary?: boolean; noGfm?: boolean; retainImages?: boolean }
): Promise<unknown> {
  const apiUrl = new URL('https://api.z.ai/api/mcp/web_reader/mcp');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  const body = {
    name: 'webReader',
    arguments: {
      url,
      ...(options?.withImagesSummary && { with_images_summary: true }),
      ...(options?.noGfm && { no_gfm: true }),
      ...(options?.retainImages && { keep_img_data_url: true }),
    },
  };

  return callHttpTool({ url: apiUrl.toString(), headers, body });
}

/**
 * Call ZRead (GitHub repo search) via HTTP MCP
 */
export async function callZRead(
  apiKey: string,
  method: 'search_doc' | 'get_repo_structure',
  args: Record<string, unknown>
): Promise<unknown> {
  const apiUrl = new URL('https://api.z.ai/api/mcp/zread/mcp');
  const headers = {
    Authorization: `Bearer ${apiKey}`,
  };

  const body = {
    name: method,
    arguments: args,
  };

  return callHttpTool({ url: apiUrl.toString(), headers, body });
}

/**
 * Retry logic for transient failures
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
        // Exponential backoff
        const delay = Math.min(100 * Math.pow(2, attempt), 2000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
