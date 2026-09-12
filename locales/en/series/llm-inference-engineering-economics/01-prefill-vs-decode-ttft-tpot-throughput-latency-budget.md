---
title: "Prefill vs decode: TTFT, TPOT, throughput, and the latency budget"
description: "How to separate prefill from decode in LLM inference, measure TTFT and TPOT without mixing boundaries, understand the throughput trade-off, and build a production latency budget."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM inference, prefill, decode, TTFT, TPOT, ITL, throughput, latency, KV cache, serving"
tags:
  - AI
  - LLMs
  - Inference
  - Serving
  - Performance
---

# Chapter 1 — Prefill vs decode: TTFT, TPOT, throughput, and the latency budget

A generation request does not have one indivisible “model latency.” It has at least two inference phases that do different work, plus several kinds of waiting around them in production.

When a user sends a long prompt and waits for a streamed answer, two questions matter separately:

1. **How long until the first output appears?** That experience is commonly summarized by **TTFT, time to first token**.
2. **Once output starts, how quickly does it continue?** That experience is commonly described by **TPOT, time per output token**, or **ITL, inter-token latency**, depending on the benchmark harness definition.

Those questions map approximately onto two runtime phases:

- **prefill** consumes the input prompt, computes its representations, and builds the attention state required to continue, including the KV cache;
- **decode** generates the continuation autoregressively, reusing prior state and appending new state token by token.

“Approximately” matters. Client-measured TTFT usually includes networking, queueing, scheduling, prompt processing, first-token generation, and delivery of the first response. **TTFT is therefore not synonymous with prefill kernel time.** Likewise, client-measured TPOT describes the observed cadence after the first token; by itself it does not isolate one decode kernel.[^nvidia-aiperf]

{{ include_html("snippets/articulos-tecnicos/inference-prefill-decode-latency-budget.html") }}

## The request changes shape after prefill

Consider a request with `L_in` input tokens and `L_out` generated tokens.

During **prefill**, the model processes the `L_in` prompt tokens to produce the state needed for generation. In an autoregressive transformer, a central part of that state is the **KV cache**: the attention keys and values for tokens that have already been processed and can be reused later.

Then **decode** begins. Each generation step conceptually adds one new token to the sequence and extends reusable state. The model does not need to recompute the whole history from scratch at every step. It reads accumulated state and computes the next token.

A useful abstraction is:

\[
\text{prompt}_{1:L_{in}}
\xrightarrow{\text{prefill}}
(KV_{1:L_{in}}, y_1)
\xrightarrow{\text{decode}}
(KV_{1:L_{in}+1}, y_2)
\xrightarrow{\text{decode}}
\cdots
\]

This is not a wire format or an exact description of every architecture. It marks a workload boundary: **the input context is consumed before iterative generation can continue over reusable state**.

NVIDIA describes TTFT around this transition: the input sequence is processed to build the KV cache before the iterative generation loop can proceed.[^nvidia-nim-metrics] Sarathi-Serve uses the same operational split between prefill and decode and studies how scheduling across the two phases affects both throughput and latency.[^sarathi]

## TTFT is a client-visible boundary, not one operation

A production path to first output can be decomposed as:

\[
T_{TTFT}
=
T_{ingress}
+T_{queue}
+T_{prefill}
+T_{first\ token}
+T_{delivery}
\]

This is a **system latency budget**, not an identity that every provider exposes with the same component names.

- `T_ingress`: network, gateway, authentication, and parsing before the inference scheduler.
- `T_queue`: time waiting for capacity, batching, or a scheduler decision.
- `T_prefill`: server-side prompt-processing work.
- `T_first token`: work needed to materialize the first output after prefill state exists.
- `T_delivery`: serialization and transport until the first response reaches the measurement point.

NVIDIA AIPerf currently measures TTFT from client request submission to the first non-empty response chunk and explicitly includes network latency, queueing, prompt processing, and first-output generation.[^nvidia-aiperf] vLLM `bench serve` also measures at the benchmark client, from request send to the first streamed output received.[^vllm-bench]

A lower TTFT therefore **does not by itself prove that the prefill kernel became faster**. It can come from a shorter queue, prefix caching, a shorter prompt, a different network path, different batching, or another change anywhere inside the measured interval.

