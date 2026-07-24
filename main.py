import os
import math
import re

ANIMATION_SNIPPET_PREFIXES = (
    "snippets/fundamentos-ia/",
    "snippets/ia-pib-energia/",
    "snippets/datacenters-espacio/",
)
SHELL_EXCLUDED_SNIPPETS = {
    "snippets/5sigma.html",
    "snippets/series_cards.html",
    "snippets/series_meta.html",
}
def _is_animation_snippet(path):
    if not path:
        return False
    normalized = str(path).strip().replace("\\", "/")
    if any(normalized.startswith(prefix) for prefix in ANIMATION_SNIPPET_PREFIXES):
        return True
    return normalized.endswith("_anim.html")


def _normalize_on_off(value, default="off"):
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in ("on", "true", "1", "yes"):
        return "on"
    if normalized in ("off", "false", "0", "no"):
        return "off"
    return default


def _normalize_shell_mode(value, default="auto"):
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


def _normalize_contrast_mode(value, default="force"):
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in ("force", "auto", "off"):
        return normalized
    return default


def _resolve_fullscreen_mode(html, explicit_value=None):
    if explicit_value is not None:
        return _normalize_on_off(explicit_value, default="on")
    if re.search(r'data-anim-fullscreen\s*=\s*["\']?(off|false|0)["\']?', html, flags=re.IGNORECASE):
        return "off"
    if re.search(r'data-anim-fullscreen\s*=\s*["\']?(on|true|1)["\']?', html, flags=re.IGNORECASE):
        return "on"
    return "on"


def _resolve_contrast_mode(html, explicit_value=None):
    if explicit_value is not None:
        return _normalize_contrast_mode(explicit_value, default="force")
    match = re.search(r'data-anim-contrast\s*=\s*["\']?([a-z]+)["\']?', html, flags=re.IGNORECASE)
    if match:
        return _normalize_contrast_mode(match.group(1), default="force")
    return "force"


def _is_html_snippet(path):
    normalized = str(path or "").strip().replace("\\", "/")
    return normalized.startswith("snippets/") and normalized.endswith(".html")


def _has_existing_shell(html):
    checks = (
        "data-anim-shell",
        "class=\"anim-brand-shell",
        "class='anim-brand-shell",
    )
    return any(marker in html for marker in checks)


def _is_shell_excluded_snippet(path):
    normalized = str(path or "").strip().replace("\\", "/")
    return normalized in SHELL_EXCLUDED_SNIPPETS


def _should_wrap_with_shell(path, html, shell_mode="auto"):
    mode = _normalize_shell_mode(shell_mode, default="auto")
    if mode == "off":
        return False
    if _has_existing_shell(html):
        return False
    if mode == "on":
        return True
    if _is_shell_excluded_snippet(path):
        return False
    return _is_html_snippet(path) or _is_animation_snippet(path)


def _wrap_animation_shell(html, variant="default", fullscreen="off", contrast="force"):
    safe_variant = re.sub(r"[^a-zA-Z0-9_-]", "", str(variant or "default")) or "default"
    safe_fullscreen = _normalize_on_off(fullscreen, default="off")
    safe_contrast = _normalize_contrast_mode(contrast, default="force")
    button_hidden_attr = "" if safe_fullscreen == "on" else " hidden"
    return (
        f'<section class="anim-brand-shell" data-anim-shell data-anim-variant="{safe_variant}" '
        f'data-anim-fullscreen="{safe_fullscreen}" data-anim-contrast="{safe_contrast}">'
        '<div class="anim-brand-shell__toolbar">'
        f'<button type="button" class="anim-brand-shell__btn" data-anim-shell-open '
        f'aria-label="Abrir animacion en pantalla completa"{button_hidden_attr}>Pantalla completa</button>'
        "</div>"
        f'<div class="anim-brand-shell__viewport">{html}</div>'
        "</section>"
    )


