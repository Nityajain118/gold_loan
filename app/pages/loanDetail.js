/* ============================================
   Loan Detail Page — Premium Dashboard UI v2
   ============================================ */
const LoanDetailPage = (() => {
    function render(container, loanId) {
        const loan = DB.getLoan(loanId);
        if (!loan) {
            container.innerHTML = '<div class="empty-state"><h3>Loan not found</h3><button class="btn btn-primary" onclick="UI.navigateTo(\'loans\')">← Back</button></div>';
            return;
        }
        const settings = DB.getSettings();
        const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        // Pass current interest basis (360/365) to calcLoanDetails
        const d = Calculator.calcLoanDetails(loan, rate, { basis: _interestBasis });
        const icon = loan.metalType === 'gold' ? '🥇' : '🥈';
        const items = loan.items || [];
        const rates = Market.getCurrentRates();

        // ── Computed values for dashboard ─────────────────────────────────────
        let pureWeight = 0;
        if (items.length > 0) {
            items.forEach(it => {
                const w = it.weightGrams || 0;
                const pf = it.purity === 'custom' ? (it.customPurity || 0) / 100 : Calculator.getPurityFactor(it.purity || loan.metalSubType || '22K');
                pureWeight += w * pf;
            });
        } else {
            pureWeight = (loan.weightGrams || 0) * Calculator.getPurityFactor(loan.metalSubType || '22K');
        }
        const ratesNow = Market.getCurrentRates();
        const currentPrice = loan.metalType === 'gold' ? ratesNow.gold : ratesNow.silver;

        const totalWeight = items.length > 0
            ? items.reduce((s, it) => s + (it.weightGrams || 0), 0)
            : (loan.weightGrams || 0);
        const goldItemsCount   = items.filter(it => it.metalType === 'gold').length;
        const silverItemsCount = items.filter(it => it.metalType === 'silver').length;
        const origPrincipal    = loan.originalLoanAmount || loan.loanAmount || 0;
        const totalPaid        = _getTotalPaid(loan);
        const netPayable       = _netPayable(loan, d);
        const loanStatus       = loan.status || 'active';
        const badgeClass       = loan.isMigrated ? 'ld-badge-migrated' : (loanStatus === 'closed' ? 'ld-badge-closed' : 'ld-badge-active');
        const badgeLabel       = loan.isMigrated ? '📥 Migrated' : (loanStatus === 'closed' ? '🔴 CLOSED' : '🟢 ACTIVE LOAN');
        const ltvBadge         = d.ltv > 80 ? 'danger' : d.ltv > 60 ? 'monitor' : 'safe';

        // Avatar initials
        const nameParts = (loan.customerName || 'GL').trim().split(' ');
        const initials  = (nameParts[0][0] + (nameParts[1] ? nameParts[1][0] : '')).toUpperCase();

        // Jewelry items table rows
        const itemRowsHtml = items.length > 0 ? items.map((it, i) => {
            const r = it.metalType === 'gold' ? rates.gold : rates.silver;
            const v = Calculator.calcMetalValue(it.weightGrams || 0, it.purity, r);
            return `<tr>
                <td>${i + 1}</td>
                <td>${it.photo ? `<img src="${it.photo}" style="width:28px;height:28px;border-radius:4px;margin-right:6px;vertical-align:middle;"/>` : ''}<strong>${it.itemType || '—'}</strong></td>
                <td>${it.metalType === 'gold' ? '🥇 Gold' : '🥈 Silver'}</td>
                <td>${it.purity || '—'}</td>
                <td>${(it.weightGrams || 0).toFixed(2)} g</td>
                <td style="color:var(--gold-dark);font-weight:700;">${UI.currency(v)}</td>
            </tr>`;
        }).join('') : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px;">No items recorded</td></tr>`;

        // Ledger HTML (pass mode so table respects current display mode)
        const ledgerHtml = _buildEventLedgerHTML(loan, _ledgerMode, loan.id);

        // Interest type label
        const interestTypeLabel = loan.interestType === 'compound'
            ? 'Compound (' + ({1:'Yearly',2:'Half-Yearly',4:'Quarterly',12:'Monthly'}[d.compoundingFrequency] || 'Monthly') + ')'
            : 'Simple Interest';

        // Time mode label
        const timeModeLabel = (d.timeMode || 'normal') === 'tithi' ? '🌙 Tithi' : '📅 Normal';

        // Risk analysis
        const riskData = Calculator.calcGoldRiskAnalysis({ pureGoldWeight: pureWeight, goldValue: d.metalValue, loanAmount: loan.loanAmount || 0, currentPrice });

        // ── Build HTML ────────────────────────────────────────────────────────
        container.innerHTML = `
        <div class="ld-page">

            <!-- Back -->
            <button class="btn btn-ghost" style="align-self:flex-start;" onclick="UI.navigateTo('loans')">← Back to Loans</button>

            <!-- A. Header Card -->
            <div class="ld-header">
                <div class="ld-header-left">
                    <div class="ld-avatar">${initials}</div>
                    <div>
                        <div class="ld-name">${loan.customerName || '—'}</div>
                        <div class="ld-meta">
                            <span>📞 ${loan.mobile || 'No mobile'}</span>
                            <span>|</span>
                            <span id="locker-header-${loan.id}">🔒 ${loan.lockerName || loan.lockerNo || 'No locker'}</span>
                        </div>
                        ${loan.address ? `<div class="ld-address">📍 ${loan.address}</div>` : ''}
                    </div>
                </div>
                <div class="ld-header-right">
                    <span class="ld-badge ${badgeClass}">${badgeLabel}</span>
                    <button class="ld-hdr-btn" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 Export PDF</button>
                    <button class="ld-hdr-btn" onclick="LoanDetailPage.sendWhatsApp('${loan.id}')">💬 Send WhatsApp</button>
                </div>
            </div>

            <!-- B. Loan Overview Card -->
            <div class="ld-card">
                <div class="ld-section-title" style="display:flex;align-items:center;">📊 Loan Overview
                    <button onclick="LoanDetailPage.showEditModal('${loan.id}')"
                        style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;font-size:0.75rem;font-weight:700;cursor:pointer;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);transition:all .2s;"
                        onmouseover="this.style.background='var(--primary)';this.style.color='#fff';"
                        onmouseout="this.style.background='var(--bg-input)';this.style.color='var(--text-secondary)';">✏️ Edit</button>
                </div>
                <div class="ld-overview-grid">
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Metal Type</div>
                        <div class="ld-overview-value gold">${icon} ${loan.metalType === 'gold' ? 'Gold' : 'Silver'} ${loan.metalSubType || ''}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Total Weight</div>
                        <div class="ld-overview-value">${totalWeight.toFixed(2)} g</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Metal Value</div>
                        <div class="ld-overview-value gold">${UI.currency(d.metalValue)}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Loan Amount</div>
                        <div class="ld-overview-value">${UI.currency(origPrincipal)}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Interest Rate</div>
                        <div class="ld-overview-value">${loan.interestRate || 0}% per ${loan.interestPeriod || 'month'}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Interest Type</div>
                        <div class="ld-overview-value">${interestTypeLabel}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Effective Annual Rate</div>
                        <div class="ld-overview-value">${UI.pct(d.effectiveRate || d.annualRate)}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Time Mode</div>
                        <div class="ld-overview-value">${timeModeLabel}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Items Count</div>
                        <div class="ld-overview-value">${items.length} Item${items.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Gold Items</div>
                        <div class="ld-overview-value">${goldItemsCount}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">Silver Items</div>
                        <div class="ld-overview-value">${silverItemsCount}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">LTV</div>
                        <div class="ld-overview-value ${ltvBadge}">${UI.pct(d.ltv)}</div>
                    </div>
                    <div class="ld-overview-item">
                        <div class="ld-overview-label">🔒 Locker No.</div>
                        <div class="ld-overview-value" style="display:flex;align-items:center;gap:6px;">
                            <span id="locker-display-${loan.id}">${loan.lockerName || loan.lockerNo || '—'}</span>
                            <button onclick="LoanDetailPage.showLockerEditModal('${loan.id}')"
                                title="Edit Locker Number"
                                style="background:none;border:none;cursor:pointer;font-size:0.85rem;padding:0 2px;color:var(--text-secondary);transition:color .15s;"
                                onmouseover="this.style.color='var(--primary)';"
                                onmouseout="this.style.color='var(--text-secondary)';">✏️</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- C. Dates Card -->
            <div class="ld-card">
                <div class="ld-dates-grid">
                    <div class="ld-date-panel">
                        <div class="ld-date-panel-label">📅 Start Date</div>
                        <div class="ld-date-big">${UI.formatDate(loan.loanStartDate)}</div>
                        ${d.startTithi ? `<div class="ld-date-tithi">${UI.formatTithi(d.startTithi)}</div>` : ''}
                    </div>
                    <div class="ld-date-panel">
                        <div class="ld-date-panel-label">📅 Maturity Date</div>
                        <div class="ld-date-big">${UI.formatDate(d.maturityDate)}</div>
                        ${d.maturityTithi ? `<div class="ld-date-tithi">${UI.formatTithi(d.maturityTithi)}</div>` : ''}
                    </div>
                    <div class="ld-days-panel ${d.isOverdue ? 'ld-days-overdue' : ''}">
                        <div class="ld-days-label">📅 Days to Maturity</div>
                        <div class="ld-days-number">${d.isOverdue ? 'OVERDUE' : d.daysToMaturity}</div>
                        <div class="ld-days-sub">Duration: ${loan.loanDuration || 12} Months</div>
                    </div>
                </div>
            </div>

            <!-- D. Jewelry Items Card -->
            <div class="ld-card">
                <div class="ld-section-title">💍 Jewelry Items</div>
                <div class="ld-table-wrap">
                    <table class="ld-table">
                        <thead><tr>
                            <th>#</th><th>Item</th><th>Metal</th><th>Purity</th><th>Weight</th><th>Value</th>
                        </tr></thead>
                        <tbody>${itemRowsHtml}</tbody>
                    </table>
                </div>
                <div class="ld-items-footer">
                    <span>Total Weight: <strong style="color:var(--text-primary);">${totalWeight.toFixed(2)} g</strong></span>
                    <span>Total Value: <strong style="color:var(--gold-dark);">${UI.currency(d.metalValue)}</strong></span>
                </div>
            </div>

            <!-- E. Hisaab / Adjustments -->
            ${loanStatus !== 'closed' ? `
            <div class="ld-card">
                <div class="ld-section-title">📒 Hisaab / Adjustments</div>
                <div class="ld-hisaab-grid">
                    <button class="ld-action-btn red" onclick="LoanDetailPage.showAdjustModal('${loan.id}')">
                        <span class="ld-action-btn-icon">➕</span>
                        <span class="ld-action-btn-label">Add Adjustment</span>
                        <span class="ld-action-btn-sub">Add manual adjustment</span>
                    </button>
                    <button class="ld-action-btn blue" onclick="LoanDetailPage.showPartialPaymentModal2('${loan.id}',${d.totalPayable},${d.remainingInterest})">
                        <span class="ld-action-btn-icon">💵</span>
                        <span class="ld-action-btn-label">Payment</span>
                        <span class="ld-action-btn-sub">Record payment</span>
                    </button>
                    <button class="ld-action-btn amber" onclick="LoanDetailPage.showDiscountModal('${loan.id}')">
                        <span class="ld-action-btn-icon">🏷️</span>
                        <span class="ld-action-btn-label">Discount</span>
                        <span class="ld-action-btn-sub">Apply discount</span>
                    </button>
                    <button class="ld-action-btn purple" onclick="LoanDetailPage.showSettleModal2('${loan.id}',${d.totalPayable})">
                        <span class="ld-action-btn-icon">✅</span>
                        <span class="ld-action-btn-label">Settle Loan</span>
                        <span class="ld-action-btn-sub">Settle the loan</span>
                    </button>
                </div>
            </div>` : ''}

            <!-- F. Loan Ledger -->
            <div class="ld-card" id="ledger-card-${loan.id}">
                ${_buildLedgerCardInner(loan, loan.id)}
            </div>

            <!-- G. Settlement Details (closed loans only) -->
            ${(loanStatus === 'closed' && loan.settlement) ? `
            <div class="ld-settlement-card">
                <div class="ld-section-title" style="color:var(--safe);">🤝 Settlement Details</div>
                <div class="ld-summary-row"><span class="ld-summary-key">Total Amount</span><span class="ld-summary-val" style="color:var(--danger);">${UI.currency(loan.settlement.totalAmount)}</span></div>
                <div class="ld-summary-row"><span class="ld-summary-key">Paid Amount</span><span class="ld-summary-val" style="color:var(--gold-dark);">${UI.currency(loan.settlement.paidAmount)}</span></div>
                ${loan.settlement.discount > 0 ? `<div class="ld-summary-row"><span class="ld-summary-key">Discount Given</span><span class="ld-summary-val" style="color:var(--danger);">${UI.currency(loan.settlement.discount)}</span></div>` : ''}
                <div class="ld-summary-row"><span class="ld-summary-key">Status</span><span class="ld-summary-val" style="color:var(--safe);">${loan.settlement.status}</span></div>
            </div>` : ''}

            <!-- G. Bottom Summary: 3 Cards -->
            <div class="ld-summary-grid">

                <!-- Interest Summary -->
                <div class="ld-summary-card" id="interest-summary-${loan.id}">
                    <div class="ld-summary-title">% Interest Summary</div>

                    <!-- Mode + Basis Controls -->
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                        <button onclick="LoanDetailPage.toggleLedgerMode('${loan.id}')" style="${_ledgerMode==='daily'?'background:var(--primary);color:#fff;':'background:var(--bg-input);color:var(--text-secondary);'}border:1px solid var(--border-color);padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">📅 Day-wise</button>
                        <button onclick="LoanDetailPage.toggleLedgerMode('${loan.id}')" style="${_ledgerMode==='monthly'?'background:var(--primary);color:#fff;':'background:var(--bg-input);color:var(--text-secondary);'}border:1px solid var(--border-color);padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">📆 Monthly</button>
                        <button onclick="LoanDetailPage.toggleInterestBasis('${loan.id}')" style="${_interestBasis===360?'background:var(--gold-dark);color:#fff;':'background:var(--bg-input);color:var(--text-secondary);'}border:1px solid var(--border-color);padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">360 Days</button>
                        <button onclick="LoanDetailPage.toggleInterestBasis('${loan.id}')" style="${_interestBasis===365?'background:var(--gold-dark);color:#fff;':'background:var(--bg-input);color:var(--text-secondary);'}border:1px solid var(--border-color);padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">365 Days</button>
                    </div>

                    <div class="ld-summary-row"><span class="ld-summary-key">Interest Type</span><span class="ld-summary-val">${loan.interestType === 'compound' ? 'Compound' : 'Simple Interest'}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Monthly Rate</span><span class="ld-summary-val">${loan.interestPeriod === 'yearly' ? (loan.interestRate/12).toFixed(2) : loan.interestRate}%</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Days Passed</span><span class="ld-summary-val" style="color:var(--primary);font-weight:700;">${d.daysElapsed} days</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Basis Used</span><span class="ld-summary-val" style="color:var(--gold-dark);font-weight:700;">${_interestBasis} Days</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Interest till last entry</span><span class="ld-summary-val">${UI.currency(_interestTillLastPayment(loan))}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Current Interest (Today)</span><span class="ld-summary-val" style="color:var(--monitor);font-weight:700;">${UI.currency(_ledgerMode === 'monthly' ? d.monthlyInterest : d.dayInterest)}</span></div>
                    <div class="ld-summary-row" style="opacity:0.7;"><span class="ld-summary-key">Monthly Interest (Ref.)</span><span class="ld-summary-val">${UI.currency(d.monthlyInterest)}</span></div>
                    <div class="ld-total-interest-row">
                        <span class="ld-summary-key">Total Interest</span>
                        <span class="ld-summary-val">${UI.currency(_ledgerMode === 'monthly' ? d.monthlyInterest : d.dayInterest)}</span>
                    </div>
                </div>

                <!-- Financial Summary -->
                <div class="ld-summary-card">
                    <div class="ld-summary-title">💰 Financial Summary</div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Principal Amount</span><span class="ld-summary-val">${UI.currency(origPrincipal)}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Total Paid</span><span class="ld-summary-val">${UI.currency(totalPaid)}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Total Interest</span><span class="ld-summary-val">${UI.currency(d.totalInterest)}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Total Discount</span><span class="ld-summary-val">${UI.currency(loan.totalDiscount || 0)}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Adjustments</span><span class="ld-summary-val">${UI.currency(loan.totalAdjustment || 0)}</span></div>
                    <div class="ld-net-payable-row">
                        <span class="ld-summary-key">Net Payable</span>
                        <span class="ld-summary-val">${UI.currency(netPayable)}</span>
                    </div>
                </div>

                <!-- Loan Risk Analysis -->
                <div class="ld-summary-card">
                    <div class="ld-summary-title">⚠️ Loan Risk Analysis</div>
                    <div class="ld-summary-row"><span class="ld-summary-key">LTV Ratio</span><span class="ld-summary-val">${UI.pct(riskData.ltv)} <span style="font-size:0.72rem;padding:2px 7px;border-radius:10px;background:var(--${riskData.ltvClass === 'safe' ? 'safe' : riskData.ltvClass === 'monitor' ? 'monitor' : 'danger'}-bg);color:var(--${riskData.ltvClass === 'safe' ? 'safe' : riskData.ltvClass === 'monitor' ? 'monitor' : 'danger'});">${riskData.ltvCategory}</span></span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Break-even Price</span><span class="ld-summary-val">${UI.currency(riskData.breakEvenPrice)} / g</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Safety Margin</span><span class="ld-summary-val">${UI.currency(riskData.safetyMargin)}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Safe Loan Limit (75% LTV)</span><span class="ld-summary-val">${UI.currency(riskData.safeLoanAmount)}</span></div>
                    <div class="ld-risk-status ${riskData.alertClass}">${riskData.alertStatus}</div>
                </div>
            </div>

            <!-- H. Action Bar -->
            <div class="ld-action-bar">
                <button class="btn btn-primary" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 Export PDF</button>
                <button class="btn btn-success" onclick="LoanDetailPage.sendWhatsApp('${loan.id}')">💬 Send WhatsApp</button>
                <button class="btn btn-danger" onclick="LoanDetailPage.del('${loan.id}')">🗑️ Delete Loan</button>
                <button class="btn btn-outline" onclick="LoanDetailPage.closeLoan('${loan.id}')">✅ Mark Closed</button>
            </div>

        </div>`;

        // ── Risk Panel (togglable, appended after innerHTML) ──────────────────
        let pureWeight2 = pureWeight; // already computed above
        const riskToggleRow = document.createElement('div');
        riskToggleRow.className = 'ld-risk-toggle-row';
        riskToggleRow.innerHTML = `
            <span class="ld-risk-toggle-label">📊 Advanced Risk Panel</span>
            <button id="risk-toggle-btn" onclick="LoanDetailPage.toggleRiskPanel()"
                style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;transition:all .2s;
                       background:${LoanDetailPage._riskVisible ? 'var(--safe)' : 'rgba(148,163,184,0.2)'};
                       color:${LoanDetailPage._riskVisible ? '#fff' : 'var(--text-secondary)'};">
                <span id="risk-toggle-dot" style="width:8px;height:8px;border-radius:50%;background:${LoanDetailPage._riskVisible ? '#fff' : 'var(--text-secondary)'};display:inline-block;"></span>
                <span id="risk-toggle-label">${LoanDetailPage._riskVisible ? 'ON' : 'OFF'}</span>
            </button>`;

        const riskWrapper = document.createElement('div');
        riskWrapper.id = 'risk-panel-wrapper';
        riskWrapper.style.display = LoanDetailPage._riskVisible ? 'block' : 'none';
        riskWrapper.innerHTML = Risk.renderRiskPanel({ pureGoldWeight: pureWeight2, goldValue: d.metalValue, loanAmount: loan.loanAmount, currentPrice });

        const page = container.querySelector('.ld-page');
        if (page) {
            page.insertBefore(riskToggleRow, page.querySelector('.ld-action-bar'));
            page.insertBefore(riskWrapper, page.querySelector('.ld-action-bar'));
        }
    }

    // ── Calculation Helpers ───────────────────────────────────────────────────
    function _netPayable(loan, d) {
        if (!loan || !d) return 0;
        const base = d.totalPayable || 0;
        return Math.max(0, base - (loan.totalDiscount || 0) + (loan.totalAdjustment || 0));
    }

    function _getTotalPaid(loan) {
        if (!loan) return 0;
        const fromHistory = (loan.paymentHistory || []).reduce((s, p) => s + (p.paidAmount || 0), 0);
        const fromLedger  = (loan.loanLedger || []).filter(e => e.type === 'payment').reduce((s, e) => s + (e.credit || 0), 0);
        return Math.max(fromHistory, fromLedger);
    }

    function _interestTillLastPayment(loan) {
        if (!loan) return 0;
        try {
            const ph = (loan.paymentHistory || []);
            if (ph.length === 0) return 0;
            return ph.reduce((s, p) => s + (p.interestDeducted || 0), 0);
        } catch(e) { return 0; }
    }

    function _initLedger(loan) {
        if (loan.loanLedger && loan.loanLedger.length > 0) return;
        loan.loanLedger = [];
        // Seed from original disbursement
        const principal = loan.originalLoanAmount || loan.loanAmount || 0;
        const startDate = loan.originalStartDate || loan.loanStartDate || new Date().toISOString().split('T')[0];
        let balance = principal;
        loan.loanLedger.push({ date: startDate, particulars: `${loan.metalType === 'gold' ? '🥇' : '🥈'} Gold Loan Issued`, debit: principal, credit: 0, balance, type: 'loan' });
        // Seed from payment history
        (loan.paymentHistory || []).slice().sort((a,b) => new Date(a.date)-new Date(b.date)).forEach(p => {
            balance = Math.max(0, balance - (p.paidAmount || 0));
            loan.loanLedger.push({ date: p.date, particulars: 'Payment Received', debit: 0, interest: p.interestDeducted || 0, credit: p.paidAmount || 0, balance, type: 'payment' });
        });
    }

    // ── Deduplicate ledger (fix old corrupted data in localStorage) ───────────
    function _dedupLedger(loan) {
        if (!loan || !loan.loanLedger || loan.loanLedger.length <= 1) return;
        const seen = new Set();
        loan.loanLedger = loan.loanLedger.filter(e => {
            // key = date + type + credit amount; duplicates share all three
            const key = `${e.date}|${e.type}|${e.credit}|${e.debit}`;
            if (seen.has(key) && e.type === 'payment') return false;
            seen.add(key);
            return true;
        });
    }

    // ── Interest Mode + Basis State ───────────────────────────────────────────
    let _ledgerMode    = 'daily'; // 'daily' | 'monthly'
    let _interestBasis = 360;     // 360 (jewellery standard) | 365 (standard)

    function toggleLedgerMode(loanId) {
        _ledgerMode = _ledgerMode === 'daily' ? 'monthly' : 'daily';
        // Full re-render: mode affects both Interest Summary and Ledger
        render(document.getElementById('page-container'), loanId);
    }

    function toggleInterestBasis(loanId) {
        _interestBasis = _interestBasis === 360 ? 365 : 360;
        // Full re-render: basis affects Interest Summary + all calculations
        render(document.getElementById('page-container'), loanId);
    }

    function _buildLedgerCardInner(loan, loanId) {
        const mode  = _ledgerMode;
        const basis = _interestBasis;
        const btnDaily   = mode  === 'daily'   ? 'background:var(--primary);color:#fff;'  : 'background:var(--bg-input);color:var(--text-secondary);';
        const btnMonthly = mode  === 'monthly' ? 'background:var(--primary);color:#fff;'  : 'background:var(--bg-input);color:var(--text-secondary);';
        const btn360     = basis === 360        ? 'background:var(--gold-dark);color:#fff;': 'background:var(--bg-input);color:var(--text-secondary);';
        const btn365     = basis === 365        ? 'background:var(--gold-dark);color:#fff;': 'background:var(--bg-input);color:var(--text-secondary);';
        return `
            <div class="ld-section-title">📒 Loan Ledger
                <span style="margin-left:auto;display:inline-flex;flex-wrap:wrap;gap:5px;">
                    <button onclick="LoanDetailPage.toggleLedgerMode('${loanId}')"
                        style="${btnDaily}border:1px solid var(--border-color);padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">📅 Day-wise</button>
                    <button onclick="LoanDetailPage.toggleLedgerMode('${loanId}')"
                        style="${btnMonthly}border:1px solid var(--border-color);padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">📆 Monthly</button>
                    <button onclick="LoanDetailPage.toggleInterestBasis('${loanId}')"
                        style="${btn360}border:1px solid var(--border-color);padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">360d</button>
                    <button onclick="LoanDetailPage.toggleInterestBasis('${loanId}')"
                        style="${btn365}border:1px solid var(--border-color);padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;">365d</button>
                </span>
            </div>
            ${_buildEventLedgerHTML(loan, mode, basis, loanId)}`;
    }

    // ── Event-Based Ledger HTML ───────────────────────────────────────────────
    function _buildEventLedgerHTML(loan, mode, basis, loanId) {
        if (!loan) return '<p class="text-muted">No data.</p>';
        mode  = mode  || 'daily';
        basis = basis || _interestBasis || 360;
        try {
            _initLedger(loan);
            // Auto-fix any duplicate entries already in localStorage (one-time heal)
            const beforeCount = (loan.loanLedger || []).length;
            _dedupLedger(loan);
            if ((loan.loanLedger || []).length < beforeCount) {
                DB.saveLoan(loan);
            }
            const ledger = loan.loanLedger || [];
            if (ledger.length === 0) return '<p class="text-muted" style="font-size:0.85rem;">No ledger entries yet.</p>';

            // Rate info for interest computation
            const annualRate     = (loan.interestPeriod === 'yearly'
                ? parseFloat(loan.interestRate)
                : parseFloat(loan.interestRate) * 12) || 0;
            const monthlyRatePct = annualRate / 12; // e.g. 2 for 2%

            // ── Net Payable from Financial Summary (ground truth) ─────────────
            let netPayable = 0;
            try {
                const settings = DB.getSettings();
                const mktRate  = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
                const d        = Calculator.calcLoanDetails(loan, mktRate, { basis });
                const basePayable = d.totalPayable || 0;
                netPayable = Math.max(0, basePayable
                    - (loan.totalDiscount   || 0)
                    + (loan.totalAdjustment || 0));
            } catch(e) { netPayable = 0; }

            // ── Row-wise running balance (includes interest before payment) ────
            const origPrincipal = loan.originalLoanAmount || loan.loanAmount || 0;
            let   runningBal    = origPrincipal;

            const rows = ledger.map((e, idx) => {
                const debitColor  = e.debit  > 0 ? 'color:var(--danger);'  : 'color:var(--text-secondary);';
                const creditColor = e.credit > 0 ? 'color:var(--safe);'    : 'color:var(--text-secondary);';

                // ── Compute display interest per row ──────────────────────────
                let rowInterest = 0;
                try {
                    if (e.type === 'payment' || e.type === 'interest') {
                        if (mode === 'daily') {
                            rowInterest = isFinite(e.interest) ? (e.interest || 0) : 0;
                        } else {
                            const prevBal = idx > 0 ? (ledger[idx - 1].balance || 0) : (e.balance || 0);
                            rowInterest = Calculator.calculateMonthlyInterest(prevBal, monthlyRatePct);
                        }
                    }
                    if (!isFinite(rowInterest)) rowInterest = 0;
                } catch(err) { rowInterest = 0; }

                // ── Running balance: interest first, then subtract payment ────
                let displayBal = 0;
                try {
                    if (e.type === 'loan') {
                        // Loan issued row — starting balance = principal
                        runningBal = isFinite(e.debit) ? e.debit : origPrincipal;
                        displayBal = runningBal;
                    } else if (e.type === 'payment' || e.type === 'settle') {
                        // Balance = prevBal + interest − payment
                        runningBal = runningBal + rowInterest - (isFinite(e.credit) ? e.credit : 0);
                        runningBal = Math.max(0, runningBal);
                        if (!isFinite(runningBal)) runningBal = 0;
                        displayBal = parseFloat(runningBal.toFixed(2));
                    } else if (e.type === 'discount') {
                        runningBal = Math.max(0, runningBal - (isFinite(e.credit) ? e.credit : 0));
                        if (!isFinite(runningBal)) runningBal = 0;
                        displayBal = parseFloat(runningBal.toFixed(2));
                    } else {
                        // adjustment or unknown — use stored balance
                        runningBal = isFinite(e.balance) ? e.balance : runningBal;
                        displayBal = runningBal;
                    }
                } catch(err) { displayBal = runningBal; }

                const interestColor = rowInterest > 0 ? 'color:var(--monitor);' : 'color:var(--text-secondary);';
                const balColor      = idx === ledger.length - 1 ? 'color:var(--primary);' : 'color:var(--gold-dark);';
                return `<tr>
                    <td style="font-size:0.82rem;">${UI.formatDate(e.date)}</td>
                    <td style="font-size:0.85rem;font-weight:600;">${e.particulars}</td>
                    <td style="${debitColor}font-weight:700;">${e.debit > 0 ? UI.currency(e.debit) : '—'}</td>
                    <td style="${interestColor}font-weight:700;">${rowInterest > 0 ? UI.currency(rowInterest) : '—'}</td>
                    <td style="${creditColor}font-weight:700;">${e.credit > 0 ? UI.currency(e.credit) : '—'}</td>
                    <td style="${balColor}font-weight:800;">${UI.currency(displayBal)}</td>
                </tr>`;
            }).join('');

            // ── Closing Balance = Net Payable (always matches Financial Summary)
            const closingFmt = netPayable > 0
                ? UI.currency(netPayable)
                : '₹0';

            return `<div class="ld-table-wrap"><table class="ld-table">
                <thead><tr>
                    <th>Date</th><th>Particulars</th><th>Debit (₹)</th>
                    <th>Interest (₹)</th><th>Credit (₹)</th><th>Net Payable (₹)</th>
                </tr></thead>
                <tbody>${rows}
                <tr class="ld-tfoot-row">
                    <td colspan="5" style="font-weight:700;">Net Payable (matches Financial Summary)</td>
                    <td style="font-weight:800;color:var(--primary);">${closingFmt}</td>
                </tr>
                </tbody>
            </table></div>`;
        } catch(err) { console.error(err); return '<p class="text-muted">Ledger error.</p>'; }
    }

    function _saveLedgerEntry(loan, entry) {
        _initLedger(loan);
        const last = loan.loanLedger[loan.loanLedger.length - 1];
        const prevBalance = last ? last.balance : (loan.originalLoanAmount || loan.loanAmount || 0);
        try {
            if (entry.type === 'payment' || entry.type === 'settle') {
                // Correct balance: prevBal + interest accrued − total payment
                // This equals the new remaining principal after the payment
                const interest = isFinite(entry.interest) ? (entry.interest || 0) : 0;
                entry.balance = Math.max(0, prevBalance + interest - (entry.credit || 0));
            } else if (entry.type === 'discount') {
                entry.balance = Math.max(0, prevBalance - (entry.credit || 0));
            } else {
                // adjustment, loan-issued, etc.
                entry.balance = prevBalance + (entry.debit || 0);
            }
            if (!isFinite(entry.balance)) entry.balance = 0;
            entry.balance = parseFloat(entry.balance.toFixed(2));
        } catch(e) { entry.balance = prevBalance; }
        loan.loanLedger.push(entry);
    }

    // ── Modal: Adjust Amount ──────────────────────────────────────────────────
    function showAdjustModal(loanId) {
        document.getElementById('hisaab-modal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay'; overlay.id = 'hisaab-modal';
        overlay.innerHTML = `<div class="modal"><h3 class="modal-title">🔧 Adjust Amount</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem;">Enter positive value to increase balance, negative to decrease.</p>
            <div class="form-group mb-2"><label class="form-label">Adjustment Amount (₹)</label>
                <input type="number" class="form-input" id="adj-amount" placeholder="e.g. 500 or -500"></div>
            <div class="form-group mb-2"><label class="form-label">Note</label>
                <input type="text" class="form-input" id="adj-note" placeholder="Reason for adjustment"></div>
            <div class="form-group mb-3"><label class="form-label">Date</label>
                <input type="date" class="form-input" id="adj-date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="document.getElementById('hisaab-modal').remove()">Cancel</button>
                <button class="btn btn-gold" onclick="LoanDetailPage.processAdjust('${loanId}')">Apply Adjustment</button>
            </div></div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    function processAdjust(loanId) {
        const loan = DB.getLoan(loanId); if (!loan) return;
        const amount = parseFloat(document.getElementById('adj-amount')?.value);
        const note   = document.getElementById('adj-note')?.value.trim() || 'Manual Adjustment';
        const date   = document.getElementById('adj-date')?.value;
        if (!amount || !date) { UI.toast('Enter amount and date', 'error'); return; }
        _initLedger(loan);
        const isPositive = amount > 0;
        const entry = { date, particulars: `🔧 Adjustment — ${note}`, debit: isPositive ? Math.abs(amount) : 0, credit: isPositive ? 0 : Math.abs(amount), type: 'adjustment' };
        _saveLedgerEntry(loan, entry);
        loan.totalAdjustment = (loan.totalAdjustment || 0) + amount;
        DB.saveLoan(loan);
        document.getElementById('hisaab-modal')?.remove();
        UI.toast('Adjustment applied!', 'success');
        render(document.getElementById('page-container'), loanId);
    }

    // ── Modal: Partial Payment (action panel button) ──────────────────────────
    function showPartialPaymentModal2(loanId, totalPayable, remainingInterest) {
        document.getElementById('hisaab-modal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay'; overlay.id = 'hisaab-modal';
        overlay.innerHTML = `<div class="modal"><h3 class="modal-title">💵 Partial Payment</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem;">Total Due: <strong>${UI.currency(totalPayable)}</strong></p>
            <div class="form-group mb-2"><label class="form-label">Payment Amount (₹) *</label>
                <input type="number" class="form-input" id="pay-amount" placeholder="Enter amount" min="1"></div>
            <div class="form-group mb-2"><label class="form-label">Payment Date *</label>
                <input type="date" class="form-input" id="pay-date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group mb-3"><label class="form-label">Notes (Optional)</label>
                <textarea class="form-input" id="pay-note" rows="2" maxlength="250"
                    placeholder="e.g. Advance payment, partial clearance…" style="resize:none;"></textarea></div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="document.getElementById('hisaab-modal').remove()">Cancel</button>
                <button class="btn btn-gold" onclick="LoanDetailPage.processPayment('${loanId}')">Confirm Payment</button>
            </div></div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    // ── Modal: Discount ───────────────────────────────────────────────────────
    function showDiscountModal(loanId) {
        document.getElementById('hisaab-modal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay'; overlay.id = 'hisaab-modal';
        overlay.innerHTML = `<div class="modal"><h3 class="modal-title">🏷️ Give Discount</h3>
            <div class="form-group mb-2"><label class="form-label">Discount Amount (₹) *</label>
                <input type="number" class="form-input" id="disc-amount" placeholder="e.g. 500" min="1"></div>
            <div class="form-group mb-3"><label class="form-label">Date</label>
                <input type="date" class="form-input" id="disc-date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="document.getElementById('hisaab-modal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="LoanDetailPage.processDiscount('${loanId}')">Apply Discount</button>
            </div></div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    function processDiscount(loanId) {
        const loan = DB.getLoan(loanId); if (!loan) return;
        const amount = parseFloat(document.getElementById('disc-amount')?.value);
        const date   = document.getElementById('disc-date')?.value;
        if (!amount || amount <= 0 || !date) { UI.toast('Enter valid discount amount and date', 'error'); return; }
        _initLedger(loan);
        _saveLedgerEntry(loan, { date, particulars: '🏷️ Discount Given', debit: 0, credit: amount, type: 'discount' });
        loan.totalDiscount = (loan.totalDiscount || 0) + amount;
        DB.saveLoan(loan);
        document.getElementById('hisaab-modal')?.remove();
        UI.toast('Discount applied!', 'success');
        render(document.getElementById('page-container'), loanId);
    }

    // ── Modal: Settle Loan ────────────────────────────────────────────────────
    function showSettleModal2(loanId, totalPayable) {
        document.getElementById('hisaab-modal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay'; overlay.id = 'hisaab-modal';
        overlay.innerHTML = `<div class="modal"><h3 class="modal-title">✅ Settle Loan</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem;">Total Payable: <strong>${UI.currency(totalPayable)}</strong></p>
            <div class="form-group mb-2"><label class="form-label">Final Amount Received (₹) *</label>
                <input type="number" class="form-input" id="settle-amount" placeholder="Amount received" min="0"></div>
            <div class="form-group mb-3"><label class="form-label">Date</label>
                <input type="date" class="form-input" id="settle-date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="document.getElementById('hisaab-modal').remove()">Cancel</button>
                <button class="btn btn-sm" style="background:rgba(16,185,129,0.2);border:1px solid var(--safe);color:var(--safe);" onclick="LoanDetailPage.processSettle('${loanId}',${totalPayable})">Confirm Settlement</button>
            </div></div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    async function processSettle(loanId, totalPayable) {
        const loan = DB.getLoan(loanId); if (!loan) return;
        const received = parseFloat(document.getElementById('settle-amount')?.value) || 0;
        const date     = document.getElementById('settle-date')?.value;
        if (!date) { UI.toast('Select settlement date', 'error'); return; }
        if (!await UI.confirm('Settle Loan', `Mark loan as SETTLED? Received: ${UI.currency(received)}`)) return;
        _initLedger(loan);
        _saveLedgerEntry(loan, { date, particulars: '✅ Loan Settled', debit: 0, credit: received, type: 'settle' });
        const diff = totalPayable - received;
        if (diff > 0) { loan.totalDiscount = (loan.totalDiscount || 0) + diff; }
        loan.status = 'closed';
        loan.settlement = { date: new Date().toISOString(), totalAmount: totalPayable, paidAmount: received, discount: diff > 0 ? diff : 0, adjustment: 0, status: 'CLOSED' };
        DB.saveLoan(loan);
        document.getElementById('hisaab-modal')?.remove();
        UI.toast('Loan settled successfully!', 'success');
        render(document.getElementById('page-container'), loanId);
    }



    // Reconstruct full ledger from loan history
    function _buildLedger(loan) {
        if (!loan) return [];
        try {
            const entries     = [];
            const payments    = (loan.paymentHistory || []).slice().sort((a,b) => new Date(a.date)-new Date(b.date));

            // Determine original start state
            // processPayment stores originalStartDate & originalLoanAmount on first payment
            const origAmount  = loan.originalLoanAmount != null ? loan.originalLoanAmount : (loan.loanAmount || 0);
            const origStart   = loan.originalStartDate  || loan.loanStartDate;
            if (!origStart) return [];

            const monthlyRate = _monthlyRate(loan);
            const today       = new Date();
            today.setHours(0,0,0,0);

            let balance   = origAmount;
            let segStart  = new Date(origStart);
            segStart.setHours(0,0,0,0);
            let payIdx    = 0;

            // Loan disbursement entry
            entries.push({ date: origStart, type: 'Loan', amount: origAmount, balance, note: '' });

            // Walk month-by-month, interleaving payments
            let cursor = _addOneMonth(segStart);
            const LIMIT = 120; // max 10 years of rows
            let safeCount = 0;

            while (cursor <= today && safeCount < LIMIT) {
                safeCount++;
                const cursorStr = cursor.toISOString().split('T')[0];

                // Apply any payments that fall before this cursor
                while (payIdx < payments.length) {
                    const p = payments[payIdx];
                    const pd = new Date(p.date);
                    pd.setHours(0,0,0,0);
                    if (pd < cursor) {
                        balance = Math.max(0, balance - (p.paidAmount || 0));
                        entries.push({ date: p.date, type: 'Payment', amount: p.paidAmount || 0, balance, note: '' });
                        payIdx++;
                    } else break;
                }

                // Monthly interest on current balance
                if (balance > 0) {
                    const interest = Math.round(balance * monthlyRate * 100) / 100;
                    balance = balance + interest;
                    entries.push({ date: cursorStr, type: 'Interest', amount: interest, balance, note: `${loan.interestRate}% / ${loan.interestPeriod||'month'}` });
                }

                cursor = _addOneMonth(cursor);
            }

            // Apply any remaining payments after last interest entry
            while (payIdx < payments.length) {
                const p = payments[payIdx];
                balance = Math.max(0, balance - (p.paidAmount || 0));
                entries.push({ date: p.date, type: 'Payment', amount: p.paidAmount || 0, balance, note: '' });
                payIdx++;
            }

            return entries;
        } catch(e) {
            console.error('Ledger build error:', e);
            return [];
        }
    }

    function _monthlyRate(loan) {
        const r = parseFloat(loan.interestRate) || 0;
        if (!r) return 0;
        const period = loan.interestPeriod || 'monthly';
        const annual = period === 'yearly' ? r : r * 12;
        return annual / 100 / 12;
    }

    function _addOneMonth(d) {
        const nd = new Date(d);
        nd.setMonth(nd.getMonth() + 1);
        return nd;
    }

    async function sendWhatsApp(loanId) {
        const loan = DB.getLoan(loanId);
        if (!loan) return;

        const customer = loan.customerId ? DB.getCustomer(loan.customerId) : null;
        const phone = (customer && customer.mobile) ? customer.mobile : loan.mobile;
        
        if (!phone) {
            UI.toast('No mobile number available for this customer', 'error');
            return;
        }

        const settings = DB.getSettings();
        const shopName = settings.shopName || "GOLD LOAN";
        
        UI.toast('Generating PDF...', 'info');

        try {
            // 1) Generate the PDF blob using html2pdf
            const blob = await Export.generateLoanPDFBlob(loan);
            
            const cleanName = loan.customerName.replace(/\s+/g, '');
            const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
            const filename = `${cleanName}_GoldLoan_${dateStr}.pdf`;

            const file = new File([blob], filename, { type: "application/pdf" });
            const messageText = `Hello ${loan.customerName},\n\nYour Gold Loan Bill from ${shopName} is ready.\n\nLoan Amount: ${UI.currency(loan.loanAmount)}\nMetal Weight: ${loan.items.reduce((sum, item) => sum + parseFloat(item.weight), 0)}g\nInterest: ${loan.interestRate}% ${loan.interestRateType}`;

            // Helper for fallback link sharing
            function fallbackShare() {
                const pdfLink = `https://${window.location.hostname || 'yourwebsite.com'}/bills/${loan.id}.pdf`;
                const fallbackMessage = `${messageText}\n\nDownload Bill PDF:\n${pdfLink}`;
                
                let formattedPhone = phone.replace(/\D/g, '');
                if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
                
                const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(fallbackMessage)}`;
                window.open(whatsappURL, "_blank");
            }

            // 2) Try Web Share API with file attachment
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: "Gold Loan Bill",
                        text: messageText,
                        files: [file]
                    });
                    UI.toast('Shared successfully', 'success');
                } catch (e) {
                    // If user cancelled, it throws AbortError. Do not fallback on abort.
                    if (e.name !== 'AbortError') fallbackShare();
                }
            } else {
                // 3) Fallback if sharing files is not supported (Desktop/Old browsers)
                fallbackShare();
            }

        } catch (err) {
            console.error(err);
            UI.toast('Error preparing PDF for WhatsApp', 'error');
        }
    }

    function showPaymentModal(loanId, totalPayable, remainingInterest) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">
            <h3 class="modal-title">💵 Make Partial Payment</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem">Total Due: <strong>${UI.currency(totalPayable)}</strong><br />Outstanding Interest: <strong>${UI.currency(remainingInterest)}</strong></p>

            <div class="form-group mb-2">
                <label class="form-label">Payment Amount (₹) *</label>
                <input type="number" class="form-input" id="pay-amount" placeholder="Enter amount" min="1" max="${totalPayable}" />
            </div>
            <div class="form-group mb-2">
                <label class="form-label">Date of Payment *</label>
                <input type="date" class="form-input" id="pay-date" value="${new Date().toISOString().split('T')[0]}" />
            </div>
            <div class="form-group mb-3">
                <label class="form-label">Notes (Optional)</label>
                <textarea class="form-input" id="pay-note" rows="2" maxlength="250"
                    placeholder="e.g. Advance payment, token amount…" style="resize:none;"></textarea>
            </div>

            <div class="callout callout-info mb-3">
                ℹ️ <strong>How it works:</strong> Payment is first applied to outstanding interest. Any remaining amount reduces the <strong>principal</strong>. The interest calculation date will be reset to this payment date, and future interest will apply <strong>only to the new principal</strong>.
            </div>

            <div class="modal-actions">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-gold" onclick="LoanDetailPage.processPayment('${loanId}')">Confirm Payment</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    function processPayment(loanId) {
        const amountStr = document.getElementById('pay-amount')?.value;
        const dateStr   = document.getElementById('pay-date')?.value;
        // Read optional note (safe: returns '' if element absent)
        const note = (document.getElementById('pay-note')?.value || '').trim().slice(0, 250);
        const amount = parseFloat(amountStr);

        if (!amount || amount <= 0) { UI.toast('Enter a valid amount', 'error'); return; }
        if (!dateStr) { UI.toast('Select payment date', 'error'); return; }

        const loan = DB.getLoan(loanId);
        if (!loan) { UI.toast('Loan not found', 'error'); return; }

        const settings = DB.getSettings();
        const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        const d = Calculator.calcLoanDetails(loan, rate);

        if (amount > d.totalPayable) { UI.toast('Payment exceeds total payable', 'error'); return; }

        // Logic:
        // Payment goes to interest first, then principal.
        let interestDeducted = 0;
        let principalReduced = 0;

        if (amount >= d.remainingInterest) {
            interestDeducted = d.remainingInterest;
            principalReduced = amount - d.remainingInterest;
        } else {
            interestDeducted = amount;
            principalReduced = 0;
        }

        const newPrincipal = d.remainingPrincipal - principalReduced;

        // Update Loan State
        // It's critical to preserve original values for records
        if (!loan.originalLoanAmount) loan.originalLoanAmount = loan.loanAmount;
        if (!loan.originalStartDate) loan.originalStartDate = loan.loanStartDate;

        // FIX: Initialize ledger BEFORE pushing to paymentHistory.
        // If _initLedger runs after push, it seeds this payment from history,
        // then _saveLedgerEntry adds it again — causing double entries.
        _initLedger(loan);

        // Save history record (include note)
        if (!loan.paymentHistory) loan.paymentHistory = [];
        loan.paymentHistory.push({
            date: dateStr,
            paidAmount: amount,
            interestDeducted,
            principalReduced,
            remainingPrincipal: newPrincipal,
            note: note || ''
        });

        // Reset the loan "start date" to the payment date so new interest calculates from here
        // Update the principal to the new remaining amount
        loan.loanStartDate = dateStr;
        loan.loanAmount = newPrincipal;
        
        // Reset paid interest/repayment fields as we've internalized them into the new principal/start date
        loan.paidInterest = 0;
        loan.partialRepayment = 0;
        loan.manualPenalty = 0; // Assuming penalty is paid off

        // Save ledger entry — embed note in Particulars if provided
        const particulars = note
            ? `💵 Payment Received 📝 ${note}`
            : '💵 Payment Received';
        _saveLedgerEntry(loan, { date: dateStr, particulars, debit: 0, interest: interestDeducted, credit: amount, type: 'payment' });
        DB.saveLoan(loan);
        document.querySelector('.modal-overlay')?.remove();
        document.getElementById('hisaab-modal')?.remove();
        UI.toast('Payment recorded successfully', 'success');
        render(document.getElementById('page-container'), loanId);
    }

    async function closeLoan(id) {
        if (await UI.confirm('Close Loan', 'Mark as closed?')) {
            const loan = DB.getLoan(id); loan.status = 'closed'; DB.saveLoan(loan);
            UI.toast('Loan closed', 'success'); UI.navigateTo('loan-detail', id);
        }
    }
    async function del(id) {
        if (await UI.confirm('Delete', 'Cannot be undone.')) {
            DB.deleteLoan(id); UI.toast('Deleted', 'success'); UI.navigateTo('loans');
        }
    }

    // ── Risk Panel Toggle ─────────────────────────────────────────────────────
    let _riskVisible = false; // OFF by default

    // ── Edit Locker Number (PIN-protected) ─────────────────────────────────────────

    function showLockerEditModal(loanId) {
        try {
            document.getElementById('ld-locker-modal')?.remove();
            const ov = document.createElement('div');
            ov.className = 'modal-overlay'; ov.id = 'ld-locker-modal';
            ov.innerHTML = `<div class="modal" style="max-width:340px;">
                <h3 class="modal-title">🔐 Security PIN</h3>
                <p class="text-muted mb-2" style="font-size:0.85rem;">Enter PIN to edit Locker Number.</p>
                <div class="form-group mb-3">
                    <input type="password" id="ld-locker-pin" class="form-input"
                        placeholder="Enter PIN" maxlength="8" autocomplete="off"
                        onkeydown="if(event.key==='Enter')LoanDetailPage.verifyAndEditLocker('${loanId}')" />
                </div>
                <p id="ld-locker-pin-err" style="color:var(--danger);font-size:0.82rem;min-height:18px;"></p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="document.getElementById('ld-locker-modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="LoanDetailPage.verifyAndEditLocker('${loanId}')">Verify →</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            ov.onclick = e => { if (e.target === ov) ov.remove(); };
            setTimeout(() => document.getElementById('ld-locker-pin')?.focus(), 80);
        } catch(e) { console.error('showLockerEditModal', e); }
    }

    function verifyAndEditLocker(loanId) {
        try {
            const pin = document.getElementById('ld-locker-pin')?.value || '';
            if (!_verifyPin(pin)) {
                const err = document.getElementById('ld-locker-pin-err');
                if (err) err.textContent = '❌ Incorrect PIN. Try again.';
                document.getElementById('ld-locker-pin')?.select();
                return;
            }
            document.getElementById('ld-locker-modal')?.remove();
            const loan = DB.getLoan(loanId);
            if (!loan) { UI.toast('Loan not found', 'error'); return; }

            const curLocker = loan.lockerName || loan.lockerNo || '';
            const ov = document.createElement('div');
            ov.className = 'modal-overlay'; ov.id = 'ld-locker-modal';
            ov.innerHTML = `<div class="modal" style="max-width:360px;">
                <h3 class="modal-title">🔒 Edit Locker Number</h3>
                <p class="text-muted mb-3" style="font-size:0.82rem;">Update the locker number for ${loan.customerName || 'this loan'}.</p>
                <div class="form-group mb-4">
                    <label class="form-label">Locker Number *</label>
                    <input type="text" id="ld-locker-input" class="form-input"
                        value="${curLocker}" placeholder="e.g. A-12" maxlength="50"
                        onkeydown="if(event.key==='Enter')LoanDetailPage.processLockerEdit('${loanId}')" />
                </div>
                <p id="ld-locker-err" style="color:var(--danger);font-size:0.82rem;min-height:18px;"></p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="document.getElementById('ld-locker-modal').remove()">Cancel</button>
                    <button class="btn btn-gold" onclick="LoanDetailPage.processLockerEdit('${loanId}')">Save</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            ov.onclick = e => { if (e.target === ov) ov.remove(); };
            setTimeout(() => { const inp = document.getElementById('ld-locker-input'); inp?.focus(); inp?.select(); }, 80);
        } catch(e) { console.error('verifyAndEditLocker', e); UI.toast('Error opening locker edit', 'error'); }
    }

    function processLockerEdit(loanId) {
        try {
            const rawValue = document.getElementById('ld-locker-input')?.value || '';
            const newLocker = rawValue.trim();
            const errEl    = document.getElementById('ld-locker-err');

            if (!newLocker) {
                if (errEl) errEl.textContent = '❌ Locker Number cannot be empty.';
                return;
            }

            const loan = DB.getLoan(loanId);
            if (!loan) { UI.toast('Loan not found', 'error'); return; }

            // Update ONLY locker fields — nothing else touched
            loan.lockerName = newLocker;
            loan.lockerNo   = newLocker;
            DB.saveLoan(loan);

            // Close modal
            document.getElementById('ld-locker-modal')?.remove();

            // Update BOTH display spots instantly — no full re-render needed
            const disp   = document.getElementById('locker-display-' + loanId);
            const header = document.getElementById('locker-header-' + loanId);
            if (disp)   disp.textContent   = newLocker;
            if (header) header.textContent = '🔒 ' + newLocker;

            UI.toast('🔒 Locker number updated ✓', 'success');
        } catch(e) {
            console.error('processLockerEdit', e);
            UI.toast('Error saving locker number. Previous value kept.', 'error');
        }
    }

    // ── Edit Loan Feature ─────────────────────────────────────────────────────

    function _verifyPin(inputPin) {
        try {
            const saved = localStorage.getItem('app_pin') || '1234';
            return String(inputPin).trim() === String(saved).trim();
        } catch(e) { return false; }
    }

    function showEditModal(loanId) {
        try {
            document.getElementById('ld-edit-modal')?.remove();
            const ov = document.createElement('div');
            ov.className = 'modal-overlay'; ov.id = 'ld-edit-modal';
            ov.innerHTML = `<div class="modal" style="max-width:340px;">
                <h3 class="modal-title">🔐 Security PIN</h3>
                <p class="text-muted mb-2" style="font-size:0.85rem;">Enter your PIN to edit loan details.</p>
                <div class="form-group mb-3">
                    <input type="password" id="ld-pin-input" class="form-input"
                        placeholder="Enter PIN" maxlength="8" autocomplete="off"
                        onkeydown="if(event.key==='Enter')LoanDetailPage.verifyAndShowEditForm('${loanId}')" />
                </div>
                <p id="ld-pin-error" style="color:var(--danger);font-size:0.82rem;min-height:18px;"></p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="document.getElementById('ld-edit-modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="LoanDetailPage.verifyAndShowEditForm('${loanId}')">Verify →</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            ov.onclick = e => { if (e.target === ov) ov.remove(); };
            setTimeout(() => document.getElementById('ld-pin-input')?.focus(), 80);
        } catch(e) { console.error('showEditModal', e); }
    }

    function verifyAndShowEditForm(loanId) {
        try {
            const pin = document.getElementById('ld-pin-input')?.value || '';
            if (!_verifyPin(pin)) {
                const err = document.getElementById('ld-pin-error');
                if (err) { err.textContent = '❌ Incorrect PIN. Try again.'; }
                document.getElementById('ld-pin-input')?.select();
                return;
            }
            // PIN OK — close PIN modal, open edit form
            document.getElementById('ld-edit-modal')?.remove();
            const loan = DB.getLoan(loanId);
            if (!loan) { UI.toast('Loan not found', 'error'); return; }

            const curRate = loan.interestRate || '';
            const curType = loan.interestType || 'simple';
            const curPeriod = loan.interestPeriod || 'monthly';

            const ov = document.createElement('div');
            ov.className = 'modal-overlay'; ov.id = 'ld-edit-modal';
            ov.innerHTML = `<div class="modal" style="max-width:380px;">
                <h3 class="modal-title">✏️ Edit Loan — ${loan.customerName || ''}</h3>
                <p class="text-muted mb-3" style="font-size:0.82rem;">Only Interest Rate and Type can be changed. All values will be fully recalculated on save.</p>

                <div class="form-group mb-3">
                    <label class="form-label">Interest Rate (%)</label>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input type="number" id="ld-edit-rate" class="form-input" step="0.01" min="0.01"
                            value="${curRate}" placeholder="e.g. 2" style="flex:1;" />
                        <select id="ld-edit-period" class="form-input" style="width:130px;">
                            <option value="monthly"  ${curPeriod==='monthly'  ? 'selected':''}>per Month</option>
                            <option value="yearly"   ${curPeriod==='yearly'   ? 'selected':''}>per Year</option>
                        </select>
                    </div>
                </div>

                <div class="form-group mb-4">
                    <label class="form-label">Interest Type</label>
                    <select id="ld-edit-type" class="form-input">
                        <option value="simple"   ${curType==='simple'   ? 'selected':''}>Simple Interest</option>
                        <option value="compound" ${curType==='compound' ? 'selected':''}>Compound Interest</option>
                    </select>
                </div>

                <p id="ld-edit-error" style="color:var(--danger);font-size:0.82rem;min-height:18px;"></p>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="document.getElementById('ld-edit-modal').remove()">Cancel</button>
                    <button class="btn btn-gold" onclick="LoanDetailPage.processLoanEdit('${loanId}')">💾 Save &amp; Recalculate</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            ov.onclick = e => { if (e.target === ov) ov.remove(); };
            setTimeout(() => document.getElementById('ld-edit-rate')?.focus(), 80);
        } catch(e) { console.error('verifyAndShowEditForm', e); UI.toast('Error opening edit form', 'error'); }
    }

    function processLoanEdit(loanId) {
        try {
            const loan = DB.getLoan(loanId);
            if (!loan) { UI.toast('Loan not found', 'error'); return; }

            const newRate   = parseFloat(document.getElementById('ld-edit-rate')?.value);
            const newType   = document.getElementById('ld-edit-type')?.value;
            const newPeriod = document.getElementById('ld-edit-period')?.value;
            const errEl     = document.getElementById('ld-edit-error');

            // Validation
            if (!newRate || newRate <= 0 || !isFinite(newRate)) {
                if (errEl) errEl.textContent = '❌ Interest rate must be greater than 0.';
                return;
            }
            if (!['simple','compound'].includes(newType)) {
                if (errEl) errEl.textContent = '❌ Invalid interest type.';
                return;
            }

            // Apply changes to loan object
            loan.interestRate   = newRate;
            loan.interestType   = newType;
            loan.interestPeriod = newPeriod || 'monthly';

            // Persist
            DB.saveLoan(loan);

            // Close modal
            document.getElementById('ld-edit-modal')?.remove();

            // Full re-render = full recalculation (calcLoanDetails runs fresh)
            const container = document.getElementById('page-container');
            if (container) render(container, loanId);

            UI.toast('Loan updated and recalculated ✓', 'success');
        } catch(e) {
            console.error('processLoanEdit', e);
            UI.toast('Error saving changes. No data was modified.', 'error');
        }
    }

    function toggleRiskPanel() {
        _riskVisible = !_riskVisible;
        const panel = document.getElementById('risk-panel-wrapper');
        const btn   = document.getElementById('risk-toggle-btn');
        const dot   = document.getElementById('risk-toggle-dot');
        const lbl   = document.getElementById('risk-toggle-label');
        if (!panel || !btn) return;
        panel.style.display = _riskVisible ? 'block' : 'none';
        btn.style.background = _riskVisible ? 'var(--safe)' : 'rgba(148,163,184,0.2)';
        btn.style.color      = _riskVisible ? '#fff' : 'var(--text-secondary)';
        if (dot) dot.style.background = _riskVisible ? '#fff' : 'var(--text-secondary)';
        if (lbl) lbl.textContent = _riskVisible ? 'ON' : 'OFF';
    }

    return { render, showPaymentModal, processPayment, sendWhatsApp, closeLoan, del,
             _netPayable, _getTotalPaid, _interestTillLastPayment, _buildEventLedgerHTML,
             showAdjustModal, processAdjust,
             showPartialPaymentModal2,
             showDiscountModal, processDiscount,
             showSettleModal2, processSettle,
             showEditModal, verifyAndShowEditForm, processLoanEdit,
             showLockerEditModal, verifyAndEditLocker, processLockerEdit,
             toggleRiskPanel, toggleLedgerMode, toggleInterestBasis,
             get _riskVisible()    { return _riskVisible;    },
             get _ledgerMode()     { return _ledgerMode;     },
             get _interestBasis()  { return _interestBasis;  } };
})();
