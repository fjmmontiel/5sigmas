---
title: Beyond the Transformer — memory and world models
description: How the field is trying to move beyond pure Transformer scaling by combining tools, search, inference-time memory, world models and robotics.
date: 2026-03-31
date_modified: 2026-08-23
keywords: "beyond the Transformer, test-time compute, AI memory, world models, Mamba, SSM, AI robotics, AI agents, AI search, future of AI"
tags:
  - AI
  - LLMs
  - Reasoning
  - Inference
---

# Chapter 5 — Beyond the Transformer (≈ 2022–Q1 2026)

This chapter describes the limits exposed by pure Transformer scaling and the directions the field is opening to move beyond them. By the end, you will understand why a long context window is not the same as persistent memory, what architectures such as Mamba contribute relative to standard attention, and how active search over solution spaces—exemplified by AlphaGo and its descendants—is changing the kinds of systems we build. The chapter also covers world models, foundation robotics and the capital bets that reveal where the ecosystem believes the next frontier lies. It is intended for readers who already understand foundation models and want to see where the field may go beyond scaling alone.

!!! note "Update"
    This chapter covers the state of the field through Q1 2026. Sections on specific models, investment levels and benchmarks can change quickly; sections on structural Transformer limitations are more stable.

The chapter follows the previous one conceptually as well as chronologically. Transformer scaling remains a central force, but it is no longer enough on its own to describe where the frontier is moving.

Several new directions have emerged in recent years. Some address practical limits of the Transformer itself, such as the cost of long context and memory. Others expand the kind of system being built: models that use tools, actively search for solutions, learn during inference or construct internal representations of the world rather than only predict the next piece of text.

This chapter traces that shift.

---

## 1. Why the Transformer is no longer a complete map

The Transformer reorganized the field because it was parallelizable, scalable and extremely general. But scaling it also made several limits increasingly visible.

The first is computational. Standard attention becomes expensive as context length grows, turning long memory into a hardware and efficiency problem. The [Transformer attention visualizer](/en/tools/transformer-attention/) lets you inspect that token-to-token interaction, while the [KV-cache and context explorer](/en/tools/kv-cache-context/) shows how the same scaling pressure turns into memory use and context capacity during inference.

The second is functional. A pretrained Transformer can know a great deal, but its weights are usually fixed at inference time. It can use immediate context, but it does not naturally maintain persistent memory that updates while the system is in use.

The third is structural. Predicting the next element of a sequence well is not necessarily equivalent to planning, actively searching for a solution, manipulating external tools or constructing a causal model of an environment.

That is why the current frontier is not only about training larger models. It is about combining scale with memory, search, tools and representations of the world.

### 1.1 Truth, uncertainty and hallucination

This also exposes a reliability limit. Generative LLMs trained around next-token prediction are not directly optimized to distinguish truth, falsehood and unknown information. They are optimized to produce plausible continuations given their training distributions and reward signals. When information is insufficient or the context is underspecified, that pressure can push the model to complete rather than abstain.

This is why the problem should be framed carefully. There are serious arguments that hallucinations may never disappear completely in open-ended, general-purpose systems. Recent theory argues that hallucination is unavoidable for computable LLMs used as general problem solvers, while more applied work argues that standard training and evaluation procedures reward guessing over admitting uncertainty.

It would also be too strong, however, to turn this into an absolute condemnation of the Transformer architecture or to claim that every mitigation is superficial. Much of the problem depends on the training objective, calibration, abstention behavior and access to external verification. Retrieval, tools, verification, uncertainty detection and explicit refusal policies can substantially reduce hallucinations in bounded domains. The strongest defensible statement is therefore not that the problem will disappear, but that in open generative systems it remains a serious structural limitation even though well-designed products can mitigate it substantially.

---

## 2. From next-token prediction to search over solution spaces

One of the most important directions in this new phase is a renewed emphasis on something that the LLM boom had pushed somewhat into the background: search.

