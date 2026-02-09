from pathlib import Path


def _read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def test_make_build_runs_animation_pipeline():
    content = _read("Makefile")
    assert "build: install compose-animations check-animation-branding" in content


def test_github_actions_uses_make_build():
    content = _read(".github/workflows/deploy-pages.yml")
    assert "run: make build" in content


def test_animation_shell_has_footer_and_brand_font():
    content = _read("docs/stylesheets/extra.css")
    assert ".anim-brand-shell::before" in content
    assert "--anim-brand-font" in content


def test_mkdocs_palette_uses_material_media_entries():
    content = _read("mkdocs.yml")
    assert 'media: "(prefers-color-scheme: light)"' in content
    assert 'media: "(prefers-color-scheme: dark)"' in content
    assert "custom_dir: overrides" not in content


def test_snippet_theme_sync_rules_exist():
    content = _read("docs/stylesheets/extra.css")
    assert '[data-md-color-scheme="default"] :is(.ta-demo, .nn-demo, .ml-demo, .ai-mat, .ai-tabs, .sigma-graphic, .sigmas-dcspace)' in content
    assert '[data-md-color-scheme="slate"] :is(.ta-demo, .nn-demo, .ml-demo, .ai-mat, .ai-tabs, .sigma-graphic, .sigmas-dcspace)' in content
    assert '[data-md-color-scheme="default"] .sigmas-dcspace' in content
