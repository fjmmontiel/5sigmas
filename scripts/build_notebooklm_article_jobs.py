import argparse
import json
import sys
from pathlib import Path
from string import Template

sys.path.insert(0, str(Path(__file__).parent))

from build_article_video_payloads import _first_heading, _read_text, _strip_frontmatter


ROOT = Path(__file__).resolve().parents[1]
ARTICLES_ROOT = ROOT / "docs" / "series"
DEFAULT_CONFIG = ROOT / "video" / "notebooklm" / "config.json"
DEFAULT_TEMPLATE = ROOT / "video" / "notebooklm" / "prompts" / "article-summary-v2.md"
DEFAULT_JOBS = ROOT / "video" / "notebooklm" / "jobs" / "article-jobs.json"
DEFAULT_QUERIES = ROOT / "video" / "notebooklm" / "queries"
DEFAULT_RAW = ROOT / "video" / "notebooklm" / "raw" / "articles"
DEFAULT_SOURCE_MAP = ROOT / "video" / "notebooklm" / "source-map.json"


def _article_paths(articles_root: Path) -> list[Path]:
    return sorted(
        path
        for path in articles_root.rglob("*.md")
        if path.name not in {"00_presentacion_serie.md", "index.md"}
    )


def _article_meta(article_path: Path) -> dict:
    raw = _read_text(article_path)
    meta, body = _strip_frontmatter(raw)
    title = meta.get("title") or _first_heading(body) or article_path.stem
    return {
        "title": title,
        "description": meta.get("description", ""),
    }


def _source_title(series_id: str, slug: str, title: str) -> str:
    return f"{series_id}/{slug} · {title}"


def _build_prompt(template: Template, series_id: str, slug: str, title: str, description: str) -> str:
    return template.substitute(
        series_id=series_id,
        slug=slug,
        title=title,
        description=description or "Sin descripción editorial.",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Build NotebookLM batch jobs for 5sigmas article video copy.")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--template", default=str(DEFAULT_TEMPLATE))
    parser.add_argument("--out-jobs", default=str(DEFAULT_JOBS))
    parser.add_argument("--out-queries-root", default=str(DEFAULT_QUERIES))
    parser.add_argument("--out-raw-root", default=str(DEFAULT_RAW))
    parser.add_argument("--source-map", default=str(DEFAULT_SOURCE_MAP))
    parser.add_argument("--root", default=str(ROOT))
    parser.add_argument("--articles-root", default=str(ARTICLES_ROOT))
    args = parser.parse_args()

    root = Path(args.root)
    articles_root = Path(args.articles_root)
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    template = Template(Path(args.template).read_text(encoding="utf-8"))
    source_map_path = Path(args.source_map)
    source_map = {}
    if source_map_path.is_file():
        source_map = json.loads(source_map_path.read_text(encoding="utf-8")).get("sources", {})
    out_jobs = Path(args.out_jobs)
    out_queries_root = Path(args.out_queries_root)
    out_raw_root = Path(args.out_raw_root)
    out_jobs.parent.mkdir(parents=True, exist_ok=True)
    out_queries_root.mkdir(parents=True, exist_ok=True)
    out_raw_root.mkdir(parents=True, exist_ok=True)

    jobs = []
    for article_path in _article_paths(articles_root):
        series_id = article_path.parent.name
        slug = article_path.stem
        meta = _article_meta(article_path)
        prompt = _build_prompt(template, series_id, slug, meta["title"], meta["description"])
        prompt_rel = Path("video") / "notebooklm" / "queries" / series_id / f"{slug}.prompt.txt"
        raw_rel = Path("video") / "notebooklm" / "raw" / "articles" / series_id / f"{slug}.json"
        prompt_path = root / prompt_rel
        prompt_path.parent.mkdir(parents=True, exist_ok=True)
        prompt_path.write_text(prompt, encoding="utf-8")

        jobs.append(
            {
                "seriesId": series_id,
                "slug": slug,
                "articlePath": str(article_path.relative_to(root)),
                "title": meta["title"],
                "description": meta["description"],
                "notebookId": config["notebookId"],
                "notebookTitle": config["notebookTitle"],
                "promptVersion": config["promptVersion"],
                "sourceTitle": _source_title(series_id, slug, meta["title"]),
                "sourceId": source_map.get(f"{series_id}/{slug}"),
                "promptPath": str(prompt_rel),
                "rawOutputPath": str(raw_rel),
            }
        )

    out_jobs.write_text(json.dumps({"jobs": jobs}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[notebooklm-jobs] jobs={len(jobs)} -> {out_jobs.relative_to(root)}")


if __name__ == "__main__":
    main()
