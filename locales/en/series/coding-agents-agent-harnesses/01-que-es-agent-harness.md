---
title: "What an agent harness is: the runtime that turns a model into a coding agent"
description: "A model can propose code and tool calls. An agent harness maintains the loop, controls the workspace, executes tools, enforces permissions, verifies results, and decides when to continue or hand control back."
date: 2026-09-10
date_modified: 2026-09-10
keywords: "agent harness, coding agents, coding assistant, agent loop, sandbox, repository agents"
tags:
  - AI
  - Agents
  - Software
  - Coding agents
  - Architecture
---

# Chapter 1 — What an agent harness is, and what it adds beyond a model or coding assistant

A model that can code may explain a function, propose a diff, or request a tool call. That still does not define **who opens the repository, which files it may touch, who executes a command, how the result returns to the model, what happens when a test fails, or when the task is finished**.

That work belongs to another layer: the **agent harness**.

We will keep the term *harness* throughout this series because it is already established in the technical documentation. It does not mean “a large prompt” or merely “a wrapper around an API.” A harness is the **runtime and control logic that turn a sequence of model inferences into a process that observes a workspace, acts on it, receives feedback, and decides again**.

OpenAI describes the Codex harness as the *agent loop and logic* behind its different product surfaces, with thread lifecycle, configuration/authentication, and shell/file tool execution inside a sandbox all living around that loop.[^openai-codex-harness] Anthropic draws a similar boundary for Managed Agents: it separates the **session**, the **harness** —the loop that calls the model and routes tool calls— and the **sandbox**, where code is executed and files are modified.[^anthropic-managed-agents]

That distinction matters because two systems can use the same model and still behave very differently when they change the context supplied to it, the available tools, the permission policy, the execution environment, or the verifier.

{{ include_html("snippets/articulos-tecnicos/coding-agent-harness-loop.html") }}

## The model does not own the repository

It helps to separate three objects that commercial interfaces often bundle together.

### 1. Model

The model is the inference component. It receives a representation of the available context and produces an output: text, structured code, a tool call, or some combination supported by that particular model and API.

The model can **decide that running `pytest` would be useful**. That does not mean the model ran `pytest`.

For the command to produce a real observation, at least this much has to happen:

```text
model proposes: run("pytest tests/api")
        ↓
policy decides whether the action is allowed
        ↓
runtime executes the process in a concrete environment
        ↓
stdout / stderr / exit code return to the loop
        ↓
the model's next turn sees that observation
```

The boundary between *proposing an action* and *performing an action* is a systems boundary, not a wording distinction.

### 2. Coding assistant

*Coding assistant* is primarily a **developer-assistance product experience**, not an architectural standard. It may mean completion, repository chat, guided editing, or an interface that can also launch agentic tasks.

That makes a rigid taxonomy such as “assistant = no tools” and “agent = tools” unhelpful. Current products mix these surfaces. OpenAI, for example, says the same Codex harness powers web, CLI, IDE, and app experiences, and that it can also be embedded to build a code reviewer, SRE agent, or coding assistant.[^openai-codex-harness]

The useful question is not which label appears in the product. It is **how much control over the trajectory the user has delegated**.

### 3. Coding agent + harness

A coding agent can receive a goal that requires multiple steps and maintain an observe → decide → act → observe cycle until a stopping condition is reached.

The harness is what makes that cycle operational. Depending on the product, it can own or coordinate:

- Session lifecycle and persistent task state.
- Repository-context selection and compaction.
- Reads, edits, shell, git, browser, and external MCP/tools.
- The workspace, worktree, container, or VM in which work happens.
- Permissions, approvals, secrets, and network restrictions.
- Capture of stdout, stderr, diffs, test results, and other events.
- Retries, checkpoints, recovery, and handoff across sessions.
- Verifiers, stop conditions, and delivery of the result for review.

Not every harness implements all of those responsibilities the same way. The list describes **possible ownership boundaries**, not a universal guarantee.

## The mechanism: a stateful loop with real effects

