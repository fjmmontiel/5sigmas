---
title: "KV cache, memory hierarchy, continuous batching, and PagedAttention"
description: "How KV cache turns memory into a serving-capacity limit, how PagedAttention separates logical from physical blocks, and how continuous batching consumes that capacity request by request."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "KV cache, PagedAttention, continuous batching, LLM serving, GPU memory, memory hierarchy, inference"
tags:
  - AI
  - LLMs
  - Inference
  - Serving
  - Memory
---

# Chapter 2 — KV cache, memory hierarchy, continuous batching, and PagedAttention

The previous chapter separated **prefill**, **decode**, and the scheduler. A constraint now ties all three together: **every active sequence needs reusable state, and that state occupies memory while the request remains live**.

Two servers running the same model on the same number of GPUs can therefore sustain very different amounts of concurrent work depending on:

- how many live tokens they keep in KV cache.
- the model’s attention architecture.
- the cache dtype.
- how the runtime allocates blocks.
- when those blocks are released or reused.
- the policy used to admit, pause, or evict requests.
- whether state is moved to a slower memory tier.

The production question is not simply “does the model fit?” It is:

> **How much attention state can remain available to active sequences before memory becomes the scheduler’s limiting resource?**

{{ include_html("snippets/articulos-tecnicos/inference-kv-cache-paging-batching.html") }}

## What the KV cache actually stores

In causal attention, once the model has processed a token, that token’s **K** and **V** projections do not need to be recomputed from scratch at every later decoding step. The runtime can retain and reuse them.

For one attention layer, the next step can be represented as:

\[
\operatorname{Attn}(q_t, [K_{1:t-1}, k_t], [V_{1:t-1}, v_t])
\]

`K_{1:t-1}` and `V_{1:t-1}` are the reused state. Hugging Face documents the same structure: caches are updated per layer, combining new key/value tensors with prior state during generation.[^hf-cache]

This memory buys computation. It avoids projecting K/V for every previous token again on each step. The memory is not free, however. As long as the sequence needs those tokens, their state must remain available to attention.

## A useful memory formula — with explicit limits

For an autoregressive full-attention transformer where each cacheable layer stores K and V in the standard layout, an estimate for **one sequence** is:

\[
M_{KV}(T)
=
T\cdot L\cdot2\cdot H_{KV}\cdot d_h\cdot b
\]

where:

- `T` is the number of tokens whose state remains cached.
- `L` is the number of layers storing KV.
- `2` accounts for K and V.
- `H_KV` is the number of key/value heads.
- `d_h` is the dimension per head.
- `b` is bytes per cached element.

For several live sequences, the first approximation sums their cached tokens:

\[
M_{KV,live}\approx\sum_i M_{KV}(T_i)
\]

This formula is **not universal**. MQA/GQA, sliding-window attention, chunked attention, MLA, recurrent layers, cross-layer KV sharing, cache quantization, and prefix reuse all change the geometry. Current vLLM documentation has a hybrid cache manager precisely because modern models can require different cache shapes across layer groups.[^vllm-hybrid]

### Illustrative arithmetic, not a benchmark

Assume a fictional architecture with:

```text
L        = 32 layers
H_KV     = 8 KV heads
d_h      = 128
cache    = BF16 = 2 bytes/element
```

Then:

\[
M_{KV/token}
=32\cdot2\cdot8\cdot128\cdot2
=131072\text{ bytes}
=128\text{ KiB/token}
\]

One sequence with `8192` cached tokens would require:

\[
8192\cdot128\text{ KiB}=1\text{ GiB}
\]

for that KV cache alone under these assumptions.

Keep everything else unchanged but set `H_KV=32`, and the result becomes `512 KiB/token`, or `4 GiB` for `8192` tokens. This illustrates why **GQA/MQA can materially change state cost**: they reduce the number of K/V heads relative to MHA.

These values exclude model weights, runtime activations and workspaces, allocator metadata, fragmentation, padding, graph capture, and operational headroom. They are not a claim about total VRAM requirements.

## The VRAM available to KV is not the GPU’s total VRAM

A more useful budget separates:

\[
M_{GPU}
=
M_{weights}
+M_{runtime}
+M_{KV}
+M_{headroom}
\]

`M_runtime` includes temporary buffers, workspaces, kernels, graph captures, and other engine state. `M_headroom` keeps the system from operating exactly at the memory limit.

