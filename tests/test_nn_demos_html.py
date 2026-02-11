from pathlib import Path

FILE = Path("drafts/series/fundamentos-IA-IAG/animaciones/all_animations.html")


def _read():
    return FILE.read_text(encoding="utf-8")


def test_tabs_container_has_data_anim_tabs():
    content = _read()
    assert 'class="nn-tabs" data-anim-tabs' in content


def test_demo_keys_namespaced():
    content = _read()
    assert 'data-demo="nn:linear"' in content
    assert 'data-demo="nn:sine"' in content
    assert 'data-demo="nn:exptan"' in content
