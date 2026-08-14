#!/usr/bin/env python3
"""Render native-English Foundations MP4/poster pairs without Spanish media reuse.

The content plans below are distilled from the canonical English Foundations
articles. Rendering is deterministic once Chromium/ffmpeg versions are fixed:
we capture native 1920x1080 English scenes, then cross-fade the stills into a
small H.264 MP4 and use the opening scene as the poster.
"""

import argparse
import asyncio
import html
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

W, H = 1920, 1080
SCENE_SECONDS = 7.0
FADE_SECONDS = 0.55
FPS = 15

PLANS = {
    "00_presentacion_serie": {
        "title": "AI & Generative AI Foundations",
        "subtitle": "A durable mental model for AI, GenAI and AGI—without depending on model-of-the-week headlines.",
        "tag": "FOUNDATIONS · SERIES MAP",
        "scenes": [
            ("1 · What is AI?", "Start with three questions.", "Which technological family? Where does the learning signal come from? Which internal parameters change during training?", [("AI → ML → DL", "Technology family"), ("Supervision", "Learning signal"), ("Parameters", "What training changes")]),
            ("2 · Generative AI", "Meaning becomes geometry.", "Embeddings turn symbols into learned vectors; attention connects context; scale turns one foundation model into a reusable base for many tasks.", [("Embeddings", "Represent meaning"), ("Attention", "Connect context"), ("Scale", "Broaden capability")]),
            ("3 · Choose the right system", "More autonomy is not always better.", "Rules, classical ML, LLMs, RAG, workflows and agents occupy different points in cost, control, uncertainty and operational risk.", [("Rules / ML", "Finite outputs"), ("LLM / RAG", "Open language + context"), ("Workflow / agent", "Multi-step execution")]),
            ("4 · AGI", "Generality is not one benchmark.", "AGI definitions disagree about breadth, economic autonomy and capability thresholds. Strong performance in one domain does not establish robust general intelligence.", [("Breadth", "Across tasks"), ("Transfer", "Novel domains"), ("Autonomy", "Long horizons")]),
        ],
    },
    "01-que-es-ia": {
        "title": "What is AI?",
        "subtitle": "A framework for understanding almost any modern AI system—from a spam filter to a foundation model.",
        "tag": "AI FOUNDATIONS · CHAPTER 1",
        "scenes": [
            ("1 · Technological family", "AI is the map. GenAI is one region.", "AI is the broad category. Machine learning learns patterns from data; deep learning uses multilayer neural networks; generative AI is defined by producing new content.", [("AI", "Broad family"), ("ML", "Learns patterns"), ("DL", "Neural networks"), ("GenAI", "Generates content")]),
            ("2 · Learning signal", "Ask where the “teacher” comes from.", "Supervised, self-supervised and reinforcement learning are not architectures. They describe how the learning signal is constructed.", [("Supervised", "Target labels"), ("Self-supervised", "Data creates targets"), ("Reinforcement", "Rewards score behavior")]),
            ("3 · Training", "Learning means changing parameters.", "Tree splits, cluster centers, probabilities and neural-network weights differ, but the core loop is stable: predict, measure error, adjust, repeat.", [("Predict", "Current parameters"), ("Measure", "Objective / error"), ("Adjust", "Update parameters"), ("Repeat", "Many steps")]),
            ("4 · Generalization", "Training data is only a sample.", "A model works tomorrow only if useful patterns still hold. Data drift can degrade performance when production no longer resembles training.", [("Training", "Observed sample"), ("Production", "Future inputs"), ("Drift", "Distribution shifts")]),
            ("5 · Production", "A trained model is not a system.", "MLOps closes the loop around the model: data, evaluation, versioning, deployment, monitoring and feedback.", [("Evaluate", "Before release"), ("Deploy", "Controlled rollout"), ("Monitor", "Real-world behavior"), ("Improve", "Feedback + retraining")]),
        ],
    },
    "02-que-es-ia-generativa": {
        "title": "What is Generative AI?",
        "subtitle": "From embeddings and attention to foundation models, RAG, agents and the production lifecycle around them.",
        "tag": "AI FOUNDATIONS · CHAPTER 2",
        "scenes": [
            ("1 · Embeddings", "Meaning becomes geometry.", "Tokens are mapped to learned vectors. Training organizes those vectors so useful semantic relationships become geometric relationships the model can operate on.", [("token", "discrete symbol"), ("vector", "numeric coordinates"), ("embedding", "learned representation")]),
            ("2 · Transformer", "Attention shortens the path through context.", "Self-attention lets each position directly weight other positions in the context instead of relying only on a recurrent chain.", [("Query", "What this token needs"), ("Key", "What others offer"), ("Value", "Information to combine")]),
            ("3 · Scaling", "Quantity changes the capability regime.", "Empirical scaling laws relate performance to model size, data and compute. The durable result is broader capability—not a guarantee of sudden magical emergence.", [("Data", "More training signal"), ("Parameters", "More capacity"), ("Compute", "More optimization")]),
            ("4 · System configuration", "LLM, RAG and agent are different systems.", "RAG supplies changing or private context during inference. Agents add planning and tool use. Each layer adds capability—and new failure modes.", [("LLM", "Generate"), ("+ RAG", "Retrieve → generate"), ("+ Agent", "Plan → act → observe")]),
            ("5 · LLMOps", "The model is only one production artifact.", "Prompts, context, retrieval, tools and evaluations need versioning and monitoring. Configuration changes can regress behavior even when model weights stay fixed.", [("Prompts", "Version"), ("Retrieval", "Evaluate"), ("Tools", "Bound"), ("Behavior", "Monitor")]),
        ],
    },
    "03-ia-vs-ia-generativa": {
        "title": "Classical AI vs Generative AI",
        "subtitle": "Choose the technology from the output space, uncertainty, evidence needs, latency and operational risk—not from hype.",
        "tag": "AI FOUNDATIONS · CHAPTER 3",
        "scenes": [
            ("1 · Output space", "Finite decision or open-ended generation?", "Classical ML typically returns a predefined label, score or number. Generative models operate over enormous output spaces such as text, code, images or structured content.", [("Classical ML", "label · score · number"), ("Generative AI", "text · code · media")]),
            ("2 · Reproducibility", "The same interface can hide different uncertainty.", "Deployed classical inference is usually deterministic or nearly so. Generative decoding selects from token distributions; lower temperature reduces variation but does not create a truth guarantee.", [("ML", "stable numerical mapping"), ("LLM", "distribution over continuations")]),
            ("3 · Evaluation", "If you cannot define good, you cannot improve it.", "Classical supervised tasks often have objective labels. Generative systems need layered evaluation: task metrics, deterministic checks, model graders and human review.", [("Metrics", "Ground truth where possible"), ("Checks", "Schemas + invariants"), ("Review", "Representative samples")]),
            ("4 · Operational matrix", "Autonomy is a design choice.", "Use rules for fully specified logic, ML for finite learned targets, RAG for changing evidence, workflows for known steps and agents only when dynamic action selection is genuinely required.", [("Rules", "Specified"), ("ML", "Learned target"), ("RAG", "Grounded context"), ("Agent", "Dynamic actions")]),
            ("5 · One stack, several tools", "Real systems combine families.", "A fraud platform can use rules for filters, ML for scoring, retrieval for explanations and a bounded workflow or agent for expensive investigations.", [("Filter", "Rules"), ("Score", "ML"), ("Explain", "RAG"), ("Investigate", "Workflow / agent")]),
        ],
    },
    "04-agi": {
        "title": "AGI: Artificial General Intelligence",
        "subtitle": "The hard part is not naming the threshold. It is measuring breadth, transfer, autonomy and control as capability grows.",
        "tag": "AI FOUNDATIONS · CHAPTER 4",
        "scenes": [
            ("1 · Definition problem", "AGI is not one universally accepted test.", "Different definitions emphasize broad cognitive competence, economically valuable autonomy, transfer to unfamiliar domains or the ability to automate increasingly difficult research work.", [("Breadth", "Many cognitive tasks"), ("Economic", "Valuable autonomous work"), ("Transfer", "Novel domains")]),
            ("2 · Capability spectrum", "Generality and performance are separate axes.", "A system can be spectacularly strong in a narrow domain without being general. Capability frameworks therefore track both how strong a system is and how broadly that strength transfers.", [("Narrow", "Strong on one domain"), ("General", "Strong across domains"), ("Superhuman", "Beyond top humans")]),
            ("3 · Current limits", "Benchmark strength is not robust generality.", "Persistent learning, reliable uncertainty awareness, out-of-distribution transfer, grounded physical understanding and long-horizon autonomy remain distinct challenges.", [("Transfer", "Novel tasks"), ("Memory", "Persistent learning"), ("Uncertainty", "Know when unsure"), ("Horizon", "Sustained work")]),
            ("4 · Better measurements", "Ask how long capability stays reliable.", "Task-horizon measurements test sustained autonomous work; adaptation benchmarks test unfamiliar abstractions. Neither single score proves AGI, but both expose dimensions short tests miss.", [("Task horizon", "How long before errors compound"), ("Adaptation", "Few examples, novel task")]),
            ("5 · Impact and alignment", "Capability amplifies the cost of objective mistakes.", "More general systems could accelerate science and automate valuable work, but control matters more as autonomy grows. Alignment is the problem of keeping optimization connected to intended outcomes.", [("Capability", "Broader action space"), ("Alignment", "Intended objectives"), ("Controls", "Effective supervision")]),
        ],
    },
}

