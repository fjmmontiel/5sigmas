---
title: "Specs and planning in coding agents: turning a request into a verifiable task contract"
description: "How to separate requests, persistent instructions, specs, plans, task graphs, and checkpoints so a coding agent can replan without silently changing the goal or claiming success without evidence."
date: 2026-09-10
date_modified: 2026-09-10
keywords: "coding agents, task specification, agent planning, task decomposition, checkpoints, agent harness, acceptance criteria"
tags:
  - AI
  - Agents
  - Software
  - Coding agents
  - Planning
  - Evaluation
---

# Chapter 3 — Specs, planning, task decomposition, checkpoints, and task contracts

A coding agent can execute hundreds of locally correct steps and still solve **the wrong task**.

The failure often starts before any code is written. A request such as “add JSON output to `users list`” does not necessarily say which existing behavior must remain unchanged, which files are in scope, what observable cases define success, which decisions require a handback, or which repository revision must be verified before delivery.

Turning the request into a long TODO list does not solve that problem. A list organizes work. By itself, it does not define **what correct completion means**.

This chapter separates seven objects:

1. **request**: what the user wants to achieve
2. **persistent instructions**: repository and environment rules that apply across tasks
3. **task contract or spec**: expected outcome, scope, constraints, and observable acceptance criteria
4. **plan**: the current hypothesis for reaching that outcome
5. **task graph**: dependencies and verifiable work units inside the plan
6. **checkpoint**: recoverable state plus the evidence attached to a particular point in the trajectory
7. **completion evidence**: proof that the contract holds on an identifiable code state

They are not synonyms. Keeping them separate tells the harness whether it should **replan**, **request a decision**, **rerun verification**, or **declare the task complete**.

{{ include_html("snippets/articulos-tecnicos/coding-agent-task-contract.html") }}

## A request is not yet a contract

Human requests usually express intent rather than every invariant an autonomous run needs.

```text
Add --json to `acme users list`.
```

Before mutating the repository, a harness should be able to turn that intent into something more testable. For example:

```yaml
task_id: CA-203
contract_version: 1
base_sha: 8f2c...91a
integration_target: main

goal:
  acme users list --json emits a documented JSON representation

in_scope:
  - command parser
  - output serialization
  - CLI tests
  - flag documentation

out_of_scope:
  - changing the default text output
  - changing the remote API protocol
  - upgrading dependencies without a demonstrated need

acceptance:
  - `acme users list` preserves its existing behavior
  - `acme users list --json` emits valid JSON with the documented schema
  - invalid flag combinations follow the CLI's existing error convention
  - focused tests and the relevant integration suite pass

stop_if:
  - the public schema requires a product decision the contract does not resolve
```

This YAML is **an illustrative harness contract, not an industry standard**. The useful properties are the observable goal, positive and negative scope, constraints, revision identity, verification requirements, and stop conditions.

The contract answers **what must be true when the task is complete**. The plan answers **what we currently believe we need to do to make it true**.

## Persistent instructions and a task spec solve different problems

Agentic repositories can carry persistent guidance in `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, or equivalent mechanisms.

OpenAI documents that Codex reads `AGENTS.md` before it starts work and builds an instruction chain from global guidance through rules closer to the active directory.[^openai-agents-md] GitHub similarly describes repository custom instructions as persistent context for repository structure, standards, and build or test workflows.[^github-custom-instructions]

That kind of file is a good home for rules such as:

```text
- use pnpm, not npm
- run make lint before delivery
- do not rewrite existing migrations
- HTTP handlers live under services/api/
```

It should not become a hiding place for the outcome of one task:

```text
- today, add --json to users list
```

The operational distinction is simple:

| Object | Typical lifetime | Question it answers |
|---|---|---|
| Persistent instruction | many tasks | How should work be done correctly in this repository? |
| Task contract | one task plus its amendments | What outcome must this trajectory produce? |
| Plan | one version of the strategy | What sequence do we currently think will produce that outcome? |

If a stable repository convention changes, update the persistent instruction. If the requested outcome changes, **version or amend the task contract**. If you merely discover that the relevant implementation lives in another module, you usually need a new plan, not a new contract.

## A plan is a hypothesis, not the authority for the task

Current coding agents expose planning as an explicit operating mode. The official Codex Plan Mode template allows non-mutating actions to gather evidence and asks for a decision-complete plan for later implementation while disallowing repository mutations during that phase.[^codex-plan] Claude Code also documents Plan Mode as a way to research and propose changes before editing source code.[^claude-plan]

That separates two activities that are easy to blur together:

```text
observe the repository → form a strategy
                       ≠
                  execute changes
