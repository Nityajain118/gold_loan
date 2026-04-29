/* ============================================
   Customer Ledger Page
   ============================================ */
const CustomerLedgerPage = (() => {
    let _currentCustomerId = null;

    function render(container, customerId) {
        const customer = DB.getCustomer(customerId);
        if (!customer) {
            container.innerHTML = '<div class="empty-state"><h3>Customer not found</h3><button class="btn btn-primary" onclick="UI.navigateTo(\'customers\')">← Back</button></div>';
            return;
        }

        // Loan matching: customerId (primary) + mobile fallback for legacy data. NO name fallback.
        const allLoans = DB.getLoans().filter(l =>
            l.customerId === customer.id ||
            (customer.mobile && customer.mobile.length === 10 && l.mobile === customer.mobile)
        );

        const settings = DB.getSettings();
        let totalOutstanding = 0, totalPrincipalLent = 0, activeLoansCount = 0, allPayments = [];

        allLoans.forEach(loan => {
            const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
            const d = Calculator.calcLoanDetails(loan, rate);
            if (loan.status !== 'closed') {
                totalOutstanding += d.totalPayable;
                totalPrincipalLent += d.remainingPrincipal;
                activeLoansCount++;
            }
            if (loan.paymentHistory && loan.paymentHistory.length > 0) {
                loan.paymentHistory.forEach(p => {
                    allPayments.push({ ...p, loanId: loan.id, metalType: loan.metalType, metalSubType: loan.metalSubType });
                });
            }
        });

        allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = `
            <button class="btn btn-ghost mb-2" onclick="UI.navigateTo('customers')">← Back to Customers</button>

            <div class="card mb-3" style="background:linear-gradient(135deg,var(--bg) 0%,rgba(246,211,101,0.05) 100%);">
                <div class="card-header pb-2" style="border-bottom:1px solid var(--border);">
                    <div>
                        <h2 class="card-title" style="font-size:1.6rem;">${customer.name}</h2>
                        <span class="text-muted">📱 ${customer.mobile || 'No Mobile'} | 🏠 ${customer.address || 'No Address'}</span>
                    </div>
                    <div class="flex gap-1 align-center">
                        <span class="status-badge active">${activeLoansCount} Active Loan${activeLoansCount !== 1 ? 's' : ''}</span>
                        <button class="btn btn-gold btn-sm" onclick="CustomerLedgerPage.openAddLoanModal('${customer.id}')"
                            style="display:flex;align-items:center;gap:5px;font-weight:700;">
                            <span style="font-size:1.2rem;line-height:1;">＋</span> New Loan
                        </button>
                    </div>
                </div>
                <div class="calc-grid mt-2">
                    <div class="calc-item"><div class="calc-item-label">Total Principal Lent (Active)</div><div class="calc-item-value">${UI.currency(totalPrincipalLent)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Total Outstanding Due</div><div class="calc-item-value" style="font-size:1.4rem;color:var(--danger);">${UI.currency(totalOutstanding)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Total Payments Made</div><div class="calc-item-value safe">${allPayments.length} records</div></div>
                </div>
            </div>

            <!-- Loan History -->
            <div class="card mb-3">
                <h3 class="card-title mb-2">📦 Loan History</h3>
                ${allLoans.length === 0 ? '<p class="text-muted">No loans found for this customer.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>Date</th><th>Metal &amp; Item</th><th>Value</th><th>Remaining</th><th>Total Payable</th><th>Status</th><th>Action</th>
                </tr></thead><tbody>
                ${allLoans.sort((a, b) => new Date(b.loanStartDate) - new Date(a.loanStartDate)).map(loan => {
                    const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
                    const d = Calculator.calcLoanDetails(loan, rate);
                    const itemLabel = _buildItemLabel(loan);
                    return `<tr>
                        <td>${UI.formatDate(loan.loanStartDate)}</td>
                        <td>${loan.metalType === 'gold' ? '🥇 Gold' : '🥈 Silver'} ${loan.metalSubType}${itemLabel}</td>
                        <td class="text-gold font-semibold">${UI.currency(d.metalValue)}</td>
                        <td>${loan.status === 'closed' ? '—' : UI.currency(d.remainingPrincipal)}</td>
                        <td class="font-semibold text-danger">${loan.status === 'closed' ? '—' : UI.currency(d.totalPayable)}</td>
                        <td><span class="status-badge ${loan.status}">${loan.status}</span></td>
                        <td><button class="btn btn-outline btn-xs" onclick="UI.navigateTo('loan-detail','${loan.id}')">View</button></td>
                    </tr>`;
                }).join('')}
                </tbody></table></div>`}
            </div>

            <!-- Payment Ledger -->
            <div class="card mb-2">
                <h3 class="card-title mb-2">📜 Combined Payment Ledger</h3>
                ${allPayments.length === 0 ? '<p class="text-muted">No payments recorded yet.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>Payment Date</th><th>Loan Focus</th><th>Paid Amount</th><th>Interest Deducted</th><th>Principal Reduced</th>
                </tr></thead><tbody>
                ${allPayments.map(p => `<tr>
                    <td>${UI.formatDate(p.date)}</td>
                    <td>${p.metalType === 'gold' ? '🥇' : '🥈'} ${p.metalSubType}</td>
                    <td class="text-gold font-semibold">${UI.currency(p.paidAmount)}</td>
                    <td>${UI.currency(p.interestDeducted)}</td>
                    <td>${UI.currency(p.principalReduced)}</td>
                </tr>`).join('')}
                </tbody></table></div>`}
            </div>

            <!-- Settlement History -->
            ${(customer.settlements && customer.settlements.length > 0) ? `
            <div class="card mb-2">
                <h3 class="card-title mb-2">🤝 Hisab / Settlement History</h3>
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>Date</th><th>Total Payable</th><th>Amount Paid</th><th>Discount / Adjusted</th><th>Status</th>
                </tr></thead><tbody>
                ${customer.settlements.sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => `<tr>
                    <td>${UI.formatDate(s.date)}</td>
                    <td class="font-semibold text-danger">${UI.currency(s.totalAmount)}</td>
                    <td class="text-gold font-semibold">${UI.currency(s.paidAmount)}</td>
                    <td>
                        ${s.discount > 0 ? `<span class="badge" style="background:rgba(99,102,241,0.1);color:var(--primary);">Discount: ${UI.currency(s.discount)}</span>` : ''}
                        ${s.adjustment > 0 ? `<span class="badge badge-neutral">Adjusted: ${UI.currency(s.adjustment)}</span>` : ''}
                        ${s.discount === 0 && s.adjustment === 0 ? '—' : ''}
                    </td>
                    <td><span class="status-badge closed">${s.status}</span></td>
                </tr>`).join('')}
                </tbody></table></div>
            </div>` : ''}
        `;
    }

    // Build "— Ring" / "— Ring, Chain" label from items array
    function _buildItemLabel(loan) {
        if (loan.items && loan.items.length > 0) {
            const types = [...new Set(loan.items.map(i => i.itemType).filter(Boolean))];
            if (types.length > 0) {
                return `<span style="color:var(--text-muted);font-size:0.82rem;"> — ${types.join(', ')}</span>`;
            }
        }
        return '';
    }

    // ── (+) New Loan Modal ────────────────────────────────────────────────────
    function openAddLoanModal(customerId) {
        const customer = DB.getCustomer(customerId);
        if (!customer) { UI.toast('Customer not found', 'error'); return; }
        _currentCustomerId = customerId;

        document.getElementById('add-loan-modal')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'add-loan-modal';
        overlay.style.cssText = 'align-items:flex-start;padding:16px;overflow-y:auto;';

        const settings = DB.getSettings();
        const ltvPct = settings.ltvPercentage || 75;
        const today = new Date().toISOString().split('T')[0];
        const lunarMonths = (typeof Tithi !== 'undefined' ? Tithi.LUNAR_MONTHS : []).map(m => `<option value="${m}">${m}</option>`).join('');
        const tithiNames = (typeof Tithi !== 'undefined' ? Tithi.TITHI_NAMES : []).map((t, i) => `<option value="${t}">${i + 1}. ${t}</option>`).join('');

        overlay.innerHTML = `
        <div class="modal card" style="max-width:740px;width:100%;padding:24px;margin:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border);">
                <h3 class="card-title" style="margin:0;">📝 New Loan — ${customer.name}</h3>
                <button class="btn btn-ghost btn-sm" onclick="document.getElementById('add-loan-modal').remove()">✕ Close</button>
            </div>

            <!-- Auto-filled customer info -->
            <div style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:20px;display:flex;gap:14px;align-items:flex-start;">
                ${customer.photo ? `<img src="${customer.photo}" style="height:60px;width:60px;border-radius:8px;object-fit:cover;flex-shrink:0;border:2px solid var(--border);">` : `<div style="height:60px;width:60px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;font-weight:700;flex-shrink:0;">${(customer.name||'?')[0].toUpperCase()}</div>`}
                <div style="flex:1;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">👤 Customer Details (Auto-filled)</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;font-size:0.88rem;">
                        <div><span style="color:var(--text-muted);">Name: </span><strong>${customer.name}</strong></div>
                        <div><span style="color:var(--text-muted);">Mobile: </span><strong>${customer.mobile || '—'}</strong></div>
                        <div><span style="color:var(--text-muted);">Address: </span><strong>${customer.address || '—'}</strong></div>
                        <div><span style="color:var(--text-muted);">Caste: </span><strong>${customer.caste || '—'}</strong></div>
                    </div>
                </div>
            </div>

            <form id="modal-loan-form" onsubmit="return false;">
                <h4 style="color:var(--primary);font-size:0.9rem;margin-bottom:8px;">🔒 Locker</h4>
                <div class="form-group mb-3">
                    <input type="text" class="form-input" id="nl-locker" placeholder="e.g., Locker A-12">
                </div>

                <h4 style="color:var(--primary);font-size:0.9rem;margin-bottom:8px;">💍 Jewelry Items</h4>
                <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:12px;">Add each jewelry item separately. Up to 10 items.</p>
                <div class="jewelry-items-list" id="nl-items-list"></div>
                <div class="flex gap-1 mt-1 mb-2">
                    <button type="button" class="btn btn-outline btn-sm" id="nl-add-item-btn" onclick="NewLoanPage.addItem()">➕ Add Another Item</button>
                </div>

                <div class="items-summary" id="nl-items-summary">
                    <div class="items-summary-item"><div class="items-summary-label">Total Items</div><div class="items-summary-value" id="nl-total-items">0</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Gold Items</div><div class="items-summary-value" id="nl-gold-items">0</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Silver Items</div><div class="items-summary-value" id="nl-silver-items">0</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Total Weight</div><div class="items-summary-value" id="nl-total-weight">0g</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Total Metal Value</div><div class="items-summary-value" id="nl-total-value">₹0</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Pure Gold Weight</div><div class="items-summary-value" id="nl-pure-gold-weight">0g</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Safe Loan (<span id="nl-ltv-label">${ltvPct}</span>% LTV)</div><div class="items-summary-value safe" id="nl-safe-loan">₹0</div></div>
                </div>

                <h4 style="color:var(--primary);font-size:0.9rem;margin:16px 0 10px;">💰 Loan Details</h4>
                <div class="form-grid mb-2">
                    ${UI.formGroup('Loan Amount (₹) *', '<input type="number" class="form-input" id="nl-amount" required placeholder="Enter loan amount" min="1" onkeydown="NewLoanPage.blockInvalidKey(event)" oninput="NewLoanPage.recalc()">')}
                    ${UI.formGroup('Interest Rate (%) *', '<input type="number" class="form-input" id="nl-rate" required placeholder="e.g., 2" step="0.01" min="0.01" onkeydown="NewLoanPage.blockInvalidKey(event)" oninput="NewLoanPage.recalc()">')}
                    ${UI.formGroup('Interest Period', `<div class="segment-control" id="nl-period-group"><button type="button" class="segment-btn active" data-value="monthly" onclick="NewLoanPage.setPeriod('monthly')">Monthly</button><button type="button" class="segment-btn" data-value="yearly" onclick="NewLoanPage.setPeriod('yearly')">Yearly</button></div>`)}
                    ${UI.formGroup('Interest Type', `<div class="segment-control" id="nl-type-group"><button type="button" class="segment-btn active" data-value="simple" onclick="NewLoanPage.setType('simple')">Simple</button><button type="button" class="segment-btn" data-value="compound" onclick="NewLoanPage.setType('compound')">Compound</button></div>`)}
                </div>
                <div class="form-group mb-2" id="nl-compound-freq-wrap" style="display:none;">
                    <label class="form-label">🔁 Compounding Frequency</label>
                    <div class="segment-control" id="nl-freq-group">
                        <button type="button" class="segment-btn active" data-value="12" onclick="NewLoanPage.setFreq(12)">Monthly</button>
                        <button type="button" class="segment-btn" data-value="4" onclick="NewLoanPage.setFreq(4)">Quarterly</button>
                        <button type="button" class="segment-btn" data-value="2" onclick="NewLoanPage.setFreq(2)">Half-Yearly</button>
                        <button type="button" class="segment-btn" data-value="1" onclick="NewLoanPage.setFreq(1)">Yearly</button>
                    </div>
                </div>
                <div class="form-grid mb-2">
                    ${UI.formGroup('Loan Start Date *', `
                        <input type="date" class="form-input" id="nl-start" value="${today}" onchange="NewLoanPage.recalc()" style="margin-bottom:8px;">
                        <div id="nl-tithi-container" style="display:none;padding:10px;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-input);">
                            <div id="nl-start-tithi" style="font-size:0.85rem;line-height:1.4;"></div>
                            <div class="toggle-group mt-2">
                                <label class="toggle"><input type="checkbox" id="nl-panchang-override" onchange="NewLoanPage.togglePanchang()"><span class="toggle-slider"></span></label>
                                <span class="toggle-label" style="font-size:0.8rem;font-weight:600;">Panchang Override</span>
                            </div>
                            <div id="nl-panchang-inputs" style="display:none;margin-top:8px;gap:6px;flex-direction:column;">
                                <input type="number" id="nl-manual-samvat" class="form-input form-sm" placeholder="Samvat Yr" oninput="NewLoanPage.recalc()">
                                <select id="nl-manual-month" class="form-select form-sm" onchange="NewLoanPage.recalc()">${lunarMonths}</select>
                                <div class="flex gap-1">
                                    <select id="nl-manual-paksha" class="form-select form-sm" style="flex:1" onchange="NewLoanPage.recalc()"><option value="Shukla">Shukla</option><option value="Krishna">Krishna</option></select>
                                    <select id="nl-manual-tithi" class="form-select form-sm" style="flex:2" onchange="NewLoanPage.recalc()">${tithiNames}</select>
                                </div>
                                <div class="flex gap-1 align-center mt-1">
                                    <select id="nl-manual-pakshatype" class="form-select form-sm" style="flex:1;" onchange="NewLoanPage.recalc()"><option value="Vidhi">Vidhi</option><option value="Sudhi">Sudhi</option></select>
                                    <button type="button" class="btn btn-gold btn-sm" style="flex:1;" onclick="NewLoanPage.saveOverride()">💾 Save Override</button>
                                </div>
                            </div>
                        </div>`)}
                    ${UI.formGroup('Loan Duration *', `<div class="form-row"><input type="number" class="form-input" id="nl-duration" required placeholder="12" min="1" value="12" onkeydown="NewLoanPage.blockInvalidKey(event)" oninput="NewLoanPage.recalc()" style="flex:1;"><span style="color:var(--text-muted);font-size:0.85rem;">months</span></div>`)}
                </div>

                <div class="calc-panel" id="nl-calc-panel">
                    <h4 style="font-size:0.9rem;margin-bottom:16px;color:var(--primary);">📊 Calculation Preview</h4>
                    <div class="calc-grid">
                        <div class="calc-item"><div class="calc-item-label">Total Interest</div><div class="calc-item-value" id="nl-calc-interest">₹0</div></div>
                        <div class="calc-item"><div class="calc-item-label">Total Payable</div><div class="calc-item-value" id="nl-calc-payable">₹0</div></div>
                        <div class="calc-item"><div class="calc-item-label">LTV</div><div class="calc-item-value" id="nl-calc-ltv">0%</div></div>
                        <div class="calc-item"><div class="calc-item-label">Maturity Date</div><div class="calc-item-value" id="nl-calc-maturity" style="font-size:0.95rem;">—</div></div>
                        <div class="calc-item"><div class="calc-item-label">Maturity Tithi</div><div class="calc-item-value" id="nl-calc-maturity-tithi" style="font-size:0.8rem;">—</div></div>
                        <div class="calc-item"><div class="calc-item-label">Effective Annual Rate</div><div class="calc-item-value" id="nl-calc-ear">0%</div></div>
                        <div class="calc-item"><div class="calc-item-label">Break-even Price</div><div class="calc-item-value" id="nl-calc-breakeven">₹0/g</div></div>
                        <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value" id="nl-calc-pl">₹0</div></div>
                    </div>
                </div>
                <div id="nl-risk-panel"></div>
            </form>

            <div style="margin-top:16px;display:flex;gap:10px;">
                <button class="btn btn-gold btn-lg" style="flex:1;" onclick="CustomerLedgerPage.saveNewLoanForCustomer('${customer.id}')">💾 Save Loan</button>
                <button class="btn btn-outline" onclick="document.getElementById('add-loan-modal').remove()">Cancel</button>
            </div>
        </div>`;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        // Boot NewLoanPage state into the modal's form
        NewLoanPage._state.items = [{ metalType: 'gold', purity: '22K', customPurity: '', itemType: 'Ring', customItemType: '', weightGrams: '' }];
        NewLoanPage._state.interestPeriod = 'monthly';
        NewLoanPage._state.interestType = 'simple';
        NewLoanPage._state.compoundingFrequency = 12;
        NewLoanPage._state.isManualTithi = false;
        NewLoanPage._state.currentTithiInfo = null;

        // Trigger item render (uses #nl-items-list which now exists in modal)
        // Calling addItem then removeItem forces renderItems() to run
        NewLoanPage.addItem();
        NewLoanPage.removeItem(1);
    }

    // Save new loan linked to existing customer (no new customer created)
    function saveNewLoanForCustomer(customerId) {
        const customer = DB.getCustomer(customerId);
        if (!customer) { UI.toast('Customer not found', 'error'); return; }

        const amount = parseFloat(document.getElementById('nl-amount')?.value);
        const rate   = parseFloat(document.getElementById('nl-rate')?.value);
        const duration = parseInt(document.getElementById('nl-duration')?.value) || 12;
        const startDate = document.getElementById('nl-start')?.value;
        const locker = document.getElementById('nl-locker')?.value.trim() || '';

        // Validate
        const validItems = NewLoanPage._state.items.filter(i => parseFloat(i.weightGrams) > 0);
        if (validItems.length === 0) { UI.toast('Add at least one jewelry item with weight', 'error'); return; }
        for (let idx = 0; idx < validItems.length; idx++) {
            const it = validItems[idx];
            if (it.purity === 'custom') {
                const cp = parseFloat(it.customPurity);
                if (!cp || cp <= 0 || cp > 100) { UI.toast(`Item #${idx + 1}: Enter a valid custom purity (1–100%)`, 'error'); return; }
            }
            if (it.itemType === 'Other' && !it.customItemType?.trim()) {
                UI.toast(`Item #${idx + 1}: Please enter the custom item name`, 'error'); return;
            }
        }
        if (!amount || amount <= 0) { UI.toast('Please enter valid loan amount', 'error'); return; }
        if (!rate   || rate   <= 0) { UI.toast('Please enter valid interest rate', 'error'); return; }
        if (!startDate)              { UI.toast('Please select start date', 'error'); return; }

        const rates = Market.getCurrentRates();
        const items = validItems.map((vi, idx) => ({
            itemType: vi.itemType === 'Other' && vi.customItemType ? vi.customItemType : vi.itemType, metalType: vi.metalType, purity: vi.purity,
            customPurity: vi.purity === 'custom' ? parseFloat(vi.customPurity) : null,
            weightGrams: parseFloat(vi.weightGrams),
            photo: ImageUpload.getImageData('nl-item-photo-' + NewLoanPage._state.items.indexOf(vi)) || ''
        }));

        let totalGoldWeight = 0, totalSilverWeight = 0, goldItems = 0, silverItems = 0;
        items.forEach(i => {
            if (i.metalType === 'gold') { totalGoldWeight += i.weightGrams; goldItems++; }
            else { totalSilverWeight += i.weightGrams; silverItems++; }
        });

        const dominantMetal  = goldItems >= silverItems ? 'gold' : 'silver';
        const dominantPurity = items.find(i => i.metalType === dominantMetal)?.purity || '22K';

        const loan = {
            customerId:   customer.id,
            customerName: customer.name,
            mobile:       customer.mobile || '',
            address:      customer.address || '',
            caste:        customer.caste || '',
            lockerName:   locker,
            metalType:    dominantMetal,
            metalSubType: dominantPurity,
            weightGrams:  totalGoldWeight + totalSilverWeight,
            items,
            loanAmount:   amount,
            interestRate: rate,
            interestPeriod:        NewLoanPage._state.interestPeriod,
            interestType:          NewLoanPage._state.interestType,
            compoundingFrequency:  NewLoanPage._state.compoundingFrequency,
            timeMode:              DB.getSettings().timeMode || 'normal',
            tithiInfo:             NewLoanPage._state.currentTithiInfo || null,
            isManualTithi:         NewLoanPage._state.isManualTithi,
            loanStartDate:  startDate,
            loanDuration:   duration,
            historicalMarketRate: null, useHistoricalRate: false,
            paidInterest: 0, partialRepayment: 0, manualPenalty: 0,
            isMigrated: false, status: 'active',
            customerPhoto:           customer.photo || '',
            marketRateAtCreation:    dominantMetal === 'gold' ? rates.gold : rates.silver
        };

        // Update customer loan count (no merging, customer already exists)
        customer.totalLoans = (customer.totalLoans || 0) + 1;
        DB.saveCustomer(customer);

        DB.saveLoan(loan);
        document.getElementById('add-loan-modal')?.remove();
        UI.toast('✅ New loan added successfully!', 'success');

        // Re-render ledger
        render(document.getElementById('page-container'), customerId);
    }

    return { render, openAddLoanModal, saveNewLoanForCustomer };
})();
