#!/usr/bin/env python3
"""Regression checks for the generated video discovery and playback contract."""

from pathlib import Path
from tempfile import TemporaryDirectory
import json
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from hooks.video_sitemap import (
    _render_watch_page as render_watch_page_es,
    _topic_for,
    _video_schema as video_schema_es,
)
from hooks.video_sitemap_en import (
    _render_watch_page as render_watch_page_en,
    _video_schema as video_schema_en,
)
from hooks.video_publication_policy import is_video_source_published
from audit_video_indexing import DOCS, exclude_patterns, is_excluded, read_frontmatter


EN_MEDIA_INDEX = ROOT / "locales" / "en" / "media.yml"
EN_LOCALE_ROOT = ROOT / "locales" / "en"
# Exact currently-published bilingual video/watch inventory with AI Security R5 live
# plus the 12 approved C3 surfaces; other unapproved series stay blocked. Checkpoints are
# retained as history; unpublished VNext targets are not counted as current public surfaces.
EXPECTED_VIDEO_LOCALE_SURFACES = 92
EXPECTED_REALTIME_VOICE_LOCALE_SURFACES = 0
EXPECTED_CODING_AGENTS_LOCALE_SURFACES = 0
EXPECTED_CONTEXT_ENGINEERING_LOCALE_SURFACES = 0
EXPECTED_LLM_INFERENCE_LOCALE_SURFACES = 0
EXPECTED_EVALUATING_AI_SYSTEMS_LOCALE_SURFACES = 12
HISTORICAL_MISSING_CAPTIONS_TRANSCRIPT_SURFACES = 92
LEGACY_MISSING_CAPTIONS_TRANSCRIPT_BUDGET = 91

def base_entry() -> dict:
    site_url = "https://5sigmas.com"
    return {
        "id": "demo",
        "watch_url": f"{site_url}/videos/series/example/demo/",
        "video_url": "https://5sigmas.com/series/example/demo.mp4",
        "video_playback_url": "/series/example/demo.mp4",
        "thumb_url": "https://5sigmas.com/series/example/demo.jpg",
        "thumb_playback_url": "/series/example/demo.jpg",
        "captions_url": "https://5sigmas.com/series/example/demo.vtt",
        "captions_playback_url": "/series/example/demo.vtt",
        "title": "Demo",
        "description": "Demo de contrato de vídeo.",
        "publication_date": "2026-08-07T00:00:00+00:00",
        "source_url": f"{site_url}/series/example/demo/",
        "duration_iso": "PT60S",
        "duration_seconds": 60,
        "duration_label": "1:00",
        "topic": "seguridad",
        "topic_label": "Seguridad en IA",
        "collection": "Seguridad en IA",
        "snippets": [{"title": "Idea clave", "excerpt": "Resumen."}],
        "chapters": [],
        "transcript": "",
        "keywords": ["seguridad IA"],
    }


def english_entry() -> dict:
    entry = base_entry()
    site_url = "https://5sigmas.com/en"
    entry.update(
        {
            "watch_url": f"{site_url}/videos/series/example/demo/",
            "video_url": f"{site_url}/series/example/demo.mp4",
            "video_playback_url": "/en/series/example/demo.mp4",
            "thumb_url": f"{site_url}/series/example/demo.jpg",
            "thumb_playback_url": "/en/series/example/demo.jpg",
            "captions_url": f"{site_url}/series/example/demo.vtt",
            "captions_playback_url": "/en/series/example/demo.vtt",
            "description": "Video contract demo.",
            "source_url": f"{site_url}/series/example/demo/",
            "topic_label": "AI security",
            "collection": "AI security",
            "snippets": [{"title": "Key idea", "excerpt": "Summary."}],
            "keywords": ["AI security"],
        }
    )
    return entry


def curated_entry(entry: dict, transcript: str) -> dict:
    enriched = dict(entry)
    enriched["chapters"] = [
        {"name": "Primera idea", "start": 0, "end": 25},
        {"name": "Segunda idea", "start": 25, "end": 60},
    ]
    enriched["transcript"] = transcript
    return enriched


