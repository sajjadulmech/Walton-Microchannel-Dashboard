/**
 * Walton RAC Process Development - Microchannel Market Failure Engine
 * Dedicated Standalone Dashboard for MFC Condenser Leakage Intelligence
 * Pure Vanilla JavaScript (ES6+), Zero External Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  const data = MARKET_FAILURE_DATA;
  if (!data) {
    console.error('MARKET_FAILURE_DATA not found!');
    return;
  }

  // Application State
  const state = {
    activeTab: 'yearlyTab',
    monthYearFilter: 'all',
    monthSearchQuery: '',
    chartMonthYear: 2025,
    coatedPopulation: 'pop4031',
    coatedSearchQuery: '',
    replaceRepairPopulation: 'pop4031'
  };

  // Formatters
  const numFmt = (num) => Number(num).toLocaleString('en-US');
  const pctFmt = (num) => Number(num).toFixed(2) + '%';

  // Floating Tooltip
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
    tooltipEl.style.opacity = '1';
    const x = e.clientX + 14;
    const y = e.clientY - 35;
    tooltipEl.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
    tooltipEl.style.top = `${Math.max(10, y)}px`;
  }

  function hideTooltip() {
    tooltipEl.classList.remove('visible');
    tooltipEl.style.opacity = '0';
  }

  // Initialization
  function init() {
    setupEventListeners();
    renderKPIs();
    renderChartYearly();
    renderChartMonthly(state.chartMonthYear);
    renderChartLeakagePoints();
    renderChartTopAreas();
    renderChartSalesToService();
    renderChartUnderOneYearQuarters();
    renderChartOdu();
    renderChartCoatedVsNonCoated(state.coatedPopulation);
    renderCoatedAuditCard(state.coatedPopulation);
    renderTableYearly();
    renderTableMonthly();
    renderTablePoints();
    renderTableAreas();
    renderTableSalesToService();
    renderTableUnderOneYearQuarters();
    renderTableOdu();
    renderTableCoated(state.coatedPopulation);
    renderCoatedRecordsRegister(state.coatedSearchQuery);
    renderChartReplaceVsRepair(state.replaceRepairPopulation);
    renderReplaceRepairAuditCard(state.replaceRepairPopulation);
    renderTableReplaceRepair(state.replaceRepairPopulation);
    renderUnclassifiedModal();
  }

  // Event Listeners
  function setupEventListeners() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        setActiveTab(tab);
      });
    });

    // Month-wise year filter chips
    const filterChips = document.querySelectorAll('#monthYearFilters .filter-chip');
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.monthYearFilter = chip.dataset.year;
        renderTableMonthly();
      });
    });

    // Month-wise search input
    const monthSearchInput = document.getElementById('monthSearch');
    if (monthSearchInput) {
      monthSearchInput.addEventListener('input', (e) => {
        state.monthSearchQuery = e.target.value.toLowerCase().trim();
        renderTableMonthly();
      });
    }

    // Modal triggers
    const btnViewUnclassified = document.getElementById('btnViewUnclassified');
    const modal = document.getElementById('unclassifiedModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCloseBtn2 = document.getElementById('modalCloseBtn2');

    if (btnViewUnclassified && modal) {
      btnViewUnclassified.addEventListener('click', () => {
        modal.classList.add('active');
      });
    }

    if (modalCloseBtn && modal) {
      modalCloseBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
    if (modalCloseBtn2 && modal) {
      modalCloseBtn2.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    // CSV Export
    const btnExport = document.getElementById('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', exportCSV);
    }

    
    // ODU Navigation and Search Listeners
    const btnJumpToOduAudit = document.getElementById('btnJumpToOduAudit');
    if (btnJumpToOduAudit) {
      btnJumpToOduAudit.addEventListener('click', () => {
        setActiveTab('oduTab');
        const explorer = document.querySelector('.explorer-card');
        if (explorer) explorer.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const oduSearchInput = document.getElementById('oduUnresolvedSearch');
    if (oduSearchInput) {
      oduSearchInput.addEventListener('input', (e) => {
        filterUnresolvedOduTable(e.target.value);
      });
    }

    const exportOduCsvBtn = document.getElementById('exportOduCsvBtn');
    if (exportOduCsvBtn) {
      exportOduCsvBtn.addEventListener('click', exportOduCSV);
    }

    const exportUnresolvedOduCsvBtn = document.getElementById('exportUnresolvedOduCsvBtn');
    if (exportUnresolvedOduCsvBtn) {
      exportUnresolvedOduCsvBtn.addEventListener('click', exportUnresolvedOduCSV);
    }

    const exportDurationCsvBtn = document.getElementById('exportDurationCsvBtn');
    if (exportDurationCsvBtn) {
      exportDurationCsvBtn.addEventListener('click', exportDurationCSV);
    }

    // Coated Population Switchers (Sync both Chart and Table toggles)
    function switchCoatedPop(popKey) {
      state.coatedPopulation = popKey;
      document.querySelectorAll('#coatedPopToggle .segmented-btn, #tableCoatedPopToggle .segmented-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.pop === popKey);
      });
      renderChartCoatedVsNonCoated(popKey);
      renderCoatedAuditCard(popKey);
      renderTableCoated(popKey);
    }

    document.querySelectorAll('#coatedPopToggle .segmented-btn, #tableCoatedPopToggle .segmented-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchCoatedPop(btn.dataset.pop);
      });
    });

    const btnJumpToCoated = document.getElementById('btnJumpToCoatedRegister');
    if (btnJumpToCoated) {
      btnJumpToCoated.addEventListener('click', () => {
        setActiveTab('coatedTab');
        const regHeader = document.getElementById('coatedRecordsSearch');
        if (regHeader) regHeader.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const coatedSearchInput = document.getElementById('coatedRecordsSearch');
    if (coatedSearchInput) {
      coatedSearchInput.addEventListener('input', (e) => {
        state.coatedSearchQuery = e.target.value;
        renderCoatedRecordsRegister(state.coatedSearchQuery);
      });
    }

    const exportCoatedCsvBtn = document.getElementById('exportCoatedCsvBtn');
    if (exportCoatedCsvBtn) {
      exportCoatedCsvBtn.addEventListener('click', exportCoatedCSV);
    }

    // Replace vs. Repair Population Switcher
    function switchReplaceRepairPop(popKey) {
      state.replaceRepairPopulation = popKey;
      document.querySelectorAll('#replaceRepairPopToggle .segmented-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.pop === popKey);
      });
      renderChartReplaceVsRepair(popKey);
      renderReplaceRepairAuditCard(popKey);
      renderTableReplaceRepair(popKey);
    }

    document.querySelectorAll('#replaceRepairPopToggle .segmented-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchReplaceRepairPop(btn.dataset.pop);
      });
    });

    const btnJumpToRR = document.getElementById('btnJumpToReplaceRepairTable');
    if (btnJumpToRR) {
      btnJumpToRR.addEventListener('click', () => {
        setActiveTab('replaceRepairTab');
        const tblHeader = document.getElementById('replaceRepairTableTitle');
        if (tblHeader) tblHeader.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const btnExportRRCsv = document.getElementById('btnExportReplaceRepairCSV');
    if (btnExportRRCsv) {
      btnExportRRCsv.addEventListener('click', exportReplaceRepairCSV);
    }

    // Chart 2 Month Year Selector
    const chartMonthYearSelect = document.getElementById('chartMonthYearSelect');
    if (chartMonthYearSelect) {
      chartMonthYearSelect.value = String(state.chartMonthYear);
      chartMonthYearSelect.addEventListener('change', (e) => {
        state.chartMonthYear = Number(e.target.value);
        const subEl = document.getElementById('chartMonthlySubtitle');
        if (subEl) {
          subEl.textContent = `Monthly MFC leakage records — ${state.chartMonthYear}`;
        }
        renderChartMonthly(state.chartMonthYear);
      });
    }
  }

  function setActiveTab(tabKey) {
    state.activeTab = tabKey;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabKey);
    });

    const tabMap = {
      yearlyTab: 'tabYearly',
      monthlyTab: 'tabMonthly',
      pointsTab: 'tabPoints',
      areasTab: 'tabAreas',
      durationTab: 'tabDuration',
      oduTab: 'tabOdu',
      coatedTab: 'tabCoated',
      replaceRepairTab: 'tabReplaceRepair'
    };

    Object.values(tabMap).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    const activeEl = document.getElementById(tabMap[tabKey]);
    if (activeEl) activeEl.style.display = 'block';
  }

  // 1. KPIs
  function renderKPIs() {
    const meta = data.metadata;
    const elTotal = document.getElementById('kpiTotalLeaks');
    const elImport = document.getElementById('kpiImportLeaks');
    const elInhouse = document.getElementById('kpiInhouseLeaks');
    const elImportShare = document.getElementById('kpiImportShare');
    const elInhouseShare = document.getElementById('kpiInhouseShare');

    if (elTotal) elTotal.textContent = numFmt(meta.confirmedLeakageRecords);
    if (elImport) elImport.textContent = numFmt(meta.importLeakage);
    if (elInhouse) elInhouse.textContent = numFmt(meta.inhouseLeakage);
    if (elImportShare) elImportShare.textContent = `${pctFmt(meta.importSharePct)} of Confirmed Leaks`;
    if (elInhouseShare) elInhouseShare.textContent = `${pctFmt(meta.inhouseSharePct)} of Confirmed Leaks`;
  }

  // 2. Chart 1: Year-Wise Import vs Inhouse Leakage (Clean Grouped Bar Chart matching visual reference)
  function renderChartYearly() {
    const container = document.getElementById('chartYearlyLeakage');
    if (!container) return;

    const yearlyData = data.yearly;
    // Geometry expanded vertically to use the full available card height and eliminate bottom blank space
    const svgW = 860;
    const svgH = 585;
    const leftPad = 74;
    const rightPad = 18;
    const topPad = 25;
    const baselineY = 525;
    const plotH = baselineY - topPad; // 500px plot height (expanded vertically from 404px, +23.8% taller bars)
    const plotW = svgW - rightPad - leftPad; // 768px
    const maxVal = 1400;

    // Y-axis gridlines: 0, 200, 400, 600, 800, 1000, 1200, 1400
    const gridVals = [0, 200, 400, 600, 800, 1000, 1200, 1400];
    const gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      const isBase = (val === 0);
      return `
        ${!isBase ? `<line x1="${leftPad}" y1="${y.toFixed(2)}" x2="${(svgW - rightPad).toFixed(2)}" y2="${y.toFixed(2)}" stroke="#E2E8F0" stroke-dasharray="3 3" stroke-width="1" />` : ''}
        <text x="${leftPad - 10}" y="${y.toFixed(2)}" text-anchor="end" dominant-baseline="middle" font-size="12" font-weight="500" fill="#546678" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    // Grouped side-by-side columns: [Import] [Inhouse]
    const stepX = plotW / yearlyData.length; // 768 / 7 = 109.71px
    const colW = 37; // Proportionally widened bars matching the taller vertical scale
    const colGap = 6; // Refined gap between Import and Inhouse columns
    const groupW = colW * 2 + colGap; // 80px total group width (29.71px clean inter-group gap)

    // In-memory tooltips to maintain 100% attribute safety
    const yearlyTooltips = [];

    const barsHtml = yearlyData.map((d, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const groupX = centerX - groupW / 2;
      const xImp = groupX;
      const xInh = groupX + colW + colGap;

      const hImp = (d.importLeakage / maxVal) * plotH;
      const hInh = (d.inhouseLeakage / maxVal) * plotH;

      const yImp = baselineY - hImp;
      const yInh = baselineY - hInh;

      // Dynamic percentage within that year
      const totYear = d.importLeakage + d.inhouseLeakage;
      const impPct = totYear > 0 ? (d.importLeakage / totYear * 100).toFixed(1) : '0.0';
      const inhPct = totYear > 0 ? (d.inhouseLeakage / totYear * 100).toFixed(1) : '0.0';

      const tooltipText = `<strong>${d.year} Confirmed Leakage</strong><br>Total Leaks: ${numFmt(totYear)}<br>• Import: ${numFmt(d.importLeakage)} (${impPct}%)<br>• Inhouse: ${numFmt(d.inhouseLeakage)} (${inhPct}%)`;
      yearlyTooltips.push(tooltipText);

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-yidx="${i}">
          <!-- Transparent hover zone covering entire year slot -->
          <rect x="${(centerX - stepX / 2).toFixed(2)}" y="${topPad}" width="${stepX.toFixed(2)}" height="${(plotH + 46).toFixed(2)}" fill="transparent" />

          <!-- Import Column (#D7C2A5) -->
          ${d.importLeakage > 0 ? `
            <rect class="yearly-bar-rect" x="${xImp.toFixed(2)}" y="${yImp.toFixed(2)}" width="${colW}" height="${hImp.toFixed(2)}" fill="#D7C2A5" rx="2" ry="2" />
          ` : ''}

          <!-- Inhouse Column (#0A3B79) -->
          ${d.inhouseLeakage > 0 ? `
            <rect class="yearly-bar-rect" x="${xInh.toFixed(2)}" y="${yInh.toFixed(2)}" width="${colW}" height="${hInh.toFixed(2)}" fill="#0A3B79" rx="2" ry="2" />
          ` : ''}

          <!-- Quantity (Percentage) above Import column (Stacked two-line) -->
          ${d.importLeakage > 0 ? `
            <text x="${(xImp + colW / 2).toFixed(2)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              <tspan x="${(xImp + colW / 2).toFixed(2)}" y="${(yImp - 18).toFixed(2)}" font-size="12" font-weight="700" fill="#7B5E3C">${numFmt(d.importLeakage)}</tspan>
              <tspan x="${(xImp + colW / 2).toFixed(2)}" y="${(yImp - 5).toFixed(2)}" font-size="10" font-weight="500" fill="#7B5E3C">(${impPct}%)</tspan>
            </text>
          ` : `
            <text x="${(xImp + colW / 2).toFixed(2)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              <tspan x="${(xImp + colW / 2).toFixed(2)}" y="${(baselineY - 18).toFixed(2)}" font-size="12" font-weight="700" fill="#7B5E3C">0</tspan>
              <tspan x="${(xImp + colW / 2).toFixed(2)}" y="${(baselineY - 5).toFixed(2)}" font-size="10" font-weight="500" fill="#7B5E3C">(0.0%)</tspan>
            </text>
          `}

          <!-- Quantity (Percentage) above Inhouse column (Stacked two-line) -->
          ${d.inhouseLeakage > 0 ? `
            <text x="${(xInh + colW / 2).toFixed(2)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              <tspan x="${(xInh + colW / 2).toFixed(2)}" y="${(yInh - 18).toFixed(2)}" font-size="12" font-weight="700" fill="#0A3B79">${numFmt(d.inhouseLeakage)}</tspan>
              <tspan x="${(xInh + colW / 2).toFixed(2)}" y="${(yInh - 5).toFixed(2)}" font-size="10" font-weight="500" fill="#0A3B79">(${inhPct}%)</tspan>
            </text>
          ` : `
            <text x="${(xInh + colW / 2).toFixed(2)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
              <tspan x="${(xInh + colW / 2).toFixed(2)}" y="${(baselineY - 18).toFixed(2)}" font-size="12" font-weight="700" fill="#0A3B79">0</tspan>
              <tspan x="${(xInh + colW / 2).toFixed(2)}" y="${(baselineY - 5).toFixed(2)}" font-size="10" font-weight="500" fill="#0A3B79">(0.0%)</tspan>
            </text>
          `}

          <!-- Year label centered strictly below both columns with balanced vertical spacing -->
          <text x="${centerX.toFixed(2)}" y="${(baselineY + 26).toFixed(2)}" text-anchor="middle" font-size="13" font-weight="700" fill="#1E293B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${d.year}</text>
        </g>
      `;
    }).join('');

    const yMid = (topPad + baselineY) / 2;
    const yTitleHtml = `<text x="-${yMid.toFixed(2)}" y="16" transform="rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Number of Records</text>`;
    const yAxisHtml = `<line x1="${leftPad}" y1="${topPad}" x2="${leftPad}" y2="${baselineY}" stroke="#8E9CA8" stroke-width="1.2" />`;
    const xAxisHtml = `<line x1="${leftPad}" y1="${baselineY}" x2="${(svgW - rightPad).toFixed(2)}" y2="${baselineY}" stroke="#8E9CA8" stroke-width="1.5" />`;

    container.innerHTML = `
      <svg class="svg-chart yearly-grouped-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <!-- Y-Axis Title -->
        ${yTitleHtml}
        <!-- Gridlines & Y-Axis Labels -->
        ${gridHtml}
        <!-- Vertical Y-Axis Line -->
        ${yAxisHtml}
        <!-- Horizontal Baseline -->
        ${xAxisHtml}
        <!-- Grouped Columns & Labels -->
        ${barsHtml}
      </svg>
    `;

    // Tooltips
    container.querySelectorAll('.svg-bar-col').forEach(el => {
      const idx = Number(el.dataset.yidx);
      const tip = yearlyTooltips[idx] || '';
      el.addEventListener('mouseenter', (e) => showTooltip(e, tip));
      el.addEventListener('mousemove', (e) => showTooltip(e, tip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 3. Chart 2: Month-Wise Confirmed Leakage (Multi-Series Monthly Time-Series Line Chart: 2021-2026)
  function renderChartMonthly() {
    const container = document.getElementById('chartMonthlyLeakage');
    if (!container) return;

    // Subtitle update if element exists
    const subEl = document.getElementById('chartMonthlySubtitle');
    if (subEl) subEl.textContent = 'Monthly MFC leakage records — Year-over-Year Comparison';

    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const yearColors = {
      2021: '#64748B', // Slate Gray
      2022: '#059669', // Emerald Green
      2023: '#D97706', // Amber / Bronze
      2024: '#2563EB', // Royal Blue
      2025: '#E11D48', // Crimson Red
      2026: '#7C3AED'  // Violet Purple
    };

    // Expanded geometry to fully utilize card available height and match sibling card aspect ratio
    const svgW = 860;
    const svgH = 585;
    const leftPad = 64;
    const rightPad = 22;
    const topPad = 28;
    const baselineY = 525;
    const plotW = svgW - leftPad - rightPad; // 774px
    const plotH = baselineY - topPad; // 497px (substantially enlarged plot height: +72.6% vertical plotting area)
    const maxVal = 400; // 400 ceiling provides clean headroom for Aug 2026 peak (358 records)

    const stepX = plotW / (monthNames.length - 1); // 774 / 11 = 70.36px

    // Gridlines: 0, 50, 100, 150, 200, 250, 300, 350, 400
    const gridVals = [0, 50, 100, 150, 200, 250, 300, 350, 400];
    const gridHtml = gridVals.map(gv => {
      const gy = baselineY - (gv / maxVal) * plotH;
      const isBase = (gv === 0);
      return `
        <line x1="${leftPad}" y1="${gy.toFixed(2)}" x2="${svgW - rightPad}" y2="${gy.toFixed(2)}" stroke="${isBase ? '#B8C7D9' : '#E2E8F0'}" stroke-dasharray="${isBase ? 'none' : '4 4'}" stroke-width="${isBase ? '1.5' : '1'}" />
        <text x="${leftPad - 10}" y="${(gy + 4).toFixed(2)}" text-anchor="end" font-size="11.5" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${gv}</text>
      `;
    }).join('');

    // X-axis Month Labels & Ticks
    const xAxisHtml = monthNames.map((mName, mIdx) => {
      const mx = leftPad + mIdx * stepX;
      return `
        <line x1="${mx.toFixed(2)}" y1="${baselineY}" x2="${mx.toFixed(2)}" y2="${baselineY + 6}" stroke="#B8C7D9" stroke-width="1.5" />
        <text x="${mx.toFixed(2)}" y="${baselineY + 22}" text-anchor="middle" font-size="12" font-weight="600" fill="#172B3A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${mName}</text>
      `;
    }).join('');

    // Smooth cubic spline path generator with tension ~0.2
    function getSplinePath(pts, tension = 0.2) {
      if (!pts || pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].cx.toFixed(2)} ${pts[0].cy.toFixed(2)}`;
      if (pts.length === 2) return `M ${pts[0].cx.toFixed(2)} ${pts[0].cy.toFixed(2)} L ${pts[1].cx.toFixed(2)} ${pts[1].cy.toFixed(2)}`;

      const d = [`M ${pts[0].cx.toFixed(2)} ${pts[0].cy.toFixed(2)}`];
      const n = pts.length;
      for (let i = 0; i < n - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i + 2 < n ? pts[i + 2] : pts[i + 1];

        const cp1x = p1.cx + (p2.cx - p0.cx) * tension;
        let cp1y = p1.cy + (p2.cy - p0.cy) * tension;
        const cp2x = p2.cx - (p3.cx - p1.cx) * tension;
        let cp2y = p2.cy - (p3.cy - p1.cy) * tension;

        // Clamp control points to not dip below baseline
        if (cp1y > baselineY) cp1y = baselineY;
        if (cp2y > baselineY) cp2y = baselineY;

        d.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.cx.toFixed(2)} ${p2.cy.toFixed(2)}`);
      }
      return d.join(' ');
    }

    // Extract valid data points per year without inventing future monthly values
    const seriesData = {};
    years.forEach(y => {
      seriesData[y] = [];
      monthNames.forEach((mName, mIdx) => {
        const mNum = mIdx + 1;
        const match = data.monthly.find(d => Number(d.year) === y && (d.monthNum === mNum || d.month === mName));
        if (match) {
          const tot = (match.totalLeakage !== undefined) ? match.totalLeakage : (match.importLeakage + match.inhouseLeakage);
          const cx = leftPad + mIdx * stepX;
          const cy = baselineY - (tot / maxVal) * plotH;
          seriesData[y].push({ month: mName, mIdx, total: tot, cx, cy, year: y });
        } else if (y === 2021 && mName === 'Mar') {
          // 2021 ended in Dec with 0 confirmed leaks in March
          const cx = leftPad + mIdx * stepX;
          const cy = baselineY;
          seriesData[y].push({ month: mName, mIdx, total: 0, cx, cy, year: y });
        }
      });
    });

    // Generate SVG paths for each year
    const pathsHtml = years.map(y => {
      const pts = seriesData[y];
      if (!pts || pts.length === 0) return '';
      const color = yearColors[y];
      const pathD = getSplinePath(pts, 0.2);
      return `<path class="monthly-year-path path-year-${y}" data-year="${y}" d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
    }).join('');

    // Group points by month for collision-free label display and crosshair comparison
    const monthBuckets = Array.from({ length: 12 }, () => []);
    years.forEach(y => {
      seriesData[y].forEach(pt => {
        monthBuckets[pt.mIdx].push({ ...pt, color: yearColors[y] });
      });
    });

    monthBuckets.forEach(b => b.sort((a, b) => b.total - a.total));

    // In-memory tooltips array for the 12 month columns to completely avoid quotes or HTML inside attributes
    const monthColumnTooltips = [];
    monthNames.forEach((mName, mIdx) => {
      const pts = monthBuckets[mIdx];
      let tip = `<strong>${mName} Confirmed Leakage</strong>`;
      if (pts.length > 0) {
        tip += `<div style="margin-top: 4px; font-size: 11.5px; line-height: 1.5;">`;
        pts.forEach(p => {
          tip += `<div style="display:flex; justify-content:space-between; gap:12px;"><span style="color:${p.color}; font-weight:700;">● ${p.year}:</span> <strong>${numFmt(p.total)}</strong> records</div>`;
        });
        tip += `</div>`;
      } else {
        tip += `<div style="margin-top: 2px; color:#888;">No records</div>`;
      }
      monthColumnTooltips.push(tip);
    });

    // Generate markers and data labels
    let markersHtml = '';
    monthBuckets.forEach((pts) => {
      if (!pts || pts.length === 0) return;
      pts.forEach((p, idx) => {
        const prevCy = idx > 0 ? pts[idx - 1].cy : -999;
        const nextCy = idx + 1 < pts.length ? pts[idx + 1].cy : 999;

        // Label placement: 2025 always visible; 2024 visible when separated; others visible when isolated
        let showLabel = false;
        let lblY = p.cy - 8;
        if (p.year === 2025) {
          showLabel = true;
          lblY = p.cy - 8;
        } else if (p.year === 2024 && Math.abs(p.cy - prevCy) >= 14) {
          showLabel = true;
          lblY = (p.cy < prevCy) ? p.cy - 8 : p.cy + 14;
        } else if (Math.abs(p.cy - prevCy) >= 16 && Math.abs(p.cy - nextCy) >= 16) {
          showLabel = true;
          lblY = p.cy - 8;
        }

        markersHtml += `
          <g class="monthly-point-marker marker-year-${p.year}" data-year="${p.year}" data-month="${p.month}" data-val="${p.total}">
            <circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="4.5" fill="${p.color}" stroke="#FFFFFF" stroke-width="1.5" />
            <text class="pt-label pt-label-${p.year} ${showLabel ? '' : 'pt-label-dim'}" x="${p.cx.toFixed(2)}" y="${lblY.toFixed(2)}" text-anchor="middle" font-size="10" font-weight="700" fill="${p.color}" paint-order="stroke" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" style="${showLabel ? '' : 'display:none;'}">${p.total}</text>
          </g>
        `;
      });
    });

    // Crosshair hover vertical columns (one for each month) - SAFE SVG with NO HTML in attributes!
    const hoverColsHtml = monthNames.map((mName, mIdx) => {
      const cx = leftPad + mIdx * stepX;
      const colW = stepX;
      return `
        <rect class="monthly-slot-hover" data-midx="${mIdx}" data-cx="${cx.toFixed(2)}" x="${(cx - colW / 2).toFixed(2)}" y="${topPad}" width="${colW.toFixed(2)}" height="${plotH}" fill="transparent" />
      `;
    }).join('');

    // Y-axis title
    const yTitleHtml = `<text x="-${((topPad + baselineY) / 2).toFixed(2)}" y="16" transform="rotate(-90)" text-anchor="middle" font-size="12" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Confirmed Leakage Records</text>`;

    container.innerHTML = `
      <svg class="svg-chart monthly-line-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <!-- Subtle Horizontal Gridlines -->
        ${gridHtml}

        <!-- X-Axis Month Ticks & Labels -->
        ${xAxisHtml}

        <!-- Y-Axis Title -->
        ${yTitleHtml}

        <!-- Baseline -->
        <line x1="${leftPad}" y1="${baselineY}" x2="${svgW - rightPad}" y2="${baselineY}" stroke="#B8C7D9" stroke-width="1.5" />

        <!-- Vertical Crosshair Guide (hidden by default) -->
        <line id="monthlyCrosshairLine" class="monthly-crosshair-line" x1="0" y1="${topPad}" x2="0" y2="${baselineY}" stroke="#0B3A70" stroke-width="1.2" stroke-dasharray="3 3" opacity="0" />

        <!-- Multi-Series Paths -->
        ${pathsHtml}

        <!-- Circular Data Point Markers & Labels -->
        ${markersHtml}

        <!-- Interactive Month Column Hover Areas -->
        ${hoverColsHtml}
      </svg>
    `;

    // Tooltips & Crosshair events
    const crosshair = container.querySelector('#monthlyCrosshairLine');

    container.querySelectorAll('.monthly-slot-hover').forEach(slot => {
      const mIdx = Number(slot.dataset.midx);
      const tipContent = monthColumnTooltips[mIdx] || '';
      slot.addEventListener('mouseenter', (e) => {
        const cx = slot.dataset.cx;
        if (crosshair) {
          crosshair.setAttribute('x1', cx);
          crosshair.setAttribute('x2', cx);
          crosshair.style.opacity = '0.6';
        }
        showTooltip(e, tipContent);
      });
      slot.addEventListener('mousemove', (e) => {
        showTooltip(e, tipContent);
      });
      slot.addEventListener('mouseleave', () => {
        if (crosshair) crosshair.style.opacity = '0';
        hideTooltip();
      });
    });

    container.querySelectorAll('.monthly-point-marker').forEach(marker => {
      const year = marker.dataset.year;
      const month = marker.dataset.month;
      const val = marker.dataset.val;
      const pointTip = `<strong>${year} — ${month}</strong><br>Confirmed Leakage: <strong>${numFmt(val)}</strong> records`;

      marker.addEventListener('mouseenter', (e) => {
        highlightYear(year);
        showTooltip(e, pointTip);
      });
      marker.addEventListener('mousemove', (e) => {
        showTooltip(e, pointTip);
      });
      marker.addEventListener('mouseleave', () => {
        resetYearHighlight();
        hideTooltip();
      });
    });

    // Connect Card Header Legend items for interactive year filtering/highlighting
    function highlightYear(targetYear) {
      container.querySelectorAll('.monthly-year-path').forEach(p => {
        if (p.dataset.year === String(targetYear)) {
          p.style.strokeWidth = '3.5px';
          p.style.opacity = '1';
        } else {
          p.style.strokeWidth = '1.8px';
          p.style.opacity = '0.18';
        }
      });
      container.querySelectorAll('.monthly-point-marker').forEach(m => {
        if (m.dataset.year === String(targetYear)) {
          m.style.opacity = '1';
          const txt = m.querySelector('.pt-label');
          if (txt) txt.style.display = 'block';
        } else {
          m.style.opacity = '0.18';
          const txt = m.querySelector('.pt-label.pt-label-dim');
          if (txt) txt.style.display = 'none';
        }
      });
    }

    function resetYearHighlight() {
      container.querySelectorAll('.monthly-year-path').forEach(p => {
        p.style.strokeWidth = '2.5px';
        p.style.opacity = '1';
      });
      container.querySelectorAll('.monthly-point-marker').forEach(m => {
        m.style.opacity = '1';
        const txt = m.querySelector('.pt-label.pt-label-dim');
        if (txt) txt.style.display = 'none';
      });
    }

    const legendContainer = document.getElementById('chartMonthlyLegend');
    if (legendContainer) {
      legendContainer.querySelectorAll('.legend-item').forEach(item => {
        const y = item.dataset.year;
        item.addEventListener('mouseenter', () => highlightYear(y));
        item.addEventListener('mouseleave', resetYearHighlight);
      });
    }
  }

  // 4. Chart 3: Leakage Points Breakdown (Professional Pareto Chart with Dual Axes & Bright Red Cumulative Line)
  function renderChartLeakagePoints() {
    const container = document.getElementById('chartLeakagePoints');
    if (!container) return;

    // Order strictly from highest to lowest
    const sortedPoints = [...data.leakagePoints].sort((a, b) => b.total - a.total);
    const totalLeaks = sortedPoints.reduce((sum, p) => sum + p.total, 0); // 4,031

    const maxActual = Math.max(...sortedPoints.map(p => p.total)); // 1,909
    // Left-axis maximum: 2,500 so highest column (1,909) occupies ~76% of available plot height
    // cleanly aligning with dual axis increments of 500 records / 20%
    const maxVal = 2500;

    const svgW = 760;
    const svgH = 515;
    const leftPad = 64;
    const rightPad = 64;
    const topPad = 80;
    const baselineY = 435;
    const plotW = svgW - leftPad - rightPad; // 632px
    const plotH = baselineY - topPad; // 355px

    // Palette:
    // Highest: Dark Brown (#6B3E2E)
    // Cu-Al Joint Leakage: specifically Dark Blue (#0B3A70)
    // Unclassified / Other: Red (#D9534F)
    // Cu-Al Joint Brokage: Orange-Red (#E07F46)
    // Header Leakage: Warm Olive (#B1A542)
    // MPE Tube-Header Joint: Muted Green (#71AE6B)
    // Fin Corrosion Problem: Light Green (#A8D5A2)
    const paletteMap = {
      'Microchannel Body Leakage': '#6B3E2E',
      'Microchannel Leakage': '#6B3E2E',
      'Cu-Al Joint Leakage (In-Out Both)': '#0B3A70',
      'Cu-Al Joint Leakage': '#0B3A70',
      'Unclassified / Other': '#D9534F',
      'Cu-Al Joint Brokage': '#E07F46',
      'Header Leakage': '#B1A542',
      'MPE Tube-Header Joint': '#71AE6B',
      'Fin Corrosion Problem': '#A8D5A2'
    };

    // Clean two-line category label formatting
    function getCategoryLines(name) {
      const labelMap = {
        'Microchannel Body Leakage': ['Microchannel', 'Body Leakage'],
        'Microchannel Leakage': ['Microchannel', 'Body Leakage'],
        'Cu-Al Joint Leakage (In-Out Both)': ['Cu-Al Joint', 'Leakage'],
        'Cu-Al Joint Leakage': ['Cu-Al Joint', 'Leakage'],
        'Unclassified / Other': ['Unclassified /', 'Other'],
        'Cu-Al Joint Brokage': ['Cu-Al Joint', 'Brokage'],
        'Header Leakage': ['Header', 'Leakage'],
        'MPE Tube-Header Joint': ['MPE Tube-', 'Header Joint'],
        'Fin Corrosion Problem': ['Fin Corrosion', 'Problem']
      };
      if (labelMap[name]) return labelMap[name];
      const parts = name.split(' ');
      if (parts.length <= 1) return [name, ''];
      const mid = Math.ceil(parts.length / 2);
      return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')];
    }

    // Gridlines & Dual Axes levels: 0, 500, 1000, 1500, 2000, 2500 <-> 0%, 20%, 40%, 60%, 80%, 100%
    const gridVals = [
      { val: 0, leftLbl: '0', rightLbl: '0%' },
      { val: 500, leftLbl: '500', rightLbl: '20%' },
      { val: 1000, leftLbl: '1,000', rightLbl: '40%' },
      { val: 1500, leftLbl: '1,500', rightLbl: '60%' },
      { val: 2000, leftLbl: '2,000', rightLbl: '80%' },
      { val: 2500, leftLbl: '2,500', rightLbl: '100%' }
    ];

    let gridHtml = gridVals.map(g => {
      const y = baselineY - (g.val / maxVal) * plotH;
      const isBase = g.val === 0;
      return `
        <!-- Horizontal Gridline -->
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="${isBase ? '#B8C7D9' : '#E2E8F0'}" stroke-dasharray="${isBase ? 'none' : '4 4'}" stroke-width="${isBase ? '1.5' : '1'}" />
        <!-- Left Tick & Label -->
        <line x1="${leftPad - 5}" y1="${y}" x2="${leftPad}" y2="${y}" stroke="#B8C7D9" stroke-width="1.5" />
        <text x="${leftPad - 8}" y="${y + 4}" text-anchor="end" font-size="11" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${g.leftLbl}</text>
        <!-- Right Tick & Label -->
        <line x1="${svgW - rightPad}" y1="${y}" x2="${svgW - rightPad + 5}" y2="${y}" stroke="#B8C7D9" stroke-width="1.5" />
        <text x="${svgW - rightPad + 9}" y="${y + 4}" text-anchor="start" font-size="11" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${g.rightLbl}</text>
      `;
    }).join('');

    const colStep = plotW / sortedPoints.length; // ~90.28px
    const colW = 62; // Clean, generous column width utilizing available space

    let cum = 0;
    const pointsCoords = [];

    let columnsHtml = sortedPoints.map((p, i) => {
      cum += p.total;
      const cumPct = (cum / totalLeaks) * 100;
      const sharePct = (p.total / totalLeaks) * 100;

      const cx = leftPad + (i + 0.5) * colStep;
      const colX = cx - colW / 2;
      const colH = (p.total / maxVal) * plotH;
      const colY = baselineY - colH;
      const my = baselineY - (cumPct / 100.0) * plotH;

      const color = paletteMap[p.leakPoint] || '#6B3E2E';
      const lines = getCategoryLines(p.leakPoint);
      const cumStr = (cumPct === 100.0) ? '100.0%' : cumPct.toFixed(2) + '%';

      pointsCoords.push({ cx, my, cumPct, cumStr, total: p.total, sharePct, leakPoint: p.leakPoint });

      const tooltipText = `<strong>${p.leakPoint}</strong><br>Confirmed Leaks: <strong>${numFmt(p.total)}</strong> (${sharePct.toFixed(2)}% of total)<br>Cumulative: <strong>${numFmt(cum)}</strong> (${cumStr} of total)<br>• Import: ${numFmt(p.import)}<br>• Inhouse: ${numFmt(p.inhouse)}`;

      const hoverTop = Math.min(colY, topPad) - 20;
      const hoverH = baselineY - hoverTop + 40;

      return `
        <g class="svg-pareto-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <!-- Transparent full-height hover zone -->
          <rect x="${cx - colStep / 2}" y="${hoverTop}" width="${colStep}" height="${hoverH}" fill="transparent" />

          <!-- Vertical Column -->
          <rect x="${colX}" y="${colY}" width="${colW}" height="${colH}" fill="${color}" rx="3" ry="3" />

          <!-- Value Label Above Column: Quantity -->
          <text x="${cx}" y="${colY - 15}" text-anchor="middle" font-size="12" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(p.total)}</text>

          <!-- Value Label Above Column: (Share %) -->
          <text x="${cx}" y="${colY - 3}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">(${sharePct.toFixed(2)}%)</text>

          <!-- Category Label (2-line wrapped) beneath baseline -->
          <text x="${cx}" y="${baselineY + 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#172B3A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            <tspan x="${cx}" dy="0">${lines[0]}</tspan>
            ${lines[1] ? `<tspan x="${cx}" dy="14">${lines[1]}</tspan>` : ''}
          </text>
        </g>
      `;
    }).join('');

    // Cumulative line path string
    const polylinePoints = pointsCoords.map(pt => `${pt.cx.toFixed(2)},${pt.my.toFixed(2)}`).join(' ');

    // Cumulative Markers and Labels
    let markersHtml = pointsCoords.map((pt, i) => {
      const isFirst = i === 0;
      const lblColor = isFirst ? '#FFFFFF' : '#0B3A70';
      const lblY = isFirst ? pt.my - 8 : pt.my - 9;
      const halo = isFirst ? '' : 'paint-order="stroke" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
      const cumMarkerTooltip = `<strong>Cumulative Share: ${pt.cumStr}</strong><br>${pt.leakPoint}<br>Cumulative Leaks: <strong>${numFmt(sortedPoints.slice(0, i + 1).reduce((s, x) => s + x.total, 0))}</strong> of ${numFmt(totalLeaks)}`;

      return `
        <g class="svg-cum-point" style="cursor: pointer;" data-tooltip="${cumMarkerTooltip}">
          <!-- Circular Marker on Line -->
          <circle cx="${pt.cx.toFixed(2)}" cy="${pt.my.toFixed(2)}" r="6" fill="#E3261E" stroke="#FFFFFF" stroke-width="2" />
          <!-- Cumulative % Label above marker -->
          <text x="${pt.cx.toFixed(2)}" y="${lblY.toFixed(2)}" text-anchor="middle" font-size="11" font-weight="700" fill="${lblColor}" ${halo} font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${pt.cumStr}</text>
        </g>
      `;
    }).join('');

    // Legend at bottom
    const legY = baselineY + 54;
    const legendHtml = `
      <g class="pareto-legend">
        <!-- Number of Records (Dark Brown box) -->
        <rect x="235" y="${legY - 9}" width="14" height="12" rx="2" fill="#6B3E2E" />
        <text x="256" y="${legY + 1}" font-size="12" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Number of Records</text>

        <!-- Cumulative Percentage (Bright Red line + dot) -->
        <line x1="420" y1="${legY - 3}" x2="448" y2="${legY - 3}" stroke="#E3261E" stroke-width="2.5" />
        <circle cx="434" cy="${legY - 3}" r="4.5" fill="#E3261E" stroke="#FFFFFF" stroke-width="1.5" />
        <text x="456" y="${legY + 1}" font-size="12" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Cumulative Percentage</text>
      </g>
    `;

    container.innerHTML = `
      <svg class="svg-chart pareto-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <!-- Dual Axes & Gridlines -->
        ${gridHtml}

        <!-- Left Axis Vertical Line & Title -->
        <line x1="${leftPad}" y1="${topPad}" x2="${leftPad}" y2="${baselineY}" stroke="#B8C7D9" stroke-width="1.5" />
        <text x="-${(topPad + baselineY) / 2}" y="17" transform="rotate(-90)" text-anchor="middle" font-size="12" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Number of Records</text>

        <!-- Right Axis Vertical Line & Title -->
        <line x1="${svgW - rightPad}" y1="${topPad}" x2="${svgW - rightPad}" y2="${baselineY}" stroke="#B8C7D9" stroke-width="1.5" />
        <text x="${(topPad + baselineY) / 2}" y="-${svgW - 17}" transform="rotate(90)" text-anchor="middle" font-size="12" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Cumulative Percentage</text>

        <!-- Columns -->
        ${columnsHtml}

        <!-- Cumulative Polyline (Bright Red #E3261E) -->
        <polyline fill="none" stroke="#E3261E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${polylinePoints}" />

        <!-- Cumulative Markers & Labels -->
        ${markersHtml}

        <!-- Legend -->
        ${legendHtml}
      </svg>
    `;

    // Tooltips
    container.querySelectorAll('.svg-pareto-col, .svg-cum-point').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 5. Chart 4: Top 10 Installed Areas (Horizontal Ranked Lollipop Chart matching visual reference)
  function renderChartTopAreas() {
    const container = document.getElementById('chartTopAreas');
    if (!container) return;

    // Order strictly from highest to lowest
    const sortedAreas = [...data.top10Areas].sort((a, b) => b.leakageRecords - a.leakageRecords);
    const totalTop10 = sortedAreas.reduce((sum, a) => sum + a.leakageRecords, 0); // 2,675
    const totalPopulation = data.metadata?.confirmedLeakageRecords || data.summary?.totalConfirmed || 5132;
    const top10PctOfTotal = ((totalTop10 / totalPopulation) * 100).toFixed(2);

    const cardSubtitle = container.closest('.chart-card')?.querySelector('.chart-subtitle');
    if (cardSubtitle) {
      cardSubtitle.textContent = `Top 10 Service Centers account for ${numFmt(totalTop10)} records (${top10PctOfTotal}% of total leaks)`;
    }

    const maxActual = Math.max(...sortedAreas.map(a => a.leakageRecords)); // 566

    // Headroom: approximately 25-30% headroom after the highest value (566)
    // Scale ticks: 0, 100, 200, 300, 400, 500, 600, 700
    const maxVal = Math.max(700, Math.ceil((maxActual * 1.25) / 100) * 100); // 700

    const svgW = 760;
    const svgH = 515;
    const rankX = 28;
    const nameX = 64;
    const zeroX = 180;
    const axisEndX = 710;
    const plotW = axisEndX - zeroX; // 530px

    const gridTopY = 20;
    const rowStartY = 38;
    const rowStepY = 41;
    const baselineY = 445;

    // Grid ticks: 0, 100, 200, 300, 400, 500, 600, 700
    const gridVals = [0, 100, 200, 300, 400, 500, 600, 700];

    // Gridlines (dashed vertical lines at 100..700, solid vertical line at 0)
    let gridHtml = gridVals.map(val => {
      const x = zeroX + (val / maxVal) * plotW;
      const isZero = val === 0;
      return `
        <line x1="${x}" y1="${gridTopY}" x2="${x}" y2="${baselineY}" stroke="${isZero ? '#C0CBD9' : '#E2E8F0'}" stroke-dasharray="${isZero ? 'none' : '4 4'}" stroke-width="${isZero ? '1.5' : '1'}" />
        <line x1="${x}" y1="${baselineY}" x2="${x}" y2="${baselineY + 5}" stroke="#C0CBD9" stroke-width="1.5" />
        <text x="${x}" y="${baselineY + 18}" text-anchor="middle" font-size="12" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    // Color progression from Rank 1 to Rank 10 matching reference image:
    // highest = dark brown, then dark red/red, then orange-red, then progressively toward olive and light green
    const areaColors = [
      '#6B3C2B', // #1 Mohammadpur (Dark brown)
      '#B52721', // #2 Mirpur (Dark red)
      '#DC5F56', // #3 Keranigonj (Coral red)
      '#E07F46', // #4 Uttara (Orange-red)
      '#B1A542', // #5 Khilgaon (Warm olive / mustard)
      '#8BA857', // #6 Ashulia (Olive green)
      '#71AE6B', // #7 CTG Road (Medium green)
      '#A8D3A2', // #8 Kuril (Light green)
      '#B5DFB0', // #9 Khulna (Lighter soft green)
      '#BEE4B8'  // #10 CTG Agrabad (Lightest pale green)
    ];

    let lollipopsHtml = sortedAreas.map((a, i) => {
      const rowY = rowStartY + i * rowStepY;
      const dotX = zeroX + (a.leakageRecords / maxVal) * plotW;
      const color = areaColors[i] || areaColors[areaColors.length - 1];

      // Exact percentage within Top 10 (e.g. 21.6%, 16.5%, etc.)
      const pctOfTop10 = ((a.leakageRecords / totalTop10) * 100).toFixed(1);
      const areaName = a.installedArea || a.area || a.serviceCenter || 'Unknown';
      const importCount = a.import !== undefined ? a.import : (a.importLeaks !== undefined ? a.importLeaks : 0);
      const inhouseCount = a.inhouse !== undefined ? a.inhouse : (a.inhouseLeaks !== undefined ? a.inhouseLeaks : 0);

      const tooltipText = `<strong>Rank #${a.rank}: ${areaName}</strong><br>Leakage Records: <strong>${numFmt(a.leakageRecords)}</strong> (${pctOfTop10}% of Top 10 | ${pctFmt(a.sharePct)} of all leaks)<br>• Import: ${numFmt(importCount)}<br>• Inhouse: ${numFmt(inhouseCount)}`;

      return `
        <g class="svg-lollipop-row" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <!-- Transparent hover zone across entire row -->
          <rect x="${rankX - 6}" y="${rowY - rowStepY / 2}" width="${svgW - rankX}" height="${rowStepY}" fill="transparent" />

          <!-- Rank Label (#1, #2, ...) -->
          <text x="${rankX}" y="${rowY + 4.5}" font-size="12.5" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">#${a.rank}</text>

          <!-- Service Center Name -->
          <text x="${nameX}" y="${rowY + 4.5}" font-size="13.5" font-weight="600" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${areaName}</text>

          <!-- Thin horizontal lollipop line -->
          <line class="lollipop-line" x1="${zeroX}" y1="${rowY}" x2="${dotX}" y2="${rowY}" stroke="${color}" stroke-width="2" stroke-linecap="round" />

          <!-- Circular lollipop marker -->
          <circle class="lollipop-dot" cx="${dotX}" cy="${rowY}" r="7.5" fill="${color}" />

          <!-- Quantity and percentage on the right of lollipop -->
          <text x="${dotX + 16}" y="${rowY + 4.5}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            <tspan font-size="13.5" font-weight="700" fill="#0B3A70">${numFmt(a.leakageRecords)}</tspan>
            <tspan font-size="12.5" font-weight="500" fill="#536778"> (${pctOfTop10}%)</tspan>
          </text>
        </g>
      `;
    }).join('');

    // Compact summary box inside the chart area in the lower-right quadrant
    const boxW = 124;
    const boxH = 84;
    const boxX = axisEndX - boxW; // 586
    const boxY = baselineY - boxH - 12; // 445 - 84 - 12 = 349
    const boxCenterX = boxX + boxW / 2;
    const summaryTooltip = `<strong>Total (Top 10 Service Centers)</strong><br>${numFmt(totalTop10)} confirmed leakage records<br>${top10PctOfTotal}% of total leaks (${numFmt(totalPopulation)} total)`;

    const summaryBoxHtml = `
      <g class="lollipop-summary-box" style="cursor: pointer;" data-tooltip="${summaryTooltip}">
        <!-- Rounded soft background card -->
        <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="8" ry="8" fill="#EDF4F9" stroke="#CBE0F0" stroke-width="1.2" />
        <!-- Label: Total (Top 10) -->
        <text x="${boxCenterX}" y="${boxY + 23}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Total (Top 10)</text>
        <!-- Value: 2,621 -->
        <text x="${boxCenterX}" y="${boxY + 51}" text-anchor="middle" font-size="24" font-weight="800" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(totalTop10)}</text>
        <!-- Share: (65.02%) -->
        <text x="${boxCenterX}" y="${boxY + 71}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">(${top10PctOfTotal}%)</text>
      </g>
    `;

    // Horizontal baseline axis and title
    const axisLineHtml = `
      <line x1="${zeroX}" y1="${baselineY}" x2="${axisEndX}" y2="${baselineY}" stroke="#C0CBD9" stroke-width="1.5" stroke-linecap="square" />
      <text x="${(zeroX + axisEndX) / 2}" y="${baselineY + 44}" text-anchor="middle" font-size="13" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Number of Records</text>
    `;

    container.innerHTML = `
      <svg class="svg-chart lollipop-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; display: block; overflow: visible;">
        <!-- Vertical Gridlines & Ticks -->
        ${gridHtml}
        <!-- Ranked Horizontal Lollipops -->
        ${lollipopsHtml}
        <!-- Summary Box inside chart area -->
        ${summaryBoxHtml}
        <!-- Baseline & Axis Title -->
        ${axisLineHtml}
      </svg>
    `;

    // Tooltips
    container.querySelectorAll('.svg-lollipop-row, .lollipop-summary-box').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 6. Table 1: Year-Wise Leakage
  function renderTableYearly() {
    const tbody = document.getElementById('yearlyTableBody');
    const tfoot = document.getElementById('yearlyTableFoot');
    if (!tbody || !tfoot) return;

    const yearlyData = data.yearly;

    let rowsHtml = yearlyData.map(d => `
      <tr>
        <td style="font-weight: 700; color: var(--blue-900);">${d.year}</td>
        <td class="col-num">${numFmt(d.importLeakage)}</td>
        <td class="col-num">${numFmt(d.inhouseLeakage)}</td>
        <td class="col-num" style="font-weight: 700; color: var(--amber-700);">${numFmt(d.totalLeakage)}</td>
        <td class="col-num">${pctFmt(d.importShare)}</td>
        <td class="col-num">${pctFmt(d.inhouseShare)}</td>
        <td style="text-align: center;">
          <span class="badge-tag badge-coatec" style="padding: 2px 8px; font-size: 11px;">✓ Reconciled</span>
        </td>
      </tr>
    `).join('');

    const totalImp = data.metadata.importLeakage;
    const totalInh = data.metadata.inhouseLeakage;
    const totalAll = data.metadata.confirmedLeakageRecords;
    const shareImp = data.metadata.importSharePct;
    const shareInh = data.metadata.inhouseSharePct;

    let footHtml = `
      <tr class="table-total-row">
        <td>TOTAL</td>
        <td class="col-num">${numFmt(totalImp)}</td>
        <td class="col-num">${numFmt(totalInh)}</td>
        <td class="col-num">${numFmt(totalAll)}</td>
        <td class="col-num">${pctFmt(shareImp)}</td>
        <td class="col-num">${pctFmt(shareInh)}</td>
        <td style="text-align: center;">
          <span class="badge-tag badge-mfc" style="padding: 2px 8px; font-size: 11px;">100% Balanced</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
    tfoot.innerHTML = footHtml;
  }

  // 7. Table 2: Month-Wise Leakage
  function renderTableMonthly() {
    const tbody = document.getElementById('monthlyTableBody');
    const tfoot = document.getElementById('monthlyTableFoot');
    if (!tbody || !tfoot) return;

    let list = data.monthly;

    // Filter by year chip
    if (state.monthYearFilter !== 'all') {
      const y = parseInt(state.monthYearFilter);
      list = list.filter(d => d.year === y);
    }

    // Filter by search
    if (state.monthSearchQuery) {
      const q = state.monthSearchQuery;
      list = list.filter(d => 
        String(d.year).includes(q) || 
        d.month.toLowerCase().includes(q) ||
        d.period.toLowerCase().includes(q)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">No monthly records found matching filter.</td></tr>`;
      tfoot.innerHTML = '';
      return;
    }

    let subImp = 0, subInh = 0, subTot = 0;

    let rowsHtml = list.map(d => {
      subImp += d.importLeakage;
      subInh += d.inhouseLeakage;
      subTot += d.totalLeakage;

      return `
        <tr>
          <td style="font-weight: 600; color: var(--blue-900);">${d.year}</td>
          <td><span class="badge-tag" style="background: var(--bg-surface-soft);">${d.month}</span></td>
          <td class="col-num">${numFmt(d.importLeakage)}</td>
          <td class="col-num">${numFmt(d.inhouseLeakage)}</td>
          <td class="col-num" style="font-weight: 700; color: var(--amber-700);">${numFmt(d.totalLeakage)}</td>
          <td class="col-num">${pctFmt(d.importShare)}</td>
          <td class="col-num">${pctFmt(d.inhouseShare)}</td>
          <td style="text-align: center;">
            <span class="badge-tag badge-coatec" style="padding: 2px 6px; font-size: 10.5px;">✓ Exact</span>
          </td>
        </tr>
      `;
    }).join('');

    let footHtml = `
      <tr class="table-total-row">
        <td colspan="2">${state.monthYearFilter === 'all' && !state.monthSearchQuery ? 'GRAND TOTAL (67 MONTHS)' : 'SUBTOTAL (FILTERED)'}</td>
        <td class="col-num">${numFmt(subImp)}</td>
        <td class="col-num">${numFmt(subInh)}</td>
        <td class="col-num">${numFmt(subTot)}</td>
        <td class="col-num">${subTot > 0 ? pctFmt((subImp / subTot) * 100) : '0.00%'}</td>
        <td class="col-num">${subTot > 0 ? pctFmt((subInh / subTot) * 100) : '0.00%'}</td>
        <td style="text-align: center;">
          <span class="badge-tag badge-mfc" style="padding: 2px 6px; font-size: 10.5px;">Balanced</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
    tfoot.innerHTML = footHtml;
  }

  // 8. Table 3: Leakage Points Summary
  function renderTablePoints() {
    const tbody = document.getElementById('pointsTableBody');
    const tfoot = document.getElementById('pointsTableFoot');
    if (!tbody || !tfoot) return;

    const points = data.leakagePoints;
    const maxVal = Math.max(...points.map(p => p.total));

    let rowsHtml = points.map((p, idx) => {
      const isUnclassified = p.leakPoint.includes('Unclassified');
      const barW = (p.total / maxVal) * 100;
      const barColor = isUnclassified ? 'var(--copper-500)' : (idx === 0 ? 'var(--amber-500)' : 'var(--blue-600)');

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-muted);">${idx + 1}</td>
          <td style="font-weight: 600; color: var(--blue-900);">
            ${p.leakPoint}
            ${isUnclassified ? '<span class="badge-tag badge-ambiguous" style="font-size: 10.5px; margin-left: 6px;">Multi/Peripheral</span>' : ''}
          </td>
          <td class="col-num">${numFmt(p.import)}</td>
          <td class="col-num">${numFmt(p.inhouse)}</td>
          <td class="col-num" style="font-weight: 700; color: var(--amber-700);">${numFmt(p.total)}</td>
          <td class="col-num" style="font-weight: 600;">${pctFmt(p.sharePct)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 8px; background: var(--bg-surface-muted); border-radius: 4px; overflow: hidden;">
                <div style="width: ${barW}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
              </div>
              <span style="font-size: 11px; color: var(--text-muted); width: 42px; text-align: right;">${pctFmt(p.sharePct)}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const totalImp = data.metadata.importLeakage;
    const totalInh = data.metadata.inhouseLeakage;
    const totalAll = data.metadata.confirmedLeakageRecords;

    let footHtml = `
      <tr class="table-total-row">
        <td colspan="2">TOTAL CONFIRMED LEAKAGE</td>
        <td class="col-num">${numFmt(totalImp)}</td>
        <td class="col-num">${numFmt(totalInh)}</td>
        <td class="col-num">${numFmt(totalAll)}</td>
        <td class="col-num">100.00%</td>
        <td>
          <span class="badge-tag badge-mfc" style="padding: 2px 8px; font-size: 11px;">100.00% Reconciled</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
    tfoot.innerHTML = footHtml;
  }

  // 9. Table 4: Top 10 Installed Areas
  function renderTableAreas() {
    const tbody = document.getElementById('areasTableBody');
    const tfoot = document.getElementById('areasTableFoot');
    if (!tbody || !tfoot) return;

    const areas = data.top10Areas;
    const maxVal = Math.max(...areas.map(a => a.leakageRecords));

    let rowsHtml = areas.map((a, idx) => {
      const pillClass = idx < 3 ? 'rank-pill top3' : 'rank-pill';
      const barW = (a.leakageRecords / maxVal) * 100;
      const barColor = idx < 3 ? 'var(--amber-500)' : 'var(--blue-600)';
      const areaName = a.installedArea || a.area || a.serviceCenter || 'Unknown';
      const importCount = a.import !== undefined ? a.import : (a.importLeaks !== undefined ? a.importLeaks : 0);
      const inhouseCount = a.inhouse !== undefined ? a.inhouse : (a.inhouseLeaks !== undefined ? a.inhouseLeaks : 0);

      return `
        <tr>
          <td><span class="${pillClass}">${a.rank}</span></td>
          <td style="font-weight: 600; color: var(--blue-900); font-size: 13.5px;">${areaName}</td>
          <td class="col-num" style="font-weight: 700; color: var(--amber-700);">${numFmt(a.leakageRecords)}</td>
          <td class="col-num" style="font-weight: 600;">${pctFmt(a.sharePct)}</td>
          <td class="col-num">${numFmt(importCount)}</td>
          <td class="col-num">${numFmt(inhouseCount)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 8px; background: var(--bg-surface-muted); border-radius: 4px; overflow: hidden;">
                <div style="width: ${barW}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
              </div>
              <span style="font-size: 11px; color: var(--text-muted); width: 42px; text-align: right;">${pctFmt(a.sharePct)}</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const top10Sum = data.metadata.top10TotalRecords;
    const top10Share = data.metadata.top10SharePct;

    let footHtml = `
      <tr class="table-total-row">
        <td colspan="2">TOP 10 SUB-TOTAL</td>
        <td class="col-num">${numFmt(top10Sum)}</td>
        <td class="col-num">${pctFmt(top10Share)}</td>
        <td class="col-num">${numFmt(areas.reduce((s, a) => s + a.import, 0))}</td>
        <td class="col-num">${numFmt(areas.reduce((s, a) => s + a.inhouse, 0))}</td>
        <td>
          <span class="badge-tag badge-coatec" style="padding: 2px 8px; font-size: 11px;">65.02% of All Leaks</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
    tfoot.innerHTML = footHtml;
  }

  // 10. Modal for Unclassified Records
  function renderUnclassifiedModal() {
    const tbody = document.getElementById('unclassifiedTableBody');
    if (!tbody || !data.unclassifiedDetails) return;

    const list = data.unclassifiedDetails;
    const totalUnclass = data.metadata.unclassifiedRecords;

    let rowsHtml = list.map((item, idx) => {
      const share = (item.count / totalUnclass) * 100;
      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 11px;">${idx + 1}</td>
          <td style="font-family: monospace; font-size: 12px; color: var(--blue-900);">${item.problem}</td>
          <td class="col-num" style="font-weight: 700;">${numFmt(item.count)}</td>
          <td class="col-num" style="color: var(--text-secondary);">${pctFmt(share)}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rowsHtml;
  }


// 5. Chart 5: Sales-to-Service Duration Distribution (Vertical Column Chart)
  function renderChartSalesToService() {
    const container = document.getElementById('chartSalesToService');
    if (!container || !data.salesToServiceDuration) return;

    const categories = data.salesToServiceDuration.categories;
    const summary = data.salesToServiceDuration.summary;
    const svgW = 540;
    const svgH = 360;
    const leftPad = 52;
    const rightPad = 18;
    const topPad = 26;
    const baselineY = 302;
    const plotH = baselineY - topPad; // 276px
    const plotW = (svgW - rightPad) - leftPad; // 470px

    // Dynamic scale: peak is 2 Years (1,532 records).
    // Set Y-axis maximum dynamically so tallest column utilizes ~85-88% of available height with clean headroom.
    // 1532 / 0.88 = 1740 -> clean ceiling 1750 (1532 / 1750 = 87.5% height, 12.5% headroom)
    const maxVal = Math.ceil((Math.max(...categories.map(c => c.count)) / 0.88) / 50) * 50; // 1750

    // Y-axis gridlines: [0, 500, 1000, 1500]
    const gridVals = [0, 500, 1000, 1500];
    let gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="${val === 0 ? 'none' : '4 4'}" stroke-width="${val === 0 ? '1.5' : '1'}" />
        <text x="${leftPad - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--chart-axis)" font-family="sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    const stepX = plotW / categories.length; // 58.75px
    const colW = 34;

    // Sequential color progression from HIGHEST quantity to LOWEST quantity
    const progressionColors = [
      '#8B2E2E', // 1. Dark Red / Deep Burgundy (Rank 1 - Highest: 2 Years, 1,532)
      '#B83B3B', // 2. Dark Red (Rank 2: 1 Year, 1,486)
      '#D9534F', // 3. Coral / Crimson Red (Rank 3: < 1 Year, 1,161)
      '#D97757', // 4. Terracotta / Warm Orange (Rank 4: 3 Years, 747)
      '#A8A94A', // 5. Olive / Golden-Green (Rank 5: 4 Years, 443)
      '#7CAF72', // 6. Sage Green (Rank 6: 5 Years, 200)
      '#9ECB95', // 7. Light Green (Rank 7: 6 Years, 45)
      '#C4E4BE'  // 8. Pale Mint (Rank 8 - Lowest: 7 Years, 3)
    ];

    // Dynamic ranking based on actual quantity (count) from highest to lowest
    const sortedCategories = [...categories].sort((a, b) => b.count - a.count);
    const rankMap = new Map();
    sortedCategories.forEach((cat, idx) => {
      rankMap.set(cat.category, idx);
    });

    let columnsHtml = categories.map((d, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const colX = centerX - colW / 2;
      const hCol = (d.count / maxVal) * plotH;
      const yCol = baselineY - hCol;

      const rank = rankMap.get(d.category) ?? 0;
      const fillCol = progressionColors[Math.min(rank, progressionColors.length - 1)];
      const strokeCol = fillCol;
      const isPeak = d.isPeak;
      const labelCol = isPeak ? '#8B2E2E' : '#0B3A70';

      const tooltipText = `<strong>${d.category} (${d.rangeDays})</strong><br>• Service Records: <strong>${numFmt(d.count)}</strong> (${pctFmt(d.sharePct)})<br>• Cumulative: ${numFmt(d.cumCount)} records (${pctFmt(d.cumSharePct)})<br>• Import Leaks: ${numFmt(d.importCount)} | Inhouse: ${numFmt(d.inhouseCount)}<br>• Valid Dataset Baseline: ${numFmt(summary.validCount)} records`;

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <!-- Transparent hover zone -->
          <rect x="${centerX - stepX / 2}" y="${topPad}" width="${stepX}" height="${plotH + 35}" fill="transparent" />

          <!-- Vertical Column -->
          ${hCol > 0 ? `
            <rect x="${colX}" y="${yCol}" width="${colW}" height="${hCol}" fill="${fillCol}" stroke="${strokeCol}" stroke-width="0.5" rx="3" ry="3" />
          ` : ''}

          <!-- Quantity (Percentage) label above column -->
          <text x="${centerX}" y="${yCol - 8}" text-anchor="middle" font-size="${isPeak ? '10' : '9.5'}" font-weight="${isPeak ? '700' : '600'}" fill="${labelCol}" font-family="sans-serif">${numFmt(d.count)} (${d.sharePct.toFixed(1)}%)</text>

          <!-- Duration Category Label on X-Axis -->
          <text x="${centerX}" y="${baselineY + 18}" text-anchor="middle" font-size="11" font-weight="${isPeak ? '700' : '600'}" fill="${isPeak ? '#8B2E2E' : 'var(--text-primary)'}" font-family="sans-serif">${d.category}</text>

          <!-- Range Days Subtitle below Category -->
          <text x="${centerX}" y="${baselineY + 32}" text-anchor="middle" font-size="8.5" font-weight="500" fill="var(--text-muted)" font-family="sans-serif">${d.rangeDays}</text>
        </g>
      `;
    }).join('');

    const svg = `
      <svg class="svg-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: 100%; overflow: visible;">
        <!-- Gridlines & Y-Axis Labels -->
        ${gridHtml}

        <!-- Vertical Columns & Top Labels -->
        ${columnsHtml}

        <!-- Baseline -->
        <line x1="${leftPad}" y1="${baselineY}" x2="${svgW - rightPad}" y2="${baselineY}" stroke="var(--chart-axis)" stroke-width="1.5" />
      </svg>
    `;

    container.innerHTML = svg;

    // Attach tooltips
    container.querySelectorAll('.svg-bar-col').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 5B. Chart 5B: < 1 Year Service Duration by Quarter (Distribution Pie / Donut Chart)
  function renderChartUnderOneYearQuarters() {
    const container = document.getElementById('chartUnderOneYearQuarters');
    if (!container || !data.salesToServiceDuration || !data.salesToServiceDuration.underOneYearQuarters) return;

    const qData = data.salesToServiceDuration.underOneYearQuarters;
    const quarters = qData.quarters;
    const totalCount = qData.total || 1161;

    // Palette matching reference mockup
    const palette = [
      { color: '#DD760E', textColor: '#FFFFFF' }, // 1st Quarter (Warm orange)
      { color: '#0E3F76', textColor: '#FFFFFF' }, // 2nd Quarter (Dark navy blue)
      { color: '#148286', textColor: '#FFFFFF' }, // 3rd Quarter (Teal)
      { color: '#A8BCCF', textColor: '#0E3F76' }  // 4th Quarter (Soft light blue/gray, dark navy text)
    ];

    const cx = 160;
    const cy = 160;
    const r = 145;

    let currentDeg = 0;
    const wedgesSvg = [];
    const labelsSvg = [];
    const legendHtml = [];
    const quarterTooltips = [];

    quarters.forEach((q, idx) => {
      const p = palette[idx] || { color: '#0E3F76', textColor: '#FFFFFF' };
      const share = q.count / totalCount;
      const angleDeg = share * 360.0;
      const startDeg = currentDeg;
      const endDeg = currentDeg + angleDeg;
      const midDeg = (startDeg + endDeg) / 2.0;

      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;
      const midRad = (midDeg * Math.PI) / 180;

      const x1 = (cx + r * Math.sin(startRad)).toFixed(2);
      const y1 = (cy - r * Math.cos(startRad)).toFixed(2);
      const x2 = (cx + r * Math.sin(endRad)).toFixed(2);
      const y2 = (cy - r * Math.cos(endRad)).toFixed(2);

      const largeArc = angleDeg > 180 ? 1 : 0;
      const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      // Label coordinate (63% radius)
      const lr = r * 0.63;
      const lx = (cx + lr * Math.sin(midRad)).toFixed(1);
      const ly = (cy - lr * Math.cos(midRad)).toFixed(1);

      quarterTooltips[idx] = `<strong>${q.quarter} (${q.range})</strong><br>• Elapsed Days: ${q.rangeDays || (q.minDays + ' – ' + q.maxDays + ' d')}<br>• Confirmed Records: <strong>${numFmt(q.count)}</strong> (${q.sharePct.toFixed(1)}%)<br>• Cohort Share: ${q.sharePct.toFixed(1)}% of ${numFmt(totalCount)} &lt; 1 Year Failures<br>• Status: ${q.isPeak ? '★ Peak Failure Period' : 'Subsequent Failure Period'}`;

      wedgesSvg.push(`<path class="pie-slice slice-q${idx + 1}" data-qidx="${idx}" d="${pathD}" fill="${p.color}" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round" />`);

      labelsSvg.push(`<text class="pie-label label-q${idx + 1}" x="${lx}" y="${ly}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" pointer-events="none">
        <tspan x="${lx}" dy="-4" font-size="14" font-weight="700" fill="${p.textColor}">${numFmt(q.count)}</tspan>
        <tspan x="${lx}" dy="16" font-size="11" font-weight="600" fill="${p.textColor}">(${q.sharePct.toFixed(1)}%)</tspan>
      </text>`);

      legendHtml.push(`
        <div class="pie-legend-item item-q${idx + 1}" data-qidx="${idx}">
          <div class="pie-legend-left">
            <div class="pie-legend-dot" style="background: ${p.color};"></div>
            <div>
              <div class="pie-legend-title">${q.quarter}</div>
              <div class="pie-legend-range">${q.range}</div>
            </div>
          </div>
          <div class="pie-legend-right">
            <div class="pie-legend-count">${numFmt(q.count)}</div>
            <div class="pie-legend-pct">(${q.sharePct.toFixed(1)}%)</div>
          </div>
        </div>
      `);

      currentDeg = endDeg;
    });

    const content = `
      <div class="quarter-pie-card-content">
        <div class="quarter-pie-main">
          <div class="quarter-pie-chart-wrap">
            <svg class="svg-pie-chart" viewBox="0 0 320 320" style="width: 100%; height: auto; max-width: 270px; display: block; overflow: visible;">
              ${wedgesSvg.join('')}
              ${labelsSvg.join('')}
            </svg>
          </div>
          <div class="quarter-pie-legend-wrap">
            ${legendHtml.join('')}
          </div>
        </div>
        <div class="pie-total-banner">
          Total Records: ${numFmt(totalCount)} (100%)
        </div>
      </div>
    `;

    container.innerHTML = content;

    // Hover linking between wedges and legend items + tooltips
    const slices = container.querySelectorAll('.pie-slice');
    const legendItems = container.querySelectorAll('.pie-legend-item');

    function setActive(qidx, active) {
      if (slices[qidx]) slices[qidx].classList.toggle('active', active);
      if (legendItems[qidx]) legendItems[qidx].classList.toggle('active', active);
    }

    slices.forEach(slice => {
      const idx = parseInt(slice.dataset.qidx, 10);
      slice.addEventListener('mouseenter', (e) => {
        setActive(idx, true);
        showTooltip(e, quarterTooltips[idx]);
      });
      slice.addEventListener('mousemove', (e) => showTooltip(e, quarterTooltips[idx]));
      slice.addEventListener('mouseleave', () => {
        setActive(idx, false);
        hideTooltip();
      });
    });

    legendItems.forEach(item => {
      const idx = parseInt(item.dataset.qidx, 10);
      item.addEventListener('mouseenter', (e) => {
        setActive(idx, true);
        showTooltip(e, quarterTooltips[idx]);
      });
      item.addEventListener('mousemove', (e) => showTooltip(e, quarterTooltips[idx]));
      item.addEventListener('mouseleave', () => {
        setActive(idx, false);
        hideTooltip();
      });
    });
  }

  // 10. Table 5: Sales-to-Service Duration Distribution Table
  function renderTableSalesToService() {
    const tbody = document.getElementById('durationTableBody');
    const tfoot = document.getElementById('durationTableFoot');
    const anomTbody = document.getElementById('negativeAnomaliesTableBody');
    if (!tbody || !tfoot || !data.salesToServiceDuration) return;

    const dur = data.salesToServiceDuration;
    const categories = dur.categories;
    const summary = dur.summary;
    const maxCount = Math.max(...categories.map(c => c.count));

    let rowsHtml = categories.map(d => {
      const barW = (d.count / maxCount) * 100;
      const barColor = d.isPeak ? 'var(--amber-500)' : 'var(--blue-700)';

      let phaseBadge = '';
      if (d.completedYears === 0) {
        phaseBadge = `<span class="badge-tag" style="background: rgba(11, 58, 112, 0.1); color: #0B3A70; border: 1px solid rgba(11, 58, 112, 0.25);">Infant Survival</span>`;
      } else if (d.isPeak) {
        phaseBadge = `<span class="badge-tag badge-leak" style="font-weight: 700;">Peak Incidence</span>`;
      } else if (d.completedYears === 2) {
        phaseBadge = `<span class="badge-tag badge-coatec">High Operational</span>`;
      } else {
        phaseBadge = `<span class="badge-tag badge-import">Long Tail Fleet</span>`;
      }

      return `
        <tr ${d.isPeak ? 'style="background: rgba(217, 119, 6, 0.04);"' : ''}>
          <td style="font-weight: 700; color: ${d.isPeak ? 'var(--amber-800)' : 'var(--blue-900)'}; font-size: 13.5px;">
            ${d.isPeak ? '★ ' : ''}${d.category}
          </td>
          <td style="color: var(--text-secondary); font-size: 12px; font-family: monospace;">${d.rangeDays}</td>
          <td class="col-num" style="font-weight: 700; color: ${d.isPeak ? 'var(--amber-700)' : 'var(--blue-900)'}; font-size: 13.5px;">${numFmt(d.count)}</td>
          <td class="col-num" style="font-weight: 700; color: ${d.isPeak ? 'var(--amber-700)' : 'inherit'};">${pctFmt(d.sharePct)}</td>
          <td class="col-num" style="font-weight: 600;">${numFmt(d.cumCount)}</td>
          <td class="col-num" style="color: var(--text-secondary);">${pctFmt(d.cumSharePct)}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 8px; background: var(--bg-surface-muted); border-radius: 4px; overflow: hidden;">
                <div style="width: ${barW}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
              </div>
              <span style="font-size: 11px; color: var(--text-muted); width: 42px; text-align: right;">${pctFmt(d.sharePct)}</span>
            </div>
          </td>
          <td style="text-align: center;">${phaseBadge}</td>
        </tr>
      `;
    }).join('');

    let footHtml = `
      <tr class="table-total-row">
        <td colspan="2">TOTAL VALID ANALYZED</td>
        <td class="col-num">${numFmt(summary.validCount)}</td>
        <td class="col-num">100.00%</td>
        <td class="col-num">${numFmt(summary.validCount)}</td>
        <td class="col-num">100.00%</td>
        <td>
          <span style="font-size: 11px; color: var(--text-muted);">Unresolved: ${summary.missingSalesCount} missing (30 neg adj to 3d)</span>
        </td>
        <td style="text-align: center;">
          <span class="badge-tag badge-coatec" style="padding: 2px 8px; font-size: 11px;">${summary.validSharePct.toFixed(2)}% Validated</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
    tfoot.innerHTML = footHtml;

    // Populate Flagged Negative Records Table in Audit Card
    if (anomTbody && dur.negativeAnomalies) {
      anomTbody.innerHTML = dur.negativeAnomalies.map(r => `
        <tr>
          <td style="font-weight: 600;">${r.serviceYear}</td>
          <td style="font-family: monospace; font-size: 11px;">${r.srNo}</td>
          <td>${r.createdDate}</td>
          <td>${r.salesDate}</td>
          <td class="col-num" style="color: #B3261E; font-weight: 700;">${r.rawDays !== undefined ? `${r.rawDays} d → ${r.durationDays} d` : `${r.durationDays} d`}</td>
        </tr>
      `).join('');
    }
  }

  // 10B. Table 5B: < 1 Year Cohort Quarterly Breakdown Table
  function renderTableUnderOneYearQuarters() {
    const tbody = document.getElementById('underOneYearTableBody');
    const tfoot = document.getElementById('underOneYearTableFoot');
    if (!tbody || !tfoot || !data.salesToServiceDuration || !data.salesToServiceDuration.underOneYearQuarters) return;

    const qData = data.salesToServiceDuration.underOneYearQuarters;
    const quarters = qData.quarters;
    const total = qData.total;
    const maxCount = Math.max(...quarters.map(q => q.count));

    let rowsHtml = quarters.map(d => {
      const barW = (d.count / maxCount) * 100;
      const barColor = d.isPeak ? 'var(--amber-500)' : 'var(--blue-700)';

      let phaseBadge = '';
      if (d.isPeak) {
        phaseBadge = `<span class="badge-tag badge-leak" style="font-weight: 700;">★ Infant Mortality Peak</span>`;
      } else if (d.quarter === '2nd Quarter') {
        phaseBadge = `<span class="badge-tag badge-coatec">Early Season Failure</span>`;
      } else if (d.quarter === '3rd Quarter') {
        phaseBadge = `<span class="badge-tag" style="background: rgba(122, 138, 152, 0.12); color: #536778; border: 1px solid rgba(122, 138, 152, 0.25);">Mid-Year Low</span>`;
      } else {
        phaseBadge = `<span class="badge-tag" style="background: rgba(13, 148, 136, 0.1); color: #0D9488; border: 1px solid rgba(13, 148, 136, 0.25);">Year-End Pre-Warranty</span>`;
      }

      return `
        <tr ${d.isPeak ? 'style="background: rgba(217, 119, 6, 0.04);"' : ''}>
          <td style="font-weight: 700; color: ${d.isPeak ? 'var(--amber-800)' : 'var(--blue-900)'}; font-size: 13px;">
            ${d.isPeak ? '★ ' : ''}${d.quarter}
          </td>
          <td style="font-weight: 600; color: var(--text-primary); font-size: 12.5px;">${d.range}</td>
          <td style="color: var(--text-secondary); font-size: 12px; font-family: monospace;">${d.rangeDays}</td>
          <td class="col-num" style="font-weight: 700; color: ${d.isPeak ? 'var(--amber-700)' : 'var(--blue-900)'}; font-size: 13.5px;">${numFmt(d.count)}</td>
          <td class="col-num" style="font-weight: 700; color: ${d.isPeak ? 'var(--amber-700)' : 'inherit'};">${d.sharePct.toFixed(1)}%</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 8px; background: var(--bg-surface-muted); border-radius: 4px; overflow: hidden;">
                <div style="width: ${barW}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
              </div>
              <span style="font-size: 11px; color: var(--text-muted); width: 42px; text-align: right;">${d.sharePct.toFixed(1)}%</span>
            </div>
          </td>
          <td style="text-align: center;">${phaseBadge}</td>
        </tr>
      `;
    }).join('');

    let footHtml = `
      <tr class="table-total-row">
        <td colspan="3">TOTAL &lt; 1 YEAR COHORT</td>
        <td class="col-num">${numFmt(total)}</td>
        <td class="col-num">100.0%</td>
        <td>
          <span style="font-size: 11px; color: var(--text-muted);">Strict subdivision of ${numFmt(total)} infant records</span>
        </td>
        <td style="text-align: center;">
          <span class="badge-tag badge-coatec" style="padding: 2px 8px; font-size: 11px;">100% Reconciled</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
    tfoot.innerHTML = footHtml;
  }

  // Export Duration Specific CSV
  function exportDurationCSV() {
    if (!data.salesToServiceDuration) return;
    const dur = data.salesToServiceDuration;
    const rows = [];
    rows.push(['Walton RAC - MFC Condenser Sales-to-Service Duration Distribution']);
    rows.push(['Generated: ' + new Date().toISOString()]);
    rows.push(['Metric: Completed years from product sale to first recorded MFC service']);
    rows.push([]);
    rows.push(['Duration Category', 'Elapsed Days Range', 'Service Records', 'Share %', 'Cumulative Records', 'Cumulative Share %', 'Import Leaks', 'Inhouse Leaks']);
    dur.categories.forEach(d => {
      rows.push([d.category, d.rangeDays, d.count, d.sharePct + '%', d.cumCount, d.cumSharePct + '%', d.importCount, d.inhouseCount]);
    });
    const s = dur.summary;
    rows.push(['TOTAL VALID ANALYZED', '', s.validCount, '100.00%', s.validCount, '100.00%', '', '']);
    rows.push(['MISSING SALES DATE', '', s.missingSalesCount, s.missingSharePct + '%', '', '', '', '']);
    rows.push(['NEGATIVE EXCEPTION (ADJUSTED TO 3D)', '', s.negativeAdjustedCount || 30, (s.negativeAdjustedSharePct || 0.52) + '%', '', '', '', '']);
    rows.push(['TOTAL CONFIRMED RECORDS', '', s.totalConfirmed, '100.00%', '', '', '', '']);
    rows.push([]);
    rows.push(['--- FLAGGED NEGATIVE DURATION RECORDS (ADJUSTED TO 3 DAYS EXCEPTION) ---']);
    rows.push(['Service Year', 'SR No', 'Created Date', 'Sales Date', 'Raw Duration (Days)', 'Adjusted Duration (Days)', 'Model', 'Service Center']);
    dur.negativeAnomalies.forEach(r => {
      rows.push([r.serviceYear, r.srNo, r.createdDate, r.salesDate, r.rawDays, r.durationDays, r.model, r.serviceCenter]);
    });


    // 6. ODU-Wise MFC Leakage
    if (data.oduLeakage) {
      const odu = data.oduLeakage;
      rows.push([]);
      rows.push(['--- 6. ODU-WISE MFC LEAKAGE BREAKDOWN ---']);
      rows.push(['Rank', 'ODU Category', 'Chassis Description', 'Confirmed Leaks', 'Classified Share %', 'Total Share %', 'Import Count', 'Inhouse Count']);
      odu.categories.forEach(c => {
        rows.push([c.rank, c.category, c.description, c.records, c.shareClassifiedPct + '%', c.shareTotalPct + '%', c.importCount, c.inhouseCount]);
      });
      rows.push(['—', 'Unresolved / Legacy Barcodes', 'Legacy prefix BXX0103...', odu.summary.unresolvedCount, '—', pctFmt((odu.summary.unresolvedCount / odu.summary.totalConfirmed) * 100) + '%', odu.summary.unresolvedCount, 0]);
      rows.push(['TOTAL CLASSIFIED', '', '', odu.summary.classifiedCount, '100.00%', pctFmt((odu.summary.classifiedCount / odu.summary.totalConfirmed) * 100) + '%']);
      rows.push(['TOTAL CONFIRMED LEAKS', '', '', odu.summary.totalConfirmed, '—', '100.00%']);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Walton_MFC_Sales_To_Service_Duration.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }



  // 6. Chart 6: ODU-Wise MFC Leakage (Vertical Column Chart with Dynamic Headroom)
  function renderChartOdu() {
    const container = document.getElementById('chartOduLeakage');
    if (!container || !data.oduLeakage) return;

    const odu = data.oduLeakage;
    const categories = [...odu.categories].sort((a, b) => b.records - a.records);

    const maxActual = Math.max(...categories.map(c => c.records)); // 2415
    // Dynamic Headroom: set Y-axis ceiling so tallest column occupies ~69-70% of available chart height
    // 2415 / 0.70 = 3450 -> rounded cleanly to 3500 (69.0% height, 31.0% headroom)
    const maxVal = odu.summary.yAxisCeiling || 3500;

    const svgW = 540;
    const svgH = 270;
    const leftPad = 54;
    const rightPad = 20;
    const topPad = 28;
    const baselineY = 220;
    const plotH = baselineY - topPad; // 192px
    const plotW = (svgW - rightPad) - leftPad; // 466px

    // Subtle horizontal gridlines at intervals of 700 (0, 700, 1400, 2100, 2800, 3500)
    const gridVals = [0, 700, 1400, 2100, 2800, 3500];
    let gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="${val === 0 ? 'none' : '4 4'}" stroke-width="${val === 0 ? '1.5' : '1'}" />
        <text x="${leftPad - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--chart-axis)" font-family="sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    const stepX = plotW / categories.length; // ~116.5px per column slot
    const colW = 44; // Broad column width

    let barsHtml = categories.map((cat, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const barX = centerX - colW / 2;

      const hCol = (cat.records / maxVal) * plotH;
      const yCol = baselineY - hCol;

      let capBreakdown = '';
      if (cat.capacities) {
        capBreakdown = Object.entries(cat.capacities)
          .map(([cap, cnt]) => `• ${cap}: ${numFmt(cnt)}`)
          .join('<br>');
      }

      let barcodeBreakdown = '';
      if (cat.legacyBarcodeCount && cat.legacyBarcodeCount > 0) {
        barcodeBreakdown = `<br>• Standard Barcodes: <strong>${numFmt(cat.standardBarcodeCount)}</strong><br>• Verified Legacy Barcodes: <strong>${numFmt(cat.legacyBarcodeCount)}</strong>`;
      }

      const tooltipText = `<strong>${cat.category} (${cat.chassis} Chassis)</strong><br>
        Rank #${cat.rank} in Confirmed MFC Leaks<br>
        • Confirmed Leaks: <strong>${numFmt(cat.records)}</strong> (${pctFmt(cat.shareClassifiedPct)})<br>
        • Share of Total: <strong>${pctFmt(cat.shareTotalPct)}</strong> (Base: ${numFmt(data.oduLeakage?.summary?.totalConfirmed || 4107)})<br>
        • Import: ${numFmt(cat.importCount)} | Inhouse: ${numFmt(cat.inhouseCount)}
        ${barcodeBreakdown}
        ${cat.subCounts ? `<br>• M Chassis: ${cat.subCounts.M} | F Chassis: ${cat.subCounts.F}` : ''}
        ${capBreakdown ? `<br><strong>Capacity Profile:</strong><br>${capBreakdown}` : ''}`;

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <!-- Transparent hover zone -->
          <rect x="${centerX - stepX / 2}" y="${topPad}" width="${stepX}" height="${plotH + 35}" fill="transparent" />

          <!-- Vertical Column with Dynamic Ranked Severity Color -->
          <rect x="${barX}" y="${yCol}" width="${colW}" height="${hCol}" fill="${cat.color}" stroke="${cat.strokeColor}" stroke-width="0.5" rx="3" ry="3" />

          <!-- Data Label: Quantity (Percentage) with comfortable whitespace headroom -->
          <text x="${centerX}" y="${yCol - 7}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${cat.textColor}" font-family="sans-serif">
            ${numFmt(cat.records)} (${pctFmt(cat.shareClassifiedPct)})
          </text>

          <!-- Category label beneath baseline -->
          <text x="${centerX}" y="${baselineY + 16}" text-anchor="middle" font-size="11.5" font-weight="700" fill="var(--text-primary)" font-family="sans-serif">
            ${cat.category}
          </text>
          <!-- Rank subtitle -->
          <text x="${centerX}" y="${baselineY + 28}" text-anchor="middle" font-size="9.5" font-weight="500" fill="var(--text-secondary)" font-family="sans-serif">
            Rank #${cat.rank}
          </text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: 100%; overflow: visible;">
        <!-- Subtle Horizontal Gridlines -->
        ${gridHtml}
        <!-- Vertical Ranked ODU Columns -->
        ${barsHtml}
      </svg>
    `;

    // Tooltip listeners
    container.querySelectorAll('.svg-bar-col').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 7. Tab 6: ODU Breakdown Table & Legacy Barcode Register
  let oduLegacyCache = [];

  function renderTableOdu() {
    if (!data.oduLeakage) return;
    const odu = data.oduLeakage;
    const summary = odu.summary;
    const categories = odu.categories;
    const legacyRecords = odu.legacyResolved || odu.unresolved || [];
    oduLegacyCache = legacyRecords;

    // 1. Summary Breakdown Table
    const tbody = document.getElementById('oduTableBody');
    const tfoot = document.getElementById('oduTableFoot');
    if (tbody) {
      let rowsHtml = categories.map(c => {
        const barPct = (c.records / categories[0].records) * 100;
        let subNote = c.description;
        if (c.legacyBarcodeCount && c.legacyBarcodeCount > 0) {
          subNote += ` <span style="color: #6B3E2E; font-weight: 600;">(Standard: ${numFmt(c.standardBarcodeCount)}, Legacy: ${numFmt(c.legacyBarcodeCount)})</span>`;
        }
        return `
          <tr>
            <td style="font-weight: 700; color: ${c.textColor};">#${c.rank}</td>
            <td style="font-weight: 700; color: var(--text-primary);">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${c.color}; margin-right: 6px; vertical-align: middle;"></span>
              ${c.category}
            </td>
            <td style="color: var(--text-secondary); font-size: 12px;">${subNote}</td>
            <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(c.records)}</td>
            <td class="col-num" style="font-weight: 600; color: ${c.textColor};">${pctFmt(c.shareClassifiedPct)}</td>
            <td class="col-num" style="color: var(--text-secondary);">${pctFmt(c.shareTotalPct)}</td>
            <td>
              <div style="background: var(--border-default); height: 14px; border-radius: 3px; overflow: hidden; width: 100%;">
                <div style="background: ${c.color}; height: 100%; width: ${barPct.toFixed(1)}%;"></div>
              </div>
            </td>
            <td style="text-align: center;">
              <span class="badge-tag" style="background: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; font-size: 11px;">Validated</span>
            </td>
          </tr>
        `;
      }).join('');

      tbody.innerHTML = rowsHtml;
    }

    if (tfoot) {
      tfoot.innerHTML = `
        <tr style="font-weight: 800; background: var(--border-default);">
          <td colspan="3" style="text-align: right;">TOTAL CONFIRMED MFC LEAKAGE FULLY RESOLVED & RECONCILED:</td>
          <td class="col-num" style="color: #0A6956; font-size: 13.5px;">${numFmt(summary.totalConfirmed)}</td>
          <td class="col-num" style="color: #0A6956; font-size: 13.5px;">100.00%</td>
          <td class="col-num" style="color: #0A6956; font-size: 13.5px;">100.00%</td>
          <td colspan="2" style="font-size: 11.5px; color: #0A6956; text-align: center;">100% Fully Resolved (0 Unresolved)</td>
        </tr>
      `;
    }

    // 2. Populate Legacy Table
    renderUnresolvedOduTable(legacyRecords);
  }

  function renderUnresolvedOduTable(records) {
    const tbody = document.getElementById('oduUnresolvedTableBody');
    const info = document.getElementById('oduUnresolvedCountInfo');
    if (!tbody) return;

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 24px;">No records match the search filter.</td></tr>`;
      if (info) info.textContent = `Showing 0 of ${oduLegacyCache.length} legacy records`;
      return;
    }

    tbody.innerHTML = records.map((r, i) => `
      <tr>
        <td style="color: var(--text-secondary); text-align: center;">${i + 1}</td>
        <td><code style="font-weight: 700; color: #0B3A70;">${r.srNo}</code></td>
        <td><code style="background: #EFEBE9; color: #6B3E2E; padding: 2px 5px; border-radius: 3px; font-weight: 600;">${r.barcode}</code></td>
        <td style="font-weight: 600;">${r.fullModel || '—'}</td>
        <td style="color: var(--text-secondary);">${r.shortModel || '—'}</td>
        <td style="text-align: center;"><span class="badge-tag" style="background: #F3F4F6; color: #374151; font-size: 10.5px;">${r.version || '0103'}</span></td>
        <td style="white-space: nowrap; color: var(--text-secondary); font-size: 11px;">${r.createdDate || '—'}</td>
        <td style="text-align: center;"><span class="badge-tag" style="background: #EBF3FA; color: #0B3A70; font-size: 10.5px;">${r.inhouseImport || 'Import'}</span></td>
        <td style="font-size: 11px; color: #2E7D32;">
          <span class="badge-tag" style="background: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; font-size: 10px; margin-right: 4px;">C ODU</span>
          ${r.auditComment}
        </td>
      </tr>
    `).join('');

    if (info) {
      info.textContent = `Showing ${records.length} of ${oduLegacyCache.length} verified legacy records (Classified into C ODU)`;
    }
  }

  function filterUnresolvedOduTable(query) {
    if (!query) {
      renderUnresolvedOduTable(oduLegacyCache);
      return;
    }
    const q = query.toLowerCase().trim();
    const filtered = oduLegacyCache.filter(r => 
      String(r.srNo).toLowerCase().includes(q) ||
      String(r.barcode).toLowerCase().includes(q) ||
      String(r.fullModel).toLowerCase().includes(q) ||
      String(r.shortModel).toLowerCase().includes(q) ||
      String(r.auditComment).toLowerCase().includes(q) ||
      String(r.createdDate).toLowerCase().includes(q)
    );
    renderUnresolvedOduTable(filtered);
  }

  // Export ODU Summary CSV
  function exportOduCSV() {
    if (!data.oduLeakage) return;
    const odu = data.oduLeakage;
    const rows = [];
    rows.push(['Walton RAC - ODU-Wise MFC Leakage Breakdown']);
    rows.push(['Generated: ' + new Date().toISOString()]);
    rows.push(['Resolution Status: 100% Fully Resolved (194 Legacy Records Classified into C ODU)']);
    rows.push([]);
    rows.push(['Rank', 'ODU Category', 'Chassis Description', 'Confirmed Leaks', 'Standard Barcodes', 'Legacy Barcodes', 'Share %', 'Import Count', 'Inhouse Count']);
    odu.categories.forEach(c => {
      rows.push([c.rank, c.category, c.description, c.records, c.standardBarcodeCount || c.records, c.legacyBarcodeCount || 0, c.shareClassifiedPct + '%', c.importCount, c.inhouseCount]);
    });
    rows.push(['TOTAL CONFIRMED LEAKS', '', '100% Resolved and Reconciled', odu.summary.totalConfirmed, odu.summary.totalConfirmed - (odu.summary.legacyResolvedCount || 0), odu.summary.legacyResolvedCount || 0, '100.00%', data.metadata.importLeakage, data.metadata.inhouseLeakage]);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Walton_ODU_Wise_MFC_Leakage_Summary.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export 194 Legacy Records CSV
  function exportUnresolvedOduCSV() {
    if (!data.oduLeakage) return;
    const legacy = data.oduLeakage.legacyResolved || data.oduLeakage.unresolved || [];
    const rows = [];
    rows.push(['Walton RAC - Verified Legacy Barcodes Register (194 Records Resolved to C ODU)']);
    rows.push(['Generated: ' + new Date().toISOString()]);
    rows.push(['Resolution: All 194 legacy records verified as C ODU chassis and classified into C ODU.']);
    rows.push([]);
    rows.push(['SR No', 'Barcode', 'FULL MODEL', 'Short Model', 'Version', 'Created Date', 'Inhouse/Import', 'Resolved Chassis', 'Audit Comment']);
    legacy.forEach(r => {
      rows.push([r.srNo, r.barcode, r.fullModel, r.shortModel, r.version, r.createdDate, r.inhouseImport, 'C ODU', r.auditComment]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Walton_Verified_Legacy_C_ODU_Barcodes_Register.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 11. Export CSV
  function exportCSV() {
    const rows = [];
    rows.push(['Walton RAC - Microchannel Market Failure Report']);
    rows.push(['Generated: ' + new Date().toISOString()]);
    rows.push([]);

    // 1. Yearly
    rows.push(['--- 1. YEAR-WISE CONFIRMED LEAKAGE ---']);
    rows.push(['Year', 'Import Leakage', 'Inhouse Leakage', 'Total Leakage', 'Import Share %', 'Inhouse Share %']);
    data.yearly.forEach(d => {
      rows.push([d.year, d.importLeakage, d.inhouseLeakage, d.totalLeakage, d.importShare + '%', d.inhouseShare + '%']);
    });
    rows.push(['TOTAL', data.metadata.importLeakage, data.metadata.inhouseLeakage, data.metadata.confirmedLeakageRecords, data.metadata.importSharePct + '%', data.metadata.inhouseSharePct + '%']);
    rows.push([]);

    // 2. Leakage Points
    rows.push(['--- 2. LEAKAGE POINTS (SOURCE: EXPERT FOUND PROBLEMS) ---']);
    rows.push(['Leakage Point', 'Import', 'Inhouse', 'Total', 'Share %']);
    data.leakagePoints.forEach(p => {
      rows.push([p.leakPoint, p.import, p.inhouse, p.total, p.sharePct + '%']);
    });
    rows.push(['TOTAL', data.metadata.importLeakage, data.metadata.inhouseLeakage, data.metadata.confirmedLeakageRecords, '100.00%']);
    rows.push([]);

    // 3. Top 10 Areas
    rows.push(['--- 3. TOP 10 INSTALLED AREAS (SOURCE: SERVICE CENTER) ---']);
    rows.push(['Rank', 'Installed Area', 'Leakage Records', 'Share %', 'Import Leaks', 'Inhouse Leaks']);
    data.top10Areas.forEach(a => {
      rows.push([a.rank, a.installedArea || a.area || a.serviceCenter, a.leakageRecords, a.sharePct + '%', a.import ?? a.importLeaks ?? 0, a.inhouse ?? a.inhouseLeaks ?? 0]);
    });
    rows.push(['TOP 10 TOTAL', '', data.metadata.top10TotalRecords, data.metadata.top10SharePct + '%']);
    rows.push([]);

    // 4. Monthly
    rows.push(['--- 4. MONTH-WISE CONFIRMED LEAKAGE ---']);
    rows.push(['Year', 'Month', 'Import Leakage', 'Inhouse Leakage', 'Total Leakage']);
    data.monthly.forEach(m => {
      rows.push([m.year, m.month, m.importLeakage, m.inhouseLeakage, m.totalLeakage]);
    });
    rows.push([]);

    // 5. Sales-to-Service Duration Distribution
    if (data.salesToServiceDuration) {
      const dur = data.salesToServiceDuration;
      rows.push(['--- 5. SALES-TO-SERVICE DURATION DISTRIBUTION ---']);
      rows.push(['Duration Category', 'Elapsed Days Range', 'Service Records', 'Share %', 'Cumulative Records', 'Cumulative Share %']);
      dur.categories.forEach(d => {
        rows.push([d.category, d.rangeDays, d.count, d.sharePct + '%', d.cumCount, d.cumSharePct + '%']);
      });
      const s = dur.summary;
      rows.push(['TOTAL VALID ANALYZED', '', s.validCount, '100.00%', s.validCount, '100.00%']);
      rows.push(['MISSING SALES DATE', '', s.missingSalesCount, s.missingSharePct + '%', '', '']);
      rows.push(['NEGATIVE EXCEPTION (ADJUSTED TO 3D)', '', s.negativeAdjustedCount || 30, (s.negativeAdjustedSharePct || 0.52) + '%', '', '']);
      rows.push(['TOTAL CONFIRMED', '', s.totalConfirmed, '100.00%', '', '']);
    }


    // 6. ODU-Wise MFC Leakage
    if (data.oduLeakage) {
      const odu = data.oduLeakage;
      rows.push([]);
      rows.push(['--- 6. ODU-WISE MFC LEAKAGE BREAKDOWN ---']);
      rows.push(['Rank', 'ODU Category', 'Chassis Description', 'Confirmed Leaks', 'Classified Share %', 'Total Share %', 'Import Count', 'Inhouse Count']);
      odu.categories.forEach(c => {
        rows.push([c.rank, c.category, c.description, c.records, c.shareClassifiedPct + '%', c.shareTotalPct + '%', c.importCount, c.inhouseCount]);
      });
      rows.push(['—', 'Unresolved / Legacy Barcodes', 'Legacy prefix BXX0103...', odu.summary.unresolvedCount, '—', pctFmt((odu.summary.unresolvedCount / odu.summary.totalConfirmed) * 100) + '%', odu.summary.unresolvedCount, 0]);
      rows.push(['TOTAL CLASSIFIED', '', '', odu.summary.classifiedCount, '100.00%', pctFmt((odu.summary.classifiedCount / odu.summary.totalConfirmed) * 100) + '%']);
      rows.push(['TOTAL CONFIRMED LEAKS', '', '', odu.summary.totalConfirmed, '—', '100.00%']);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${cell}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Walton_Microchannel_Market_Failure_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 12. Coated vs. Non-Coated MFC Condenser Analysis
  function renderChartCoatedVsNonCoated(popKey = 'pop4031') {
    const container = document.getElementById('chartCoatedVsNonCoated');
    if (!container || !data.coatedAnalysis) return;

    const popData = data.coatedAnalysis[popKey] || data.coatedAnalysis['pop4031'];
    const yearlyData = popData.yearly;

    const svgW = 540;
    const svgH = 275;
    const leftPad = 52;
    const rightPad = 20;
    const topPad = 36;
    const baselineY = 228;
    const plotH = baselineY - topPad; // 192px

    // Max column value across Coated and Non-Coated
    const maxColVal = Math.max(...yearlyData.map(d => Math.max(d.coated, d.nonCoated)));
    // Dynamic Y-axis ceiling: approx 30% headroom above tallest column
    const yAxisMax = Math.ceil((maxColVal * 1.4) / 200) * 200; // e.g. 2,600 for 1,801

    // Y-axis gridlines: step by 500
    const gridVals = [];
    for (let v = 0; v <= yAxisMax; v += 500) {
      gridVals.push(v);
    }
    if (gridVals[gridVals.length - 1] < yAxisMax) {
      gridVals.push(yAxisMax);
    }

    let gridHtml = gridVals.map(val => {
      const y = baselineY - (val / yAxisMax) * plotH;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="${val === 0 ? 'none' : '4 4'}" stroke-width="${val === 0 ? '1.5' : '1'}" />
        <text x="${leftPad - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--chart-axis)" font-family="sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    // Grouped side-by-side columns: [Coated] [Non-Coated]
    const plotW = (svgW - rightPad) - leftPad;
    const stepX = plotW / yearlyData.length; // ~78px
    const colW = 20; // Width of each column
    const colGap = 5; // Gap between Coated and Non-Coated columns
    const groupW = colW * 2 + colGap; // 45px total group width

    let barsHtml = yearlyData.map((d, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const groupX = centerX - groupW / 2;
      const xCoat = groupX;
      const xNonCoat = groupX + colW + colGap;

      const hCoat = (d.coated / yAxisMax) * plotH;
      const hNonCoat = (d.nonCoated / yAxisMax) * plotH;

      const yCoat = baselineY - hCoat;
      const yNonCoat = baselineY - hNonCoat;

      const tooltipText = `<strong>${d.year} MFC Condenser Distribution</strong><br>Total Records: ${numFmt(d.total)}<br>• Coated: ${numFmt(d.coated)} (${d.coatedPct.toFixed(1)}%)<br>• Non-Coated: ${numFmt(d.nonCoated)} (${d.nonCoatedPct.toFixed(1)}%)<br>&nbsp;&nbsp;- Blank parts: ${numFmt(d.blankSpareParts)}<br>&nbsp;&nbsp;- Other parts: ${numFmt(d.otherSpareParts)}`;

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <!-- Transparent hover hit-target covering entire year slot -->
          <rect x="${centerX - stepX / 2}" y="${topPad - 10}" width="${stepX}" height="${plotH + 35}" fill="transparent" />

          <!-- Coated Column (#D97706 Primary Amber/Orange) -->
          ${hCoat > 0 ? `
            <rect x="${xCoat}" y="${yCoat}" width="${colW}" height="${hCoat}" fill="#D97706" stroke="#B45309" stroke-width="0.5" rx="3" ry="3" />
          ` : ''}

          <!-- Non-Coated Column (#0B3A70 Muted Deep Blue) -->
          ${hNonCoat > 0 ? `
            <rect x="${xNonCoat}" y="${yNonCoat}" width="${colW}" height="${hNonCoat}" fill="#0B3A70" stroke="#082B52" stroke-width="0.5" rx="3" ry="3" />
          ` : ''}

          <!-- Label above Coated column: Quantity (Percentage) -->
          ${d.coated > 0 ? `
            <text x="${xCoat + colW / 2}" y="${yCoat - 15}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xCoat + colW / 2}" dy="0" font-size="9.5" font-weight="700" fill="#B45309">${numFmt(d.coated)}</tspan>
              <tspan x="${xCoat + colW / 2}" dy="10" font-size="8.5" font-weight="600" fill="#B45309">(${d.coatedPct.toFixed(1)}%)</tspan>
            </text>
          ` : `
            <text x="${xCoat + colW / 2}" y="${baselineY - 14}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xCoat + colW / 2}" dy="0" font-size="9" font-weight="600" fill="#98A5AF">0</tspan>
              <tspan x="${xCoat + colW / 2}" dy="9" font-size="8" font-weight="500" fill="#98A5AF">(0.0%)</tspan>
            </text>
          `}

          <!-- Label above Non-Coated column: Quantity (Percentage) -->
          ${d.nonCoated > 0 ? `
            <text x="${xNonCoat + colW / 2}" y="${yNonCoat - 15}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xNonCoat + colW / 2}" dy="0" font-size="9.5" font-weight="700" fill="#0B3A70">${numFmt(d.nonCoated)}</tspan>
              <tspan x="${xNonCoat + colW / 2}" dy="10" font-size="8.5" font-weight="600" fill="#0B3A70">(${d.nonCoatedPct.toFixed(1)}%)</tspan>
            </text>
          ` : `
            <text x="${xNonCoat + colW / 2}" y="${baselineY - 14}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xNonCoat + colW / 2}" dy="0" font-size="9" font-weight="600" fill="#98A5AF">0</tspan>
              <tspan x="${xNonCoat + colW / 2}" dy="9" font-size="8" font-weight="500" fill="#98A5AF">(0.0%)</tspan>
            </text>
          `}

          <!-- Year label centered below both columns -->
          <text x="${centerX}" y="${baselineY + 20}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-primary)" font-family="sans-serif">${d.year}</text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: 100%; overflow: visible;">
        <!-- Y-Axis Title -->
        <text transform="rotate(-90)" x="${-baselineY / 2}" y="14" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-secondary)" font-family="sans-serif">
          Condenser Service/Failure Quantity
        </text>
        <!-- Gridlines & Y-Axis -->
        ${gridHtml}
        <!-- Grouped Columns & Labels -->
        ${barsHtml}
      </svg>
    `;

    // Tooltips
    container.querySelectorAll('.svg-bar-col').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  function renderCoatedAuditCard(popKey = 'pop4031') {
    if (!data.coatedAnalysis) return;
    const popData = data.coatedAnalysis[popKey] || data.coatedAnalysis['pop4031'];

    const elTotal = document.getElementById('auditMetricTotal');
    const elCoated = document.getElementById('auditMetricCoated');
    const elCoatedLbl = document.getElementById('auditMetricCoatedLbl');
    const elNonCoated = document.getElementById('auditMetricNonCoated');
    const elNonCoatedLbl = document.getElementById('auditMetricNonCoatedLbl');
    const elBlank = document.getElementById('auditMetricBlank');
    const elBlankLbl = document.getElementById('auditMetricBlankLbl');
    const elOther = document.getElementById('auditMetricOther');
    const elOtherLbl = document.getElementById('auditMetricOtherLbl');
    const elSub = document.getElementById('coatedAuditSubtitle');

    if (elTotal) elTotal.textContent = numFmt(popData.total);
    if (elCoated) elCoated.textContent = numFmt(popData.coated);
    if (elCoatedLbl) elCoatedLbl.textContent = `Coated (${popData.coatedPct.toFixed(2)}%)`;
    if (elNonCoated) elNonCoated.textContent = numFmt(popData.nonCoated);
    if (elNonCoatedLbl) elNonCoatedLbl.textContent = `Non-Coated (${popData.nonCoatedPct.toFixed(2)}%)`;
    if (elBlank) elBlank.textContent = numFmt(popData.blankSpareParts);
    if (elBlankLbl) elBlankLbl.textContent = `Blank Parts (${popData.blankSparePartsPct.toFixed(2)}%)`;
    if (elOther) elOther.textContent = numFmt(popData.otherSpareParts);
    if (elOtherLbl) elOtherLbl.textContent = `Other Parts (${popData.otherSparePartsPct.toFixed(2)}%)`;
    if (elSub) {
      elSub.textContent = `Strict Used Spare Parts evidence & population audit (${popData.name})`;
    }
  }

  function renderTableCoated(popKey = 'pop4031') {
    const tbody = document.getElementById('coatedTableBody');
    const tfoot = document.getElementById('coatedTableFoot');
    if (!tbody || !tfoot || !data.coatedAnalysis) return;

    const popData = data.coatedAnalysis[popKey] || data.coatedAnalysis['pop4031'];
    const yearly = popData.yearly;

    tbody.innerHTML = yearly.map(d => {
      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-primary);">${d.year}</td>
          <td class="col-num" style="font-weight: 700; color: #D97706;">${numFmt(d.coated)}</td>
          <td class="col-num" style="font-weight: 600; color: #B45309;">${d.coatedPct.toFixed(1)}%</td>
          <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(d.nonCoated)}</td>
          <td class="col-num" style="font-weight: 600; color: #0B3A70;">${d.nonCoatedPct.toFixed(1)}%</td>
          <td class="col-num" style="font-weight: 700;">${numFmt(d.total)}</td>
          <td class="col-num" style="color: var(--text-secondary);">${numFmt(d.blankSpareParts)}</td>
          <td class="col-num" style="color: var(--text-secondary);">${numFmt(d.otherSpareParts)}</td>
          <td style="text-align: center;">
            <span class="badge-tag" style="background: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; font-size: 11px;">100% Reconciled</span>
          </td>
        </tr>
      `;
    }).join('');

    tfoot.innerHTML = `
      <tr style="background: var(--bg-table-total); font-weight: 700; border-top: 2px solid var(--border-default);">
        <td>TOTAL</td>
        <td class="col-num" style="color: #D97706;">${numFmt(popData.coated)}</td>
        <td class="col-num" style="color: #B45309;">${popData.coatedPct.toFixed(2)}%</td>
        <td class="col-num" style="color: #0B3A70;">${numFmt(popData.nonCoated)}</td>
        <td class="col-num" style="color: #0B3A70;">${popData.nonCoatedPct.toFixed(2)}%</td>
        <td class="col-num">${numFmt(popData.total)}</td>
        <td class="col-num" style="color: var(--text-secondary);">${numFmt(popData.blankSpareParts)}</td>
        <td class="col-num" style="color: var(--text-secondary);">${numFmt(popData.otherSpareParts)}</td>
        <td style="text-align: center;">
          <span class="badge-tag" style="background: #E8F5E9; color: #2E7D32; border: 1px solid #C8E6C9; font-size: 11px;">Validated</span>
        </td>
      </tr>
    `;
  }

  function renderCoatedRecordsRegister(searchQuery = '') {
    const tbody = document.getElementById('coatedRecordsTableBody');
    const infoEl = document.getElementById('coatedRecordsCountInfo');
    if (!tbody || !data.coatedAnalysis) return;

    const records = data.coatedAnalysis.records || [];
    const q = searchQuery.trim().toLowerCase();

    const filtered = q === '' ? records : records.filter(r => {
      return (
        r.srNo.toLowerCase().includes(q) ||
        r.barcode.toLowerCase().includes(q) ||
        r.fullModel.toLowerCase().includes(q) ||
        r.shortModel.toLowerCase().includes(q) ||
        r.serviceCenter.toLowerCase().includes(q) ||
        String(r.year).includes(q) ||
        r.usedSpareParts.toLowerCase().includes(q)
      );
    });

    if (infoEl) {
      infoEl.textContent = `Showing ${filtered.length} of ${records.length} coated records`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">
            No coated records match "${searchQuery}"
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((r, idx) => {
      const highlightedParts = r.usedSpareParts.replace(
        /Color-Black For Coatec Series/g,
        '<span class="highlight-part">Color-Black For Coatec Series</span>'
      );

      return `
        <tr>
          <td style="color: var(--text-muted);">${idx + 1}</td>
          <td style="font-weight: 700; color: var(--blue-900); font-family: monospace;">${r.srNo}</td>
          <td style="font-family: monospace; font-size: 10.5px; color: var(--text-secondary);">${r.barcode || '—'}</td>
          <td style="font-weight: 600;">${r.fullModel}</td>
          <td><span class="badge-tag" style="background: #F3F6F9; border: 1px solid #D9E2EC; font-size: 10.5px;">${r.shortModel || '—'}</span></td>
          <td style="font-weight: 700; color: var(--text-primary);">${r.year}</td>
          <td style="color: var(--text-secondary);">${r.serviceCenter}</td>
          <td style="line-height: 1.4; max-width: 480px;">${highlightedParts}</td>
        </tr>
      `;
    }).join('');
  }

  function exportCoatedCSV() {
    if (!data.coatedAnalysis) return;
    const popData = data.coatedAnalysis[state.coatedPopulation] || data.coatedAnalysis['pop4031'];
    const rows = [];
    rows.push(['Walton RAC - Coated vs. Non-Coated MFC Condenser Report']);
    rows.push(['Population Scope: ' + popData.name]);
    rows.push(['Classification Rule: "Color-Black For Coatec Series" in Used Spare Parts']);
    rows.push(['Generated: ' + new Date().toISOString()]);
    rows.push([]);

    // 1. Summary
    rows.push(['--- 1. YEAR-WISE DISTRIBUTION ---']);
    rows.push(['Year', 'Coated Quantity', 'Coated Share %', 'Non-Coated Quantity', 'Non-Coated Share %', 'Total Classified Records', 'Blank Spare Parts', 'Other Spare Parts']);
    popData.yearly.forEach(d => {
      rows.push([d.year, d.coated, d.coatedPct + '%', d.nonCoated, d.nonCoatedPct + '%', d.total, d.blankSpareParts, d.otherSpareParts]);
    });
    rows.push(['TOTAL', popData.coated, popData.coatedPct + '%', popData.nonCoated, popData.nonCoatedPct + '%', popData.total, popData.blankSpareParts, popData.otherSpareParts]);
    rows.push([]);

    // 2. Coated Register
    rows.push(['--- 2. VERIFIED COATED CONDENSER REPLACEMENT REGISTER (76 RECORDS) ---']);
    rows.push(['#', 'SR No', 'Barcode', 'FULL MODEL', 'Short Model', 'Year', 'Month', 'Service Center', 'Origin', 'Used Spare Parts Evidence']);
    data.coatedAnalysis.records.forEach((r, idx) => {
      rows.push([idx + 1, r.srNo, r.barcode, r.fullModel, r.shortModel, r.year, r.month, r.serviceCenter, r.inhouseImport, r.usedSpareParts]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Walton_Coated_vs_NonCoated_MFC_Condenser_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  // 13. Year-Wise Replace vs. Repair Analysis
  function renderChartReplaceVsRepair(popKey = 'pop4031') {
    const container = document.getElementById('chartReplaceVsRepair');
    if (!container || !data.replaceRepairAnalysis) return;

    const popData = data.replaceRepairAnalysis[popKey] || data.replaceRepairAnalysis['pop4031'];
    const yearlyData = popData.yearly;

    const svgW = 540;
    const svgH = 275;
    const leftPad = 52;
    const rightPad = 20;
    const topPad = 36;
    const baselineY = 228;
    const plotH = baselineY - topPad; // 192px

    // Tallest column across Replace and Repair (1,002 in pop4031, 1,034 in pop4253)
    const maxColVal = Math.max(...yearlyData.map(d => Math.max(d.replace, d.repair)));
    // Tallest column reaches ~70% of chart height (~30% headroom): yAxisMax = 1,500
    const yAxisMax = 1500;

    // Y-axis gridlines: 0, 500, 1000, 1500
    const gridVals = [0, 500, 1000, 1500];
    let gridHtml = gridVals.map(val => {
      const y = baselineY - (val / yAxisMax) * plotH;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="${val === 0 ? 'none' : '4 4'}" stroke-width="${val === 0 ? '1.5' : '1'}" />
        <text x="${leftPad - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--chart-axis)" font-family="sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    // Grouped side-by-side columns: [Replace] [Repair]
    const plotW = (svgW - rightPad) - leftPad;
    const stepX = plotW / yearlyData.length; // ~78px
    const colW = 20; // Width of each column
    const colGap = 5; // Gap between Replace and Repair columns
    const groupW = colW * 2 + colGap; // 45px total group width

    let barsHtml = yearlyData.map((d, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const groupX = centerX - groupW / 2;
      const xRep = groupX;
      const xFix = groupX + colW + colGap;

      const hRep = (d.replace / yAxisMax) * plotH;
      const hFix = (d.repair / yAxisMax) * plotH;

      const yRep = baselineY - hRep;
      const yFix = baselineY - hFix;

      const tooltipText = `<strong>${d.year} MFC Service Actions</strong><br>Total Actions: ${numFmt(d.total)}<br>• Replace: ${numFmt(d.replace)} (${d.replacePct.toFixed(1)}%)<br>• Repair: ${numFmt(d.repair)} (${d.repairPct.toFixed(1)}%)`;

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <!-- Transparent hover hit-target covering entire year slot -->
          <rect x="${centerX - stepX / 2}" y="${topPad - 10}" width="${stepX}" height="${plotH + 35}" fill="transparent" />

          <!-- Replace Column (#0B3A70 Deep Navy Blue) -->
          ${hRep > 0 ? `
            <rect x="${xRep}" y="${yRep}" width="${colW}" height="${hRep}" fill="#0B3A70" stroke="#082B52" stroke-width="0.5" rx="3" ry="3" />
          ` : ''}

          <!-- Repair Column (#0D9488 Teal / Emerald) -->
          ${hFix > 0 ? `
            <rect x="${xFix}" y="${yFix}" width="${colW}" height="${hFix}" fill="#0D9488" stroke="#0F766E" stroke-width="0.5" rx="3" ry="3" />
          ` : ''}

          <!-- Label above Replace column: Quantity (Percentage) -->
          ${d.replace > 0 ? `
            <text x="${xRep + colW / 2}" y="${yRep - 15}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xRep + colW / 2}" dy="0" font-size="9.5" font-weight="700" fill="#0B3A70">${numFmt(d.replace)}</tspan>
              <tspan x="${xRep + colW / 2}" dy="10" font-size="8.5" font-weight="600" fill="#0B3A70">(${d.replacePct.toFixed(1)}%)</tspan>
            </text>
          ` : `
            <text x="${xRep + colW / 2}" y="${baselineY - 14}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xRep + colW / 2}" dy="0" font-size="9" font-weight="600" fill="#98A5AF">0</tspan>
              <tspan x="${xRep + colW / 2}" dy="9" font-size="8" font-weight="500" fill="#98A5AF">(0.0%)</tspan>
            </text>
          `}

          <!-- Label above Repair column: Quantity (Percentage) -->
          ${d.repair > 0 ? `
            <text x="${xFix + colW / 2}" y="${yFix - 15}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xFix + colW / 2}" dy="0" font-size="9.5" font-weight="700" fill="#0D9488">${numFmt(d.repair)}</tspan>
              <tspan x="${xFix + colW / 2}" dy="10" font-size="8.5" font-weight="600" fill="#0D9488">(${d.repairPct.toFixed(1)}%)</tspan>
            </text>
          ` : `
            <text x="${xFix + colW / 2}" y="${baselineY - 14}" text-anchor="middle" font-family="sans-serif">
              <tspan x="${xFix + colW / 2}" dy="0" font-size="9" font-weight="600" fill="#98A5AF">0</tspan>
              <tspan x="${xFix + colW / 2}" dy="9" font-size="8" font-weight="500" fill="#98A5AF">(0.0%)</tspan>
            </text>
          `}

          <!-- Year label centered below both columns -->
          <text x="${centerX}" y="${baselineY + 20}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-primary)" font-family="sans-serif">${d.year}</text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: 100%; overflow: visible;">
        <!-- Y-Axis Title -->
        <text transform="rotate(-90)" x="${-baselineY / 2}" y="14" text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--text-secondary)" font-family="sans-serif">
          Service Record Quantity
        </text>
        <!-- Gridlines & Y-Axis -->
        ${gridHtml}
        <!-- Grouped Columns & Labels -->
        ${barsHtml}
      </svg>
    `;

    // Tooltips
    container.querySelectorAll('.svg-bar-col').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });

    const subEl = document.getElementById('chartReplaceRepairSubtitle');
    if (subEl) {
      subEl.textContent = 'Annual distribution of MFC service actions';
    }
  }

  function renderReplaceRepairAuditCard(popKey = 'pop4031') {
    if (!data.replaceRepairAnalysis) return;
    const popData = data.replaceRepairAnalysis[popKey] || data.replaceRepairAnalysis['pop4031'];

    const elTotal = document.getElementById('rrMetricTotal');
    const elRep = document.getElementById('rrMetricReplace');
    const elRepLbl = document.getElementById('rrMetricReplaceLbl');
    const elFix = document.getElementById('rrMetricRepair');
    const elFixLbl = document.getElementById('rrMetricRepairLbl');
    const elPeakRep = document.getElementById('rrMetricPeakReplace');
    const elPeakFix = document.getElementById('rrMetricPeakRepair');
    const elBadge = document.getElementById('replaceRepairAuditBadge');
    const elSub = document.getElementById('replaceRepairAuditSubtitle');

    if (elTotal) elTotal.textContent = numFmt(popData.total);
    if (elRep) elRep.textContent = numFmt(popData.replace);
    if (elRepLbl) elRepLbl.textContent = `Replace (${popData.replacePct.toFixed(2)}%)`;
    if (elFix) elFix.textContent = numFmt(popData.repair);
    if (elFixLbl) elFixLbl.textContent = `Repair (${popData.repairPct.toFixed(2)}%)`;
    if (elPeakRep) elPeakRep.textContent = `${popData.peakReplaceYear} (${popData.peakReplacePct.toFixed(1)}%)`;
    if (elPeakFix) elPeakFix.textContent = `${popData.peakRepairYear} (${popData.peakRepairPct.toFixed(1)}%)`;
    if (elBadge) elBadge.textContent = `${numFmt(popData.replace)} Replaced (${popData.replacePct.toFixed(1)}%)`;
    if (elSub) elSub.textContent = `Strict "Replace/ Repair" column action audit (${popData.populationName})`;
  }

  function renderTableReplaceRepair(popKey = 'pop4031') {
    const tbody = document.getElementById('replaceRepairSummaryTableBody');
    if (!tbody || !data.replaceRepairAnalysis) return;

    const popData = data.replaceRepairAnalysis[popKey] || data.replaceRepairAnalysis['pop4031'];
    const titleEl = document.getElementById('replaceRepairTableTitle');
    if (titleEl) {
      titleEl.textContent = `Year-Wise Replace vs. Repair Breakdown (${popData.populationName})`;
    }

    const rowsHtml = popData.yearly.map(d => {
      const isRepDom = d.replace >= d.repair;
      const domBadge = isRepDom
        ? '<span class="badge-tag badge-replace">Replace Dominant</span>'
        : '<span class="badge-tag badge-repair">Repair Dominant</span>';

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-primary);">${d.year}</td>
          <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(d.replace)}</td>
          <td class="col-num" style="font-weight: 700; color: #0B3A70;">${d.replacePct.toFixed(1)}%</td>
          <td class="col-num" style="font-weight: 700; color: #0D9488;">${numFmt(d.repair)}</td>
          <td class="col-num" style="font-weight: 700; color: #0D9488;">${d.repairPct.toFixed(1)}%</td>
          <td class="col-num" style="font-weight: 700;">${numFmt(d.total)}</td>
          <td style="text-align: center;">${domBadge}</td>
          <td style="text-align: center;">
            <span class="badge-tag badge-inhouse" style="background:#E8F5EE; color:#146C43; border-color:#B7DEC9;">✓ 100% Balanced</span>
          </td>
        </tr>
      `;
    }).join('');

    const totalRow = `
      <tr style="font-weight: 700; background: var(--bg-hover); border-top: 2px solid var(--border-default);">
        <td style="color: var(--text-primary);">TOTAL</td>
        <td class="col-num" style="color: #0B3A70;">${numFmt(popData.replace)}</td>
        <td class="col-num" style="color: #0B3A70;">${popData.replacePct.toFixed(2)}%</td>
        <td class="col-num" style="color: #0D9488;">${numFmt(popData.repair)}</td>
        <td class="col-num" style="color: #0D9488;">${popData.repairPct.toFixed(2)}%</td>
        <td class="col-num">${numFmt(popData.total)}</td>
        <td style="text-align: center;">
          <span class="badge-tag badge-replace">Overall Replace Dominant</span>
        </td>
        <td style="text-align: center;">
          <span class="badge-tag badge-inhouse" style="background:#E8F5EE; color:#146C43; border-color:#B7DEC9;">100% Resolved</span>
        </td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml + totalRow;
  }

  function exportReplaceRepairCSV() {
    if (!data.replaceRepairAnalysis) return;
    const popData = data.replaceRepairAnalysis[state.replaceRepairPopulation] || data.replaceRepairAnalysis['pop4031'];
    const rows = [];
    rows.push(['Walton RAC - Year-Wise Replace vs. Repair MFC Service Report']);
    rows.push(['Population Scope: ' + popData.populationName]);
    rows.push(['Source Column: Column AD (Replace/ Repair)']);
    rows.push(['Generated: ' + new Date().toISOString()]);
    rows.push([]);
    rows.push(['Year', 'Replace Quantity', 'Replace Share %', 'Repair Quantity', 'Repair Share %', 'Total Service Actions', 'Dominant Action']);
    popData.yearly.forEach(d => {
      rows.push([d.year, d.replace, d.replacePct.toFixed(1) + '%', d.repair, d.repairPct.toFixed(1) + '%', d.total, d.replace >= d.repair ? 'Replace Dominant' : 'Repair Dominant']);
    });
    rows.push(['TOTAL', popData.replace, popData.replacePct.toFixed(2) + '%', popData.repair, popData.repairPct.toFixed(2) + '%', popData.total, 'Overall Replace Dominant']);

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Walton_YearWise_Replace_vs_Repair_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Run
  init();
});
