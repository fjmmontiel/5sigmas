---
title: "Speculative decoding, prefix caching, and other latency optimizations"
description: "How to separate reused work from speculative work, what actually changes TTFT and decode, and when prefix caching or speculative decoding helps or hurts a real serving system."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "speculative decoding, prefix caching, KV cache reuse, TTFT, TPOT, acceptance rate, draft model, inference latency"
tags:
  - AI
  - LLMs
  - Inference
  - Serving
  - Latency
---

# Chapter 4 — Speculative decoding, prefix caching, and other latency optimizations

The previous chapters separated **prefill**, **decode**, **KV-cache memory**, quantization, and parallelism. With those boundaries in place, we can analyze two optimizations that are often grouped together even though they change different work:

- **prefix caching** reuses prefill work that has already been computed and is still valid;
- **speculative decoding** computes cheap candidate tokens in an attempt to validate several tokens with fewer sequential target-model steps.

The distinction matters. A prefix-cache hit does not guess future tokens. It reuses already verified state for an identical prefix under the runtime's cache-identity contract. Speculation does introduce work that may be rejected.

The production question is not “should both switches be enabled?” It is:

> **Which part of the critical path are we avoiding, what extra work are we adding, and under which request distribution does the saving exceed the cost?**

{{ include_html("snippets/articulos-tecnicos/inference-speculative-prefix-latency.html") }}

## Start from the latency budget again

For an autoregressively served request, we can keep the decomposition from chapter 4.1:

\[
T_{TTFT}
\approx
T_{network}
+T_{queue}
+T_{prefill}
+T_{first\ output}
\]

After the first token, generation cost depends on decode steps, scheduling, batching, and hardware.

Prefix caching and speculative decoding target **different regions** of this path:

```text
request
  → queue
  → prefill         ← prefix caching can avoid part of this work
  → first token
  → decode loop     ← speculative decoding tries to commit >1 token per useful iteration
  → completion
```

That already rules out two common mistakes:

1. a prefix-cache hit does not imply lower TPOT;
2. speculative decoding does not remove initial prefill or guarantee lower TTFT.

Both techniques also share resources with the rest of serving. Retained KV consumes capacity. A draft model or speculative tokens consume compute, memory, KV pages, and scheduler budget. A local optimization can therefore increase queueing or reduce global goodput.

## Prefix caching reuses state from a previously computed prefix

In an autoregressive Transformer, prefill produces K/V state for input tokens. If a later request begins with exactly the same prefix under the runtime's identity contract, that K/V state can be reused instead of recomputed.

vLLM describes Automatic Prefix Caching in exactly those terms: it retains KV-cache blocks from processed requests and reuses them when a later query shares the same prefix.[^vllm-apc] TensorRT-LLM likewise keeps computed blocks in a search structure and supports cross-request reuse for matching prefixes.[^trt-kv]

The causal relation is:

\[
\text{prefix identity match}
\rightarrow
\text{reused KV state}
\rightarrow
\text{less uncached prefill work}
\]

It is not:

\[
\text{cache enabled}\Rightarrow\text{all requests faster}
\]

## A hit only covers the state that is actually reusable

Let a request contain `L_in` input tokens and let `L_hit` tokens be covered by reusable KV state. Define a token-weighted reuse ratio:

\[
H_{tokens}=\frac{L_{hit}}{L_{in}}
\]

The remaining new prefill then covers approximately:

\[
L_{uncached}=L_{in}-L_{hit}
\]

This is not a linear timing model. Prefill time versus token count depends on attention architecture, chunking, batch shape, kernels, and sequence length. The equations identify **which tokens no longer require the same prefill computation**.

### Illustrative example, not a benchmark

Suppose an application uses a shared system prompt plus a common document totaling 7,680 tokens. Each request adds 512 request-specific tokens:

```text
reusable prefix = 7,680 tokens
total input     = 8,192 tokens
H_tokens        = 7,680 / 8,192 = 93.75%
```

