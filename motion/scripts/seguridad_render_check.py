#!/usr/bin/env python3
"""Render Seguridad IA through the actual browser graph and inspect authored H/V cue states."""
from __future__ import annotations

import base64
import io
import json
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SPEC = ROOT / "migration/seguridad-ia-content-v1.json"
REGISTER = ROOT / "migration/seguridad-ia-series-register.json"
HTML = ROOT / "web/seguridad-render.html"
OUT = ROOT / "dist/seguridad-ia-check"


def bundled_page() -> str:
    def rewrite(js: str, parent: Path) -> str:
        def replace(match):
            target = (parent / match.group(2)).resolve()
            if not target.is_relative_to(ROOT):
                raise ValueError(f"module escapes motion root: {target}")
            return match.group(1) + '"@5sigmas/' + target.relative_to(ROOT).as_posix() + '"'
        return re.sub(r'(from\s+|import\s+)["\'](\.\.?/[^"\']+)["\']', replace, js)

    modules = {
        "@5sigmas/" + path.relative_to(ROOT).as_posix(): rewrite(path.read_text(encoding="utf-8"), path.parent)
        for path in sorted((ROOT / "src").rglob("*.mjs"))
    }
    html = HTML.read_text(encoding="utf-8")
    init_match = re.search(r'<script type="module">(.*?)</script>', html, re.S)
    if not init_match:
        raise RuntimeError("module bootstrap not found")
    init = rewrite(init_match.group(1), HTML.parent)
    payload = json.dumps(modules, ensure_ascii=False).replace("</", "<\\/")
    init_payload = json.dumps(init, ensure_ascii=False).replace("</", "<\\/")
    boot = """<script>
    const modules=__MODULES__; const imports={};
    for(const [id,source] of Object.entries(modules)) imports[id]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
    const start=document.createElement('script');start.type='module';start.textContent=__INIT__;document.body.append(start);
    </script>""".replace("__MODULES__", payload).replace("__INIT__", init_payload)
    return re.sub(r'<script type="module">.*?</script>', lambda _: boot, html, flags=re.S)


def authored_chapter(chapter: int) -> dict | None:
    path = ROOT / "src" / "seguridad" / f"chapter{chapter:02d}-data.mjs"
    if not path.is_file():
        return None
    raw = path.read_text(encoding="utf-8").strip()
    marker = " = "
    if marker not in raw or not raw.endswith(";"):
        raise RuntimeError(f"cannot parse authored chapter: {path}")
    payload = raw.split(marker, 1)[1][:-1].strip()
    data = json.loads(payload)
    if data.get("chapter") != f"{chapter:02d}":
        raise RuntimeError(f"chapter mismatch: {path}")
    return data


def chapter_scenes(chapter: int) -> list[dict]:
    authored = authored_chapter(chapter)
    if authored:
        return authored["scenes"]
    return [
        {"start": scene * 12.0, "end": (scene + 1) * 12.0, "beats": []}
        for scene in range(5)
    ]


def chapter_scene_samples(chapter: int) -> list[tuple[int, float]]:
    rows: list[tuple[int, float]] = []
    for index, scene in enumerate(chapter_scenes(chapter)):
        start = float(scene["start"])
        end = float(scene["end"])
        beats = scene.get("beats") or []
        if beats:
            for beat in beats:
                at = start + float(beat["at"])
                settled = start + float(beat["settledAt"])
                rows.extend([
                    (index, max(start + 0.02, at - 0.12)),
                    (index, min(end - 0.02, at + 0.12)),
                    (index, min(end - 0.02, settled + 0.12)),
                ])
        else:
            duration = end - start
            rows.extend([
                (index, start + duration * 0.08),
                (index, start + duration * 0.45),
                (index, start + duration * 0.92),
            ])
    deduped = []
    seen = set()
    for index, t in rows:
        key = (index, round(t, 3))
        if key not in seen:
            seen.add(key)
            deduped.append((index, t))
    return deduped


def representative_times(chapter: int) -> list[tuple[int, float]]:
    rows = []
    for index, scene in enumerate(chapter_scenes(chapter)):
        start, end = float(scene["start"]), float(scene["end"])
        rows.append((index, start + (end - start) * 0.58))
    return rows


def normalized_profile(result: dict) -> str | None:
    return result.get("choreographyProfile") or result.get("choreography") or result.get("family")


def state_matches(actual, expected) -> bool:
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(key in actual and state_matches(actual[key], value) for key, value in expected.items())
    if isinstance(expected, list):
        return actual == expected
    return actual == expected