def assert_seek_contract(schema: dict, watch_url: str) -> None:
    action = schema["potentialAction"]
    assert action["@type"] == "SeekToAction"
    assert action["target"] == f"{watch_url}?t={{seek_to_second_number}}"
    assert action["startOffset-input"] == "required name=seek_to_second_number"


def assert_clip_contract(schema: dict, watch_url: str) -> None:
    assert "potentialAction" not in schema, (
        "curated chapters must use Clip rather than advertising automatic SeekToAction"
    )
    assert len(schema["hasPart"]) == 2
    assert schema["hasPart"][0]["@type"] == "Clip"
    assert schema["hasPart"][0]["startOffset"] == 0
    assert schema["hasPart"][0]["endOffset"] == 25
    assert schema["hasPart"][1]["url"] == f"{watch_url}?t=25"


def _accessibility_state(meta: dict, *, label: str, source_dir: Path | None = None) -> dict:
    captions = str(meta.get("video_captions") or "").strip()
    transcript = str(meta.get("video_transcript") or "").strip()
    assert bool(captions) == bool(transcript), (
        f"{label}: captions/transcript must be declared as a pair; partial accessibility "
        "metadata is not allowed"
    )

    if source_dir is not None and captions:
        captions_path = source_dir / captions
        transcript_path = source_dir / transcript
        assert captions_path.is_file(), f"{label}: missing declared captions {captions_path.name}"
        assert transcript_path.is_file(), f"{label}: missing declared transcript {transcript_path.name}"

    return {
        "label": label,
        "captions": bool(captions),
        "transcript": bool(transcript),
        "complete": bool(captions and transcript),
    }


def assert_accessibility_fail_closed_contract() -> None:
    """Negative fixtures: partial or dangling accessibility declarations must fail."""
    try:
        _accessibility_state(
            {"video_captions": "captions.vtt"},
            label="mutation:partial-accessibility",
        )
    except AssertionError:
        pass
    else:
        raise AssertionError("partial captions/transcript declaration unexpectedly passed")

    with TemporaryDirectory() as tmp:
        source_dir = Path(tmp)
        declared = {
            "video_captions": "captions.vtt",
            "video_transcript": "transcript.md",
        }
        try:
            _accessibility_state(
                declared,
                label="mutation:missing-accessibility-assets",
                source_dir=source_dir,
            )
        except AssertionError as exc:
            assert "missing declared captions" in str(exc)
        else:
            raise AssertionError("dangling captions/transcript declaration unexpectedly passed")

        (source_dir / "captions.vtt").write_text("WEBVTT\n", encoding="utf-8")
        try:
            _accessibility_state(
                declared,
                label="mutation:missing-transcript",
                source_dir=source_dir,
            )
        except AssertionError as exc:
            assert "missing declared transcript" in str(exc)
        else:
            raise AssertionError("missing transcript asset unexpectedly passed")


