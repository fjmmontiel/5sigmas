---
title: "Benchmarking inference: cost/task, throughput, latency, energy, and hardware constraints"
description: "How to design reproducible inference benchmarks across workload, TTFT/TPOT/ITL, throughput/goodput, cost per successful task, energy, and real hardware constraints."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "LLM inference benchmark, TTFT, TPOT, ITL, throughput, goodput, cost per task, energy per inference, MLPerf, AIPerf, vLLM"
tags:
  - AI
  - LLMs
  - Inference
  - Benchmarking
  - Serving
---

# Chapter 6 — Benchmarking inference: cost/task, throughput, latency, energy, and hardware constraints

The earlier chapters introduced mechanisms that can move a metric: batching, KV cache, quantization, parallelism, speculative decoding, routing, and caching. The final chapter asks the harder question:

> **how do we know that an intervention improves the system we actually want to operate rather than only one benchmark number?**

A scalar such as `1200 tok/s`, `p50 TTFT = 180 ms`, or `€0.002/request` does not describe a system. We still need to know what traffic it saw, where the clock started and stopped, which hardware ran the model, what state the caches were in, which requests failed, and whether the outputs solved the task.

{{ include_html("snippets/articulos-tecnicos/inference-benchmark-measurement-boundary.html") }}

## A benchmark is a protocol, not a scalar

An interpretable result needs a contract that fixes at least:

\[
B=(W,A,M,R,S,H,N,E,Q)
\]

where:

- `W` is the workload and its input/output distributions
- `A` is the arrival process, concurrency, and run duration
- `M` is the model, revision, tokenizer, and decoding configuration
- `R` is the runtime, version, scheduler, quantization, and cache configuration
- `S` is initial state, warmup, and repetition policy
- `H` is hardware, memory, topology, power mode, and host system
- `N` is the client/server boundary and network path included in the measurement
- `E` is the exact endpoints and formulas used for each metric
- `Q` is the task-quality or success contract

Two numbers are comparable only when the relevant parts of this contract are controlled or at least reported. If model, hardware, prompt length, and harness all change at once, the experiment compares **complete stacks**. It does not identify the effect of one optimization.

## The workload should resemble the problem you are trying to solve

An average of 512 input tokens and 128 output tokens is not a distribution.

Prefill and decode respond differently to sequence shape. A scheduler behaves differently with long prompts, long outputs, multi-turn sessions, and mixed sequence lengths. KV pressure also changes with shared prefixes and concurrency.

A useful workload description should therefore include at least:

- input-token distribution
- output-token distribution
- their correlation when it matters
- fraction of multi-turn requests
- shared versus unique prefixes
- tools, structured output, or constraints that alter decoding
- cancellation rate
- traffic segments with different SLOs

For synthetic data, state which properties of production traffic the generator preserves and which it does not.

## Request rate and concurrency describe different load models

A benchmark configured only with `concurrency=64` commonly behaves like a closed loop: when one request completes, another fills the slot. A benchmark driven by a fixed or stochastic arrival rate can be open loop: new work keeps arriving even while the server is building a queue.

AIPerf exposes request-rate scheduling, concurrency limits, `constant`, `poisson`, and `gamma` arrival patterns, plus separate warmup and ramp controls.[^aiperf-load]

This distinction matters because two systems with the same average service capacity can behave very differently under bursts.

For production capacity, a **saturation sweep** is more informative than one load point:

```text
low load
→ increase arrival rate / concurrency
→ utilization rises
→ throughput rises
→ a queue appears
→ TTFT and tail latency rise
→ throughput approaches a plateau
→ errors, cancellations, or SLO misses can rise
```

The useful operating point is not necessarily maximum `tok/s`. It is the region where the service still satisfies its contract.

## TTFT is a user-facing boundary, not a prefill-kernel timer

AIPerf measures TTFT from request start until the client receives the first non-empty response chunk. Its definition includes **network latency, queueing, prompt processing, and generation of the first output**.[^aiperf-metrics]

Therefore:

\[
TTFT_{client}
\neq
T_{prefill\ kernel}
\]

unless a different harness explicitly defines and documents a different boundary.

