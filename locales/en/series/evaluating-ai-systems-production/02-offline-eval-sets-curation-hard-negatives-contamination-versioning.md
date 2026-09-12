---
title: "Offline eval sets: curation, hard negatives, contamination, and versioning"
description: "How to build offline evaluation sets that keep measuring what matters through provenance, coverage, hard negatives, leakage controls, holdouts, and reproducible versioning."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "offline evals, dataset curation, hard negatives, data contamination, eval versioning, benchmark leakage, holdout, AI evaluation"
tags:
  - AI
  - Evaluation
  - Datasets
  - Production
  - Reliability
---

# Chapter 2 — Offline eval sets: curation, hard negatives, contamination, and versioning

An offline set is not a folder of examples that "look representative." It is a **versioned measurement instrument**.

If its cases are ambiguous, too easy, duplicated across splits, exposed during development, or silently mutated, the final number can be perfectly reproducible while answering the wrong question.

This chapter asks one concrete question:

> **How do we build an eval set that measures a real hypothesis, finds useful failures, and keeps its meaning as the system and data change?**

That requires separating five problems:

1. where cases come from
2. what coverage we intend
3. how to build difficult cases without turning the set into a collection of curiosities
4. which kinds of exposure or leakage can invalidate a conclusion
5. which exact version of data, labels, and protocol produced a result

NIST AITE provides one useful extreme of this design: blind data inside a sequestered environment to reduce train/test contamination risk.[^nist-aite] Product teams often operate at the other end, growing internal banks from bugs and user feedback. Both approaches are only interpretable when the provenance and history of each case are known.

{{ include_html("snippets/articulos-tecnicos/eval-dataset-lifecycle-hard-negatives-contamination.html") }}

## The object is an eval release, not "the dataset"

Represent one evaluation release as:

\[
D_v = \{(id_i, x_i, y_i, m_i, p_i)\}_{i=1}^{N_v}
\]

where:

- `v` identifies an immutable version
- `id_i` is a stable case identifier
- `x_i` contains the task/input and, when needed, initial environment state
- `y_i` contains the reference, success criteria, or expected checks
- `m_i` contains metadata required for stratification and reproduction
- `p_i` contains provenance: source, date, permissions, transforms, and lineage

This definition prevents a common mistake: calling a file `eval_v1` while editing it in place. If an item, label, split, or result-affecting transform changes, we are no longer measuring with exactly the same `D_v`.

### The smallest unit must be auditable

A case should let us resolve at least:

```text
item_id
source_id / provenance
source_snapshot_or_timestamp
split
capability_or_risk_tags
input / initial_state
reference_or_success_criteria
labeling_guideline_version
transform_pipeline_version
created_at / reviewed_at
```

These fields do not have to live in one file. They do have to be resolvable from the release manifest.

## Start with a coverage hypothesis

"Representative" does not mean "random" by default.

Before sampling, define which distribution or risk regions you want to observe. For a support assistant, relevant axes might include:

- intent: refund, shipping, billing, account
- complexity: one policy, multiple policies, policy conflict
- dependency: no tool, one tool, several tools
- risk: reversible, external side effect, sensitive action
- language, input length, and noise
- state: eligible, nearly eligible, ineligible

We can describe coverage through strata `z`:

\[
D_v = \bigcup_{z \in Z} D_{v,z}
\]

but the size of each stratum must follow the evaluation question. To estimate production performance, weights should approximate the relevant operating distribution. To find rare but expensive regressions, deliberately oversampling those regions can be correct, but the resulting average must **not** be presented as a production rate.

The rule is simple:

> **the sampling policy is part of the metric.**

A 92% score on a deliberately adversarial bank and a 92% score on stratified traffic do not mean the same thing.

## Where cases should come from

A healthy eval set usually mixes sources because each source exposes different failures.

### 1. Curated production cases

Bugs, escalations, support tickets, and failed traces provide realism.

Strength: they sit close to risks that have already occurred.

Risk: if we only turn known failures into tests, the suite becomes a historical archive and does not explore nearby failure modes.

