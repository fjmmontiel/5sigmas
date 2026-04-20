"""
generate_post_slides.py

Renderizador genérico: encuentra carousel.html en distribution/linkedin/posts/
y exporta cada slide como PNG y/o PDF.

El carousel.html ES la fuente de verdad. Edítalo directamente para cambiar slides.
Para crear carousel.html desde cero: copiar distribution/linkedin/templates/_template.html
y sustituir los .slide-section con el contenido del post. No existe build_carousels.py.

Uso:
    .venv/bin/python3.14 scripts/generate_post_slides.py
    .venv/bin/python3.14 scripts/generate_post_slides.py --series fundamentos-ia-cap2
    .venv/bin/python3.14 scripts/generate_post_slides.py --post post_1_embeddings
    .venv/bin/python3.14 scripts/generate_post_slides.py --preview
    .venv/bin/python3.14 scripts/generate_post_slides.py --pdf          # PNG + PDF
    .venv/bin/python3.14 scripts/generate_post_slides.py --pdf-only     # solo PDF

Formatos de carousel.html soportados:
    - Nuevo:  .slide-section[data-id] → .slide
    - Legado: .slide-section[data-index] → .slide-frame .slide
"""

import argparse
import asyncio
import sys
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

# Importar validador para ejecutarlo antes de renderizar
sys.path.insert(0, str(Path(__file__).parent))
from validate_carousels import validate_file

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "distribution" / "linkedin" / "posts"
PDFS_DIR = ROOT / "exports" / "pdfs"
PDFS_V2_DIR = ROOT / "exports" / "pdfs_v2"

SERIES_PREFIX = {
    "from-cave-to-agi": "cave-agi",
    "multimodalidad-iag": "mm-iag",
    "modelos-razonadores": "mod-razon",
}


def _pulido_pdf_name(carousel_path: Path) -> str:
    """Derive canonical PDF filename from post path.

    Pattern: <prefix>_cNpN_slug.pdf
    Example: mm-iag_c2p2_imagebind-transitividad.pdf
    """
    rel = carousel_path.parent.relative_to(POSTS_DIR)
    parts = rel.parts  # e.g. ('multimodalidad-iag', 'cap1', 'post_1_mapa_campo')
    if len(parts) < 3:
        return f"{rel.name}.pdf"
    series, cap, post = parts[0], parts[1], parts[2]
    prefix = SERIES_PREFIX.get(series, series[:8])
    cap_n = cap.replace("cap", "")
    post_parts = post.split("_", 2)  # ['post', '1', 'slug']
    post_n = post_parts[1] if len(post_parts) > 1 else "1"
    slug = post_parts[2].replace("_", "-") if len(post_parts) > 2 else post
    return f"{prefix}_c{cap_n}p{post_n}_{slug}.pdf"
SLIDE_W = 1080


async def _render_carousel(page, carousel_path: Path, preview: bool, v2: bool = False, pulido: bool = False):
    """Screenshot every slide in a carousel → PNGs.
    v2=True     → salida en <post>/v2/
    pulido=True → salida en <post>/  (misma carpeta que carousel_pulido.html)"""
    if v2:
        out_dir = carousel_path.parent / "v2"
    else:
        out_dir = carousel_path.parent
    if v2:
        out_dir.mkdir(exist_ok=True)
    slides = await _collect_slides(page, carousel_path)

    if not slides:
        print(f"  [!] No se encontraron slides en {carousel_path.relative_to(ROOT)}")
        return

    if preview:
        slides = slides[:1]

    for name, _, slide_el in slides:
        if slide_el is None:
            print(f"  [!] Slide '{name}' sin elemento .slide — omitido")
            continue
        out_path = out_dir / f"{name}.png"
        await slide_el.screenshot(path=str(out_path), animations="disabled")
        print(f"    → {out_path.relative_to(ROOT)}")


async def _collect_slides(page, carousel_path: Path):
    """Load carousel and return [(name, section_el, slide_el)] for each slide."""
    await page.goto(carousel_path.as_uri(), wait_until="networkidle", timeout=30_000)
    await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
    await page.wait_for_timeout(500)
    await page.evaluate("document.documentElement.style.setProperty('--scale', '1')")

    sections = await page.query_selector_all(".slide-section[data-id]")
    if sections:
        result = []
        for s in sections:
            data_id = await s.get_attribute("data-id")
            slide_el = await s.query_selector(".slide")
            result.append((data_id, s, slide_el))
        return result

    sections = await page.query_selector_all(".slide-section[data-index]")
    result = []
    for s in sections:
        idx = int(await s.get_attribute("data-index"))
        type_el = await s.query_selector(".si-type")
        stype = (await type_el.text_content()).strip() if type_el else "slide"
        slide_el = await s.query_selector(".slide-frame .slide")
        result.append((f"{idx:02d}_{stype}", s, slide_el))
    return result