This distinction prevents a common attribution error. A scheduler change may reduce TTFT without accelerating the prefill kernel. A slower network may increase TTFT even when server execution is identical.

## TPOT, ITL, and chunk latency are not universal synonyms

For an output with `n` tokens, one common TPOT definition uses the post-first-token interval:

\[
TPOT=\frac{T_{end}-TTFT}{n-1}
\]

but tools can use different names or endpoints. A benchmark should publish the formula rather than relying on the acronym.

ITL measures gaps between consecutive tokens. Real streaming systems may also have **inter-chunk latency**: one response chunk can contain multiple tokens, so transport cadence does not necessarily equal decoder cadence. AIPerf reports token and chunk timing separately.[^aiperf-metrics]

For interactive UX, report distributions rather than averages alone:

- TTFT p50/p95/p99
- TPOT or ITL p50/p95/p99 under the stated definition
- end-to-end latency
- chunk jitter when the protocol makes it relevant
- errors and cancellations

## Throughput asks “how much finished”; goodput adds “within the SLO”

Raw throughput can be requests/s or tokens/s. Neither metric says that requests met the intended user experience.

Let `G` be the set of successful requests that meet the service objectives:

\[
G=\{r:\ TTFT_r\leq\tau_1\land TPOT_r\leq\tau_2\land T_{e2e,r}\leq\tau_3\land success_r\}
\]

Then:

\[
\operatorname{goodput}=\frac{|G|}{T_{window}}
\]

AIPerf defines goodput as completed requests per second that satisfy configured metric constraints and counts errored requests in the denominator of its good-request fraction.[^aiperf-goodput] vLLM `bench serve` likewise supports goodput SLOs over TTFT, TPOT, and end-to-end latency, together with configurable percentile reporting.[^vllm-bench]

A system can raise raw throughput while lowering goodput if queueing and tails grow too far.

## A benchmark also needs a quality dimension

A fast system that fails the task is not efficient.

For tasks with an evaluation rule, define:

\[
N_{success}=\sum_i \mathbf{1}[Q(y_i, y_i^*, x_i)\geq q_{min}]
\]

`Q` may be exact match, executable tests, a human rubric, a calibrated judge, or a domain-specific metric. The key requirement is to fix it **before** comparing systems and keep the same contract across variants.

If quality uses an LLM judge, version the judge itself:

- judge model and revision
- prompt or rubric
- temperature and sampling
- aggregation rule
- treatment of abstentions and judge failures
- calibration against human examples when required

Changing the judge between systems changes the denominator of `cost/task`.

## Cost/request, cost/token, and cost/successful-task answer different questions

Let `C_run` be the total cost included in the accounting boundary for one run.

\[
C_{request}=\frac{C_{run}}{N_{attempted}}
\]

\[
C_{token}=\frac{C_{run}}{N_{output\ tokens}}
\]

\[
C_{successful\ task}=\frac{C_{run}}{N_{success}}
\]

For an API, `C_run` can include input tokens, output tokens, cached tokens, tool calls, or other provider charges. For self-hosting it may include accelerator time, host resources, memory, network, and idle reserve depending on the accounting boundary.

There is no universal cost boundary. There is a requirement to say what is included.

### Illustrative arithmetic, not a benchmark

Suppose a run costs `€24`, attempts `1000` tasks, and `920` pass the predefined success criterion:

\[
C_{request}=24/1000=0.024\ €
\]

\[
C_{successful\ task}=24/920\approx0.02609\ €
\]

Reporting only `€0.024/request` would hide the cost of outputs that did not solve the task.

## Power and energy are different physical quantities

Power is an instantaneous rate. Energy integrates that rate over time:

\[
E_{run}=\int_{t_0}^{t_1} P_{SUT}(t)\,dt
\]

A `250 W` TDP is therefore not `250 Wh` consumed and does not establish the energy used by one inference.

MLPerf Power provides a useful measurement discipline even outside MLPerf. Its rules define the system under test at system level, measure AC power at the wall, align power and performance timestamps, require replicability, and forbid combining the highest performance from one run with the lowest power from another.[^mlperf-power]

MLCommons messaging rules also reject TDP, PSU rating, or other proxy values as substitutes for measured system power when comparing MLPerf power results.[^mlperf-messaging]

