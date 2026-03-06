/* ============================================
   Market Page
   ============================================ */
const MarketPage = (() => {
    function render(container) {
        const rates = Market.getCurrentRates();
        const log = DB.getMarketLog();
        const settings = DB.getSettings();

        container.innerHTML = `
            <div class="kpi-grid mb-3">
                <div class="kpi-card gold">
                    <div class="kpi-icon">🥇</div>
                    <div class="kpi-value text-gold">${UI.currency(rates.gold)}/g</div>
                    <div class="kpi-label">Gold Rate (per gram)</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-icon">🥈</div>
                    <div class="kpi-value">${UI.currency(rates.silver)}/g</div>
                    <div class="kpi-label">Silver Rate (per gram)</div>
                </div>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2">📝 Update Rates Manually</h3>
                <div class="form-grid">
                    ${UI.formGroup('Gold Rate (₹/gram)', `<input type="number" class="form-input" id="mkt-gold" value="${rates.gold}" min="1">`)}
                    ${UI.formGroup('Silver Rate (₹/gram)', `<input type="number" class="form-input" id="mkt-silver" value="${rates.silver}" min="1">`)}
                </div>
                <div class="flex gap-1 mt-2">
                    <button class="btn btn-gold" onclick="MarketPage.saveRates()">💾 Save Rates</button>
                    <button class="btn btn-outline" onclick="MarketPage.fetchLive()">🔄 Fetch Live</button>
                </div>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2">📊 Rate History (Last ${log.length} entries)</h3>
                ${log.length === 0 ? '<p class="text-muted">No history yet. Save rates to start logging.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>Date</th><th>Gold (₹/g)</th><th>Silver (₹/g)</th>
                </tr></thead><tbody>
                ${log.slice(-30).reverse().map(e => `<tr>
                    <td>${UI.formatDate(e.date)}</td>
                    <td class="text-gold font-semibold">${UI.currency(e.goldPrice)}</td>
                    <td class="font-semibold">${UI.currency(e.silverPrice)}</td>
                </tr>`).join('')}
                </tbody></table></div>`}
            </div>

            ${log.length >= 2 ? `
            <div class="chart-card">
                <h3>📈 Price Trend</h3>
                <div class="chart-wrapper"><canvas id="market-chart"></canvas></div>
            </div>`: ''}
        `;

        if (log.length >= 2) renderChart(log);
    }

    function renderChart(log) {
        const ctx = document.getElementById('market-chart');
        if (!ctx) return;
        const recent = log.slice(-30);
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: recent.map(e => e.date.slice(5)),
                datasets: [
                    { label: 'Gold', data: recent.map(e => e.goldPrice), borderColor: '#f6d365', backgroundColor: 'rgba(246,211,101,0.1)', fill: true, tension: 0.3 },
                    { label: 'Silver', data: recent.map(e => e.silverPrice), borderColor: '#c0c0c0', backgroundColor: 'rgba(192,192,192,0.1)', fill: true, tension: 0.3 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { font: { family: 'Inter' } } } },
                scales: {
                    y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => '₹' + v } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function saveRates() {
        const g = parseFloat(document.getElementById('mkt-gold').value);
        const s = parseFloat(document.getElementById('mkt-silver').value);
        if (!g || g <= 0 || !s || s <= 0) { UI.toast('Enter valid rates', 'error'); return; }
        Market.setManualRates(g, s);
        Market.updateTicker();
        UI.toast('Rates updated', 'success');
        render(document.getElementById('page-container'));
    }

    async function fetchLive() {
        UI.toast('Fetching live rates...', 'info');
        const r = await Market.fetchLiveRates();
        Market.updateTicker();
        UI.toast(r.source === 'live' ? 'Live rates fetched!' : 'Using stored rates (API unavailable)', 'info');
        render(document.getElementById('page-container'));
    }

    return { render, saveRates, fetchLive };
})();