With a valid hit, the request can avoid recomputing state for those 7,680 tokens. We cannot turn `93.75%` into “93.75% lower TTFT”: queueing, lookup, suffix prefill, first-output work, and runtime overhead remain.

## Cache identity is part of correctness

“Same characters” is not a sufficient cache-identity definition.

Reusable state depends on tokens and on any information that changes the K/V computation. Depending on the model and runtime, relevant identity can include:

- tokenizer and token IDs;
- exact model revision;
- adapter/LoRA;
- multimodal inputs or their hashes;
- positions/RoPE configuration;
- attention/KV layout;
- relevant dtype/configuration;
- tenant or trust domain.

vLLM currently implements prefix caching with block hashes that include tokens, the previous-prefix hash, and extra data where necessary. It also exposes `cache_salt` to isolate reuse groups.[^vllm-apc-design] TensorRT-LLM documents salting plus retention and offload policies as parts of its KV-cache system.[^trt-kv]

The production consequence is direct:

> **An incomplete cache key is not merely a hit-rate problem. It can become a correctness or isolation problem.**

## In multi-tenant serving, a cache hit is also an observable signal

A shared backend can leak information through timing differences if an attacker can test whether a guessed prefix was already warm. vLLM documents this class of prefix-cache timing side channel and provides `cache_salt` to restrict reuse to requests carrying the same salt.[^vllm-security]

That creates a real trade-off:

```text
maximum cross-tenant reuse
            ↓
        higher hit rate
            ↓
possible information leakage through timing
```

versus:

```text
tenant/trust-domain salt
            ↓
      smaller reuse domain
            ↓
lower sharing, stronger isolation
```

There is no target hit rate independent of the security model.

## Capacity, eviction, and hit rate are coupled

The cache cannot retain unlimited state. When reusable pages compete with new requests, the runtime must release or move state.

TensorRT-LLM documents block reuse, prioritized eviction, and optional host offload before a block stops being reusable.[^trt-kv] vLLM describes block management and LRU eviction for Automatic Prefix Caching.[^vllm-apc-design]

Therefore:

\[
\text{retention policy}
\rightarrow
\text{resident reusable state}
\rightarrow
\text{future hit distribution}
\rightarrow
\text{prefill load + scheduler pressure}
\]

Keeping more reusable state can increase hit rate while leaving fewer free pages for active sequences. Offload expands the reusable tier, but a hit that must be restored from host memory does not have the same cost as a GPU-resident hit.

## Which workloads benefit from prefix reuse

Reuse helps when there is **real prefix repetition**.

Typical examples include:

- long shared system prompts;
- many questions over the same document;
- conversations that share earlier history;
- agents with identical base context and different suffixes;
- batch workloads derived from one common template.

It helps little when most prompts diverge in the first blocks, when reusable state is evicted before reuse, or when isolation policy prevents sharing among requests that otherwise look similar.

Evaluation should measure the actual distribution of `L_hit`, not merely report `cache_hit=true`.

## Speculative decoding attacks decode's sequential dependency

Standard decode confirms roughly one new token per autoregressive step:

```text
state_t → target → token_t+1 → state_t+1 → target → token_t+2 → ...
```

Speculative decoding introduces a **proposer**—for example a draft model, MTP path, or n-gram method—that generates several cheap candidates. The target evaluates/verifies them together. A compatible prefix is accepted, and when a mismatch occurs the selected algorithm corrects or falls back according to its acceptance rule.

```text
target state
   ↓
draft/proposer → d1 d2 d3 ... dk
   ↓
target verification
   ├─ accept d1..dj → commit state/KV
   └─ reject/correct → discard or rewind rejected speculative state
```

The original speculative decoding and speculative sampling papers describe acceptance procedures designed to preserve the target model's distribution under their algorithms.[^leviathan][^chen] **That does not imply that every method carrying the label “speculative decoding” is distribution-preserving.** Greedy, n-gram, MTP, EAGLE-like, and other variants have different contracts.

## “Verify several” does not mean “several free tokens”

For an iteration that proposes `k` tokens, a conceptual cost budget is:

