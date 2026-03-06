/* ============================================
   New Loan Page — Multi-Item Jewelry Support
   ============================================ */
const NewLoanPage = (() => {
    let _state = { interestPeriod: 'monthly', interestType: 'simple', items: [] };
    const MAX_ITEMS = 10;

    function render(container) {
        const settings = DB.getSettings();
        _state.items = [defaultItem()];

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📝 Create New Loan</h3>
                    <span class="status-badge active">New Loan</span>
                </div>
                <form id="new-loan-form" onsubmit="return false;">
                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;">👤 Customer Information</h4>
                    <div class="form-grid mb-3">
                        ${UI.formGroup('Customer Name *', '<input type="text" class="form-input" id="nl-customer" required placeholder="Enter customer name">')}
                        ${UI.formGroup('Mobile Number', '<input type="tel" class="form-input" id="nl-mobile" placeholder="Mobile number" maxlength="10">')}
                        ${UI.formGroup('Locker Name', '<input type="text" class="form-input" id="nl-locker" placeholder="e.g., Locker A-12">')}
                    </div>

                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;">💍 Jewelry Items (up to ${MAX_ITEMS})</h4>
                    <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:12px;">Add each jewelry item separately. One person can pledge up to ${MAX_ITEMS} items.</p>
                    <div class="jewelry-items-list" id="nl-items-list"></div>
                    <div class="flex gap-1 mt-1 mb-2">
                        <button type="button" class="btn btn-outline btn-sm" id="nl-add-item-btn" onclick="NewLoanPage.addItem()">➕ Add Another Item</button>
                    </div>

                    <!-- Items Summary -->
                    <div class="items-summary" id="nl-items-summary">
                        <div class="items-summary-item"><div class="items-summary-label">Total Items</div><div class="items-summary-value" id="nl-total-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Gold Items</div><div class="items-summary-value" id="nl-gold-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Silver Items</div><div class="items-summary-value" id="nl-silver-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Total Weight</div><div class="items-summary-value" id="nl-total-weight">0g</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Total Metal Value</div><div class="items-summary-value" id="nl-total-value">₹0</div></div>
                    </div>

                    <h4 class="mb-1 mt-3" style="color:var(--primary);font-size:0.9rem;">💰 Loan Details</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup('Loan Amount (₹) *', '<input type="number" class="form-input" id="nl-amount" required placeholder="Enter loan amount" min="1" oninput="NewLoanPage.recalc()">')}
                        ${UI.formGroup('Interest Rate (%) *', '<input type="number" class="form-input" id="nl-rate" required placeholder="e.g., 2" step="0.1" min="0.1" oninput="NewLoanPage.recalc()">')}
                        ${UI.formGroup('Interest Period', `
                            <div class="segment-control" id="nl-period-group">
                                <button type="button" class="segment-btn active" data-value="monthly" onclick="NewLoanPage.setPeriod('monthly')">Monthly</button>
                                <button type="button" class="segment-btn" data-value="yearly" onclick="NewLoanPage.setPeriod('yearly')">Yearly</button>
                            </div>`)}
                        ${UI.formGroup('Interest Type', `
                            <div class="segment-control" id="nl-type-group">
                                <button type="button" class="segment-btn active" data-value="simple" onclick="NewLoanPage.setType('simple')">Simple</button>
                                <button type="button" class="segment-btn" data-value="compound" onclick="NewLoanPage.setType('compound')">Compound</button>
                            </div>`)}
                        ${UI.formGroup('Loan Start Date *', `<input type="date" class="form-input" id="nl-start" value="${new Date().toISOString().split('T')[0]}" onchange="NewLoanPage.recalc()">`)}
                        ${UI.formGroup('Loan Duration *', `<div class="form-row"><input type="number" class="form-input" id="nl-duration" required placeholder="12" min="1" value="12" oninput="NewLoanPage.recalc()" style="flex:1;"><span style="color:var(--text-muted);font-size:0.85rem;">months</span></div>`)}
                    </div>

                    <div class="calc-panel" id="nl-calc-panel">
                        <h4 style="font-size:0.9rem;margin-bottom:16px;color:var(--primary);">📊 Calculation Preview</h4>
                        <div class="calc-grid">
                            <div class="calc-item"><div class="calc-item-label">Total Interest</div><div class="calc-item-value" id="nl-calc-interest">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label">Total Payable</div><div class="calc-item-value" id="nl-calc-payable">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label">LTV</div><div class="calc-item-value" id="nl-calc-ltv">0%</div></div>
                            <div class="calc-item"><div class="calc-item-label">Maturity Date</div><div class="calc-item-value" id="nl-calc-maturity" style="font-size:0.95rem;">—</div></div>
                            <div class="calc-item"><div class="calc-item-label">Break-even Price</div><div class="calc-item-value" id="nl-calc-breakeven">₹0/g</div></div>
                            <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value" id="nl-calc-pl">₹0</div></div>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button type="button" class="btn btn-gold btn-lg" onclick="NewLoanPage.save()">💾 Save Loan</button>
                    </div>
                </form>
            </div>`;

        renderItems();
    }

    function defaultItem() {
        return { metalType: 'gold', purity: '22K', itemType: 'Ring', weightGrams: '' };
    }

    function renderItems() {
        const list = document.getElementById('nl-items-list');
        if (!list) return;
        const rates = Market.getCurrentRates();

        list.innerHTML = _state.items.map((item, i) => {
            const types = Calculator.getJewelryTypes(item.metalType);
            const purities = Calculator.getMetalSubTypes(item.metalType);
            const weight = parseFloat(item.weightGrams) || 0;
            const rate = item.metalType === 'gold' ? rates.gold : rates.silver;
            const val = Calculator.calcMetalValue(weight, item.purity, rate);

            return `<div class="jewelry-item">
                <div class="jewelry-item-header">
                    <span class="jewelry-item-num">${item.metalType === 'gold' ? '🥇' : '🥈'} Item #${i + 1}</span>
                    ${_state.items.length > 1 ? `<button type="button" class="jewelry-item-remove" onclick="NewLoanPage.removeItem(${i})">✕</button>` : ''}
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Metal</label>
                        <select class="form-select" onchange="NewLoanPage.updateItem(${i},'metalType',this.value)">
                            <option value="gold" ${item.metalType === 'gold' ? 'selected' : ''}>🥇 Gold</option>
                            <option value="silver" ${item.metalType === 'silver' ? 'selected' : ''}>🥈 Silver</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Item Type</label>
                        <select class="form-select" onchange="NewLoanPage.updateItem(${i},'itemType',this.value)">
                            ${types.map(t => `<option value="${t}" ${item.itemType === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Purity</label>
                        <select class="form-select" onchange="NewLoanPage.updateItem(${i},'purity',this.value)">
                            ${purities.map(p => {
                const pct = (Calculator.getPurityFactor(p) * 100).toFixed(1);
                return `<option value="${p}" ${item.purity === p ? 'selected' : ''}>${p} (${pct}%)</option>`;
            }).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Weight (g)</label>
                        <input type="number" class="form-input" value="${item.weightGrams}" step="0.01" min="0.01" placeholder="0.00"
                            oninput="NewLoanPage.updateItem(${i},'weightGrams',this.value)">
                    </div>
                </div>
                ${weight > 0 ? `<div class="jewelry-item-value">Value: ${UI.currency(val)} (@ ₹${rate.toLocaleString('en-IN')}/g)</div>` : ''}
            </div>`;
        }).join('');

        updateSummary();
        const btn = document.getElementById('nl-add-item-btn');
        if (btn) btn.style.display = _state.items.length >= MAX_ITEMS ? 'none' : '';
    }

    function addItem() {
        if (_state.items.length >= MAX_ITEMS) { UI.toast(`Maximum ${MAX_ITEMS} items allowed`, 'warning'); return; }
        _state.items.push(defaultItem());
        renderItems();
    }

    function removeItem(index) {
        _state.items.splice(index, 1);
        renderItems();
    }

    function updateItem(index, field, value) {
        _state.items[index][field] = field === 'weightGrams' ? value : value;
        if (field === 'metalType') {
            const types = Calculator.getJewelryTypes(value);
            const purities = Calculator.getMetalSubTypes(value);
            _state.items[index].itemType = types[0];
            _state.items[index].purity = purities[value === 'gold' ? 1 : 0];
        }
        renderItems();
        recalc();
    }

    function updateSummary() {
        const rates = Market.getCurrentRates();
        const items = _state.items.map(i => ({ ...i, weightGrams: parseFloat(i.weightGrams) || 0 }));
        const s = Calculator.calcItemsMetalValue(items, rates.gold, rates.silver);

        const el = (id) => document.getElementById(id);
        if (el('nl-total-items')) el('nl-total-items').textContent = s.totalItems;
        if (el('nl-gold-items')) el('nl-gold-items').textContent = s.goldItems;
        if (el('nl-silver-items')) el('nl-silver-items').textContent = s.silverItems;
        if (el('nl-total-weight')) el('nl-total-weight').textContent = (s.totalGoldWeight + s.totalSilverWeight).toFixed(2) + 'g';
        if (el('nl-total-value')) el('nl-total-value').textContent = UI.currency(s.totalValue);
        recalc();
    }

    function setPeriod(period) {
        _state.interestPeriod = period;
        document.getElementById('nl-period-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === period));
        recalc();
    }

    function setType(type) {
        _state.interestType = type;
        document.getElementById('nl-type-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === type));
        recalc();
    }

    function recalc() {
        const amount = parseFloat(document.getElementById('nl-amount')?.value) || 0;
        const rate = parseFloat(document.getElementById('nl-rate')?.value) || 0;
        const duration = parseInt(document.getElementById('nl-duration')?.value) || 12;
        const startDate = document.getElementById('nl-start')?.value;

        const rates = Market.getCurrentRates();
        const items = _state.items.map(i => ({ ...i, weightGrams: parseFloat(i.weightGrams) || 0 }));
        const s = Calculator.calcItemsMetalValue(items, rates.gold, rates.silver);
        const metalValue = s.totalValue;

        const annualRate = Calculator.toAnnualRate(rate, _state.interestPeriod);
        let totalInterest;
        if (_state.interestType === 'compound') {
            totalInterest = Calculator.calcCompoundInterest(amount, annualRate, duration);
        } else {
            totalInterest = Calculator.calcSimpleInterest(amount, annualRate, duration);
        }

        const totalPayable = amount + totalInterest;
        const ltv = metalValue > 0 ? (amount / metalValue) * 100 : 0;
        const totalWeight = s.totalGoldWeight + s.totalSilverWeight;
        const breakEven = totalWeight > 0 ? totalPayable / totalWeight : 0;
        const pl = metalValue - totalPayable;

        const el = (id) => document.getElementById(id);
        if (el('nl-calc-interest')) el('nl-calc-interest').textContent = UI.currency(totalInterest);
        if (el('nl-calc-payable')) el('nl-calc-payable').textContent = UI.currency(totalPayable);
        const ltvEl = el('nl-calc-ltv');
        if (ltvEl) { ltvEl.textContent = UI.pct(ltv); ltvEl.className = 'calc-item-value ' + (ltv > 80 ? 'danger' : ltv > 60 ? 'monitor' : 'safe'); }
        if (startDate && el('nl-calc-maturity')) {
            const md = new Date(startDate); md.setMonth(md.getMonth() + duration);
            el('nl-calc-maturity').textContent = UI.formatDate(md.toISOString());
        }
        if (el('nl-calc-breakeven')) el('nl-calc-breakeven').textContent = UI.currency(breakEven) + '/g';
        const plEl = el('nl-calc-pl');
        if (plEl) { plEl.textContent = UI.currency(pl); plEl.className = 'calc-item-value ' + (pl >= 0 ? 'safe' : 'danger'); }
    }

    function save() {
        const customer = document.getElementById('nl-customer').value.trim();
        const mobile = document.getElementById('nl-mobile').value.trim();
        const amount = parseFloat(document.getElementById('nl-amount').value);
        const rate = parseFloat(document.getElementById('nl-rate').value);
        const duration = parseInt(document.getElementById('nl-duration').value);
        const startDate = document.getElementById('nl-start').value;
        const locker = document.getElementById('nl-locker').value.trim();

        if (!customer) { UI.toast('Please enter customer name', 'error'); return; }

        const validItems = _state.items.filter(i => parseFloat(i.weightGrams) > 0);
        if (validItems.length === 0) { UI.toast('Add at least one jewelry item with weight', 'error'); return; }
        if (!amount || amount <= 0) { UI.toast('Please enter valid loan amount', 'error'); return; }
        if (!rate || rate <= 0) { UI.toast('Please enter valid interest rate', 'error'); return; }
        if (!startDate) { UI.toast('Please select start date', 'error'); return; }

        const rates = Market.getCurrentRates();
        const items = validItems.map(i => ({
            itemType: i.itemType, metalType: i.metalType, purity: i.purity, weightGrams: parseFloat(i.weightGrams)
        }));
        const s = Calculator.calcItemsMetalValue(items, rates.gold, rates.silver);

        // Use the dominant metal type for backward compatibility
        const dominantMetal = s.goldItems >= s.silverItems ? 'gold' : 'silver';
        const dominantPurity = items.find(i => i.metalType === dominantMetal)?.purity || '22K';

        const loan = {
            customerName: customer, mobile, lockerName: locker,
            metalType: dominantMetal, metalSubType: dominantPurity,
            weightGrams: s.totalGoldWeight + s.totalSilverWeight,
            items: items,
            loanAmount: amount, interestRate: rate,
            interestPeriod: _state.interestPeriod, interestType: _state.interestType,
            loanStartDate: startDate, loanDuration: duration,
            historicalMarketRate: null, useHistoricalRate: false,
            paidInterest: 0, partialRepayment: 0, manualPenalty: 0,
            isMigrated: false, status: 'active',
            marketRateAtCreation: dominantMetal === 'gold' ? rates.gold : rates.silver
        };

        // Auto save customer
        const customers = DB.getCustomers();
        let existing = customers.find(c => c.name.toLowerCase() === customer.toLowerCase() || (mobile && c.mobile === mobile));
        if (!existing) {
            DB.saveCustomer({ name: customer, mobile, address: '', totalLoans: 1 });
        } else {
            existing.totalLoans = (existing.totalLoans || 0) + 1;
            DB.saveCustomer(existing);
        }

        DB.saveLoan(loan);
        UI.toast('Loan created successfully!', 'success');
        UI.navigateTo('loans');
    }

    return { render, addItem, removeItem, updateItem, setPeriod, setType, recalc, save, _state };
})();