async def _render_carousel_pdf(page, carousel_path: Path, v2: bool = False, pulido: bool = False):
    """Render all slides as a single PDF at maximum quality.

    Output (default): exports/pdfs/<serie>/<cap>/<post>.pdf
    Output (v2):      exports/pdfs_v2/<serie>/<cap>/<post>.pdf
    Output (pulido):  <post>/<prefix>_cNpN_slug.pdf
    Each slide is rendered in an isolated HTML page to guarantee correct
    1080×1080 layout — no position:fixed tricks that break in Chromium print mode.
    """
    from pypdf import PdfReader, PdfWriter

    if pulido:
        out_path = carousel_path.parent / _pulido_pdf_name(carousel_path)
    elif v2:
        rel = carousel_path.parent.relative_to(POSTS_DIR)
        out_dir = PDFS_V2_DIR / rel.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{rel.name}.pdf"
    else:
        rel = carousel_path.parent.relative_to(POSTS_DIR)
        out_dir = PDFS_DIR / rel.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{rel.name}.pdf"

    # Load original page to extract CSS and slide HTML
    await page.goto(carousel_path.as_uri(), wait_until="networkidle", timeout=30_000)
    await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
    await page.wait_for_timeout(500)

    # Grab all stylesheet links + inline <style> blocks from <head>
    head_css = await page.evaluate("""() =>
        [...document.querySelectorAll('link, style')].map(el => el.outerHTML).join('\\n')
    """)

    # Collect slide sections (new format first, then legacy)
    sections = await page.query_selector_all(".slide-section[data-id]")
    if sections:
        slides_data = []
        for s in sections:
            name = await s.get_attribute("data-id")
            html = await page.evaluate("(el) => el.outerHTML", s)
            slides_data.append((name, html))
    else:
        sections = await page.query_selector_all(".slide-section[data-index]")
        slides_data = []
        for s in sections:
            idx = int(await s.get_attribute("data-index"))
            type_el = await s.query_selector(".si-type")
            stype = (await type_el.text_content()).strip() if type_el else "slide"
            html = await page.evaluate("(el) => el.outerHTML", s)
            slides_data.append((f"{idx:02d}_{stype}", html))

    if not slides_data:
        print(f"  [!] No se encontraron slides en {carousel_path.relative_to(ROOT)}")
        return

    writer = PdfWriter()
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        for name, section_html in slides_data:
            # Build a standalone 1080×1080 HTML page with only this slide.
            # set_content() keeps the browser context (fonts cached, viewport intact).
            body_bg = "#f7f9fc" if (v2 or pulido) else "#0b1220"
            slide_page = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
{head_css}
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{
    margin: 0; padding: 0;
    width: 1080px; height: 1080px;
    overflow: hidden;
    background: {body_bg};
    font-family: "Inter","Avenir Next","Segoe UI",Arial,sans-serif;
}}
/* Strip carousel chrome, let slide render at its natural content height */
.slide-section {{
    display: flex !important;
    position: static !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    width: 1080px !important;
    height: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    gap: 0 !important;
}}
.slide-frame {{
    width: 1080px !important;
    transform: none !important;
    margin: 0 !important;
    flex-shrink: 0 !important;
}}
/* Hide navigation dots and slide-info chrome */
.dots-bar, .slide-info {{ display: none !important; }}
</style>
</head>
<body>
{section_html}
</body>
</html>"""
            await page.set_content(slide_page, wait_until="networkidle")
            await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
            await page.evaluate("document.documentElement.style.setProperty('--scale', '1')")
            await page.wait_for_timeout(250)

            # Measure the slide's natural rendered height so the PDF page
            # matches exactly — same proportions as the PNG screenshots.
            slide_h = await page.evaluate(
                "() => document.querySelector('.slide-section')?.getBoundingClientRect().height || 1080"
            )
            slide_h = max(int(slide_h), 100)

            tmp_pdf = tmp / f"{name}.pdf"
            await page.pdf(
                path=str(tmp_pdf),
                width="1080px",
                height=f"{slide_h}px",
                print_background=True,
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
            )

            reader = PdfReader(str(tmp_pdf))
            if reader.pages:
                writer.add_page(reader.pages[0])

    with open(out_path, "wb") as f:
        writer.write(f)
    print(f"    → {out_path.relative_to(ROOT)} ({len(slides_data)} páginas)")


def _validate_all(carousels: list[Path]) -> bool:
    """Valida todos los carousels. Retorna True si todos pasan."""
    print(f"\n[validate] Verificando {len(carousels)} carousel(s)...\n")
    total_fails = 0
    for c in carousels:
        fails, _ = validate_file(c)
        total_fails += fails
    if total_fails:
        print(f"\n[validate] ✗ {total_fails} error(s) encontrado(s). Corrige antes de renderizar.\n")
        return False
    print(f"[validate] ✓ Todo correcto — iniciando render\n")
    return True


async def run(
    series: str | None,
    post_filter: str | None,
    preview: bool,
    skip_validation: bool,
    pdf: bool,
    pdf_only: bool,
    v2: bool = False,
    pulido: bool = False,
):
    if pulido:
        carousel_name = "carousel_pulido.html"
    elif v2:
        carousel_name = "carousel_v2.html"
    else:
        carousel_name = "carousel.html"
    search_dir = POSTS_DIR / series if series else POSTS_DIR
    carousels = sorted(search_dir.rglob(carousel_name))

    if post_filter:
        carousels = [c for c in carousels if post_filter in c.parent.name]

    if not carousels:
        print(f"No se encontraron carousel.html en {search_dir}")
        return

    if not skip_validation and not _validate_all(carousels):
        sys.exit(1)

    total = len(carousels)
    render_png = not pdf_only
    render_pdf = pdf or pdf_only

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        try:
            # --- PNG pass (device_scale_factor=2 para alta resolución) ---
            if render_png:
                print(f"\n[png] {total} carousel(s)\n")
                context = await browser.new_context(
                    viewport={"width": SLIDE_W, "height": 2000},
                    device_scale_factor=2.0,
                )
                page = await context.new_page()
                for i, carousel_path in enumerate(carousels, 1):
                    print(f"  [{i}/{total}] {carousel_path.parent.relative_to(POSTS_DIR)}")
                    await _render_carousel(page, carousel_path, preview, v2=v2, pulido=pulido)
                await context.close()

            # --- PDF pass (device_scale_factor=3, máxima calidad de imágenes embebidas) ---
            if render_pdf:
                if pulido:
                    pdf_label = "[pdf_pulido]"
                elif v2:
                    pdf_label = "[pdf_v2]"
                else:
                    pdf_label = "[pdf]"
                print(f"\n{pdf_label} {total} carousel(s)\n")
                pdf_context = await browser.new_context(
                    viewport={"width": SLIDE_W, "height": SLIDE_W},
                    device_scale_factor=3.0,
                )
                pdf_page = await pdf_context.new_page()
                for i, carousel_path in enumerate(carousels, 1):
                    print(f"  [{i}/{total}] {carousel_path.parent.relative_to(POSTS_DIR)}")
                    await _render_carousel_pdf(pdf_page, carousel_path, v2=v2, pulido=pulido)
                await pdf_context.close()
        finally:
            await browser.close()

    print(f"\n[render] Listo\n")


def main():
    parser = argparse.ArgumentParser(
        description="Renderiza carousel.html → PNGs y/o PDF. Fuente de verdad: carousel.html de cada post."
    )
    parser.add_argument("--series", default=None, help="Filtrar por serie (ej: fundamentos-ia-cap2)")
    parser.add_argument("--post", default=None, help="Filtrar por nombre de carpeta de post")
    parser.add_argument("--preview", action="store_true", help="Solo primer slide de cada post")
    parser.add_argument("--skip-validation", action="store_true", help="Omitir validación previa (no recomendado)")
    parser.add_argument("--pdf", action="store_true", help="Generar también carousel.pdf (vector, máxima calidad)")
    parser.add_argument("--pdf-only", action="store_true", help="Generar solo carousel.pdf, sin PNGs")
    parser.add_argument("--v2", action="store_true", help="Usar carousel_v2.html (tema light) — PNGs en <post>/v2/, PDFs en exports/pdfs_v2/")
    parser.add_argument("--pulido", action="store_true", help="Usar carousel_pulido.html (SVE-native light) — PNGs en <post>/, PDF <prefix>_cNpN_slug.pdf junto al carousel")
    args = parser.parse_args()

    asyncio.run(run(args.series, args.post, args.preview, args.skip_validation, args.pdf, args.pdf_only, args.v2, args.pulido))


if __name__ == "__main__":
    main()
