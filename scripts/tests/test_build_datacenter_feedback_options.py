import json
from pathlib import Path

from scripts.build_datacenter_feedback_options import build_options


def test_build_datacenter_feedback_options_writes_three_variants(tmp_path: Path) -> None:
	source = tmp_path / "01-por-que-ahora.json"
	source.write_text(
		json.dumps(
			{
				"seriesId": "datacenters-espacio",
				"slug": "01-por-que-ahora",
				"compositionId": "ArticleDataPulse",
				"title": "Cómputo en el espacio: por qué ahora",
				"promise": "Analizamos los límites físicos que impulsan la computación espacial.",
				"highlights": ["A", "B", "C"],
				"voiceover": ["Uno", "Dos", "Tres"],
				"chapters": [{"index": 1, "title": "Uno", "path": "#uno"}],
				"cta": "Lee el análisis completo en 5sigmas.",
				"fps": 30,
				"durationInFrames": 900,
			}
		),
		encoding="utf-8",
	)

	out_root = tmp_path / "feedback"
	files = build_options(source, out_root)

	assert [file.name for file in files] == [
		"01-por-que-ahora-pulse-core.json",
		"01-por-que-ahora-pulse-orbit.json",
		"01-por-que-ahora-pulse-cascade.json",
	]
	assert json.loads(files[0].read_text(encoding="utf-8"))["layoutMode"] == "core"
	assert json.loads(files[1].read_text(encoding="utf-8"))["layoutMode"] == "orbit"
	assert json.loads(files[2].read_text(encoding="utf-8"))["layoutMode"] == "cascade"
