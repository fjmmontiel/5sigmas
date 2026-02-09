from pathlib import Path
import importlib.util

SCRIPT = Path("scripts/scaffold_tabbed_animation.py")


def _load_module():
    spec = importlib.util.spec_from_file_location("scaffold_tabbed_animation", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_transform_content_rewrites_prefix_and_namespace():
    mod = _load_module()
    base = (
        '<div class="nn-tabs">\n'
        '  <div class="nn-demo" data-demo="nn:linear"></div>\n'
        '  <script>TabbedAnimations.registerNamespace("nn", () => ({}));</script>\n'
        '</div>\n'
    )
    updated = mod.transform_content(base, "nn", "nn", "tabx", "tabx")
    assert "nn-" not in updated
    assert "nn:" not in updated
    assert "registerNamespace(\"nn\"" not in updated
    assert "tabx-tabs" in updated
    assert "data-demo=\"tabx:linear\"" in updated
    assert "registerNamespace(\"tabx\"" in updated
