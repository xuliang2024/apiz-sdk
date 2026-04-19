#!/usr/bin/env python3
"""Upload the apiz CLI installer + binary archives to Cloudflare R2.

Used by the `release-cli` workflow after `goreleaser release --clean`. Can
also be invoked locally to push a snapshot.

Bucket layout written to `apiz-cli`:

    install.sh                         (root)
    latest/
        VERSION                        ← e.g. "v0.1.0\n"
        apiz_0.1.0_<os>_<arch>.tar.gz
        apiz_0.1.0_<os>_<arch>.zip
        checksums.txt
    v0.1.0/
        ...same archives...

Usage
-----

    # Snapshot from goreleaser snapshot build
    python deploy_cli_to_r2.py --dist ./dist

    # Pin a different version label
    python deploy_cli_to_r2.py --dist ./dist --version v0.1.0

    # Skip the latest/* mirror (e.g. for a pre-release)
    python deploy_cli_to_r2.py --dist ./dist --version v0.2.0-rc1 --no-latest

Required environment
--------------------

    R2_ACCOUNT_ID            Cloudflare account id
    R2_ACCESS_KEY_ID         R2 token access key
    R2_SECRET_ACCESS_KEY     R2 token secret
    R2_CLI_BUCKET            (optional, defaults to "apiz-cli")

For local development you can copy the values from
``../../scripts/deploy_web_to_r2.py`` (translate_web's deploy script) — they
share the same Cloudflare account.
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Iterable, Optional

try:
    import boto3
    from botocore.config import Config
except ImportError:  # pragma: no cover
    print("error: boto3 not installed → pip install boto3", file=sys.stderr)
    sys.exit(1)


SDK_ROOT = Path(__file__).resolve().parents[2]
CLI_ROOT = SDK_ROOT / "cli"
INSTALL_SH = CLI_ROOT / "install.sh"

# (suffix → content_type, cache-control)
CONTENT_RULES = (
    (".tar.gz", "application/gzip", "public, max-age=31536000, immutable"),
    (".tgz", "application/gzip", "public, max-age=31536000, immutable"),
    (".zip", "application/zip", "public, max-age=31536000, immutable"),
    (".sh", "text/x-shellscript; charset=UTF-8", "no-cache, no-store, must-revalidate"),
    (".txt", "text/plain; charset=UTF-8", "public, max-age=300"),
    (".json", "application/json", "public, max-age=300"),
)


def _env(name: str, *, required: bool = True, default: Optional[str] = None) -> str:
    v = os.environ.get(name, default)
    if not v and required:
        print(f"error: missing required env var {name}", file=sys.stderr)
        sys.exit(2)
    return v or ""


def _make_client():
    account_id = _env("R2_ACCOUNT_ID")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def _content_meta(filename: str) -> tuple[str, str]:
    name = filename.lower()
    basename = name.rsplit("/", 1)[-1]
    if basename == "version":
        return "text/plain; charset=UTF-8", "no-cache, no-store, must-revalidate"
    for suffix, ctype, ccontrol in CONTENT_RULES:
        if name.endswith(suffix):
            return ctype, ccontrol
    return "application/octet-stream", "public, max-age=3600"


def _put(s3, bucket: str, key: str, body: bytes, *, dry_run: bool) -> None:
    ctype, ccontrol = _content_meta(key)
    print(f"  → s3://{bucket}/{key}  ({len(body):>10}B  {ctype}; {ccontrol})")
    if dry_run:
        return
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType=ctype,
        CacheControl=ccontrol,
    )


def _archive_files(dist_dir: Path) -> Iterable[Path]:
    for p in sorted(dist_dir.iterdir()):
        if not p.is_file():
            continue
        if p.suffix in (".tar", ".gz", ".tgz", ".zip") or p.name.endswith(".tar.gz"):
            yield p
        elif p.name in ("checksums.txt",):
            yield p


def _detect_version(dist_dir: Path) -> Optional[str]:
    """Pick a version string out of the goreleaser archive names."""
    pat = re.compile(r"apiz_(?P<v>[\d][\w.\-]*)_(?:darwin|linux|windows)_(?:amd64|arm64)")
    for p in dist_dir.iterdir():
        m = pat.search(p.name)
        if m:
            return f"v{m.group('v')}"
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dist", required=True, type=Path, help="goreleaser dist/ directory")
    parser.add_argument("--version", help='Version label, e.g. "v0.1.0" (default: auto-detect from filenames)')
    parser.add_argument("--bucket", default=os.environ.get("R2_CLI_BUCKET", "apiz-cli"))
    parser.add_argument("--no-latest", action="store_true", help="Skip mirroring to latest/")
    parser.add_argument("--no-install-sh", action="store_true", help="Skip uploading install.sh")
    parser.add_argument("--dry-run", action="store_true", help="Print what would happen, don't upload")
    args = parser.parse_args()

    dist: Path = args.dist
    if not dist.is_dir():
        print(f"error: --dist does not exist: {dist}", file=sys.stderr)
        return 1

    version = args.version or _detect_version(dist)
    if not version:
        print("error: could not detect version from dist/ filenames; pass --version", file=sys.stderr)
        return 1
    if not version.startswith("v"):
        version = f"v{version}"

    archives = list(_archive_files(dist))
    if not archives:
        print(f"error: no archives or checksums.txt found in {dist}", file=sys.stderr)
        return 1

    s3 = _make_client() if not args.dry_run else None
    bucket = args.bucket

    print(f"==> bucket={bucket} version={version} archives={len(archives)} dry_run={args.dry_run}")

    # 1. install.sh at root
    if not args.no_install_sh:
        if not INSTALL_SH.exists():
            print(f"error: install.sh missing at {INSTALL_SH}", file=sys.stderr)
            return 1
        _put(s3, bucket, "install.sh", INSTALL_SH.read_bytes(), dry_run=args.dry_run)

    # 2. v<version>/<archive>
    for path in archives:
        body = path.read_bytes()
        _put(s3, bucket, f"{version}/{path.name}", body, dry_run=args.dry_run)
        if not args.no_latest:
            _put(s3, bucket, f"latest/{path.name}", body, dry_run=args.dry_run)

    # 3. latest/VERSION sentinel (so install.sh can resolve "latest")
    if not args.no_latest:
        _put(s3, bucket, "latest/VERSION", f"{version}\n".encode(), dry_run=args.dry_run)

    print("==> done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
