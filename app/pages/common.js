/* ============================================================
   Common Customers Page — Cross-Module Read-Only View
   Reads: gv_customers (Gold Loan), TLP_customers (Khata),
          nsp_customers / salesCustomers (NSP/Sales)
   NEVER writes. Safe by design.
   ============================================================ */
const CommonCustomersPage = (() => {
  'use strict';

  /* ── State ─────────────────────────────────────────────── */
  let _filterMode = 'common';   // 'common' | 'all'
  let _sortOrder  = 'asc';
  let _searchQ    = '';

  /* ── localStorage helpers ──────────────────────────────── */
  function _safeRead(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[CommonCustomers] Cannot parse', key, e);
      return null;
    }
  }

  function _normMobile(val) {
    if (!val) return '';
    return String(val).replace(/\D/g, '').slice(-10);
  }

  /* ── Data Loading ──────────────────────────────────────── */
  function getAllData() {
    // Gold Loan
    const gold = (_safeRead('gv_customers') || []).map(c => ({
      name:    (c.name || '').trim(),
      village: (c.address || '').trim(),
      mobile:  _normMobile(c.mobile || c.phone),
      status:  c.status || 'active',
      source:  'Gold Loan'
    })).filter(c => c.name && c.mobile);

    // Khata Shop
    const khata = (_safeRead('TLP_customers') || []).map(c => ({
      name:    (c.name || '').trim(),
      village: (c.address || '').trim(),
      mobile:  _normMobile(c.phone  || c.mobile),
      status:  c.status || 'active',
      source:  'Khata'
    })).filter(c => c.name && c.mobile);

    // NSP Sales — try multiple possible keys (graceful fallback)
    const nspRaw =
      _safeRead('salesCustomers') ||
      _safeRead('khataCustomers') ||
      _safeRead('nsp_customers')  ||
      _safeRead('goldCustomers')  ||
      [];
    const sales = nspRaw.map(c => ({
      name:    (c.name || c.customerName || '').trim(),
      village: (c.address || c.village || c.city || '').trim(),
      mobile:  _normMobile(c.mobile || c.phone),
      status:  c.status || 'active',
      source:  'Sales'
    })).filter(c => c.name && c.mobile);

    return { gold, khata, sales };
  }

  /* ── Build combined map ────────────────────────────────── */
  function buildMap() {
    const { gold, khata, sales } = getAllData();
    const map = {};

    function addToMap(list, sourceLabel) {
      list.forEach(c => {
        if (!c.name || !c.mobile) return;         // skip entries without mobile
        const key = c.mobile;                      // ← MOBILE NUMBER as key
        if (!map[key]) {
          map[key] = {
            name:    c.name,
            village: c.village || '',
            mobile:  c.mobile,
            sources: [],
            statuses: []
          };
        }
        // Prefer non-empty village
        if (!map[key].village && c.village) map[key].village = c.village;
        map[key].sources.push(sourceLabel);
        map[key].statuses.push((c.status || 'active').toLowerCase());
      });
    }

    addToMap(gold,  'Gold Loan');
    addToMap(khata, 'Khata');
    addToMap(sales, 'Sales');

    return Object.values(map);
  }

  /* ── Status resolver ───────────────────────────────────── */
  function getFinalStatus(statuses) {
    if (statuses.includes('pending'))  return 'Pending';
    if (statuses.includes('closed'))   return 'Closed';
    return 'Active';
  }

  /* ── Sort & Group by village ───────────────────────────── */
  function sortAndGroup(data) {
    const sorted = [...data].sort((a, b) =>
      _sortOrder === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    );

    const grouped = {};
    sorted.forEach(c => {
      const v = c.village || 'Unknown / No Village';
      if (!grouped[v]) grouped[v] = [];
      grouped[v].push(c);
    });
    return grouped;
  }

  /* ── Source badge HTML ─────────────────────────────────── */
  function _sourceBadge(src) {
    const cfg = {
      'Gold Loan': { bg: 'rgba(246,211,101,0.18)', color: '#b45309', border: 'rgba(246,211,101,0.45)', icon: '🪙' },
      'Khata':     { bg: 'rgba(99,102,241,0.13)',   color: '#4f46e5', border: 'rgba(99,102,241,0.35)',  icon: '📒' },
      'Sales':     { bg: 'rgba(16,185,129,0.14)',   color: '#059669', border: 'rgba(16,185,129,0.35)', icon: '🧾' },
    };
    const s = cfg[src] || { bg: 'var(--bg-input)', color: 'var(--text-muted)', border: 'var(--border-color)', icon: '📌' };
    return `<span class="cc-source-badge" style="background:${s.bg};color:${s.color};border-color:${s.border};">${s.icon} ${src}</span>`;
  }

  /* ── Status badge HTML ─────────────────────────────────── */
  function _statusBadge(status) {
    const cfg = {
      'Active':  { color: '#059669', bg: 'rgba(16,185,129,0.12)', icon: '🟢' },
      'Pending': { color: '#d97706', bg: 'rgba(217,119,6,0.12)',  icon: '🟡' },
      'Closed':  { color: '#6b7280', bg: 'rgba(107,114,128,0.12)',icon: '⚫' },
    };
    const c = cfg[status] || cfg['Active'];
    return `<span class="cc-status" style="color:${c.color};background:${c.bg};">${c.icon} ${status}</span>`;
  }

  /* ── Single customer card ──────────────────────────────── */
  function _card(c) {
    const uniqueSources = [...new Set(c.sources)];
    const status = getFinalStatus(c.statuses);
    const initial = (c.name[0] || '?').toUpperCase();

    return `
    <div class="cc-card">
      <div class="cc-card-top">
        <div class="cc-avatar">${initial}</div>
        <div class="cc-info">
          <div class="cc-name">${c.name}</div>
          ${c.mobile ? `<div class="cc-phone">📱 ${c.mobile}</div>` : ''}
        </div>
        <div class="cc-card-right">
          ${_statusBadge(status)}
          <span class="cc-source-count">${uniqueSources.length} module${uniqueSources.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="cc-sources">
        ${uniqueSources.map(_sourceBadge).join('')}
      </div>
    </div>`;
  }

  /* ── Summary stats ─────────────────────────────────────── */
  function _buildStats(all) {
    const common = all.filter(c => [...new Set(c.sources)].length >= 2);
    const statuses = all.map(c => getFinalStatus(c.statuses));
    return {
      total:   all.length,
      common:  common.length,
      active:  statuses.filter(s => s === 'Active').length,
      pending: statuses.filter(s => s === 'Pending').length,
      closed:  statuses.filter(s => s === 'Closed').length,
    };
  }

  /* ── Main Render ───────────────────────────────────────── */
  function render(container) {
    const allData = buildMap();
    const { gold, khata, sales } = getAllData();
    const stats = _buildStats(allData);

    // Apply filter
    let filtered = _filterMode === 'common'
      ? allData.filter(c => [...new Set(c.sources)].length >= 2)
      : allData;

    // Apply search
    if (_searchQ) {
      const q = _searchQ.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.village.toLowerCase().includes(q) ||
        c.mobile.includes(q)
      );
    }

    const grouped = sortAndGroup(filtered);
    const villageKeys = Object.keys(grouped).sort();

    // ── Mark data source availability
    const sourceStatus = {
      'Gold Loan': gold.length,
      'Khata':     khata.length,
      'Sales':     sales.length
    };

    container.innerHTML = `
    <div class="cc-page">

      <!-- Header -->
      <div class="cc-header">
        <div class="cc-header-left">
          <h2 class="cc-title" data-i18n="nav_common">🔗 ${I18n.t('nav_common')}</h2>
          <p class="cc-subtitle">Customers shared across modules — Read Only View</p>
        </div>
        <div class="cc-header-right">
          <button class="btn btn-outline btn-sm" onclick="CommonCustomersPage.refresh()" title="Refresh data">
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Data Source Indicators -->
      <div class="cc-sources-bar">
        ${Object.entries(sourceStatus).map(([src, count]) => {
          const cfg = {
            'Gold Loan': { icon: '🪙', color: '#b45309' },
            'Khata':     { icon: '📒', color: '#4f46e5' },
            'Sales':     { icon: '🧾', color: '#059669' },
          };
          const s = cfg[src];
          return `
          <div class="cc-src-indicator ${count > 0 ? 'cc-src-active' : 'cc-src-empty'}">
            <span>${s.icon}</span>
            <div>
              <div class="cc-src-name" style="color:${count > 0 ? s.color : 'var(--text-muted)'}">${src}</div>
              <div class="cc-src-count">${count > 0 ? count + ' customers' : 'No data'}</div>
            </div>
            <div class="cc-src-dot" style="background:${count > 0 ? '#22c55e' : '#ef4444'}"></div>
          </div>`;
        }).join('')}
      </div>

      <!-- KPIs -->
      <div class="cc-kpi-row">
        <div class="cc-kpi cc-kpi-blue">
          <div class="cc-kpi-value">${stats.total}</div>
          <div class="cc-kpi-label">Total Customers</div>
        </div>
        <div class="cc-kpi cc-kpi-gold">
          <div class="cc-kpi-value">${stats.common}</div>
          <div class="cc-kpi-label">Common (2+ modules)</div>
        </div>
        <div class="cc-kpi cc-kpi-green">
          <div class="cc-kpi-value">${stats.active}</div>
          <div class="cc-kpi-label">Active</div>
        </div>
        <div class="cc-kpi cc-kpi-orange">
          <div class="cc-kpi-value">${stats.pending}</div>
          <div class="cc-kpi-label">Pending</div>
        </div>
      </div>

      <!-- Controls -->
      <div class="cc-controls">
        <!-- Search -->
        <input type="text" class="search-input" id="cc-search"
          placeholder="🔍 Search by name, village or mobile…"
          value="${_searchQ}"
          oninput="CommonCustomersPage.onSearch(this.value)"
          style="flex:1;min-width:220px;">

        <!-- Filter tabs -->
        <div class="cc-filter-tabs">
          <button class="cc-tab ${_filterMode === 'common' ? 'cc-tab-active' : ''}"
            onclick="CommonCustomersPage.setFilter('common')">
            🔗 Common Only
            <span class="cc-tab-badge">${stats.common}</span>
          </button>
          <button class="cc-tab ${_filterMode === 'all' ? 'cc-tab-active' : ''}"
            onclick="CommonCustomersPage.setFilter('all')">
            👥 All Customers
            <span class="cc-tab-badge">${stats.total}</span>
          </button>
        </div>

        <!-- Sort -->
        <button class="btn btn-ghost btn-sm" onclick="CommonCustomersPage.toggleSort()">
          ${_sortOrder === 'asc' ? '⬆ A→Z' : '⬇ Z→A'}
        </button>
      </div>

      <!-- Results -->
      <div id="cc-results">
        ${filtered.length === 0 ? `
          <div class="empty-state" style="margin-top:48px;">
            <div class="empty-state-icon">🔍</div>
            <h3>${_searchQ ? 'No results found' : (_filterMode === 'common' ? 'No common customers yet' : 'No customers in any module')}</h3>
            <p>${_searchQ ? 'Try a different search term.' : 'Add customers to multiple modules to see them here.'}</p>
          </div>
        ` : villageKeys.map(village => {
          const list = grouped[village];
          return `
          <div class="cc-village-group">
            <div class="cc-village-header">
              <span class="cc-village-pin">📍</span>
              <span class="cc-village-name">${village}</span>
              <span class="cc-village-count">${list.length} customer${list.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="cc-cards-grid">
              ${list.map(_card).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Footer note -->
      <div class="cc-footer-note">
        <span>🔐 Read-only system — No data is written or modified</span>
        <span class="text-muted" style="font-size:0.75rem;">Last refreshed: ${new Date().toLocaleTimeString('en-IN')}</span>
      </div>

    </div>`;

    _injectStyles();
  }

  /* ── Event handlers (called from inline HTML) ──────────── */
  function setFilter(mode) {
    _filterMode = mode;
    render(document.getElementById('page-container'));
  }

  function toggleSort() {
    _sortOrder = _sortOrder === 'asc' ? 'desc' : 'asc';
    render(document.getElementById('page-container'));
  }

  function onSearch(query) {
    _searchQ = query.toLowerCase().trim();
    _renderResults();
  }

  // Lightweight re-render of just the cards (no full page rebuild)
  function _renderResults() {
    const allData = buildMap();
    let filtered = _filterMode === 'common'
      ? allData.filter(c => [...new Set(c.sources)].length >= 2)
      : allData;
    if (_searchQ) {
      const q = _searchQ;
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.village.toLowerCase().includes(q) ||
        c.mobile.includes(q)
      );
    }
    const grouped = sortAndGroup(filtered);
    const villageKeys = Object.keys(grouped).sort();
    const el = document.getElementById('cc-results');
    if (!el) return;

    el.innerHTML = filtered.length === 0 ? `
      <div class="empty-state" style="margin-top:48px;">
        <div class="empty-state-icon">🔍</div>
        <h3>No results found</h3>
        <p>Try a different search term.</p>
      </div>
    ` : villageKeys.map(village => {
      const list = grouped[village];
      return `
      <div class="cc-village-group">
        <div class="cc-village-header">
          <span class="cc-village-pin">📍</span>
          <span class="cc-village-name">${village}</span>
          <span class="cc-village-count">${list.length} customer${list.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="cc-cards-grid">
          ${list.map(_card).join('')}
        </div>
      </div>`;
    }).join('');
  }

  function refresh() {
    render(document.getElementById('page-container'));
    // Toast if UI module available
    if (typeof UI !== 'undefined') UI.toast('🔄 Refreshed from all modules', 'info', 2000);
  }

  /* ── Inject page-specific styles once ─────────────────── */
  let _stylesInjected = false;
  function _injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'cc-styles';
    style.textContent = `
      /* ── Common Customers Page Styles ── */
      .cc-page { max-width: 900px; margin: 0 auto; }

      /* Header */
      .cc-header {
        display: flex; align-items: flex-start; justify-content: space-between;
        gap: 12px; margin-bottom: 20px;
      }
      .cc-title {
        font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em;
        margin-bottom: 4px;
      }
      .cc-subtitle { font-size: 0.82rem; color: var(--text-muted); }

      /* Source Bar */
      .cc-sources-bar {
        display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px;
      }
      .cc-src-indicator {
        display: flex; align-items: center; gap: 10px;
        background: var(--bg-card); border: 1px solid var(--border-color);
        border-radius: 10px; padding: 10px 14px; flex: 1; min-width: 150px;
        position: relative; overflow: hidden;
      }
      .cc-src-indicator::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: var(--border-color);
      }
      .cc-src-active::before { background: linear-gradient(90deg, #22c55e, #4ade80); }
      .cc-src-empty::before  { background: linear-gradient(90deg, #ef4444, #f87171); }
      .cc-src-name { font-size: 0.82rem; font-weight: 700; }
      .cc-src-count { font-size: 0.72rem; color: var(--text-muted); }
      .cc-src-dot {
        width: 8px; height: 8px; border-radius: 50%; margin-left: auto;
        flex-shrink: 0;
      }

      /* KPI Row */
      .cc-kpi-row {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px; margin-bottom: 20px;
      }
      .cc-kpi {
        border-radius: 12px; padding: 16px 20px;
        border: 1px solid var(--border-color);
        position: relative; overflow: hidden;
      }
      .cc-kpi::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        border-radius: 3px 3px 0 0;
      }
      .cc-kpi-blue  { background: rgba(79,70,229,0.07); }
      .cc-kpi-blue::before  { background: linear-gradient(90deg, #4f46e5, #818cf8); }
      .cc-kpi-gold  { background: rgba(246,211,101,0.1); }
      .cc-kpi-gold::before  { background: linear-gradient(90deg, #f6d365, #fda085); }
      .cc-kpi-green { background: rgba(5,150,105,0.08); }
      .cc-kpi-green::before { background: linear-gradient(90deg, #059669, #34d399); }
      .cc-kpi-orange{ background: rgba(217,119,6,0.08); }
      .cc-kpi-orange::before{ background: linear-gradient(90deg, #d97706, #fbbf24); }
      .cc-kpi-value { font-size: 1.8rem; font-weight: 800; line-height: 1.1; }
      .cc-kpi-label { font-size: 0.72rem; color: var(--text-muted); font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }

      /* Controls */
      .cc-controls {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .cc-filter-tabs { display: flex; gap: 4px; background: var(--bg-input);
        border-radius: 8px; padding: 3px; border: 1px solid var(--border-color); }
      .cc-tab {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 12px; border: none; border-radius: 6px;
        background: none; font-family: var(--font); font-size: 0.82rem;
        font-weight: 600; color: var(--text-secondary); cursor: pointer;
        transition: all 0.2s; white-space: nowrap;
      }
      .cc-tab:hover { background: var(--border-color); }
      .cc-tab-active {
        background: var(--bg-card) !important;
        color: var(--text-primary);
        box-shadow: 0 1px 4px rgba(0,0,0,0.12);
      }
      .cc-tab-badge {
        background: var(--primary); color: #fff;
        border-radius: 20px; padding: 1px 7px; font-size: 0.68rem;
      }
      .cc-tab-active .cc-tab-badge { background: var(--primary); }

      /* Village Groups */
      .cc-village-group { margin-bottom: 24px; }
      .cc-village-header {
        display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
        padding: 10px 14px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 10px;
      }
      .cc-village-pin { font-size: 1.1rem; }
      .cc-village-name { font-weight: 700; font-size: 0.95rem; flex: 1; }
      .cc-village-count {
        font-size: 0.75rem; color: var(--text-muted);
        background: var(--bg-input); border-radius: 20px; padding: 2px 10px;
      }

      /* Cards Grid */
      .cc-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 12px;
      }

      /* Customer Card */
      .cc-card {
        background: var(--bg-card); border: 1px solid var(--border-color);
        border-radius: 12px; padding: 14px 16px;
        transition: all 0.2s; cursor: default;
      }
      .cc-card:hover {
        border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary),
          0 4px 16px rgba(79,70,229,0.1);
        transform: translateY(-2px);
      }
      .cc-card-top {
        display: flex; align-items: flex-start; gap: 12px; margin-bottom: 10px;
      }
      .cc-avatar {
        width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
        background: linear-gradient(135deg, #4f46e5, #818cf8);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-weight: 800; font-size: 1rem;
      }
      .cc-info { flex: 1; min-width: 0; }
      .cc-name { font-weight: 700; font-size: 0.95rem; }
      .cc-phone { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
      .cc-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
      .cc-status {
        font-size: 0.72rem; font-weight: 600; border-radius: 20px;
        padding: 2px 8px; white-space: nowrap;
      }
      .cc-source-count { font-size: 0.68rem; color: var(--text-muted); white-space: nowrap; }

      /* Source badges */
      .cc-sources { display: flex; flex-wrap: wrap; gap: 6px; }
      .cc-source-badge {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 0.72rem; font-weight: 600; border-radius: 20px;
        padding: 3px 9px; border: 1px solid;
      }

      /* Footer note */
      .cc-footer-note {
        margin-top: 32px; padding: 12px 16px;
        background: var(--bg-input); border-radius: 10px;
        border: 1px solid var(--border-color);
        display: flex; justify-content: space-between; align-items: center;
        gap: 12px; flex-wrap: wrap;
        font-size: 0.78rem; color: var(--text-muted);
      }

      /* Mobile responsive */
      @media (max-width: 640px) {
        .cc-controls { flex-direction: column; align-items: stretch; }
        .cc-filter-tabs { width: 100%; }
        .cc-kpi-row { grid-template-columns: repeat(2, 1fr); }
        .cc-sources-bar { flex-direction: column; }
        .cc-cards-grid { grid-template-columns: 1fr; }
        .cc-header { flex-direction: column; }
      }
    `;
    document.head.appendChild(style);
  }

  return {
    render,
    setFilter,
    toggleSort,
    onSearch,
    refresh
  };
})();