## Define TPOT and ITL before comparing them

After the first token, a common metric is the average amortized time per generated output token.

vLLM defines per-request TPOT while excluding the first token:

\[
TPOT
=
\frac{T_{e2e}-TTFT}{L_{out}-1}
\]

for `L_out > 1`.[^vllm-bench]

NVIDIA AIPerf uses the same algebraic form for its average ITL derived from end-to-end latency and also excludes the first token.[^nvidia-aiperf]

The names are not universal, however. vLLM distinguishes:

- **ITL** as the observed gaps between consecutive streamed outputs;
- **TPOT** as decode duration amortized over every output token except the first.

With standard decoding and one token per streamed event, the values are often close. With speculative decoding, chunked streaming, or other strategies, one streamed event may contain several tokens, so ITL and TPOT no longer mean the same thing.[^vllm-bench]

The safe comparison rule is:

> **Compare measurement points and formulas before metric names.**

A number labeled `TPOT = 20 ms` is not automatically comparable with another `TPOT = 18 ms` if one starts at the server, the other at the client, one includes the first token, or one operates on streamed chunks instead of tokens.

## Total latency combines initial waiting and generation

For a streamed response, when TPOT uses the definition above, a useful approximation is:

\[
T_{e2e}
\approx
TTFT + (L_{out}-1)\cdot TPOT
\]

Which term dominates depends on request shape.

- A very long prompt with a short answer can be TTFT-dominated.
- A short prompt followed by thousands of generated tokens can be decode-dominated.
- Under high concurrency, queueing and scheduling policy can dominate both.

### Purely illustrative arithmetic

Suppose, **without attributing these numbers to any model or hardware**, a request has:

```text
TTFT       = 450 ms
L_out      = 120 tokens
TPOT       = 25 ms/token
```

Then:

\[
T_{e2e}
\approx
0.450 + (120-1)\cdot0.025
=3.425\text{ s}
\]

This simple calculation makes two points. First, cutting TTFT by 100 ms is not equivalent to cutting TPOT by 1 ms/token when responses are long. Second, latency comparisons are hard to interpret when the benchmark does not control or report input and output length distributions.

## Input length and output length stress different parts of the path

Request shape `(L_in, L_out)` is a first-order variable.

Increasing `L_in` adds work before first output and increases the state that must be constructed or reused. NVIDIA explicitly notes that longer prompts tend to increase TTFT because the input sequence participates in creating the KV cache before iterative generation.[^nvidia-nim-metrics]

Increasing `L_out` adds decode steps and grows per-sequence state as generation proceeds. Under the approximation above, every output token after the first adds another TPOT term.

Equal sequence lengths do not guarantee equal latency. Other material variables include:

- model and architecture;
- dtype and quantization;
- accelerator type and interconnect topology;
- kernels;
- parallelism strategy;
- effective batch size;
- concurrency and request rate;
- KV-cache state and policy;
- prefix caching;
- scheduler behavior;
- sampling and speculative decoding;
- serving protocol and network path.

This is why `tokens/s` without a workload description is incomplete evidence.

## “Prefill is compute-bound and decode is memory-bound” is a heuristic, not a law

A common shorthand is that prefill exposes more parallel work over the prompt while decode has much lower-granularity new work per sequence on each iteration.

Sarathi-Serve describes prefill as highly parallel prompt processing and decode as low-granularity iterations, then exploits that asymmetry with chunked prefills and stall-free scheduling.[^sarathi] DistServe also treats the phases as distinct enough to warrant separate resource allocation and shows that colocating them can cause interference.[^distserve]

But that does **not** justify classifying every deployment with a fixed hardware slogan. The operating regime changes with:

- batch size;
- context length;
- model architecture;
- attention implementation and kernels;
- precision;
- speculative decoding;
- parallelism;
- accelerator and memory bandwidth.

The production-safe statement is not “decode is always memory-bound.” It is **“prefill and decode have sufficiently different workload profiles that they should be measured and budgeted separately.”**

## Throughput is not latency, and optimizing one can hurt the other

**Throughput** measures work completed per unit time across a population of requests. It may be expressed as requests/s, output tokens/s, total tokens/s, or another explicitly defined unit.

