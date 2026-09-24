"""Owner-directed publication gate for site videos.

Series content remains public. Video surfaces and MP4 delivery are disabled for
series 07 onward until replacement videos are rebuilt, independently reviewed,
and explicitly approved for publication. Data Centers in Space remains live.
"""

from pathlib import Path

UNPUBLISHED_VIDEO_SERIES = frozenset(
    {
        "seguridad-ia",
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
