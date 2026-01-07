# Security Policy

## Supported Versions

| Version | Supported          |
|---------|---------------------|
| 0.1.x   | :white_check_mark:  |

## Reporting a Vulnerability

If you discover a security vulnerability, please email security@brainwav.dev with details:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if known)

We will respond within 48 hours and provide regular updates on our progress.

## Known Vulnerabilities

### @modelcontextprotocol/sdk ReDoS (GHSA-8r9q-7v3j-jr4g)

**Status:** No fix available from upstream

**Severity:** High

**Impact:** Regular Expression Denial of Service (ReDoS) in JSON-RPC message parsing

**Affected Component:** `@modelcontextprotocol/sdk` (dependency)

**Our Assessment:**
- **Risk Level:** Low for typical usage
- **Reasoning:**
  - The MCP server runs locally on your machine
  - Only trusted MCP clients (Claude Desktop, Cursor, etc.) connect to it
  - Input comes from structured JSON-RPC messages, not arbitrary user input
  - The server is not exposed to public networks

**Mitigation:**
- Use zsearch only with trusted MCP clients
- Do not expose the MCP server to public networks
- Keep the MCP server running locally only

**Monitoring:** We are tracking upstream for a fix and will update as soon as one is available.

**Reference:** https://github.com/advisories/GHSA-8r9q-7v3j-jr4g

## Security Best Practices

1. **API Key Protection:**
   - Never commit API keys to version control
   - Use environment variables for API keys
   - Rotate API keys regularly

2. **MCP Server:**
   - Run only on localhost
   - Do not expose to public networks
   - Use only with trusted MCP clients

3. **Dependencies:**
   - Keep dependencies updated
   - Review `npm audit` output regularly
   - Monitor security advisories

## Dependency Updates

We regularly update dependencies and monitor for security issues. To check for vulnerabilities:

```bash
npm audit
```

To update dependencies:

```bash
npm update
npm audit fix
```
