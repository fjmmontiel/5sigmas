---
title: Reactive and proactive agents and tool calls
description: "A technical walkthrough of Reactive / Proactive Agent and the conversational contract it encapsulates: immediate response, asynchronous work, and deferred completion."
date: 2026-04-23
date_modified: 2026-05-11
keywords: "reactive agent, proactive agent, tool calls, async tool calls, conversational runtime, background tasks, pending updates"
article_state: published
video: "reactive-proactive-agent-header-demo.mp4"
video_duration: "PT20S"
tags:
  - AI
  - Agents
  - Tool Calling
  - Architecture
  - Runtime
---

# Reactive and proactive agents and tool calls

> **Base repository:** [`Reactive / Proactive Agent`](https://fjmmontiel.github.io/reactive-proactive-agent/)  
> **Status:** published on 5sigmas; scoped local demo with an associated public repository  
> **Scope:** conversational contract, local runtime, mock service, and deferred completion  

When an agent uses tools against external systems, the difficult part is not calling an external API.
That call can be made with a function, a queue, or any HTTP library. The design becomes difficult when the conversation with the LLM and the external operation run on different clocks and the model turn is left waiting for work that may take much longer.

The flow is straightforward to describe: the user types in the chat box or speaks over a phone channel, the model decides that it needs a tool to process the request correctly, and the operation goes out to a service that may take time, fail, or finish after the user has already continued talking.

[`Reactive / Proactive Agent`](https://fjmmontiel.github.io/reactive-proactive-agent/) addresses exactly this problem.

The repository is a scoped local demo built around one conversational contract: respond now with what the system knows, execute the operation outside the visible chat turn, and return the completion once the result actually exists.

The *reactive component* accepts the request without waiting for the external API. The *proactive component* comes back later with one completion once the batch is resolved or ready to be resynchronized on the next turn.

The demo uses access provisioning because it is concrete enough to force the agent to touch an external system.

{{ include_html("snippets/articulos-tecnicos/async-tool-panorama.html") }}

## The problem is not the tool, but time

In a classic chatbot, tools break the normal conversational flow when they depend on an external API. If the agent waits for the API, the chat remains blocked because the model turn is still waiting for the tool result. If it responds as if the API had already finished, it lies about the real state. And if it dumps every technical detail into the conversation, the visible history ends up carrying implementation details that are irrelevant to the user.

The repository's design decision is to separate those planes without losing continuity for the user. The agent can say that it is starting a task, but it must not say that the task is complete until the external system closes it. Meanwhile, the user can ask something else or request another access. The runtime keeps operational state, HTTP attempts, and pending results without turning them into permanent `system` messages inside the chat.

That separation starts in the in-memory state. `RuntimeState` keeps visible history, operations, pending updates, and traces in different structures:

```python
class RuntimeState:
    def __init__(self) -> None:
        self._messages: dict[str, list[Message]] = {}
        self._pending_updates_by_session: dict[str, list[PendingUpdate]] = {}
        self._operations_by_session: dict[str, dict[str, OperationRecord]] = {}
        self._inflight_counts_by_session: dict[str, int] = {}
        self._events: dict[str, list[Event]] = {}
        self._model_traces: dict[str, list[ModelTrace]] = {}
        self._turn_locks_by_session: dict[str, threading.Lock] = {}
```

This division avoids a very common temptation: using the chat history as the database for everything that happened. Here, `_messages` remains conversation. `_operations_by_session` describes technical work. `_pending_updates_by_session` stores completions that already exist but have not yet gone back to the user. `_inflight_counts_by_session` tells the runtime whether the batch is still in flight. Traces and events exist to observe the demo, not to contaminate the visible thread. Snapshots still expose `pending_system_messages`, but only as a compatibility view over those `PendingUpdate` objects, not as the canonical runtime state.

## The first turn accepts work; it does not promise results

The central function is still `ConversationRuntime.handle_user_turn()`. Its responsibility is not to resolve the external operation, but to decide what the agent can say in the current turn and what work must be dispatched to the background runner.

```python
def handle_user_turn(self, conversation_id: str, user_text: str) -> ChatResult:
    self.state.acquire_turn(conversation_id, "user", blocking=True)
    self.state.append(conversation_id, Role.USER, user_text)
    inflight_count = self.state.inflight_count(conversation_id)
    pending_updates = self.state.pending_updates(conversation_id)
    consume_pending_updates = bool(pending_updates) and inflight_count == 0
    turn_pending_updates = self.state.take_pending_updates(conversation_id) if consume_pending_updates else []
    live_operations_context = self._build_live_operations_context(
        conversation_id,
        pending_updates=pending_updates,
        inflight_count=inflight_count,
    )
    injected_system_message, system_messages, messages, first_turn = self._run_model_turn(
        conversation_id=conversation_id,
        phase="first_pass",
        tools=self.registry.provider_definitions(),
        pending_updates=turn_pending_updates,
        extra_system_messages=[live_operations_context] if live_operations_context else [],
    )
```

This section explains a good part of the repository's current design. Before calling the model, the runtime checks whether there are live operations and pending completions. If nothing remains in flight, it can consume those pending updates on the next turn as ephemeral context. If work is still open, it does not consume them as a final completion; instead, it prepares operational context so the model can answer honestly without declaring the batch finished.

When the model requests a tool, the runtime validates arguments, normalizes batches under `accesses`, and registers each operation before launching it:

```python
if first_turn.tool_calls:
    acceptance_messages: list[str] = []
    for tool_call in first_turn.tool_calls:
        tool = self.registry.get(tool_call.name)
        normalized_arguments = normalize_tool_arguments(tool, tool_call.arguments)
        validate_tool_arguments(tool, normalized_arguments)
        acceptance = tool.acceptance_message(normalized_arguments)
        for i, item in enumerate(normalized_arguments.get(tool.batch_field) or []):
            sub_id = f"{tool_call.id}:{i}"
            self.state.accept_operation(conversation_id, tool.name, sub_id, item)
            self.background_tasks.submit_item(conversation_id, tool, sub_id, item)
        acceptance_messages.append(acceptance)
    assistant_text = " ".join(acceptance_messages)
```

The important detail is the acceptance language. The agent does not say “it is done.” It says that it is starting the task. That distinction is central to the contract. The conversation moves forward, but the result still belongs to the operational plane.

## Asynchronous work needs policy, not only background execution

Moving HTTP work to a thread or an event loop does not solve the problem by itself. What matters is what happens with attempts, retries, and completion. `BackgroundTaskRunner` runs each operation with bounded concurrency, classifies the result, and updates state on every attempt:

```python
async def _process(...):
    async with self._semaphore:
        for attempt in range(1, tool.max_attempts + 1):
            http_status, response_body, exception = await asyncio.to_thread(_execute_request, request)
            outcome = classify_outcome(http_status, response_body, exception)
            self.state.mark_attempt(...)
            if outcome.success:
                self.state.finish_processing(...)
                self._notify_completion(conversation_id)
                return
            if outcome.retryable and attempt < tool.max_attempts:
                await asyncio.sleep(tool.backoff_seconds)
                continue
            self.state.finish_processing(...)
            self._notify_completion(conversation_id)
            return
```

The repository models technical failures, business errors, `429`, `5xx`, timeouts, and successful responses under one policy. That policy does not live in the UI or in the prompt. It lives in the runtime and is reflected in the operations, events, and snapshot that the interface later reads. That is why the demo can expose retries without turning them into conversation messages.

The next visual places the whole operation on one map. The important part is not memorizing every box, but seeing where the request changes planes: visible acceptance, background work, technical outcome, pending completion, and final delivery.

{{ include_html("snippets/articulos-tecnicos/tool-lifecycle.html") }}

## Completion returns when the batch can close

The proactive part of the repository is not the model “deciding to notify” by intuition. The decision lives in `handle_background_completion()`. Every time an operation finishes, the background runner notifies the runtime. The runtime checks whether operations remain in flight, whether the demo is forcing resynchronization on the next turn, and whether the session is free to write a new agent message.

```python
def handle_background_completion(self, conversation_id: str) -> bool:
    inflight_count = self.state.inflight_count(conversation_id)
    pending_updates = self.state.pending_updates(conversation_id)
    if not pending_updates:
        return False
    if inflight_count > 0:
        return False
    if self.force_next_turn_resync:
        return False
    if not self.state.acquire_turn(conversation_id, "proactive", blocking=False):
        self._schedule_proactive_retry(conversation_id)
        return False

    pending_updates = self.state.take_pending_updates(conversation_id)
    assistant_text = self._build_guaranteed_proactive_followup(
        [update.message for update in pending_updates]
    )
    self.state.append(conversation_id, Role.ASSISTANT, assistant_text)
    self.state.mark_updates_proactively_delivered(conversation_id, pending_updates)
    return True
```

The current rule is stricter than “a task finished, send a message.” The completion is emitted when no operations remain open for that session, and if several tasks belong to the same batch, they are accumulated. If the session is busy, delivery is retried. If configuration forces resynchronization, the result is prepared for the next turn. That discipline avoids one of the most annoying behaviors in agents with background work: partial, duplicate, or out-of-context messages.

There is another important detail in the public branch. When all operations finish successfully, the follow-up does not call the model again: it is constructed with `_build_guaranteed_proactive_followup()`. The LLM is only used in the completion path when there are final failures and several outcomes have to be converted into a short explanation with a concrete alternative. That separation reduces variability exactly where the system needs to be more predictable.

When it cannot emit a proactive follow-up, the repository uses `pending_updates` as the bridge. On the next turn, those completions are injected as internal context and disappear after being consumed. The user gets continuity, but the visible chat does not fill with technical messages. In the external snapshot of state, `delivery_mode` indicates whether the result remains `queued`, returned through `proactive`, or was absorbed by `next_turn`; `session_view.latest_sync_mode` summarizes that state for the UI as `aggregating`, `queued_final`, `proactive`, `next_turn`, `waiting`, or `idle`.

```python
def _build_pending_updates(self, pending_updates: list[PendingUpdate]) -> str | None:
    if not pending_updates:
        return None
    lines = [
        "State of previous operations already completed before this turn:",
        "These updates only describe previous operations and do not replace new user requests in this turn.",
    ]
    lines.extend(f"- {update.message}" for update in pending_updates)
    return "\n".join(lines)
```

That internal text does not instruct the model to continue an earlier task. The runtime can use operational state to answer better without exposing it as if it were a natural part of the conversation.

## A reasonable next step toward production

The current repository lives in a single Python process with in-memory state, a local demo server, a mock service, and a local browser. That limitation is documented in the repository and should be respected. The demo does not persist real state, deploy infrastructure, or claim to cover production security. Even so, the code already separates responsibilities cleanly enough to outline a next technical step without pretending it is a definitive architecture.

The next visual asks a practical question: what is the minimum set of components that must leave the local process before this pattern starts behaving like an operable system?
The first change would be to move shared state to Redis so `pending_updates`, `inflight_count`, per-session locks, and idempotency survive even if the process serving the turn disappears.
The second would be to separate visible acceptance from real execution with a queue and a worker pool.
The third would be to place completion policy in an explicit component that decides whether the batch can return as a follow-up or has to remain ready for the next turn.

{{ include_html("snippets/articulos-tecnicos/target-architecture.html") }}

That intermediate step also forces several pieces that can still remain implicit locally to become stricter. The first is idempotency: relying on an external API identifier is not enough; the runtime needs its own intent key so provisions and follow-ups are not duplicated after restarts or replays.

The second is terminal-failure handling: when an operation exhausts its retries, it should not disappear or remain in limbo, but move to a DLQ with enough context for inspection, replay, or manual intervention. The third is observability: in production, knowing that “something took a long time” is not enough. The system must be able to reconstruct why a session remained aggregating results, why a completion went through `proactive` instead of `next_turn`, or exactly where a batch stopped progressing.

This evolution is therefore presented as a reliability harness rather than a complete platform architecture. Redis, a queue, workers, completion policy, a DLQ, and traces do not turn the demo into a full production platform, but they move it toward production without breaking what is valuable in the repository: the conversational contract. The agent still responds without waiting for the API, the visible history does not become a technical database, and the completion still returns only once, when the batch is actually ready to close.

{{ include_html("snippets/articulos-tecnicos/runtime-conversational.html") }}

## What the repository actually contributes

The value of `Reactive / Proactive Agent` is not discovering that work can run in the background. That is a known and standard software technique. The interesting part is that it pins down the conversational contract around that work: what the agent may say now, where technical state lives, when results are accumulated, and how the system reports back to the user without polluting the thread.

This is a small but practical piece of agent design. Many tool-calling demos show a model calling a function and receiving an immediate response. This repository focuses on the harder case: the operation remains alive after the turn. That is where the problems that later matter in a real product appear: latency, retries, duplicate messages, invisible state, out-of-order interruptions, and conversations that lose honesty about what has already happened.
