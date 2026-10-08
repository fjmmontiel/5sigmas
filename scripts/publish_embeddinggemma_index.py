#!/usr/bin/env python3
"""Publish a verified EmbeddingGemma 2 multimodal index as static MkDocs assets.

Build is deliberately offline/on a capable machine; a regular docs deploy does
not download a 740M model or videos. Never publish a metadata-only index as a
full multimodal index. Verification needs only the Python standard library.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
POC = ROOT / "poc" / "embeddinggemma2-local-search" / "build_index.py"
TARGET = ROOT / "docs" / "semantic-search" / "index"
ORIGIN = "https://5sigmas.com"
ALLOWED_MODALITIES = {"text", "image", "video", "audio"}


def verify(directory: Path, *, require_images: bool = True, require_video: bool = True) -> dict:
    manifest_path = directory / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if (manifest.get("schema_version") != 1
        or manifest.get("model") != "google/embeddinggemma-2"
        or manifest.get("query_model") != "litert-community/embeddinggemma-2-text-270m-litert-lm"
        or manifest.get("origin") != ORIGIN
        or manifest.get("normalized") is not True
        or manifest.get("vector_format") != "float32-little-endian"):
        raise ValueError("Invalid or incompatible EmbeddingGemma 2 index manifest")
    dimension, count = manifest.get("dimension"), manifest.get("count")
    if dimension not in {128, 256, 512, 768} or type(count) is not int or not 1 <= count <= 100_000:
        raise ValueError("Invalid index shape")
    for field in ("records_file", "vectors_file"):
        if manifest.get(field) not in {"records.json", "vectors.f32"}:
            raise ValueError("Unexpected index filename")
    paths = [directory / manifest["records_file"], directory / manifest["vectors_file"]]
    for path, key in zip(paths, ("records_sha256", "vectors_sha256"), strict=True):
        content = path.read_bytes()
        if hashlib.sha256(content).hexdigest() != manifest.get(key):
            raise ValueError("Index checksum mismatch: " + path.name)
    records = json.loads(paths[0].read_text(encoding="utf-8"))
    if not isinstance(records, list) or len(records) != count or paths[1].stat().st_size != count * dimension * 4:
        raise ValueError("Index record/vector count or dimension mismatch")
    if len({record.get("id") for record in records}) != count:
        raise ValueError("Index record IDs must be unique")
    locales = set()
    modal_counts = {name: 0 for name in ALLOWED_MODALITIES}
    for record in records:
        if not isinstance(record, dict) or record.get("locale") not in {"es", "en"}:
            raise ValueError("Index record locale invalid")
        locales.add(record["locale"])
        parsed = urlsplit(str(record.get("url", "")))
        if (parsed.scheme != "https" or parsed.netloc != "5sigmas.com"
            or not parsed.path.startswith("/") or parsed.username or parsed.password):
            raise ValueError("Index contains a noncanonical or external source URL")
        modes = record.get("embedding_modalities")
        if not isinstance(modes, list) or not modes or any(mode not in ALLOWED_MODALITIES for mode in modes):
            raise ValueError("Index record has invalid embedding modality metadata")
        for mode in set(modes):
            modal_counts[mode] += 1
    if locales != {"es", "en"}:
        raise ValueError("Both ES/EN locale sources are required")
    if require_images and not modal_counts["image"]:
        raise ValueError("No actual image embeddings in supposedly multimodal index")
    if require_video and not modal_counts["video"]:
        raise ValueError("No actual video embeddings in supposedly multimodal index")
    # Stream the matrix; reject non-finite and non-unit vectors without a NumPy dependency.
    with paths[1].open("rb") as handle:
        for _ in range(count):
            values = struct.unpack("<" + str(dimension) + "f", handle.read(dimension * 4))
            if not all(math.isfinite(value) for value in values):
                raise ValueError("Non-finite vector component")
            squared = sum(float(value) * value for value in values)
            if abs(squared - 1.0) > 0.02:
                raise ValueError("Index vectors are not normalized")
    return {"records": count, "dimension": dimension, "locales": sorted(locales),
            "modalities": modal_counts, "checksums": "VERIFIED", "path": str(directory)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--device", default="", help="torch device e.g. mps, cuda, cpu")
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--video-window-seconds", type=int, default=30)
    parser.add_argument("--max-video-segments-per-video", type=int, default=32)
    args = parser.parse_args()
    if args.validate_only:
        print(json.dumps(verify(TARGET), ensure_ascii=False))
        return 0
    if not POC.is_file():
        raise RuntimeError("Canonical EmbeddingGemma 2 POC builder missing")
    with tempfile.TemporaryDirectory(prefix="s5-multimodal-index-") as temporary:
        output = Path(temporary) / "index"
        command = [sys.executable, str(POC), "--origin", ORIGIN, "--out", str(output),
                   "--embed-images", "--embed-video", "--dim", "256",
                   "--video-window-seconds", str(args.video_window_seconds),
                   "--max-video-segments-per-video", str(args.max_video_segments_per_video)]
        if args.device:
            command.extend(["--device", args.device])
        subprocess.run(command, cwd=ROOT, check=True)
        evidence = verify(output)
        TARGET.mkdir(parents=True, exist_ok=True)
        # The manifest is copied LAST so clients never accept a partial new index.
        for filename in ("records.json", "vectors.f32", "manifest.json"):
            src, dest = output / filename, TARGET / filename
            staging = TARGET / (filename + ".uploading")
            shutil.copyfile(src, staging)
            os.replace(staging, dest)
        print(json.dumps(evidence, ensure_ascii=False))
    print("Production-static index verified. Commit the three resulting files and deploy normally.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
