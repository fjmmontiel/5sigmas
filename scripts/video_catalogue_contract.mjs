// Share the exact audited publication inventory with the native browser gates.
import { execFileSync } from 'node:child_process';

export const publicationContract = JSON.parse(execFileSync('python', ['-c', `
import json
from scripts.validate_series_07_video_unpublish import EXPECTED_PUBLIC_CATALOGUE, BLOCKED, KEEP_LIVE
from hooks.video_publication_policy import UNPUBLISHED_VIDEO_SERIES
assert set(BLOCKED) == set(UNPUBLISHED_VIDEO_SERIES), "Publication policy/inventory disagree"
print(json.dumps({"count": EXPECTED_PUBLIC_CATALOGUE, "withdrawn": sorted(UNPUBLISHED_VIDEO_SERIES), "approved": {s: 5 if s == "datacenters-espacio" else 6 for s in KEEP_LIVE}}))
`], { encoding: 'utf8', timeout: 10000 }));
if (!Number.isInteger(publicationContract.count) || publicationContract.count < 1) {
  throw new Error('Invalid canonical video catalogue contract');
}

export function cataloguePublicationErrors(catalogue) {
  const failures = [];
  if (catalogue.count !== publicationContract.count) failures.push(`catalogue count ${catalogue.count} != approved inventory ${publicationContract.count}`);
  if (!Array.isArray(catalogue.videos)) return [...failures, 'catalogue.videos must be an array'];
  if (catalogue.videos.length !== catalogue.count) failures.push('catalogue.count != videos.length');
  for (const series of publicationContract.withdrawn) {
    if (catalogue.videos.some(v => String(v.source_url).includes(`/series/${series}/`))) failures.push(`unapproved video series restored: ${series}`);
  }
  for (const [series, expected] of Object.entries(publicationContract.approved)) {
    const actual = catalogue.videos.filter(v => String(v.source_url).includes(`/series/${series}/`)).length;
    if (actual !== expected) failures.push(`${series}: approved surfaces ${actual} != ${expected}`);
  }
  return failures;
}
