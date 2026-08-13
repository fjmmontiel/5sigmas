#!/usr/bin/env python3
"""Verify the reviewed English Reasoning media bundle and stage it for Pages."""

from __future__ import annotations

import argparse
import hashlib
import shutil
from pathlib import Path

EXPECTED = {
    "01-que-es-razonar.mp4": (3619093, "eb0c36519bf5fea9ab39107326158fb07890bf3edab6d38bc30a1fc694d68c0d"),
    "01-que-es-razonar.jpg": (118808, "750c1b7c911b5e7d74729752172bc0694b0ab75bc7603f485f226e4a42fd953e"),
    "02-fallos.mp4": (3735940, "dfe48b8db55f8017f5891d3880140890df49f35c3a50beb52c5d49334865057c"),
    "02-fallos.jpg": (111198, "38ff15eb04985f828a5c9fd93ee0ef6504a85cc6c381963bfe5a99a550a0ee74"),
    "04-latencia-streaming.mp4": (3666709, "2c1fca5deaa97d431218f3c00fa6f58f5f73cf39c4a7be6a549450771ec7b093"),
    "04-latencia-streaming.jpg": (108997, "af990fa5dcb5fea945bdcf84373de2bb8f4a0212d36d1b2669cf9fcdb56b4772"),
    "05-riesgos.mp4": (3757388, "571d3b12c6241c77988e1a51d19b6ff1e612b46ee9094ed27dc096aa2e51abc8"),
    "05-riesgos.jpg": (119313, "f3c4b59805196c447ddc0a3ba0b29ca6f5752ffd728194f5e1389b7e21727b2d"),
}


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=".localized-media/en/reasoning-v1")
    parser.add_argument("--target", default="site/en/series/modelos-razonadores")
    args = parser.parse_args()

    source = Path(args.source)
    target = Path(args.target)
    target.mkdir(parents=True, exist_ok=True)

    for name, (expected_size, expected_sha) in EXPECTED.items():
        path = source / name
        if not path.is_file():
            raise SystemExit(f"Missing reviewed media: {path}")
        if path.stat().st_size != expected_size:
            raise SystemExit(f"Unexpected size for {name}: {path.stat().st_size} != {expected_size}")
        actual_sha = digest(path)
        if actual_sha != expected_sha:
            raise SystemExit(f"Unexpected SHA-256 for {name}: {actual_sha} != {expected_sha}")
        shutil.copy2(path, target / name)

    print(f"Verified and staged {len(EXPECTED)} reviewed English Reasoning media files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
