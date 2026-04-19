# apiz (Python)

Official Python SDK for the [apiz.ai](https://apiz.ai) AI generation platform.

> **Status: Phase 1B scaffolding.** Stub `Apiz` / `AsyncApiz` only. Real HTTP
> client, resources and helpers arrive in Phase 3B.

## Install

```bash
pip install apiz
```

## Usage (preview)

```python
from apiz import Apiz, AsyncApiz

# Sync
client = Apiz()  # reads APIZ_API_KEY from env
task = client.tasks.create(model="fal-ai/flux-2/flash", params={"prompt": "a cat"})
result = client.tasks.wait_for(task.task_id)

# Async
import asyncio

async def main():
    async with AsyncApiz() as client:
        out = await client.generate(
            model="wan/v2.6/image-to-video",
            prompt="camera zooms in",
            image_url="https://...",
        )

asyncio.run(main())
```

## Environment variables

| Var | Default | Purpose |
|---|---|---|
| `APIZ_API_KEY` | (none) | Bearer token. Get one at <https://apiz.ai/#/v2/api-keys> |
| `APIZ_BASE_URL` | `https://api.apiz.ai` | Override backend |
| `APIZ_TIMEOUT` | `60` | Per-request timeout in seconds |

The legacy `XSKILL_API_KEY` env var is also accepted.

## Development

```bash
uv venv
uv pip install -e ".[dev]"
uv run pytest                 # mock-only suite
uv run pytest -m e2e          # live backend (requires APIZ_TEST_API_KEY)
uv run ruff check .
uv run mypy src
```

## License

Apache-2.0
