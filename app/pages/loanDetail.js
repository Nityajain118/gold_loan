/* ============================================
   Loan Detail Page — Shows Jewelry Items
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
        const d = Calculator.calcLoanDetails(loan, rate);
        const icon = loan.metalType === 'gold' ? '🥇' : '🥈';
        const items = loan.items || [];

        // Build items table if there are items
        let itemsHtml = '';
        if (items.length > 0) {
            const rates = Market.getCurrentRates();
            itemsHtml = `
            <div class="card mb-2">
                <h4 style="font-size:0.9rem;margin-bottom:12px;color:var(--primary);">💍 Jewelry Items (${items.length})</h4>
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>#</th><th>Item</th><th>Metal</th><th>Purity</th><th>Weight</th><th>Value</th>
                </tr></thead><tbody>
                ${items.map((it, i) => {
                const r = it.metalType === 'gold' ? rates.gold : rates.silver;
                const v = Calculator.calcMetalValue(it.weightGrams, it.purity, r);
                return `<tr>
                        <td>${i + 1}</td>
                        <td>${it.photo ? `<img src="${it.photo}" class="img-thumb" style="width:32px;height:32px;margin-right:6px;vertical-align:middle;" />` : ''}<strong>${it.itemType}</strong></td>
                        <td>${it.metalType === 'gold' ? '🥇 Gold' : '🥈 Silver'}</td>
                        <td>${it.purity}</td>
                        <td>${it.weightGrams}g</td>
                        <td class="text-gold font-semibold">${UI.currency(v)}</td>
                    </tr>`;
            }).join('')}
                </tbody></table></div>
                <div class="items-summary mt-1">
                    <div class="items-summary-item"><div class="items-summary-label">Gold Items</div><div class="items-summary-value">${items.filter(i => i.metalType === 'gold').length}</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Silver Items</div><div class="items-summary-value">${items.filter(i => i.metalType === 'silver').length}</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Total Weight</div><div class="items-summary-value">${items.reduce((s, i) => s + i.weightGrams, 0).toFixed(2)}g</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Total Value</div><div class="items-summary-value">${UI.currency(d.metalValue)}</div></div>
                </div>
            </div>`;
        }

        container.innerHTML = `
            <button class="btn btn-ghost mb-2" onclick="UI.navigateTo('loans')">← Back to Loans</button>
            <div class="card mb-2">
                <div class="card-header">
                    <div><h3 class="card-title">${icon} ${loan.customerName}</h3>
                        <small class="text-muted">${loan.mobile || 'No mobile'} | ${loan.lockerName || 'No locker'}</small>
                        ${loan.address ? `<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px;">📍 ${loan.address}</div>` : ''}
                    </div>
                    <div class="flex gap-1">
                        ${loan.customerPhoto ? `<img src="${loan.customerPhoto}" class="img-thumb" style="width:40px;height:40px;border-radius:50%;" alt="" />` : ''}
                        <span class="status-badge ${loan.status || 'active'}">${loan.isMigrated ? '📥 Migrated' : (loan.status || 'active')}</span>
                        <span class="risk-badge ${d.riskLevel}">${d.riskLabel}</span>
                    </div>
                </div>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-label">Address</div><div class="detail-value">${loan.address || '—'}</div></div>
                    <div class="detail-item"><div class="detail-label">Locker</div><div class="detail-value">${loan.lockerName || '—'}</div></div>
                    <div class="detail-item"><div class="detail-label">Metal Type</div><div class="detail-value">${icon} ${loan.metalType} ${loan.metalSubType}</div></div>
                    <div class="detail-item"><div class="detail-label">Total Weight</div><div class="detail-value">${loan.weightGrams}g</div></div>
                    <div class="detail-item"><div class="detail-label">Metal Value</div><div class="detail-value text-gold">${UI.currency(d.metalValue)}</div></div>
                    <div class="detail-item"><div class="detail-label">Loan Amount</div><div class="detail-value">${UI.currency(loan.loanAmount)}</div></div>
                    <div class="detail-item"><div class="detail-label">Interest Rate</div><div class="detail-value">${loan.interestRate}% ${loan.interestPeriod}</div></div>
                    <div class="detail-item"><div class="detail-label">Interest Type</div><div class="detail-value">${loan.interestType === 'compound' ? 'Compound' : 'Simple'}${loan.interestType === 'compound' ? ' (' + ({1:'Yearly',2:'Half-Yearly',4:'Quarterly',12:'Monthly'}[d.compoundingFrequency] || 'Monthly') + ')' : ''}</div></div>
                    <div class="detail-item"><div class="detail-label">Effective Annual Rate</div><div class="detail-value">${UI.pct(d.effectiveRate || d.annualRate)}</div></div>
                    <div class="detail-item"><div class="detail-label">Time Mode</div><div class="detail-value">${(d.timeMode || 'normal') === 'tithi' ? '🌙 Tithi' : '📅 Normal'}</div></div>
                    <div class="detail-item"><div class="detail-label">Start Date</div><div class="detail-value">${UI.formatDate(loan.loanStartDate)}${d.startTithi ? '<br/><small class="tithi-inline">' + UI.formatTithi(d.startTithi) + '</small>' : ''}</div></div>
                    <div class="detail-item"><div class="detail-label">Maturity</div><div class="detail-value">${UI.formatDate(d.maturityDate)}${d.maturityTithi ? '<br/><small class="tithi-inline">' + UI.formatTithi(d.maturityTithi) + '</small>' : ''}</div></div>
                    <div class="detail-item"><div class="detail-label">Duration</div><div class="detail-value">${UI.formatDuration(d.monthsElapsed, d.tithiDuration, d.timeMode)}</div></div>
                    <div class="detail-item"><div class="detail-label">Days to Maturity</div><div class="detail-value ${d.isNearMaturity ? 'text-monitor' : d.isOverdue ? 'text-danger' : ''}">${d.isOverdue ? 'OVERDUE' : d.daysToMaturity + ' days'}</div></div>
                    <div class="detail-item"><div class="detail-label">Items Count</div><div class="detail-value">${items.length} item${items.length !== 1 ? 's' : ''}</div></div>
                </div>
            </div>
            ${itemsHtml}
            <!-- Financial Summary (Original) -->
            <div class="calc-panel mb-2">
                <h4 style="font-size:0.9rem;margin-bottom:16px;color:var(--primary);">💰 Financial Summary</h4>
                <div class="calc-grid">
                    <div class="calc-item"><div class="calc-item-label">Total Interest</div><div class="calc-item-value">${UI.currency(d.totalInterest)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Paid Interest</div><div class="calc-item-value">${UI.currency(d.paidInterest)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Partial Repayment</div><div class="calc-item-value">${UI.currency(d.partialRepayment)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Remaining Principal</div><div class="calc-item-value">${UI.currency(d.remainingPrincipal)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Penalty</div><div class="calc-item-value">${UI.currency(d.manualPenalty)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Total Payable</div><div class="calc-item-value" style="color:var(--gold);font-size:1.1rem;font-weight:800;">${UI.currency(d.totalPayable)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">LTV</div><div class="calc-item-value ${d.ltv > 80 ? 'danger' : d.ltv > 60 ? 'monitor' : 'safe'}">${UI.pct(d.ltv)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Break-Even</div><div class="calc-item-value">${UI.currency(d.breakEvenPrice)}/g</div></div>
                    <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value ${d.profitLoss >= 0 ? 'safe' : 'danger'}">${UI.currency(d.profitLoss)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Safety Buffer</div><div class="calc-item-value ${d.safetyBuffer >= 20 ? 'safe' : d.safetyBuffer > 0 ? 'monitor' : 'danger'}">${UI.pct(d.safetyBuffer)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Profit Margin</div><div class="calc-item-value ${d.profitMargin >= 0 ? 'safe' : 'danger'}">${UI.pct(d.profitMargin)}</div></div>
                </div>
            </div>

            ${(loan.status === 'closed' && loan.settlement) ? `
            <div class="card mb-2" style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.3);">
                <div class="flex-between mb-2">
                    <h4 style="font-size:0.9rem;color:var(--safe);">🤝 Settlement Details</h4>
                    <span class="badge" style="background:var(--safe);color:#fff;">CLOSED</span>
                </div>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-label">Total Amount</div><div class="detail-value text-danger font-semibold">${UI.currency(loan.settlement.totalAmount)}</div></div>
                    <div class="detail-item"><div class="detail-label">Paid Amount</div><div class="detail-value text-gold font-bold">${UI.currency(loan.settlement.paidAmount)}</div></div>
                    ${loan.settlement.discount > 0 ? `<div class="detail-item"><div class="detail-label">Discount Given</div><div class="detail-value text-danger font-bold">${UI.currency(loan.settlement.discount)}</div></div>` : ''}
                    <div class="detail-item"><div class="detail-label">Final Status</div><div class="detail-value font-bold text-safe">${loan.settlement.status}</div></div>
                </div>
            </div>` : ''}
            <!-- Payment History -->
            <div class="card mb-2">
                <div class="flex-between mb-2">
                    <h4 style="font-size:0.9rem;color:var(--primary);">💳 Payment History</h4>
                    ${(loan.status || 'active') !== 'closed' ? `<button class="btn btn-gold btn-sm" onclick="LoanDetailPage.showPaymentModal('${loan.id}',${d.totalPayable},${d.remainingInterest})">💵 Make Payment</button>` : '<span class="status-badge closed">CLOSED</span>'}
                </div>
                ${(loan.paymentHistory || []).length === 0
                    ? '<p class="text-muted" style="font-size:0.85rem;">No payments made yet.</p>'
                    : `<div class="table-container"><table class="data-table">
                        <thead><tr><th>Date</th><th>Amount Paid</th><th>Interest</th><th>Principal</th><th>Remaining</th></tr></thead>
                        <tbody>${(loan.paymentHistory || []).slice().sort((a,b)=>new Date(b.date)-new Date(a.date)).map(p=>`<tr>
                            <td style="font-size:0.83rem;">${UI.formatDate(p.date)}</td>
                            <td style="color:var(--gold);font-weight:700;">${UI.currency(p.paidAmount||0)}</td>
                            <td>${UI.currency(p.interestDeducted||0)}</td>
                            <td>${UI.currency(p.principalReduced||0)}</td>
                            <td style="font-weight:600;">${UI.currency(p.remainingPrincipal||0)}</td>
                        </tr>`).join('')}</tbody>
                    </table></div>`}
            </div>`;

        // Risk panel (toggleable)
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

        // Toggle row for risk panel
        const riskToggleRow = document.createElement('div');
        riskToggleRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin:12px 0 4px;';
        riskToggleRow.innerHTML = `
            <span style="font-size:0.85rem;color:var(--text-secondary);font-weight:600;">📊 Loan Risk Analysis</span>
            <button id="risk-toggle-btn" onclick="LoanDetailPage.toggleRiskPanel()"
                style="display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;font-size:0.78rem;font-weight:700;cursor:pointer;border:none;transition:all .2s;
                       background:${LoanDetailPage._riskVisible ? 'var(--safe)' : 'rgba(148,163,184,0.2)'};
                       color:${LoanDetailPage._riskVisible ? '#fff' : 'var(--text-secondary)'};">
                <span id="risk-toggle-dot" style="width:8px;height:8px;border-radius:50%;background:${LoanDetailPage._riskVisible ? '#fff' : 'var(--text-secondary)'};display:inline-block;"></span>
                <span id="risk-toggle-label">${LoanDetailPage._riskVisible ? 'ON' : 'OFF'}</span>
            </button>`;
        container.appendChild(riskToggleRow);

        // Risk panel content (hidden by default if _riskVisible is false)
        const riskWrapper = document.createElement('div');
        riskWrapper.id = 'risk-panel-wrapper';
        riskWrapper.style.display = LoanDetailPage._riskVisible ? 'block' : 'none';
        riskWrapper.innerHTML = Risk.renderRiskPanel({ pureGoldWeight: pureWeight, goldValue: d.metalValue, loanAmount: loan.loanAmount, currentPrice });
        container.appendChild(riskWrapper);

        // Action buttons (single set)
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex gap-2 mt-3';
        actionsDiv.innerHTML = `
            <button class="btn btn-primary" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 Export PDF</button>
            <button class="btn btn-success" onclick="LoanDetailPage.sendWhatsApp('${loan.id}')">💬 Send WhatsApp</button>
            <button class="btn btn-outline" onclick="LoanDetailPage.closeLoan('${loan.id}')">✅ Mark Closed</button>
            <button class="btn btn-danger" onclick="LoanDetailPage.del('${loan.id}')">🗑️ Delete</button>`;
        container.appendChild(actionsDiv);
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
            loan.loanLedger.push({ date: p.date, particulars: 'Payment Received', debit: 0, credit: p.paidAmount || 0, balance, type: 'payment' });
        });
    }

    // ── Event-Based Ledger HTML ───────────────────────────────────────────────
    function _buildEventLedgerHTML(loan) {
        if (!loan) return '<p class="text-muted">No data.</p>';
        try {
            _initLedger(loan);
            const ledger = loan.loanLedger || [];
            if (ledger.length === 0) return '<p class="text-muted" style="font-size:0.85rem;">No ledger entries yet.</p>';
            const rows = ledger.map(e => {
                const debitColor  = e.debit  > 0 ? 'color:var(--danger);'  : 'color:var(--text-secondary);';
                const creditColor = e.credit > 0 ? 'color:var(--safe);'    : 'color:var(--text-secondary);';
                return `<tr>
                    <td style="font-size:0.82rem;">${UI.formatDate(e.date)}</td>
                    <td style="font-size:0.85rem;font-weight:600;">${e.particulars}</td>
                    <td style="${debitColor}font-weight:700;">${e.debit > 0 ? UI.currency(e.debit) : '—'}</td>
                    <td style="${creditColor}font-weight:700;">${e.credit > 0 ? UI.currency(e.credit) : '—'}</td>
                    <td style="font-weight:800;color:var(--gold);">${UI.currency(e.balance)}</td>
                </tr>`;
            }).join('');
            return `<div class="table-container"><table class="data-table">
                <thead><tr><th>Date</th><th>Particulars</th><th>Debit (₹)</th><th>Credit (₹)</th><th>Balance (₹)</th></tr></thead>
                <tbody>${rows}</tbody>
            </table></div>`;
        } catch(err) { console.error(err); return '<p class="text-muted">Ledger error.</p>'; }
    }

    function _saveLedgerEntry(loan, entry) {
        _initLedger(loan);
        const last = loan.loanLedger[loan.loanLedger.length - 1];
        const prevBalance = last ? last.balance : (loan.originalLoanAmount || loan.loanAmount || 0);
        if (entry.type === 'payment' || entry.type === 'discount' || entry.type === 'settle') {
            entry.balance = Math.max(0, prevBalance - (entry.credit || 0));
        } else {
            entry.balance = prevBalance + (entry.debit || 0);
        }
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

    // ── Modal: Partial Payment ────────────────────────────────────────────────
    function showPartialPaymentModal2(loanId, totalPayable, remainingInterest) {
        document.getElementById('hisaab-modal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay'; overlay.id = 'hisaab-modal';
        overlay.innerHTML = `<div class="modal"><h3 class="modal-title">💵 Partial Payment</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem;">Total Due: <strong>${UI.currency(totalPayable)}</strong></p>
            <div class="form-group mb-2"><label class="form-label">Payment Amount (₹) *</label>
                <input type="number" class="form-input" id="pay-amount" placeholder="Enter amount" min="1"></div>
            <div class="form-group mb-3"><label class="form-label">Payment Date *</label>
                <input type="date" class="form-input" id="pay-date" value="${new Date().toISOString().split('T')[0]}"></div>
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
            <div class="form-group mb-3">
                <label class="form-label">Date of Payment *</label>
                <input type="date" class="form-input" id="pay-date" value="${new Date().toISOString().split('T')[0]}" />
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
        const amountStr = document.getElementById('pay-amount').value;
        const dateStr = document.getElementById('pay-date').value;
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

        // Save history record
        if (!loan.paymentHistory) loan.paymentHistory = [];
        loan.paymentHistory.push({
            date: dateStr,
            paidAmount: amount,
            interestDeducted,
            principalReduced,
            remainingPrincipal: newPrincipal
        });

        // Update Loan State
        // It's critical to preserve original values for records
        if (!loan.originalLoanAmount) loan.originalLoanAmount = loan.loanAmount;
        if (!loan.originalStartDate) loan.originalStartDate = loan.loanStartDate;

        // Reset the loan "start date" to the payment date so new interest calculates from here
        // Update the principal to the new remaining amount
        loan.loanStartDate = dateStr;
        loan.loanAmount = newPrincipal;
        
        // Reset paid interest/repayment fields as we've internalized them into the new principal/start date
        loan.paidInterest = 0;
        loan.partialRepayment = 0;
        loan.manualPenalty = 0; // Assuming penalty is paid off

        // Always ensure ledger exists before adding payment entry
        _initLedger(loan);
        _saveLedgerEntry(loan, { date: dateStr, particulars: '💵 Payment Received', debit: 0, credit: amount, type: 'payment' });
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
             toggleRiskPanel,
             get _riskVisible() { return _riskVisible; } };
})();
