from pathlib import Path


def _read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def test_make_build_runs_animation_pipeline():
    content = _read("Makefile")
    assert "build: install check-animation-branding" in content


def test_github_actions_uses_make_build():
    content = _read(".github/workflows/deploy-pages.yml")
    assert "run: make build" in content


def test_animation_shell_has_footer_and_brand_font():
    content = _read("docs/stylesheets/extra.css")
    assert ".anim-brand-shell::before" in content
    assert "--anim-brand-font" in content
    assert ".anim-brand-shell__viewport" in content
    assert ".anim-shell-modal" in content


def test_mkdocs_uses_native_material_palette_toggle():
    content = _read("mkdocs.yml")
    assert "scheme: default" in content
    assert "scheme: slate" in content
    assert "assets/javascripts/theme-sync.js" not in content
    assert "assets/javascripts/animation-shell.js" in content


def test_snippet_theme_sync_rules_exist():
    content = _read("docs/stylesheets/extra.css")
    assert '[data-md-color-scheme="default"] :is(.ta-demo, .nn-demo, .ml-demo, .ai-mat, .ai-tabs, .sigma-graphic, .sigmas-dcspace)' in content
    assert '[data-md-color-scheme="slate"] :is(.ta-demo, .nn-demo, .ml-demo, .ai-mat, .ai-tabs, .sigma-graphic, .sigmas-dcspace)' in content
    assert '[data-md-color-scheme="default"] .sigmas-dcspace' in content


def test_two_boilerplates_exist():
    tabs = Path("docs/assets/templates/animation_boilerplate_tabs.html")
    generic = Path("docs/assets/templates/animation_boilerplate_generic.html")
    assert tabs.is_file()
    assert generic.is_file()
    assert 'data-anim-contrast="force"' in tabs.read_text(encoding="utf-8")
    assert 'data-anim-contrast="force"' in generic.read_text(encoding="utf-8")
    assert 'data-anim-fullscreen="on"' in tabs.read_text(encoding="utf-8")
    assert 'data-anim-fullscreen="on"' in generic.read_text(encoding="utf-8")
