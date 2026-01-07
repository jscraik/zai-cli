import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock session manager before importing client
vi.mock('../../src/lib/mcp-session-manager.ts', () => ({
  getSession: vi.fn().mockResolvedValue('sess-123'),
}));

import { callWebSearch } from '../../src/lib/mcp-client.ts';

const specialKey = 'abc+/?&=';

describe('mcp-client callWebSearch auth handling', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const sessionModule = await import('../../src/lib/mcp-session-manager.ts');
    vi.mocked(sessionModule.getSession).mockResolvedValue('sess-123');
  });

  it('encodes Authorization in message URL', async () => {
    const encodedKey = specialKey;

    const ssePayload = `data: {"result":{"content":[{"text":"{\\"ok\\":true}"}]}}\n\n`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(ssePayload, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    (globalThis as any).fetch = fetchMock;

    await callWebSearch(specialKey, 'hello world');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(`Authorization=${encodedKey}`);
    expect((options as RequestInit).headers).toMatchObject({
      'Content-Type': 'application/json',
    });
  });
});
