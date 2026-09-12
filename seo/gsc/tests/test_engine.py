from __future__ import annotations

import unittest
from datetime import date

from seo.gsc.engine import (
    active_protection,
    aggregate_query_page,
    cannibalization_candidates,
    comparable_windows,
    rising_pages,
    score_opportunities,
)


class EngineTests(unittest.TestCase):
    def test_comparable_windows_do_not_overlap(self) -> None:
        current, previous = comparable_windows(date(2026, 9, 8), 28)
        self.assertEqual(current, (date(2026, 8, 12), date(2026, 9, 8)))
        self.assertEqual(previous, (date(2026, 7, 15), date(2026, 8, 11)))

    def test_query_aggregation_and_protection(self) -> None:
        rows = [
            {"keys": ["razonar significado", "https://5sigmas.com/a/"], "clicks": 0, "impressions": 20, "ctr": 0, "position": 9},
            {"keys": ["razonar significado", "https://5sigmas.com/a/"], "clicks": 0, "impressions": 30, "ctr": 0, "position": 11},
        ]
        aggregated = aggregate_query_page(rows)
        experiments = {
            "experiments": [
                {
                    "id": "x",
                    "status": "measuring",
                    "deployed_on": "2026-09-06",
                    "min_settled_days": 10,
                    "urls": ["https://5sigmas.com/a/"],
                    "query_family": ["razonar significado"],
                }
            ]
        }
        protection = active_protection(experiments, date(2026, 9, 8))
        opportunities = score_opportunities(aggregated, protection)
        self.assertEqual(len(opportunities), 1)
        self.assertTrue(opportunities[0]["protected"])
        self.assertEqual(opportunities[0]["impressions"], 50)
        self.assertAlmostEqual(opportunities[0]["position"], 10.2, places=2)

    def test_cannibalization_flags_split_ownership(self) -> None:
        rows = [
            {"keys": ["foo", "https://5sigmas.com/a/"], "clicks": 0, "impressions": 60, "ctr": 0, "position": 8},
            {"keys": ["foo", "https://5sigmas.com/b/"], "clicks": 0, "impressions": 40, "ctr": 0, "position": 9},
        ]
        aggregated = aggregate_query_page(rows)
        result = cannibalization_candidates(
            aggregated,
            {"protected_urls": [], "protected_queries": []},
        )
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["top_page_share"], 0.6)
        self.assertGreater(result[0]["entropy"], 0.9)

    def test_protection_expires_after_settled_days(self) -> None:
        experiments = {
            "experiments": [
                {
                    "id": "x",
                    "status": "measuring",
                    "deployed_on": "2026-09-01",
                    "min_settled_days": 10,
                    "urls": ["https://5sigmas.com/a/"],
                    "query_family": ["foo"],
                }
            ]
        }
        protection = active_protection(experiments, date(2026, 9, 12))
        self.assertFalse(protection["experiments"][0]["protected"])
        self.assertEqual(protection["protected_urls"], [])

    def test_rising_pages_position_direction(self) -> None:
        current = {
            "https://5sigmas.com/a/": {"clicks": 2.0, "impressions": 40.0, "ctr": 0.05, "position": 6.0}
        }
        previous = {
            "https://5sigmas.com/a/": {"clicks": 1.0, "impressions": 20.0, "ctr": 0.05, "position": 10.0}
        }
        result = rising_pages(current, previous)
        self.assertEqual(result[0]["impressions_delta"], 20.0)
        self.assertEqual(result[0]["position_improvement"], 4.0)


if __name__ == "__main__":
    unittest.main()