## Energy/request, energy/token, and energy/task need separate denominators

For energy measured over the same performance window:

\[
E_{request}=\frac{E_{run}}{N_{attempted}}
\]

\[
E_{token}=\frac{E_{run}}{N_{output\ tokens}}
\]

\[
E_{successful\ task}=\frac{E_{run}}{N_{success}}
\]

If the illustrative run above consumed `1.8 kWh`, then:

\[
E_{successful\ task}=1800/920\approx1.957\ Wh
\]

That still would not be a publishable benchmark without a defined SUT boundary, instrument, uncertainty, duration, and repeatability. It only demonstrates why the denominator matters.

## Draw the energy boundary physically

“GPU energy” and “system energy” are not interchangeable.

A benchmark should say whether it measures:

- accelerator telemetry only
- accelerator plus CPU and RAM
- one complete node
- multiple nodes
- wall power for the SUT
- external network or storage

Node-level measurement may better answer an operational-cost question. Accelerator telemetry may be better for local profiling. They are different experiments.

## Hardware constraints are more than the GPU model

A reproducible benchmark should record at least:

```text
accelerator model + count
accelerator memory + memory mode
precision / quantization
power cap / clocks if modified
tensor / pipeline / expert / context parallelism
interconnect + topology
CPU + RAM
host count
runtime + driver + CUDA/ROCm stack
model revision + tokenizer
scheduler / batching / cache config
client location + network path
```

Two systems with the same GPU SKU can differ because of NVLink/NVSwitch, PCIe, NUMA, CPU bottlenecks, host memory, network, or power limits.

Memory capacity also determines which batch sizes, contexts, and KV residency are possible. Record OOMs and rejected configurations rather than silently omitting settings that do not fit.

## Warmup and cache state are part of the experiment

A “warm” result may include:

- compiled kernels
- established connections
- stabilized allocators
- resident weights
- prefix/KV cache hits
- warm filesystem or page cache

A “cold” result can measure a different problem entirely.

AIPerf separates warmup from profiling and discards warmup metrics. Warmup duration, request count, concurrency, and request rate are independently configurable.[^aiperf-warmup]

For every run, specify whether caches are flushed, preserved, or preloaded. Stable production serving may justify a warm benchmark. Cold start should be measured as its own scenario.

## Repetition matters because one run does not describe variance

A serious benchmark repeats the same configuration and retains the samples rather than publishing only the best number.

At minimum, report:

- number of repetitions
- duration or request count per repetition
- warmup for each repetition
- variant order if thermal or background-load drift is plausible
- per-request medians and percentiles
- run-to-run dispersion
- errors and cancellations
- any excluded outlier and the exclusion rule

For A/B tests on a shared cluster, noisy neighbors and autoscaling are part of the experiment unless explicitly controlled.

## The most informative system view is often a saturation curve

One load point can accidentally favor one configuration.

Sweep arrival rate or concurrency and observe jointly:

\[
\lambda
\rightarrow
(queue, TTFT_{p99}, TPOT_{p99}, throughput, goodput, errors, power)
\]

At low load, two systems may look equivalent. Near saturation they can diverge because one starts building a queue, evicting KV, losing batch efficiency, or exhausting memory.

The curve exposes **where the system changes regime**.

## Identical metric names do not guarantee identical measurements

AIPerf publishes concrete definitions for TTFT, decode duration, ITL, inter-chunk latency, and throughput.[^aiperf-metrics] vLLM `bench serve` exposes its own load generator, percentiles, and goodput settings.[^vllm-bench]

Do not copy two result tables and compare their `TTFT` cells unless these match:

- timing endpoints
- streaming and chunking behavior
- tokenizer and token counting
- workload
- load model
- warmup
- network path
- failed-request handling

The column name is not the metric definition.

## MLPerf shows why scenario is part of the result

MLPerf Inference v6.1 is the current 2026 round documented by MLCommons.[^mlperf-suite] Its rules distinguish scenarios such as Offline, Server, and SingleStream because they represent different deployment questions.[^mlperf-rules]

An internal benchmark does not need to adopt MLPerf wholesale. The transferable lesson is that **scenario + workload + rules + metric** is the unit of interpretation. A score detached from its load regime loses meaning.