Serving capacity depends on **how much of the budget is truly available for active KV tokens**. TensorRT-LLM makes this boundary explicit: its cache manager can reserve a configurable fraction of free GPU memory for KV cache and can additionally cap the cache by token count.[^trt-kv]

An “80 GB GPU” therefore does not mean “80 GB for context.” The rest of the system must be subtracted first.

## Why maximum contiguous reservation wastes capacity

Imagine three requests with very different realized lengths:

```text
A: maximum 8k, finishes at 1.2k
B: maximum 8k, finishes at 7.6k
C: maximum 8k, finishes at 2.0k
```

If the runtime had to reserve an `8k` contiguous tensor for every request up front, much of A and C’s reservation would contain no useful state while those requests remain short.

TensorRT-LLM’s documentation describes this problem directly for contiguous KV cache: a tensor dimensioned to the maximum sequence length can consume much more memory than needed when real sequences are shorter.[^trt-attention]

That waste lowers the number of requests the scheduler can keep active even when the accelerator still has compute capacity.

## PagedAttention separates logical space from physical space

PagedAttention borrows a systems idea from virtual memory: **a sequence can see consecutive logical KV blocks without requiring those blocks to occupy consecutive physical memory**.

Conceptually:

```text
Request A, logical blocks:   A0 → A1 → A2
                              │    │    │
block table                   ▼    ▼    ▼
physical VRAM:               P7   P2   P11
```

When A needs more state, the cache manager can assign another free block. When A finishes, its physical blocks return to the pool and can be reassigned.

The original PagedAttention paper identifies fragmentation and KV over-reservation as limits on batching and proposes block-based memory management inspired by virtual memory.[^pagedattention] TensorRT-LLM today uses the same class of abstraction: a pool of KV blocks assigned to requests as needed by a cache manager.[^trt-kv]

### Paging does not eliminate every form of waste

A common oversimplification is **paged = perfect utilization**.

The final partially filled block of a sequence can still contain unused space. Current runtimes also support heterogeneous architectures that must reconcile page sizes across different layer groups. vLLM’s current hybrid KV cache manager documents padding and grouping trade-offs for full attention, sliding-window attention, Mamba state, and KV sharing.[^vllm-hybrid]

Paged allocation removes an important class of rigid reservation. It does not remove every allocator or architecture overhead.

## PagedAttention and continuous batching solve different problems

They often appear together in modern serving engines, which makes them easy to conflate.

- **PagedAttention / paged KV cache** asks: *How do we allocate and recycle KV memory without maximum contiguous reservations per request?*
- **Continuous batching / iteration-level scheduling** asks: *When does each request enter and leave the active batch?*

One does not automatically imply the other.

ORCA formalized **iteration-level scheduling**: the scheduler can reconsider the active request set after each generation iteration instead of waiting for a fixed batch to complete.[^orca] Current Hugging Face documentation describes continuous batching with the same property: a completed request can leave and a waiting request can occupy the newly available capacity immediately.[^hf-continuous]

TensorRT-LLM calls the mechanism **in-flight batching** and supports interleaving sequences in context processing with sequences already in generation.[^trt-attention]

## The critical relationship is finish → release KV → admit work

Consider three requests:

```text
step n:      [A decode] [B decode]
A finishes → releases its KV blocks
step n+1:    [C prefill] [B decode]
```

With a continuous scheduler, C need not wait for B to finish. But C can enter only if the runtime can allocate the state it will need and the admission policy allows it.

That is where paging and scheduling connect:

1. A finishes or stops needing part of its state.
2. The cache manager returns physical blocks to the pool.
3. The scheduler observes new capacity.
4. C can be admitted on a later eligible iteration.
5. C’s prefill starts populating newly assigned blocks.
6. Decode extends those blocks while C remains active.

The operating unit is no longer a fixed batch. It is a **dynamic population of sequences competing for cache tokens and compute time**.

## Higher utilization can increase preemption

Continuous batching does not mean “always admit one more request.”

If the scheduler over-admits and the KV pool runs out of blocks, the system needs a policy: stop admitting, wait, pause or preempt a sequence, recompute state later, or move state to another tier.

TensorRT-LLM exposes this trade-off explicitly. `MAX_UTILIZATION` packs more work and may need to pause requests if the KV limit is reached. `GUARANTEED_NO_EVICT` is more conservative and guarantees that already started requests are not paused for this capacity reason.[^trt-scheduler]

This reconnects to Chapter 4.1. Maximizing instantaneous occupancy may improve throughput while introducing queueing, preemption, or tail jitter that harms TTFT or TPOT.

