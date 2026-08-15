#!/usr/bin/env python3
"""Render native-English AI Agents series media without reading Spanish binaries."""

import asyncio
import html
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

WIDTH, HEIGHT, FPS = 1920, 1080, 30
SCENE_SECONDS = 8
ROOT = Path("locales/en/series/agentes-ia")

VIDEOS = {
    "00_presentacion_serie": {
        "title": "AI Agents",
        "scenes": [
            ("FROM ANSWERING TO ACTING", "A chatbot returns text. An agent can choose actions, use tools, observe results, and decide what happens next.", "RESPONSE → DECISION → ACTION"),
            ("THE SYSTEM BOUNDARY", "The model is only one component. Runtime, tools, state, permissions, evaluation, cost and stopping behavior define the actual agent.", "MODEL + RUNTIME + TOOLS + STATE + POLICY"),
            ("FIVE QUESTIONS", "What is an agent? How does it work? How do we evaluate it? How do we secure it? What makes it operable in production?", "DEFINE → BUILD → EVALUATE → SECURE → OPERATE"),
            ("THE THESIS", "A reliable agent is not the one that acts most often. It knows what it may do, can prove what it did, and knows when to stop.", "BOUNDARIES · EVIDENCE · STOPPING"),
        ],
    },
    "01-que-es-un-agente": {
        "title": "What an AI agent is—and is not",
        "scenes": [
            ("AN OPERATIONAL DEFINITION", "An agent receives an objective, chooses actions, executes them in an environment, and uses the results to choose the next step.", "OBJECTIVE → ACTION → OBSERVATION → NEXT STEP"),
            ("AUTONOMY IS A SCALE", "Direct response, deterministic workflow, copilot with approval, bounded agent, open-ended autonomy: these are different system contracts.", "RESPONSE → WORKFLOW → COPILOT → BOUNDED AGENT"),
            ("THE MODEL IS NOT THE AGENT", "Useful agency requires objective, context, tools, operational state, policy and verification around the LLM.", "LLM ⊂ AGENT SYSTEM"),
            ("DELEGATE DECISIONS, NOT CONTROL", "Ask which decisions are delegated, over which environment, with what evidence and recovery path.", "DECISION + BOUNDARY + EVIDENCE + RECOVERY"),
        ],
    },
    "02-anatomia-de-un-agente": {
        "title": "The anatomy of an agent",
        "scenes": [
            ("THE MINIMAL LOOP", "Observe the objective and state. Plan the next move. Act through a validated tool. Verify the result. Policy constrains every step.", "OBSERVE → PLAN → ACT → VERIFY"),
            ("TOOLS ARE CONTRACTS", "A tool needs a stable name, argument schema, validation, permissions, timeout, retry policy and explicit success or failure states.", "INTENT → VALIDATED CALL → RESULT"),
            ("CONTEXT ≠ MEMORY ≠ STATE", "Conversation context is a working view. Memory persists information. Operational state tracks in-flight work, retries, locks and completion.", "CONTEXT | MEMORY | OPERATION STATE"),
            ("HONEST STATE MACHINES", "requested → accepted → running → succeeded is not just backend detail. User-facing language must reflect the actual runtime state.", "ACCEPTED ≠ COMPLETED"),
        ],
    },
    "03-como-evaluar-un-agente": {
        "title": "How to evaluate an AI agent",
        "scenes": [
            ("EVALUATE THE TASK, NOT THE ANSWER", "An agent can end with the right text after using the wrong tool, violating policy or wasting ten times the required steps.", "INITIAL STATE → TRAJECTORY → OUTCOME"),
            ("FOUR DIMENSIONS", "Measure outcome, trajectory, security/compliance and operational economics. A production success must satisfy all four.", "OUTCOME · TRACE · POLICY · COST"),
            ("MAKE SUCCESS REPRODUCIBLE", "Specify the environment, allowed tools, data, success condition, forbidden actions and budgets. Use deterministic checks wherever possible.", "TASK CONTRACT → VERDICT"),
            ("TRACES ARE EVIDENCE", "Record objective, tools, arguments, results, state and verdict. If you store only the final answer, you have demos—not reproducible evals.", "TASK → TRACE → RELEASE GATE"),
        ],
    },
    "04-seguridad-agentes": {
        "title": "Agent security",
        "scenes": [
            ("READING CAN BECOME ACTING", "Emails, pages, documents and tool results are untrusted data. They can contain text that looks like an instruction to the model.", "UNTRUSTED DATA → MODEL → PRIVILEGED TOOL"),
            ("INDIRECT PROMPT INJECTION", "The attacker does not need full control. They only need enough influence over the next step while consequential tools are available.", "CONTENT ≠ AUTHORITY"),
            ("AUTHORIZATION OUTSIDE THE PROMPT", "Identity, permissions, approval, revocation and auditability must be enforced by the runtime—not merely requested in natural language.", "IDENTITY → AUTHZ → TOOL"),
            ("LIMIT THE BLAST RADIUS", "Least privilege and explicit human confirmation for irreversible actions reduce the consequence of model mistakes and hostile input.", "READ < WRITE < IRREVERSIBLE"),
        ],
    },
    "05-de-la-demo-a-produccion": {
        "title": "From demo to production",
        "scenes": [
            ("PRODUCTION STARTS WITH FAILURE", "A real system survives slow tools, 429s, schema changes, disconnects and results that arrive after the conversation has moved on.", "HAPPY PATH + FAILURE PATH"),
            ("BUDGETS AND IDEMPOTENCY", "Bound steps, calls, time, cost and retries. Give each consequential intent a stable identity so recovery cannot duplicate the action.", "BUDGET → RETRY → IDEMPOTENCY"),
            ("HONEST ASYNC COMPLETION", "Accepting work is not completing it. Let the operation run durably, then deliver exactly once when a real terminal result exists.", "ACCEPT → EXECUTE → DELIVER"),
            ("USE AN AGENT ONLY WHERE IT HELPS", "If the path is known, deterministic or too risky to vary, a conventional workflow is often the better architecture.", "UNCERTAIN SEQUENCE? AGENT : WORKFLOW"),
        ],
    },
}

