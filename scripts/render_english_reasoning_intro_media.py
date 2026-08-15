#!/usr/bin/env python3
"""Render native-English Reasoning Models presentation media.

This renderer is intentionally self-contained and uses only reviewed English
series concepts. It does not read or reuse Spanish media.
"""
from pathlib import Path
import subprocess
import tempfile
import textwrap
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
DURATION = 8.0
FADE = 0.6
OUT = Path("locales/en/series/modelos-razonadores")
SLUG = "00_presentacion_serie"

SCENES = [
    ("REASONING MODELS", "Reasoning is a process", "More steps can improve an answer — but every extra step spends physical time, compute and reliability budget.", [("TIME", "latency"), ("COMPUTE", "tokens · samples"), ("FAILURES", "still possible")]),
    ("1 · WHAT IS REASONING?", "Do not confuse an answer with a process", "For an LLM, useful reasoning is an execution path: intermediate work, verification, search or tool use that changes the probability of a correct result.", [("PROCESS", "multiple steps"), ("EVIDENCE", "verification"), ("OUTCOME", "better is not guaranteed")]),
    ("2 · FAILURE MODES", "Longer chains create more places to fail", "Shortcuts, systematic errors, sycophancy and objective drift can propagate through a reasoning trace instead of disappearing with more compute.", [("SHORTCUT", "plausible ≠ correct"), ("DRIFT", "goal can move"), ("PROPAGATION", "errors compound")]),
    ("3 · TEST-TIME COMPUTE", "Inference has its own scaling axis", "Spend more internal steps, sample more candidates, verify, search or call tools. Quality can rise — together with latency and cost.", [("STEPS", "think longer"), ("SAMPLES", "try alternatives"), ("VERIFY", "check before answer")]),
    ("4 · PRODUCT LATENCY", "The user waits in physical time", "Streaming can improve perceived responsiveness, but it does not remove compute. Production design must balance answer quality, TTFT, total latency and budget.", [("TTFT", "first response"), ("STREAM", "perceived progress"), ("SLO", "bounded wait")]),
    ("5 · CONTROLS", "More compute needs stopping rules", "Hard budgets, stopping signals, verification and fallbacks keep reasoning useful when tools, retrieval and long horizons expand the failure surface.", [("BUDGET", "time · tokens · tools"), ("STOP", "detect diminishing returns"), ("FALLBACK", "abstain · escalate")]),
]

BG = (11, 18, 32)
FG = (240, 244, 255)
MUTED = (166, 178, 202)
CYAN = (124, 199, 255)
TEAL = (38, 166, 154)
AMBER = (255, 179, 67)
CARD = (19, 30, 51)
BORDER = (55, 72, 99)


def font(size: int, bold: bool = False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)


def wrapped(draw, xy, text, fnt, fill, width_chars, spacing=12):
    lines = textwrap.wrap(text, width=width_chars)
    draw.multiline_text(xy, "\n".join(lines), font=fnt, fill=fill, spacing=spacing)


def scene_image(index: int, eyebrow: str, headline: str, body: str, cards):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # top accent and restrained grid
    for x in range(W):
        t = x / W
        c = tuple(int(TEAL[i] * (1-t) + CYAN[i] * t) for i in range(3))
        d.line((x, 0, x, 7), fill=c)
    for x in range(0, W, 72):
        d.line((x, 0, x, H), fill=(14, 24, 42), width=1)
    for y in range(0, H, 72):
        d.line((0, y, W, y), fill=(14, 24, 42), width=1)

    d.text((145, 125), eyebrow, font=font(25, True), fill=TEAL)
    wrapped(d, (145, 190), headline, font(72, True), FG, 24, 8)
    wrapped(d, (145, 405), body, font(31), MUTED, 56, 12)

    card_x, card_y, card_w, card_h = 1305, 170, 470, 205
    accents = [TEAL, CYAN, AMBER]
    for j, (label, detail) in enumerate(cards):
        y = card_y + j * (card_h + 22)
        d.rounded_rectangle((card_x, y, card_x + card_w, y + card_h), radius=20, fill=CARD, outline=BORDER, width=2)
        d.rectangle((card_x, y, card_x + 7, y + card_h), fill=accents[j % 3])
        d.text((card_x + 35, y + 35), label, font=font(28, True), fill=FG)
        wrapped(d, (card_x + 35, y + 88), detail, font(24), MUTED, 26, 6)

    d.text((145, 990), "5SIGMAS · REASONING MODELS", font=font(18, True), fill=(91, 108, 138))
    d.text((1660, 955), f"{index+1}/6", font=font(38, True), fill=CYAN)
    return im


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        frames = []
        for i, scene in enumerate(SCENES):
            p = root / f"scene-{i:02d}.png"
            scene_image(i, *scene).save(p, quality=95)
            frames.append(p)
        poster = OUT / f"{SLUG}.jpg"
        Image.open(frames[0]).save(poster, quality=91, optimize=True)

        cmd = ["ffmpeg", "-y"]
        for p in frames:
            cmd += ["-loop", "1", "-t", str(DURATION), "-i", str(p)]
        chains = []
        prev = "0:v"
        for i in range(1, len(frames)):
            out = f"v{i}"
            offset = i * (DURATION - FADE)
            chains.append(f"[{prev}][{i}:v]xfade=transition=fade:duration={FADE}:offset={offset}[{out}]")
            prev = out
        chains.append(f"[{prev}]fps=30,format=yuv420p[vout]")
        video = OUT / f"{SLUG}.mp4"
        cmd += ["-filter_complex", ";".join(chains), "-map", "[vout]", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", str(video)]
        subprocess.run(cmd, check=True)

        subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,pix_fmt", "-of", "default=nw=1", str(video)], check=True)
        print(video)
        print(poster)


if __name__ == "__main__":
    run()
