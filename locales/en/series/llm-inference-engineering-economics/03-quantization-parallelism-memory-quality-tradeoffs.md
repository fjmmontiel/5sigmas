---
title: "Quantization, parallelism, and memory/performance/quality trade-offs"
description: "What actually changes when weights, activations, or KV cache are quantized, and how TP, PP, DP, EP, and CP alter placement, communication, per-rank memory, and failure domains."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM quantization, tensor parallelism, pipeline parallelism, expert parallelism, context parallelism, FP8, INT4, AWQ, GPTQ"
tags:
  - AI
  - LLMs
  - Inference
  - Serving
  - GPUs
---

# Chapter 3 — Quantization, parallelism, and memory/performance/quality trade-offs

The previous two chapters separated **prefill from decode** and then made the **KV-cache budget** explicit. Two more levers are routinely compressed into phrases that hide most of the engineering decision:

- “quantize the model”
- “put it on more GPUs”

Neither describes a complete configuration.

A checkpoint may use 4-bit weights while keeping 16-bit activations. Its KV cache may remain in BF16 or use FP8 with an entirely separate scale policy. A runtime may dequantize weights before a compute path, or execute a kernel that consumes the quantized representation directly. Two deployments that both say `TP=4` may communicate over NVLink/NVSwitch in one case and cross nodes over a much slower network in the other.

The useful question is not “how many bits?” or “how many GPUs?”. It is:

> **Which tensors are smaller, which operations can the hardware execute efficiently with that representation, which state is replicated or sharded, and what communication is now on the critical path?**

{{ include_html("snippets/articulos-tecnicos/inference-quantization-parallelism-tradeoffs.html") }}

## Quantization does not mean that the whole model has one precision

Common notation already carries important scope information.

```text
W4A16  → 4-bit weights, 16-bit activations
W8A8   → 8-bit weights, 8-bit activations
FP8 KV → FP8 KV cache; it does not imply FP8 weights
```

TensorRT-LLM currently exposes separate recipes for FP4, FP8, W4A16/W4A8 with AWQ or GPTQ, and independent KV-cache quantization.[^trt-quant] vLLM likewise treats weight/activation quantization and KV-cache quantization as separate surfaces.[^vllm-quant][^vllm-kv]

A phrase such as “INT4 model” is therefore not enough to reproduce a result. At minimum, record:

- which modules and tensors are quantized
- weight dtype
- activation dtype
- KV-cache dtype
- scale granularity
- calibration method and calibration data, when used
- modules retained at higher precision
- packing and layout format
- kernels actually selected by the runtime
- hardware and runtime version

## The basic operation introduces representation error

For a simple symmetric quantizer, we can write:

\[
q = \operatorname{clip}\left(\operatorname{round}\left(\frac{x}{s}\right),q_{min},q_{max}\right)
\]

\[
\hat{x}=s\,q
\]

with error:

\[
\varepsilon=x-\hat{x}
\]

`q` belongs to a discrete set and `s` is a scale. Asymmetric schemes also introduce a zero point. Real implementations must additionally make choices about clipping, rounding, grouping, outliers, packing, and accumulator types.

The granularity of `s` changes the trade-off. A global scale has little metadata but has to cover a more heterogeneous distribution. Per-channel, per-group, per-token, or per-block scales can adapt locally, but require more metadata and potentially more work.

TensorRT-LLM explicitly distinguishes per-channel, per-token, and per-group modes, among others.[^trt-mode] vLLM's current KV-cache documentation separates per-tensor and per-attention-head scaling and recommends dataset-based calibration for its higher-accuracy pathway.[^vllm-kv]

## Weight-only and weight-plus-activation quantization target different bottlenecks

### Weight-only

With `W4A16`, for example, weights are stored at lower precision while activations remain at higher precision.

This clearly reduces the **weight payload**. It can be especially useful when moving weights dominates execution, but latency depends on whether an efficient kernel exists for that representation and on any dequantization/packing cost.

GPTQ is a weight-only post-training quantization method based on approximate second-order information.[^gptq] AWQ is also weight-only, but uses activation statistics to identify and protect salient channels through scaling.[^awq]

The speed numbers reported in those papers belong to their models, kernels, GPUs, and baselines. They are not portable multipliers for arbitrary 2026 deployments.

### Weight + activation

In `W8A8`, both weights **and** activations use lower precision on eligible operations. That can reduce traffic and unlock lower-precision instructions, but now a second distribution has to be represented accurately. Activations may contain outliers that are substantially harder to quantize.

