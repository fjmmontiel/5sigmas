#!/usr/bin/env python3
"""Fail-closed locale identity/isolation gate for Security 00/01 media.

The primary media gate checks completeness and binary properties. This companion
gate prevents a different recurrence: an English declaration reaching into the
Spanish tree (or vice versa), or ES/EN semantic assets being byte-identical and
therefore silently reused instead of being native to each locale.

It never generates, copies, translates, or mutates media.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[1]
FILE_KEYS = ("video", "video_poster", "video_captions", "video_transcript")
SEMANTIC_KEYS = ("video", "video_captions", "video_transcript")


@dataclass(frozen=True)
class Target:
    locale: str
    name: str
    source: Path
    asset_root: Path
    meta: dict[str, Any]


def frontmatter(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", text, re.S)
    if not match:
        raise ValueError(f"frontmatter missing: {path}")
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError(f"frontmatter must be a mapping: {path}")
    return data


def load_targets(root: Path) -> list[Target]:
    es_root = root / "docs/series/seguridad-ia"
    en_root = root / "locales/en/series/seguridad-ia"
    en_media_path = root / "locales/en/media.yml"
    en_media = yaml.safe_load(en_media_path.read_text(encoding="utf-8")) or {}
    if not isinstance(en_media, dict):
        raise ValueError("locales/en/media.yml must be a mapping")

    targets: list[Target] = []
    for name in ("00_presentacion_serie.md", "01-prompt-injection.md"):
        es_source = es_root / name
        targets.append(Target("es", name, es_source, es_root, frontmatter(es_source)))
        key = f"series/seguridad-ia/{name}"
        en_meta = en_media.get(key) or {}
        if not isinstance(en_meta, dict):
            raise ValueError(f"English media entry invalid: {key}")
        targets.append(Target("en", name, en_root / name, en_root, dict(en_meta)))
    return targets


def _string(meta: dict[str, Any], key: str) -> str:
    value = meta.get(key)
    return str(value).strip() if value is not None else ""


def resolve_local_asset(asset_root: Path, value: str) -> tuple[Path | None, str | None]:
    """Resolve only paths contained by the locale asset root."""
    raw = value.strip()
    if not raw:
        return None, None
    candidate = Path(raw)
    if candidate.is_absolute():
        return None, "MEDIA_ASSET_ABSOLUTE_PATH"
    root = asset_root.resolve()
    resolved = (root / candidate).resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        return None, "MEDIA_ASSET_ESCAPES_LOCALE_ROOT"
    return resolved, None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_target(target: Target) -> tuple[list[dict[str, str]], dict[str, str]]:
    failures: list[dict[str, str]] = []
    resolved: dict[str, str] = {}
    label = f"{target.locale}:{target.name}"
    for key in FILE_KEYS:
        value = _string(target.meta, key)
        if not value:
            continue  # Completeness is enforced by validate_security_video_media.py.
        path, error = resolve_local_asset(target.asset_root, value)
        if error:
            failures.append({"code": error, "detail": f"{label}:{key}={value}"})
            continue
        assert path is not None
        resolved[key] = path.as_posix()
    return failures, resolved


def validate_pairs(targets: list[Target]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    failures: list[dict[str, str]] = []
    summaries: list[dict[str, Any]] = []
    by_name: dict[str, dict[str, Target]] = {}
    target_resolved: dict[tuple[str, str], dict[str, str]] = {}

    for target in targets:
        target_failures, resolved = validate_target(target)
        failures.extend(target_failures)
        target_resolved[(target.locale, target.name)] = resolved
        by_name.setdefault(target.name, {})[target.locale] = target

    for name, locales in sorted(by_name.items()):
        if set(locales) != {"es", "en"}:
            failures.append({"code": "MEDIA_LOCALE_PAIR_MISSING", "detail": f"{name}: locales={sorted(locales)}"})
            continue
        pair_summary: dict[str, Any] = {"name": name, "checks": {}}
        es_resolved = target_resolved[("es", name)]
        en_resolved = target_resolved[("en", name)]

        for key in FILE_KEYS:
            es_path = Path(es_resolved[key]) if key in es_resolved else None
            en_path = Path(en_resolved[key]) if key in en_resolved else None
            if es_path is not None and en_path is not None and es_path == en_path:
                failures.append({"code": "MEDIA_CROSS_LOCALE_PATH_REUSE", "detail": f"{name}:{key}:{es_path}"})

        for key in SEMANTIC_KEYS:
            es_path = Path(es_resolved[key]) if key in es_resolved else None
            en_path = Path(en_resolved[key]) if key in en_resolved else None
            check: dict[str, Any] = {
                "es": es_path.as_posix() if es_path else None,
                "en": en_path.as_posix() if en_path else None,
                "compared": False,
            }
            if (
                es_path is not None
                and en_path is not None
                and es_path.is_file()
                and en_path.is_file()
                and es_path.stat().st_size > 0
                and en_path.stat().st_size > 0
            ):
                es_hash = sha256(es_path)
                en_hash = sha256(en_path)
                check.update({"compared": True, "es_sha256": es_hash, "en_sha256": en_hash})
                if es_hash == en_hash:
                    failures.append({"code": "MEDIA_CROSS_LOCALE_BYTES_IDENTICAL", "detail": f"{name}:{key}:sha256={es_hash}"})
            pair_summary["checks"][key] = check
        summaries.append(pair_summary)
    return failures, summaries


def run_self_test() -> None:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        es = root / "es"
        en = root / "en"
        es.mkdir()
        en.mkdir()
        for folder, language in ((es, "es"), (en, "en")):
            (folder / "video.mp4").write_bytes(f"video-{language}".encode())
            (folder / "poster.jpg").write_bytes(b"shared-poster-ok")
            (folder / "captions.vtt").write_text(
                "WEBVTT\n\n00:00.000 --> 00:01.000\n" + ("Hola" if language == "es" else "Hello"),
                encoding="utf-8",
            )
            (folder / "transcript.md").write_text(
                "# " + ("Transcripción" if language == "es" else "Transcript"), encoding="utf-8"
            )

        base_meta = {
            "video": "video.mp4",
            "video_poster": "poster.jpg",
            "video_captions": "captions.vtt",
            "video_transcript": "transcript.md",
        }
        targets = [
            Target("es", "fixture.md", es / "fixture.md", es, dict(base_meta)),
            Target("en", "fixture.md", en / "fixture.md", en, dict(base_meta)),
        ]
        failures, _ = validate_pairs(targets)
        if failures:
            raise AssertionError(f"valid native pair failed: {failures}")

        escape = dict(base_meta)
        escape["video_captions"] = "../es/captions.vtt"
        failures, _ = validate_pairs([
            targets[0],
            Target("en", "fixture.md", en / "fixture.md", en, escape),
        ])
        if "MEDIA_ASSET_ESCAPES_LOCALE_ROOT" not in {item["code"] for item in failures}:
            raise AssertionError("cross-locale path traversal must fail closed")

        (en / "video.mp4").write_bytes((es / "video.mp4").read_bytes())
        failures, _ = validate_pairs(targets)
        if "MEDIA_CROSS_LOCALE_BYTES_IDENTICAL" not in {item["code"] for item in failures}:
            raise AssertionError("byte-identical ES/EN semantic media must fail closed")

    print("security media locale identity self-test PASS")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        run_self_test()
        return 0

    root = args.root.resolve()
    try:
        targets = load_targets(root)
    except (OSError, ValueError, yaml.YAMLError) as exc:
        print(f"SECURITY_MEDIA_LOCALE_CONFIG_ERROR: {exc}")
        return 2

    failures, summaries = validate_pairs(targets)
    for summary in summaries:
        print(yaml.safe_dump(summary, allow_unicode=True, sort_keys=False).strip())
    if failures:
        print(f"SECURITY_MEDIA_LOCALE_IDENTITY=FAIL ({len(failures)})")
        for failure in failures:
            print(f"- {failure['code']}: {failure['detail']}")
        return 1
    print("SECURITY_MEDIA_LOCALE_IDENTITY=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
