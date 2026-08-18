# 5sigmas SEO and indexation audit

Audit date: 2026-08-18. Production crawl is the baseline; the after crawl is
the local build from this branch. Search Console data is read-only and reflects
the property snapshot last updated 2026-08-14.

## Numeric results

| Measure | Before: production | After: local build |
|---|---:|---:|
| URLs examined by crawler | 217 | 216 |
| Indexable URLs | 213 | 213 |
| Intentional noindex URLs | 3 | 3 |
| Sitemap URLs | 213 | 213 |
| Invalid sitemap entries | 0 | 0 |
| Broken internal links | 1 | 0 |
| Internal links to redirects | 0 | 0 |
| Invalid canonicals | 0 | 0 |
| Invalid hreflang pairs | 0 | 0 |
| Indexable orphan URLs | 0 | 0 |
| Gone or 404 URLs in crawl | 1 | 0 |

The production defect was an English generated video page linking its Spanish
language selector to a non-existent Spanish watch route. The selector now
falls back to the Spanish home when no public Spanish counterpart exists.

## Search Console snapshot

- 121 indexed and 61 not indexed; 182 URLs represented in the report summary.
- The 61 non-indexed URLs are captured individually in
  `search-console-inventory.csv`: noindex 4, 404 2, crawled-not-indexed 41,
  redirect 6, alternative canonical 2, discovered-not-indexed 6.
- Four GSC noindex records include two intentional Coming Soon routes, one
  explicitly noindexed legacy topic page, and one series page that is currently
  indexable. The latter is a stale historical GSC classification, not a
  current runtime noindex.
- One GSC 404 record is currently 200/indexable; the animation template URL
  remains a genuine 404 but is not linked or present in a sitemap.
- No request for indexing, validation, sitemap submission, or other Search
  Console mutation was performed.
- Starting-state screenshot: `search-console/pages-current.png`.

## Deliverables and gates

- `crawl-before.json` and `crawl-after.json`: reproducible crawl evidence.
- `url-classification.csv`, `canonical-audit.csv`, `locale-audit.csv`,
  `sitemap-audit.csv`, `redirect-map.csv`, and `broken-links.csv`: route-level
  findings.
- `search-console-inventory.csv`: all 61 current non-indexed report rows.
- `scripts/audit_seo_site.py`: dependency-free sitemap/HTML crawler with
  blocking findings for broken links, invalid canonicals, invalid hreflang,
  sitemap errors, and indexable orphans.
- `scripts/tests/test_audit_seo_site.py`: focused regression test.
- Make and PR/deploy workflow gates run the crawler and its unit test.

## Post-deploy Search Console actions

1. Confirm the deployed commit and rerun the production crawl.
2. Inspect the four historical noindex URLs and the two historical 404 URLs
   with URL Inspection; only request validation/indexing after the runtime
   result is confirmed.
3. Recheck the six GSC reason buckets and export a fresh inventory after the
   next data refresh. Do not treat the old crawled/discovered counts as a
   release regression while their last crawl predates this change.
4. Submit or resubmit only the existing canonical sitemaps if Search Console
   shows them stale: `/sitemap.xml` and `/video-sitemap.xml`.