def validate_authored_semantic_motion(page) -> list[dict]:
    issues = []
    for chapter in (1, 2, 3, 4):
        authored = authored_chapter(chapter)
        if not authored:
            issues.append({"jobId": f"seguridad-ia-{chapter:02d}", "issue": {"type": "missing-authored-chapter"}})
            continue
        for locale in ("es", "en"):
            for orientation in ("horizontal", "vertical"):
                job = f"seguridad-ia-{chapter:02d}-{locale}-{orientation}"
                for scene in authored["scenes"]:
                    start = float(scene["start"])
                    end = float(scene["end"])
                    for beat in scene["beats"]:
                        text_t = start + float(beat["at"]) + 0.08
                        before_t = max(start + 0.02, start + float(beat["at"]) - 0.12)
                        after_t = min(end - 0.02, start + float(beat["settledAt"]) + 0.12)
                        text_row = page.evaluate("(a)=>window.draw(a.job,a.t)", {"job": job, "t": text_t})
                        before_row = page.evaluate("(a)=>window.draw(a.job,a.t)", {"job": job, "t": before_t})
                        after_row = page.evaluate("(a)=>window.draw(a.job,a.t)", {"job": job, "t": after_t})
                        before_state = before_row.get("mechanismState")
                        after_state = after_row.get("mechanismState")
                        expected = beat["expected"]
                        if before_state is None or after_state is None:
                            issues.append({"jobId": job, "scene": scene["id"], "beat": beat["id"], "issue": {"type": "missing-mechanism-state"}})
                            continue
                        if not state_matches(before_state, expected["before"]):
                            issues.append({
                                "jobId": job, "scene": scene["id"], "beat": beat["id"],
                                "issue": {"type": "semantic-state-before-mismatch", "expected": expected["before"], "actual": before_state},
                            })
                        if not state_matches(after_state, expected["after"]):
                            issues.append({
                                "jobId": job, "scene": scene["id"], "beat": beat["id"],
                                "issue": {"type": "semantic-state-after-mismatch", "expected": expected["after"], "actual": after_state},
                            })
                        if before_state == after_state:
                            issues.append({
                                "jobId": job, "scene": scene["id"], "beat": beat["id"],
                                "issue": {"type": "semantic-motion-no-state-change"},
                            })
                        cue_rows = text_row.get("textCue", {}).get("cues", [])
                        cue = next((row for row in cue_rows if row.get("id") == beat["id"]), None)
                        if not cue or not cue.get("visible") or cue.get("status") != "active":
                            issues.append({
                                "jobId": job, "scene": scene["id"], "beat": beat["id"],
                                "issue": {"type": "active-text-cue-not-visible-before-motion", "cue": cue},
                            })
                        events = text_row.get("semanticTimeline", {}).get("events", [])
                        event = next((row for row in events if row.get("id") == beat["id"]), None)
                        if not event or not (event["text_at"] < event["visual_at"] < event["settled_at"] < event["scene_end_at"]):
                            issues.append({
                                "jobId": job, "scene": scene["id"], "beat": beat["id"],
                                "issue": {"type": "invalid-text-visual-cue-order", "event": event},
                            })
    return issues


def collect_preflight(page) -> tuple[list[dict], list[dict]]:
    sampled: list[dict] = []
    issues: list[dict] = []
    for chapter in range(6):
        for locale in ("es", "en"):
            for orientation in ("horizontal", "vertical"):
                job = f"seguridad-ia-{chapter:02d}-{locale}-{orientation}"
                for scene_index, t in chapter_scene_samples(chapter):
                    row = page.evaluate("(a)=>window.draw(a.job,a.t)", {"job": job, "t": t})
                    sampled.append(row)
                    for issue in row.get("issues", []):
                        issues.append({
                            "jobId": job,
                            "scene": row.get("scene", scene_index),
                            "timeSeconds": t,
                            "issue": issue,
                        })
    return sampled, issues


