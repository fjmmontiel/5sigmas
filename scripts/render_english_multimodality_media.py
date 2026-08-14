#!/usr/bin/env python3
"""Render native-English Multimodality MP4/poster pairs without Spanish media reuse.

The content plans are distilled from the canonical English Multimodality series.
Rendering is deterministic once Chromium/ffmpeg versions are fixed: each video
uses native-English 1920x1080 teaching scenes, captured with Chromium and joined
with short cross-fades into H.264/yuv420p MP4 output.
"""

import argparse
import asyncio
import html
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

W, H = 1920, 1080
SCENE_SECONDS = 10.8
FADE_SECONDS = 0.55
FPS = 30

PLANS = {
    "00_presentacion_serie": {
        "title": "Multimodality in Generative AI",
        "subtitle": "How systems perceive, align, reason, generate and act across text, images, audio, video, documents and signals from the world.",
        "tag": "MULTIMODALITY · SERIES MAP",
        "scenes": [
            ("1 · Preserve the modality", "Do not collapse evidence too early.", "Text is discrete, images are spatial, audio is temporal and documents carry layout. Converting everything to text can discard the exact structure the task depends on.", [("Text", "symbols + sequence"), ("Image", "space + regions"), ("Audio / video", "time + synchrony"), ("Documents", "layout + hierarchy")]),
            ("2 · Align signals", "Different inputs can refer to one event.", "Contrastive and multimodal representation learning connect signals strongly enough for retrieval and transfer, but alignment quality is limited by the coverage and precision of the training pairs.", [("Represent", "encode each modality"), ("Align", "connect related evidence"), ("Transfer", "reuse the geometry")]),
            ("3 · Choose an architecture", "Connector, cross-attention, early fusion or omni?", "The right family depends on which modalities must remain active, whether outputs are multimodal, and what latency and serving cost the product can tolerate.", [("Connector", "modular + efficient"), ("Cross-attention", "dynamic evidence access"), ("Early fusion", "joint pretraining"), ("Omni", "streaming input + output")]),
            ("4 · Evaluate grounding", "A correct answer can still use the wrong evidence.", "Multimodal evaluation has to prove the model actually used the image, audio, document or video—not merely language priors or memorized benchmark material.", [("Grounding", "supported by source"), ("Ablation", "remove the modality"), ("Calibration", "know when evidence is weak")]),
            ("5 · Treat perception as untrusted", "More modalities create more instruction-bearing surface.", "Images, audio and retrieved documents can carry hostile or misleading content. Perception must never become authorization merely because a model interpreted it as an instruction.", [("Perception", "untrusted input"), ("Reasoning", "bounded inference"), ("Action", "independent policy")]),
        ],
    },
    "01-el-problema": {
        "title": "The Real Problem of Multimodality",
        "subtitle": "Integrate heterogeneous signals without destroying what each modality contributes before reasoning has a chance to use it.",
        "tag": "MULTIMODALITY · CHAPTER 1",
        "scenes": [
            ("1 · A modality is structure", "Input type is not the important distinction.", "A word, image patch, audio frame and sensor reading encode different structures. Spatial position, temporal order, prosody and layout can all be part of the evidence.", [("Text", "discrete sequence"), ("Image", "spatial structure"), ("Audio", "continuous time"), ("Sensor", "continuous state")]),
            ("2 · Three integration levels", "Translation is not the same as alignment.", "A system can translate a modality into text, align representations across modalities, or keep multiple modalities operationally present during inference. These solve different problems.", [("Translate", "collapse to another modality"), ("Align", "learn correspondence"), ("Co-presence", "retain evidence in inference")]),
            ("3 · No universal architecture", "Shared spaces are useful, not mandatory.", "CLIP and ImageBind emphasize aligned representations; Flamingo and BLIP-2 bridge specialized components; PaLM-E and omni models extend the problem into state, action and streaming.", [("Embeddings", "shared geometry"), ("Connectors", "bridge modules"), ("Cross-attention", "query evidence"), ("Omni", "stream in + out")]),
            ("4 · Five capabilities", "Perceive → align → reason → generate → act.", "Multimodal systems differ in which parts of this chain they support. A retrieval model can align without generating; an embodied system may act while remaining narrow outside its control domain.", [("Perceive", "extract evidence"), ("Align", "connect signals"), ("Reason", "operate on evidence"), ("Generate / act", "produce effects")]),
            ("5 · The hard failures", "Grounding and time are first-class problems.", "Different granularity, temporal structure, modality collapse and weak grounding make fluent output a poor proxy for actual perceptual understanding.", [("Granularity", "units differ"), ("Time", "order carries meaning"), ("Grounding", "claims match evidence"), ("Collapse", "information was discarded")]),
        ],
    },
    "02-alineamiento": {
        "title": "Alignment: From Pairs to Interactions",
        "subtitle": "How separate modalities become connected—and why the data distribution often determines the model's real capability profile.",
        "tag": "MULTIMODALITY · CHAPTER 2",
        "scenes": [
            ("1 · Contrastive pairs", "Matching signals move closer; mismatches move apart.", "CLIP-style training does not require generating a caption. It learns compatibility between paired image and text representations, enabling retrieval and zero-shot transfer.", [("Image encoder", "visual representation"), ("Text encoder", "language representation"), ("Contrastive loss", "match the right pair")]),
            ("2 · Beyond image–text", "One anchor can connect several modalities.", "ImageBind showed that text, audio, depth, thermal and IMU signals can align through image as a common anchor, without collecting every possible pairwise dataset directly.", [("Text", "↘"), ("Audio", "→ image anchor"), ("Depth / thermal", "↗"), ("IMU", "shared space")]),
            ("3 · Instruction tuning", "Aligned representations do not imply task following.", "Image + instruction + expected response trains a different layer: the model must use perceptual evidence in the context of a requested task. Synthetic instructions scale, but inherit generator blind spots.", [("Evidence", "image / document"), ("Instruction", "what to do"), ("Target", "expected response")]),
            ("4 · Data writes the failure profile", "Capacity is not the same as learned reliability.", "If pretraining underrepresents localization, handwriting, rare categories or precise temporal relationships, later tuning begins from weak features rather than magically reconstructing missing evidence.", [("Coverage", "what is represented"), ("Precision", "how exact labels are"), ("Slices", "where failures cluster")]),
            ("5 · Preferences add another bias layer", "Who defines “better” matters.", "Preference post-training can improve usefulness, refusals and uncertainty communication, but evaluator populations and rating criteria can also reward style or cultural conventions unrelated to perceptual correctness.", [("Pretraining", "representation bias"), ("Instruction data", "task bias"), ("Preferences", "evaluator bias")]),
        ],
    },
    "03-arquitecturas": {
        "title": "Multimodal System Architectures",
        "subtitle": "Four families organize the field: connector systems, cross-attention, native early fusion and omni/streaming models.",
        "tag": "MULTIMODALITY · CHAPTER 3",
        "scenes": [
            ("1 · Encoder + connector + LLM", "Modularity is the advantage—and the bottleneck.", "A specialized encoder extracts perceptual features, a connector maps them into the language model, and the LLM generates. Reuse is efficient, but compressed-away detail may be unrecoverable.", [("Encoder", "extract features"), ("Connector", "compress / project"), ("LLM", "reason + generate")]),
            ("2 · Cross-attention", "Keep perceptual evidence queryable during generation.", "Instead of one fixed prefix, text generation can attend back to separately represented visual evidence. Fine-grained access improves flexibility while adding inference compute and serving complexity.", [("Text token", "asks for evidence"), ("Cross-attention", "selects relevant features"), ("Visual memory", "remains available")]),
            ("3 · Native / early fusion", "Learn cross-modal interaction throughout pretraining.", "More unified models process token-like representations from several modalities in one sequence. The structural upside is joint learning; the cost is the data and compute needed to relearn strong modality representations at scale.", [("Text tokens", "joint sequence"), ("Image / audio tokens", "joint sequence"), ("Transformer", "shared processing")]),
            ("4 · Omni + streaming", "Real time changes the architecture problem.", "When audio or video keeps arriving while inference runs, the system must manage active context, first-response latency, turn-taking and synchronized multimodal outputs—not just final-answer quality.", [("Input stream", "still arriving"), ("Active context", "bounded memory"), ("Output stream", "text / speech")]),
            ("5 · Select on the real surface", "Quality × cost × latency × observability.", "Architecture selection is a production decision. A slightly stronger benchmark result can be the wrong system if every token becomes slower, more expensive or harder to observe reliably.", [("Quality", "grounded capability"), ("Cost", "training + serving"), ("Latency", "user-visible delay"), ("Ops", "evaluate + monitor")]),
        ],
    },
    "04-evaluacion": {
        "title": "Evaluating Multimodal Systems",
        "subtitle": "Measure grounding, ablations, calibration and hard modality slices—not just final-answer accuracy on public leaderboards.",
        "tag": "MULTIMODALITY · CHAPTER 4",
        "scenes": [
            ("1 · Grounding", "Was the answer supported by the actual evidence?", "A model can guess a common answer from language priors and still score as correct. Counter-prior cases force the decisive information to come from the image, audio, document or video.", [("Question", "creates a prior"), ("Perceptual source", "contains evidence"), ("Grounded answer", "must follow evidence")]),
            ("2 · Modality ablation", "Remove the image and see what survives.", "If performance barely changes when the tested modality disappears, the benchmark may mostly measure language. Ablation exposes shortcuts that ordinary accuracy hides.", [("Full input", "text + modality"), ("Ablated", "text only"), ("Gap", "evidence contribution")]),
            ("3 · Contamination", "Public benchmark material can enter pretraining.", "Exact text deduplication is not enough for images and transformed copies. New or protected tests, similarity analysis and contamination reporting are needed to separate generalization from recognition.", [("Training web", "may contain benchmark"), ("Near duplicates", "harder to detect"), ("Fresh tests", "cleaner signal")]),
            ("4 · Metrics beyond accuracy", "Consistency, localization and abstention reveal different failures.", "A production evaluator should test whether answers stay stable under harmless changes, whether decisive regions can be localized, and whether the system lowers confidence when evidence is insufficient.", [("Consistency", "paraphrase stability"), ("Localization", "point to evidence"), ("Calibration", "confidence tracks evidence")]),
            ("5 · Hard slices are heterogeneous", "Documents, audio, long video and spatial reasoning fail differently.", "OCRBench, MMAU, MMMU, Video-MME, ZeroBench and HallusionBench probe distinct limits. One aggregate score can hide exactly the slice that matters to the product.", [("Documents", "layout + OCR"), ("Audio", "causal + mixed sources"), ("Video", "long temporal context"), ("Spatial", "geometry + hallucination")]),
        ],
    },
    "05-riesgos": {
        "title": "Risks of Multimodal AI Systems",
        "subtitle": "When perception becomes part of the attack surface, interpretation must stay separate from authorization and high-impact action.",
        "tag": "MULTIMODALITY · CHAPTER 5",
        "scenes": [
            ("1 · Prompt injection is multimodal", "Instructions can arrive inside the content being inspected.", "A webpage, PDF, screenshot, image or audio stream may contain hostile instructions. OCR and perception outputs are untrusted data, not privileged commands.", [("External content", "untrusted"), ("Perception", "extracts semantics"), ("System policy", "retains authority")]),
            ("2 · Audio is another instruction channel", "Continuous input does not deserve continuous authority.", "Native-audio systems can receive speech, background signals and adversarial content in the same stream. Tool permissions and confirmations must live in orchestration, outside semantic interpretation.", [("Audio", "untrusted signal"), ("Model", "interprets"), ("Tool layer", "authorizes independently")]),
            ("3 · Retrieval becomes supply chain", "RAG elevates external objects into active context.", "If an index can contain poisoned documents, images or recordings, ranking can promote malicious evidence precisely because the system trusts retrieval as context. Provenance and integrity matter.", [("Index", "control who writes"), ("Retrieve", "rank with trust"), ("Context", "cite + verify")]),
            ("4 · Hidden data crosses boundaries", "A file contains more than visible pixels or text.", "EXIF, GPS, timestamps, authorship, comments, thumbnails and document history can leave the user's environment unless ingestion explicitly strips or preserves metadata by policy.", [("Visible payload", "what user sees"), ("Metadata", "secondary information"), ("Boundary", "what leaves the system")]),
            ("5 · Perception errors can become actions", "Answer correctness is weaker than decision safety.", "A mistaken observation changes reasoning, which changes the selected action and the next environment state. High-impact operations need abstention, deterministic checks, bounded actions and human approval.", [("Perceive", "uncertain evidence"), ("Reason", "error can propagate"), ("Act", "external state change"), ("Verify", "policy before effect")]),
        ],
    },
}

