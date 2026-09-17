#!/usr/bin/env python3
"""Split current GOLDEN visual-media blockers from deferred owner-local voice debt.

Owner amendment 5716685049 explicitly removes voice/audio and narration-derived
accessibility artifacts from the current GOLDEN gate. This classifier preserves
those findings as debt without allowing them to fail MEDIA_VISUAL_PASS.

Curated visual key moments/chapters remain current-gate requirements unless a
specific receipt proves that their timings necessarily depend on the future
owner-local narration. They are therefore NOT deferred by this classifier.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

VOICE_DEFERRED_CODES = {
    "VIDEO_AUDIO_STREAM_MISSING",
    "VIDEO_CAPTIONS_MISSING",
    "VIDEO_CAPTIONS_FILE_MISSING",
    "VIDEO_CAPTIONS_FORMAT_INVALID",
    "VIDEO_TRANSCRIPT_MISSING",
    "VIDEO_TRANSCRIPT_FILE_MISSING",
    "VIDEO_TRANSCRIPT_FORMAT_INVALID",
}


def classify(failures: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    visual: list[dict[str, Any]] = []
    voice: list[dict[str, Any]] = []
    for failure in failures:
        code = str(failure.get("code") or "")
        if code in VOICE_DEFERRED_CODES:
            voice.append(failure)
        else:
            visual.append(failure)
    return {"media_visual_blockers": visual, "voice_enhancement_debt": voice}


def self_test() -> None:
    fixture = [
        {"code": "VIDEO_AUDIO_STREAM_MISSING", "detail": "silent.mp4"},
        {"code": "VIDEO_CAPTIONS_MISSING", "detail": "route"},
        {"code": "VIDEO_TRANSCRIPT_MISSING", "detail": "route"},
        {"code": "VIDEO_CHAPTERS_MISSING", "detail": "route"},
        {"code": "VIDEO_POSTER_MISSING", "detail": "route"},
    ]
    result = classify(fixture)
    deferred = {item["code"] for item in result["voice_enhancement_debt"]}
    blocking = {item["code"] for item in result["media_visual_blockers"]}
    assert deferred == {
        "VIDEO_AUDIO_STREAM_MISSING",
        "VIDEO_CAPTIONS_MISSING",
        "VIDEO_TRANSCRIPT_MISSING",
    }
    assert blocking == {"VIDEO_CHAPTERS_MISSING", "VIDEO_POSTER_MISSING"}
    assert "VIDEO_CHAPTERS_MISSING" not in VOICE_DEFERRED_CODES, (
        "key moments must not be silently deferred just because narration is deferred"
    )
    print("PASS requalification media classification mutation fixture")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", nargs="?", type=Path)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    if args.self_test:
        self_test()
        if args.report is None:
            return 0

    if args.report is None:
        parser.error("report is required unless --self-test is used alone")

    data = json.loads(args.report.read_text(encoding="utf-8"))
    failures = data.get("failures") or []
    if not isinstance(failures, list):
        raise SystemExit("media report failures must be a list")

    classified = classify(failures)
    output = {
        "schema_version": 1,
        "owner_amendment_comment": 5716685049,
        "source_report": str(args.report),
        "MEDIA_VISUAL_PASS": not classified["media_visual_blockers"],
        "VOICE_ENHANCEMENT": "DEFERRED_OWNER_LOCAL"
        if classified["voice_enhancement_debt"]
        else "READY",
        **classified,
    }
    rendered = json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    return 1 if classified["media_visual_blockers"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