CSS = r"""
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#0b1220;color:#f0f4ff;font-family:Arial,'Helvetica Neue',sans-serif}
.beat{--c:#26A69A;position:absolute;inset:0;overflow:hidden;background:#0b1220}.beat:before{content:'';position:absolute;right:-140px;bottom:-160px;width:820px;height:820px;border-radius:50%;background:radial-gradient(circle,var(--c) 0,transparent 68%);opacity:.075}.beat:after{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(240,244,255,.045) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}.accent{height:6px;background:linear-gradient(90deg,#26A69A,#324AB2 48%,#FFB343 85%)}.inner{position:absolute;left:150px;top:125px;width:1060px;height:820px}.eyebrow{font-size:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--c)}.headline{margin-top:30px;font-size:76px;line-height:1.04;letter-spacing:-.035em;font-weight:900;max-width:1040px}.body{margin-top:34px;font-size:31px;line-height:1.46;color:rgba(240,244,255,.78);max-width:1000px}.footer{position:absolute;left:150px;right:150px;bottom:48px;display:flex;align-items:center;justify-content:space-between}.footer span:first-child{font-size:14px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:rgba(240,244,255,.34)}.logo{font-size:38px;font-weight:900;letter-spacing:-3px;background:linear-gradient(135deg,#26A69A,#7cc7ff,#FFB343);-webkit-background-clip:text;color:transparent}.visual{position:absolute;right:135px;top:185px;width:570px;height:650px;display:flex;align-items:center;justify-content:center}.opening .inner{top:205px;width:1100px}.opening .series{font-size:18px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:rgba(240,244,255,.45)}.opening h1{font-size:106px;line-height:.96;letter-spacing:-.05em;margin:36px 0 30px;max-width:1080px}.opening .sub{font-size:34px;line-height:1.4;color:rgba(240,244,255,.7);max-width:1060px}.opening .tag{margin-top:42px;font-size:23px;font-weight:800;color:#26A69A}.hero{width:520px;height:520px;position:relative}.hero .ring{position:absolute;border:2px solid rgba(124,199,255,.3);border-radius:50%;inset:40px}.hero .ring.r2{inset:105px;border-color:rgba(38,166,154,.4)}.hero .core{position:absolute;inset:185px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,rgba(38,166,154,.28),rgba(50,74,178,.3));border:1px solid rgba(240,244,255,.14);font-size:62px;font-weight:900}.hero .dot{position:absolute;width:18px;height:18px;border-radius:50%;background:#FFB343;box-shadow:0 0 28px rgba(255,179,67,.5)}.hero .d1{left:250px;top:30px}.hero .d2{right:45px;top:245px;background:#7cc7ff}.hero .d3{left:75px;bottom:85px;background:#26A69A}.cards{width:560px;display:grid;gap:16px}.card{padding:23px 26px;border:1px solid rgba(240,244,255,.14);border-radius:18px;background:rgba(240,244,255,.04);position:relative;overflow:hidden}.card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(#26A69A,#7cc7ff,#FFB343)}.card strong{display:block;font-size:26px;margin-bottom:7px}.card small{font-size:19px;line-height:1.35;color:rgba(240,244,255,.62)}.rail{height:5px;margin:4px 0;background:linear-gradient(90deg,#26A69A,#7cc7ff,#FFB343);border-radius:999px}.index{position:absolute;right:150px;bottom:130px;font-size:180px;font-weight:900;color:rgba(124,199,255,.045);letter-spacing:-.08em}
"""


