"""Owner-directed publication gate for site videos.

Series content remains public. Video surfaces and MP4 delivery are disabled for
the remaining unapproved series 07 onward. AI Security is live again with its
owner-approved R5 videos; Data Centers in Space remains live.
"""

from pathlib import Path

UNPUBLISHED_VIDEO_SERIES = frozenset(
    {
        "agentes-ia",
        "agentes-voz-tiempo-real",
        "coding-agents-agent-harnesses",
        "context-engineering-memory-mcp",
        "llm-inference-engineering-economics",
        "evaluating-ai-systems-production",
    }
)


def is_video_source_published(src_uri: str) -> bool:
    parts = Path(str(src_uri or "").lstrip("/")).parts
    return not (
        len(parts) >= 2
        and parts[0] == "series"
        and parts[1] in UNPUBLISHED_VIDEO_SERIES
    )
