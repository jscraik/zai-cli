<p align="center">
  <img src="brand/zai-logo.png" alt="Z.AI Logo" width="200"/>
</p>

# @brainwav/zai-cli

Z.AI capabilities CLI for agents and automation. Access vision analysis, web search, web reading, GitHub repo exploration, and raw MCP tools.

## Installation

```bash
npm install -g @brainwav/zai-cli
```

Or use directly with npx:

```bash
npx @brainwav/zai-cli <command>
```

## Prerequisites

- **Node.js:** >=22.0.0 (Check with `node --version`)
- **npm:** Comes with Node.js
- **Z.AI API Key:** Required for all commands. See below for how to get one.

### Getting Your Z.AI API Key

You need a Z.AI API key to use this CLI. Here's how to get one:

1. Visit the [Z.AI Platform](https://z.ai)
2. Sign up or log in to your account
3. Navigate to Settings → API Keys
4. Create a new API key
5. Set the environment variable:

```bash
export Z_AI_API_KEY="your-api-key-here"

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export Z_AI_API_KEY="your-api-key-here"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc
```

## Quick Start

```bash
# Search the web
zai-cli search "zai cli"

# Analyze an image
zai-cli vision analyze screenshot.png "Describe this image"

# Read a web page
zai-cli read https://example.com

# Explore a GitHub repo
zai-cli repo tree facebook/react

# Health check
zai-cli doctor
```

## Commands

### Vision
```bash
zai-cli vision analyze <image> "<prompt>"    # General image analysis
zai-cli vision ocr <image>                    # Extract text
zai-cli vision ui-diff <before.png> <after>   # Compare UIs
zai-cli vision video <video> "<prompt>"       # Analyze video
```

### Search
```bash
zai-cli search "<query>" [--count <n>] [--language <code>] [--time-range <range>]
```

### Read
```bash
zai-cli read <url> [--with-images-summary] [--no-gfm] [--retain-images]
```

### Repo
```bash
zai-cli repo tree <owner/repo> [--path <dir>] [--depth <n>]
zai-cli repo search <owner/repo> "<query>" [--language <code>]
```

**Note:** These commands connect to the Z.AI MCP server to access GitHub repository exploration capabilities via the ZRead tools.

### MCP Tools
```bash
zai-cli tools [--filter <text>] [--full] [--no-vision]
zai-cli tool <name> [--no-vision]
zai-cli call <tool> [--json <data> | --file <path> | --stdin] [--dry-run]
```

### Code Mode
```bash
zai-cli code run <file.ts>       # Execute TypeScript chain
zai-cli code eval "<expression>" # Evaluate expression
zai-cli code interfaces          # List available interfaces
```

### Setup
```bash
zai-cli setup              # Configure Z.AI for Claude Code
zai-cli setup --list        # List current configuration
zai-cli setup --unset      # Remove Z.AI configuration
```

### Diagnostics
```bash
zai-cli doctor [--no-vision]
```

## Agent & Tool Integration

### For Claude Code, Codex, and Other Agents

**Direct CLI Invocation:**
Agents can invoke `zai-cli` commands directly via their shell/bash tools:

```bash
# Web search
zai-cli search "query" --json

# Web page reading
zai-cli read "https://example.com" --json

# Vision analysis
zai-cli vision analyze image.png "Describe this" --json

# GitHub repo exploration
zai-cli repo tree owner/repo --json
```

**JSON Output Mode:**
Use `--json` for machine-readable output with stable schema:
```json
{
  "schema": "zai-cli.search.v1",
  "meta": { "tool": "zai-cli", "version": "0.1.0" },
  "status": "success",
  "data": [...]
}
```

### For Claude Code specifically

**Model Replacement Mode:**
Configure Claude Code to use Z.AI models instead of Anthropic:

```bash
# Set your API key
export Z_AI_API_KEY="your-api-key"

# Configure Claude Code
zai-cli setup
```

This updates `~/.claude/settings.json` to redirect all Claude Code requests to Z.AI's Anthropic-compatible API endpoint. After restarting Claude Code, it will automatically use GLM-4.7 and GLM-4.5-air models.

**Two modes work together:**
1. **Model Replacement**: All Claude Code API calls use Z.AI models (GLM-4.7, GLM-4.5-air)
2. **Additional Tools**: Claude Code can still invoke `zai-cli` directly for specialized capabilities like web search, vision analysis, etc.

**To verify:**
1. Restart Claude Code (run `claude` again)
2. Run `/status` in Claude Code to see the configured models

**To remove:**
```bash
zai-cli setup --unset
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `Z_AI_API_KEY` | Yes | - | Your Z.AI API key |
| `Z_AI_MODE` | No | `ZAI` | Platform mode |
| `Z_AI_TIMEOUT` | No | `30000` | Request timeout (ms) |
| `ZAI_MCP_TOOL_CACHE` | No | `1` | Enable tool discovery cache |
| `ZAI_MCP_TOOL_CACHE_TTL_MS` | No | `86400000` | Cache TTL (ms) |
| `ZAI_MCP_CACHE_DIR` | No | `~/.cache/zai-cli` | Cache directory |
| `NO_COLOR` | No | - | Disable color output |

## Output Modes

### Default (Data-Only)
Token-efficient output for agent use:

```bash
$ zai-cli search "zai cli"
[{"title": "...", "url": "...", "snippet": "..."}, ...]
```

### JSON Wrapped
Stable schema with metadata:

```bash
$ zai-cli search "zai cli" --json
{
  "schema": "zai-cli.search.v1",
  "meta": {
    "tool": "zai-cli",
    "version": "0.1.0",
    "timestamp": "2025-01-05T...",
    "command": "search"
  },
  "status": "success",
  "data": [...],
  "errors": []
}
```

## Troubleshooting

### "Z_AI_API_KEY is required"
**Symptom:** Error message stating the API key is required.

**Solution:** Set the environment variable:
```bash
export Z_AI_API_KEY="your-api-key"

# For persistence, add to your shell profile:
echo 'export Z_AI_API_KEY="your-api-key"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc
```

### "Node.js version too old"
**Symptom:** Installation or runtime fails due to Node.js version.

**Solution:** Upgrade to Node.js 22 or later. Using [nvm](https://github.com/nvm-sh/nvm):
```bash
nvm install 22
nvm use 22
nvm alias default 22  # Set as default
```

Verify with: `node --version` (should show v22.x.x or higher)

### "E_NETWORK: Connection timeout"
**Symptom:** Commands timeout after 30 seconds.

**Solutions:**
1. Check your internet connection
2. Verify Z.AI service status
3. Increase timeout:
```bash
zai-cli --timeout 60000 vision analyze image.png "prompt"
```
Or set via environment:
```bash
export Z_AI_TIMEOUT=60000  # 60 seconds
```

### "E_AUTH: Authentication failure"
**Symptom:** API key rejected or invalid.

**Solutions:**
1. Verify your API key is correct:
```bash
echo $Z_AI_API_KEY  # Should show your key, not empty
```
2. Regenerate your API key from the Z.AI dashboard
3. Ensure the key has necessary permissions

### Permission denied during global install
**Symptom:** `npm install -g` fails with permission error.

**Solutions:**
1. Use a Node version manager like [nvm](https://github.com/nvm-sh/nvm) or [volta](https://volta.sh/)
2. Or fix npm permissions (Linux/macOS):
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc
```

### Cache issues
**Symptom:** Stale data or unexpected behavior.

**Solution:** Clear the cache:
```bash
rm -rf ~/.cache/zai-cli
# Or if using custom cache dir:
rm -rf "$ZAI_MCP_CACHE_DIR"
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Generic failure |
| 2 | Invalid usage |
| 3 | Policy refusal |
| 4 | Partial success |
| 5 | Network failure |
| 6 | Authentication failure |
| 130 | User abort (Ctrl-C) |

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on development setup, testing, and the pull request process.

## License

MIT

---

**Looking for examples?** Check out the [examples/](examples/) directory for common usage patterns.
