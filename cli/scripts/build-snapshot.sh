#!/usr/bin/env bash
# Cross-compile the apiz CLI for darwin / linux / windows × amd64 / arm64
# and package + checksum each binary in the same shape as goreleaser. Useful
# when goreleaser is not installed locally, or for quick R2 snapshot uploads.
#
# Usage:
#   ./scripts/build-snapshot.sh v0.1.0
#   ./scripts/build-snapshot.sh        # defaults to 0.0.0-snapshot

set -euo pipefail

VERSION="${1:-0.0.0-snapshot}"
VERSION="${VERSION#v}"               # strip leading v if present

CLI_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${CLI_DIR}/dist"

echo "==> apiz CLI build  version=${VERSION}  out=${DIST}"
rm -rf "${DIST}"
mkdir -p "${DIST}"

LDFLAGS="-s -w -X github.com/apiz-ai/apiz-cli/cmd.Version=v${VERSION}"

build_one() {
  local goos=$1 goarch=$2
  local stem="apiz_${VERSION}_${goos}_${goarch}"
  local outdir="${DIST}/${stem}"
  local bin="apiz"
  [ "$goos" = "windows" ] && bin="apiz.exe"

  mkdir -p "${outdir}"
  echo "  → ${stem}"
  ( cd "${CLI_DIR}" && \
    GOOS=$goos GOARCH=$goarch CGO_ENABLED=0 \
    go build -trimpath -ldflags "${LDFLAGS}" -o "${outdir}/${bin}" . )

  # Co-pack a README + LICENSE if present.
  cp "${CLI_DIR}/README.md" "${outdir}/" 2>/dev/null || true
  [ -f "${CLI_DIR}/LICENSE" ] && cp "${CLI_DIR}/LICENSE" "${outdir}/" || true

  if [ "$goos" = "windows" ]; then
    ( cd "${DIST}" && zip -qr "${stem}.zip" "${stem}" )
  else
    # tar without timestamps for reproducibility-ish output.
    ( cd "${DIST}" && tar -czf "${stem}.tar.gz" "${stem}" )
  fi
  rm -rf "${outdir}"
}

build_one darwin  amd64
build_one darwin  arm64
build_one linux   amd64
build_one linux   arm64
build_one windows amd64
build_one windows arm64

echo "==> sha256 checksums"
( cd "${DIST}" && \
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum *.tar.gz *.zip > checksums.txt
  else
    shasum -a 256 *.tar.gz *.zip > checksums.txt
  fi )

ls -la "${DIST}"
echo "==> done. Push to R2 with:"
echo "    python sdk/cli/scripts/deploy_cli_to_r2.py --dist ${DIST} --version v${VERSION}"
