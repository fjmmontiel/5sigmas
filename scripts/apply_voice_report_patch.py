#!/usr/bin/env python3
from __future__ import annotations
import base64, gzip, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = sorted((ROOT / ".tmp-voice-report").glob("reactive-proactive-*.b64"))
if not PARTS:
    raise SystemExit("missing payload chunks")
encoded = "".join(part.read_text(encoding="ascii").strip() for part in PARTS)
raw = gzip.decompress(base64.b64decode(encoded))
expected = "1ec6bc8424e8891d27ef5e46a2ab33574b788066cccf662a5ec58f368a415ba1"
actual = hashlib.sha256(raw).hexdigest()
if actual != expected:
    raise SystemExit(f"payload checksum mismatch: {actual} != {expected}")
files: dict[str, str] = json.loads(raw.decode("utf-8"))
for relative_path, content in files.items():
    target = ROOT / relative_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    print(f"wrote {relative_path} ({len(content)} chars)")
