/* ============================================
   Customer Profile Page — All Loans + Details
   ============================================ */
const CustomerProfilePage = (() => {
    
    function render(container, customerId) {
        const allLoans = DB.getLoans();
        const settings = DB.getSettings();

        // Find all loans for this customer
        const customerLoans = allLoans.filter(loan => {
            // Match by first customer with same name in the list
            // In a real app, customers would have IDs, but we'll use name for now
            return loan.customerName === customerId;
        });

        if (customerLoans.length === 0) {
            container.innerHTML = `
                <button class="btn btn-ghost mb-2" onclick="UI.navigateTo('loans')">← Back to Loans</button>
                <div class="empty-state">
                    <h3>Customer Not Found</h3>
                    <p>No loans found for this customer.</p>
                    <button class="btn btn-primary" onclick="UI.navigateTo('loans')">← Back</button>
                </div>
            `;
            return;
        }

        const firstLoan = customerLoans[0]; // Get customer info from first loan
        
        // Calculate totals
        let totalLoans = 0;
        let totalPayable = 0;
        let activeLoans = 0;
        let closedLoans = 0;

        customerLoans.forEach(loan => {
            totalLoans += loan.loanAmount;
            const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
            const d = Calculator.calcLoanDetails(loan, rate);
            totalPayable += d.totalPayable;
            
            if (loan.status === 'closed') closedLoans++;
            else activeLoans++;
        });

        container.innerHTML = `
            <button class="btn btn-ghost mb-2" onclick="UI.navigateTo('loans')" data-i18n="back_to_loans">← Back to Loans</button>
            
            <div class="card mb-2">
                <div class="card-header">
                    <div class="flex gap-2" style="align-items:center;flex:1;">
                        ${firstLoan.customerPhoto ? `<img src="${firstLoan.customerPhoto}" class="img-thumb" style="width:50px;height:50px;border-radius:50%;" alt="" />` : '<div style="width:50px;height:50px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">👤</div>'}
                        <div>
                            <h2 style="margin:0;padding:0;">${firstLoan.customerName}</h2>
                            ${firstLoan.mobile ? `<small style="color:var(--text-secondary);">📞 ${firstLoan.mobile}</small>` : ''}
                        </div>
                    </div>
                </div>
                ${firstLoan.address ? `
                    <div style="padding:12px;border-top:1px solid var(--border-color);color:var(--text-secondary);font-size:0.9rem;">
                        📍 ${firstLoan.address}
                    </div>
                ` : ''}
            </div>

            <div class="card mb-2">
                <div class="kpi-grid">
                    <div class="kpi-item">
                        <div class="kpi-label">Total Loans</div>
                        <div class="kpi-value safe">${customerLoans.length}</div>
                    </div>
                    <div class="kpi-item">
                        <div class="kpi-label">Active</div>
                        <div class="kpi-value">${activeLoans}</div>
                    </div>
                    <div class="kpi-item">
                        <div class="kpi-label">Closed</div>
                        <div class="kpi-value">${closedLoans}</div>
                    </div>
                    <div class="kpi-item">
                        <div class="kpi-label">Total Loaned</div>
                        <div class="kpi-value" style="color:var(--gold);">${UI.currency(totalLoans)}</div>
                    </div>
                </div>
            </div>

            <div class="card mb-2">
                <h3 style="margin-top:0;color:var(--primary);" data-i18n="nav_all_loans">📋 ${I18n.t('nav_all_loans')}</h3>
                <div id="customer-loans-list"></div>
            </div>

            <button class="btn btn-gold btn-lg" onclick="UI.navigateTo('new-loan')">➕ New Loan for ${firstLoan.customerName}</button>
        `;

        renderLoansList(customerLoans, settings);
    }

    function renderLoansList(loans, settings) {
        const container = document.getElementById('customer-loans-list');
        if (!container) return;

        const html = loans
            .sort((a, b) => new Date(b.loanStartDate) - new Date(a.loanStartDate))
            .map((loan, idx) => {
                const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
                const d = Calculator.calcLoanDetails(loan, rate);
                const icon = loan.metalType === 'gold' ? '🥇' : '🥈';
                const statusIcon = loan.status === 'closed' ? '✅' : loan.status === 'active' ? '🟢' : '🔄';
                const statusColor = loan.status === 'closed' ? '#999' : loan.status === 'active' ? '#10b981' : '#f59e0b';

                return `
                    <div class="loan-card" onclick="UI.navigateTo('loan-detail','${loan.id}')" style="cursor:pointer;">
                        <div class="loan-card-header">
                            <div style="flex:1;">
                                <div style="font-weight:600;margin-bottom:4px;">${idx + 1}. ${icon} ${loan.metalSubType} • ${loan.weightGrams}g</div>
                                <div style="font-size:0.85rem;color:var(--text-secondary);">Started: ${UI.formatDate(loan.loanStartDate)}</div>
                            </div>
                            <span class="status-badge ${loan.status || 'active'}" style="white-space:nowrap;">${statusIcon} ${(loan.status || 'active').toUpperCase()}</span>
                        </div>
                        <div class="loan-card-body">
                            <div class="loan-stat">
                                <span class="label">Loan Amt:</span>
                                <span class="value">${UI.currency(loan.loanAmount)}</span>
                            </div>
                            <div class="loan-stat">
                                <span class="label">Payable:</span>
                                <span class="value" style="color:var(--gold);">${UI.currency(d.totalPayable)}</span>
                            </div>
                            <div class="loan-stat ${d.ltv > 80 ? 'danger' : d.ltv > 60 ? 'monitor' : 'safe'}">
                                <span class="label">LTV:</span>
                                <span class="value">${UI.pct(d.ltv)}</span>
                            </div>
                            <div class="loan-stat ${d.riskLevel === 'safe' ? 'safe' : d.riskLevel === 'monitor' ? 'monitor' : 'danger'}">
                                <span class="label">Risk:</span>
                                <span class="value">${d.riskLabel}</span>
                            </div>
                        </div>
                        <div class="loan-card-footer">
                            <button class="btn btn-ghost btn-xs" onclick="event.stopPropagation(); UI.navigateTo('loan-detail','${loan.id}')">👁️ View</button>
                            <button class="btn btn-ghost btn-xs" onclick="event.stopPropagation(); Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 PDF</button>
                        </div>
                    </div>
                `;
            }).join('');

        container.innerHTML = html;
    }

    return { render };
})();
