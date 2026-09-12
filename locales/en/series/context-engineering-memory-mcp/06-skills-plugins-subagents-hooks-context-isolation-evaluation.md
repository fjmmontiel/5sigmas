---
title: "Skills, plugins, subagents, and hooks: context isolation, authority, and evaluation"
description: "How to separate capability packaging, context loading, delegation, hooks, and isolation in agent systems; what authority each primitive inherits and how to evaluate it without mistaking extensibility for security."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "agent skills, plugins, subagents, hooks, context isolation, delegation, permissions, evaluation, agent harness"
tags:
  - AI
  - Agents
  - Context engineering
  - Security
  - Evaluation
---

# Chapter 6 — Skills, plugins, subagents, and hooks: context isolation, authority, and evaluation

An agent system can load a skill, install a plugin, delegate work to a subagent, and run hooks across its lifecycle. It is tempting to group all four under “agent extensions.” Operationally, they solve different problems.

The useful separation is this:

> **Packaging a capability, loading information into context, executing work in another agent, and granting authority are different decisions.**

A skill can add instructions without creating an isolated process. A plugin can package a skill, an agent, hooks, or integrations. A subagent can have its own model context while still inheriting tools or local application state. A hook can be deterministic and, precisely because it executes code outside the model’s normal choice, expand the trust surface.

{{ include_html("snippets/articulos-tecnicos/context-extension-isolation-lifecycle.html") }}

## 1. Four primitives, four different questions

There is no universal semantics for `skill`, `plugin`, `subagent`, or `hook` across products. Start with the function each one performs in a specific implementation.

| Primitive | Primary question | What it does not prove on its own |
|---|---|---|
| **Skill** | What reusable knowledge, instructions, or procedure can the agent load? | isolation, permission to act, execution identity |
| **Plugin** | How is a bundle of capabilities packaged and distributed? | sandboxing, least privilege, separate context |
| **Subagent** | What work is delegated to another agent execution, and what returns to the parent? | isolated filesystem, reduced toolset, independent memory |
| **Hook** | What logic runs when a lifecycle event occurs? | automatic safety, idempotency, absence of side effects |

The recurring mistake is to turn a product label into an architectural property. The real question is always: **what context, capabilities, state, and authority exist at runtime?**

## 2. A skill is reusable expertise, not a security boundary

Anthropic Agent Skills provides a current, concrete example. A skill is a directory containing `SKILL.md`, instructions, and optionally code and reference material. The mechanism uses **progressive disclosure**: discovery metadata can be available before the full skill content is loaded, and additional material is brought in when the task needs it.[^anthropic-skills]

That solves a context problem:

```text
skill catalog
    ↓ small metadata
match against task
    ↓ activation
needed instructions + references
    ↓
effective agent context
```

It does not automatically solve an authority problem.

Anthropic’s own Skill surfaces demonstrate why. In the Claude API, Skills run through the code-execution environment and the current documentation states that this environment has no network access and no runtime package installation. In Claude Code, filesystem-based skills execute in the local environment and can have the same network access as other programs on the machine, subject to Claude Code controls.[^anthropic-skills]

Therefore:

```text
skill identity ≠ execution boundary
skill loaded ≠ action authorized
```

The primitive has the same name. Its execution domain does not.

## 3. Progressive disclosure lowers initial context cost, not activation cost to zero

A skill must be discoverable before it can be selected. That creates two different costs:

```text
C_discovery = metadata visible for routing
C_active    = instructions + references actually loaded
```

The design goal is usually `C_discovery << C_active`, but a large library still needs a sufficiently precise discovery policy.

Two failure modes matter in particular:

1. **under-triggering**: the right skill exists but is not activated;
2. **over-triggering**: an irrelevant skill activates and consumes context or introduces unnecessary instructions.

A skill evaluation therefore cannot stop at “the skill gives a good answer when manually invoked.” It must also measure **selection and activation**.

## 4. A plugin is usually a packaging boundary, not one execution primitive

`Plugin` is even more product-dependent.

In ChatGPT and Codex, OpenAI’s current documentation describes a plugin as a packaged workflow capability. A plugin can contain **skills**, **apps**, and **app templates**. Apps remain the integrations that connect to external data and actions, and their authentication and permissions stay attached to that layer. Installing the plugin does not manufacture new permission over the connected system.[^openai-plugins]

Claude Code uses the same word for a different composite package. Its current plugin reference can distribute **skills, agents, hooks, MCP servers, LSP servers, and monitors** inside one plugin.[^claude-plugins]

Those definitions support one general conclusion, not one general API:

> **A plugin describes distribution and composition. Effective authority comes from the included components and the runtime where they are enabled.**

