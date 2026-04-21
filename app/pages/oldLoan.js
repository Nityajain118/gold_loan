/* ============================================
   Old Loan Entry Page — Multi-Item Jewelry
   ============================================ */
const OldLoanPage = (() => {
    let _state = {
        interestPeriod: 'monthly', interestType: 'simple',
        compoundingFrequency: 12,
        useHistoricalRate: false, autoCalcMaturity: true, items: [],
        isManualTithi: false
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
                        ${UI.formGroup('Customer Name *', '<input type="text" class="form-input" id="ol-customer" required placeholder="Customer name" autocomplete="off">')}
                        ${UI.formGroup('Mobile Number (10 digits)', `<input type="tel" class="form-input" id="ol-mobile" placeholder="10-digit number" maxlength="10" inputmode="numeric" pattern="[0-9]*" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)">
                            <span id="ol-mobile-err" class="form-hint" style="color:var(--danger);display:none;">Enter a valid 10-digit mobile number</span>`)}
                        ${UI.formGroup('Locker Name', '<input type="text" class="form-input" id="ol-locker" placeholder="e.g., Locker B-05">')}
                        ${UI.formGroup('Customer Caste', '<input type="text" class="form-input" id="ol-caste" placeholder="Optional Caste">')}
                    </div>
                    <div class="form-group mb-3">
                        ${UI.formGroup('Customer Address *', '<textarea class="form-input" id="ol-address" required placeholder="Enter full address" style="height:70px;resize:vertical;"></textarea>')}
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
                        ${UI.formGroup('Loan Amount (₹) *', '<input type="number" class="form-input" id="ol-amount" required placeholder="Loan amount" min="1" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Interest Rate (%) *', '<input type="number" class="form-input" id="ol-rate" required placeholder="e.g., 2" step="0.01" min="0.01" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Interest Period', `<div class="segment-control" id="ol-period-group">
                            <button type="button" class="segment-btn active" data-value="monthly" onclick="OldLoanPage.setPeriod('monthly')">Monthly</button>
                            <button type="button" class="segment-btn" data-value="yearly" onclick="OldLoanPage.setPeriod('yearly')">Yearly</button>
                        </div>`)}
                        ${UI.formGroup('Interest Type', `<div class="segment-control" id="ol-type-group">
                            <button type="button" class="segment-btn active" data-value="simple" onclick="OldLoanPage.setType('simple')">Simple</button>
                            <button type="button" class="segment-btn" data-value="compound" onclick="OldLoanPage.setType('compound')">Compound</button>
                        </div>`)}
                    </div>
                    <div class="form-group mb-2" id="ol-compound-freq-wrap" style="display:none;">
                        <label class="form-label">🔁 Compounding Frequency</label>
                        <div class="segment-control" id="ol-freq-group">
                            <button type="button" class="segment-btn active" data-value="12" onclick="OldLoanPage.setFreq(12)">Monthly</button>
                            <button type="button" class="segment-btn" data-value="4" onclick="OldLoanPage.setFreq(4)">Quarterly</button>
                            <button type="button" class="segment-btn" data-value="2" onclick="OldLoanPage.setFreq(2)">Half-Yearly</button>
                            <button type="button" class="segment-btn" data-value="1" onclick="OldLoanPage.setFreq(1)">Yearly</button>
                        </div>
                    </div>

                    <h4 class="mb-1 mt-3" style="color:var(--monitor);font-size:0.9rem;">🕰️ Backdated Entry Fields</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup('Loan Start Date (Past) *', `
                            <input type="date" class="form-input" id="ol-start" required onchange="OldLoanPage.recalc()" style="margin-bottom:8px;">
                            <div id="ol-tithi-container" style="display:none; padding:10px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input);">
                                <div id="ol-start-tithi" style="font-size:0.85rem; line-height:1.4;"></div>
                                <div class="toggle-group mt-2">
                                    <label class="toggle"><input type="checkbox" id="ol-panchang-override" onchange="OldLoanPage.togglePanchang()"><span class="toggle-slider"></span></label>
                                    <span class="toggle-label" style="font-size:0.8rem; font-weight:600;">Panchang Override (Manual Mode)</span>
                                </div>
                                <div id="ol-panchang-inputs" style="display:none; margin-top:8px; gap:6px; flex-direction:column;">
                                    <input type="number" id="ol-manual-samvat" class="form-input form-sm" placeholder="Samvat Yr (e.g. 2083)" oninput="OldLoanPage.recalc()">
                                    <select id="ol-manual-month" class="form-select form-sm" onchange="OldLoanPage.recalc()">
                                        ${(typeof Tithi !== 'undefined' ? Tithi.LUNAR_MONTHS : []).map(m => `<option value="${m}">${m}</option>`).join('')}
                                    </select>
                                    <div class="flex gap-1">
                                        <select id="ol-manual-paksha" class="form-select form-sm" style="flex:1" onchange="OldLoanPage.recalc()">
                                            <option value="Shukla">Shukla</option>
                                            <option value="Krishna">Krishna</option>
                                        </select>
                                        <select id="ol-manual-tithi" class="form-select form-sm" style="flex:2" onchange="OldLoanPage.recalc()">
                                            ${(typeof Tithi !== 'undefined' ? Tithi.TITHI_NAMES : []).map((t, i) => `<option value="${t}">${i + 1}. ${t}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="flex gap-1 align-center mt-1">
                                        <select id="ol-manual-pakshatype" class="form-select form-sm" style="flex:1;" onchange="OldLoanPage.recalc()">
                                            <option value="Vidhi">Vidhi</option>
                                            <option value="Sudhi">Sudhi</option>
                                        </select>
                                        <button type="button" class="btn btn-gold btn-sm" style="flex:1;" onclick="OldLoanPage.saveOverride()">💾 Save Override</button>
                                    </div>
                                </div>
                            </div>
                        `, 'Original loan start date')}
                        ${UI.formGroup('Loan Duration', `<div class="form-row"><input type="number" class="form-input" id="ol-duration" placeholder="12" min="1" value="12" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()" style="flex:1;"><span style="color:var(--text-muted);font-size:0.85rem;">months</span></div>`)}
                        ${UI.formGroup('Historical Rate (₹/g)', '<input type="number" class="form-input" id="ol-historical-rate" placeholder="Optional" step="1" min="0" onkeydown="OldLoanPage.blockInvalidKey(event)">')}
                        ${UI.formGroup('Paid Interest (₹)', '<input type="number" class="form-input" id="ol-paid-interest" placeholder="0" min="0" value="0" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Partial Repayment (₹)', '<input type="number" class="form-input" id="ol-partial" placeholder="0" min="0" value="0" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup('Penalty (₹)', '<input type="number" class="form-input" id="ol-penalty" placeholder="0" min="0" value="0" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()">')}
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
                    <!-- Risk Analysis Panel -->
                    <div id="ol-risk-panel"></div>
                </form>
            </div>`;
        renderItems();
    }

    function defaultItem() { return { metalType: 'gold', purity: '22K', customPurity: '', itemType: 'Ring', weightGrams: '' }; }

    function blockInvalidKey(e) {
        if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
    }

    function renderItems() {
        const list = document.getElementById('ol-items-list');
        if (!list) return;
        const rates = Market.getCurrentRates();
        list.innerHTML = _state.items.map((item, i) => {
            const types = Calculator.getJewelryTypes(item.metalType);
            const w = parseFloat(item.weightGrams) || 0;
            const rate = item.metalType === 'gold' ? rates.gold : rates.silver;
            const pf = item.purity === 'custom'
                ? (parseFloat(item.customPurity) || 0) / 100
                : Calculator.getPurityFactor(item.purity);
            const val = w * pf * rate;
            const isCustom = item.purity === 'custom';

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
                            ${Calculator.buildItemPurityOptions(item.metalType, item.purity)}
                        </select></div>
                    ${isCustom ? `
                    <div class="form-group">
                        <label class="form-label">Custom Purity (%)</label>
                        <input type="number" class="form-input" value="${item.customPurity}" step="0.1" min="1" max="100" placeholder="e.g., 87.5"
                            onkeydown="OldLoanPage.blockInvalidKey(event)"
                            oninput="OldLoanPage.updateCustomPurity(${i}, this.value)">
                        <span class="form-hint">Enter purity as % (1–100)</span>
                    </div>` : ''}
                    <div class="form-group"><label class="form-label">Weight (g)</label>
                        <input type="number" class="form-input" value="${item.weightGrams}" step="0.01" min="0.01" placeholder="0.00"
                            onkeydown="OldLoanPage.blockInvalidKey(event)"
                            oninput="OldLoanPage.updateItem(${i},'weightGrams',this.value)"></div>
                </div>
                ${w > 0 ? `<div class="jewelry-item-value">Value: ${UI.currency(val)} (@ ₹${rate.toLocaleString('en-IN')}/g · ${(pf * 100).toFixed(1)}% purity)</div>` : ''}
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
        if (f === 'metalType') {
            _state.items[i].itemType = Calculator.getJewelryTypes(v)[0];
            _state.items[i].purity = v === 'gold' ? '22K' : '999';
            _state.items[i].customPurity = '';
        }
        if (f === 'purity' && v !== 'custom') {
            _state.items[i].customPurity = '';
        }
        renderItems(); recalc();
    }

    function updateCustomPurity(i, v) {
        _state.items[i].customPurity = v;
        updateSummary(); recalc();
    }

    function updateSummary() {
        const rates = Market.getCurrentRates();
        let totalGoldWeight = 0, totalSilverWeight = 0, totalValue = 0, goldItems = 0, silverItems = 0;
        _state.items.forEach(i => {
            const w = parseFloat(i.weightGrams) || 0;
            if (w <= 0) return;
            const pf = i.purity === 'custom' ? (parseFloat(i.customPurity) || 0) / 100 : Calculator.getPurityFactor(i.purity);
            const r = i.metalType === 'gold' ? rates.gold : rates.silver;
            totalValue += w * pf * r;
            if (i.metalType === 'gold') { totalGoldWeight += w; goldItems++; } else { totalSilverWeight += w; silverItems++; }
        });
        const totalItems = goldItems + silverItems;

        const el = id => document.getElementById(id);
        if (el('ol-total-items')) el('ol-total-items').textContent = totalItems;
        if (el('ol-gold-items')) el('ol-gold-items').textContent = goldItems;
        if (el('ol-silver-items')) el('ol-silver-items').textContent = silverItems;
        if (el('ol-total-weight')) el('ol-total-weight').textContent = (totalGoldWeight + totalSilverWeight).toFixed(2) + 'g';
        if (el('ol-total-value')) el('ol-total-value').textContent = UI.currency(totalValue);
        recalc();
    }

    function setPeriod(p) { _state.interestPeriod = p; document.getElementById('ol-period-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === p)); recalc(); }
    function setType(t) { _state.interestType = t; document.getElementById('ol-type-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === t)); const fw = document.getElementById('ol-compound-freq-wrap'); if(fw) fw.style.display = t === 'compound' ? '' : 'none'; recalc(); }
    function setFreq(f) { _state.compoundingFrequency = f; document.getElementById('ol-freq-group').querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === String(f))); recalc(); }
    function toggleHistorical() { _state.useHistoricalRate = document.getElementById('ol-use-historical').checked; recalc(); }
    
    function togglePanchang() {
        const checkbox = document.getElementById('ol-panchang-override');
        _state.isManualTithi = checkbox && checkbox.checked;
        const inputs = document.getElementById('ol-panchang-inputs');
        if (inputs) inputs.style.display = _state.isManualTithi ? 'flex' : 'none';
        
        if (_state.isManualTithi) {
            try {
                const saved = JSON.parse(localStorage.getItem("panchangOverride"));
                if (saved) {
                    const setVal = (id, val) => { if (document.getElementById(id) && val) document.getElementById(id).value = val; };
                    setVal('ol-manual-samvat', saved.samvat);
                    setVal('ol-manual-month', saved.month);
                    setVal('ol-manual-paksha', saved.paksha);
                    setVal('ol-manual-tithi', saved.tithi);
                    setVal('ol-manual-pakshatype', saved.pakshaType || 'Vidhi');
                }
            } catch(e) {}
        }
        recalc();
    }

    function saveOverride() {
        const data = {
            samvat: document.getElementById('ol-manual-samvat')?.value,
            month: document.getElementById('ol-manual-month')?.value,
            paksha: document.getElementById('ol-manual-paksha')?.value,
            tithi: document.getElementById('ol-manual-tithi')?.value,
            pakshaType: document.getElementById('ol-manual-pakshatype')?.value || 'Vidhi'
        };
        localStorage.setItem("panchangOverride", JSON.stringify(data));
        UI.toast('Manual Panchang override saved!', 'success');
    }

    function recalc() {
        const amount = parseFloat(document.getElementById('ol-amount')?.value) || 0;
        const rate = parseFloat(document.getElementById('ol-rate')?.value) || 0;
        const startDate = document.getElementById('ol-start')?.value;
        const paidInterest = parseFloat(document.getElementById('ol-paid-interest')?.value) || 0;
        const partial = parseFloat(document.getElementById('ol-partial')?.value) || 0;
        const penalty = parseFloat(document.getElementById('ol-penalty')?.value) || 0;
        if (!startDate || !amount || !rate) return;

        // Show Tithi info for start date
        const tithiContainer = document.getElementById('ol-tithi-container');
        const startTithiEl = document.getElementById('ol-start-tithi');
        let customTithiInfo = null;
        
        if (typeof Tithi !== 'undefined' && startDate) {
            if (tithiContainer) tithiContainer.style.display = 'block';
            
            if (_state.isManualTithi) {
                const s = document.getElementById('ol-manual-samvat').value || '2083';
                const m = document.getElementById('ol-manual-month').value;
                const p = document.getElementById('ol-manual-paksha').value;
                const t = document.getElementById('ol-manual-tithi').value;
                const pt = document.getElementById('ol-manual-pakshatype').value || 'Vidhi';
                customTithiInfo = {
                    samvat: parseInt(s) || 2083, lunarMonth: m, paksha: p, tithi: t, pakshaType: pt,
                    formatted: `📅 Samvat ${s} | ${m}<br/>🌙 Tithi: ${pt} ${p} ${t}`
                };
                if (startTithiEl) startTithiEl.innerHTML = `<strong style="color:var(--danger)">[Manual Override]</strong><br/>${customTithiInfo.formatted}`;
            } else {
                const info = Tithi.getTithiInfo(new Date(startDate));
                if (info && startTithiEl) {
                    startTithiEl.innerHTML = info.formatted;
                    document.getElementById('ol-manual-samvat').value = info.samvat;
                    document.getElementById('ol-manual-month').value = info.lunarMonth;
                    document.getElementById('ol-manual-paksha').value = info.paksha;
                    document.getElementById('ol-manual-tithi').value = info.tithi;
                }
                customTithiInfo = info;
            }
        } else if (tithiContainer) {
            tithiContainer.style.display = 'none';
        }
        _state.currentTithiInfo = customTithiInfo;

        const rates = Market.getCurrentRates();
        let metalValue = 0;
        _state.items.forEach(i => {
            const w = parseFloat(i.weightGrams) || 0;
            if (w <= 0) return;
            const pf = i.purity === 'custom' ? (parseFloat(i.customPurity) || 0) / 100 : Calculator.getPurityFactor(i.purity);
            const r = i.metalType === 'gold' ? rates.gold : rates.silver;
            metalValue += w * pf * r;
        });

        const start = new Date(startDate), now = new Date();
        const monthsElapsed = Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
        const annualRate = Calculator.toAnnualRate(rate, _state.interestPeriod);
        const compFreq = _state.compoundingFrequency || 12;
        const totalInterest = _state.interestType === 'compound' ? Calculator.calcCompoundInterestWithFreq(amount, annualRate, monthsElapsed, compFreq) : Calculator.calcSimpleInterest(amount, annualRate, monthsElapsed);
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

        // --- Risk Analysis Panel (auto-update) ---
        let pureGoldWeight = 0;
        _state.items.forEach(i => {
            const w = parseFloat(i.weightGrams) || 0;
            if (w <= 0) return;
            const pf = i.purity === 'custom' ? (parseFloat(i.customPurity) || 0) / 100 : Calculator.getPurityFactor(i.purity);
            pureGoldWeight += w * pf;
        });
        const rp = el('ol-risk-panel');
        if (rp) {
            rp.innerHTML = Risk.renderRiskPanel({
                pureGoldWeight,
                goldValue: metalValue,
                loanAmount: amount,
                currentPrice: rates.gold
            });
        }
    }

    function save() {
        const customer = document.getElementById('ol-customer').value.trim();
        const mobile = document.getElementById('ol-mobile').value.trim();
        const amount = parseFloat(document.getElementById('ol-amount').value);
        const rate = parseFloat(document.getElementById('ol-rate').value);
        const startDate = document.getElementById('ol-start').value;
        const duration = parseInt(document.getElementById('ol-duration').value) || 12;
        const locker = document.getElementById('ol-locker').value.trim();
        const addressEl = document.getElementById('ol-address');
        const address = addressEl ? addressEl.value.trim() : '';
        const casteEl = document.getElementById('ol-caste');
        const caste = casteEl ? casteEl.value.trim() : '';
        const historicalRate = parseFloat(document.getElementById('ol-historical-rate').value) || null;
        const paidInterest = parseFloat(document.getElementById('ol-paid-interest').value) || 0;
        const partial = parseFloat(document.getElementById('ol-partial').value) || 0;
        const penalty = parseFloat(document.getElementById('ol-penalty').value) || 0;
        const status = document.getElementById('ol-status').value;

        // --- Validate ---
        if (!customer) { UI.toast('Enter customer name', 'error'); return; }
        if (mobile && !/^\d{10}$/.test(mobile)) {
            const err = document.getElementById('ol-mobile-err');
            if (err) err.style.display = '';
            UI.toast('Mobile number must be exactly 10 digits', 'error');
            return;
        }
        const mobileErr = document.getElementById('ol-mobile-err');
        if (mobileErr) mobileErr.style.display = 'none';

        if (!address) { UI.toast('Enter customer address', 'error'); return; }

        const validItems = _state.items.filter(i => parseFloat(i.weightGrams) > 0);
        if (!validItems.length) { UI.toast('Add at least one item with weight', 'error'); return; }

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

        if (!amount || amount <= 0) { UI.toast('Enter valid loan amount', 'error'); return; }
        if (!rate || rate <= 0) { UI.toast('Enter valid interest rate', 'error'); return; }
        if (!startDate) { UI.toast('Enter start date', 'error'); return; }

        const rates = Market.getCurrentRates();
        const items = validItems.map(i => ({
            itemType: i.itemType, metalType: i.metalType, purity: i.purity,
            customPurity: i.purity === 'custom' ? parseFloat(i.customPurity) : null,
            weightGrams: parseFloat(i.weightGrams)
        }));

        let totalGoldWeight = 0, totalSilverWeight = 0, goldItems = 0, silverItems = 0;
        items.forEach(i => {
            if (i.metalType === 'gold') { totalGoldWeight += i.weightGrams; goldItems++; }
            else { totalSilverWeight += i.weightGrams; silverItems++; }
        });

        const dom = goldItems >= silverItems ? 'gold' : 'silver';
        const loan = {
            customerName: customer, mobile, lockerName: locker,
            address, caste,
            metalType: dom, metalSubType: items.find(i => i.metalType === dom)?.purity || '22K',
            weightGrams: totalGoldWeight + totalSilverWeight, items,
            loanAmount: amount, interestRate: rate,
            interestPeriod: _state.interestPeriod, interestType: _state.interestType,
            compoundingFrequency: _state.compoundingFrequency,
            timeMode: DB.getSettings().timeMode || 'normal',
            tithiInfo: _state.currentTithiInfo || null,
            isManualTithi: _state.isManualTithi,
            loanStartDate: startDate, loanDuration: duration,
            historicalMarketRate: historicalRate, useHistoricalRate: _state.useHistoricalRate,
            paidInterest, partialRepayment: partial, manualPenalty: penalty,
            isMigrated: true, status,
            marketRateAtCreation: historicalRate || Market.getRate(dom)
        };

        // ── Customer resolution (phone-first, NEVER merge by name) ───────────
        const customers = DB.getCustomers();
        let resolvedCustomer = null;

        if (mobile) {
            resolvedCustomer = customers.find(c => c.mobile === mobile) || null;
        }

        if (!resolvedCustomer) {
            resolvedCustomer = DB.saveCustomer({ name: customer, mobile, address, caste, totalLoans: 1 });
        } else {
            resolvedCustomer.totalLoans = (resolvedCustomer.totalLoans || 0) + 1;
            if (address) resolvedCustomer.address = address;
            if (caste) resolvedCustomer.caste = caste;
            DB.saveCustomer(resolvedCustomer);
        }

        // Attach customerId so ledger lookups are reliable
        loan.customerId = resolvedCustomer.id;

        DB.saveLoan(loan);
        UI.toast('Old loan migrated!', 'success');
        UI.navigateTo('loans');
    }

    return { render, addItem, removeItem, updateItem, updateCustomPurity, setPeriod, setType, setFreq, toggleHistorical, togglePanchang, saveOverride, recalc, save, blockInvalidKey };
})();
