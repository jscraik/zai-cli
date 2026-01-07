import { describe, expect, it, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const tempHome = mkdtempSync(join(tmpdir(), 'zai-cli-test-'));

vi.mock('os', async () => {
  const actual = await vi.importActual<typeof import('os')>('os');
  return {
    ...actual,
    homedir: () => tempHome,
  };
});

const specialKey = 'abc+/?&=';
const sseEndpoint = 'https://api.z.ai/api/mcp/web_reader/sse';

describe('mcp-session-manager createSession auth handling', () => {
  it('encodes Authorization in SSE URL (query param)', async () => {
    const encodedKey = specialKey;
    const sessionId = 'sess-xyz';
    const sseBody = `data: /api/mcp/web_reader/message?sessionId=${sessionId}&Authorization=${specialKey}\n\n`;

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(sseBody, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );
    (globalThis as any).fetch = fetchMock;

    const { getSession } = await import('../../src/lib/mcp-session-manager.ts');

    const result = await getSession(sseEndpoint, specialKey);

    expect(result).toBe(sessionId);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${sseEndpoint}?Authorization=${encodedKey}`);
    expect((options as RequestInit).headers).toMatchObject({
      Accept: 'text/event-stream',
    });
  });

  it('uses separate cache entries per endpoint+apiKey', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('data: /api/mcp/web_reader/message?sessionId=s1&Authorization=k1\n\n', {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }))
      .mockResolvedValueOnce(new Response('data: /api/mcp/web_reader/message?sessionId=s2&Authorization=k2\n\n', {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }));
    (globalThis as any).fetch = fetchMock;

    const { getSession } = await import('../../src/lib/mcp-session-manager.ts');

    const s1 = await getSession(sseEndpoint, 'k1');
    const s2 = await getSession(sseEndpoint, 'k2');

    expect(s1).toBe('s1');
    expect(s2).toBe('s2');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

afterAll(() => {
  rmSync(tempHome, { recursive: true, force: true });
});
