---
title: "MCP: hosts, clients, servers, tools, resources, prompts, lifecycle, and trust boundaries"
description: "How to reason about MCP as a protocol: what the host owns, what servers expose, how the 2026-07-28 lifecycle changed, and where authorization, consent, and isolation must be enforced."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "MCP, Model Context Protocol, host, client, server, tools, resources, prompts, trust boundaries, authorization, lifecycle"
tags:
  - AI
  - Agents
  - Context engineering
  - MCP
  - Security
---

# Chapter 5 — MCP: hosts, clients, servers, tools, resources, prompts, lifecycle, and trust boundaries

MCP standardizes **how an application connects to external capabilities and context**. It does not decide which tool a model should use, which data deserves trust, whether an action is authorized, or what information should ultimately enter model context.

That boundary is the point of this chapter:

> **MCP defines exchange contracts. The host still owns orchestration, policy, consent, isolation, and context composition.**

This matters because an MCP server can expose data, instructions, and operations with real external effects. Treating “speaks MCP” as equivalent to “safe and authoritative” confuses interoperability with trust.

This chapter uses **MCP 2026-07-28** as its primary reference. That revision materially changed protocol lifecycle: the modern core is stateless, the `initialize` / `initialized` handshake and protocol sessions are gone, and protocol version plus capabilities travel with each request. Clients that must interoperate with 2025-era servers still need to understand the earlier lifecycle.[^mcp-2026-release][^mcp-versioning]

{{ include_html("snippets/articulos-tecnicos/context-mcp-trust-boundaries.html") }}

## 1. Start with ownership: host, client, and server are not synonyms

The MCP architecture defines three distinct roles.[^mcp-architecture]

### Host

The **host** is the AI application: an IDE, desktop app, chat interface, internal agent, or another product that embeds the model experience.

The host:

- creates and manages multiple MCP clients;
- decides which servers may be connected;
- enforces security and consent policy;
- aggregates context across servers;
- integrates the model and decides what reaches it;
- preserves boundaries between servers that should not see one another.

### Client

An **MCP client** lives inside the host and has a **1:1 relationship with one particular server**.[^mcp-architecture]

This is not just terminology. If the host connects to three servers, there are conceptually three clients. That separation prevents one server from implicitly inheriting another server's context or credentials.

### Server

An **MCP server** exposes context and capabilities through protocol primitives. It can be a local process launched by the host or a remote service.

A server should not receive the entire conversation by default. It sees the requests that its corresponding client chooses to send and responds within that contract.

A useful ownership model is:

```text
HOST
  owns model orchestration
  owns cross-server context composition
  owns user consent / approvals
  owns policy across the whole session

CLIENT A <-> SERVER A
CLIENT B <-> SERVER B
CLIENT C <-> SERVER C

server A does not automatically see server B
server B does not automatically inherit server A credentials
```

MCP makes the connections interoperable. It does not collapse the domains into one trust boundary.

## 2. Tools, resources, and prompts are not three names for “context”

The specification separates three server-side primitives with different interaction models.[^mcp-tools][^mcp-resources][^mcp-prompts]

| Primitive | What it represents | Default conceptual control | Dominant risk |
|---|---|---|---|
| **Tool** | an invocable operation with a schema | model-controlled | side effects, mutation, exfiltration, cost |
| **Resource** | URI-addressed data | application-driven | data exposure, freshness, scope |
| **Prompt** | a message/instruction template | user-controlled | untrusted instructions, apparent authority |

Those labels describe the specification's interaction model; the protocol does not mandate a particular UI.

The practical consequence is that a host should not put all three primitives into one undifferentiated bucket of “things from the server.”

## 3. Tools describe operations; they do not grant permission to perform them

Tools are discovered with `tools/list` and invoked with `tools/call`.[^mcp-tools]

A tool includes a name, an `inputSchema`, and related metadata. Under 2026-07-28, a server supporting tools must declare the `tools` capability, and the specification recommends deterministic ordering of tool lists to improve caching and model-context stability.

The schema answers one question:

```text
what arguments does this operation accept?
```

It does not answer:

```text
should this user be allowed to run it?
does this invocation require human approval?
is it destructive in this context?
can it export data outside the organization?
what cost or external effect will it create?
```

The specification itself recommends preserving a human ability to deny tool calls and making exposed tools and invocations visible to the user.[^mcp-tools]

Therefore:

> **tool discovery ≠ authorization; tool selection ≠ consent; schema validation ≠ policy approval.**

## 4. Tool annotations are hints, not a security boundary

MCP tool annotations provide signals about expected behavior. Official guidance is explicit that annotations are **hints** and should be treated as untrusted when they come from an untrusted server.[^mcp-tool-annotations]

