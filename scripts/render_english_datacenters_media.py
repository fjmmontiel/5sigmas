#!/usr/bin/env python3
"""Render native-English Data Centers in Space MP4/poster pairs.

No Spanish media is read or reused. The scenes are distilled from the canonical
English series and rendered as deterministic 1920x1080 English explainers.
"""

import asyncio
import html
import subprocess
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

W, H, FPS = 1920, 1080, 30
SCENE_SECONDS = 10.5
ROOT = Path("locales/en/series/datacenters-espacio")

PLANS = {
    "00_presentacion_serie": {
        "title": "Data Centers in Space",
        "subtitle": "Which terrestrial constraints orbit can relax, which new constraints it creates, and what is actually proven.",
        "tag": "ORBITAL COMPUTE · SERIES MAP",
        "scenes": [
            ("1 · Why now", "Compute growth is colliding with infrastructure.", "Power, water, land, permits, heat and latency are real constraints, but their severity depends on geography and workload. Orbital compute only matters if it improves the full system.", [("Pressure", "AI demand × buildout"), ("Ground", "six recurring bottlenecks"), ("Test", "system economics")]),
            ("2 · Heat is still the hard physics", "Vacuum removes convection; it does not remove heat.", "Electronics still turn electrical power into waste heat. In orbit, that heat must ultimately leave as radiation, which makes radiator temperature, area and orientation first-class design variables.", [("Vacuum", "no convective cooling"), ("Heat sink", "radiative surface"), ("Constraint", "area grows fast")]),
            ("3 · Energy and links are conditional advantages", "Sunlight and vacuum propagation help only inside an end-to-end architecture.", "Long solar exposure can be valuable, but conversion, eclipses, storage and degradation still matter. Vacuum propagation is faster than fiber, yet link windows, relays, weather and downlink capacity can dominate latency.", [("Power", "solar exposure"), ("Network", "geometry + capacity"), ("Rule", "end-to-end > headline metric")]),
            ("4 · Real hardware is not yet an orbital cloud", "Edge processing, servers and AI demonstrations prove layers of the stack.", "Useful compute already runs in orbit, from onboard inference to server-class experiments. That demonstrates feasibility of components—not a multi-tenant cloud with terrestrial reliability, economics and serviceability.", [("Today", "onboard edge compute"), ("Demonstrated", "server / AI workloads"), ("Missing", "cloud-service maturity")]),
            ("5 · The footprint moves; it does not disappear", "Water, energy, minerals and lifecycle remain part of the accounting.", "Orbital systems can change where environmental costs occur, but chips, launch mass, replacement cycles, power systems and materials remain. The comparison must be lifecycle-to-lifecycle.", [("Water", "cooling architecture"), ("Materials", "chips + power + structure"), ("Decision", "full lifecycle")]),
        ],
    },
    "01-por-que-ahora": {
        "title": "Why now",
        "subtitle": "The orbital-compute thesis starts with terrestrial constraints and falling launch cost—not with a claim that space is automatically cheaper.",
        "tag": "DATA CENTERS IN SPACE · CHAPTER 1",
        "scenes": [
            ("1 · Demand is becoming an infrastructure problem", "Model capability is coupled to physical buildout.", "Training and inference growth translate into racks, substations, cooling, network capacity and construction timelines. The constraint is no longer only access to accelerators.", [("Compute", "accelerators + racks"), ("Grid", "power delivery"), ("Time", "permits + construction")]),
            ("2 · Six bottlenecks recur on the ground", "Power, water, land, permits, heat and latency interact.", "No single bottleneck defines every site. A good comparison asks which constraint is actually binding for a workload and location before proposing orbit as the answer.", [("Resource", "power + water + land"), ("Process", "permits"), ("Physics", "heat + latency")]),
            ("3 · Launch cost changed the feasible design space", "Reusable launchers lowered the mass penalty substantially.", "Historical launch economics made large compute payloads implausible. Current reusable launch prices are much lower, but a low launch price alone does not include spacecraft, deployment, replacement or operations.", [("Then", "very high $/kg"), ("Now", "lower reusable-launch cost"), ("Still missing", "mission economics")]),
            ("4 · The most aggressive thresholds are projections", "A future <$200/kg launch cost is a scenario, not an observed market price.", "Orbital data-center roadmaps often depend on further cost declines. Those assumptions should be modeled explicitly rather than blended with today's observed prices.", [("Observed", "current launcher pricing"), ("Projected", "<$200/kg scenarios"), ("Discipline", "separate fact from thesis")]),
            ("5 · The real question is comparative", "Can orbit beat the best terrestrial alternative for a specific workload?", "The answer depends on energy, cooling, network, reliability, maintenance, launch cadence and capital cost together. A single advantage is not enough.", [("Baseline", "best ground option"), ("Orbit", "new constraints"), ("Verdict", "workload-specific")]),
        ],
    },
    "02-energia-calor-conectividad": {
        "title": "Energy, heat and connectivity",
        "subtitle": "Orbit changes the engineering trade-offs; it does not suspend thermodynamics or networking.",
        "tag": "DATA CENTERS IN SPACE · CHAPTER 2",
        "scenes": [
            ("1 · Space is cold, but vacuum is not a coolant", "There is essentially no surrounding fluid to carry heat away.", "A compute payload must conduct heat to radiators and emit it as infrared radiation. Higher radiator temperature improves heat rejection, but electronics and materials limit how hot the system can run.", [("Convection", "effectively absent"), ("Path", "chip → radiator"), ("Exit", "thermal radiation")]),
            ("2 · Radiator area can dominate the design", "Megawatts of compute become megawatts of waste heat.", "As power rises, heat-rejection hardware becomes structural mass and surface area. Thermal design is therefore coupled directly to launch mass, orientation and redundancy.", [("Input", "electrical power"), ("Waste", "mostly heat"), ("Trade-off", "area × mass × temperature")]),
            ("3 · Solar exposure is useful, not free", "Suitable orbits can increase solar availability.", "But delivered compute power still passes through array efficiency, pointing, eclipse periods, storage, radiation degradation and power electronics. Incident irradiance is not the same thing as usable continuous power.", [("Sun", "~1.36 kW/m² incident"), ("Conversion", "array + power electronics"), ("Continuity", "eclipse + storage")]),
            ("4 · Vacuum propagation is faster than fiber", "But end-to-end latency is a network problem.", "Signals propagate faster in vacuum than in glass, yet orbital paths add acquisition windows, relay geometry, ground stations, routing and sometimes weather-sensitive optical links.", [("Physics", "vacuum > fiber speed"), ("Network", "path + relays"), ("Metric", "end-to-end latency")]),
            ("5 · Maintenance becomes software and redundancy", "You cannot send a technician to the rack.", "Radiation, component aging and inaccessible hardware shift the design toward fault isolation, autonomous recovery, redundancy, error correction and replaceable orbital modules.", [("Failure", "harder to service"), ("Response", "autonomy"), ("Architecture", "redundancy + replacement")]),
        ],
    },
    "03-que-es-datacenter-espacio": {
        "title": "What a \"data center in space\" actually is",
        "subtitle": "Different projects prove different layers—from onboard inference to server-class compute—without yet proving a terrestrial-style cloud.",
        "tag": "DATA CENTERS IN SPACE · CHAPTER 3",
        "scenes": [
            ("1 · Start with orbital edge processing", "Processing data where it is generated can save downlink.", "Satellites already filter, compress and analyze data onboard. This is valuable because the link, not propagation alone, is often the scarce resource.", [("Input", "sensor data"), ("Compute", "onboard inference"), ("Benefit", "fewer bytes downlinked")]),
            ("2 · Server-class compute has also flown", "Commercial and high-performance computing experiments extend the stack.", "These missions show that more familiar compute architectures can operate in orbit under real constraints. They are demonstrations of hardware and operations, not proof of hyperscale economics.", [("Layer", "server / HPC"), ("Proof", "operation in orbit"), ("Not proven", "hyperscale service")]),
            ("3 · Foundation-model demonstrations raise the ceiling", "Advanced AI workloads can execute on orbital platforms.", "Running sophisticated models in orbit matters because it widens the set of possible local decisions. It still leaves networking, orchestration, reliability and fleet economics unresolved.", [("Model", "advanced AI workload"), ("Platform", "orbital compute"), ("Gap", "service architecture")]),
            ("4 · Useful niches can arrive before general cloud", "Storage, preprocessing and latency-sensitive orbital workloads are distinct products.", "An economically useful orbital compute service may emerge first where data already originates in space or where downlink reduction has clear value, rather than as a drop-in replacement for Earth data centers.", [("Near-term", "edge + preprocessing"), ("Niche", "orbital data workflows"), ("Long-term", "general cloud?")]),
            ("5 · Governance is part of the architecture", "Jurisdiction and orbital responsibility do not vanish above the atmosphere.", "The Outer Space Treaty remains foundational, while digital-sovereignty, spectrum, debris, licensing and cross-border data questions complicate any large orbital infrastructure proposal.", [("Law", "space treaty framework"), ("Operations", "spectrum + debris"), ("Open", "digital sovereignty")]),
        ],
    },
    "04-huella-real-datacenter": {
        "title": "The real footprint of a data center",
        "subtitle": "A fair orbital comparison has to include water, energy, materials, power density and lifecycle—not only operational electricity.",
        "tag": "DATA CENTERS IN SPACE · CHAPTER 4",
        "scenes": [
            ("1 · Water use is highly location-dependent", "A single litres-per-query number hides more than it reveals.", "Direct cooling water and electricity-associated water both vary with cooling design, climate, grid mix, utilization and workload efficiency. Local scarcity matters more than a global average.", [("Direct", "cooling water"), ("Indirect", "electricity water"), ("Variation", "site + workload")]),
            ("2 · PUE is necessary but incomplete", "Facility overhead determines how much input power reaches computation.", "A lower PUE means less overhead for cooling and power delivery. But PUE does not capture chip efficiency, workload utilization, embodied materials or the carbon and water intensity of electricity.", [("PUE", "facility efficiency"), ("Compute", "server efficiency"), ("Missing", "lifecycle context")]),
            ("3 · Rack power density is reshaping facilities", "The problem is not only total TWh; it is where power must be delivered.", "AI accelerators concentrate large electrical and thermal loads into small footprints. That changes cooling topology, electrical distribution and the feasibility of retrofitting existing data centers.", [("Rack", "high power density"), ("Cooling", "liquid increasingly relevant"), ("Grid", "local delivery limits")]),
            ("4 · Compute depends on strategic materials", "Chips and power infrastructure embed mineral supply chains.", "Copper, cobalt, tantalum, rare earths and other materials connect AI infrastructure to mining, refining and geopolitical dependencies. Moving compute to orbit does not remove those upstream costs.", [("Chips", "specialized materials"), ("Power", "conductors + magnets"), ("Risk", "supply concentration")]),
            ("5 · Lifecycle closes the accounting loop", "Replacement, launch and end-of-life matter.", "Circularity can reduce waste, but new accelerator generations, failed hardware and launch mass remain physical costs. The right comparison is terrestrial lifecycle versus orbital lifecycle.", [("Build", "embodied footprint"), ("Operate", "energy + cooling"), ("Replace", "maintenance + end-of-life")]),
        ],
    },
}

