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


def run(browser_name: str) -> dict:
    es = json.loads((MOTION / "content/modelos-razonadores/03-test-time-compute.es.json").read_text())
    en = json.loads((MOTION / "content/modelos-razonadores/03-test-time-compute.en.json").read_text())
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
            page = browser.new_page(viewport={"width": 1100, "height": 900})
            page_errors: list[str] = []
            page.on("pageerror", lambda exc: page_errors.append(str(exc)))
            page.goto(f"http://127.0.0.1:{port}/motion/web/player-test.html", wait_until="networkidle")
            page.wait_for_function("window.playerReady !== undefined")
            page.evaluate("()=>window.playerReady")

            configure(page, es, theme)
            es_state = state(page)
            assert_common(es_state, es)
            expected_es = {
                "play": "Reproducir", "prev": "Anterior", "next": "Siguiente",
                "timeLabel": "Tiempo de reproducción", "cuePrev": "Frase anterior",
                "cueNext": "Frase siguiente", "allText": "Ver todo el texto",
                "summary": "Leer la explicación y las fuentes",
            }
            for key, value in expected_es.items():
                if es_state[key] != value:
                    raise AssertionError(f"Spanish control {key}: {es_state[key]!r} != {value!r}")

            configure(page, en, theme)
            en_state = state(page)
            assert_common(en_state, en)
            expected_en = {
                "play": "Play", "prev": "Previous", "next": "Next",
                "timeLabel": "Playback time", "cuePrev": "Previous sentence",
                "cueNext": "Next sentence", "allText": "Show all text",
                "summary": "Read the explanation and sources",
            }
            for key, value in expected_en.items():
                if en_state[key] != value:
                    raise AssertionError(f"English control {key}: {en_state[key]!r} != {value!r}")
            if any(not link["text"].startswith("Source ") for link in en_state["sourceLinks"]):
                raise AssertionError("English evidence links are not localized")

            # Toggle exposes explicit state for assistive technology.
            page.evaluate("()=>document.querySelector('#player').shadowRoot.querySelector('.alltext').click()")
            if state(page)["allTextPressed"] != "true":
                raise AssertionError("show-all-text control must expose aria-pressed=true")

            # Reduced motion must disable autoplay-style motion while retaining deterministic navigation.
            page.emulate_media(reduced_motion="reduce")
            page.evaluate("()=>document.querySelector('#player').draw()")
            reduced = state(page)
            if not reduced["playDisabled"] or "Reduced motion" not in reduced["notice"]:
                raise AssertionError("reduced-motion mode must disable Play and announce the navigation alternative")
            page.evaluate("()=>document.querySelector('#player').play()")
            if state(page)["playing"]:
                raise AssertionError("play() must be a no-op under prefers-reduced-motion")
            before = state(page)["time"]
            page.evaluate("()=>document.querySelector('#player').step(1)")
            after = state(page)["time"]
            if after <= before:
                raise AssertionError("scene navigation must remain usable under reduced motion")

            # Keyboard-focusable interactive surface: every control can receive focus and has a name.
            unnamed = page.evaluate(
                """() => {
                  const r=document.querySelector('#player').shadowRoot;
                  return [...r.querySelectorAll('button,input')].filter(el=>{
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
            page.emulate_media(reduced_motion="no-preference")
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
            browser.close()
            return {"browser": browser_name, "es": "localized", "en": "localized", "reduced_motion": "pass", "keyboard_names": "pass", "narrow_portrait": "pass"}
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