def _count_series_total(series_dirname):
    series_dirname = series_dirname.lower()
    base_dir = os.path.join(os.path.dirname(__file__), "docs/series", series_dirname)
    series_file = os.path.join(base_dir, "00_presentacion_serie.md")
    if not os.path.isfile(series_file):
        print(f"[series-meta] Missing main series file: {series_file}")
        return 0

    with open(series_file, "r", encoding="utf-8") as f:
        content = f.read()

    content = re.sub(r'<!--.*?-->', '', content, flags=re.DOTALL)
    return len(re.findall(r'^###\s+', content, flags=re.MULTILINE))

def _count_series_done(series_dirname):
    series_dirname = series_dirname.lower()
    base_dir = os.path.join(os.path.dirname(__file__), "docs/series", series_dirname)
    if not os.path.isdir(base_dir):
        print(f"[series-meta] Missing series directory: {base_dir}")
        return 0

    done = 0
    for root, _, files in os.walk(base_dir):
        for filename in files:
            if not filename.endswith(".md"):
                continue
            if filename == "00_presentacion_serie.md":
                continue
            done += 1
    return done


_READING_WPM = 230  # must match hooks/reading_time.py


def _strip_for_reading_time(markdown):
    text = markdown or ""
    text = re.sub(r'<details[\s\S]*?</details>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\{\{[^}]+\}\}', '', text)
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    return text


def _estimate_reading_minutes(markdown):
    words = len(_strip_for_reading_time(markdown).split())
    return max(1, round(words / _READING_WPM))

