import { EmbeddingEngine } from "@litert-lm/core";
import "./style.css";

const DEFAULT_MODEL_URL =
  "https://huggingface.co/litert-community/embeddinggemma-2-text-270m-litert-lm/resolve/main/embeddinggemma-2-text-270m.litertlm";
const MODEL_URL = import.meta.env.VITE_EMBEDDING_MODEL_URL || DEFAULT_MODEL_URL;
const INDEX_BASE = import.meta.env.VITE_INDEX_BASE || "/index";
const TOP_K = 10;

const form = document.querySelector("#search-form");
const input = document.querySelector("#query");
const resultsEl = document.querySelector("#results");
const runtimeState = document.querySelector("#runtime-state");
const indexState = document.querySelector("#index-state");
const searchMeta = document.querySelector("#search-meta");

let state = null;
let enginePromise = null;

function normalizePrefix(vector, dim) {
  if (vector.length < dim) {
    throw new Error("Query vector is shorter than index dimension");
  }
  const output = new Float32Array(dim);
  let norm2 = 0;
  for (let i = 0; i < dim; i += 1) {
    const value = Number(vector[i]);
    output[i] = value;
    norm2 += value * value;
  }
  const norm = Math.sqrt(norm2);
  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error("Query embedding has zero norm");
  }
  for (let i = 0; i < dim; i += 1) {
    output[i] /= norm;
  }
  return output;
}

function dotAt(matrix, offset, query, dim) {
  let score = 0;
  for (let j = 0; j < dim; j += 1) {
    score += matrix[offset + j] * query[j];
  }
  return score;
}

async function loadIndex() {
  const manifestResponse = await fetch(INDEX_BASE + "/manifest.json");
  if (!manifestResponse.ok) {
    throw new Error("Index manifest unavailable: " + manifestResponse.status);
  }
  const manifest = await manifestResponse.json();

  const recordsResponse = await fetch(INDEX_BASE + "/" + manifest.records_file);
  if (!recordsResponse.ok) {
    throw new Error("Index records unavailable: " + recordsResponse.status);
  }
  const records = await recordsResponse.json();

  const vectorsResponse = await fetch(INDEX_BASE + "/" + manifest.vectors_file);
  if (!vectorsResponse.ok) {
    throw new Error("Index vectors unavailable: " + vectorsResponse.status);
  }
  const buffer = await vectorsResponse.arrayBuffer();
  if (buffer.byteLength % 4 !== 0) {
    throw new Error("Vector file length is not aligned to float32");
  }
  const vectors = new Float32Array(buffer);

  if (!Array.isArray(records) || records.length !== manifest.count) {
    throw new Error("Record count does not match manifest");
  }
  if (vectors.length !== manifest.count * manifest.dimension) {
    throw new Error("Vector matrix shape does not match manifest");
  }

  indexState.textContent =
    manifest.count.toLocaleString() +
    " pieces · " +
    manifest.dimension +
    "d · " +
    Object.entries(manifest.counts || {})
      .map(function (entry) {
        return entry[0] + " " + entry[1];
      })
      .join(" · ");

  return { manifest, records, vectors };
}

async function getEngine() {
  if (!enginePromise) {
    runtimeState.textContent = "Loading 270M local query model…";
    enginePromise = EmbeddingEngine.create({ model: MODEL_URL }).then(function (engine) {
      runtimeState.textContent = "Ready · browser-local inference";
      return engine;
    });
  }
  return enginePromise;
}

function topMatches(queryVector, topK) {
  const dim = state.manifest.dimension;
  const scored = [];
  for (let i = 0; i < state.records.length; i += 1) {
    const score = dotAt(state.vectors, i * dim, queryVector, dim);
    scored.push({ score, record: state.records[i] });
  }
  scored.sort(function (a, b) {
    return b.score - a.score;
  });

  const output = [];
  const seen = new Set();
  for (const item of scored) {
    const record = item.record;
    const key =
      String(record.kind || "") +
      "|" +
      String(record.url || "") +
      "|" +
      String(record.heading || "");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
    if (output.length >= topK) {
      break;
    }
  }
  return output;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined && text !== null) {
    node.textContent = String(text);
  }
  return node;
}

