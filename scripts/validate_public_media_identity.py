#!/usr/bin/env python3
"""Prove that permanent P0 public media bytes match the repository exactly."""
from __future__ import annotations

import argparse
import hashlib
import os
import time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
P0_STEMS = (
    "docs/series/ia-pib-bienestar-energia/04-ia-pib-hoy",
    "docs/series/ia-pib-bienestar-energia/02-ia-tecnologia-electrica",
    "docs/series/ia-pib-bienestar-energia/03-pib-vs-bienestar",
    "docs/series/multimodalidad-iag/02-alineamiento",
    "docs/series/multimodalidad-iag/03-arquitecturas",
    "docs/series/multimodalidad-iag/05-riesgos",
    "docs/series/datacenters-espacio/02-energia-calor-conectividad",
    "docs/series/datacenters-espacio/04-huella-real-datacenter",
)
P0_SOURCES = tuple(f"{stem}{suffix}" for stem in P0_STEMS for suffix in (".mp4", ".jpg"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch_sha256(url: str) -> tuple[str, int, str]:
    request = Request(
        url,
        headers={
            "Cache-Control": "no-cache, max-age=0",
            "Pragma": "no-cache",
            "User-Agent": "5sigmas-public-media-identity/1.0",
        },
    )
    digest = hashlib.sha256()
    total = 0
    with urlopen(request, timeout=90) as response:
        content_type = response.headers.get("Content-Type") or ""
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
            total += len(chunk)
    return digest.hexdigest(), total, content_type


def public_url(origin: str, source: str) -> str:
    relative = source.removeprefix("docs/")
    return f"{origin.rstrip('/')}/{quote(relative, safe='/')}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--origin",
        default=os.environ.get("S5_VIDEO_MEDIA_ORIGIN") or os.environ.get("S5_SITE_URL") or "https://5sigmas.com",
    )
    parser.add_argument("--attempts", type=int, default=5)
    parser.add_argument("--delay", type=float, default=5.0)
    args = parser.parse_args()

    failures: list[str] = []
    for source in P0_SOURCES:
        local = ROOT / source
        if not local.is_file():
            failures.append(f"missing local P0 source: {source}")
            continue
        expected_sha = sha256_file(local)
        expected_bytes = local.stat().st_size
        url = public_url(args.origin, source)
        last = "not fetched"
        for attempt in range(1, args.attempts + 1):
            try:
                actual_sha, actual_bytes, content_type = fetch_sha256(url)
                if actual_sha == expected_sha and actual_bytes == expected_bytes:
                    print(
                        f"identity ok: {source} {expected_bytes} bytes "
                        f"sha256={expected_sha[:12]}… {content_type}"
                    )
                    break
                last = (
                    f"sha256 {actual_sha[:12]}…/{expected_sha[:12]}…; "
                    f"bytes {actual_bytes}/{expected_bytes}"
                )
            except Exception as exc:  # network/CDN errors are retryable here
                last = f"{type(exc).__name__}: {exc}"
            if attempt < args.attempts:
                time.sleep(args.delay)
        else:
            failures.append(f"{source}: public object never matched repository ({last})")

    if failures:
        print("Public P0 media identity failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1
    print(f"Public P0 media identity passed: {len(P0_SOURCES)} objects match repository bytes exactly.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