CSS = r"""
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#08111f;color:#f5f7fb;font-family:Arial,'Helvetica Neue',sans-serif}
.slide{position:absolute;inset:0;background:radial-gradient(circle at 80% 48%,rgba(80,170,255,.14),transparent 34%),linear-gradient(135deg,#08111f,#0d1727 62%,#08111f)}
.slide:after{content:'';position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.04) 1px,transparent 1px);background-size:46px 46px}
.bar{height:8px;background:linear-gradient(90deg,#f5b642,#4fd1c5,#77b9ff)}
.content{position:absolute;left:138px;top:124px;width:1080px;z-index:2}
.eyebrow{font-size:19px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#f5b642}
.headline{font-size:72px;line-height:1.05;letter-spacing:-.035em;font-weight:900;margin-top:28px;max-width:1080px}
.sub{font-size:31px;line-height:1.42;color:rgba(245,247,251,.73);margin-top:28px;max-width:1000px}
.body{font-size:28px;line-height:1.48;color:rgba(245,247,251,.79);margin-top:27px;max-width:1010px}
.visual{position:absolute;right:98px;top:190px;width:565px;height:650px;display:grid;gap:17px;align-content:center;z-index:2}
.card{border:1px solid rgba(245,247,251,.14);border-radius:22px;padding:24px 26px;background:rgba(245,247,251,.05);box-shadow:0 18px 50px rgba(0,0,0,.18)}
.card strong{display:block;font-size:25px}.card span{display:block;font-size:19px;line-height:1.35;color:rgba(245,247,251,.63);margin-top:7px}
.num{position:absolute;right:128px;bottom:58px;font-size:182px;font-weight:900;color:rgba(245,182,66,.055);z-index:1}
.footer{position:absolute;left:138px;right:138px;bottom:48px;display:flex;justify-content:space-between;align-items:center;z-index:2;color:rgba(245,247,251,.38);font-size:15px;font-weight:700;letter-spacing:.11em;text-transform:uppercase}
.logo{font-size:37px;font-weight:900;letter-spacing:-3px;background:linear-gradient(135deg,#f5b642,#4fd1c5,#77b9ff);-webkit-background-clip:text;color:transparent}
"""

