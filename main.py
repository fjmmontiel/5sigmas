import os
try:
    import yaml
except ModuleNotFoundError:
    yaml = None
import math
import re

ANIMATION_SNIPPET_PREFIXES = (
    "snippets/fundamentos-ia/",
    "snippets/ia-pib-energia/",
    "snippets/datacenters-espacio/",
    "snippets/animaciones/",
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

def _render_template(html, context):
    def repl(match):
        key = match.group(1).strip()
        if key not in context:
            return match.group(0)
        return str(context[key])
    return re.sub(r"{{\s*([a-zA-Z0-9_]+)\s*}}", repl, html)

def define_env(env):
    """
    This is the hook for defining variables, macros and filters.

    - variables: the dictionary that contains the environment variables
    - macro: a decorator function, to declare a macro.
    """

    # Load podcasts data
    podcasts_file = os.path.join(os.path.dirname(__file__), 'docs/series/podcasts.yml')
    try:
        if yaml is None:
            raise ModuleNotFoundError("PyYAML is not installed")
        with open(podcasts_file, 'r', encoding='utf-8') as f:
            podcasts_data = yaml.safe_load(f)
    except Exception as e:
        print(f"Error loading podcasts.yml: {e}")
        podcasts_data = {}

    @env.macro
    def podcast_player(series_id):
        """
        Generates the HTML for the podcast player for a given series.
        """
        if series_id not in podcasts_data:
            return f'<div class="admonition warning"><p class="admonition-title">Warning</p><p>Podcast data not found for series: {series_id}</p></div>'

        data = podcasts_data[series_id]
        audio_file = data.get('audio_file', '')
        spotify_url = data.get('spotify_url', '')

        # Construct the HTML/Markdown
        # We use markdown="1" on the container to allow processing of the inner markdown (like the button)
        html = f"""
<div class="podcast-player" markdown="1">
<audio controls style="width: 100%;">
    <source src="/{audio_file}" type="audio/mpeg">
    Tu navegador no soporta el elemento de audio.
</audio>

<br>

[:simple-spotify: Escuchar en Spotify]({spotify_url}){{: .md-button .md-button--primary }}
</div>
"""
        return html

    @env.macro
    def video_gallery(series_dirname):
        """
        Generates HTML for all videos in docs/series/{series_dirname}/videos/
        """
        # Define path relative to the project root
        # We assume the structure is docs/series/{series_dirname}/videos
        videos_dir_rel = f'docs/series/{series_dirname}/videos'
        videos_dir_abs = os.path.join(os.path.dirname(__file__), videos_dir_rel)

        if not os.path.exists(videos_dir_abs):
            return f"<!-- No videos directory found at {videos_dir_rel} -->"

        video_files = [f for f in os.listdir(videos_dir_abs) if f.lower().endswith(('.mp4', '.webm', '.mov'))]
        video_files.sort()

        if not video_files:
            return f"<!-- No video files found in {videos_dir_rel} -->"

        html = '<div class="video-gallery" style="display: grid; gap: 20px; margin-top: 20px;">'
        for vid in video_files:
            # Construct the absolute web path
            # /series/{series_dirname}/videos/{vid}
            video_src = f"/series/{series_dirname}/videos/{vid}"
            
            # Clean up filename for display
            title = vid.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ')
            
            html += f"""
            <div class="video-container">
                <video controls style="width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <source src="{video_src}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <p style="text-align: center; font-size: 0.9em; color: var(--md-default-fg-color--light); margin-top: 5px;">{title}</p>
            </div>
            """
        html += '</div>'
        return html

    @env.macro
    def reading_time():
        """
        Returns a string with the estimated reading time of the current page.
        """
        markdown = env.markdown
        if not markdown:
            return ""

        # Count words (simple implementation)
        clean_text = re.sub(r'[#*`\-]', '', markdown)
        words = len(clean_text.split())
        
        # Average reading speed: 200 words per minute
        time = math.ceil(words / 200)
        
        if time < 1:
            time = 1
            
        return f"> ⏱️ **Tiempo de lectura:** {time} min\n\n"

    @env.macro
    def include_html(path, **kwargs):
        """
        Includes raw HTML snippets from the docs directory.
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

def on_pre_page_macros(env):
    """
    Hook to automatically prepend the reading_time macro to all pages.
    """
    # Only for pages in series/ directory
    if not env.page.file.src_path.lower().startswith('series/'):
        return

    if env.page.is_homepage:
        return

    # Prepend the macro call if not already present
    macro_call = "{{ reading_time() }}"
    if macro_call not in env.markdown:
        # Match the first H1 title (# Title)
        match = re.search(r'^#\s+.*$', env.markdown, re.MULTILINE)
        if match:
            # Insert after the title line
            pos = match.end()
            env.markdown = env.markdown[:pos] + "\n\n" + macro_call + env.markdown[pos:]
        else:
            # Fallback to prepending if no H1 found
            env.markdown = macro_call + "\n\n" + env.markdown
