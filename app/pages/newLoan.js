/* ============================================
   New Loan Page — Multi-Item Jewelry Support
   ============================================ */
const NewLoanPage = (() => {
    let _state = { 
        interestPeriod: 'monthly', interestType: 'simple', compoundingFrequency: 12, 
        items: [], isManualTithi: false 
    };
    const MAX_ITEMS = 10;

    function render(container) {
        _state.items = [defaultItem()];

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📝 Create New Loan</h3>
                    <span class="status-badge active">New Loan</span>
                </div>
                <form id="new-loan-form" onsubmit="return false;">
                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;">👤 Customer Information</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup('Customer Name *', '<input type="text" class="form-input" id="nl-customer" required placeholder="Enter customer name" autocomplete="off">')}
                        ${UI.formGroup('Mobile Number (10 digits)', `<input type="tel" class="form-input" id="nl-mobile" placeholder="10-digit number" maxlength="10" inputmode="numeric" pattern="[0-9]*" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)">
                            <span id="nl-mobile-err" class="form-hint" style="color:var(--danger);display:none;">Enter a valid 10-digit mobile number</span>`)}
                        ${UI.formGroup('Locker Name', '<input type="text" class="form-input" id="nl-locker" placeholder="e.g., Locker A-12">')}
                    </div>
                    <div class="form-group mb-3">
                        ${UI.formGroup('Customer Address', '<textarea class="form-input" id="nl-address" placeholder="Enter full address (optional)" style="height:70px;resize:vertical;"></textarea>')}
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">📸 Customer Photo</label>
                        <div id="nl-customer-photo-wrap">${ImageUpload.renderUploader('nl-customer-photo', null, { label: 'Upload Customer Photo', compact: true, type: 'customer' })}</div>
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
                        <div class="items-summary-item"><div class="items-summary-label">Pure Gold Weight</div><div class="items-summary-value" id="nl-pure-gold-weight">0g</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Safe Loan (<span id="nl-ltv-label">75</span>% LTV)</div><div class="items-summary-value safe" id="nl-safe-loan">₹0</div></div>
                    </div>

                    <h4 class="mb-1 mt-3" style="color:var(--primary);font-size:0.9rem;">💰 Loan Details</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup('Loan Amount (₹) *', '<input type="number" class="form-input" id="nl-amount" required placeholder="Enter loan amount" min="1" onkeydown="NewLoanPage.blockInvalidKey(event)" oninput="NewLoanPage.recalc()">')}
                        ${UI.formGroup('Interest Rate (%) *', '<input type="number" class="form-input" id="nl-rate" required placeholder="e.g., 2" step="0.01" min="0.01" onkeydown="NewLoanPage.blockInvalidKey(event)" oninput="NewLoanPage.recalc()">')}
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
                    </div>
                    <!-- Compounding Frequency (shown only for compound) -->
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
                            <input type="date" class="form-input" id="nl-start" value="${new Date().toISOString().split('T')[0]}" onchange="NewLoanPage.recalc()" style="margin-bottom:8px;">
                            <div id="nl-tithi-container" style="display:none; padding:10px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input);">
                                <div id="nl-start-tithi" style="font-size:0.85rem; line-height:1.4;"></div>
                                <div class="toggle-group mt-2">
                                    <label class="toggle"><input type="checkbox" id="nl-panchang-override" onchange="NewLoanPage.togglePanchang()"><span class="toggle-slider"></span></label>
                                    <span class="toggle-label" style="font-size:0.8rem; font-weight:600;">Panchang Override (Manual Mode)</span>
                                </div>
                                <div id="nl-panchang-inputs" style="display:none; margin-top:8px; gap:6px; flex-direction:column;">
                                    <input type="number" id="nl-manual-samvat" class="form-input form-sm" placeholder="Samvat Yr (e.g. 2083)" oninput="NewLoanPage.recalc()">
                                    <select id="nl-manual-month" class="form-select form-sm" onchange="NewLoanPage.recalc()">
                                        ${(typeof Tithi !== 'undefined' ? Tithi.LUNAR_MONTHS : []).map(m => `<option value="${m}">${m}</option>`).join('')}
                                    </select>
                                    <div class="flex gap-1">
                                        <select id="nl-manual-paksha" class="form-select form-sm" style="flex:1" onchange="NewLoanPage.recalc()">
                                            <option value="Shukla">Shukla</option>
                                            <option value="Krishna">Krishna</option>
                                        </select>
                                        <select id="nl-manual-tithi" class="form-select form-sm" style="flex:2" onchange="NewLoanPage.recalc()">
                                            ${(typeof Tithi !== 'undefined' ? Tithi.TITHI_NAMES : []).map((t, i) => `<option value="${t}">${i + 1}. ${t}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="flex gap-1 align-center mt-1">
                                        <select id="nl-manual-pakshatype" class="form-select form-sm" style="flex:1;" onchange="NewLoanPage.recalc()">
                                            <option value="Vidhi">Vidhi</option>
                                            <option value="Sudhi">Sudhi</option>
                                        </select>
                                        <button type="button" class="btn btn-gold btn-sm" style="flex:1;" onclick="NewLoanPage.saveOverride()">💾 Save Override</button>
                                    </div>
                                </div>
                            </div>
                        `)}
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

                    <div class="flex gap-2 mt-3">
                        <button type="button" class="btn btn-gold btn-lg" onclick="NewLoanPage.save()">💾 Save Loan</button>
                    </div>

                    <!-- Risk Analysis Panel (auto-populated by recalc) -->
                    <div id="nl-risk-panel"></div>
                </form>
            </div>`;

        renderItems();
        
        // Initial LTV label set
        const settings = DB.getSettings();
        const ltvPercentage = settings.ltvPercentage || 75;
        const ltvLabel = document.getElementById('nl-ltv-label');
        if (ltvLabel) ltvLabel.textContent = ltvPercentage;
    }

    function defaultItem() {
        return { metalType: 'gold', purity: '22K', customPurity: '', itemType: 'Ring', weightGrams: '' };
    }

    // Block e, +, - in number inputs
    function blockInvalidKey(e) {
        if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
    }

    function renderItems() {
        const list = document.getElementById('nl-items-list');
        if (!list) return;
        const rates = Market.getCurrentRates();

        list.innerHTML = _state.items.map((item, i) => {
            const types = Calculator.getJewelryTypes(item.metalType);
            const weight = parseFloat(item.weightGrams) || 0;
            const rate = item.metalType === 'gold' ? rates.gold : rates.silver;
            const purityFactor = item.purity === 'custom'
                ? (parseFloat(item.customPurity) || 0) / 100
                : Calculator.getPurityFactor(item.purity);
            const val = weight * purityFactor * rate;
            const isCustomPurity = item.purity === 'custom';

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
                            ${Calculator.buildItemPurityOptions(item.metalType, item.purity)}
                        </select>
                    </div>
                    ${isCustomPurity ? `
                    <div class="form-group">
                        <label class="form-label">Custom Purity (%)</label>
                        <input type="number" class="form-input" value="${item.customPurity}" step="0.1" min="1" max="100"
                            placeholder="e.g., 87.5"
                            onkeydown="NewLoanPage.blockInvalidKey(event)"
                            oninput="NewLoanPage.updateCustomPurity(${i}, this.value)">
                        <span class="form-hint">Enter purity as % (1–100)</span>
                    </div>` : ''}
                    <div class="form-group">
                        <label class="form-label">Weight (g)</label>
                        <input type="number" class="form-input" value="${item.weightGrams}" step="0.01" min="0.01" placeholder="0.00"
                            onkeydown="NewLoanPage.blockInvalidKey(event)"
                            oninput="NewLoanPage.updateItem(${i},'weightGrams',this.value)">
                    </div>
                </div>
                <div class="form-group mt-1">
                    <label class="form-label">📸 Item Photo</label>
                    ${ImageUpload.renderUploader('nl-item-photo-' + i, item.photo || null, { label: 'Upload Gold Item Photo', compact: true, type: 'gold' })}
                </div>
                ${weight > 0 ? `<div class="jewelry-item-value">Value: ${UI.currency(val)} (@ ₹${rate.toLocaleString('en-IN')}/g · ${(purityFactor * 100).toFixed(1)}% purity)</div>` : ''}
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
        _state.items[index][field] = value;
        if (field === 'metalType') {
            const types = Calculator.getJewelryTypes(value);
            _state.items[index].itemType = types[0];
            _state.items[index].purity = value === 'gold' ? '22K' : '999';
            _state.items[index].customPurity = '';
        }
        if (field === 'purity' && value !== 'custom') {
            _state.items[index].customPurity = '';
        }
        renderItems();
        recalc();
    }

    function updateCustomPurity(index, value) {
        _state.items[index].customPurity = value;
        updateSummary();
        recalc();
    }

    function updateSummary() {
        const rates = Market.getCurrentRates();
        const items = _state.items.map(i => {
            const purityFactor = i.purity === 'custom'
                ? (parseFloat(i.customPurity) || 0) / 100
                : Calculator.getPurityFactor(i.purity);
            const w = parseFloat(i.weightGrams) || 0;
            const rate = i.metalType === 'gold' ? rates.gold : rates.silver;
            return { ...i, weightGrams: w, purityFactor, _value: w * purityFactor * rate };
        });

        const totalItems = items.filter(i => i.weightGrams > 0).length;
        const goldItems = items.filter(i => i.metalType === 'gold' && i.weightGrams > 0).length;
        const silverItems = items.filter(i => i.metalType === 'silver' && i.weightGrams > 0).length;
        const totalGoldWeight = items.filter(i => i.metalType === 'gold').reduce((s, i) => s + i.weightGrams, 0);
        const totalSilverWeight = items.filter(i => i.metalType === 'silver').reduce((s, i) => s + i.weightGrams, 0);
        const totalValue = items.reduce((s, i) => s + i._value, 0);

        // Gold Valuation: Pure Gold Weight = weight × (purity/100) for gold items only
        const pureGoldWeight = items
            .filter(i => i.metalType === 'gold')
            .reduce((s, i) => s + i.weightGrams * i.purityFactor, 0);

        // Actual Gold Value = pureGoldWeight × gold market rate
        const actualGoldValue = pureGoldWeight * rates.gold;

        // Safe Loan Amount = Gold Value × LTV percentage
        const settings = DB.getSettings();
        const ltvPercentage = settings.ltvPercentage || 75;
        const safeLoanAmount = actualGoldValue * (ltvPercentage / 100);

        const el = (id) => document.getElementById(id);
        if (el('nl-total-items')) el('nl-total-items').textContent = totalItems;
        if (el('nl-gold-items')) el('nl-gold-items').textContent = goldItems;
        if (el('nl-silver-items')) el('nl-silver-items').textContent = silverItems;
        if (el('nl-total-weight')) el('nl-total-weight').textContent = (totalGoldWeight + totalSilverWeight).toFixed(2) + 'g';
        if (el('nl-total-value')) el('nl-total-value').textContent = UI.currency(totalValue);
        if (el('nl-pure-gold-weight')) el('nl-pure-gold-weight').textContent = pureGoldWeight.toFixed(3) + 'g';
        if (el('nl-safe-loan')) el('nl-safe-loan').textContent = UI.currency(safeLoanAmount);

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
        // Show/hide compounding frequency
        const freqWrap = document.getElementById('nl-compound-freq-wrap');
        if (freqWrap) freqWrap.style.display = type === 'compound' ? '' : 'none';
        recalc();
    }

    function setFreq(freq) {
        _state.compoundingFrequency = freq;
        document.getElementById('nl-freq-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === String(freq)));
        recalc();
    }

    function togglePanchang() {
        const checkbox = document.getElementById('nl-panchang-override');
        _state.isManualTithi = checkbox && checkbox.checked;
        const inputs = document.getElementById('nl-panchang-inputs');
        if (inputs) inputs.style.display = _state.isManualTithi ? 'flex' : 'none';
        
        if (_state.isManualTithi) {
            try {
                const saved = JSON.parse(localStorage.getItem("panchangOverride"));
                if (saved) {
                    const setVal = (id, val) => { if (document.getElementById(id) && val) document.getElementById(id).value = val; };
                    setVal('nl-manual-samvat', saved.samvat);
                    setVal('nl-manual-month', saved.month);
                    setVal('nl-manual-paksha', saved.paksha);
                    setVal('nl-manual-tithi', saved.tithi);
                    setVal('nl-manual-pakshatype', saved.pakshaType || 'Vidhi');
                }
            } catch(e) {}
        }
        recalc();
    }

    function saveOverride() {
        const data = {
            samvat: document.getElementById('nl-manual-samvat')?.value,
            month: document.getElementById('nl-manual-month')?.value,
            paksha: document.getElementById('nl-manual-paksha')?.value,
            tithi: document.getElementById('nl-manual-tithi')?.value,
            pakshaType: document.getElementById('nl-manual-pakshatype')?.value || 'Vidhi'
        };
        localStorage.setItem("panchangOverride", JSON.stringify(data));
        UI.toast('Manual Panchang override saved!', 'success');
    }

    function recalc() {
        const amount = parseFloat(document.getElementById('nl-amount')?.value) || 0;
        const rate = parseFloat(document.getElementById('nl-rate')?.value) || 0;
        const duration = parseInt(document.getElementById('nl-duration')?.value) || 12;
        const startDate = document.getElementById('nl-start')?.value;

        // Show Tithi info for start date
        const tithiContainer = document.getElementById('nl-tithi-container');
        const startTithiEl = document.getElementById('nl-start-tithi');
        let customTithiInfo = null;
        
        if (typeof Tithi !== 'undefined' && startDate) {
            if (tithiContainer) tithiContainer.style.display = 'block';
            
            if (_state.isManualTithi) {
                const s = document.getElementById('nl-manual-samvat').value || '2083';
                const m = document.getElementById('nl-manual-month').value;
                const p = document.getElementById('nl-manual-paksha').value;
                const t = document.getElementById('nl-manual-tithi').value;
                const pt = document.getElementById('nl-manual-pakshatype').value || 'Vidhi';
                customTithiInfo = {
                    samvat: parseInt(s) || 2083, lunarMonth: m, paksha: p, tithi: t, pakshaType: pt,
                    formatted: `📅 Samvat ${s} | ${m}<br/>🌙 Tithi: ${pt} ${p} ${t}`
                };
                if (startTithiEl) startTithiEl.innerHTML = `<strong style="color:var(--danger)">[Manual Override]</strong><br/>${customTithiInfo.formatted}`;
            } else {
                const info = Tithi.getTithiInfo(new Date(startDate));
                if (info && startTithiEl) {
                    startTithiEl.innerHTML = info.formatted;
                    document.getElementById('nl-manual-samvat').value = info.samvat;
                    document.getElementById('nl-manual-month').value = info.lunarMonth;
                    document.getElementById('nl-manual-paksha').value = info.paksha;
                    document.getElementById('nl-manual-tithi').value = info.tithi;
                }
                customTithiInfo = info;
            }
        } else if (tithiContainer) {
            tithiContainer.style.display = 'none';
        }
        _state.currentTithiInfo = customTithiInfo;

        const rates = Market.getCurrentRates();
        let totalValue = 0, totalGoldWeight = 0, totalSilverWeight = 0;
        let pureGoldWeight = 0, actualGoldValue = 0;

        _state.items.forEach(i => {
            const w = parseFloat(i.weightGrams) || 0;
            if (w <= 0) return;
            const pf = i.purity === 'custom' ? (parseFloat(i.customPurity) || 0) / 100 : Calculator.getPurityFactor(i.purity);
            const r = i.metalType === 'gold' ? rates.gold : rates.silver;
            totalValue += w * pf * r;
            if (i.metalType === 'gold') {
                totalGoldWeight += w;
                pureGoldWeight += w * pf;
            } else {
                totalSilverWeight += w;
            }
        });

        actualGoldValue = pureGoldWeight * rates.gold;
        const settings = DB.getSettings();
        const ltvPercentage = settings.ltvPercentage || 75;
        const safeLoanAmount = actualGoldValue * (ltvPercentage / 100);
        const totalWeight = totalGoldWeight + totalSilverWeight;

        const annualRate = Calculator.toAnnualRate(rate, _state.interestPeriod);
        const compFreq = _state.compoundingFrequency || 12;
        let totalInterest;
        if (_state.interestType === 'compound') {
            totalInterest = Calculator.calcCompoundInterestWithFreq(amount, annualRate, duration, compFreq);
        } else {
            totalInterest = Calculator.calcSimpleInterest(amount, annualRate, duration);
        }

        const totalPayable = amount + totalInterest;
        const ltv = totalValue > 0 ? (amount / totalValue) * 100 : 0;
        const breakEven = totalWeight > 0 ? totalPayable / totalWeight : 0;
        const pl = totalValue - totalPayable;

        // Effective annual rate
        const effectiveRate = _state.interestType === 'compound'
            ? (Math.pow(1 + annualRate / 100 / compFreq, compFreq) - 1) * 100
            : annualRate;

        const el = (id) => document.getElementById(id);

        if (el('nl-pure-gold-weight')) el('nl-pure-gold-weight').textContent = pureGoldWeight.toFixed(3) + 'g';
        if (el('nl-total-value')) el('nl-total-value').textContent = UI.currency(totalValue);
        if (el('nl-safe-loan')) el('nl-safe-loan').textContent = UI.currency(safeLoanAmount);

        if (el('nl-calc-interest')) el('nl-calc-interest').textContent = UI.currency(totalInterest);
        if (el('nl-calc-payable')) el('nl-calc-payable').textContent = UI.currency(totalPayable);
        const ltvEl = el('nl-calc-ltv');
        if (ltvEl) { ltvEl.textContent = UI.pct(ltv); ltvEl.className = 'calc-item-value ' + (ltv > 80 ? 'danger' : ltv > 60 ? 'monitor' : 'safe'); }
        if (startDate && el('nl-calc-maturity')) {
            const md = new Date(startDate); md.setMonth(md.getMonth() + duration);
            el('nl-calc-maturity').textContent = UI.formatDate(md.toISOString());
            // Maturity Tithi
            const mTithiEl = el('nl-calc-maturity-tithi');
            if (mTithiEl) {
                const mTithi = Tithi.getTithiInfo(md);
                mTithiEl.innerHTML = mTithi ? mTithi.formatted : '—';
            }
        }
        if (el('nl-calc-ear')) el('nl-calc-ear').textContent = UI.pct(effectiveRate);
        if (el('nl-calc-breakeven')) el('nl-calc-breakeven').textContent = UI.currency(breakEven) + '/g';
        const plEl = el('nl-calc-pl');
        if (plEl) { plEl.textContent = UI.currency(pl); plEl.className = 'calc-item-value ' + (pl >= 0 ? 'safe' : 'danger'); }

        // --- Risk Analysis Panel (auto-update) ---
        const riskPanelEl = el('nl-risk-panel');
        if (riskPanelEl) {
            riskPanelEl.innerHTML = Risk.renderRiskPanel({
                pureGoldWeight,
                goldValue: totalValue,
                loanAmount: amount,
                currentPrice: rates.gold
            });
        }
    }

    function save() {
        const customer = document.getElementById('nl-customer').value.trim();
        const mobile = document.getElementById('nl-mobile').value.trim();
        const amount = parseFloat(document.getElementById('nl-amount').value);
        const rate = parseFloat(document.getElementById('nl-rate').value);
        const duration = parseInt(document.getElementById('nl-duration').value);
        const startDate = document.getElementById('nl-start').value;
        const locker = document.getElementById('nl-locker').value.trim();
        const address = document.getElementById('nl-address').value.trim();

        // --- Validate ---
        if (!customer) { UI.toast('Please enter customer name', 'error'); return; }
        if (mobile && !/^\d{10}$/.test(mobile)) {
            const err = document.getElementById('nl-mobile-err');
            if (err) err.style.display = '';
            UI.toast('Mobile number must be exactly 10 digits', 'error');
            return;
        }
        const mobileErr = document.getElementById('nl-mobile-err');
        if (mobileErr) mobileErr.style.display = 'none';

        const validItems = _state.items.filter(i => parseFloat(i.weightGrams) > 0);
        if (validItems.length === 0) { UI.toast('Add at least one jewelry item with weight', 'error'); return; }

        // Validate custom purity items
        for (let idx = 0; idx < validItems.length; idx++) {
            const it = validItems[idx];
            if (it.purity === 'custom') {
                const cp = parseFloat(it.customPurity);
                if (!cp || cp <= 0 || cp > 100) {
                    UI.toast(`Item #${idx + 1}: Enter a valid custom purity (1–100%)`, 'error');
                    return;
                }
            }
        }

        if (!amount || amount <= 0) { UI.toast('Please enter valid loan amount', 'error'); return; }
        if (!rate || rate <= 0) { UI.toast('Please enter valid interest rate', 'error'); return; }
        if (!startDate) { UI.toast('Please select start date', 'error'); return; }

        const rates = Market.getCurrentRates();
        const items = validItems.map(validItem => {
            // Find the original index of this item in _state.items
            const originalIdx = _state.items.findIndex(stateItem => 
                stateItem === validItem
            );
            return {
                itemType: validItem.itemType,
                metalType: validItem.metalType,
                purity: validItem.purity,
                customPurity: validItem.purity === 'custom' ? parseFloat(validItem.customPurity) : null,
                weightGrams: parseFloat(validItem.weightGrams),
                photo: originalIdx >= 0 ? ImageUpload.getImageData('nl-item-photo-' + originalIdx) : ''
            };
        });

        let totalValue = 0, totalGoldWeight = 0, totalSilverWeight = 0, goldItems = 0, silverItems = 0;
        items.forEach(i => {
            const pf = i.purity === 'custom' ? i.customPurity / 100 : Calculator.getPurityFactor(i.purity);
            const r = i.metalType === 'gold' ? rates.gold : rates.silver;
            totalValue += i.weightGrams * pf * r;
            if (i.metalType === 'gold') { totalGoldWeight += i.weightGrams; goldItems++; }
            else { totalSilverWeight += i.weightGrams; silverItems++; }
        });

        const dominantMetal = goldItems >= silverItems ? 'gold' : 'silver';
        const dominantPurity = items.find(i => i.metalType === dominantMetal)?.purity || '22K';

        const loan = {
            customerName: customer, mobile, lockerName: locker,
            address,
            metalType: dominantMetal, metalSubType: dominantPurity,
            weightGrams: totalGoldWeight + totalSilverWeight,
            items,
            loanAmount: amount, interestRate: rate,
            interestPeriod: _state.interestPeriod, interestType: _state.interestType,
            compoundingFrequency: _state.compoundingFrequency,
            timeMode: DB.getSettings().timeMode || 'normal',
            tithiInfo: _state.currentTithiInfo || null,
            isManualTithi: _state.isManualTithi,
            loanStartDate: startDate, loanDuration: duration,
            historicalMarketRate: null, useHistoricalRate: false,
            paidInterest: 0, partialRepayment: 0, manualPenalty: 0,
            isMigrated: false, status: 'active',
            customerPhoto: ImageUpload.getImageData('nl-customer-photo'),
            marketRateAtCreation: dominantMetal === 'gold' ? rates.gold : rates.silver
        };

        // Auto-save customer
        const customers = DB.getCustomers();
        // Priority 1: Match by mobile
        // Priority 2: Match by exact name (if mobile is omitted)
        let existing = null;
        if (mobile) {
            existing = customers.find(c => c.mobile === mobile);
        }
        if (!existing) {
            existing = customers.find(c => c.name.toLowerCase() === customer.toLowerCase());
        }

        if (!existing) {
            DB.saveCustomer({ name: customer, mobile, address, totalLoans: 1 });
        } else {
            // Update the existing customer record
            existing.totalLoans = (existing.totalLoans || 0) + 1;
            if (mobile && existing.mobile === mobile && existing.name.toLowerCase() !== customer.toLowerCase()) {
                existing.name = customer;
            }
            if (address) existing.address = address;
            DB.saveCustomer(existing);
        }

        DB.saveLoan(loan);
        UI.toast('Loan created successfully!', 'success');
        UI.navigateTo('loans');
    }

    return { render, addItem, removeItem, updateItem, updateCustomPurity, setPeriod, setType, setFreq, togglePanchang, saveOverride, recalc, save, blockInvalidKey, _state };
})();
