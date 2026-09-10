#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const [es, en, snippet, mirror, i18nRaw, mkdocsEs, mkdocsEn, manifest] = await Promise.all([
  fs.readFile(path.resolve('docs/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red.md'), 'utf8'),
  fs.readFile(path.resolve('locales/en/series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red.md'), 'utf8'),
  fs.readFile(path.resolve('docs/snippets/articulos-tecnicos/voice-network-paths.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-network-paths.html'), 'utf8'),
  fs.readFile(path.resolve('locales/en/snippets/articulos-tecnicos/voice-network-paths.i18n.json'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.yml'), 'utf8'),
  fs.readFile(path.resolve('mkdocs.en.yml'), 'utf8'),
  fs.readFile(path.resolve('locales/en/manifest.yml'), 'utf8'),
]);
const i18n = JSON.parse(i18nRaw);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const primaryUrls = [
  'https://www.rfc-editor.org/rfc/rfc8445.html',
  'https://www.rfc-editor.org/rfc/rfc7874.html',
  'https://www.rfc-editor.org/rfc/rfc7587.html',
  'https://www.w3.org/TR/webrtc-stats/',
  'https://docs.livekit.io/intro/basics/connect/',
  'https://docs.livekit.io/telephony/',
  'https://docs.livekit.io/reference/telephony/codecs-negotiation/',
  'https://docs.pipecat.ai/api-reference/server/services/transport/small-webrtc',
  'https://docs.pipecat.ai/api-reference/server/services/serializers/twilio',
  'https://www.twilio.com/docs/voice/media-streams',
  'https://www.twilio.com/docs/voice/media-streams/websocket-messages',
];
for (const url of primaryUrls) {
  check(es.includes(url), `ES: missing primary source ${url}`);
  check(en.includes(url), `EN: missing primary source ${url}`);
}

const esAnchors = [
  'Empieza por dibujar el camino, no por elegir un acrónimo',
  'WebRTC: la ruta elegida por ICE importa',
  'Codec, sample rate y packetization son decisiones distintas',
  'Jitter no es lo mismo que latencia',
  'SIP no transporta por sí solo la voz',
  'La telefonía puede estrechar el audio antes de llegar al modelo',
  'PSTN con WebSocket: el carrier puede esconder SIP y RTP de tu aplicación',
  'WebSocket de audio y WebRTC resuelven problemas diferentes',
  'Diagnóstico: identifica primero la frontera que falló',
  'LiveKit Agents vs Pipecat vs vanilla/thin en esta capa',
  'Tres decisiones concretas',
  'Qué no debes usar como criterio de selección',
];
const enAnchors = [
  'Draw the path before choosing an acronym',
  'WebRTC: the route selected by ICE matters',
  'Codec, sample rate, and packetization are different decisions',
  'Jitter is not latency',
  'SIP does not carry the voice by itself',
  'Telephony can narrow the signal before it reaches the model',
  'PSTN over WebSocket: the carrier can hide SIP and RTP from your application',
  'Audio WebSocket and WebRTC solve different problems',
  'Diagnosis: identify the failing boundary first',
  'LiveKit Agents vs Pipecat vs vanilla/thin at the media layer',
  'Three concrete decisions',
  'What not to use as a selection criterion',
];
for (const anchor of esAnchors) check(es.includes(anchor), `ES: missing concept ${anchor}`);
for (const anchor of enAnchors) check(en.includes(anchor), `EN: missing concept ${anchor}`);

for (const text of [es, en]) {
  for (const token of [
    'ICE', 'STUN', 'TURN', 'UDP', 'TCP', 'TLS',
    'Opus', 'PCMA', 'PCMU', 'RTP', 'SRTP', 'SDP',
    'jitterBufferDelay', 'jitterBufferEmittedCount', 'jitterBufferTargetDelay', 'jitterBufferMinimumDelay',
    'audio/x-mulaw', '8 kHz', 'mark', 'clear',
    'SmallWebRTCTransport', 'TwilioFrameSerializer',
  ]) check(text.includes(token), `Missing required network/media token ${token}`);
}

check(es.includes('TURN no significa «la llamada falló»'), 'ES: TURN relay-vs-failure caveat missing');
check(en.includes('TURN does not mean “the call failed.”'), 'EN: TURN relay-vs-failure caveat missing');
check(es.includes('ICE sobre UDP, TURN sobre UDP, ICE sobre TCP y TURN sobre TLS'), 'ES: LiveKit connection fallback order missing');
check(en.includes('ICE over UDP, TURN over UDP, ICE over TCP, and TURN over TLS'), 'EN: LiveKit connection fallback order missing');

