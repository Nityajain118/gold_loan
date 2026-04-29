/* ============================================
   New Loan Page — Multi-Item Jewelry Support
   ============================================ */
const NewLoanPage = (() => {
    let _state = { 
        interestPeriod: 'monthly', interestType: 'simple', compoundingFrequency: 12, 
        items: [], isManualTithi: false 
    };
    const MAX_ITEMS = 10;
    const DRAFT_KEY = 'gv_nl_draft';
    let _draft_active = false; // signals main.js hook that a draft exists to save

    function render(container) {
        _state.items = [defaultItem()];

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title" data-i18n="create_new_loan">${I18n.t('create_new_loan')}</h3>
                    <span class="status-badge active" data-i18n="new_loan">${I18n.t('new_loan')}</span>
                </div>
                <form id="new-loan-form" onsubmit="return false;">
                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;" data-i18n="customer_info">${I18n.t('customer_info')}</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup(I18n.t('customer_name') + ' *', '<input type="text" class="form-input" id="nl-customer" required placeholder="' + I18n.t('customer_name') + '" autocomplete="off">')}
                        ${UI.formGroup(I18n.t('mobile_number'), `<input type="tel" class="form-input" id="nl-mobile" placeholder="10-digit number" maxlength="10" inputmode="numeric" pattern="[0-9]*" oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10); NewLoanPage.checkMobile()">
                            <span id="nl-mobile-err" class="form-hint" style="color:var(--danger);display:none;">Enter a valid 10-digit mobile number</span>`)}
                        ${UI.formGroup(I18n.t('locker_name'), '<input type="text" class="form-input" id="nl-locker" placeholder="e.g., Locker A-12">')}
                        ${UI.formGroup(I18n.t('caste'), '<input type="text" class="form-input" id="nl-caste" placeholder="Optional Caste">')}
                    </div>
                    <div class="form-group mb-3" style="position:relative;">
                        <label class="form-label" data-i18n="address">${I18n.t('address')}</label>
                        <input type="text" class="form-input" id="nl-address" placeholder="Enter city / address (optional)" autocomplete="off"
                            oninput="NewLoanPage.onAddressInput(this)">
                        <div id="nl-address-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; z-index:999; max-height:180px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.3);"></div>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label" data-i18n="customer_photo">${I18n.t('customer_photo')}</label>
                        <div id="nl-customer-photo-wrap">${ImageUpload.renderUploader('nl-customer-photo', null, { label: 'Upload Customer Photo', compact: true, type: 'customer' })}</div>
                    </div>

                    <h4 class="mb-1" style="color:var(--primary);font-size:0.9rem;"><span data-i18n="jewelry_items">${I18n.t('jewelry_items')}</span> (up to ${MAX_ITEMS})</h4>
                    <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:12px;">Add each jewelry item separately. One person can pledge up to ${MAX_ITEMS} items.</p>
                    <div class="jewelry-items-list" id="nl-items-list"></div>
                    <div class="flex gap-1 mt-1 mb-2">
                        <button type="button" class="btn btn-outline btn-sm" id="nl-add-item-btn" onclick="NewLoanPage.addItem()" data-i18n="add_another_item">${I18n.t('add_another_item')}</button>
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

                    <h4 class="mb-1 mt-3" style="color:var(--primary);font-size:0.9rem;" data-i18n="loan_details">${I18n.t('loan_details')}</h4>
                    <div class="form-grid mb-2">
                        ${UI.formGroup(I18n.t('loan_amount'), '<input type="number" class="form-input" id="nl-amount" required placeholder="' + I18n.t('loan_amount') + '" min="1" onkeydown="NewLoanPage.blockInvalidKey(event)" oninput="NewLoanPage.recalc()">')}
                        ${UI.formGroup(I18n.t('interest_rate'), '<input type="number" class="form-input" id="nl-rate" required placeholder="e.g., 2" step="0.01" min="0.01" onkeydown="NewLoanPage.blockInvalidKey(event)" oninput="NewLoanPage.recalc()">')}
                        ${UI.formGroup(I18n.t('interest_period'), `
                            <div class="segment-control" id="nl-period-group">
                                <button type="button" class="segment-btn active" data-value="monthly" onclick="NewLoanPage.setPeriod('monthly')" data-i18n="monthly">${I18n.t('monthly')}</button>
                                <button type="button" class="segment-btn" data-value="yearly" onclick="NewLoanPage.setPeriod('yearly')" data-i18n="yearly">${I18n.t('yearly')}</button>
                            </div>`)}
                        ${UI.formGroup(I18n.t('interest_type'), `
                            <div class="segment-control" id="nl-type-group">
                                <button type="button" class="segment-btn active" data-value="simple" onclick="NewLoanPage.setType('simple')" data-i18n="simple">${I18n.t('simple')}</button>
                                <button type="button" class="segment-btn" data-value="compound" onclick="NewLoanPage.setType('compound')" data-i18n="compound">${I18n.t('compound')}</button>
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
                        <h4 style="font-size:0.9rem;margin-bottom:16px;color:var(--primary);" data-i18n="calc_preview">${I18n.t('calc_preview')}</h4>
                        <div class="calc-grid">
                            <div class="calc-item"><div class="calc-item-label" data-i18n="total_interest">${I18n.t('total_interest')}</div><div class="calc-item-value" id="nl-calc-interest">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label" data-i18n="total_payable">${I18n.t('total_payable')}</div><div class="calc-item-value" id="nl-calc-payable">₹0</div></div>
                            <div class="calc-item"><div class="calc-item-label" data-i18n="ltv">${I18n.t('ltv')}</div><div class="calc-item-value" id="nl-calc-ltv">0%</div></div>
                            <div class="calc-item"><div class="calc-item-label" data-i18n="maturity_date">${I18n.t('maturity_date')}</div><div class="calc-item-value" id="nl-calc-maturity" style="font-size:0.95rem;">—</div></div>
                            <div class="calc-item"><div class="calc-item-label">Maturity Tithi</div><div class="calc-item-value" id="nl-calc-maturity-tithi" style="font-size:0.8rem;">—</div></div>
                            <div class="calc-item"><div class="calc-item-label">Effective Annual Rate</div><div class="calc-item-value" id="nl-calc-ear">0%</div></div>
                            <div class="calc-item"><div class="calc-item-label">Break-even Price</div><div class="calc-item-value" id="nl-calc-breakeven">₹0/g</div></div>
                            <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value" id="nl-calc-pl">₹0</div></div>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-3">
                        <button type="button" class="btn btn-gold btn-lg" onclick="NewLoanPage.save()" data-i18n="save_loan">${I18n.t('save_loan')}</button>
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

        // Mark draft as active (navigateTo hook will call saveDraft on leave)
        _draft_active = true;

        // Restore any saved draft
        restoreDraft();
    }

    function defaultItem() {
        return { metalType: 'gold', purity: '22K', customPurity: '', itemType: 'Ring', customItemType: '', weightGrams: '' };
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
                        <label class="form-label" data-i18n="metal">${I18n.t('metal')}</label>
                        <select class="form-select" onchange="NewLoanPage.updateItem(${i},'metalType',this.value)">
                            <option value="gold" ${item.metalType === 'gold' ? 'selected' : ''}>🥇 Gold</option>
                            <option value="silver" ${item.metalType === 'silver' ? 'selected' : ''}>🥈 Silver</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" data-i18n="item_type">${I18n.t('item_type')}</label>
                        <select class="form-select" onchange="NewLoanPage.updateItem(${i},'itemType',this.value)">
                            ${types.map(t => `<option value="${t}" ${item.itemType === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>
                    ${item.itemType === 'Other' ? `
                    <div class="form-group">
                        <label class="form-label">Custom Item Name</label>
                        <input type="text" class="form-input" value="${item.customItemType || ''}" placeholder="Enter item name"
                            oninput="NewLoanPage.updateItem(${i},'customItemType',this.value)"
                            onblur="NewLoanPage.saveCustomItemName(${i})">
                    </div>` : ''}
                    <div class="form-group">
                        <label class="form-label" data-i18n="purity">${I18n.t('purity')}</label>
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
                            oninput="NewLoanPage.updateCustomPurity(${i}, this.value)"
                            onblur="NewLoanPage.saveCustomPurityNow(${i})">
                        <span class="form-hint">Enter purity as % (1–100)</span>
                    </div>` : ''}
                    <div class="form-group">
                        <label class="form-label" data-i18n="weight_g">${I18n.t('weight_g')}</label>
                        <input type="number" class="form-input" value="${item.weightGrams}" step="0.01" min="0.01" placeholder="0.00"
                            onkeydown="NewLoanPage.blockInvalidKey(event)"
                            oninput="NewLoanPage.updateItem(${i},'weightGrams',this.value)">
                    </div>
                </div>
                <div class="form-group mt-1">
                    <label class="form-label" data-i18n="item_photo">${I18n.t('item_photo')}</label>
                    ${ImageUpload.renderUploader('nl-item-photo-' + i, item.photo || null, { label: 'Upload Gold Item Photo', compact: true, type: 'gold' })}
                </div>
                <div id="nl-item-value-${i}">
                    ${weight > 0 ? `<div class="jewelry-item-value">Value: ${UI.currency(val)} (@ ₹${rate.toLocaleString('en-IN')}/g · ${(purityFactor * 100).toFixed(1)}% purity)</div>` : ''}
                </div>
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
            _state.items[index].customItemType = '';
            renderItems();
            return;
        }
        if (field === 'purity') {
            if (value !== 'custom') {
                _state.items[index].customPurity = '';
            }
            renderItems();
            return;
        }
        if (field === 'itemType') {
            if (value !== 'Other') {
                _state.items[index].customItemType = '';
            }
            renderItems();
            return;
        }
        if (field === 'customItemType') {
            // Only update state; actual save happens onblur via saveCustomItemName()
            return;
        }
        if (field === 'weightGrams') {
            updateSummary();
            return;
        }
        renderItems();
    }

    function updateCustomPurity(index, value) {
        _state.items[index].customPurity = value;
        // Note: actual save to localStorage happens onblur via saveCustomPurityNow()
        updateSummary();
        recalc();
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
            renderItems(); // refresh dropdown so item appears going forward
        }
    }

    // Live phone number validation — shows digit counter while typing
    function checkMobile() {
        const inp = document.getElementById('nl-mobile');
        const errEl = document.getElementById('nl-mobile-err');
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
        const items = _state.items.map((i, idx) => {
            const purityFactor = i.purity === 'custom'
                ? (parseFloat(i.customPurity) || 0) / 100
                : Calculator.getPurityFactor(i.purity);
            const w = parseFloat(i.weightGrams) || 0;
            const rate = i.metalType === 'gold' ? rates.gold : rates.silver;
            const val = w * purityFactor * rate;

            const valEl = document.getElementById(`nl-item-value-${idx}`);
            if (valEl) {
                if (w > 0) {
                    valEl.innerHTML = `<div class="jewelry-item-value">Value: ${UI.currency(val)} (@ ₹${rate.toLocaleString('en-IN')}/g · ${(purityFactor * 100).toFixed(1)}% purity)</div>`;
                } else {
                    valEl.innerHTML = '';
                }
            }

            return { ...i, weightGrams: w, purityFactor, _value: val };
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

        // Safe Loan Amount = Total Metal Value × LTV percentage (covers gold + silver)
        const settings = DB.getSettings();
        const ltvPercentage = settings.ltvPercentage || 75;
        const safeLoanAmount = totalValue * (ltvPercentage / 100);

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
        // Use totalValue (all metals) so silver loans also show a safe loan amount
        const safeLoanAmount = totalValue * (ltvPercentage / 100);
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

    // ─── DRAFT PERSISTENCE ───────────────────────────────────────────
    // Reads current form field values and saves them along with _state to localStorage.
    function saveDraft() {
        try {
            const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
            const draft = {
                customer: g('nl-customer'),
                mobile:   g('nl-mobile'),
                locker:   g('nl-locker'),
                caste:    g('nl-caste'),
                address:  g('nl-address'),
                amount:   g('nl-amount'),
                rate:     g('nl-rate'),
                start:    g('nl-start'),
                duration: g('nl-duration'),
                interestPeriod: _state.interestPeriod,
                interestType:   _state.interestType,
                compoundingFrequency: _state.compoundingFrequency,
                isManualTithi: _state.isManualTithi,
                items: JSON.parse(JSON.stringify(_state.items)), // deep clone
                ts: Date.now()
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch(e) { /* silent */ }
    }

    // Restores a saved draft into the current form (called after render).
    function restoreDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return;
            const d = JSON.parse(raw);
            // Don't restore drafts older than 24 hours
            if (!d || !d.ts || Date.now() - d.ts > 24 * 60 * 60 * 1000) {
                localStorage.removeItem(DRAFT_KEY);
                return;
            }
            const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
            set('nl-customer', d.customer);
            set('nl-mobile',   d.mobile);
            set('nl-locker',   d.locker);
            set('nl-caste',    d.caste);
            set('nl-address',  d.address);
            set('nl-amount',   d.amount);
            set('nl-rate',     d.rate);
            set('nl-start',    d.start);
            set('nl-duration', d.duration);

            // Restore _state
            if (d.items && d.items.length) _state.items = d.items;
            if (d.interestPeriod)  setPeriod(d.interestPeriod);
            if (d.interestType)    setType(d.interestType);
            if (d.compoundingFrequency) setFreq(d.compoundingFrequency);

            renderItems();
            recalc();

            // Show a subtle banner so user knows draft was restored
            const banner = document.createElement('div');
            banner.style.cssText = 'background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);border-radius:8px;padding:8px 14px;font-size:0.82rem;color:var(--primary);margin-bottom:12px;display:flex;align-items:center;gap:8px;';
            banner.innerHTML = `📝 <strong>Draft restored</strong> — your previous progress was saved. <button onclick="NewLoanPage.clearDraft();this.closest('div').remove()" style="margin-left:auto;border:none;background:transparent;color:var(--danger);cursor:pointer;font-size:0.8rem;">✕ Clear</button>`;
            const form = document.getElementById('new-loan-form');
            if (form) form.insertBefore(banner, form.firstChild);
        } catch(e) { /* silent */ }
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
        _draft_active = false;
    }

    // ─── ADDRESS AUTOCOMPLETE ──────────────────────────────────────────
    // Collects unique, non-empty addresses from all loans and customers in DB.
    function _getAddressHistory() {
        const seen = new Set();
        const list = [];
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

    // Called oninput on the address field — filters and renders suggestions.
    function onAddressInput(input) {
        const dd = document.getElementById('nl-address-dropdown');
        if (!dd) return;
        const query = (input.value || '').trim().toLowerCase();
        if (!query) { dd.style.display = 'none'; return; }
        const matches = _getAddressHistory().filter(a => a.toLowerCase().includes(query)).slice(0, 8);
        if (!matches.length) { dd.style.display = 'none'; return; }
        dd.innerHTML = matches.map(a =>
            `<div style="padding:10px 14px;cursor:pointer;font-size:0.88rem;color:var(--text-primary);border-bottom:1px solid var(--border-color);transition:background 0.15s;"
                onmouseover="this.style.background='var(--bg-input)'"
                onmouseout="this.style.background=''"
                onclick="document.getElementById('nl-address').value='${a.replace(/'/g, '\\&#39;')}'; document.getElementById('nl-address-dropdown').style.display='none';">
                📍 ${a}
            </div>`
        ).join('');
        dd.style.display = 'block';
        // Hide dropdown when clicking outside
        const hideDD = (e) => { if (!dd.contains(e.target) && e.target !== input) { dd.style.display = 'none'; document.removeEventListener('click', hideDD); } };
        document.addEventListener('click', hideDD);
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
        const casteEl = document.getElementById('nl-caste');
        const caste = casteEl ? casteEl.value.trim() : '';

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
            if (it.itemType === 'Other' && !it.customItemType?.trim()) {
                UI.toast(`Item #${idx + 1}: Please enter the custom item name`, 'error');
                return;
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
                itemType: validItem.itemType === 'Other' && validItem.customItemType ? validItem.customItemType : validItem.itemType,
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
            address, caste,
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

        // ── Customer resolution (phone-first, NEVER merge by name) ───────────
        // Rule: if mobile provided AND matches an existing customer → same person.
        //       Otherwise → always create a NEW customer record.
        const customers = DB.getCustomers();
        let resolvedCustomer = null;

        if (mobile) {
            resolvedCustomer = customers.find(c => c.mobile === mobile) || null;
        }

        if (!resolvedCustomer) {
            // New person — create fresh record
            resolvedCustomer = DB.saveCustomer({ name: customer, mobile, address, caste, totalLoans: 1 });
        } else {
            // Same person (matched by phone) — update counts & optional fields
            resolvedCustomer.totalLoans = (resolvedCustomer.totalLoans || 0) + 1;
            if (address) resolvedCustomer.address = address;
            if (caste) resolvedCustomer.caste = caste;
            DB.saveCustomer(resolvedCustomer);
        }

        // Attach customerId so ledger lookups are reliable
        loan.customerId = resolvedCustomer.id;

        DB.saveLoan(loan);
        clearDraft(); // clear draft after successful save
        UI.toast('Loan created successfully!', 'success');
        UI.navigateTo('loans');
    }

    return { render, addItem, removeItem, updateItem, updateCustomPurity, saveCustomItemName, saveCustomPurityNow, checkMobile, onAddressInput, saveDraft, clearDraft, setPeriod, setType, setFreq, togglePanchang, saveOverride, recalc, save, blockInvalidKey, _state, get _draft_active() { return _draft_active; } };
})();