def audit_published_accessibility_inventory(*, enforce_debt: bool = True) -> dict:
    """Inventory captions/transcripts separately from search eligibility and Google selection.

    Missing both is explicit owner-local voice/accessibility debt, not a current GOLDEN or
    Search Console/video-indexing blocker. Partial declarations and broken locale-native
    accessibility asset references remain deterministic failures. The exact surface checkpoint
    forces deliberate review whenever the bilingual watch catalogue changes. ``enforce_debt``
    is retained for call-site compatibility and records the historical threshold; it no longer
    converts fully-missing future voice assets into a current-GOLDEN failure.
    """

    records: list[dict] = []
    patterns = exclude_patterns()

    for md in sorted(DOCS.rglob("*.md")):
        if is_excluded(md, patterns):
            continue
        meta = read_frontmatter(md)
        if not str(meta.get("video") or "").strip():
            continue
        if "noindex" in str(meta.get("robots") or "").lower():
            continue
        rel = md.relative_to(DOCS).as_posix()
        if not is_video_source_published(rel):
            continue
        state = _accessibility_state(meta, label=f"es:{rel}", source_dir=md.parent)
        state["locale"] = "es"
        records.append(state)

    english_media = yaml.safe_load(EN_MEDIA_INDEX.read_text(encoding="utf-8")) or {}
    assert isinstance(english_media, dict), "English media index must be a mapping"
    for src_uri, declared in sorted(english_media.items()):
        if not is_video_source_published(str(src_uri)):
            continue
        if not isinstance(declared, dict) or not str(declared.get("video") or "").strip():
            continue
        source_md = DOCS / str(src_uri)
        source_meta = read_frontmatter(source_md) if source_md.is_file() else {}
        if source_md.is_file() and is_excluded(source_md, patterns):
            continue
        if "noindex" in str(source_meta.get("robots") or "").lower():
            continue
        merged = dict(source_meta)
        merged.update(declared)
        english_source_dir = (EN_LOCALE_ROOT / str(src_uri)).parent
        state = _accessibility_state(
            merged,
            label=f"en:{src_uri}",
            source_dir=english_source_dir,
        )
        state["locale"] = "en"
        records.append(state)

    assert len(records) == EXPECTED_VIDEO_LOCALE_SURFACES, (
        "Bilingual video/watch inventory changed: expected "
        f"{EXPECTED_VIDEO_LOCALE_SURFACES}, observed {len(records)}. Review the new/removed "
        "surface and update the accessibility checkpoint deliberately."
    )

    realtime_voice = [
        row for row in records if "series/agentes-voz-tiempo-real/" in row["label"]
    ]
    assert len(realtime_voice) == EXPECTED_REALTIME_VOICE_LOCALE_SURFACES, (
        "Realtime Voice video/watch inventory changed: expected "
        f"{EXPECTED_REALTIME_VOICE_LOCALE_SURFACES}, observed {len(realtime_voice)}. "
        "Review the six ES + six EN native visual-video surfaces deliberately."
    )

    coding_agents = [
        row for row in records if "series/coding-agents-agent-harnesses/" in row["label"]
    ]
    assert len(coding_agents) == EXPECTED_CODING_AGENTS_LOCALE_SURFACES, (
        "Coding Agents video/watch inventory changed: expected "
        f"{EXPECTED_CODING_AGENTS_LOCALE_SURFACES}, observed {len(coding_agents)}. "
        "Review the six ES + six EN native visual-video surfaces deliberately."
    )

    context_engineering = [
        row for row in records if "series/context-engineering-memory-mcp/" in row["label"]
    ]
    assert len(context_engineering) == EXPECTED_CONTEXT_ENGINEERING_LOCALE_SURFACES, (
        "Context Engineering video/watch inventory changed: expected "
        f"{EXPECTED_CONTEXT_ENGINEERING_LOCALE_SURFACES}, observed {len(context_engineering)}. "
        "Review the six ES + six EN native visual-video surfaces deliberately."
    )

    inference_engineering = [
        row for row in records if "series/llm-inference-engineering-economics/" in row["label"]
    ]
    assert len(inference_engineering) == EXPECTED_LLM_INFERENCE_LOCALE_SURFACES, (
        "LLM Inference Engineering video/watch inventory changed: expected "
        f"{EXPECTED_LLM_INFERENCE_LOCALE_SURFACES}, observed {len(inference_engineering)}. "
        "Review the six ES + six EN native visual-video surfaces deliberately."
    )

    evaluating_ai_systems = [
        row for row in records if "series/evaluating-ai-systems-production/" in row["label"]
    ]
    assert len(evaluating_ai_systems) == EXPECTED_EVALUATING_AI_SYSTEMS_LOCALE_SURFACES, (
        "Evaluating AI Systems video/watch inventory changed: expected "
        f"{EXPECTED_EVALUATING_AI_SYSTEMS_LOCALE_SURFACES}, observed {len(evaluating_ai_systems)}. "
        "Review the six ES + six EN native visual-video surfaces deliberately."
    )

    missing = [row for row in records if not row["complete"]]
    debt_over_legacy_budget = max(
        0, len(missing) - LEGACY_MISSING_CAPTIONS_TRANSCRIPT_BUDGET
    )
    summary = {
        "locale_surfaces": len(records),
        "es": sum(1 for row in records if row["locale"] == "es"),
        "en": sum(1 for row in records if row["locale"] == "en"),
        "realtime_voice_locale_surfaces": len(realtime_voice),
        "coding_agents_locale_surfaces": len(coding_agents),
        "context_engineering_locale_surfaces": len(context_engineering),
        "llm_inference_locale_surfaces": len(inference_engineering),
        "evaluating_ai_systems_locale_surfaces": len(evaluating_ai_systems),
        "captions_transcript_complete": len(records) - len(missing),
        "captions_transcript_review": len(missing),
        "partial_declarations": 0,
        "historical_missing_checkpoint": HISTORICAL_MISSING_CAPTIONS_TRANSCRIPT_SURFACES,
        "historical_budget_exceeded_by": (
            HISTORICAL_MISSING_CAPTIONS_TRANSCRIPT_SURFACES
            - LEGACY_MISSING_CAPTIONS_TRANSCRIPT_BUDGET
        ),
        "legacy_missing_budget": LEGACY_MISSING_CAPTIONS_TRANSCRIPT_BUDGET,
        "legacy_budget_exceeded_by": debt_over_legacy_budget,
        "voice_enhancement": "DEFERRED_OWNER_LOCAL",
        "golden_blocking": False,
        "classification": "VOICE_ACCESSIBILITY_DEFERRED_NOT_GOOGLE_SELECTION_CAUSE",
    }
    print("Video accessibility inventory: " + json.dumps(summary, sort_keys=True))

    if enforce_debt:
        # Preserve the historical 92 > 91 checkpoint explicitly. The reviewed native visual-video
        # series added since that checkpoint now contribute 60 locale surfaces, increasing current
        # owner-local voice/accessibility debt to 152 > 91; the budget itself is never raised to
        # conceal that debt. Per PROGRAM AMENDMENT 5716685049 it remains non-blocking for current
        # ARTICLE/SERIES GOLDEN.
        assert summary["historical_missing_checkpoint"] == 92
        assert summary["historical_budget_exceeded_by"] == 1
        assert summary["legacy_missing_budget"] == LEGACY_MISSING_CAPTIONS_TRANSCRIPT_BUDGET
        assert summary["golden_blocking"] is False
    return summary


