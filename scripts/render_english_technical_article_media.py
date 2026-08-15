#!/usr/bin/env python3
"""Render the native-English header demo for the proactive/reactive tools article.

This renderer is deliberately English-only and independent of the canonical
Spanish MP4/poster. It renders four concise runtime states from the English
article's contract: accept, execute, deliver, and the combined three-clock
model.
"""

import asyncio
import html
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

WIDTH, HEIGHT, FPS = 1920, 1080, 30
SCENE_SECONDS = 5
ROOT = Path("locales/en/articulos-tecnicos")
VIDEO = ROOT / "reactive-proactive-agent-header-demo.mp4"
POSTER = ROOT / "reactive-proactive-agent-header-demo.jpg"

SCENES = [
    {
        "kicker": "01 · ACCEPT",
        "title": "Respond on the interaction clock",
        "body": "Acknowledge the request immediately. Acceptance is not completion, and the visible model turn does not wait for slow external work.",
        "flow": ["REQUEST", "ACCEPTED", "USER CONTINUES"],
        "active": 0,
        "note": "conversation state",
    },
    {
        "kicker": "02 · EXECUTE",
        "title": "Run work on the operation clock",
        "body": "The runtime owns durable state, retries and idempotency while the tool executes outside the visible conversational turn.",
        "flow": ["ACCEPTED", "RUNNING", "TERMINAL"],
        "active": 1,
        "note": "operation state",
    },
    {
        "kicker": "03 · DELIVER",
        "title": "Completion is not permission to interrupt",
        "body": "A terminal tool result becomes delivery_pending. The result is surfaced once, when the interaction channel has a valid delivery window.",
        "flow": ["TERMINAL", "DELIVERY PENDING", "DELIVERED"],
        "active": 2,
        "note": "delivery state",
    },
    {
        "kicker": "RUNTIME CONTRACT",
        "title": "Three clocks. One coherent agent.",
        "body": "Conversation, execution and delivery remain separate state machines. The runtime coordinates them without pretending work finished early.",
        "flow": ["ACCEPT", "EXECUTE", "DELIVER"],
        "active": 3,
        "note": "reactive + proactive",
    },
]

CSS = """
*{box-sizing:border-box}
html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#07111d;color:#f6f8fb;font-family:Inter,Arial,'Helvetica Neue',sans-serif}
.stage{position:absolute;inset:0;background:radial-gradient(circle at 82% 24%,rgba(97,218,251,.15),transparent 34%),radial-gradient(circle at 20% 88%,rgba(123,255,202,.08),transparent 30%),linear-gradient(135deg,#07111d 0%,#0d1826 55%,#07111d 100%)}
.stage:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:64px 64px}
.accent{position:absolute;left:0;top:0;right:0;height:9px;background:linear-gradient(90deg,#61dafb,#7bffca,#f5ce6d)}
.copy{position:absolute;z-index:2;left:132px;top:150px;width:1030px}
.kicker{font-size:22px;font-weight:900;letter-spacing:.18em;color:#7bffca}
.title{margin-top:28px;font-size:76px;line-height:1.03;letter-spacing:-.04em;font-weight:900;max-width:1000px}
.body{margin-top:34px;width:980px;font-size:31px;line-height:1.47;color:rgba(246,248,251,.74)}
.panel{position:absolute;z-index:2;right:96px;top:190px;width:590px;padding:36px;border:1px solid rgba(255,255,255,.14);border-radius:30px;background:rgba(255,255,255,.045);box-shadow:0 24px 80px rgba(0,0,0,.22)}
.panel-label{font-size:15px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(246,248,251,.42)}
.flow{margin-top:28px;display:flex;flex-direction:column;gap:16px}
.node{position:relative;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:22px 22px 20px;font-size:22px;font-weight:850;letter-spacing:.03em;background:rgba(255,255,255,.035);color:rgba(246,248,251,.68)}
.node.hot{border-color:rgba(123,255,202,.48);background:rgba(123,255,202,.09);color:#caffec}
.node:not(:last-child):after{content:'↓';position:absolute;left:50%;bottom:-22px;transform:translateX(-50%);font-size:19px;color:rgba(97,218,251,.5)}
.clocks{margin-top:30px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.clock{border-top:2px solid rgba(255,255,255,.12);padding-top:13px;font-size:14px;font-weight:800;color:rgba(246,248,251,.45);text-align:center;text-transform:uppercase;letter-spacing:.08em}
.clock.on{border-color:#7bffca;color:#7bffca}
.footer{position:absolute;z-index:3;left:132px;right:132px;bottom:50px;display:flex;align-items:flex-end;justify-content:space-between}
.logo{font-size:44px;font-weight:950;letter-spacing:-4px;color:#7bffca}.meta{text-align:right;font-size:15px;font-weight:850;letter-spacing:.12em;color:rgba(246,248,251,.4);text-transform:uppercase}
.index{position:absolute;right:105px;bottom:18px;font-size:200px;font-weight:950;color:rgba(97,218,251,.045);z-index:1}
"""


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def page_html(scene: dict, index: int) -> str:
    flow = []
    for position, label in enumerate(scene["flow"]):
        hot = " hot" if position == min(scene["active"], 2) else ""
        flow.append(f'<div class="node{hot}">{esc(label)}</div>')
    if scene["active"] == 0:
        clock_active = 0
    elif scene["active"] == 1:
        clock_active = 1
    elif scene["active"] == 2:
        clock_active = 2
    else:
        clock_active = -1
    clocks = "".join(
        f'<div class="clock{" on" if clock_active in (-1, i) else ""}">{label}</div>'
        for i, label in enumerate(["conversation", "operation", "delivery"])
    )
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="stage"><div class="accent"></div>
  <section class="copy"><div class="kicker">{esc(scene["kicker"])}</div><div class="title">{esc(scene["title"])}</div><div class="body">{esc(scene["body"])}</div></section>
  <aside class="panel"><div class="panel-label">Runtime state</div><div class="flow">{"".join(flow)}</div><div class="clocks">{clocks}</div></aside>
  <div class="index">{index:02d}</div>
  <footer class="footer"><div class="logo">5σ</div><div class="meta">Proactive + reactive agents · {esc(scene["note"])}</div></footer>
</div></body></html>'''


async def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="s5-en-tech-header-") as tmpdir:
        tmp = Path(tmpdir)
        frames = []
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": WIDTH, "height": HEIGHT})
            for index, scene in enumerate(SCENES, start=1):
                await page.set_content(page_html(scene, index), wait_until="load")
                frame = tmp / f"scene-{index:02d}.png"
                await page.screenshot(path=str(frame), type="png")
                frames.append(frame)
                if index == 1:
                    await page.screenshot(path=str(POSTER), type="jpeg", quality=92)
            await browser.close()

        concat = tmp / "concat.txt"
        entries = []
        for frame in frames:
            entries.append(f"file '{frame.as_posix()}'")
            entries.append(f"duration {SCENE_SECONDS}")
        entries.append(f"file '{frames[-1].as_posix()}'")
        concat.write_text("\n".join(entries) + "\n", encoding="utf-8")

        subprocess.run([
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
            "-vf", f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=lanczos,format=yuv420p",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-movflags", "+faststart",
            "-t", "20", str(VIDEO),
        ], check=True)


if __name__ == "__main__":
    asyncio.run(main())