```

A detailed plan can still become wrong after the first command.

Suppose the initial plan says:

```text
1. add --json to the parser
2. reuse User.to_dict()
3. add tests
```

Repository inspection then reveals that `User.to_dict()` exposes an internal field that must not become part of the public CLI schema. The right response is not “follow the approved plan anyway.” It is to **replan without silently changing the contract**:

```text
contract v1: unchanged
plan v2:
1. add --json to the parser
2. add a public serializer containing only the accepted fields
3. add schema tests and a regression test for text mode
```

`acceptance + constraints + scope` remain authoritative. The plan is the mutable strategy used to satisfy them.

## Replanning does not authorize redefining success

This boundary prevents specification drift.

Imagine a compatibility test fails because the agent accidentally changed the default text output. There are two possible responses:

```text
A) repair the implementation until compatibility is restored
B) edit the acceptance criterion so the change becomes allowed
```

A is replanning or repair. B is **a task-contract amendment** and needs a valid authority source: the user, an updated issue, a product decision, or whatever mechanism the system has defined for changing requirements.

A fail-closed harness should be able to record something like:

```json
{
  "task_contract_version": 1,
  "plan_version": 3,
  "reason_for_replan": "existing serializer exposes an internal field",
  "acceptance_changed": false
}
```

If `acceptance_changed=true`, verification and checkpoints tied to the previous contract version no longer prove the amended contract until the affected evidence is reevaluated.

## The task contract can become stale too

Versioning the plan is not enough. The source of the requirements can change during a long-running task.

GitHub documents a concrete example for Copilot cloud agent: when an issue is assigned, the agent receives the title, description, and comments that exist **at assignment time**. It does not automatically receive later issue comments, so follow-up information needs to be supplied on the pull request.[^github-task]

The general lesson is not that every GitHub agent has the same behavior. It is that a harness must know **which requirements snapshot it consumed**.

A useful record might include:

```text
requirements_source = issue#842
requirements_revision = issue_body_hash + last_consumed_comment_id
contract_version = 4
```

When that source changes, the system should explicitly determine whether the change:

- does not affect the task
- requires a contract amendment
- invalidates part of the plan
- invalidates verification already performed
- or requires a handback before work can continue

Without that reconciliation, an agent can finish perfectly against a requirements version that is no longer current.

## Task decomposition: a list is not yet a graph

Splitting “add `--json`” into five bullets looks like planning, but it does not tell us what can run in parallel or which evidence enables the next step.

A more useful decomposition makes dependencies explicit:

```text
A  inspect parser, output contract, and error conventions
│
├── B  implement --json parsing
└── C  implement the public serializer
     │
B + C ──> D  CLI and schema tests
B + C ──> E  documentation
D + E ──> F  integrated verification
```

A flat checklist hides several facts that the graph exposes:

- B and C depend on what A discovered
- D depends on the combined behavior of B and C
- F cannot begin merely because “5/6 tasks are done”
- if C changes the schema after D passes, D is stale
- parallelizing B and C is safe only when they do not contend for the same mutable state or unresolved contract decision

The goal of decomposition is not to maximize the number of subagents. It is to create **work boundaries with understandable inputs, outputs, and verification**.

## What a work node should carry

A sufficiently explicit node can look like this:

```yaml
node_id: D
purpose: verify the observable JSON CLI contract
inputs:
  - parser with --json support
  - public serializer
preconditions:
  - B PASS
  - C PASS
expected_outputs:
  - text-mode regression tests
  - JSON schema tests
verification:
  - pytest tests/cli/users_list.py
invalidates_if:
  - relevant parser changes
  - public serializer changes