check(es.includes('exige que endpoints WebRTC implementen Opus, PCMA y PCMU') && es.includes('no una garantía de que cada sesión negociará Opus'), 'ES: mandatory-to-implement vs negotiated codec boundary missing');
check(en.includes('requires WebRTC endpoints to implement Opus, PCMA, and PCMU') && en.includes('not a guarantee that every session negotiates Opus'), 'EN: mandatory-to-implement vs negotiated codec boundary missing');
check(es.includes('2.5, 5, 10, 20, 40 o 60 ms') && es.includes('hasta 120 ms'), 'ES: RFC 7587 frame/packet duration contract missing');
check(en.includes('2.5, 5, 10, 20, 40, or 60 ms') && en.includes('up to 120 ms'), 'EN: RFC 7587 frame/packet duration contract missing');
check(es.includes('receptor necesita acceso al paquete siguiente') && es.includes('margen de jitter buffer'), 'ES: Opus in-band FEC recovery boundary missing');
check(en.includes('receiver needs access to the following packet') && en.includes('jitter-buffer margin'), 'EN: Opus in-band FEC recovery boundary missing');

check(es.includes('= jitterBufferDelay / jitterBufferEmittedCount') && es.includes('Para una ventana temporal usa deltas'), 'ES: WebRTC jitter-buffer metric methodology missing');
check(en.includes('= jitterBufferDelay / jitterBufferEmittedCount') && en.includes('For a time window, use deltas'), 'EN: WebRTC jitter-buffer metric methodology missing');
check(es.includes('pérdida aleatoria y una ráfaga de pérdida') && es.includes('resultados perceptivos muy diferentes'), 'ES: burst-vs-average loss caveat missing');
check(en.includes('Random loss and a burst of loss') && en.includes('very different perceptual outcomes'), 'EN: burst-vs-average loss caveat missing');

check(es.includes('un `200 OK` de SIP no demuestra que exista audio bidireccional'), 'ES: SIP signaling-vs-media boundary missing');
check(en.includes('a SIP `200 OK` does not prove that bidirectional audio exists'), 'EN: SIP signaling-vs-media boundary missing');
check(es.includes('los codecs SIP son distintos de los codecs usados dentro de una room'), 'ES: LiveKit SIP-vs-room codec boundary missing');
check(en.includes('SIP codecs are distinct from the codecs used inside a LiveKit room'), 'EN: LiveKit SIP-vs-room codec boundary missing');

check(es.includes('`audio/x-mulaw`, 8 kHz, mono') && es.includes('una sola stream bidireccional por Call'), 'ES: Twilio Media Streams audio/stream contract missing');
check(en.includes('`audio/x-mulaw`, 8 kHz, mono') && en.includes('Only one bidirectional stream is allowed per Call'), 'EN: Twilio Media Streams audio/stream contract missing');
check(es.includes('evidencia del estado de playback **dentro de Twilio**, no prueba física'), 'ES: Twilio mark observability boundary missing');
check(en.includes('evidence about playback state **inside Twilio**, not physical proof'), 'EN: Twilio mark observability boundary missing');
check(es.includes('`X-Twilio-Signature`'), 'ES: Twilio media authentication boundary missing');
check(en.includes('`X-Twilio-Signature`'), 'EN: Twilio media authentication boundary missing');

check(es.includes('Un WebSocket es un canal bidireccional de aplicación sobre TCP') && es.includes('No añade automáticamente timestamps RTP, jitter buffer, ICE/TURN'), 'ES: WebSocket-vs-WebRTC boundary missing');
check(en.includes('A WebSocket is a bidirectional application channel over TCP') && en.includes('does not automatically provide RTP timestamps, a jitter buffer, ICE/TURN'), 'EN: WebSocket-vs-WebRTC boundary missing');

