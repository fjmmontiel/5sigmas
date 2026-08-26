"""Publish one machine-readable key-moment contract for every generated video page.

The video generators already emit Google-supported VideoObject markup:
- explicit Clip nodes when curated video_chapters exist;
- SeekToAction for every other watch page so Google can discover key moments from ?t=.

This hook mirrors that contract into /videos/key-moments.json and enriches the public
video catalogue without inventing timestamps that were not editorially reviewed.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def on_post_build(config, **kwargs) -> None:
    site_dir = Path(config["site_dir"])
    catalogue_path = site_dir / "videos" / "catalog.json"
    if not catalogue_path.is_file():
        return

    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    videos = catalogue.get("videos") or []
    if not isinstance(videos, list):
        return

    entries: list[dict[str, Any]] = []
    clip_videos = 0
    seek_videos = 0

    for video in videos:
        if not isinstance(video, dict):
            continue
        watch_url = str(video.get("watch_url") or "").strip()
        chapters = video.get("chapters") or []
        moments: dict[str, Any]
        if isinstance(chapters, list) and chapters:
            clip_videos += 1
            clips = []
            for chapter in chapters:
                if not isinstance(chapter, dict):
                    continue
                start = chapter.get("start")
                if not isinstance(start, (int, float)):
                    continue
                clip = {
                    "name": str(chapter.get("name") or "").strip(),
                    "start": int(start),
                    "url": f"{watch_url}?t={int(start)}",
                }
                end = chapter.get("end")
                if isinstance(end, (int, float)) and end > start:
                    clip["end"] = int(end)
                clips.append(clip)
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

    catalogue["version"] = max(2, int(catalogue.get("version") or 1))
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
                "version": 1,
                "locale": str((config.get("extra") or {}).get("content_language") or "es"),
                "coverage": catalogue["key_moment_coverage"],
                "videos": entries,
            },
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
    )
