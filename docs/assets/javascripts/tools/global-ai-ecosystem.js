(() => {
  'use strict';

  const root = document.querySelector('[data-s5-global-ai-ecosystem]');
  if (!root || !window.S5GlobalAIEcosystemCore) return;

  const core = window.S5GlobalAIEcosystemCore;
  const locale = root.dataset.locale === 'en' ? 'en' : 'es';
  const t = {
    es: {
      loading: 'Cargando datos…', noComparable: 'No hay países con datos completos para esta combinación.',
      countries: 'países comparables', excluded: 'excluidos por datos ausentes', copied: 'Escenario copiado.',
      copyFail: 'No se pudo copiar automáticamente; usa la URL actual.', exported: 'Exportación preparada.',
      score: 'Puntuación del escenario', reference: 'Referencia Stanford 2024', normalized: 'Normalizado', weight: 'Peso',
      scenarioNote: 'La puntuación se recalcula solo sobre países con datos completos en todas las métricas activas.',
      country: 'País', tableScore: 'Puntuación', checked: 'Revisado',
    },
    en: {
      loading: 'Loading data…', noComparable: 'No countries have complete data for this combination.',
      countries: 'comparable countries', excluded: 'excluded for missing data', copied: 'Scenario copied.',
      copyFail: 'Automatic copy failed; use the current URL.', exported: 'Export prepared.',
      score: 'Scenario score', reference: 'Stanford 2024 reference', normalized: 'Normalized', weight: 'Weight',
      scenarioNote: 'The score is recomputed only across countries with complete data for every active metric.',
      country: 'Country', tableScore: 'Score', checked: 'Checked',
    },
  }[locale];

  const q = (selector) => root.querySelector(selector);
  const els = {
    metricControls: q('[data-output="metric-controls"]'), ranking: q('[data-output="ranking"]'),
    tableHead: q('[data-output="table-head"]'), tableBody: q('[data-output="table-body"]'),
    coverage: q('[data-output="coverage"]'), activeCount: q('[data-output="active-count"]'), leader: q('[data-output="leader"]'),
    focus: q('[data-field="focus"]'), focusPanel: q('[data-output="focus-panel"]'),
    sources: q('[data-output="sources"]'), feedback: q('[data-s5-tool-feedback]'),
  };

  let data;
  let state = { activeMetrics: [], weights: {}, focus: null };

  const hasNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  const countryName = (country) => locale === 'en' ? country.name_en : country.name_es;
  const metricName = (metric) => locale === 'en' ? metric.label_en : metric.label_es;
  const fmt = (value, digits = 1) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES', { maximumFractionDigits: digits }).format(value);

  function regionName(region) {
    if (locale === 'en') return region;
    return ({
      'North America': 'Norteamérica', 'East Asia': 'Asia oriental', 'South Asia': 'Asia meridional',
      'Western Europe': 'Europa occidental', Pacific: 'Pacífico',
    })[region] || region;
  }

  function unitName(metric) {
    if (locale === 'en') return metric.unit;
    return ({
      private_investment_2025: 'miles de millones de USD', new_ai_companies_2025: 'empresas',
      data_centers_2025: 'instalaciones', notable_models_2025: 'modelos',
      ai_skill_penetration_2024: '× referencia ocupacional global', policy_capacity_2025: 'puntos Oxford Insights (0–100)',
    })[metric.id] || metric.unit;
  }

  function formatRaw(metric, value) {
    if (!hasNumber(value)) return '—';
    const v = Number(value);
    if (metric.id === 'private_investment_2025') return `${fmt(v, 2)} B USD`;
    if (metric.id === 'ai_skill_penetration_2024') return `${fmt(v, 2)}×`;
    if (metric.id === 'policy_capacity_2025') return `${fmt(v, 1)}/100`;
    return fmt(v, Number.isInteger(v) ? 0 : 2);
  }

  function defaultState() {
    return {
      activeMetrics: data.metrics.filter((metric) => metric.default_active).map((metric) => metric.id),
      weights: Object.fromEntries(data.metrics.map((metric) => [metric.id, metric.default_weight || 1])),
      focus: 'us',
    };
  }

  function readInitialState() {
    const defaults = defaultState();
    const decoded = core.decodeState(location.search, data);
    return {
      activeMetrics: decoded.activeMetrics || defaults.activeMetrics,
      weights: { ...defaults.weights, ...decoded.weights },
      focus: decoded.focus || defaults.focus,
    };
  }

  function syncUrl() {
    const query = core.encodeState(state);
    const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash || ''}`;
    history.replaceState(null, '', url);
  }

  function renderMetricControls() {
    els.metricControls.replaceChildren();
    data.metrics.forEach((metric) => {
      const row = document.createElement('div');
      row.className = 's5-ecosystem-metric-control';
      const checked = state.activeMetrics.includes(metric.id);
      row.innerHTML = `<label class="s5-ecosystem-check"><input type="checkbox" data-metric-active="${metric.id}" ${checked ? 'checked' : ''}><span><strong>${metricName(metric)}</strong><small>${metric.year} · ${unitName(metric)}</small></span></label><label class="s5-ecosystem-weight"><span>${t.weight}</span><input type="number" min="0" max="10" step="0.25" value="${state.weights[metric.id] ?? 1}" data-metric-weight="${metric.id}" ${checked ? '' : 'disabled'}></label>`;
      els.metricControls.appendChild(row);
    });
  }

  function renderRanking(scenario) {
    els.ranking.replaceChildren();
    if (!scenario.rows.length) {
      const empty = document.createElement('p');
      empty.className = 's5-tool-empty';
      empty.textContent = t.noComparable;
      els.ranking.appendChild(empty);
      return;
    }
    scenario.rows.forEach((row) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `s5-ecosystem-rank-row${state.focus === row.id ? ' is-focus' : ''}`;
      item.dataset.country = row.id;
      item.innerHTML = `<span class="s5-ecosystem-rank">${row.rank}</span><span class="s5-ecosystem-country"><strong>${countryName(row)}</strong><small>${regionName(row.region)}</small></span><span class="s5-ecosystem-bar"><i style="width:${row.score.toFixed(2)}%"></i></span><strong class="s5-ecosystem-score">${fmt(row.score, 1)}</strong>`;
      els.ranking.appendChild(item);
    });
  }

  function renderTableHead(scenario) {
    const tr = document.createElement('tr');
    [t.country, t.tableScore, ...scenario.activeMetrics.map(metricName), t.reference].forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      tr.appendChild(th);
    });
    els.tableHead.replaceChildren(tr);
  }

  function renderTable(scenario) {
    renderTableHead(scenario);
    els.tableBody.replaceChildren();
    scenario.rows.forEach((row) => {
      const tr = document.createElement('tr');
      const country = document.createElement('th');
      country.scope = 'row';
      country.textContent = `${row.rank}. ${countryName(row)}`;
      const score = document.createElement('td');
      const scoreStrong = document.createElement('strong');
      scoreStrong.textContent = fmt(row.score, 1);
      score.appendChild(scoreStrong);
      tr.append(country, score);
      scenario.activeMetrics.forEach((metric) => {
        const td = document.createElement('td');
        const strong = document.createElement('strong');
        const small = document.createElement('small');
        strong.textContent = formatRaw(metric, row.raw[metric.id]);
        small.textContent = `${fmt(row.normalized[metric.id], 1)}/100`;
        td.append(strong, small);
        tr.appendChild(td);
      });
      const reference = document.createElement('td');
      reference.textContent = row.reference_vibrancy_2024 === null ? '—' : fmt(row.reference_vibrancy_2024, 2);
      tr.appendChild(reference);
      els.tableBody.appendChild(tr);
    });
  }

  function renderFocus(scenario) {
    const row = scenario.rows.find((item) => item.id === state.focus) || scenario.rows[0];
    if (!row) {
      els.focusPanel.innerHTML = `<p>${t.noComparable}</p>`;
      return;
    }
    state.focus = row.id;
    els.focus.value = row.id;
    const cards = scenario.activeMetrics.map((metric) => `<div><small>${metricName(metric)}</small><strong>${formatRaw(metric, row.raw[metric.id])}</strong><span>${t.normalized}: ${fmt(row.normalized[metric.id], 1)} · ${t.weight}: ${fmt(scenario.weights[metric.id] * 100, 0)}%</span></div>`).join('');
    els.focusPanel.innerHTML = `<header><div><small>${regionName(row.region)}</small><h3>${countryName(row)}</h3></div><div class="s5-ecosystem-focus-score"><small>${t.score}</small><strong>${fmt(row.score, 1)}</strong></div></header><div class="s5-ecosystem-focus-grid">${cards}</div><p>${t.reference}: <strong>${row.reference_vibrancy_2024 === null ? '—' : fmt(row.reference_vibrancy_2024, 2)}</strong>. ${t.scenarioNote}</p>`;
  }

  function renderSources(scenario) {
    const activeSourceIds = new Set(scenario.activeMetrics.map((metric) => metric.source_id));
    activeSourceIds.add('stanford_global_vibrancy_reference');
    els.sources.replaceChildren();
    data.sources.filter((source) => activeSourceIds.has(source.id)).forEach((source) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `${source.organization} · ${source.title}`;
      const small = document.createElement('small');
      small.textContent = `${source.notes} ${t.checked}: ${source.retrieved}.`;
      li.append(a, small);
      els.sources.appendChild(li);
    });
  }

  function rebuildFocusOptions(scenario) {
    const current = state.focus;
    els.focus.replaceChildren();
    scenario.rows.forEach((row) => {
      const option = document.createElement('option');
      option.value = row.id;
      option.textContent = countryName(row);
      els.focus.appendChild(option);
    });
    state.focus = scenario.rows.some((row) => row.id === current) ? current : scenario.rows[0]?.id || null;
    if (state.focus) els.focus.value = state.focus;
  }

  function render() {
    const scenario = core.computeScenario(data, state);
    els.coverage.textContent = `${scenario.comparableCount}/${scenario.totalCountries} ${t.countries} · ${scenario.excluded.length} ${t.excluded}`;
    els.activeCount.textContent = String(scenario.activeMetrics.length);
    els.leader.textContent = scenario.rows[0] ? `${countryName(scenario.rows[0])} · ${fmt(scenario.rows[0].score, 1)}` : '—';
    rebuildFocusOptions(scenario);
    renderRanking(scenario);
    renderTable(scenario);
    renderFocus(scenario);
    renderSources(scenario);
    syncUrl();
    return scenario;
  }

  function download(name, type, content) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function exportJson() {
    const scenario = core.computeScenario(data, state);
    download('5sigmas-global-ai-ecosystem.json', 'application/json', JSON.stringify({ snapshot_date: data.snapshot_date, methodology_version: data.methodology_version, state, scenario }, null, 2));
  }

  function exportCsv() {
    const scenario = core.computeScenario(data, state);
    const header = ['rank','country','region','scenario_score',...scenario.activeMetrics.map((m) => `${m.id}_raw`),...scenario.activeMetrics.map((m) => `${m.id}_normalized`),'stanford_vibrancy_2024'];
    const rows = scenario.rows.map((row) => [row.rank,countryName(row),row.region,row.score.toFixed(3),...scenario.activeMetrics.map((m) => row.raw[m.id]),...scenario.activeMetrics.map((m) => row.normalized[m.id].toFixed(3)),row.reference_vibrancy_2024 ?? '']);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
    download('5sigmas-global-ai-ecosystem.csv', 'text/csv;charset=utf-8', csv);
  }

  function feedback(message) {
    els.feedback.hidden = false;
    els.feedback.textContent = message;
    clearTimeout(feedback.timer);
    feedback.timer = setTimeout(() => { els.feedback.hidden = true; }, 3000);
  }

  root.addEventListener('change', (event) => {
    const active = event.target.closest('[data-metric-active]');
    if (active) {
      const id = active.dataset.metricActive;
      state.activeMetrics = active.checked ? [...new Set([...state.activeMetrics, id])] : state.activeMetrics.filter((metricId) => metricId !== id);
      if (!state.activeMetrics.length) { active.checked = true; state.activeMetrics = [id]; }
      renderMetricControls(); render(); return;
    }
    const weight = event.target.closest('[data-metric-weight]');
    if (weight) { state.weights[weight.dataset.metricWeight] = Math.max(0, Number(weight.value) || 0); render(); return; }
    if (event.target === els.focus) { state.focus = els.focus.value; render(); }
  });

  root.addEventListener('click', async (event) => {
    const countryButton = event.target.closest('[data-country]');
    if (countryButton) { state.focus = countryButton.dataset.country; render(); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'reset') { state = defaultState(); renderMetricControls(); render(); }
    if (action === 'json') exportJson();
    if (action === 'csv') exportCsv();
    if (action === 'share') {
      syncUrl();
      try { await navigator.clipboard.writeText(location.href); feedback(t.copied); } catch { feedback(t.copyFail); }
    }
  });

  fetch('/assets/data/tools/global-ai-ecosystem.json')
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((payload) => {
      data = payload;
      state = readInitialState();
      renderMetricControls();
      render();
    })
    .catch((error) => {
      const status = root.querySelector('[data-output="status"]');
      if (status) status.textContent = `${t.loading} ${error.message}`;
    });
})();