\[
T_{spec}(k)
=
T_{draft}(k)
+T_{verify}(k)
+T_{correction}(k)
+T_{scheduler/KV}(k)
\]

Let `C(k)` be the number of tokens finally committed in that iteration. A useful quantity is:

\[
\frac{\mathbb{E}[C(k)]}{\mathbb{E}[T_{spec}(k)]}
\]

compared with baseline decode on **the same hardware, runtime, workload, and configuration**.

We do not assume that `T_verify(k)` equals the cost of one ordinary token or scales linearly with `k`. Kernels, sequence length, batch shape, and verification method matter.

## Acceptance rate is necessary, but not sufficient

If the proposer is often correct, the target can commit more tokens per useful cycle. But two systems with the same acceptance rate can perform very differently because they differ in:

- proposer cost;
- proposed depth `k`;
- verification cost;
- target size;
- extra KV state;
- batch and concurrency;
- scheduler behavior;
- interconnect when draft and target are distributed;
- sequence length and difficulty.

vLLM currently exposes per-request metrics such as `mean_acceptance_length`, `draft_acceptance_rate`, speculative-step counts, draft-token counts, and accepted-draft-token counts.[^vllm-acceptance] Those metrics help explain **why** a configuration helped or failed, but they must be read alongside TTFT, TPOT/ITL, throughput, and goodput.

A high acceptance rate with an expensive proposer can lose. A lower acceptance rate with nearly free proposals can win.

## A draft model is only one proposer family

A two-model implementation uses a smaller model to propose and the target to verify. It is not the only design.

Current vLLM documentation includes draft-model, n-gram, and MTP methods among its speculative paths. MTP uses native multi-token prediction capability in compatible model families and does not require a separate draft model.[^vllm-draft][^vllm-ngram][^vllm-mtp]

The resource budget changes accordingly.

### Separate draft model

```text
extra model weights
+ extra forward path
+ possible extra KV/state
+ target verification
```

### N-gram / prompt lookup

```text
cheap lookup/proposal
+ target verification
```

### MTP / integrated proposer

```text
model-specific proposal path
+ target verification
```

Published speedups for these families should not be combined as if they measured the same intervention.

## KV cache participates in speculation too

Proposed tokens need enough state to be verified and continued. Rejected speculative state cannot be committed as though the tokens had been accepted.

TensorRT-LLM documents that draft tokens consume KV pages and count against the executor's token limit before scheduling. It also documents **KV cache rewind**, in which pages allocated to rejected speculative tokens are returned to the pool.[^trt-spec]

Therefore:

\[
\text{more speculative depth}
\not\Rightarrow
\text{free parallelism}
\]

Increasing `k` can increase accepted tokens per verification while also reserving more KV, doing more draft work, and wasting more work when acceptance falls.

## System load can reverse the result

A single-request microbenchmark can favor speculative decoding because target verification exploits parallel work. Under high concurrency, the picture can reverse:

- proposer work consumes capacity that could serve other requests;
- draft tokens reserve KV and scheduler budget;
- larger target batches may already amortize some costs;
- speculative verification changes shapes and possibly kernel selection;
- the objective may shift from individual latency to **SLO goodput**.

TensorRT-LLM documents a concrete scheduler interaction: in its two-model speculation architecture, the overlap scheduler is unsupported and is disabled.[^trt-spec]

A result such as “1.8× faster” without request rate, batch shape, hardware, runtime, and exact metric is therefore not a production rule.

## Prefix caching and speculative decoding can coexist, but gains are not additive

A request can:

1. reuse a previously computed KV prefix;
2. prefill the uncached suffix;
3. enter decode;
4. use speculation to try to commit several tokens per verification.

Their percentages cannot simply be added.

```text
prefix hit
  ↓
less prefill compute
  ↓
TTFT may fall

speculative decode
  ↓
more candidate work + verification
  ↓
decode-step economics may improve
```

Both paths share GPU capacity, memory, scheduler resources, and KV capacity. Less prefill may free capacity for decode. More speculative KV can reduce concurrency. Changed batching can move the bottleneck again.

