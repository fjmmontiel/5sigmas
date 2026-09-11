---
title: "Retrieval and context assembly: freshness, relevance, conflict, and grounding"
description: "How to separate candidate retrieval from the policy that decides what evidence enters context, resolve freshness and conflicts, and keep claim-level grounding verifiable."
date: 2026-09-11
date_modified: 2026-09-11
keywords: "retrieval, RAG, context assembly, freshness, relevance, grounding, conflict resolution, hybrid search, context engineering"
tags:
  - AI
  - Agents
  - Context engineering
  - Retrieval
  - RAG
---

# Chapter 4 — Retrieval and context assembly: freshness, relevance, conflict, and grounding

A search system can return the passage **most similar** to the question and still return exactly the evidence the application should not use.

The passage may be stale. It may belong to another tenant. It may describe an older policy. It may conflict with a more authoritative source. Or it may be relevant to the topic without supporting the specific claim the model is about to make.

That is the boundary this chapter teaches:

> **retrieval proposes candidates; context assembly decides what evidence enters; grounding connects claims to the admitted evidence.**

Collapsing those layers makes failures hard to diagnose. `top_k=10` is not a truth policy, and a similarity score does not replace freshness, authority, permissions, or provenance.

{{ include_html("snippets/articulos-tecnicos/context-retrieval-grounding.html") }}

## 1. Retrieval is not context assembly

Let \(q_t\) be a query derived from the current task. A system can generate candidates through several retrievers:

\[
C_t =
R_{\mathrm{lex}}(q_t)
\cup
R_{\mathrm{sem}}(q_t)
\cup
R_{\mathrm{struct}}(q_t)
\]

where:

- \(R_{\mathrm{lex}}\) prioritizes lexical matches, identifiers, and exact terms;
- \(R_{\mathrm{sem}}\) uses vector representations for semantic proximity;
- \(R_{\mathrm{struct}}\) uses structured queries: SQL, metadata filters, graph traversal, APIs, or exact keys.

\(C_t\) is a **candidate set**, not the final context.

A separate assembly policy produces:

\[
A_t =
\pi(
C_t
\mid
\text{scope},
\text{ACL},
\text{freshness},
\text{authority},
\text{conflicts},
B_t
)
\]

where \(B_t\) is the available budget and \(\pi\) is application policy.

These equations are design abstractions. They do not describe a specific API or a provider's internal behavior.

The separation lets us ask three different questions:

1. did we find the evidence we needed?
2. did we admit the right evidence?
3. did generation use and attribute that evidence faithfully?

A single “RAG accuracy” number can hide three completely different failures.

## 2. Lexical, semantic, and structured retrieval solve different problems

Semantic retrieval is useful when intent and vocabulary do not match literally. Lexical retrieval preserves signals an embedding may dilute: error codes, proper nouns, identifiers, exact clauses, or symbols.

Anthropic makes this motivation concrete in its Contextual Retrieval work: it combines embeddings with BM25 and then fuses results. Its experiment is evidence for **that setup**, not proof that one hybrid configuration is universally superior.[^anthropic-contextual]

PostgreSQL documents `ts_rank` and `ts_rank_cd` as lexical ranking functions and explicitly notes that relevance is application-specific and may need additional signals such as document modification time.[^postgres-ranking]

`pgvector` documents vector similarity search and its use alongside PostgreSQL full-text search for hybrid retrieval, including rank fusion or reranking as options.[^pgvector]

The production implication is straightforward:

```text
exact identifier?       lexical may dominate
conceptual paraphrase?  semantic may retrieve better
business state?         structured/live read may be mandatory
mixed query?            several retrievers may generate candidates
```

No retriever turns relevance into authority by itself.

## 3. Fusing rankings does not fuse meaning

Two retrievers may emit incompatible scores.

Cosine similarity, BM25, `ts_rank_cd`, and a reranker score do not necessarily share a scale, distribution, or calibration. Adding them as though they were comparable probabilities creates precision that the system has not earned.

One alternative is to fuse **ranks**. Reciprocal Rank Fusion (RRF), for example, combines lists by each document's rank and does not require the raw relevance indicators to share a scale.[^elastic-rrf] That solves a ranking-combination problem.

It does not answer whether a document:

- is current;
- is visible to the user;
- governs the decision;
- conflicts with another source;
- contains the evidence the answer needs;
- will actually support the model's claims.

That is why `hybrid retrieval` and `context assembly` are not synonyms.

## 4. Relevance is a signal, not truth

A useful candidate record keeps enough metadata to preserve its contract:

```text
evidence_id
source_id
source_type
subject / scope
tenant
source_version
indexed_at
observed_at
valid_from / valid_to
authority_class
retrieval_method
retrieval_rank / score
content
```

Not every system needs every field. The important part is keeping the dimensions distinct.

An assembly policy should be cautious with a function such as:

```text
final_score =
  0.8 * semantic_similarity +
  0.2 * freshness
```

unless those signals are defined, calibrated, and evaluated for the domain.

For consequential decisions, **constraints before preference ranking** is often the safer shape:

```text
1. scope / tenant / ACL
2. validity and version
3. minimum authority for the decision
4. conflict detection
5. relevance / utility inside the eligible set
6. budget and final ordering
```

A forbidden document must not win because its similarity score is exceptional.

## 5. Freshness has at least two clocks

“We indexed it five minutes ago” does not mean “the fact is five minutes old.”

Separate:

```text
SOURCE TIME
when the source was valid / which revision it represents

INDEX TIME
when that revision entered the index
```

You can have:

```text
source: policy@rev-B
indexed copy: policy@rev-A
indexed_at: 10 seconds ago
```

The index is fresh; its content is still stale.

The inverse is also possible: an old document remains the current policy because nothing superseded it.

So **newest timestamp wins** is not a universal rule either.

OpenAI describes a useful operational split in its internal data agent: precomputed, embedded context for retrieval and live warehouse queries when information is stale or missing, so the agent can validate current state.[^openai-data-agent] That is an application design choice, not an automatic property of RAG.

For volatile data, a common pattern is:

```text
retrieve candidate
→ inspect version/freshness requirement
→ if the decision requires current authority:
     read through to source of record
→ assemble with the validated revision
```

## 6. The index needs an invalidation policy

Freshness cannot be solved only at query time. The system also needs a contract for source changes:

```text
source rev A
  ↓ index
chunk e7@A

source changes to rev B
  ↓
e7@A becomes stale
  ↓
reindex / tombstone / version filter / live-read fallback
```

The implementation varies, but the contract should be observable.

Minimum questions include:

- which source revision produced each chunk?
- are deletes or tombstones represented?
- does an update atomically replace all chunks from a document?
- what happens between a source update and index refresh?
- can queries exclude superseded revisions?
- when is a live source read mandatory?

Without those answers, `updated_at` can become decoration.

## 7. Authority is not relevance

Suppose a support agent needs to decide whether a refund is allowed.

It retrieves:

```text
e1 — internal forum
"We usually allow refunds up to 60 days"
high semantic score

e2 — policy rev A
"Refunds up to 30 days"
highly relevant, but superseded

e3 — policy rev B
"Refunds up to 14 days"
current authoritative policy

e4 — order API
purchased_at = 20 days ago
current order state
```

The answer does not come from “pick the closest chunk.”

The policy needs to know that:

- `e3` governs the current rule;
- `e4` governs the current facts about the order;
- `e2` is stale;
- `e1` may help explain the domain but does not authorize the action.

The same pattern appears in permissions, billing, compliance, inventory, feature flags, and any domain with a system of record.

## 8. Conflicts should be explicit objects

Two contradictory candidates should not disappear inside an average score.

First decide whether there is a real conflict:

```text
same subject?
same field / proposition?
overlapping validity interval?
same decision scope?
```

Then keep a **conflict set**:

```text
conflict_id = c17
proposition = refund_window_days
evidence = [e2@revA, e3@revB]
resolution =
  superseded(e2, by=e3)
```

Another conflict may remain:

```text
conflict_id = c18
evidence = [e11, e19]
resolution = unresolved
```

`unresolved` is a valid system state.

The policy can then:

- admit the winning evidence while preserving the resolution provenance;
- keep both perspectives when time or scope makes them compatible;
- request a fresh read;
- abstain;
- escalate to human review.

Do not force the model to “pick something” when the system cannot justify the choice.

## 9. The model should not silently own authority resolution

You can tell a model to “prefer official documentation,” but that is not a substitute for application enforcement.

