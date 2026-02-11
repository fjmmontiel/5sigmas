from pathlib import Path
import importlib.util

SCRIPT = Path("scripts/scaffold_tabbed_animation.py")


def _load_module():
    spec = importlib.util.spec_from_file_location("scaffold_tabbed_animation", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_slug_normalizes_name():
    mod = _load_module()
    assert mod._slug("Mi Demo v1") == "mi-demo-v1"


def test_render_replaces_title_and_include_path():
    mod = _load_module()
    template = "{{ include_html(\"snippets/<path>.html\") }}\n<h2>Titulo de la animacion</h2>\n"
    rendered = mod._render(template, "demo-x", "Demo X")
    assert 'include_html("snippets/animaciones/demo-x.html")' in rendered
    assert "<h2>Demo X</h2>" in rendered


def test_load_template_supports_tabs_and_generic():
    mod = _load_module()
    tabs = mod._load_template("tabs")
    generic = mod._load_template("generic")
    assert "ta-tabs" in tabs
    assert "ta-generic" in generic