In 2016, [AlphaGo](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf) showed that a powerful neural network alone was not enough: the system combined networks, tree search and reinforcement learning to navigate an enormous game space. In 2017, [AlphaZero](https://arxiv.org/abs/1712.01815) generalized that approach to Go, chess and shogi using only the rules of each game. The underlying idea was already there: for some problems, practical intelligence is not only about predicting a good answer, but about actively exploring a space of possibilities and evaluating promising trajectories.

The same logic later reappeared in other contexts. In 2022, [ReAct](https://arxiv.org/abs/2210.03629) showed that even language-based agents can improve when they alternate reasoning and action, call external tools, observe the result and use that information to choose the next step. ReAct is not a direct architectural descendant of AlphaGo, but it participates in the same broader shift away from the idea that a useful model simply emits a one-shot answer.

{{ include_html("snippets/from-cave-to-agi/05-agentes-convergencia.html") }}

Within DeepMind, the progression is more direct. In July 2024, [AlphaProof and AlphaGeometry 2](https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/) showed that combining language models, search and reinforcement learning could reach silver-medal performance at the International Mathematical Olympiad. In May 2025, [AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) extended that idea to algorithm discovery: Gemini models, automated evaluators and an evolutionary framework working together to improve code and discover new algorithms. Later that year, in the official IMO 2025 evaluation, Gemini Deep Think reached gold-medal level, reinforcing the idea that a base model combined with active search and formal verification can cross the threshold of top human competitors in olympiad mathematics.

[DeepMind's March 2026 retrospective](https://deepmind.google/blog/10-years-of-alphago/) on ten years of AlphaGo makes this genealogy explicit. It presents AlphaProof and AlphaEvolve as continuations of the same intuition that made AlphaGo and AlphaZero powerful: combine capable models with search, verification and planning to traverse enormous spaces where answering well once is not enough.

The useful unit is increasingly the whole system rather than the model alone: model, search, tools and evaluation working together.

{{ include_html("snippets/from-cave-to-agi/05-busqueda-solucion.html") }}

## 3. Memory beyond the context window

Another clear frontier is memory. LLM context windows have grown dramatically, but a long window is not the same as persistent, selective memory.

{{ include_html("snippets/from-cave-to-agi/05-memoria-tipos.html") }}

### 3.1 Mamba and the return of State Space Models

<abbr title="A family of sequence models with roots in classical control theory. Instead of computing attention between every pair of tokens, they maintain a compact hidden state vector that is updated at each step in the sequence. This lets them process long sequences with linear O(N) computational cost rather than the O(N²) cost imposed by standard Transformer attention.">State space models</abbr> (SSMs) are a family of architectures with roots in classical control theory. Instead of computing attention between every pair of tokens in the context, they maintain a compact hidden-state vector that is updated at each sequence step, allowing long sequences to be processed with linear rather than quadratic cost.

[Mamba](https://arxiv.org/abs/2312.00752) revived this tradition with a key idea: make some parameters input-dependent to improve selection of relevant information while achieving linear scaling with sequence length. The point was not only speed. It was an attempt to preserve useful reasoning over long sequences without always paying the price of full attention.

[Mamba-2](https://arxiv.org/abs/2405.21060) went further and showed a deep mathematical relationship between attention and state space models, proposing a refined layer that is faster and competitive. The result suggests that this may be less a clean break from the Transformer than the emergence of a broader family of sequence and memory mechanisms.

### 3.2 Titans, MIRAS and memory that learns during inference

Google Research pushes this further. [Titans](https://arxiv.org/abs/2501.00663) introduces long-term neural memory that updates while the model is operating. The central idea is not merely to retain more context, but to decide what deserves consolidation into memory according to novelty or surprise.

Google later presented [Titans + MIRAS](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/) as an explicit direction toward test-time memorization: systems that maintain useful memory during execution without relying only on offline retraining. The implication is that some useful learning may happen during use, not only during training.

### 3.3 Nested Learning

Google Research extended the same direction with [Nested Learning](https://research.google/blog/introducing-nested-learning-a-new-ml-paradigm-for-continual-learning/), presented in 2025 as a continual-learning paradigm based on nested optimization problems with different update frequencies. The idea is to reinterpret architecture and optimization as parts of one multilevel system.

It is not yet a new field standard. The broader direction nevertheless suggests that future systems may rely less on one large training loop and more on several levels of adaptation operating at different rates, from immediate memory to more persistent internal modification.

{{ include_html("snippets/from-cave-to-agi/05-arquitecturas-post-transformer.html") }}

---

## 4. World models: learning structure, not only sequences

World-model research takes a different route: learning internal representations of how an environment evolves rather than relying only on next-token prediction.

{{ include_html("snippets/from-cave-to-agi/05-world-models-ecosystem.html") }}

[DreamerV3](https://arxiv.org/abs/2301.04104), and later its version published in [Nature](https://www.nature.com/articles/s41586-025-08744-2), showed that a world model can learn to imagine possible futures and reuse that ability to solve more than 150 tasks with a single configuration, including collecting diamonds in Minecraft from scratch. The key is not only performance but the kind of approach: the system learns a latent model of the environment and plans within it.

In parallel, [I-JEPA](https://arxiv.org/abs/2301.08243) pursues a related idea. Rather than reconstructing every pixel, it predicts semantic representations in a latent space. It is not a complete world model in Dreamer's sense, but it belongs to the same family of ideas that prioritize structure over literal reconstruction.

[Genie 2](https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/) extends this approach to generating playable, controllable 3D environments from a single input image. The work is still early and demonstrative, but the thesis is visible: if a system can model world dynamics well enough, it can become useful not only for answering questions but for training agents and exploring action spaces.

### 4.1 The thesis is already moving capital

The idea is already attracting significant capital. In March 2026, Reuters reported that [AMI](https://www.reuters.com/business/ex-meta-ai-chief-yann-lecuns-ami-raises-103-billion-alternative-ai-approach-2026-03-10/), Yann LeCun's startup, raised $1.03 billion to develop systems centered on reasoning, planning and modeling the real world. A month earlier, Reuters reported that Fei-Fei Li's [World Labs](https://www.reuters.com/business/ai-pioneer-fei-fei-lis-world-labs-raises-1-billion-funding-2026-02-18/) raised $1 billion to advance “spatial intelligence.”

Those rounds do not show that world models are the winning approach. They do show that a significant part of the ecosystem believes the next leap will not come from scaling language alone, but from modeling the world's spatial, causal and interactive structure more effectively.

The investment scale extends far beyond those two companies. In 2026 alone, OpenAI announced **$110 billion** in new investment, Anthropic closed **$30 billion**, and xAI another **$20 billion**. In parallel, large technology companies plan roughly **$635 billion** of AI capital expenditure in 2026 alone.

Capital is concentrating around four concrete bottlenecks—**models, compute, energy and the physical world**—because better training alone is no longer enough.

Those systems must also be deployed, powered, and given spatial perception and action in the real world.

{{ include_html("snippets/from-cave-to-agi/05-apuestas-capital.html") }}

---

## 5. From model to body: robotics and physical action

As systems are expected to perceive, plan and act, robotics becomes a central systems problem.

[RT-2](https://arxiv.org/abs/2307.15818) showed that a vision-language-action model can transfer some knowledge acquired from web data into robotic-control tasks. The important point is not only that the robot can execute movements, but that it can use more general representations to interpret instructions and generalize beyond a strictly robotic training set.

Figure is one of the most visible bets in this phase because it combines early commercial deployment with a general-purpose intelligence layer. In 2024 it announced a partnership with BMW to deploy humanoid robots in a factory. [Helix](https://www.figure.ai/news/helix) was then introduced in 2025 as a general vision-language-action model for humanoid control, capable of controlling the full upper body and even coordinating two robots on shared tasks. By late 2025, the company had published deployment metrics for [Figure 02 at BMW](https://www.figure.ai/news/production-at-bmw), including accumulated operating hours, parts handled and documented production contribution. Figure therefore combines a clear general-purpose VLA narrative with explicit industrial deployment.

Tesla takes a different approach. Its [Optimus](https://www.tesla.com/AI) approach is a general humanoid deeply integrated with the rest of its physical-AI, perception, control and manufacturing stack. The company presents it as a general-purpose autonomous robot for unsafe, repetitive or boring tasks. Public evidence through Q1 2026, however, remains more programmatic than Figure's: Reuters reported in 2024 that Tesla aimed to use Optimus internally at low scale in 2025 and later expand toward external customers, but that ambition still looks more like a corporate roadmap than an industrial deployment documented as explicitly as Figure's.

[NVIDIA Project GR00T](https://investor.nvidia.com/news/press-release-details/2024/NVIDIA-Announces-Project-GR00T-Foundation-Model-for-Humanoid-Robots-and-Major-Isaac-Robotics-Platform-Update/default.aspx) targets the same shift from another layer of the stack: foundation models for humanoid robots, combined with simulation, synthetic data, perception and specialized hardware.

We are not yet at reliable general-purpose robots that work in arbitrary environments. The approach is shifting toward foundation-model logic: one base is expected to transfer across many tasks instead of being completely reprogrammed for each one.

{{ include_html("snippets/from-cave-to-agi/05-robotica-fundacional.html") }}

---

## 6. What this new phase is trying to solve

These directions target limitations exposed by Transformer scaling: memory that is short relative to long-horizon tasks, little internal adaptation during inference, planning that remains weak in some domains and incomplete understanding of the physical world.

Current research therefore emphasizes:

- Search and verification over solution spaces
- Selective memory during inference
- Continual learning across multiple timescales
- Internal models of environments
- Systems capable of perceiving and acting in the physical world

We do not yet know which combination will prevail. Regardless of which one does, progress is increasingly coming from better-organized systems that can interact with the world more effectively, not only from larger models.

!!! tip "Next series"
    This chapter closes the history of how we got here. The next series enters one of today's most active fronts: [Multimodality in Generative AI →](/en/series/multimodalidad-iag/00_presentacion_serie/)

---

## 7. References

<details markdown="1">
<summary>**Core sources**</summary>

| Key | Source | Short description |
| --- | --- | --- |
| R1 | [Silver et al. (2016) — *AlphaGo*](https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf) | Networks, tree search and RL in Go. |
| R2 | [Silver et al. (2017) — *AlphaZero*](https://arxiv.org/abs/1712.01815) | Generalization of self-play and search; submitted in December 2017. |
| R3 | [Yao et al. (2022) — *ReAct*](https://arxiv.org/abs/2210.03629) | Integrating reasoning and action with tools in LLMs. |
| R4 | [DeepMind (2024) — *AlphaProof and AlphaGeometry 2*](https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/) | July 2024 announcement: silver-medal IMO level through search, RL and mathematical formalization. |
| R5 | [DeepMind (2025) — *AlphaEvolve*](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) | May 2025 announcement: agent for algorithm discovery and optimization. |
| R6 | [DeepMind (2026) — *10 years of AlphaGo*](https://deepmind.google/blog/10-years-of-alphago/) | March 2026 retrospective linking AlphaGo, AlphaZero, AlphaProof and AlphaEvolve through search and planning. |
| R7 | [Gu & Dao (2023) — *Mamba*](https://arxiv.org/abs/2312.00752) | Selective state space models and long sequences. |
| R8 | [Dao & Gu (2024) — *Transformers are SSMs*](https://arxiv.org/abs/2405.21060) | Mamba-2 and the duality between attention and SSMs. |
| R9 | [Behrouz, Zhong & Mirrokni (2025) — *Titans*](https://arxiv.org/abs/2501.00663) | Long-term neural memory during inference. |
| R10 | [Google Research (2025) — *Titans + MIRAS*](https://research.google/blog/titans-miras-helping-ai-have-long-term-memory/) | Test-time memorization and long-term memory. |
| R11 | [Google Research (2025) — *Nested Learning*](https://research.google/blog/introducing-nested-learning-a-new-ml-paradigm-for-continual-learning/) | Multilevel paradigm for continual learning. |
| R12 | [Hafner et al. (2023) — *DreamerV3*](https://arxiv.org/abs/2301.04104) | World models for general control. |
| R13 | [Hafner et al. (2025) — *Mastering diverse control tasks through world models*](https://www.nature.com/articles/s41586-025-08744-2) | Nature publication of DreamerV3. |
| R14 | [Assran et al. (2023) — *I-JEPA*](https://arxiv.org/abs/2301.08243) | Prediction in representation space. |
| R15 | [DeepMind (2024) — *Genie 2*](https://deepmind.google/blog/genie-2-a-large-scale-foundation-world-model/) | Playable, controllable 3D world from an image. |
| R16 | [Brohan et al. (2023) — *RT-2*](https://arxiv.org/abs/2307.15818) | Vision-language-action models in robotics. |
| R17 | [Figure (2025) — *Helix*](https://www.figure.ai/news/helix) | General VLA for humanoid control. |
| R18 | [Figure (2025) — *Figure 02 at BMW*](https://www.figure.ai/news/production-at-bmw) | Public industrial deployment metrics. |
| R19 | [Reuters (2024) — BMW and Figure](https://www.reuters.com/business/autos-transportation/bmw-taps-humanoid-startup-figure-take-teslas-robot-2024-01-18/) | Initial deployment agreement with BMW. |
| R20 | [Tesla — *AI & Robotics*](https://www.tesla.com/AI) | Official positioning of Optimus as a general-purpose humanoid. |
| R21 | [Reuters (2024) — Tesla and internal Optimus use](https://www.reuters.com/business/autos-transportation/tesla-have-humanoid-robots-internal-use-next-year-musk-says-2024-07-22/) | Tesla's public roadmap for Optimus. |
| R22 | [NVIDIA (2024) — *Project GR00T*](https://investor.nvidia.com/news/press-release-details/2024/NVIDIA-Announces-Project-GR00T-Foundation-Model-for-Humanoid-Robots-and-Major-Isaac-Robotics-Platform-Update/default.aspx) | Foundation model for humanoid robots. |
| R23 | [Reuters (2026) — AMI financing](https://www.reuters.com/business/ex-meta-ai-chief-yann-lecuns-ami-raises-103-billion-alternative-ai-approach-2026-03-10/) | Capital signal toward world models and reasoning. |
| R24 | [Reuters (2026) — World Labs financing](https://www.reuters.com/business/ai-pioneer-fei-fei-lis-world-labs-raises-1-billion-funding-2026-02-18/) | Capital signal toward spatial and 3D intelligence. |
| R25 | [OpenAI (2025) — *Why Language Models Hallucinate*](https://openai.com/index/why-language-models-hallucinate/) | Argument that standard objectives reward guessing over abstention. |
| R26 | [Xu et al. (2024/2025) — *Hallucination is Inevitable*](https://arxiv.org/abs/2401.11817) | Theoretical inevitability argument for general LLMs. |
| R27 | [Kadavath et al. (2022) — *Language Models (Mostly) Know What They Know*](https://arxiv.org/abs/2207.05221) | Model calibration and self-evaluation. |
| R28 | [Kapoor et al. (2024) — *Large Language Models Must Be Taught to Know What They Don’t Know*](https://papers.nips.cc/paper_files/paper/2024/file/9c20f16b05f5e5e70fa07e2a4364b80e-Paper-Conference.pdf) | Useful calibration does not emerge automatically; it needs explicit training. |
| R29 | [Madhusudhan et al. (2025) — *Do LLMs Know When to NOT Answer?*](https://aclanthology.org/2025.coling-main.627.pdf) | Abstention as a key reliability dimension. |
| R30 | [Dhuliawala et al. (2024) — *Chain-of-Verification*](https://aclanthology.org/2024.findings-acl.212.pdf) | Internal verification for reducing hallucination. |
| R31 | [Farquhar et al. (2024) — *Detecting hallucinations in large language models using semantic entropy*](https://www.nature.com/articles/s41586-024-07421-0) | Hallucination detection through uncertainty. |

</details>

---

## Frequently asked questions

**Why is active inference-time search relevant if LLMs already reason?**  
Because practical intelligence on complex problems is not just about predicting the next token in one pass. It often requires actively exploring a solution space and evaluating alternative trajectories. Systems such as AlphaProof combine a base model, search and formal verification to outperform direct answering, showing that how much computation a system spends while answering can matter as much as what it learned during training.

**If massive context windows already exist, what problem do Mamba or Titans solve?**  
Long windows are computationally expensive and their contents disappear when the session ends. Mamba proposes linear sequence scaling by maintaining a compact hidden state that updates at each step at much lower cost, although that state compresses history. Titans goes further by introducing neural memory that updates during inference and supports selective persistence without relying only on retraining or indefinitely expanding the context window.

**What is the fundamental difference between an LLM and a world model?**  
An LLM statistically predicts the next element of a sequence without necessarily constructing a causal representation of the environment in which it operates. A world model learns internal representations of how an environment evolves, allowing it to simulate possible futures and reject undesirable consequences before acting. DreamerV3 is a mature example: it learns a latent model and uses it to solve more than 150 tasks with one configuration.

**How do VLA models change robotics?**  
Vision-language-action models can transfer general knowledge learned from web-scale data into physical-control tasks through natural-language instructions. This reduces the need to hand-program every movement: one base can generalize across multiple tasks rather than requiring a full rewrite for each. Figure 02 has already published real deployment metrics from BMW's factory, moving the approach beyond purely experimental demonstrations and showing how robotics is beginning to inherit the logic of foundation models.
