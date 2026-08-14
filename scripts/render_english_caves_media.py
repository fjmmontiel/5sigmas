#!/usr/bin/env python3
"""Render native-English From the Caves to AGI MP4/poster pairs.

No Spanish media is read or reused. Teaching plans are distilled from the
canonical English series and rendered as native-English 1920x1080 scenes.
"""

import asyncio
import html
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

W, H, FPS = 1920, 1080, 30
SCENE_SECONDS = 10.5
ROOT = Path("locales/en/series/from-cave-to-agi")

PLANS = {
    "00_presentacion_serie": {
        "title": "From the Caves to AGI",
        "subtitle": "How representation, machinery, learning and scale accumulated into modern AI.",
        "tag": "HISTORY OF AI · SERIES MAP",
        "scenes": [
            ("1 · Represent", "Symbols let thought leave the physical object.", "Marks became numbers; numbers became algebra, proof and calculus. Once relationships could be written compactly, they could be transformed by repeatable rules.", [("43,000 BCE → 1700", "notation + abstraction"), ("Core move", "objects → symbols"), ("Result", "formal manipulation")]),
            ("2 · Mechanize", "Rules became executable machinery.", "Mechanical calculators, programmable patterns, Boolean logic, computability and stored-program computers turned symbolic procedures into machines that could execute them.", [("1700 → 1956", "calculation → computing"), ("Program", "separate from hardware"), ("Limit", "not every problem is computable")]),
            ("3 · Learn", "Intelligence moved from explicit rules to fitted parameters.", "Perceptrons, probability, optimization and backpropagation made it possible to learn useful behavior from examples rather than specify every decision by hand.", [("1956 → 2012", "rules → data"), ("Engine", "optimization"), ("Constraint", "data + compute")]),
            ("4 · Scale", "Deep learning changed regime when data, compute and architecture aligned.", "ImageNet, GPUs, attention, Transformers and foundation-model pretraining made one trained model reusable across many tasks and modalities.", [("2012 → 2024", "scale multiplier"), ("Architecture", "Transformer"), ("Product", "foundation models")]),
            ("5 · Beyond", "The frontier is becoming a system, not only a larger model.", "Long context, external memory, test-time compute, tools, agents, retrieval, world models and robotics extend capability beyond parameter count alone.", [("2022 → 2026", "new inference levers"), ("System", "model + memory + tools"), ("Question", "what comes after pure scaling?")]),
        ],
    },
    "01-representar": {
        "title": "Represent — from counting to calculus",
        "subtitle": "Why notation and abstraction changed what humans could reason about reliably.",
        "tag": "HISTORY OF AI · CHAPTER 1",
        "scenes": [
            ("1 · A mark can stand for something absent", "Representation is the first abstraction.", "A notch is not a sheep, a day or a bag of grain. Once a symbol can stand for an absent quantity, reasoning can operate on the symbol instead of the object.", [("Physical world", "objects + events"), ("Symbol", "portable representation"), ("Reasoning", "operate without the object")]),
            ("2 · Positional notation compresses quantity", "Place value gives a small alphabet enormous range.", "Zero first works as an empty position and later as a number with arithmetic rules. Compact notation makes general calculation systematic and scalable.", [("Position", "changes value"), ("Zero", "placeholder → number"), ("Effect", "compact arithmetic")]),
            ("3 · Algebra represents the unknown", "A relationship can be manipulated before its value is known.", "General rules for equations and later letter-based notation turn unknown quantities into objects of reasoning. The procedure becomes reusable across problems.", [("Unknown", "symbolic variable"), ("Rule", "transform both sides"), ("Generalization", "one method, many cases")]),
            ("4 · Proof formalizes reliable inference", "Mathematics becomes a chain whose steps can be checked.", "Axioms, definitions and deduction separate a convincing answer from a reproducible argument. Formal reasoning is a precursor to executable logic.", [("Premises", "explicit assumptions"), ("Inference", "licensed step"), ("Conclusion", "checkable result")]),
            ("5 · Calculus makes change computable", "Static symbols become models of motion and accumulation.", "Derivatives and integrals provide general tools for rates, optimization and continuous change—the mathematical language later used throughout physics, optimization and machine learning.", [("Derivative", "local rate"), ("Integral", "accumulation"), ("Bridge to AI", "optimization + dynamics")]),
        ],
    },
    "02-mecanizar": {
        "title": "Mechanize — from calculation to computing",
        "subtitle": "How symbolic procedures became machines, programs and the foundations of modern computers.",
        "tag": "HISTORY OF AI · CHAPTER 2",
        "scenes": [
            ("1 · Calculation becomes physical machinery", "A procedure can be embedded in mechanisms.", "Mechanical calculators showed that repeatable symbolic operations need not remain mental work. Gears and carries externalized arithmetic into hardware.", [("Input", "encoded numbers"), ("Mechanism", "fixed procedure"), ("Output", "computed result")]),
            ("2 · Programs separate instructions from machinery", "The same machine can follow different procedures.", "Programmable patterns, Babbage's architecture and the idea of reusable instructions move computation from one-purpose devices toward general machines.", [("Hardware", "reusable machine"), ("Program", "changeable instructions"), ("Memory", "state + data")]),
            ("3 · Logic becomes algebra", "Truth values can be manipulated symbolically.", "Boolean algebra turns logical relations into formal operations. This supplies a bridge from reasoning about propositions to circuits implementing logical gates.", [("AND", "both true"), ("OR", "at least one"), ("NOT", "invert state")]),
            ("4 · Computability defines both power and limits", "A general computer still cannot solve every well-posed question.", "Formal models of computation clarify what an algorithm is, what a universal machine can emulate and why some problems are undecidable.", [("Algorithm", "finite procedure"), ("Universal machine", "emulate programs"), ("Limit", "undecidable problems")]),
            ("5 · Stored-program computers unify the stack", "Data and instructions become machine-readable state.", "Electronic switching, memory, architecture and information theory turn abstract computation into practical, programmable systems—the platform on which AI research begins.", [("CPU", "execute instructions"), ("Memory", "store state"), ("Information", "encode + transmit")]),
        ],
    },
    "03-aprender": {
        "title": "Learn — from rules to data",
        "subtitle": "How machine learning replaced hand-written behavior with parameters fitted from examples.",
        "tag": "HISTORY OF AI · CHAPTER 3",
        "scenes": [
            ("1 · The question changes", "Instead of writing every rule, can a machine infer one?", "Early AI exposed the brittleness of explicitly encoding intelligence. Machine learning reframes the problem as selecting a model whose behavior improves from data.", [("Rules", "program behavior directly"), ("Data", "examples constrain behavior"), ("Model", "learned mapping")]),
            ("2 · Perceptrons introduce trainable weights", "A decision boundary can be adjusted from mistakes.", "The perceptron is simple, but conceptually decisive: behavior is controlled by parameters that an algorithm updates from examples rather than by a fixed decision table.", [("Inputs", "features"), ("Weights", "trainable parameters"), ("Update", "learn from error")]),
            ("3 · Probability handles uncertainty", "Prediction becomes inference under incomplete information.", "Statistical models quantify uncertainty, combine evidence and generalize from observed samples. This becomes central to speech, language and pattern recognition.", [("Data", "sample"), ("Model", "distribution"), ("Prediction", "probabilistic inference")]),
            ("4 · Backpropagation makes deep credit assignment practical", "Errors can be propagated through layers.", "Gradients connect an output error to parameter updates across a network. Combined with optimization, this provides the training engine behind modern deep learning.", [("Loss", "measure error"), ("Gradient", "direction of change"), ("Optimizer", "update parameters")]),
            ("5 · Data + GPUs + benchmarks trigger the neural revival", "Algorithms matter, but regimes matter too.", "Larger labeled datasets, faster parallel hardware and shared benchmarks let neural networks improve rapidly and make 2012 a visible regime change rather than an isolated invention.", [("Data", "scale examples"), ("GPU", "parallel compute"), ("Benchmark", "measure progress")]),
        ],
    },
    "04-escalar": {
        "title": "Scale — deep learning to foundation models",
        "subtitle": "Why more data and compute mattered only when architecture and training made them usable.",
        "tag": "HISTORY OF AI · CHAPTER 4",
        "scenes": [
            ("1 · 2012 shows a new scaling regime", "Deep networks become competitive when the stack aligns.", "Large datasets, GPUs and improved training let learned representations outperform hand-engineered pipelines in important perception tasks.", [("Data", "millions of examples"), ("Compute", "GPU acceleration"), ("Representation", "learned features")]),
            ("2 · Attention changes sequence modeling", "Relevant context can be selected directly.", "Attention lets a model weight relationships between tokens instead of compressing an entire sequence through one recurrent state. This improves parallelism and long-range interaction.", [("Query", "what is needed?"), ("Key", "what is available?"), ("Value", "information to combine")]),
            ("3 · Transformers make pretraining scalable", "Parallel sequence processing unlocks much larger training runs.", "The Transformer combines attention with highly parallel computation. Pretraining on broad corpora produces reusable representations that can later be adapted to many tasks.", [("Pretrain", "broad data"), ("Adapt", "many downstream tasks"), ("Scale", "data × compute × parameters")]),
            ("4 · Foundation models change the unit of reuse", "One model becomes infrastructure for many applications.", "Instead of training a separate model for every task, a broadly pretrained model can support prompting, fine-tuning, retrieval and tool-augmented systems.", [("Base model", "general capability"), ("Interface", "prompt + context"), ("Application", "task-specific system")]),
            ("5 · Scaling creates new capabilities and new constraints", "More capability does not remove system engineering.", "Alignment, inference cost, latency, evaluation, safety, data quality and deployment constraints become first-class as models move from benchmarks into products.", [("Capability", "what model can do"), ("Reliability", "when it works"), ("Deployment", "cost + latency + safety")]),
        ],
    },
    "05-mas-alla": {
        "title": "Beyond the Transformer",
        "subtitle": "Why frontier capability is increasingly shaped by inference, memory, tools and interaction with the world.",
        "tag": "HISTORY OF AI · CHAPTER 5",
        "scenes": [
            ("1 · Pure parameter scaling is not the only lever", "Capability can also be bought at inference time.", "Longer reasoning, search, sampling and verification allocate extra computation after training. Test-time compute changes the trade-off between latency, cost and answer quality.", [("Training", "fixed model parameters"), ("Inference", "adaptive compute"), ("Trade-off", "quality ↔ latency/cost")]),
            ("2 · Memory extends beyond the context window", "Useful state can live outside model weights.", "Retrieval, external memory and structured state let systems recall information selectively instead of relying only on parameters or ever-longer prompts.", [("Weights", "compressed prior knowledge"), ("Context", "working memory"), ("External store", "retrievable state")]),
            ("3 · Agents connect models to actions", "A model becomes one component inside a control loop.", "Planning, tools, observation and iteration let systems act on software and the web. Reliability now depends on orchestration and permissions, not just language-model quality.", [("Plan", "choose next step"), ("Tool", "act externally"), ("Observe", "update state")]),
            ("4 · World models target prediction of environments", "Language is not the only structure worth modeling.", "Systems that learn how environments evolve can support planning, simulation and control. Robotics makes this concrete because actions have physical consequences.", [("State", "what exists now"), ("Dynamics", "how it changes"), ("Action", "intervene + predict")]),
            ("5 · The frontier is a composed system", "Model, memory, search, tools and verification interact.", "Future progress may come less from one architectural replacement than from better combinations of learned models with inference-time computation, grounded state and controlled action.", [("Model", "generate + predict"), ("System", "memory + tools + verifier"), ("Goal", "reliable useful behavior")]),
        ],
    },
}