## Memory hierarchy adds capacity by adding movement

When VRAM is insufficient, some runtimes can retain reusable blocks in host memory and promote them back to GPU when needed.

vLLM currently documents an `OffloadingConnector` that copies completed KV blocks from GPU to pinned host memory and can use secondary tiers, promoting blocks back to GPU on demand.[^vllm-offload] TensorRT-LLM also supports host offloading before selected blocks are evicted from the GPU cache.[^trt-kv]

The right relationship is:

```text
GPU VRAM  ←→  host / pinned memory  ←→  optional secondary tier
 fastest          more capacity                farther away
```

Offloading **does not turn slower memory into free VRAM**. It adds transfer, coordination, and a policy for which state deserves to remain hot. If misses and promotions are frequent, movement can enter the critical path.

At minimum, measure:

- GPU↔host bytes per unit time.
- block promotion time.
- hit/miss rate per tier.
- evictions and preemptions.
- stalls waiting for state.
- effective capacity gained.

## Sliding windows, GQA, and hybrid caches change the equation

Not every model retains identical state for every token and layer.

### GQA / MQA

They reduce `H_KV` relative to the number of query heads. In the standard formula that directly reduces bytes per token. TensorRT-LLM manages separate pools when head count or attention-window geometry differs.[^trt-kv]

### Sliding-window or chunked attention

A layer may no longer need KV for tokens outside its active window. Hugging Face documents that dynamic cache stops growing for such layers once their sliding or chunked window has reached its maximum size.[^hf-cache-strategies]

### Hybrid architectures

Models that mix attention with recurrent layers, or layers with different state requirements, no longer fit one homogeneous formula. vLLM documents KV groups and padding used to share one physical pool across different layer types.[^vllm-hybrid]

The consequence is simple: **identify the model’s actual state geometry before estimating serving capacity**. `num_attention_heads × context_length` is not enough.

## Prefix reuse is another optimization — do not confuse it with paging

A paged block can also become a unit of reuse when another request shares the same prefix. That can save prefill compute and duplicate memory.

But **prefix caching/reuse is an additional policy**. Paging gives the runtime flexible blocks. It does not guarantee that two requests will share them.

TensorRT-LLM stores completed blocks in a search structure for cross-request reuse and supports a `cache_salt` so reuse can be restricted across domains that should not share cached state.[^trt-kv]

Chapter 4.4 will cover prefix caching and speculative decoding. Here the important boundary is: **allocation, scheduling, and reuse are different mechanisms even when they operate on the same blocks**.

## What the scheduler should expose

`GPU utilization` alone is insufficient to operate a loaded serving system. We need visibility into the state constraining admission.

A useful minimum set is:

```text
kv_capacity_bytes
kv_bytes_used
kv_blocks_total
kv_blocks_free
live_cached_tokens
active_sequences
waiting_sequences
admissions
preemptions
evictions
prefix_cache_hits
host_offload_bytes
host_promotions
batch_size_by_iteration
```

Per request, retain at least:

```text
input_tokens
cached_tokens
allocated_blocks
attention_mode
cache_dtype
queue_time
prefill_time
decode_time
preemptions
```

This separates “GPU busy” from “scheduler cannot admit more work because state does not fit.”

## Concrete case: chat with heterogeneous lengths

Assume the service receives these requests at roughly the same time:

```text
A: 1k prompt + 100 output
B: 8k prompt + 800 output
C: 2k prompt + 50 output
D: 16k prompt + 200 output
```

With rigid batches and maximum per-request reservations, length variance creates both waiting and reserved-but-unused memory.

With paged blocks and continuous scheduling:

1. each request receives blocks as its live state grows.
2. A and C can finish without waiting for B or D.
3. their blocks return to the free pool.
4. the scheduler can admit waiting requests on a later iteration.
5. B and D retain only the state their architectures require.
6. as VRAM approaches capacity, policy decides whether to stop admission, preempt, or move blocks.

This **does not guarantee** that every paged policy beats every alternative on every workload. Results depend on block size, scheduler behavior, kernels, available memory, sequence-length distribution, prefix reuse, offload, and management overhead.

## Benchmark systems without attributing results to the wrong layer

If runtime A sustains more concurrency than runtime B, “PagedAttention is faster” is not enough.

Control or record:

