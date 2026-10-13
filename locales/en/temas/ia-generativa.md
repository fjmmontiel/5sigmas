---
title: "Generative AI"
description: "What generative AI is, how it differs from discriminative models, and how systems produce text, images, audio, video and code."
keywords: "generative AI, generative models, discriminative AI, language models, image generation, diffusion, multimodal models"
date: 2026-04-07
hide:
  - toc
robots: noindex
---

# Generative AI

**Generative AI** describes models that produce content such as text, images, audio, video or code. Unlike a model designed primarily to assign labels or estimate a target variable, a generative model learns patterns that allow it to sample or construct new outputs, often conditioned on instructions or other inputs. A language model estimates how text sequences continue; an image model may learn how image features relate to noise, prompts or latent representations.

The distinction is about the task and objective, not an absolute separation between architectures. A generative model can be used for classification, and a discriminative component can help guide generation. Neither model simply retrieves a memorized example by default, although memorization and reproduction of training material are real risks that should be evaluated.

## Where this concept appears in the series

<div style="display:flex;gap:.75rem;flex-wrap:wrap;margin:1.25rem 0">

<a href="/en/series/fundamentos-ia-iag/00_presentacion_serie/" style="flex:1;min-width:200px;text-decoration:none;border-radius:10px;border:1px solid rgba(50,74,178,.3);padding:1rem;display:flex;flex-direction:column;gap:.4rem;color:inherit">
  <div style="font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#324AB2;font-weight:700">AI and Generative AI Foundations</div>
  <div style="font-size:.85rem;opacity:.8;line-height:1.4">Understand what makes a model generative, how it differs from classical prediction, and where general intelligence fits into the discussion.</div>
  <div style="margin-top:.5rem;font-size:.82rem;color:#324AB2;font-weight:600">Read →</div>
</a>

<a href="/en/series/multimodalidad-iag/00_presentacion_serie/" style="flex:1;min-width:200px;text-decoration:none;border-radius:10px;border:1px solid rgba(124,199,255,.3);padding:1rem;display:flex;flex-direction:column;gap:.4rem;color:inherit">
  <div style="font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:#7cc7ff;font-weight:700">Multimodality in Generative AI</div>
  <div style="font-size:.85rem;opacity:.8;line-height:1.4">Explore generation across images, audio and video, and the architectural choices that let a system work across multiple modalities.</div>
  <div style="margin-top:.5rem;font-size:.82rem;color:#7cc7ff;font-weight:600">Read →</div>
</a>

</div>

## Frequently asked questions

**How does generative AI differ from traditional AI?**
A discriminative system may map an input to a label, such as whether a message is spam. A generative system constructs an output, such as a paragraph or image, conditioned on context. This is a useful distinction between objectives, not a rule that every application belongs to only one category.

**Does generative AI only produce text?**
No. The field includes language and code models, image generators, speech and music systems, and video models. Different modalities require different training data, representations and evaluation criteria; fluency in one modality does not guarantee competence in another.

**Is ChatGPT generative AI?**
Yes. ChatGPT is an application interface that uses generative language models to produce responses conditioned on the conversation and the available context. Model versions and optional tool capabilities can change; the core text-generation mechanism remains generative.

**How do AI systems generate images?**
Many image generators use diffusion techniques. A model learns to reverse a noise process or predict a related denoising target. During inference, it iteratively transforms an initial noisy representation into an image, potentially conditioned on a text prompt. Other systems use autoregressive or hybrid techniques, so diffusion is not the only possible architecture.
