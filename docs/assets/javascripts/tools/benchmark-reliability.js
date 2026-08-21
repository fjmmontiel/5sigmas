(function () {
  'use strict';
  const Core = globalThis.S5BenchmarkReliabilityCore;
  if (!Core) return;

  const TEXT = {
    es: {
      modelA: 'Modelo A', modelB: 'Modelo B', tie: 'Empate', stable: 'estable bajo el rango elegido', fragile: 'puede cambiar al reponderar tareas',
      yes: 'sí', no: 'no', unresolved: 'intervalos solapados', separated: 'intervalos separados', copied: 'Enlace copiado.', exported: 'JSON exportado.',
      flags: {
        'weight-fragile': 'ranking sensible a la composición', saturated: 'benchmark cerca del techo',
        'contamination-sensitive': 'la diferencia cabe en la envolvente de exposición', 'invalid-item-sensitive': 'la diferencia cabe en la envolvente de ítems inválidos',
        'statistically-unresolved': 'resolución estadística limitada'
      }
    },
    en: {
      modelA: 'Model A', modelB: 'Model B', tie: 'Tie', stable: 'stable within the selected range', fragile: 'can flip when task weights change',
      yes: 'yes', no: 'no', unresolved: 'intervals overlap', separated: 'intervals separated', copied: 'Link copied.', exported: 'JSON exported.',
      flags: {
        'weight-fragile': 'ranking depends on benchmark composition', saturated: 'benchmark is near its ceiling',
        'contamination-sensitive': 'gap fits inside the exposure envelope', 'invalid-item-sensitive': 'gap fits inside the invalid-item envelope',
        'statistically-unresolved': 'limited statistical resolution'
      }
    }
  };

  function fmt(value, digits = 1) { return Number(value).toFixed(digits); }
  function pct(value, digits = 1) { return `${fmt(value, digits)}%`; }
  function winner(gap, t) { if (Math.abs(gap) < 1e-9) return t.tie; return gap > 0 ? t.modelA : t.modelB; }
  function interpretation(metrics, locale, t) {
    const tied = Math.abs(metrics.gap) < 1e-9;
    if (locale === 'es') {
      const lead = tied
        ? 'Los modelos quedan empatados con los pesos actuales.'
        : `${winner(metrics.gap, t)} lidera por ${fmt(metrics.absoluteGap, 2)} pp con los pesos actuales.`;
      const composition = metrics.rankSensitivity.flips
        ? 'El ganador puede cambiar al reponderar las familias de tareas.'
        : 'El ganador se mantiene en todo el rango de ponderaciones explorado.';
      const resolution = metrics.intervalOverlap
        ? 'Los intervalos descriptivos se solapan.'
        : 'Los intervalos descriptivos quedan separados.';
      return `${lead} ${composition} ${resolution}`;
    }
    const lead = tied
      ? 'The models are tied under the current weights.'
      : `${winner(metrics.gap, t)} leads by ${fmt(metrics.absoluteGap, 2)} pp under the current weights.`;
    const composition = metrics.rankSensitivity.flips
      ? 'The winner can flip when task-family weights change.'
      : 'The winner stays the same across the explored weight range.';
    const resolution = metrics.intervalOverlap
      ? 'The descriptive intervals overlap.'
      : 'The descriptive intervals are separated.';
    return `${lead} ${composition} ${resolution}`;
  }

  document.querySelectorAll('[data-s5-benchmark-reliability]').forEach((root) => {
    const locale = root.dataset.locale === 'en' ? 'en' : 'es';
    const t = TEXT[locale];
    const feedback = root.querySelector('[data-s5-tool-feedback]');
    const fields = Array.from(root.querySelectorAll('[data-field]'));
    let readUrlState = true;

    function read() {
      const params = readUrlState ? new URLSearchParams(location.search) : new URLSearchParams();
      const raw = {
        items: params.has('n') ? params.get('n') : root.querySelector('[data-field="items"]').value,
        invalidRate: params.has('invalid') ? params.get('invalid') : root.querySelector('[data-field="invalidRate"]').value,
        contaminationExposure: params.has('contam') ? params.get('contam') : root.querySelector('[data-field="contaminationExposure"]').value,
        weightSwing: params.has('swing') ? params.get('swing') : root.querySelector('[data-field="weightSwing"]').value,
        groups: [0,1,2,3].map((index) => ({
          weight: params.has(`w${index}`) ? params.get(`w${index}`) : root.querySelector(`[data-field="w${index}"]`).value,
          a: params.has(`a${index}`) ? params.get(`a${index}`) : root.querySelector(`[data-field="a${index}"]`).value,
          b: params.has(`b${index}`) ? params.get(`b${index}`) : root.querySelector(`[data-field="b${index}"]`).value
        }))
      };
      return Core.normalize(raw);
    }

    function apply(input) {
      root.querySelector('[data-field="items"]').value = input.items;
      root.querySelector('[data-field="invalidRate"]').value = input.invalidRate;
      root.querySelector('[data-field="contaminationExposure"]').value = input.contaminationExposure;
      root.querySelector('[data-field="weightSwing"]').value = input.weightSwing;
      input.groups.forEach((group, index) => {
        root.querySelector(`[data-field="w${index}"]`).value = group.weight;
        root.querySelector(`[data-field="a${index}"]`).value = group.a;
        root.querySelector(`[data-field="b${index}"]`).value = group.b;
      });
    }

    function currentUrl(input) {
      const url = new URL(location.href);
      const p = url.searchParams;
      p.set('n', input.items); p.set('invalid', input.invalidRate); p.set('contam', input.contaminationExposure); p.set('swing', input.weightSwing);
      input.groups.forEach((group, index) => { p.set(`w${index}`, group.weight); p.set(`a${index}`, group.a); p.set(`b${index}`, group.b); });
      return url.toString();
    }

    function render() {
      const result = Core.evaluate(read());
      apply(result.input);
      const m = result.metrics;
      const out = (name, value) => root.querySelectorAll(`[data-output="${name}"]`).forEach((node) => { node.textContent = value; });
      out('scoreA', pct(m.scoreA)); out('scoreB', pct(m.scoreB)); out('gap', `${fmt(Math.abs(m.gap), 2)} pp · ${winner(m.gap, t)}`);
      out('cleanItems', m.cleanItems.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US'));
      out('intervalA', `${pct(m.intervalA.low)}–${pct(m.intervalA.high)}`); out('intervalB', `${pct(m.intervalB.low)}–${pct(m.intervalB.high)}`);
      out('resolution', m.intervalOverlap ? t.unresolved : t.separated);
      out('headroom', `${fmt(m.maxHeadroom, 1)} pp`);
      out('gapItems', String(m.gapItems)); out('invalidItems', String(m.invalidItems)); out('exposureItems', String(m.exposureItems));
      out('invalidEnvelope', m.invalidEnvelopeCoversGap ? t.yes : t.no); out('contaminationEnvelope', m.contaminationEnvelopeCoversGap ? t.yes : t.no);
      out('weightRange', `${fmt(m.rankSensitivity.minGap, 2)} → ${fmt(m.rankSensitivity.maxGap, 2)} pp`);
      out('weightStatus', m.rankSensitivity.flips ? t.fragile : t.stable);
      out('interpretation', interpretation(m, locale, t));

      root.querySelectorAll('[data-group-row]').forEach((row, index) => {
        const group = result.input.groups[index];
        const share = m.weights[index] * 100;
        row.querySelector('[data-group-share]').textContent = pct(share, 1);
        row.querySelector('[data-group-gap]').textContent = `${fmt(group.a - group.b, 1)} pp`;
        row.dataset.winner = group.a === group.b ? 'tie' : (group.a > group.b ? 'a' : 'b');
      });

      const flags = root.querySelector('[data-output="flags"]');
      flags.innerHTML = '';
      if (!result.flags.length) {
        const span = document.createElement('span'); span.className = 's5-benchmark-flag is-clear'; span.textContent = locale === 'es' ? 'Sin fragilidades activadas por estos supuestos' : 'No fragility flags triggered by these assumptions'; flags.appendChild(span);
      } else result.flags.forEach((flag) => { const span = document.createElement('span'); span.className = 's5-benchmark-flag'; span.textContent = t.flags[flag]; flags.appendChild(span); });

      root.dataset.snapshot = JSON.stringify({ methodologyVersion: Core.METHODOLOGY_VERSION, sourceReviewDate: Core.SOURCE_REVIEW_DATE, sources: Core.SOURCES, ...result, shareUrl: currentUrl(result.input) });
      return result;
    }

    function message(text) { if (!feedback) return; feedback.hidden = false; feedback.textContent = text; }
    fields.forEach((field) => field.addEventListener('input', render));
    root.querySelector('[data-action="reset"]').addEventListener('click', () => { history.replaceState(null, '', location.pathname); apply(Core.DEFAULTS); render(); });
    root.querySelector('[data-action="share"]').addEventListener('click', async () => { const result = render(); const url = currentUrl(result.input); history.replaceState(null, '', url); try { await navigator.clipboard.writeText(url); message(t.copied); } catch (_) { message(url); } });
    root.querySelector('[data-action="export"]').addEventListener('click', () => { render(); const blob = new Blob([root.dataset.snapshot], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '5sigmas-benchmark-reliability.json'; a.click(); URL.revokeObjectURL(a.href); message(t.exported); });

    const initial = read();
    apply(initial);
    readUrlState = false;
    render();
  });
})();
