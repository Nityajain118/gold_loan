/* ============================================
   Loan List Page
   ============================================ */
const LoanListPage = (() => {

    function render(container) {
        const loans = DB.getLoans();
        const settings = DB.getSettings();

        container.innerHTML = `
            <div class="flex-between mb-2">
                <span style="font-size:0.88rem;color:var(--text-secondary);">${loans.length} loan${loans.length !== 1 ? 's' : ''}</span>
                <div class="flex gap-1">
                    <button class="btn btn-gold btn-sm" onclick="UI.navigateTo('new-loan')">➕ New</button>
                    <button class="btn btn-primary btn-sm" onclick="UI.navigateTo('old-loan')">🕰️ Old</button>
                </div>
            </div>
            <div class="filter-bar">
                <input type="text" class="search-input" id="loan-search" placeholder="Search..." oninput="LoanListPage.filter()">
                <select class="form-select" id="loan-filter-status" onchange="LoanListPage.filter()" style="width:auto;">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="migrated">Migrated</option>
                    <option value="closed">Closed</option>
                </select>
                <select class="form-select" id="loan-filter-metal" onchange="LoanListPage.filter()" style="width:auto;">
                    <option value="all">All Metals</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                </select>
            </div>
            <div class="table-container"><table class="data-table"><thead><tr>
                <th>Customer</th><th>Metal</th><th>Weight</th><th>Loan Amt</th>
                <th>Total Payable</th><th>LTV</th><th>Risk</th><th>Status</th><th>Actions</th>
            </tr></thead><tbody id="loans-tbody"></tbody></table></div>
            ${loans.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No Loans Yet</h3><p>Create your first loan.</p><button class="btn btn-gold" onclick="UI.navigateTo(\'new-loan\')">➕ Create</button></div>' : ''}
        `;
        if (loans.length > 0) renderRows(loans, settings);
    }

    function renderRows(loans, settings) {
        const tbody = document.getElementById('loans-tbody');
        if (!tbody) return;
        tbody.innerHTML = loans.map(loan => {
            const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
            const d = Calculator.calcLoanDetails(loan, rate);
            const icon = loan.metalType === 'gold' ? '🥇' : '🥈';
            return `<tr data-status="${loan.status || 'active'}" data-metal="${loan.metalType}" data-risk="${d.riskLevel}" data-search="${(loan.customerName + ' ' + (loan.mobile || '') + ' ' + (loan.lockerName || '')).toLowerCase()}">
                <td><strong>${loan.customerName}</strong>${loan.mobile ? '<br><small class="text-muted">' + loan.mobile + '</small>' : ''}</td>
                <td>${icon} ${loan.metalSubType}</td><td>${loan.weightGrams}g</td>
                <td><strong>${UI.currency(loan.loanAmount)}</strong></td>
                <td><strong>${UI.currency(d.totalPayable)}</strong></td>
                <td><span class="text-${d.ltv > 80 ? 'danger' : d.ltv > 60 ? 'monitor' : 'safe'} font-semibold">${UI.pct(d.ltv)}</span></td>
                <td><span class="risk-badge ${d.riskLevel}">${d.riskLevel === 'safe' ? '✅ Safe' : d.riskLevel === 'monitor' ? '⚠️ Watch' : '🔴 Risk'}</span></td>
                <td><span class="status-badge ${loan.status || 'active'}">${loan.isMigrated ? '📥 Migrated' : (loan.status || 'active')}</span></td>
                <td><div class="flex gap-1">
                    <button class="btn btn-ghost btn-xs" onclick="UI.navigateTo('loan-detail','${loan.id}')">👁️</button>
                    <button class="btn btn-ghost btn-xs" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄</button>
                    <button class="btn btn-ghost btn-xs text-danger" onclick="LoanListPage.del('${loan.id}')">🗑️</button>
                </div></td></tr>`;
        }).join('');
    }

    function filter() {
        const s = document.getElementById('loan-search').value.toLowerCase();
        const st = document.getElementById('loan-filter-status').value;
        const m = document.getElementById('loan-filter-metal').value;
        document.querySelectorAll('#loans-tbody tr').forEach(r => {
            const ok = (!s || r.dataset.search.includes(s)) && (st === 'all' || r.dataset.status === st) && (m === 'all' || r.dataset.metal === m);
            r.style.display = ok ? '' : 'none';
        });
    }

    async function del(id) {
        if (await UI.confirm('Delete Loan', 'Are you sure? This cannot be undone.')) {
            DB.deleteLoan(id); UI.toast('Loan deleted', 'success'); UI.navigateTo('loans');
        }
    }

    return { render, filter, del };
})();
