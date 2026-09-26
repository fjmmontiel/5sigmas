#!/usr/bin/env python3
"""Declare locale-native Coding Agents video/poster files in the EN manifest.

prepare_locale.py intentionally stages article-adjacent locale media only when
it is explicitly declared in ``published_files``. Keep this patch textual and
idempotent so the large hand-maintained manifest is not reformatted by a YAML
round-trip.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "locales" / "en" / "manifest.yml"
SERIES = "coding-agents-agent-harnesses"
SLUGS = (
    "01-que-es-agent-harness",
    "02-contexto-workspace-sandboxing-aislamiento",
    "03-specs-planificacion-task-decomposition-checkpoints",
    "04-tools-permisos-approvals-hooks-secretos-trust-boundaries",
    "05-tests-verifiers-review-diffs-stop-conditions-evaluacion",
    "06-tareas-largas-memoria-subagentes-recuperacion-merge-observabilidad",
)


def main() -> int:
    text = MANIFEST.read_text(encoding="utf-8")
    marker = "published_files:\n"
    if marker not in text:
        raise SystemExit(f"published_files section missing: {MANIFEST}")

    required = [
        f"  - series/{SERIES}/{slug}.{ext}"
        for slug in SLUGS
        for ext in ("mp4", "jpg")
    ]
    missing = [entry for entry in required if entry not in text]
    if not missing:
        print("Coding Agents EN media already declared in published_files")
        return 0

    insertion = "".join(f"{entry}\n" for entry in missing)
    text = text.replace(marker, marker + insertion, 1)
    MANIFEST.write_text(text, encoding="utf-8")
    print(f"Declared {len(missing)} Coding Agents EN media files in published_files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
