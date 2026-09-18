# 5sigmas motion runtime v4

Deterministic, code-driven renderer for the 5sigmas video migration. The JSON spec is the source of truth for content, semantic diagrams, the locked series accent and text↔motion cues.

## Contracts

- One shared clock drives text emphasis and diagram actions.
- `visualIdentity` is mandatory for v4 and resolves the series accent at runtime.
- Intro copy is scene-owned through `data.heading` and `data.endNote`; no Test-Time-Compute-specific copy is hardcoded into generic mechanisms.
- Rendering is a pure function of `(spec, time, baseTheme, viewport)` so seeking and export are deterministic.
- Horizontal and portrait renders recompose from the same spec; they are not pixel crops.
- The offline exporter bundles every renderer module explicitly; there is no decorative fallback.

## Local checks

```bash
cd motion
npm test
npm run gate
python -m pip install -r requirements.txt
playwright install chromium
python scripts/render.py content/modelos-razonadores/02-fallos.es.json --check-only
python scripts/render.py content/modelos-razonadores/02-fallos.es.json --portrait --check-only
```

Full MP4 export additionally requires `ffmpeg`, `ffprobe`, Inter and Noto Serif Display installed on the host. Font files are never stored in the repository.
