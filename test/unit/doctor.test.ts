import { describe, expect, it, vi, beforeEach } from 'vitest';
import { checkApiAccess } from '../../src/commands/doctor.ts';

const apiKey = 'abc+/?&=';

describe('doctor api_access probe', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('sends Accept header with event-stream and passes on 200', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: { tools: [] },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    (globalThis as any).fetch = fetchMock;

    const result = await checkApiAccess(apiKey);

    expect(result.healthy).toBe(true);
    expect(result.check.status).toBe('pass');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    });
  });
});
