#!/usr/bin/env python3
"""Render native-English AI Security MP4/poster pairs.

The renderer reads no Spanish media and reuses no Spanish binary. Scenes are
English-only summaries of the canonical English AI Security series.
"""

import asyncio
import html
import subprocess
import tempfile
from pathlib import Path
from playwright.async_api import async_playwright

W, H, FPS = 1920, 1080, 30
SCENE_SECONDS = 9.5
ROOT = Path("locales/en/series/seguridad-ia")

PLANS = {
    "00_presentacion_serie": (
        "AI Security", "ATTACK PATHS · TRUST BOUNDARIES · PRODUCTION CONTROLS", [
            ("Language mixes control and data", "LLM systems ingest system instructions, user text, retrieved documents, tool outputs and memory through the same semantic channel. Security starts by treating external language as untrusted influence."),
            ("Prompt injection is an architecture problem", "A stronger prompt can reduce failures, but it does not create a hard privilege boundary. The dangerous path is untrusted content → model decision → privileged effect."),
            ("Jailbreaks are search processes", "One refusal is not a proof. Real evaluation declares an attack budget, repeated attempts, adaptivity and a success criterion instead of testing one representative prompt."),
            ("Poisoning makes influence persistent", "A retrieved document or agent memory can carry hostile state across time. Provenance, write authority, expiry and deletion become security properties."),
            ("Production security limits effects", "Least privilege, isolation, authorization, human approval, telemetry and kill switches bound damage when the model or a guardrail fails."),
        ]),
    "01-prompt-injection": (
        "Prompt injection", "AI SECURITY · CHAPTER 1", [
            ("Control and data share one channel", "Natural language has no general-purpose escaping mechanism equivalent to parameterized SQL. External text can influence the same model context that drives decisions."),
            ("Indirect injection changes the trust path", "A malicious instruction can hide in a webpage, document, email, memory item or tool result and reach a later privileged component through retrieval or summarization."),
            ("Retrieval is part of the security boundary", "Hostile content only matters if it enters active context. Provenance, filtering, retrieval policy and access scope are security controls—not only relevance infrastructure."),
            ("Filters help, but do not authorize", "Classifiers, rewriters and output monitors can reduce attack success. They still do not answer whether the model may delete a record, send a message or access a credential."),
            ("Separate reading from action", "Process untrusted content in a constrained component, pass validated structure across the boundary, and authorize every privileged tool call independently with least privilege."),
        ]),
    "02-jailbreaks": (
        "Jailbreaks", "AI SECURITY · CHAPTER 2", [
            ("A refusal is not a formal boundary", "Safety training changes response probabilities; it does not prove every disallowed continuation is unreachable for every possible input."),
            ("Search changes attack economics", "Once an actor can vary prompts, observe outputs and try again, the threat model becomes a search process with a budget—not a single clever wording."),
            ("Declare the attack budget", "Report attempts, time, adaptivity, model access, temperature and stopping conditions. A success rate without those parameters is not a transferable security claim."),
            ("Measure distinct outcomes", "Separate refusal, partial compliance, policy violation and useful harmful completion. Binary labels hide important differences in severity and exploitability."),
            ("Defense must survive repetition", "Rate limits, anomaly detection, streaming guards, model hardening and rapid response should be evaluated together against repeated and adaptive attempts."),
        ]),
    "03-envenenamiento": (
        "Poisoning", "AI SECURITY · CHAPTER 3", [
            ("Persistence changes the problem", "Prompt injection can alter one decision. Poisoning tries to make untrusted influence become future system state through RAG, memory or learned behavior."),
            ("Storage does not create trust", "A database row is not trustworthy merely because the agent wrote it. Preserve origin, timestamp, scope, authority and expiry for every memory or retrieved artifact."),
            ("Memory is an attack surface", "A hostile source can cause false state to be stored and later retrieved in a different conversation or task. The causal chain spans write, retrieve and execute."),
            ("Runtime memory and model backdoors differ", "Poisoned RAG stores and agent memory are operational state problems; weight-level backdoors are training/model problems. They require different controls and tests."),
            ("Test write → execute → forget", "A useful evaluation checks whether dangerous state is stored, whether it changes later behavior, and whether deletion or repair actually removes the influence."),
        ]),
    "04-red-teaming": (
        "Red teaming", "AI SECURITY · CHAPTER 4", [
            ("Test the complete trajectory", "If production retrieves documents, uses tools and keeps memory, testing one isolated prompt misses the path through which real harm can occur."),
            ("Threat model before benchmark", "Define the asset, actor, entry point, attempt budget, permissions, success event and recovery state before selecting a dataset or metric."),
            ("Separate three questions", "Model capability, human uplift and product execution are different experiments. A model-level failure does not prove the deployed runtime can create the same external effect."),
            ("Reproduce the causal chain", "Capture the untrusted input, retrieval step, model decision, authorization decision, tool request and external effect so a finding can become a deterministic regression."),
            ("Turn incidents into release gates", "High-value red-team findings should become automated tests with explicit invariants, not screenshots that disappear from the engineering loop."),
        ]),
    "05-controles-produccion": (
        "Production controls", "AI SECURITY · CHAPTER 5", [
            ("Assume a defensive layer will fail", "A secure system bounds what happens next. Defense in depth splits responsibilities across layers that do not share exactly the same failure mode."),
            ("Untrusted readers should not own privileged tools", "A quarantined component can interpret external content; a privileged component should receive constrained output and independently decide whether an action is allowed."),
            ("Every tool needs least privilege", "Define typed arguments, reachable resources, allowed operations, risk class, reversibility and authorization. Model-generated JSON is a proposal—not proof of permission."),
            ("MCP standardizes integration, not trust", "Tool descriptions, server responses, OAuth scopes and cross-agent messages are new trust channels. Validate provenance and authorization at every boundary."),
            ("Observability and stop mechanisms close the loop", "Log model/tool decisions, detect abnormal trajectories, preserve rollback state and maintain a deterministic way to disable dangerous capabilities quickly."),
        ]),
}

