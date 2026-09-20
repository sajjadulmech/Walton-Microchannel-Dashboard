/**
 * Walton RAC Process Development - Microchannel Sales Analytics Engine
 * Vanilla JavaScript (ES6+), Zero External Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  const data = DASHBOARD_DATA.optionB; // Production view: Option B Official
  const catalog = DASHBOARD_DATA.activeCatalog || DASHBOARD_DATA.modelsCatalog;

  const numFmt = (num) => Number(num).toLocaleString('en-US');
  const pctFmt = (num) => Number(num).toFixed(2) + '%';

  // State
  let currentTab = 'sales';
  let catalogFilter = 'all';
  let searchQuery = '';

  // Tooltip
  let tooltipEl = document.getElementById('chartTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'chartTooltip';
    tooltipEl.className = 'chart-tooltip';
    document.body.appendChild(tooltipEl);
  }

  function showTooltip(e, html) {
    tooltipEl.innerHTML = html;
    tooltipEl.classList.add('visible');
    const x = e.clientX + 14;
    const y = e.clientY - 35;
    tooltipEl.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
    tooltipEl.style.top = `${Math.max(10, y)}px`;
  }

  function hideTooltip() {
    tooltipEl.classList.remove('visible');
  }

  function init() {
    setupEventListeners();
    renderKPIs();
    renderChartVolume();
    renderChartCapacity();
    renderChartChassis();
    renderSalesTable();
    renderCatalogTable();
  }

  function setupEventListeners() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        document.getElementById('tabSales').style.display = currentTab === 'sales' ? 'block' : 'none';
        document.getElementById('tabCatalog').style.display = currentTab === 'catalog' ? 'block' : 'none';
      });
    });

    const searchInput = document.getElementById('catalogSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderCatalogTable();
      });
    }

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        catalogFilter = chip.dataset.filter;
        renderCatalogTable();
      });
    });
  }

  function renderKPIs() {
    document.getElementById('kpiTotalSales').textContent = numFmt(data.totalSales);
    document.getElementById('kpiTotalMFC').textContent = numFmt(data.totalMFC);
    document.getElementById('kpiMFCShare').textContent = `${pctFmt(data.mfcShare)} Market Share`;
    document.getElementById('kpiTotalCopper').textContent = numFmt(data.totalCopper);
    document.getElementById('kpiCopperShare').textContent = `${pctFmt(data.copperShare)} Market Share`;
    document.getElementById('kpiPeakYear').textContent = `${data.peakYear} (${pctFmt(data.peakShare)})`;
    const kpiActive = document.getElementById('kpiActiveModels');
    if (kpiActive) kpiActive.textContent = `${DASHBOARD_DATA.metadata.activeModelsCount} Models`;
    const kpiSubtitle = document.getElementById('kpiModelSubtitle');
    if (kpiSubtitle) kpiSubtitle.textContent = `${DASHBOARD_DATA.metadata.inhouseModelsCount} Inhouse / ${DASHBOARD_DATA.metadata.importModelsCount} Import`;
  }

  function renderChartVolume() {
    const container = document.getElementById('chartVolume');
    if (!container) return;

    const yearly = data.yearly;
    const maxVal = Math.max(...yearly.map(d => Math.max(d.mfc, d.copper)));
    const step = 20000;
    const yMax = Math.ceil((maxVal * 1.15) / step) * step; // 80,000

    const svgWidth = 1160;
    const svgHeight = 420;
    const marginLeft = 80;
    const marginRight = 30;
    const marginTop = 30;
    const marginBottom = 45;
    const plotWidth = svgWidth - marginLeft - marginRight; // 1050
    const plotHeight = svgHeight - marginTop - marginBottom; // 345
    const yBase = marginTop + plotHeight; // 375

    // Y-Axis Ticks: 0, 20,000, 40,000, 60,000, 80,000
    const yTicks = [];
    for (let v = 0; v <= yMax; v += step) {
      yTicks.push(v);
    }

    const gridLinesSvg = yTicks.map(v => {
      const y = yBase - (v / yMax) * plotHeight;
      const isBase = v === 0;
      const lineStyle = isBase
        ? `stroke="#94A3B8" stroke-width="1.5"`
        : `stroke="#E2E8F0" stroke-dasharray="3,3" stroke-width="1"`;
      return `
        <line x1="${marginLeft}" y1="${y.toFixed(1)}" x2="${(marginLeft + plotWidth).toFixed(1)}" y2="${y.toFixed(1)}" ${lineStyle} />
        <text x="${marginLeft - 12}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="12" font-weight="500" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(v)}</text>
      `;
    }).join('');

    const numYears = yearly.length;
    const slotWidth = plotWidth / numYears;
    const barWidth = 44;
    const intraGap = 6;

    const barsSvg = [];
    const labelsSvg = [];

    yearly.forEach((d, i) => {
      const slotCenterX = marginLeft + (i + 0.5) * slotWidth;
      const mfcX = slotCenterX - barWidth - intraGap / 2;
      const cuX = slotCenterX + intraGap / 2;

      const mfcH = Math.max(3, (d.mfc / yMax) * plotHeight);
      const mfcY = yBase - mfcH;

      const cuH = Math.max(3, (d.copper / yMax) * plotHeight);
      const cuY = yBase - cuH;

      const mfcTooltip = `<strong>${d.year} MFC Sales</strong><br>Volume: ${numFmt(d.mfc)} units<br>Share: ${pctFmt(d.mfcShare)}<br>Total Year Sales: ${numFmt(d.total)}`;
      const cuTooltip = `<strong>${d.year} Copper Sales</strong><br>Volume: ${numFmt(d.copper)} units<br>Share: ${pctFmt(d.copperShare)}<br>Total Year Sales: ${numFmt(d.total)}`;

      barsSvg.push(`
        <rect class="vol-bar mfc" x="${mfcX.toFixed(1)}" y="${mfcY.toFixed(1)}" width="${barWidth}" height="${mfcH.toFixed(1)}" rx="4" fill="#F59E0B" data-tooltip="${mfcTooltip}" />
        <rect class="vol-bar cu" x="${cuX.toFixed(1)}" y="${cuY.toFixed(1)}" width="${barWidth}" height="${cuH.toFixed(1)}" rx="4" fill="#BCA17E" data-tooltip="${cuTooltip}" />
      `);

      labelsSvg.push(`
        <text x="${(mfcX + barWidth / 2).toFixed(1)}" y="${(mfcY - 17).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#B45309" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(d.mfc)}</text>
        <text x="${(mfcX + barWidth / 2).toFixed(1)}" y="${(mfcY - 5).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#92400E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">(${pctFmt(d.mfcShare)})</text>

        <text x="${(cuX + barWidth / 2).toFixed(1)}" y="${(cuY - 17).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#78350F" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(d.copper)}</text>
        <text x="${(cuX + barWidth / 2).toFixed(1)}" y="${(cuY - 5).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#8C502E" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">(${pctFmt(d.copperShare)})</text>

        <text x="${slotCenterX.toFixed(1)}" y="${(yBase + 26).toFixed(1)}" text-anchor="middle" font-size="14.5" font-weight="700" fill="#0F172A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${d.year}</text>
      `);
    });

    container.innerHTML = `
      <svg class="volume-bar-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
        <!-- Rotated Y-Axis Title -->
        <text transform="rotate(-90)" x="${-(marginTop + plotHeight / 2)}" y="22" text-anchor="middle" font-size="13" font-weight="600" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Unit Sales</text>
        
        <!-- Y-Axis Grid Lines & Tick Values -->
        <g class="y-grid-group">
          ${gridLinesSvg}
        </g>

        <!-- Y-Axis Vertical Line -->
        <line x1="${marginLeft}" y1="${marginTop}" x2="${marginLeft}" y2="${yBase}" stroke="#CBD5E1" stroke-width="1.5" />

        <!-- Bars -->
        <g class="bars-group">
          ${barsSvg.join('')}
        </g>

        <!-- Value Labels & Year X-Axis Labels -->
        <g class="labels-group">
          ${labelsSvg.join('')}
        </g>
      </svg>
    `;

    container.querySelectorAll('.vol-bar').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  function renderChartCapacity() {
    const container = document.getElementById('chartCapacity');
    if (!container) return;
    const mix = data.capacityMix;
    const total = Object.values(mix).reduce((a, b) => a + b, 0);

    let rowsHtml = Object.entries(mix).map(([cap, cnt]) => {
      const share = (cnt / total) * 100;
      return `
        <div class="ranked-bar-item" style="cursor: pointer;" data-tooltip="<strong>${cap}</strong><br>Units: ${numFmt(cnt)} (${pctFmt(share)})">
          <div class="ranked-bar-header">
            <div class="ranked-bar-title">${cap}</div>
            <div class="ranked-bar-val">${numFmt(cnt)} <span style="font-size: 11px; color: var(--text-secondary);">(${pctFmt(share)})</span></div>
          </div>
          <div class="ranked-bar-track">
            <div class="ranked-bar-fill" style="width: ${share}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="ranked-bar-list" style="justify-content: space-around; height: 100%;">${rowsHtml}</div>`;

    container.querySelectorAll('.ranked-bar-item').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  function renderChartChassis() {
    const container = document.getElementById('chartChassis');
    if (!container) return;

    // High-contrast professional palette:
    // C ODU: Deep Navy Blue #063E78
    // H ODU: Orange #FF6B1A
    // F/M ODU: Golden Yellow #FFC51A (F & M unified identical chassis)
    // J ODU: Teal #0AA6A6
    // Z ODU: Indigo #6366F1 (LCAC 5TR)
    // D ODU: Slate #475569 (LCAC 4TR)
    const chassisData = [
      { id: 'C', name: 'C ODU', count: 54280, color: '#063E78', lbl: '24.2%', textFill: '#ffffff' },
      { id: 'H', name: 'H ODU', count: 140343, color: '#FF6B1A', lbl: '62.5%', textFill: '#ffffff' },
      { id: 'FM', name: 'F/M ODU', count: 21660, color: '#FFC51A', lbl: '9.7%', textFill: '#0A2540', subCounts: { F: 11612, M: 10048 } },
      { id: 'J', name: 'J ODU', count: 7351, color: '#0AA6A6', lbl: '3.3%', textFill: '#0A2540', callout: true },
      { id: 'Z', name: 'Z ODU', count: 481, color: '#6366F1', lbl: '0.2%', textFill: '#ffffff', subCounts: { '60Z 0202': 461, '60Z 0302': 20 } },
      { id: 'D', name: 'D ODU', count: 267, color: '#475569', lbl: '0.1%', textFill: '#ffffff' }
    ];

    const total = chassisData.reduce((sum, d) => sum + d.count, 0); // 224,382

    const cx = 180;
    const cy = 185;
    const rOut = 135;
    const rIn = 76;
    const rMid = (rOut + rIn) / 2;

    let currAngle = -Math.PI / 2; // 12 o'clock

    const slicesSvg = [];
    const labelsSvg = [];
    const calloutsSvg = [];

    chassisData.forEach((d, i) => {
      const share = (d.count / total) * 100;
      const span = (d.count / total) * 2 * Math.PI;
      const startA = currAngle;
      const endA = currAngle + span;
      const midA = currAngle + span / 2;

      const x1 = cx + rOut * Math.cos(startA);
      const y1 = cy + rOut * Math.sin(startA);
      const x2 = cx + rOut * Math.cos(endA);
      const y2 = cy + rOut * Math.sin(endA);

      const x3 = cx + rIn * Math.cos(endA);
      const y3 = cy + rIn * Math.sin(endA);
      const x4 = cx + rIn * Math.cos(startA);
      const y4 = cy + rIn * Math.sin(startA);

      const largeArc = span > Math.PI ? 1 : 0;
      const pathD = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;

      const subInfo = d.subCounts ? Object.entries(d.subCounts).map(([k, v]) => `<br>• ${k}: ${numFmt(v)} (${pctFmt((v / total) * 100)})`).join('') : '';
      const tooltipText = `<strong>${d.name}</strong><br>Sales Units: ${numFmt(d.count)}<br>Share: ${pctFmt(share)}${subInfo}`;

      slicesSvg.push(`
        <path class="odu-donut-slice" data-idx="${i}" d="${pathD}" fill="${d.color}" stroke="#ffffff" stroke-width="2.5" data-tooltip="${tooltipText}" />
      `);

      if (!d.callout) {
        if (span >= 0.08) {
          const lx = cx + rMid * Math.cos(midA);
          const ly = cy + rMid * Math.sin(midA);
          const fSize = d.id === 'FM' ? '13' : (d.id === 'H' ? '16' : '14.5');
          labelsSvg.push(`
            <text x="${lx.toFixed(2)}" y="${(ly + 5).toFixed(2)}" text-anchor="middle" font-size="${fSize}" font-weight="700" fill="${d.textFill}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" pointer-events="none">${d.lbl}</text>
          `);
        }
      } else {
        const px1 = cx + rOut * Math.cos(midA);
        const py1 = cy + rOut * Math.sin(midA);
        const px2 = px1 + 10;
        const py2 = py1 - 24;
        const px3 = px2 + 20;
        const py3 = py2;
        const tx = px3 + 4;
        const ty = py3 + 4;
        const anchor = 'start';

        calloutsSvg.push(`
          <g class="odu-donut-callout" pointer-events="none">
            <polyline points="${px1.toFixed(2)},${py1.toFixed(2)} ${px2.toFixed(2)},${py2.toFixed(2)} ${px3.toFixed(2)},${py3.toFixed(2)}" fill="none" stroke="#94A3B8" stroke-width="1.2" />
            <text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" text-anchor="${anchor}" font-size="12.5" font-weight="700" fill="#0A2540" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${d.lbl}</text>
          </g>
        `);
      }

      currAngle = endA;
    });

    const svgHtml = `
      <svg class="odu-donut-svg" viewBox="0 0 360 360">
        <g class="donut-slices-group">
          ${slicesSvg.join('')}
        </g>
        <!-- Center Hole -->
        <circle cx="${cx}" cy="${cy}" r="${rIn}" fill="#ffffff" />
        <!-- Total Value & Label in Center -->
        <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="28" font-weight="800" fill="#063E78" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(total)}</text>
        <text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="14" font-weight="600" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Total</text>
        <!-- Slice Labels -->
        <g class="donut-labels-group">
          ${labelsSvg.join('')}
        </g>
        <!-- Callout Lines and Labels -->
        <g class="donut-callouts-group">
          ${calloutsSvg.join('')}
        </g>
      </svg>
    `;

    const legendHtml = `
      <div class="odu-legend-list">
        ${chassisData.map((d, i) => {
          const share = (d.count / total) * 100;
          const tooltipText = `<strong>${d.name}</strong><br>Sales Units: ${numFmt(d.count)}<br>Share: ${pctFmt(share)}`;
          return `
            <div class="odu-legend-item" data-idx="${i}" data-tooltip="${tooltipText}">
              <div class="odu-legend-left">
                <span class="odu-legend-bullet" style="background: ${d.color};"></span>
                <span class="odu-legend-name">${d.name}</span>
              </div>
              <div class="odu-legend-right">
                <span class="odu-legend-val">${numFmt(d.count)}</span>
                <span class="odu-legend-pct">(${pctFmt(share)})</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.innerHTML = `
      <div class="odu-donut-layout">
        <div class="odu-donut-visual">
          ${svgHtml}
        </div>
        ${legendHtml}
      </div>
    `;

    // Tooltip and bi-directional hover binding
    const sliceEls = container.querySelectorAll('.odu-donut-slice');
    const legendEls = container.querySelectorAll('.odu-legend-item');

    sliceEls.forEach(el => {
      const idx = el.dataset.idx;
      el.addEventListener('mouseenter', (e) => {
        showTooltip(e, el.dataset.tooltip);
        if (legendEls[idx]) legendEls[idx].classList.add('active');
      });
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', () => {
        hideTooltip();
        if (legendEls[idx]) legendEls[idx].classList.remove('active');
      });
    });

    legendEls.forEach(el => {
      const idx = el.dataset.idx;
      el.addEventListener('mouseenter', (e) => {
        showTooltip(e, el.dataset.tooltip);
        if (sliceEls[idx]) sliceEls[idx].classList.add('active');
      });
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', () => {
        hideTooltip();
        if (sliceEls[idx]) sliceEls[idx].classList.remove('active');
      });
    });
  }

  function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    if (!tbody) return;

    let rowsHtml = data.yearly.map(d => `
      <tr>
        <td style="font-weight: 700; color: var(--blue-900);">${d.year}</td>
        <td class="col-num" style="color: var(--amber-700); font-weight: 600;">${numFmt(d.mfc)}</td>
        <td class="col-num">${numFmt(d.copper)}</td>
        <td class="col-num" style="font-weight: 700;">${numFmt(d.total)}</td>
        <td class="col-num" style="font-weight: 600; color: var(--amber-700);">${pctFmt(d.mfcShare)}</td>
        <td class="col-num">${pctFmt(d.copperShare)}</td>
        <td style="text-align: center;"><span class="badge-tag badge-coatec">100% Reconciled</span></td>
      </tr>
    `).join('');

    rowsHtml += `
      <tr class="table-total-row">
        <td>TOTAL</td>
        <td class="col-num">${numFmt(data.totalMFC)}</td>
        <td class="col-num">${numFmt(data.totalCopper)}</td>
        <td class="col-num">${numFmt(data.totalSales)}</td>
        <td class="col-num">${pctFmt(data.mfcShare)}</td>
        <td class="col-num">${pctFmt(data.copperShare)}</td>
        <td style="text-align: center;"><span class="badge-tag badge-mfc">Verified Master</span></td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
  }

  function renderCatalogTable() {
    const tbody = document.getElementById('catalogTableBody');
    if (!tbody || !catalog) return;

    let list = catalog;
    if (catalogFilter !== 'all') {
      list = list.filter(m => m.origin === catalogFilter);
    }
    if (searchQuery) {
      list = list.filter(m => 
        m.code.toLowerCase().includes(searchQuery) ||
        m.origin.toLowerCase().includes(searchQuery) ||
        m.capacity.toLowerCase().includes(searchQuery) ||
        m.chassis.toLowerCase().includes(searchQuery)
      );
    }

    let rowsHtml = list.map((m, idx) => `
      <tr>
        <td style="color: var(--text-muted);">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: 600; color: var(--blue-900);">${m.code}</td>
        <td>${m.capacity}</td>
        <td>${m.chassis}</td>
        <td>${m.version}</td>
        <td><span class="badge-tag ${m.origin === 'Inhouse' ? 'badge-coatec' : 'badge-non-coatec'}">${m.origin}</span></td>
        <td>${m.coating}</td>
        <td><span class="badge-tag badge-coatec">Active Verified</span></td>
      </tr>
    `).join('');

    tbody.innerHTML = rowsHtml;
  }

  init();
});