check(es.includes('No hay un ganador universal'), 'ES: no-universal-winner rule missing');
check(en.includes('There is no universal winner'), 'EN: no-universal-winner rule missing');
for (const token of ['LiveKit', 'Pipecat', 'Vanilla/thin Python']) {
  check(es.includes(token), `ES: runtime decision missing ${token}`);
  check(en.includes(token), `EN: runtime decision missing ${token}`);
}
check(es.includes('LiveKit Cloud') && es.includes('LiveKit SIP') && es.includes('Agents es el runtime/orquestación'), 'ES: LiveKit framework-vs-managed/media boundary missing');
check(en.includes('LiveKit Cloud') && en.includes('LiveKit SIP') && en.includes('Agents is the runtime/orchestration layer'), 'EN: LiveKit framework-vs-managed/media boundary missing');
check(es.includes('SmallWebRTC') && es.includes('signaling, STUN/TURN y operación vuelven a tu deployment'), 'ES: Pipecat transport ownership boundary missing');
check(en.includes('SmallWebRTC') && en.includes('signaling, STUN/TURN, and operation back into your deployment'), 'EN: Pipecat transport ownership boundary missing');
check(es.includes('Thin Python puede ser muy razonable sin implementar protocolos desde cero'), 'ES: vanilla does-not-imply-owning-protocols caveat missing');
check(en.includes('Thin Python can be entirely reasonable without implementing protocols from scratch'), 'EN: vanilla does-not-imply-owning-protocols caveat missing');
check(es.includes('LiveKitTransport') && es.includes('TwilioFrameSerializer'), 'ES: hybrid examples missing');
check(en.includes('LiveKitTransport') && en.includes('TwilioFrameSerializer'), 'EN: hybrid examples missing');

for (const token of ['Browser', 'PSTN', 'Pipeline experimental']) {
  if (token === 'Pipeline experimental') continue;
  check(es.includes(token), `ES: concrete workload example missing ${token}`);
}
check(es.includes('Asistente de navegador') && es.includes('Agente PSTN') && es.includes('Pipeline experimental de bajo nivel'), 'ES: three required concrete cases missing');
check(en.includes('Browser assistant') && en.includes('PSTN agent') && en.includes('Low-level experimental pipeline'), 'EN: three required concrete cases missing');

check(es.includes('estrellas de GitHub') && es.includes('demo sin condiciones de red') && es.includes('framework') && es.includes('reportar distribución'), 'ES: anti-proxy/controlled-benchmark rule missing');
check(en.includes('GitHub stars') && en.includes('polished demo') && en.includes('framework latency') && en.includes('report a distribution'), 'EN: anti-proxy/controlled-benchmark rule missing');
check(!/^\s*-\s+.+;\s*$/m.test(en), 'EN: semicolon-list anti-pattern detected');
check(!/LiveKit (es|is) (el )?(mejor|best|fastest)/i.test(`${es}\n${en}`), 'Universal LiveKit winner claim detected');
check(!/Pipecat (es|is) (el )?(mejor|best|fastest)/i.test(`${es}\n${en}`), 'Universal Pipecat winner claim detected');

const visualInclude = '{{ include_html("snippets/articulos-tecnicos/voice-network-paths.html") }}';
check(es.includes(visualInclude), 'ES: network path visual include missing');
check(en.includes(visualInclude), 'EN: network path visual include missing');
check(snippet.includes('s5v-network-paths') && snippet.includes('WebRTC + ICE') && snippet.includes('SIP + SDP') && snippet.includes('WSS audio'), 'Visual: three media boundaries incomplete');
check(mirror.trim() === '<!-- 5sigmas-canonical-mirror -->', 'EN: network path canonical mirror marker invalid');
check(i18n.source === 'snippets/articulos-tecnicos/voice-network-paths.html', 'EN: network path i18n source path invalid');
const snippetBytes = Buffer.from(snippet, 'utf8');
const blobHeader = Buffer.from(`blob ${snippetBytes.length}\0`, 'utf8');
const snippetBlobSha = crypto.createHash('sha1').update(Buffer.concat([blobHeader, snippetBytes])).digest('hex');
check(i18n.source_blob_sha === snippetBlobSha, `EN: network path source_blob_sha stale (${i18n.source_blob_sha} != ${snippetBlobSha})`);
for (const token of ['Network and media', 'WebRTC + ICE', 'SIP + SDP', 'carries the audio', 'carrier contract', 'agent runtime']) {
  check(snippet.includes(token) || Object.values(i18n.replacements).some((value) => String(value).includes(token)), `EN visual translation missing ${token}`);
}

check(mkdocsEs.includes('WebRTC, SIP y telefonía: series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red.md'), 'ES: chapter 5 navigation missing');
check(mkdocsEn.includes('WebRTC, SIP and telephony: series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red.md'), 'EN: chapter 5 navigation missing');
check(manifest.includes('series/agentes-voz-tiempo-real/05-webrtc-sip-telefonia-red.md'), 'EN: chapter 5 manifest route missing');
check(manifest.includes('snippets/articulos-tecnicos/voice-network-paths.html'), 'EN: chapter 5 required snippet missing');

if (failures.length) {
  console.error(`Voice network/telephony chapter source gate failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Voice network/telephony chapter source gate PASS');
console.log(`ES bytes=${Buffer.byteLength(es)} EN bytes=${Buffer.byteLength(en)}`);