A malicious server can label an operation as effectively “read only” and still attempt a destructive effect.

A serious host policy therefore needs signals it can enforce or verify:

```text
server trust level
+ authenticated identity
+ granted scopes
+ tool allowlist
+ argument policy
+ sandbox / filesystem boundary
+ network egress policy
+ explicit approval when required
```

An annotation can inform the decision. It cannot replace execution controls.

## 5. Resources are data; the host decides whether they enter context

Resources are URI-addressed and are discovered or read through `resources/list` and `resources/read`.[^mcp-resources]

The specification describes resources as **application-driven**: the host decides whether to present them to the user, make them searchable, or incorporate them automatically.

That connects directly to the previous chapters in this series:

```text
resource returned by MCP
        ↓
still only a candidate source
        ↓
context policy checks
scope · ACL · freshness · authority · provenance · budget
        ↓
possibly enters C_t
```

The protocol can transport a particular document revision. It does not know whether that revision remains the authoritative version for your business decision.

There is also a difference between **resource identity** and **resource trust**. A stable URI does not prove that the content is correct, safe, or current.

## 6. Prompts are model-facing content, not privileged instructions

Prompts let a server expose message templates and arguments. The specification describes them as **user-controlled** with respect to when they are selected.[^mcp-prompts]

That control does not make prompt content trusted.

A prompt from an external server can contain instructions that conflict with host policy. The host must preserve its own instruction hierarchy and treat server-supplied prompt content as provenance-bearing input, not implicit authority.

The general rule is:

```text
protocol role ≠ instruction authority
```

Receiving a string inside an MCP `Prompt` object means it satisfies that protocol contract. It does not mean it may override system policy.

## 7. The modern lifecycle changed: 2026-07-28 has no initialize handshake

This is one of the places where older MCP documentation can now mislead architecture decisions.

Through `2025-11-25`, MCP used a stateful lifecycle:

```text
client -> initialize
server -> negotiated protocol version + capabilities
client -> notifications/initialized
... session ...
```

The **2026-07-28** revision removed that handshake and `Mcp-Session-Id` from the modern core.[^mcp-2026-release][^mcp-versioning]

Each request is now self-contained and carries metadata such as:

```text
io.modelcontextprotocol/protocolVersion
io.modelcontextprotocol/clientInfo
io.modelcontextprotocol/clientCapabilities
```

For Streamable HTTP, each request also carries `MCP-Protocol-Version`; relevant requests expose `Mcp-Method` and, where applicable, `Mcp-Name` for routing and authorization in HTTP infrastructure.[^mcp-http]

The operational consequence is important:

> **stateless protocol does not mean stateless application.**

If a tool needs durable state, that state must be explicit: a database record, handle, task ID, resource ID, or equivalent application structure. It should not depend on hidden transport affinity.

## 8. `server/discover` discovers capabilities; it does not authenticate the server

Under 2026-07-28 a server **must** implement `server/discover`, although a client may invoke another RPC directly without calling it first.[^mcp-discover]

`server/discover` can return:

- supported protocol versions;
- capabilities;
- self-declared server identity;
- optional instructions;
- caching hints.

The specification includes an important caveat: `serverInfo` is **self-reported**, is not verified by the protocol, and should not drive security decisions.[^mcp-discover]

Therefore:

```text
server says name = "corp-payments"
```

is not equivalent to:

```text
server is cryptographically proven to be the authorized payments service
```

Authenticity comes from the channel, host configuration, TLS, authorization metadata, deployed identity, and equivalent controls—not from `serverInfo.name`.

## 9. Compatibility: a modern client may need to speak two protocol eras

Current official SDK documentation describes both lifecycle generations: the handshake model through `2025-11-25` and the stateless request model from `2026-07-28`.[^mcp-go-lifecycle]

That matters for testing and observability.

One product can encounter:

```text
modern server
  server/discover
  request-local version + capabilities
  no protocol session

legacy server
  initialize / initialized
  negotiated session lifecycle
```

Do not label a compatibility failure as “the MCP server is broken” without recording **protocol version + transport + SDK version + method**.

## 10. stdio and Streamable HTTP create different failure domains

MCP defines standard transports for local and remote deployments.[^mcp-http]

### stdio

With a local stdio server, the client may launch a subprocess and communicate over stdin/stdout.

The important boundaries include:

- which executable is launched;
- which OS user runs it;
- which environment variables it inherits;
- which directories it can read or write;
- which network destinations it can reach;
- which secrets exist in the process environment.

“Local” does not mean “safe.” A local server with access to the user's home directory and unrestricted egress can have more privilege than a well-isolated remote service.

### Streamable HTTP

