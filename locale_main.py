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

from hooks.reading_time import _inject_mobile_native

_READING_WPM = 230
_REPO_ROOT = Path(__file__).resolve().parent
_CANONICAL_MIRROR_MARKER = "<!-- 5sigmas-canonical-mirror -->"
_SECURITY_ANIMATION_PREFIX = "snippets/seguridad-ia/"


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


def _normalize_on_off(value: object | None, default: str = "off") -> str:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in ("on", "true", "1", "yes"):
        return "on"
    if normalized in ("off", "false", "0", "no"):
        return "off"
    return default


def _normalize_shell_mode(value: object | None, default: str = "auto") -> str:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in ("auto", "on", "off"):
        return normalized
    if normalized in ("true", "1", "yes"):
        return "on"
    if normalized in ("false", "0", "no"):
        return "off"
    return default


def _normalize_contrast_mode(value: object | None, default: str = "force") -> str:
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in ("force", "auto", "off"):
        return normalized
    return default


def _resolve_fullscreen_mode(html: str, explicit_value: object | None = None) -> str:
    if explicit_value is not None:
        return _normalize_on_off(explicit_value, default="on")
    if re.search(r'data-anim-fullscreen\s*=\s*["\']?(off|false|0)["\']?', html, flags=re.IGNORECASE):
        return "off"
    if re.search(r'data-anim-fullscreen\s*=\s*["\']?(on|true|1)["\']?', html, flags=re.IGNORECASE):
        return "on"
    return "on"


def _resolve_contrast_mode(html: str, explicit_value: object | None = None) -> str:
    if explicit_value is not None:
        return _normalize_contrast_mode(explicit_value, default="force")
    match = re.search(r'data-anim-contrast\s*=\s*["\']?([a-z]+)["\']?', html, flags=re.IGNORECASE)
    if match:
        return _normalize_contrast_mode(match.group(1), default="force")
    return "force"


def _has_existing_shell(html: str) -> bool:
    return any(
        marker in html
        for marker in (
            "data-anim-shell",
            'class="anim-brand-shell',
            "class='anim-brand-shell",
        )
    )


def _should_wrap_locale_shell(path: str, html: str, shell_mode: object | None = "auto") -> bool:
    """Match the Spanish animation shell only for the requalified Security scope.

    The previous locale renderer returned raw snippets, which made ES and EN render
    different interaction/chrome for the same visual. Scope this repair to Security
    so Datacenters and earlier reference series remain untouched while requalification
    proceeds series by series.
    """
    mode = _normalize_shell_mode(shell_mode, default="auto")
    if mode == "off" or _has_existing_shell(html):
        return False
    if mode == "on":
        return True
    normalized = str(path or "").strip().replace("\\", "/")
    return normalized.startswith(_SECURITY_ANIMATION_PREFIX) and normalized.endswith(".html")


def _wrap_animation_shell(
    html: str,
    variant: object = "default",
    fullscreen: object = "off",
    contrast: object = "force",
) -> str:
    safe_variant = re.sub(r"[^a-zA-Z0-9_-]", "", str(variant or "default")) or "default"
    safe_fullscreen = _normalize_on_off(fullscreen, default="off")
    safe_contrast = _normalize_contrast_mode(contrast, default="force")
    button_hidden_attr = "" if safe_fullscreen == "on" else " hidden"
    return (
        f'<section class="anim-brand-shell" data-anim-shell data-anim-variant="{safe_variant}" '
        f'data-anim-fullscreen="{safe_fullscreen}" data-anim-contrast="{safe_contrast}">'
        '<div class="anim-brand-shell__toolbar">'
        f'<button type="button" class="anim-brand-shell__btn" data-anim-shell-open '
        f'aria-label="Open animation in fullscreen"{button_hidden_attr}>Fullscreen</button>'
        "</div>"
        f'<div class="anim-brand-shell__viewport">{html}</div>'
        "</section>"
    )


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
    anim_variant = context.pop("anim_variant", "default")
    anim_fullscreen = context.pop("anim_fullscreen", None)
    anim_shell = context.pop("anim_shell", "auto")
    anim_contrast = context.pop("anim_contrast", None)

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

    rendered = _render_template(html, context)
    # Locale snippets are expanded by mkdocs-macros before the final page hook.
    # Inject Series 5's mobile-native projection here as well so EN cannot miss
    # the semantic ~390px primary surface even if hook ordering differs.
    rendered, _ = _inject_mobile_native(
        rendered,
        {"extra": {"content_language": _locale()}},
        final_document=False,
    )
    if _should_wrap_locale_shell(path, rendered, shell_mode=anim_shell):
        return _wrap_animation_shell(
            rendered,
            variant=anim_variant,
            fullscreen=_resolve_fullscreen_mode(rendered, explicit_value=anim_fullscreen),
            contrast=_resolve_contrast_mode(rendered, explicit_value=anim_contrast),
        )
    return rendered


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