def esc(value):
    return html.escape(value, quote=True)


def opening_html(plan):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head><body><section class="beat opening" style="--c:#26A69A"><div class="accent"></div><div class="inner"><div class="series">{esc(plan['tag'])}</div><h1>{esc(plan['title'])}</h1><div class="sub">{esc(plan['subtitle'])}</div><div class="tag">native English · 5Sigmas</div></div><div class="visual"><div class="hero"><div class="ring"></div><div class="ring r2"></div><div class="core">5σ</div><div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div></div></div><div class="footer"><span>5Sigmas · {esc(plan['title'])}</span><span class="logo">5σ</span></div></section></body></html>'''


def scene_html(plan, scene, idx):
    eyebrow, headline, body, cards = scene
    cards_html = ''.join(
        f'<div class="card"><strong>{esc(label)}</strong><small>{esc(detail)}</small></div>' +
        ('<div class="rail"></div>' if i < len(cards) - 1 else '')
        for i, (label, detail) in enumerate(cards)
    )
    color = ['#26A69A', '#7cc7ff', '#324AB2', '#FFB343', '#26A69A'][idx % 5]
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head><body><section class="beat" style="--c:{color}"><div class="accent"></div><div class="inner"><div class="eyebrow">{esc(eyebrow)}</div><div class="headline">{esc(headline)}</div><div class="body">{esc(body)}</div></div><div class="visual"><div class="cards">{cards_html}</div></div><div class="index">0{idx + 1}</div><div class="footer"><span>5Sigmas · {esc(plan['title'])}</span><span class="logo">5σ</span></div></section></body></html>'''


