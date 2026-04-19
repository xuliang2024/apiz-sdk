# `apiz-cli` Cloudflare Worker

Tiny Worker that serves the apiz CLI installer + tarball downloads:

| URL | Returns |
|---|---|
| `https://apiz.ai/cli` | `install.sh` (text/x-shellscript) |
| `https://apiz.ai/cli/install.sh` | Same as above |
| `https://apiz.ai/cli/latest/VERSION` | Plain-text version stamp (e.g. `v0.1.0`) |
| `https://apiz.ai/cli/latest/apiz_<v>_<os>_<arch>.tar.gz` | Latest binary (5min cache) |
| `https://apiz.ai/cli/v0.1.0/apiz_0.1.0_<os>_<arch>.tar.gz` | Pinned version (immutable, 1y cache) |
| `https://apiz.ai/cli/latest/checksums.txt` | sha256 checksums |

## One-time setup

```bash
# 1. Create the R2 bucket (idempotent).
pnpm dlx wrangler r2 bucket create apiz-cli

# 2. Deploy the Worker. Routes apiz.ai/cli* are declared in wrangler.toml.
cd sdk/cli/cloudflare
pnpm dlx wrangler deploy
```

Routes win over the existing `translate-web` Worker (which holds `apiz.ai/*`)
because `apiz.ai/cli*` is more specific.

## Local sandbox

```bash
pnpm dlx wrangler dev
# → curl http://localhost:8787/cli
```

## How `install.sh` lands in the bucket

Run [`sdk/cli/scripts/deploy_cli_to_r2.py`](../scripts/deploy_cli_to_r2.py)
after `goreleaser release --clean`. That script:

1. Uploads `sdk/cli/install.sh` to `install.sh`
2. Mirrors `dist/` archives to `v<version>/`
3. Re-uploads the same archives to `latest/`
4. Writes a sentinel `latest/VERSION` so `install.sh` can resolve `latest`
