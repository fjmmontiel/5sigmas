import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "video" / "manifests" / "articles" / "datacenters-espacio" / "01-por-que-ahora.json"
DEFAULT_OUT_ROOT = ROOT / "video" / "manifests" / "feedback" / "datacenters-espacio"

VARIANTS = [
	("core", "01-por-que-ahora-pulse-core"),
	("orbit", "01-por-que-ahora-pulse-orbit"),
	("cascade", "01-por-que-ahora-pulse-cascade"),
]

LEGACY_VARIANTS = [
	"01-por-que-ahora-pressure.json",
	"01-por-que-ahora-orbit.json",
	"01-por-que-ahora-cascade.json",
]


def _load_json(path: Path) -> dict:
	return json.loads(path.read_text(encoding="utf-8"))


def build_options(source_path: Path, out_root: Path) -> list[Path]:
	base = _load_json(source_path)
	out_root.mkdir(parents=True, exist_ok=True)
	written = []

	for legacy_name in LEGACY_VARIANTS:
		legacy_path = out_root / legacy_name
		if legacy_path.exists():
			legacy_path.unlink()

	for layout_mode, slug in VARIANTS:
		payload = {
			**base,
			"compositionId": "ArticleDataPulse",
			"slug": slug,
			"layoutMode": layout_mode,
		}
		output_path = out_root / f"{slug}.json"
		output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
		written.append(output_path)
		print(f"[datacenter-options] {layout_mode} -> {output_path}")

	return written


def main() -> None:
	parser = argparse.ArgumentParser(description="Build three feedback-ready video options for datacenters-espacio.")
	parser.add_argument("--source", default=str(DEFAULT_SOURCE))
	parser.add_argument("--out-root", default=str(DEFAULT_OUT_ROOT))
	args = parser.parse_args()

	source_path = Path(args.source).resolve()
	out_root = Path(args.out_root).resolve()
	build_options(source_path, out_root)


if __name__ == "__main__":
	main()