function mediaPreview(record) {
  if (record.kind === "video_moment" && record.asset_url) {
    const video = document.createElement("video");
    video.className = "media-preview video-preview";
    video.controls = true;
    video.preload = "metadata";
    if (record.poster_url) {
      video.poster = record.poster_url;
    }
    let fragment = "";
    if (Number.isFinite(Number(record.start_seconds))) {
      fragment = "#t=" + Number(record.start_seconds);
      if (Number.isFinite(Number(record.end_seconds))) {
        fragment += "," + Number(record.end_seconds);
      }
    }
    video.src = record.asset_url + fragment;
    return video;
  }

  if ((record.kind === "image" || record.kind === "animation") && record.asset_url) {
    const image = document.createElement("img");
    image.className = "media-preview";
    image.loading = "lazy";
    image.src = record.asset_url;
    image.alt = record.title || "5sigmas visual";
    return image;
  }

  if (record.kind === "animation") {
    return element("div", "animation-preview", "Live interactive animation");
  }

  return null;
}

function kindLabel(record) {
  const labels = {
    text: record.source_kind === "engineering" ? "Technical article" : "Article / text",
    image: "Image",
    svg: "Diagram",
    animation: "Interactive animation",
    video_moment: "Video moment",
  };
  return labels[record.kind] || record.kind || "Content";
}

function renderResults(matches) {
  resultsEl.replaceChildren();

  for (const match of matches) {
    const record = match.record;
    const card = element("article", "result-card");
    const preview = mediaPreview(record);
    if (preview) {
      card.appendChild(preview);
    }

    const body = element("div", "result-body");
    const meta = element("div", "result-meta");
    meta.appendChild(element("span", "kind", kindLabel(record)));
    meta.appendChild(element("span", "score", "cos " + match.score.toFixed(3)));
    if (record.locale) {
      meta.appendChild(element("span", "locale", record.locale.toUpperCase()));
    }
    body.appendChild(meta);

    body.appendChild(element("h3", "", record.title || "5sigmas"));
    if (record.heading && record.heading !== record.title) {
      body.appendChild(element("p", "heading", record.heading));
    }
    if (record.text) {
      body.appendChild(element("p", "excerpt", record.text));
    }

    if (record.url) {
      const link = element(
        "a",
        "open-link",
        record.kind === "animation"
          ? "Open live animation"
          : record.kind === "video_moment"
            ? "Open exact video moment"
            : "Open source"
      );
      link.href = record.url;
      link.target = "_blank";
      link.rel = "noopener";
      body.appendChild(link);
    }

    card.appendChild(body);
    resultsEl.appendChild(card);
  }
}

async function search(query) {
  if (!state) {
    throw new Error("Index is not loaded yet");
  }
  const started = performance.now();
  const engine = await getEngine();
  const prefixed = "task: search query | text: " + query.trim();
  const response = await engine.computeEmbedding(prefixed, { normalize: true });
  const queryVector = normalizePrefix(response.embedding, state.manifest.dimension);
  const embeddedAt = performance.now();
  const matches = topMatches(queryVector, TOP_K);
  const finished = performance.now();

  renderResults(matches);
  searchMeta.textContent =
    matches.length +
    " results · embedding " +
    (embeddedAt - started).toFixed(0) +
    " ms · scan " +
    (finished - embeddedAt).toFixed(1) +
    " ms";
}

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    return;
  }
  form.classList.add("busy");
  searchMeta.textContent = "Searching locally…";
  try {
    await search(query);
  } catch (error) {
    console.error(error);
    searchMeta.textContent = "Search failed: " + (error && error.message ? error.message : String(error));
  } finally {
    form.classList.remove("busy");
  }
});

async function init() {
  try {
    state = await loadIndex();
    runtimeState.textContent = "Index ready · model loads on first query";
    input.disabled = false;
    form.querySelector("button").disabled = false;
  } catch (error) {
    console.error(error);
    runtimeState.textContent = "Index load failed";
    searchMeta.textContent = error && error.message ? error.message : String(error);
  }
}

input.disabled = true;
form.querySelector("button").disabled = true;
init();
