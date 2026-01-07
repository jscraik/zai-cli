import { describe, it, expect, vi } from 'vitest';
import { chatCompletion } from '../../src/lib/openai-client.ts';

describe('openai-client chatCompletion', () => {
  it('posts to chat/completions with bearer auth and returns content', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'hi there',
          },
        },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    (globalThis as any).fetch = fetchMock;

    const result = await chatCompletion(
      [{ role: 'user', content: 'hello' }],
      {
        apiBaseUrl: 'https://api.z.ai/api/coding/paas/v4',
        apiKey: 'k',
        model: 'GLM-4.7',
      }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.z.ai/api/coding/paas/v4/chat/completions');
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer k',
      'Content-Type': 'application/json',
    });
    expect(result.content).toBe('hi there');
  });
});
