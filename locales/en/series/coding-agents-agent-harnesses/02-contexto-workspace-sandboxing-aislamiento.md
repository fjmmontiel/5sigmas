---
title: "Context, workspaces, and sandboxing for coding agents: isolating state is not isolating execution"
description: "A branch, a worktree, a sandbox, and a container solve different problems. This chapter separates the state an agent sees, the workspace it mutates, its execution boundary, and final integration."
date: 2026-09-10
date_modified: 2026-09-10
keywords: "coding agents, repository context, workspace, git worktree, sandboxing, branch isolation, agent harness"
tags:
  - AI
  - Agents
  - Software
  - Coding agents
  - Architecture
  - Security
---

# Chapter 2 — Repository context, workspaces, sandboxing, worktrees/branches, and isolation

A coding agent can be working in “the same repository” as you while operating on a **different reality**.

It may have started from a different commit. It may have modified files that Git has not recorded yet. It may not see an ignored file that changes build behavior. It may run tests in a container while another agent points its own tests at the same database. It may have a separate worktree and still retain access to host networking or credentials.

That is why “isolate the agent” is not one operation. At minimum, separate four questions:

1. **What repository state actually exists?**
2. **Which part of that state reaches the model context?**
3. **Which filesystem and processes can the agent affect?**
4. **How will the result be integrated without mixing incompatible trajectories?**

A branch, a worktree, a sandbox, and a container can all contribute to the answer, but **they are not interchangeable**.

{{ include_html("snippets/articulos-tecnicos/coding-agent-isolation-stack.html") }}

## Five objects worth naming separately

Before designing concurrency or security, make the vocabulary explicit.

### 1. Repository and base revision

The repository contains history, refs, Git objects, configuration, and one or more working trees. An agentic task also needs an **identifiable base revision**, normally a commit SHA.

“Work from `main`” is not reproducible if `main` can move while the task is running. A stronger task specification looks like:

```text
repository = fjmmontiel/example
integration_target = main
base_sha = 8f2c...91a
```

`base_sha` answers “which code did this trajectory start from?” The integration target answers “which line must the result be revalidated against before delivery?” Those are separate facts.

### 2. Context view

The model does not automatically receive every byte in the repository. The harness selects, or lets the model retrieve, files, symbols, instructions, diffs, logs, and history.

We will call the subset of repository evidence that actually reaches one inference the **context view**.

It can be smaller than the workspace and it can also be stale relative to that workspace. If the agent changed `router.py` but the next turn still carries an older copy in context, the system has a coherence failure even though the correct file exists on disk.

### 3. Workspace

The workspace is the mutable state against which reads, edits, and commands run.

In Git, that is not just “the branch.” It includes at least:

- the current `HEAD`.
- the index or staging area.
- modified tracked files.
- untracked files.
- submodule state when present.
- any local artifact that affects behavior, such as generated files, caches, lockfiles, or project-local configuration where relevant.

The `git status` documentation makes these states explicit: untracked files have their own state, ignored files are not shown unless requested, and submodules carry additional state.[^git-status] Therefore **`git diff` is not a complete inventory of the workspace**.

### 4. Execution sandbox

The sandbox defines which effects a process may produce: where it can read and write, which network destinations it can reach, and, depending on the implementation, which processes, syscalls, devices, or resources it can use.

OpenAI documents this separation directly for Codex: the sandbox establishes the technical boundary, such as writable paths and network access, while approval policy decides when an action that crosses that boundary must stop for authorization.[^openai-safety]

Anthropic describes Claude Code sandboxing around two boundaries that need to work together: filesystem and network isolation.[^anthropic-sandbox] Gemini CLI offers macOS Seatbelt profiles and Docker/Podman sandboxes with different write and network policies.[^gemini-sandbox]

Implementations differ; the conceptual boundary does not: **the workspace says which state you are changing, while the sandbox says which execution effects are allowed**.

### 5. Integration ref

The result eventually has to become a reviewable unit: a commit, branch, patch, or pull request depending on the system.

