#!/usr/bin/env sh
# apiz CLI installer
# Usage:
#   curl -fsSL https://apiz.ai/cli | sh
#   curl -fsSL https://apiz.ai/cli | APIZ_VERSION=v0.1.0 sh
#   curl -fsSL https://apiz.ai/cli | APIZ_INSTALL_DIR=$HOME/bin sh

set -eu

# ---------- Config ----------------------------------------------------------
BASE_URL="${APIZ_BASE_URL:-https://apiz.ai/cli}"
VERSION="${APIZ_VERSION:-latest}"
DEFAULT_INSTALL_DIR="${APIZ_INSTALL_DIR:-}"

# Honor `--help` / `-h`.
case "${1:-}" in
  -h|--help)
    cat <<'USAGE'
apiz CLI installer

Usage:
  curl -fsSL https://apiz.ai/cli | sh
  curl -fsSL https://apiz.ai/cli | APIZ_VERSION=v0.1.0 sh
  curl -fsSL https://apiz.ai/cli | APIZ_INSTALL_DIR=$HOME/bin sh

Environment variables:
  APIZ_VERSION        Pin a specific version (default: latest)
  APIZ_INSTALL_DIR    Install location (default: tries
                      ~/.local/bin, then /usr/local/bin via sudo)
  APIZ_BASE_URL       Override download mirror (default: https://apiz.ai/cli)

Once installed, run:
  apiz auth login
USAGE
    exit 0
    ;;
esac

# ---------- Helpers ---------------------------------------------------------
info()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m!!! %s\033[0m\n' "$*" >&2; }
fatal() { printf '\033[1;31m!!! %s\033[0m\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || fatal "missing required command: $1"
}

need uname
need tar

if command -v curl >/dev/null 2>&1; then
  HTTP_GET="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  HTTP_GET="wget -qO-"
else
  fatal "missing curl or wget"
fi

# ---------- Detect OS / arch -----------------------------------------------
detect_os() {
  case "$(uname -s)" in
    Linux)   echo linux ;;
    Darwin)  echo darwin ;;
    MINGW*|MSYS*|CYGWIN*|Windows_NT) echo windows ;;
    *)       fatal "unsupported OS: $(uname -s)" ;;
  esac
}

detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)        echo amd64 ;;
    arm64|aarch64)       echo arm64 ;;
    *) fatal "unsupported architecture: $(uname -m). Supported: amd64, arm64" ;;
  esac
}

OS="$(detect_os)"
ARCH="$(detect_arch)"

# ---------- Resolve version --------------------------------------------------
# `latest` is served from /cli/latest/. Pinned versions go to /cli/<version>/.
case "$VERSION" in
  latest|"") REL_DIR="latest"; HUMAN_VERSION="latest" ;;
  v*)        REL_DIR="${VERSION}"; HUMAN_VERSION="${VERSION}" ;;
  *)         REL_DIR="v${VERSION}"; HUMAN_VERSION="v${VERSION}" ;;
esac

# Archive shape from goreleaser:
#   apiz_<version>_<os>_<arch>.tar.gz   (linux/darwin)
#   apiz_<version>_<os>_<arch>.zip      (windows)
EXT="tar.gz"
[ "$OS" = "windows" ] && EXT="zip"

# When VERSION=latest the archives still carry the resolved version in their
# name, so we read the version stamp out of /cli/latest/VERSION.
if [ "$REL_DIR" = "latest" ]; then
  ACTUAL_VERSION="$(${HTTP_GET} "${BASE_URL}/${REL_DIR}/VERSION" || true)"
  if [ -z "${ACTUAL_VERSION:-}" ]; then
    warn "could not resolve latest version — falling back to literal name"
    ACTUAL_VERSION="latest"
  fi
else
  # Strip leading v.
  ACTUAL_VERSION="${REL_DIR#v}"
fi

ARCHIVE="apiz_${ACTUAL_VERSION#v}_${OS}_${ARCH}.${EXT}"
ARCHIVE_URL="${BASE_URL}/${REL_DIR}/${ARCHIVE}"
CHECKSUM_URL="${BASE_URL}/${REL_DIR}/checksums.txt"

info "OS=${OS} ARCH=${ARCH} version=${HUMAN_VERSION} (${ACTUAL_VERSION})"
info "downloading ${ARCHIVE_URL}"

