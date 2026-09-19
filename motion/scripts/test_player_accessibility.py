#!/usr/bin/env python3
"""Browser-level accessibility contract for the deterministic 5sigmas motion player."""
from __future__ import annotations

import argparse
import contextlib
import json
import socket
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
MOTION = ROOT / "motion"
SERIES = MOTION / "content/modelos-razonadores"


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def wait_server(port: int) -> None:
    deadline = time.time() + 8
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=.2):
                return
        except OSError:
            time.sleep(.08)
    raise RuntimeError("local accessibility harness did not start")


def state(page) -> dict:
    return page.evaluate(
        """() => {
          const host=document.querySelector('#player');
          const root=host.shadowRoot;
          const q=s=>root.querySelector(s);
          return {
            lang: host.getAttribute('lang'),
            play: q('.play').textContent,
            prev: q('.prev').textContent,
            next: q('.next').textContent,
            timeLabel: q('input').getAttribute('aria-label'),
            cuePrev: q('.cueprev').textContent,
            cueNext: q('.cuenext').textContent,
            allText: q('.alltext').textContent,
            allTextPressed: q('.alltext').getAttribute('aria-pressed'),
            summary: q('summary').textContent,
            canvasLabel: q('canvas').getAttribute('aria-label'),
            notice: q('.notice').textContent,
            playDisabled: q('.play').disabled,
            playing: host._playing,
            transcriptHeadings: [...q('article').querySelectorAll('h3')].map(x=>x.textContent),
            transcriptParagraphs: [...q('article').querySelectorAll('p')].map(x=>x.textContent),
            sourceLinks: [...q('article').querySelectorAll('a')].map(x=>({text:x.textContent,href:x.href,target:x.target,rel:x.rel})),
            duration: host.duration,
            rangeMax: Number(q('input').max),
            time: host._time
          };
        }"""
    )


def configure(page, spec: dict, theme: dict) -> None:
    page.evaluate("([spec,theme])=>document.querySelector('#player').configure(spec,theme)", [spec, theme])


def open_harness(context, port: int):
    page = context.new_page()
    errors: list[str] = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(f"http://127.0.0.1:{port}/motion/web/player-test.html", wait_until="networkidle")
    page.wait_for_function("window.playerReady !== undefined")
    page.evaluate("()=>window.playerReady")
    return page, errors


def expected_controls(locale: str) -> dict[str, str]:
    if locale == "en":
        return {
            "play": "Play", "prev": "Previous", "next": "Next",
            "timeLabel": "Playback time", "cuePrev": "Previous sentence",
            "cueNext": "Next sentence", "allText": "Show all text",
            "summary": "Read the explanation and sources",
        }
    return {
        "play": "Reproducir", "prev": "Anterior", "next": "Siguiente",
        "timeLabel": "Tiempo de reproducción", "cuePrev": "Frase anterior",
        "cueNext": "Frase siguiente", "allText": "Ver todo el texto",
        "summary": "Leer la explicación y las fuentes",
    }


def assert_common(snapshot: dict, spec: dict) -> None:
    if snapshot["lang"] != spec["locale"]:
        raise AssertionError(f"lang mismatch: {snapshot['lang']} != {spec['locale']}")
    expected_duration = sum(float(scene["duration"]) for scene in spec["scenes"])
    if abs(snapshot["duration"] - expected_duration) > 1e-7 or abs(snapshot["rangeMax"] - expected_duration) > 1e-7:
        raise AssertionError("player duration/range does not match the shared timeline")
    if len(snapshot["transcriptHeadings"]) != len(spec["scenes"]):
        raise AssertionError("transcript heading count does not match scenes")
    expected_paragraphs = [p for scene in spec["scenes"] for p in scene["paragraphs"]]
    if snapshot["transcriptParagraphs"] != expected_paragraphs:
        raise AssertionError("visible transcript is not derived verbatim from scene paragraphs")
    expected_sources = sum(len(scene.get("evidence", {}).get("urls", [])) for scene in spec["scenes"])
    if len(snapshot["sourceLinks"]) != expected_sources:
        raise AssertionError("source-link count does not match evidence declarations")
    if any(link["target"] != "_blank" or "noopener" not in link["rel"] for link in snapshot["sourceLinks"]):
        raise AssertionError("source links must isolate new browsing contexts")
    if spec["title"] not in snapshot["canvasLabel"]:
        raise AssertionError("canvas accessible name must include the localized title")
    for key, value in expected_controls(spec["locale"]).items():
        if snapshot[key] != value:
            raise AssertionError(f"{spec['locale']} control {key}: {snapshot[key]!r} != {value!r}")
    prefix = "Source " if spec["locale"] == "en" else "Fuente "
    if any(not link["text"].startswith(prefix) for link in snapshot["sourceLinks"]):
        raise AssertionError(f"{spec['locale']} evidence links are not localized")


def load_specs() -> list[dict]:
    paths = sorted(SERIES.glob("*.json"))
    if len(paths) != 12:
        raise AssertionError(f"accessibility gate expects the complete 12-output series, found {len(paths)}")
    return [json.loads(path.read_text()) for path in paths]


