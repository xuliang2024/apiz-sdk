# Shared test fixtures

This directory holds **language-agnostic** fixtures used by the JS, Python and
Go test suites. Each fixture is the canonical recorded shape of a backend
response. All three SDK implementations consume the same fixtures so that
behavior stays in sync across languages.

## Layout

```
fixtures/
  http/                      <- canned HTTP responses, by route
    GET__v3_balance.json
    GET__v3_mcp_models.json
    GET__v3_mcp_models__id__docs.json
    POST__v3_tasks_create__sync.json
    POST__v3_tasks_create__async.json
    POST__v3_tasks_query__pending.json
    POST__v3_tasks_query__completed.json
    POST__v3_tasks_query__failed.json
    POST__v3_minimax_voices.json
    POST__v3_minimax_t2a.json
    POST__v3_checkin.json
    GET__v3_mcp_skills.json
  errors/                    <- standard error responses
    401_unauthorized.json
    402_insufficient_balance.json
    404_not_found.json
    422_validation_error.json
    429_rate_limited.json
    500_server_error.json
  videos/                    <- public, non-sensitive video URLs for parse_video tests
    public_douyin_url.txt
    public_kuaishou_url.txt
```

## Naming convention

`<METHOD>__<path-with-_-instead-of-/>__<scenario>.json`

Examples:

- `GET__v3_balance.json` — single canonical balance response
- `POST__v3_tasks_create__sync.json` — sync-channel response variant
- `POST__v3_tasks_query__failed.json` — failed task scenario

## Adding a new fixture

1. Capture the real response (Phase 6 record-replay tooling, or copy from
   live API once with proper auth)
2. Sanitize: remove any user-specific IDs, API keys, account names — replace
   with placeholders like `__USER_ID__`, `__TASK_ID__`
3. Drop into the right subfolder
4. Update this README's layout list above
5. The next CI run will ensure all 3 SDK test suites can load it

## E2E whitelist

The real-backend E2E suite may only call:

| Free | Cost ≤ 0.1 yuan |
|---|---|
| `account.balance` | `jimeng-4.5` (single sync image) |
| `account.checkin` | `speech-2.8-turbo` TTS (text ≤ 20 chars) |
| `account.packages` |  |
| `models.list` / `models.docs` / `models.search` |  |
| `voices.list` |  |
| `skills.list` / `skills.get` |  |
| `tools.parseVideo` (public URL) |  |

**Forbidden in E2E**: video generation, Sora/Wan/Kling models, long TTS,
voice cloning, voice design, sync video.
