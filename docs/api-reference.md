# apiz SDK API reference (cheat sheet)

For full type definitions, see your IDE's tooltips on the official packages.

## Construction

| TypeScript | Python | Go (CLI internal/api) |
|---|---|---|
| `new Apiz({ apiKey, baseURL?, timeout?, maxRetries? })` | `Apiz(api_key, base_url=, timeout=, max_retries=)` | `api.New(api.Config{...})` |
| `new AsyncApiz(...)` (n/a — TS clients are always async) | `AsyncApiz(...)` | (n/a) |

## Resource methods

All three SDKs expose the same logical methods. Only the function-name
casing differs (camelCase in TS/Go, snake_case in Python).

### `tasks`

| TS | Python | Go |
|---|---|---|
| `client.tasks.create({ model, params })` | `client.tasks.create(model=, params=)` | `client.CreateTask(ctx, model, params)` |
| `client.tasks.query(taskId)` | `client.tasks.query(task_id)` | `client.QueryTask(ctx, taskId)` |
| `client.tasks.waitFor(taskId, opts?)` | `client.tasks.wait_for(task_id, ...)` | `client.WaitFor(ctx, taskId, opts)` |

### `models`

| TS | Python | Go |
|---|---|---|
| `client.models.list({ category? })` | `client.models.list(category=...)` | `client.ListModels(ctx, category)` |
| `client.models.get(modelId, { lang? })` | `client.models.get(model_id, lang=)` | `client.GetModel(ctx, modelId, lang)` |
| `client.models.docs(modelId, { lang? })` | `client.models.docs(model_id, lang=)` | `client.GetModelDocs(ctx, modelId, lang)` |
| `client.models.search({ query, capability })` | `client.models.search(query=, capability=)` | (n/a) |

### `voices`

| TS | Python | Go |
|---|---|---|
| `client.voices.list({ status? })` | `client.voices.list(status=)` | `client.ListVoices(ctx, status)` |
| `client.voices.synthesize({ text, voice_id, model? })` | `client.voices.synthesize(text=, voice_id=)` | `client.Synthesize(ctx, text, voiceId, model, speed)` |
| `client.voices.design({ prompt })` | `client.voices.design(prompt=)` | (n/a — SDK only) |
| `client.voices.clone({ audio_url })` | `client.voices.clone(audio_url=)` | (n/a — SDK only) |
| `client.voices.update(voiceId, { voice_name?, description? })` | `client.voices.update(voice_id, ...)` | (n/a) |

### `account`

| TS | Python | Go |
|---|---|---|
| `client.account.balance()` | `client.account.balance()` | `client.Balance(ctx)` |
| `client.account.checkin()` | `client.account.checkin()` | `client.Checkin(ctx)` |
| `client.account.packages()` | `client.account.packages()` | (n/a) |
| `client.account.pay(id)` | `client.account.pay(package_id)` | (n/a) |

### `tools` (free, no auth)

| TS | Python | Go |
|---|---|---|
| `client.tools.parseVideo(url)` | `client.tools.parse_video(url)` | `client.ParseVideo(ctx, url)` |
| `client.tools.transferUrl(url, "image" \| "audio")` | `client.tools.transfer_url(url, type=)` | `client.TransferURL(ctx, url, type)` |

### `captioning` (forced alignment)

Submit audio + known subtitle/lyric text and receive structured millisecond
timestamps. Backed by `volcengine/captioning/ata-{speech,singing}`.

| TS | Python | Go |
|---|---|---|
| `client.captioning.create({ audio_url, audio_text, mode? })` | `client.captioning.create({"audio_url": ..., "audio_text": ..., "mode": ...})` | (use `client.Align(ctx, params, opts)`) |
| `client.captioning.modelFor(mode)` | `client.captioning.model_for(mode)` | `api.CaptioningModelFor(mode)` |

## High-level helpers

| TS | Python | Go (CLI command) |
|---|---|---|
| `client.generate({ model, prompt, image_url?, ..., pollInterval?, timeout?, onProgress? })` | `client.generate(model=, prompt=, image_url=, ...)` | `apiz generate "..." --model X --wait` |
| `client.speak(text, { voice_id?, model?, speed? })` | `client.speak(text, voice_id=, model=)` | `apiz speak "..." [--voice X] [--output-file out.mp3]` |
| `client.align({ audio_url, audio_text, mode?, sta_punc_mode? })` | `client.align({"audio_url": ..., "audio_text": ..., "mode": ...})` | `apiz align "..." --audio URL [--mode singing] [--output-file out.json]` |

## Errors

All three SDKs share the same hierarchy:

- `ApizError` (base)
- `ApizAuthenticationError` (401)
- `ApizPermissionDeniedError` (403)
- `ApizNotFoundError` (404)
- `ApizValidationError` (400 / 422; the `detail` field carries the schema)
- `ApizInsufficientBalanceError` (402)
- `ApizRateLimitError` (429)
- `ApizServerError` (5xx)
- `ApizTimeoutError`
- `ApizConnectionError`

In Go, the same kinds live as `api.ErrorKind` constants on `*api.APIError`.
