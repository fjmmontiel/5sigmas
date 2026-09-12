---
title: "Model routing, fallback, caching, and workload-aware serving"
description: "How to separate model selection, fallback, response caching, and worker placement to optimize quality, latency, capacity, and cost without breaking correctness."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "model routing, LLM routing, fallback, response cache, semantic cache, workload-aware serving, inference gateway, KV-aware routing"
tags:
  - AI
  - LLMs
  - Inference
  - Serving
  - Routing
---

# Chapter 5 — Model routing, fallback, caching, and workload-aware serving

The previous four chapters optimized **how** one inference is executed: prefill/decode, KV cache, batching, quantization, parallelism, prefix reuse, and speculative decoding. Two decisions still sit around that execution path:

> **Which model should receive this request, which worker should execute it, and what should happen when a fresh inference is unnecessary or the first attempt fails?**

Production systems often collapse four mechanisms that are not equivalent:

1. **response/result caching** decides whether a previous output can be reused
2. **model routing** chooses a model or model class before the first attempt
3. **worker placement** chooses a concrete replica after the model has been selected
4. **fallback** decides what to do after a failure or another explicit condition

Confusing these layers can turn a local optimization into a correctness, isolation, or SLO failure. A wrong semantic-cache hit skips the wrong inference. A price-only router can choose a model without tool calling. A fallback can duplicate output the user has already seen. A cache-hot worker can be so loaded that it worsens TTFT.

{{ include_html("snippets/articulos-tecnicos/inference-routing-fallback-cache-policy.html") }}

## Policy starts with what it **cannot** choose

Before optimizing quality, cost, or latency, a request needs a set of **eligible** candidates.

Let `x` be the request and `M` the model catalog:

\[
E(x)=\{m\in M:\operatorname{capable}(m,x)\land\operatorname{allowed}(m,x)\land\operatorname{healthy}(m)\}
\]

`capable` may include:

- required input and output modalities
- sufficient context length
- tool/function calling or structured output
- compatible tokenizer or protocol revision
- region or data-residency constraints
- tenant policy and allowlists
- deployment availability
- enough deadline budget when a candidate cannot plausibly meet the request SLO

This stage is **hard filtering**. A model that cannot execute the request correctly should not receive a favorable optimization score.

The separation also prevents an architectural mistake: routing policy must not become a bypass around security, residency, or permission rules. Those constraints define the decision space. The router optimizes **inside** it.

## Model routing chooses before the first attempt

Once `E(x)` has been filtered, a router can select the candidate with the highest expected utility. One conceptual formulation, not a standard, is:

\[
m^*(x)=\arg\max_{m\in E(x)}
\left[
\mathbb{E}Q(x,m)
-\lambda\,\mathbb{E}C(x,m)
-\mu\,P_{SLO}(x,m)
-\nu\,P_{risk}(x,m)
\right]
\]

Here:

- `Q` represents task-specific quality
- `C` represents the relevant cost, not merely price per token
- `P_SLO` penalizes the probability or magnitude of missing the SLO
- `P_risk` represents operational or policy risk the application has chosen to model
- `λ`, `μ`, and `ν` are product decisions, not universal constants

The equation makes the contract explicit. It does not prove that every term can be estimated accurately.

## Static routing, explicit rules, and learned routers solve different problems

### Static routing

One endpoint or workflow always uses the same model. That is a valid choice when task distribution is homogeneous or operational simplicity dominates.

### Explicit rules

The application routes on observable properties such as modality, tenant, length, language, required tools, task class, or budget. Rules are easy to audit, and they fail visibly when the taxonomy no longer represents traffic.

### Learned router

A classifier or scorer predicts which candidate is likely to provide sufficient quality or higher utility for `x`. RouteLLM specifically studies routing between a strong model and a cheaper model using preference data and several learned router families.[^routellm-paper] Its official repository publishes the serving and evaluation framework for those routers.[^routellm-repo]

That does not establish that a learned router is always better than rules. The result depends on candidates, preference data, task distribution, thresholds, and the cost of routing mistakes.

### Cascades

FrugalGPT studies strategies that invoke models in sequence and decide when to escalate to another model.[^frugalgpt] A cascade can resemble fallback, but the reason for the second call is different. Escalation can be a normal quality/cost policy rather than recovery from a technical failure.

