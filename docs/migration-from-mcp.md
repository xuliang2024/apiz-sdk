# Migrating from `user-xskill-ai` MCP to `apiz`

The legacy MCP server exposed eight tools through the Cursor `CallMcpTool`
interface. The new `apiz` family delivers the same capability surface in
**three additional shapes**, all backed by the same `https://api.apiz.ai`
backend, so you can pick whichever fits your workflow:

| Old | New | When to use |
|---|---|---|
| `CallMcpTool { server: "user-xskill-ai", toolName: "..." }` in Cursor | `npx -y apiz-mcp` (drop-in MCP server) | Cursor / Claude Desktop / Cline users |
| (no equivalent) | `npm install apiz-sdk` | Building Node.js / Bun / Deno apps |
| (no equivalent) | `pip install apiz` | Building Python apps |
| (no equivalent) | `curl -fsSL https://apiz.ai/cli \| sh` (single binary) | Shell scripts, CI, ad-hoc usage |

> The npm packages are `apiz-sdk` and `apiz-mcp` (unscoped, with `-` suffix)
> because `@apiz/*` and unscoped `apiz` are both taken on npm by other
> accounts. See [package-naming.md](./package-naming.md) for the full
> rationale and rejected alternatives.

## 1. MCP drop-in (recommended for AI agents)

Edit `~/.cursor/mcp.json` (or your client's MCP config):

```jsonc
{
  "mcpServers": {
    // Replace this:
    // "user-xskill-ai": { ... }
    // With this:
    "apiz": {
      "command": "npx",
      "args": ["-y", "apiz-mcp"],
      "env": { "APIZ_API_KEY": "sk-..." }
    }
  }
}
```

`apiz-mcp` exposes the same eight tools (`generate`, `get_result`,
`search_models`, `guide`, `account`, `speak`, `parse_video`, `transfer_url`),
with identical input schemas, so your existing prompts that reference these
tools keep working.

## 2. Direct SDK usage

The MCP `generate` tool is just a thin wrapper around the apiz REST API. If
you want to call apiz from your own code, the SDK gives you full type safety
and avoids the MCP transport layer.

### TypeScript

```ts
import { Apiz } from "apiz-sdk";

const client = new Apiz();
const result = await client.generate({
  model: "fal-ai/flux-2/flash",
  prompt: "a cat on rainbow",
});
```

### Python

```python
from apiz import Apiz

client = Apiz()
result = client.generate(
    model="fal-ai/flux-2/flash",
    params={"prompt": "a cat on rainbow"},
)
```

## 3. CLI for shell scripts

```bash
# One-line install (auto-detects OS / arch, downloads from apiz.ai/cli)
curl -fsSL https://apiz.ai/cli | sh

# Or pin a version
curl -fsSL https://apiz.ai/cli | APIZ_VERSION=v0.1.0 sh

# Then:
apiz auth login                 # save your key to ~/.config/apiz/config.toml
apiz generate "a cat on rainbow" --model fal-ai/flux-2/flash --wait
apiz models list --category image
apiz parse https://v.douyin.com/xxxxx
```

## Tool ↔ resource cheat sheet

| Old MCP tool | apiz SDK call | apiz CLI |
|---|---|---|
| `generate` | `client.generate({model, prompt, ...})` | `apiz generate "..." --model X --wait` |
| `get_result` | `client.tasks.query(task_id)` | `apiz tasks get <task-id>` |
| `search_models` | `client.models.list({category})` / `.search({query, capability})` | `apiz models list [--category X]` |
| `guide` | `client.skills.list()` / `client.skills.get(skill_id)` | (n/a — use `apiz models docs <id>`) |
| `account` (action=balance) | `client.account.balance()` | `apiz account balance` |
| `account` (action=checkin) | `client.account.checkin()` | `apiz account checkin` |
| `account` (action=packages) | `client.account.packages()` | (n/a — see API) |
| `account` (action=pay) | `client.account.pay(package_id)` | (n/a — opens payment URL externally) |
| `speak` (action=synthesize) | `client.speak(text, {voice_id, model})` | `apiz speak "..." [--voice X]` |
| `speak` (action=list_voices) | `client.voices.list()` | `apiz voices list` |
| `speak` (action=design_voice) | `client.voices.design({prompt})` | (n/a — use SDK) |
| `speak` (action=clone_voice) | `client.voices.clone({audio_url})` | (n/a — use SDK) |
| `parse_video` | `client.tools.parseVideo(url)` | `apiz parse <url>` |
| `transfer_url` | `client.tools.transferUrl(url, "image")` | `apiz transfer <url> --type image` |

## Environment variables

The SDKs and CLI all honor the same set:

| Var | Default | Notes |
|---|---|---|
| `APIZ_API_KEY` | (none) | Bearer token. `XSKILL_API_KEY` is also accepted for backward compatibility |
| `APIZ_BASE_URL` | `https://api.apiz.ai` | Override (e.g. `https://test-ts-api.fyshark.com` for staging) |
| `APIZ_TIMEOUT` | `60000` (JS, ms) / `60` (Python/Go, s) | Per-request timeout |

## What's gone, what's kept

- The `user-xskill-ai` MCP service itself stays available as long as users
  rely on it; we will *not* remove the legacy registration in Cursor.
- The `xskill_api.py` script under
  [translate_api/app/api/v3/skills/xskill-ai/scripts/xskill_api.py](../../translate_api/app/api/v3/skills/xskill-ai/scripts/xskill_api.py)
  remains a working CLI for users who can't yet adopt the new tooling.
- A future Phase 7 PR will add a deprecation banner to the legacy script
  pointing at this guide. No functional changes are planned.