The model sees text. The application knows — or should know — permissions, tenant, source IDs, revisions, ACLs, and contracts.

A more robust boundary is:

```text
retrieval layer
  generates candidates

assembly layer
  enforces machine-checkable constraints
  represents unresolved conflicts

model
  reasons over admitted evidence
  may explain uncertainty
```

A model can help classify or rerank. The application remains responsible for not turning that judgment into invisible authority.

## 10. What current APIs provide — and what they do not

OpenAI Vector Store Search can retrieve relevant chunks with attribute filters, a maximum result count, ranking options, and query rewriting. Its response includes content, attributes, and a similarity score.[^openai-vector-search]

That is a **managed retrieval capability**. The score does not certify freshness or truth, and the application still has to define what attributes mean, which source is authoritative, and whether a revision is still valid.

Google Agent Search can return `groundingChunks` and `groundingSupports` that associate response segments with retrieved sources. Its documentation also notes that grounding metadata can be absent, for example when source relevance is insufficient.[^google-grounding]

That is a **grounding-service capability**. It does not prove every claim true, and it does not replace domain-specific conflict policy.

Anthropic Contextual Retrieval illustrates a different boundary: improve candidate retrieval through chunk context, lexical search, embeddings, and reranking.[^anthropic-contextual] It still does not turn candidate relevance into business authority.

## 11. Grounding starts after retrieval

For this chapter, use an operational definition:

> a claim is grounded when there is a verifiable relationship between that claim and admitted evidence that actually supports it.

Represent it as:

\[
g_j:
\quad
\text{claim}_j
\rightarrow
E_j
\subseteq
A_t
\]

where \(E_j\) contains the evidence IDs that support the claim.

This is stronger than:

```text
answer has citations
```

because a citation can:

- point to a source that does not support the claim;
- cover only part of a sentence;
- refer to a retrieved document that was not actually used;
- hide relevant contradictory evidence.

Recent academic work studies exactly this gap between generating references and verifying claim-level support. We should not assume that “RAG + citations” automatically yields faithful attribution.[^reclaim]

## 12. Build context as an evidence packet

In production, the model should often receive something more structured than concatenated chunks:

```text
EVIDENCE PACKET

e7
source = policy
version = rev-B
authority = authoritative
valid_from = 2026-09-01
retrieved_by = lexical + semantic
text = ...

e12
source = order_api
observed_at = 2026-09-11T19:05Z
authority = authoritative-live
text = ...

conflicts = []
```

If uncertainty remains:

```text
conflict c18
e11 contradicts e19
resolution = unresolved
required_behavior = abstain_or_escalate
```

The representation can be JSON, internal objects, or structured text. The important contract is that identity and metadata survive through generation and evaluation.

## 13. Context ordering is also a decision

After filtering and conflict resolution, the assembler still has to decide **what enters and in what order**.

Under budget \(B_t\), it may need to:

- deduplicate overlapping chunks;
- group evidence about the same proposition;
- retain the smallest span that preserves support;
- keep revision or date next to the content;
- reserve room for relevant counterevidence;
- avoid displacing one authoritative source with ten redundant low-authority chunks.

Chapter 3.2 covered compaction and budget. The additional constraint here is that budget optimization happens **after preserving the evidence contract**.

Compressing five conflicting chunks into one sentence without provenance may save tokens while destroying the information that mattered most.

## 14. Worked example: a policy changed today

Question:

```text
"Can I refund this order?"
```

Candidate generation finds:

```text
lexical
  e2 policy rev-A

semantic
  e1 forum explanation
  e3 policy rev-B

structured
  e4 order_api live state
```

Assembly:

```text
scope / ACL        PASS all
freshness          e2 = STALE
authority          e3 policy > e1 forum
live state         e4 authoritative for order facts
conflict           rev-A vs rev-B resolved by supersession
budget             keep e3 + e4; e1 optional explanation
```

Evidence packet:

```text
A_t = [e3, e4]
```

Generation:

```text
claim c1:
"The current limit is 14 days."
grounded_by = [e3]

claim c2:
"This order is 20 days old."
grounded_by = [e4]

claim c3:
"It is not eligible under the current policy."
grounded_by = [e3, e4]
```

Now each layer is debuggable.

