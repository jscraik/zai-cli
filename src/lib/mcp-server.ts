/**
 * MCP Server implementation for zai-cli
 * Exposes Z.AI capabilities as MCP tools via stdio transport
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Z.AI Coding API configuration
 */
const CODING_API_BASE = 'https://api.z.ai/api/coding/paas/v4';

/**
 * Available models
 */
const MODELS = {
  GLM_4_7: 'glm-4.7',
  GLM_4_5_AIR: 'glm-4.5-air',
} as const;

/**
 * Tool definitions for the MCP server
 */
const TOOLS: Tool[] = [
  {
    name: 'generate_code',
    description: 'Generate code using Z.AI GLM models. Supports various programming languages and coding tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The coding prompt or task description',
        },
        model: {
          type: 'string',
          description: 'Model to use (glm-4.7 or glm-4.5-air)',
          enum: ['glm-4.7', 'glm-4.5-air'],
          default: 'glm-4.5-air',
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to generate',
          default: 2000,
          minimum: 1,
          maximum: 8000,
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'chat',
    description: 'Chat with Z.AI GLM models for general assistance, analysis, or explanations.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The user message',
        },
        model: {
          type: 'string',
          description: 'Model to use (glm-4.7 or glm-4.5-air)',
          enum: ['glm-4.7', 'glm-4.5-air'],
          default: 'glm-4.5-air',
        },
        max_tokens: {
          type: 'number',
          description: 'Maximum tokens to generate',
          default: 2000,
          minimum: 1,
          maximum: 8000,
        },
      },
      required: ['message'],
    },
  },
];

/**
 * Call the Z.AI Coding API
 */
async function callCodingAPI(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens: number = 2000
): Promise<string> {
  const response = await fetch(`${CODING_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Z.AI API error: ${response.status} ${error}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in Z.AI API response');
  }

  return content;
}

/**
 * Create and configure the MCP server
 */
export function createMcpServer(apiKey: string): Server {
  const server = new Server(
    {
      name: 'zai-cli',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle tool listing
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'generate_code': {
          const prompt = (args as { prompt: string }).prompt;
          const model = (args as { model?: string }).model || MODELS.GLM_4_5_AIR;
          const maxTokens = (args as { max_tokens?: number }).max_tokens || 2000;

          const result = await callCodingAPI(apiKey, model, prompt, maxTokens);
          return {
            content: [{ type: 'text', text: result }],
          };
        }

        case 'chat': {
          const message = (args as { message: string }).message;
          const model = (args as { model?: string }).model || MODELS.GLM_4_5_AIR;
          const maxTokens = (args as { max_tokens?: number }).max_tokens || 2000;

          const result = await callCodingAPI(apiKey, model, message, maxTokens);
          return {
            content: [{ type: 'text', text: result }],
          };
        }

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMcpServer(apiKey: string): Promise<void> {
  const server = createMcpServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Server is now running and listening for requests via stdio
  // Keep the process alive
  return new Promise(() => {
    // Never resolve - keep process running until killed
  });
}
