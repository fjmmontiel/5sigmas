---
title: "MCP: hosts, clients y servers; tools, resources, prompts, ciclo de vida y fronteras de confianza"
description: "Cómo razonar sobre MCP como protocolo: qué posee el host, qué expone cada servidor, cómo cambió el ciclo de vida en 2026-07-28 y dónde deben imponerse autorización, consentimiento y aislamiento."
date: 2026-09-12
date_modified: 2026-09-12
keywords: "MCP, Model Context Protocol, host, client, server, tools, resources, prompts, trust boundaries, authorization, lifecycle"
tags:
  - IA
  - Agentes
  - Context engineering
  - MCP
  - Seguridad
---

# Capítulo 5 — MCP: hosts, clients y servers; tools, resources, prompts, ciclo de vida y fronteras de confianza

MCP estandariza **cómo una aplicación se conecta con capacidades y contexto externos**. No decide por sí mismo qué herramienta debe usar el modelo, qué datos son fiables, qué permiso merece una acción ni qué información acaba entrando en el contexto.

Ésa es la frontera importante:

> **MCP define contratos de intercambio. El host sigue siendo responsable de orquestación, política, consentimiento, aislamiento y composición del contexto.**

La distinción importa porque un servidor MCP puede exponer datos, instrucciones y acciones con efectos reales. Si tratamos «habla MCP» como equivalente a «es seguro y merece confianza», hemos confundido interoperabilidad con autoridad.

Este capítulo usa como referencia principal la especificación **MCP 2026-07-28**, que cambió de forma material el ciclo de vida: el núcleo moderno no mantiene estado de protocolo, eliminó el intercambio inicial `initialize`/`initialized` y las sesiones de protocolo, y mueve versión y capacidades a cada solicitud. Los clientes que necesiten interoperar con revisiones 2025 todavía deben entender el ciclo de vida anterior.[^mcp-2026-release][^mcp-versioning]

{{ include_html("snippets/articulos-tecnicos/context-mcp-trust-boundaries.html") }}

## 1. Empieza por las responsabilidades: host, client y server no son sinónimos

La arquitectura oficial de MCP separa tres papeles.[^mcp-architecture]

### Host

El **host** es la aplicación que contiene la experiencia de IA: por ejemplo, un IDE, una aplicación de escritorio, una interfaz de chat o un agente interno.

El host:

- crea y gestiona múltiples clientes MCP;
- decide a qué servidores se permite conectar;
- aplica políticas de seguridad y consentimiento;
- agrega contexto procedente de distintos servidores;
- integra el modelo y decide qué se le expone;
- conserva la frontera entre servidores que no deberían poder verse entre sí.

### Client

Un **client MCP** vive dentro del host y mantiene una relación **1:1 con un servidor concreto**.[^mcp-architecture]

Esto es más que una elección de nombres. Si el host habla con tres servidores, conceptualmente existen tres clients. La separación evita que un servidor obtenga de forma implícita el contexto o las credenciales de otro.

### Server

Un **server MCP** expone capacidades y contexto mediante primitivas del protocolo. Puede ser un proceso local iniciado por el host o un servicio remoto.

El server no debería recibir la conversación completa por defecto. Recibe las solicitudes que el client correspondiente decide enviarle y responde dentro de ese contrato.

Una forma útil de pensar en el reparto de responsabilidades es:

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

MCP hace interoperable la conexión. No convierte todos esos dominios en uno solo.

## 2. Tools, resources y prompts no son tres formas de decir «contexto»

La especificación distingue tres primitivas del lado del servidor con modelos de interacción diferentes.[^mcp-tools][^mcp-resources][^mcp-prompts]

| Primitiva | Qué representa | Control conceptual por defecto | Riesgo dominante |
|---|---|---|---|
| **Tool** | una operación invocable con schema | model-controlled | efectos externos, mutación, exfiltración, coste |
| **Resource** | datos identificados por URI | application-driven | exposición de datos, frescura, scope |
| **Prompt** | plantilla de mensajes/instrucciones | user-controlled | instrucciones no confiables, autoridad aparente |

Estas etiquetas describen el modelo de interacción de la especificación; el protocolo no obliga a una UI concreta.

