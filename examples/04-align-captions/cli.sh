#!/usr/bin/env bash
set -euo pipefail

# Forced alignment: audio + known subtitle text → word-level timestamps.
# Reads APIZ_API_KEY from env. Get a key at https://apiz.ai/#/v2/api-keys

apiz align "如果您没有其他需要举报的话，这边就先挂断了。祝您生活愉快，再见。" \
  --audio "https://fal-task-hk.tos-cn-hongkong.volces.com/transfer/audio/2026/04/20/619fa17492bf40079afe2ee5e43aa42b.mp3" \
  --mode speech \
  --json
