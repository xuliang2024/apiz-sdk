# Package naming reference

> **Read this before renaming, republishing, or asking why we don't just call
> everything `apiz`.** This file is the single source of truth for what each
> SDK is published as on each registry, and why.

## Current canonical names (DO NOT change without updating this doc)

| Language / Surface | Registry | Package name | Install command | Status |
|---|---|---|---|---|
| TypeScript SDK | npm | **`apiz-sdk`** | `npm install apiz-sdk` | ✅ Published |
| MCP server | npm | **`apiz-mcp`** | `npx -y apiz-mcp` | ✅ Published |
| Python SDK | PyPI | **`apiz`** | `pip install apiz` | ✅ Published |
| Go CLI | GitHub Releases / Homebrew / Scoop | **`apiz`** | `brew install apiz-ai/tap/apiz` | ⏳ Phase 4 |

The PyPI / Homebrew / GitHub names are clean (`apiz`). The npm names have a
`-sdk` / `-mcp` suffix because we couldn't get the bare names — see below.

## Why npm packages are NOT named `apiz` or `@apiz/*`

We checked every reasonable variant on npm; **all** the short ones are
already owned by other accounts:

| Tried name | Status | Owner / evidence |
|---|---|---|
| `apiz` (unscoped) | 🔴 Taken since 2017-05-09 | User `sparetire`, package "A api manager", v1.0.7 |
| `@apiz/sdk` (scoped) | 🔴 Scope reserved | `npm access list collaborators @apiz/sdk` returns 403 (Forbidden), not 404 — meaning the scope exists but we don't own it |
| `@apiz-ai/sdk` (scoped) | 🔴 Scope reserved | 403 |
| `@apizai/sdk` (scoped) | 🔴 Scope reserved | 403 |
| `@apizio/sdk` (scoped) | 🔴 Scope reserved | 403 |
| `apiz-sdk` (unscoped) | 🟢 Available | We published v0.1.0 |
| `apiz-mcp` (unscoped) | 🟢 Available | We published v0.1.0 / v0.1.1 |

How we verified availability:

```bash
# Returns 200 if published, 404 if name available
curl -sI https://registry.npmjs.org/<name>

# Returns 200/403 if published/forbidden, 404 if package doesn't exist
# Useful for distinguishing "scope is owned by someone else" (403) from
# "name is fully free" (404)
npm access list collaborators <name>
```

PyPI did not have this problem — `apiz` was free there, so we got it.

## Reclaiming the bare names (if you really want to)

### Option A: Buy / negotiate `apiz` from `sparetire`

- npm dispute policy: <https://docs.npmjs.com/policies/disputes/>
- His package was last updated 2022-06-13, so it's somewhat dormant but
  not abandoned (npm requires 2+ years of inactivity AND no real use, both
  of which are arguable here).
- Step 1: Email `sparetire` directly through GitHub
  (<https://github.com/sparetire>) and propose a transfer.
- Step 2: If he agrees, he runs `npm owner add hexiaochun apiz` and then
  `npm owner rm sparetire apiz`.
- Step 3: We publish `apiz@2.0.0` to do a clean break (don't reuse 1.x
  numbering — confuses existing users).

### Option B: Reclaim `@apiz` scope

The scope is reserved but we can't see who. To find out:

1. `npm access list collaborators @apiz/sdk` returns 403 if scope is owned
   by an org or another user — but doesn't reveal who.
2. Ask npm support directly: <https://www.npmjs.com/support>. Mention
   you've registered the `apiz.ai` domain and trademark. Provide WHOIS,
   trademark filing if any.
3. Without a trademark, npm will likely decline.

### Option C (recommended for now): keep using `apiz-sdk` / `apiz-mcp`

Industry convention is on our side:

- `aws-sdk`, `aws-sdk-js`, `aws-sdk-client-s3`
- `@stripe/stripe-js`, `stripe` (Node) — Stripe got `stripe`
- `openai` (Node) — they got the bare name
- `@anthropic-ai/sdk` — they had to use a scope too (Anthropic doesn't own
  `anthropic` either; that user dates to 2014)

A `-sdk` suffix is a common, accepted naming pattern.

## Rules for adding NEW JS packages to this monorepo

1. **First, check name availability** — both the unscoped form AND the
   `@apiz/*` scoped form, even though the scope is taken. Sometimes
   reserved scopes get released.
2. **Default pattern**: `apiz-<thing>` (e.g. `apiz-cli`, `apiz-mock`,
   `apiz-react`, `apiz-vue`).
3. **If `apiz-<thing>` is taken too**, fall back to `@hexiaochun/<thing>`
   (the user's personal scope) or `@sutui/<thing>` (the org we own).
4. **Update this file** with the new name in the table above + a
   one-line rationale.
5. **Update the cross-package references** in `README.md`,
   `docs/migration-from-mcp.md`, and any `.changeset/` markdown files.

## Cross-package consistency

Within the workspace, packages refer to each other by their **published
names**, not the workspace alias:

```jsonc
// packages/mcp/package.json
{
  "dependencies": {
    "apiz-sdk": "^0.1.0"          // ✅ published name + semver range
    // NOT "apiz-sdk": "workspace:^"   // 🔴 don't ship this — npm doesn't
                                    // resolve workspace: protocol; users
                                    // get EUNSUPPORTEDPROTOCOL on install
  }
}
```

If you use `workspace:*` or `workspace:^` locally for development, you
**must** rewrite it to a real semver range before publishing. Either:

- Switch to `pnpm publish` (which auto-rewrites workspace: protocols), OR
- Edit `package.json` to use `^x.y.z` before `npm publish`.

We hit this exact bug with `apiz-mcp@0.1.0` — it shipped with
`"apiz-sdk": "workspace:^"` and broke `npm install` for everyone. Fixed in
0.1.1.

## Environment variable naming (unrelated to package names but easy to confuse)

The packages all read **`APIZ_*`** env vars regardless of how the package
itself is named:

- `APIZ_API_KEY` (primary)
- `APIZ_BASE_URL`
- `APIZ_TIMEOUT`
- `XSKILL_API_KEY` (legacy alias, still accepted)

Don't introduce `APIZ_SDK_*` or `APIZ_MCP_*` — they share configuration.
