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
        const netPayable       = _hkNetPayable(loan);
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
                <td>${it.photo ? `<img src="${it.photo}" onclick="LoanDetailPage.handleImageTap('${loan.id}', 'item', ${i})" style="width:28px;height:28px;border-radius:4px;margin-right:6px;vertical-align:middle;cursor:pointer;" title="Tap to view options"/>` : `<div onclick="LoanDetailPage.handleImageTap('${loan.id}', 'item', ${i})" style="width:28px;height:28px;border-radius:4px;margin-right:6px;background:var(--bg-hover);color:var(--text-muted);display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;cursor:pointer;font-size:12px;" title="Tap to add photo">📷</div>`}<strong>${it.itemType || '—'}</strong></td>
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
                    ${loan.customerPhoto ? `<img src="${loan.customerPhoto}" onclick="LoanDetailPage.handleImageTap('${loan.id}', 'customer')" class="ld-avatar" style="object-fit:cover; border: 2px solid var(--border-color); background: var(--bg-card); cursor:pointer;" title="Tap to view options" alt="Customer Photo">` : `<div class="ld-avatar" onclick="LoanDetailPage.handleImageTap('${loan.id}', 'customer')" style="cursor:pointer;" title="Tap to upload photo">${initials}</div>`}
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
                    <button class="ld-hdr-btn" style="background:linear-gradient(135deg,#f6d365,#fda085);color:#1a1a2e;font-weight:700;" onclick="UI.navigateTo('hisab-kitaab','${loan.id}')">📒 हिसाब किताब</button>
                    <button class="ld-hdr-btn" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">${I18n.t('export_pdf')}</button>
                    <button class="ld-hdr-btn" onclick="LoanDetailPage.sendWhatsApp('${loan.id}')">${I18n.t('send_whatsapp')}</button>
                </div>
            </div>

            <!-- B. Loan Overview Card (Card-based layout) -->
            <div class="ld-card">
                <div class="ld-section-title" style="display:flex;align-items:center;">📋 Loan Overview
                    <button onclick="LoanDetailPage.showEditModal('${loan.id}')"
                        style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;font-size:0.75rem;font-weight:700;cursor:pointer;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);transition:all .2s;"
                        onmouseover="this.style.background='var(--primary)';this.style.color='#fff';"
                        onmouseout="this.style.background='var(--bg-input)';this.style.color='var(--text-secondary)';">✏️ Edit</button>
                </div>

                <!-- Row 1: Start Date, Maturity Date, Loan Amount, Interest Rate -->
                <div class="ld-info-cards-grid">
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">📅</div>
                        <div class="ld-info-card-label">Loan Start Date</div>
                        <div class="ld-info-card-value">${UI.formatDate(loan.loanStartDate)}</div>
                        ${d.startTithi ? `<div class="ld-info-card-sub">${UI.formatTithi(d.startTithi)}</div>` : ''}
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">📅</div>
                        <div class="ld-info-card-label">Maturity Date</div>
                        <div class="ld-info-card-value">${UI.formatDate(d.maturityDate)}</div>
                        ${d.maturityTithi ? `<div class="ld-info-card-sub">${UI.formatTithi(d.maturityTithi)}</div>` : ''}
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">₹</div>
                        <div class="ld-info-card-label">Loan Amount</div>
                        <div class="ld-info-card-value" style="color:var(--text-primary);">${UI.currency(origPrincipal)}</div>
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">%</div>
                        <div class="ld-info-card-label">Interest Rate</div>
                        <div class="ld-info-card-value">${loan.interestRate || 0}%<br><span style="font-size:0.78rem;font-weight:500;color:var(--text-secondary);">per ${loan.interestPeriod || 'month'}</span></div>
                    </div>
                </div>

                <!-- Row 2: Interest Type, Annual Interest, LTV, Metal Type -->
                <div class="ld-info-cards-grid" style="margin-top:10px;">
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">📄</div>
                        <div class="ld-info-card-label">Interest Type</div>
                        <div class="ld-info-card-value" style="color:var(--primary);">${loan.interestType === 'compound' ? 'Compound' : 'Monthly'}</div>
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">🔄</div>
                        <div class="ld-info-card-label">Annual Interest</div>
                        <div class="ld-info-card-value" style="color:var(--primary);">${UI.pct(d.effectiveRate || d.annualRate)}</div>
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">⏱</div>
                        <div class="ld-info-card-label">LTV</div>
                        <div class="ld-info-card-value ${ltvBadge}">${UI.pct(d.ltv)}</div>
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">👥</div>
                        <div class="ld-info-card-label">Metal Type</div>
                        <div class="ld-info-card-value" style="color:var(--gold-dark);">${icon} ${loan.metalType === 'gold' ? 'Gold' : 'Silver'} ${loan.metalSubType || ''}</div>
                    </div>
                </div>

                <!-- Row 3: Total Weight, Metal Value, Total Items + Days to Maturity -->
                <div class="ld-info-cards-grid ld-info-cards-grid--3" style="margin-top:10px;">
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">⚖️</div>
                        <div class="ld-info-card-label">Total Weight</div>
                        <div class="ld-info-card-value">${totalWeight.toFixed(2)} g</div>
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">₹</div>
                        <div class="ld-info-card-label">Metal Value</div>
                        <div class="ld-info-card-value" style="color:var(--gold-dark);">${UI.currency(d.metalValue)}</div>
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">≡</div>
                        <div class="ld-info-card-label">Total Items</div>
                        <div class="ld-info-card-value">${items.length} Item${items.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="ld-info-card ${d.isOverdue ? 'ld-info-card--overdue' : 'ld-info-card--days'}">
                        <div class="ld-info-card-icon">📅</div>
                        <div class="ld-info-card-label">Days to Maturity</div>
                        <div class="ld-info-card-value">${d.isOverdue ? '⚠️ OVERDUE' : d.daysToMaturity}<br><span style="font-size:0.75rem;font-weight:500;color:var(--text-secondary);">Duration: ${loan.loanDuration || 12} Months</span></div>
                    </div>
                    <div class="ld-info-card">
                        <div class="ld-info-card-icon">🔒</div>
                        <div class="ld-info-card-label">Locker No.</div>
                        <div class="ld-info-card-value" style="display:flex;align-items:center;gap:6px;">
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

            <!-- C. Jewellery Note Card -->
            <div class="ld-card" id="jewellery-note-card-${loan.id}" style="border-left:3px solid var(--primary);">
                <div class="ld-section-title" style="display:flex;align-items:center;gap:8px;">
                    📝 Jewellery Note
                    <button onclick="LoanDetailPage.showNoteEditModal('${loan.id}')"
                        style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;font-size:0.75rem;font-weight:700;cursor:pointer;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);transition:all .2s;"
                        onmouseover="this.style.background='var(--primary)';this.style.color='#fff';"
                        onmouseout="this.style.background='var(--bg-input)';this.style.color='var(--text-secondary)';">✏️ Edit</button>
                </div>
                <div class="ld-note-body-wrap">
                ${loan.jewelleryNote
                    ? `<div style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.18);border-radius:10px;padding:12px 16px;font-size:0.9rem;color:var(--text-primary);line-height:1.6;white-space:pre-wrap;">${loan.jewelleryNote.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
                    : `<div style="color:var(--text-muted);font-size:0.85rem;font-style:italic;padding:8px 0;">No note added yet. Click ✏️ Edit to add jewellery condition or remarks.</div>`
                }
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
                    <button class="ld-action-btn blue" onclick="LoanDetailPage.showPartialPaymentModal2('${loan.id}')">
                        <span class="ld-action-btn-icon">💵</span>
                        <span class="ld-action-btn-label">Payment</span>
                        <span class="ld-action-btn-sub">Record payment</span>
                    </button>
                    <button class="ld-action-btn amber" onclick="LoanDetailPage.showDiscountModal('${loan.id}')">
                        <span class="ld-action-btn-icon">🏷️</span>
                        <span class="ld-action-btn-label">Discount</span>
                        <span class="ld-action-btn-sub">Apply discount</span>
                    </button>
                    <button class="ld-action-btn purple" onclick="LoanDetailPage.showSettleModal2('${loan.id}')">
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

            <!-- G. Bottom Summary: 2 Cards -->
            <div class="ld-summary-grid">                <!-- Financial Summary -->
                <div class="ld-summary-card">
                    <div class="ld-summary-title">💰 Financial Summary</div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Principal Amount</span><span class="ld-summary-val">${UI.currency(origPrincipal)}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Total Paid</span><span class="ld-summary-val">${UI.currency(totalPaid)}</span></div>
                    <div class="ld-summary-row"><span class="ld-summary-key">Total Interest</span><span class="ld-summary-val">${UI.currency(_hkTotalInterest(loan))}</span></div>
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

    // ── Centralized delegate — all values from ONE call to calculateSummary ──────────
    function _hkSummary(loan) {
        if (!loan) return { totalDebit: 0, totalCredit: 0, totalInterest: 0, netPayable: 0, entries: [] };
        try { return HisabKitaabPage.calculateSummary(loan); }
        catch(e) { console.error('_hkSummary', e); return { totalDebit: 0, totalCredit: 0, totalInterest: 0, netPayable: 0, entries: [] }; }
    }
    function _hkNetPayable(loan)    { return _hkSummary(loan).netPayable; }
    function _hkTotalInterest(loan) { return _hkSummary(loan).totalInterest; }
    /** Kept for callers that pass (loan, d) — ignores d, derives from HK */
    function _netPayable(loan, _d)  { return _hkNetPayable(loan); }

    function _getTotalPaid(loan) {
        if (!loan) return 0;
        try {
            HisabKitaabPage.initHK(loan);
            const hk = loan.hisabKitaab || [];
            return hk
                .filter(e => e.type === 'payment' || e.type === 'settle')
                .reduce((s, e) => s + (parseFloat(e.paid) || parseFloat(e.amount) || 0), 0);
        } catch(e) { return 0; }
    }

    function _interestTillLastPayment(loan) {
        // Legacy: kept for callers; computes total frozen interest from HK
        if (!loan) return 0;
        try {
            const hk = loan.hisabKitaab || [];
            return hk.filter(e => e.type === 'interest').reduce((s, e) => s + (e.interest || 0), 0);
        } catch(e) { return 0; }
    }

    // ── Deduplicate ledger (fix old corrupted data in localStorage) ───────────

    // ── Simple rate helpers ───────────────────────────────────────────────────
    function _monthlyRate(loan) {
        const r = parseFloat(loan.interestRate) || 0;
        return loan.interestPeriod === 'yearly' ? r / 12 : r;
    }

    function _addOneMonth(date) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1);
        return d;
    }

    // ── Builds the full Ledger Card inner HTML (title + toggle buttons + table) ─
    function _buildLedgerCardInner(loan, loanId) {
        try {
            const tl  = _ledgerT();
            const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
            const modeLabel  = _ledgerMode === 'daily'
                ? (isHi ? '📅 दिनवार' : tl.day_wise)
                : (isHi ? '📆 मासिक'  : tl.monthly);
            const basisLabel = _interestBasis === 360 ? '360-Day' : '365-Day';

            const ledgerHtml = _buildEventLedgerHTML(loan, _ledgerMode, loanId);

            return `
            <div class="ld-section-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                ${tl.ledger_title}
                <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;">
                    <button onclick="LoanDetailPage.toggleLedgerMode('${loanId}')"
                        style="padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;
                               border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);transition:all .2s;"
                        onmouseover="this.style.background='var(--primary)';this.style.color='#fff';"
                        onmouseout="this.style.background='var(--bg-input)';this.style.color='var(--text-secondary)';">
                        ${modeLabel}
                    </button>
                    <button onclick="LoanDetailPage.toggleInterestBasis('${loanId}')"
                        style="padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;
                               border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);transition:all .2s;"
                        onmouseover="this.style.background='var(--primary)';this.style.color='#fff';"
                        onmouseout="this.style.background='var(--bg-input)';this.style.color='var(--text-secondary)';">
                        ${basisLabel}
                    </button>
                </div>
            </div>
            ${ledgerHtml}`;
        } catch(err) {
            console.error('_buildLedgerCardInner', err);
            return '<p class="text-muted">Ledger unavailable.</p>';
        }
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

    // ── Ledger Translation Helper ─────────────────────────────────────────────
    function _ledgerT() {
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        if (isHi) {
            return {
                ledger_title: '📒 ऋण बही',
                day_wise:     '📅 दिनवार',
                monthly:      '📆 मासिक',
                date:         'दिनांक',
                particulars:  'विवरण',
                debit:        'डेबिट (₹)',
                calc_type:    'गणना प्रकार',
                interest:     'ब्याज (₹)',
                credit:       'क्रेडिट (₹)',
                net_payable:  'कुल बकाया (₹)',
                net_payable_footer: 'कुल बकाया (वित्तीय सारांश से मिलान)',
                days_inline:  '({d} दिन)'
            };
        }
        return {
            ledger_title: '📒 Loan Ledger',
            day_wise:     '📅 Day-wise',
            monthly:      '📆 Monthly',
            date:         'Date',
            particulars:  'Particulars',
            debit:        'Debit (₹)',
            calc_type:    'Calc. Type',
            interest:     'Interest (₹)',
            credit:       'Credit (₹)',
            net_payable:  'Net Payable (₹)',
            net_payable_footer: 'Net Payable (matches Financial Summary)',
            days_inline:  '({d} days)'
        };
    }

    // Translate stored particulars text (English) into the current language
    function _translateParticulars(text, tl) {
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        if (!isHi) return text;
        const map = {
            'Gold Loan Issued':  'गोल्ड लोन जारी',
            'Silver Loan Issued':'सिल्वर लोन जारी',
            'Payment Received':  'भुगतान प्राप्त',
            'Partial Payment':   'आंशिक भुगतान',
            'Interest Applied':  'ब्याज जोड़ा गया',
            'Discount Given':    'छूट दी गई',
            'Loan Settled':      'ऋण निपटान',
        };
        // Check map keys (partial match for emoji-prefixed strings)
        for (const [en, hi] of Object.entries(map)) {
            if (text.includes(en)) return text.replace(en, hi);
        }
        return text;
    }

    // ── Event-Based Ledger HTML — strict mirror of calculateSummary() output ────
    function _buildEventLedgerHTML(loan, _mode, _loanId) {
        try {
            const tl       = _ledgerT();
            const isHi     = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
            const summary  = _hkSummary(loan);
            const entries  = summary.entries || [];
            const netPayable = summary.netPayable || 0;

            const catLabel = {
                loan:       isHi ? '🏦 गोल्ड लोन जारी' : `🏦 ${(loan.metalType === 'gold' ? 'Gold' : 'Silver')} Loan Issued`,
                payment:    isHi ? '💵 भुगतान प्राप्त'  : '💵 Payment Received',
                interest:   isHi ? '📈 ब्याज जोड़ा गया' : '📈 Interest Applied',
                discount:   isHi ? '🏷️ छूट दी गई'       : '🏷️ Discount Given',
                settle:     isHi ? '✅ ऋण निपटान'        : '✅ Loan Settled',
                add_money:  isHi ? '➕ राशि जोड़ी'        : '➕ Amount Added',
            };

            let runningBal = 0;
            const rows = entries.map((e, idx) => {
                // Read pre-computed values — NO recalculation here
                const isDebit   = !!e._isDebit;
                const isCredit  = !isDebit;
                const amt       = HisabKitaabPage.safeNumber(e._amount);
                const interest  = HisabKitaabPage.safeNumber(e._interest);
                const days      = e._days || 0;

                // Running balance: DEBIT adds (amount + interest), CREDIT subtracts amount
                if (isDebit) {
                    runningBal = parseFloat((runningBal + amt + interest).toFixed(2));
                } else {
                    runningBal = parseFloat(Math.max(0, runningBal - amt).toFixed(2));
                }

                const debitColor  = isDebit  ? 'color:var(--danger);'      : 'color:var(--text-secondary);';
                const creditColor = isCredit ? 'color:var(--safe);'        : 'color:var(--text-secondary);';
                const intColor    = interest > 0 ? 'color:var(--monitor);' : 'color:var(--text-secondary);';
                const balColor    = idx === entries.length - 1 ? 'color:var(--primary);' : 'color:var(--gold-dark);';

                // Interest display — 2 decimal places, with days annotation
                let intDisplay = '—';
                if (interest > 0) {
                    const daysLabel = tl.days_inline ? tl.days_inline.replace('{d}', days) : `${days}d`;
                    intDisplay = `₹${Number(interest).toFixed(2)} <span style="font-size:0.65rem;color:var(--text-muted);margin-left:4px;font-weight:600;">${daysLabel}</span>`;
                }

                const baseLabel   = catLabel[e.type] || e.type;
                const particulars = e.note
                    ? `${baseLabel} <span style="font-size:0.72rem;opacity:0.7;">— ${e.note}</span>`
                    : baseLabel;

                return `<tr>
                    <td style="font-size:0.82rem;">${UI.formatDate(e.date)}</td>
                    <td style="font-size:0.85rem;font-weight:600;font-family:'Noto Sans Devanagari','Inter',sans-serif;">${particulars}</td>
                    <td style="${debitColor}font-weight:700;">${isDebit  ? `₹${Number(amt).toFixed(2)}` : '—'}</td>
                    <td style="${intColor}font-weight:700;white-space:nowrap;">${intDisplay}</td>
                    <td style="${creditColor}font-weight:700;">${isCredit ? `₹${Number(amt).toFixed(2)}` : '—'}</td>
                    <td style="${balColor}font-weight:800;">₹${runningBal.toFixed(2)}</td>
                </tr>`;
            }).join('');

            // Footer: use summary.netPayable — GUARANTEED to match Financial Summary
            const footerLabel = isHi
                ? 'कुल बकाया (वित्तीय सारांश से मिलान)'
                : 'Net Payable (matches Financial Summary)';

            return `<div class="ld-table-wrap"><table class="ld-table">
                <thead><tr>
                    <th>${tl.date}</th><th>${tl.particulars}</th>
                    <th>${tl.debit}</th><th>${tl.interest}</th>
                    <th>${tl.credit}</th><th>${tl.net_payable}</th>
                </tr></thead>
                <tbody>${rows}
                <tr class="ld-tfoot-row">
                    <td colspan="5" style="font-weight:700;">${footerLabel}</td>
                    <td style="font-weight:800;color:var(--primary);">₹${Number(netPayable).toFixed(2)}</td>
                </tr>
                </tbody>
            </table></div>`;
        } catch(err) { console.error('_buildEventLedgerHTML', err); return '<p class="text-muted">Ledger error.</p>'; }
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
        HisabKitaabPage.initHK(loan);
        // Positive = add money (debit), negative = reduce balance (treat as discount)
        const type = amount > 0 ? 'add_money' : 'discount';
        HisabKitaabPage.addEntry(loan, date, type, Math.abs(amount), note);
        loan.totalAdjustment = (loan.totalAdjustment || 0) + amount;
        DB.saveLoan(loan);
        document.getElementById('hisaab-modal')?.remove();
        UI.toast('Adjustment applied!', 'success');
        render(document.getElementById('page-container'), loanId);
    }

    // ── Modal: Partial Payment ─────────────────────────────────────────────
    function showPartialPaymentModal2(loanId) {
        document.getElementById('hisaab-modal')?.remove();
        const loan   = DB.getLoan(loanId);
        const netDue = _hkNetPayable(loan);
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay'; overlay.id = 'hisaab-modal';
        overlay.innerHTML = `<div class="modal"><h3 class="modal-title">💵 Payment</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem;">Net Payable (HK): <strong style="color:var(--safe);">${UI.currency(netDue)}</strong></p>
            <div class="form-group mb-2"><label class="form-label">Payment Amount (₹) *</label>
                <input type="number" class="form-input" id="pay-amount" placeholder="Enter amount" min="1" value="${netDue.toFixed(2)}"></div>
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
        HisabKitaabPage.initHK(loan);
        HisabKitaabPage.addEntry(loan, date, 'discount', amount, 'Discount');
        loan.totalDiscount = (loan.totalDiscount || 0) + amount;
        DB.saveLoan(loan);
        document.getElementById('hisaab-modal')?.remove();
        UI.toast('Discount applied!', 'success');
        render(document.getElementById('page-container'), loanId);
    }

    // ── Modal: Settle Loan ──────────────────────────────────────────────────────
    function showSettleModal2(loanId) {
        document.getElementById('hisaab-modal')?.remove();
        const loan   = DB.getLoan(loanId);
        const netDue = _hkNetPayable(loan);
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay'; overlay.id = 'hisaab-modal';
        overlay.innerHTML = `<div class="modal"><h3 class="modal-title">✅ Settle Loan</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem;">Net Payable (HK): <strong style="color:var(--safe);">${UI.currency(netDue)}</strong></p>
            <div class="form-group mb-2"><label class="form-label">Final Amount Received (₹) *</label>
                <input type="number" class="form-input" id="settle-amount" placeholder="Amount received" min="0" value="${netDue.toFixed(2)}"></div>
            <div class="form-group mb-3"><label class="form-label">Date</label>
                <input type="date" class="form-input" id="settle-date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="document.getElementById('hisaab-modal').remove()">Cancel</button>
                <button class="btn btn-sm" style="background:rgba(16,185,129,0.2);border:1px solid var(--safe);color:var(--safe);" onclick="LoanDetailPage.processSettle('${loanId}',${netDue})">Confirm Settlement</button>
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
        HisabKitaabPage.initHK(loan);
        HisabKitaabPage.addEntry(loan, date, 'settle', received, 'Loan Settled');
        const netDue = _hkNetPayable(loan);
        const diff = Math.max(0, (totalPayable || netDue) - received);
        if (diff > 0) { loan.totalDiscount = (loan.totalDiscount || 0) + diff; }
        loan.status = 'closed';
        loan.settlement = { date: new Date().toISOString(), totalAmount: totalPayable || netDue, paidAmount: received, discount: diff, adjustment: 0, status: 'CLOSED' };
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
        const note      = (document.getElementById('pay-note')?.value || '').trim().slice(0, 250);
        const amount    = parseFloat(amountStr);

        if (!amount || amount <= 0) { UI.toast('Enter a valid amount', 'error'); return; }
        if (!dateStr) { UI.toast('Select payment date', 'error'); return; }

        const loan = DB.getLoan(loanId);
        if (!loan) { UI.toast('Loan not found', 'error'); return; }

        // Validate: payment should not exceed current HK net payable
        const currentDue = _hkNetPayable(loan);
        if (currentDue > 0 && amount > currentDue * 1.1) {
            UI.toast(`Payment ₹${amount.toFixed(0)} exceeds net payable ₹${currentDue.toFixed(0)}`, 'error');
            return;
        }

        // Preserve original fields (for backward compat with overview display)
        if (!loan.originalLoanAmount) loan.originalLoanAmount = loan.loanAmount;
        if (!loan.originalStartDate)  loan.originalStartDate  = loan.loanStartDate;

        // Single writer: HK records the payment + freezes accrued interest
        HisabKitaabPage.initHK(loan);
        HisabKitaabPage.addEntry(loan, dateStr, 'payment', amount, note);

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

    // ─── Jewellery Note: Edit Modal ───────────────────────────────────────
    function showNoteEditModal(loanId) {
        try {
            document.getElementById('ld-note-modal')?.remove();
            const loan = DB.getLoan(loanId);
            if (!loan) return;
            const existing = (loan.jewelleryNote || '').replace(/"/g, '&quot;');
            const ov = document.createElement('div');
            ov.className = 'modal-overlay'; ov.id = 'ld-note-modal';
            ov.innerHTML = `<div class="modal" style="max-width:440px;">
                <h3 class="modal-title">📝 Jewellery Note</h3>
                <p class="text-muted mb-2" style="font-size:0.85rem;">Describe the jewellery condition, damage, or any remarks.</p>
                <div class="form-group mb-3">
                    <textarea id="ld-note-input" class="form-input" rows="5" maxlength="400"
                        placeholder="e.g. Chain broken, stone missing, scratched surface…"
                        style="resize:vertical;min-height:100px;">${existing}</textarea>
                    <span class="form-hint">Max 400 characters</span>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="document.getElementById('ld-note-modal').remove()">Cancel</button>
                    <button class="btn btn-gold" onclick="LoanDetailPage.saveJewelleryNote('${loanId}')">Save Note</button>
                </div>
            </div>`;
            document.body.appendChild(ov);
            ov.onclick = e => { if (e.target === ov) ov.remove(); };
            setTimeout(() => document.getElementById('ld-note-input')?.focus(), 80);
        } catch(e) { console.error('showNoteEditModal', e); }
    }

    function saveJewelleryNote(loanId) {
        try {
            const loan = DB.getLoan(loanId);
            if (!loan) return;
            const note = (document.getElementById('ld-note-input')?.value || '').trim().slice(0, 400);
            loan.jewelleryNote = note;
            DB.saveLoan(loan);
            document.getElementById('ld-note-modal')?.remove();
            UI.toast('Jewellery note saved!', 'success');
            // Re-render just the note card without full page reload
            const card = document.getElementById(`jewellery-note-card-${loanId}`);
            if (card) {
                const noteBody = card.querySelector('#ld-note-body');
                const content = note
                    ? `<div style="background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.18);border-radius:10px;padding:12px 16px;font-size:0.9rem;color:var(--text-primary);line-height:1.6;white-space:pre-wrap;">${note.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
                    : `<div style="color:var(--text-muted);font-size:0.85rem;font-style:italic;padding:8px 0;">No note added yet. Click ✏️ Edit to add jewellery condition or remarks.</div>`;
                // Update card by re-rendering only the body section
                const existing = card.querySelector('.ld-note-body-wrap');
                if (existing) {
                    existing.innerHTML = content;
                } else {
                    // Full re-render as fallback
                    render(document.getElementById('page-container'), loanId);
                }
            } else {
                render(document.getElementById('page-container'), loanId);
            }
        } catch(e) { console.error('saveJewelleryNote', e); UI.toast('Failed to save note', 'error'); }
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

    async function handleImageTap(loanId, type, itemIndex = 0) {
        const loan = DB.getLoan(loanId);
        if (!loan) return;
        
        const hasImage = type === 'customer' ? !!loan.customerPhoto : !!loan.items[itemIndex].photo;
        const currentSrc = type === 'customer' ? loan.customerPhoto : loan.items[itemIndex].photo;

        const action = await UI.showImageOptions(hasImage);
        if (!action) return;

        if (action === 'view') {
            UI.enlargeImage(currentSrc);
        } else if (action === 'remove') {
            if (await UI.confirm('Remove Photo', 'Are you sure you want to remove this photo?')) {
                if (type === 'customer') {
                    loan.customerPhoto = '';
                    if (loan.customerId) {
                        const cust = DB.getCustomer(loan.customerId);
                        if (cust) { cust.photo = ''; DB.saveCustomer(cust); }
                    }
                } else {
                    loan.items[itemIndex].photo = '';
                }
                DB.saveLoan(loan);
                render(document.getElementById('page-container'), loanId);
                UI.toast('Photo removed', 'success');
            }
        } else if (action === 'change' || action === 'upload') {
            const profile = type === 'customer' ? 'customer' : (loan.items[itemIndex].metalType === 'gold' ? 'gold' : 'default');
            const newBase64 = await UI.promptImageUpload(profile);
            if (newBase64) {
                if (type === 'customer') {
                    loan.customerPhoto = newBase64;
                    if (loan.customerId) {
                        const cust = DB.getCustomer(loan.customerId);
                        if (cust) { cust.photo = newBase64; DB.saveCustomer(cust); }
                    }
                } else {
                    loan.items[itemIndex].photo = newBase64;
                }
                DB.saveLoan(loan);
                render(document.getElementById('page-container'), loanId);
                UI.toast('Photo updated successfully', 'success');
            }
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
             showNoteEditModal, saveJewelleryNote,
             toggleRiskPanel, toggleLedgerMode, toggleInterestBasis,
             handleImageTap,
             get _riskVisible()    { return _riskVisible;    },
             get _ledgerMode()     { return _ledgerMode;     },
             get _interestBasis()  { return _interestBasis;  } };
})();
