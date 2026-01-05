# zai-cli

Z.AI capabilities CLI for agents and automation. Access vision analysis, web search, web reading, GitHub repo exploration, and raw MCP tools.

## Installation

```bash
npm install -g zai-cli
```

Or use directly with npx:

```bash
npx zai-cli <command>
```

## Quick Start

```bash
# Set your API key
export Z_AI_API_KEY="your-api-key"

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
zai-cli search "<query>" [--count <n>] [--language <code>]
```

### Read
```bash
zai-cli read <url> [--with-images-summary] [--no-gfm]
```

### Repo
```bash
zai-cli repo tree <owner/repo> [--path <dir>] [--depth <n>]
zai-cli repo search <owner/repo> "<query>" [--language <code>]
```

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

### Diagnostics
```bash
zai-cli doctor [--no-vision]
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

## Requirements

- Node.js >= 22.0.0
- `Z_AI_API_KEY` environment variable

## License

MIT