A server can improve throughput by batching work from several requests. Better batching can improve accelerator utilization, but larger batches or more aggressive admission can also increase waiting or interference between prefill and decode.

PagedAttention approaches the problem from the memory side: per-request KV cache is large and changes dynamically, and inefficient memory management wastes capacity that could otherwise support larger effective batches.[^pagedattention] Chapter 4.2 will cover KV-cache memory, PagedAttention, and continuous batching directly.

Sarathi-Serve studies the throughput-latency trade-off explicitly and splits long prefills into chunks so that new requests can be admitted without blocking ongoing decode work for as long.[^sarathi]

The practical consequence is that the configuration with the highest tokens/s is not necessarily the configuration with the best tail TTFT or TPOT.

## Goodput asks a better question when SLOs matter

Suppose a product requires both:

```text
p99 TTFT < limit_A
p99 TPOT < limit_B
```

The useful question is no longer just “how many requests per second can the server accept?”

DistServe formalizes **goodput** as the maximum serving rate subject to application-defined latency constraints.[^distserve] Current serving tools expose operational forms of the same idea. vLLM can report goodput against TTFT, TPOT, or end-to-end objectives.[^vllm-bench]

That changes the optimization problem:

\[
\max \; throughput
\]

is not necessarily equivalent to:

\[
\max \; goodput
\quad\text{subject to}\quad
TTFT \le S_{TTFT},\; TPOT \le S_{TPOT}
\]

For an interactive product, the second objective is often closer to what users actually experience.

## Three workloads, three different latency budgets

### 1. Interactive chat

A human is waiting for an immediate reaction and then reading while output streams.

Typical priorities are:

- low, stable TTFT;
- TPOT or ITL fast enough for smooth streaming;
- p95 and p99, not only means;
- goodput under product SLOs.

Maximizing output tokens/s while allowing large queues can be the wrong optimization.

### 2. Batch summarization of long documents

No user is waiting for every first token, and the system can process many documents asynchronously.

The important objectives may shift toward:

- aggregate throughput;
- cost per million tokens or per completed task;
- utilization;
- stability on long inputs;
- total batch makespan.

TTFT remains measurable, but it may no longer be the primary objective.

### 3. Long interactive generation

A user asks for code, a report, or a long agentic trajectory.

TTFT matters at the beginning, but decode occupies a growing share of total latency. TPOT, token-to-token jitter, and stop conditions can dominate perceived responsiveness and total cost.

The lesson is not to choose one favorite metric. It is to **make the workload utility function explicit**.

## The scheduler connects TTFT, TPOT, and throughput

In production, multiple requests compete for one runtime.

A long prefill may arrive while other sequences are decoding. If the scheduler executes that prefill as a large uninterrupted unit, subsequent decode steps for existing requests can be delayed. If it fragments prefill too aggressively, additional overhead can reduce efficiency.

Sarathi-Serve makes this tension explicit with chunked prefills: smaller chunks can reduce how long decode work is stalled, while chunk size also changes serving efficiency.[^sarathi]

DistServe explores a different architecture by assigning prefill and decode to different GPUs to avoid part of the interference. That introduces a new boundary, including transferring the state needed between phases, and requires a resource plan and network topology that make the split worthwhile.[^distserve]

Neither strategy is a universal winner. Both show that **scheduler policy and serving topology belong inside the latency budget**.

## A useful latency budget preserves measurement boundaries

One end-to-end number is not enough to debug a serving system.

At minimum, useful per-request instrumentation includes:

```text
request_id
input_tokens
output_tokens
request_arrival_ts
queue_enter_ts
prefill_start_ts
prefill_end_ts
first_output_received_ts
decode_end_ts
request_complete_ts
```

If client and server clocks differ, do not subtract timestamps across machines without synchronization or a trace model that defines span relationships correctly. A robust design keeps two views:

```text
CLIENT
request_sent ─────────────── first_output ─────────── final_output
       |<------ TTFT ------>|<----- generation ----->|

SERVER
queue → prefill → first-token boundary → decode steps → complete
```

The client view answers “what did the consumer experience?” The server view answers “where did the system we control spend time?”

They are not interchangeable.