## A minimum 5sigmas benchmark record

Before publishing an inference comparison, require a block like this:

```text
MODEL
  model/revision, tokenizer, decoding, context limit

RUNTIME
  engine/version, precision, parallelism, scheduler, cache settings

HARDWARE
  accelerators, memory, topology, CPU/RAM, power settings

WORKLOAD
  dataset/sampling, input/output distributions, shared prefixes, task success criterion

LOAD
  open/closed loop, arrival pattern, rate/concurrency sweep, duration, warmup

MEASUREMENT
  client/server boundary, formulas, streaming/chunking, power boundary

REPORT
  TTFT/TPOT/ITL/e2e distributions, throughput, goodput, errors,
  cost/request, cost/successful-task, energy/request or energy/task when measured,
  repetitions and run-to-run variance
```

If one of these sections is missing, the result may still help local debugging, but it should not be presented as a general comparison.

## The application determines which metric matters

### Interactive chat

Typical priorities include:

- TTFT tail
- decode fluency or ITL
- goodput under the user SLO
- turn quality
- cancellation and wasted-work cost

### Offline batch

More relevant metrics may be:

- tasks/hour
- output tokens/s
- cost per successful task
- energy per task
- sustained utilization

### Tool-using agent

Tokens/s may stop being the bottleneck. The benchmark should include tool latency, retries, side effects, and **end-to-end task success**.

The metric should follow the product, not the runtime dashboard.

## Checklist before trusting a number

1. **What is the exact workload?** Not only mean token counts.
2. **How do requests arrive?** Rate, concurrency, burstiness, and ramp-up.
3. **Where does each clock start and stop?** Client, gateway, server, or kernel.
4. **What state was warm?** Kernels, connections, KV/prefix cache, and allocators.
5. **What counts as success?** Completed request does not imply successful task.
6. **What hardware and topology were used?** Include host and interconnect.
7. **What is included in cost and energy?** State the accounting and physical boundary.
8. **How many repetitions were run?** Report distributions and variance.
9. **What happens near saturation?** Inspect queueing, tails, errors, and goodput.
10. **Does the comparison change one variable or the whole stack?** Attribute only what the experiment identifies.

## Conclusion

Inference benchmarking is not the search for the largest number. It is an experiment in which **workload, load model, timing boundaries, quality, cost, energy, and hardware** are specified precisely enough to reconstruct what changed.

The closing rule for this series is:

> **do not optimize a number that you cannot reconstruct from the protocol that produced it.**

With a reproducible protocol, the optimizations from the earlier chapters stop being isolated claims and become measurable engineering decisions.

## References

[^aiperf-metrics]: NVIDIA. *AIPerf Metrics Reference*. https://docs.nvidia.com/aiperf/reference/ai-perf-metrics-reference
[^aiperf-goodput]: NVIDIA. *Benchmark Goodput with AIPerf*. https://docs.nvidia.com/aiperf/tutorials/metrics-analysis/benchmark-goodput-with-ai-perf
[^aiperf-load]: NVIDIA. *Load Generator Options Reference*. https://docs.nvidia.com/aiperf/benchmark-modes/load-generator-options-reference
[^aiperf-warmup]: NVIDIA. *Warmup Phase Configuration*. https://docs.nvidia.com/aiperf/tutorials/load-patterns-scheduling/warmup-phase-configuration
[^vllm-bench]: vLLM. *vllm bench serve*. https://docs.vllm.ai/en/stable/cli/bench/serve/
[^mlperf-suite]: MLCommons. *MLPerf Inference Benchmark Suite — v6.1*. https://docs.mlcommons.org/inference/index_gh/
[^mlperf-rules]: MLCommons. *MLPerf Inference Rules*. https://github.com/mlcommons/inference_policies/blob/master/inference_rules.adoc
[^mlperf-power]: MLCommons. *MLPerf Inference Power Measurement Rules*. https://github.com/mlcommons/inference_policies/blob/master/power_measurement.adoc
[^mlperf-messaging]: MLCommons. *MLPerf Results Messaging Guidelines*. https://github.com/mlcommons/policies/blob/master/MLPerf_Results_Messaging_Guidelines.adoc