# ---------- Download + extract ---------------------------------------------
TMP="$(mktemp -d 2>/dev/null || mktemp -d -t 'apiz')"
trap 'rm -rf "$TMP"' EXIT

(cd "$TMP" && \
  ${HTTP_GET} "$ARCHIVE_URL" > "$ARCHIVE" && \
  ${HTTP_GET} "$CHECKSUM_URL" > checksums.txt 2>/dev/null || true) \
  || fatal "download failed: ${ARCHIVE_URL}"

# Verify checksum (best-effort: skip if checksums.txt absent).
if [ -s "$TMP/checksums.txt" ]; then
  if command -v sha256sum >/dev/null 2>&1; then
    SHA_TOOL="sha256sum"
  elif command -v shasum >/dev/null 2>&1; then
    SHA_TOOL="shasum -a 256"
  else
    SHA_TOOL=""
  fi
  if [ -n "$SHA_TOOL" ]; then
    EXPECTED="$(grep " ${ARCHIVE}\$" "$TMP/checksums.txt" | awk '{print $1}' || true)"
    if [ -n "$EXPECTED" ]; then
      ACTUAL="$(cd "$TMP" && $SHA_TOOL "$ARCHIVE" | awk '{print $1}')"
      if [ "$EXPECTED" != "$ACTUAL" ]; then
        fatal "checksum mismatch: expected $EXPECTED, got $ACTUAL"
      fi
      info "checksum verified ($EXPECTED)"
    else
      warn "no checksum entry for ${ARCHIVE}; skipping verification"
    fi
  fi
fi

# Extract.
case "$EXT" in
  tar.gz) (cd "$TMP" && tar -xzf "$ARCHIVE") ;;
  zip)
    if command -v unzip >/dev/null 2>&1; then
      (cd "$TMP" && unzip -q "$ARCHIVE")
    else
      fatal "missing unzip; please install it or extract $ARCHIVE manually"
    fi
    ;;
esac

BIN_NAME="apiz"
[ "$OS" = "windows" ] && BIN_NAME="apiz.exe"

if [ ! -f "$TMP/$BIN_NAME" ]; then
  # goreleaser sometimes nests inside a directory matching the archive base.
  CANDIDATE="$(find "$TMP" -maxdepth 3 -type f -name "$BIN_NAME" -print -quit)"
  [ -n "$CANDIDATE" ] || fatal "couldn't locate $BIN_NAME inside $ARCHIVE"
  mv "$CANDIDATE" "$TMP/$BIN_NAME"
fi
chmod +x "$TMP/$BIN_NAME"

# ---------- Install ---------------------------------------------------------
choose_install_dir() {
  if [ -n "$DEFAULT_INSTALL_DIR" ]; then
    echo "$DEFAULT_INSTALL_DIR"
    return
  fi
  if [ -d "$HOME/.local/bin" ] || mkdir -p "$HOME/.local/bin" 2>/dev/null; then
    echo "$HOME/.local/bin"
    return
  fi
  echo "/usr/local/bin"
}

DEST_DIR="$(choose_install_dir)"
mkdir -p "$DEST_DIR" 2>/dev/null || true

DEST_PATH="${DEST_DIR}/${BIN_NAME}"
if [ -w "$DEST_DIR" ]; then
  mv "$TMP/$BIN_NAME" "$DEST_PATH"
elif command -v sudo >/dev/null 2>&1; then
  warn "$DEST_DIR is not writable; using sudo"
  sudo mv "$TMP/$BIN_NAME" "$DEST_PATH"
  sudo chmod +x "$DEST_PATH"
else
  fatal "$DEST_DIR is not writable and sudo is not available; rerun with APIZ_INSTALL_DIR=\$HOME/bin"
fi

info "installed: $DEST_PATH"

# ---------- PATH hint -------------------------------------------------------
case ":$PATH:" in
  *":$DEST_DIR:"*) ;;
  *)
    warn "$DEST_DIR is not on your PATH."
    warn "Add this line to ~/.zshrc or ~/.bashrc:"
    printf '    export PATH=\"%s:$PATH\"\n' "$DEST_DIR" >&2
    ;;
esac

# ---------- Smoke test ------------------------------------------------------
if "$DEST_PATH" --version >/dev/null 2>&1; then
  info "$("$DEST_PATH" --version)"
  info "next step: apiz auth login"
else
  warn "binary installed but \`apiz --version\` failed; please file an issue."
  exit 1
fi