```

Again, this is not a standard format. It makes a more important property visible: **evidence has dependencies**.

A PASS should not live forever as a boolean. It should be tied to the code and inputs it actually verified.

## “Checkpoint” does not mean the same thing in every harness

“We have checkpoints” can describe materially different capabilities.

Claude Code documents checkpointing that automatically captures code state before each user prompt and tracks changes made through its file-editing tools. It lets users restore code and conversation independently. Its documentation also names important limits: changes made through Bash commands and concurrent external modifications are not covered in the same way, and checkpointing is not a replacement for Git.[^claude-checkpoint]

Gemini CLI documents a different mechanism. When its checkpointing is enabled, it creates a snapshot using a shadow Git repository before AI file modifications and also records associated conversation and tool state for restoration.[^gemini-checkpoint]

Those descriptions do not conflict. **They describe different checkpoint scopes.**

A production system therefore should not record only:

```text
checkpoint = true
```

It should be able to answer:

```text
which filesystem state was captured?
which changes were excluded?
which HEAD and workspace does the checkpoint belong to?
which external processes or services were still alive?
which contract and plan versions were active?
which verification results had passed, and on which SHA?
```

## A useful checkpoint needs identity and limits

Building on the previous chapter, a recoverable checkpoint might store:

```yaml
checkpoint_id: cp-17
task_contract_version: 1
plan_version: 2
base_sha: 8f2c...91a
current_head_sha: 41ba...1fd
workspace_id: wt-CA-203
completed_nodes: [A, B, C]
open_assumptions:
  - public JSON fields match the existing documentation
verification_results:
  - command: pytest tests/cli/users_list.py
    verification_head_sha: 41ba...1fd
    exit_code: 0
uncommitted_state_inventory: captured
external_effects:
  - test_db_namespace: ca203
next_node: D
```

A safe resume does not simply “continue the chat.” It first reconciles that record with the current environment.

If `current_head_sha` changed, the worktree disappeared, or the sandbox policy changed, parts of the checkpoint may still be useful context, but **they no longer prove causal continuity**.

## Checkpoints need invalidation rules too

A long trajectory accumulates results:

```text
lint PASS
unit tests PASS
integration tests PASS
manual review PASS
```

The difficulty is that the code can change after each PASS.

The minimum useful model is:

```text
verification_result = (check, inputs, environment, verification_head_sha, outcome)
```

When a later change touches inputs that can affect a check, that result becomes stale until it is rerun or a deterministic rule proves that the previous evidence still applies.

There is no need to rerun every check after every character. There is a need for an explicit **dependency and invalidation policy** instead of collecting green checks from different code states and calling the aggregate “done.”

## Stop conditions: when autonomy should stop

A good contract does more than list allowed actions. It identifies situations where continuing would require the agent to invent a decision.

For example:

```text
STOP if the change requires choosing an unspecified public schema
STOP if completing the task requires expanding into a service the contract excludes
STOP if a migration would require deleting real data
STOP if the integration target advances in a way that invalidates a design premise
STOP if required verification cannot be run with reliable evidence
```

A stop condition is not the agent “giving up.” It is an authority boundary.

The handback should carry enough evidence for someone to resolve it:

```text
what was discovered
which part of the contract is blocked
which concrete alternatives exist
which workspace state is being preserved
which minimum decision allows work to continue
```

## Completion: finishing plan nodes is not finishing the task

The harness should evaluate the original contract against the final state. It should not infer success from plan progress.

A useful completion record can look like this:

```yaml
task_id: CA-203
contract_version: 1
final_head_sha: 7ea1...0bc
verification_head_sha: 7ea1...0bc
acceptance:
  default_text_behavior: PASS
  json_schema: PASS
  invalid_flag_behavior: PASS
  integration_suite: PASS