SmoothQuant targets that problem by moving some of the activation-quantization difficulty into the weights through an offline, mathematically equivalent transformation, enabling W8A8 in the paper's experiments.[^smoothquant]

Current vLLM documentation exposes another important boundary: for FP8 W8A8, the runtime selects among several kernels according to GPU and checkpoint, while its online dynamic-quantization path computes activation scales during forward execution. The documentation explicitly notes that latency improvements can be limited in that online mode.[^vllm-fp8]

**A smaller dtype is not a hardware instruction.** The available kernel decides whether the representation is exploited efficiently or whether conversions erase part or all of the expected gain.

## KV cache is a third precision decision

Chapter 4.2 showed that KV-cache memory grows with live tokens. Reducing bytes per element can increase resident tokens or concurrent sequences without touching the weights.

vLLM currently supports FP8 KV cache with per-tensor scales and, on specific backends, per-attention-head scales. It can also leave sensitive layers out of KV quantization.[^vllm-kv]

That changes the quality question. Weight error affects many operations throughout the model. K/V error affects state that attention reuses across the sequence. For long-context serving, a short-task benchmark does not establish that behaviour will remain unchanged at 64k or 128k tokens.

A KV-cache quantization benchmark should therefore report at least:

```text
context-length distribution
attention architecture
KV dtype + scale granularity
calibration dataset/method
layers excluded from quantization
quality/eval suite
TTFT / TPOT / throughput
max live tokens / concurrency
```

## Ideal payload savings are easy to compute; real footprint is not

For `N_w` weights represented with `b_w` bits, the ideal payload is:

\[
M_{payload}=N_w\frac{b_w}{8}
\]

A deployed representation is closer to:

\[
M_{weights,actual}
=
M_{payload}
+M_{scales}
+M_{zero/meta}
+M_{padding/layout}
+M_{unquantized}
\]

The process still needs KV cache, workspaces, temporary activations, allocator state, graph captures, and operating headroom.

### Illustrative example, not a benchmark

Assume exactly `70×10^9` quantizable parameters and temporarily ignore metadata and excluded modules.

At 16 bits:

\[
70\times10^9\cdot2\text{ bytes}=140\text{ GB}=130.4\text{ GiB}
\]

At 4 bits, the ideal payload is:

\[
70\times10^9\cdot0.5\text{ bytes}=35\text{ GB}=32.6\text{ GiB}
\]

That is a reduction in **payload**, not a claim that a real process will consume exactly 35 GB or run four times faster.

If those quantized weights could be perfectly sharded across four tensor-parallel ranks, the mean ideal payload would be:

\[
35\text{ GB}/4=8.75\text{ GB per rank}
\]

Actual per-rank footprint also includes scales, replicated tensors, buffers, KV cache, and any component not sharded that way. **Quantization and parallelism can reduce different terms of the memory budget. They do not turn total VRAM into `payload / bits / GPUs`.**

## Quality does not follow from the scheme name

Two `W4A16` checkpoints can preserve quality very differently because they may differ in:

- quantization method
- groups and scales
- calibration data
- excluded layers
- outlier handling
- model architecture
- evaluation distribution

AWQ, GPTQ, and SmoothQuant provide evidence about specific techniques under specific experiments, not universal guarantees for every checkpoint.[^awq][^gptq][^smoothquant]

A useful quantization release gate compares **the original and quantized model under the same harness**:

```text
same prompts / dataset
same decoding parameters
same max context
same tool/reasoning settings when applicable
same metric implementation
paired outputs when possible
```

The suite should also reflect the production workload. Perplexity can reveal language-model degradation, but it does not replace code, mathematics, structured extraction, tool-use, or long-context evals when those behaviours matter in production.

## Parallelization is a placement decision

When one GPU cannot fit the model or cannot meet the SLO, work can be distributed. But “multi-GPU” does not tell us **which dimension** is distributed.

TensorRT-LLM currently documents tensor, pipeline, data, expert, and context parallelism as distinct inference strategies.[^trt-parallel]

Each changes a different relationship:

