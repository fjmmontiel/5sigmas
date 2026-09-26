"""Publish one machine-readable key-moment contract for every generated video page.

The video generators emit Google-supported VideoObject markup. During the Golden
migration, byte-bound discovery records additionally replace legacy SeekToAction
fallbacks with independently validated chapters, visual-text VTT and crawlable
transcripts before this hook writes the final key-moment catalogue.
"""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys
from typing import Any


ROOT = Path(__file__).resolve().parents[1]


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


_learning_contract = _load_module(
    "s5_agent_learning_public_contract",
    Path(__file__).with_name("agent_learning_public_contract.py"),
)
_discovery_surface = _load_module(
    "s5_video_discovery_surface",
    Path(__file__).with_name("video_discovery_surface.py"),
)


def on_post_build(config, **kwargs) -> None:
    # The adapter is fail-closed for every discovery record present in the
    # current locale. It re-verifies exact MP4 bytes before mutating public HTML.
    _discovery_surface.apply_discovery_surface(config)
    _learning_contract.on_post_build(config, **kwargs)

    site_dir = Path(config["site_dir"])
    catalogue_path = site_dir / "videos" / "catalog.json"
    if not catalogue_path.is_file():
        return

    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    videos = catalogue.get("videos") or []
    if not isinstance(videos, list):
        raise RuntimeError("Video catalogue 'videos' must be a list")

    entries: list[dict[str, Any]] = []
    clip_videos = 0
    seek_videos = 0

    for video in videos:
        if not isinstance(video, dict):
            raise RuntimeError("Video catalogue contains a non-object entry")
        watch_url = str(video.get("watch_url") or "").strip()
        if not watch_url:
            raise RuntimeError("Video catalogue entry is missing watch_url")
        chapters = video.get("chapters") or []
        clips = _discovery_surface.validated_clips(chapters, watch_url)
        moments: dict[str, Any]
        if clips:
            clip_videos += 1
            moments = {"mode": "clip", "clips": clips}
        else:
            seek_videos += 1
            moments = {
                "mode": "seek_to_action",
                "seek_template": f"{watch_url}?t={{seek_to_second_number}}",
            }

        video["key_moments"] = moments
        entries.append(
            {
                "id": video.get("id"),
                "title": video.get("title"),
                "watch_url": watch_url,
                "duration_seconds": video.get("duration_seconds"),
                "key_moments": moments,
            }
        )

    catalogue["version"] = max(3, int(catalogue.get("version") or 1))
    catalogue["key_moment_coverage"] = {
        "videos": len(entries),
        "clip": clip_videos,
        "seek_to_action": seek_videos,
        "covered": clip_videos + seek_videos,
    }
    catalogue_path.write_text(
        json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    target = site_dir / "videos" / "key-moments.json"
    target.write_text(
        json.dumps(
            {
                "version": 2,
                "locale": str((config.get("extra") or {}).get("content_language") or "es"),
                "coverage": catalogue["key_moment_coverage"],
                "videos": entries,
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