def _series_reading_time(series_dirname):
    """Return a formatted reading time string (e.g. '~50 min') for published
    articles in the series, using the same word-count logic as reading_time.py.
    Only counts articles that exist on disk (published), not planned chapters."""
    series_dirname = series_dirname.lower()
    base_dir = os.path.join(os.path.dirname(__file__), "docs/series", series_dirname)
    if not os.path.isdir(base_dir):
        return "—"

    total_words = 0
    for root, _, files in os.walk(base_dir):
        for filename in sorted(files):
            if not filename.endswith(".md"):
                continue
            if filename == "00_presentacion_serie.md":
                continue
            filepath = os.path.join(root, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()
            total_words += len(_strip_for_reading_time(text).split())

    if total_words == 0:
        return "—"
    minutes = max(1, round(total_words / _READING_WPM))
    # Round to nearest 5 for cleaner display
    rounded = max(5, round(minutes / 5) * 5)
    return f"~{rounded} min"

def _render_template(html, context):
    def repl(match):
        key = match.group(1).strip()
        if key not in context:
            return match.group(0)
        return str(context[key])
    return re.sub(r"{{\s*([a-zA-Z0-9_]+)\s*}}", repl, html)


def render_include_html(path, **kwargs):
    """
    Render a docs snippet using the same contract as the include_html macro.
    Useful for scripts that need parity with MkDocs rendering.
    """
    if not path or ".." in path:
        return "<!-- Invalid snippet path -->"

    base_dir = os.path.join(os.path.dirname(__file__), "docs")
    snippet_path = os.path.join(base_dir, path)

    if not os.path.isfile(snippet_path):
        return f"<!-- Snippet not found: {path} -->"

    template_kwargs = dict(kwargs)
    anim_variant = template_kwargs.pop("anim_variant", "default")
    anim_fullscreen = template_kwargs.pop("anim_fullscreen", None)
    anim_shell = template_kwargs.pop("anim_shell", "auto")
    anim_contrast = template_kwargs.pop("anim_contrast", None)

    with open(snippet_path, "r", encoding="utf-8") as f:
        html = f.read()

    if template_kwargs and "series_dir" in template_kwargs:
        done = _count_series_done(template_kwargs["series_dir"])
        total = _count_series_total(template_kwargs["series_dir"])
        total = max(total, done)
        if total == 0:
            progress_text = "0/0"
            aria_max = 1
        else:
            progress_text = f"{done}/{total}"
            aria_max = total
        template_kwargs.setdefault("progress_done", done)
        template_kwargs.setdefault("progress_total", total)
        template_kwargs.setdefault("progress_text", progress_text)
        template_kwargs.setdefault("data_progress", progress_text)
        template_kwargs.setdefault("aria_valuenow", done)
        template_kwargs.setdefault("aria_valuemax", aria_max)
        template_kwargs.setdefault("data_time", _series_reading_time(template_kwargs["series_dir"]))
        template_kwargs.setdefault("count_label", f"{total} capítulos")
        template_kwargs.setdefault("extra_rows", "")

    if template_kwargs:
        html = _render_template(html, template_kwargs)

    if _should_wrap_with_shell(path, html, shell_mode=anim_shell):
        fullscreen_mode = _resolve_fullscreen_mode(html, explicit_value=anim_fullscreen)
        contrast_mode = _resolve_contrast_mode(html, explicit_value=anim_contrast)
        return _wrap_animation_shell(
            html,
            variant=anim_variant,
            fullscreen=fullscreen_mode,
            contrast=contrast_mode,
        )

    return html

def define_env(env):
    """
    This is the hook for defining variables, macros and filters.

    - variables: the dictionary that contains the environment variables
    - macro: a decorator function, to declare a macro.
    """

    @env.macro
    def reading_time():
        """
        Returns a string with the estimated reading time of the current page.
        Uses the same stripping logic and WPM as hooks/reading_time.py so that
        per-article times are consistent with the series widget total.
        """
        markdown = env.markdown
        if not markdown:
            return ""

        minutes = _estimate_reading_minutes(markdown)
        return f"> ⏱️ **Tiempo de lectura:** {minutes} min\n\n"

    @env.macro
    def tech_article_meta():
        """
        Render article metadata using the same visual family as series_meta.
        """
        markdown = env.markdown
        if not markdown:
            return ""

        page_meta = getattr(env.page, "meta", {}) or {}
        raw_state = str(
            page_meta.get("article_state")
            or page_meta.get("status_label")
            or page_meta.get("state")
            or "draft"
        ).strip().lower()
        state_map = {
            "draft": ("draft", "Borrador"),
            "borrador": ("draft", "Borrador"),
            "ready": ("ready", "Listo"),
            "listo": ("ready", "Listo"),
            "published": ("complete", "Publicado"),
            "publicado": ("complete", "Publicado"),
            "complete": ("complete", "Publicado"),
            "completed": ("complete", "Publicado"),
        }
        data_state, status_label = state_map.get(raw_state, ("draft", raw_state.capitalize() or "Borrador"))
        minutes = _estimate_reading_minutes(markdown)
        return render_include_html(
            "snippets/series_meta.html",
            anim_shell="off",
            data_state=data_state,
            data_level="tecnico",
            status_label=status_label,
            level_label="Técnico",
            data_time=f"{minutes} min",
            count_label="Artículo técnico",
            extra_rows="",
        )

    @env.macro
    def include_html(path, **kwargs):
        """
        Includes raw HTML snippets from the docs directory.
        """
        return render_include_html(path, **kwargs)

def on_pre_page_macros(env):
    """
    Hook to automatically prepend the reading_time macro to all pages.
    """
    src_path = env.page.file.src_path.lower()

    if env.page.is_homepage:
        return

    if src_path.startswith('series/'):
        macro_call = "{{ reading_time() }}"
        if macro_call not in env.markdown:
            match = re.search(r'^#\s+.*$', env.markdown, re.MULTILINE)
            if match:
                pos = match.end()
                env.markdown = env.markdown[:pos] + "\n\n" + macro_call + env.markdown[pos:]
            else:
                env.markdown = macro_call + "\n\n" + env.markdown
        return

    if src_path.startswith('articulos-tecnicos/') and not src_path.endswith('index.md'):
        macro_call = "{{ tech_article_meta() }}"
        if macro_call not in env.markdown:
            match = re.search(r'^#\s+.*$', env.markdown, re.MULTILINE)
            if match:
                pos = match.end()
                env.markdown = env.markdown[:pos] + "\n\n" + macro_call + env.markdown[pos:]
            else:
                env.markdown = macro_call + "\n\n" + env.markdown
