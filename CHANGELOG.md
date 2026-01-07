# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-01-07

### Added
- **MCP server mode** for headless operation via `zsearch mcp-server`
- **Chat and code generation tools** exposed via MCP protocol
- **Integration with Z.AI Coding API** (glm-4.7, glm-4.5-air)
- **Backward compatibility** - `zai-cli` command alias supported

### Changed
- **Package renamed** from `@brainwav/zai-cli` to `@brainwav/zsearch`
- **Primary command** changed from `zai-cli` to `zsearch`
- **Repository renamed** from `zai-cli` to `zSearch`
- **Cache directory** changed from `~/.cache/zai-cli` to `~/.cache/zsearch`
- **Config directory** changed from `~/.config/zai-cli` to `~/.config/zsearch`
- **Search family** - Part of rSearch/wSearch/zSearch naming convention

### Added (from previous unreleased)
- **Setup command** for Claude Code integration via environment variables
- **Codex environment setup documentation** with ~/codex/.env configuration
- **Z.AI branding** with official logo in README
- **Agent integration documentation** for Claude Code, Codex, and other agents
- **Dual integration mode:** Model Replacement + Direct CLI Tool Invocation
- **Setup options:** `--list` and `--unset` for configuration management
- **Structured logging module** with JSON log output for debugging and observability
- **Timeout protection** for MCP server connections (30s) and tool calls (2min)
- **Request ID generation** for distributed tracing and debugging

### Changed (from previous unreleased)
- **API integration:** Switched from MCP-specific endpoints to main Z.AI API endpoints
  - Web search now uses `/api/paas/v4/web_search` with standard Bearer auth
  - Web reader now uses `/api/paas/v4/reader` with standard Bearer auth
  - Improved error handling with balance error detection (code 1113)
- **Doctor command:** Updated to test main API endpoints instead of MCP endpoints
- **ZRead functionality:** Now properly enabled via MCP server connection
  - `repo tree` and `repo search` commands connect to Z.AI MCP server
  - Uses `zai.zread.get_repo_structure` and `zai.zread.search_doc` tools
- Enhanced README with detailed troubleshooting guide and agent integration section
- **Updated vitest** to latest version, fixing 5 moderate security vulnerabilities

### Fixed (from previous unreleased)
- API authentication by using correct Z.AI endpoints with Bearer token
- Doctor command to distinguish between auth failures and balance issues
- TypeScript type errors with ErrorCode casting across all commands
- Documentation completeness: added missing `--time-range` option to search command
- Documentation completeness: added missing `--retain-images` option to read command
- **Cache implementation:** Completed `cache.clear()` function to properly clear all cache entries
- **MCP reliability:** Added timeout protection to prevent indefinite hangs on MCP server connections
- **Dependency vulnerabilities:** Fixed all npm audit warnings by updating vitest to latest version

## [0.1.0] - 2025-01-05

### Added
- Initial release (as zai-cli)
- **Vision commands:**
  - `vision analyze` - General image analysis
  - `vision ocr` - Text extraction from images
  - `vision ui-diff` - UI screenshot comparison
  - `vision video` - Video content analysis
- **Search command** with domain filtering and result count control
- **Read command** for fetching and parsing web pages to markdown
- **Repo commands:**
  - `repo tree` - GitHub repository file tree exploration
  - `repo search` - Search code within repositories
- **MCP tool commands:**
  - `tools` - List available MCP tools
  - `tool` - Show details for a specific tool
  - `call` - Call MCP tools with arguments
- **Code mode** for TypeScript chain execution
- **Doctor command** for health checks and diagnostics
- JSON output mode with schema validation
- Configurable timeout, caching, and retry behavior
- Environment variable configuration
- Multiple output modes (default, json, plain, quiet, verbose, debug)
- Stable exit codes for programmatic use

### Documentation
- README with installation, quick start, and command reference
- Environment variables reference
- Output modes documentation
- Exit codes reference
- MIT License

[Unreleased]: https://github.com/jscraik/zSearch/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/jscraik/zSearch/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jscraik/zSearch/releases/tag/v0.1.0