## A managed router still has concrete capability boundaries

Amazon Bedrock Intelligent Prompt Routing is useful because its boundaries are explicit. Current documentation describes a serverless endpoint that routes between **exactly two models in the same model family**, with configurable response-quality criteria.[^bedrock-router]

The same documentation also states important limitations: routing is optimized for English prompts, it cannot adapt decisions using application-specific performance data, and it may be suboptimal for specialized use cases.[^bedrock-router]

There is also a terminology trap. Bedrock calls one configured model the `fallback model` when its **routing criterion** does not justify switching to the other model. That name does not necessarily mean “the model used after a network or provider failure.” A product field name does not redefine the architectural fallback boundary used in this chapter.

## The router only observes the outcome of the model it selected

If a request goes to `m_A`, production observes the outcome of `m_A`. It usually does **not** observe what `m_B` would have produced for the same request under the same conditions.

That is a counterfactual problem.

A dashboard that says:

```text
route=A → 92% success
route=B → 95% success
```

does not prove that B is better if A and B receive different populations.

To evaluate routing, at least a controlled sample must run alternative candidates against the same input with a comparable harness. Then we can define evaluation regret as:

\[
R(x)=U(x,m_{oracle})-U(x,m_{router})
\]

`m_oracle` does not mean “the best model in the world.” It is the best observed candidate for **that evaluation, that utility definition, and that candidate set**.

Paired evals, shadow traffic without side effects, or offline replay can estimate this gap. Ordinary production traffic has selection bias.

## Router quality and model quality are different variables

A system can fail because:

- the selected model cannot solve the task
- the router chose a worse model even though another candidate could solve it
- no eligible candidate could solve it
- policy correctly excluded a model because of capability or compliance constraints
- cost or latency estimates were stale
- serving conditions broke the SLO even though model selection was correct

Store `policy_version`, eligible candidates, and the selection reason. Otherwise a router regression becomes indistinguishable from a model regression.

## Fallback happens **after** a failure or degradation condition

Model routing asks:

```text
what should I try first?
```

Fallback asks:

```text
the attempt did not finish as expected: can I try another route without breaking the contract?
```

Not every error permits retry or fallback.

### Potentially recoverable failures

Depending on provider and application, these can include transport timeout, rate limiting, overload, an unhealthy endpoint, or a temporarily unavailable deployment.

### Failures that usually require fixing the request or policy

Authentication failure, invalid schema, oversized input, or a missing capability is not repaired by blindly sending the same request to another replica. A second model is only a valid alternative if it **does** satisfy the contract that failed.

LiteLLM, for example, documents Router retry/fallback logic across deployments.[^litellm] That demonstrates a capability of that gateway. It does not establish universal fallback semantics across runtimes.

## Fallback consumes the user's existing deadline

Let `D` be the end-to-end deadline and `t` the time already spent. Remaining budget is:

\[
B_{remaining}=D-t
\]

A fallback only helps when its chance of finishing correctly inside `B_remaining` justifies the extra attempt.

Retrying a slow provider three times can turn a fast failure into a multi-second timeout. During an incident, unbounded retries can also amplify load against the degraded system.

The contract therefore needs:

- per-attempt timeout
- total retry budget
- cooldown, circuit breaker, or an equivalent mechanism
- error classification
- concurrency bounds
- observability for both physical attempts and the logical request

## Fallback compatibility is more than “same API”

Two models behind an OpenAI-compatible endpoint may still differ in:

- context length
- tool calling
- JSON or structured output
- multimodality
- reasoning controls
- tokenizer
- output limits
- safety behavior
- supported system-prompt or tool-schema contract
- region and data handling

The fallback candidate must pass eligibility constraints again.

A response from another model also does not preserve the original model's distribution, wording, or decision. Fallback is a service-continuity policy, not a mathematical equivalence between models.

## Streaming changes when fallback is safe

Before the first visible byte, switching models can be relatively straightforward. Once text, audio, or tokens have reached the client, the system has an observable history.

```text
attempt A
  → emits "The total is..."
  → fails
  → attempt B starts from zero
```

If B emits the complete response again, the client can see duplication or contradiction. Continuing from the partial text requires an explicit continuation and state contract.

