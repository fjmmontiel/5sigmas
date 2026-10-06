#!/usr/bin/env python3
"""Build a browser-searchable multimodal index for 5sigmas with EmbeddingGemma 2.

The canonical source of truth is the knowledge graph already emitted by the 5sigmas
MkDocs build. Text is embedded as retrieval documents. Images and animation assets are
embedded as interleaved text+vision inputs when possible. Video can optionally be split
into timestamped visual+audio windows and embedded with the full multimodal model.

Output is intentionally static:
  - manifest.json
  - records.json
  - vectors.f32

The browser only needs the compatible text-only EmbeddingGemma 2 encoder for queries.
"""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from typing import Any, Iterable
from urllib.parse import urljoin

import numpy as np
import requests
from sentence_transformers import SentenceTransformer


MODEL_ID = "google/embeddinggemma-2"
GRAPH_PATHS = (
    ("es", "/agent/knowledge.json"),
    ("en", "/en/agent/knowledge.json"),
)
VIDEO_PATHS = (
    ("es", "/videos/catalog.json", "/videos/key-moments.json"),
    ("en", "/en/videos/catalog.json", "/en/videos/key-moments.json"),
)
PAGE_KINDS = {
    "page",
    "home",
    "concept",
    "concept-hub",
    "series",
    "series-chapter",
    "series-hub",
    "engineering",
    "engineering-hub",
    "tool",
    "tool-hub",
    "video-page",
    "video-hub",
    "visual-page",
    "visual-hub",
}
VISUAL_KINDS = {"image", "svg", "animation"}
RASTER_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".avif"}


@dataclass
class TextUnit:
    record: dict[str, Any]
    text: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="https://5sigmas.com")
    parser.add_argument("--out", type=Path, default=Path("web/public/index"))
    parser.add_argument("--model", default=MODEL_ID)
    parser.add_argument("--dim", type=int, choices=(128, 256, 512, 768), default=256)
    parser.add_argument("--device", default=None)
    parser.add_argument("--batch-size", type=int, default=12)
    parser.add_argument("--chunk-chars", type=int, default=1800)
    parser.add_argument("--chunk-overlap", type=int, default=220)
    parser.add_argument(
        "--embed-images",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Embed raster images and raster-backed animations with the vision encoder.",
    )
    parser.add_argument(
        "--embed-video",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Download videos, cut timestamped windows, and embed video+audio locally.",
    )
    parser.add_argument("--video-window-seconds", type=float, default=30.0)
    parser.add_argument("--max-video-segments-per-video", type=int, default=32)
    parser.add_argument("--request-timeout", type=float, default=60.0)
    return parser.parse_args()


