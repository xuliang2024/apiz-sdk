# @apiz/mcp

MCP (Model Context Protocol) server that exposes the
[apiz.ai](https://apiz.ai) AI generation platform to MCP-compatible clients
like Cursor, Claude Desktop and Cline.

> **Status: Phase 1B scaffolding.** Tool definitions are stubbed; the stdio
> server lands in Phase 5B.

## Use it (when shipped)

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "apiz": {
      "command": "npx",
      "args": ["-y", "@apiz/mcp"],
      "env": { "APIZ_API_KEY": "sk-..." }
    }
  }
}
```

## Tools

8 tools, identical to the legacy `user-xskill-ai` MCP for drop-in replacement:

- `generate` — Generate an image or video
- `get_result` — Poll a task's status / result
- `search_models` — Discover models by category / capability / keyword
- `guide` — Fetch model usage tutorials
- `account` — Balance, daily check-in, packages, payment links
- `speak` — TTS / voice management
- `parse_video` — Extract no-watermark video URL from share links
- `transfer_url` — Mirror an external URL into apiz CDN

## License

Apache-2.0
