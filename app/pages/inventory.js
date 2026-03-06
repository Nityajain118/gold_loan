/* ============================================
   Inventory Page — Gold/Silver Item Management
   ============================================ */
const InventoryPage = (() => {
    let _filter = { metal: 'all', category: 'all', search: '' };
    let _editingId = null;

    const CATEGORIES = [
        'Necklace', 'Ring', 'Bracelet', 'Earrings', 'Chain', 'Bangles',
        'Pendant', 'Anklet', 'Mangalsutra', 'Coin', 'Bar', 'Nose Pin',
        'Maang Tikka', 'Waist Belt', 'Payal', 'Idol', 'Utensil', 'Other'
    ];

    function render(container) {
        _editingId = null;
        const rates = Market.getCurrentRates();

        container.innerHTML = `
            <div class="inv-layout">
                <!-- ---- Add / Edit Form ---- -->
                <div class="card inv-form-card">
                    <div class="card-header">
                        <h3 class="card-title" id="inv-form-title">📦 Add Gold Item</h3>
                        <span class="status-badge active" id="inv-form-badge">New</span>
                    </div>
                    <form id="inv-form" onsubmit="return false;">
                        <div class="form-grid">
                            ${UI.formGroup('Item Name *', '<input type="text" class="form-input" id="inv-name" required placeholder="e.g., Gold Necklace 22K">')}
                            ${UI.formGroup('Category *', `
                                <select class="form-select" id="inv-category">
                                    ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                                </select>`)}
                            ${UI.formGroup('Metal Type', `
                                <div class="segment-control" id="inv-metal-group">
                                    <button type="button" class="segment-btn active" data-value="gold" onclick="InventoryPage.setMetal('gold')">🥇 Gold</button>
                                    <button type="button" class="segment-btn" data-value="silver" onclick="InventoryPage.setMetal('silver')">🥈 Silver</button>
                                </div>`)}
                            ${UI.formGroup('Purity', `
                                <select class="form-select" id="inv-purity" onchange="InventoryPage.onPurityChange()">
                                    ${buildPurityOptions('gold')}
                                </select>`)}
                            <div class="form-group" id="inv-custom-purity-group" style="display:none;">
                                <label class="form-label">Custom Purity (%)</label>
                                <input type="number" class="form-input inv-custom-input" id="inv-custom-purity"
                                       placeholder="e.g., 87.5" step="0.1" min="1" max="100"
                                       oninput="InventoryPage.calcPreview()">
                                <span class="form-hint">Enter purity as a percentage (1–100%)</span>
                            </div>
                            ${UI.formGroup('Weight (grams) *', '<input type="number" class="form-input" id="inv-weight" required placeholder="0.00" step="0.01" min="0.01" oninput="InventoryPage.calcPreview()">')}
                            ${UI.formGroup('Notes', '<input type="text" class="form-input" id="inv-notes" placeholder="Optional notes">')}
                        </div>

                        <!-- Live value preview -->
                        <div class="inv-preview" id="inv-preview">
                            <div class="inv-preview-row">
                                <span>Market Rate</span>
                                <strong id="inv-prev-rate">₹${rates.gold.toLocaleString('en-IN')}/g</strong>
                            </div>
                            <div class="inv-preview-row">
                                <span>Purity Factor</span>
                                <strong id="inv-prev-purity">91.67%</strong>
                            </div>
                            <div class="inv-preview-row inv-preview-total">
                                <span>Estimated Value</span>
                                <strong id="inv-prev-value">₹0</strong>
                            </div>
                        </div>

                        <div class="flex gap-2 mt-2">
                            <button type="button" class="btn btn-gold btn-lg" onclick="InventoryPage.save()">💾 Save Item</button>
                            <button type="button" class="btn btn-outline btn-sm" id="inv-cancel-btn" style="display:none;" onclick="InventoryPage.cancelEdit()">Cancel</button>
                        </div>
                    </form>
                </div>

                <!-- ---- Summary Cards ---- -->
                <div class="inv-summary-row" id="inv-summary">
                    ${renderSummaryCards()}
                </div>

                <!-- ---- Filter Bar ---- -->
                <div class="card inv-list-card">
                    <div class="card-header">
                        <h3 class="card-title">📋 Inventory Items</h3>
                    </div>
                    <div class="inv-filter-bar">
                        <input type="text" class="form-input inv-search" id="inv-search"
                               placeholder="🔍 Search items..." oninput="InventoryPage.applyFilter()">
                        <select class="form-select inv-filter-select" id="inv-filter-metal" onchange="InventoryPage.applyFilter()">
                            <option value="all">All Metals</option>
                            <option value="gold">🥇 Gold</option>
                            <option value="silver">🥈 Silver</option>
                        </select>
                        <select class="form-select inv-filter-select" id="inv-filter-category" onchange="InventoryPage.applyFilter()">
                            <option value="all">All Categories</option>
                            ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>

                    <!-- ---- Inventory List ---- -->
                    <div id="inv-list"></div>
                </div>
            </div>`;

        renderList();
        calcPreview();
    }

    // --- Purity helpers ---
    function buildPurityOptions(metal) {
        const types = Calculator.getMetalSubTypes(metal);
        let opts = types.map(p => {
            const pct = (Calculator.getPurityFactor(p) * 100).toFixed(1);
            return `<option value="${p}">${p} (${pct}%)</option>`;
        }).join('');
        opts += '<option value="custom">✏️ Custom Purity</option>';
        return opts;
    }

    function setMetal(metal) {
        document.getElementById('inv-metal-group').querySelectorAll('.segment-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.value === metal)
        );
        const purSel = document.getElementById('inv-purity');
        purSel.innerHTML = buildPurityOptions(metal);
        document.getElementById('inv-custom-purity-group').style.display = 'none';
        calcPreview();
    }

    function getSelectedMetal() {
        const active = document.querySelector('#inv-metal-group .segment-btn.active');
        return active ? active.dataset.value : 'gold';
    }

    function onPurityChange() {
        const val = document.getElementById('inv-purity').value;
        document.getElementById('inv-custom-purity-group').style.display = val === 'custom' ? '' : 'none';
        calcPreview();
    }

    function getEffectivePurityFactor() {
        const purSel = document.getElementById('inv-purity').value;
        if (purSel === 'custom') {
            const custom = parseFloat(document.getElementById('inv-custom-purity').value);
            return (custom && custom > 0 && custom <= 100) ? custom / 100 : 0;
        }
        return Calculator.getPurityFactor(purSel);
    }

    // --- Live preview ---
    function calcPreview() {
        const metal = getSelectedMetal();
        const rates = Market.getCurrentRates();
        const rate = metal === 'gold' ? rates.gold : rates.silver;
        const purityFactor = getEffectivePurityFactor();
        const weight = parseFloat(document.getElementById('inv-weight')?.value) || 0;
        const value = weight * purityFactor * rate;

        const el = id => document.getElementById(id);
        if (el('inv-prev-rate')) el('inv-prev-rate').textContent = `₹${rate.toLocaleString('en-IN')}/g`;
        if (el('inv-prev-purity')) el('inv-prev-purity').textContent = (purityFactor * 100).toFixed(1) + '%';
        if (el('inv-prev-value')) el('inv-prev-value').textContent = UI.currency(value);
    }

    // --- Save ---
    function save() {
        const name = document.getElementById('inv-name').value.trim();
        const category = document.getElementById('inv-category').value;
        const metal = getSelectedMetal();
        const puritySelect = document.getElementById('inv-purity').value;
        const weight = parseFloat(document.getElementById('inv-weight').value);
        const notes = document.getElementById('inv-notes').value.trim();

        if (!name) { UI.toast('Please enter item name', 'error'); return; }
        if (!weight || weight <= 0) { UI.toast('Please enter valid weight', 'error'); return; }

        let purity = puritySelect;
        let customPurity = null;
        if (puritySelect === 'custom') {
            const cp = parseFloat(document.getElementById('inv-custom-purity').value);
            if (!cp || cp <= 0 || cp > 100) { UI.toast('Enter a valid custom purity (1–100%)', 'error'); return; }
            customPurity = cp;
            purity = 'custom';
        }

        const rates = Market.getCurrentRates();
        const rate = metal === 'gold' ? rates.gold : rates.silver;
        const purityFactor = purity === 'custom' ? customPurity / 100 : Calculator.getPurityFactor(purity);
        const estimatedValue = weight * purityFactor * rate;

        const item = {
            itemName: name,
            category,
            metalType: metal,
            purity,
            customPurity,
            weightGrams: weight,
            estimatedValue,
            notes
        };

        if (_editingId) {
            item.id = _editingId;
        }

        DB.saveInventoryItem(item);
        UI.toast(_editingId ? 'Item updated!' : 'Item added to inventory!', 'success');
        _editingId = null;
        resetForm();
        renderList();
        renderSummaryInPlace();
    }

    function resetForm() {
        document.getElementById('inv-form').reset();
        setMetal('gold');
        document.getElementById('inv-custom-purity-group').style.display = 'none';
        document.getElementById('inv-form-title').textContent = '📦 Add Gold Item';
        document.getElementById('inv-form-badge').textContent = 'New';
        document.getElementById('inv-form-badge').className = 'status-badge active';
        document.getElementById('inv-cancel-btn').style.display = 'none';
        _editingId = null;
        calcPreview();
    }

    function cancelEdit() {
        resetForm();
    }

    // --- Edit ---
    function editItem(id) {
        const item = DB.getInventoryItem(id);
        if (!item) return;

        _editingId = id;
        document.getElementById('inv-name').value = item.itemName || '';
        document.getElementById('inv-category').value = item.category || 'Other';
        setMetal(item.metalType || 'gold');

        const purSel = document.getElementById('inv-purity');
        if (item.purity === 'custom') {
            purSel.value = 'custom';
            document.getElementById('inv-custom-purity-group').style.display = '';
            document.getElementById('inv-custom-purity').value = item.customPurity || '';
        } else {
            purSel.value = item.purity;
            document.getElementById('inv-custom-purity-group').style.display = 'none';
        }

        document.getElementById('inv-weight').value = item.weightGrams || '';
        document.getElementById('inv-notes').value = item.notes || '';

        document.getElementById('inv-form-title').textContent = '✏️ Edit Item';
        document.getElementById('inv-form-badge').textContent = 'Editing';
        document.getElementById('inv-form-badge').className = 'status-badge monitor';
        document.getElementById('inv-cancel-btn').style.display = '';

        calcPreview();
        document.getElementById('inv-name').focus();
        document.getElementById('inv-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Delete ---
    async function deleteItem(id) {
        const confirmed = await UI.confirm('Delete Item', 'Are you sure you want to remove this item from inventory?');
        if (!confirmed) return;
        DB.deleteInventoryItem(id);
        UI.toast('Item removed', 'info');
        if (_editingId === id) resetForm();
        renderList();
        renderSummaryInPlace();
    }

    // --- Summary ---
    function getSummary() {
        const inventory = DB.getInventory();
        const rates = Market.getCurrentRates();
        let totalGoldWeight = 0, totalSilverWeight = 0, totalValue = 0, goldCount = 0, silverCount = 0;

        inventory.forEach(item => {
            const w = item.weightGrams || 0;
            const rate = item.metalType === 'gold' ? rates.gold : rates.silver;
            const pf = item.purity === 'custom'
                ? (item.customPurity || 0) / 100
                : Calculator.getPurityFactor(item.purity);
            const val = w * pf * rate;

            if (item.metalType === 'gold') {
                totalGoldWeight += w;
                goldCount++;
            } else {
                totalSilverWeight += w;
                silverCount++;
            }
            totalValue += val;
        });

        return { total: inventory.length, goldCount, silverCount, totalGoldWeight, totalSilverWeight, totalValue };
    }

    function renderSummaryCards() {
        const s = getSummary();
        return `
            <div class="inv-summary-card">
                <div class="inv-summary-icon">📦</div>
                <div class="inv-summary-val">${s.total}</div>
                <div class="inv-summary-label">Total Items</div>
            </div>
            <div class="inv-summary-card gold-card">
                <div class="inv-summary-icon">🥇</div>
                <div class="inv-summary-val">${s.goldCount} <small>(${s.totalGoldWeight.toFixed(2)}g)</small></div>
                <div class="inv-summary-label">Gold Items</div>
            </div>
            <div class="inv-summary-card silver-card">
                <div class="inv-summary-icon">🥈</div>
                <div class="inv-summary-val">${s.silverCount} <small>(${s.totalSilverWeight.toFixed(2)}g)</small></div>
                <div class="inv-summary-label">Silver Items</div>
            </div>
            <div class="inv-summary-card value-card">
                <div class="inv-summary-icon">💰</div>
                <div class="inv-summary-val">${UI.currency(s.totalValue)}</div>
                <div class="inv-summary-label">Total Estimated Value</div>
            </div>`;
    }

    function renderSummaryInPlace() {
        const el = document.getElementById('inv-summary');
        if (el) el.innerHTML = renderSummaryCards();
    }

    // --- List / Filter ---
    function applyFilter() {
        _filter.search = (document.getElementById('inv-search')?.value || '').toLowerCase();
        _filter.metal = document.getElementById('inv-filter-metal')?.value || 'all';
        _filter.category = document.getElementById('inv-filter-category')?.value || 'all';
        renderList();
    }

    function renderList() {
        const listEl = document.getElementById('inv-list');
        if (!listEl) return;

        const inventory = DB.getInventory();
        const rates = Market.getCurrentRates();

        // Apply filters
        const filtered = inventory.filter(item => {
            if (_filter.metal !== 'all' && item.metalType !== _filter.metal) return false;
            if (_filter.category !== 'all' && item.category !== _filter.category) return false;
            if (_filter.search) {
                const txt = (item.itemName + ' ' + item.category + ' ' + item.metalType + ' ' + item.purity + ' ' + (item.notes || '')).toLowerCase();
                if (!txt.includes(_filter.search)) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div class="inv-empty">
                    <div class="inv-empty-icon">📦</div>
                    <p>${inventory.length === 0 ? 'No items in inventory yet. Add your first gold item above!' : 'No items match your filters.'}</p>
                </div>`;
            return;
        }

        listEl.innerHTML = `
            <div class="inv-table-wrap">
                <table class="inv-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th>Metal</th>
                            <th>Purity</th>
                            <th>Weight</th>
                            <th>Est. Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(item => {
            const rate = item.metalType === 'gold' ? rates.gold : rates.silver;
            const pf = item.purity === 'custom'
                ? (item.customPurity || 0) / 100
                : Calculator.getPurityFactor(item.purity);
            const val = (item.weightGrams || 0) * pf * rate;
            const metalIcon = item.metalType === 'gold' ? '🥇' : '🥈';
            const purityLabel = item.purity === 'custom'
                ? `${(item.customPurity || 0)}%`
                : item.purity;

            return `<tr>
                                <td class="inv-item-name">
                                    <span class="inv-item-icon">${metalIcon}</span>
                                    <div>
                                        <div class="inv-item-title">${item.itemName}</div>
                                        ${item.notes ? `<div class="inv-item-note">${item.notes}</div>` : ''}
                                    </div>
                                </td>
                                <td><span class="inv-cat-badge">${item.category}</span></td>
                                <td>${item.metalType === 'gold' ? 'Gold' : 'Silver'}</td>
                                <td>${purityLabel}</td>
                                <td>${(item.weightGrams || 0).toFixed(2)}g</td>
                                <td class="inv-val">${UI.currency(val)}</td>
                                <td class="inv-actions">
                                    <button class="btn btn-outline btn-xs" onclick="InventoryPage.editItem('${item.id}')" title="Edit">✏️</button>
                                    <button class="btn btn-outline btn-xs btn-danger-outline" onclick="InventoryPage.deleteItem('${item.id}')" title="Delete">🗑️</button>
                                </td>
                            </tr>`;
        }).join('')}
                    </tbody>
                </table>
            </div>`;

        // Also render mobile-friendly cards below the table
        listEl.innerHTML += `
            <div class="inv-card-list">
                ${filtered.map(item => {
            const rate = item.metalType === 'gold' ? rates.gold : rates.silver;
            const pf = item.purity === 'custom'
                ? (item.customPurity || 0) / 100
                : Calculator.getPurityFactor(item.purity);
            const val = (item.weightGrams || 0) * pf * rate;
            const metalIcon = item.metalType === 'gold' ? '🥇' : '🥈';
            const purityLabel = item.purity === 'custom'
                ? `${(item.customPurity || 0)}%`
                : item.purity;

            return `<div class="inv-card-item">
                        <div class="inv-card-top">
                            <span class="inv-card-icon">${metalIcon}</span>
                            <div class="inv-card-info">
                                <div class="inv-card-name">${item.itemName}</div>
                                <div class="inv-card-meta">${item.category} · ${purityLabel} · ${(item.weightGrams || 0).toFixed(2)}g</div>
                                ${item.notes ? `<div class="inv-card-note">${item.notes}</div>` : ''}
                            </div>
                            <div class="inv-card-value">${UI.currency(val)}</div>
                        </div>
                        <div class="inv-card-actions">
                            <button class="btn btn-outline btn-xs" onclick="InventoryPage.editItem('${item.id}')">✏️ Edit</button>
                            <button class="btn btn-outline btn-xs btn-danger-outline" onclick="InventoryPage.deleteItem('${item.id}')">🗑️ Delete</button>
                        </div>
                    </div>`;
        }).join('')}
            </div>`;
    }

    return {
        render, setMetal, onPurityChange, calcPreview,
        save, cancelEdit, editItem, deleteItem, applyFilter
    };
})();