A minimal pattern looks like this:

```text
1. load task contract + current state
2. select relevant repository context
3. call the model
4. interpret response / tool call
5. apply policy and approvals
6. execute the action in the workspace
7. capture the real observation
8. update state and context
9. verify progress / invariants / stop condition
10. continue, recover, ask for help, or finish
```

The important property is that **each iteration changes the world observed by the next one**. If the agent edits `router.py`, the next `grep`, test, or diff must run against that new state. If a command fails, the error becomes an observation. If the runtime checks out another branch, subsequent decisions operate on a different repository state.

OpenAI exposes this property in Codex Core: core is both the library and runtime for the agent loop and manages persistence for a thread. The App Server hosts those core threads as a long-running process and can pause a turn while it requests an approval from the client.[^openai-codex-harness]

A harness is therefore more than a tool dispatcher. It establishes **causal continuity between actions**.

## Five boundaries the harness adds around the model

### Context: which version of reality reaches the next turn

A real repository may not fit into the model's context, and sending it all would not necessarily be useful even if it did. The harness must decide, or help the model decide, what to observe: the file tree, repository instructions, symbols, diffs, search results, logs, task history, or artifacts from an earlier session.

This layer may be explicit —for example, search and read tools the model invokes— or it may include automatic persistence and compaction. OpenAI documents thread lifecycle and persistence in the Codex harness so different clients can reconnect and render a consistent timeline.[^openai-codex-harness]

The production consequence is straightforward: **a bad answer may be a model failure, but it may also be a harness-context failure**. If the agent changes an API without ever observing relevant consumers, swapping models may not solve the problem.

### Action: how intent becomes an effect

Reading a file, invoking a compiler, or running `git diff` requires operating-system and environment capabilities. The harness routes the tool call to a concrete implementation and returns its result.

GitHub Copilot cloud agent, for example, works in its own ephemeral environment where it can explore code, make changes, and run tests and linters.[^github-agent-environment] Gemini CLI exposes read/write and shell tools, requires confirmation for mutating tools, and can execute tools inside a sandbox.[^gemini-tools]

Those examples do not imply that every coding agent must use containers or the same permission model. They demonstrate the boundary: **a model does not intrinsically own a filesystem, shell process, or git credentials**.

### Policy: what the agent is allowed to do

The more execution authority the loop receives, the more important it becomes to separate capability from authorization.

A tool may technically be able to run `rm`, open a connection, or invoke `git push`. The harness must constrain whether that action can happen under its policy. Anthropic documents two especially relevant Claude Code sandbox boundaries: filesystem isolation and network isolation. The goal is to let the agent act more autonomously inside a hard boundary instead of turning every operation into a permission dialog.[^anthropic-sandbox]

GitHub makes a similar distinction at the environment layer. Its cloud agent uses an ephemeral environment and exposes controls for firewalls, secrets, and runner selection, with additional network-security guidance for self-hosted runners.[^github-agent-environment]

An approval does not make an action safe by itself. It is one policy decision inside a trust boundary. Chapters 2.2 and 2.4 will cover sandboxes, worktrees, permissions, hooks, secrets, and trust boundaries in detail.

### Feedback: what the loop learns from its own effects

A coding agent is useful partly because it can close the loop against evidence from the workspace:

```text
edit
→ formatter
→ type checker
→ tests
→ real execution
→ diff
→ next decision
```

Without that feedback, the system is closer to turn-by-turn code generation than autonomous repository execution.

But **having test tools does not mean the result is correct**. GitHub says its cloud agent can run tests and linters in its environment, while the output still arrives on a branch or pull request that deserves review. GitHub also documents that Actions workflows are not automatically triggered by certain agent pushes until approval.[^github-agent-environment][^github-agent-review]

The guarantee comes from the verifier contract and the behavior it covers, not from the existence of a command named `test`.

### Control: when to continue, stop, or hand the problem back

A model can produce an answer that sounds final even when the task is incomplete. The harness needs an external definition of progress and completion.

