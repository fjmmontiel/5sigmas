#!/usr/bin/env python3
"""Render native-English Energy-series MP4/poster pairs without Spanish media reuse.

The teaching plans are distilled from the canonical English AI, GDP, Well-being
and Energy series. Rendering is deterministic once Chromium/ffmpeg versions are
fixed: native-English 1920x1080 scenes are captured with Chromium and joined
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
        "title": "AI, GDP, Well-being and Energy",
        "subtitle": "A causal map from reliable electricity to compute infrastructure, economic measurement and AI productivity diffusion.",
        "tag": "ENERGY + ECONOMICS · SERIES MAP",
        "scenes": [
            ("1 · Electricity enables systems", "Useful power is more than a grid connection.", "Health, logistics, industry and digital services depend on electricity that is reliable, affordable and usable at the required capacity.", [("Quantity", "kWh available"), ("Quality", "reliability + stability"), ("Affordability", "usable access")]),
            ("2 · AI is physical compute", "Software runs on an electrical stack.", "Accelerators, memory, networking, storage and cooling turn electricity into model training and serving. A bottleneck in any layer can constrain deployable AI capacity.", [("Compute", "accelerators + memory"), ("Facility", "power + cooling"), ("Grid", "capacity + reliability")]),
            ("3 · GDP is not well-being", "Market output answers only one question.", "GDP measures economic activity well, but distribution, unpaid work, service quality, security, environment and subjective well-being require additional indicators.", [("GDP", "market activity"), ("Distribution", "who gains"), ("Well-being", "lived outcomes")]),
            ("4 · Productivity diffuses slowly", "Task gains sit upstream of macro growth.", "AI has to move from individual tasks through workflow redesign, firms and sectors before economy-wide productivity statistics can show a durable effect.", [("Task", "measured gain"), ("Firm", "workflow redesign"), ("Economy", "diffusion at scale")]),
            ("5 · Read the full causal stack", "Capability alone does not determine impact.", "Infrastructure constrains deployment, measurement determines what counts as progress, and organizational redesign determines whether technical capability becomes durable economic output.", [("Energy", "physical constraint"), ("Measurement", "define outcomes"), ("Diffusion", "convert capability to value")]),
        ],
    },
    "01-electricidad-bienestar": {
        "title": "Electricity and Well-being",
        "subtitle": "Why reliable and affordable electricity enables essential services—and why quality matters as much as total consumption.",
        "tag": "ENERGY + ECONOMICS · CHAPTER 1",
        "scenes": [
            ("1 · Electricity is enabling infrastructure", "Its value appears in downstream systems.", "Refrigeration, diagnostics, pumps, motors, communications and payment systems become dependable only when electricity is continuously usable.", [("Health", "cold chain + equipment"), ("Production", "motors + machinery"), ("Connectivity", "networks + devices")]),
            ("2 · Connection ≠ effective access", "A wire to the grid is not the same as usable service.", "Reliability, voltage stability, available capacity and affordability determine what a household, clinic or workshop can actually operate.", [("Connection", "binary statistic"), ("Reliability", "outages matter"), ("Capacity", "can loads run?")]),
            ("3 · Benefits are nonlinear", "The first reliable supply can unlock whole services.", "At low access levels, additional usable electricity creates large gains. Once broad dependable access exists, other institutions and constraints explain more of the remaining outcome differences.", [("Low access", "large marginal gains"), ("Broad access", "diminishing returns"), ("Institutions", "shape distribution")]),
            ("4 · Outages cost more than missing kWh", "Random interruption breaks active processes.", "Production stops, backup systems start, refrigeration and communications degrade, and uncertainty makes scheduling harder. Predictability changes the operational cost.", [("Downtime", "lost production"), ("Backup", "extra cost"), ("Uncertainty", "harder planning")]),
            ("5 · The AI bridge", "Compute is downstream of the same infrastructure.", "Accelerators and model serving need continuous power, grid capacity and cooling. The relevant question is how reliably energy reaches useful compute, not merely how much electricity exists nationally.", [("Grid", "reliable supply"), ("Data center", "facility capacity"), ("AI service", "useful compute")]),
        ],
    },
    "02-ia-tecnologia-electrica": {
        "title": "AI as an Electrical Technology",
        "subtitle": "How AI workloads become electricity demand, why efficiency and total demand can rise together, and where the physical bottlenecks live.",
        "tag": "ENERGY + ECONOMICS · CHAPTER 2",
        "scenes": [
            ("1 · AI runs on a physical stack", "Model capability has an infrastructure footprint.", "Training and serving depend on accelerators, memory, networking, storage, cooling and reliable electricity. Software abstractions do not remove those constraints.", [("Accelerators", "compute"), ("Memory + network", "feed compute"), ("Power + cooling", "keep it operating")]),
            ("2 · Training and serving differ", "Finite runs and continuous workloads have different shapes.", "Training concentrates compute into bounded periods. Serving repeats smaller workloads across users and time, so lifetime demand can become dominated by inference at sufficient scale.", [("Training", "episodic + concentrated"), ("Serving", "continuous + repeated"), ("Volume", "multiplies small costs")]),
            ("3 · Efficiency can increase demand", "Energy per task is only one factor.", "Total electricity follows energy per task × number of tasks × workload complexity. If usage expands faster than efficiency improves, aggregate demand still rises.", [("Efficiency", "less energy / task"), ("Adoption", "more tasks"), ("Complexity", "heavier workloads")]),
            ("4 · Bottlenecks are layered", "A constraint anywhere can cap deployable capacity.", "Grid interconnection, facilities, accelerators, networking, cooling and supply chains all matter. Global averages can hide local constraints where compute is concentrated.", [("Grid", "interconnection"), ("Hardware", "chips + network"), ("Facility", "cooling + power")]),
            ("5 · Measure with explicit boundaries", "There is no universal Wh-per-query constant.", "Model size, modality, context, output, hardware, utilization, facility overhead and lifecycle assumptions all change the result. Useful comparisons expose those boundaries.", [("Workload", "what is computed"), ("Hardware", "how efficiently"), ("Lifecycle", "what costs are counted")]),
        ],
    },
    "03-pib-vs-bienestar": {
        "title": "Measurement: GDP vs Well-being",
        "subtitle": "GDP measures market activity; evaluating technological progress requires distribution, quality and lived outcomes too.",
        "tag": "ENERGY + ECONOMICS · CHAPTER 3",
        "scenes": [
            ("1 · GDP measures output, not everything valuable", "A precise metric can still answer the wrong question.", "GDP captures market production well, but unpaid work, distribution, service quality, environmental externalities, security and social cohesion sit partly outside it.", [("GDP", "market production"), ("Excluded", "unpaid + externalities"), ("Average", "not distribution")]),
            ("2 · Well-being is multidimensional", "Income matters, but it is not the entire outcome.", "Health, education, safety, relationships, autonomy, environmental quality, time use and life satisfaction can move differently from aggregate economic output.", [("Material", "income + services"), ("Social", "support + safety"), ("Subjective", "experienced life")]),
            ("3 · Averages hide heterogeneous responses", "Population means can conceal different curves.", "Income and well-being are positively related, yet adaptation, relative position and subgroup differences mean the relationship is not one universal threshold or slope.", [("Income", "absolute resources"), ("Comparison", "relative position"), ("Heterogeneity", "subgroups differ")]),
            ("4 · Use complementary frameworks", "Broader metrics add dimensions rather than replacing GDP.", "HDI, OECD well-being measures, GPI-style accounting and subjective indicators answer questions that GDP alone cannot, each with different assumptions and trade-offs.", [("HDI", "health + education + income"), ("OECD", "multiple life dimensions"), ("GDP", "retain for market output")]),
            ("5 · Evaluate AI across layers", "Productivity and well-being are not interchangeable.", "Track task output, firm productivity, market output, distribution and lived outcomes separately. AI can improve one layer before—or without—improving all the others.", [("Task", "speed + quality"), ("Distribution", "who captures gains"), ("Well-being", "time + autonomy + security")]),
        ],
    },
    "04-ia-pib-hoy": {
        "title": "AI and GDP Today",
        "subtitle": "Why macro impact arrives late, where productivity signals appear first, and what evidence is worth watching before GDP moves.",
        "tag": "ENERGY + ECONOMICS · CHAPTER 4",
        "scenes": [
            ("1 · Macro impact sits at the end of a chain", "Adoption is not the same as productivity diffusion.", "AI must move through learning, workflow redesign, firm output and sector diffusion before aggregate productivity can reflect the underlying technical capability.", [("Adopt", "gain access"), ("Redesign", "change workflows"), ("Diffuse", "scale across firms")]),
            ("2 · The productivity J-curve", "Complementary investment can arrive before measured gains.", "Organizations spend on data, evaluation, integration, governance and training while old processes are still being reorganized. Early costs can precede durable productivity improvements.", [("Invest", "intangible capital"), ("Reorganize", "workflow change"), ("Gain", "arrives later")]),
            ("3 · Evidence appears first at task level", "A task gain is evidence—not a GDP multiplier.", "Controlled and field studies can measure time, completion or quality improvements in specific work. Coordination, review, demand and saved-time allocation determine how much survives at firm scale.", [("Task", "direct measurement"), ("Team", "coordination"), ("Firm", "operational throughput")]),
            ("4 · Adoption depth matters", "Trying a chatbot and redesigning production are different states.", "Access → isolated use → integration → workflow redesign → reliable scale. Macro effects depend more on depth × diffusion than on the number of people who have experimented once.", [("Access", "tool available"), ("Integration", "real workflows"), ("Scale", "repeatable production")]),
            ("5 · Forecasts encode assumptions", "Large disagreement can be structurally rational.", "Macro estimates diverge because they assume different task exposure, adoption speed, complementary investment, new-task creation and horizons. Watch real production adoption and repeated measured gains.", [("Exposure", "what AI can affect"), ("Diffusion", "how fast"), ("New tasks", "substitution vs creation")]),
        ],
    },
}

CSS = r"""
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#0b1220;color:#f0f4ff;font-family:Arial,'Helvetica Neue',sans-serif}
.beat{--c:#FFB343;position:absolute;inset:0;overflow:hidden;background:#0b1220}.beat:before{content:'';position:absolute;right:-140px;bottom:-160px;width:820px;height:820px;border-radius:50%;background:radial-gradient(circle,var(--c) 0,transparent 68%);opacity:.075}.beat:after{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(240,244,255,.045) 1px,transparent 1px);background-size:48px 48px;pointer-events:none}.accent{height:6px;background:linear-gradient(90deg,#FFB343,#26A69A 48%,#7cc7ff 85%)}.inner{position:absolute;left:150px;top:125px;width:1030px;height:820px}.eyebrow{font-size:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--c)}.headline{margin-top:30px;font-size:72px;line-height:1.04;letter-spacing:-.035em;font-weight:900;max-width:1020px}.body{margin-top:34px;font-size:29px;line-height:1.46;color:rgba(240,244,255,.78);max-width:985px}.footer{position:absolute;left:150px;right:150px;bottom:48px;display:flex;align-items:center;justify-content:space-between}.footer span:first-child{font-size:14px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:rgba(240,244,255,.34)}.logo{font-size:38px;font-weight:900;letter-spacing:-3px;background:linear-gradient(135deg,#FFB343,#26A69A,#7cc7ff);-webkit-background-clip:text;color:transparent}.visual{position:absolute;right:120px;top:175px;width:610px;height:680px;display:flex;align-items:center;justify-content:center}.opening .inner{top:205px;width:1090px}.opening .series{font-size:18px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:rgba(240,244,255,.45)}.opening h1{font-size:98px;line-height:.96;letter-spacing:-.05em;margin:36px 0 30px;max-width:1080px}.opening .sub{font-size:32px;line-height:1.4;color:rgba(240,244,255,.7);max-width:1050px}.opening .tag{margin-top:42px;font-size:23px;font-weight:800;color:#FFB343}.hero{width:530px;height:530px;position:relative}.hero .ring{position:absolute;border:2px solid rgba(255,179,67,.32);border-radius:50%;inset:35px}.hero .ring.r2{inset:105px;border-color:rgba(38,166,154,.4)}.hero .core{position:absolute;inset:185px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,rgba(255,179,67,.22),rgba(38,166,154,.25));border:1px solid rgba(240,244,255,.14);font-size:62px;font-weight:900}.hero .dot{position:absolute;width:18px;height:18px;border-radius:50%;background:#FFB343;box-shadow:0 0 28px rgba(255,179,67,.5)}.hero .d1{left:255px;top:24px}.hero .d2{right:34px;top:250px;background:#7cc7ff}.hero .d3{left:65px;bottom:80px;background:#26A69A}.cards{width:590px;display:grid;gap:13px}.card{padding:20px 24px;border:1px solid rgba(240,244,255,.14);border-radius:18px;background:rgba(240,244,255,.04);position:relative;overflow:hidden}.card:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(#FFB343,#26A69A,#7cc7ff)}.card strong{display:block;font-size:25px;margin-bottom:6px}.card small{font-size:18px;line-height:1.32;color:rgba(240,244,255,.62)}.rail{height:4px;margin:1px 0;background:linear-gradient(90deg,#FFB343,#26A69A,#7cc7ff);border-radius:999px}.index{position:absolute;right:150px;bottom:130px;font-size:180px;font-weight:900;color:rgba(255,179,67,.045);letter-spacing:-.08em}
"""


def esc(value):
    return html.escape(value, quote=True)


def opening_html(plan):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head><body><section class="beat opening" style="--c:#FFB343"><div class="accent"></div><div class="inner"><div class="series">{esc(plan['tag'])}</div><h1>{esc(plan['title'])}</h1><div class="sub">{esc(plan['subtitle'])}</div><div class="tag">native English · 5Sigmas</div></div><div class="visual"><div class="hero"><div class="ring"></div><div class="ring r2"></div><div class="core">5σ</div><div class="dot d1"></div><div class="dot d2"></div><div class="dot d3"></div></div></div><div class="footer"><span>5Sigmas · {esc(plan['title'])}</span><span class="logo">5σ</span></div></section></body></html>'''


def scene_html(plan, scene, idx):
    eyebrow, headline, body, cards = scene
    cards_html = ''.join(
        f'<div class="card"><strong>{esc(label)}</strong><small>{esc(detail)}</small></div>' +
        ('<div class="rail"></div>' if i < len(cards) - 1 else '')
        for i, (label, detail) in enumerate(cards)
    )
    color = ['#FFB343', '#26A69A', '#7cc7ff', '#324AB2', '#FFB343'][idx % 5]
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><style>{CSS}</style></head><body><section class="beat" style="--c:{color}"><div class="accent"></div><div class="inner"><div class="eyebrow">{esc(eyebrow)}</div><div class="headline">{esc(headline)}</div><div class="body">{esc(body)}</div></div><div class="visual"><div class="cards">{cards_html}</div></div><div class="index">0{idx + 1}</div><div class="footer"><span>5Sigmas · {esc(plan['title'])}</span><span class="logo">5σ</span></div></section></body></html>'''


async def capture(plan, frame_dir, poster_png):
    async with async_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1']}
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
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', f'[{previous}]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', str(FPS), str(out_mp4)], check=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(poster_png), '-frames:v', '1', '-q:v', '3', str(out_jpg)], check=True)


async def render_slug(slug, plan, output_root):
    with tempfile.TemporaryDirectory(prefix=f's5-en-energy-{slug}-') as tmp:
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
    parser.add_argument('--output-root', default='locales/en/series/ia-pib-bienestar-energia')
    parser.add_argument('--slug', choices=sorted(PLANS))
    args = parser.parse_args()
    output_root = Path(args.output_root)
    output_root.mkdir(parents=True, exist_ok=True)
    selected = {args.slug: PLANS[args.slug]} if args.slug else PLANS
    for slug, plan in selected.items():
        await render_slug(slug, plan, output_root)


if __name__ == '__main__':
    asyncio.run(main())
