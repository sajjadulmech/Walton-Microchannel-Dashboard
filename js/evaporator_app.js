/**
 * Walton RAC Process Development - Evaporator Market Failure Engine
 * Dedicated Standalone Dashboard for Indoor Evaporator Leakage Intelligence (2021 - August 2026)
 * Pure Vanilla JavaScript (ES6+), Zero External Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  let data = typeof EVAPORATOR_DATA !== 'undefined' ? EVAPORATOR_DATA : null;
  const DEFAULT_DATA = EVAPORATOR_DATA;
  if (!data) {
    console.error('EVAPORATOR_DATA not found!');
    return;
  }

  // Application State
  const state = {
    globalYear: 'all',
    globalMonth: 'all',
    activeTab: 'yearlyTab',
    monthYearFilter: 'all',
    monthSearchQuery: '',
    chartMonthYear: 'all'
  };

  // Formatters
  const numFmt = (num) => Number(num || 0).toLocaleString('en-US');
  const pctFmt = (num) => Number(num || 0).toFixed(2) + '%';

  function getNiceMax(val) {
    if (val <= 0) return 100;
    if (val <= 10) return 10;
    if (val <= 25) return 30;
    if (val <= 50) return 60;
    if (val <= 100) return 120;
    if (val <= 250) return 300;
    if (val <= 500) return 600;
    if (val <= 1000) return 1200;
    if (val <= 2000) return 2500;
    if (val <= 3000) return 3500;
    if (val <= 5000) return 6000;
    if (val <= 10000) return 10000;
    const mag = Math.pow(10, Math.floor(Math.log10(val)));
    const norm = val / mag;
    let step;
    if (norm <= 1.5) step = 0.25 * mag;
    else if (norm <= 3) step = 0.5 * mag;
    else if (norm <= 7) step = 1 * mag;
    else step = 2 * mag;
    return Math.ceil((val * 1.25) / step) * step;
  }

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
    tooltipEl.style.left = `${Math.min(x, window.innerWidth - 260)}px`;
    tooltipEl.style.top = `${Math.max(10, y)}px`;
  }

  function hideTooltip() {
    tooltipEl.classList.remove('visible');
    tooltipEl.style.opacity = '0';
  }


  function emptyStateHtml(msg = 'No failure records match the selected filter criteria.') {
    return `
      <div class="empty-state-notice">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="10" r="8"/><path d="M12 18v.01"/><path d="M12 14V8"/></svg>
        <p>${msg}</p>
        <small>Adjust or reset the Year/Month filter above to view historical data.</small>
      </div>
    `;
  }

  // =========================================================
  // CENTRALIZED GLOBAL FILTER ENGINE & RECALCULATION SYSTEM
  // =========================================================
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const availableYears = [2021, 2022, 2023, 2024, 2025, 2026];

  function getFilteredEvapData(records, selectedYear, selectedMonth) {
    if (!records || !Array.isArray(records)) return [];
    return records.filter(r => {
      const yearMatch = (selectedYear === 'all' || r.y === Number(selectedYear));
      const monthMatch = (selectedMonth === 'all' || r.m === Number(selectedMonth));
      return yearMatch && monthMatch;
    });
  }

  function recalculateEvaporatorData(filteredRecords, selectedYear, selectedMonth) {
    const total = filteredRecords.length;
    if (total === 0) {
      return {
        metadata: {
          title: 'Walton RAC Evaporator Market Failure',
          dataSource: 'Evaporator Leak Data (Filtered)',
          totalRecords: 0,
          uniqueUnits: 0,
          repeatEvents: 0,
          repeatRatePct: 0,
          inverterRecords: 0,
          inverterSharePct: 0,
          nonInverterRecords: 0,
          nonInverterSharePct: 0,
          topLeakPoint: '—',
          topLeakPointRecords: 0,
          topLeakPointSharePct: 0,
          topArea: '—',
          topAreaRecords: 0,
          topAreaSharePct: 0,
          top10TotalRecords: 0,
          top10SharePct: 0,
          underWarrantyRecords: 0,
          underWarrantySharePct: 0,
          meanOperatingDurationDays: 0,
          medianOperatingDurationDays: 0,
          peakDurationYear: '—'
        },
        yearly: [],
        monthly: [],
        leakagePoints: [],
        topAreas: [],
        duration: {
          totalValidRecords: 0,
          factoryFallbackRecords: 0,
          quarantinedNegative: 0,
          missingSalesDate: 0,
          meanDays: 0,
          medianDays: 0,
          completedYears: [],
          underOneYearQuarters: []
        },
        capacities: [],
        topModels: [],
        repeatVisits: []
      };
    }

    const uniqueUnits = new Set(filteredRecords.map(r => r.b)).size;
    const repeatEvents = total - uniqueUnits;
    const repeatRate = Number((repeatEvents / total * 100).toFixed(2));
    const invRecs = filteredRecords.filter(r => r.inv === 1).length;
    const nonInvRecs = total - invRecs;
    const invShare = Number((invRecs / total * 100).toFixed(2));
    const nonInvShare = Number((nonInvRecs / total * 100).toFixed(2));
    const warrRecs = filteredRecords.filter(r => r.warr === 1).length;
    const warrShare = Number((warrRecs / total * 100).toFixed(2));

    // Yearly
    const yearMap = {};
    filteredRecords.forEach(r => {
      const y = r.y;
      if (!yearMap[y]) {
        yearMap[y] = {
          year: y, total: 0, barcodes: new Set(), inverter: 0, nonInverter: 0,
          replace: 0, repair: 0, bothReplaceRepair: 0, gasOnly: 0, otherAction: 0,
          warrYes: 0, warrNo: 0
        };
      }
      const item = yearMap[y];
      item.total++;
      item.barcodes.add(r.b);
      if (r.inv === 1) item.inverter++;
      else item.nonInverter++;
      if (r.act === 'Replace') item.replace++;
      else if (r.act === 'Repair') item.repair++;
      else if (r.act === 'Both Replace & Repair') item.bothReplaceRepair++;
      else if (r.act === 'Gas Charge Only') item.gasOnly++;
      else item.otherAction++;
      if (r.warr === 1) item.warrYes++;
      else item.warrNo++;
    });

    const yearlyList = Object.keys(yearMap).map(Number).sort((a,b)=>a-b).map(y => {
      const d = yearMap[y];
      const tot = d.total;
      const uUnits = d.barcodes.size;
      const repVisits = tot - uUnits;
      return {
        year: y,
        total: tot,
        uniqueUnits: uUnits,
        repeatVisits: repVisits,
        repeatPct: tot > 0 ? Number((repVisits / tot * 100).toFixed(2)) : 0,
        inverter: d.inverter,
        inverterShare: tot > 0 ? Number((d.inverter / tot * 100).toFixed(2)) : 0,
        nonInverter: d.nonInverter,
        nonInverterShare: tot > 0 ? Number((d.nonInverter / tot * 100).toFixed(2)) : 0,
        replace: d.replace,
        replaceShare: tot > 0 ? Number((d.replace / tot * 100).toFixed(2)) : 0,
        repair: d.repair,
        repairShare: tot > 0 ? Number((d.repair / tot * 100).toFixed(2)) : 0,
        bothReplaceRepair: d.bothReplaceRepair,
        gasOnly: d.gasOnly,
        otherAction: d.otherAction,
        warrYes: d.warrYes,
        warrNo: d.warrNo,
        warrYesShare: tot > 0 ? Number((d.warrYes / tot * 100).toFixed(2)) : 0
      };
    });

    // Monthly
    const monthMap = {};
    filteredRecords.forEach(r => {
      const k = r.ym;
      if (!monthMap[k]) {
        monthMap[k] = {
          period: k, year: r.y, month: r.mn, monthNum: r.m,
          total: 0, inverter: 0, nonInverter: 0, replace: 0, repair: 0
        };
      }
      const item = monthMap[k];
      item.total++;
      if (r.inv === 1) item.inverter++;
      else item.nonInverter++;
      if (r.act === 'Replace') item.replace++;
      else if (r.act === 'Repair') item.repair++;
    });
    const monthlyList = Object.keys(monthMap).sort().map(k => monthMap[k]);

    // Leakage Points
    const lpCategories = [
      ['U-Bend Leakage (Body/Return/Joint)', 'Hairpin U-bends, return bends, and U-tube joints', '#6B3E2E'],
      ['Hairpin Tube Body Leakage', 'Fin pack copper tube body punctures and pinholes', '#B3261E'],
      ['Hairpin-to-Return U Joint', 'Brazed copper junctions between straight tube and return bend', '#D97757'],
      ['Distributor & Distributor Joint', 'Capillary distributor header and distributor feed tubes', '#7CAF72'],
      ['Flaring Nut & Flare Plug Leakage', 'Mechanical brass flare connections and seal plugs', '#436B3B'],
      ['Sheet Metal Clamp Leakage', 'Vibration wear and corrosion at sheet metal clamp contact points', '#2A5A4A'],
      ['Inlet/Outlet Pipe Leakage', 'Header inlet/outlet stubs and connecting lines', '#173C33']
    ];
    const lpMap = {};
    lpCategories.forEach(([cat, desc, col]) => {
      lpMap[cat] = { cat, desc, col, records: 0, rep: 0, fix: 0, inv: 0, non: 0 };
    });
    filteredRecords.forEach(r => {
      const lp = r.lp;
      if (lpMap[lp]) {
        lpMap[lp].records++;
        if (r.act === 'Replace') lpMap[lp].rep++;
        else if (r.act === 'Repair') lpMap[lp].fix++;
        if (r.inv === 1) lpMap[lp].inv++;
        else lpMap[lp].non++;
      }
    });

    const sortedLps = Object.values(lpMap).sort((a,b)=>b.records - a.records);
    let cumLpRecs = 0;
    const leakagePoints = sortedLps.map((d, idx) => {
      const cnt = d.records;
      cumLpRecs += cnt;
      const sh = total > 0 ? Number((cnt / total * 100).toFixed(2)) : 0;
      const cumSh = total > 0 ? Number((cumLpRecs / total * 100).toFixed(2)) : 0;
      return {
        rank: idx + 1,
        category: d.cat,
        description: d.desc,
        records: cnt,
        sharePct: sh,
        cumulativeRecords: cumLpRecs,
        cumulativeShare: cumSh,
        replaceCount: d.rep,
        replacePct: cnt > 0 ? Number((d.rep / cnt * 100).toFixed(2)) : 0,
        repairCount: d.fix,
        repairPct: cnt > 0 ? Number((d.fix / cnt * 100).toFixed(2)) : 0,
        inverterCount: d.inv,
        nonInverterCount: d.non,
        color: d.col,
        subComponents: [{ problem: d.cat, count: cnt }]
      };
    });
    const dominantLp = leakagePoints[0] || { category: '—', records: 0, sharePct: 0 };

    // Top Areas
    const areaMap = {};
    filteredRecords.forEach(r => {
      let a = r.a || 'Unknown';
      if (a.includes('Narayang')) a = 'Narayangaj';
      if (!areaMap[a]) areaMap[a] = { area: a, records: 0, lpCounts: {} };
      areaMap[a].records++;
      const lp = r.lp;
      areaMap[a].lpCounts[lp] = (areaMap[a].lpCounts[lp] || 0) + 1;
    });

    const areaColors = ['#6B3E2E', '#8E1E17', '#B3261E', '#BE5F41', '#D97757', '#E09277', '#7CAF72', '#5F9755', '#436B3B', '#2A5A4A'];
    const sortedAreas = Object.values(areaMap).sort((a,b)=>b.records - a.records).slice(0, 10);
    let cumAreaRecs = 0;
    const topAreas = sortedAreas.map((a, idx) => {
      const cnt = a.records;
      cumAreaRecs += cnt;
      const sh = total > 0 ? Number((cnt / total * 100).toFixed(2)) : 0;
      const cumSh = total > 0 ? Number((cumAreaRecs / total * 100).toFixed(2)) : 0;
      const domLpEntries = Object.entries(a.lpCounts).sort((x,y)=>y[1]-x[1]);
      const domLp = domLpEntries.length > 0 ? domLpEntries[0][0] : 'U-Bend Leakage';
      return {
        rank: idx + 1,
        center: a.area,
        fullName: a.area,
        zone: 'Service Point',
        records: cnt,
        sharePct: sh,
        cumulativeRecords: cumAreaRecs,
        cumulativeShare: cumSh,
        dominantLeakPoint: domLp,
        color: areaColors[idx % areaColors.length]
      };
    });
    const top10Tot = topAreas.reduce((s, a) => s + a.records, 0);
    const top10Pct = total > 0 ? Number((top10Tot / total * 100).toFixed(2)) : 0;
    const dominantArea = topAreas[0] || { center: '—', records: 0, sharePct: 0 };

    // Duration
    const durRecs = filteredRecords.filter(r => r.dur !== null && r.dur !== undefined && r.dur >= 0).map(r => r.dur);
    const validDurCnt = durRecs.length;
    const meanDur = validDurCnt > 0 ? Number((durRecs.reduce((a,b)=>a+b, 0) / validDurCnt).toFixed(1)) : 0;
    const sortedDur = [...durRecs].sort((a,b)=>a-b);
    const medianDur = validDurCnt > 0 ? Number(sortedDur[Math.floor(validDurCnt / 2)].toFixed(1)) : 0;

    const catsDef = [
      ['< 1 Year', '0 – 364 d', 0, 364, 'Infant Mortality & Early Installation Failures', '#6B3E2E'],
      ['1 Year', '365 – 729 d', 365, 729, 'Early Operating Wear', '#B3261E'],
      ['2 Years', '730 – 1094 d', 730, 1094, 'Mid-Life Environmental Degradation', '#D97757'],
      ['3 Years', '1095 – 1459 d', 1095, 1459, 'Matured Fleet Corrosion', '#7CAF72'],
      ['4 Years', '1460 – 1824 d', 1460, 1824, 'Extended Service Lifetime Wear', '#436B3B'],
      ['5+ Years', '1825+ d', 1825, 99999, 'Long-Tail Fleet Endurance', '#2A5A4A']
    ];
    let cumDurRecs = 0;
    const completedYears = catsDef.map(([lbl, drange, dmin, dmax, ph, col]) => {
      const cnt = durRecs.filter(d => d >= dmin && d <= dmax).length;
      cumDurRecs += cnt;
      const sh = validDurCnt > 0 ? Number((cnt / validDurCnt * 100).toFixed(2)) : 0;
      const cumSh = validDurCnt > 0 ? Number((cumDurRecs / validDurCnt * 100).toFixed(2)) : 0;
      return {
        label: lbl,
        daysRange: drange,
        records: cnt,
        sharePct: sh,
        cumulativeRecords: cumDurRecs,
        cumulativeShare: cumSh,
        phase: ph,
        color: col
      };
    });

    // Under 1 year quarters
    const u1Recs = durRecs.filter(d => d >= 0 && d <= 364);
    const totU1 = u1Recs.length;
    const quartersDef = [
      ['1st Quarter', '0 – 91 d', '0 – <3 m', 0, 91, 'Installation brazing flaws, shipping vibration, factory QC escapes', '#B3261E'],
      ['2nd Quarter', '92 – 182 d', '3 – <6 m', 92, 182, 'Initial thermal cycling stress, joint micro-fissure propagation', '#D97757'],
      ['3rd Quarter', '183 – 273 d', '6 – <9 m', 183, 273, 'Atmospheric moisture exposure, galvanic micro-cell formation', '#7CAF72'],
      ['4th Quarter', '274 – 364 d', '9 – <12 m', 274, 364, 'First full seasonal cycle thermal expansion & contraction fatigue', '#436B3B']
    ];
    const underOneQuarters = quartersDef.map(([qname, edays, mrange, dmin, dmax, traj, col]) => {
      const cnt = u1Recs.filter(d => d >= dmin && d <= dmax).length;
      const sh = totU1 > 0 ? Number((cnt / totU1 * 100).toFixed(2)) : 0;
      return {
        quarter: qname,
        elapsedDays: edays,
        monthsRange: mrange,
        records: cnt,
        sharePct: sh,
        engineeringTrajectory: traj,
        color: col
      };
    });

    // Capacities
    const capMap = {};
    filteredRecords.forEach(r => {
      const sz = r.sz || 'Unknown';
      if (!capMap[sz]) capMap[sz] = { size: sz, records: 0, inv: 0, non: 0, lpCounts: {} };
      capMap[sz].records++;
      if (r.inv === 1) capMap[sz].inv++;
      else capMap[sz].non++;
      const lp = r.lp;
      capMap[sz].lpCounts[lp] = (capMap[sz].lpCounts[lp] || 0) + 1;
    });
    const capacities = Object.values(capMap).sort((a,b)=>b.records - a.records).map(d => {
      const cnt = d.records;
      const domLpEntries = Object.entries(d.lpCounts).sort((x,y)=>y[1]-x[1]);
      const domLp = domLpEntries.length > 0 ? domLpEntries[0][0] : 'U-Bend Leakage';
      return {
        size: d.size,
        records: cnt,
        sharePct: total > 0 ? Number((cnt / total * 100).toFixed(2)) : 0,
        inverterShare: cnt > 0 ? Number((d.inv / cnt * 100).toFixed(2)) : 0,
        nonInverterShare: cnt > 0 ? Number((d.non / cnt * 100).toFixed(2)) : 0,
        dominantLeakPoint: domLp
      };
    });

    // Top Models (20)
    const modMap = {};
    filteredRecords.forEach(r => {
      const m = r.mod || 'Unknown';
      if (!modMap[m]) modMap[m] = { mod: m, records: 0, inv: 0, non: 0, szCounts: {}, lpCounts: {} };
      modMap[m].records++;
      if (r.inv === 1) modMap[m].inv++;
      else modMap[m].non++;
      const sz = r.sz;
      modMap[m].szCounts[sz] = (modMap[m].szCounts[sz] || 0) + 1;
      const lp = r.lp;
      modMap[m].lpCounts[lp] = (modMap[m].lpCounts[lp] || 0) + 1;
    });

    const sortedMods = Object.values(modMap).sort((a,b)=>b.records - a.records).slice(0, 20);
    let cumModSh = 0;
    const topModels = sortedMods.map((d, idx) => {
      const cnt = d.records;
      const sh = total > 0 ? Number((cnt / total * 100).toFixed(2)) : 0;
      cumModSh = Number((cumModSh + sh).toFixed(2));
      const domSzEntries = Object.entries(d.szCounts).sort((x,y)=>y[1]-x[1]);
      const domSz = domSzEntries.length > 0 ? domSzEntries[0][0] : '1.5 Ton';
      const domLpEntries = Object.entries(d.lpCounts).sort((x,y)=>y[1]-x[1]);
      const domLpPair = domLpEntries.length > 0 ? domLpEntries[0] : ['U-Bend Leakage', cnt];
      const lpPct = Number((domLpPair[1] / cnt * 100).toFixed(1));
      const tech = d.inv >= d.non ? 'Inverter' : 'Non-Inverter';
      const baseM = d.mod.includes('-') ? d.mod.split('-').slice(-1)[0] : d.mod;
      return {
        rank: idx + 1,
        modelWithVersion: d.mod,
        baseModel: baseM,
        capacity: domSz,
        technology: tech,
        records: cnt,
        sharePct: sh,
        cumulativeShare: cumModSh,
        primaryLeakPoint: `${domLpPair[0]} (${lpPct}%)`
      };
    });

    // Repeat Visits
    const bCounts = {};
    filteredRecords.forEach(r => {
      bCounts[r.b] = (bCounts[r.b] || 0) + 1;
    });
    const visitDist = {};
    Object.values(bCounts).forEach(vCnt => {
      visitDist[vCnt] = (visitDist[vCnt] || 0) + 1;
    });
    const repeatVisits = Object.keys(visitDist).map(Number).sort((a,b)=>a-b).map(vCnt => {
      const units = visitDist[vCnt];
      const events = units * vCnt;
      return {
        visits: vCnt,
        units: units,
        events: events,
        shareUnitsPct: uniqueUnits > 0 ? Number((units / uniqueUnits * 100).toFixed(2)) : 0,
        shareEventsPct: total > 0 ? Number((events / total * 100).toFixed(2)) : 0
      };
    });

    const peakDurCat = [...completedYears].sort((a,b)=>b.records - a.records)[0] || { label: 'None', sharePct: 0 };

    return {
      metadata: {
        title: 'Walton RAC Evaporator Market Failure',
        dataSource: `Evaporator Leak Data (${total.toLocaleString('en-US')} filtered records)`,
        totalRecords: total,
        uniqueUnits: uniqueUnits,
        repeatEvents: repeatEvents,
        repeatRatePct: repeatRate,
        inverterRecords: invRecs,
        inverterSharePct: invShare,
        nonInverterRecords: nonInvRecs,
        nonInverterSharePct: nonInvShare,
        topLeakPoint: dominantLp.category,
        topLeakPointRecords: dominantLp.records,
        topLeakPointSharePct: dominantLp.sharePct,
        topArea: dominantArea.center,
        topAreaRecords: dominantArea.records,
        topAreaSharePct: dominantArea.sharePct,
        top10TotalRecords: top10Tot,
        top10SharePct: top10Pct,
        underWarrantyRecords: warrRecs,
        underWarrantySharePct: warrShare,
        meanOperatingDurationDays: meanDur,
        medianOperatingDurationDays: medianDur,
        peakDurationYear: `${peakDurCat.label} (${peakDurCat.sharePct}%)`
      },
      yearly: yearlyList,
      monthly: monthlyList,
      leakagePoints: leakagePoints,
      topAreas: topAreas,
      duration: {
        totalValidRecords: validDurCnt,
        factoryFallbackRecords: 0,
        quarantinedNegative: 0,
        missingSalesDate: total - validDurCnt,
        meanDays: meanDur,
        medianDays: medianDur,
        completedYears: completedYears,
        underOneYearQuarters: underOneQuarters
      },
      capacities: capacities,
      topModels: topModels,
      repeatVisits: repeatVisits
    };
  }

  function updateFilterBadge(text, isFiltered) {
    const badge = document.getElementById('filterStatusBadge');
    if (!badge) return;
    badge.textContent = text;
    if (isFiltered) {
      badge.classList.add('filtered');
    } else {
      badge.classList.remove('filtered');
    }
  }

  function updateNavLinks(year, month) {
    const navLinks = document.querySelectorAll('.page-nav-link');
    navLinks.forEach(link => {
      let href = link.getAttribute('href') || '';
      const base = href.split('?')[0];
      if (year !== 'all' || month !== 'all') {
        link.setAttribute('href', `${base}?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`);
      } else {
        link.setAttribute('href', base);
      }
    });
  }

  function syncUrlParams(year, month) {
    const url = new URL(window.location);
    if (year !== 'all') url.searchParams.set('year', year);
    else url.searchParams.delete('year');
    if (month !== 'all') url.searchParams.set('month', month);
    else url.searchParams.delete('month');
    window.history.replaceState({}, '', url);
    updateNavLinks(year, month);
  }

  function applyGlobalFilter(year, month, shouldRender = true) {
    state.globalYear = year;
    state.globalMonth = month;

    sessionStorage.setItem('walton_filter_year', year);
    sessionStorage.setItem('walton_filter_month', month);
    syncUrlParams(year, month);

    const yearSel = document.getElementById('globalFilterYear');
    const monthSel = document.getElementById('globalFilterMonth');
    if (yearSel) yearSel.value = year;
    if (monthSel) monthSel.value = month;

    if (year !== 'all') {
      state.chartMonthYear = Number(year);
      const chartYrSel = document.getElementById('chartMonthYearSelect');
      if (chartYrSel) chartYrSel.value = String(year);
      const subEl = document.getElementById('chartMonthlySubtitle');
      if (subEl) subEl.textContent = `Monthly Evaporator leakage records — ${year}`;
    } else {
      state.chartMonthYear = 'all';
      const chartYrSel = document.getElementById('chartMonthYearSelect');
      if (chartYrSel) chartYrSel.value = 'all';
      const subEl = document.getElementById('chartMonthlySubtitle');
      if (subEl) subEl.textContent = 'Monthly Evaporator leakage records — Year-over-Year Comparison';
    }

    if (year === 'all' && month === 'all') {
      data = DEFAULT_DATA;
      updateFilterBadge('Showing: All Historical Records (13,770 complaints)', false);
    } else {
      const records = (EVAPORATOR_DATA && EVAPORATOR_DATA.records) ? EVAPORATOR_DATA.records : [];
      const filtered = getFilteredEvapData(records, year, month);
      data = recalculateEvaporatorData(filtered, year, month);

      const yrLabel = year === 'all' ? 'All Years' : year;
      const moLabel = month === 'all' ? 'All Months' : monthNames[Number(month)];
      updateFilterBadge(`Showing: ${yrLabel} • ${moLabel} (${filtered.length.toLocaleString('en-US')} complaints)`, true);
    }

    if (shouldRender) {
      renderAll();
    }
  }

  function resetGlobalFilter() {
    sessionStorage.removeItem('walton_filter_year');
    sessionStorage.removeItem('walton_filter_month');
    state.chartMonthYear = 'all';
    const chartYrSel = document.getElementById('chartMonthYearSelect');
    if (chartYrSel) chartYrSel.value = 'all';
    const subEl = document.getElementById('chartMonthlySubtitle');
    if (subEl) subEl.textContent = 'Monthly Evaporator leakage records — Year-over-Year Comparison';
    applyGlobalFilter('all', 'all');
  }

  function initGlobalFilters() {
    const yearSelect = document.getElementById('globalFilterYear');
    const monthSelect = document.getElementById('globalFilterMonth');
    const resetBtn = document.getElementById('globalFilterResetBtn');

    if (yearSelect) {
      yearSelect.innerHTML = '<option value="all">All Years</option>' + 
        availableYears.map(y => `<option value="${y}">${y}</option>`).join('');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const initYear = urlParams.get('year') || sessionStorage.getItem('walton_filter_year') || 'all';
    const initMonth = urlParams.get('month') || sessionStorage.getItem('walton_filter_month') || 'all';

    state.globalYear = initYear;
    state.globalMonth = initMonth;

    if (yearSelect) yearSelect.value = initYear;
    if (monthSelect) monthSelect.value = initMonth;

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        applyGlobalFilter(e.target.value, state.globalMonth);
      });
    }

    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        applyGlobalFilter(state.globalYear, e.target.value);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetGlobalFilter();
      });
    }

    if (initYear !== 'all' || initMonth !== 'all') {
      applyGlobalFilter(initYear, initMonth, false);
    } else {
      updateFilterBadge('Showing: All Historical Records (13,770 complaints)', false);
      updateNavLinks('all', 'all');
    }
  }

  // Initialization & Master Render
  function init() {
    setupEventListeners();
    initGlobalFilters();
    renderAll();
  }

  function renderAll() {
    renderKPIs();
    renderChartYearly();
    renderChartMonthly(state.chartMonthYear);
    renderChartLeakagePoints();
    renderChartTopAreas();
    renderChartSalesToService();
    renderChartUnderOneYearQuarters();
    renderChartCapacity();
    renderChartReplaceVsRepair();
    renderReplaceRepairAuditCard();

    renderTableYearly();
    renderTableMonthly();
    renderTablePoints();
    renderTableAreas();
    renderTableSalesToService();
    renderTableCapacity();
    renderTableTopModels();
    renderTableReplaceRepair();
    renderTableRepeatVisits();
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

    // Month-wise year filter chips (for Table)
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

    // Chart 2 Month Year Selector
    const chartMonthYearSelect = document.getElementById('chartMonthYearSelect');
    if (chartMonthYearSelect) {
      chartMonthYearSelect.value = String(state.chartMonthYear);
      chartMonthYearSelect.addEventListener('change', (e) => {
        state.chartMonthYear = e.target.value === 'all' ? 'all' : Number(e.target.value);
        const subEl = document.getElementById('chartMonthlySubtitle');
        if (subEl) {
          subEl.textContent = state.chartMonthYear === 'all' 
            ? 'Monthly Evaporator leakage records — Year-over-Year Comparison' 
            : `Monthly Evaporator leakage records — ${state.chartMonthYear}`;
        }
        renderChartMonthly(state.chartMonthYear);
      });
    }

    // CSV Export
    const btnExport = document.getElementById('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', exportMainCSV);
    }

    const exportDurationCsvBtn = document.getElementById('exportDurationCsvBtn');
    if (exportDurationCsvBtn) {
      exportDurationCsvBtn.addEventListener('click', exportDurationCSV);
    }

    const btnExportRRCsv = document.getElementById('btnExportReplaceRepairCSV');
    if (btnExportRRCsv) {
      btnExportRRCsv.addEventListener('click', exportReplaceRepairCSV);
    }


    // Jump Buttons
    const btnJumpToRR = document.getElementById('btnJumpToReplaceRepairTable');
    if (btnJumpToRR) {
      btnJumpToRR.addEventListener('click', () => {
        setActiveTab('replaceRepairTab');
        const tblHeader = document.getElementById('replaceRepairTableTitle');
        if (tblHeader) tblHeader.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const btnJumpToCap = document.getElementById('btnJumpToCapacityTable');
    if (btnJumpToCap) {
      btnJumpToCap.addEventListener('click', () => {
        setActiveTab('capacityTab');
        const tbl = document.getElementById('tabCapacity');
        if (tbl) tbl.scrollIntoView({ behavior: 'smooth' });
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
      capacityTab: 'tabCapacity',
      modelsTab: 'tabModels',
      replaceRepairTab: 'tabReplaceRepair',
      repeatTab: 'tabRepeat'
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
    const elTotalSub = document.getElementById('kpiTotalLeaksSub');
    const elInv = document.getElementById('kpiInverterLeaks');
    const elNonInv = document.getElementById('kpiNonInverterLeaks');
    const elInvShare = document.getElementById('kpiInverterShare');
    const elNonInvShare = document.getElementById('kpiNonInverterShare');
    const elTopPoint = document.getElementById('kpiTopLeakPoint');
    const elTopPointSub = document.getElementById('kpiTopLeakPointSub');
    const elTopArea = document.getElementById('kpiTopArea');
    const elTopAreaSub = document.getElementById('kpiTopAreaSub');
    const elRepeats = document.getElementById('kpiRepeatVisits');
    const elRepeatsSub = document.getElementById('kpiRepeatVisitsSub');

    if (meta.totalRecords === 0) {
      if (elTotal) elTotal.textContent = '—';
      if (elTotalSub) elTotalSub.textContent = 'No records for selected period';
      if (elInv) elInv.textContent = '—';
      if (elNonInv) elNonInv.textContent = '—';
      if (elInvShare) elInvShare.textContent = '—';
      if (elNonInvShare) elNonInvShare.textContent = '—';
      if (elTopPoint) elTopPoint.textContent = '—';
      if (elTopPointSub) elTopPointSub.textContent = 'No records for selected period';
      if (elTopArea) elTopArea.textContent = '—';
      if (elTopAreaSub) elTopAreaSub.textContent = 'No records for selected period';
      if (elRepeats) elRepeats.textContent = '—';
      if (elRepeatsSub) elRepeatsSub.textContent = 'No records for selected period';
      return;
    }

    if (elTotal) elTotal.textContent = numFmt(meta.totalRecords);
    if (elTotalSub) {
      elTotalSub.textContent = `${numFmt(meta.uniqueUnits)} unique units`;
      elTotalSub.title = `Service complaints across ${numFmt(meta.uniqueUnits)} unique physical indoor units`;
    }

    if (elInv) elInv.textContent = numFmt(meta.inverterRecords);
    if (elNonInv) elNonInv.textContent = numFmt(meta.nonInverterRecords);
    if (elInvShare) elInvShare.textContent = `${pctFmt(meta.inverterSharePct)} Share`;
    if (elNonInvShare) elNonInvShare.textContent = `${pctFmt(meta.nonInverterSharePct)} Share`;

    if (elTopPoint) {
      const pName = meta.topLeakPoint ? (meta.topLeakPoint.startsWith('U-Bend') ? 'U-Bend Leakage' : meta.topLeakPoint) : '—';
      elTopPoint.textContent = pName;
    }
    if (elTopPointSub) {
      elTopPointSub.textContent = `${numFmt(meta.topLeakPointRecords)} records (${pctFmt(meta.topLeakPointSharePct)})`;
      elTopPointSub.title = `${numFmt(meta.topLeakPointRecords)} records (${pctFmt(meta.topLeakPointSharePct)} failure share)`;
    }

    if (elTopArea) elTopArea.textContent = meta.topArea || '—';
    if (elTopAreaSub) {
      elTopAreaSub.textContent = `${numFmt(meta.topAreaRecords)} records (${pctFmt(meta.topAreaSharePct)})`;
      elTopAreaSub.title = `${numFmt(meta.topAreaRecords)} records (${pctFmt(meta.topAreaSharePct)} of confirmed leaks)`;
    }

    if (elRepeats) elRepeats.textContent = numFmt(meta.repeatEvents);
    if (elRepeatsSub) {
      elRepeatsSub.textContent = `${pctFmt(meta.repeatRatePct)} rate (${numFmt(meta.repeatEvents)} events)`;
      elRepeatsSub.title = `${pctFmt(meta.repeatRatePct)} repeat rate (${numFmt(meta.repeatEvents)} events)`;
    }
  }

  // 2. Chart 1: Year-Wise Inverter vs Non-Inverter Leakage (Grouped Column Chart)
  function renderChartYearly() {
    const container = document.getElementById('chartYearlyLeakage');
    if (!container) return;

    const yearlyData = data.yearly;
    if (!yearlyData || yearlyData.length === 0) {
      container.innerHTML = emptyStateHtml('No yearly failure records found for this period');
      return;
    }
    const svgW = 860;
    const svgH = 585;
    const leftPad = 74;
    const rightPad = 18;
    const topPad = 38;
    const baselineY = 525;
    const plotH = baselineY - topPad;
    const plotW = svgW - rightPad - leftPad;

    const maxBarVal = Math.max(...yearlyData.map(d => Math.max(d.inverter, d.nonInverter, 0)), 1);
    const maxVal = getNiceMax(maxBarVal);

    const numSteps = 5;
    const stepVal = Math.round(maxVal / numSteps);
    const gridVals = [];
    for (let s = 0; s <= numSteps; s++) gridVals.push(s * stepVal);
    if (gridVals[gridVals.length - 1] < maxVal) gridVals.push(maxVal);

    const gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      const isBase = (val === 0);
      return `
        ${!isBase ? `<line x1="${leftPad}" y1="${y.toFixed(2)}" x2="${(svgW - rightPad).toFixed(2)}" y2="${y.toFixed(2)}" stroke="#E2E8F0" stroke-dasharray="3 3" stroke-width="1" />` : ''}
        <text x="${leftPad - 10}" y="${y.toFixed(2)}" text-anchor="end" dominant-baseline="middle" font-size="12" font-weight="500" fill="#546678" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    const stepX = plotW / yearlyData.length;
    const colW = 42;
    const colGap = 8;
    const groupW = colW * 2 + colGap;

    const yearlyTooltips = [];
    const barsHtml = yearlyData.map((d, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const groupX = centerX - groupW / 2;
      const xInv = groupX;
      const xNon = groupX + colW + colGap;

      const hInv = (d.inverter / maxVal) * plotH;
      const hNon = (d.nonInverter / maxVal) * plotH;

      const yInv = baselineY - hInv;
      const yNon = baselineY - hNon;

      const totYear = d.total;
      const invPct = d.inverterShare.toFixed(1);
      const nonPct = d.nonInverterShare.toFixed(1);

      const tooltipText = `<strong>${d.year} Evaporator Leakage</strong><br>Total Complaints: ${numFmt(totYear)}<br>• Inverter: ${numFmt(d.inverter)} (${invPct}%)<br>• Non-Inverter: ${numFmt(d.nonInverter)} (${nonPct}%)<br>• Replaced: ${numFmt(d.replace)} (${d.replaceShare}%)<br>• Repaired: ${numFmt(d.repair)} (${d.repairShare}%)`;
      yearlyTooltips.push(tooltipText);

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-yidx="${i}">
          <rect x="${(centerX - stepX / 2).toFixed(2)}" y="${topPad}" width="${stepX.toFixed(2)}" height="${(plotH + 46).toFixed(2)}" fill="transparent" />

          <!-- Inverter Column (#0B3A70) -->
          <rect class="yearly-bar-rect" x="${xInv.toFixed(2)}" y="${yInv.toFixed(2)}" width="${colW}" height="${hInv.toFixed(2)}" fill="#0B3A70" rx="3" ry="3" />

          <!-- Non-Inverter Column (#D7C2A5) -->
          <rect class="yearly-bar-rect" x="${xNon.toFixed(2)}" y="${yNon.toFixed(2)}" width="${colW}" height="${hNon.toFixed(2)}" fill="#D7C2A5" rx="3" ry="3" />

          <!-- Labels Inverter -->
          <text x="${(xInv + colW / 2).toFixed(2)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            <tspan x="${(xInv + colW / 2).toFixed(2)}" y="${(yInv - 18).toFixed(2)}" font-size="12" font-weight="700" fill="#0B3A70">${numFmt(d.inverter)}</tspan>
            <tspan x="${(xInv + colW / 2).toFixed(2)}" y="${(yInv - 5).toFixed(2)}" font-size="10" font-weight="500" fill="#0B3A70">(${invPct}%)</tspan>
          </text>

          <!-- Labels Non-Inverter -->
          <text x="${(xNon + colW / 2).toFixed(2)}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
            <tspan x="${(xNon + colW / 2).toFixed(2)}" y="${(yNon - 18).toFixed(2)}" font-size="12" font-weight="700" fill="#7B5E3C">${numFmt(d.nonInverter)}</tspan>
            <tspan x="${(xNon + colW / 2).toFixed(2)}" y="${(yNon - 5).toFixed(2)}" font-size="10" font-weight="500" fill="#7B5E3C">(${nonPct}%)</tspan>
          </text>

          <!-- Year label below -->
          <text x="${centerX.toFixed(2)}" y="${(baselineY + 26).toFixed(2)}" text-anchor="middle" font-size="13" font-weight="700" fill="#1E293B" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${d.year}</text>
        </g>
      `;
    }).join('');

    const yMid = (topPad + baselineY) / 2;
    const yTitleHtml = `<text x="-${yMid.toFixed(2)}" y="16" transform="rotate(-90)" text-anchor="middle" font-size="12" font-weight="500" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Service Complaint Records</text>`;
    const yAxisHtml = `<line x1="${leftPad}" y1="${topPad}" x2="${leftPad}" y2="${baselineY}" stroke="#8E9CA8" stroke-width="1.2" />`;
    const xAxisHtml = `<line x1="${leftPad}" y1="${baselineY}" x2="${(svgW - rightPad).toFixed(2)}" y2="${baselineY}" stroke="#8E9CA8" stroke-width="1.5" />`;

    container.innerHTML = `
      <svg class="svg-chart yearly-grouped-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; display: block; overflow: visible;">
        ${yTitleHtml}
        ${gridHtml}
        ${yAxisHtml}
        ${xAxisHtml}
        ${barsHtml}
      </svg>
    `;

    container.querySelectorAll('.svg-bar-col').forEach(el => {
      const idx = Number(el.dataset.yidx);
      const tip = yearlyTooltips[idx] || '';
      el.addEventListener('mouseenter', (e) => showTooltip(e, tip));
      el.addEventListener('mousemove', (e) => showTooltip(e, tip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 3. Chart 2: Month-Wise Multi-Series Spline Line Chart (2021-2026)
  function renderChartMonthly(targetYear = 'all') {
    const container = document.getElementById('chartMonthlyLeakage');
    if (!container) return;
    if (!data.monthly || data.monthly.length === 0) {
      container.innerHTML = emptyStateHtml('No monthly failure records found for this period');
      return;
    }

    const effectiveTargetYear = (state.globalYear !== 'all') 
      ? Number(state.globalYear) 
      : (targetYear !== 'all' ? Number(targetYear) : 'all');

    const years = [2021, 2022, 2023, 2024, 2025, 2026];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearColors = {
      2021: '#64748B',
      2022: '#8E9CA8',
      2023: '#D97706',
      2024: '#0D9488',
      2025: '#D9534F',
      2026: '#0B3A70'
    };

    const monthlyMap = {};
    years.forEach(y => { monthlyMap[y] = new Array(12).fill(0); });
    data.monthly.forEach(d => {
      if (monthlyMap[d.year] && d.monthNum >= 1 && d.monthNum <= 12) {
        monthlyMap[d.year][d.monthNum - 1] = d.total;
      }
    });

    // Active years that have at least 1 record in the filtered data
    const activeYears = (effectiveTargetYear !== 'all')
      ? [effectiveTargetYear]
      : years.filter(yr => monthlyMap[yr] && monthlyMap[yr].some(v => v > 0));

    const plotYears = activeYears.length > 0 ? activeYears : (effectiveTargetYear !== 'all' ? [effectiveTargetYear] : years);

    let maxDataVal = 0;
    plotYears.forEach(yr => {
      monthlyMap[yr].forEach(v => {
        if (v > maxDataVal) maxDataVal = v;
      });
    });
    const maxVal = getNiceMax(maxDataVal);

    const svgW = 860;
    const svgH = 585;
    const leftPad = 74;
    const rightPad = 32;
    const topPad = 38;
    const baselineY = 525;
    const plotH = baselineY - topPad;
    const plotW = svgW - rightPad - leftPad;

    const numSteps = 5;
    const stepVal = Math.round(maxVal / numSteps);
    const gridVals = [];
    for (let s = 0; s <= numSteps; s++) gridVals.push(s * stepVal);
    if (gridVals[gridVals.length - 1] < maxVal) gridVals.push(maxVal);

    const gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      const isBase = (val === 0);
      return `
        ${!isBase ? `<line x1="${leftPad}" y1="${y.toFixed(2)}" x2="${(svgW - rightPad).toFixed(2)}" y2="${y.toFixed(2)}" stroke="#E2E8F0" stroke-dasharray="3 3" stroke-width="1" />` : ''}
        <text x="${leftPad - 10}" y="${y.toFixed(2)}" text-anchor="end" dominant-baseline="middle" font-size="12" font-weight="500" fill="#546678" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    const stepX = plotW / 11;
    const monthX = (mIdx) => leftPad + mIdx * stepX;
    const valY = (v) => baselineY - (v / maxVal) * plotH;

    const xLabelsHtml = monthNames.map((m, i) => `
      <text x="${monthX(i).toFixed(2)}" y="${(baselineY + 26).toFixed(2)}" text-anchor="middle" font-size="12" font-weight="600" fill="#475569" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${m}</text>
    `).join('');

    function getSplinePath(pts) {
      if (!pts || pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i > 0 ? pts[i - 1] : pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
      }
      return d;
    }

    const seriesData = {};
    plotYears.forEach(yr => {
      const maxM = (yr === 2026) ? 7 : 11;
      const pts = [];
      for (let m = 0; m <= maxM; m++) {
        const val = monthlyMap[yr][m];
        pts.push({
          mIdx: m,
          month: monthNames[m],
          year: yr,
          val: val,
          cx: monthX(m),
          cy: valY(val)
        });
      }
      seriesData[yr] = pts;
    });

    const linesHtml = [];
    plotYears.forEach(yr => {
      const pts = seriesData[yr];
      if (!pts || pts.length === 0) return;
      const color = yearColors[yr];
      const strokeW = (effectiveTargetYear !== 'all' || yr === 2026 || yr === 2025) ? '3.2' : '2.4';
      const opacity = (effectiveTargetYear === 'all' || effectiveTargetYear === yr) ? '1' : '0.15';
      const pathD = getSplinePath(pts.map(p => ({ x: p.cx, y: p.cy })));
      linesHtml.push(`
        <path class="monthly-year-path path-year-${yr}" data-year="${yr}" d="${pathD}" fill="none" stroke="${color}" stroke-width="${strokeW}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round" />
      `);
    });

    // Group points by month
    const monthBuckets = Array.from({ length: 12 }, () => []);
    plotYears.forEach(yr => {
      const pts = seriesData[yr];
      if (pts) {
        pts.forEach(p => {
          monthBuckets[p.mIdx].push({ ...p, color: yearColors[yr] });
        });
      }
    });

    // In-memory tooltips for month column hovering
    const monthColumnTooltips = [];
    monthNames.forEach((mName, mIdx) => {
      const allPtsInMonth = [];
      plotYears.forEach(yr => {
        const maxM = (yr === 2026) ? 7 : 11;
        if (mIdx <= maxM) {
          allPtsInMonth.push({
            year: yr,
            val: monthlyMap[yr][mIdx],
            color: yearColors[yr]
          });
        }
      });
      allPtsInMonth.sort((a, b) => b.val - a.val);

      let tip = `<strong>${mName} Evaporator Complaints Breakdown</strong>`;
      tip += `<div style="margin-top: 5px; font-size: 11.5px; line-height: 1.55;">`;
      allPtsInMonth.forEach(p => {
        tip += `<div style="display:flex; justify-content:space-between; gap:16px;">
          <span style="color:${p.color}; font-weight:700;">● ${p.year}:</span>
          <strong>${numFmt(p.val)}</strong> records
        </div>`;
      });
      tip += `</div>`;
      monthColumnTooltips.push(tip);
    });

    // Build markers and numerical value labels
    let markersHtml = '';
    monthBuckets.forEach((ptsInMonth, mIdx) => {
      if (!ptsInMonth || ptsInMonth.length === 0) return;

      // Sort points descending by value so highest point is evaluated first
      ptsInMonth.sort((a, b) => b.val - a.val);

      ptsInMonth.forEach((p, idx) => {
        const opacity = (effectiveTargetYear === 'all' || effectiveTargetYear === p.year) ? '1' : '0.15';

        let showLabel = false;
        let lblY = p.cy - 10;

        if (effectiveTargetYear !== 'all') {
          // When a specific year is chosen, ALWAYS show all its numerical values!
          if (p.year === effectiveTargetYear) {
            showLabel = true;
            lblY = (p.cy < topPad + 18) ? (p.cy + 17) : (p.cy - 10);
          }
        } else {
          // In "All Years (Compare)" mode:
          // Show values for all points where val > 0
          if (p.val > 0) {
            showLabel = true;
            if (idx > 0) {
              const prevPt = ptsInMonth[idx - 1];
              if (Math.abs(p.cy - prevPt.cy) < 22) {
                lblY = p.cy + 17;
              } else {
                lblY = (p.cy < topPad + 18) ? (p.cy + 17) : (p.cy - 10);
              }
            } else {
              lblY = (p.cy < topPad + 18) ? (p.cy + 17) : (p.cy - 10);
            }
          }
        }

        const pointTip = `<strong>${p.month} ${p.year}</strong><br>Confirmed Complaints: <strong>${numFmt(p.val)}</strong> records`;

        markersHtml += `
          <g class="monthly-point-marker marker-year-${p.year}" data-year="${p.year}" data-month="${p.month}" data-val="${p.val}" style="opacity: ${opacity};">
            <circle class="monthly-dot" cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="4.5" fill="#FFFFFF" stroke="${p.color}" stroke-width="2.2" style="cursor: pointer;" data-tip="${pointTip}" />
            <text class="pt-label pt-label-${p.year}" x="${p.cx.toFixed(2)}" y="${lblY.toFixed(2)}" text-anchor="middle" font-size="11" font-weight="700" fill="${p.color}" stroke="#FFFFFF" stroke-width="3.5" paint-order="stroke" stroke-linecap="round" stroke-linejoin="round" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" pointer-events="none" style="${showLabel ? '' : 'display:none;'}">${numFmt(p.val)}</text>
          </g>
        `;
      });
    });

    // Crosshair hover vertical columns (one for each month)
    const hoverColsHtml = monthNames.map((mName, mIdx) => {
      const cx = monthX(mIdx);
      const colW = stepX;
      return `
        <rect class="monthly-slot-hover" data-midx="${mIdx}" data-cx="${cx.toFixed(2)}" x="${(cx - colW / 2).toFixed(2)}" y="${topPad}" width="${colW.toFixed(2)}" height="${plotH}" fill="transparent" style="cursor: crosshair;" />
      `;
    }).join('');

    const yMid = (topPad + baselineY) / 2;
    const yTitleHtml = `<text x="-${yMid.toFixed(2)}" y="16" transform="rotate(-90)" text-anchor="middle" font-size="12" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Monthly Complaints</text>`;
    const yAxisHtml = `<line x1="${leftPad}" y1="${topPad}" x2="${leftPad}" y2="${baselineY}" stroke="#B8C7D9" stroke-width="1.2" />`;
    const xAxisHtml = `<line x1="${leftPad}" y1="${baselineY}" x2="${(svgW - rightPad).toFixed(2)}" y2="${baselineY}" stroke="#B8C7D9" stroke-width="1.5" />`;

    container.innerHTML = `
      <svg class="svg-chart monthly-spline-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; display: block; overflow: visible;">
        ${yTitleHtml}
        ${gridHtml}
        ${yAxisHtml}
        ${xAxisHtml}
        ${xLabelsHtml}
        <line id="monthlyCrosshairLine" class="monthly-crosshair-line" x1="0" y1="${topPad}" x2="0" y2="${baselineY}" stroke="#0B3A70" stroke-width="1.2" stroke-dasharray="3 3" opacity="0" pointer-events="none" />
        ${linesHtml.join('')}
        ${markersHtml}
        ${hoverColsHtml}
      </svg>
    `;

    // Tooltips & Crosshair events
    const crosshair = container.querySelector('.monthly-crosshair-line');

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

    container.querySelectorAll('.monthly-dot').forEach(dot => {
      dot.addEventListener('mouseenter', (e) => {
        dot.setAttribute('r', '6.5');
        showTooltip(e, dot.dataset.tip);
      });
      dot.addEventListener('mousemove', (e) => showTooltip(e, dot.dataset.tip));
      dot.addEventListener('mouseleave', () => {
        dot.setAttribute('r', '4.5');
        hideTooltip();
      });
    });
  }

  // 4. Chart 3: Evaporator Leakage Points Breakdown (Pareto Chart)
  function renderChartLeakagePoints() {
    const container = document.getElementById('chartLeakagePoints');
    if (!container) return;

    // Order strictly from highest to lowest
    const sortedPoints = [...data.leakagePoints].sort((a, b) => b.records - a.records);
    const totalLeaks = sortedPoints.reduce((sum, p) => sum + p.records, 0);

    const maxBarVal = sortedPoints[0]?.records || 1;
    const maxVal = getNiceMax(maxBarVal);

    const svgW = 760;
    const svgH = 515;
    const leftPad = 64;
    const rightPad = 64;
    const topPad = 80;
    const baselineY = 435;
    const plotW = svgW - leftPad - rightPad; // 632px
    const plotH = baselineY - topPad; // 355px

    // Palette: Sequential severity progression matching benchmark visual reference
    const paletteMap = {
      'U-Bend Leakage (Body/Return/Joint)': '#6B3E2E',
      'Hairpin Tube Body Leakage': '#0B3A70',
      'Hairpin-to-Return U Joint': '#E07F46',
      'Distributor & Distributor Joint': '#B1A542',
      'Flaring Nut & Flare Plug Leakage': '#71AE6B',
      'Sheet Metal Clamp Leakage': '#A8D5A2',
      'Inlet/Outlet Pipe Leakage': '#D9534F'
    };

    function getCategoryLines(name) {
      const labelMap = {
        'U-Bend Leakage (Body/Return/Joint)': ['U-Bend', 'Leakage'],
        'Hairpin Tube Body Leakage': ['Hairpin Tube', 'Body Leakage'],
        'Hairpin-to-Return U Joint': ['Hairpin-to-Return', 'U Joint'],
        'Distributor & Distributor Joint': ['Distributor &', 'Dist. Joint'],
        'Flaring Nut & Flare Plug Leakage': ['Flaring Nut /', 'Flare Plug'],
        'Sheet Metal Clamp Leakage': ['Sheet Metal', 'Clamp Leakage'],
        'Inlet/Outlet Pipe Leakage': ['Inlet/Outlet', 'Pipe Leakage']
      };
      if (labelMap[name]) return labelMap[name];
      const parts = name.split(' ');
      if (parts.length <= 1) return [name, ''];
      const mid = Math.ceil(parts.length / 2);
      return [parts.slice(0, mid).join(' '), parts.slice(mid).join(' ')];
    }

    // Gridlines & Dual Axes levels: 0, 20%, 40%, 60%, 80%, 100%
    const gridVals = [
      { frac: 0.0, rightLbl: '0%' },
      { frac: 0.2, rightLbl: '20%' },
      { frac: 0.4, rightLbl: '40%' },
      { frac: 0.6, rightLbl: '60%' },
      { frac: 0.8, rightLbl: '80%' },
      { frac: 1.0, rightLbl: '100%' }
    ];

    let gridHtml = gridVals.map(g => {
      const val = Math.round(g.frac * maxVal);
      const y = baselineY - g.frac * plotH;
      const isBase = g.frac === 0;
      return `
        <!-- Horizontal Gridline -->
        <line x1="${leftPad}" y1="${y.toFixed(2)}" x2="${(svgW - rightPad).toFixed(2)}" y2="${y.toFixed(2)}" stroke="${isBase ? '#B8C7D9' : '#E2E8F0'}" stroke-dasharray="${isBase ? 'none' : '4 4'}" stroke-width="${isBase ? '1.5' : '1'}" />
        <!-- Left Tick & Label -->
        <line x1="${leftPad - 5}" y1="${y.toFixed(2)}" x2="${leftPad}" y2="${y.toFixed(2)}" stroke="#B8C7D9" stroke-width="1.5" />
        <text x="${leftPad - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end" font-size="11" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(val)}</text>
        <!-- Right Tick & Label -->
        <line x1="${svgW - rightPad}" y1="${y.toFixed(2)}" x2="${svgW - rightPad + 5}" y2="${y.toFixed(2)}" stroke="#B8C7D9" stroke-width="1.5" />
        <text x="${svgW - rightPad + 9}" y="${(y + 4).toFixed(2)}" text-anchor="start" font-size="11" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${g.rightLbl}</text>
      `;
    }).join('');

    const colStep = plotW / sortedPoints.length; // ~90.28px
    const colW = Math.min(62, colStep * 0.7);

    let cum = 0;
    const pointsCoords = [];

    let columnsHtml = sortedPoints.map((p, i) => {
      cum += p.records;
      const cumPct = totalLeaks > 0 ? (cum / totalLeaks) * 100 : 0;
      const sharePct = totalLeaks > 0 ? (p.records / totalLeaks) * 100 : 0;

      const cx = leftPad + (i + 0.5) * colStep;
      const colX = cx - colW / 2;
      const colH = (p.records / maxVal) * plotH;
      const colY = baselineY - colH;
      const my = baselineY - (cumPct / 100.0) * plotH;

      const color = paletteMap[p.category] || p.color || '#6B3E2E';
      const lines = getCategoryLines(p.category);
      const cumStr = (cumPct === 100.0) ? '100.0%' : cumPct.toFixed(2) + '%';

      pointsCoords.push({ cx, my, cumPct, cumStr, records: p.records, sharePct, category: p.category });

      const tooltipText = `<strong>${p.category}</strong><br>Confirmed Leaks: <strong>${numFmt(p.records)}</strong> (${sharePct.toFixed(2)}% of total)<br>Cumulative: <strong>${numFmt(cum)}</strong> (${cumStr} of total)<br>• Replaced: ${numFmt(p.replaceCount)} (${p.replacePct}%)<br>• Repaired: ${numFmt(p.repairCount)} (${p.repairPct}%)<br>• Inverter: ${numFmt(p.inverterCount)} | Non-Inv: ${numFmt(p.nonInverterCount)}`;

      const hoverTop = Math.min(colY, topPad) - 20;
      const hoverH = baselineY - hoverTop + 40;

      return `
        <g class="svg-pareto-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <!-- Transparent full-height hover zone -->
          <rect x="${cx - colStep / 2}" y="${hoverTop}" width="${colStep}" height="${hoverH}" fill="transparent" />

          <!-- Vertical Column -->
          <rect x="${colX}" y="${colY}" width="${colW}" height="${colH}" fill="${color}" rx="3" ry="3" />

          <!-- Value Label Above Column: Quantity -->
          <text x="${cx}" y="${colY - 15}" text-anchor="middle" font-size="12" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(p.records)}</text>

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

    // Cumulative Markers and Labels - CRITICAL FIX: ALL LABELS VISIBLE WITH WHITE HALO
    let markersHtml = pointsCoords.map((pt, i) => {
      const lblColor = '#0B3A70';
      const lblY = (pt.my < topPad + 18) ? (pt.my + 16) : (pt.my - 9);
      const halo = 'paint-order="stroke" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"';
      const cumMarkerTooltip = `<strong>Cumulative Share: ${pt.cumStr}</strong><br>${pt.category}<br>Cumulative Leaks: <strong>${numFmt(sortedPoints.slice(0, i + 1).reduce((s, x) => s + x.records, 0))}</strong> of ${numFmt(totalLeaks)}`;

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

  // 5. Chart 4: Top 10 Installed Areas (Horizontal Ranked Lollipop Chart)
  function renderChartTopAreas() {
    const container = document.getElementById('chartTopAreas');
    if (!container) return;

    if (!data.topAreas || data.topAreas.length === 0) {
      container.innerHTML = emptyStateHtml('No service center records found for this period');
      return;
    }

    const sortedAreas = [...data.topAreas].sort((a, b) => b.records - a.records).slice(0, 10);
    const totalTop10 = sortedAreas.reduce((sum, a) => sum + a.records, 0);
    const totalPopulation = data.metadata.totalRecords || 1;
    const top10PctOfTotal = ((totalTop10 / totalPopulation) * 100).toFixed(2);

    const cardSubtitle = container.closest('.chart-card')?.querySelector('.chart-subtitle');
    if (cardSubtitle) {
      cardSubtitle.textContent = `Top 10 Service Centers account for ${numFmt(totalTop10)} records (${top10PctOfTotal}% of total leaks)`;
    }

    const maxBarVal = sortedAreas[0]?.records || 1;
    const maxVal = getNiceMax(maxBarVal);

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

    const numSteps = 4;
    const stepVal = Math.round(maxVal / numSteps);
    const gridVals = [];
    for (let s = 0; s <= numSteps; s++) gridVals.push(s * stepVal);
    if (gridVals[gridVals.length - 1] < maxVal) gridVals.push(maxVal);

    let gridHtml = gridVals.map(val => {
      const x = zeroX + (val / maxVal) * plotW;
      const isZero = val === 0;
      return `
        <line x1="${x.toFixed(1)}" y1="${gridTopY}" x2="${x.toFixed(1)}" y2="${baselineY}" stroke="${isZero ? '#A0B2C6' : '#E2E8F0'}" stroke-dasharray="${isZero ? 'none' : '3 3'}" stroke-width="${isZero ? '1.5' : '1'}" />
        <text x="${x.toFixed(1)}" y="${baselineY + 16}" text-anchor="middle" font-size="10" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    let lollipopsHtml = sortedAreas.map((a, idx) => {
      const y = rowStartY + idx * rowStepY;
      const xVal = zeroX + (a.records / maxVal) * plotW;
      const rank = idx + 1;
      const pillBg = rank <= 3 ? '#D97706' : '#E2E8F0';
      const pillFg = rank <= 3 ? '#FFFFFF' : '#475569';
      const color = a.color || (rank <= 3 ? '#0B3A70' : '#475569');

      const tooltipText = `<strong>${a.center}${a.fullName && a.fullName !== a.center ? ` (${a.fullName})` : ''} (${a.zone})</strong><br>Rank #${rank} Service Center<br>• Confirmed Leaks: <strong>${numFmt(a.records)}</strong> (${a.sharePct}%)<br>• Cumulative: ${a.cumulativeShare}%<br>• Dominant Mode: ${a.dominantLeakPoint}`;

      return `
        <g class="svg-lollipop-row" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <rect x="0" y="${y - 18}" width="${svgW}" height="${rowStepY}" fill="transparent" />
          <circle cx="${rankX}" cy="${y - 4}" r="11" fill="${pillBg}" />
          <text x="${rankX}" y="${y}" text-anchor="middle" font-size="10.5" font-weight="700" fill="${pillFg}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${rank}</text>
          <text x="${nameX}" y="${y}" font-size="12" font-weight="700" fill="#172B3A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${a.center}</text>
          <line class="lollipop-line" x1="${zeroX}" y1="${y - 4}" x2="${xVal.toFixed(1)}" y2="${y - 4}" stroke="${color}" stroke-width="2" stroke-linecap="round" />
          <circle class="lollipop-dot" cx="${xVal.toFixed(1)}" cy="${y - 4}" r="7" fill="${color}" stroke="#FFFFFF" stroke-width="2" />
          <text x="${(xVal + 12).toFixed(1)}" y="${y}" font-size="11.5" font-weight="700" fill="${color}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(a.records)} <tspan font-size="10" font-weight="600" fill="#64748B">(${a.sharePct}%)</tspan></text>
        </g>
      `;
    }).join('');

    const boxW = 130;
    const boxH = 84;
    const boxX = axisEndX - boxW;
    const boxY = baselineY - boxH - 12;
    const boxCenterX = boxX + boxW / 2;
    const summaryTooltip = `<strong>Total (Top 10 Service Centers)</strong><br>${numFmt(totalTop10)} confirmed leakage records<br>${top10PctOfTotal}% of total leaks (${numFmt(totalPopulation)} total)`;

    const summaryBoxHtml = `
      <g class="lollipop-summary-box" style="cursor: pointer;" data-tooltip="${summaryTooltip}">
        <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" rx="8" ry="8" fill="#EDF4F9" stroke="#CBE0F0" stroke-width="1.2" />
        <text x="${boxCenterX}" y="${boxY + 23}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Total (Top 10)</text>
        <text x="${boxCenterX}" y="${boxY + 51}" text-anchor="middle" font-size="22" font-weight="800" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${numFmt(totalTop10)}</text>
        <text x="${boxCenterX}" y="${boxY + 71}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#536778" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">(${top10PctOfTotal}%)</text>
      </g>
    `;

    const axisLineHtml = `
      <line x1="${zeroX}" y1="${baselineY}" x2="${axisEndX}" y2="${baselineY}" stroke="#C0CBD9" stroke-width="1.5" stroke-linecap="square" />
      <text x="${(zeroX + axisEndX) / 2}" y="${baselineY + 44}" text-anchor="middle" font-size="13" font-weight="700" fill="#0B3A70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Number of Records</text>
    `;

    container.innerHTML = `
      <svg class="svg-chart lollipop-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: auto; display: block; overflow: visible;">
        ${gridHtml}
        ${lollipopsHtml}
        ${summaryBoxHtml}
        ${axisLineHtml}
      </svg>
    `;

    container.querySelectorAll('.svg-lollipop-row, .lollipop-summary-box').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 6. Chart 5: Sales-to-Service Operating Duration (Completed Years Histogram)
  function renderChartSalesToService() {
    const container = document.getElementById('chartSalesToService');
    if (!container || !data.duration) return;

    const durData = data.duration.completedYears;
    if (!durData || durData.length === 0) {
      container.innerHTML = emptyStateHtml('No operating duration records found for this period');
      return;
    }
    const svgW = 540;
    const svgH = 360;
    const leftPad = 52;
    const rightPad = 18;
    const topPad = 32;
    const baselineY = 302;
    const plotH = baselineY - topPad;
    const plotW = (svgW - rightPad) - leftPad;

    const maxBarVal = Math.max(...durData.map(d => d.records), 1);
    const maxVal = getNiceMax(maxBarVal);

    const numSteps = 4;
    const stepVal = Math.round(maxVal / numSteps);
    const gridVals = [];
    for (let s = 0; s <= numSteps; s++) gridVals.push(s * stepVal);
    if (gridVals[gridVals.length - 1] < maxVal) gridVals.push(maxVal);

    let gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="${val === 0 ? 'none' : '4 4'}" stroke-width="${val === 0 ? '1.5' : '1'}" />
        <text x="${leftPad - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--chart-axis)" font-family="sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    const stepX = plotW / durData.length; // ~67.14px
    const colW = 38;

    // Dynamic ranking and colors from highest to lowest
    const sortedDur = [...durData].sort((a, b) => b.records - a.records);
    const rankMap = new Map();
    sortedDur.forEach((d, idx) => rankMap.set(d.label, idx));

    const progressionColors = [
      '#8B2E2E', // Rank 1: 2 Years (3,739)
      '#B83B3B', // Rank 2: 1 Year (3,324)
      '#D97706', // Rank 3: < 1 Year (2,207)
      '#D97757', // Rank 4: 3 Years (1,794)
      '#A8A94A', // Rank 5: 4 Years (1,112)
      '#7CAF72', // Rank 6: 6+ Years (772)
      '#A8D5A2'  // Rank 7: 5 Years (731)
    ];

    let columnsHtml = durData.map((d, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const colX = centerX - colW / 2;
      const hCol = (d.records / maxVal) * plotH;
      const yCol = baselineY - hCol;

      const rank = rankMap.get(d.label) ?? 0;
      const fillCol = progressionColors[Math.min(rank, progressionColors.length - 1)];
      const isPeak = d.label === '1 Year' || d.label === '2 Years';
      const labelCol = isPeak ? '#8B2E2E' : '#0B3A70';

      const tooltipText = `<strong>${d.label} (${d.daysRange})</strong><br>• Confirmed Complaints: <strong>${numFmt(d.records)}</strong> (${d.sharePct}%)<br>• Cumulative: ${d.cumulativeShare}%<br>• Lifecycle Phase: <em>${d.phase}</em><br>• Valid Dataset Baseline: ${numFmt(data.duration.totalValidRecords)} records`;

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <rect x="${centerX - stepX / 2}" y="${topPad}" width="${stepX}" height="${plotH + 35}" fill="transparent" />
          <rect x="${colX}" y="${yCol}" width="${colW}" height="${hCol}" fill="${fillCol}" stroke="${fillCol}" stroke-width="0.5" rx="3" ry="3" />
          <text x="${centerX}" y="${yCol - 8}" text-anchor="middle" font-size="${isPeak ? '10' : '9.5'}" font-weight="${isPeak ? '700' : '600'}" fill="${labelCol}" font-family="sans-serif">${numFmt(d.records)} (${d.sharePct}%)</text>
          <text x="${centerX}" y="${baselineY + 18}" text-anchor="middle" font-size="11" font-weight="${isPeak ? '700' : '600'}" fill="${isPeak ? '#8B2E2E' : 'var(--text-primary)'}" font-family="sans-serif">${d.label}</text>
          <text x="${centerX}" y="${baselineY + 32}" text-anchor="middle" font-size="8.5" font-weight="500" fill="var(--text-muted)" font-family="sans-serif">${d.daysRange}</text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: 100%; overflow: visible;">
        ${gridHtml}
        ${columnsHtml}
        <line x1="${leftPad}" y1="${baselineY}" x2="${svgW - rightPad}" y2="${baselineY}" stroke="var(--chart-axis)" stroke-width="1.5" />
      </svg>
    `;

    container.querySelectorAll('.svg-bar-col').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 7. Chart 5B: < 1 Year Service Duration by Quarter (Distribution Pie / Donut Chart)
  function renderChartUnderOneYearQuarters() {
    const container = document.getElementById('chartUnderOneYearQuarters');
    if (!container || !data.duration || !data.duration.underOneYearQuarters) return;

    const quarters = data.duration.underOneYearQuarters;
    const totalCount = quarters.reduce((s, q) => s + q.records, 0);

    if (totalCount === 0) {
      container.innerHTML = `
        <div class="quarter-pie-card-content" style="padding: 24px; text-align: center;">
          <div style="font-size: 13px; font-weight: 600; color: #64748B; margin-top: 20px;">No &lt; 1 Year Infant Mortality Records in this period</div>
          <div class="pie-total-banner" style="margin-top: 30px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Total &lt; 1 Year Infant Mortality: <span style="margin-left: 6px; font-weight: 800; color: #0B3A70;">0 Complaints</span>
          </div>
        </div>
      `;
      return;
    }

    const palette = [
      { color: '#B3261E', textColor: '#FFFFFF' }, // 1st Quarter
      { color: '#D97706', textColor: '#FFFFFF' }, // 2nd Quarter
      { color: '#0D9488', textColor: '#FFFFFF' }, // 3rd Quarter
      { color: '#0B3A70', textColor: '#FFFFFF' }  // 4th Quarter
    ];

    const cx = 160;
    const cy = 160;
    const r = 145;

    let currentDeg = 0;
    const wedgesSvg = [];
    const labelsSvg = [];
    const legendHtml = [];

    quarters.forEach((q, idx) => {
      const p = palette[idx] || { color: '#0B3A70', textColor: '#FFFFFF' };
      const share = totalCount > 0 ? q.records / totalCount : 0;
      const angleDeg = share * 360.0;
      const startDeg = currentDeg;
      const endDeg = currentDeg + angleDeg;
      const midDeg = (startDeg + endDeg) / 2.0;

      const tooltipText = `<strong>${q.quarter} (${q.monthsRange})</strong><br>• Elapsed Days: ${q.elapsedDays}<br>• Confirmed Records: <strong>${numFmt(q.records)}</strong> (${q.sharePct}%)<br>• Engineering Trajectory: <em>${q.engineeringTrajectory}</em>`;

      if (q.records > 0 && angleDeg > 0) {
        if (Math.abs(angleDeg - 360.0) < 0.01) {
          wedgesSvg.push(`<circle class="pie-slice slice-q${idx + 1}" data-tooltip="${tooltipText}" cx="${cx}" cy="${cy}" r="${r}" fill="${p.color}" stroke="#FFFFFF" stroke-width="2.5" />`);
          labelsSvg.push(`<text class="pie-label label-q${idx + 1}" x="${cx}" y="${cy}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" pointer-events="none">
            <tspan x="${cx}" dy="-4" font-size="14" font-weight="700" fill="${p.textColor}">${numFmt(q.records)}</tspan>
            <tspan x="${cx}" dy="18" font-size="11.5" font-weight="600" fill="${p.textColor}">(${q.sharePct}%)</tspan>
          </text>`);
        } else {
          const startRad = (startDeg * Math.PI) / 180;
          const endRad = (endDeg * Math.PI) / 180;
          const midRad = (midDeg * Math.PI) / 180;

          const x1 = (cx + r * Math.sin(startRad)).toFixed(2);
          const y1 = (cy - r * Math.cos(startRad)).toFixed(2);
          const x2 = (cx + r * Math.sin(endRad)).toFixed(2);
          const y2 = (cy - r * Math.cos(endRad)).toFixed(2);

          const largeArc = angleDeg > 180 ? 1 : 0;
          const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

          const lr = r * 0.63;
          const lx = (cx + lr * Math.sin(midRad)).toFixed(1);
          const ly = (cy - lr * Math.cos(midRad)).toFixed(1);

          wedgesSvg.push(`<path class="pie-slice slice-q${idx + 1}" data-tooltip="${tooltipText}" d="${pathD}" fill="${p.color}" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round" />`);

          if (angleDeg >= 12) {
            labelsSvg.push(`<text class="pie-label label-q${idx + 1}" x="${lx}" y="${ly}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" pointer-events="none">
              <tspan x="${lx}" dy="-4" font-size="13.5" font-weight="700" fill="${p.textColor}">${numFmt(q.records)}</tspan>
              <tspan x="${lx}" dy="16" font-size="11" font-weight="600" fill="${p.textColor}">(${q.sharePct}%)</tspan>
            </text>`);
          }
        }
      }

      legendHtml.push(`
        <div class="pie-legend-item item-q${idx + 1}" data-tooltip="${tooltipText}">
          <div class="pie-legend-left">
            <div class="pie-legend-dot" style="background: ${p.color};"></div>
            <div>
              <div class="pie-legend-title">${q.quarter}</div>
              <div class="pie-legend-range">${q.monthsRange} (${q.elapsedDays})</div>
            </div>
          </div>
          <div class="pie-legend-right">
            <div class="pie-legend-count">${numFmt(q.records)}</div>
            <div class="pie-legend-pct">(${q.sharePct}%)</div>
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 8px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Total &lt; 1 Year Infant Mortality: <span style="margin-left: 6px; font-weight: 800; color: #0B3A70;">${numFmt(totalCount)} Complaints</span>
        </div>
      </div>
    `;

    container.innerHTML = content;

    container.querySelectorAll('.pie-slice, .pie-legend-item').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 8. Chart 6: Capacity / Tonnage Distribution
  function renderChartCapacity() {
    const container = document.getElementById('chartCapacity');
    if (!container || !data.capacities) return;

    const caps = data.capacities.slice(0, 5); // 1.5T, 2T, 1T, 2.5T, 4T
    if (!caps || caps.length === 0) {
      container.innerHTML = emptyStateHtml('No capacity records found for this period');
      return;
    }
    const svgW = 540;
    const svgH = 360;
    const leftPad = 52;
    const rightPad = 18;
    const topPad = 32;
    const baselineY = 302;
    const plotH = baselineY - topPad;
    const plotW = (svgW - rightPad) - leftPad;

    const maxBarVal = Math.max(...caps.map(c => c.records), 1);
    const maxVal = getNiceMax(maxBarVal);

    const numSteps = 4;
    const stepVal = Math.round(maxVal / numSteps);
    const gridVals = [];
    for (let s = 0; s <= numSteps; s++) gridVals.push(s * stepVal);
    if (gridVals[gridVals.length - 1] < maxVal) gridVals.push(maxVal);

    let gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="${val === 0 ? 'none' : '4 4'}" stroke-width="${val === 0 ? '1.5' : '1'}" />
        <text x="${leftPad - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--chart-axis)" font-family="sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    const stepX = plotW / caps.length;
    const colW = 44;
    const colors = ['#0B3A70', '#B3261E', '#D97706', '#0D9488', '#64748B'];

    const barsHtml = caps.map((c, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const colX = centerX - colW / 2;
      const h = (c.records / maxVal) * plotH;
      const y = baselineY - h;
      const colColor = colors[i % colors.length];

      const tooltipText = `<strong>${c.size}</strong><br>• Confirmed Complaints: <strong>${numFmt(c.records)}</strong> (${c.sharePct}%)<br>• Inverter Share: <strong>${c.inverterShare}%</strong> | Non-Inv: ${c.nonInverterShare}%<br>• Dominant Leak Point: <em>${c.dominantLeakPoint}</em>`;

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <rect x="${centerX - stepX / 2}" y="${topPad}" width="${stepX}" height="${plotH + 35}" fill="transparent" />
          <rect x="${colX}" y="${y}" width="${colW}" height="${h}" fill="${colColor}" rx="3" ry="3" />
          <text x="${centerX}" y="${y - 8}" text-anchor="middle" font-size="10" font-weight="700" fill="${colColor}" font-family="sans-serif">${numFmt(c.records)} (${c.sharePct}%)</text>
          <text x="${centerX}" y="${baselineY + 20}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1E293B" font-family="sans-serif">${c.size}</text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: 100%; overflow: visible;">
        ${gridHtml}
        ${barsHtml}
        <line x1="${leftPad}" y1="${baselineY}" x2="${svgW - rightPad}" y2="${baselineY}" stroke="var(--chart-axis)" stroke-width="1.5" />
      </svg>
    `;

    container.querySelectorAll('.svg-bar-col').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  // 9. Chart 7: Year-Wise Replace vs. Repair
  function renderChartReplaceVsRepair() {
    const container = document.getElementById('chartReplaceVsRepair');
    if (!container || !data.yearly) return;

    const yearlyData = data.yearly;
    if (!yearlyData || yearlyData.length === 0) {
      container.innerHTML = emptyStateHtml('No corrective action records found for this period');
      return;
    }
    const svgW = 540;
    const svgH = 360;
    const leftPad = 52;
    const rightPad = 18;
    const topPad = 32;
    const baselineY = 302;
    const plotH = baselineY - topPad;
    const plotW = (svgW - rightPad) - leftPad;

    const maxBarVal = Math.max(...yearlyData.map(d => Math.max(d.replace, d.repair, 0)), 1);
    const maxVal = getNiceMax(maxBarVal);

    const numSteps = 5;
    const stepVal = Math.round(maxVal / numSteps);
    const gridVals = [];
    for (let s = 0; s <= numSteps; s++) gridVals.push(s * stepVal);
    if (gridVals[gridVals.length - 1] < maxVal) gridVals.push(maxVal);

    const gridHtml = gridVals.map(val => {
      const y = baselineY - (val / maxVal) * plotH;
      return `
        <line x1="${leftPad}" y1="${y}" x2="${svgW - rightPad}" y2="${y}" stroke="var(--chart-grid)" stroke-dasharray="${val === 0 ? 'none' : '4 4'}" stroke-width="${val === 0 ? '1.5' : '1'}" />
        <text x="${leftPad - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--chart-axis)" font-family="sans-serif">${numFmt(val)}</text>
      `;
    }).join('');

    const stepX = plotW / yearlyData.length;
    const colW = 28;
    const colGap = 4;
    const groupW = colW * 2 + colGap;

    const barsHtml = yearlyData.map((d, i) => {
      const centerX = leftPad + (i + 0.5) * stepX;
      const groupX = centerX - groupW / 2;
      const xRep = groupX;
      const xRpr = groupX + colW + colGap;

      const hRep = (d.replace / maxVal) * plotH;
      const hRpr = (d.repair / maxVal) * plotH;

      const yRep = baselineY - hRep;
      const yRpr = baselineY - hRpr;

      const tooltipText = `<strong>${d.year} Corrective Actions</strong><br>• Total Leaks: <strong>${numFmt(d.total)}</strong><br>• Replace: <strong>${numFmt(d.replace)}</strong> (${d.replaceShare}%)<br>• Repair: <strong>${numFmt(d.repair)}</strong> (${d.repairShare}%)<br>• Action Status: ${d.year >= 2025 ? '★ Repair Dominant Period' : 'Replacement Dominant Period'}`;

      return `
        <g class="svg-bar-col" style="cursor: pointer;" data-tooltip="${tooltipText}">
          <rect x="${centerX - stepX / 2}" y="${topPad}" width="${stepX}" height="${plotH + 35}" fill="transparent" />

          <!-- Replace Column (#0B3A70) -->
          <rect class="rr-bar-rect" x="${xRep.toFixed(2)}" y="${yRep.toFixed(2)}" width="${colW}" height="${hRep.toFixed(2)}" fill="#0B3A70" rx="3" ry="3" />

          <!-- Repair Column (#0D9488) -->
          <rect class="rr-bar-rect" x="${xRpr.toFixed(2)}" y="${yRpr.toFixed(2)}" width="${colW}" height="${hRpr.toFixed(2)}" fill="#0D9488" rx="3" ry="3" />

          <!-- Value Labels -->
          <text x="${(xRep + colW / 2).toFixed(2)}" y="${(yRep - 6).toFixed(2)}" text-anchor="middle" font-size="9" font-weight="700" fill="#0B3A70" font-family="sans-serif">${numFmt(d.replace)}</text>
          <text x="${(xRpr + colW / 2).toFixed(2)}" y="${(yRpr - 6).toFixed(2)}" text-anchor="middle" font-size="9" font-weight="700" fill="#0D9488" font-family="sans-serif">${numFmt(d.repair)}</text>

          <!-- Year label below -->
          <text x="${centerX.toFixed(2)}" y="${(baselineY + 20).toFixed(2)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1E293B" font-family="sans-serif">${d.year}</text>
        </g>
      `;
    }).join('');

    container.innerHTML = `
      <svg class="svg-chart" viewBox="0 0 ${svgW} ${svgH}" style="width: 100%; height: 100%; overflow: visible;">
        ${gridHtml}
        ${barsHtml}
        <line x1="${leftPad}" y1="${baselineY}" x2="${svgW - rightPad}" y2="${baselineY}" stroke="var(--chart-axis)" stroke-width="1.5" />
      </svg>
    `;

    container.querySelectorAll('.svg-bar-col').forEach(el => {
      el.addEventListener('mouseenter', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mousemove', (e) => showTooltip(e, el.dataset.tooltip));
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  function renderReplaceRepairAuditCard() {
    const totalReplace = data.yearly.reduce((acc, y) => acc + y.replace, 0);
    const totalRepair = data.yearly.reduce((acc, y) => acc + y.repair, 0);
    const totalRecords = data.metadata.totalRecords;

    const repShare = (totalReplace / totalRecords * 100).toFixed(2);
    const rprShare = (totalRepair / totalRecords * 100).toFixed(2);

    const elTotal = document.getElementById('rrMetricTotal');
    const elRep = document.getElementById('rrMetricReplace');
    const elRepLbl = document.getElementById('rrMetricReplaceLbl');
    const elRpr = document.getElementById('rrMetricRepair');
    const elRprLbl = document.getElementById('rrMetricRepairLbl');

    if (elTotal) elTotal.textContent = numFmt(totalRecords);
    if (elRep) elRep.textContent = numFmt(totalReplace);
    if (elRepLbl) elRepLbl.textContent = `Replace (${repShare}%)`;
    if (elRpr) elRpr.textContent = numFmt(totalRepair);
    if (elRprLbl) elRprLbl.textContent = `Repair (${rprShare}%)`;
  }

  // 10. Tables
  function renderTableYearly() {
    const tbody = document.getElementById('tbodyYearly');
    if (!tbody) return;

    tbody.innerHTML = data.yearly.map(d => `
      <tr>
        <td style="font-weight: 700;">${d.year}</td>
        <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(d.total)}</td>
        <td class="col-num">${numFmt(d.uniqueUnits)}</td>
        <td class="col-num">${numFmt(d.repeatVisits)} <span style="font-size: 11px; color: #64748B;">(${d.repeatPct}%)</span></td>
        <td class="col-num" style="color: #0B3A70;">${numFmt(d.inverter)} <span style="font-size: 11px;">(${d.inverterShare}%)</span></td>
        <td class="col-num" style="color: #7B5E3C;">${numFmt(d.nonInverter)} <span style="font-size: 11px;">(${d.nonInverterShare}%)</span></td>
        <td class="col-num">${numFmt(d.replace)} <span style="font-size: 11px;">(${d.replaceShare}%)</span></td>
        <td class="col-num">${numFmt(d.repair)} <span style="font-size: 11px;">(${d.repairShare}%)</span></td>
        <td class="col-num" style="color: #0D9488;">${numFmt(d.warrYes)}</td>
        <td class="col-num" style="color: #64748B;">${numFmt(d.warrNo)}</td>
      </tr>
    `).join('');

    const tfoot = document.getElementById('tfootYearly');
    if (tfoot) {
      const meta = data.metadata;
      const totRep = data.yearly.reduce((a, b) => a + b.replace, 0);
      const totRpr = data.yearly.reduce((a, b) => a + b.repair, 0);
      tfoot.innerHTML = `
        <tr style="font-weight: 700; background: var(--bg-hover);">
          <td>TOTAL</td>
          <td class="col-num" style="color: #0B3A70;">${numFmt(meta.totalRecords)}</td>
          <td class="col-num">${numFmt(meta.uniqueUnits)}</td>
          <td class="col-num">${numFmt(meta.repeatEvents)} (${pctFmt(meta.repeatRatePct)})</td>
          <td class="col-num" style="color: #0B3A70;">${numFmt(meta.inverterRecords)} (${pctFmt(meta.inverterSharePct)})</td>
          <td class="col-num" style="color: #7B5E3C;">${numFmt(meta.nonInverterRecords)} (${pctFmt(meta.nonInverterSharePct)})</td>
          <td class="col-num">${numFmt(totRep)} (${pctFmt(totRep / meta.totalRecords * 100)})</td>
          <td class="col-num">${numFmt(totRpr)} (${pctFmt(totRpr / meta.totalRecords * 100)})</td>
          <td class="col-num" style="color: #0D9488;">${numFmt(meta.underWarrantyRecords)}</td>
          <td class="col-num" style="color: #64748B;">${numFmt(meta.totalRecords - meta.underWarrantyRecords)}</td>
        </tr>
      `;
    }
  }

  function renderTableMonthly() {
    const tbody = document.getElementById('tbodyMonthly');
    if (!tbody) return;

    let filtered = data.monthly;
    if (state.monthYearFilter !== 'all') {
      const yr = Number(state.monthYearFilter);
      filtered = filtered.filter(d => d.year === yr);
    }
    if (state.monthSearchQuery) {
      filtered = filtered.filter(d => d.period.includes(state.monthSearchQuery) || d.month.toLowerCase().includes(state.monthSearchQuery));
    }

    tbody.innerHTML = filtered.map(d => {
      const invPct = d.total > 0 ? (d.inverter / d.total * 100).toFixed(1) : '0.0';
      const nonPct = d.total > 0 ? (d.nonInverter / d.total * 100).toFixed(1) : '0.0';
      return `
        <tr>
          <td style="font-weight: 700;">${d.period}</td>
          <td>${d.year}</td>
          <td>${d.month}</td>
          <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(d.total)}</td>
          <td class="col-num" style="color: #0B3A70;">${numFmt(d.inverter)} <span style="font-size: 11px;">(${invPct}%)</span></td>
          <td class="col-num" style="color: #7B5E3C;">${numFmt(d.nonInverter)} <span style="font-size: 11px;">(${nonPct}%)</span></td>
          <td class="col-num">${numFmt(d.replace)}</td>
          <td class="col-num">${numFmt(d.repair)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderTablePoints() {
    const tbody = document.getElementById('tbodyPoints');
    if (!tbody) return;

    tbody.innerHTML = data.leakagePoints.map(p => `
      <tr>
        <td style="font-weight: 700; text-align: center;">${p.rank}</td>
        <td>
          <div style="font-weight: 700; color: #1E293B;">${p.category}</div>
          <div style="font-size: 11.5px; color: #64748B;">${p.description}</div>
        </td>
        <td class="col-num" style="font-weight: 700; color: ${p.color};">${numFmt(p.records)}</td>
        <td class="col-num" style="font-weight: 600;">${p.sharePct}%</td>
        <td class="col-num">${p.cumulativeShare}%</td>
        <td class="col-num">${numFmt(p.replaceCount)} <span style="font-size: 11px; color: #64748B;">(${p.replacePct}%)</span></td>
        <td class="col-num">${numFmt(p.repairCount)} <span style="font-size: 11px; color: #64748B;">(${p.repairPct}%)</span></td>
        <td class="col-num">${numFmt(p.inverterCount)} / ${numFmt(p.nonInverterCount)}</td>
      </tr>
    `).join('');
  }

  function renderTableAreas() {
    const tbody = document.getElementById('tbodyAreas');
    if (!tbody) return;

    tbody.innerHTML = data.topAreas.map(a => `
      <tr>
        <td style="font-weight: 700; text-align: center;">${a.rank}</td>
        <td style="font-weight: 700; color: #1E293B;">${a.center}</td>
        <td><span class="kpi-badge badge-mfc">${a.zone}</span></td>
        <td class="col-num" style="font-weight: 700; color: ${a.color};">${numFmt(a.records)}</td>
        <td class="col-num" style="font-weight: 600;">${a.sharePct}%</td>
        <td class="col-num">${a.cumulativeShare}%</td>
        <td style="font-size: 12px; color: #475569;">${a.dominantLeakPoint}</td>
      </tr>
    `).join('');
  }

  function renderTableSalesToService() {
    const tbody = document.getElementById('tbodySalesToService');
    if (!tbody) return;

    tbody.innerHTML = data.duration.completedYears.map(d => `
      <tr>
        <td style="font-weight: 700;">${d.label}</td>
        <td><code>${d.daysRange}</code></td>
        <td class="col-num" style="font-weight: 700; color: ${d.color};">${numFmt(d.records)}</td>
        <td class="col-num" style="font-weight: 600;">${d.sharePct}%</td>
        <td class="col-num">${d.cumulativeShare}%</td>
        <td style="font-size: 12px; color: #475569;">${d.phase}</td>
      </tr>
    `).join('');
  }

  function renderTableCapacity() {
    const tbody = document.getElementById('tbodyCapacity');
    if (!tbody) return;

    tbody.innerHTML = data.capacities.map(c => `
      <tr>
        <td style="font-weight: 700;">${c.size}</td>
        <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(c.records)}</td>
        <td class="col-num" style="font-weight: 600;">${c.sharePct}%</td>
        <td class="col-num" style="color: #0B3A70;">${c.inverterShare}%</td>
        <td class="col-num" style="color: #7B5E3C;">${c.nonInverterShare}%</td>
        <td style="font-size: 12px; color: #475569;">${c.dominantLeakPoint}</td>
      </tr>
    `).join('');
  }

  function renderTableTopModels() {
    const tbody = document.getElementById('tbodyModels');
    if (!tbody) return;

    tbody.innerHTML = data.topModels.map(m => `
      <tr>
        <td style="font-weight: 700; text-align: center;">${m.rank}</td>
        <td style="font-weight: 700; color: #1E293B;">${m.modelWithVersion}</td>
        <td><code>${m.baseModel}</code></td>
        <td><span class="kpi-badge badge-mfc">${m.capacity}</span></td>
        <td><span class="kpi-badge ${m.technology === 'Inverter' ? 'badge-mfc' : 'badge-cu'}">${m.technology}</span></td>
        <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(m.records)}</td>
        <td class="col-num" style="font-weight: 600;">${m.sharePct}%</td>
        <td class="col-num">${m.cumulativeShare}%</td>
        <td style="font-size: 12px; color: #475569;">${m.primaryLeakPoint}</td>
      </tr>
    `).join('');
  }

  function renderTableReplaceRepair() {
    const tbody = document.getElementById('tbodyReplaceRepair');
    if (!tbody) return;

    tbody.innerHTML = data.yearly.map(d => `
      <tr>
        <td style="font-weight: 700;">${d.year}</td>
        <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(d.total)}</td>
        <td class="col-num" style="color: #0B3A70; font-weight: 700;">${numFmt(d.replace)} <span style="font-size: 11px;">(${d.replaceShare}%)</span></td>
        <td class="col-num" style="color: #0D9488; font-weight: 700;">${numFmt(d.repair)} <span style="font-size: 11px;">(${d.repairShare}%)</span></td>
        <td class="col-num">${numFmt(d.bothReplaceRepair)}</td>
        <td class="col-num">${numFmt(d.gasOnly)}</td>
        <td class="col-num">${numFmt(d.otherAction)}</td>
      </tr>
    `).join('');
  }

  function renderTableRepeatVisits() {
    const tbody = document.getElementById('tbodyRepeat');
    if (!tbody) return;

    tbody.innerHTML = data.repeatVisits.map(r => `
      <tr>
        <td style="font-weight: 700; text-align: center;">${r.visits} Visit(s)</td>
        <td class="col-num" style="font-weight: 700; color: #0B3A70;">${numFmt(r.units)}</td>
        <td class="col-num" style="font-weight: 600;">${r.shareUnitsPct}%</td>
        <td class="col-num" style="font-weight: 700; color: #B3261E;">${numFmt(r.events)}</td>
        <td class="col-num" style="font-weight: 600;">${r.shareEventsPct}%</td>
      </tr>
    `).join('');
  }

  // 11. CSV Exports
  function exportMainCSV() {
    let csv = 'Year,Total Complaints,Unique Units,Repeats,Inverter,Non-Inverter,Replace,Repair,Warranty YES,Warranty NO\n';
    data.yearly.forEach(d => {
      csv += `${d.year},${d.total},${d.uniqueUnits},${d.repeatVisits},${d.inverter},${d.nonInverter},${d.replace},${d.repair},${d.warrYes},${d.warrNo}\n`;
    });
    downloadCSV(csv, 'walton_evaporator_yearly_summary.csv');
  }

  function exportDurationCSV() {
    let csv = 'Completed Years,Days Range,Records,Share %,Cumulative %,Operational Phase\n';
    data.duration.completedYears.forEach(d => {
      csv += `"${d.label}","${d.daysRange}",${d.records},${d.sharePct},${d.cumulativeShare},"${d.phase}"\n`;
    });
    downloadCSV(csv, 'walton_evaporator_duration_distribution.csv');
  }

  function exportReplaceRepairCSV() {
    let csv = 'Year,Total Complaints,Replace,Replace %,Repair,Repair %,Both Replace & Repair,Gas Only,Other\n';
    data.yearly.forEach(d => {
      csv += `${d.year},${d.total},${d.replace},${d.replaceShare},${d.repair},${d.repairShare},${d.bothReplaceRepair},${d.gasOnly},${d.otherAction}\n`;
    });
    downloadCSV(csv, 'walton_evaporator_replace_vs_repair.csv');
  }

  function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Run
  init();
});
