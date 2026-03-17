"""
generate_post_slides.py

Renderizador genérico: encuentra carousel.html en documentacion_interna/posts/
y exporta cada slide como PNG.

El carousel.html ES la fuente de verdad. Edítalo directamente para cambiar slides.
Para crear carousel.html desde cero: copiar documentacion_interna/posts/_template.html
y sustituir los .slide-section con el contenido del post. No existe build_carousels.py.

Uso:
    .venv/bin/python3.14 scripts/generate_post_slides.py
    .venv/bin/python3.14 scripts/generate_post_slides.py --series fundamentos-ia-cap2
    .venv/bin/python3.14 scripts/generate_post_slides.py --post post_1_embeddings
    .venv/bin/python3.14 scripts/generate_post_slides.py --preview

Formatos de carousel.html soportados:
    - Nuevo:  .slide-section[data-id] → .slide
    - Legado: .slide-section[data-index] → .slide-frame .slide
"""

import argparse
import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / "documentacion_interna" / "posts"
SLIDE_W = 1080


async def _render_carousel(page, carousel_path: Path, preview: bool):
    """Screenshot every slide in a carousel.html → PNGs in the same folder."""
    out_dir = carousel_path.parent

    await page.goto(carousel_path.as_uri(), wait_until="networkidle", timeout=30_000)
    await page.evaluate("() => document.fonts ? document.fonts.ready : Promise.resolve()")
    await page.wait_for_timeout(500)
    # Force full 1080×1080 render — override the JS setScale that shrinks slides for display
    await page.evaluate("document.documentElement.style.setProperty('--scale', '1')")

    # --- Nuevo formato: .slide-section[data-id] ---
    sections = await page.query_selector_all(".slide-section[data-id]")
    if sections:
        slides_info = []
        for s in sections:
            data_id = await s.get_attribute("data-id")
            slide_el = await s.query_selector(".slide")
            slides_info.append((data_id, slide_el))

    else:
        # --- Formato legado: .slide-section[data-index] (build_posts.py antiguo) ---
        sections = await page.query_selector_all(".slide-section[data-index]")
        slides_info = []
        for s in sections:
            idx = int(await s.get_attribute("data-index"))
            type_el = await s.query_selector(".si-type")
            stype = (await type_el.text_content()).strip() if type_el else "slide"
            slide_el = await s.query_selector(".slide-frame .slide")
            slides_info.append((f"{idx:02d}_{stype}", slide_el))

    if not slides_info:
        print(f"  [!] No se encontraron slides en {carousel_path.relative_to(ROOT)}")
        return

    if preview:
        slides_info = slides_info[:1]

    for name, slide_el in slides_info:
        if slide_el is None:
            print(f"  [!] Slide '{name}' sin elemento .slide — omitido")
            continue
        out_path = out_dir / f"{name}.png"
        await slide_el.screenshot(path=str(out_path), animations="disabled")
        print(f"    → {out_path.relative_to(ROOT)}")


async def run(series: str | None, post_filter: str | None, preview: bool):
    search_dir = POSTS_DIR / series if series else POSTS_DIR
    carousels = sorted(search_dir.rglob("carousel.html"))

    if post_filter:
        carousels = [c for c in carousels if post_filter in c.parent.name]

    if not carousels:
        print(f"No se encontraron carousel.html en {search_dir}")
        return

    total = len(carousels)
    print(f"\n[render] {total} carousel(s) encontrado(s)\n")

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": SLIDE_W, "height": 2000},
            device_scale_factor=2.0,
        )
        page = await context.new_page()

        for i, carousel_path in enumerate(carousels, 1):
            print(f"  [{i}/{total}] {carousel_path.parent.relative_to(POSTS_DIR)}")
            await _render_carousel(page, carousel_path, preview)

        await browser.close()

    print(f"\n[render] Listo\n")


def main():
    parser = argparse.ArgumentParser(
        description="Renderiza carousel.html → PNGs. Fuente de verdad: carousel.html de cada post."
    )
    parser.add_argument("--series", default=None, help="Filtrar por serie (ej: fundamentos-ia-cap2)")
    parser.add_argument("--post", default=None, help="Filtrar por nombre de carpeta de post")
    parser.add_argument("--preview", action="store_true", help="Solo primer slide de cada post")
    args = parser.parse_args()

    asyncio.run(run(args.series, args.post, args.preview))


if __name__ == "__main__":
    main()