def contact_sheet(page, orientation: str, target: Path) -> list[dict]:
    tiles = []
    samples = []
    for chapter in range(6):
        job = f"seguridad-ia-{chapter:02d}-es-{orientation}"
        for scene_index, t in representative_times(chapter):
            item = page.evaluate("(a)=>window.frame(a.job,a.t)", {"job": job, "t": t})
            result = item["result"]
            if result.get("issues"):
                raise RuntimeError(f"{job} t={t}: {result['issues']}")
            im = Image.open(io.BytesIO(base64.b64decode(item["jpeg"]))).convert("RGB")
            if orientation == "horizontal":
                im.thumbnail((420, 250))
            else:
                im.thumbnail((250, 420))
            tiles.append((job, scene_index + 1, t, im.copy(), result))
            samples.append({
                "job": job,
                "scene": result.get("scene", scene_index),
                "scene_index": result.get("sceneIndex", scene_index),
                "time": t,
                "family": result.get("family"),
                "topology": result.get("topology", result.get("family")),
                "choreography_profile": normalized_profile(result),
                "mechanism_label_embed_px": result.get("mechanismLabelEmbedPx"),
            })

    cols = 5
    tile_w = max(im.width for *_, im, _ in tiles)
    tile_h = max(im.height for *_, im, _ in tiles) + 72
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tile_w + 40, rows * tile_h + 30), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (job, scene, t, im, result) in enumerate(tiles):
        x = 20 + (i % cols) * tile_w
        y = 15 + (i // cols) * tile_h
        family = result.get("family", "unknown")
        topology = result.get("topology", family)
        choreography = normalized_profile(result) or "unknown"
        label_px = result.get("mechanismLabelEmbedPx")
        label_text = f"label {label_px:.1f}px" if isinstance(label_px, (int, float)) else "specialized"
        draw.text((x, y), f"{job.split('-')[2]} · S{scene} · {family}", fill="black")
        draw.text((x, y + 20), f"{topology} · {choreography}", fill="black")
        draw.text((x, y + 40), f"{t:.1f}s · {label_text}", fill="black")
        sheet.paste(im, (x, y + 64))
    sheet.save(target, quality=91)
    return samples


def main() -> None:
    chrome = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        raise SystemExit("system Chromium/Chrome is required")
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads(SPEC.read_text(encoding="utf-8"))
    register = json.loads(REGISTER.read_text(encoding="utf-8"))
    errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=chrome, headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        page = browser.new_page(viewport={"width": 1920, "height": 1920}, device_scale_factor=1)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.set_content(bundled_page())
        try:
            page.wait_for_function("window.ready===true", timeout=15000)
        except Exception as exc:
            raise RuntimeError(f"browser bootstrap failed; page_errors={errors}") from exc
        setup = page.evaluate("(a)=>window.setup(a.spec,a.register)", {"spec": spec, "register": register})

        sampled, issues = collect_preflight(page)
        issues.extend(validate_authored_semantic_motion(page))
        profiles = sorted({profile for row in sampled if (profile := normalized_profile(row))})
        body_sizes = [row["bodySize"] for row in sampled if isinstance(row.get("bodySize"), (int, float))]
        mechanism_scales = [row["mechanismScale"] for row in sampled if isinstance(row.get("mechanismScale"), (int, float))]
        label_sizes = [row["mechanismLabelEmbedPx"] for row in sampled if isinstance(row.get("mechanismLabelEmbedPx"), (int, float))]

        if len(profiles) < 15:
            issues.append({
                "jobId": "series",
                "scene": "all",
                "timeSeconds": 0,
                "issue": {"type": "insufficient-choreography-profile-diversity", "profiles": profiles},
            })

        report = {
            "unit": "seguridad-ia",
            "scope": "actual browser/canvas cue-level H/V preflight across generic and specialized renderers; not encoded MP4 or Technical GOLDEN",
            "browser": browser.version,
            "jobs": len({row["jobId"] for row in sampled}),
            "frames_sampled": len(sampled),
            "setup": setup,
            "minimum_body_px": min(body_sizes),
            "minimum_mechanism_scale": min(mechanism_scales),
            "minimum_mechanism_label_embed_px": min(label_sizes) if label_sizes else None,
            "choreography_profiles": profiles,
            "choreography_profile_count": len(profiles),
            "issue_count": len(issues),
            "issues": issues,
            "browser_errors": errors,
        }
        report["horizontal_contact_sheet"] = contact_sheet(page, "horizontal", OUT / "seguridad-es-horizontal-contact-sheet.jpg")
        report["vertical_contact_sheet"] = contact_sheet(page, "vertical", OUT / "seguridad-es-vertical-contact-sheet.jpg")
        reduced = page.evaluate("()=>window.draw('seguridad-ia-05-en-vertical',54,true)")
        report["reduced_motion_sample"] = {"jobId": reduced["jobId"], "scene": reduced["scene"], "issues": reduced["issues"]}

        (OUT / "seguridad-render-preflight.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        browser.close()

    if errors or issues or report["reduced_motion_sample"]["issues"]:
        raise SystemExit(json.dumps({
            "browser_errors": errors,
            "layout_issues": issues[:30],
            "reduced_motion_issues": report["reduced_motion_sample"]["issues"],
        }, ensure_ascii=False))

    print(json.dumps({
        "jobs": report["jobs"],
        "frames_sampled": report["frames_sampled"],
        "layout_issues": 0,
        "browser_errors": 0,
        "minimum_body_px": report["minimum_body_px"],
        "minimum_mechanism_scale": report["minimum_mechanism_scale"],
        "minimum_mechanism_label_embed_px": report["minimum_mechanism_label_embed_px"],
        "choreography_profile_count": report["choreography_profile_count"],
        "contact_sheets": 2,
    }))


if __name__ == "__main__":
    main()