It may be as small as “finish when the requested command exits 0,” or as structured as:

```text
DONE if:
- required tests = PASS
- diff stays inside allowed scope
- no unexpected files remain
- functional verifier = PASS
- change summary generated

HAND_BACK if:
- a requirement cannot be inferred safely
- a required permission is unavailable
- repository state cannot be reconciled safely
```

Anthropic's long-running coding-agent experiments show that harness structure —decomposition, handoff artifacts, and a separate evaluator— can change outcomes even within the same model family. The same work also warns that harness components can become unnecessary overhead as the model improves and should be re-tested rather than treated as permanent architecture.[^anthropic-harness-design]

That avoids another common mistake: **more scaffolding is not automatically better**.

## A concrete example: rename an API and update its consumers

Consider this task:

```text
Rename `create_user()` to `create_account()`,
update every consumer, and demonstrate that the public API still works.
```

An isolated model can produce a plausible patch for the files it is shown. An interactive assistant can help while the developer chooses searches, commands, and files.

An agentic harness can execute a trajectory such as:

```text
1. inspect repository instructions
2. locate the definition and references
3. read relevant tests and public API surface
4. edit definition + consumers
5. run formatter/type checker/focused tests
6. inspect failures
7. fix a dynamic reference missed by the first search
8. run the required suite
9. review the diff and changed-file set
10. deliver a commit/branch/PR or request review
```

What the harness adds is not “more intelligence” in the abstract. It adds **the ability to close the loop against mutable, verifiable state**.

Nor does it guarantee step 7 will happen. The agent may stop early, search poorly, treat an incomplete test as sufficient evidence, or make an out-of-scope change. Those properties must be evaluated on the whole system.

## The same model can live inside different harnesses

One practical way to see that model and harness are separable layers is to look at systems that let one change without replacing the other.

GitHub lets users select an agent or custom agent and, separately, choose the model used by a Copilot cloud agent session.[^github-use-agent] Gemini CLI also exposes model selection as a CLI setting distinct from its tools, sandbox, and execution policy.[^gemini-model]

That does not mean every model can be swapped without consequences. Tool schemas, prompting, context windows, reasoning capabilities, APIs, and runtime conventions can create coupling. The narrower conclusion is enough: **the model is a dependency of the harness, not the entire harness**.

The inverse matters too. The same model can perform differently as the harness changes. Anthropic explicitly documents how its long-running harness design changed when newer models no longer needed some of the resets and decomposition that earlier models required.[^anthropic-harness-design]

Agent architecture therefore ages in two directions: the runtime evolves, and so does the model running inside it.

## What you should NOT attribute to the harness

A harness can create better conditions for work. It does not make the model's inference true.

Do not automatically attribute these properties to a harness:

- **Complete repository understanding.** It knows only what the loop has observed or retrieved.
- **Code correctness.** An incomplete test suite can pass while a real bug remains.
- **Security.** A permissive policy or weak secret boundary remains dangerous.
- **Unlimited autonomy.** Time, context, permission, environment, and budget limits remain.
- **Correct recovery.** Persisting a conversation is not the same as reconciling filesystem, process, branch, and external-effect state.
- **Higher quality because there are more agents.** Planners, reviewers, and subagents add cost and new failure modes. They should exist only when they improve a relevant outcome under a comparable setup.

This distinction also protects against marketing language. “Agentic,” “autonomous,” and “multi-agent” do not specify the control boundary that matters operationally.

## Assistant or agent: decide by delegation, not by branding

For a developer, the practical distinction can be described by how much of the loop remains manual:

| Responsibility | Strongly user-directed assistant | Coding agent with a harness |
|---|---|---|
| Choose next file/command | Mostly the user | May be delegated to the loop |
| Apply changes | User or confirmed edit | Tool executes under policy |
| Run tests and consume results | User starts or supervises | Loop can execute and ingest feedback |
| Maintain long-task state | Conversation/UI | Runtime + workspace + state artifacts |
| Decide whether to continue | User | Stop/verifier policy + model |
| Integrate result | User | May prepare branch/commit/PR under constraints |

