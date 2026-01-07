import { describe, expect, it } from 'vitest';
import { getEndpointWithAuth } from '../../src/lib/mcp-curl-client.ts';

describe('mcp-curl-client getEndpointWithAuth', () => {
  it('appends Authorization query param without encoding', () => {
    const endpoint = 'https://api.z.ai/api/mcp/web_search_prime/mcp';
    const apiKey = 'abc+/?&=';

    const result = getEndpointWithAuth(endpoint, apiKey);
    expect(result).toBe(`${endpoint}?Authorization=${apiKey}`);
  });

  it('preserves existing query params', () => {
    const endpoint = 'https://api.z.ai/api/mcp/web_search_prime/mcp?foo=bar';
    const apiKey = 'key';

    const result = getEndpointWithAuth(endpoint, apiKey);
    expect(result).toContain('foo=bar');
    expect(result).toContain('Authorization=key');
    expect(result).toMatch(/^https:\/\/api\.z\.ai\/api\/mcp\/web_search_prime\/mcp\?/);
  });
});
