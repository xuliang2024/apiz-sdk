# Security Policy — apiz SDK Monorepo

## Reporting a vulnerability

Email security@apiz.ai with details. We aim to acknowledge within 48 hours.

## Test API key handling

The apiz SDK monorepo runs an E2E test suite against the live `https://api.apiz.ai`
backend. This requires a real API key. We follow strict rules to prevent leaks.

### Where the test key may live

- Local development: `sdk/.env.local` (already in [.gitignore](.gitignore))
- CI: GitHub Actions secret named `APIZ_TEST_API_KEY`, scoped to release/main branches only

### Where the test key MUST NOT appear

- Any file tracked by git, including:
  - Source code (`*.ts` / `*.py` / `*.go`)
  - Test code or fixtures (`tests/**`)
  - Markdown docs (including this file, READMEs, CHANGELOGs, plan files)
  - YAML / TOML configs (`*.yml` / `*.toml` / `*.yaml`)
  - CI workflow files (`.github/workflows/*.yml`) — must reference the secret by name only
  - Commit messages, branch names, PR descriptions
- Any chat / issue / PR comment in this repository
- Any logged output (sanitize logs before sharing)

### Pre-commit guard

The CI workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) runs a
`secret-scan` job that fails the build if any tracked file contains a string
matching `sk-[0-9a-fA-F]{40,}` (the apiz API key format). This guard runs before
any other CI step.

### Key rotation

If a test key is suspected of leakage:

1. Immediately rotate at <https://apiz.ai/#/v2/api-keys>
2. Update the new value in `sdk/.env.local` (local) and in GitHub Actions secret
   `APIZ_TEST_API_KEY` (CI)
3. Audit git history with `git log -p -S 'sk-' -- sdk/` (filtered to sdk subtree)
4. If a real leak is confirmed, force-push history rewrite is a last resort —
   prefer rotation + revocation in most cases

## Threat model

| Risk | Mitigation |
|---|---|
| Test key committed by accident | `.gitignore` + CI `secret-scan` job |
| Test key in CI logs | All workflows use `APIZ_TEST_API_KEY: ${{ secrets.APIZ_TEST_API_KEY }}` syntax (never `echo`) |
| Test key leaked in error stack | SDKs never log auth header in production builds |
| E2E suite drains test account credit | Whitelist-only E2E (free + ≤ 0.1 yuan models, see [tests/fixtures/README.md](tests/fixtures/README.md)) |
| Forked PRs accessing secrets | E2E workflow runs on `pull_request_target` for trusted PRs only, default `pull_request` cannot read secrets |