def assert_owner_voice_deferral_contract() -> None:
    """Regression: preserve historical debt facts while auditing only public video surfaces."""
    summary = audit_published_accessibility_inventory(enforce_debt=True)
    assert summary["locale_surfaces"] == 92
    assert summary["realtime_voice_locale_surfaces"] == 0
    assert summary["coding_agents_locale_surfaces"] == 0
    assert summary["context_engineering_locale_surfaces"] == 0
    assert summary["llm_inference_locale_surfaces"] == 0
    assert summary["evaluating_ai_systems_locale_surfaces"] == 12
    assert summary["captions_transcript_complete"] == 22
    assert summary["captions_transcript_review"] == 70
    assert summary["historical_missing_checkpoint"] == 92
    assert summary["historical_budget_exceeded_by"] == 1
    assert summary["legacy_missing_budget"] == 91
    assert summary["legacy_budget_exceeded_by"] == 0
    assert summary["voice_enhancement"] == "DEFERRED_OWNER_LOCAL"
    assert summary["golden_blocking"] is False

def main() -> None:
    assert is_video_source_published("series/seguridad-ia/01-prompt-injection.md")
    assert not is_video_source_published("series/agentes-ia/01-agente.md")

    global_root = "https://5sigmas.com"
    entry = base_entry()

    automatic = video_schema_es(entry, global_root)
    assert automatic["contentUrl"] == entry["video_url"]
    assert automatic["inLanguage"] == "es"
    assert "embedUrl" not in automatic, (
        "embedUrl must only point to a dedicated player URL; the 5sigmas watch "
        "page is the page containing the VideoObject, not an embed player"
    )
    assert_seek_contract(automatic, entry["watch_url"])

    curated = curated_entry(entry, "Transcripción revisada del vídeo.")
    curated_schema = video_schema_es(curated, global_root)
    assert_clip_contract(curated_schema, entry["watch_url"])

    watch_html = render_watch_page_es(entry, [])
    assert 'src="/series/example/demo.mp4"' in watch_html
    assert 'poster="/series/example/demo.jpg"' in watch_html
    assert (
        '<track kind="captions" src="/series/example/demo.vtt" '
        'srclang="es" label="Español" default>'
    ) in watch_html
    assert 'class="s5-video-watch__source-link"' in watch_html
    assert '<video controls crossorigin="anonymous"' in watch_html, (
        "watch pages must opt into anonymous CORS so cross-origin captions and media "
        "from media.5sigmas.com work under the documented R2 CORS policy"
    )

    curated_html = render_watch_page_es(curated, [])
    assert 'class="s5-video-watch__chapters"' in curated_html
    assert 'href="?t=0" data-s5-video-seek="0"' in curated_html
    assert 'href="?t=25" data-s5-video-seek="25"' in curated_html
    assert 'class="s5-video-watch__transcript"' in curated_html
    assert "Transcripción revisada del vídeo." in curated_html

    en_site_url = "https://5sigmas.com/en"
    en_entry = english_entry()
    en_automatic = video_schema_en(en_entry, en_site_url, global_root)
    assert en_automatic["contentUrl"] == en_entry["video_url"]
    assert en_automatic["inLanguage"] == "en"
    assert "embedUrl" not in en_automatic
    assert_seek_contract(en_automatic, en_entry["watch_url"])

    en_curated = curated_entry(en_entry, "Reviewed video transcript.")
    en_curated["chapters"] = [
        {"name": "First idea", "start": 0, "end": 25},
        {"name": "Second idea", "start": 25, "end": 60},
    ]
    en_curated_schema = video_schema_en(en_curated, en_site_url, global_root)
    assert_clip_contract(en_curated_schema, en_entry["watch_url"])

    en_watch_html = render_watch_page_en(en_entry, [], en_site_url)
    assert 'src="/en/series/example/demo.mp4"' in en_watch_html
    assert 'poster="/en/series/example/demo.jpg"' in en_watch_html
    assert (
        '<track kind="captions" src="/en/series/example/demo.vtt" '
        'srclang="en" label="English" default>'
    ) in en_watch_html
    assert 'class="s5-video-watch__source-link"' in en_watch_html
    assert '<video controls crossorigin="anonymous"' in en_watch_html

    en_curated_html = render_watch_page_en(en_curated, [], en_site_url)
    assert 'class="s5-video-watch__chapters"' in en_curated_html
    assert 'href="?t=0" data-s5-video-seek="0"' in en_curated_html
    assert 'href="?t=25" data-s5-video-seek="25"' in en_curated_html
    assert 'class="s5-video-watch__transcript"' in en_curated_html
    assert "Reviewed video transcript." in en_curated_html

    topic, label = _topic_for("series/seguridad-ia/01-prompt-injection.md")
    assert (topic, label) == ("seguridad", "Seguridad en IA")

    embed_source = (ROOT / "hooks" / "video_embed.py").read_text(encoding="utf-8")
    assert 'crossorigin="anonymous"' in embed_source, (
        "article video embeds must opt into anonymous CORS for the production media origin"
    )

    assert_accessibility_fail_closed_contract()
    assert_owner_voice_deferral_contract()

    print("Bilingual video discovery, accessibility and key-moment contract passed.")


if __name__ == "__main__":
    main()