That unit is not the whole workspace. A branch references commits. Unstaged changes, untracked files, and many external effects do not become part of it automatically.

GitHub makes this separation particularly visible in Copilot cloud agent: the agent is restricted to publishing on one branch and its draft pull request requires human review before merge, while the development environment is ephemeral and credentials, Actions, and network access have separate controls.[^github-risks][^github-environment]

## Branches, worktrees, sandboxes, and containers are not synonyms

Confusing these concepts creates operational bugs and security mistakes.

| Mechanism | What it primarily separates | What it does NOT guarantee |
|---|---|---|
| Branch/ref | A line of commits and integration | A separate directory, separate processes, or a secure host |
| Git worktree | A working tree plus per-worktree Git state such as `HEAD` and index | Network, secret, or process isolation; semantic compatibility at merge time |
| Sandbox | Execution capabilities: filesystem/network and others depending on implementation | That two diffs are compatible or the base SHA is still current |
| Container/VM | A configurable process and filesystem environment | A safe policy if mounts, network, or credentials are too broad |
| Service namespace | Per-task ports, DBs, queues, buckets, caches, or external resources | Repository isolation or correctness of the change |

There is no hierarchy where “container” is simply a stronger “worktree.” They address different dimensions and are often composed.

## What `git worktree` actually does

Git can attach multiple working trees to one repository so that more than one revision is checked out at the same time.[^git-worktree]

A linked worktree shares most repository data with the common repository while keeping items such as `HEAD` and the index per worktree.[^git-worktree][^git-glossary]

```bash
git worktree add -b agent/payments ../wt-payments main
git worktree add -b agent/search   ../wt-search   main
```

Conceptually, that gives you:

```text
shared Git object store + most refs/metadata
        │
        ├── wt-payments/  HEAD=agent/payments  own index  own files
        └── wt-search/    HEAD=agent/search    own index  own files
```

Git generally shares refs under `refs/`, but there are per-worktree exceptions (`refs/bisect`, `refs/worktree`, `refs/rewritten`), while pseudorefs such as `HEAD` are specific to each worktree.[^git-worktree] That is why the diagram says “most,” not “all.”

This prevents an important class of interference: two agents no longer overwrite the same `router.py` or use the same index merely because they run in parallel.

It also lets each trajectory retain its own dirty state as work progresses.

Git does not describe a worktree as a security sandbox. The worktree shares repository metadata and objects, while a process running in that directory still has whatever operating-system capabilities it was launched with.

**A worktree isolates work state; by itself it does not limit what a process can read, execute, or send over the network.**

## A branch is not a workspace either

This distinction is subtler.

Suppose `agent/payments` points to `abc123`, while its worktree contains:

```text
M  src/payments.py
?? tests/fixtures/new_case.json
!! .env.local
```

The branch still points to `abc123` until a commit is created. The untracked file belongs to no commit. The ignored file may affect runtime behavior without appearing in an ordinary review.

If the harness persists only:

```json
{"branch": "agent/payments"}
```

it has not persisted enough information to reconstruct the task's reality.

A recoverable trajectory needs to retain something closer to:

```json
{
  "task_id": "T-184",
  "base_sha": "8f2c...91a",
  "head_sha": "abc123",
  "branch": "agent/payments",
  "worktree": "/work/T-184",
  "dirty_tracked": true,
  "untracked_inventory_captured": true,
  "submodule_state_captured": true,
  "sandbox_policy": "repo-write-no-network-v3"
}
```

This is not a standard format. It is an example of the **invariants the harness must be able to reconstruct**.

## Model context and workspace state can diverge

There are two distinct planes:

```text
real workspace
    ↓ read/search/tool
serialized observation
    ↓ selection/compaction
next-turn context
```

A trajectory can fail even when the workspace itself is perfectly isolated if its context is wrong.

Examples:

- The agent searches for `create_user`, updates three references, and never observes a fourth reference generated dynamically.
- Compaction records “tests passed” but drops the fact that only a narrow suite ran.
- The workspace changes base after a rebase while the model continues reasoning from an older version of the contract.
- A relevant instruction lives in a directory the retrieval strategy never inspected.