def run(browser_name: str) -> dict:
    specs = load_specs()
    es = json.loads((SERIES / "03-test-time-compute.es.json").read_text())
    en = json.loads((SERIES / "03-test-time-compute.en.json").read_text())
    theme = json.loads((MOTION / "theme/5sigmas.json").read_text())
    port = free_port()
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1"],
        cwd=ROOT,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_server(port)
        with sync_playwright() as p:
            browser_type = getattr(p, browser_name)
            browser = browser_type.launch(headless=True)

            # Normal-motion context validates the complete localized surface.
            context = browser.new_context(viewport={"width": 1100, "height": 900}, reduced_motion="no-preference")
            page, page_errors = open_harness(context, port)

            # The accessibility contract is series-wide, not just a representative video:
            # every localized output must configure successfully, expose its complete
            # transcript/sources, share the deterministic duration and localize controls.
            checked: list[str] = []
            for spec in specs:
                configure(page, spec, theme)
                assert_common(state(page), spec)
                checked.append(spec["id"])

            # Exercise stateful controls on both locales using the same video/mechanisms.
            configure(page, es, theme)
            assert_common(state(page), es)
            configure(page, en, theme)
            assert_common(state(page), en)

            # Toggle exposes explicit state for assistive technology.
            page.evaluate("()=>document.querySelector('#player').shadowRoot.querySelector('.alltext').click()")
            if state(page)["allTextPressed"] != "true":
                raise AssertionError("show-all-text control must expose aria-pressed=true")

            # Every enabled control must be keyboard-focusable and have an accessible name.
            # Play is intentionally enabled in this normal-motion context.
            if state(page)["playDisabled"]:
                raise AssertionError("Play must be keyboard-available when reduced motion is not requested")
            unnamed = page.evaluate(
                """() => {
                  const r=document.querySelector('#player').shadowRoot;
                  return [...r.querySelectorAll('button,input')].filter(el=>{
                    if (el.disabled) return false;
                    el.focus();
                    const name=(el.textContent||el.getAttribute('aria-label')||'').trim();
                    return r.activeElement!==el || !name;
                  }).map(el=>el.className||el.tagName);
                }"""
            )
            if unnamed:
                raise AssertionError(f"focus/name accessibility failures: {unnamed}")

            # Narrow viewport must retain the controls/transcript while the shared renderer recomposes portrait.
            page.set_viewport_size({"width": 390, "height": 844})
            page.evaluate("()=>document.querySelector('#player').draw()")
            narrow = page.evaluate(
                """() => {const h=document.querySelector('#player'),r=h.shadowRoot,c=r.querySelector('canvas');return {clientWidth:h.clientWidth,canvasWidth:c.width,canvasHeight:c.height,controls:r.querySelectorAll('button,input').length,article:r.querySelector('article').textContent.length}}"""
            )
            if narrow["clientWidth"] >= 720 or narrow["canvasHeight"] <= narrow["canvasWidth"]:
                raise AssertionError(f"narrow player did not recompose portrait: {narrow}")
            if narrow["controls"] < 7 or narrow["article"] < 100:
                raise AssertionError("narrow player lost controls or transcript")
            if page_errors:
                raise AssertionError(f"browser page errors: {page_errors}")
            context.close()

            # Reduced motion is an OS/browser preference. Validate it in a fresh context
            # where the preference is present before the custom element connects. This is
            # stable in Chromium and WebKit and mirrors a real user session more closely
            # than mutating matchMedia after the page has already mounted.
            reduced_context = browser.new_context(viewport={"width": 1100, "height": 900}, reduced_motion="reduce")
            reduced_page, reduced_errors = open_harness(reduced_context, port)
            configure(reduced_page, en, theme)
            reduced = state(reduced_page)
            if not reduced["playDisabled"] or "Reduced motion" not in reduced["notice"]:
                raise AssertionError("reduced-motion mode must disable Play and announce the navigation alternative")
            reduced_page.evaluate("()=>document.querySelector('#player').play()")
            if state(reduced_page)["playing"]:
                raise AssertionError("play() must be a no-op under prefers-reduced-motion")
            before = state(reduced_page)["time"]
            reduced_page.evaluate("()=>document.querySelector('#player').step(1)")
            after = state(reduced_page)["time"]
            if after <= before:
                raise AssertionError("scene navigation must remain usable under reduced motion")
            if reduced_errors:
                raise AssertionError(f"reduced-motion browser page errors: {reduced_errors}")
            reduced_context.close()

            browser.close()
            return {
                "browser": browser_name,
                "outputs_checked": len(checked),
                "es": "localized",
                "en": "localized",
                "transcripts_and_sources": "pass",
                "reduced_motion": "pass",
                "keyboard_names": "pass",
                "narrow_portrait": "pass",
            }
    finally:
        server.terminate()
        with contextlib.suppress(Exception):
            server.wait(timeout=2)
        with contextlib.suppress(Exception):
            server.kill()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--browser", choices=["chromium", "webkit"], default="chromium")
    args = parser.parse_args()
    print(json.dumps(run(args.browser), ensure_ascii=False))


if __name__ == "__main__":
    main()