### 2. Expert-designed cases

Experts can target invariants, policy boundaries, security properties, and corners that have not yet appeared in traffic.

Strength: strong control over the mechanism being tested.

Risk: authors can introduce linguistic artifacts or assumptions that do not exist in real use.

### 3. Generated or transformed cases

We can vary entities, quantities, ordering, noise, tool state, or constraints.

Strength: inexpensive coverage expansion.

Risk: many synthetic variants are not genuinely new situations. One thousand paraphrases of one mechanism are not one thousand independent units of evidence.

### 4. Adversarial cases and hard negatives

These target a boundary where the system should change its decision.

Dynabench formalized one version of this idea through human-and-model-in-the-loop data creation: annotators try to produce valid examples that fool the current target model.[^dynabench] Adversarial NLI used a related iterative process to collect hard examples against successive models.[^anli]

The lesson is not "always use adversarial data." It is that **difficulty can be designed around a specific failure and then revalidated**, rather than assuming random examples will cover that boundary.

## What makes a useful hard negative

A hard negative is not simply "a difficult example."

It is especially useful when almost everything stays constant while one condition changes the correct decision.

Support example:

```text
A: order delivered 29 days ago + item intact → return allowed
B: order delivered 31 days ago + item intact → return denied
```

If the governing policy uses a 30-day boundary, the pair forces the system to use the causal variable rather than a shortcut such as "mentions a return → approve."

Represent one pair as:

\[
(x_i^{+}, x_i^{-}), \qquad
\Delta(x_i^{+},x_i^{-}) \approx \Delta^*_i
\]

where `Δ*` is the smallest difference intended to justify the label change. The `≈` is deliberate. In language and real systems, perfect identity of every nuisance variable is rarely possible.

A pairwise consistency signal can be:

\[
PC = \frac{1}{K}\sum_{i=1}^{K}
\mathbf{1}[f(x_i^{+})=y_i^{+} \land f(x_i^{-})=y_i^{-}]
\]

`PC` does not replace overall accuracy. It answers a different question: **does the system make the correct decision on both sides of a deliberately constructed boundary?**

### Hard does not mean exotic

A case can be hard because it:

- discriminates between nearly identical conditions
- combines two rules that conflict
- mixes relevant evidence with a plausible distractor
- requires the system not to act
- requires correct recovery after a partial failure
- breaks a spurious correlation that worked on easy examples

The goal is not to fill the set with riddles. The goal is to apply pressure where the system could learn the wrong shortcut.

## The anti-pattern: generating every hard case against the current model

If every difficult case is selected because `model_A` fails it, the dataset is conditioned on `model_A`.

That can be useful for diagnosis, but it creates two risks:

1. evaluating a future version almost entirely on the weaknesses of a previous one
2. treating "beats this model" as equivalent to "represents an important product risk"

Dynabench explicitly treats benchmarking as dynamic: models and data collection feed back into one another.[^dynabench] That is a property of the protocol, not permission to mix rounds without identifying them.

For a product eval, preserve where a hard case came from:

```text
hardness_source: human | production_failure | model_adversarial | transform
hardness_target: model_revision | workflow_revision | policy_boundary
round: 2026-09-r2
```

That lets us ask whether an improvement generalizes or only solves the generator that produced the set.

## Four contamination problems that should not share one label

"Contamination" is used for several different failures. Naming them separately makes the response clearer.

### 1. Training exposure

Test content, or sufficiently close material, may have appeared in pretraining, fine-tuning, or distillation.

This matters especially for public benchmarks. A high score can combine generalization and memorization, and outside the training pipeline we usually cannot prove total absence of exposure.

NIST AITE reduces this risk by keeping evaluation data blind inside a sequestered environment.[^nist-aite]

LiveBench uses another strategy: it introduces new questions periodically and draws from recent sources with objectively verifiable answers to limit potential contamination.[^livebench]

Neither strategy establishes a universal property of "contamination-free." Each reduces a specific exposure channel under its own protocol.

