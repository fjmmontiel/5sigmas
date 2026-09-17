#!/usr/bin/env python3
"""Mutation fixtures for the route/locale → H2 → key-moment curriculum ledger."""
from __future__ import annotations

import copy
import unittest

from audit_video_curriculum_inventory import build_inventory
from test_video_schema_contract import (
    assert_accessibility_fail_closed_contract,
    audit_published_accessibility_inventory,
)


class VideoCurriculumInventoryTest(unittest.TestCase):
    def setUp(self) -> None:
        self.expectation = {
            "obligations": [
                {
                    "obligation_id": "es:series/a/01.md",
                    "route": "series/a/01.md",
                    "locale": "es",
                    "video_required": True,
                    "native_locale_required": True,
                },
                {
                    "obligation_id": "en:series/a/01.md",
                    "route": "series/a/01.md",
                    "locale": "en",
                    "video_required": True,
                    "native_locale_required": True,
                },
            ]
        }
        self.report = {
            "pages": [
                {
                    "locale": "es",
                    "source": "docs/series/a/01.md",
                    "sections": ["Problema", "Mecanismo"],
                    "findings": [{"code": "VIDEO_DECLARATION_MISSING"}],
                    "video": {},
                },
                {
                    "locale": "en",
                    "source": "locales/en/series/a/01.md",
                    "sections": ["Problem", "Mechanism"],
                    "findings": [],
                    "video": {
                        "video": "01.mp4",
                        "video_chapters": [{"name": "Mechanism", "start": 0, "end": 10}],
                        "video_section_map": [
                            {"section": "Problem", "key_moment": "Mechanism"},
                            {"section": "Mechanism", "key_moment": "Mechanism"},
                        ],
                    },
                },
            ]
        }

    def test_missing_video_keeps_every_h2_explicit_and_blocked(self) -> None:
        inventory = build_inventory(self.report, self.expectation)
        es = inventory["obligations"][0]
        self.assertEqual(es["current_state"], "VIDEO_REQUIRED_UNDECLARED")
        self.assertEqual([x["section"] for x in es["section_obligations"]], ["Problema", "Mecanismo"])
        self.assertTrue(all(x["state"] == "BLOCKED_VIDEO_UNDECLARED" for x in es["section_obligations"]))
        self.assertTrue(all(x["key_moment"] is None for x in es["section_obligations"]))

    def test_missing_audited_locale_cannot_disappear_from_aggregate(self) -> None:
        report = copy.deepcopy(self.report)
        report["pages"] = report["pages"][:1]
        inventory = build_inventory(report, self.expectation)
        self.assertEqual(inventory["summary"]["expected_locale_video_obligations"], 2)
        self.assertEqual(inventory["summary"]["audited_obligations"], 1)
        self.assertEqual(inventory["summary"]["missing_audited_pages"], 1)
        self.assertEqual(inventory["obligations"][1]["current_state"], "AUDITED_PAGE_MISSING")
        self.assertEqual(inventory["status"], "FAIL_CLOSED")

    def test_duplicate_audited_route_locale_is_rejected(self) -> None:
        report = copy.deepcopy(self.report)
        report["pages"].append(copy.deepcopy(report["pages"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate audited route/locale"):
            build_inventory(report, self.expectation)

    def test_declared_video_without_curated_chapters_does_not_invent_key_moments(self) -> None:
        report = copy.deepcopy(self.report)
        en = report["pages"][1]
        en["findings"] = [{"code": "VIDEO_CHAPTERS_MISSING"}, {"code": "VIDEO_SECTION_MAP_MISSING"}]
        en["video"]["video_chapters"] = []
        en["video"]["video_section_map"] = []
        inventory = build_inventory(report, self.expectation)
        en_record = inventory["obligations"][1]
        self.assertEqual(en_record["current_state"], "VIDEO_DECLARED_SOURCE_CONTRACT_INCOMPLETE")
        self.assertTrue(all(x["state"] == "BLOCKED_CURATED_KEY_MOMENTS_MISSING" for x in en_record["section_obligations"]))
        self.assertTrue(all(x["key_moment"] is None for x in en_record["section_obligations"]))

    def test_unknown_or_missing_section_mapping_remains_blocked(self) -> None:
        report = copy.deepcopy(self.report)
        en = report["pages"][1]
        en["findings"] = [{"code": "VIDEO_SECTION_UNMAPPED"}]
        en["video"]["video_section_map"] = [{"section": "Problem", "key_moment": "Mechanism"}]
        inventory = build_inventory(report, self.expectation)
        states = {x["section"]: x["state"] for x in inventory["obligations"][1]["section_obligations"]}
        self.assertEqual(states["Problem"], "MAPPED_TO_CURATED_KEY_MOMENT")
        self.assertEqual(states["Mechanism"], "BLOCKED_SECTION_MAPPING_MISSING_OR_INVALID")
        self.assertEqual(inventory["status"], "FAIL_CLOSED")

    def test_valid_many_h2_to_one_real_key_moment_is_preserved(self) -> None:
        inventory = build_inventory(self.report, self.expectation)
        en = inventory["obligations"][1]
        self.assertEqual(
            [x["state"] for x in en["section_obligations"]],
            ["MAPPED_TO_CURATED_KEY_MOMENT", "MAPPED_TO_CURATED_KEY_MOMENT"],
        )
        self.assertEqual([x["key_moment"] for x in en["section_obligations"]], ["Mechanism", "Mechanism"])
        self.assertEqual(inventory["status"], "FAIL_CLOSED")  # Spanish obligation is still missing video.

    def test_bilingual_accessibility_assets_fail_closed(self) -> None:
        """Exercise both locale asset paths without whitening known accessibility debt."""
        assert_accessibility_fail_closed_contract()
        inventory = audit_published_accessibility_inventory(enforce_debt=False)
        self.assertEqual(inventory["locale_surfaces"], 92)
        self.assertEqual(inventory["partial_declarations"], 0)
        self.assertGreater(inventory["captions_transcript_review"], 0)


if __name__ == "__main__":
    unittest.main()