Isolation does not replace **observation coherence**. The harness must ensure that actions alter the reality observed by subsequent tools and, when a revision changes or a session resumes, invalidate context that no longer represents the workspace.

## A sandbox is a capability boundary, not a special folder

A useful sandbox is described by concrete capabilities rather than a technology name.

At minimum, ask:

### Filesystem

- Which roots are read-only?
- Which paths are writable?
- Can the process read `$HOME`, SSH keys, or configuration outside the repository?
- Can symlinks or mounts cross the intended boundary?

### Network

- Is outbound access denied by default?
- Is there a destination or domain allowlist?
- Can the agent reach localhost or internal services?
- What happens with DNS, proxies, and redirects?

### Processes and resources

- Do subprocesses inherit the same policy?
- Can daemons survive after the task ends?
- Are CPU, memory, disk, and time bounded?
- Does the task share `/tmp`, sockets, the Docker daemon, or a container runtime with other tasks?

### Identity and credentials

- Which Git token can the process use, and against which ref?
- Are secrets present inside the environment or mediated outside it?
- Does an external tool receive credentials with a broader scope than the task requires?

OpenAI describes writable roots, `read-only`/`workspace-write` modes, network policy, and credentials as separate controls in its own Codex deployment.[^openai-safety] Anthropic additionally argues that protecting only filesystem or only networking leaves important risk paths open; its sandbox applies both boundaries to subprocesses launched by the tool.[^anthropic-sandbox]

The conclusion is not that every system should copy one implementation. It is that **“runs in a sandbox” is not sufficient evidence without the effective policy**.

## A container does not automatically make the environment safe

Docker, Podman, or a VM can be excellent mechanisms for building reproducible isolation, but the resulting security boundary depends on configuration.

A container with:

```text
- repository mounted read-write
- $HOME mounted read-write
- Docker socket mounted
- open network
- cloud credentials injected
```

does not have the same boundary as one that receives only a temporary workspace, allowlisted networking, and mediated credentials.

Gemini CLI illustrates the distinction well: its documentation exposes Seatbelt profiles with different network rules as well as Docker/Podman modes and additional sandbox flags.[^gemini-sandbox] The runtime name does not replace the mount, identity, and networking contract.

For a production design, version or audit the **sandbox policy**, not merely `runtime=docker`.

## Parallel agents introduce three kinds of collision

Giving every agent a worktree solves only one of them.

### 1. Filesystem/Git collision

Two agents modify the same files or the same index in one directory.

**Typical mitigation:** one workspace or worktree per task.

### 2. Execution-resource collision

The worktrees differ, but both test suites write to:

```text
/tmp/app.sock
localhost:5432/test
redis://localhost/0
~/.cache/project
```

Now one suite can break, or falsely validate, the other.

**Typical mitigation:** per-task namespaces for ports, databases/schemas, queues, temp directories, browser profiles, and caches; or separate execution environments when the risk warrants the cost.

### 3. Semantic integration collision

Two agents start from the same base SHA and produce changes that are individually correct but mutually incompatible.

A worktree cannot solve that. It only keeps them from overwriting each other while they work.

**Typical mitigation:** rebase or merge against the current integration target, resolve conflicts explicitly, and rerun verifiers on the integrated result.

This third category matters because a clean merge is not proof of semantic compatibility either. Git can combine two diffs without a textual conflict and still produce wrong behavior.

## Concrete case: two agents, one repository

Assume two tasks start from `base_sha=A`:

```text
Agent 1: change the configuration parser
Agent 2: refactor configuration tests
```

A reasonable topology could be:

```text
shared repository / object store
   ├── worktree T1 -> branch agent/parser
   │      └── sandbox T1 -> DB test_t1, /tmp/t1, allowlisted network
   └── worktree T2 -> branch agent/tests
          └── sandbox T2 -> DB test_t2, /tmp/t2, allowlisted network
```

This separates files, indexes, and execution resources.

Even so, before integrating T2 after T1 you still need to re-check:

```text
1. current integration target
2. merge base / base SHA
3. effective diff after rebase or merge
4. relevant tests on the combined state
5. unexpected or untracked files
6. scope and policy invariants
```

The separation improves causality: if T1 fails, it is easier to identify which workspace and environment produced the failure. It does not remove the need to revalidate composition.

## What current harnesses do: keep product boundaries separate

Current products combine these primitives in different ways.

### Codex

OpenAI describes the Codex app as having built-in worktree support so multiple agents can work in parallel on separate copies of the code.[^openai-worktrees] In separate security documentation, OpenAI describes the sandbox as the boundary restricting writes and network access, with approval policy as another layer.[^openai-safety]

So “Codex uses worktrees, therefore it is sandboxed” is an invalid shortcut. **Worktree and sandbox are distinct mechanisms even inside the same product.**

### Claude Code

Anthropic describes Claude Code sandboxing as filesystem and network isolation built on operating-system primitives, with restrictions that also cover child processes.[^anthropic-sandbox]

That addresses the execution boundary. It does not make a branch or diff semantically independent from another trajectory.

### GitHub Copilot cloud agent

GitHub combines an ephemeral development environment with a restricted publishing model: the agent can push only to a specific branch, credentials are constrained, and its draft pull request requires human review. Actions behavior and firewall policy are separately controlled.[^github-risks][^github-environment]

Again, **execution environment**, **branch capability**, and **merge policy** are separate layers.

### Gemini CLI

Gemini CLI can enable sandboxing through Seatbelt on macOS or Docker/Podman, with profiles that vary write and network behavior.[^gemini-sandbox]

That is why “Gemini CLI is isolated” is too broad without naming the effective mode: the product's own documentation exposes several policies.

## Dirty state: the agent must know who owns each change

Working in a human's existing workspace creates a problem that a clean copy does not have: changes may already exist before the agent starts.

A fail-closed harness should distinguish:

```text
preexisting_changes
agent_changes
external_changes_during_run
```

If it cannot, a “revert” or “cleanup” operation can destroy someone else's work.

A robust start-of-task snapshot should capture:

- `base_sha` and `HEAD`.
- machine-readable Git status.
- a relevant untracked-file inventory.
- submodules/LFS when they are part of the project.
- instructions and configuration that control the build.
- workspace/worktree identity.
- the effective sandbox policy.

`git status --porcelain` helps expose parseable repository state, but even that does not make ignored files or external resources part of Git.[^git-status]

Therefore **“working tree clean” is a specific Git property, not proof of a reproducible environment**.

## Resuming a session requires reconciling reality, not just conversation

Persisting an agent transcript is not enough to resume a task safely.

Before continuing after a crash, compaction, or handoff, the harness should compare expected state with observed state:

```text
expected.base_sha == observed.merge_base ?
expected.head_sha == observed.HEAD ?
expected.workspace_id == observed.workspace ?
expected.policy_id == observed.policy ?
expected.required_artifacts still exist ?
unexpected processes/resources still running ?
```

If one of those invariants changed, the correct action may be to reread context, rebase, rerun tests, or block the resume. Pretending continuity because a message history exists creates a trajectory whose causality is no longer known.

## Choosing the isolation you need

There is no universal primitive. Start with the failure you need to prevent.

| Need | Reasonable minimum primitive | Add when risk increases |
|---|---|---|
| One local agent, clean repo, short task | current workspace + explicit status/base SHA | write/network sandbox if it executes untrusted code |
| Two tasks in parallel on one repo | worktree/working copy per task + separate branch/ref | separate namespaces for tests and services |
| Run dependencies or potentially hostile code | filesystem + network sandbox | container/VM, least-privilege identity, strict egress according to threat model |
| Cloud agents delivering changes | ephemeral workspace + restricted ref | mediated credentials, firewall, required checks, and review gate |
| Resume long tasks | durable workspace or reproducible checkpoint | reconciliation of SHA, dirty state, policy, and external resources |

The choice is compositional: one task may legitimately need **a worktree + sandbox + service namespace + protected branch** at the same time.