CSS = r"""
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#0b1220;color:#f3f6ff;font-family:Arial,'Helvetica Neue',sans-serif}.slide{position:absolute;inset:0;background:radial-gradient(circle at 82% 50%,rgba(124,199,255,.10),transparent 31%),#0b1220}.slide:after{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.045) 1px,transparent 1px);background-size:48px 48px}.bar{height:7px;background:linear-gradient(90deg,#ffb343,#26a69a,#7cc7ff)}.content{position:absolute;left:140px;top:125px;width:1030px;z-index:2}.eyebrow{font-size:18px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:#ffb343}.headline{font-size:72px;line-height:1.05;letter-spacing:-.035em;font-weight:900;margin-top:28px;max-width:1010px}.sub{font-size:31px;line-height:1.42;color:rgba(243,246,255,.72);margin-top:30px;max-width:990px}.body{font-size:29px;line-height:1.47;color:rgba(243,246,255,.77);margin-top:30px;max-width:990px}.visual{position:absolute;right:105px;top:190px;width:600px;height:650px;display:grid;gap:16px;align-content:center;z-index:2}.card{border:1px solid rgba(243,246,255,.14);border-radius:22px;padding:25px 28px;background:rgba(243,246,255,.045);box-shadow:0 18px 50px rgba(0,0,0,.18)}.card strong{display:block;font-size:26px}.card span{display:block;font-size:19px;line-height:1.35;color:rgba(243,246,255,.62);margin-top:7px}.num{position:absolute;right:138px;bottom:62px;font-size:178px;font-weight:900;color:rgba(255,179,67,.055);z-index:1}.footer{position:absolute;left:140px;right:140px;bottom:48px;display:flex;justify-content:space-between;align-items:center;z-index:2;color:rgba(243,246,255,.36);font-size:15px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.logo{font-size:38px;font-weight:900;letter-spacing:-3px;background:linear-gradient(135deg,#ffb343,#26a69a,#7cc7ff);-webkit-background-clip:text;color:transparent}.opening .content{top:200px;width:1120px}.opening h1{font-size:104px;line-height:.96;letter-spacing:-.05em;margin:34px 0 30px}.opening .sub{font-size:34px;max-width:1080px}.orb{position:absolute;right:160px;top:230px;width:500px;height:500px;border-radius:50%;border:2px solid rgba(255,179,67,.28);box-shadow:0 0 0 80px rgba(38,166,154,.06),0 0 0 160px rgba(124,199,255,.035);z-index:2}.orb:before,.orb:after{content:'';position:absolute;border-radius:50%;background:#ffb343;box-shadow:0 0 26px rgba(255,179,67,.5)}.orb:before{width:24px;height:24px;left:238px;top:-13px}.orb:after{width:18px;height:18px;right:45px;bottom:78px;background:#26a69a}
"""


