---
"apiz-sdk": minor
"apiz-mcp": minor
---

Initial public release of `apiz-sdk` and `apiz-mcp`.

- `apiz-sdk`: TypeScript client scaffolding with resource-style API surface
  (`tasks`, `models`, `voices`, `account`, `skills`, `tools`) plus high-level
  helpers (`generate`, `speak`).
- `apiz-mcp`: MCP server entry point that exposes 8 apiz tools to MCP-compatible
  clients (Cursor, Claude Desktop, Cline). Runs via `npx apiz-mcp`.
