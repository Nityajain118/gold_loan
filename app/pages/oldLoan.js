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
    const DRAFT_KEY = 'gv_ol_draft';
    let _draft_active = false;

    function render(container) {
        _state.items = [defaultItem()];
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title" data-i18n="nav_old_loan">${I18n.t('nav_old_loan')}</h3>
                    <span class="status-badge closed">Past Record</span>
                </div>
                <form id="old-loan-form" onsubmit="return false;">
                    <div class="alert alert-warning mb-3">
                        Use this form to enter existing loans that started in the past. Interest will be calculated from the original start date.
                    </div>

                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;" data-i18n="customer_info">${I18n.t('customer_info')}</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup(I18n.t('customer_name') + ' *', '<input type="text" class="form-input" id="ol-customer" required placeholder="' + I18n.t('customer_name') + '" autocomplete="off">')}
                        ${UI.formGroup(I18n.t('mobile_number'), `<input type="tel" class="form-input" id="ol-mobile" placeholder="10-digit number" maxlength="10" inputmode="numeric" pattern="[0-9]*" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10); OldLoanPage.checkMobile()">
                            <span id="ol-mobile-err" class="form-hint" style="color:var(--danger);display:none;">Enter a valid 10-digit mobile number</span>`)}
                        ${UI.formGroup(I18n.t('locker_name'), '<input type="text" class="form-input" id="ol-locker" placeholder="e.g., Locker A-12">')}
                        ${UI.formGroup(I18n.t('caste'), '<input type="text" class="form-input" id="ol-caste" placeholder="Optional Caste">')}
                    </div>
                    <div class="form-group mb-3" style="position:relative;">
                        <label class="form-label">${I18n.t('address')} *</label>
                        <input type="text" class="form-input" id="ol-address" placeholder="Enter city / address" autocomplete="off" required
                            oninput="OldLoanPage.onAddressInput(this)">
                        <div id="ol-address-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; z-index:999; max-height:180px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.3);"></div>
                    </div>

                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;"><span data-i18n="jewelry_items">${I18n.t('jewelry_items')}</span> (up to ${MAX_ITEMS})</h4>
                    <div class="jewelry-items-list" id="ol-items-list"></div>
                    <div class="flex gap-1 mt-1 mb-2">
                        <button type="button" class="btn btn-outline btn-sm" id="ol-add-item-btn" onclick="OldLoanPage.addItem()" data-i18n="add_another_item">${I18n.t('add_another_item')}</button>
                    </div>
                    <div class="items-summary" id="ol-items-summary">
                        <div class="items-summary-item"><div class="items-summary-label">Total Items</div><div class="items-summary-value" id="ol-total-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Gold</div><div class="items-summary-value" id="ol-gold-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Silver</div><div class="items-summary-value" id="ol-silver-items">0</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Total Weight</div><div class="items-summary-value" id="ol-total-weight">0g</div></div>
                        <div class="items-summary-item"><div class="items-summary-label">Total Value</div><div class="items-summary-value" id="ol-total-value">₹0</div></div>
                    </div>

                    <!-- Jewellery Note -->
                    <div class="form-group mb-3 mt-2">
                        <label class="form-label" style="display:flex;align-items:center;gap:6px;">📝 <span>Jewellery Note</span> <span style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">(condition, damage, remarks)</span></label>
                        <textarea class="form-input" id="ol-jewellery-note" rows="3" maxlength="400"
                            placeholder="e.g. Chain broken, stone missing, scratched surface…"
                            style="resize:vertical;min-height:72px;"></textarea>
                        <span class="form-hint">Optional · Max 400 characters</span>
                    </div>

                    <h4 class="mb-1 mt-3" style="color:var(--primary);font-size:0.9rem;" data-i18n="loan_details">${I18n.t('loan_details')}</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup(I18n.t('loan_amount') + ' *', '<input type="number" class="form-input" id="ol-amount" required placeholder="' + I18n.t('loan_amount') + '" min="1" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup(I18n.t('interest_rate') + ' *', '<input type="number" class="form-input" id="ol-rate" required placeholder="e.g., 2" step="0.01" min="0.01" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()">')}
                        ${UI.formGroup(I18n.t('interest_period'), `<div class="segment-control" id="ol-period-group">
                            <button type="button" class="segment-btn active" data-value="monthly" onclick="OldLoanPage.setPeriod('monthly')" data-i18n="monthly">${I18n.t('monthly')}</button>
                            <button type="button" class="segment-btn" data-value="yearly" onclick="OldLoanPage.setPeriod('yearly')" data-i18n="yearly">${I18n.t('yearly')}</button>
                        </div>`)}
                        ${UI.formGroup(I18n.t('interest_type'), `<div class="segment-control" id="ol-type-group">
                            <button type="button" class="segment-btn active" data-value="simple" onclick="OldLoanPage.setType('simple')" data-i18n="simple">${I18n.t('simple')}</button>
                            <button type="button" class="segment-btn" data-value="compound" onclick="OldLoanPage.setType('compound')" data-i18n="compound">${I18n.t('compound')}</button>
                        </div>`)}
                    </div>
                    <div class="form-group mb-2" id="ol-compound-freq-wrap" style="display:none;">
                        <label class="form-label" data-i18n="compounding_freq">${I18n.t('compounding_freq')}</label>
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
                        ${UI.formGroup('Loan Duration', `<div class="form-row"><input type="number" class="form-input" id="ol-duration" placeholder="12" min="1" value="12" onkeydown="OldLoanPage.blockInvalidKey(event)" oninput="OldLoanPage.recalc()" style="flex:1;"><span style="color:var(--text-muted);font-size:0.85rem;" data-i18n="months">${I18n.t('months')}</span></div>`)}
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
                            <div class="calc-item"><div class="calc-item-label" data-i18n="total_interest">${I18n.t('total_interest')}</div><div class="calc-item-value" id="ol-calc-interest">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label">Remaining Interest</div><div class="calc-item-value" id="ol-calc-remaining">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label" data-i18n="total_payable">${I18n.t('total_payable')}</div><div class="calc-item-value" id="ol-calc-payable">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label">Months Elapsed</div><div class="calc-item-value" id="ol-calc-months">0</div></div>
                            <div class="calc-item"><div class="calc-item-label" data-i18n="ltv">${I18n.t('ltv')}</div><div class="calc-item-value" id="ol-calc-ltv">0%</div></div>
                            <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value" id="ol-calc-pl">₹0</div></div>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button type="button" class="btn btn-gold btn-lg" onclick="OldLoanPage.save()" data-i18n="save_loan">${I18n.t('save_loan')}</button>
                    </div>
                    <!-- Risk Analysis Panel -->
                    <div id="ol-risk-panel"></div>
                </form>
            </div>`;
        renderItems();

        // Mark draft as active; restore any saved draft
        _draft_active = true;
        restoreDraft();
    }

    function defaultItem() { return { metalType: 'gold', purity: '22K', customPurity: '', itemType: 'Ring', customItemType: '', weightGrams: '' }; }

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
                    ${item.itemType === 'Other' ? `
                    <div class="form-group">
                        <label class="form-label">Custom Item Name</label>
                        <input type="text" class="form-input" value="${item.customItemType || ''}" placeholder="Enter item name"
                            oninput="OldLoanPage.updateItem(${i},'customItemType',this.value)"
                            onblur="OldLoanPage.saveCustomItemName(${i})">
                    </div>` : ''}
                    <div class="form-group"><label class="form-label">Purity</label>
                        <select class="form-select" onchange="OldLoanPage.updateItem(${i},'purity',this.value)">
                            ${Calculator.buildItemPurityOptions(item.metalType, item.purity)}
                        </select></div>
                    ${isCustom ? `
                    <div class="form-group">
                        <label class="form-label">Custom Purity (%)</label>
                        <input type="number" class="form-input" value="${item.customPurity}" step="0.1" min="1" max="100" placeholder="e.g., 87.5"
                            onkeydown="OldLoanPage.blockInvalidKey(event)"
                            oninput="OldLoanPage.updateCustomPurity(${i}, this.value)"
                            onblur="OldLoanPage.saveCustomPurityNow(${i})">
                        <span class="form-hint">Enter purity as % (1–100)</span>
                    </div>` : ''}
                    <div class="form-group"><label class="form-label">Weight (g)</label>
                        <input type="number" class="form-input" value="${item.weightGrams}" step="0.01" min="0.01" placeholder="0.00"
                            onkeydown="OldLoanPage.blockInvalidKey(event)"
                            oninput="OldLoanPage.updateItem(${i},'weightGrams',this.value)"></div>
                </div>
                <div id="ol-item-value-${i}">
                    ${w > 0 ? `<div class="jewelry-item-value">Value: ${UI.currency(val)} (@ ₹${rate.toLocaleString('en-IN')}/g · ${(pf * 100).toFixed(1)}% purity)</div>` : ''}
                </div>
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
            _state.items[i].customItemType = '';
            renderItems();
            return;
        }
        if (f === 'purity') {
            if (v !== 'custom') {
                _state.items[i].customPurity = '';
            }
            renderItems();
            return;
        }
        if (f === 'itemType') {
            if (v !== 'Other') {
                _state.items[i].customItemType = '';
            }
            renderItems();
            return;
        }
        if (f === 'customItemType') {
            // Only update state; actual save happens onblur via saveCustomItemName()
            return;
        }
        if (f === 'weightGrams') {
            updateSummary();
            return;
        }
        renderItems(); recalc();
    }

    function updateCustomPurity(i, v) {
        _state.items[i].customPurity = v;
        // Note: actual save to localStorage happens onblur via saveCustomPurityNow()
        updateSummary(); recalc();
    }

    // Called onblur on the custom purity input — saves only the final entered value
    function saveCustomPurityNow(index) {
        const item = _state.items[index];
        if (!item) return;
        const pval = parseFloat(item.customPurity);
        if (pval > 0 && pval <= 100) {
            Calculator.saveCustomPurity(item.metalType, pval);
            renderItems(); // refresh dropdown to include saved purity
        }
    }

    // Called onblur from the custom item name input — saves only the final value (not each keystroke)
    function saveCustomItemName(index) {
        const item = _state.items[index];
        if (!item) return;
        const name = (item.customItemType || '').trim();
        if (name) {
            Calculator.saveCustomItemType(item.metalType, name);
            renderItems();
        }
    }

    // Live phone number validation — shows digit counter while typing
    function checkMobile() {
        const inp = document.getElementById('ol-mobile');
        const errEl = document.getElementById('ol-mobile-err');
        if (!inp || !errEl) return;
        const v = inp.value;
        if (v.length > 0 && v.length < 10) {
            const remaining = 10 - v.length;
            errEl.textContent = `${remaining} more digit${remaining !== 1 ? 's' : ''} needed (${v.length}/10)`;
            errEl.style.display = '';
        } else {
            errEl.style.display = 'none';
        }
    }

    function updateSummary() {
        const rates = Market.getCurrentRates();
        let totalGoldWeight = 0, totalSilverWeight = 0, totalValue = 0, goldItems = 0, silverItems = 0;
        _state.items.forEach((i, idx) => {
            const w = parseFloat(i.weightGrams) || 0;
            const pf = i.purity === 'custom' ? (parseFloat(i.customPurity) || 0) / 100 : Calculator.getPurityFactor(i.purity);
            const r = i.metalType === 'gold' ? rates.gold : rates.silver;
            const val = w * pf * r;

            const valEl = document.getElementById(`ol-item-value-${idx}`);
            if (valEl) {
                if (w > 0) {
                    valEl.innerHTML = `<div class="jewelry-item-value">Value: ${UI.currency(val)} (@ ₹${r.toLocaleString('en-IN')}/g · ${(pf * 100).toFixed(1)}% purity)</div>`;
                } else {
                    valEl.innerHTML = '';
                }
            }

            if (w <= 0) return;
            totalValue += val;
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

    // ─── DRAFT PERSISTENCE ──────────────────────────────────────────
    function saveDraft() {
        try {
            const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
            const draft = {
                customer:  g('ol-customer'),
                mobile:    g('ol-mobile'),
                locker:    g('ol-locker'),
                caste:     g('ol-caste'),
                address:   g('ol-address'),
                amount:    g('ol-amount'),
                rate:      g('ol-rate'),
                start:     g('ol-start'),
                duration:  g('ol-duration'),
                paidInt:   g('ol-paid-interest'),
                partial:   g('ol-partial'),
                penalty:   g('ol-penalty'),
                histRate:  g('ol-historical-rate'),
                status:    g('ol-status'),
                interestPeriod: _state.interestPeriod,
                interestType:   _state.interestType,
                compoundingFrequency: _state.compoundingFrequency,
                items: JSON.parse(JSON.stringify(_state.items)),
                ts: Date.now()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch(e) {}
    }

    function restoreDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const d = JSON.parse(raw);
            if (!d || !d.ts || Date.now() - d.ts > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(DRAFT_KEY);
                return;
            }
            const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== '') el.value = val; };
            set('ol-customer', d.customer);
            set('ol-mobile',   d.mobile);
            set('ol-locker',   d.locker);
            set('ol-caste',    d.caste);
            set('ol-address',  d.address);
            set('ol-amount',   d.amount);
            set('ol-rate',     d.rate);
            set('ol-start',    d.start);
            set('ol-duration', d.duration);
            set('ol-paid-interest', d.paidInt);
            set('ol-partial',  d.partial);
            set('ol-penalty',  d.penalty);
            set('ol-historical-rate', d.histRate);
            set('ol-status',   d.status);

            if (d.items && d.items.length) _state.items = d.items;
            if (d.interestPeriod) setPeriod(d.interestPeriod);
            if (d.interestType)   setType(d.interestType);
            if (d.compoundingFrequency) setFreq(d.compoundingFrequency);

            renderItems();
            recalc();
        } catch(e) {}
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
        _draft_active = false;
    }

    // ─── ADDRESS AUTOCOMPLETE ──────────────────────────────────────────
    function _getAddressHistory() {
        const seen = new Set(), list = [];
        try {
            (DB.getLoans() || []).forEach(l => {
                const a = (l.address || '').trim();
                if (a && !seen.has(a.toLowerCase())) { seen.add(a.toLowerCase()); list.push(a); }
            });
            (DB.getCustomers() || []).forEach(c => {
                const a = (c.address || '').trim();
                if (a && !seen.has(a.toLowerCase())) { seen.add(a.toLowerCase()); list.push(a); }
            });
        } catch(e) {}
        return list;
    }

    function onAddressInput(input) {
        const dd = document.getElementById('ol-address-dropdown');
        if (!dd) return;
        const query = (input.value || '').trim().toLowerCase();
        if (!query) { dd.style.display = 'none'; return; }
        const matches = _getAddressHistory().filter(a => a.toLowerCase().includes(query)).slice(0, 8);
        if (!matches.length) { dd.style.display = 'none'; return; }
        dd.innerHTML = matches.map(a =>
            `<div style="padding:10px 14px;cursor:pointer;font-size:0.88rem;color:var(--text-primary);border-bottom:1px solid var(--border-color);transition:background 0.15s;"
                onmouseover="this.style.background='var(--bg-input)'"
                onmouseout="this.style.background=''"
                onclick="document.getElementById('ol-address').value='${a.replace(/'/g, '\\&#39;')}'; document.getElementById('ol-address-dropdown').style.display='none';">
                📍 ${a}
            </div>`
        ).join('');
        dd.style.display = 'block';
        const hideDD = (e) => { if (!dd.contains(e.target) && e.target !== input) { dd.style.display = 'none'; document.removeEventListener('click', hideDD); } };
        document.addEventListener('click', hideDD);
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
        const jewelleryNote = (document.getElementById('ol-jewellery-note')?.value || '').trim().slice(0, 400);
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
            if (it.itemType === 'Other' && !it.customItemType?.trim()) {
                UI.toast(`Item #${idx + 1}: Please enter the custom item name`, 'error');
                return;
            }
        }

        if (!amount || amount <= 0) { UI.toast('Enter valid loan amount', 'error'); return; }
        if (!rate || rate <= 0) { UI.toast('Enter valid interest rate', 'error'); return; }
        if (!startDate) { UI.toast('Enter start date', 'error'); return; }

        const rates = Market.getCurrentRates();
        const items = validItems.map(i => ({
            itemType: i.itemType === 'Other' && i.customItemType ? i.customItemType : i.itemType, metalType: i.metalType, purity: i.purity,
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
            marketRateAtCreation: historicalRate || Market.getRate(dom),
            jewelleryNote: jewelleryNote || ''
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
        clearDraft(); // clear draft after successful save
        UI.toast('Old loan migrated!', 'success');
        UI.navigateTo('loans');
    }

    return { render, addItem, removeItem, updateItem, updateCustomPurity, saveCustomItemName, saveCustomPurityNow, checkMobile, onAddressInput, saveDraft, clearDraft, setPeriod, setType, setFreq, toggleHistorical, togglePanchang, saveOverride, recalc, save, blockInvalidKey, get _draft_active() { return _draft_active; } };
})();