def esc(v): return html.escape(str(v), quote=True)


def opening_html(plan):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head><body><section class="slide opening"><div class="bar"></div><div class="content"><div class="eyebrow">{esc(plan['tag'])}</div><h1>{esc(plan['title'])}</h1><div class="sub">{esc(plan['subtitle'])}</div></div><div class="orb"></div><div class="footer"><span>5SIGMAS · NATIVE ENGLISH MEDIA</span><span class="logo">5σ</span></div></section></body></html>'''


def scene_html(plan, index, scene):
    headline, sub, body, cards = scene
    card_html = ''.join(f'<div class="card"><strong>{esc(a)}</strong><span>{esc(b)}</span></div>' for a,b in cards)
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head><body><section class="slide"><div class="bar"></div><div class="content"><div class="eyebrow">{esc(plan['tag'])}</div><div class="headline">{esc(headline)}</div><div class="sub">{esc(sub)}</div><div class="body">{esc(body)}</div></div><div class="visual">{card_html}</div><div class="num">0{index}</div><div class="footer"><span>{esc(plan['title'])}</span><span class="logo">5σ</span></div></section></body></html>'''


def run(*args):
    subprocess.run(args, check=True)


async def render_slide(page, markup, out):
    await page.set_content(markup, wait_until="load")
    await page.screenshot(path=str(out), type="png")