| Strategy | What is distributed | What remains coupled for one request | New cost to watch |
|---|---|---|---|
| Data parallel (DP) | requests across replicas | one request can run inside one replica | replicated weights, load balance, per-replica capacity |
| Tensor parallel (TP) | tensors inside a layer | the same request spans all TP ranks | frequent collectives + synchronization |
| Pipeline parallel (PP) | groups of layers | the request traverses stages | activation transfer + bubbles/stage balance |
| Expert parallel (EP) | MoE experts | tokens route to remote experts | dispatch/all-to-all + imbalance |
| Context parallel (CP) | sequence/context dimension | attention must combine state across shards | K/V/attention communication + synchronization |

These definitions describe **the partitioning dimension**. The exact communication pattern still depends on runtime, model, and algorithm.

## Data parallel: scale requests, not one request by magic

In data parallel, multiple replicas can accept different work.

```text
request A → replica 0
request B → replica 1
request C → replica 2
```

If each replica holds the complete model, the obvious cost is replicated weight memory. In exchange, aggregate throughput can grow when demand is sufficient and the load balancer distributes requests effectively.

DP **does not by itself reduce the compute time of an individual request**. That request still runs within a replica unless the runtime combines DP with another parallel dimension.

For serving, DP can also create a different failure boundary than one large TP group. If a replica fails, another replica might accept future work. Resuming a request elsewhere, reconstructing state, and preventing duplicate external effects are still serving-system responsibilities, not automatic properties of “DP”.

## Tensor parallel: less tensor per rank, more intra-layer communication

Tensor parallel shards layer matrices/tensors across GPUs. Every rank computes a part, and the group must combine results.

NCCL defines operations such as AllReduce, AllGather, and ReduceScatter across participating ranks. Ranks have to enter compatible collective calls for the operation to complete correctly.[^nccl]

A useful conceptual latency decomposition is:

\[
T_{layer,TP}
\approx
T_{compute\ local}
+T_{collective}
+T_{sync}
\]

As `TP` grows, `T_compute local` can fall because each rank performs less work. The collective does not disappear. Once the local shard becomes small enough, communication and synchronization can dominate.

That is why `TP=8` across eight GPUs connected by NVLink/NVSwitch and `TP=8` spanning nodes over another network are **not the same experiment**.

vLLM's distributed-serving documentation makes this operationally concrete: multi-node tensor parallelism requires efficient GPU-to-GPU communication and recommends verifying whether NCCL is actually using InfiniBand/GDRDMA rather than sockets.[^vllm-distributed]

## Pipeline parallel: fewer layers per rank, but the request crosses stages

Pipeline parallel places different groups of layers on different ranks:

```text
rank 0: layers 0..n
rank 1: layers n+1..m
rank 2: layers m+1..z
```

An activation leaves one stage and enters the next. This can solve a capacity problem when one GPU cannot hold every layer.

It also introduces two new problems:

1. **balance:** the slowest stage limits the pipeline
2. **bubbles:** without enough overlap, some stages wait idle

During low-concurrency autoregressive decode, where each token adds a sequential dependency, those bubbles can matter. `PP=4` must not be interpreted as dividing request latency by four.

## Expert parallel: only meaningful when the model has experts

In a Mixture-of-Experts model, a router selects a subset of experts for each token. Expert parallel distributes complete experts across ranks rather than slicing every expert across all ranks.

TensorRT-LLM currently distinguishes TP, EP, and hybrid patterns for MoE layers.[^trt-ep]

The new relationship is:

```text
token → router → rank owning selected expert → result → combination
```

That often requires redistributing hidden states. NCCL provides AllToAll, where each rank sends different chunks to destination ranks.[^nccl]

Two risks appear immediately:

- **communication volume**, because token states have to travel to their experts
- **load imbalance**, because routing does not guarantee equal token counts for every expert

EP performance therefore depends on routing distribution and on the runtime's balancing or expert-replication strategy.

## Context parallel: sharding sequence does not automatically shard weights

Context parallel splits the sequence/context dimension across ranks. Attention is the hard part: local queries need K/V information that may reside on other shards.

Megatron Core documentation makes that boundary explicit. CP partitions sequence state, while weights remain duplicated within a CP group, and attention requires additional communication to exchange/gather K/V information.[^megatron-cp]

TensorRT-LLM also exposes CP as an inference strategy for long-context workloads.[^trt-parallel]

CP can therefore relieve sequence-related memory/compute without being equivalent to TP. **CP shards context. TP shards model tensors.**

## Strategies compose, but memory has no universal division formula

A deployment may combine TP + PP + DP. An MoE model can add EP or use a TP/EP hybrid in expert layers. CP can coexist with other dimensions.

Do not write:

```text
memory_per_GPU = total_memory / (TP × PP × DP × EP × CP)
```

as a general rule. It is false.

- DP replicates weights rather than sharding them.
- CP may replicate weights while sharding sequence state.
- EP affects expert layers, not every layer.
- TP may leave small tensors or specific modules replicated.
- PP distributes layers that need not contain equal bytes.
- KV cache can follow another sharding policy.

The correct method is a **per-tensor/state inventory**: for each component, determine whether it is replicated, sharded, or absent on a given rank.

## The interconnect is part of the performance model

A multi-GPU comparison that only says “8×H100” is incomplete.

Record at least:

```text
GPU model + memory
GPUs per node
intra-node fabric (NVLink/NVSwitch/PCIe...)
inter-node NIC + bandwidth
NCCL/version + topology
TP / PP / DP / EP / CP sizes
collective algorithms/settings when material
model + quantization
sequence/batch distribution
```

NCCL is topology-aware and implements collectives within and across nodes, but communication and synchronization still have a cost.[^nccl-overview]

When per-rank compute falls faster than communication time, scaling efficiency collapses. That crossover depends on workload and topology. There is no system-independent “right number of GPUs”.

## Quantization and parallelism interact

The two levers are not independent.

### Quantization can change how much parallelism you need

If lower-precision weights make a model fit without four-way TP, you might instead run one replica per GPU and spend the hardware on DP throughput. That can remove TP collectives from the request's critical path.

### Parallelism can change the value of quantization

If TP already shards weights, quantization can free memory for more KV cache, larger batches, or fewer ranks. But if the deployment is communication-bound, shrinking weight storage does not guarantee that the bottleneck disappears.

### The quantized format may also change communication

Depending on runtime, some communications operate on higher-precision tensors, others on reduced representations, and others require conversions. Measure the actual path. `W4A16` alone does not specify it.

Optimization should therefore start from the observed constraint:

```text
weights do not fit?      → quantization / TP / PP can help in different ways
KV limits concurrency?   → KV quantization / CP / cache policy
memory-bound decode?     → weight-only + suitable kernel may help
compute-bound prefill?   → activation dtype + compute kernel may matter more
TP communication-bound?  → fewer ranks / better fabric / different partition
MoE imbalance?           → EP placement / routing / expert replication
```

These are hypotheses to validate, not universal recipes.

## Failure domains: a distributed request depends on more components

If one request needs four TP ranks at every layer, losing one of those ranks breaks that execution group. The same is true when a required PP stage disappears.

That does not mean “multi-GPU is universally less reliable”. It means the **failure domain of a request** changes with placement.

Define:

- which ranks are required to complete a request
- which state is reconstructible
- whether another compatible replica exists
- how slow or lost ranks are detected
- whether recovery restarts from scratch or from durable state
- how duplicate external effects are prevented

Inference topology belongs in the reliability design, not only in the benchmark report.

## What to measure when choosing a configuration

A useful decision matrix starts with four layers rather than with `bits` or `GPU count`.

### 1. Footprint

```text
weights per rank
scales / quant metadata
KV bytes per live token
runtime/workspace bytes
headroom
replicated vs sharded bytes
```

### 2. Critical path

```text
TTFT
TPOT / ITL
prefill time
decode time
collective time by type
GPU↔GPU / node↔node bytes
kernel time + dequant/quant time
```

### 3. Capacity

```text
requests/s
tokens/s
SLO goodput
max live tokens
preemptions / queue time
GPU utilization
communication utilization
```

### 4. Quality and robustness

```text
task metrics vs original checkpoint
long-context eval if KV is quantized
structured-output/tool success when relevant
numerical drift / NaN / overflow incidents
failure/retry behavior by parallel group
```

## Reproducible benchmark contract

To compare two configurations, fix or report:

- exact checkpoint and revision
- tokenizer
- runtime and commit/version
- full quantization recipe
- calibration dataset and seed, when applicable
- GPU and driver/CUDA
- interconnect/topology
- TP/PP/DP/EP/CP
- scheduler/batching
- KV dtype
- `(L_in,L_out)` and request distribution
- concurrency/request rate
- warmup
- number of repetitions
- medians and percentiles, not only a mean
- quality under the same harness

If hardware, runtime, quantizer, GPU count, and workload all change at once, the result compares **two complete stacks**. It does not isolate the causal effect of INT4 or tensor parallelism.

## Deterministic evals before performance benchmarking

