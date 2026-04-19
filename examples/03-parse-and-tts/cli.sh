#!/usr/bin/env bash
set -euo pipefail

apiz parse "https://v.douyin.com/iJqPAfre/"
apiz speak "hello, this is apiz" --model speech-2.8-turbo --json