async def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
            for slug, plan in PLANS.items():
                frames = []
                first = tmp / f"{slug}-00.png"
                await render_slide(page, opening_html(plan), first)
                frames.append(first)
                for i, scene in enumerate(plan["scenes"], 1):
                    frame = tmp / f"{slug}-{i:02d}.png"
                    await render_slide(page, scene_html(plan, i, scene), frame)
                    frames.append(frame)

                segments = []
                for i, frame in enumerate(frames):
                    seg = tmp / f"{slug}-seg-{i:02d}.mp4"
                    run("ffmpeg","-y","-loglevel","error","-loop","1","-i",str(frame),"-t",str(SCENE_SECONDS),"-vf",f"scale={W}:{H},fade=t=in:st=0:d=0.35,fade=t=out:st={SCENE_SECONDS-0.35}:d=0.35","-r",str(FPS),"-c:v","libx264","-preset","medium","-crf","18","-pix_fmt","yuv420p",str(seg))
                    segments.append(seg)
                listing = tmp / f"{slug}.txt"
                listing.write_text(''.join(f"file '{s.as_posix()}'\n" for s in segments), encoding="utf-8")
                out_mp4 = ROOT / f"{slug}.mp4"
                out_jpg = ROOT / f"{slug}.jpg"
                run("ffmpeg","-y","-loglevel","error","-f","concat","-safe","0","-i",str(listing),"-c","copy",str(out_mp4))
                run("ffmpeg","-y","-loglevel","error","-i",str(first),"-q:v","2",str(out_jpg))
                print(f"rendered {out_mp4} and {out_jpg}")
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