## Minimum contract for a production harness

To make isolation observable and recoverable, treat identity and policy as first-class data:

```text
task_id
repository_id
base_sha
integration_target
workspace_id / worktree_path
branch_or_detached_head
preexisting_dirty_state
sandbox_policy_id
network_policy_id
credential_scope
service_namespace
current_head_sha
verification_head_sha
cleanup_state
```

Two fields are especially easy to miss:

- **`verification_head_sha`**: the exact code revision against which tests and gates passed.
- **`cleanup_state`**: whether processes, worktrees, containers, temporary resources, and ephemeral credentials were actually removed.

Without the first, a PASS can be attributed to different code. Without the second, a task can end while effects outside the diff remain alive.

## Production implication

The goal of isolating a coding agent is not “put it in Docker.” It is to establish three verifiable properties:

1. **Causality:** we know which initial state produced each change and test result.
2. **Confinement:** we know which execution effects were possible and which resources were reachable.
3. **Integration:** we know which diff/ref is being delivered and which target it was revalidated against.

A worktree improves causality and concurrency. A sandbox improves confinement. A branch or pull request improves integration. None replaces the others.

## What to remember

- Branches, worktrees, workspaces, sandboxes, and containers are different objects.
- A branch references commits; it does not contain dirty state, untracked files, or running processes by itself.
- A linked worktree separates the working tree, `HEAD`, and index, but shares much of the Git repository and is not a security boundary.
- Model context can diverge from the real workspace; physical isolation cannot repair stale or incomplete observation.
- A sandbox should be described by effective filesystem, network, process, and identity capabilities, not just by its implementation technology.
- Two worktrees can still interfere through databases, ports, caches, temp directories, or shared services.
- Parallel changes can be semantically incompatible even when Git reports no textual merge conflict.
- Resuming a task requires reconciling SHA, workspace, dirty state, policy, and external effects; a transcript is not enough.
- A test PASS should be tied to the exact SHA it verified.

## References

[^git-worktree]: Git, [git-worktree Documentation](https://git-scm.com/docs/git-worktree). Documents multiple working trees, linked worktrees, and which Git state is shared versus maintained per worktree.
[^git-glossary]: Git, [gitglossary](https://git-scm.com/docs/gitglossary). Defines working tree/worktree and identifies per-worktree metadata such as `HEAD`, index, and pseudorefs versus shared repository metadata.
[^git-status]: Git, [git-status Documentation](https://git-scm.com/docs/git-status). Documents index/working-tree state, untracked and ignored paths, and submodule state; ignored paths are shown only when requested.
[^openai-worktrees]: OpenAI, [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/), February 2, 2026, updated March 4, 2026. Describes built-in worktree support for parallel agents working on separate copies of code, while treating that primitive separately from sandbox restrictions.
[^openai-safety]: OpenAI, [Running Codex safely at OpenAI](https://openai.com/index/running-codex-safely/), May 8, 2026. Separates sandboxing, approvals, writable roots, network policy, identity/credentials, and telemetry as distinct control surfaces.
[^anthropic-sandbox]: Anthropic, [Beyond permission prompts: making Claude Code more secure and autonomous](https://www.anthropic.com/engineering/claude-code-sandboxing), October 20, 2025. Describes filesystem and network isolation, their application to subprocesses, and operating-system-level sandbox primitives.
[^github-risks]: GitHub, [Risks and mitigations for GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations). Documents the restricted branch, constrained credentials, human review for draft pull requests, and specific Actions controls.
[^github-environment]: GitHub, [Configure the development environment](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/customize-the-agent-environment). Documents the ephemeral/configurable development environment, runners, secrets, and firewall independently of the integration flow.
[^gemini-sandbox]: Gemini CLI, [Sandboxing in the Gemini CLI](https://google-gemini.github.io/gemini-cli/docs/cli/sandbox.html). Documents Seatbelt and Docker/Podman modes, profiles with different write/network policies, and the warning that sandboxing reduces but does not eliminate all risks.