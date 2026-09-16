#!/usr/bin/env python3
"""Deterministically render the Spanish Security series poster.

This is a repair source for the published `seguridad-ia/00_presentacion_serie.jpg`.
It follows the site's existing compact-video visual language: 1920x1080, Lato,
dark technical canvas, teal mechanism diagram, and explicit safe-area checks.

The previous authored JPEG baked the final line below the image boundary. This
renderer keeps all copy inside a measurable safe area instead of relying on CSS
cropping or shrinking text at runtime.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


W, H = 1920, 1080
BG_LEFT = (13, 27, 43)
BG_RIGHT = (9, 22, 35)
WHITE = (247, 249, 252, 255)
MUTED = (156, 171, 186, 255)
TEAL = (40, 191, 177, 255)
PALE = (144, 205, 199, 215)
FONT_REG = Path("/usr/share/fonts/truetype/lato/Lato-Regular.ttf")
FONT_HEAVY = Path("/usr/share/fonts/truetype/lato/Lato-Heavy.ttf")
HEADLINE = ["La seguridad", "se decide", "entre lo que", "el sistema lee", "y lo que puede"]
DEFAULT_OUTPUT = Path("docs/series/seguridad-ia/00_presentacion_serie.jpg")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    if not path.is_file():
        raise RuntimeError(f"Required site font is missing: {path}")
    return ImageFont.truetype(str(path), size)


def canvas() -> Image.Image:
    image = Image.new("RGBA", (W, H), BG_LEFT + (255,))
    draw = ImageDraw.Draw(image)
    for x in range(W):
        mix = x / (W - 1)
        rgb = tuple(round(a * (1 - mix) + b * mix) for a, b in zip(BG_LEFT, BG_RIGHT))
        draw.line((x, 0, x, H), fill=rgb + (255,))

    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((1120, 80, 1980, 940), fill=(24, 202, 178, 32))
    glow = glow.filter(ImageFilter.GaussianBlur(85))
    return Image.alpha_composite(image, glow)


def render(output: Path) -> None:
    image = canvas()
    draw = ImageDraw.Draw(image)
    label = font(FONT_REG, 25)
    headline = font(FONT_HEAVY, 132)
    micro = font(FONT_REG, 15)

    draw.text((130, 64), "SEGURIDAD EN IA · SERIE", font=label, fill=MUTED)

    x0, y0 = 130, 164
    ascent, descent = headline.getmetrics()
    line_h = ascent + descent + 20
    boxes = []
    for i, text in enumerate(HEADLINE):
        y = y0 + i * line_h
        draw.text((x0, y), text, font=headline, fill=WHITE)
        boxes.append(draw.textbbox((x0, y), text, font=headline))

    # Fail closed if future copy/font changes can clip or collide with the visual.
    if max(box[3] for box in boxes) > H - 40:
        raise RuntimeError(f"Headline violates bottom safe area: {boxes[-1]}")
    if max(box[2] for box in boxes) > 1120:
        raise RuntimeError(f"Headline violates diagram safe area: {max(box[2] for box in boxes)}")

    panel = (1240, 220, 1810, 820)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle((1200, 180, 1850, 860), radius=95, fill=(24, 202, 178, 35))
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(30)))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(panel, radius=66, fill=(9, 69, 72, 210), outline=(31, 168, 157, 220), width=4)
    draw.rounded_rectangle((1282, 262, 1768, 778), radius=48, fill=(7, 58, 64, 180), outline=(93, 194, 184, 185), width=3)
    draw.rounded_rectangle((1325, 310, 1725, 730), radius=22, fill=(7, 55, 61, 150), outline=(66, 160, 155, 100), width=2)

    muted_teal = (75, 156, 151, 200)
    draw.line([(1360, 355), (1510, 305), (1685, 355)], fill=muted_teal, width=4)
    draw.line([(1360, 355), (1360, 680), (1700, 680), (1700, 355)], fill=(49, 143, 138, 140), width=3)

    draw.rounded_rectangle((1355, 415, 1480, 590), radius=18, fill=(12, 93, 88, 215))
    for y in (455, 505, 555):
        draw.line([(1390, y), (1450, y)], fill=TEAL, width=6)
    draw.ellipse((1410, 365, 1442, 397), fill=(41, 196, 181, 240))

    draw.rounded_rectangle((1605, 430, 1710, 555), radius=18, fill=(14, 113, 106, 235))
    for y in (465, 505):
        draw.line([(1633, y), (1683, y)], fill=(57, 202, 186, 255), width=6)

    shield = [(1534, 392), (1600, 425), (1595, 555), (1534, 620), (1473, 555), (1468, 425)]
    draw.polygon(shield, fill=(8, 73, 77, 220))
    draw.line(shield + [shield[0]], fill=TEAL, width=8, joint="curve")
    draw.line([(1498, 520), (1525, 547), (1577, 485)], fill=(64, 220, 198, 255), width=10)
    draw.line([(1480, 505), (1490, 505)], fill=TEAL, width=6)
    draw.line([(1575, 505), (1605, 505)], fill=TEAL, width=6)

    draw.text((1495, 338), "POLICY GATE", font=micro, fill=PALE)
    draw.text((1358, 638), "SOURCE", font=micro, fill=(109, 180, 174, 200))
    draw.text((1625, 590), "EFFECT", font=micro, fill=(109, 180, 174, 200))

    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output, quality=90, optimize=True, progressive=True, subsampling=2)

    with Image.open(output) as saved:
        if saved.size != (W, H) or saved.format != "JPEG":
            raise RuntimeError(f"Unexpected poster output: {saved.format=} {saved.size=}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    render(args.output)
    print(f"Rendered {args.output} at {W}x{H}; final headline safe bottom <= {H - 40}px")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
