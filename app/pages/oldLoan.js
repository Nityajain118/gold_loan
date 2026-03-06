/* ============================================
   Old Loan Entry Page — Multi-Item Jewelry
   ============================================ */
const OldLoanPage = (() => {
    let _state = {
        interestPeriod: 'monthly', interestType: 'simple',
        useHistoricalRate: false, autoCalcMaturity: true, items: []
    };
    const MAX_ITEMS = 10;

    function render(container) {
        _state.items = [defaultItem()];

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">🕰️ Add Old Loan Entry</h3>
                    <span class="status-badge migrated">Migrated Loan</span>
                </div>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-bottom:20px;">Migrate existing physical records. Past dates are allowed.</p>
                <form id="old-loan-form" onsubmit="return false;">
                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;">👤 Customer Information</h4>
                    <div class="form-grid mb-3">
                        ${UI.formGroup('Customer Name *', '<input type="text" class="form-input" id="ol-customer" required placeholder="Customer name">')}
                        ${UI.formGroup('Mobile Number', '<input type="tel" class="form-input" id="ol-mobile" placeholder="Mobile" maxlength="10">')}
                        ${UI.formGroup('Locker Name', '<input type="text" class="form-input" id="ol-locker" placeholder="e.g., Locker B-05">')}
                    </div>

                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;">💍 Jewelry Items (up to ${MAX_ITEMS})</h4>
                    <div class="jewelry-items-list" id="ol-items-list"></div>
                    <div class="flex gap-1 mt-1 mb-2">
                        <button type="button" class="btn btn-outline btn-sm" id="ol-add-item-btn" onclick="OldLoanPage.addItem()">➕ Add Item</button>
                    </div>
                    <div class="items-summary" id="ol-items-summary">
                        <div class="items-summary-item"><div class="items-summary-label">Total Items</div><div class="items-summary-value" id="ol-total-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Gold</div><div class="items-summary-value" id="ol-gold-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Silver</div><div class="items-summary-value" id="ol-silver-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Total Weight</div><div class="items-summary-value" id="ol-total-weight">0g</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Total Value</div><div class="items-summary-value" id="ol-total-value">₹0</div></div>
                    </div>

                    <h4 class="mb-1 mt-3" style="color:var(--primary);font-size:0.9rem;">💰 Loan Details</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup('Loan Amount (₹) *', '<input type="number" class="form-input" id="ol-amount" required placeholder="Loan amount" min="1" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Interest Rate (%) *', '<input type="number" class="form-input" id="ol-rate" required placeholder="e.g., 2" step="0.1" min="0.1" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Interest Period', `<div class="segment-control" id="ol-period-group">
                            <button type="button" class="segment-btn active" data-value="monthly" onclick="OldLoanPage.setPeriod('monthly')">Monthly</button>
                            <button type="button" class="segment-btn" data-value="yearly" onclick="OldLoanPage.setPeriod('yearly')">Yearly</button>
                        </div>`)}
                        ${UI.formGroup('Interest Type', `<div class="segment-control" id="ol-type-group">
                            <button type="button" class="segment-btn active" data-value="simple" onclick="OldLoanPage.setType('simple')">Simple</button>
                            <button type="button" class="segment-btn" data-value="compound" onclick="OldLoanPage.setType('compound')">Compound</button>
                        </div>`)}
                    </div>

                    <h4 class="mb-1 mt-3" style="color:var(--monitor);font-size:0.9rem;">🕰️ Backdated Entry Fields</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup('Loan Start Date (Past) *', '<input type="date" class="form-input" id="ol-start" required onchange="OldLoanPage.recalc()">', 'Original loan start date')}
                        ${UI.formGroup('Loan Duration', `<div class="form-row"><input type="number" class="form-input" id="ol-duration" placeholder="12" min="1" value="12" oninput="OldLoanPage.recalc()" style="flex:1;"><span style="color:var(--text-muted);font-size:0.85rem;">months</span></div>`)}
                        ${UI.formGroup('Historical Rate (₹/g)', '<input type="number" class="form-input" id="ol-historical-rate" placeholder="Optional" step="1" min="0">')}
                        ${UI.formGroup('Paid Interest (₹)', '<input type="number" class="form-input" id="ol-paid-interest" placeholder="0" min="0" value="0" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Partial Repayment (₹)', '<input type="number" class="form-input" id="ol-partial" placeholder="0" min="0" value="0" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Penalty (₹)', '<input type="number" class="form-input" id="ol-penalty" placeholder="0" min="0" value="0" oninput="OldLoanPage.recalc()">')}
                    </div>
                    <div class="card" style="background:var(--bg-input);margin-bottom:16px;padding:16px;">
                        <div class="toggle-group">
                            <label class="toggle"><input type="checkbox" id="ol-use-historical" onchange="OldLoanPage.toggleHistorical()"><span class="toggle-slider"></span></label>
                            <span class="toggle-label">Use historical rate for risk calc</span>
                        </div>
                    </div>
                    <div class="form-grid mb-2">
                        ${UI.formGroup('Loan Status', `<select class="form-select" id="ol-status">
                            <option value="active">🟢 Active</option><option value="migrated">🔵 Migrated</option><option value="closed">⚫ Closed</option>
                        </select>`)}
                    </div>
                    <div class="calc-panel">
                        <h4 style="font-size:0.9rem;margin-bottom:16px;color:var(--primary);">📊 Accumulated Calculation</h4>
                        <div class="calc-grid">
                            <div class="calc-item"><div class="calc-item-label">Accumulated Interest</div><div class="calc-item-value" id="ol-calc-interest">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label">Remaining Interest</div><div class="calc-item-value" id="ol-calc-remaining">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label">Total Payable</div><div class="calc-item-value" id="ol-calc-payable">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label">Months Elapsed</div><div class="calc-item-value" id="ol-calc-months">0</div></div>
                            <div class="calc-item"><div class="calc-item-label">LTV</div><div class="calc-item-value" id="ol-calc-ltv">0%</div></div>
                            <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value" id="ol-calc-pl">₹0</div></div>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button type="button" class="btn btn-gold btn-lg" onclick="OldLoanPage.save()">💾 Save Old Loan</button>
                    </div>
                </form>
            </div>`;
        renderItems();
    }

    function defaultItem() { return { metalType: 'gold', purity: '22K', itemType: 'Ring', weightGrams: '' }; }

    function renderItems() {
        const list = document.getElementById('ol-items-list');
        if (!list) return;
        const rates = Market.getCurrentRates();
        list.innerHTML = _state.items.map((item, i) => {
            const types = Calculator.getJewelryTypes(item.metalType);
            const purities = Calculator.getMetalSubTypes(item.metalType);
            const w = parseFloat(item.weightGrams) || 0;
            const rate = item.metalType === 'gold' ? rates.gold : rates.silver;
            const val = Calculator.calcMetalValue(w, item.purity, rate);
            return `<div class="jewelry-item">
                <div class="jewelry-item-header">
                    <span class="jewelry-item-num">${item.metalType === 'gold' ? '🥇' : '🥈'} Item #${i + 1}</span>
                    ${_state.items.length > 1 ? `<button type="button" class="jewelry-item-remove" onclick="OldLoanPage.removeItem(${i})">✕</button>` : ''}
                </div>
                <div class="form-grid">
                    <div class="form-group"><label class="form-label">Metal</label>
                        <select class="form-select" onchange="OldLoanPage.updateItem(${i},'metalType',this.value)">
                            <option value="gold" ${item.metalType === 'gold' ? 'selected' : ''}>🥇 Gold</option>
                            <option value="silver" ${item.metalType === 'silver' ? 'selected' : ''}>🥈 Silver</option>
                        </select></div>
                    <div class="form-group"><label class="form-label">Item Type</label>
                        <select class="form-select" onchange="OldLoanPage.updateItem(${i},'itemType',this.value)">
                            ${types.map(t => `<option value="${t}" ${item.itemType === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select></div>
                    <div class="form-group"><label class="form-label">Purity</label>
                        <select class="form-select" onchange="OldLoanPage.updateItem(${i},'purity',this.value)">
                            ${purities.map(p => `<option value="${p}" ${item.purity === p ? 'selected' : ''}>${p} (${(Calculator.getPurityFactor(p) * 100).toFixed(1)}%)</option>`).join('')}
                        </select></div>
                    <div class="form-group"><label class="form-label">Weight (g)</label>
                        <input type="number" class="form-input" value="${item.weightGrams}" step="0.01" min="0.01" placeholder="0.00"
                            oninput="OldLoanPage.updateItem(${i},'weightGrams',this.value)"></div>
                </div>
                ${w > 0 ? `<div class="jewelry-item-value">Value: ${UI.currency(val)}</div>` : ''}
            </div>`;
        }).join('');
        updateSummary();
        const btn = document.getElementById('ol-add-item-btn');
        if (btn) btn.style.display = _state.items.length >= MAX_ITEMS ? 'none' : '';
    }

    function addItem() { if (_state.items.length >= MAX_ITEMS) return; _state.items.push(defaultItem()); renderItems(); }
    function removeItem(i) { _state.items.splice(i, 1); renderItems(); }
    function updateItem(i, f, v) {
        _state.items[i][f] = v;
        if (f === 'metalType') { _state.items[i].itemType = Calculator.getJewelryTypes(v)[0]; _state.items[i].purity = Calculator.getMetalSubTypes(v)[v === 'gold' ? 1 : 0]; }
        renderItems(); recalc();
    }
    function updateSummary() {
        const rates = Market.getCurrentRates();
        const items = _state.items.map(i => ({ ...i, weightGrams: parseFloat(i.weightGrams) || 0 }));
        const s = Calculator.calcItemsMetalValue(items, rates.gold, rates.silver);
        const el = id => document.getElementById(id);
        if (el('ol-total-items')) el('ol-total-items').textContent = s.totalItems;
        if (el('ol-gold-items')) el('ol-gold-items').textContent = s.goldItems;
        if (el('ol-silver-items')) el('ol-silver-items').textContent = s.silverItems;
        if (el('ol-total-weight')) el('ol-total-weight').textContent = (s.totalGoldWeight + s.totalSilverWeight).toFixed(2) + 'g';
        if (el('ol-total-value')) el('ol-total-value').textContent = UI.currency(s.totalValue);
        recalc();
    }

    function setPeriod(p) { _state.interestPeriod = p; document.getElementById('ol-period-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === p)); recalc(); }
    function setType(t) { _state.interestType = t; document.getElementById('ol-type-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === t)); recalc(); }
    function toggleHistorical() { _state.useHistoricalRate = document.getElementById('ol-use-historical').checked; recalc(); }

    function recalc() {
        const amount = parseFloat(document.getElementById('ol-amount')?.value) || 0;
        const rate = parseFloat(document.getElementById('ol-rate')?.value) || 0;
        const startDate = document.getElementById('ol-start')?.value;
        const paidInterest = parseFloat(document.getElementById('ol-paid-interest')?.value) || 0;
        const partial = parseFloat(document.getElementById('ol-partial')?.value) || 0;
        const penalty = parseFloat(document.getElementById('ol-penalty')?.value) || 0;
        if (!startDate || !amount || !rate) return;

        const rates = Market.getCurrentRates();
        const items = _state.items.map(i => ({ ...i, weightGrams: parseFloat(i.weightGrams) || 0 }));
        const s = Calculator.calcItemsMetalValue(items, rates.gold, rates.silver);
        const metalValue = s.totalValue;

        const start = new Date(startDate), now = new Date();
        const monthsElapsed = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
        const annualRate = Calculator.toAnnualRate(rate, _state.interestPeriod);
        const totalInterest = _state.interestType === 'compound' ? Calculator.calcCompoundInterest(amount, annualRate, monthsElapsed) : Calculator.calcSimpleInterest(amount, annualRate, monthsElapsed);
        const remInt = Math.max(0, totalInterest - paidInterest);
        const remPrin = Math.max(0, amount - partial);
        const totalPayable = remPrin + remInt + penalty;
        const ltv = metalValue > 0 ? (amount / metalValue) * 100 : 0;
        const pl = metalValue - totalPayable;

        const el = id => document.getElementById(id);
        if (el('ol-calc-interest')) el('ol-calc-interest').textContent = UI.currency(totalInterest);
        if (el('ol-calc-remaining')) el('ol-calc-remaining').textContent = UI.currency(remInt);
        if (el('ol-calc-payable')) el('ol-calc-payable').textContent = UI.currency(totalPayable);
        if (el('ol-calc-months')) el('ol-calc-months').textContent = monthsElapsed;
        const ltvEl = el('ol-calc-ltv');
        if (ltvEl) { ltvEl.textContent = UI.pct(ltv); ltvEl.className = 'calc-item-value ' + (ltv > 80 ? 'danger' : ltv > 60 ? 'monitor' : 'safe'); }
        const plEl = el('ol-calc-pl');
        if (plEl) { plEl.textContent = UI.currency(pl); plEl.className = 'calc-item-value ' + (pl >= 0 ? 'safe' : 'danger'); }
    }

    function save() {
        const customer = document.getElementById('ol-customer').value.trim();
        const mobile = document.getElementById('ol-mobile').value.trim();
        const amount = parseFloat(document.getElementById('ol-amount').value);
        const rate = parseFloat(document.getElementById('ol-rate').value);
        const startDate = document.getElementById('ol-start').value;
        const duration = parseInt(document.getElementById('ol-duration').value) || 12;
        const locker = document.getElementById('ol-locker').value.trim();
        const historicalRate = parseFloat(document.getElementById('ol-historical-rate').value) || null;
        const paidInterest = parseFloat(document.getElementById('ol-paid-interest').value) || 0;
        const partial = parseFloat(document.getElementById('ol-partial').value) || 0;
        const penalty = parseFloat(document.getElementById('ol-penalty').value) || 0;
        const status = document.getElementById('ol-status').value;

        if (!customer) { UI.toast('Enter customer name', 'error'); return; }
        const validItems = _state.items.filter(i => parseFloat(i.weightGrams) > 0);
        if (!validItems.length) { UI.toast('Add at least one item with weight', 'error'); return; }
        if (!amount || amount <= 0) { UI.toast('Enter valid loan amount', 'error'); return; }
        if (!rate || rate <= 0) { UI.toast('Enter valid rate', 'error'); return; }
        if (!startDate) { UI.toast('Enter start date', 'error'); return; }

        const rates = Market.getCurrentRates();
        const items = validItems.map(i => ({ itemType: i.itemType, metalType: i.metalType, purity: i.purity, weightGrams: parseFloat(i.weightGrams) }));
        const s = Calculator.calcItemsMetalValue(items, rates.gold, rates.silver);
        const dom = s.goldItems >= s.silverItems ? 'gold' : 'silver';

        const loan = {
            customerName: customer, mobile, lockerName: locker,
            metalType: dom, metalSubType: items.find(i => i.metalType === dom)?.purity || '22K',
            weightGrams: s.totalGoldWeight + s.totalSilverWeight, items,
            loanAmount: amount, interestRate: rate,
            interestPeriod: _state.interestPeriod, interestType: _state.interestType,
            loanStartDate: startDate, loanDuration: duration,
            historicalMarketRate: historicalRate, useHistoricalRate: _state.useHistoricalRate,
            paidInterest, partialRepayment: partial, manualPenalty: penalty,
            isMigrated: true, status,
            marketRateAtCreation: historicalRate || Market.getRate(dom)
        };

        const customers = DB.getCustomers();
        let existing = customers.find(c => c.name.toLowerCase() === customer.toLowerCase() || (mobile && c.mobile === mobile));
        if (!existing) DB.saveCustomer({ name: customer, mobile, address: '', totalLoans: 1 });
        else { existing.totalLoans = (existing.totalLoans || 0) + 1; DB.saveCustomer(existing); }

        DB.saveLoan(loan);
        UI.toast('Old loan migrated!', 'success');
        UI.navigateTo('loans');
    }

    return { render, addItem, removeItem, updateItem, setPeriod, setType, toggleHistorical, recalc, save };
})();