scope_review: PASS
unresolved_stop_conditions: []
cleanup_state: complete
```

Two invariants matter:

1. **every acceptance criterion has evidence**, not merely a model assertion
2. **`verification_head_sha` matches the delivered code**, unless there is a deterministic explanation for why earlier evidence remains valid

That blocks the familiar pattern “tests passed, then I made one tiny final change, then I declared the task done.”

## How the seven objects fit together

The state machine can be summarized as:

```text
REQUEST + PERSISTENT INSTRUCTIONS + OBSERVED REPOSITORY
                         │
                         ▼
                    TASK CONTRACT vN
             goal · scope · acceptance
                constraints · stop rules
                         │
                         ▼
                    PLAN / GRAPH vM
                         │
                  execute + observe
                         │
             ┌───────────┴───────────┐
             │                       │
      assumption invalid       criterion ambiguous
             │                       │
           REPLAN                 HANDBACK /
      contract unchanged       CONTRACT AMENDMENT
             │                       │
             └───────────┬───────────┘
                         ▼
                  VERIFY + CHECKPOINT
                         │
                all acceptance met
          with evidence on final head?
                   │             │
                  yes            no
                   │             │
                 DONE       continue/block
```

Each transition should have an observable reason. The agent can change strategy many times without changing the meaning of success.

## What to record in production

At minimum:

```text
task_id
requirements_source + revision
repository_id
base_sha
integration_target
task_contract_version
plan_version
node/dependency state
open assumptions
workspace_id
sandbox/policy identity
checkpoint_id + checkpoint scope
verification results + verification_head_sha
contract amendments
stop/handback decisions
final_head_sha
cleanup_state
```

You do not have to expose all of those fields to the user. You do need enough durable state to answer four questions later:

- What exactly was requested?
- What did the agent assume, and what did it discover?
- Which code state did each PASS verify?
- Why did the system continue, stop, or declare completion?

## Production implication

The quality of a coding-agent plan should not be measured by the length of its step list.

A reliable harness needs to hold two properties at once:

- **goal stability**: contract, scope, and acceptance do not change merely because implementation becomes inconvenient
- **strategy plasticity**: plan, ordering, and decomposition do change when new evidence falsifies an assumption

Checkpoints make that trajectory recoverable only when their scope is explicit. Verifiers make progress attributable only when their outcomes are bound to the state they actually checked.

That turns “do this task” into an execution that can be inspected, resumed, and audited without trusting the model to remember what it originally meant to do.

## What to remember

- A request expresses intent. A task contract turns that intent into observable completion conditions.
- Persistent repository instructions define how work should be done. They do not replace the spec for one task.
- A plan is a revisable hypothesis. The task contract remains the authority for success until an authorized source amends it.
- Replanning does not permit silently weakening acceptance criteria or expanding scope.
- A checklist does not express dependencies. A task graph can bind inputs, outputs, preconditions, and invalidation.
- A checkpoint is useful only when its scope and exclusions are known.
- Product checkpointing, Git state, and external state can cover different surfaces.
- A PASS must be bound to the inputs and `verification_head_sha` it actually checked.
- Completing every plan node does not prove the task contract is satisfied.
- Stop conditions and handback are authority boundaries, not failures of autonomy.

## References

[^openai-agents-md]: OpenAI, [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md). Documents persistent instructions loaded before work, global/project hierarchy, and directory-level precedence.
[^codex-plan]: OpenAI, [Codex `plan.md`](https://github.com/openai/codex/blob/main/codex-rs/collaboration-mode-templates/templates/plan.md). Official Plan Mode template that allows non-mutating investigation to reduce ambiguity and separates planning from repository mutation.
[^claude-plan]: Anthropic, [Permission modes](https://code.claude.com/docs/en/permission-modes). Documents Plan Mode as a research/proposal phase before source-code edits.
[^claude-checkpoint]: Anthropic, [Checkpointing](https://code.claude.com/docs/en/checkpointing). Documents snapshots and restoration plus important limits, including changes made through Bash and external modifications, and states that checkpointing is not a replacement for version control.
[^github-task]: GitHub, [Kick off a task with Copilot agents on GitHub](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/kick-off-a-task). Documents which issue information is supplied at assignment time and that later issue comments are not automatically included in that assignment.
[^github-custom-instructions]: GitHub, [Customize Copilot](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-copilot-overview). Describes persistent custom instructions for repository structure, standards, and workflows.
[^gemini-checkpoint]: Google, [Checkpointing — Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/cli/checkpointing.html). Documents local shadow-Git snapshots and restoration state associated with AI file modifications.