The final result must be measured end to end.

## Other optimizations: classify them by the work they change

“Latency optimization” is too broad. Ask which component is being changed.

| Technique | Main work changed | Attribution mistake to avoid |
|---|---|---|
| Prefix caching | repeated prefill | treating hit rate as proportional TTFT reduction |
| Speculative decoding | sequential decode steps | ignoring draft/verification/KV/scheduler overhead |
| Chunked prefill | scheduling of long prompts | presenting it as fewer total FLOPs |
| Prefill/decode disaggregation | phase placement and queues | confusing resource isolation with removed compute |
| CUDA graphs / launch optimization | launch/control overhead | extrapolating one batch/shape result to all workloads |
| Kernel fusion | intermediate movement/launches | attributing a runtime/kernel capability to the model |

These techniques can compose. Their measured percentage speedups cannot be composed without a controlled experiment.

## Three concrete decision cases

### Case A — Assistant with a long repeated system prompt

Pattern:

```text
6k common tokens + 0.5–2k user-specific tokens
many requests share the exact prefix
```

First hypothesis: **prefix caching**. There is repeated, verifiable prefill work that can potentially be removed. Measure `L_hit`, cold/hot TTFT, queue time, GPU KV residency, eviction, and tenant isolation.

Speculative decoding can be tested later if decode still dominates, but it is not the first explanation for high TTFT.

### Case B — Chat with short prompts and long answers

Pattern:

```text
0.2–1k input tokens
1–4k output tokens
little shared prefix
```

Prefix caching is likely to contribute little. If TPOT dominates and a cheap proposer achieves useful acceptance, speculative decoding deserves a controlled experiment.

The gate must compare the same request distribution and report acceptance, latency, and goodput—not only internal tokens/s.

### Case C — Saturated serving under high concurrency

Pattern:

```text
visible queueing
KV pressure
large continuous batches
p95/p99 SLO
```

Neither optimization should be enabled because of a microbenchmark alone. Verify whether more retained cache state or draft work reduces admission, increases queueing, or hurts SLO goodput. Disabling an optimization that wins single-request latency can be correct if it loses capacity under load.

## What to measure for prefix caching

A useful dashboard separates outcome from mechanism:

```text
request count
prompt-token distribution
reused-prefix-token distribution
H_tokens = reused_prefix_tokens / prompt_tokens
cold vs warm TTFT
cache lookup latency
GPU-resident hits vs restored/offloaded hits
evictions by cause
KV bytes retained for reuse
queue time / preemptions
throughput + SLO goodput
```

A raw cache-hit count hides how much prefix was actually reused and how much work disappeared.

## What to measure for speculative decoding

```text
proposal method + exact configuration
num speculative tokens k
num speculative steps
num draft tokens
num accepted draft tokens
mean acceptance length
acceptance distribution by request/output position
draft time
verification time
correction/rewind overhead
extra KV/memory footprint
TTFT / TPOT / ITL
requests/s + tokens/s + SLO goodput
```

Also separate cold start from warm execution and record whether the proposer shares a device, occupies another GPU, or crosses an interconnect.

## Reproducible benchmark contract

Two configurations isolate an optimization only when the experiment fixes or reports:

- target model and exact revision;
- tokenizer;
- proposer/draft and revision, when present;
- acceptance/verification method;
- runtime and commit/version;
- hardware, driver, and CUDA;
- quantization and KV dtype;
- TP/PP/DP/EP/CP;
- scheduler and batching;
- prefix-cache block size/hash/salt/retention;
- `(L_in,L_out)` and actual degree of prefix sharing;
- request rate/concurrency;
- sampling parameters;
- warmup;
- enough repetitions;
- median, percentiles, and distribution/variance;
- quality/output under the same harness when the algorithm does not guarantee exact equivalence.

If an experiment changes model, hardware, runtime, and workload at once, it compares two complete stacks. It does not isolate the causal effect of speculative decoding or prefix caching.

## Deterministic evals before performance numbers

