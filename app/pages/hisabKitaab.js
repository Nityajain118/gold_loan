/* ============================================
   Hisab Kitaab v2 — Real-Time Interest Engine
   ============================================ */
const HisabKitaabPage = (() => {
    let _tithiMode = false;

    function _t() {
        const h = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        return h ? {
            title: '📒 हिसाब किताब', back: '← वापस जाएं',
            add_money: '➕ उधार (Add Money)', receive_payment: '💰 जमा (Receive)',
            give_discount: '🎯 छूट दें', settle_loan: '✅ लोन बंद करें',
            sr: 'क्र.', date: 'तारीख', type: 'प्रकार', from: 'से', to: 'तक',
            days: 'दिन', rate: 'ब्याज%', interest: 'ब्याज', principal: 'मूल रकम',
            paid: 'जमा', balance: 'बाकी',
            loan_given: 'लोन दिया', add_money_type: 'और पैसा लिया',
            interest_type: 'ब्याज लगा', payment_type: 'पैसा जमा',
            discount_type: 'छूट', settle_type: 'लोन बंद',
            running_type: '🟢 चालू ब्याज (आज तक)',
            no_entries: 'अभी कोई एंट्री नहीं।',
            total_balance: 'कुल बाकी', amount_label: 'राशि (₹)',
            date_label: 'तारीख', note_label: 'नोट (वैकल्पिक)',
            cancel: 'रद्द करें', confirm: 'पक्का करें',
            phone: 'फोन', locker: 'लॉकर', address: 'पता',
            annual_rate: 'वार्षिक दर', monthly_rate: 'मासिक दर',
            lbl_principal: 'मूल रकम', lbl_interest: 'ब्याज (आज तक)',
            lbl_net: 'कुल बाकी', lbl_days: 'कुल दिन',
            view_details: '📊 ब्याज विवरण देखें',
            int_summary: 'ब्याज सारांश', timeline: 'ब्याज टाइमलाइन',
            opening: 'शुरुआत', closing: 'अंत',
            rate_label: 'ब्याज दर(%)*', period_label: 'अवधि', type_label: 'प्रकार',
            monthly_l: 'मासिक', yearly_l: 'वार्षिक', simple_l: 'साधारण', compound_l: 'चक्रवृद्धि',
            close_btn: 'बंद करें'
        } : {
            title: '📒 Hisab Kitaab', back: '← Back',
            add_money: '➕ Udhar (Add Money)', receive_payment: '💰 Jama (Receive)',
            give_discount: '🎯 Discount', settle_loan: '✅ Settle Loan',
            sr: 'Sr', date: 'Date', type: 'Type', from: 'From', to: 'To',
            days: 'Days', rate: 'Rate%', interest: 'Interest', principal: 'Principal',
            paid: 'Paid', balance: 'Balance',
            loan_given: 'Loan Given', add_money_type: 'Add Money',
            interest_type: 'Interest', payment_type: 'Payment',
            discount_type: 'Discount', settle_type: 'Loan Settled',
            running_type: '🟢 Running Interest (Till Today)',
            no_entries: 'No entries yet.',
            total_balance: 'Total Balance', amount_label: 'Amount (₹)',
            date_label: 'Date', note_label: 'Note (Optional)',
            cancel: 'Cancel', confirm: 'Confirm',
            phone: 'Phone', locker: 'Locker', address: 'Address',
            annual_rate: 'Annual Rate', monthly_rate: 'Monthly Rate',
            lbl_principal: 'Principal', lbl_interest: 'Interest (Till Today)',
            lbl_net: 'Net Payable', lbl_days: 'Total Days',
            view_details: '📊 View Interest Details',
            int_summary: 'Interest Summary', timeline: 'Interest Timeline',
            opening: 'Opening', closing: 'Closing',
            rate_label: 'Interest Rate(%)*', period_label: 'Period', type_label: 'Type',
            monthly_l: 'Monthly', yearly_l: 'Yearly', simple_l: 'Simple', compound_l: 'Compound',
            close_btn: 'Close'
        };
    }
    function _typeLabel(ty) { const t = _t(); return { loan_given: t.loan_given, add_money: t.add_money_type, interest: t.interest_type, payment: t.payment_type, discount: t.discount_type, settle: t.settle_type, running: t.running_type }[ty] || ty; }
    function _typeClass(ty) { return { loan_given: 'hk-row-loan', add_money: 'hk-row-loan', interest: 'hk-row-interest', payment: 'hk-row-payment', discount: 'hk-row-discount', settle: 'hk-row-settle', running: 'hk-row-running' }[ty] || ''; }
    function _typeIcon(ty) { return { loan_given: '📋', add_money: '➕', interest: '📈', payment: '💰', discount: '🎯', settle: '✅', running: '🟢' }[ty] || '•'; }

    // ── Precision helpers ─────────────────────────
    function _p(v) { return Number(Number(v).toFixed(3)); }
    function _cur3(v) { if (!v && v !== 0) return '₹0.000'; const n = Number(v); return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }

    // ── Tithi Helper ──────────────────────────────
    function _getTithi(dateString) {
        try {
            const d = new Date(dateString);
            return new Intl.DateTimeFormat('hi-IN-u-ca-indian', {day: 'numeric', month: 'long', year: 'numeric'}).format(d);
        } catch(e) { return ''; }
    }

    // ── Interest Engine ───────────────────────────
    function _getAnnualRate(loan) {
        const r = parseFloat(loan.interestRate) || 0;
        return (loan.interestPeriod === 'yearly') ? r : r * 12;
    }
    function _getMonthlyRate(loan) {
        const r = parseFloat(loan.interestRate) || 0;
        return (loan.interestPeriod === 'yearly') ? r / 12 : r;
    }
    function _calcDays(from, to) {
        const d1 = new Date(from); d1.setHours(0, 0, 0, 0);
        const d2 = new Date(to); d2.setHours(0, 0, 0, 0);
        return Math.max(0, (d2 - d1) / (864e5));
    }
    function _calcInterest(principal, monthlyRate, days) {
        if (principal <= 0 || monthlyRate <= 0 || days <= 0) return 0;
        const dailyRate = monthlyRate / 30;
        return _p(principal * dailyRate * days / 100);
    }

    // ── Init from loan data ───────────────────────
    function _initHK(loan) {
        if (loan.hisabKitaab && loan.hisabKitaab.length > 0) return;
        loan.hisabKitaab = [];
        const pr = loan.originalLoanAmount || loan.loanAmount || 0;
        const sd = loan.originalStartDate || loan.loanStartDate || new Date().toISOString().split('T')[0];
        const mr = _getMonthlyRate(loan);
        loan.hisabKitaab.push({ sr: 1, date: sd, type: 'loan_given', fromDate: sd, toDate: sd, days: 0, rate: _p(mr), interest: 0, principal: pr, paid: 0, balance: pr, note: '' });
    }

    // ── Compute running (virtual) interest ────────
    function _getRunningInterest(loan) {
        _initHK(loan);
        const hk = loan.hisabKitaab;
        if (!hk.length) return { days: 0, interest: 0, balance: 0 };
        const last = hk[hk.length - 1];
        const today = new Date().toISOString().split('T')[0];
        const days = _calcDays(last.date, today);
        const mr = _getMonthlyRate(loan);
        const interest = _calcInterest(last.balance, mr, days);
        return { days, interest, balance: _p(last.balance + interest), lastDate: last.date, rate: _p(mr) };
    }

    // ── Generate full timeline ────────────────────
    function _genTimeline(loan) {
        _initHK(loan);
        const hk = loan.hisabKitaab; const rows = [];
        let bal = 0; let lastDate = null;
        const mr = _getMonthlyRate(loan);
        hk.forEach(e => {
            if (e.type === 'loan_given' || e.type === 'add_money') {
                bal = e.balance; lastDate = e.date;
            } else if (e.type === 'interest') {
                rows.push({ from: e.fromDate, to: e.toDate, days: e.days, opening: _p(e.balance - e.interest), interest: e.interest, closing: e.balance });
                bal = e.balance; lastDate = e.date;
            } else if (e.type === 'payment' || e.type === 'discount' || e.type === 'settle') {
                bal = e.balance; lastDate = e.date;
            }
        });
        // Virtual row till today
        const today = new Date().toISOString().split('T')[0];
        if (lastDate) {
            const days = _calcDays(lastDate, today);
            if (days > 0) {
                const last = hk[hk.length - 1];
                const interest = _calcInterest(last.balance, mr, days);
                rows.push({ from: lastDate, to: today, days, opening: last.balance, interest, closing: _p(last.balance + interest), isRunning: true });
            }
        }
        return rows;
    }

    // ── Add entry with auto-interest freeze ───────
    function _addEntry(loan, actionDate, type, amount, note) {
        _initHK(loan); const hk = loan.hisabKitaab;
        const last = hk[hk.length - 1];
        const mr = _getMonthlyRate(loan);
        const days = _calcDays(last.date, actionDate);
        const interest = _calcInterest(last.balance, mr, days);
        let sr = hk.length + 1; let bal = last.balance;
        // Freeze interest row
        if (interest > 0 && days > 0) {
            bal = _p(bal + interest);
            hk.push({ sr: sr++, date: actionDate, type: 'interest', fromDate: last.date, toDate: actionDate, days, rate: _p(mr), interest, principal: 0, paid: 0, balance: bal, note: '' });
        }
        // Action row
        let pv = 0, pd = 0, nb = bal;
        if (type === 'add_money') { pv = amount; nb = _p(bal + amount); }
        else if (type === 'payment') { pd = amount; nb = _p(Math.max(0, bal - amount)); }
        else if (type === 'discount') { pd = amount; nb = _p(Math.max(0, bal - amount)); }
        else if (type === 'settle') { pd = amount; nb = _p(Math.max(0, bal - amount)); }
        hk.push({ sr, date: actionDate, type, fromDate: actionDate, toDate: actionDate, days: 0, rate: _p(mr), interest: 0, principal: pv, paid: pd, balance: nb, note: note || '' });
        return nb;
    }

    // ── RENDER ─────────────────────────────────
    function render(container, loanId) {
        const loan = DB.getLoan(loanId);
        if (!loan) { container.innerHTML = '<div class="empty-state"><h3>Loan not found</h3><button class="btn btn-primary" onclick="UI.navigateTo(\'loans\')">← Back</button></div>'; return; }
        _initHK(loan);
        if (loan.hisabKitaab.length === 1 && !loan._hkSaved) { loan._hkSaved = true; DB.saveLoan(loan); }
        const t = _t(); const hk = loan.hisabKitaab || [];
        const mr = _getMonthlyRate(loan); const ar = _getAnnualRate(loan);
        const isClosed = loan.status === 'closed';
        const run = isClosed ? { days: 0, interest: 0, balance: hk.length ? hk[hk.length - 1].balance : 0 } : _getRunningInterest(loan);
        const lastSaved = hk.length ? hk[hk.length - 1] : { balance: 0 };
        const origPrincipal = loan.originalLoanAmount || loan.loanAmount || 0;
        const totalInterest = hk.filter(e => e.type === 'interest').reduce((s, e) => s + e.interest, 0) + run.interest;
        const totalPaid = hk.filter(e => e.type === 'payment' || e.type === 'discount' || e.type === 'settle').reduce((s, e) => s + e.paid, 0);
        const totalDays = _calcDays(loan.originalStartDate || loan.loanStartDate || hk[0]?.date, new Date().toISOString().split('T')[0]);
        const np = (loan.customerName || 'GL').trim().split(' ');
        const ini = (np[0][0] + (np[1] ? np[1][0] : '')).toUpperCase();
        // Build cards
        const today = new Date().toISOString().split('T')[0];
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        
        let udharHtml = '';
        let jamaHtml = '';
        let discountHtml = '';

        // Sort hk entries ascending (oldest date first) for display index mapping
        // We use a sorted index array to maintain original idx for checkbox data-idx
        const sortedHkIndices = hk
            .map((e, idx) => ({ e, idx }))
            .sort((a, b) => new Date(a.e.date) - new Date(b.e.date));

        sortedHkIndices.forEach(({ e, idx }) => {
            // Pure auto-interest frozen rows are not shown as separate cards in split view
            if (e.type === 'interest' && e.principal === 0 && e.paid === 0) return;
            
            const isDebit = (e.type === 'loan_given' || e.type === 'add_money');
            const isDiscount = (e.type === 'discount');
            // ❌ Discount does NOT go in JAMA column — it has its own section
            const isCredit = (e.type === 'payment' || e.type === 'settle');
            if (!isDebit && !isCredit && !isDiscount) return;

            const isSelectable = (isDebit || e.type === 'payment' || e.type === 'discount');
            const cardClass = isDebit ? 'hk-card-udhar' : (isDiscount ? 'hk-card-discount' : 'hk-card-jama');
            const icon = _typeIcon(e.type);
            const label = _typeLabel(e.type);
            const chk = isSelectable ? `<input type="checkbox" class="hk-card-cb hk-select-cb" data-idx="${idx}" data-lid="${loanId}" onclick="event.stopPropagation()">` : '';
            const amt = isDebit ? e.principal : e.paid;
            const tithiStr = _getTithi(e.date);
            const noteStr = e.note ? `<div class="hk-card-note">📝 ${e.note}</div>` : '';

            let detailsHtml = '';
            if (isDebit) {
                detailsHtml = `
                    <div class="hk-card-details">
                        <div class="hk-detail-row"><span>${isHi ? 'मूल रकम' : 'Principal'}:</span> <strong>${_cur3(e.principal)}</strong></div>
                    </div>
                `;
            } else {
                detailsHtml = `
                    <div class="hk-card-details">
                        <div class="hk-detail-row"><span>${isHi ? 'जमा रकम' : 'Paid Amount'}:</span> <strong>${_cur3(e.paid)}</strong></div>
                    </div>
                `;
            }

            const card = `<div class="hk-card ${cardClass}" id="hk-card-${idx}" onclick="HisabKitaabPage.toggleCard(this, '${loanId}')">
                <div class="hk-card-header">
                    <div class="hk-card-title">${label}</div>
                    <div class="hk-card-amount">${_cur3(amt)}</div>
                </div>
                <div class="hk-card-body">
                    <div class="hk-card-dates">
                        ${_tithiMode ? `<div class="hk-date-hi" style="font-size:0.85rem; color:var(--text-primary);">🪔 Tithi: ${tithiStr}</div>` : `<div class="hk-date-en" style="font-size:0.85rem; color:var(--text-primary);">📅 ${UI.formatDate(e.date)}</div>`}
                        ${chk}
                    </div>
                    ${detailsHtml}
                    ${noteStr}
                    <details class="hk-card-more" onclick="event.stopPropagation()">
                        <summary>${isHi ? 'विवरण' : 'Details'}</summary>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px; line-height:1.8; background:rgba(0,0,0,0.1); padding:8px; border-radius:6px;">
                            <div style="display:flex;justify-content:space-between;"><span><strong>From Date:</strong></span> <span>${UI.formatDate(e.date)}</span></div>
                            <div style="display:flex;justify-content:space-between;"><span><strong>Today Date:</strong></span> <span>${UI.formatDate(today)}</span></div>
                            <div style="display:flex;justify-content:space-between;"><span><strong>Days Count:</strong></span> <span>${_calcDays(e.date, today)} days</span></div>
                            <div style="display:flex;justify-content:space-between;"><span><strong>Interest Rate:</strong></span> <span>${mr.toFixed(2)}% / month</span></div>
                            <div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.1); color:var(--primary); font-family:monospace; font-size:0.7rem;">
                                Formula: Principal × Rate × Days / (30 × 100)
                            </div>
                        </div>
                    </details>
                </div>
            </div>`;

            if (isDebit) udharHtml += card;
            else if (isCredit) jamaHtml += card;
            else if (isDiscount) discountHtml += card;
        });

        // ── Helper Totals ─────────────────────────────
        function totalDebitVal(hkArr) { return hkArr.filter(e => e.type === 'loan_given' || e.type === 'add_money').reduce((s, e) => s + e.principal, 0); }
        // Jama total = payments + settlements only (discounts excluded)
        function totalCreditVal(hkArr) { return hkArr.filter(e => e.type === 'payment' || e.type === 'settle').reduce((s, e) => s + e.paid, 0); }
        function totalDiscountVal(hkArr) { return hkArr.filter(e => e.type === 'discount').reduce((s, e) => s + e.paid, 0); }

        // Split Layout HTML
        const splitLayoutHtml = `
            <div class="hk-split-layout">
                <div class="hk-col-udhar">
                    <div class="hk-col-title">🔴 ${isHi ? 'उधार (Loan / Add Money)' : 'UDHAR (LOAN / ADD MONEY)'}</div>
                    <div class="hk-col-total" style="color:var(--danger)">${_cur3(totalDebitVal(hk))}</div>
                    <div class="hk-col-cards">${udharHtml || `<div class="hk-empty">${t.no_entries}</div>`}</div>
                </div>
                <div class="hk-col-jama">
                    <div class="hk-col-title">🟢 ${isHi ? 'जमा (Payment Received)' : 'JAMA (PAYMENT RECEIVED)'}</div>
                    <div class="hk-col-total" style="color:var(--safe)">${_cur3(totalCreditVal(hk))}</div>
                    <div class="hk-col-cards">${jamaHtml || `<div class="hk-empty">${t.no_entries}</div>`}</div>
                </div>
            </div>
        `;

        // ⭐ Discount Section HTML (separate, between split layout and selected breakdown)
        const totalDisc = totalDiscountVal(hk);
        const discountSectionHtml = totalDisc > 0 || discountHtml ? `
            <div class="hk-discount-section">
                <div class="hk-discount-section-header">
                    <span class="hk-discount-icon">🎯</span>
                    <span class="hk-discount-title">${isHi ? 'छूट लागू (Discount Applied)' : 'Discount Applied'}</span>
                    <span class="hk-discount-total">${_cur3(totalDisc)}</span>
                </div>
                <div class="hk-discount-cards">${discountHtml || `<div class="hk-empty" style="color:var(--text-muted);text-align:center;padding:10px;">No discounts yet.</div>`}</div>
            </div>
        ` : '';

        const selTitle = isHi ? '📌 चयनित एंट्री का हिसाब' : '📌 Selected Entry Breakdown';
        const selNetL = isHi ? 'कुल बाकी (Net Payable)' : 'Net Payable';

        // Calculate Global Summary mimicking onSelect logic exactly
        let globalSumUdharPrin = 0, globalSumUdharInt = 0;
        let globalSumJamaPrin = 0, globalSumJamaInt = 0;
        hk.forEach(e => {
            const isDebit = (e.type === 'loan_given' || e.type === 'add_money');
            const isCredit = (e.type === 'payment' || e.type === 'discount' || e.type === 'settle');
            if (!isDebit && !isCredit) return;
            const days = _calcDays(e.date, today);
            const amt = isDebit ? e.principal : e.paid;
            const interest = _calcInterest(amt, e.rate || mr, days);
            if (isDebit) {
                globalSumUdharPrin += amt;
                globalSumUdharInt += interest;
            } else {
                globalSumJamaPrin += amt;
                globalSumJamaInt += interest;
            }
        });
        
        const netGlobalPrin = _p(globalSumUdharPrin - globalSumJamaPrin);
        const netGlobalInt = _p(globalSumUdharInt - globalSumJamaInt);
        const finalGlobalPayable = _p(netGlobalPrin + netGlobalInt);

        container.innerHTML = `<div class="hk-page">
            <button class="btn btn-ghost" style="align-self:flex-start;margin-bottom:8px;" onclick="UI.navigateTo('loan-detail','${loan.id}')">${t.back}</button>
            <div class="hk-header"><div class="hk-header-left"><div class="hk-avatar">${ini}</div><div class="hk-customer-info"><div class="hk-customer-name">${loan.customerName || '—'}</div><div class="hk-customer-meta"><span>📞 ${t.phone}: <strong>${loan.mobile || '—'}</strong></span><span>🔒 ${t.locker}: <strong>${loan.lockerName || loan.lockerNo || '—'}</strong></span></div>${loan.address ? `<div class="hk-customer-meta">📍 ${t.address}: ${loan.address}</div>` : ''}</div></div><div class="hk-header-right"><div class="hk-rate-info"><span>${t.monthly_rate}: <strong>${mr.toFixed(2)}%</strong></span><span>${t.annual_rate}: <strong>${ar.toFixed(2)}%</strong></span></div><span class="ld-badge ${isClosed ? 'ld-badge-closed' : 'ld-badge-active'}">${isClosed ? '🔴 CLOSED' : '🟢 ACTIVE'}</span></div></div>
            ${!isClosed ? `<div class="hk-actions"><button class="hk-action-btn hk-btn-add" onclick="HisabKitaabPage.showAddMoneyModal('${loan.id}')"><span class="hk-btn-icon">➕</span><span class="hk-btn-label">${t.add_money}</span></button><button class="hk-action-btn hk-btn-payment" onclick="HisabKitaabPage.showPayModal('${loan.id}')"><span class="hk-btn-icon">💰</span><span class="hk-btn-label">${t.receive_payment}</span></button><button class="hk-action-btn hk-btn-discount" onclick="HisabKitaabPage.showDiscModal('${loan.id}')"><span class="hk-btn-icon">🎯</span><span class="hk-btn-label">${t.give_discount}</span></button><button class="hk-action-btn hk-btn-settle" onclick="HisabKitaabPage.showSettleModal('${loan.id}')"><span class="hk-btn-icon">✅</span><span class="hk-btn-label">${t.settle_loan}</span></button></div>` : ''}
            
            <div class="hk-tithi-toggle-bar" style="display:flex; justify-content:center; align-items:center; gap:12px; margin-top:8px; padding:12px; background:var(--bg-card); border-radius:12px; border:1px solid var(--border-color);">
                <span style="font-weight:600; color:var(--text-primary); font-size:0.85rem;">📅 Normal Date</span>
                <label class="hk-switch">
                    <input type="checkbox" ${_tithiMode ? 'checked' : ''} onchange="HisabKitaabPage.toggleTithiMode('${loan.id}')">
                    <span class="hk-slider"></span>
                </label>
                <span style="font-weight:600; color:var(--text-primary); font-size:0.85rem;">🪔 Tithi Mode</span>
            </div>
            
            ${splitLayoutHtml}
            ${discountSectionHtml}

            <div id="hk-select-summary" class="hk-select-summary" style="display:none;">
                <div class="hk-select-title">${selTitle}</div>
                <div id="hk-select-rows"></div>
                <div class="hk-select-net"><span>${selNetL}</span><span id="hk-select-net-val">₹0</span></div>
            </div>
            
            <div class="hk-live-summary hk-khata-summary">
                <div class="hk-khata-summary-title">ACTIVE KHATA SUMMARY <a href="#" style="float:right; font-size:0.8rem; color:var(--primary); text-decoration:none;" onclick="HisabKitaabPage.showTimeline('${loan.id}')">View Full Ledger</a></div>
                <div class="hk-live-row"><span class="hk-live-label">Net Principal</span><span class="hk-live-val">${_cur3(netGlobalPrin)}</span></div>
                <div class="hk-live-row"><span class="hk-live-label">Interest (Till Today)</span><span class="hk-live-val" style="color:var(--monitor)">${netGlobalInt >= 0 ? '+' : ''} ${_cur3(netGlobalInt)}</span></div>
                <div class="hk-live-row hk-live-net"><span class="hk-live-label">Final Payable</span><span class="hk-live-val">${_cur3(finalGlobalPayable)}</span></div>
            </div>
        </div>`;
    }

    // ── Selection Handler ─────────────────────────
    function toggleTithiMode(loanId) {
        _tithiMode = !_tithiMode;
        render(document.getElementById('page-container'), loanId);
    }

    function toggleCard(cardEl, loanId) {
        const cb = cardEl.querySelector('.hk-card-cb');
        if (!cb) return;
        cb.checked = !cb.checked;
        if (cb.checked) {
            cardEl.classList.add('hk-card-selected');
        } else {
            cardEl.classList.remove('hk-card-selected');
        }
        onSelect(loanId);
    }

    function onSelect(loanId) {
        const loan = DB.getLoan(loanId); if (!loan) return;
        _initHK(loan); const hk = loan.hisabKitaab;
        const cbs = document.querySelectorAll('.hk-select-cb:checked');
        const wrap = document.getElementById('hk-select-summary');
        const rowsDiv = document.getElementById('hk-select-rows');
        const netEl = document.getElementById('hk-select-net-val');
        if (!cbs.length) { wrap.style.display = 'none'; return; }
        wrap.style.display = 'block';
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        const today = new Date().toISOString().split('T')[0];
        const mr = _getMonthlyRate(loan);
        let totalDebit = 0; let totalCredit = 0; let html = '';
        const udharLabel = isHi ? '📋 उधार (Loan/Add Money)' : '📋 Udhar (Loan/Add Money)';
        const jamaLabel = isHi ? '💰 जमा (Payment/Discount)' : '💰 Jama (Payment/Discount)';
        let debitHtml = ''; let creditHtml = '';
        cbs.forEach(cb => {
            const idx = parseInt(cb.dataset.idx); const e = hk[idx]; if (!e) return;
            const isDebit = (e.type === 'loan_given' || e.type === 'add_money');
            const isCredit = (e.type === 'payment' || e.type === 'discount');
            if (!isDebit && !isCredit) return;
            
            const days = _calcDays(e.date, today);
            const amt = isDebit ? e.principal : e.paid;
            const interest = _calcInterest(amt, e.rate || mr, days);
            const entryTotal = _p(amt + interest);
            const label = _typeLabel(e.type);
            const icon = _typeIcon(e.type);
            
            const dateStr = _tithiMode ? _getTithi(e.date) : UI.formatDate(e.date);
            const row = `<div class="hk-select-row">
                <div class="hk-sel-left"><span class="hk-sel-label">${icon} ${label}</span><span class="hk-sel-date">${dateStr} → ${isHi ? 'आज' : 'Today'} (${days} ${isHi ? 'दिन' : 'days'})</span></div>
                <div class="hk-sel-right">
                    <div>${isHi ? 'रकम' : 'Amt'}: <strong>${_cur3(amt)}</strong></div>
                    <div>${isDebit ? (isHi ? 'ब्याज' : 'Int') : 'Int Adj'}: <strong style="color:var(--monitor)">${isDebit ? '+' : '-'}${_cur3(interest)}</strong></div>
                    <div>${isHi ? 'कुल' : 'Total'}: <strong style="color:${isDebit ? 'var(--danger)' : 'var(--safe)'}">${_cur3(entryTotal)}</strong></div>
                </div>
            </div>`;
            
            if (isDebit) { totalDebit += entryTotal; debitHtml += row; }
            else { totalCredit += entryTotal; creditHtml += row; }
        });
        const netPayable = _p(totalDebit - totalCredit);
        html = '';
        if (debitHtml) html += `<div class="hk-sel-section-title" style="color:var(--danger);font-weight:700;font-size:0.88rem;margin:8px 0 4px;">📋 ${isHi ? 'उधार (दिया)' : 'Udhar (Given)'}: ${_cur3(totalDebit)}</div>` + debitHtml;
        if (creditHtml) html += `<div class="hk-sel-section-title" style="color:var(--safe);font-weight:700;font-size:0.88rem;margin:12px 0 4px;">💰 ${isHi ? 'जमा (लिया)' : 'Jama (Received)'}: ${_cur3(totalCredit)}</div>` + creditHtml;
        rowsDiv.innerHTML = html;
        netEl.textContent = _cur3(netPayable);
    }

    // ── Timeline Modal ────────────────────────────
    function showTimeline(loanId) {
        const loan = DB.getLoan(loanId); if (!loan) return;
        const t = _t(); const tl = _genTimeline(loan);
        const run = _getRunningInterest(loan);
        const origP = loan.originalLoanAmount || loan.loanAmount || 0;
        const totInt = tl.reduce((s, r) => s + r.interest, 0);
        let trows = tl.map(r => {
            const cls = r.isRunning ? 'hk-row-running' : 'hk-row-interest';
            return `<tr class="${cls}"><td>${UI.formatDate(r.from)}</td><td>${r.isRunning ? '<strong>Today</strong>' : UI.formatDate(r.to)}</td><td>${r.days}</td><td>${_cur3(r.opening)}</td><td class="hk-cell-interest">${_cur3(r.interest)}</td><td class="hk-cell-balance"><strong>${_cur3(r.closing)}</strong></td></tr>`;
        }).join('');
        document.getElementById('hk-modal')?.remove();
        const ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'hk-modal';
        ov.innerHTML = `<div class="modal" style="max-width:700px;max-height:85vh;overflow-y:auto;">
            <h3 class="modal-title">📊 ${t.int_summary}</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
                <div style="padding:10px;background:var(--bg-input);border-radius:8px;"><span style="font-size:0.78rem;color:var(--text-secondary)">${t.lbl_principal}</span><br><strong>${_cur3(origP)}</strong></div>
                <div style="padding:10px;background:var(--bg-input);border-radius:8px;"><span style="font-size:0.78rem;color:var(--text-secondary)">${t.lbl_interest}</span><br><strong style="color:var(--monitor)">${_cur3(totInt)}</strong></div>
                <div style="padding:10px;background:var(--bg-input);border-radius:8px;grid-column:span 2;"><span style="font-size:0.78rem;color:var(--text-secondary)">${t.lbl_net}</span><br><strong style="font-size:1.2rem;color:var(--safe)">${_cur3(run.balance || origP + totInt)}</strong></div>
            </div>
            <h4 style="margin-bottom:8px;">📈 ${t.timeline}</h4>
            <div style="overflow-x:auto;"><table class="hk-table" style="min-width:500px;"><thead><tr><th>${t.from}</th><th>${t.to}</th><th>${t.days}</th><th>${t.opening}</th><th>${t.interest}</th><th>${t.closing}</th></tr></thead><tbody>${trows}</tbody></table></div>
            <div class="modal-actions"><button class="btn btn-outline" onclick="document.getElementById('hk-modal').remove()">${t.close_btn}</button></div>
        </div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
    }

    // ── Modal Helper ──────────────────────────────
    function _modal(title, body, fn) {
        document.getElementById('hk-modal')?.remove(); const t = _t();
        const ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'hk-modal';
        ov.innerHTML = `<div class="modal" style="max-width:420px;"><h3 class="modal-title">${title}</h3>${body}<div class="modal-actions"><button class="btn btn-outline" onclick="document.getElementById('hk-modal').remove()">${t.cancel}</button><button class="btn btn-gold" onclick="${fn}">${t.confirm}</button></div></div>`;
        document.body.appendChild(ov); ov.onclick = e => { if (e.target === ov) ov.remove(); };
    }

    // ── Add Money ─────────────────────────────────
    function showAddMoneyModal(lid) {
        const t = _t(); const loan = DB.getLoan(lid); const cr = loan?.interestRate || ''; const cp = loan?.interestPeriod || 'monthly'; const ct = loan?.interestType || 'simple';
        _modal('➕ ' + t.add_money,
            `<div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-a-amt" min="1" placeholder="e.g. 5000"></div>
            <div class="form-group mb-2"><label class="form-label">${t.rate_label}</label><input type="number" class="form-input" id="hk-a-rate" step="0.01" min="0.01" value="${cr}"></div>
            <div class="form-group mb-2"><label class="form-label">${t.period_label}</label><select class="form-input" id="hk-a-per"><option value="monthly" ${cp === 'monthly' ? 'selected' : ''}>${t.monthly_l}</option><option value="yearly" ${cp === 'yearly' ? 'selected' : ''}>${t.yearly_l}</option></select></div>
            <div class="form-group mb-2"><label class="form-label">${t.type_label}</label><select class="form-input" id="hk-a-typ"><option value="simple" ${ct === 'simple' ? 'selected' : ''}>${t.simple_l}</option><option value="compound" ${ct === 'compound' ? 'selected' : ''}>${t.compound_l}</option></select></div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-a-dt" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-a-nt" maxlength="200"></div>`,
            `HisabKitaabPage.doAdd('${lid}')`);
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
        const loan = DB.getLoan(lid); if (!loan) return; _initHK(loan);
        _addEntry(loan, dt, 'add_money', amt, nt);
        loan.interestRate = nr; loan.interestPeriod = np; loan.interestType = nty;
        loan.loanAmount = (loan.loanAmount || 0) + amt;
        const le = loan.hisabKitaab[loan.hisabKitaab.length - 1];
        const nmr = np === 'yearly' ? nr / 12 : nr; le.rate = _p(nmr);
        le.note = (nt ? nt + ' | ' : '') + 'Rate:' + nr + '% ' + np + ',' + nty;
        DB.saveLoan(loan); document.getElementById('hk-modal')?.remove();
        UI.toast('✅ Amount added!', 'success'); render(document.getElementById('page-container'), lid);
    }

    // ── Receive Payment ───────────────────────────
    function showPayModal(lid) {
        const t = _t(); const loan = DB.getLoan(lid);
        _initHK(loan);
        const hk = loan.hisabKitaab; const last = hk[hk.length - 1];
        const savedBal = last ? last.balance : 0;
        const mr = _getMonthlyRate(loan);
        const today = new Date().toISOString().split('T')[0];
        const days = _calcDays(last ? last.date : today, today);
        const runInt = _calcInterest(savedBal, mr, days);
        const netPay = _p(savedBal + runInt);
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        _modal('💰 ' + t.receive_payment,
            `<div style="background:var(--bg-input);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:0.88rem;line-height:2.2;">
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)">${isHi ? 'पिछला बाकी' : 'Saved Balance'}</span><strong>${_cur3(savedBal)}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)" id="hk-p-int-lbl">${isHi ? 'ब्याज (' + days + ' दिन)' : 'Interest (' + days + ' days)'}</span><strong style="color:var(--monitor)" id="hk-p-int-val">${_cur3(runInt)}</strong></div>
                <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border-light);padding-top:6px;margin-top:2px;"><span style="font-weight:700">${isHi ? 'कुल बाकी' : 'Net Payable'}</span><strong style="color:var(--safe);font-size:1.05rem;" id="hk-p-net-val">${_cur3(netPay)}</strong></div>
            </div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-p-dt" value="${today}" onchange="HisabKitaabPage.updatePayInterest('${lid}')"></div>
            <div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-p-amt" min="0" step="0.001" value="${netPay}"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-p-nt" maxlength="200"></div>`,
            `HisabKitaabPage.doPay('${lid}')`);
    }
    function updatePayInterest(lid) {
        const loan = DB.getLoan(lid); if (!loan) return;
        _initHK(loan); const hk = loan.hisabKitaab;
        const last = hk[hk.length - 1]; const savedBal = last ? last.balance : 0;
        const mr = _getMonthlyRate(loan);
        const dt = document.getElementById('hk-p-dt')?.value || new Date().toISOString().split('T')[0];
        const days = _calcDays(last ? last.date : dt, dt);
        const runInt = _calcInterest(savedBal, mr, days);
        const netPay = _p(savedBal + runInt);
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        const lblEl = document.getElementById('hk-p-int-lbl');
        const intEl = document.getElementById('hk-p-int-val');
        const netEl = document.getElementById('hk-p-net-val');
        const amtEl = document.getElementById('hk-p-amt');
        if (lblEl) lblEl.textContent = isHi ? 'ब्याज (' + days + ' दिन)' : 'Interest (' + days + ' days)';
        if (intEl) intEl.textContent = _cur3(runInt);
        if (netEl) netEl.textContent = _cur3(netPay);
        if (amtEl) amtEl.value = netPay;
    }
    function doPay(lid) {
        const amt = parseFloat(document.getElementById('hk-p-amt')?.value);
        const dt = document.getElementById('hk-p-dt')?.value;
        const nt = document.getElementById('hk-p-nt')?.value?.trim() || '';
        if (!amt || amt <= 0) { UI.toast('Enter valid amount', 'error'); return; }
        if (!dt) { UI.toast('Select date', 'error'); return; }
        const loan = DB.getLoan(lid); if (!loan) return; _initHK(loan);
        _addEntry(loan, dt, 'payment', amt, nt); DB.saveLoan(loan);
        document.getElementById('hk-modal')?.remove(); UI.toast('✅ Payment recorded!', 'success');
        render(document.getElementById('page-container'), lid);
    }

    // ── Discount ──────────────────────────────────
    function showDiscModal(lid) {
        const t = _t();
        _modal('🎯 ' + t.give_discount,
            `<div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-d-amt" min="1"></div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-d-dt" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-d-nt" maxlength="200"></div>`,
            `HisabKitaabPage.doDisc('${lid}')`);
    }
    function doDisc(lid) {
        const amt = parseFloat(document.getElementById('hk-d-amt')?.value); const dt = document.getElementById('hk-d-dt')?.value; const nt = document.getElementById('hk-d-nt')?.value?.trim() || '';
        if (!amt || amt <= 0) { UI.toast('Enter valid amount', 'error'); return; } if (!dt) { UI.toast('Select date', 'error'); return; }
        const loan = DB.getLoan(lid); if (!loan) return; _initHK(loan);
        _addEntry(loan, dt, 'discount', amt, nt); loan.totalDiscount = (loan.totalDiscount || 0) + amt;
        DB.saveLoan(loan); document.getElementById('hk-modal')?.remove(); UI.toast('✅ Discount applied!', 'success'); render(document.getElementById('page-container'), lid);
    }

    // ── Settle ────────────────────────────────────
    function showSettleModal(lid) {
        const t = _t(); const loan = DB.getLoan(lid); const run = _getRunningInterest(loan);
        _modal('✅ ' + t.settle_loan,
            `<p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:10px;">${t.lbl_net}: <strong>${_cur3(run.balance)}</strong></p>
            <div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-s-amt" min="0" value="${_p(run.balance)}"></div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-s-dt" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-s-nt" maxlength="200"></div>`,
            `HisabKitaabPage.doSettle('${lid}')`);
    }
    function doSettle(lid) {
        const amt = parseFloat(document.getElementById('hk-s-amt')?.value) || 0; const dt = document.getElementById('hk-s-dt')?.value; const nt = document.getElementById('hk-s-nt')?.value?.trim() || '';
        if (!dt) { UI.toast('Select date', 'error'); return; }
        const loan = DB.getLoan(lid); if (!loan) return; _initHK(loan);
        _addEntry(loan, dt, 'settle', amt, nt); loan.status = 'closed';
        loan.settlement = { date: new Date().toISOString(), totalAmount: loan.hisabKitaab[loan.hisabKitaab.length - 2]?.balance || 0, paidAmount: amt, discount: 0, status: 'CLOSED' };
        DB.saveLoan(loan); document.getElementById('hk-modal')?.remove(); UI.toast('✅ Loan settled!', 'success'); render(document.getElementById('page-container'), lid);
    }

    return { render, showAddMoneyModal, doAdd, showPayModal, updatePayInterest, doPay, showDiscModal, doDisc, showSettleModal, doSettle, showTimeline, onSelect, toggleCard, toggleTithiMode };
})();