### 2. Cross-split leakage

The same case, a near duplicate, or the same entity/template can cross from authoring or dev into the holdout.

Exact duplicates are the easy case. More subtle examples include:

- paraphrases of one item
- multiple windows from the same source document
- related issues in one repository that share a solution
- conversations from the same customer split across banks
- synthetic variants produced from the same seed
- initial and final states from one episode separated across train/test

The split unit therefore should not always be a row. It might need to be a `document_id`, `customer_id`, `repo_id`, `incident_family`, or `generation_seed`.

### 3. Development leakage

A test set can be absent from model training and still stop functioning as a holdout.

This happens when a team repeatedly:

- inspects failures from the final test set
- tunes a prompt or policy against those same items
- selects models after every iteration by looking at test results
- changes a grader to accommodate outputs observed on the test

After enough iterations, the team has optimized the system against the set without performing gradient descent on it.

The practical response is to separate **dev/calibration** from **holdout/release**, and control who can inspect the holdout and when.

### 4. Temporal leakage

If a task is meant to reproduce a decision at time `t`, it cannot use information that only existed after `t`.

Examples include:

- RAG evaluated against a corpus snapshot from after the ticket date
- incident prediction using a postmortem written after the incident
- a research agent evaluated on a web snapshot that already contains a later published answer

The snapshot date is part of the case.

## A duplicate scanner cannot certify the absence of contamination

Define an overlap audit:

\[
O_{\tau}(A,B)
=\frac{1}{|B|}\sum_{b\in B}
\mathbf{1}\left[\max_{a\in A} sim(a,b) \ge \tau\right]
\]

This is useful for finding leakage candidates. It is not proof of a "clean dataset."

The result depends on:

- representation
- similarity function `sim`
- threshold `τ`
- normalization
- comparison unit
- available provenance

An exact-match scan has few false positives but misses paraphrases. An embedding scan can surface semantic equivalence and also flag legitimately similar cases. Provenance review remains necessary.

The GPT-4 Technical Report is a useful historical example of why contamination is reported as a methodology rather than a magic boolean. OpenAI measured overlap between benchmark items and training data, then separated contaminated and non-contaminated subsets under its detector while documenting limitations.[^gpt4-report]

## Split on the unit that can carry leakage

Suppose a RAG eval has 20 questions per document. A random split by question can place 15 questions from one document in dev and 5 from that same document in test. The test is no longer asking, "does the development process generalize to unseen documents?" It is asking something narrower.

Depending on the objective, the split may need:

```text
split_unit: document_id
```

For a coding agent:

```text
split_unit: repository + issue_family
```

For support:

```text
split_unit: policy_version + incident_family
```

There is no universal split unit. It should match the channel through which information could transfer artificially between banks.

## Dev, regression, and holdout banks serve different jobs

A useful organization separates at least three banks.

### Dev / calibration set

Visible during construction.

Use it to:

- write and repair tasks
- debug graders
- inspect transcripts
- iterate on prompts and policies
- discover broken cases

It should not later be presented as independent evidence for an improvement that it helped shape.

### Regression bank

Known cases the system is expected to pass.

Anthropic distinguishes capability evals from regression evals and notes that mature capability cases can graduate into regression coverage once behavior stabilizes.[^anthropic-evals]

Its purpose is to catch breakage of an already acquired property.

### Holdout / release set

This bank should not participate in every product iteration.

Its purpose is to confirm that a decision made with dev and regression evidence generalizes to cases not used to optimize that decision.

A holdout that the whole team reads every day no longer acts as a holdout, even if the file is still named `holdout.jsonl`.

## A fourth bank can help: a rotating challenge set

Systems and models saturate static evals.

LiveBench illustrates a public rotation strategy: periodically adding new questions from recent sources to limit exposure and preserve difficulty.[^livebench]

A product team can apply the same principle without copying that benchmark:

- preserve a stable release for longitudinal comparability
- add a fresh challenge bank to find new capabilities and failures
- do not mix the two averages without identifying their version and composition

