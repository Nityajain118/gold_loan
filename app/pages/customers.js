/* ============================================
   Customers Page — Village-Wise Smart Grouping
   ============================================ */
const CustomersPage = (() => {
    // Per-village state: expanded, sort order, search query
    const _state = {
        expanded: {},   // { village: true/false }
        sortOrder: {},  // { village: 'asc'/'desc' }
        searches: {}    // { village: 'query' }
    };

    // ── Main Render ──────────────────────────────────────────────────────────
    function render(container) {
        const customers = DB.getCustomers();
        const loans     = DB.getLoans();

        if (customers.length === 0) {
            container.innerHTML = `
            <div class="flex justify-between align-center mb-3">
                <div class="page-title" data-i18n="customers">${I18n.t('customers')}</div>
                <button class="btn btn-primary btn-sm" onclick="CustomersPage.showAdd()" data-i18n="add_customer">${I18n.t('add_customer')}</button>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <h3 data-i18n="no_customers">${I18n.t('no_customers')}</h3>
                <p data-i18n="no_customers_desc">${I18n.t('no_customers_desc')}</p>
            </div>`;
            return;
        }

        // ── Group by address/village ─────────────────────────────────────────
        const grouped = {};
        customers.forEach(c => {
            const village = (c.address && c.address.trim()) ? c.address.trim() : 'Unknown / No Address';
            if (!grouped[village]) grouped[village] = [];
            grouped[village].push(c);
        });

        const villageKeys = Object.keys(grouped).sort();

        // ── Global header + global search ────────────────────────────────────
        let html = `
        <div class="flex justify-between align-center mb-3">
            <div class="page-title" data-i18n="customers">${I18n.t('customers')}
                <span class="text-muted font-normal" style="font-size:0.9rem;margin-left:6px;">(${customers.length})</span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="CustomersPage.showAdd()" data-i18n="add_customer">${I18n.t('add_customer')}</button>
        </div>
        <div class="filter-bar mb-3">
            <input type="text" class="search-input full-width" id="cust-global-search"
                placeholder="${I18n.t('search_customers')}"
                oninput="CustomersPage.globalSearch(this.value)">
        </div>
        <div id="village-sections">`;

        villageKeys.forEach(village => {
            const rawList  = grouped[village];
            const sortOrd  = _state.sortOrder[village] || 'asc';
            const query    = _state.searches[village] || '';
            const isExpanded = !!_state.expanded[village];

            const sorted   = sortCustomers(rawList, sortOrd);
            const filtered = query
                ? sorted.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    (c.mobile || '').includes(query))
                : sorted;

            const displayed = (isExpanded || filtered.length <= 3)
                ? filtered
                : filtered.slice(0, 3);

            // Village-level stats
            const villageLoans  = loans.filter(l =>
                rawList.some(c =>
                    l.customerId === c.id ||
                    (c.mobile && c.mobile.length === 10 && l.mobile === c.mobile)
                ) && l.status !== 'closed'
            );
            const totalLent = villageLoans.reduce((s, l) => s + l.loanAmount, 0);

            html += `
            <div class="village-section mb-4" id="vs-${_slugify(village)}">
                <!-- Village Header -->
                <div class="village-header">
                    <div class="village-header-left">
                        <span class="village-icon">📍</span>
                        <div>
                            <div class="village-name">${village}</div>
                            <div class="village-meta">
                                ${rawList.length} customer${rawList.length !== 1 ? 's' : ''}
                                ${totalLent > 0 ? ` &nbsp;·&nbsp; Active: ${UI.currency(totalLent)}` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="village-header-right">
                        <button class="btn btn-ghost btn-xs village-sort-btn"
                            onclick="CustomersPage.toggleSort('${_esc(village)}')"
                            title="Toggle sort order">
                            ${sortOrd === 'asc' ? '⬆ A→Z' : '⬇ Z→A'}
                        </button>
                    </div>
                </div>

                <!-- Per-village search -->
                <div class="village-search-wrap">
                    <input type="text" class="search-input" placeholder="Search in ${village}…"
                        value="${query}"
                        oninput="CustomersPage.villageSearch('${_esc(village)}', this.value)">
                </div>

                <!-- Customer Cards Grid -->
                <div class="village-cards-grid">
                    ${displayed.length === 0
                        ? `<p class="text-muted" style="padding:12px 0;">No customers match the search.</p>`
                        : displayed.map(c => _customerCard(c, loans)).join('')
                    }
                </div>

                <!-- View All / Show Less -->
                ${filtered.length > 3 ? `
                <div class="village-footer">
                    <button class="btn btn-outline btn-sm" onclick="CustomersPage.toggleExpand('${_esc(village)}')">
                        ${isExpanded
                            ? `▲ Show Less`
                            : `▼ View All ${filtered.length} Customers`}
                    </button>
                </div>` : ''}
            </div>`;
        });

        html += `</div>`; // #village-sections
        container.innerHTML = html;
    }

    // ── Single Customer Card ───────────────────────────────────────────────
    function _customerCard(c, loans) {
        const activeLoans = loans.filter(l =>
            (l.customerId === c.id ||
             (c.mobile && c.mobile.length === 10 && l.mobile === c.mobile)) &&
            l.status !== 'closed'
        );
        const hasSettlements = c.settlements && c.settlements.length > 0;

        return `
        <div class="vc-card" data-id="${c.id}">
            <div class="vc-top">
                <div class="vc-avatar">
                    ${c.photo
                        ? `<img src="${c.photo}" class="vc-avatar-img" />`
                        : `<div class="vc-avatar-placeholder">${(c.name||'?')[0].toUpperCase()}</div>`}
                </div>
                <div class="vc-info">
                    <div class="vc-name">${c.name}</div>
                    <div class="vc-phone">${c.mobile || 'No Mobile'}</div>
                    ${c.address ? `<div class="vc-address">📍 ${c.address}</div>` : ''}
                </div>
                <div class="vc-badges">
                    ${activeLoans.length > 0
                        ? `<span class="badge badge-primary">${activeLoans.length} Loan${activeLoans.length > 1 ? 's' : ''}</span>`
                        : hasSettlements
                            ? `<span class="badge" style="background:var(--safe);color:#fff;">Settled</span>`
                            : `<span class="badge badge-neutral">No Loans</span>`}
                </div>
            </div>
            <div class="vc-actions">
                <button class="btn btn-outline btn-sm" style="flex:1;"
                    onclick="UI.navigateTo('customer-ledger', '${c.id}')">📘 Ledger</button>
                <button class="btn btn-sm" style="flex:1;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.4);color:var(--gold-dark);"
                    onclick="CustomersPage.openHisab('${c.id}')">🤝 Hisab</button>
                <button class="btn btn-ghost btn-sm text-danger"
                    onclick="CustomersPage.del('${c.id}')">🗑️</button>
            </div>
        </div>`;
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    function sortCustomers(list, order) {
        return [...list].sort((a, b) =>
            order === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        );
    }

    function _slugify(s) {
        return s.replace(/[^a-zA-Z0-9]/g, '_');
    }

    function _esc(s) {
        return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    // ── Interactive Controls ───────────────────────────────────────────────
    function toggleSort(village) {
        _state.sortOrder[village] = (_state.sortOrder[village] || 'asc') === 'asc' ? 'desc' : 'asc';
        render(document.getElementById('page-container'));
    }

    function toggleExpand(village) {
        _state.expanded[village] = !_state.expanded[village];
        render(document.getElementById('page-container'));
    }

    function villageSearch(village, query) {
        _state.searches[village] = query.toLowerCase().trim();
        const q = _state.searches[village];

        // Fast path: update cards in-place without full re-render
        const slug = _slugify(village);
        const section = document.getElementById('vs-' + slug);
        if (!section) { render(document.getElementById('page-container')); return; }

        const cards = section.querySelectorAll('.vc-card');
        let visibleCount = 0;
        cards.forEach(card => {
            const id   = card.dataset.id;
            const cust = DB.getCustomer(id);
            if (!cust) return;
            const match = !q ||
                (cust.name    || '').toLowerCase().includes(q) ||
                (cust.mobile  || '').includes(q) ||
                (cust.address || '').toLowerCase().includes(q) ||
                (cust.caste   || '').toLowerCase().includes(q);
            card.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });

        // Show/hide empty message
        let emptyMsg = section.querySelector('.village-empty-msg');
        const grid   = section.querySelector('.village-cards-grid');
        if (visibleCount === 0 && grid) {
            if (!emptyMsg) {
                emptyMsg = document.createElement('p');
                emptyMsg.className = 'village-empty-msg text-muted';
                emptyMsg.style.padding = '12px 0';
                grid.appendChild(emptyMsg);
            }
            emptyMsg.textContent = 'No customers match the search.';
        } else if (emptyMsg) {
            emptyMsg.remove();
        }
    }

    function globalSearch(query) {
        const q = query.toLowerCase().trim();
        document.querySelectorAll('.vc-card').forEach(card => {
            const id   = card.dataset.id;
            const cust = DB.getCustomer(id);
            if (!cust) return;
            const match = !q ||
                (cust.name    || '').toLowerCase().includes(q) ||
                (cust.mobile  || '').includes(q) ||
                (cust.address || '').toLowerCase().includes(q) ||
                (cust.caste   || '').toLowerCase().includes(q);
            card.style.display = match ? '' : 'none';
        });
        // Hide village sections where all cards are hidden
        document.querySelectorAll('.village-section').forEach(sec => {
            const visible = [...sec.querySelectorAll('.vc-card')].some(
                c => c.style.display !== 'none'
            );
            sec.style.display = visible ? '' : 'none';
        });
    }

    function filter() { /* legacy no-op kept for compatibility */ }

    // ── Hisab / Settlement Modal ───────────────────────────────────────────
    function openHisab(customerId) {
        const customer = DB.getCustomer(customerId);
        if (!customer) return;

        const custLoans = DB.getLoans().filter(l =>
            (l.customerId === customer.id ||
             (customer.mobile && customer.mobile.length === 10 && l.mobile === customer.mobile)) &&
            l.status !== 'closed'
        );

        if (custLoans.length === 0) {
            UI.toast('No active loans to settle.', 'warning');
            return;
        }

        const settings = DB.getSettings();
        let totalPayable  = 0;
        let totalPrincipal = 0;

        custLoans.forEach(loan => {
            const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
            const d    = Calculator.calcLoanDetails(loan, rate);
            totalPayable  += d.totalPayable;
            totalPrincipal += d.remainingPrincipal;
        });

        const totalInterest = totalPayable - totalPrincipal;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'settlement-modal';

        overlay.innerHTML = `
        <div class="modal card" style="max-width:450px;">
            <h3 class="modal-title">🤝 Hisab / Settlement</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem;">
                Settling ${custLoans.length} active loan(s) for <strong>${customer.name}</strong>
            </p>
            <div class="calc-grid mb-3">
                <div class="calc-item"><div class="calc-item-label">Total Loan Amount</div><div class="calc-item-value">${UI.currency(totalPrincipal)}</div></div>
                <div class="calc-item"><div class="calc-item-label">Total Interest</div><div class="calc-item-value">${UI.currency(totalInterest)}</div></div>
                <div class="calc-item" style="grid-column:span 2;"><div class="calc-item-label">Total Payable</div><div class="calc-item-value" style="font-size:1.4rem;color:var(--danger);">${UI.currency(totalPayable)}</div></div>
            </div>
            <div class="form-group mb-3">
                <label class="form-label">Final Paid Amount (₹)</label>
                <input type="number" class="form-input font-semibold" id="settle-paid-input"
                    placeholder="Enter amount received"
                    oninput="CustomersPage.updateSettlementDiff(${totalPayable}, this.value)">
            </div>
            <div class="flex justify-between align-center p-2 rounded mb-3" style="background:var(--bg-input);">
                <span class="font-semibold">Difference:</span>
                <span id="settle-difference" class="font-bold text-danger" style="font-size:1.2rem;">${UI.currency(totalPayable)}</span>
            </div>
            <div class="flex gap-2">
                <button class="btn btn-outline" style="flex:1;" onclick="CustomersPage.processSettlement('${customerId}',${totalPayable},'adjust')">Adjust & Close</button>
                <button class="btn btn-gold" style="flex:1;" onclick="CustomersPage.processSettlement('${customerId}',${totalPayable},'discount')">Discount & Close</button>
            </div>
            <button class="btn btn-ghost full-width mt-2" onclick="document.getElementById('settlement-modal').remove()">Cancel</button>
        </div>`;

        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    function updateSettlementDiff(total, paidInput) {
        const paid = parseFloat(paidInput) || 0;
        const diff = total - paid;
        const el   = document.getElementById('settle-difference');
        if (el) {
            el.innerHTML  = UI.currency(diff);
            el.className  = 'font-bold ' + (diff !== 0 ? 'text-danger' : 'safe');
        }
    }

    async function processSettlement(customerId, total, type) {
        const paid = parseFloat(document.getElementById('settle-paid-input').value) || 0;
        if (paid < 0)   { UI.toast('Please enter a valid paid amount.', 'error'); return; }
        if (paid > total) { UI.toast('Paid amount cannot exceed total payable.', 'error'); return; }

        const diff       = total - paid;
        const actionText = type === 'adjust' ? 'Write-off / Adjust Remaining' : 'Give Discount';

        if (!await UI.confirm('Confirm Settlement', `Close this account with ${actionText} of ${UI.currency(diff)}? All active loans will be marked closed.`)) return;

        const customer = DB.getCustomer(customerId);
        if (!customer) return;

        const loans = DB.getLoans().filter(l =>
            (l.customerId === customer.id ||
             (customer.mobile && customer.mobile.length === 10 && l.mobile === customer.mobile)) &&
            l.status !== 'closed'
        );

        let paidRemaining = paid;
        loans.forEach(l => {
            const settings = DB.getSettings();
            const rate = l.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
            const d    = Calculator.calcLoanDetails(l, rate);
            const loanTotal = d.totalPayable;

            let loanPaid = 0;
            if (paidRemaining >= loanTotal) { loanPaid = loanTotal; paidRemaining -= loanTotal; }
            else { loanPaid = paidRemaining; paidRemaining = 0; }

            const loanDiff = loanTotal - loanPaid;
            l.status = 'closed';
            l.settlement = {
                date: new Date().toISOString(),
                totalAmount: loanTotal,
                paidAmount:  loanPaid,
                discount:    type === 'discount' ? loanDiff : 0,
                adjustment:  type === 'adjust'   ? loanDiff : 0,
                status: 'CLOSED'
            };
            DB.saveLoan(l);
        });

        customer.settlements = customer.settlements || [];
        customer.settlements.push({
            date:       new Date().toISOString(),
            totalAmount: total,
            paidAmount:  paid,
            discount:    type === 'discount' ? diff : 0,
            adjustment:  type === 'adjust'   ? diff : 0,
            status: 'CLOSED'
        });
        DB.saveCustomer(customer);

        document.getElementById('settlement-modal').remove();
        UI.toast('Settlement successful! All active loans closed.', 'success');
        render(document.getElementById('page-container'));
    }

    // ── Add Customer Modal ─────────────────────────────────────────────────
    function showAdd() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">
            <h3 class="modal-title">➕ Add Customer</h3>
            <div class="form-group mb-2"><label class="form-label">Name *</label><input type="text" class="form-input" id="add-cust-name" placeholder="Customer full name"></div>
            <div class="form-group mb-2">
                <label class="form-label">Mobile (10 digits)</label>
                <input type="tel" class="form-input" id="add-cust-mobile" maxlength="10" placeholder="10-digit number"
                    inputmode="numeric" pattern="[0-9]*"
                    oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)">
                <span id="add-cust-mobile-err" class="form-hint" style="color:var(--danger);display:none;">Enter a valid 10-digit mobile number</span>
            </div>
            <div class="form-group mb-2"><label class="form-label">Village / Address</label><textarea class="form-textarea" id="add-cust-address" placeholder="e.g. Mumbai, Badnagar…"></textarea></div>
            <div class="form-group mb-2">
                <label class="form-label">📸 Customer Photo</label>
                ${ImageUpload.renderUploader('add-cust-photo', null, { label: 'Upload Photo', compact: true, type: 'customer' })}
            </div>
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="CustomersPage.saveNew()">Save</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    function saveNew() {
        const name    = document.getElementById('add-cust-name').value.trim();
        if (!name)    { UI.toast('Enter customer name', 'error'); return; }
        const mobile  = document.getElementById('add-cust-mobile').value.trim();
        const mobileErr = document.getElementById('add-cust-mobile-err');
        if (mobile && !/^\d{10}$/.test(mobile)) {
            if (mobileErr) mobileErr.style.display = '';
            UI.toast('Mobile number must be exactly 10 digits', 'error');
            return;
        }
        if (mobileErr) mobileErr.style.display = 'none';
        const photo   = ImageUpload.getImageData('add-cust-photo');
        const address = document.getElementById('add-cust-address').value.trim();

        const newCust = DB.saveCustomer({ name, mobile, address, photo: photo || '', totalLoans: 0 });

        if (typeof JewelleryDataService !== 'undefined') {
            JewelleryDataService.upsertMaster({ name, mobile, village: address, moduleId: 'gold', sourceId: newCust.id });
        }

        document.querySelector('.modal-overlay').remove();
        UI.toast('✅ Customer added!', 'success');
        render(document.getElementById('page-container'));
    }

    async function del(id) {
        if (await UI.confirm('Delete', 'Remove this customer?')) {
            DB.deleteCustomer(id);
            UI.toast('Deleted', 'success');
            render(document.getElementById('page-container'));
        }
    }

    return {
        render, filter, globalSearch,
        toggleSort, toggleExpand, villageSearch,
        showAdd, saveNew, del,
        openHisab, updateSettlementDiff, processSettlement
    };
})();
