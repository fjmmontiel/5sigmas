from __future__ import annotations

import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DISCOVERY = ROOT / "discovery" / "modelos-razonadores"

# Same frozen horizontal byte authority used by the release and CI preflight.
# Do not replace these with historical candidate hashes from old checkpoints.
EXPECTED = {
    "00-presentacion.es.json": "e45db8339e97972c672f1d13aa5705bc9f6b25c5fcebfb28556d1c42d40487d6",
    "00-presentacion.en.json": "f26ac17cb5b4fa077b5175b00256ac6eaffb414e85fa0b51a4e878efc6d9a730",
    "01-que-es-razonar.es.json": "a357ab3df54ff2d8344a362307a5d4625201797d86f534fb840ae03817c48807",
    "01-que-es-razonar.en.json": "b4e13a927f4485c3fa372bbf5fa53c2d8452107431a66e38cb1e692c4c72ffcc",
    "02-fallos.es.json": "d7496cea7bc0b5889f64cca5b60f59506963c7125f4cb2eb9b166e79d26562ed",
    "02-fallos.en.json": "3f5f6fe9ec604b06ce448092e0f66ffb0fc543998cb9ba0f4583f3f3575c52b2",
    "03-test-time-compute.es.json": "e9c6c081bb19d2953777b3d37642e5a718de8dd16ce7b6f73ff9dc252dca8710",
    "03-test-time-compute.en.json": "27860f4c8304a3215dc5e29894e071df10f2b276fa1ddc5cbc6ea69c7f81e400",
    "04-latencia-streaming.es.json": "1ba074bafc897e818ef1015bfa4c3597d8c80f16f58496c3cb5345eca49c020f",
    "04-latencia-streaming.en.json": "3d8cb7f28b0a0ded5eb1b048a5f4d38b533948ee5181d2ea899507bc38dcc5a0",
    "05-riesgos.es.json": "f594dde47114da817416d0a6b37089cdec34eb607005fe452d5fc22f5b2df381",
    "05-riesgos.en.json": "ef27ccf56d3112214286d5eab4a34bcf4b55c1bf2bc108abe4e074eb0c29beec",
}


class ModelosR2DiscoveryInventoryTests(unittest.TestCase):
    def test_complete_byte_bound_inventory(self):
        files = {path.name for path in DISCOVERY.glob("*.json")}
        self.assertEqual(files, set(EXPECTED))
        seen_ids = set()
        for name, sha256 in EXPECTED.items():
            source = json.loads((DISCOVERY / name).read_text(encoding="utf-8"))
            self.assertEqual(source["video_sha256"], sha256)
            self.assertEqual(source["provenance"]["source_provenance"], "UNRECOVERED_LEGACY")
            self.assertEqual(source["caption_contract"], "silent-visual-text-v1")
            self.assertNotIn(source["id"], seen_ids)
            seen_ids.add(source["id"])
        self.assertEqual(len(seen_ids), 12)


if __name__ == "__main__":
    unittest.main()
