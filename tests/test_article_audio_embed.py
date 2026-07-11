from pathlib import Path
from types import SimpleNamespace
import sys


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import hooks.video_embed as video_embed


def make_page(src_path: str, *, video: str | None = "02-que-es-ia-generativa.mp4"):
    meta = {"video": video} if video else {}
    return SimpleNamespace(
        meta=meta,
        title="Qué es IA Generativa",
        canonical_url="https://5sigmas.com/series/fundamentos-ia-iag/02-que-es-ia-generativa/",
        file=SimpleNamespace(src_path=src_path),
    )


def test_on_post_page_injects_article_audio_under_video(monkeypatch) -> None:
    monkeypatch.setattr(
        video_embed,
        "_load_article_audio_index",
        lambda: {
            "series/fundamentos-ia-iag/02-que-es-ia-generativa.md": {
                "audio_file": "series/fundamentos-ia-iag/02-que-es-ia-generativa.podcast.m4a",
                "title": "Escucha el artículo",
                "voice_label": "Dora",
            }
        },
    )

    output = video_embed.on_post_page("<html><head></head><body><h1>Título</h1><p>Texto</p></body></html>", make_page("series/fundamentos-ia-iag/02-que-es-ia-generativa.md"), SimpleNamespace(site_url="https://5sigmas.com"))

    assert 'class="s5-video-embed"' in output
    assert 'id="s5-video-series-fundamentos-ia-iag-02-que-es-ia-generativa-md"' in output
    assert 'class="s5-article-audio"' in output
    assert 'data-video-id="s5-video-series-fundamentos-ia-iag-02-que-es-ia-generativa-md"' in output
    assert output.index('class="s5-video-embed"') < output.index('class="s5-article-audio"')
    assert '/series/fundamentos-ia-iag/02-que-es-ia-generativa.podcast.m4a' in output
    assert '/series/fundamentos-ia-iag/02-que-es-ia-generativa.narration.m4a' not in output
    assert 'data-audio-role="guided"' not in output
    assert 'Navegar animaciones' not in output
    assert "__s5ArticleAudioSeek = window.__s5ArticleAudioSeek" not in output
    assert 'sincroniza el vídeo con las animaciones' not in output
    assert 'Narrado con la voz Dora.' in output


def test_on_post_page_skips_audio_when_index_has_no_entry(monkeypatch) -> None:
    monkeypatch.setattr(video_embed, "_load_article_audio_index", lambda: {})

    output = video_embed.on_post_page(
        "<html><head></head><body><h1>Título</h1><p>Texto</p></body></html>",
        make_page("series/fundamentos-ia-iag/02-que-es-ia-generativa.md"),
        SimpleNamespace(site_url="https://5sigmas.com"),
    )

    assert 'class="s5-video-embed"' in output
    assert 'class="s5-article-audio"' not in output


def test_mkdocs_registers_article_audio_javascript() -> None:
    mkdocs_path = ROOT / "mkdocs.yml"
    content = mkdocs_path.read_text(encoding="utf-8")

    assert "- path: javascripts/article-audio.js" in content