CSS = """
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#07111d;color:#f7f9fc;font-family:Inter,Arial,'Helvetica Neue',sans-serif}
.stage{position:absolute;inset:0;background:radial-gradient(circle at 80% 24%,rgba(79,209,255,.14),transparent 34%),radial-gradient(circle at 16% 88%,rgba(125,255,203,.08),transparent 30%),linear-gradient(135deg,#07111d,#0e1a29 58%,#07111d)}
.stage:before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);background-size:64px 64px}.accent{height:9px;background:linear-gradient(90deg,#4fd1ff,#7dffcb,#ffd36b)}
.copy{position:absolute;left:132px;top:148px;width:1090px;z-index:2}.series{font-size:17px;font-weight:900;letter-spacing:.17em;text-transform:uppercase;color:rgba(247,249,252,.42)}.kicker{margin-top:34px;font-size:23px;font-weight:900;letter-spacing:.15em;color:#7dffcb}.title{margin-top:24px;font-size:74px;line-height:1.04;letter-spacing:-.04em;font-weight:950}.body{margin-top:31px;font-size:31px;line-height:1.48;color:rgba(247,249,252,.75);max-width:1050px}
.panel{position:absolute;right:95px;top:236px;width:540px;min-height:340px;padding:35px;border:1px solid rgba(255,255,255,.14);border-radius:30px;background:rgba(255,255,255,.045);z-index:2}.panel-label{font-size:15px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(247,249,252,.4)}.flow{margin-top:29px;font-size:28px;line-height:1.5;font-weight:900;color:#caffec}.bars{display:flex;gap:10px;margin-top:42px}.bars span{height:8px;flex:1;border-radius:99px;background:rgba(255,255,255,.12)}.bars span.on{background:#7dffcb}
.footer{position:absolute;left:132px;right:132px;bottom:50px;display:flex;justify-content:space-between;align-items:flex-end;z-index:3}.logo{font-size:44px;font-weight:950;letter-spacing:-4px;color:#7dffcb}.meta{text-align:right;font-size:15px;font-weight:850;letter-spacing:.11em;text-transform:uppercase;color:rgba(247,249,252,.4)}.index{position:absolute;right:105px;bottom:12px;font-size:205px;font-weight:950;color:rgba(79,209,255,.045);z-index:1}
"""


def esc(value):
    return html.escape(str(value), quote=True)


def scene_html(video_title, scene, scene_index):
    kicker, body, flow = scene
    bars = ''.join(f'<span class="{"on" if i <= scene_index else ""}"></span>' for i in range(4))
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="stage"><div class="accent"></div>
<section class="copy"><div class="series">5σ · AI Agents</div><div class="kicker">{esc(kicker)}</div><div class="title">{esc(video_title)}</div><div class="body">{esc(body)}</div></section>
<aside class="panel"><div class="panel-label">System view</div><div class="flow">{esc(flow)}</div><div class="bars">{bars}</div></aside>
<div class="index">{scene_index + 1:02d}</div><footer class="footer"><div class="logo">5σ</div><div class="meta">Native English · {scene_index + 1}/4</div></footer></div></body></html>'''


async def render_video(page, slug, spec, tmp_root):
    frames = []
    work = tmp_root / slug
    work.mkdir(parents=True, exist_ok=True)
    for index, scene in enumerate(spec["scenes"]):
        await page.set_content(scene_html(spec["title"], scene, index), wait_until="load")
        frame = work / f"scene-{index + 1:02d}.png"
        await page.screenshot(path=str(frame), type="png")
        frames.append(frame)
        if index == 0:
            await page.screenshot(path=str(ROOT / f"{slug}.jpg"), type="jpeg", quality=92)

    concat = work / "concat.txt"
    lines = []
    for frame in frames:
        lines.extend([f"file '{frame.as_posix()}'", f"duration {SCENE_SECONDS}"])
    lines.append(f"file '{frames[-1].as_posix()}'")
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
        "-vf", f"fps={FPS},scale={WIDTH}:{HEIGHT}:flags=lanczos,format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-movflags", "+faststart",
        "-t", str(SCENE_SECONDS * 4), str(ROOT / f"{slug}.mp4"),
    ], check=True)


async def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="s5-en-agents-") as tmpdir:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": WIDTH, "height": HEIGHT})
            for slug, spec in VIDEOS.items():
                await render_video(page, slug, spec, Path(tmpdir))
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