def esc(value):
    return html.escape(str(value), quote=True)

def scene_html(plan, scene, index, total):
    heading, sub, body, cards = scene
    cards_html = "".join(
        f'<div class="card"><strong>{esc(k)}</strong><span>{esc(v)}</span></div>'
        for k, v in cards
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head>
<body><section class="slide"><div class="bar"></div>
<div class="content"><div class="eyebrow">{esc(plan["tag"])}</div>
<div class="headline">{esc(heading)}</div><div class="sub">{esc(sub)}</div>
<div class="body">{esc(body)}</div></div>
<div class="visual">{cards_html}</div><div class="num">{index:02d}</div>
<div class="footer"><span class="logo">5σ</span><span>{esc(plan["title"])} · {index}/{total}</span></div>
</section></body></html>"""

async def render():
    ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="s5-dc-media-") as tmp:
        tmp = Path(tmp)
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            for slug, plan in PLANS.items():
                frame_dir = tmp / slug
                frame_dir.mkdir(parents=True, exist_ok=True)
                page = await browser.new_page(viewport={"width": W, "height": H})
                frames = []
                for index, scene in enumerate(plan["scenes"], start=1):
                    await page.set_content(scene_html(plan, scene, index, len(plan["scenes"])), wait_until="load")
                    png = frame_dir / f"{index:02d}.png"
                    await page.screenshot(path=str(png), type="png")
                    frames.append(png)
                    if index == 1:
                        await page.screenshot(path=str(ROOT / f"{slug}.jpg"), type="jpeg", quality=92)
                await page.close()

                concat = frame_dir / "concat.txt"
                lines = []
                for frame in frames:
                    lines.append(f"file '{frame.as_posix()}'")
                    lines.append(f"duration {SCENE_SECONDS}")
                lines.append(f"file '{frames[-1].as_posix()}'")
                concat.write_text("\n".join(lines) + "\n", encoding="utf-8")

                out = ROOT / f"{slug}.mp4"
                subprocess.run(
                    [
                        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat),
                        "-vf", f"fps={FPS},scale={W}:{H}:flags=lanczos,format=yuv420p",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                        "-movflags", "+faststart", str(out),
                    ],
                    check=True,
                )
            await browser.close()

if __name__ == "__main__":
    asyncio.run(render())
