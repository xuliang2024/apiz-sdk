#!/usr/bin/env bash
set -euo pipefail
exec apiz generate "a small grayscale cat sketch, simple" \
  --model jimeng-4.5 \
  --wait \
  --json
