/* ============================================
   Loan List Page — Simple Card View
   ============================================ */
const LoanListPage = (() => {
    let _allLoans = [];
    let _filteredLoans = [];

    function render(container) {
        _allLoans = DB.getLoans();
        const settings = DB.getSettings();

        container.innerHTML = `
            <div class="flex-between mb-2">
                <span style="font-size:0.88rem;color:var(--text-secondary);">${_allLoans.length} loan${_allLoans.length !== 1 ? 's' : ''}</span>
                <div class="flex gap-1">
                    <button class="btn btn-gold btn-sm" onclick="UI.navigateTo('new-loan')">➕ New</button>
                    <button class="btn btn-primary btn-sm" onclick="UI.navigateTo('old-loan')">🕰️ Old</button>
                </div>
            </div>
            <div class="filter-bar" style="gap:8px;flex-wrap:wrap;">
                <input type="text" class="search-input" id="loan-search" placeholder="Search customer name..." oninput="LoanListPage.filter()">
                <select class="form-select" id="loan-filter-status" onchange="LoanListPage.filter()" style="width:auto;">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="migrated">Migrated</option>
                    <option value="closed">Closed</option>
                </select>
            </div>
            <div id="loans-container"></div>
            ${_allLoans.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📋</div><h3>No Loans Yet</h3><p>Create your first loan.</p><button class="btn btn-gold" onclick="UI.navigateTo(\'new-loan\')">➕ Create</button></div>' : ''}
        `;
        
        if (_allLoans.length > 0) {
            _filteredLoans = _allLoans;
            renderLoans(container, settings);
        }
    }

    function renderLoans(container, settings) {
        const loansHtml = _filteredLoans
            .sort((a, b) => a.customerName.localeCompare(b.customerName))
            .map(loan => {
                const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
                const d = Calculator.calcLoanDetails(loan, rate);
                const icon = loan.metalType === 'gold' ? '🥇' : '🥈';
                const statusIcon = loan.status === 'closed' ? '✅' : loan.status === 'active' ? '🟢' : '🔄';
                
                return `
                    <div class="loan-card" onclick="UI.navigateTo('loan-detail','${loan.id}')">
                        <div class="loan-card-header">
                            <div class="loan-card-title">
                                <strong style="cursor:pointer;color:var(--gold);" onclick="event.stopPropagation(); UI.navigateTo('customer-profile','${loan.customerName}')">${loan.customerName}</strong>
                                ${loan.mobile ? '<div style="font-size:0.8rem;color:var(--text-secondary);">' + loan.mobile + '</div>' : ''}
                                ${loan.address ? '<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">📍 ' + loan.address + '</div>' : ''}
                            </div>
                            <div class="loan-card-status">
                                <span class="status-badge ${loan.status || 'active'}">${statusIcon} ${(loan.status || 'active').toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="loan-card-body">
                            <div class="loan-stat">
                                <span class="label">${icon} Amount:</span>
                                <span class="value">${UI.currency(loan.loanAmount)}</span>
                            </div>
                            <div class="loan-stat">
                                <span class="label">Weight:</span>
                                <span class="value">${loan.weightGrams}g</span>
                            </div>
                            <div class="loan-stat ${d.ltv > 80 ? 'danger' : d.ltv > 60 ? 'monitor' : 'safe'}">
                                <span class="label">LTV:</span>
                                <span class="value">${UI.pct(d.ltv)}</span>
                            </div>
                            <div class="loan-stat">
                                <span class="label">Payable:</span>
                                <span class="value" style="color:var(--gold);font-weight:600;">${UI.currency(d.totalPayable)}</span>
                            </div>
                            <div class="loan-stat ${d.riskLevel === 'safe' ? 'safe' : d.riskLevel === 'monitor' ? 'monitor' : 'danger'}">
                                <span class="label">Risk:</span>
                                <span class="value">${d.riskLabel}</span>
                            </div>
                        </div>
                        <div class="loan-card-footer">
                            <button class="btn btn-ghost btn-xs" onclick="LoanListPage.stopPropagation(event); UI.navigateTo('loan-detail','${loan.id}')">👁️ View</button>
                            <button class="btn btn-ghost btn-xs" onclick="LoanListPage.stopPropagation(event); Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 PDF</button>
                            <button class="btn btn-ghost btn-xs text-danger" onclick="LoanListPage.stopPropagation(event); LoanListPage.del('${loan.id}')">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('');

        const container_ = document.getElementById('loans-container');
        if (container_) container_.innerHTML = loansHtml || '<div class="empty-state"><p style="padding:20px;text-align:center;color:var(--text-secondary);">No loans found</p></div>';
    }

    function stopPropagation(e) {
        e.stopPropagation();
    }

    function filter() {
        const search = document.getElementById('loan-search').value.toLowerCase();
        const status = document.getElementById('loan-filter-status').value;

        _filteredLoans = _allLoans.filter(loan => {
            const matchesSearch = !search || 
                loan.customerName.toLowerCase().includes(search) || 
                (loan.mobile && loan.mobile.includes(search)) ||
                (loan.address && loan.address.toLowerCase().includes(search));
            const matchesStatus = status === 'all' || (loan.status || 'active') === status;
            return matchesSearch && matchesStatus;
        });

        const container = document.querySelector('.card');
        const settings = DB.getSettings();
        if (_filteredLoans.length === 0) {
            const loansContainer = document.getElementById('loans-container');
            if (loansContainer) {
                loansContainer.innerHTML = '<div class="empty-state"><p style="padding:20px;text-align:center;color:var(--text-secondary);">No loans found</p></div>';
            }
        } else {
            renderLoans(container?.parentElement || document.body, settings);
        }
    }

    async function del(id) {
        if (await UI.confirm('Delete Loan', 'Are you sure? This cannot be undone.')) {
            DB.deleteLoan(id);
            UI.toast('Loan deleted', 'success');
            const loans = DB.getLoans();
            const container = document.querySelector('.card');
            const settings = DB.getSettings();
            _allLoans = loans;
            _filteredLoans = loans;
            renderLoans(container?.parentElement || document.body, settings);
        }
    }

    return { render, filter, del, stopPropagation };
})();