An inference fallback also **does not undo side effects** already executed by a tool or external service. Idempotency and reconciliation belong to the layer that owns those effects.

## Response caching skips full inference; prefix caching does not

Chapter 4.4 covered prefix caching:

```text
same compatible prefix
→ reuse verified KV
→ avoid part of prefill
→ still generate a new output
```

Response caching is different:

```text
compatible request identity
→ reuse a previous final result
→ no new model inference for that hit
```

That is a more aggressive optimization, so its correctness boundary is wider as well.

## A cache key is part of the truth contract

A useful exact key is rarely just `hash(user_prompt)`.

Depending on the product, it may need to include:

\[
K=H(
input,
policy\_version,
model\_revision,
decoding\_config,
tool\_schema,
retrieval\_snapshot,
tenant\_scope
)
\]

If any dependency changes and the previous output is no longer valid, a key that does not encode that dependency can produce a **stale hit**.

Examples include:

- system prompt changes while the user prompt stays identical
- model revision changes
- the RAG corpus is updated
- a tool changes schema or data
- tenant policy changes
- the answer depends on “now,” inventory, or a current price

TTL helps with age. It does not replace correct dependency identity.

## Not every request should be cacheable

Cached results are especially dangerous when a request depends on:

- user identity or permissions
- mutable external state
- current time or date
- private data that cannot cross tenant boundaries
- side effects
- nonces or challenges
- intentionally variable sampling
- conversation state not represented in the key

RFC 9111, which defines HTTP caching, treats invalidation and unsafe methods as part of the caching contract.[^rfc9111] An LLM response cache is not simply an HTTP cache. The transferable lesson is narrower: **reusing a response requires an explicit validity and invalidation rule**.

## Semantic caching adds an equivalence classifier

An exact cache requires exact identity. A semantic cache tries to decide that two different requests are equivalent enough to reuse one response.

GPTCache, for example, uses embeddings and vector search to retrieve similar queries, and its own documentation acknowledges false-positive hits and false-negative misses as part of the problem.[^gptcache]

A simplified admission policy might look like:

\[
\operatorname{admit}(x,c)=
[sim(x,c)\ge\tau]
\land metadata\_compatible
\land fresh
\land policy\_allowed
\]

The threshold `τ` does not create a correctness guarantee.

vCache studies semantic caching with explicit verification and starts from the problem that static similarity thresholds provide no formal correctness guarantee.[^vcache] LaCache studies robustness against cache collisions and adversarial queries in semantic caching.[^lacache]

The production implication is direct: **cache hit rate is not the primary objective**. Admission precision and the severity of false hits come first.

## A semantic cache can amplify a wrong answer

If an incorrect response enters the cache and many future queries are considered equivalent, the error can spread without another model invocation.

Keep five decisions separate:

1. **lookup** — which entries look similar
2. **admission** — which candidate response may be reused
3. **write policy** — which outputs are allowed into the cache
4. **invalidation** — which change makes an entry stale
5. **trust scope** — which tenants or trust domains may share it

A vector store mainly solves lookup. It does not solve the other four decisions by itself.

## Model routing and worker placement are two different levels

After a model has been selected, distributed serving still needs to choose **which replica** executes it.

NVIDIA Dynamo documents KV-aware routing that combines potential KV reuse with active prefill/decode load.[^dynamo-routing] In its current model, a worker with strong prefix overlap can lose to a colder worker when projected active load makes the total cost higher.[^dynamo-concepts]

That mechanism is not deciding between a cheaper model and a higher-quality model. It is placing the request within the available serving pool for the selected model or deployment.

A correct sequence can be:

```text
request
→ model policy: model B
→ serving pool for model B
→ worker policy: replica B3
→ inference
```

Not:

```text
"router" = one opaque decision
```

## Standards can define the boundary without defining your policy

Gateway API Inference Extension separates the Gateway, `InferencePool`, and endpoint selection. Its documentation defines metrics and capabilities, such as prefix-cache status or adapter availability, that a scheduler implementation can use.[^gaie]

The project also states that its lightweight Endpoint Picker is a conformance-oriented reference and that production deployments may use other implementations.[^gaie]

This distinction matters:

- **API/protocol capability** defines what information and extension point exist
- **scheduler implementation** defines how an endpoint is selected
- **application model policy** defines which model should answer the task

