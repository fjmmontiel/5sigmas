from __future__ import annotations

import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DISCOVERY = ROOT / "discovery" / "modelos-razonadores"

EXPECTED = {
    "00-presentacion.es.json": "e45db8339e97972c672f1d13aa5705bc9f6b25c5fcebfb28556d1c42d40487d6",
    "00-presentacion.en.json": "f26ac17ca1a2c66e2a1fb13eebfb7aa0459aa960434716595d54c679c6d9a730",
    "01-que-es-razonar.es.json": "a357ab3d9325859a5d218b77ae2626267094298a0d83a970e4ca176fe061bc40",
    "01-que-es-razonar.en.json": "b4e13a92508df24ce6e084f08c6b01c58d2c99f76dc96d70359345a1b7bf47c3",
    "02-fallos.es.json": "d7496cea7bc0b5889f64cca5b60f59506963c7125f4cb2eb9b166e79d26562ed",
    "02-fallos.en.json": "3f5f6fe90495d423192c4161ce86f86faeb50c901ec50f134528178b575c52b2",
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
