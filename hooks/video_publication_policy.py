"""Owner-directed publication gate for site videos.

The final three withheld series have exact owner-approved replacements in the
2026-09-28 release manifest. Future unapproved replacements must not enter main.
Approved R2/R5/C3/D2/A2/C1 assets are not altered by this release.
"""
from pathlib import Path
UNPUBLISHED_VIDEO_SERIES = frozenset()
def is_video_source_published(src_uri: str) -> bool:
    parts = Path(str(src_uri or "").lstrip("/")).parts
    return not (len(parts) >= 2 and parts[0] == "series" and parts[1] in UNPUBLISHED_VIDEO_SERIES)