CSS = r"""
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#0b1220;color:#f0f4ff;font-family:Arial,'Helvetica Neue',sans-serif}
.beat{--c:#26A69A;position:absolute;inset:0;overflow:hidden;background:#0b1220}.beat:before{content:'';position:absolute;right:-140px;bottom:-160px;width:820px;height:820px;border-radius:50%;background:radial-gradient(circle,var(--c) 0,transparent 68%);opacity:.075}.beat:after{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(240,244,255,.045) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}.accent{height:6px;background:linear-gradient(90deg,#26A69A,#324AB2 48%,#FFB343 85%)}.inner{position:absolute;left:150px;top:125px;width:1030px;height:820px}.eyebrow{font-size:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--c)}.headline{margin-top:30px;font-size:72px;line-height:1.04;letter-spacing:-.035em;font-weight:900;max-width:1020px}.body{margin-top:34px;font-size:29px;line-height:1.46;color:rgba(240,244,255,.78);max-width:985px}.footer{position:absolute;left:150px;right:150px;bottom:48px;display:flex;align-items:center;justify-content:space-between}.footer span:first-child{font-size:14px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:rgba(240,244,255,.34)}.logo{font-size:38px;font-weight:900;letter-spacing:-3px;background:linear-gradient(135deg,#26A69A,#7cc7ff,#FFB343);-webkit-background-clip:text;color:transparent}.visual{position:absolute;right:120px;top:175px;width:610px;height:680px;display:flex;align-items:center;justify-content:center}.opening .inner{top:205px;width:1090px}.opening .series{font-size:18px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:rgba(240,244,255,.45)}.opening h1{font-size:98px;line-height:.96;letter-spacing:-.05em;margin:36px 0 30px;max-width:1080px}.opening .sub{font-size:32px;line-height:1.4;color:rgba(240,244,255,.7);max-width:1050px}.opening .tag{margin-top:42px;font-size:23px;font-weight:800;color:#26A69A}.hero{width:530px;height:530px;position:relative}.hero .ring{position:absolute;border:2px solid rgba(124,199,255,.3);border-radius:50%;inset:35px}.hero .ring.r2{inset:105px;border-color:rgba(38,166,154,.4)}.hero .core{position:absolute;inset:185px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,rgba(38,166,154,.28),rgba(50,74,178,.3));border:1px solid rgba(240,244,255,.14);font-size:62px;font-weight:900}.hero .dot{position:absolute;width:18px;height:18px;border-radius:50%;background:#FFB343;box-shadow:0 0 28px rgba(255,179,67,.5)}.hero .d1{left:255px;top:24px}.hero .d2{right:34px;top:250px;background:#7cc7ff}.hero .d3{left:65px;bottom:80px;background:#26A69A}.cards{width:590px;display:grid;gap:13px}.card{padding:20px 24px;border:1px solid rgba(240,244,255,.14);border-radius:18px;background:rgba(240,244,255,.04);position:relative;overflow:hidden}.card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(#26A69A,#7cc7ff,#FFB343)}.card strong{display:block;font-size:25px;margin-bottom:6px}.card small{font-size:18px;line-height:1.32;color:rgba(240,244,255,.62)}.rail{height:4px;margin:1px 0;background:linear-gradient(90deg,#26A69A,#7cc7ff,#FFB343);border-radius:999px}.index{position:absolute;right:150px;bottom:130px;font-size:180px;font-weight:900;color:rgba(124,199,255,.045);letter-spacing:-.08em}
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
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', '-r', str(FPS), str(out_mp4),
    ], check=True)
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(poster_png),
        '-frames:v', '1', '-q:v', '3', str(out_jpg),
    ], check=True)


async def render_slug(slug, plan, output_root):
    with tempfile.TemporaryDirectory(prefix=f's5-en-mm-{slug}-') as tmp:
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
    parser.add_argument('--output-root', default='locales/en/series/multimodalidad-iag')
    parser.add_argument('--slug', choices=sorted(PLANS))
    args = parser.parse_args()
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    selected = {args.slug: PLANS[args.slug]} if args.slug else PLANS
    for slug, plan in selected.items():
        await render_slug(slug, plan, output_root)


if __name__ == '__main__':
    asyncio.run(main())