There is no universal binary boundary. An IDE assistant may include an agentic mode. A coding agent may request approval for nearly every mutation. The table describes **operational delegation**, not a taxonomy of brands.

## What changes when you design a production system

If you build or choose a coding agent, evaluating only the model is insufficient. You also need the harness contract:

1. **What can it observe?** How it discovers instructions, symbols, dependencies, and workspace state.
2. **What can it mutate?** Paths, repositories, branch/worktree, services, and network resources.
3. **What can it execute?** Shell, build, browser, MCP, APIs, and long-running processes.
4. **Where does state live?** Model context, persistent thread, filesystem, or external store.
5. **What verifies the work?** Exact tests, linters, type checks, behavior, diff, and policies.
6. **How does it recover?** After timeout, crash, compaction, reconnect, or a new session.
7. **When does it stop?** Success contract, budget, stop condition, or handback.
8. **What evidence does it leave?** Commits, logs, trajectory events, tool outputs, test results, and a reviewable diff.

The following chapters develop those boundaries one by one. This chapter only needs to establish the mental model: **the model proposes actions; the harness turns those actions into a controlled trajectory over a real environment**.

## What to remember

- A coding model is not a complete coding agent. It does not inherently own a workspace, shell, permissions, state, or stop conditions.
- An *agent harness* is the runtime/orchestration layer that maintains the loop, connects context and tools, enforces policy, preserves state, and returns observations to the model.
- Coding assistant and coding agent are not two clean product categories. The useful distinction is how much of the trajectory is delegated.
- Sandbox and permissions belong to the execution/control layer, not to model intelligence.
- Tests and linters provide evidence to the loop. They do not guarantee correctness when the verifier is incomplete.
- The same model can behave differently under a different harness, and a harness should be simplified or changed as models improve.
- The useful evaluation unit is the repository trajectory and its verifiable outcome, not only the model response.

## References

[^openai-codex-harness]: OpenAI, [Unlocking the Codex harness: how we built the App Server](https://openai.com/index/unlocking-the-codex-harness/), February 4, 2026. Defines the Codex harness as the agent loop and logic shared across product surfaces, and documents thread lifecycle/persistence, configuration/authentication, sandboxed shell/file tools, and App Server as a long-running process hosting Codex Core threads.
[^anthropic-managed-agents]: Anthropic, [Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/engineering/managed-agents), April 8, 2026. Explicitly separates session, harness —the loop that calls Claude and routes tool calls— and sandbox as distinct interfaces.
[^github-agent-environment]: GitHub, [Configure the development environment](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment). Documents Copilot cloud agent's ephemeral environment, tests/linters, setup steps, runners, secrets, and firewall controls.
[^github-agent-review]: GitHub, [Troubleshooting GitHub Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/troubleshoot-cloud-agent). Documents local task validation with tests/linters and the fact that GitHub Actions workflows are not automatically triggered by certain agent pushes until approval.
[^github-use-agent]: GitHub, [Using Copilot cloud agent on GitHub](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github). Session creation allows the user to select a repository/base branch, agent or custom agent, and separately the available model and reasoning level.
[^anthropic-sandbox]: Anthropic, [Beyond permission prompts: making Claude Code more secure and autonomous](https://www.anthropic.com/engineering/claude-code-sandboxing), October 20, 2025. Describes filesystem/network isolation, permission policy, and sandboxed shell execution in Claude Code.
[^anthropic-harness-design]: Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), March 24, 2026. Shows how decomposition, handoff artifacts, and evaluator loops affect long-running coding tasks, and why harness components can stop being load-bearing as the model improves.
[^gemini-tools]: Gemini CLI, [Tools reference](https://geminicli.com/docs/reference/tools/). Documents tool execution, confirmation for mutations, and tool sandboxing.
[^gemini-model]: Gemini CLI, [Model selection](https://geminicli.com/docs/cli/model/). Documents model selection as a CLI configuration separate from the rest of the runtime.