La consecuencia práctica es que el host no debería meter las tres primitivas en el mismo grupo de «cosas que vienen del server».

## 3. Tools describen acciones, no conceden permiso para ejecutarlas

Los tools se descubren mediante `tools/list` y se invocan mediante `tools/call`.[^mcp-tools]

Un tool incluye, entre otros campos, un nombre y un `inputSchema`. La revisión 2026-07-28 exige que el server declare la capacidad `tools` si los soporta y recomienda orden determinista en las listas para facilitar la caché y la estabilidad del prompt.

Pero el schema sólo responde a una pregunta:

```text
¿qué argumentos acepta esta operación?
```

No responde a estas otras:

```text
¿debería ejecutarla este usuario?
¿requiere aprobación humana?
¿es destructiva en este contexto?
¿puede sacar datos fuera de la organización?
¿qué coste o efecto lateral tendrá?
```

La propia especificación recomienda que el usuario pueda negar invocaciones y que la aplicación haga visible qué tools se exponen y cuándo se ejecutan.[^mcp-tools]

Por tanto:

> **tool discovery ≠ authorization; tool selection ≠ consent; schema validation ≠ policy approval.**

## 4. Las `annotations` son señales (`hints`), no una frontera de seguridad

MCP define `annotations` de tools como señales sobre comportamiento esperado. La documentación oficial insiste en que son **hints** y deben considerarse no confiables si proceden de un server no confiable.[^mcp-tool-annotations]

Un server malicioso puede declarar algo equivalente a «read only» y seguir intentando un efecto destructivo.

Eso significa que una política seria debe usar señales que el host pueda imponer o verificar:

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

Una `annotation` puede enriquecer la decisión. No sustituye controles de ejecución.

## 5. Resources son datos; el host decide si entran en contexto

Los resources están identificados por URI y se descubren/leen mediante `resources/list` y `resources/read`.[^mcp-resources]

La especificación los describe como **application-driven**: el host decide si los presenta al usuario, permite buscarlos o los incorpora automáticamente.

Esto encaja directamente con los capítulos anteriores de la serie:

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

El protocolo puede transportar una revisión concreta de un documento. No sabe si esa revisión sigue siendo la autoridad vigente de tu negocio.

También hay una diferencia entre **resource identity** y **resource trust**. Que algo tenga una URI estable no prueba que su contenido sea correcto, seguro o actual.

## 6. Prompts son contenido ejecutable para el modelo, no instrucciones privilegiadas

Los prompts permiten que un server exponga plantillas de mensajes y argumentos; la especificación los describe como **user-controlled** en cuanto a cuándo se seleccionan.[^mcp-prompts]

Ese control no convierte el contenido del prompt en confiable.

Un prompt procedente de un server externo puede contener instrucciones que entren en conflicto con políticas del host. El host debe conservar su propia jerarquía de instrucciones y tratar contenido del server como una entrada con procedencia conocida, no como autoridad implícita.

La regla general es:

```text
protocol role ≠ instruction authority
```

Que una cadena llegue en un objeto `Prompt` significa que cumple ese contrato MCP. No significa que pueda sobreescribir políticas del sistema.

## 7. El ciclo de vida moderno cambió: en 2026-07-28 no hay initialize

Éste es uno de los puntos donde mucha documentación antigua ya induce a error.

Hasta `2025-11-25`, MCP usaba un ciclo de vida con estado:

```text
client -> initialize
server -> negotiated protocol version + capabilities
client -> notifications/initialized
... session ...
```

La revisión **2026-07-28** eliminó ese intercambio inicial y el `Mcp-Session-Id` del núcleo moderno.[^mcp-2026-release][^mcp-versioning]

Ahora cada solicitud es autocontenida e incluye metadatos como:

```text
io.modelcontextprotocol/protocolVersion
io.modelcontextprotocol/clientInfo
io.modelcontextprotocol/clientCapabilities
```

En Streamable HTTP cada solicitud también lleva `MCP-Protocol-Version`; las solicitudes relevantes exponen `Mcp-Method` y, cuando aplica, `Mcp-Name` para enrutamiento y autorización en infraestructura HTTP.[^mcp-http]

La consecuencia operacional es importante:

> **un protocolo sin estado no implica una aplicación sin estado.**