## Benchmark without erasing the experiment

A useful serving benchmark should fix or record at least:

- exact model and revision;
- engine/runtime and version;
- hardware, accelerator count, and topology;
- dtype or quantization;
- tensor, pipeline, or data parallelism where applicable;
- input and output lengths or their distributions;
- concurrency, request rate, and arrival pattern;
- batching and scheduling policy;
- prefix/KV-cache state;
- sampling and speculative decoding settings;
- streaming protocol and measurement point;
- exact formulas for TTFT, TPOT/ITL, end-to-end latency, and throughput;
- warmup, duration, and repetition count;
- relevant means and percentiles.

vLLM currently warns that latency terminology is not standardized across benchmark tools and recommends comparing measurement points and formulas rather than names alone.[^vllm-bench] NVIDIA gives the same warning in its current metrics documentation.[^nvidia-nim-metrics]

This article therefore **does not publish a runtime ranking**. A controlled comparison would require the same hardware, model weights, precision, prompts, output lengths, cache state, arrival process, scheduler policy, network path, and benchmark harness, with enough repetitions to report distributions and variance.

## What to measure first when inference feels slow

A practical diagnosis sequence is:

1. **Separate TTFT from decode.** If users wait too long before any output appears, do not start by optimizing decode kernels.
2. **Separate queueing from prefill.** TTFT that is low at single-request load and high under concurrency often points to capacity or scheduling before isolated prompt compute.
3. **Inspect `(L_in, L_out)`.** Without sequence shape, you do not know which phase the workload is stressing.
4. **Inspect percentiles, not only means.** An interactive service can have an excellent average and unacceptable p99.
5. **Inspect goodput under SLO.** Increasing batch size until tokens/s peaks can reduce the amount of work that actually satisfies the latency contract.
6. **Only then assign cause.** Server-side metrics or traces are needed before claiming the bottleneck is prefill, decode, KV movement, networking, or scheduling.

## Production implication: latency is a phase-level contract

The recurring mistake is to treat inference as one box with one performance number.

A more useful production specification looks like this:

```text
workload:
  input_tokens: known distribution
  output_tokens: known distribution
  arrival_pattern: measured

latency_slo:
  TTFT_p95: explicit target
  TPOT_p95: explicit target
  e2e_p95: target when the product needs it

capacity:
  goodput: requests/s satisfying every SLO

observability:
  client spans: request → first output → final output
  server spans: queue → prefill → decode → complete
```

Once those boundaries are explicit, the next questions become concrete: is KV-cache memory limiting batching? Does continuous batching help throughput while increasing jitter? Is chunked prefill useful? Should prefill and decode share accelerators? Does quantization save enough memory without unacceptable quality loss? Does prefix caching remove real work, or only move where it is paid?

Those are the questions for the rest of this series.

The core point of this chapter is simpler:

> **Prefill determines much of the work required before output can begin. Decode determines the cadence of continuing. The scheduler connects both phases to total capacity. TTFT, TPOT, and throughput are only meaningful when we know exactly where they were measured and which workload produced them.**

## References

[^nvidia-aiperf]: NVIDIA, **AIPerf Metrics Reference**. Client-observed definitions for TTFT, decode duration, and ITL. https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference

[^nvidia-nim-metrics]: NVIDIA, **NIM LLM Benchmarking — Metrics**. Definitions for TTFT, end-to-end latency, and ITL/TPOT, including the caveat that tools can differ. https://docs.nvidia.com/nim/benchmarking/llm/latest/metrics.html

[^vllm-bench]: vLLM, **Benchmark CLI — Understanding the Latency Metrics**. TTFT, ITL, TPOT, and the warning that metric terminology is not standardized. https://docs.vllm.ai/en/latest/benchmarking/cli/

[^distserve]: Zhong et al., **DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving**, 2024. https://arxiv.org/abs/2401.09670

[^sarathi]: Agrawal et al., **Taming Throughput-Latency Tradeoff in LLM Inference with Sarathi-Serve**, 2024. https://arxiv.org/abs/2403.02310

[^pagedattention]: Kwon et al., **Efficient Memory Management for Large Language Model Serving with PagedAttention**, 2023. https://arxiv.org/abs/2309.06180
