from pathlib import Path

FILE = Path("drafts/series/fundamentos-IA-IAG/animaciones/all_animations_extended.html")


def _read():
    return FILE.read_text(encoding="utf-8")


def test_layout_equal_columns_and_min_width():
    content = _read()
    assert "grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);" in content
    assert "min-width: 0;" in content


def test_tree_canvas_uses_min_width():
    content = _read()
    assert "min-width: 980px;" in content
    assert "max(100%, 980px)" not in content


def test_kmeans_assign_not_duplicated():
    content = _read()
    assert "if(st.phase === \"assign\") assignKMeans(st);" not in content


def test_nb_step_initialized():
    content = _read()
    assert "step:0," in content


def test_aux_html_container_present():
    content = _read()
    assert "data-aux-html" in content
