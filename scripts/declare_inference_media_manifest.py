#!/usr/bin/env python3
"""Declare generated LLM Inference Engineering EN visual media as locale files."""
from __future__ import annotations

from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "locales/en/manifest.yml"
SERIES = "llm-inference-engineering-economics"
STEMS = (
    "01-prefill-vs-decode-ttft-tpot-throughput-latency-budget",
    "02-kv-cache-memory-hierarchy-continuous-batching-pagedattention",
    "03-quantization-parallelism-memory-quality-tradeoffs",
    "04-speculative-decoding-prefix-caching-latency-optimisations",
    "05-model-routing-fallback-caching-workload-aware-serving",
    "06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints",
)


def main() -> int:
    raw = MANIFEST.read_text(encoding="utf-8")
    data = yaml.safe_load(raw) or {}
    published = data.get("published_files")
    if not isinstance(published, list):
        raise SystemExit("locales/en/manifest.yml published_files must be a list")
    required = [f"series/{SERIES}/{stem}.{ext}" for stem in STEMS for ext in ("mp4", "jpg")]
    missing = [entry for entry in required if entry not in published]
    if not missing:
        print("PASS: LLM inference EN media already declared in published_files")
        return 0
    lines = raw.splitlines()
    start = next((i for i, line in enumerate(lines) if line.strip() == "published_files:"), None)
    if start is None:
        raise SystemExit("published_files section missing")
    end = start + 1
    while end < len(lines):
        line = lines[end]
        if line and not line.startswith((" ", "\t")):
            break
        end += 1
    lines[end:end] = [f"  - {entry}" for entry in missing]
    MANIFEST.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"PASS: declared {len(missing)} LLM inference EN media files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
