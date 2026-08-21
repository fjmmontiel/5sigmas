(function () {
  'use strict';

  const core = window.S5TransformerAttention;
  if (!core) return;

  const I18N = {
    es: {
      defaults: 'el gato vio al gato',
      heads: { local: 'Contexto local', previous: 'Token anterior', repeat: 'Repetición léxica' },
      copied: 'Enlace copiado.', copyFallback: 'El escenario está en la URL.', exported: 'JSON exportado.',
      reset: 'Escenario restablecido.', masked: 'enmascarado', effective: 'tokens efectivos',
      rowAria: 'Seleccionar token de consulta', matrixCaption: 'Pesos de atención por token de consulta y clave',
      valueLabel: 'Valor V escalar', logitLabel: 'Logit previo a softmax'
    },
    en: {
      defaults: 'the cat saw the cat',
      heads: { local: 'Local context', previous: 'Previous token', repeat: 'Lexical repetition' },
      copied: 'Link copied.', copyFallback: 'The scenario is encoded in the URL.', exported: 'JSON exported.',
      reset: 'Scenario reset.', masked: 'masked', effective: 'effective tokens',
      rowAria: 'Select query token', matrixCaption: 'Attention weights by query token and key token',
      valueLabel: 'Scalar V value', logitLabel: 'Pre-softmax logit'
    }
  };

  const fmt = (value, digits = 2) => Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  const pct = (value) => `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
  const clampIndex = (value, length) => Math.max(0, Math.min(length - 1, Number(value) || 0));

  document.querySelectorAll('[data-s5-transformer-attention]').forEach((root) => {
    const locale = root.dataset.locale === 'en' ? 'en' : 'es';
    const t = I18N[locale];
    const form = root.querySelector('[data-s5-tool-form]');
    const textField = form.querySelector('[data-field="text"]');
    const headField = form.querySelector('[data-field="head"]');
    const queryField = form.querySelector('[data-field="queryIndex"]');
    const causalField = form.querySelector('[data-field="causal"]');
    const temperatureField = form.querySelector('[data-field="temperature"]');
    const temperatureValue = root.querySelector('[data-output="temperature"]');
    const matrixHost = root.querySelector('[data-attention-matrix]');
    const rowHost = root.querySelector('[data-attention-row]');
    const comparisonHost = root.querySelector('[data-head-comparison]');
    const feedback = root.querySelector('[data-s5-tool-feedback]');

    const state = { tokens: [], queryIndex: 0, head: 'repeat', causal: true, temperature: 1, logits: [], values: [] };

    function notify(message) {
      feedback.textContent = message;
      feedback.hidden = false;
      window.clearTimeout(notify.timer);
      notify.timer = window.setTimeout(() => { feedback.hidden = true; }, 2600);
    }

    function setTokens(text, requestedQuery = null) {
      state.tokens = core.tokenize(text || t.defaults, 8);
      if (!state.tokens.length) state.tokens = core.tokenize(t.defaults, 8);
      state.queryIndex = clampIndex(requestedQuery == null ? state.tokens.length - 1 : requestedQuery, state.tokens.length);
      state.logits = core.baseLogits(state.tokens, state.head, state.queryIndex);
      state.values = core.defaultValues(state.tokens.length);
      queryField.innerHTML = '';
      state.tokens.forEach((token, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = `${index + 1} · ${token}`;
        queryField.appendChild(option);
      });
      queryField.value = String(state.queryIndex);
    }

    function resetRowScores() { state.logits = core.baseLogits(state.tokens, state.head, state.queryIndex); }

    function result() {
      return core.analyze({ tokens: state.tokens, head: state.head, queryIndex: state.queryIndex, causal: state.causal, temperature: state.temperature, logits: state.logits, values: state.values });
    }

    function renderKpis(current) {
      root.querySelector('[data-output="queryToken"]').textContent = `${current.queryIndex + 1} · ${current.tokens[current.queryIndex]}`;
      root.querySelector('[data-output="topToken"]').textContent = `${current.topIndex + 1} · ${current.tokens[current.topIndex]} · ${pct(current.weights[current.topIndex])}`;
      root.querySelector('[data-output="entropy"]').textContent = `${fmt(current.entropy, 2)} nat`;
      root.querySelector('[data-output="effectiveTokens"]').textContent = fmt(current.effectiveTokens, 2);
      root.querySelector('[data-output="outputScalar"]').textContent = fmt(current.output, 3);
      root.querySelector('[data-output="allowedKeys"]').textContent = `${current.allowedKeys}/${current.tokens.length}`;
      temperatureValue.textContent = fmt(current.temperature, 2);
    }

    function renderMatrix(current) {
      const matrix = core.matrix({ tokens: state.tokens, head: state.head, causal: state.causal, temperature: state.temperature });
      matrix[state.queryIndex] = current.weights.slice();
      const table = document.createElement('table');
      table.className = 's5-attention-matrix';
      const caption = document.createElement('caption');
      caption.textContent = t.matrixCaption;
      table.appendChild(caption);
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      headRow.appendChild(document.createElement('th'));
      state.tokens.forEach((token, index) => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.innerHTML = `<span>${index + 1}</span><strong>${token}</strong>`;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      matrix.forEach((weights, rowIndex) => {
        const tr = document.createElement('tr');
        if (rowIndex === state.queryIndex) tr.dataset.selected = 'true';
        const rowTh = document.createElement('th');
        rowTh.scope = 'row';
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.queryRow = String(rowIndex);
        button.setAttribute('aria-label', `${t.rowAria}: ${state.tokens[rowIndex]}`);
        button.innerHTML = `<span>${rowIndex + 1}</span><strong>${state.tokens[rowIndex]}</strong>`;
        rowTh.appendChild(button);
        tr.appendChild(rowTh);
        weights.forEach((weight, colIndex) => {
          const td = document.createElement('td');
          const masked = state.causal && colIndex > rowIndex;
          td.dataset.masked = masked ? 'true' : 'false';
          td.innerHTML = `<span class="s5-attention-cell__shade" style="opacity:${Math.min(0.82, weight * 1.35)}"></span><span class="s5-attention-cell__value">${masked ? '×' : pct(weight)}</span>`;
          td.setAttribute('aria-label', masked ? `${state.tokens[colIndex]}: ${t.masked}` : `${state.tokens[colIndex]}: ${pct(weight)}`);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      matrixHost.replaceChildren(table);
    }

    function renderSelectedRow(current) {
      rowHost.innerHTML = '';
      current.tokens.forEach((token, index) => {
        const item = document.createElement('div');
        item.className = 's5-attention-key-row';
        if (state.causal && index > state.queryIndex) item.dataset.masked = 'true';
        const logitId = `s5-att-logit-${locale}-${index}`;
        const valueId = `s5-att-value-${locale}-${index}`;
        item.innerHTML = `
          <div class="s5-attention-key-row__token"><span>${index + 1}</span><strong>${token}</strong></div>
          <div class="s5-attention-key-row__score">
            <label for="${logitId}">${t.logitLabel}</label>
            <input id="${logitId}" data-logit-index="${index}" type="range" min="-4" max="4" step="0.1" value="${current.logits[index].toFixed(1)}" />
            <output>${state.causal && index > state.queryIndex ? t.masked : current.logits[index].toFixed(1)}</output>
          </div>
          <div class="s5-attention-key-row__weight"><small>softmax</small><strong>${pct(current.weights[index])}</strong></div>
          <div class="s5-attention-key-row__value">
            <label for="${valueId}">${t.valueLabel}</label>
            <input id="${valueId}" data-value-index="${index}" type="number" step="0.1" value="${current.values[index].toFixed(2)}" />
          </div>
          <div class="s5-attention-key-row__contribution"><small>α × V</small><strong>${fmt(current.contributions[index], 3)}</strong></div>`;
        rowHost.appendChild(item);
      });
    }

    function renderComparison() {
      const rows = core.compareHeads({ tokens: state.tokens, queryIndex: state.queryIndex, causal: state.causal, temperature: state.temperature });
      comparisonHost.innerHTML = '';
      rows.forEach((item) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 's5-attention-head-row';
        row.dataset.headChoice = item.head;
        if (item.head === state.head) row.dataset.selected = 'true';
        row.innerHTML = `<span>${t.heads[item.head]}</span><strong>${state.tokens[item.topIndex]} · ${pct(item.topWeight)}</strong><small>${fmt(item.effectiveTokens, 2)} ${t.effective}</small>`;
        comparisonHost.appendChild(row);
      });
    }

    function render() {
      const current = result();
      renderKpis(current);
      renderMatrix(current);
      renderSelectedRow(current);
      renderComparison();
    }

    function scenarioParams() {
      const params = new URLSearchParams();
      params.set('text', state.tokens.join(' '));
      params.set('h', state.head);
      params.set('q', String(state.queryIndex));
      params.set('c', state.causal ? '1' : '0');
      params.set('t', state.temperature.toFixed(2));
      params.set('s', state.logits.map((value) => Number(value).toFixed(1)).join(','));
      params.set('v', state.values.map((value) => Number(value).toFixed(2)).join(','));
      return params;
    }

    async function share() {
      const url = `${window.location.origin}${window.location.pathname}?${scenarioParams().toString()}`;
      window.history.replaceState({}, '', url);
      try { await navigator.clipboard.writeText(url); notify(t.copied); }
      catch { notify(t.copyFallback); }
    }

    function exportJson() {
      const current = result();
      const payload = {
        tool: '5sigmas-transformer-attention-visualizer', version: core.VERSION, locale, exported_at: new Date().toISOString(),
        assumption: 'Synthetic pre-softmax attention scores; not weights extracted from a trained model.',
        scenario: { tokens: state.tokens, head: state.head, query_index: state.queryIndex, causal: state.causal, educational_temperature: state.temperature, selected_row_logits: current.logits, scalar_values: current.values },
        selected_query: { masked_logits: current.maskedLogits.map((value) => Number.isFinite(value) ? value : null), attention_weights: current.weights, weighted_value_contributions: current.contributions, scalar_output: current.output, entropy_nats: current.entropy, effective_tokens: current.effectiveTokens },
        base_attention_matrix: core.matrix({ tokens: state.tokens, head: state.head, causal: state.causal, temperature: state.temperature }),
        sources: ['https://arxiv.org/abs/1706.03762', 'https://docs.pytorch.org/docs/main/generated/torch.nn.functional.scaled_dot_product_attention.html']
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `5sigmas-transformer-attention-${locale}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      notify(t.exported);
    }

    function loadFromUrl() {
      const params = new URLSearchParams(window.location.search);
      const text = params.get('text') || t.defaults;
      state.head = core.HEADS.includes(params.get('h')) ? params.get('h') : 'repeat';
      state.causal = params.get('c') !== '0';
      state.temperature = Math.max(0.25, Math.min(4, Number(params.get('t')) || 1));
      textField.value = text;
      headField.value = state.head;
      causalField.checked = state.causal;
      temperatureField.value = String(state.temperature);
      setTokens(text, Number(params.get('q')));
      const logits = (params.get('s') || '').split(',').map(Number);
      const values = (params.get('v') || '').split(',').map(Number);
      if (logits.length === state.tokens.length && logits.every(Number.isFinite)) state.logits = logits;
      if (values.length === state.tokens.length && values.every(Number.isFinite)) state.values = values;
      render();
    }

    textField.addEventListener('change', () => { setTokens(textField.value); render(); });
    headField.addEventListener('change', () => { state.head = headField.value; resetRowScores(); render(); });
    queryField.addEventListener('change', () => { state.queryIndex = clampIndex(queryField.value, state.tokens.length); resetRowScores(); render(); });
    causalField.addEventListener('change', () => { state.causal = causalField.checked; render(); });
    temperatureField.addEventListener('input', () => { state.temperature = Number(temperatureField.value); render(); });

    matrixHost.addEventListener('click', (event) => {
      const button = event.target.closest('[data-query-row]');
      if (!button) return;
      state.queryIndex = clampIndex(button.dataset.queryRow, state.tokens.length);
      queryField.value = String(state.queryIndex);
      resetRowScores();
      render();
    });
    comparisonHost.addEventListener('click', (event) => {
      const button = event.target.closest('[data-head-choice]');
      if (!button) return;
      state.head = button.dataset.headChoice;
      headField.value = state.head;
      resetRowScores();
      render();
    });
    rowHost.addEventListener('input', (event) => {
      const logit = event.target.closest('[data-logit-index]');
      if (logit) { state.logits[Number(logit.dataset.logitIndex)] = Number(logit.value); render(); return; }
      const value = event.target.closest('[data-value-index]');
      if (value) { state.values[Number(value.dataset.valueIndex)] = Number(value.value); render(); }
    });

    form.querySelector('[data-action="share"]').addEventListener('click', share);
    form.querySelector('[data-action="export"]').addEventListener('click', exportJson);
    form.querySelector('[data-action="reset"]').addEventListener('click', () => {
      window.history.replaceState({}, '', window.location.pathname);
      textField.value = t.defaults;
      state.head = 'repeat'; state.causal = true; state.temperature = 1;
      headField.value = state.head; causalField.checked = true; temperatureField.value = '1';
      setTokens(t.defaults); render(); notify(t.reset);
    });

    loadFromUrl();
  });
})();