If `e3` never appeared, retrieval failed.

If it appeared but `e2` won, assembly/freshness failed.

If `e3` and `e4` entered context but the model said 30 days, generation/grounding failed.

That is the practical reason not to call the whole mechanism “RAG.”

## 15. Evaluate retrieval, assembly, and grounding separately

### Candidate retrieval

Measure whether required evidence appears in the candidate set:

- recall@k over relevant evidence IDs;
- exact-identifier coverage;
- recall by query type;
- candidates later rejected by ACL/scope;
- latency and cost per retriever.

A reranker can only reorder candidates it received. It cannot recover evidence that never entered its candidate set.

### Assembly

Measure the policy itself:

- **stale admission rate**: stale evidence that reached context;
- **authority error rate**: a lower-authority source displaced the governing one;
- **conflict detection recall**;
- **conflict resolution accuracy**;
- **ACL/scope violation rate**;
- **evidence redundancy** under the budget;
- **required-evidence retention** after deduplication or compaction.

### Grounding

Evaluate generation against the evidence packet:

- share of material claims with support;
- citation precision: the cited source actually supports the claim;
- citation completeness: claims that require evidence but lack it;
- unsupported-claim rate;
- contradiction-with-evidence rate;
- correct abstention behavior when `conflict = unresolved`.

Do not collapse these numbers into one metric before knowing which failure you need to catch.

## 16. What to trace for a debuggable turn

A useful trace should let you reconstruct:

```text
query / task
retriever configs + versions
candidate IDs + raw ranks/scores
filters / ACL decisions
source versions + freshness checks
conflict groups + resolution reason
final evidence IDs + order
model / prompt / context version
generated claim → evidence links
abstain / escalation decision
```

Sensitive content does not need to be retained indefinitely. Hashes, IDs, or minimized metadata may be enough under the privacy policy.

But if the system stores only the final answer, it cannot tell whether it:

- never retrieved the correct source;
- dropped it because of a broken filter;
- admitted a stale revision;
- resolved a conflict incorrectly;
- or generated an unsupported claim despite good evidence.

## 17. Production implication: retrieve wide, assemble narrow

A robust architecture does not begin with “which vector database should we use?” before defining the evidence contract.

It asks:

```text
CANDIDATES
which retrievers maximize recall for our queries?

ELIGIBILITY
which scope, ACL, and versions may enter?

FRESHNESS
what needs live validation?

AUTHORITY
which source governs each decision?

CONFLICT
how do we represent supersession and uncertainty?

BUDGET
what is the minimum evidence that preserves support?

GROUNDING
how do we bind each claim to evidence IDs?

EVALS
which layer failed when the answer was wrong?
```

Retrieval may be managed by a provider, a search engine, or application code. The **operational truth contract** still belongs to the application.

The rule connecting this chapter to the previous ones is:

```text
relevance
≠ freshness
≠ authority
≠ permission
≠ grounding
```

A reliable system preserves those distinctions all the way to the answer.

## References

[^anthropic-contextual]: Anthropic Engineering — *Introducing Contextual Retrieval* (2024-09-19). https://www.anthropic.com/engineering/contextual-retrieval
[^openai-vector-search]: OpenAI API Reference — *Search vector store*. https://developers.openai.com/api/reference/python/resources/vector_stores/methods/search
[^openai-data-agent]: OpenAI Engineering — *Inside OpenAI’s in-house data agent* (2026-01-29). https://openai.com/index/inside-our-in-house-data-agent/
[^postgres-ranking]: PostgreSQL 17 Documentation — *Controlling Text Search / Ranking Search Results*. https://www.postgresql.org/docs/17/textsearch-controls.html
[^pgvector]: pgvector official repository — vector similarity and hybrid search documentation. https://github.com/pgvector/pgvector
[^elastic-rrf]: Elasticsearch Reference — *Reciprocal rank fusion*. https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion
[^google-grounding]: Google Cloud — *Grounding with Agent Search*, including grounding chunks/supports and response metadata. https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/grounding/grounding-with-vertex-ai-search
[^reclaim]: Xia et al. — *Ground Every Sentence: Improving Retrieval-Augmented LLMs with Interleaved Reference-Claim Generation*, Findings of NAACL 2025. https://aclanthology.org/2025.findings-naacl.55/