In 2026-07-28, Streamable HTTP uses self-contained POST requests; a request may receive JSON or request-bound SSE. The modern revision removes the global GET stream and protocol sessions.[^mcp-http]

The boundaries shift to:

- allowed origin and endpoint;
- TLS;
- authorization;
- scopes and audience;
- rate limiting;
- gateway/WAF controls;
- egress from the server to downstream systems.

The protocol is the same. The failure domain is not.

## 11. Authentication, authorization, and consent are three separate decisions

Keep these questions distinct:

```text
AUTHENTICATION
who is the caller / server?

AUTHORIZATION
what may that principal do?

CONSENT / APPROVAL
does the user accept this specific action now?
```

MCP defines an HTTP authorization framework based on OAuth and requires controls such as resource indicators and audience binding where applicable.[^mcp-auth]

The security specification also forbids a particularly dangerous anti-pattern: **token passthrough**. An MCP server calling a downstream API must not simply forward the access token it received from the client. It needs credentials or a token issued for the downstream resource.[^mcp-security]

That prevents a token valid for one resource from silently becoming a universal credential.

## 12. A trust boundary does not necessarily align with one MCP server

Imagine a `crm-mcp` server exposing:

```text
resource: customer://123/profile
tool: update_customer_email
tool: refund_invoice
```

Internally it calls:

```text
CRM API
billing API
identity service
```

The MCP server is a protocol boundary. Those downstream services remain distinct authorization and failure boundaries.

The host should be able to reason about at least this chain:

```text
user
  ↓ approval
host policy
  ↓ MCP authorization
MCP server
  ↓ downstream authorization
business API
  ↓ side effect
external state
```

Do not collapse the whole path into “tool call succeeded.”

## 13. Prompt injection travels through data; MCP does not eliminate it

MCP does not create prompt injection, but it makes it easy to compose tools and data from multiple domains. That makes the separation between **untrusted data** and **ability to act** more important.

A resource can contain hostile instructions. A tool can send data to the Internet. The model may try to connect the two.

The controls that matter mostly live in the host and infrastructure:

```text
least privilege
context provenance
server isolation
sandboxing
egress controls
argument validation
approval policy
secret isolation
post-action verification
```

Annotations can describe risk. They do not make the model immune to embedded instructions.[^mcp-tool-annotations]

## 14. MRTR: when a server needs more input without hidden sessions

The 2026-07-28 revision replaces server-initiated requests held open on a connection with **Multi Round-Trip Requests (MRTR)**.[^mcp-mrtr][^mcp-2026-release]

A `tools/call`, `resources/read`, or `prompts/get` can return:

```text
resultType = input_required
inputRequests = {...}
requestState = opaque state
```

The client obtains the required input—for example an elicitation—and retries the original request with `inputResponses`.

The relationship is:

```text
request
  ↓
server says: input required
  ↓
host/client obtains approved input
  ↓
retry original request + bound response
  ↓
complete result
```

The architectural goal is to support multi-step interactions without returning to implicit transport sessions.

## 15. Sampling and roots need a 2026 caveat

A large amount of pre-July-2026 MCP material presents **sampling** and **roots** as central client-side features.

In `2026-07-28`, roots, sampling, and logging were **deprecated** with a compatibility window while server-to-client flows move toward MRTR and extensions.[^mcp-deprecated][^mcp-2026-release]

This chapter therefore does not teach “sampling is a capability every modern MCP host should implement.”

The correct September 2026 rule is:

- understand sampling and roots when interoperating with existing implementations;
- do not make them a new architectural dependency without checking the current recommended path in the relevant spec and SDK;
- always record protocol version because available semantics depend on it.

## 16. Server catalogs can change; hosts need cache and invalidation policy

In 2026, `tools/list`, `resources/list`, `prompts/list`, and some reads return hints such as `ttlMs` and `cacheScope`; catalogs should be deterministic while their underlying set is unchanged.[^mcp-tools][^mcp-resources][^mcp-prompts]

Caching helps, but it does not remove invalidation.

The host still needs to decide:

```text
when to refresh a list
which authorization context produced it
whether cached entries remain visible after a scope change
how to react to listChanged / subscription notifications
what happens when an invoked name disappears
```

A catalog cached under credential set A must not be blindly reused under credential set B.

## 17. Failure recovery: retrying a read is not the same as retrying an action

When an MCP request fails, the host needs to understand operation semantics.

```text
resources/read
  often repeatable, but freshness may change

tools/call read-only
  maybe safe to retry if its contract is idempotent

tools/call mutating
  retry may duplicate an external effect
```

Do not infer idempotency from a tool name or from an untrusted annotation.

For mutations, prefer explicit contracts such as:

