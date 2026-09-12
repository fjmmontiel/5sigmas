from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Iterable
from urllib.parse import quote

from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account


READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
WEBMASTERS_BASE = "https://www.googleapis.com/webmasters/v3"
URL_INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"


class GSCError(RuntimeError):
    """Raised when Google Search Console returns a non-success response."""


@dataclass(frozen=True)
class Filter:
    dimension: str
    expression: str
    operator: str = "contains"


class GSCClient:
    def __init__(self, site_url: str, credentials_info: dict[str, Any] | None = None) -> None:
        self.site_url = site_url
        info = credentials_info or self._credentials_from_environment()
        credentials = service_account.Credentials.from_service_account_info(
            info,
            scopes=[READONLY_SCOPE],
        )
        self.session = AuthorizedSession(credentials)

    @staticmethod
    def _credentials_from_environment() -> dict[str, Any]:
        raw = os.getenv("GSC_SERVICE_ACCOUNT_JSON", "").strip()
        file_path = os.getenv("GSC_SERVICE_ACCOUNT_FILE", "").strip()
        if raw:
            try:
                return json.loads(raw)
            except json.JSONDecodeError as exc:
                raise GSCError("GSC_SERVICE_ACCOUNT_JSON is not valid JSON") from exc
        if file_path:
            with open(file_path, "r", encoding="utf-8") as handle:
                return json.load(handle)
        raise GSCError(
            "Missing credentials. Set GSC_SERVICE_ACCOUNT_JSON or GSC_SERVICE_ACCOUNT_FILE."
        )

    def _request_json(self, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
        response = self.session.request(method, url, timeout=45, **kwargs)
        if not response.ok:
            body = response.text[:4000]
            raise GSCError(f"{method} {url} failed: HTTP {response.status_code}: {body}")
        if not response.content:
            return {}
        return response.json()

    @property
    def encoded_site_url(self) -> str:
        return quote(self.site_url, safe="")

    def list_sites(self) -> dict[str, Any]:
        return self._request_json("GET", f"{WEBMASTERS_BASE}/sites")

    def search_analytics(
        self,
        start_date: str,
        end_date: str,
        *,
        dimensions: Iterable[str] = (),
        filters: Iterable[Filter] = (),
        search_type: str = "web",
        data_state: str = "final",
        row_limit: int = 25_000,
        max_rows: int = 100_000,
        paginate: bool = True,
    ) -> dict[str, Any]:
        endpoint = (
            f"{WEBMASTERS_BASE}/sites/{self.encoded_site_url}/searchAnalytics/query"
        )
        dimensions = list(dimensions)
        filter_list = list(filters)
        rows: list[dict[str, Any]] = []
        start_row = 0
        first_metadata: dict[str, Any] | None = None
        response_aggregation_type: str | None = None

        while True:
            body: dict[str, Any] = {
                "startDate": start_date,
                "endDate": end_date,
                "type": search_type,
                "dataState": data_state,
                "rowLimit": min(row_limit, 25_000),
                "startRow": start_row,
            }
            if dimensions:
                body["dimensions"] = dimensions
            if filter_list:
                body["dimensionFilterGroups"] = [
                    {
                        "groupType": "and",
                        "filters": [
                            {
                                "dimension": item.dimension,
                                "operator": item.operator,
                                "expression": item.expression,
                            }
                            for item in filter_list
                        ],
                    }
                ]

            payload = self._request_json("POST", endpoint, json=body)
            batch = payload.get("rows", []) or []
            rows.extend(batch)
            if first_metadata is None:
                first_metadata = payload.get("metadata") or {}
                response_aggregation_type = payload.get("responseAggregationType")

            if (
                not paginate
                or not dimensions
                or len(batch) < body["rowLimit"]
                or len(rows) >= max_rows
            ):
                break
            start_row += len(batch)

        result: dict[str, Any] = {"rows": rows}
        if first_metadata:
            result["metadata"] = first_metadata
        if response_aggregation_type:
            result["responseAggregationType"] = response_aggregation_type
        return result

    def list_sitemaps(self) -> dict[str, Any]:
        endpoint = f"{WEBMASTERS_BASE}/sites/{self.encoded_site_url}/sitemaps"
        return self._request_json("GET", endpoint)

    def inspect_url(self, url: str, language_code: str = "en-US") -> dict[str, Any]:
        body = {
            "inspectionUrl": url,
            "siteUrl": self.site_url,
            "languageCode": language_code,
        }
        return self._request_json("POST", URL_INSPECTION_ENDPOINT, json=body)