Do not write rules such as `plugin = tool` or `plugin = sandbox`. Inspect the manifest and the actual capabilities.

## 5. Installing an extension is not the same as granting all of its dependencies

A robust architecture separates at least these decisions:

```text
INSTALL
may this package exist in the workspace?

DISCOVER
what components does it advertise?

ENABLE
which components are visible in this run?

AUTHORIZE
what may this principal do to this resource?

APPROVE
is this specific effect acceptable now?
```

In OpenAI’s current plugin model, an extension may depend on an app or app template that still requires configuration, publication, OAuth, and access assignment. A user who cannot access a repository, record, workspace, or channel in the connected system should not gain that access through the plugin.[^openai-plugins]

The distribution boundary does not replace the identity boundary.

## 6. A subagent is delegation; isolation must be checked one dimension at a time

Subagents are useful for reducing task interference, specializing instructions, or running work in parallel. But “another agent” does not automatically mean “another sandbox.”

Claude Code makes that explicit. A subagent can configure its model, tools, skills, memory, and `isolation`. If `tools` is omitted, the subagent **inherits all tools available to the main conversation**. Repository isolation through a worktree only appears when `isolation: worktree` is configured.[^claude-subagents]

That yields an important invariant:

```text
new model context ≠ reduced tool authority
new agent identity ≠ isolated filesystem
```

A subagent can have a separate context window while retaining a dangerous inherited capability.

## 7. Handoff and agent-as-tool are not the same composition pattern

OpenAI Agents SDK distinguishes two multi-agent patterns.[^openai-agents]

**Manager / agent as tool**:

```text
parent agent
  ↓ invokes specialist as a tool
specialist work
  ↓ structured result
parent retains control
```

**Handoff**:

```text
current agent
  ↓ transfers the conversation
specialist becomes the active agent
```

That difference changes both context and policy. In the current handoff implementation, the receiving agent gets the full conversation history by default. `input_filter` can reduce or transform what is forwarded.[^openai-handoffs]

Creating a specialist therefore does not itself reduce data exposure. You need an explicit **delegation envelope**.

## 8. The delegation envelope should be a contract, not a free-form prompt

A reproducible delegation can be represented as:

```text
D = (
  goal,
  constraints,
  allowed_context,
  allowed_capabilities,
  workspace,
  budget,
  output_schema,
  provenance_requirements
)
```

The parent should be able to answer:

```text
what information did the child receive?
which tools could it see?
which filesystem, network, and secrets could it reach?
which state could it mutate?
what result did it return?
what evidence supports that result?
```

A prose summary from the subagent is not enough when the parent must verify a decision or continue durable work.

## 9. “Context isolation” is at least six different boundaries

The word `isolation` should be decomposed.

### 9.1 Model context

Which messages, instructions, tool results, and documents reach the child model.

### 9.2 Local application state

Which in-memory objects the runtime shares outside the model.

OpenAI Agents SDK, for example, documents that its local `context` object is not sent to the LLM. Within a run, however, derived wrappers share the same underlying application context, and nested `Agent.as_tool()` runs do not receive an isolated copy by default.[^openai-context]

### 9.3 Workspace/filesystem

Which files the worker can read or modify. A worktree can isolate Git changes without necessarily isolating `$HOME`, credentials, or network access.

### 9.4 Tools and credentials

Which operations exist in the tool catalog and which principal or secret is used to execute them.

### 9.5 Network

Which destinations the process or sandbox can reach.

### 9.6 Persistent memory

What the component can read or write across sessions and which deletion and provenance policies apply.

Any claim that a subagent is “isolated” should name which of these six boundaries are actually separated.

## 10. Hooks are lifecycle control outside normal model choice

Hooks execute logic when a runtime event occurs. Claude Code documents hooks for tasks such as validating commands, formatting code, sending notifications, and enforcing project rules.[^claude-hooks-guide]

Their main value is that a deterministic rule does not depend on the model remembering to call a tool:

```text
model proposes Write
       ↓
PreToolUse hook / permission policy
       ↓ allow | ask | deny
actual tool execution
       ↓
PostToolUse hook
```

Blocking and asynchronous hooks are not equivalent. The current Claude Code reference states that an async hook continues in the background and cannot block or alter an action that has already happened.[^claude-hooks]

So:

```text
observability hook after action ≠ preventive control before action
```

## 11. A hook can be a guardrail or a new execution surface

“Deterministic” does not mean “safe.”

Anthropic published a 2026 engineering analysis describing vulnerabilities where project configuration could cause hooks to execute before the user had accepted trust for a directory. The fix was to defer parsing and execution of project-local configuration until after the trust prompt.[^anthropic-containment]

The lesson is broader than Claude Code:

