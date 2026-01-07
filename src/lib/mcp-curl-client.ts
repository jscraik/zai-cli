/**
 * MCP Client using HTTP POST for Z.AI MCP servers
 */

import { spawn } from 'child_process';

/**
 * GLM Coding Plan MCP HTTP endpoints
 */
const MCP_HTTP_ENDPOINTS = {
    webSearch: 'https://api.z.ai/api/mcp/web_search_prime/mcp',
    webReader: 'https://api.z.ai/api/mcp/web_reader/mcp',
    zread: 'https://api.z.ai/api/mcp/zread/mcp',
};

/**
 * Call MCP tool using HTTP POST
 */
export function getEndpointWithAuth(endpoint: string, apiKey: string): string {
    const sep = endpoint.includes('?') ? '&' : '?';
    // Do not encode; service expects raw key in query
    return `${endpoint}${sep}Authorization=${apiKey}`;
}

async function callMcpTool(
    endpoint: string,
    apiKey: string,
    toolName: string,
    args: Record<string, unknown>
): Promise<unknown> {
    // Build JSON-RPC request
    const jsonRpcRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
            name: toolName,
            arguments: args,
        },
    };

    const endpointWithAuth = getEndpointWithAuth(endpoint, apiKey);

    return new Promise((resolve, reject) => {
        let settled = false;

        const curl = spawn('curl', [
            '-s',
            '-X', 'POST',
            '-H', 'Content-Type: application/json',
            '-H', 'Accept: application/json, text/event-stream',
            '-d', JSON.stringify(jsonRpcRequest),
            endpointWithAuth
        ]);

        let buffer = '';
        let errorBuffer = '';

        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                curl.kill();
                reject(new Error(`Timeout waiting for MCP response from ${endpoint}`));
            }
        }, 30000);

        curl.stdout.on('data', (data) => {
            if (settled) return;
            buffer += data.toString();
        });

        curl.stderr.on('data', (data) => {
            errorBuffer += data.toString();
        });

        curl.on('error', (error) => {
            if (!settled) {
                settled = true;
                clearTimeout(timeout);
                reject(new Error(`curl spawn error: ${error.message}`));
            }
        });

        curl.on('close', (code) => {
            if (settled) return;

            clearTimeout(timeout);
            settled = true;

            if (code !== 0) {
                reject(new Error(`curl exited with code ${code}. stderr: ${errorBuffer}`));
                return;
            }

            try {
                // Parse SSE format response
                // Format: id:1\nevent:message\ndata:{json}\n\n
                let jsonData = buffer;

                // If response is in SSE format, extract the data line
                if (buffer.includes('data:')) {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data:')) {
                            jsonData = line.slice(5).trim();
                            break;
                        }
                    }
                }

                const json = JSON.parse(jsonData);

                // Check for JSON-RPC errors
                if (json.error) {
                    reject(new Error(json.error.message || 'MCP tool call failed'));
                    return;
                }

                // Check for result errors
                if (json.result?.isError) {
                    const errorMsg = json.result?.content?.[0]?.text || 'MCP tool call failed';
                    reject(new Error(errorMsg));
                    return;
                }

                // Extract content
                if (json.result?.content) {
                    const content = json.result.content;
                    let result: unknown;

                    if (Array.isArray(content)) {
                        const textContent = content.map((c: any) => c.text || c).join('\n');
                        // Try to parse as JSON if it looks like JSON
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

                    resolve(result);
                    return;
                }

                if (json.result) {
                    resolve(json.result);
                    return;
                }

                reject(new Error('No result in MCP response'));
            } catch (e) {
                reject(new Error(`Failed to parse MCP response: ${e instanceof Error ? e.message : String(e)}. Response: ${buffer.substring(0, 200)}`));
            }
        });
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
    return callMcpTool(
        MCP_HTTP_ENDPOINTS.webSearch,
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
    return callMcpTool(
        MCP_HTTP_ENDPOINTS.webReader,
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
    return callMcpTool(
        MCP_HTTP_ENDPOINTS.zread,
        apiKey,
        method,
        args
    );
}