Some invariants should pass before discussing milliseconds.

### Prefix reuse

```text
same logical prefix + same cache identity → reusable state may match
changed identity component → no unsafe reuse
reused KV corresponds to exactly the matched token prefix
evicted block cannot be treated as resident
salt/trust domain prevents forbidden cross-tenant reuse
```

### Speculative decoding

```text
accepted tokens obey the selected verification/acceptance contract
rejected speculative state is not committed
KV/state after commit equals the accepted sequence
fallback without speculation remains available
reported acceptance counters reconcile with emitted tokens
```

### End to end

```text
request cancellation frees speculative/cache state
OOM/preemption cannot silently corrupt reusable state
retry does not reuse state from an incompatible model/config
observability attributes latency to queue/prefill/draft/verify/decode
```

## Production: optimize avoided work, not feature count

Prefix caching and speculative decoding are useful through different mechanisms:

\[
\text{reuse}
\rightarrow
\text{verified prior state}
\rightarrow
\text{less repeated prefill}
\]

\[
\text{speculation}
\rightarrow
\text{cheap candidates}
\rightarrow
\text{target verification}
\rightarrow
\text{possibly more committed tokens per useful step}
\]

The first needs **repetition + correct identity + cache capacity**. The second needs **sufficiently cheap proposals + enough acceptance + efficient verification**. Both must coexist with memory, scheduling, batching, and SLOs.

The correct decision is not to enable the newest technique. It is to demonstrate on the real workload what work disappears, what extra work appears, and what happens to **latency, goodput, memory, and correctness** together.

The next chapter turns these mechanisms into an economic problem: **utilization, cost per token, cost per request, and capacity planning**.

## References

[^vllm-apc]: vLLM, **Automatic Prefix Caching**. KV-cache reuse when new queries share a prefix. https://docs.vllm.ai/en/latest/features/automatic_prefix_caching/

[^vllm-apc-design]: vLLM, **Automatic Prefix Caching — design**. Block hashing, parent hashes, extra data, eviction, and cache isolation/salting. https://docs.vllm.ai/en/latest/design/prefix_caching/

[^vllm-security]: vLLM, **Security — Prefix Cache Timing Side-Channel Mitigation**. Timing-side-channel risk and `cache_salt`. https://docs.vllm.ai/en/latest/usage/security/

[^trt-kv]: NVIDIA TensorRT-LLM, **KV Cache System**. Block reuse, search, prioritized eviction, salting/offload, and partial reuse. https://nvidia.github.io/TensorRT-LLM/features/kvcache.html

[^trt-spec]: NVIDIA TensorRT-LLM, **Speculative Decoding**. Draft preparation, scheduler/KV accounting, verification, and KV-cache rewind. https://nvidia.github.io/TensorRT-LLM/1.2.0rc8/features/speculative-decoding.html

[^vllm-draft]: vLLM, **Draft Models**. Draft-model speculative decoding and current configuration surface. https://docs.vllm.ai/en/latest/features/speculative_decoding/draft_model/

[^vllm-ngram]: vLLM, **N-Gram Speculation**. N-gram proposals without a second generative model. https://docs.vllm.ai/en/latest/features/speculative_decoding/n_gram/

[^vllm-mtp]: vLLM, **MTP (Multi-Token Prediction)**. Speculative decoding with native MTP support in compatible model families. https://docs.vllm.ai/en/latest/features/speculative_decoding/mtp/

[^vllm-acceptance]: vLLM, **Per-Request Acceptance Metrics**. `mean_acceptance_length`, `draft_acceptance_rate`, and per-request counters. https://docs.vllm.ai/en/latest/features/speculative_decoding/acceptance_metrics/

[^leviathan]: Leviathan, Kalman & Matias, **Fast Inference from Transformers via Speculative Decoding**, 2022/2023. https://arxiv.org/abs/2211.17192

[^chen]: Chen et al., **Accelerating Large Language Model Decoding with Speculative Sampling**, 2023. https://arxiv.org/abs/2302.01318