async def capture(plan, frame_dir, poster_png):
    async with async_playwright() as p:
        launch = {
            'headless': True,
            'args': ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1'],
        }
        if Path('/usr/bin/chromium').exists():
            launch['executable_path'] = '/usr/bin/chromium'
        browser = await p.chromium.launch(**launch)
        page = await browser.new_page(viewport={'width': W, 'height': H})
        pages = [opening_html(plan)] + [scene_html(plan, scene, i) for i, scene in enumerate(plan['scenes'])]
        for i, source in enumerate(pages):
            await page.set_content(source, wait_until='load')
            await page.screenshot(path=str(frame_dir / f'{i:02d}.png'), full_page=False)
        (frame_dir / '00.png').replace(poster_png)
        await page.set_content(pages[0], wait_until='load')
        await page.screenshot(path=str(frame_dir / '00.png'), full_page=False)
        await browser.close()


def render_video(frame_dir, out_mp4, poster_png, out_jpg, scene_count):
    inputs = []
    for i in range(scene_count):
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', str(SCENE_SECONDS), '-i', str(frame_dir / f'{i:02d}.png')]
    filters = []
    previous = '0:v'
    step = SCENE_SECONDS - FADE_SECONDS
    for i in range(1, scene_count):
        output = f'v{i}'
        filters.append(f'[{previous}][{i}:v]xfade=transition=fade:duration={FADE_SECONDS}:offset={step * i:.2f}[{output}]')
        previous = output
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inputs,
        '-filter_complex', ';'.join(filters), '-map', f'[{previous}]',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '29', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-r', str(FPS), str(out_mp4),
    ], check=True)
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(poster_png),
        '-frames:v', '1', '-q:v', '3', str(out_jpg),
    ], check=True)


async def render_slug(slug, plan, output_root):
    with tempfile.TemporaryDirectory(prefix=f's5-en-{slug}-') as tmp:
        tmp = Path(tmp)
        frames = tmp / 'frames'
        frames.mkdir()
        poster = tmp / 'poster.png'
        await capture(plan, frames, poster)
        out_mp4 = output_root / f'{slug}.mp4'
        out_jpg = output_root / f'{slug}.jpg'
        render_video(frames, out_mp4, poster, out_jpg, 1 + len(plan['scenes']))
        print(f'{slug}: {out_mp4.stat().st_size} bytes MP4 · {out_jpg.stat().st_size} bytes poster')


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output-root', default='locales/en/series/fundamentos-ia-iag')
    parser.add_argument('--slug', choices=sorted(PLANS))
    args = parser.parse_args()
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    selected = {args.slug: PLANS[args.slug]} if args.slug else PLANS
    for slug, plan in selected.items():
        await render_slug(slug, plan, output_root)


if __name__ == '__main__':
    asyncio.run(main())
