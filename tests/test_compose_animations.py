from pathlib import Path
import re

NN_OUT = Path("docs/snippets/animaciones/all_animations.html")
ML_OUT = Path("docs/snippets/animaciones/all_animations_extended.html")
AI_OUT = Path("docs/snippets/ia_ml_dl.html")
TIPOS_OUT = Path("docs/snippets/tipos_aprendizaje.html")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _assert_tab_contract(content: str) -> None:
    assert "data-tabs" in content
    assert content.count('role="tablist"') == 1
    tab_keys = set(re.findall(r'data-tab="([^"]+)"', content))
    panel_keys = set(re.findall(r'data-panel="([^"]+)"', content))
    assert tab_keys
    assert panel_keys
    assert tab_keys == panel_keys


def test_nn_output_has_tabs_and_namespaced_demos():
    content = _read(NN_OUT)
    _assert_tab_contract(content)
    assert "ta-tabs" in content
    assert "ta-tablist" in content
    assert "ta-tab" in content
    assert "ta-panel" in content
    assert 'data-demo="nn:linear"' in content
    assert 'data-demo="nn:sine"' in content
    assert 'data-demo="nn:exptan"' in content


def test_ml_output_has_tabs_and_namespaced_demos():
    content = _read(ML_OUT)
    _assert_tab_contract(content)
    assert "ta-tabs" in content
    assert "ta-tablist" in content
    assert "ta-tab" in content
    assert "ta-panel" in content
    assert 'data-demo="ml:tree"' in content
    assert 'data-demo="ml:nb"' in content
    assert 'data-demo="ml:kmeans"' in content


def test_ai_output_has_expected_container():
    content = _read(AI_OUT)
    _assert_tab_contract(content)
    assert 'class="ai-mat ta-demo ta-tabs"' in content
    assert 'data-default="ia"' in content
    assert "El paraguas: decidir y planificar" in content


def test_tipos_output_has_expected_container():
    content = _read(TIPOS_OUT)
    _assert_tab_contract(content)
    assert 'class="ai-tabs ta-demo ta-tabs"' in content
    assert 'data-default="sup"' in content
    assert "Supervisado" in content


def test_outputs_include_shared_branding():
    nn = _read(NN_OUT)
    ml = _read(ML_OUT)
    ai = _read(AI_OUT)
    tipos = _read(TIPOS_OUT)
    assert "ta-demo" in nn
    assert "ta-demo" in ml
    assert "ta-demo" in ai
    assert "ta-demo" in tipos
    assert "5SIGMAS · Animation Library" in nn
    assert "5SIGMAS · Animation Library" in ml
    assert "5SIGMAS · Animation Library" in ai
    assert "5SIGMAS · Animation Library" in tipos
    assert "--ta-brand-font" in nn
    assert "--ta-brand-font" in ml
    assert "--ta-brand-font" in ai
    assert "--ta-brand-font" in tipos
    assert "/assets/logo.svg" in nn
    assert "/assets/logo_white.svg" in nn
    assert "/assets/logo.svg" in ml
    assert "/assets/logo_white.svg" in ml
    assert "/assets/logo.svg" in ai
    assert "/assets/logo_white.svg" in ai
    assert "/assets/logo.svg" in tipos
    assert "/assets/logo_white.svg" in tipos