Si una herramienta necesita estado persistente, ese estado debe ser explícito: base de datos, identificador, task ID, resource ID o estructura equivalente. No debe depender de una afinidad de sesión oculta en el transporte.

## 8. `server/discover` descubre capacidades; no autentica al server

En 2026-07-28 el server **MUST** implementar `server/discover`, aunque el client no está obligado a llamarlo antes de otras solicitudes.[^mcp-discover]

`server/discover` puede devolver:

- versiones soportadas;
- capacidades;
- identidad declarada del server;
- instrucciones opcionales;
- indicaciones de caché.

Pero la especificación deja una advertencia crítica: `serverInfo` es **self-reported** y no debe usarse para decisiones de seguridad.[^mcp-discover]

Por tanto:

```text
server says name = "corp-payments"
```

no equivale a:

```text
server cryptographically proven to be the authorized payments service
```

La autenticidad viene del canal, la configuración del host, TLS, metadatos de autorización, identidad desplegada y controles equivalentes, no de la cadena `serverInfo.name`.

## 9. Compatibilidad: un client moderno puede tener que hablar con dos eras del protocolo

Los SDKs oficiales actuales soportan el modelo moderno y la compatibilidad con el ciclo de vida anterior. La documentación del SDK Go describe explícitamente los dos modelos: intercambio inicial hasta `2025-11-25` y solicitudes sin estado desde `2026-07-28`.[^mcp-go-lifecycle]

Esto afecta a las pruebas y a la observabilidad.

Un mismo producto puede ver:

```text
modern server
  server/discover
  request-local version + capabilities
  no protocol session

legacy server
  initialize / initialized
  negotiated session lifecycle
```

No etiquetes un fallo de compatibilidad como «el MCP server está roto» sin registrar **protocol version + transport + SDK version + method**.

## 10. stdio y Streamable HTTP cambian el dominio de fallo

MCP define transportes estándar para escenarios locales y remotos.[^mcp-http]

### stdio

En un server local por stdio, el client puede lanzar un subproceso y comunicarse por stdin/stdout.

Las fronteras relevantes incluyen:

- qué ejecutable se lanza;
- con qué usuario del sistema;
- qué variables de entorno hereda;
- qué directorios puede leer/escribir;
- qué red puede alcanzar;
- qué secretos existen en el entorno.

«Local» no significa «seguro». Un server local con acceso al directorio personal del usuario y salida de red puede tener más privilegios que un servicio remoto bien aislado.

### Streamable HTTP

En 2026-07-28 Streamable HTTP usa solicitudes POST autocontenidas; puede devolver JSON o SSE ligado a esa solicitud. La revisión moderna elimina el stream GET global y las sesiones de protocolo.[^mcp-http]

Aquí las fronteras cambian a:

- origen/endpoint permitido;
- TLS;
- autorización;
- scopes/audience;
- limitación de tasa;
- gateway/WAF;
- salida de red desde el server hacia sistemas downstream.

El protocolo es el mismo; el dominio de fallo no lo es.

## 11. Autenticación, autorización y consentimiento son tres decisiones distintas

Conviene separarlas explícitamente:

```text
AUTHENTICATION
¿quién es el caller / server?

AUTHORIZATION
¿qué puede hacer ese principal?

CONSENT / APPROVAL
¿acepta el usuario esta acción concreta ahora?
```

MCP define un marco de autorización para HTTP basado en OAuth y exige controles como resource indicators/audience binding cuando aplica.[^mcp-auth]

La especificación también prohíbe un antipatrón especialmente peligroso: **token passthrough**. Un server MCP que llama a una API downstream no debe reenviar sin más el token de acceso que recibió del client; debe usar credenciales o un token emitido para el recurso downstream correspondiente.[^mcp-security]

Esto evita que un token válido para un recurso se convierta accidentalmente en credencial universal.

## 12. Una frontera de confianza no coincide necesariamente con un server MCP

Imagina un server `crm-mcp` que expone:

```text
resource: customer://123/profile
tool: update_customer_email
tool: refund_invoice
```

Internamente ese server llama a:

```text
CRM API
billing API
identity service
```

El server MCP es una frontera de protocolo. Los tres servicios downstream siguen siendo fronteras de autorización y fallo separadas.

El host debe poder razonar al menos sobre:

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

