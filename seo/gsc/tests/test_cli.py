from __future__ import annotations

import unittest

from seo.gsc.cli import _assert_site_access
from seo.gsc.client import GSCError


class FakeClient:
    site_url = "sc-domain:5sigmas.com"

    def __init__(self, entries):
        self.entries = entries

    def list_sites(self):
        return {"siteEntry": self.entries}


class AccessPreflightTests(unittest.TestCase):
    def test_full_user_is_accepted(self) -> None:
        client = FakeClient(
            [{"siteUrl": "sc-domain:5sigmas.com", "permissionLevel": "siteFullUser"}]
        )
        self.assertEqual(_assert_site_access(client), "siteFullUser")

    def test_missing_exact_property_fails_closed(self) -> None:
        client = FakeClient(
            [{"siteUrl": "https://5sigmas.com/", "permissionLevel": "siteOwner"}]
        )
        with self.assertRaises(GSCError):
            _assert_site_access(client)

    def test_restricted_access_fails_closed(self) -> None:
        client = FakeClient(
            [{"siteUrl": "sc-domain:5sigmas.com", "permissionLevel": "siteRestrictedUser"}]
        )
        with self.assertRaises(GSCError):
            _assert_site_access(client)


if __name__ == "__main__":
    unittest.main()
