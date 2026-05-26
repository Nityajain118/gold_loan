/* ============================================
   Loan Detail Page — Premium Dashboard UI v2
   ============================================ */
const LoanDetailPage = (() => {
    // Track navigation origin for smart back button
    let _backTarget = { page: 'loans', data: null, label: 'Back to Loans' };
    // Track the last rendered loan so we can detect context switches
    let _lastRenderedLoanId = null;
    // Toggle for Loan Overview / Jewellery / Items sections
    let _detailsVisible = true;

    function setBackTarget(page, data, label) {
        _backTarget = { page: page || 'loans', data: data || null, label: label || 'Back to Loans' };
    }

    function render(container, loanId) {
        // ── Auto-reset back target when a NEW/DIFFERENT loan is opened ────────
        // Only corrects the back target when it is ACTIVELY pointing to the wrong
        // customer-ledger (i.e. a stale previous customer). Does NOT touch back
        // targets that point to the loans/girvi-return page (data === null is valid
        // for those callers — overriding it caused 'Customer not found').
        if (loanId && loanId !== _lastRenderedLoanId) {
            try {
                const loanForCtx = DB.getLoan(loanId);
                if (loanForCtx && loanForCtx.customerId) {
                    const custForCtx = DB.getCustomer(loanForCtx.customerId);
                    if (custForCtx) {
                        // Only override when the stored back target is pointing to a
                        // DIFFERENT customer's ledger — never touch loans-page targets.
                        const backIsWrongCustomer =
                            _backTarget.page === 'customer-ledger' &&
                            _backTarget.data &&
                            _backTarget.data !== loanForCtx.customerId;
                        if (backIsWrongCustomer) {
                            _backTarget = {
                                page:  'customer-ledger',
                                data:  custForCtx.id,
                                label: 'Back to ' + custForCtx.name
                            };
                        }
                    }
                }
            } catch(e) {}
            _lastRenderedLoanId = loanId;
        }

        const loan = DB.getLoan(loanId);
        if (!loan) {
            container.innerHTML = '<div class="empty-state"><h3>Loan not found</h3><button class="btn btn-primary" onclick="UI.navigateTo(\'loans\')">← Back</button></div>';
            return;
        }
        const settings = DB.getSettings();
        const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        // Pass current interest basis (360/365) to calcLoanDetails
        const d = Calculator.calcLoanDetails(loan, rate, { basis: _interestBasis });
        const items = loan.items || [];
        const hasGold = items.some(it => it.metalType === 'gold');
        const hasSilver = items.some(it => it.metalType === 'silver');
        const isMixed = hasGold && hasSilver;
        const icon = isMixed ? '🔗' : (loan.metalType === 'gold' ? '🥇' : '🥈');
        const loanMetalLabel = isMixed ? 'Mixed Metal' : (loan.metalType === 'gold' ? 'Gold' : 'Silver');
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
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                <button class="btn btn-ghost" style="align-self:flex-start;" onclick="LoanDetailPage.goBack()">← ${_backTarget.label}</button>
                <button class="kn-compact-toggle ${typeof KeyNav !== 'undefined' && KeyNav.isCompact() ? 'active' : ''}" onclick="KeyNav.toggleCompact(); LoanDetailPage.render(document.getElementById('page-container'), '${loan.id}')">
                    ${typeof KeyNav !== 'undefined' && KeyNav.isCompact() ? '📋 Full View' : '📐 Compact Mode'}
                </button>
            </div>

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
                    <button class="ld-hdr-btn kn-focusable" style="background:linear-gradient(135deg,#f6d365,#fda085);color:#1a1a2e;font-weight:700;" onclick="UI.navigateTo('hisab-kitaab','${loan.id}')">📒 हिसाब किताब</button>
                    <button class="ld-hdr-btn kn-focusable" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">${I18n.t('export_pdf')}</button>
                    <button class="ld-hdr-btn kn-focusable" onclick="LoanDetailPage.sendWhatsApp('${loan.id}')">${I18n.t('send_whatsapp')}</button>
                </div>
            </div>

            <!-- B. Loan Overview Card (Card-based layout) -->
            <div class="ld-card kn-compact-section">
                <div class="ld-section-title" style="display:flex;align-items:center;gap:8px;">📋 Loan Overview
                    <button onclick="LoanDetailPage.toggleDetails('${loan.id}')"
                        style="display:inline-flex;align-items:center;gap:5px;padding:3px 12px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;border:none;transition:all .25s;
                        background:${_detailsVisible ? 'var(--safe)' : 'rgba(148,163,184,0.22)'};
                        color:${_detailsVisible ? '#fff' : 'var(--text-secondary)'};"
                        title="${_detailsVisible ? 'Hide details' : 'Show details'}">
                        <span style="width:7px;height:7px;border-radius:50%;background:${_detailsVisible ? '#fff' : 'var(--text-muted)'};display:inline-block;"></span>
                        ${_detailsVisible ? 'ON' : 'OFF'}
                    </button>
                    <button onclick="LoanDetailPage.showEditModal('${loan.id}')"
                        style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;padding:4px 14px;border-radius:20px;font-size:0.75rem;font-weight:700;cursor:pointer;border:1px solid var(--border-color);background:var(--bg-input);color:var(--text-secondary);transition:all .2s;"
                        onmouseover="this.style.background='var(--primary)';this.style.color='#fff';"
                        onmouseout="this.style.background='var(--bg-input)';this.style.color='var(--text-secondary)';">✏️ Edit</button>
                </div>

                <div id="ld-details-body" style="${_detailsVisible ? '' : 'display:none;'}">
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
                        <div class="ld-info-card-value" style="color:var(--gold-dark);">${icon} ${loanMetalLabel} ${!isMixed && loan.metalSubType ? loan.metalSubType : ''}</div>
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
                        <div class="ld-info-card-sub" style="color:var(--text-muted);font-size:0.7rem;">Age: ${_fmtDur(Math.floor((Date.now() - new Date(loan.loanStartDate || loan.originalStartDate)) / 86400000))}</div>
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
            </div>

            <!-- C. Jewellery Note Card -->
            <div class="ld-card kn-compact-section" id="jewellery-note-card-${loan.id}" style="border-left:3px solid var(--primary);${_detailsVisible ? '' : 'display:none;'}">
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
            <div class="ld-card kn-compact-section" style="${_detailsVisible ? '' : 'display:none;'}">
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
                <div class="hk-actions" style="margin-top:10px;">
                    <button class="hk-action-btn hk-btn-add" onclick="LoanDetailPage.showAddMoneyModal('${loan.id}')">
                        <span class="hk-btn-icon">➕</span>
                        <span class="hk-btn-label">${(typeof I18n !== 'undefined' && I18n.getLang() === 'hi') ? 'उधार (Add Money)' : 'Udhar (Add Money)'}</span>
                    </button>
                    <button class="hk-action-btn hk-btn-payment" onclick="LoanDetailPage.showPayModal('${loan.id}')">
                        <span class="hk-btn-icon">💰</span>
                        <span class="hk-btn-label">${(typeof I18n !== 'undefined' && I18n.getLang() === 'hi') ? 'जमा (Receive)' : 'Jama (Receive)'}</span>
                    </button>
                    <button class="hk-action-btn hk-btn-discount" onclick="LoanDetailPage.showDiscModal('${loan.id}')">
                        <span class="hk-btn-icon">🎯</span>
                        <span class="hk-btn-label">${(typeof I18n !== 'undefined' && I18n.getLang() === 'hi') ? 'छूट दें' : 'Discount'}</span>
                    </button>
                    <button class="hk-action-btn hk-btn-settle" onclick="LoanDetailPage.showSettleModal('${loan.id}')">
                        <span class="hk-btn-icon">✅</span>
                        <span class="hk-btn-label">${(typeof I18n !== 'undefined' && I18n.getLang() === 'hi') ? 'लोन बंद करें' : 'Settle Loan'}</span>
                    </button>
                </div>
            </div>` : ''}

            <!-- F. Loan Khata -->
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

        // Apply compact mode if enabled
        try { KeyNav.applyCompactIfNeeded(); } catch(e) {}
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

    // Duration formatter (reuse HK helper; fallback inline)
    function _fmtDur(days) {
        try { return HisabKitaabPage.formatDuration(days); } catch(e) {
            const d = Math.max(0, Math.floor(days)); const m = Math.floor(d / 30); const rem = d % 30;
            if (m === 0) return `${d} days`;
            return rem === 0 ? `${d} days (${m}m)` : `${d} days (${m}m ${rem}d)`;
        }
    }

    function _addOneMonth(date) {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1);
        return d;
    }

    // ── Builds the full Ledger Card inner HTML (title + table) ─
    function _buildLedgerCardInner(loan, loanId) {
        try {
            const tl  = _ledgerT();
            const ledgerHtml = _buildEventLedgerHTML(loan, _ledgerMode, loanId);

            return `
            <div class="ld-section-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                ${tl.ledger_title}
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
            ledger_title: '📒 Loan Khata',
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
                    const m   = Math.floor(days / 30), rem = days % 30;
                    const dur = m > 0 ? (rem > 0 ? `${m}m ${rem}d` : `${m}m`) : `${days}d`;
                    const daysLabel = `${days}d • ${dur}`;
                    intDisplay = `${UI.currency(interest)} <span style="font-size:0.65rem;color:var(--text-muted);margin-left:4px;font-weight:600;">(${daysLabel})</span>`;
                }

                const baseLabel   = catLabel[e.type] || e.type;
                // Mark custom/manual interest entries with (Cus) tag
                const isCusInt = e.type === 'interest' && e.note && e.note.indexOf('Manual interest') >= 0;
                const displayLabel = isCusInt
                    ? (baseLabel + ' <span style="font-size:0.7rem;background:var(--monitor);color:#000;padding:1px 5px;border-radius:4px;margin-left:4px;font-weight:700;">Cus</span>')
                    : baseLabel;
                const particulars = e.note
                    ? `${displayLabel} <span style="font-size:0.72rem;opacity:0.7;">— ${e.note}</span>`
                    : displayLabel;

                return `<tr>
                    <td style="font-size:0.82rem;">${UI.formatDate(e.date)}</td>
                    <td style="font-size:0.85rem;font-weight:600;font-family:'Noto Sans Devanagari','Inter',sans-serif;">${particulars}</td>
                    <td style="${debitColor}font-weight:700;">${isDebit  ? UI.currency(amt) : '—'}</td>
                    <td style="${intColor}font-weight:700;white-space:nowrap;">${intDisplay}</td>
                    <td style="${creditColor}font-weight:700;">${isCredit ? UI.currency(amt) : '—'}</td>
                    <td style="${balColor}font-weight:800;">${UI.currency(runningBal)}</td>
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
                    <td style="font-weight:800;color:var(--primary);">${UI.currency(netPayable)}</td>
                </tr>
                </tbody>
            </table></div>`;
        } catch(err) { console.error('_buildEventLedgerHTML', err); return '<p class="text-muted">Ledger error.</p>'; }
    }


    // ── Translation & Modal Helper for HK Modals ──────────────────────────────
    function _hkT() {
        const h = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        return h ? {
            add_money: '➕ उधार (Add Money)', receive_payment: '💰 जमा (Receive)',
            give_discount: '🎯 छूट दें', settle_loan: '✅ लोन बंद करें',
            amount_label: 'राशि (₹)', date_label: 'तारीख', note_label: 'नोट (वैकल्पिक)',
            cancel: 'रद्द करें', confirm: 'पक्का करें',
            lbl_net: 'कुल बाकी', rate_label: 'ब्याज दर(%)*', period_label: 'अवधि', type_label: 'प्रकार',
            monthly_l: 'मासिक', yearly_l: 'वार्षिक', simple_l: 'साधारण', compound_l: 'चक्रवृद्धि'
        } : {
            add_money: '➕ Udhar (Add Money)', receive_payment: '💰 Jama (Receive)',
            give_discount: '🎯 Discount', settle_loan: '✅ Settle Loan',
            amount_label: 'Amount (₹)', date_label: 'Date', note_label: 'Note (Optional)',
            cancel: 'Cancel', confirm: 'Confirm',
            lbl_net: 'Net Payable', rate_label: 'Interest Rate(%)*', period_label: 'Period', type_label: 'Type',
            monthly_l: 'Monthly', yearly_l: 'Yearly', simple_l: 'Simple', compound_l: 'Compound'
        };
    }

    function _hkModal(title, body, fn) {
        document.getElementById('hk-modal')?.remove(); document.getElementById('hisaab-modal')?.remove();
        const t = _hkT();
        const ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'hk-modal';
        ov.innerHTML = `<div class="modal" style="max-width:420px;"><h3 class="modal-title">${title}</h3>${body}<div class="modal-actions"><button class="btn btn-outline" onclick="document.getElementById('hk-modal').remove()">${t.cancel}</button><button class="btn btn-gold" id="hk-modal-confirm-btn" onclick="${fn}">${t.confirm}</button></div></div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        // Wire Enter key: move to next input field; confirm only on last field
        setTimeout(() => {
            const modal = document.querySelector('#hk-modal .modal');
            if (modal) {
                modal.addEventListener('keydown', e => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const inputs = Array.from(modal.querySelectorAll('input:not([type=checkbox]), select'));
                        const idx = inputs.indexOf(e.target);
                        if (idx >= 0 && idx < inputs.length - 1) {
                            inputs[idx + 1].focus();
                            if (inputs[idx + 1].type === 'number' || inputs[idx + 1].type === 'text') {
                                inputs[idx + 1].select();
                            }
                        } else {
                            document.getElementById('hk-modal-confirm-btn')?.click();
                        }
                    }
                });
            }
        }, 50);
    }

    // ── Add Money ─────────────────────────────────
    function showAddMoneyModal(lid) {
        const t = _hkT(); const loan = DB.getLoan(lid); const cr = loan?.interestRate || ''; const cp = loan?.interestPeriod || 'monthly'; const ct = loan?.interestType || 'simple';
        _hkModal(t.add_money,
            `<div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-a-amt" min="1" placeholder="e.g. 5000"></div>
            <div class="form-group mb-2"><label class="form-label">${t.rate_label}</label><input type="number" class="form-input" id="hk-a-rate" step="0.01" min="0.01" value="${cr}"></div>
            <div class="form-group mb-2"><label class="form-label">${t.period_label}</label><select class="form-input" id="hk-a-per"><option value="monthly" ${cp === 'monthly' ? 'selected' : ''}>${t.monthly_l}</option><option value="yearly" ${cp === 'yearly' ? 'selected' : ''}>${t.yearly_l}</option></select></div>
            <div class="form-group mb-2"><label class="form-label">${t.type_label}</label><select class="form-input" id="hk-a-typ"><option value="simple" ${ct === 'simple' ? 'selected' : ''}>${t.simple_l}</option><option value="compound" ${ct === 'compound' ? 'selected' : ''}>${t.compound_l}</option></select></div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-a-dt" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-a-nt" maxlength="200"></div>`,
            `LoanDetailPage.doAdd('${lid}')`);
    }
    function doAdd(lid) {
        const amt = parseFloat(document.getElementById('hk-a-amt')?.value);
        const dt = document.getElementById('hk-a-dt')?.value;
        const nt = document.getElementById('hk-a-nt')?.value?.trim() || '';
        const nr = parseFloat(document.getElementById('hk-a-rate')?.value);
        const np = document.getElementById('hk-a-per')?.value || 'monthly';
        const nty = document.getElementById('hk-a-typ')?.value || 'simple';
        if (!amt || amt <= 0) { UI.toast('Enter valid amount', 'error'); return; }
        if (!dt) { UI.toast('Select date', 'error'); return; }
        if (!nr || nr <= 0) { UI.toast('Enter valid rate', 'error'); return; }
        const loan = DB.getLoan(lid); if (!loan) return; HisabKitaabPage.initHK(loan);
        HisabKitaabPage.addEntry(loan, dt, 'add_money', amt, nt);
        loan.interestRate = nr; loan.interestPeriod = np; loan.interestType = nty;
        loan.loanAmount = (loan.loanAmount || 0) + amt;
        const le = loan.hisabKitaab[loan.hisabKitaab.length - 1];
        const nmr = np === 'yearly' ? nr / 12 : nr; le.rate = Number(Number(nmr).toFixed(2));
        le.note = (nt ? nt + ' | ' : '') + 'Rate:' + nr + '% ' + np + ',' + nty;
        DB.saveLoan(loan); document.getElementById('hk-modal')?.remove();
        UI.toast('✅ Amount added!', 'success'); render(document.getElementById('page-container'), lid);
    }

    // ── Receive Payment ───────────────────────────
    function showPayModal(lid) {
        const t = _hkT(); const loan = DB.getLoan(lid);
        HisabKitaabPage.initHK(loan);
        const hk = loan.hisabKitaab; const last = hk[hk.length - 1];
        const savedBal = last ? last.balance : 0;
        const loanRate = parseFloat(loan.interestRate) || 0;
        const mr = HisabKitaabPage.getMonthlyRate(loan);
        const today = new Date().toISOString().split('T')[0];
        const days = HisabKitaabPage.calcDays(last ? last.date : today, today);
        const runInt = HisabKitaabPage.calcInterest(savedBal, mr, days);
        const netPay = Number(Number(savedBal + runInt).toFixed(2));
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        // Store context for live recalculation
        LoanDetailPage._payCtx = { lid, savedBal, days, loanPeriod: loan.interestPeriod || 'monthly' };
        _hkModal(t.receive_payment,
            `<div style="background:var(--bg-input);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:0.88rem;line-height:2.2;">
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)">${isHi ? 'पिछला बाकी' : 'Saved Balance'}</span><strong>₹${savedBal.toFixed(2)}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)" id="ld-p-int-lbl">${isHi ? 'ब्याज (' + days + ' दिन)' : 'Interest (' + days + ' days)'}</span><strong style="color:var(--monitor)" id="ld-p-int-val">₹${runInt.toFixed(2)}</strong></div>
                <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border-light);padding-top:6px;margin-top:2px;"><span style="font-weight:700">${isHi ? 'कुल बाकी' : 'Net Payable'}</span><strong style="color:var(--safe);font-size:1.05rem;" id="ld-p-net-val">₹${netPay.toFixed(2)}</strong></div>
            </div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-p-dt" value="${today}" onchange="LoanDetailPage.updatePayInterest('${lid}')"></div>
            <div class="form-group mb-2">
                <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>${isHi ? 'ब्याज दर (%)' : 'Interest Rate (%)'}</span>
                    <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400;">${isHi ? 'दर बदलने पर ब्याज बदलेगा' : 'Change rate to recalculate'}</span>
                </label>
                <input type="number" class="form-input" id="hk-p-rate" min="0" step="0.01" value="${loanRate}" placeholder="e.g. 2" oninput="LoanDetailPage._recalcJamaInterest()" style="border-color:var(--primary);">
            </div>
            <div class="form-group mb-2">
                <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>${isHi ? 'ब्याज (₹)' : 'Interest (₹)'}</span>
                    <span style="font-size:0.75rem;color:var(--primary);font-weight:400;cursor:pointer;" onclick="LoanDetailPage._recalcJamaInterest()">${isHi ? 'ऑटो भरें' : 'Auto-fill'}</span>
                </label>
                <input type="number" class="form-input" id="hk-p-int" min="0" step="0.01" value="${runInt.toFixed(2)}" placeholder="0.00" oninput="LoanDetailPage._updateJamaNet()" style="border-color:var(--monitor);">
                <span style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;display:block;">${isHi ? 'दर बदलें या सीधे राशि डालें' : 'Change rate above or enter amount directly'}</span>
            </div>
            <div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-p-amt" min="0" step="0.01" value="${netPay.toFixed(2)}" oninput="LoanDetailPage._updateJamaNet()"></div>
            <div class="form-group mb-2"><label class="form-label">${isHi ? 'छूट (Discount)' : 'Discount (₹)'}</label><input type="number" class="form-input" id="hk-p-disc" min="0" step="0.01" placeholder="Optional"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-p-nt" maxlength="200"></div>
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:0.9rem;cursor:pointer;padding:8px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;">
                <input type="checkbox" id="hk-p-settle" style="width:16px;height:16px;accent-color:var(--safe);">
                <span style="font-weight:600;color:var(--safe);">${isHi ? 'लोन बंद करें (Settle Loan)' : 'Settle Loan (Close Account)'}</span>
            </label>`,
            `LoanDetailPage.doPay('${lid}')`);
    }
    function updatePayInterest(lid) {
        const loan = DB.getLoan(lid); if (!loan) return;
        HisabKitaabPage.initHK(loan); const hk = loan.hisabKitaab;
        const last = hk[hk.length - 1]; const savedBal = last ? last.balance : 0;
        const userRate = parseFloat(document.getElementById('hk-p-rate')?.value);
        const rateToUse = (userRate > 0) ? userRate : (parseFloat(loan.interestRate) || 0);
        const mr = (loan.interestPeriod === 'yearly') ? rateToUse / 12 : rateToUse;
        const dt = document.getElementById('hk-p-dt')?.value || new Date().toISOString().split('T')[0];
        const days = HisabKitaabPage.calcDays(last ? last.date : dt, dt);
        const runInt = HisabKitaabPage.calcInterest(savedBal, mr, days);
        const netPay = Number(Number(savedBal + runInt).toFixed(2));
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        if (LoanDetailPage._payCtx) { LoanDetailPage._payCtx.days = days; }
        const lblEl = document.getElementById('ld-p-int-lbl');
        const intEl = document.getElementById('ld-p-int-val');
        const netEl = document.getElementById('ld-p-net-val');
        const amtEl = document.getElementById('hk-p-amt');
        const intInpEl = document.getElementById('hk-p-int');
        if (lblEl) lblEl.textContent = isHi ? 'ब्याज (' + days + ' दिन)' : 'Interest (' + days + ' days)';
        if (intEl) intEl.textContent = '₹' + runInt.toFixed(2);
        if (netEl) netEl.textContent = '₹' + netPay.toFixed(2);
        if (intInpEl) intInpEl.value = runInt.toFixed(2);
        if (amtEl) amtEl.value = netPay.toFixed(2);
    }
    // Recalculate interest when user changes rate %
    function _recalcJamaInterest() {
        const ctx = LoanDetailPage._payCtx;
        if (!ctx) return;
        const userRate = parseFloat(document.getElementById('hk-p-rate')?.value) || 0;
        const mr = (ctx.loanPeriod === 'yearly') ? userRate / 12 : userRate;
        const loan = DB.getLoan(ctx.lid); if (!loan) return;
        HisabKitaabPage.initHK(loan); const hk = loan.hisabKitaab; const last = hk[hk.length - 1];
        const dt = document.getElementById('hk-p-dt')?.value || new Date().toISOString().split('T')[0];
        const days = HisabKitaabPage.calcDays(last ? last.date : dt, dt);
        const savedBal = last ? last.balance : 0;
        const runInt = HisabKitaabPage.calcInterest(savedBal, mr, days);
        const netPay = Number(Number(savedBal + runInt).toFixed(2));
        const intInpEl = document.getElementById('hk-p-int');
        const amtEl = document.getElementById('hk-p-amt');
        const intEl = document.getElementById('ld-p-int-val');
        const netEl = document.getElementById('ld-p-net-val');
        if (intInpEl) intInpEl.value = runInt.toFixed(2);
        if (amtEl) amtEl.value = netPay.toFixed(2);
        if (intEl) intEl.textContent = '₹' + runInt.toFixed(2);
        if (netEl) netEl.textContent = '₹' + netPay.toFixed(2);
    }
    // Update Net Payable display when user manually edits Interest or Amount
    function _updateJamaNet() {
        const intVal = parseFloat(document.getElementById('hk-p-int')?.value) || 0;
        const ctx = LoanDetailPage._payCtx;
        const amtEl  = document.getElementById('hk-p-amt');
        const netEl  = document.getElementById('ld-p-net-val');
        const intEl  = document.getElementById('ld-p-int-val');
        // Auto-update Amount = Saved Balance + Interest
        if (ctx && amtEl) {
            const newAmt = Number(Number(ctx.savedBal + intVal).toFixed(2));
            amtEl.value = newAmt.toFixed(2);
            if (netEl) netEl.textContent = '₹' + newAmt.toFixed(2);
        } else {
            const amtVal = parseFloat(amtEl?.value) || 0;
            if (netEl) netEl.textContent = '₹' + amtVal.toFixed(2);
        }
        if (intEl) intEl.textContent = '₹' + intVal.toFixed(2);
    }
    function doPay(lid) {
        const amt     = parseFloat(document.getElementById('hk-p-amt')?.value);
        const intAmt  = parseFloat(document.getElementById('hk-p-int')?.value) || 0; // manual interest
        const discAmt = parseFloat(document.getElementById('hk-p-disc')?.value) || 0;
        const dt      = document.getElementById('hk-p-dt')?.value;
        const nt      = document.getElementById('hk-p-nt')?.value?.trim() || '';
        const isSettle= document.getElementById('hk-p-settle')?.checked;
        if (!amt || amt <= 0) { UI.toast('Enter valid amount', 'error'); return; }
        if (!dt)              { UI.toast('Select date', 'error');         return; }
        const loan = DB.getLoan(lid); if (!loan) return; HisabKitaabPage.initHK(loan);

        // 1) Freeze manual interest as an interest entry if user entered it
        if (intAmt > 0) {
            HisabKitaabPage.addEntry(loan, dt, 'interest', intAmt, (nt ? 'Manual interest | ' + nt : 'Manual interest'));
        }

        // 2) Apply discount (if any)
        if (discAmt > 0) {
            HisabKitaabPage.addEntry(loan, dt, 'discount', discAmt, (nt ? 'Discount with payment | ' + nt : 'Discount with payment'));
            loan.totalDiscount = (loan.totalDiscount || 0) + discAmt;
        }

        // Prepare note for payment/settle row to show the custom interest
        let payNote = nt;
        if (intAmt > 0) {
            payNote = payNote ? `${payNote} | (Cus Int: ₹${intAmt})` : `(Cus Int: ₹${intAmt})`;
        }

        // 3) Record payment or settle
        if (isSettle) {
            HisabKitaabPage.addEntry(loan, dt, 'settle', amt, payNote);
            loan.status = 'closed';
            loan.settlement = { date: new Date().toISOString(), totalAmount: loan.hisabKitaab[loan.hisabKitaab.length - 2]?.balance || 0, paidAmount: amt, discount: (loan.totalDiscount || 0), status: 'CLOSED' };
            DB.saveLoan(loan);
            document.getElementById('hk-modal')?.remove(); UI.toast('✅ Loan settled!', 'success');
        } else {
            HisabKitaabPage.addEntry(loan, dt, 'payment', amt, payNote); DB.saveLoan(loan);
            document.getElementById('hk-modal')?.remove(); UI.toast('✅ Payment recorded!', 'success');
        }
        render(document.getElementById('page-container'), lid);
    }

    // ── Discount ──────────────────────────────────
    function showDiscModal(lid) {
        const t = _hkT();
        _hkModal(t.give_discount,
            `<div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-d-amt" min="1"></div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-d-dt" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-d-nt" maxlength="200"></div>`,
            `LoanDetailPage.doDisc('${lid}')`);
    }
    function doDisc(lid) {
        const amt = parseFloat(document.getElementById('hk-d-amt')?.value); const dt = document.getElementById('hk-d-dt')?.value; const nt = document.getElementById('hk-d-nt')?.value?.trim() || '';
        if (!amt || amt <= 0) { UI.toast('Enter valid amount', 'error'); return; } if (!dt) { UI.toast('Select date', 'error'); return; }
        const loan = DB.getLoan(lid); if (!loan) return; HisabKitaabPage.initHK(loan);
        HisabKitaabPage.addEntry(loan, dt, 'discount', amt, nt); loan.totalDiscount = (loan.totalDiscount || 0) + amt;
        DB.saveLoan(loan); document.getElementById('hk-modal')?.remove(); UI.toast('✅ Discount applied!', 'success'); render(document.getElementById('page-container'), lid);
    }

    // ── Settle ────────────────────────────────────
    function showSettleModal(lid) {
        const t = _hkT(); const loan = DB.getLoan(lid);
        HisabKitaabPage.initHK(loan);
        const hk = loan.hisabKitaab; const last = hk[hk.length - 1];
        const savedBal = last ? last.balance : 0;
        const mr = HisabKitaabPage.getMonthlyRate(loan);
        const today = new Date().toISOString().split('T')[0];
        const days = HisabKitaabPage.calcDays(last ? last.date : today, today);
        const runInt = HisabKitaabPage.calcInterest(savedBal, mr, days);
        const netPay = Number(Number(savedBal + runInt).toFixed(2));
        
        _hkModal(t.settle_loan,
            `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;">${t.lbl_net}: <strong>₹${netPay.toFixed(2)}</strong></p>
            <div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-s-amt" min="0" value="${netPay}"></div>
            <div class="form-group mb-2"><label class="form-label">${isHi ? 'छूट (Discount)' : 'Discount (₹)'}</label><input type="number" class="form-input" id="hk-s-disc" min="0" step="0.001" placeholder="Optional"></div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-s-dt" value="${today}"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-s-nt" maxlength="200"></div>`,
            `LoanDetailPage.doSettle('${lid}')`);
    }
    function doSettle(lid) {
        const amt = parseFloat(document.getElementById('hk-s-amt')?.value) || 0; 
        const discAmt = parseFloat(document.getElementById('hk-s-disc')?.value) || 0;
        const dt = document.getElementById('hk-s-dt')?.value; 
        const nt = document.getElementById('hk-s-nt')?.value?.trim() || '';
        if (!dt) { UI.toast('Select date', 'error'); return; }
        const loan = DB.getLoan(lid); if (!loan) return; HisabKitaabPage.initHK(loan);
        
        if (discAmt > 0) {
            HisabKitaabPage.addEntry(loan, dt, 'discount', discAmt, (nt ? 'Discount with settlement | ' + nt : 'Discount with settlement'));
            loan.totalDiscount = (loan.totalDiscount || 0) + discAmt;
        }

        HisabKitaabPage.addEntry(loan, dt, 'settle', amt, nt); loan.status = 'closed';
        loan.settlement = { date: new Date().toISOString(), totalAmount: loan.hisabKitaab[loan.hisabKitaab.length - 2]?.balance || 0, paidAmount: amt, discount: (loan.totalDiscount || 0), status: 'CLOSED' };
        DB.saveLoan(loan); document.getElementById('hk-modal')?.remove(); UI.toast('✅ Loan settled!', 'success'); render(document.getElementById('page-container'), lid);
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

    function goBack() {
        UI.navigateTo(_backTarget.page, _backTarget.data);
    }

    function toggleDetails(loanId) {
        _detailsVisible = !_detailsVisible;
        render(document.getElementById('page-container'), loanId);
    }

    return { render, setBackTarget, goBack, toggleDetails, showPaymentModal, sendWhatsApp, closeLoan, del,
             _netPayable, _getTotalPaid, _interestTillLastPayment, _buildEventLedgerHTML,
             showAddMoneyModal, doAdd,
             showPayModal, updatePayInterest, doPay, _updateJamaNet, _recalcJamaInterest,
             showDiscModal, doDisc,
             showSettleModal, doSettle,
             showEditModal, verifyAndShowEditForm, processLoanEdit,
             showLockerEditModal, verifyAndEditLocker, processLockerEdit,
             showNoteEditModal, saveJewelleryNote,
             toggleRiskPanel, toggleLedgerMode, toggleInterestBasis,
             handleImageTap,
             get _riskVisible()    { return _riskVisible;    },
             get _ledgerMode()     { return _ledgerMode;     },
             get _interestBasis()  { return _interestBasis;  } };
})();