Do not attribute a particular quality/cost routing policy to the standard merely because it exposes an Endpoint Picker.

## Workload-aware means segmenting by the distribution that actually matters

One global policy often hides the fact that different workloads optimize different objectives.

### Interactive assistant with long repeated prefixes

TTFT, prefix locality, and queueing can dominate. Cache-aware worker routing may matter more than a learned model router when every request already uses the same model.

### Read-only FAQ with highly repeated answers

A carefully validated exact or semantic response cache can avoid whole inferences. Hit rate alone is not enough. Measure false-hit and stale-hit rates, plus the damage caused by a wrong reused response.

### Coding agent with tools and repository state

Output depends on repository snapshot, tool schema, and permissions. Full-response reuse is much harder. Model routing must filter capabilities first, and fallback is valid only when the alternative preserves the required tool/context contract.

### Offline summarization batch

Throughput and cost per task may dominate. Static routing can be operationally better than per-request learned routing when the distribution is homogeneous and paired evals show no meaningful heterogeneity to exploit.

### Traffic backed by unstable external providers

Continuity can dominate. Fallback, retry budgets, and circuit breakers may matter more than a small average improvement in price per token.

There is no universal strategy because there is no universal objective function.

## Three complete cases

### Case A — read-only product support

Two models are eligible. The smaller model handles common questions, while the larger model handles ambiguous cases. A versioned knowledge base supplies evidence.

A reasonable policy can be:

```text
hard constraints
→ exact/semantic response cache scoped to KB version
→ miss: model router small vs large
→ worker placement
→ provider/worker failure: compatible fallback if budget remains
```

Evaluate cache precision, paired quality for both models, cost per task, p95 TTFT, and fallback success conditional on recoverable failures.

### Case B — engineering agent with tools

Every request depends on repository SHA, permissions, and tool state. Full-output caching is disabled except for purely functional, versioned subproblems.

```text
capability + policy filter
→ tool-capable model route
→ worker placement
→ attempt
→ fallback only to a tool/schema-compatible model
```

The system records whether a tool call or side effect happened before the failure. It never treats an inference retry as a rollback of the tool.

### Case C — batch summarization

The workload has long documents, no interactive latency requirement, and a known completion window.

```text
static eligible model
→ queue/batch scheduler
→ worker placement by capacity/load
→ bounded retry on infrastructure failure
```

A learned per-document router can add complexity without benefit when paired evals do not show enough quality heterogeneity.

## Observability: record the **decision**, not only the inference

A useful trace should be able to reconstruct:

```text
logical_request_id
policy_version
workload_segment
eligible_models + exclusion_reasons
cache_namespace + key_version + hit/miss + admission_reason
selected_model + revision + selection_reason
selected_worker + placement_reason
attempt_id + deadline_remaining
error_class
fallback_candidate + fallback_reason
output_already_visible
usage + latency + cost
quality/outcome evidence
```

Not every field should be sent to an external provider or retained without redaction. Observability has a privacy contract too.

Without `exclusion_reasons`, we cannot tell whether a model lost on score or was removed by a hard constraint. Without `policy_version`, the decision is not reproducible. Without `attempt_id`, retries become indistinguishable from the logical request.

## Evaluate each mechanism separately

### Model router

Measure:

- quality by segment and candidate
- regret on paired evaluations
- cost per task
- latency and SLO attainment by route
- frequency of each hard-exclusion reason
- traffic-mix drift

### Response cache

Measure:

- hit rate
- hit precision
- false-positive and stale-hit rate
- recall only when a defensible ground truth for reusable requests exists
- lookup latency
- resident bytes or entries
- severity of the worst incorrect hit

### Fallback

Measure:

- rate of fallback-eligible failures
- fallback attempts per logical request
- success conditional on failure type
- added latency
- requests that exhaust their deadline
- duplicate or partial-output incidents
- retry amplification during outages

### Worker placement

Measure:

- queue time and TTFT
- load per worker
- prefix/KV overlap when relevant
- avoided or estimated recompute under an explicit definition
- tail latency
- pool goodput

One aggregate “router success rate” would erase these boundaries.

## The production gate is end to end

A router can lower average cost and worsen p99. A cache can reduce TTFT and increase errors. Fallback can increase availability and violate deadlines. Cache-aware placement can improve prefill reuse and create hotspots if load is ignored.