def clean_space(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def stable_id(*parts: Any) -> str:
    raw = "|".join(str(part) for part in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def normalize_vector(value: Any, dim: int) -> np.ndarray:
    vector = np.asarray(value, dtype=np.float32).reshape(-1)
    if vector.size < dim:
        raise RuntimeError(f"Embedding dimension {vector.size} is smaller than requested {dim}")
    vector = vector[:dim]
    norm = float(np.linalg.norm(vector))
    if norm <= 0:
        raise RuntimeError("Model returned a zero-length embedding")
    return (vector / norm).astype(np.float32, copy=False)


def fetch_json(session: requests.Session, url: str, timeout: float, *, optional: bool = False) -> dict[str, Any] | None:
    response = session.get(url, timeout=timeout)
    if optional and response.status_code == 404:
        return None
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        raise RuntimeError(f"Expected JSON object at {url}")
    return payload


def fetch_text(session: requests.Session, url: str, timeout: float) -> str:
    response = session.get(
        url,
        timeout=timeout,
        headers={"Accept": "text/markdown,text/plain;q=0.9,*/*;q=0.1"},
    )
    response.raise_for_status()
    return response.text


def public_url(origin: str, value: str) -> str:
    return urljoin(origin.rstrip("/") + "/", value)


def strip_frontmatter(markdown: str) -> str:
    if markdown.startswith("---\n"):
        end = markdown.find("\n---\n", 4)
        if end >= 0:
            return markdown[end + 5 :]
    return markdown


def sanitize_markdown(markdown: str) -> str:
    text = strip_frontmatter(markdown)
    text = re.sub(r"<(?:script|style)\b[^>]*>.*?</(?:script|style)>", " ", text, flags=re.I | re.S)
    text = re.sub(r"<!--.*?-->", " ", text, flags=re.S)
    return text.strip()


def split_long_text(text: str, max_chars: int, overlap: int) -> list[str]:
    if len(text) <= max_chars:
        return [text] if text.strip() else []
    if overlap >= max_chars:
        raise ValueError("chunk overlap must be smaller than chunk size")

    chunks: list[str] = []
    start = 0
    while start < len(text):
        hard_end = min(len(text), start + max_chars)
        end = hard_end
        if hard_end < len(text):
            search_from = start + max_chars // 2
            newline = text.rfind("\n", search_from, hard_end)
            space = text.rfind(" ", search_from, hard_end)
            boundary = max(newline, space)
            if boundary > start:
                end = boundary
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


def markdown_sections(markdown: str) -> list[tuple[str, str]]:
    text = sanitize_markdown(markdown)
    heading_re = re.compile(r"^(#{1,4})\s+(.+?)\s*#*\s*$")
    sections: list[tuple[str, str]] = []
    heading = ""
    body: list[str] = []

    def flush() -> None:
        nonlocal body
        value = "\n".join(body).strip()
        if value:
            sections.append((heading, value))
        body = []

    for line in text.splitlines():
        match = heading_re.match(line.strip())
        if match:
            flush()
            heading = clean_space(re.sub(r"\[(.*?)\]\([^)]*\)", r"\1", match.group(2)))
        else:
            body.append(line)
    flush()
    return sections or [("", text)]


def heading_anchor(item: dict[str, Any], heading: str) -> str:
    if not heading:
        return ""
    needle = clean_space(heading).casefold()
    for entry in item.get("headings") or []:
        if isinstance(entry, dict) and clean_space(entry.get("text")).casefold() == needle:
            fragment = clean_space(entry.get("id"))
            if fragment:
                return "#" + fragment
    return ""


def page_text_units(
    session: requests.Session,
    graph: dict[str, Any],
    origin: str,
    timeout: float,
    chunk_chars: int,
    overlap: int,
) -> list[TextUnit]:
    units: list[TextUnit] = []
    locale = clean_space(graph.get("locale"))
    for item in graph.get("items") or []:
        if not isinstance(item, dict) or item.get("kind") not in PAGE_KINDS:
            continue
        markdown_url = clean_space(item.get("markdown_url"))
        url = clean_space(item.get("url"))
        if not markdown_url or not url:
            continue
        try:
            markdown = fetch_text(session, markdown_url, timeout)
        except Exception as exc:
            print(f"WARN markdown fetch failed: {markdown_url}: {exc}")
            excerpt = clean_space(item.get("text_excerpt"))
            markdown = excerpt
        if not markdown.strip():
            continue

        title = clean_space(item.get("title")) or "5sigmas"
        description = clean_space(item.get("description"))
        section_index = 0
        for heading, section in markdown_sections(markdown):
            for chunk_index, chunk in enumerate(split_long_text(section, chunk_chars, overlap)):
                context = "\n\n".join(
                    part
                    for part in (
                        title,
                        heading,
                        description if section_index == 0 and chunk_index == 0 else "",
                        chunk,
                    )
                    if part
                )
                record = {
                    "id": "text:" + stable_id(item.get("id"), section_index, chunk_index, heading),
                    "locale": locale,
                    "kind": "text",
                    "source_kind": clean_space(item.get("kind")),
                    "title": title,
                    "heading": heading,
                    "text": chunk,
                    "url": url + heading_anchor(item, heading),
                    "parent_url": url,
                    "asset_url": "",
                    "poster_url": "",
                }
                units.append(TextUnit(record=record, text=context))
            section_index += 1
    return units


def visual_text(item: dict[str, Any]) -> str:
    values = [
        clean_space(item.get("title")),
        clean_space(item.get("heading")),
        clean_space(item.get("description")),
        " ".join(clean_space(v) for v in (item.get("keywords") or [])),
        " ".join(clean_space(v) for v in (item.get("tags") or [])),
        clean_space(item.get("parent_title")),
    ]
    return ". ".join(value for value in values if value)


def first_raster_asset(item: dict[str, Any]) -> str:
    candidates = [clean_space(item.get("asset_url"))]
    candidates.extend(clean_space(value) for value in (item.get("assets") or []))
    for value in candidates:
        if not value:
            continue
        suffix = Path(value.split("?", 1)[0]).suffix.lower()
        if suffix in RASTER_EXTENSIONS:
            return value
    return ""


def encode_text_batch(
    model: SentenceTransformer,
    units: list[TextUnit],
    dim: int,
    batch_size: int,
) -> list[np.ndarray]:
    if not units:
        return []
    embeddings = model.encode(
        [unit.text for unit in units],
        prompt_name="Document",
        batch_size=batch_size,
        normalize_embeddings=True,
        truncate_dim=dim,
        show_progress_bar=True,
    )
    return [normalize_vector(value, dim) for value in embeddings]


def encode_media_or_text(
    model: SentenceTransformer,
    *,
    metadata: str,
    dim: int,
    image: str = "",
    video: str = "",
    audio: str = "",
) -> np.ndarray:
    payload: dict[str, Any] = {}
    placeholders: list[str] = []
    if image:
        payload["image"] = image
        placeholders.append("<|image|>")
    if video:
        payload["video"] = video
        placeholders.append("<|video|>")
    if audio:
        payload["audio"] = audio
        placeholders.append("<|audio|>")

    if payload:
        payload["text"] = (metadata + " " + " ".join(placeholders)).strip()
        value = model.encode(payload, normalize_embeddings=True, truncate_dim=dim)
    else:
        value = model.encode(
            metadata,
            prompt_name="Document",
            normalize_embeddings=True,
            truncate_dim=dim,
        )
    return normalize_vector(value, dim)


def video_segments(moment_entry: dict[str, Any] | None, duration: float, window: float, limit: int) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    clips = []
    if moment_entry:
        key_moments = moment_entry.get("key_moments") or {}
        if isinstance(key_moments, dict) and key_moments.get("mode") == "clip":
            clips = key_moments.get("clips") or []

    if clips:
        for index, clip in enumerate(clips):
            if not isinstance(clip, dict):
                continue
            start = float(clip.get("start") or 0)
            next_start = None
            if index + 1 < len(clips) and isinstance(clips[index + 1], dict):
                next_start = float(clips[index + 1].get("start") or 0)
            raw_end = clip.get("end")
            end = float(raw_end) if raw_end is not None else (next_start or duration or start + window)
            if end <= start:
                end = start + window
            cursor = start
            while cursor < end and len(segments) < limit:
                segment_end = min(end, cursor + window)
                segments.append(
                    {
                        "name": clean_space(clip.get("name")) or "Video moment",
                        "start": cursor,
                        "end": segment_end,
                    }
                )
                cursor = segment_end
            if len(segments) >= limit:
                break
    elif duration > 0:
        cursor = 0.0
        while cursor < duration and len(segments) < limit:
            segments.append(
                {
                    "name": "Video segment",
                    "start": cursor,
                    "end": min(duration, cursor + window),
                }
            )
            cursor += window
    return segments


def download_file(session: requests.Session, url: str, target: Path, timeout: float) -> None:
    with session.get(url, timeout=timeout, stream=True) as response:
        response.raise_for_status()
        with target.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    handle.write(chunk)


def run_ffmpeg(source: Path, start: float, end: float, target_video: Path, target_audio: Path) -> tuple[str, str]:
    duration = max(0.1, end - start)
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-ss",
            f"{start:.3f}",
            "-i",
            str(source),
            "-t",
            f"{duration:.3f}",
            "-map",
            "0:v:0?",
            "-an",
            "-c:v",
            "copy",
            "-avoid_negative_ts",
            "make_zero",
            str(target_video),
        ],
        check=True,
    )
    audio = ""
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                f"{start:.3f}",
                "-i",
                str(source),
                "-t",
                f"{duration:.3f}",
                "-vn",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-c:a",
                "pcm_s16le",
                str(target_audio),
            ],
            check=True,
        )
        audio = str(target_audio)
    except subprocess.CalledProcessError:
        print(f"WARN audio extraction failed for {source.name} @ {start:.1f}s")
    return str(target_video), audio


