#!/usr/bin/env bash
set -euo pipefail

apiz generate "camera slowly zooms in" \
  --model wan/v2.6/image-to-video \
  --image-url https://cdn-video.51sux.com/samples/portrait.png \
  --wait \
  --json
