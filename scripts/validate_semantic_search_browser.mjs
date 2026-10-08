#!/usr/bin/env node
// End-to-end UI/locale verification with deterministic mocked model boundaries.
// This does NOT certify downloading actual EmbeddingGemma or real WebGPU inference.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.S5_PREVIEW_URL || 'http://127.0.0.1:8000';
const locales = [
  { path: '/buscar/', lang: 'es', phrase: '¿Cómo funciona batching en inferencia?', url: 'https://5sigmas.com/temas/test-batching/' },
  { path: '/en/buscar/', lang: 'en', phrase: 'How does batching improve inference?', url: 'https://5sigmas.com/en/temas/test-batching/' },
];

const fakeMediaPipe = 