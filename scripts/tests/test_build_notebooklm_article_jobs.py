import json
import subprocess
import sys
from pathlib import Path


def test_build_notebooklm_article_jobs(tmp_path: Path) -> None:
    repo = tmp_path
    (repo / "docs" / "series" / "demo-serie").mkdir(parents=True)
    (repo / "docs" / "series" / "demo-serie" / "01-demo.md").write_text(
        "\n".join(
            [
                "---",
                "title: Demo",
                "description: Descripcion breve.",
                "---",
                "",
                "# Demo",
            ]
        ),
        encoding="utf-8",
    )
    (repo / "video" / "notebooklm" / "prompts").mkdir(parents=True)
    (repo / "video" / "notebooklm" / "prompts" / "article-summary-v1.md").write_text(
        "Serie: $series_id\nSlug: $slug\nTitulo: $title\nDescripcion: $description\n",
        encoding="utf-8",
    )
    (repo / "video" / "notebooklm").mkdir(parents=True, exist_ok=True)
    (repo / "video" / "notebooklm" / "config.json").write_text(
        json.dumps(
            {
                "notebookId": "nb-123",
                "notebookTitle": "Notebook demo",
                "promptVersion": "article-summary-v1",
            }
        ),
        encoding="utf-8",
    )

    subprocess.run(
        [
            sys.executable,
            str(Path(__file__).resolve().parents[1] / "build_notebooklm_article_jobs.py"),
            "--config",
            str(repo / "video" / "notebooklm" / "config.json"),
            "--template",
            str(repo / "video" / "notebooklm" / "prompts" / "article-summary-v1.md"),
            "--out-jobs",
            str(repo / "video" / "notebooklm" / "jobs" / "article-jobs.json"),
            "--out-queries-root",
            str(repo / "video" / "notebooklm" / "queries"),
            "--out-raw-root",
            str(repo / "video" / "notebooklm" / "raw" / "articles"),
            "--root",
            str(repo),
            "--articles-root",
            str(repo / "docs" / "series"),
        ],
        check=True,
        cwd=repo,
    )

    jobs_path = repo / "video" / "notebooklm" / "jobs" / "article-jobs.json"
    data = json.loads(jobs_path.read_text(encoding="utf-8"))
    assert len(data["jobs"]) == 1
    assert data["jobs"][0]["notebookId"] == "nb-123"
    assert data["jobs"][0]["sourceTitle"] == "demo-serie/01-demo · Demo"
    prompt_path = repo / data["jobs"][0]["promptPath"]
    assert "Serie: demo-serie" in prompt_path.read_text(encoding="utf-8")
