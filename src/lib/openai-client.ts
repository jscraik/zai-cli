/**
 * Minimal OpenAI-compatible client for GLM Coding Plan text completions.
 * Uses fetch; no external deps.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  apiBaseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface ChatResult {
  role: 'assistant';
  content: string;
  raw: unknown;
}

export async function chatCompletion(messages: ChatMessage[], opts: ChatOptions): Promise<ChatResult> {
  const url = `${opts.apiBaseUrl.replace(/\/$/, '')}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${opts.apiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: opts.model,
        messages,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Model API request failed: ${res.status} ${res.statusText} ${text}`);
    }

    const json: any = await res.json();
    const choice = json?.choices?.[0];
    const content = choice?.message?.content ?? '';

    return {
      role: 'assistant',
      content,
      raw: json,
    };
  } finally {
    clearTimeout(timeout);
  }
}
