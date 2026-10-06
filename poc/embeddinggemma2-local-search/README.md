# 5sigmas × EmbeddingGemma 2 — local multimodal retrieval POC

A source-first semantic search proof of concept for the complete public 5sigmas knowledge system.

A natural-language question is embedded locally in the browser and matched against one shared vector index containing:

- complete article and concept passages;
- technical notes and tool documentation;
- images and diagrams;
- live animation records and their visual assets;
- video moments with direct timestamps;
- video frames and 16 kHz audio when the full video indexing mode is enabled.

No hosted embedding API and no production vector database are required.

## Why this architecture fits 5sigmas

5sigmas already emits a bilingual machine-readable knowledge graph from the pages that MkDocs actually deploys:

- https://5sigmas.com/agent/knowledge.json
- https://5sigmas.com/en/agent/knowledge.json

That graph already treats pages, images, SVGs, animations and videos as first-class items with canonical URLs and parent relationships. The POC uses it as the ingestion contract instead of recrawling arbitrary DOM.

Video discovery is also already structured:

- https://5sigmas.com/videos/catalog.json
- https://5sigmas.com/videos/key-moments.json
- English equivalents under /en/

The index therefore preserves the same public/canonical IDs and URLs as the rest of the 5sigmas agent and SEO surface.

## Model split

### Index build: full EmbeddingGemma 2

The local Python indexer uses:

    google/embeddinggemma-2

with Sentence Transformers 6.1+.

The full 740M configuration embeds text, images, video and audio into one 768-dimensional semantic space. This POC stores 256-dimensional Matryoshka vectors by default.

### Browser query: text-only EmbeddingGemma 2

The web app runs the text-only 270M LiteRT model locally through MediaPipe Universal Embedder:

    litert-community/embeddinggemma-2-text-270m-litert-lm

All EmbeddingGemma 2 modular encoder configurations project into the same space. Therefore a 270M text query can search vectors that were created by the full 740M multimodal model.

The browser receives the full 768-dimensional query vector, truncates the first 256 dimensions, then L2-normalizes it again before cosine search. The index builder performs the equivalent 256-dimensional truncation and normalization.

## Data path

    5sigmas canonical build outputs
               |
               v
       build_index.py
               |
        +------+-----------------------------+
        |                                    |
        v                                    v
    Markdown                         images / animations /
    sections                         timestamped video+audio
        |                                    |
        +------------ EmbeddingGemma 2 ------+
                         740M
                          |
                       256-D
                    unit vectors
                          |
             +------------+-------------+
             |                          |
        records.json                vectors.f32
             |                          |
             +------------+-------------+
                          |
                     static hosting
                          |
    user question -> 270M browser query model -> dot-product scan
                          |
        article | image | animation | exact video moment

For a 256-dimensional float32 index, each embedding is exactly 1 KiB. Even 20,000 retrieval units are only about 19.5 MiB of raw vectors, so a brute-force in-memory scan is a reasonable POC and removes all vector-database infrastructure.

## Build the index

Requirements:

- Python 3.11+
- ffmpeg only when using full video+audio indexing
- enough local disk/RAM for the EmbeddingGemma 2 checkpoint and temporary video segments

From this directory:

    python -m venv .venv
    source .venv/bin/activate
    pip install -U pip
    pip install -r requirements.txt

Build text + visual retrieval:

    python build_index.py

Build the complete multimodal index including timestamped video frames + audio:

    python build_index.py --embed-video

The default output is:

    web/public/index/manifest.json
    web/public/index/records.json
    web/public/index/vectors.f32

Useful controls:

    python build_index.py \
      --embed-video \
      --dim 256 \
      --video-window-seconds 30 \
      --max-video-segments-per-video 32 \
      --device mps

For CUDA use the appropriate Sentence Transformers device, for example --device cuda.

### What gets embedded

Text:
- complete Markdown is fetched from each knowledge item markdown_url;
- content is split by heading and then bounded into overlapping chunks;
- chunks use the EmbeddingGemma 2 Document retrieval prompt.

Images:
- title, heading, description and parent context are interleaved with the actual raster asset;
- if an image cannot be decoded, ingestion falls back to its text metadata rather than dropping the result.

