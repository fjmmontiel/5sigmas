#!/usr/bin/env python3
"""Search a built 5sigmas index with the 270M text-only EmbeddingGemma 2 path."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--index", type=Path, default=Path("web/public/index"))
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--model", default="google/embeddinggemma-2")
    parser.add_argument("--device", default=None)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest = json.loads((args.index / "manifest.json").read_text(encoding="utf-8"))
    records = json.loads((args.index / manifest["records_file"]).read_text(encoding="utf-8"))
    dim = int(manifest["dimension"])

    matrix = np.fromfile(args.index / manifest["vectors_file"], dtype="<f4")
    matrix = matrix.reshape((len(records), dim))

    kwargs = {
        "truncate_dim": dim,
        "config_kwargs": {"vision_config": None, "audio_config": None},
    }
    if args.device:
        kwargs["device"] = args.device
    model = SentenceTransformer(args.model, **kwargs)

    query = model.encode(
        args.query.strip(),
        prompt_name="SearchQuery",
        truncate_dim=dim,
        normalize_embeddings=True,
    )
    query = np.asarray(query, dtype=np.float32).reshape(-1)[:dim]
    query /= np.linalg.norm(query)

    scores = matrix @ query
    top = np.argsort(-scores)[: args.top_k]
    payload = []
    for index in top:
        record = dict(records[int(index)])
        record["score"] = float(scores[int(index)])
        payload.append(record)

    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