def video_text_record(
    locale: str,
    video: dict[str, Any],
    *,
    name: str,
    start: float,
    end: float | None,
) -> dict[str, Any]:
    watch_url = clean_space(video.get("watch_url"))
    video_url = clean_space(video.get("video_url"))
    title = clean_space(video.get("title")) or "5sigmas video"
    description = clean_space(video.get("description"))
    timestamp_url = watch_url
    if watch_url and start >= 0:
        timestamp_url = watch_url + ("&" if "?" in watch_url else "?") + f"t={start:g}"
    text = ". ".join(value for value in (title, name, description) if value)
    return {
        "id": "video:" + stable_id(locale, watch_url, start, end, name),
        "locale": locale,
        "kind": "video_moment",
        "source_kind": "video",
        "title": title,
        "heading": name,
        "text": text,
        "url": timestamp_url or watch_url,
        "parent_url": watch_url,
        "asset_url": video_url,
        "poster_url": clean_space(video.get("thumb_url")),
        "start_seconds": start,
        "end_seconds": end,
    }


def build_video_index(
    session: requests.Session,
    model: SentenceTransformer,
    origin: str,
    timeout: float,
    dim: int,
    embed_video: bool,
    window: float,
    limit: int,
) -> tuple[list[dict[str, Any]], list[np.ndarray]]:
    records: list[dict[str, Any]] = []
    vectors: list[np.ndarray] = []

    if embed_video and shutil.which("ffmpeg") is None:
        raise RuntimeError("--embed-video requires ffmpeg in PATH")

    for locale, catalog_path, moments_path in VIDEO_PATHS:
        catalog = fetch_json(session, public_url(origin, catalog_path), timeout, optional=True)
        if not catalog:
            continue
        moments_payload = fetch_json(session, public_url(origin, moments_path), timeout, optional=True) or {}
        moment_by_url = {
            clean_space(entry.get("watch_url")): entry
            for entry in (moments_payload.get("videos") or [])
            if isinstance(entry, dict) and clean_space(entry.get("watch_url"))
        }

        for video in catalog.get("videos") or []:
            if not isinstance(video, dict):
                continue
            watch_url = clean_space(video.get("watch_url"))
            video_url = clean_space(video.get("video_url"))
            duration = float(video.get("duration_seconds") or 0)
            moment_entry = moment_by_url.get(watch_url)
            segments = video_segments(moment_entry, duration, window, limit)

            if not segments:
                record = video_text_record(locale, video, name="Video", start=0, end=None)
                metadata = record["text"]
                vectors.append(encode_media_or_text(model, metadata=metadata, dim=dim))
                records.append(record)
                continue

            if not embed_video or not video_url:
                for segment in segments:
                    record = video_text_record(
                        locale,
                        video,
                        name=segment["name"],
                        start=float(segment["start"]),
                        end=float(segment["end"]),
                    )
                    vectors.append(encode_media_or_text(model, metadata=record["text"], dim=dim))
                    records.append(record)
                continue

            print(f"VIDEO {locale}: {clean_space(video.get('title'))} -> {len(segments)} segments")
            with tempfile.TemporaryDirectory(prefix="s5-embedding-video-") as temp_dir:
                temp = Path(temp_dir)
                source = temp / "source.mp4"
                try:
                    download_file(session, video_url, source, timeout)
                except Exception as exc:
                    print(f"WARN video download failed, using metadata embeddings: {video_url}: {exc}")
                    for segment in segments:
                        record = video_text_record(
                            locale,
                            video,
                            name=segment["name"],
                            start=float(segment["start"]),
                            end=float(segment["end"]),
                        )
                        vectors.append(encode_media_or_text(model, metadata=record["text"], dim=dim))
                        records.append(record)
                    continue

                for index, segment in enumerate(segments):
                    start = float(segment["start"])
                    end = float(segment["end"])
                    record = video_text_record(locale, video, name=segment["name"], start=start, end=end)
                    clip = temp / f"clip-{index:03d}.mp4"
                    audio = temp / f"audio-{index:03d}.wav"
                    try:
                        clip_path, audio_path = run_ffmpeg(source, start, end, clip, audio)
                        vector = encode_media_or_text(
                            model,
                            metadata=record["text"],
                            dim=dim,
                            video=clip_path,
                            audio=audio_path,
                        )
                        record["embedding_modalities"] = ["text", "video"] + (["audio"] if audio_path else [])
                    except Exception as exc:
                        print(f"WARN multimodal video embedding failed @ {start:.1f}s; falling back to text: {exc}")
                        vector = encode_media_or_text(model, metadata=record["text"], dim=dim)
                        record["embedding_modalities"] = ["text"]
                    records.append(record)
                    vectors.append(vector)
    return records, vectors