> **Loading executable configuration from an untrusted workspace already crosses a trust boundary.**

A hook that executes shell can have more effective authority than the model it is intended to constrain. Evaluate origin, versioning, environment, secrets, filesystem access, and network access as you would for any other code.

## 12. Policy order matters: visibility, permission, and hook logic are not interchangeable

Claude Code’s current permission documentation defines a concrete evaluation order. Hooks may block or influence evaluation, deny rules retain precedence, and an `allow` result from a hook does not skip later permission rules.[^claude-permissions]

OpenAI Agents SDK uses a different pipeline. Tool guardrails wrap function tools before and after execution, while handoffs use a separate path and do not automatically inherit those tool guardrails.[^openai-guardrails]

Do not generalize one framework’s control order to another. Document the exact runtime pipeline you deploy.

## 13. Context filtering is not authorization

Reducing context and reducing capabilities are complementary controls.

```text
input_filter
  ↓
less information visible to the specialist

capability/tool filter
  ↓
fewer operations exposed

authorization in tool/server
  ↓
fewer effects permitted on real resources
```

In OpenAI Agents SDK, `input_filter` controls what history reaches a handoff. Tool and MCP filters control visibility, but the context documentation explicitly separates visibility from authorization of model-generated arguments and from authorization enforced by protected downstream systems.[^openai-context][^openai-mcp]

A robust policy uses all three layers.

## 14. Subagent results should return with enough provenance to be checked

If a specialist returns only:

```text
"everything looks good"
```

the parent does not know:

- which repository version was inspected;
- which tests ran;
- which sources were read;
- which warnings were ignored;
- whether the child workspace diverged;
- which side effects occurred.

A useful return envelope should be structured:

```text
result
candidate_sha / data_version
evidence_ids
checks_run
unresolved_items
side_effects
workspace_or_session_id
```

This connects directly to Chapters 3.2–3.4: a subagent output returns as **candidate evidence**, not automatically as authoritative truth.

## 15. Plugins and skills are also prompt-injection boundaries

An extension may introduce instructions, references, code, or third-party integrations. Provenance still matters after installation.

Record at least:

```text
package / skill id
version or content hash
publisher/source
installation scope
loaded files
requested capabilities
runtime surface
```

If a skill reads external content, that content remains untrusted. If a plugin ships hooks, the risk includes local code execution. If it includes an app or MCP server, it adds another authorization boundary.

`installed` should never silently become `trusted for every task`.

## 16. Evaluating skills: selection, loading, quality, and contamination

A skill eval set needs both positive and negative cases.

Measure at least:

```text
activation_recall
activation_precision
context_bytes_or_tokens_loaded
success_given_correct_activation
false_activation_side_effects
instruction_conflict_rate
```

Hard negatives matter: tasks that look semantically similar but should not activate the skill.

For skills that execute code, add tests for the actual runtime: filesystem, network, installed packages, and permission boundaries.

## 17. Evaluating plugins: installation and dependency graphs are part of the system

A unit test of one component does not certify the full plugin.

Test:

```text
manifest parsing
version pin / update path
missing dependency
permission downgrade
unauthorized user
revoked OAuth/app access
malicious or stale packaged instructions
component name collision
rollback/uninstall
```

A composite plugin should be evaluated as a dependency graph, not as one capability.

## 18. Evaluating subagents: delegation quality and isolation are separate axes

Evaluation needs two independent questions.

### Was delegation correct?

- the right specialist was selected;
- the delegation envelope was sufficient;
- duplicate work was avoided;
- handback happened when authority was missing;
- the child returned usable evidence.

### Was isolation real?

- forbidden history was not forwarded;
- tools outside the allowlist were not visible;
- paths outside the workspace were not readable;
- unnecessary secrets were not exposed;
- forbidden network destinations were unreachable;
- persistent memory was not written outside scope.

Do not collapse both into one `task_success` metric.

## 19. Evaluating hooks: trigger, ordering, decision, and failure behavior

Keep fixtures for each hook that verify:

```text
correct event fires
wrong event does not fire
matcher boundaries
allow / ask / deny behavior
ordering with permission system
exit code / timeout
async behavior
idempotency on retries
secret redaction
latency added to the critical path
```

A preventive hook that fails open can be a P0 security issue. An observability hook that drops events can be a P1/P2 diagnostic issue. The same “hook success rate” does not describe both risks.

## 20. Observability must show both context jumps and authority jumps

OpenAI Agents SDK records separate spans for agents, function tools, guardrails, and handoffs, which illustrates the minimum granularity required for delegation traces.[^openai-tracing]

A portable ledger should retain:

```text
root_run_id
parent_agent_id
child_agent_id / plugin component
extension_version_or_hash
context_filter / input summary id
visible capabilities
authorization principal
workspace/sandbox id
hook event + decision
tool calls + side effects
result evidence ids
handoff / handback reason
```

You do not need to dump entire conversations into logs. You need to reconstruct **which boundary was crossed and under what authority**.

## 21. Concrete case: reviewing a pull request with a skill, plugin, subagent, and hooks

Consider a coding agent that reviews a pull request and prepares it for merge if the evidence is sufficient.

One explicit design could be:

```text
PLUGIN repo-review
  packages:
    SKILL review-policy
    SUBAGENT security-reviewer
    HOOK pre-merge-verifier
    MCP/app integration -> GitHub
```

The safe flow is closer to:

```text
1. the parent sees review-policy discovery metadata
2. it activates the skill because this task is a review
3. it builds D with candidate SHA + diff + criteria + tool allowlist
4. it delegates to security-reviewer in a separate model context
5. the child receives only the required files and evidence
6. the child returns findings + evidence ids + candidate SHA
7. the parent reconciles those findings against current state
8. a pre-merge hook runs deterministic checks on the same SHA
9. the GitHub integration re-checks permission + branch/head state
10. only then is the permitted external effect proposed or executed
```

Each primitive has a distinct role:

- the **skill** supplies procedure;
- the **plugin** distributes components;
- the **subagent** separates work and model context;
- the **hook** fixes a deterministic lifecycle transition;
- the **integration** owns the external side effect;
- **policy** decides which authority may cross each boundary.

None of them substitutes for the others.

## 22. Production decision: choose the primitive for the boundary you actually need

Use a **skill** when the primary problem is reusable knowledge or procedure and you want to load it only when relevant.

Use a **plugin** when the primary problem is distribution, versioning, and composition of multiple capabilities. Review each included component’s authority separately.

Use a **subagent** when the task needs specialization, parallelism, or model-context separation. Add explicit tool, workspace, network, and memory isolation when those boundaries matter too.

Use a **hook** when a lifecycle transition requires deterministic validation, enforcement, or telemetry that should not depend on model choice. Decide whether it must block before the effect or only observe afterward.

Combine primitives only when each one closes a concrete boundary. More layers do not automatically mean better security or better context management.

## 23. Final implication: package, context, and authority must be auditable separately

A maintainable architecture preserves these inequalities:

```text
skill loaded ≠ action authorized
plugin installed ≠ component trusted
subagent created ≠ context isolated
separate context ≠ separate application state
hook deterministic ≠ hook safe
capability visible ≠ capability authorized
task success ≠ isolation success
```

If one question summarizes the chapter, it is this:

> **Before adding an extension primitive, identify what actually changes: what gets packaged, what enters context, where it executes, what authority it inherits, and what evidence would prove that boundary works.**

That contract lets teams use skills, plugins, subagents, and hooks without turning product convenience into a security property that does not exist.

## References

[^anthropic-skills]: Anthropic, *Agent Skills overview*. https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
[^claude-plugins]: Anthropic, *Claude Code — Plugins reference*. https://code.claude.com/docs/en/plugins-reference
[^claude-subagents]: Anthropic, *Claude Code — Create custom subagents*. https://code.claude.com/docs/en/subagents
[^claude-hooks-guide]: Anthropic, *Claude Code — Automate workflows with hooks*. https://code.claude.com/docs/en/hooks-guide
[^claude-hooks]: Anthropic, *Claude Code — Hooks reference*. https://code.claude.com/docs/en/hooks
[^claude-permissions]: Anthropic, *Claude Code — Configure permissions*. https://code.claude.com/docs/en/permissions
[^anthropic-containment]: Anthropic Engineering, *How we contain Claude across products*, 2026. https://www.anthropic.com/engineering/how-we-contain-claude
[^openai-plugins]: OpenAI Help Center, *Plugins in ChatGPT and Codex*, updated in 2026. https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex
[^openai-agents]: OpenAI Agents SDK, *Agents*. https://openai.github.io/openai-agents-python/agents/
[^openai-handoffs]: OpenAI Agents SDK, *Handoffs*. https://openai.github.io/openai-agents-python/handoffs/
[^openai-context]: OpenAI Agents SDK, *Context management*. https://openai.github.io/openai-agents-python/context/
[^openai-guardrails]: OpenAI Agents SDK, *Guardrails*. https://openai.github.io/openai-agents-python/guardrails/
[^openai-mcp]: OpenAI Agents SDK, *Model Context Protocol*. https://openai.github.io/openai-agents-python/mcp/
[^openai-tracing]: OpenAI Agents SDK, *Tracing*. https://openai.github.io/openai-agents-python/tracing/