Some invariants can be checked without making any performance claim.

### Quantization

```text
reported weight dtype == loaded weight representation
scale shape matches declared granularity
excluded modules remain in intended dtype
KV dtype matches runtime configuration
quantized checkpoint produces finite outputs
```

### Placement

```text
every required layer/tensor has exactly the intended owner(s)
TP shards reconstruct expected logical tensor shape
PP stage boundaries preserve activation contract
EP expert ownership matches router destination map
CP shards cover the intended sequence domain
```

### Collectives

```text
all participating ranks enter compatible collective calls
message shape/dtype match the algorithm contract
one missing rank cannot silently produce a successful request
```

NCCL warns that incompatible collective participation across ranks can lead to hangs, crashes, or data corruption. That coordination requirement belongs to the distributed system, not to the model.[^nccl]

## Production implication: optimize the constraint, not the technique name

Quantization and parallelism redistribute costs:

\[
\text{representation}
\rightarrow
\text{bytes + error + kernels}
\]

\[
\text{placement}
\rightarrow
\text{per-rank memory + communication + synchronization}
\]

Production needs a configuration that satisfies all of these at once:

\[
\text{fit} \land \text{quality} \land \text{latency SLO} \land \text{goodput} \land \text{reliability}
\]

Lower precision can be the right choice even without a latency win if it makes the model fit or frees KV capacity. More GPUs can be the right choice even without linear scaling if they reduce per-rank memory or make a larger model feasible. Neither decision is justified by “INT4” or “8 GPUs” alone.

The next chapter examines two optimizations that change **reused or avoided work**: **prefix caching** and **speculative decoding**. The question will no longer be only where bytes live or how many ranks execute the model, but how much work can be skipped and how much speculative work is worth verifying.

## References

[^trt-quant]: NVIDIA TensorRT-LLM, **Quantization**. FP4/FP8, W4A16/W4A8 AWQ/GPTQ, and KV-cache quantization recipes. https://nvidia.github.io/TensorRT-LLM/features/quantization.html

[^trt-mode]: NVIDIA TensorRT-LLM, **Quantization mode**. Weight/activation flags, per-channel, per-token, per-group, and KV-cache quantization. https://nvidia.github.io/TensorRT-LLM/_modules/tensorrt_llm/quantization/mode.html

[^vllm-quant]: vLLM, **Quantization**. Supported methods and hardware/format matrix. https://docs.vllm.ai/en/latest/features/quantization/

[^vllm-fp8]: vLLM, **FP8 W8A8**. Hardware support, kernel selection, and dynamic quantization. https://docs.vllm.ai/en/latest/features/quantization/llm_compressor/fp8/

[^vllm-kv]: vLLM, **Quantized KV Cache**. FP8 KV, scale granularity, calibration, and layer exclusion. https://docs.vllm.ai/en/latest/features/quantization/quantized_kvcache/

[^gptq]: Frantar et al., **GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers**, 2022. https://arxiv.org/abs/2210.17323

[^awq]: Lin et al., **AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration**, MLSys 2024. https://arxiv.org/abs/2306.00978

[^smoothquant]: Xiao et al., **SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models**, ICML 2023. https://arxiv.org/abs/2211.10438

[^trt-parallel]: NVIDIA TensorRT-LLM, **Parallelism in TensorRT-LLM**. TP, PP, DP, EP, CP, and Wide-EP for distributed inference. https://nvidia.github.io/TensorRT-LLM/features/parallel-strategy.html

[^trt-ep]: NVIDIA TensorRT-LLM, **Expert Parallelism**. TP, EP, and hybrid patterns for MoE layers. https://nvidia.github.io/TensorRT-LLM/legacy/advanced/expert-parallelism.html

[^nccl]: NVIDIA NCCL, **Collective Operations**. AllReduce, AllGather, ReduceScatter, and AllToAll semantics and compatible rank participation. https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html

[^nccl-overview]: NVIDIA NCCL, **Overview**. Topology-aware GPU communication primitives and synchronization. https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/overview.html

[^vllm-distributed]: vLLM, **Distributed Inference and Serving**. TP/PP and multi-node NCCL communication considerations. https://docs.vllm.ai/en/latest/serving/distributed_serving/

[^megatron-cp]: NVIDIA Megatron Core, **Context Parallel Package**. Sequence partitioning, weight replication inside the CP domain, and attention communication. https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/features/context_parallel.html