A deployment decision should therefore inspect at least four axes:

\[
\text{quality}
\times
\text{SLO attainment}
\times
\text{cost/task}
\times
\text{capacity/goodput}
\]

This is not meant as a literal mathematical product. It is a reminder that one axis must not hide another.

## Reproducible benchmark contract

We will not combine numbers from RouteLLM, FrugalGPT, Bedrock, Dynamo, semantic-cache papers, or gateway documentation into a common leaderboard. They measure different interventions, models, traffic, and hardware.

To claim that a policy improves our serving stack, fix at least:

- input distribution and workload segments
- exact candidates and revisions
- prompts, system policy, and tool schemas
- pricing snapshot or hardware-cost model
- hardware, runtime, and quantization
- cache warm-up and initial state
- request rate and concurrency
- input and output lengths
- failure injection for fallback
- timeout and retry budgets
- quality evaluator and its known limitations
- number of repetitions
- TTFT, TPOT, end-to-end latency, throughput/goodput, and cost-per-task distributions

If several layers change together, the result compares **complete stacks**. It does not isolate the causal effect of routing or caching.

## Decision checklist

Before adding another layer, ask:

1. **What is the exact decision?** Reuse output, choose a model, choose a worker, or recover from a failure.
2. **Which constraints are hard?** Capabilities, policy, region, context, and deadline.
3. **Which signal can become stale?** Load, KV locality, quality estimate, health, pricing, or cache freshness.
4. **What is the cost of an error?** Weak model, false cache hit, duplicated retry, or hotspot.
5. **Can we evaluate the unchosen alternative?** Paired eval, replay, or shadow execution.
6. **Which state is already visible or irreversible?** Streaming output and side effects.
7. **Is the policy versioned and reversible?** If not, reproducing a regression will be difficult.

## Conclusion

Workload-aware serving is not a chain of “smart routing,” caching, and fallback. It is a set of **separate decisions that happen at different times and carry different contracts**:

- caching decides whether a previous result is still valid
- model routing decides which model to try first
- worker placement decides where to execute that model
- fallback decides whether a second route remains valid after failure
- evals and telemetry update policy using evidence, including evidence about alternatives that were not selected

Once those boundaries are explicit, cost and latency can be optimized without calling a silent loss of quality or correctness an optimization.

The next chapter closes the series with **inference benchmarking**: how to measure cost per task, throughput, latency, energy, and hardware constraints without comparing incompatible setups.

## References

[^routellm-paper]: Ong, I. et al. *RouteLLM: Learning to Route LLMs with Preference Data*. arXiv:2406.18665. https://arxiv.org/abs/2406.18665
[^routellm-repo]: LMSYS. *RouteLLM* — official repository. https://github.com/lm-sys/RouteLLM
[^frugalgpt]: Chen, L. et al. *FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance*. arXiv:2305.05176. https://arxiv.org/abs/2305.05176
[^bedrock-router]: AWS. *Understanding intelligent prompt routing in Amazon Bedrock*. https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-routing.html
[^litellm]: LiteLLM. *Getting Started / Router retry and fallback*. https://docs.litellm.ai/
[^rfc9111]: IETF. *RFC 9111 — HTTP Caching*. https://www.rfc-editor.org/rfc/rfc9111
[^gptcache]: Zilliz. *GPTCache — Semantic cache for LLM queries*. https://github.com/zilliztech/GPTCache
[^vcache]: *vCache: Verified Semantic Prompt Caching*. arXiv:2502.03771. https://arxiv.org/abs/2502.03771
[^lacache]: *LaCache: Robust Semantic Caching for LLM Serving*. arXiv:2608.01718. https://arxiv.org/abs/2608.01718
[^dynamo-routing]: NVIDIA. *Dynamo Router Guide v1.4.0*. https://docs.nvidia.com/dynamo/v1.4.0/knowledge-base/modular-components/router/overview
[^dynamo-concepts]: NVIDIA. *Dynamo KV-Aware Routing — concepts*. https://docs.nvidia.com/dynamo/dev/knowledge-base/concepts/system-architecture/kv-aware-routing
[^gaie]: Kubernetes SIG Network. *Gateway API Inference Extension*. https://github.com/kubernetes-sigs/gateway-api-inference-extension