This avoids a false choice between two competing goals: **historical comparability** and **freshness**.

## Versioning means being able to reconstruct the result

A score without dataset identity is incomplete evidence.

At minimum, record:

```text
eval_suite: support-policy
dataset_version: 3.2.0
manifest_sha256: ...
split: release
item_count: ...
source_snapshot: ...
labeling_guidelines: 7
transform_pipeline: 4
model_revision: ...
workflow_revision: ...
grader_revision: ...
harness_revision: ...
```

Hugging Face Datasets can pin a dataset revision by tag, branch, or commit SHA, and maintains fingerprints derived from data state and applied transforms.[^hf-load][^hf-fingerprint] Those are useful reproducibility mechanisms, but a technical fingerprint does **not** replace the semantic version of an evaluation.

Two datasets can have different hashes because of an irrelevant ordering change. Conversely, keeping the name `v3` means little if the content is silently changed.

### Canonical manifest

A robust pattern is to build an ordered manifest and hash it:

\[
H_v = SHA256(canonical\_manifest(D_v))
\]

The manifest can include item IDs, payload hashes, split, source revision, label revision, and transform revision.

The exact function matters less than two properties:

1. the same input produces the same identity
2. any material change becomes visible and requires a new identity

## Which changes require a new version

Not every change carries the same semantics.

### Patch

A correction that is not intended to change the task:

- typo in metadata
- caption that is not used by the grader
- repaired provenance link

The artifact hash still changes and the patch should remain recorded.

### Minor

Coverage changes while the main construct remains the same:

- new items
- new hard negatives
- a new region or language
- removal of invalid cases

Do not compare the averages from `v3.1` and `v3.2` as if their denominators were identical without running both systems on the same release.

### Major

The meaning of success or the evaluated boundary changes:

- new rubric
- new outcome
- policy change that redefines labels
- move from single-turn behavior to a complete workflow
- new environment or tool contract

That is a new evaluation even if the product name stays similar.

The `major.minor.patch` convention is only an example. What matters is documenting what each class of change means.

## Do not silently relabel history

Suppose we discover that 12 items had incorrect labels.

There are two different questions:

1. what result did the system produce under `D_3.1` as it existed then?
2. what result does that same system produce under corrected `D_3.1.1`?

Rewriting history destroys the first answer.

A reproducible practice preserves:

- the original release
- the corrected patch
- a changelog of added, removed, and relabeled items
- recomputed results when systems need to be compared on the same basis

## Curation is also about finding artifacts

A dataset can look diverse while enabling a trivial shortcut.

Before trusting it, try deliberately weak baselines based on features such as:

- input length
- words or templates correlated with one label
- presence of tool names
- answer position
- accidental metadata
- filename format
- stylistic differences between positive and negative cases

If a cheap heuristic predicts the label, the problem may be the dataset rather than the evaluated system.

Adversarial NLI and Dynabench were motivated in part by the observation that static datasets can contain exploitable patterns and quickly become saturated. Their collection procedures use interaction with models to find examples that break current heuristics.[^anli][^dynabench]

## Reference solutions and solvable tasks

Anthropic recommends unambiguous tasks with a known reference solution that passes the graders. Extremely low pass rates can indicate a broken task or grader rather than only a weak agent.[^anthropic-evals]

That suggests an item admission gate:

```text
source/provenance valid
→ task understandable
→ reference solution exists
→ grader accepts reference
→ no forbidden leakage
→ split assignment valid
→ item versioned
```

A hard case without a verifiable solution is just difficult noise.

## Three design examples

### Case A — Retriever for internal policies

We want to measure whether a retriever finds the correct policy.

Design:

- split by `policy_document_id`, not query
- positives with explicit evidence
- hard negatives with a neighboring but incorrect policy
- fixed corpus snapshot
- visible dev set and a holdout built from documents not used for tuning
- local retrieval metric followed by end-to-end confirmation

When a new policy enters production, record whether it belongs in the next release or in a challenge bank. Do not silently add it to `v1`.

### Case B — Support agent near an eligibility boundary

