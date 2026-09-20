#!/usr/bin/env python3
"""Validate and package all 24 From Cave to AGI final review candidate outputs."""
from __future__ import annotations

import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "dist/from-cave-to-agi-final"
PACKAGE = ROOT / "dist/from-cave-to-agi-review-package"
CHAPTERS = [f"{i:02d}" for i in range(6)]
LOCALES = ["es", "en"]
ORIENTATIONS = ["horizontal", "vertical"]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    expected = [(c, l, o) for c in CHAPTERS for l in LOCALES for o in ORIENTATIONS]
    reports = []
    errors = []
    for chapter, locale, orientation in expected:
        stem = f"{chapter}-{locale}-{orientation}"
        report_path = OUT / f"{stem}.json"
        mp4_path = OUT / f"{stem}.mp4"
        if not report_path.exists() or not mp4_path.exists():
            errors.append(f"missing {stem}")
            continue
        report = json.loads(report_path.read_text(encoding="utf-8"))
        if report.get("chapter") != chapter or report.get("locale") != locale or report.get("orientation") != orientation:
            errors.append(f"identity mismatch {stem}")
        if report.get("full_decode") != "PASS" or report.get("render_issues") or report.get("browser_errors"):
            errors.append(f"technical output failure {stem}")
        actual_sha = sha256(mp4_path)
        if actual_sha != report.get("sha256"):
            errors.append(f"hash mismatch {stem}")
        if report.get("frames") != 4500 or abs(float(report.get("duration_seconds", 0)) - 75.0) > 0.02:
            errors.append(f"duration/frame mismatch {stem}")
        if len(report.get("scenes", [])) != 5:
            errors.append(f"scene coverage mismatch {stem}")
        reports.append(report)

    if errors:
        raise SystemExit("package validation failed: " + "; ".join(errors))
    if len(reports) != 24:
        raise SystemExit(f"expected 24 reports, got {len(reports)}")

    # ES/EN parity: same chapter/orientation must have equal timing, frame count and concept IDs.
    parity = []
    for chapter in CHAPTERS:
        for orientation in ORIENTATIONS:
            es = next(r for r in reports if r["chapter"] == chapter and r["locale"] == "es" and r["orientation"] == orientation)
            en = next(r for r in reports if r["chapter"] == chapter and r["locale"] == "en" and r["orientation"] == orientation)
            es_ids = [s["concept_id"] for s in es["scenes"]]
            en_ids = [s["concept_id"] for s in en["scenes"]]
            ok = es["frames"] == en["frames"] == 4500 and es["duration_seconds"] == en["duration_seconds"] == 75.0 and es_ids == en_ids
            parity.append({"chapter": chapter, "orientation": orientation, "pass": ok, "concept_ids": es_ids})
            if not ok:
                errors.append(f"ES/EN parity failure {chapter}-{orientation}")
    if errors:
        raise SystemExit("package parity failed: " + "; ".join(errors))

    # H/V parity: same locale/chapter must cover the same five semantic concepts.
    hv_parity = []
    for chapter in CHAPTERS:
        for locale in LOCALES:
            h = next(r for r in reports if r["chapter"] == chapter and r["locale"] == locale and r["orientation"] == "horizontal")
            v = next(r for r in reports if r["chapter"] == chapter and r["locale"] == locale and r["orientation"] == "vertical")
            h_ids = [s["concept_id"] for s in h["scenes"]]
            v_ids = [s["concept_id"] for s in v["scenes"]]
            ok = h_ids == v_ids and h["frames"] == v["frames"] == 4500
            hv_parity.append({"chapter": chapter, "locale": locale, "pass": ok, "concept_ids": h_ids})
            if not ok:
                errors.append(f"H/V parity failure {chapter}-{locale}")
    if errors:
        raise SystemExit("package H/V parity failed: " + "; ".join(errors))

    heads = sorted({r["source_head"] for r in reports})
    if len(heads) != 1:
        raise SystemExit(f"mixed source heads in final package: {heads}")

    PACKAGE.mkdir(parents=True, exist_ok=True)
    inventory = []
    for r in sorted(reports, key=lambda x: (x["chapter"], x["locale"], x["orientation"])):
        inventory.append({
            "chapter": r["chapter"], "locale": r["locale"], "orientation": r["orientation"],
            "mp4": r["mp4"], "sha256": r["sha256"], "size_bytes": r["size_bytes"],
            "duration_seconds": r["duration_seconds"], "frames": r["frames"],
            "source_path": r["source_path"], "canonical_horizontal_output": r["canonical_horizontal_output"],
            "full_decode": r["full_decode"], "scenes": r["scenes"],
        })
    manifest = {
        "schema_version": 1,
        "unit": "from-cave-to-agi",
        "state": "COMPLETE_REVIEW_CANDIDATE_TECHNICAL_PACKAGE",
        "source_head": heads[0],
        "outputs": 24,
        "chapters": 6,
        "locales": ["es", "en"],
        "orientations": ["horizontal", "vertical"],
        "full_decode_pass": 24,
        "es_en_parity": parity,
        "hv_parity": hv_parity,
        "owner_visual_approval": "NOT_REQUESTED",
        "technical_golden": False,
        "published": False,
        "inventory": inventory,
    }
    manifest_path = PACKAGE / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    zip_path = PACKAGE / "from-cave-to-agi-review-candidate.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        zf.write(manifest_path, "manifest.json")
        for r in inventory:
            stem = Path(r["mp4"]).stem
            zf.write(OUT / r["mp4"], f"mp4/{r['mp4']}")
            zf.write(OUT / f"{stem}.json", f"evidence/{stem}.json")

    package_digest = sha256(zip_path)
    summary = {
        "source_head": heads[0],
        "outputs": 24,
        "full_decode_pass": 24,
        "es_en_pairs": 12,
        "es_en_parity_pass": sum(1 for x in parity if x["pass"]),
        "hv_pairs": 12,
        "hv_parity_pass": sum(1 for x in hv_parity if x["pass"]),
        "package": zip_path.name,
        "package_sha256": package_digest,
        "package_size_bytes": zip_path.stat().st_size,
        "technical_golden": False,
        "owner_visual_approval": "NOT_REQUESTED",
    }
    (PACKAGE / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
