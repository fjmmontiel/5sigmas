"""Locale-aware macros used by non-Spanish 5sigmas builds.

The Spanish site keeps using main.py. Locale builds use this module so translated
content can resolve translated visual snippets without ever silently falling back
to Spanish prose.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path

_READING_WPM = 230
_REPO_ROOT = Path(__file__).resolve().parent
_CANONICAL_MIRROR_MARKER = "<!-- 5sigmas-canonical-mirror -->"


def _locale() -> str:
    return os.environ.get("S5_LOCALE", "en").strip().lower() or "en"


def _locale_root() -> Path:
    return _REPO_ROOT / "locales" / _locale()


def _strip_for_reading_time(markdown: str) -> str:
    text = markdown or ""
    text = re.sub(r"<details[\s\S]*?</details>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\{\{[^}]+\}\}", "", text)
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return text


def _estimate_reading_minutes(markdown: str) -> int:
    words = len(_strip_for_reading_time(markdown).split())
    return max(1, round(words / _READING_WPM))


def _render_template(html: str, context: dict[str, object]) -> str:
    def repl(match: re.Match[str]) -> str:
        key = match.group(1).strip()
        return str(context.get(key, match.group(0)))

    return re.sub(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}", repl, html)


def _git_blob_sha(payload: bytes) -> str:
    header = f"blob {len(payload)}\0".encode("ascii")
    return hashlib.sha1(header + payload).hexdigest()


def _render_canonical_mirror(path: str, snippet_path: Path) -> str:
    """Render an explicitly pinned translation of the canonical Spanish snippet.

    A canonical mirror is not an implicit locale fallback. The locale owns a
    sidecar translation map and pins the exact Spanish blob it was reviewed
    against. If the canonical source moves, the locale build fails until the
    translation map is reviewed again. Structural HTML/CSS/JS therefore stays
    byte-for-byte canonical apart from explicit translated strings.
    """
    spec_path = snippet_path.with_suffix(".i18n.json")
    if not spec_path.is_file():
        raise RuntimeError(f"Missing canonical-mirror translation spec: {spec_path}")

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    source_rel = str(spec.get("source") or path).strip()
    if not source_rel or ".." in source_rel or not source_rel.startswith("snippets/"):
        raise RuntimeError(f"Invalid canonical-mirror source path: {source_rel!r}")

    source_path = _REPO_ROOT / "docs" / source_rel
    if not source_path.is_file():
        raise RuntimeError(f"Missing canonical Spanish snippet: {source_path}")

    payload = source_path.read_bytes()
    expected_sha = str(spec.get("source_blob_sha") or "").strip()
    actual_sha = _git_blob_sha(payload)
    if not expected_sha:
        raise RuntimeError(f"Missing source_blob_sha in canonical-mirror spec: {spec_path}")
    if actual_sha != expected_sha:
        raise RuntimeError(
            "Canonical Spanish snippet changed; review the locale translation before building: "
            f"{source_rel} expected {expected_sha}, found {actual_sha}"
        )

    replacements = spec.get("replacements")
    if not isinstance(replacements, dict) or not replacements:
        raise RuntimeError(f"Canonical-mirror spec has no replacements: {spec_path}")

    html = payload.decode("utf-8")
    missing: list[str] = []
    for source_text, translated_text in sorted(
        replacements.items(), key=lambda item: len(str(item[0])), reverse=True
    ):
        source_text = str(source_text)
        translated_text = str(translated_text)
        if source_text not in html:
            missing.append(source_text)
            continue
        html = html.replace(source_text, translated_text)

    if missing:
        preview = ", ".join(repr(item) for item in missing[:5])
        raise RuntimeError(
            f"Canonical-mirror replacements no longer match {source_rel}: {preview}"
        )

    forbidden = spec.get("forbidden_output_tokens", [])
    if not isinstance(forbidden, list):
        raise RuntimeError(f"forbidden_output_tokens must be a list: {spec_path}")
    leaked = [str(token) for token in forbidden if str(token) and str(token) in html]
    if leaked:
        preview = ", ".join(repr(item) for item in leaked[:5])
        raise RuntimeError(f"Canonical mirror still contains untranslated required tokens: {preview}")

    return html


def _series_stats(series_dirname: str) -> tuple[int, int, str]:
    base = _locale_root() / "series" / series_dirname.lower()
    presentation = base / "00_presentacion_serie.md"
    total = 0
    if presentation.is_file():
        source = re.sub(
            r"<!--.*?-->",
            "",
            presentation.read_text(encoding="utf-8"),
            flags=re.DOTALL,
        )
        total = len(re.findall(r"^###\s+", source, flags=re.MULTILINE))

    articles = sorted(
        p for p in base.glob("*.md") if p.name != "00_presentacion_serie.md"
    )
    done = len(articles)
    total = max(total, done)

    words = 0
    for article in articles:
        words += len(_strip_for_reading_time(article.read_text(encoding="utf-8")).split())
    minutes = max(1, round(words / _READING_WPM)) if words else 0
    rounded = max(5, round(minutes / 5) * 5) if minutes else 0
    duration = f"~{rounded} min" if rounded else "—"
    return done, total, duration


def render_include_html(path: str, **kwargs: object) -> str:
    """Render a translated locale snippet.

    There is intentionally no implicit fallback to docs/snippets. A missing
    translation must fail visibly in CI instead of leaking Spanish into another
    locale. A locale may opt into an explicit, SHA-pinned canonical mirror whose
    only permitted differences are reviewed string translations.
    """
    if not path or ".." in path:
        return "<!-- Invalid snippet path -->"

    snippet_path = _locale_root() / path
    if not snippet_path.is_file():
        return f"<!-- Missing locale snippet: {_locale()}:{path} -->"

    raw = snippet_path.read_text(encoding="utf-8")
    if raw.strip() == _CANONICAL_MIRROR_MARKER:
        html = _render_canonical_mirror(path, snippet_path)
    else:
        html = raw
    context = dict(kwargs)

    if "series_dir" in context:
        done, total, duration = _series_stats(str(context["series_dir"]))
        context.setdefault("progress_done", done)
        context.setdefault("progress_total", total)
        context.setdefault("progress_text", f"{done}/{total}" if total else "0/0")
        context.setdefault("data_progress", f"{done}/{total}" if total else "0/0")
        context.setdefault("aria_valuenow", done)
        context.setdefault("aria_valuemax", max(total, 1))
        context.setdefault("data_time", duration)
        context.setdefault("count_label", f"{total} chapters")
        context.setdefault("extra_rows", "")

    return _render_template(html, context)


def define_env(env) -> None:
    @env.macro
    def reading_time() -> str:
        markdown = env.markdown
        if not markdown:
            return ""
        minutes = _estimate_reading_minutes(markdown)
        return f"> ⏱️ **Reading time:** {minutes} min\n\n"

    @env.macro
    def include_html(path: str, **kwargs: object) -> str:
        return render_include_html(path, **kwargs)


def on_pre_page_macros(env) -> None:
    src_path = env.page.file.src_path.lower()
    if env.page.is_homepage:
        return
    if src_path.startswith("series/"):
        macro_call = "{{ reading_time() }}"
        if macro_call not in env.markdown:
            match = re.search(r"^#\s+.*$", env.markdown, re.MULTILINE)
            if match:
                pos = match.end()
                env.markdown = env.markdown[:pos] + "\n\n" + macro_call + env.markdown[pos:]
            else:
                env.markdown = macro_call + "\n\n" + env.markdown