We want to prevent incorrect approvals near a policy cutoff.

Construct pairs such as:

```text
29 days → allow
31 days → deny
```

Then vary product type, language, and customer history so the system cannot solve the set by memorizing one template.

The hard pair measures sensitivity to the policy boundary. A stratified traffic bank measures general performance. Do not mix those distributions into one percentage without declaring the weights.

### Case C — Coding agent

We want to evaluate repository-level bug fixes.

Leakage risks include:

- related issues from the same repository
- later commits containing the solution
- tests introduced after the task date
- clones or forks placed in different splits

Provenance should therefore include repository, base commit, issue family, date, and test revision. A mutable snapshot of `main` is not a reproducible task.

## Item admission checklist

Before adding a case to an offline release, answer:

1. **Which hypothesis or risk does it cover?**
2. **What is its source/provenance, and are we allowed to use it?**
3. **Which unit must remain grouped to prevent leakage across splits?**
4. **Is there a verifiable reference or success criterion?**
5. **Does the grader accept the reference and reject an obvious failure?**
6. **Is this a normal case, regression, hard negative, or challenge case?**
7. **Has it been used for tuning or inspected during development?**
8. **Which temporal snapshot does it require?**
9. **Which guideline and transform versions produced its label?**
10. **Which item ID and hash let us reconstruct it?**

If we cannot answer question seven, we also cannot claim the case is a clean holdout.

## What to report with an offline result

Do not publish only:

```text
accuracy = 87.4%
```

Attach:

```text
dataset_version / manifest hash
split + access policy
sampling / strata / weights
item count
source snapshot / cutoff
known contamination status
model + workflow + harness + grader revisions
number of trials where relevant
metric definition
excluded / invalid items with reason
```

When comparing two systems, run them on **the same release** unless the purpose is explicitly to study distribution change.

## Production implication

A healthy offline set needs two properties that seem to conflict:

- enough **stability** to catch regressions and compare versions
- enough **change** to absorb new failures, product changes, and benchmark saturation

The answer is not to mutate one file forever. Maintain a family of artifacts with different jobs:

```text
dev / calibration
regression bank
frozen release holdout
rotating challenge bank
```

Each has a purpose, access policy, and identity.

The central principle is:

> **difficulty without provenance is noise; freshness without versioning breaks comparability; a holdout used for optimization stops being a holdout.**

The next chapter adds another source of uncertainty. Even with a well-built dataset, the result still depends on how outputs are judged and how well human and automated graders agree.

## References

[^anthropic-evals]: Anthropic Engineering, *Demystifying evals for AI agents*, 9 Jan 2026. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[^nist-aite]: NIST, *Announcing NIST's Artificial Intelligence Technology Evaluation (AITE)*, 27 Jul 2026. https://www.nist.gov/news-events/news/2026/07/announcing-nists-artificial-intelligence-technology-evaluation-aite
[^dynabench]: Douwe Kiela et al., *Dynabench: Rethinking Benchmarking in NLP*, NAACL 2021. https://aclanthology.org/2021.naacl-main.324/
[^anli]: Yixin Nie et al., *Adversarial NLI: A New Benchmark for Natural Language Understanding*, ACL 2020. https://aclanthology.org/2020.acl-main.441/
[^livebench]: LiveBench project, official repository and release changelog. The benchmark periodically refreshes questions to limit potential contamination. https://github.com/LiveBench/LiveBench
[^hf-load]: Hugging Face Datasets, *Load*. The `revision` parameter can pin a tag, branch, or commit hash. https://huggingface.co/docs/datasets/main/loading
[^hf-fingerprint]: Hugging Face Datasets, *The cache*. Dataset fingerprints track data state and applied transforms. https://huggingface.co/docs/datasets/main/about_cache
[^gpt4-report]: OpenAI, *GPT-4 Technical Report*, 2023. Appendix contamination analysis describes benchmark overlap methodology and contaminated/non-contaminated subsets under the detector. https://cdn.openai.com/papers/gpt-4.pdf
