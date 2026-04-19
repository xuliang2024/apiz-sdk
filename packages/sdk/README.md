# @apiz/sdk

Official TypeScript SDK for the [apiz.ai](https://apiz.ai) AI generation
platform.

> **Status: Phase 1B scaffolding.** Stub exports only. Full HTTP client,
> resources, error types and helpers arrive in Phase 2B.

## Install

```bash
npm install @apiz/sdk
# or pnpm / yarn / bun
```

## Usage (preview)

```ts
import { Apiz } from "@apiz/sdk";

const client = new Apiz({ apiKey: process.env.APIZ_API_KEY });

// Resource-style (low level)
const task = await client.tasks.create({
  model: "fal-ai/flux-2/flash",
  params: { prompt: "a cat on rainbow" },
});
const result = await client.tasks.waitFor(task.task_id);

// Helper (high level)
const out = await client.generate({
  model: "wan/v2.6/image-to-video",
  prompt: "camera zooms in",
  image_url: "https://...",
});
```

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `APIZ_API_KEY` | (none) | Bearer token. Get one at <https://www.xskill.ai/#/v2/api-keys> |
| `APIZ_BASE_URL` | `https://api.apiz.ai` | Override backend |
| `APIZ_TIMEOUT` | `60000` | Per-request timeout in ms |

The legacy `XSKILL_API_KEY` env var is also accepted.

## License

Apache-2.0