def load_model(model_id: str, dim: int, device: str | None) -> SentenceTransformer:
    kwargs: dict[str, Any] = {"truncate_dim": dim}
    if device:
        kwargs["device"] = device
    print(f"Loading {model_id} (full multimodal, {dim}d output)")
    return SentenceTransformer(model_id, **kwargs)


def main() -> int:
    args = parse_args()
    if args.chunk_chars < 400:
        raise SystemExit("--chunk-chars must be >= 400")
    if args.video_window_seconds <= 0:
        raise SystemExit("--video-window-seconds must be > 0")

    session = requests.Session()
    session.headers.update({"User-Agent": "5sigmas-embeddinggemma2-poc/1.0"})

    graphs: list[dict[str, Any]] = []
    for locale, path in GRAPH_PATHS:
        url = public_url(args.origin, path)
        graph = fetch_json(session, url, args.request_timeout)
        assert graph is not None
        if graph.get("schema_version") != 2 or not isinstance(graph.get("items"), list):
            raise RuntimeError(f"Unsupported 5sigmas knowledge graph at {url}")
        if clean_space(graph.get("locale")) != locale:
            raise RuntimeError(f"Locale mismatch at {url}")
        graphs.append(graph)

    model = load_model(args.model, args.dim, args.device)

    text_units: list[TextUnit] = []
    for graph in graphs:
        text_units.extend(
            page_text_units(
                session,
                graph,
                args.origin,
                args.request_timeout,
                args.chunk_chars,
                args.chunk_overlap,
            )
        )

    print(f"Embedding {len(text_units)} article/page chunks")
    records: list[dict[str, Any]] = [unit.record for unit in text_units]
    vectors: list[np.ndarray] = encode_text_batch(model, text_units, args.dim, args.batch_size)

    print("Embedding visual and animation items")
    for graph in graphs:
        locale = clean_space(graph.get("locale"))
        for item in graph.get("items") or []:
            if not isinstance(item, dict) or item.get("kind") not in VISUAL_KINDS:
                continue
            metadata = visual_text(item)
            if not metadata:
                continue
            kind = clean_space(item.get("kind"))
            asset = first_raster_asset(item)
            use_image = bool(args.embed_images and asset)
            try:
                vector = encode_media_or_text(
                    model,
                    metadata=metadata,
                    dim=args.dim,
                    image=asset if use_image else "",
                )
                modalities = ["text", "image"] if use_image else ["text"]
            except Exception as exc:
                print(f"WARN visual embedding failed, falling back to text: {asset}: {exc}")
                vector = encode_media_or_text(model, metadata=metadata, dim=args.dim)
                modalities = ["text"]

            record = {
                "id": kind + ":" + stable_id(item.get("id"), asset),
                "locale": locale,
                "kind": kind,
                "source_kind": kind,
                "title": clean_space(item.get("title")) or clean_space(item.get("parent_title")),
                "heading": clean_space(item.get("heading")),
                "text": clean_space(item.get("description")),
                "url": clean_space(item.get("url")) or clean_space(item.get("parent_url")),
                "parent_url": clean_space(item.get("parent_url")),
                "asset_url": clean_space(item.get("asset_url")) or asset,
                "poster_url": clean_space(item.get("poster_url")),
                "embedding_modalities": modalities,
            }
            records.append(record)
            vectors.append(vector)

    video_records, video_vectors = build_video_index(
        session,
        model,
        args.origin,
        args.request_timeout,
        args.dim,
        args.embed_video,
        args.video_window_seconds,
        args.max_video_segments_per_video,
    )
    records.extend(video_records)
    vectors.extend(video_vectors)

    if len(records) != len(vectors):
        raise RuntimeError("Record/vector count mismatch")
    if not records:
        raise RuntimeError("Index is empty")

    matrix = np.vstack(vectors).astype("<f4", copy=False)
    if matrix.shape != (len(records), args.dim):
        raise RuntimeError(f"Unexpected vector matrix shape {matrix.shape}")

    args.out.mkdir(parents=True, exist_ok=True)
    records_path = args.out / "records.json"
    vectors_path = args.out / "vectors.f32"
    manifest_path = args.out / "manifest.json"

    records_bytes = json.dumps(records, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    vector_bytes = matrix.tobytes(order="C")
    records_path.write_bytes(records_bytes)
    vectors_path.write_bytes(vector_bytes)

    counts = Counter(record["kind"] for record in records)
    manifest = {
        "schema_version": 1,
        "built_at": datetime.now(timezone.utc).isoformat(),
        "origin": args.origin.rstrip("/"),
        "model": args.model,
        "query_model": "litert-community/embeddinggemma-2-text-270m-litert-lm",
        "dimension": args.dim,
        "count": len(records),
        "counts": dict(sorted(counts.items())),
        "vector_format": "float32-little-endian",
        "normalized": True,
        "records_file": "records.json",
        "vectors_file": "vectors.f32",
        "records_sha256": hashlib.sha256(records_bytes).hexdigest(),
        "vectors_sha256": hashlib.sha256(vector_bytes).hexdigest(),
        "full_multimodal_video": bool(args.embed_video),
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(manifest, indent=2))
    print(f"Wrote static index to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
