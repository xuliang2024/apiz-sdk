# apiz SDK Monorepo

Official multi-language SDKs and a single-binary CLI for the
[apiz.ai](https://apiz.ai) platform (image / video / voice generation, video
parsing, account management). All four products share the same backend
contract and behavior.

## Products

| Product | Path | Distribution | Purpose |
|---|---|---|---|
| `@apiz/sdk` | [packages/sdk](packages/sdk) | npm | TypeScript SDK (Node 18+ / Bun / Deno / browsers) |
| `@apiz/mcp` | [packages/mcp](packages/mcp) | npm | MCP server, runs via `npx @apiz/mcp` |
| `apiz` (Python) | [python](python) | PyPI | Python 3.9+ SDK with sync + async clients |
| `apiz` (CLI) | [cli](cli) | Homebrew / Scoop / GitHub Releases / npm wrapper | Single-binary CLI written in Go |

## Architecture

```
                  api.apiz.ai (REST)
                         |
       +----------+------+------+----------+
       |          |             |          |
   @apiz/sdk  apiz (py)   cli/internal  (no shared code
       |          |       (Go HTTP)     across langs:
       |          |             |        contract guarded
   @apiz/mcp     CLI users    apiz CLI   by shared fixtures)
```

Each language SDK is independent (no shared code), but the test suites all
load the same fixtures from [tests/fixtures](tests/fixtures), so contract
drift is caught immediately.

The MCP server is the only product that depends on another (it composes
`@apiz/sdk`).

## Quick start

### TypeScript / JavaScript

```bash
npm install @apiz/sdk
```

```ts
import { Apiz } from "@apiz/sdk";
const client = new Apiz();  // reads APIZ_API_KEY from env
const balance = await client.account.balance();
```

### Python

```bash
pip install apiz
```

```python
from apiz import Apiz
client = Apiz()  # reads APIZ_API_KEY from env
print(client.account.balance())
```

### CLI

One-liner (auto-detects OS + arch, downloads from Cloudflare R2):

```bash
curl -fsSL https://apiz.ai/cli | sh
```

Or via package managers:

```bash
brew install apiz-ai/tap/apiz   # macOS / Linux
scoop install apiz              # Windows
```

```bash
apiz auth login
apiz generate "a cat on rainbow" --model fal-ai/flux-2/flash --wait
```

### MCP (for Cursor / Claude Desktop / Cline)

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

## Configuration

All SDKs honor the same configuration sources, in priority order:

1. Constructor / CLI flag (`apiKey`, `baseURL`, ...)
2. Environment variables (`APIZ_API_KEY`, `APIZ_BASE_URL`, `APIZ_TIMEOUT`)
3. CLI-only: profile config in `~/.config/apiz/config.toml`
4. Built-in defaults (`baseURL` defaults to `https://api.apiz.ai`)

The legacy `XSKILL_API_KEY` env var is also accepted for backward compatibility.

## Repository layout

```
sdk/
  packages/sdk/             @apiz/sdk (TypeScript)
  packages/mcp/             @apiz/mcp (TypeScript, depends on @apiz/sdk)
  python/                   apiz (Python)
  cli/                      apiz (Go)
  tests/fixtures/           Language-agnostic test fixtures
  docs/                     API reference, migration guides
  examples/                 Cross-language usage examples
  .github/workflows/        CI (unit + integration) + E2E (live backend)
  .changeset/               JS package version management
  SECURITY.md               Security policy & test key handling
```

## Development

Requires: Node 18+ + pnpm 9+, Python 3.9+ + uv, Go 1.21+.

```bash
# JS workspace
pnpm install
pnpm -r build
pnpm -r test

# Python
cd python && uv sync && uv run pytest

# Go
cd cli && go build ./... && go test ./...
```

E2E suite needs an API key from <https://apiz.ai/#/v2/api-keys>:

```bash
cp .env.example .env.local
# edit .env.local with your key
pnpm -r test:e2e
cd python && uv run pytest -m e2e
cd cli && go test -tags=e2e ./...
```

See [SECURITY.md](SECURITY.md) for the rules around handling test keys.

## License

Apache-2.0 (per package; see individual `LICENSE` files).
