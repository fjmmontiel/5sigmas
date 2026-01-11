(function () {
  function renderEnergyForecast(mount) {
    if (!mount || mount.dataset.energyInit === "1") return;
    mount.dataset.energyInit = "1";

    const rows = [
      { year: 2024, actual_twh: 415.0, projected_twh: null },
      { year: 2025, actual_twh: null, projected_twh: 476.006 },
      { year: 2026, actual_twh: null, projected_twh: 545.979 },
      { year: 2027, actual_twh: null, projected_twh: 626.239 },
      { year: 2028, actual_twh: null, projected_twh: 718.297 },
      { year: 2029, actual_twh: null, projected_twh: 823.889 },
      { year: 2030, actual_twh: null, projected_twh: 945.0 },
      { year: 2031, actual_twh: null, projected_twh: 987.761 },
      { year: 2032, actual_twh: null, projected_twh: 1032.457 },
      { year: 2033, actual_twh: null, projected_twh: 1079.176 },
      { year: 2034, actual_twh: null, projected_twh: 1128.008 },
      { year: 2035, actual_twh: null, projected_twh: 1172.414 }
    ];

    const actual2024 = rows.find(r => r.year === 2024)?.actual_twh ?? 0;
    const projected2030 = rows.find(r => r.year === 2030)?.projected_twh ?? 0;
    const bars = [
      { id: 'dc_2024', label: 'Data centers 2024', value: actual2024, color: '#22C55E' },
      { id: 'dc_2030', label: 'Proyección 2030', value: projected2030, color: '#2563EB' },
      { id: 'esp_2023', label: 'España 2023', value: 282.0, color: '#F59E0B' },
      { id: 'usa_2023', label: 'EE. UU. 2023', value: 4494.0, color: '#EF4444' }
    ];

    const maxValue = Math.max(...bars.map(b => b.value));
    const pad = { left: 52, right: 16, top: 24, bottom: 34 };
    const width = 720;
    const height = 360;
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;

    const y = value => pad.top + (1 - (value / (maxValue * 1.05))) * chartHeight;

    const tickStep = maxValue <= 2000 ? 500 : 1000;
    const maxTick = Math.ceil((maxValue * 1.05) / tickStep) * tickStep;
    const ticks = [];
    for (let t = 0; t <= maxTick; t += tickStep) ticks.push(t);
    const gridLines = ticks.map(t => `<line class="grid" x1="${pad.left}" x2="${width - pad.right}" y1="${y(t)}" y2="${y(t)}"></line>`).join('');
    const tickLabels = ticks.map(t => `<text class="label" x="${pad.left - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('');

    const spacing = chartWidth / bars.length;
    const barWidth = spacing * 0.6;
    const barsSvg = bars.map((bar, idx) => {
      const xPos = pad.left + idx * spacing + (spacing - barWidth) / 2;
      const yPos = y(bar.value);
      const heightValue = (height - pad.bottom) - yPos;
      const labelY = Math.min(yPos - 6, height - pad.bottom - 6);
      return `
        <rect class="bar animate" x="${xPos}" y="${yPos}" width="${barWidth}" height="${heightValue}" fill="${bar.color}" rx="4" ry="4"></rect>
        <rect class="bar hit" x="${xPos}" y="${yPos}" width="${barWidth}" height="${heightValue}" data-label="${bar.label}" data-value="${bar.value.toFixed(1)}"></rect>
        <text class="label value" x="${xPos + barWidth / 2}" y="${Math.max(pad.top + 12, labelY)}" text-anchor="middle">${bar.value.toFixed(0)}</text>
        <text class="label bar-label" x="${xPos + barWidth / 2}" y="${height - 10}" text-anchor="middle">${bar.label}</text>
      `;
    }).join('');

    const svg = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Consumo eléctrico de data centers comparado con España y EE. UU.">
        ${gridLines}
        ${tickLabels}
        <line class="axis" x1="${pad.left}" x2="${width - pad.right}" y1="${height - pad.bottom}" y2="${height - pad.bottom}"></line>
        <line class="axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${height - pad.bottom}"></line>
        ${barsSvg}
      </svg>
      <div class="energy-forecast-tooltip" aria-hidden="true"></div>
    `;

    mount.innerHTML = svg;

    const tooltip = mount.querySelector('.energy-forecast-tooltip');
    const hitBars = mount.querySelectorAll('.bar.hit');

    hitBars.forEach(bar => {
      bar.addEventListener('mouseenter', () => {
        const label = bar.getAttribute('data-label');
        const value = bar.getAttribute('data-value');
        tooltip.textContent = `${label}: ${value} TWh`;
        tooltip.classList.add('is-visible');
      });
      bar.addEventListener('mousemove', (e) => {
        const rect = mount.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left}px`;
        tooltip.style.top = `${e.clientY - rect.top}px`;
      });
      bar.addEventListener('mouseleave', () => {
        tooltip.classList.remove('is-visible');
      });
    });
  }

  function initEnergyForecast() {
    const mount = document.getElementById('energy-forecast-chart');
    if (!mount) return;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            observer.disconnect();
            renderEnergyForecast(mount);
          }
        });
      }, { threshold: 0.2 });
      observer.observe(mount);
    } else {
      renderEnergyForecast(mount);
    }
  }

  if (typeof document$ !== 'undefined' && document$.subscribe) {
    document$.subscribe(() => initEnergyForecast());
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnergyForecast, { once: true });
  } else {
    initEnergyForecast();
  }
})();