CSS = """
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#07111d;color:#f5f7fb;font-family:Arial,'Helvetica Neue',sans-serif}
.slide{position:absolute;inset:0;background:radial-gradient(circle at 82% 42%,rgba(255,92,92,.14),transparent 34%),linear-gradient(135deg,#07111d,#111a28 62%,#07111d)}
.slide:after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.026) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.026) 1px,transparent 1px);background-size:54px 54px}
.top{height:8px;background:linear-gradient(90deg,#ff6b6b,#ffc857,#5bc0eb)}
.content{position:absolute;left:140px;top:132px;width:1090px;z-index:2}.tag{font-size:20px;font-weight:800;letter-spacing:.15em;color:#ff9d8d}.title{font-size:76px;line-height:1.04;font-weight:900;letter-spacing:-.04em;margin-top:30px}.body{font-size:32px;line-height:1.48;color:rgba(245,247,251,.78);margin-top:34px;max-width:1050px}
.path{position:absolute;right:110px;top:210px;width:490px;z-index:2}.node{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.052);border-radius:24px;padding:26px;margin:18px 0}.node b{font-size:25px;display:block}.node span{display:block;margin-top:8px;font-size:19px;color:rgba(245,247,251,.61);line-height:1.35}.arrow{text-align:center;font-size:32px;color:rgba(255,200,87,.55)}
.num{position:absolute;right:120px;bottom:48px;font-size:180px;font-weight:900;color:rgba(255,107,107,.055);z-index:1}.footer{position:absolute;left:140px;right:140px;bottom:48px;display:flex;justify-content:space-between;z-index:2;font-size:15px;font-weight:800;letter-spacing:.1em;color:rgba(245,247,251,.4);text-transform:uppercase}.logo{font-size:38px;font-weight:900;letter-spacing:-3px;color:#ff9d8d}
"""

def esc(x): return html.escape(str(x), quote=True)

def page_html(title, tag, scene_title, body, index, total):
    nodes = [
        ("INPUT", "untrusted influence"),
        ("DECISION", "model + policy"),
        ("EFFECT", "authorized action"),
    ]
    path_html = '<div class="arrow">↓</div>'.join(f'<div class="node"><b>{a}</b><span>{b}</span></div>' for a,b in nodes)
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><section class="slide"><div class="top"></div><div class="content"><div class="tag">{esc(tag)}</div><div class="title">{esc(scene_title)}</div><div class="body">{esc(body)}</div></div><div class="path">{path_html}</div><div class="num">{index:02d}</div><div class="footer"><span class="logo">5σ</span><span>{esc(title)} · {index}/{total}</span></div></section></body></html>'''

async def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="s5-security-media-") as tmpdir:
        tmp = Path(tmpdir)
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            for slug, (title, tag, scenes) in PLANS.items():
                frame_dir = tmp / slug
                frame_dir.mkdir(parents=True, exist_ok=True)
                page = await browser.new_page(viewport={"width": W, "height": H})
                frames = []
                for i, (scene_title, body) in enumerate(scenes, 1):
                    await page.set_content(page_html(title, tag, scene_title, body, i, len(scenes)), wait_until="load")
                    frame = frame_dir / f"{i:02d}.png"
                    await page.screenshot(path=str(frame), type="png")
                    frames.append(frame)
                    if i == 1:
                        await page.screenshot(path=str(ROOT / f"{slug}.jpg"), type="jpeg", quality=92)
                await page.close()
                concat = frame_dir / "concat.txt"
                lines=[]
                for frame in frames:
                    lines += [f"file '{frame.as_posix()}'", f"duration {SCENE_SECONDS}"]
                lines.append(f"file '{frames[-1].as_posix()}'")
                concat.write_text("\n".join(lines)+"\n", encoding="utf-8")
                subprocess.run(["ffmpeg","-y","-f","concat","-safe","0","-i",str(concat),"-vf",f"fps={FPS},scale={W}:{H}:flags=lanczos,format=yuv420p","-c:v","libx264","-preset","medium","-crf","18","-movflags","+faststart",str(ROOT/f"{slug}.mp4")], check=True)
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
