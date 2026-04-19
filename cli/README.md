# apiz CLI

Single-binary command-line tool for the [apiz.ai](https://apiz.ai) AI
generation platform. Written in Go.

> **Status: Phase 1B scaffolding.** Only `version` and `help` work. The full
> command tree (`auth`, `generate`, `tasks`, `models`, `voices`, `speak`,
> `account`, `parse`, `transfer`) arrives in Phase 4B.

## Install

The fastest way (auto-detects OS / arch, no other tooling required):

```bash
curl -fsSL https://apiz.ai/cli | sh
```

Pin a version, or install elsewhere:

```bash
curl -fsSL https://apiz.ai/cli | APIZ_VERSION=v0.1.0 sh
curl -fsSL https://apiz.ai/cli | APIZ_INSTALL_DIR=$HOME/bin sh
```

Or via package managers:

```bash
brew install apiz-ai/tap/apiz       # macOS / Linux
scoop install apiz                  # Windows
go install github.com/apiz-ai/apiz-cli@latest
```

The installer downloads from Cloudflare R2 (`apiz.ai/cli/<version>/`) and
verifies sha256 checksums automatically. See
[install.sh](install.sh) for the source.

## Usage (preview)

```bash
apiz auth login
apiz generate "a cat on rainbow" --model fal-ai/flux-2/flash --wait
apiz tasks list --status completed
apiz models list --category video
apiz speak "你好世界" --voice male-qn-qingse --output hello.mp3
apiz account balance
apiz parse https://v.douyin.com/xxxxx
```

## Configuration

Reads from (in order):

1. CLI flags (`--api-key`, `--base-url`, `--profile`)
2. Environment (`APIZ_API_KEY`, `APIZ_BASE_URL`, `APIZ_TIMEOUT`)
3. Profile file `~/.config/apiz/config.toml` (managed by `apiz auth login`)
4. Built-in defaults

## Development

```bash
go test ./...
go build -o bin/apiz .
golangci-lint run
goreleaser release --snapshot --clean      # local cross-platform build
```

## Release & R2 distribution

Every `cli-v*` git tag triggers
[`release-cli.yml`](../.github/workflows/release-cli.yml), which:

1. Runs `go test -race ./...`
2. Builds cross-platform archives via `goreleaser release --clean`
   (linux / darwin / windows × amd64 / arm64)
3. Pushes archives to GitHub Releases + Homebrew tap + Scoop bucket
4. Mirrors the same archives + `install.sh` into the **Cloudflare R2 bucket
   `apiz-cli`** via [`scripts/deploy_cli_to_r2.py`](scripts/deploy_cli_to_r2.py),
   so `curl -fsSL https://apiz.ai/cli | sh` always works
5. Re-deploys the [`apiz-cli` Worker](cloudflare/) bound to `apiz.ai/cli*`

To do a local end-to-end snapshot:

```bash
# 1. Build cross-platform archives
goreleaser release --snapshot --clean

# 2. Push to R2 (requires R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)
python scripts/deploy_cli_to_r2.py --dist dist --version v0.0.0-snapshot

# 3. Sanity check
curl -fsSL https://apiz.ai/cli | APIZ_VERSION=v0.0.0-snapshot sh
```

## License

Apache-2.0
