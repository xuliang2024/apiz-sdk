# Examples

Cross-language usage examples for apiz. Each example is reproduced in TypeScript
(`@apiz/sdk`), Python (`apiz`) and the Go CLI (`apiz`) so you can pick the
language that fits your toolchain.

| Example | What it does | Files |
|---|---|---|
| `01-generate-image` | Submit a sync image generation and print the result URL | [ts](01-generate-image/index.ts), [py](01-generate-image/main.py), [sh](01-generate-image/cli.sh) |
| `02-poll-async-task` | Submit an async video task and poll until it finishes | [ts](02-poll-async-task/index.ts), [py](02-poll-async-task/main.py), [sh](02-poll-async-task/cli.sh) |
| `03-parse-and-tts` | Parse a video link (free) and synthesize a short voice-over | [ts](03-parse-and-tts/index.ts), [py](03-parse-and-tts/main.py), [sh](03-parse-and-tts/cli.sh) |

All examples read `APIZ_API_KEY` from the environment. Get a key at
<https://www.xskill.ai/#/v2/api-keys>.

## Run

```bash
# TypeScript
cd 01-generate-image && pnpm install && pnpm exec tsx index.ts

# Python
cd 01-generate-image && uv pip install apiz && python main.py

# CLI
cd 01-generate-image && bash cli.sh
```