No colapses toda esa cadena en «tool call succeeded».

## 13. Prompt injection atraviesa datos; MCP no la elimina

MCP no crea prompt injection, pero facilita componer fuentes y tools de distintos dominios. Eso aumenta la necesidad de mantener separados **datos no confiables** y **capacidad de actuar**.

Un resource puede contener texto hostil. Un tool puede permitir enviar datos a Internet. El modelo puede intentar conectar ambas cosas.

Las defensas que importan viven sobre todo en el host y en la infraestructura:

```text
mínimo privilegio
procedencia del contexto
aislamiento de servidores
sandboxing
control de salida de red
validación de argumentos
política de aprobación
aislamiento de secretos
verificación tras la acción
```

Las `annotations` ayudan a describir riesgo, pero no hacen que el modelo sea inmune a instrucciones embebidas.[^mcp-tool-annotations]

## 14. MRTR: cuando el server necesita más input sin volver a sesiones ocultas

La revisión 2026-07-28 reemplaza las solicitudes iniciadas por el server y mantenidas en una conexión por **Multi Round-Trip Requests (MRTR)**.[^mcp-mrtr][^mcp-2026-release]

Un `tools/call`, `resources/read` o `prompts/get` puede responder con:

```text
resultType = input_required
inputRequests = {...}
requestState = opaque state
```

El client obtiene la entrada necesaria —por ejemplo, mediante una `elicitation` al usuario— y reintenta la solicitud original con `inputResponses`.

La relación es:

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

El objetivo arquitectónico es conservar interacciones de varios pasos sin volver a depender de una sesión de transporte oculta.

## 15. Sampling y roots requieren una advertencia temporal en 2026

Mucha documentación de MCP anterior a julio de 2026 presenta **sampling** y **roots** como capacidades centrales del client.

En `2026-07-28`, roots, sampling y logging quedaron **deprecated**, con ventana de compatibilidad, mientras los flujos server→client se reorganizan alrededor de MRTR y extensiones.[^mcp-deprecated][^mcp-2026-release]

Por eso este capítulo no enseña «sampling es una capability que todo MCP moderno debería implementar».

La regla correcta a septiembre de 2026 es:

- entiende sampling/roots para interoperar con implementaciones existentes;
- no los uses como base arquitectónica nueva sin comprobar el mecanismo recomendado por la revisión y los SDK concretos;
- registra siempre protocol version porque cambia la semántica disponible.

## 16. El server puede cambiar su catálogo; el host necesita caché e invalidación

`tools/list`, `resources/list`, `prompts/list` y algunas lecturas devuelven en 2026 indicaciones como `ttlMs` y `cacheScope`; los catálogos deben ser deterministas cuando el conjunto subyacente no cambia.[^mcp-tools][^mcp-resources][^mcp-prompts]

Esto mejora el uso de caché, pero no elimina la necesidad de invalidación.

El host necesita decidir:

```text
when to refresh list
what authorization context produced it
whether cached entries remain visible after scope change
how to react to listChanged/subscription notifications
what happens when an invoked name disappears
```

Un catálogo guardado en caché bajo credenciales A no debe reutilizarse ciegamente bajo credenciales B.

## 17. Recuperación ante fallos: reintentar una lectura no es igual que reintentar una acción

Cuando falla una solicitud MCP, el host necesita distinguir la semántica de la operación.

```text
resources/read
  often repeatable, but freshness may change

tools/call read-only
  maybe safe to retry if contract is idempotent

tools/call mutating
  retry may duplicate external effect
```

No deduzcas idempotencia sólo del nombre del tool ni de una `annotation` no confiable.

Para mutaciones, el diseño debería preferir contratos explícitos:

```text
idempotency_key
operation_id
precondition/version
post-action readback
```

MCP transporta la llamada. La garantía de ejecución exactamente una vez (`exactly-once`) o de idempotencia pertenece a la aplicación o al sistema downstream salvo que un contrato específico demuestre lo contrario.

## 18. Observabilidad: registra la cadena de responsabilidad, no sólo JSON-RPC

Una traza útil debería permitir reconstruir:

```text
host_session / turn_id
server identity as configured by host
protocol_version
transport
method + name
client capabilities sent
server capabilities observed
auth principal / scopes (sin secretos)
approval decision
input arguments hash / safe projection
result status
MRTR rounds if any
downstream operation_id
latency / timeout / retry
```

Para seguridad y depuración también interesa conservar qué **instancia de client** y qué **política de confianza del server** participaron.

No registres tokens de acceso, códigos de autorización o secretos para ganar observabilidad.

## 19. Pruebas: prueba el contrato y también lo que ocurre cuando el server miente

Una prueba nominal de `tools/list → tools/call` es insuficiente.

Como mínimo, evalúa:

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

El proyecto MCP mantiene un repositorio oficial de conformance; úsalo para protocolo, pero añade pruebas de política del host porque conformance no conoce las reglas de tu negocio.[^mcp-conformance]

## 20. Caso completo: un server de GitHub con lectura y merge

Supongamos un host de coding agent conectado a un server MCP que ofrece:

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

El flujo seguro no es:

```text
model sees merge_pr
→ calls it
→ server says success
```

Debe parecerse más a:

```text
1. el host crea un client para este server
2. el host descubre o conoce las capacidades bajo la versión de protocolo actual
3. los resources pasan a ser contexto candidato, no verdad automática
4. usuario/modelo selecciona el prompt de revisión bajo la jerarquía de instrucciones del host
5. el modelo propone merge_pr
6. la política del host comprueba confianza del server + permiso del usuario + repo + branch protection
7. se solicita aprobación si la política la exige
8. la llamada incluye expected_head_sha para vincular la intención al estado revisado
9. el server autentica y autoriza por separado la operación downstream en GitHub
10. el host registra el resultado y verifica el estado final del repositorio
```

MCP reduce trabajo de integración entre los pasos 1–5 y 8. No elimina los pasos de política, autorización y verificación.

## 21. Implicación de producción: usa MCP como protocolo, no como autoridad

Una arquitectura MCP robusta mantiene cinco separaciones:

```text
HOST ≠ SERVER
interoperability ≠ trust
capability discovery ≠ authorization
tool invocation ≠ consent
protocol success ≠ business success
```

Y mantiene una sexta separación temporal:

```text
MCP 2025 lifecycle ≠ MCP 2026 lifecycle
```

Si recuerdas sólo una decisión, que sea ésta:

> **Conecta servers mediante MCP, pero conserva en el host la política que decide qué server merece confianza, qué datos entran al contexto y qué acciones pueden cruzar una frontera con efectos reales.**

Eso permite aprovechar interoperabilidad sin delegar accidentalmente seguridad y autoridad al protocolo.

## Referencias

[^mcp-architecture]: Model Context Protocol, *Architecture*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/architecture
[^mcp-tools]: Model Context Protocol, *Tools*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/server/tools
[^mcp-resources]: Model Context Protocol, *Resources*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/server/resources
[^mcp-prompts]: Model Context Protocol, *Prompts*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/server/prompts
[^mcp-discover]: Model Context Protocol, *Discovery*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/server/discover
[^mcp-versioning]: Model Context Protocol, *Versioning*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning
[^mcp-http]: Model Context Protocol, *Streamable HTTP*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
[^mcp-auth]: Model Context Protocol, *Authorization*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
[^mcp-security]: Model Context Protocol, *Authorization security considerations*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations
[^mcp-mrtr]: Model Context Protocol, *Multi Round-Trip Requests*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/basic/patterns/mrtr
[^mcp-deprecated]: Model Context Protocol, *Deprecated features*, especificación 2026-07-28. https://modelcontextprotocol.io/specification/2026-07-28/deprecated
[^mcp-2026-release]: Model Context Protocol, *The 2026-07-28 Specification*, 28 de julio de 2026. https://blog.modelcontextprotocol.io/posts/2026-07-28/
[^mcp-go-lifecycle]: Model Context Protocol Go SDK, *Lifecycle*. https://go.sdk.modelcontextprotocol.io/protocol/
[^mcp-tool-annotations]: Model Context Protocol Blog, *Tool Annotations as Risk Vocabulary: What Hints Can and Can't Do*, 16 de marzo de 2026. https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/
[^mcp-conformance]: Model Context Protocol, repositorio oficial de conformance tests. https://github.com/modelcontextprotocol/conformance