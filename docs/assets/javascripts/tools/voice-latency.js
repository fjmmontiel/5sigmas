(() => {
  'use strict';

  const root = document.querySelector('[data-s5-voice-latency]');
  if (!root || !window.S5VoiceLatencyCore) return;
  const core = window.S5VoiceLatencyCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';

  const copy = {
    es: {
      copied: 'Enlace copiado.', copyFailed: 'No se pudo copiar automáticamente. Copia la URL del navegador.', reset: 'Escenario restablecido.', downloaded: 'JSON generado.',
      within: 'Dentro del objetivo', over: 'Fuera del objetivo', headroom: (ms) => `${ms} ms de margen`, excess: (ms) => `${ms} ms por encima`,
      feasible: (ms) => `Con el resto del pipeline fijo, el modelo dispone de hasta ${ms} ms para cumplir el objetivo.`,
      infeasible: 'El objetivo ya se supera antes de asignar tiempo al modelo: primero reduce transporte, detección de turno, STT/TTS o buffering.',
      stageNames: { ingressMs: 'Entrada de audio', endpointMs: 'Fin de turno', sttMs: 'STT residual', modelMs: 'Primera salida del modelo', ttsMs: 'Primer audio TTS', egressMs: 'Salida de audio', bufferMs: 'Buffer de reproducción' },
      bargeRead: (ms, target, ok) => ok ? `El camino de interrupción suma ${ms} ms frente a tu objetivo de ${target} ms.` : `El camino de interrupción suma ${ms} ms y excede tu objetivo de ${target} ms.`,
      architecture: { cascade: 'Cascada STT → LLM → TTS', halfCascade: 'Half-cascade / audio → modelo → TTS', speechToSpeech: 'Speech-to-speech' }
    },
    en: {
      copied: 'Link copied.', copyFailed: 'Automatic copy failed. Copy the browser URL instead.', reset: 'Scenario reset.', downloaded: 'JSON generated.',
      within: 'Within target', over: 'Over target', headroom: (ms) => `${ms} ms headroom`, excess: (ms) => `${ms} ms over`,
      feasible: (ms) => `With the rest of the pipeline fixed, the model has up to ${ms} ms to meet the target.`,
      infeasible: 'The target is already exceeded before assigning any model time: reduce transport, turn detection, STT/TTS or buffering first.',
      stageNames: { ingressMs: 'Audio ingress', endpointMs: 'Turn end', sttMs: 'Residual STT', modelMs: 'Model first output', ttsMs: 'TTS first audio', egressMs: 'Audio egress', bufferMs: 'Playback buffer' },
      bargeRead: (ms, target, ok) => ok ? `The interruption path totals ${ms} ms against your ${target} ms target.` : `The interruption path totals ${ms} ms and exceeds your ${target} ms target.`,
      architecture: { cascade: 'STT → LLM → TTS cascade', halfCascade: 'Half-cascade / audio → model → TTS', speechToSpeech: 'Speech-to-speech' }
    }
  }[locale];

  const fields = Object.fromEntries([...root.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]));
  const outputs = Object.fromEntries([...root.querySelectorAll('[data-output]')].map((el) => [el.dataset.output, el]));
  const feedback = root.querySelector('[data-s5-tool-feedback]');
  const timeline = Object.fromEntries([...root.querySelectorAll('[data-stage]')].map((el) => [el.dataset.stage, el]));

  function number(name, fallback = 0) {
    const value = Number(fields[name]?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function currentInput() {
    return {
      architecture: fields.architecture.value,
      ingressMs: number('ingressMs'), endpointMs: number('endpointMs'), sttMs: number('sttMs'), modelMs: number('modelMs'), ttsMs: number('ttsMs'),
      egressMs: number('egressMs'), bufferMs: number('bufferMs'), targetMs: number('targetMs'),
      bargeDetectMs: number('bargeDetectMs'), cancelMs: number('cancelMs'), clearMs: number('clearMs'), bargeTargetMs: number('bargeTargetMs')
    };
  }

  function setFeedback(text) {
    feedback.textContent = text;
    feedback.hidden = false;
    clearTimeout(setFeedback.timer);
    setFeedback.timer = setTimeout(() => { feedback.hidden = true; }, 2500);
  }

  function applyPreset(name) {
    const values = core.preset(name);
    fields.architecture.value = values.architecture;
    Object.entries(values).forEach(([key, value]) => {
      if (key !== 'architecture' && fields[key]) fields[key].value = String(value);
    });
  }

  function renderTimeline(result) {
    core.RESPONSE_STAGE_KEYS.forEach((key) => {
      const item = timeline[key];
      if (!item) return;
      const share = result.responseShares[key] || 0;
      item.style.setProperty('--share', `${Math.max(0, Math.min(100, share * 100))}%`);
      const value = item.querySelector('[data-stage-value]');
      if (value) value.textContent = `${result.input[key]} ms`;
      item.dataset.zero = result.input[key] === 0 ? 'true' : 'false';
    });
  }

  function render() {
    const result = core.evaluate(currentInput());
    outputs.responseMs.textContent = `${result.responseMs} ms`;
    outputs.responseStatus.textContent = result.responseWithinTarget ? copy.within : copy.over;
    outputs.responseStatus.dataset.state = result.responseWithinTarget ? 'good' : 'warn';
    outputs.responseDelta.textContent = result.responseWithinTarget ? copy.headroom(result.responseHeadroomMs) : copy.excess(Math.abs(result.responseHeadroomMs));
    outputs.bargeMs.textContent = `${result.bargeInMs} ms`;
    outputs.bargeStatus.textContent = result.bargeWithinTarget ? copy.within : copy.over;
    outputs.bargeStatus.dataset.state = result.bargeWithinTarget ? 'good' : 'warn';
    outputs.bargeDelta.textContent = result.bargeWithinTarget ? copy.headroom(result.bargeHeadroomMs) : copy.excess(Math.abs(result.bargeHeadroomMs));
    outputs.modelBudget.textContent = `${result.modelBudgetMs} ms`;
    outputs.modelBudgetRead.textContent = result.targetFeasibleWithoutModel ? copy.feasible(result.modelBudgetMs) : copy.infeasible;
    outputs.bottleneck.textContent = `${copy.stageNames[result.bottleneck]} · ${result.input[result.bottleneck]} ms`;
    outputs.architecture.textContent = copy.architecture[result.input.architecture];
    outputs.bargeRead.textContent = copy.bargeRead(result.bargeInMs, result.input.bargeTargetMs, result.bargeWithinTarget);
    renderTimeline(result);
  }

  function shareUrl() {
    const input = core.normalize(currentInput());
    const url = new URL(location.href);
    url.search = '';
    const map = { architecture: 'a', ingressMs: 'in', endpointMs: 'ep', sttMs: 'stt', modelMs: 'm', ttsMs: 'tts', egressMs: 'out', bufferMs: 'buf', targetMs: 'target', bargeDetectMs: 'bd', cancelMs: 'can', clearMs: 'clr', bargeTargetMs: 'bt' };
    Object.entries(map).forEach(([key, short]) => url.searchParams.set(short, String(input[key])));
    return url.toString();
  }

  function readUrlState() {
    const params = new URLSearchParams(location.search);
    const reverse = { a: 'architecture', in: 'ingressMs', ep: 'endpointMs', stt: 'sttMs', m: 'modelMs', tts: 'ttsMs', out: 'egressMs', buf: 'bufferMs', target: 'targetMs', bd: 'bargeDetectMs', can: 'cancelMs', clr: 'clearMs', bt: 'bargeTargetMs' };
    if (!params.has('a')) return;
    const architecture = params.get('a');
    if (core.PRESETS[architecture]) fields.architecture.value = architecture;
    Object.entries(reverse).forEach(([short, key]) => {
      if (key === 'architecture' || !params.has(short) || !fields[key]) return;
      const value = Number(params.get(short));
      if (Number.isFinite(value)) fields[key].value = String(value);
    });
  }

  function exportJson() {
    const result = core.evaluate(currentInput());
    const payload = {
      schema: '5sigmas.voice-latency-budget.v1',
      locale,
      measurementBoundary: 'end_of_user_speech_at_capture_edge_to_first_agent_audio_at_listener_edge',
      assumptions: 'illustrative_user_editable_not_provider_benchmark',
      inputs: result.input,
      outputs: {
        responseOnsetMs: result.responseMs,
        responseHeadroomMs: result.responseHeadroomMs,
        responseWithinTarget: result.responseWithinTarget,
        modelBudgetMs: result.modelBudgetMs,
        bottleneckStage: result.bottleneck,
        bargeInStopMs: result.bargeInMs,
        bargeHeadroomMs: result.bargeHeadroomMs,
        bargeWithinTarget: result.bargeWithinTarget
      },
      provenance: [
        'https://platform.openai.com/docs/api-reference/realtime',
        'https://developers.deepgram.com/docs/endpointing',
        'https://elevenlabs.io/docs/developer-guides/reducing-latency',
        'https://www.twilio.com/docs/voice/media-streams/websocket-messages',
        'https://pmc.ncbi.nlm.nih.gov/articles/PMC2705608/'
      ]
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = locale === 'es' ? '5sigmas-latencia-agente-voz.json' : '5sigmas-voice-agent-latency.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setFeedback(copy.downloaded);
  }

  root.querySelector('[data-s5-tool-form]').addEventListener('input', render);
  fields.architecture.addEventListener('change', () => { applyPreset(fields.architecture.value); render(); });
  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    applyPreset('cascade');
    history.replaceState({}, '', location.pathname);
    render();
    setFeedback(copy.reset);
  });
  root.querySelector('[data-action="share"]').addEventListener('click', async () => {
    const url = shareUrl();
    history.replaceState({}, '', url);
    try { await navigator.clipboard.writeText(url); setFeedback(copy.copied); } catch { setFeedback(copy.copyFailed); }
  });
  root.querySelector('[data-action="export"]').addEventListener('click', exportJson);

  readUrlState();
  render();
})();