Animations:
- visible animation text and metadata are indexed;
- when the animation exposes a raster asset, the asset is included through the vision encoder;
- the returned URL is still the live animation fragment on 5sigmas.

Video:
- existing curated 5sigmas key moments are preserved;
- videos without curated clips can be divided into fixed windows;
- --embed-video downloads each source video temporarily;
- ffmpeg produces a timestamped video segment and 16 kHz mono audio;
- EmbeddingGemma 2 embeds the segment as interleaved text + video + audio;
- temporary media is deleted after indexing;
- each result stores the exact watch URL and start/end timestamp.

## Validate retrieval locally

The smoke path deliberately loads only the 270M text encoder. This verifies the exact cross-configuration property used by the browser:

    python smoke_search.py \
      "Why does continuous batching improve LLM serving throughput?"

Try cross-modal queries as well:

    python smoke_search.py "show me the visual explaining KV cache fragmentation"
    python smoke_search.py "where do you explain prompt injection trust boundaries?"
    python smoke_search.py "video moment about interruption handling in voice agents"

A strong POC acceptance criterion is that these return different content kinds without modality-specific routing.

## Run the web POC

    cd web
    npm install
    npm run dev

Open the Vite URL in a current Web-capable browser.

On the first query the browser downloads the text-only EmbeddingGemma 2 model, then query embeddings run on-device. The static index is loaded once and cosine search is performed locally in JavaScript.

The UI renders the retrieved item according to its type:

- text -> exact passage + source link;
- image -> image preview + canonical page;
- animation -> preview when available + direct live animation link;
- video_moment -> HTML5 video player constrained to the retrieved timestamp + direct moment URL.

## Self-host every runtime asset

The default POC fetches the model from Hugging Face and the MediaPipe WASM runtime from jsDelivr. Inference itself is local, but those first-load downloads are network dependencies.

For a fully self-hosted deployment:

1. host the 270M litertlm file under a 5sigmas static asset path;
2. copy the MediaPipe retrieval WASM directory into the site;
3. set VITE_EMBEDDING_MODEL_URL to the local model URL;
4. set VITE_RETRIEVAL_WASM_BASE to the local WASM directory.

This makes the retrieval stack serveable entirely from 5sigmas infrastructure. MediaPipe documents that task input processing stays on-device; its package privacy notice separately describes performance/utilization metrics.

## Why no Chroma/Qdrant in the web POC

For the current site scale, normalized 256-D float32 vectors are small enough to scan in browser memory. A vector database would add operational state without improving the core proof:

    score = document_vector dot query_vector

because both sides are unit normalized.

If the index grows enough that brute-force latency becomes meaningful, the next step should be an in-browser ANN index (for example HNSW/WASM) generated at build time, not a hosted database by default.

## Optional local answer generation

This POC intentionally stops at source retrieval. That is the cleanest way to prove the difficult part: one text query retrieving the right cross-modal 5sigmas object.

A second stage can use an OSS Gemma 4 web model locally to synthesize an answer from the top retrieved passages while preserving the source cards underneath. Retrieval should remain independently inspectable so generation cannot hide a bad match.

## Production path after the POC

1. Run the index builder in the normal 5sigmas release workflow after both locales are built.
2. Publish the three index files with the site.
3. Add the search UI to the existing MkDocs theme rather than keeping a separate Vite page.
4. Add a fixed retrieval eval set covering ES/EN and every result modality.
5. Gate releases on Recall@k / nDCG plus canonical URL correctness.
6. Add build-time incremental caching keyed by content/media SHA so unchanged videos are never re-embedded.
7. Only then add optional local Gemma 4 answer synthesis.

## Upstream references

- EmbeddingGemma 2 developer guide:
  https://developers.googleblog.com/en/embeddinggemma-2-the-developer-guide/
- EmbeddingGemma 2 model documentation:
  https://ai.google.dev/gemma/docs/embeddinggemma/model_card_2
- MediaPipe Universal Embedder for Web:
  https://developers.google.com/edge/mediapipe/solutions/retrieval/universal_embedder/web_js
- MediaPipe retrieval npm package:
  https://www.npmjs.com/package/@mediapipe/tasks-retrieval
- LiteRT-LM embedding models:
  https://developers.google.com/edge/litert-lm/embedding_models