- exact model and revision.
- weight precision and KV-cache precision.
- attention architecture.
- accelerator and usable VRAM.
- max context and real `(L_in, L_out)` distribution.
- request rate and concurrency.
- block/page size.
- continuous-batching policy.
- preemption policy.
- prefix caching on/off.
- offloading on/off and tier sizes.
- chunked prefill settings.
- warmup and enough repetitions.
- TTFT, TPOT, and goodput in addition to raw throughput.

The original PagedAttention paper reports throughput gains under its 2023 models, workloads, and baselines.[^pagedattention] That is evidence for that implementation and experiment, **not a multiplicative constant to carry into 2026 serving engines**.

## Deterministic evals for this layer

Performance benchmarks are necessary, but several invariants can be tested independently of matching hardware.

### Accounting

```text
allocated_blocks >= blocks referenced by live block tables
free_blocks + allocated_blocks = pool_blocks
no two writable logical blocks alias unexpectedly
```

### Lifecycle

```text
request admitted → blocks allocated
request grows    → capacity accounted
request ends     → blocks released or explicitly retained for reuse
request evicted  → ownership/reference state updated atomically
```

### Continuous batching

```text
short request finishes
→ slot/capacity becomes reusable
→ waiting request may enter next eligible iteration
→ long request continues without a batch-wide barrier
```

### Tiering

```text
offload(block)
→ GPU ownership released only after safe transfer state
promote(block)
→ attention cannot consume stale/incomplete bytes
```

These tests do not replace benchmarks. They verify mechanism invariants before measuring performance.

## Production implication: capacity is live state, not only FLOPs

A useful serving mental model is:

\[
\text{effective capacity}
=
f(\text{compute},\text{KV bytes/token},\text{live tokens},\text{allocator},\text{scheduler},\text{SLOs})
\]

One GPU can become KV-memory-bound before exhausting arithmetic throughput. Another can have free memory but a scheduler that fails to exploit it. A third can admit more sequences through offload and pay for that choice in transfers.

PagedAttention creates a crucial separation between **per-sequence logical space and physical blocks**. Continuous batching creates another between **the lifetime of a request and the lifetime of a batch**. Memory hierarchy adds a third between **hot state and slower capacity**.

Together they make serving more flexible. Each mechanism still introduces a separate policy that must be measured independently.

The next chapter changes axis to **quantization and parallelism**. We will separate weight, activation, and KV representations and show why saving memory does not automatically preserve quality or latency.

## References

[^hf-cache]: Hugging Face Transformers, **How caching works**. Per-layer K/V state and incremental updates during generation. https://huggingface.co/docs/transformers/main/cache_explanation

[^hf-cache-strategies]: Hugging Face Transformers, **Cache strategies**. Dynamic/static/offloaded/quantized caches and sliding/chunked-attention behavior. https://huggingface.co/docs/transformers/main/kv_cache

[^hf-continuous]: Hugging Face Transformers, **Continuous batching architecture**. Per-step rescheduling and request lifecycle. https://huggingface.co/docs/transformers/main/continuous_batching_architecture

[^pagedattention]: Kwon et al., **Efficient Memory Management for Large Language Model Serving with PagedAttention**, 2023. https://arxiv.org/abs/2309.06180

[^orca]: Yu et al., **Orca: A Distributed Serving System for Transformer-Based Generative Models**, OSDI 2022. https://www.usenix.org/conference/osdi22/presentation/yu

[^trt-kv]: NVIDIA TensorRT-LLM, **KV Cache System**. Block pools, reuse, attention windows, GPU allocation, and host offloading. https://nvidia.github.io/TensorRT-LLM/features/kvcache.html

[^trt-attention]: NVIDIA TensorRT-LLM, **Attention — In-flight batching and paged KV cache**. https://nvidia.github.io/TensorRT-LLM/features/attention.html

[^trt-scheduler]: NVIDIA TensorRT-LLM, **Useful Runtime Options — Capacity Scheduler Policy**. `MAX_UTILIZATION` versus `GUARANTEED_NO_EVICT`. https://nvidia.github.io/TensorRT-LLM/latest/legacy/performance/performance-tuning-guide/useful-runtime-flags.html

[^vllm-hybrid]: vLLM, **Hybrid KV Cache Manager**. Page geometry and allocation across heterogeneous attention/state layers. https://docs.vllm.ai/en/latest/design/hybrid_kv_cache_manager/

[^vllm-offload]: vLLM, **KV Offloading Usage Guide**. GPU→CPU/secondary-tier offloading and promotion semantics. https://docs.vllm.ai/en/latest/features/kv_offloading_usage/