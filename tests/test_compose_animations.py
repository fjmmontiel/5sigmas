from pathlib import Path
import re

NN_OUT = Path("docs/snippets/fundamentos-ia/all_animations.html")
ML_OUT = Path("docs/snippets/fundamentos-ia/all_animations_extended.html")
AI_OUT = Path("docs/snippets/fundamentos-ia/ia_ml_dl.html")
TIPOS_OUT = Path("docs/snippets/fundamentos-ia/tipos_aprendizaje.html")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _assert_tab_contract(content: str) -> None:
    assert "data-anim-tabs" in content
    assert "data-tabs" not in content
    assert len(re.findall(r'\s(?:role|data-role)="tablist"', content)) >= 1
    tab_keys = set(re.findall(r'data-tab="([^"]+)"', content))
    panel_keys = set(re.findall(r'data-panel="([^"]+)"', content))
    assert tab_keys
    assert panel_keys
    assert tab_keys == panel_keys


def test_nn_output_has_tabs_and_namespaced_demos():
    content = _read(NN_OUT)
    _assert_tab_contract(content)
    assert 'data-demo="nn:linear"' in content
    assert 'data-demo="nn:sine"' in content
    assert 'data-demo="nn:exptan"' in content


def test_ml_output_has_tabs_and_namespaced_demos():
    content = _read(ML_OUT)
    _assert_tab_contract(content)
    assert 'data-demo="ml:tree"' in content
    assert 'data-demo="ml:nb"' in content
    assert 'data-demo="ml:kmeans"' in content


def test_ai_output_has_expected_container():
    content = _read(AI_OUT)
    _assert_tab_contract(content)
    assert 'class="ai-mat ta-demo ta-tabs"' in content
    assert 'data-default="ia"' in content


def test_tipos_output_has_expected_container():
    content = _read(TIPOS_OUT)
    _assert_tab_contract(content)
    assert 'class="ta-learn ai-tabs ta-demo ta-tabs"' in content
    assert 'data-default="sup"' in content


def test_outputs_include_brand_tokens():
    nn = _read(NN_OUT)
    ml = _read(ML_OUT)
    ai = _read(AI_OUT)
    tipos = _read(TIPOS_OUT)
    assert "ta-demo" in nn
    assert "ta-demo" in ml
    assert "ta-demo" in ai
    assert "ta-demo" in tipos
    assert "--ta-brand-font" in nn
    assert "--ta-brand-font" in ml
    assert "--ta-brand-font" in ai
    assert "5SIGMAS · Animation Library" in nn or "5SIGMAS · Animation Library" in tipos


def test_fundamentos_snippets_do_not_embed_manual_shell():
    base = Path("docs/snippets/fundamentos-ia")
    for path in base.rglob("*.html"):
        content = _read(path)
        assert "anim-brand-shell" not in content
        assert "data-anim-shell" not in content
