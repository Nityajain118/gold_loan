/* ============================================
   Hisab Kitaab v2 — Real-Time Interest Engine
   ============================================ */
const HisabKitaabPage = (() => {
    // Tithi mode is now controlled globally by the navbar moon icon.
    // Read DB.getSettings().timeMode === 'tithi' everywhere instead of a local flag.

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
            ledger_title: '📒 Loan Khata', add_money_type: 'Add Money',
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
    function _p(v) { return Number(Number(v).toFixed(2)); }
    function _cur3(v) { if (!v && v !== 0) return '₹0.00'; const n = Number(v); return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    // ── Duration Formatter — "244 days (8 months 4 days)" ────────────────────
    function _formatDuration(days) {
        const d = Math.max(0, Math.floor(days));
        if (d === 0) return '0 days';
        const months = Math.floor(d / 30);
        const rem    = d % 30;
        if (months === 0) return `${d} day${d !== 1 ? 's' : ''}`;
        const mStr = `${months} month${months !== 1 ? 's' : ''}`;
        if (rem === 0) return `${d} days (${mStr})`;
        return `${d} days (${mStr} ${rem} day${rem !== 1 ? 's' : ''})`;
    }

    // ── Safe Number Utilities (crash-proof, NaN-safe) ──────────────────────────
    function safeNumber(v) {
        const n = Number(v);
        return (v === null || v === undefined || !isFinite(n)) ? 0 : n;
    }
    function formatAmount(v) {
        return Number(safeNumber(v)).toFixed(2);
    }

    // ── Centralized Calculation Engine — SINGLE SOURCE OF TRUTH ───────────────
    /**
     * calculateSummary(loan, today?)
     *   Reads loan.hisabKitaab primary entries and computes:
     *     DEBIT  → totalDebit += amount;  totalInterest += (amount × rate × days)/(100×30)
     *     CREDIT → totalCredit += amount
     *     netPayable = totalDebit + totalInterest - totalCredit (min 0, toFixed 2)
     *
     *   Attaches _amount, _days, _interest, _isDebit to each entry so
     *   Loan Ledger can render rows WITHOUT recalculating anything independently.
     */
    function calculateSummary(loan, today) {
        const EMPTY = { totalDebit: 0, totalCredit: 0, totalInterest: 0, netPayable: 0, entries: [] };
        if (!loan) return EMPTY;
        try {
            today = today || new Date().toISOString().split('T')[0];
            _initHK(loan);
            const hk = loan.hisabKitaab || [];
            const mr = safeNumber(_getMonthlyRate(loan));

            let totalDebit = 0, totalCredit = 0, totalInterest = 0;

            const primary = hk.filter(e =>
                e.type === 'loan_given' || e.type === 'add_money' ||
                e.type === 'payment'    || e.type === 'discount'  ||
                e.type === 'settle'     || (e.type === 'interest' && e.note && e.note.indexOf('Manual interest') >= 0)
            ).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

            primary.forEach(e => {
                const isDebit = (e.type === 'loan_given' || e.type === 'add_money');
                const isCustomInt = (e.type === 'interest');
                const amount  = safeNumber(isDebit ? (e.principal || e.amount) : (e.paid || e.amount));

                let interest = 0, days = 0;
                if (isCustomInt) {
                    interest = safeNumber(e.interest);
                    totalInterest += interest;
                } else if (isDebit && amount > 0 && mr > 0) {
                    const d1 = new Date(e.date); d1.setHours(0, 0, 0, 0);
                    const d2 = new Date(today);  d2.setHours(0, 0, 0, 0);
                    days     = Math.max(0, Math.floor((d2 - d1) / 864e5));
                    interest = parseFloat(((amount * mr * days) / (100 * 30)).toFixed(2));
                    if (!isFinite(interest)) interest = 0;
                    totalDebit    += amount;
                    totalInterest += interest;
                } else if (!isDebit) {
                    totalCredit   += amount;
                }
                // Attach pre-computed values — ledger reads these, never recalculates
                e._amount   = amount;
                e._days     = days;
                e._interest = interest;
                e._isDebit  = isDebit;
            });

            const netPayable = parseFloat(Math.max(0, (totalDebit + totalInterest) - totalCredit).toFixed(2));
            return {
                totalDebit:    parseFloat(totalDebit.toFixed(2)),
                totalCredit:   parseFloat(totalCredit.toFixed(2)),
                totalInterest: parseFloat(totalInterest.toFixed(2)),
                netPayable,
                entries: primary
            };
        } catch(err) { console.error('calculateSummary', err); return EMPTY; }
    }



    // ── Tithi Helper ─────────────────────────────────────────────────────────
    // Returns the correct Vikram Samvat format: "Samvat 2083 • Magha • Shukla Chaturdashi"
    // Uses Tithi.formatTithi() — NOT the broken Intl.DateTimeFormat(ca-indian)
    // which produced Shaka output like "30 Chaitra 1948 Shaka".
    function _getTithi(dateString) {
        try {
            if (typeof Tithi !== 'undefined') return Tithi.formatTithi(dateString);
            return UI.formatDate(dateString);
        } catch(e) { return UI.formatDate(dateString); }
    }

    // ── Global Tithi mode helper (reads from DB, no local state) ─────────────
    function _isTithiMode() {
        try { return (typeof DB !== 'undefined') && DB.getSettings().timeMode === 'tithi'; }
        catch(e) { return false; }
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
        let pv = 0, pd = 0, nb = bal, actInt = 0;
        if (type === 'add_money') { pv = amount; nb = _p(bal + amount); }
        else if (type === 'payment') { pd = amount; nb = _p(Math.max(0, bal - amount)); }
        else if (type === 'discount') { pd = amount; nb = _p(Math.max(0, bal - amount)); }
        else if (type === 'settle') { pd = amount; nb = _p(Math.max(0, bal - amount)); }
        else if (type === 'interest') { actInt = amount; nb = _p(bal + amount); }
        hk.push({ sr, date: actionDate, type, fromDate: actionDate, toDate: actionDate, days: 0, rate: _p(mr), interest: actInt, principal: pv, paid: pd, balance: nb, note: note || '' });
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
            // Mark custom/manual interest entries with (Cus) badge
            const isCusInt = e.type === 'interest' && e.note && e.note.indexOf('Manual interest') >= 0;
            const displayLabel = isCusInt
                ? (label + ' <span style="font-size:0.65rem;background:var(--monitor);color:#000;padding:1px 5px;border-radius:4px;margin-left:4px;font-weight:700;">Cus</span>')
                : label;
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
                    <div class="hk-card-title">${displayLabel}</div>
                    <div class="hk-card-amount">${_cur3(amt)}</div>
                </div>
                <div class="hk-card-body">
                    <div class="hk-card-dates">
                        <div class="hk-date-en" style="font-size:0.85rem; color:var(--text-primary); line-height:1.5;">${UI.formatDate(e.date)}</div>
                        ${chk}
                    </div>
                    ${detailsHtml}
                    ${noteStr}
                    <details class="hk-card-more" onclick="event.stopPropagation()">
                        <summary>${isHi ? 'विवरण' : 'Details'}</summary>
                        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px; line-height:1.8; background:rgba(0,0,0,0.1); padding:8px; border-radius:6px;">
                            <div style="display:flex;justify-content:space-between;"><span><strong>From Date:</strong></span> <span>${UI.formatDate(e.date)}</span></div>
                            <div style="display:flex;justify-content:space-between;"><span><strong>Today Date:</strong></span> <span>${UI.formatDate(today)}</span></div>
                            <div style="display:flex;justify-content:space-between;"><span><strong>Duration:</strong></span> <span>${_formatDuration(_calcDays(e.date, today))}</span></div>
                            <div style="display:flex;justify-content:space-between;"><span><strong>Interest Rate:</strong></span> <span>${mr.toFixed(2)}% / month</span></div>
                            <div style="margin-top:6px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.1); color:var(--primary); font-family:monospace; font-size:0.7rem;">
                                Formula: Principal × Rate × Days / (30 × 100)
                            </div>
                        </div>
                    </details>
                    ${!isClosed ? `<div class="hk-card-delete-wrap" onclick="event.stopPropagation()">
                        <button class="hk-delete-btn" title="Delete entry (PIN required)"
                            onclick="HisabKitaabPage.showDeleteModal('${loanId}', ${idx})">🗑️ Delete</button>
                    </div>` : ''}
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
            ${!isClosed ? `<div class="hk-actions"><button class="hk-action-btn hk-btn-add kn-focusable" onclick="HisabKitaabPage.showAddMoneyModal('${loan.id}')"><span class="hk-btn-icon">➕</span><span class="hk-btn-label">${t.add_money}</span></button><button class="hk-action-btn hk-btn-payment kn-focusable" onclick="HisabKitaabPage.showPayModal('${loan.id}')"><span class="hk-btn-icon">💰</span><span class="hk-btn-label">${t.receive_payment}</span></button><button class="hk-action-btn hk-btn-discount kn-focusable" onclick="HisabKitaabPage.showDiscModal('${loan.id}')"><span class="hk-btn-icon">🎯</span><span class="hk-btn-label">${t.give_discount}</span></button><button class="hk-action-btn hk-btn-settle kn-focusable" onclick="HisabKitaabPage.showSettleModal('${loan.id}')"><span class="hk-btn-icon">✅</span><span class="hk-btn-label">${t.settle_loan}</span></button></div>` : ''}
            
            <!-- Tithi Mode is controlled globally by the navbar moon icon -->
            <!-- No local toggle needed here anymore -->
            
            ${splitLayoutHtml}
            ${discountSectionHtml}

            <div id="hk-select-summary" class="hk-select-summary" style="display:none;">
                <div class="hk-select-title">${selTitle}</div>
                <div id="hk-select-rows"></div>
                <div class="hk-select-net"><span>${selNetL}</span><span id="hk-select-net-val">₹0</span></div>
                <div class="hk-settle-actions">
                    <button class="btn btn-sm hk-settle-sel-btn" onclick="HisabKitaabPage.settleSelected('${loan.id}')">✅ Settle Selected</button>
                    <button class="btn btn-ghost btn-sm" style="font-size:0.78rem;" onclick="document.querySelectorAll('.hk-select-cb').forEach(cb=>{cb.checked=false;cb.closest('.hk-card')?.classList.remove('hk-card-selected');});document.getElementById('hk-select-summary').style.display='none';">✕ Clear Selection</button>
                </div>
            </div>
            
            <div class="hk-live-summary hk-khata-summary">
                <div class="hk-khata-summary-title">${I18n.t('active_khata_summary')} <a href="#" style="float:right; font-size:0.8rem; color:var(--primary); text-decoration:none;" onclick="HisabKitaabPage.showTimeline('${loan.id}')">View Full Khata</a></div>
                <div class="hk-live-row"><span class="hk-live-label" data-i18n="net_principal">${I18n.t('net_principal')}</span><span class="hk-live-val">${_cur3(netGlobalPrin)}</span></div>
                <div class="hk-live-row"><span class="hk-live-label" data-i18n="interest_till_today">${I18n.t('interest_till_today')}</span><span class="hk-live-val" style="color:var(--monitor)">${netGlobalInt >= 0 ? '+' : ''} ${_cur3(netGlobalInt)}</span></div>
                <div class="hk-live-row hk-live-net"><span class="hk-live-label" data-i18n="final_payable">${I18n.t('final_payable')}</span><span class="hk-live-val">${_cur3(finalGlobalPayable)}</span></div>
            </div>
        </div>`;
    }

    // ── Selection Handler ─────────────────────────
    // Kept as a no-op stub for backward compat in case any old onclick calls exist.
    // Tithi mode is now controlled globally by the navbar moon icon.
    function toggleTithiMode() {}

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
            
            const dateStr = UI.formatDate(e.date);
            const row = `<div class="hk-select-row">
                <div class="hk-sel-left"><span class="hk-sel-label">${icon} ${label}</span><span class="hk-sel-date">${dateStr} → ${isHi ? 'आज' : 'Today'} (${_formatDuration(days)})</span></div>
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
        ov.innerHTML = `<div class="modal" style="max-width:420px;"><h3 class="modal-title">${title}</h3>${body}<div class="modal-actions"><button class="btn btn-outline" onclick="document.getElementById('hk-modal').remove()">${t.cancel}</button><button class="btn btn-gold" id="hk-modal-confirm-btn" onclick="${fn}">${t.confirm}</button></div></div>`;
        document.body.appendChild(ov);
        ov.onclick = e => { if (e.target === ov) ov.remove(); };
        // Wire Enter key: move to next input field; confirm only on last field or confirm button
        setTimeout(() => {
            const modal = document.querySelector('#hk-modal .modal');
            if (modal) {
                modal.addEventListener('keydown', e => {
                    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                        e.preventDefault();
                        const inputs = Array.from(modal.querySelectorAll('input:not([type=checkbox]), select'));
                        const idx = inputs.indexOf(e.target);
                        if (idx >= 0 && idx < inputs.length - 1) {
                            // Move to next field
                            inputs[idx + 1].focus();
                            if (inputs[idx + 1].type === 'number' || inputs[idx + 1].type === 'text') {
                                inputs[idx + 1].select();
                            }
                        } else {
                            // Last field or not in inputs — confirm
                            document.getElementById('hk-modal-confirm-btn')?.click();
                        }
                    }
                });
            }
        }, 50);
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
        const loanRate = parseFloat(loan.interestRate) || 0;
        const mr = _getMonthlyRate(loan);
        const today = new Date().toISOString().split('T')[0];
        const days = _calcDays(last ? last.date : today, today);
        const runInt = _calcInterest(savedBal, mr, days);
        const netPay = _p(savedBal + runInt);
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        // Store context for live recalculation
        HisabKitaabPage._payCtx = { lid, savedBal, days, loanPeriod: loan.interestPeriod || 'monthly' };
        _modal('💰 ' + t.receive_payment,
            `<div style="background:var(--bg-input);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:0.88rem;line-height:2.2;">
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)">${isHi ? 'पिछला बाकी' : 'Saved Balance'}</span><strong>${_cur3(savedBal)}</strong></div>
                <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)" id="hk-p-int-lbl">${isHi ? 'ब्याज (' + days + ' दिन)' : 'Interest (' + days + ' days)'}</span><strong style="color:var(--monitor)" id="hk-p-int-val">${_cur3(runInt)}</strong></div>
                <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border-light);padding-top:6px;margin-top:2px;"><span style="font-weight:700">${isHi ? 'कुल बाकी' : 'Net Payable'}</span><strong style="color:var(--safe);font-size:1.05rem;" id="hk-p-net-val">${_cur3(netPay)}</strong></div>
            </div>
            <div class="form-group mb-2"><label class="form-label">${t.date_label} *</label><input type="date" class="form-input" id="hk-p-dt" value="${today}" onchange="HisabKitaabPage.updatePayInterest('${lid}')"></div>
            <div class="form-group mb-2">
                <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>${isHi ? 'ब्याज दर (%)' : 'Interest Rate (%)'}</span>
                    <span style="font-size:0.72rem;color:var(--text-muted);font-weight:400;">${isHi ? 'दर बदलने पर ब्याज बदलेगा' : 'Change rate to recalculate'}</span>
                </label>
                <input type="number" class="form-input" id="hk-p-rate" min="0" step="0.01" value="${loanRate}" placeholder="e.g. 2" oninput="HisabKitaabPage._recalcJamaInterest()" style="border-color:var(--primary);">
            </div>
            <div class="form-group mb-2">
                <label class="form-label" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>${isHi ? 'ब्याज (₹)' : 'Interest (₹)'}</span>
                    <span style="font-size:0.75rem;color:var(--primary);font-weight:400;cursor:pointer;" onclick="HisabKitaabPage._recalcJamaInterest()">${isHi ? 'ऑटो भरें' : 'Auto-fill'}</span>
                </label>
                <input type="number" class="form-input" id="hk-p-int" min="0" step="0.01" value="${runInt.toFixed(2)}" placeholder="0.00" oninput="HisabKitaabPage._updateJamaNet()" style="border-color:var(--monitor);">
                <span style="font-size:0.72rem;color:var(--text-muted);margin-top:3px;display:block;">${isHi ? 'दर बदलें या सीधे राशि डालें' : 'Change rate above or enter amount directly'}</span>
            </div>
            <div class="form-group mb-2"><label class="form-label">${t.amount_label} *</label><input type="number" class="form-input" id="hk-p-amt" min="0" step="0.01" value="${netPay.toFixed(2)}" oninput="HisabKitaabPage._updateJamaNet()"></div>
            <div class="form-group mb-2"><label class="form-label">${isHi ? 'छूट (Discount)' : 'Discount (₹)'}</label><input type="number" class="form-input" id="hk-p-disc" min="0" step="0.01" placeholder="Optional"></div>
            <div class="form-group mb-3"><label class="form-label">${t.note_label}</label><input type="text" class="form-input" id="hk-p-nt" maxlength="200"></div>
            <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:0.9rem;cursor:pointer;padding:8px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);border-radius:8px;">
                <input type="checkbox" id="hk-p-settle" style="width:16px;height:16px;accent-color:var(--safe);">
                <span style="font-weight:600;color:var(--safe);">${isHi ? 'लोन बंद करें (Settle Loan)' : 'Settle Loan (Close Account)'}</span>
            </label>`,
            `HisabKitaabPage.doPay('${lid}')`);
    }
    function updatePayInterest(lid) {
        const loan = DB.getLoan(lid); if (!loan) return;
        _initHK(loan); const hk = loan.hisabKitaab;
        const last = hk[hk.length - 1]; const savedBal = last ? last.balance : 0;
        const userRate = parseFloat(document.getElementById('hk-p-rate')?.value);
        const rateToUse = (userRate > 0) ? userRate : (parseFloat(loan.interestRate) || 0);
        const mr = (loan.interestPeriod === 'yearly') ? rateToUse / 12 : rateToUse;
        const dt = document.getElementById('hk-p-dt')?.value || new Date().toISOString().split('T')[0];
        const days = _calcDays(last ? last.date : dt, dt);
        const runInt = _calcInterest(savedBal, mr, days);
        const netPay = _p(savedBal + runInt);
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        // Update context for recalc
        if (HisabKitaabPage._payCtx) { HisabKitaabPage._payCtx.days = days; }
        const lblEl = document.getElementById('hk-p-int-lbl');
        const intEl = document.getElementById('hk-p-int-val');
        const netEl = document.getElementById('hk-p-net-val');
        const amtEl = document.getElementById('hk-p-amt');
        const intInpEl = document.getElementById('hk-p-int');
        if (lblEl) lblEl.textContent = isHi ? 'ब्याज (' + days + ' दिन)' : 'Interest (' + days + ' days)';
        if (intEl) intEl.textContent = _cur3(runInt);
        if (netEl) netEl.textContent = _cur3(netPay);
        if (intInpEl) intInpEl.value = runInt.toFixed(2);
        if (amtEl) amtEl.value = netPay.toFixed(2);
    }
    // Recalculate interest when user changes rate %
    function _recalcJamaInterest() {
        const ctx = HisabKitaabPage._payCtx;
        if (!ctx) return;
        const userRate = parseFloat(document.getElementById('hk-p-rate')?.value) || 0;
        const mr = (ctx.loanPeriod === 'yearly') ? userRate / 12 : userRate;
        const loan = DB.getLoan(ctx.lid); if (!loan) return;
        _initHK(loan); const hk = loan.hisabKitaab; const last = hk[hk.length - 1];
        const dt = document.getElementById('hk-p-dt')?.value || new Date().toISOString().split('T')[0];
        const days = _calcDays(last ? last.date : dt, dt);
        const savedBal = last ? last.balance : 0;
        const runInt = _calcInterest(savedBal, mr, days);
        const netPay = _p(savedBal + runInt);
        const intInpEl = document.getElementById('hk-p-int');
        const amtEl = document.getElementById('hk-p-amt');
        const intEl = document.getElementById('hk-p-int-val');
        const netEl = document.getElementById('hk-p-net-val');
        if (intInpEl) intInpEl.value = runInt.toFixed(2);
        if (amtEl) amtEl.value = netPay.toFixed(2);
        if (intEl) intEl.textContent = _cur3(runInt);
        if (netEl) netEl.textContent = _cur3(netPay);
    }
    // Update Net Payable display when user manually edits Interest or Amount
    function _updateJamaNet() {
        const intVal = parseFloat(document.getElementById('hk-p-int')?.value) || 0;
        const ctx = HisabKitaabPage._payCtx;
        const amtEl  = document.getElementById('hk-p-amt');
        const netEl  = document.getElementById('hk-p-net-val');
        const intEl  = document.getElementById('hk-p-int-val');
        // Auto-update Amount = Saved Balance + Interest
        if (ctx && amtEl) {
            const newAmt = _p(ctx.savedBal + intVal);
            amtEl.value = newAmt.toFixed(2);
            if (netEl) netEl.textContent = _cur3(newAmt);
        } else {
            const amtVal = parseFloat(amtEl?.value) || 0;
            if (netEl) netEl.textContent = _cur3(amtVal);
        }
        if (intEl) intEl.textContent = _cur3(intVal);
    }
    function doPay(lid) {
        const amt      = parseFloat(document.getElementById('hk-p-amt')?.value);
        const intAmt   = parseFloat(document.getElementById('hk-p-int')?.value) || 0; // manual interest
        const discAmt  = parseFloat(document.getElementById('hk-p-disc')?.value) || 0;
        const dt       = document.getElementById('hk-p-dt')?.value;
        const nt       = document.getElementById('hk-p-nt')?.value?.trim() || '';
        const isSettle = document.getElementById('hk-p-settle')?.checked;
        if (!amt || amt <= 0) { UI.toast('Enter valid amount', 'error'); return; }
        if (!dt) { UI.toast('Select date', 'error'); return; }
        const loan = DB.getLoan(lid); if (!loan) return; _initHK(loan);

        // 1) Freeze manual interest as an interest entry if user entered it
        if (intAmt > 0) {
            _addEntry(loan, dt, 'interest', intAmt, (nt ? 'Manual interest | ' + nt : 'Manual interest'));
        }

        // Apply discount first if provided
        if (discAmt > 0) {
            _addEntry(loan, dt, 'discount', discAmt, (nt ? 'Discount with payment | ' + nt : 'Discount with payment'));
            loan.totalDiscount = (loan.totalDiscount || 0) + discAmt;
        }

        // Prepare note for payment/settle row to show the custom interest
        let payNote = nt;
        if (intAmt > 0) {
            payNote = payNote ? `${payNote} | (Cus Int: ₹${intAmt})` : `(Cus Int: ₹${intAmt})`;
        }

        if (isSettle) {
            _addEntry(loan, dt, 'settle', amt, payNote);
            loan.status = 'closed';
            loan.settlement = { date: new Date().toISOString(), totalAmount: loan.hisabKitaab[loan.hisabKitaab.length - 2]?.balance || 0, paidAmount: amt, discount: (loan.totalDiscount || 0), status: 'CLOSED' };
            
            _generateInterestGSTInvoice(loan, amt, dt);
            
            DB.saveLoan(loan);
            document.getElementById('hk-modal')?.remove();
            UI.toast('✅ Loan settled!', 'success');
        } else {
            _addEntry(loan, dt, 'payment', amt, payNote);
            
            _generateInterestGSTInvoice(loan, amt, dt);
            
            DB.saveLoan(loan);
            document.getElementById('hk-modal')?.remove();
            UI.toast('✅ Payment recorded!', 'success');
        }
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
        
        _generateInterestGSTInvoice(loan, amt, dt);
        
        DB.saveLoan(loan); document.getElementById('hk-modal')?.remove(); UI.toast('✅ Loan settled!', 'success'); render(document.getElementById('page-container'), lid);
    }

    // Expose internal helpers so loanDetail.js can use HK as single writer
    function addEntry(loan, actionDate, type, amount, note) {
        return _addEntry(loan, actionDate, type, amount, note);
    }
    function getMonthlyRate(loan) { return _getMonthlyRate(loan); }
    function calcDays(from, to)   { return _calcDays(from, to); }
    function calcInterest(principal, monthlyRate, days) { return _calcInterest(principal, monthlyRate, days); }
    function initHK(loan) { _initHK(loan); }

    // ── Settle Selected Entries ───────────────────────────────────────────────
    async function settleSelected(loanId) {
        try {
            const loan = DB.getLoan(loanId); if (!loan) return;
            _initHK(loan);
            const hk  = loan.hisabKitaab;
            const cbs = document.querySelectorAll('.hk-select-cb:checked');
            if (!cbs.length) { UI.toast('Select at least one entry first', 'warning'); return; }
            const today = new Date().toISOString().split('T')[0];
            const mr    = _getMonthlyRate(loan);
            const isHi  = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';

            let debitEntries = [];
            cbs.forEach(cb => {
                const idx = parseInt(cb.dataset.idx);
                const e   = hk[idx]; if (!e) return;
                const isDebit = (e.type === 'loan_given' || e.type === 'add_money');
                if (!isDebit) return;
                const days     = _calcDays(e.date, today);
                const amt      = e.principal || e.amount || 0;
                const interest = _calcInterest(amt, e.rate || mr, days);
                debitEntries.push({ idx, e, amt, interest, total: _p(amt + interest) });
            });

            if (!debitEntries.length) { UI.toast(isHi ? 'उधार एंट्री चुनें' : 'Select Udhar (Loan/Add Money) entries to settle', 'warning'); return; }

            const totalToSettle = _p(debitEntries.reduce((s, d) => s + d.total, 0));
            const confirmed = await UI.confirm(
                isHi ? 'चयनित एंट्री सेटल करें' : 'Settle Selected Entries',
                `${isHi ? 'कुल' : 'Total'}: ${_cur3(totalToSettle)}\n${debitEntries.length} ${isHi ? 'उधार एंट्री सेटल होंगी' : 'Udhar entries will be settled'}`
            );
            if (!confirmed) return;

            _addEntry(loan, today, 'settle', totalToSettle,
                `${isHi ? 'चयनित सेटलमेंट' : 'Selected entries settlement'} (${debitEntries.length} entries)`);

            // Close loan only if net balance reaches 0
            const remaining = _getRunningInterest(loan).balance;
            if (remaining <= 0.01) {
                loan.status = 'closed';
                loan.settlement = { date: new Date().toISOString(), totalAmount: totalToSettle, paidAmount: totalToSettle, discount: 0, status: 'CLOSED' };
            }

            _generateInterestGSTInvoice(loan, totalToSettle, today);

            DB.saveLoan(loan);
            UI.toast(isHi ? '✅ सेटलमेंट पूर्ण!' : '✅ Settlement completed!', 'success');
            render(document.getElementById('page-container'), loanId);
        } catch(err) { UI.toast('Error: ' + err.message, 'error'); }
    }

    // ── PIN-Protected Delete ──────────────────────────────────────────────────
    function showDeleteModal(loanId, idx) {
        try {
            const loan = DB.getLoan(loanId); if (!loan) return;
            const hk   = loan.hisabKitaab || [];
            const e    = hk[idx];
            if (!e) { UI.toast('Entry not found', 'error'); return; }

            const debitCount    = hk.filter(x => x.type === 'loan_given' || x.type === 'add_money').length;
            const isOriginalOnly = (e.type === 'loan_given' && debitCount === 1);
            document.getElementById('hk-modal')?.remove();
            const ov = document.createElement('div');
            ov.className = 'modal-overlay'; ov.id = 'hk-modal';
            const label = _typeLabel(e.type);
            const amt   = e.principal || e.paid || e.amount || 0;

            if (isOriginalOnly) {
                ov.innerHTML = `<div class="modal" style="max-width:380px;">
                    <h3 class="modal-title">⚠️ Cannot Delete</h3>
                    <p style="color:var(--text-secondary);font-size:0.88rem;">The original loan disbursement cannot be deleted here.<br>Use the <strong>Delete Loan</strong> button on the Loan Detail page to remove the entire loan.</p>
                    <div class="modal-actions"><button class="btn btn-outline" onclick="document.getElementById('hk-modal').remove()">OK</button></div>
                </div>`;
            } else {
                ov.innerHTML = `<div class="modal" style="max-width:380px;">
                    <h3 class="modal-title">🗑️ Delete Entry</h3>
                    <div style="background:var(--bg-input);border-radius:8px;padding:12px 14px;margin-bottom:14px;">
                        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:3px;">${label}</div>
                        <div style="font-weight:800;font-size:1rem;">${_cur3(amt)}</div>
                        <div style="font-size:0.77rem;color:var(--text-muted);">${UI.formatDate(e.date)}</div>
                    </div>
                    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:0.82rem;color:var(--danger);">⚠️ This cannot be undone. All balances will recalculate.</div>
                    <div class="form-group mb-3">
                        <label class="form-label">🔐 Enter PIN *</label>
                        <input type="password" class="form-input" id="hk-del-pin"
                            maxlength="4" inputmode="numeric" pattern="[0-9]*"
                            placeholder="••••" autocomplete="off"
                            oninput="this.value=this.value.replace(/\\D/g,'').slice(0,4)"
                            style="letter-spacing:0.5em;font-size:1.4rem;text-align:center;max-width:140px;margin:0 auto;display:block;">
                        <div id="hk-pin-err" style="color:var(--danger);font-size:0.8rem;text-align:center;margin-top:6px;display:none;">❌ Invalid PIN. Try again.</div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-outline" onclick="document.getElementById('hk-modal').remove()">Cancel</button>
                        <button class="btn btn-danger" onclick="HisabKitaabPage.processDelete('${loanId}', ${idx})">Delete Entry</button>
                    </div>
                </div>`;
            }
            document.body.appendChild(ov);
            ov.onclick = ev => { if (ev.target === ov) ov.remove(); };
            setTimeout(() => document.getElementById('hk-del-pin')?.focus(), 100);
        } catch(err) { UI.toast('Error: ' + err.message, 'error'); }
    }

    async function processDelete(loanId, idx) {
        try {
            const pin = (document.getElementById('hk-del-pin')?.value || '').trim();
            const pinErr = document.getElementById('hk-pin-err');
            if (!pin) { if (pinErr) { pinErr.textContent = '❌ Enter PIN first.'; pinErr.style.display = 'block'; } return; }
            if (!await DB.verifyPin(pin)) {
                if (pinErr) { pinErr.textContent = '❌ Invalid PIN. Try again.'; pinErr.style.display = 'block'; }
                const inp = document.getElementById('hk-del-pin');
                if (inp) { inp.value = ''; inp.focus(); }
                return;
            }
            const loan = DB.getLoan(loanId); if (!loan) return;
            _initHK(loan);
            const hk  = loan.hisabKitaab;
            const e   = hk[idx]; if (!e) { UI.toast('Entry not found', 'error'); return; }

            // Archive to delete log
            loan.hkDeleteLog = loan.hkDeleteLog || [];
            loan.hkDeleteLog.push({ entry: JSON.parse(JSON.stringify(e)), deletedAt: new Date().toISOString(), deletedByPin: true });

            // Remove entry and renumber
            hk.splice(idx, 1);
            hk.forEach((row, i) => { row.sr = i + 1; });

            DB.saveLoan(loan);
            document.getElementById('hk-modal')?.remove();
            UI.toast('✅ Entry deleted successfully', 'success');
            render(document.getElementById('page-container'), loanId);
        } catch(err) { UI.toast('Error: ' + err.message, 'error'); }
    }

    // ── GST Helper ────────────────────────────────────────────────────────────
    function _generateInterestGSTInvoice(loan, amountPaid, dateStr) {
        if (typeof GST === 'undefined' || !GST.isEnabled() || !GST.getSettings().taxableCharges.interest) return;
        
        // Calculate how much of the paid amount goes to interest
        const summary = calculateSummary(loan, dateStr);
        let interestCollected = 0;
        
        const totalDebit = summary.totalDebit;
        const totalInterest = summary.totalInterest;
        const totalCreditBeforeThis = summary.totalCredit - amountPaid;
        
        const unpaidInterest = Math.max(0, totalInterest - Math.max(0, totalCreditBeforeThis - totalDebit));
        interestCollected = Math.min(unpaidInterest, amountPaid);
        
        if (interestCollected > 0) {
            const customer = DB.getCustomer(loan.customerId);
            const customerState = customer?.stateCode || '';
            const customerGstin = customer?.gstin || '';
            
            const gstCalc = GST.calculateForCharge('interest', interestCollected, customerState);
            if (gstCalc.totalGst > 0) {
                GST.generateInvoice({
                    loanId: loan.id,
                    customerId: loan.customerId,
                    customerName: loan.customerName,
                    customerGstin: customerGstin,
                    customerState: customerState,
                    chargeType: 'interest',
                    description: `Interest Collection for Loan ${loan.id.substring(0,6)}`,
                    gstCalc: gstCalc
                });
            }
        }
    }

    return { render, showAddMoneyModal, doAdd, showPayModal, updatePayInterest, doPay, _updateJamaNet, _recalcJamaInterest,
             showDiscModal, doDisc, showSettleModal, doSettle, showTimeline, onSelect,
             toggleCard, toggleTithiMode,
             // Settlement & Secure Delete (new):
             settleSelected, showDeleteModal, processDelete,
             // Public API for single-source-of-truth delegation:
             addEntry, getMonthlyRate, calcDays, calcInterest, initHK,
             // Centralized calculation engine:
             calculateSummary, safeNumber, formatAmount,
             // Duration helper (shared with loanDetail.js):
             formatDuration: _formatDuration };
})();
