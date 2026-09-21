#!/usr/bin/env python3
"""MEDIA_VISUAL gate for LLM Inference Engineering with VOICE explicitly deferred.

Owner amendment 5716685049 keeps future narration/audio/captions/transcript out of
the current GOLDEN gate. Native ES/EN visual video identity, poster, metadata,
codec/dimensions/duration and honest non-voice key moments remain blocking.
Manual PIXEL/PEDAGOGY review is never inferred from this script.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import yaml

import validate_voice_media_visual as base

SERIES = "llm-inference-engineering-economics"
ARTICLES = (
    "01-prefill-vs-decode-ttft-tpot-throughput-latency-budget.md",
    "02-kv-cache-memory-hierarchy-continuous-batching-pagedattention.md",
    "03-quantization-parallelism-memory-quality-tradeoffs.md",
    "04-speculative-decoding-prefix-caching-latency-optimisations.md",
    "05-model-routing-fallback-caching-workload-aware-serving.md",
    "06-benchmarking-inference-cost-task-throughput-latency-energy-hardware-constraints.md",
)


def configure() -> None:
    base.SERIES = SERIES
    base.ARTICLES = ARTICLES


def self_test() -> None:
    configure()
    fixture = [
        {"code": "VIDEO_AUDIO_STREAM_MISSING", "detail": "future owner voice"},
        {"code": "VIDEO_CAPTIONS_MISSING", "detail": "future owner voice"},
        {"code": "VIDEO_TRANSCRIPT_MISSING", "detail": "future owner voice"},
        {"code": "VIDEO_CHAPTERS_MISSING", "detail": "visual"},
        {"code": "VIDEO_POSTER_MISSING", "detail": "visual"},
        {"code": "VIDEO_SUMMARY_MISSING", "detail": "visual"},
        {"code": "VIDEO_CODEC_INVALID", "detail": "visual"},
    ]
    result = base.classify(fixture)
    deferred = {item["code"] for item in result["voice_enhancement_debt"]}
    blocking = {item["code"] for item in result["media_visual_blockers"]}
    assert deferred == {
        "VIDEO_AUDIO_STREAM_MISSING",
        "VIDEO_CAPTIONS_MISSING",
        "VIDEO_TRANSCRIPT_MISSING",
    }
    assert {
        "VIDEO_CHAPTERS_MISSING",
        "VIDEO_POSTER_MISSING",
        "VIDEO_SUMMARY_MISSING",
        "VIDEO_CODEC_INVALID",
    }.issubset(blocking)
    assert len(ARTICLES) == 6
    assert base.sample_timestamps(36.0) == [0.0, 7.2, 14.4, 21.6, 28.8, 35.28]
    print("PASS LLM Inference Engineering MEDIA_VISUAL/VOICE split + exact-video sampling fixture")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=base.ROOT)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("artifacts/inference-requalification/inference-media-visual.json"),
    )
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()

    configure()
    if args.self_test:
        self_test()
        return 0

    root = args.root.resolve()
    output = args.output if args.output.is_absolute() else root / args.output
    samples_root = output.parent / "video-frames"
    try:
        results = [
            base.inspect_target(root, target, samples_root=samples_root)
            for target in base.load_targets(root)
        ]
    except (AssertionError, OSError, RuntimeError, ValueError, yaml.YAMLError) as exc:
        print(f"INFERENCE_MEDIA_CONFIG_ERROR: {exc}", file=sys.stderr)
        return 2

    visual = [item for result in results for item in result["media_visual_blockers"]]
    voice = [item for result in results for item in result["voice_enhancement_debt"]]
    report = {
        "schema_version": 1,
        "owner_amendment_comment": 5716685049,
        "series": SERIES,
        "route_locale_obligations": len(results),
        "MEDIA_VISUAL_PASS": not visual,
        "VOICE_ENHANCEMENT": "DEFERRED_OWNER_LOCAL" if voice else "READY",
        "PIXEL_REVIEW": "MANUAL_REVIEW_REQUIRED",
        "PEDAGOGY_REVIEW": "MANUAL_REVIEW_REQUIRED",
        "visual_sample_policy": (
            "six deterministic frames per exact native MP4; evidence only, "
            "never automatic certification or narration-derived timing"
        ),
        "media_visual_blockers": visual,
        "voice_enhancement_debt": voice,
        "results": results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if visual else 0


if __name__ == "__main__":
    raise SystemExit(main())