```text
idempotency_key
operation_id
precondition/version
post-action readback
```

MCP transports the invocation. Exactly-once semantics or idempotency belong to the application and downstream service unless a specific contract proves otherwise.

## 18. Observability: trace the responsibility chain, not only JSON-RPC

A useful trace should let you reconstruct:

```text
host_session / turn_id
server identity as configured by host
protocol_version
transport
method + name
client capabilities sent
server capabilities observed
auth principal / scopes (without secrets)
approval decision
input arguments hash / safe projection
result status
MRTR rounds if any
downstream operation_id
latency / timeout / retry
```

For security and debugging, also preserve which **client instance** and which **server trust policy** participated.

Do not log access tokens, authorization codes, or secrets to gain observability.

## 19. Testing: test the contract and what happens when the server lies

A happy-path `tools/list → tools/call` test is insufficient.

At minimum, cover:

```text
protocol-version compatibility
capability mismatch
unknown / disappearing tool
malformed schema or result
server timeout
cancellation
MRTR input_required loop limits
unauthorized / insufficient scope
stale cached catalog
serverInfo mismatch with configured identity
untrusted annotations
prompt/resource containing hostile instructions
mutating tool retry after ambiguous timeout
```

The MCP project maintains an official conformance repository for protocol behavior. Use it for protocol compliance, then add host-policy tests because conformance does not know your business rules.[^mcp-conformance]

## 20. Worked example: a GitHub server with read and merge capabilities

Assume a coding-agent host connects to an MCP server exposing:

```text
resources:
  repo://acme/payments/README.md
  repo://acme/payments/pull/482

tools:
  read_file(path)
  comment_pr(number, body)
  merge_pr(number, expected_head_sha)

prompts:
  review_pull_request(style)
```

The safe flow is not:

```text
model sees merge_pr
→ calls it
→ server says success
```

It should look more like:

```text
1. host creates one client for this server
2. host discovers/knows capabilities under the active protocol version
3. resources become candidate context, not automatic truth
4. user/model selects review prompt under host instruction hierarchy
5. model proposes merge_pr
6. host policy checks server trust + user permission + repo + branch protection
7. approval is requested if policy requires it
8. call includes expected_head_sha to bind intent to reviewed state
9. server authenticates/authorizes the downstream GitHub operation separately
10. host records the result and verifies final repository state
```

MCP reduces integration work across steps 1–5 and 8. It does not remove policy, authorization, and verification work.

## 21. Production implication: use MCP as a protocol, not as authority

A robust MCP architecture preserves five separations:

```text
HOST ≠ SERVER
interoperability ≠ trust
capability discovery ≠ authorization
tool invocation ≠ consent
protocol success ≠ business success
```

It also preserves one temporal separation:

```text
MCP 2025 lifecycle ≠ MCP 2026 lifecycle
```

If you retain one design rule, make it this:

> **Connect servers through MCP, but keep in the host the policy that decides which server deserves trust, which data enters context, and which actions may cross a boundary with real effects.**

That gives you interoperability without accidentally delegating security or authority to the protocol.

## References

[^mcp-architecture]: Model Context Protocol, *Architecture*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/architecture
[^mcp-tools]: Model Context Protocol, *Tools*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/server/tools
[^mcp-resources]: Model Context Protocol, *Resources*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/server/resources
[^mcp-prompts]: Model Context Protocol, *Prompts*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/server/prompts
[^mcp-discover]: Model Context Protocol, *Discovery*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/server/discover
[^mcp-versioning]: Model Context Protocol, *Versioning*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
[^mcp-http]: Model Context Protocol, *Streamable HTTP*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
[^mcp-auth]: Model Context Protocol, *Authorization*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
[^mcp-security]: Model Context Protocol, *Authorization security considerations*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations
[^mcp-mrtr]: Model Context Protocol, *Multi Round-Trip Requests*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr
[^mcp-deprecated]: Model Context Protocol, *Deprecated features*, 2026-07-28 specification. https://modelcontextprotocol.io/specification/2026-07-28/deprecated
[^mcp-2026-release]: Model Context Protocol, *The 2026-07-28 Specification*, July 28, 2026. https://blog.modelcontextprotocol.io/posts/2026-07-28/
[^mcp-go-lifecycle]: Model Context Protocol Go SDK, *Lifecycle*. https://go.sdk.modelcontextprotocol.io/protocol/
[^mcp-tool-annotations]: Model Context Protocol Blog, *Tool Annotations as Risk Vocabulary: What Hints Can and Can't Do*, March 16, 2026. https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/
[^mcp-conformance]: Model Context Protocol, official conformance test repository. https://github.com/modelcontextprotocol/conformance
