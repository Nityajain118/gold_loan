/* ============================================
   Customers Page — Village-Wise Smart Grouping
   ============================================ */
const CustomersPage = (() => {
    // Per-village state: expanded, sort order, search query
    const _state = {
        expanded: {},   // { village: true/false }
        sortOrder: {},  // { village: 'asc'/'desc' }
        searches: {},   // { village: 'query' }
        globalSearchQuery: '', // stores global search to persist across renders
        selectedCustomerId: sessionStorage.getItem('GV_selectedCustomerId') || null
    };

    // ── Scroll-to-Selected Helper ────────────────────────────────────────────
    // Smart scroll: keeps the selected card visible with padding, respects sticky headers
    let _scrollRAF = null;
    function _scrollToSelectedCard(customerId, behavior = 'smooth') {
        if (!customerId) return;
        if (_scrollRAF) cancelAnimationFrame(_scrollRAF);
        _scrollRAF = requestAnimationFrame(() => {
            const card = document.querySelector(`.vc-card[data-id="${customerId}"]`);
            if (!card) return;

            // Find the scrollable container (.main-content)
            const scrollContainer = card.closest('.main-content') || document.querySelector('.main-content');
            if (!scrollContainer) {
                // Fallback: plain scrollIntoView
                card.scrollIntoView({ behavior, block: 'nearest' });
                return;
            }

            const cardRect = card.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Calculate effective top considering sticky elements (top-bar, filter-bar, village-header)
            const stickyTopBar = document.querySelector('.top-bar');
            const filterBar = document.querySelector('.filter-bar');
            const villageHeader = card.closest('.village-section')?.querySelector('.village-header');

            let stickyTopOffset = 0;
            if (stickyTopBar) stickyTopOffset += stickyTopBar.getBoundingClientRect().height;
            if (filterBar) stickyTopOffset += filterBar.getBoundingClientRect().height;
            if (villageHeader) stickyTopOffset += villageHeader.getBoundingClientRect().height;

            const PADDING = 20; // comfortable visual padding
            const effectiveTop = containerRect.top + stickyTopOffset + PADDING;
            const effectiveBottom = containerRect.bottom - PADDING - 60; // 60px for bottom nav

            // Check if card is already fully visible with padding
            if (cardRect.top >= effectiveTop && cardRect.bottom <= effectiveBottom) {
                return; // Already visible, no scroll needed
            }

            // Calculate scroll amount
            let scrollDelta = 0;
            if (cardRect.top < effectiveTop) {
                // Card is above visible area — scroll up
                scrollDelta = cardRect.top - effectiveTop;
            } else if (cardRect.bottom > effectiveBottom) {
                // Card is below visible area — scroll down
                scrollDelta = cardRect.bottom - effectiveBottom;
            }

            scrollContainer.scrollBy({
                top: scrollDelta,
                behavior: behavior
            });
        });
    }

    // ── Select & Track Customer ──────────────────────────────────────────────
    function _selectCustomer(customerId) {
        if (!customerId || _state.selectedCustomerId === customerId) return;
        _state.selectedCustomerId = customerId;
        sessionStorage.setItem('GV_selectedCustomerId', customerId);

        // Update visual selection
        document.querySelectorAll('.vc-card.vc-selected').forEach(el => el.classList.remove('vc-selected'));
        const card = document.querySelector(`.vc-card[data-id="${customerId}"]`);
        if (card) card.classList.add('vc-selected');
    }

    // ── Main Render ──────────────────────────────────────────────────────────
    function render(container) {
        const allCustomers = DB.getCustomers();
        const rawCustomers = FirmManager.filterCustomers(allCustomers);
        const allLoans = DB.getLoans();
        const loans = FirmManager.filterLoans(allLoans);
        const activeFirm = FirmManager.getSelected();

        // ── Combine customers by mobile to handle multi-firm entries ─────────
        const customersMap = {};
        rawCustomers.forEach(c => {
            const key = (c.mobile && c.mobile.length === 10) ? 'mob:' + c.mobile : 'id:' + c.id;
            if (!customersMap[key]) {
                customersMap[key] = { ...c, _allFirmIds: c.firm_id ? [c.firm_id] : [] };
            } else {
                if (c.firm_id && !customersMap[key]._allFirmIds.includes(c.firm_id)) {
                    customersMap[key]._allFirmIds.push(c.firm_id);
                }
                if (!customersMap[key].photo && c.photo) customersMap[key].photo = c.photo;
                if (!customersMap[key].address && c.address) customersMap[key].address = c.address;
                // Merge settlements safely
                if (c.settlements && c.settlements.length > 0) {
                    customersMap[key].settlements = [...(customersMap[key].settlements || []), ...c.settlements];
                }
            }
        });
        const customers = Object.values(customersMap);

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

        // Check if skeleton is already rendered
        const isUpdate = !!container.querySelector('#village-sections');

        if (!isUpdate) {
            container.innerHTML = `
            <div class="flex justify-between align-center mb-3">
                <div class="page-title" data-i18n="customers">${I18n.t('customers')}
                    <span class="text-muted font-normal" style="font-size:0.9rem;margin-left:6px;" id="cust-count-badge">(${customers.length})</span>
                </div>
                <button class="btn btn-primary btn-sm" onclick="CustomersPage.showAdd()" data-i18n="add_customer">${I18n.t('add_customer')}</button>
            </div>
            <div class="filter-bar mb-3" style="position: sticky; top: 0; z-index: 100; background: var(--bg); padding-bottom: 10px; padding-top: 5px;">
                <div style="position: relative;">
                    <input type="text" class="search-input full-width" id="cust-global-search"
                        placeholder="Search by Name, Mobile, Address, Loan #..."
                        value="${_state.globalSearchQuery || ''}"
                        oninput="CustomersPage.globalSearch(this.value)"
                        onkeydown="CustomersPage.handleSearchKey(event)"
                        onblur="setTimeout(() => { const dd = document.getElementById('global-search-dropdown'); if(dd) dd.style.display = 'none'; }, 200)"
                        autocomplete="off">
                    <div id="global-search-dropdown" class="search-dropdown-overlay" style="display:none; position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--bg-card); border:1.5px solid var(--border-color); border-radius:10px; z-index:1100; max-height:280px; overflow-y:auto; box-shadow:0 12px 32px rgba(0,0,0,0.35); opacity:0; transform:translateY(-10px); transition:opacity 0.2s, transform 0.2s;"></div>
                </div>
            </div>
            <div id="village-sections"></div>`;
        } else {
            // Update the count badge
            const badge = container.querySelector('#cust-count-badge');
            if (badge) badge.textContent = `(${customers.length})`;
        }

        let sectionsHtml = '';

        villageKeys.forEach(village => {
            const rawList  = grouped[village];
            const sortOrd  = _state.sortOrder[village] || 'asc';
            const query    = _state.searches[village] || '';
            const isExpanded = !!_state.expanded[village];

            const sorted   = sortCustomers(rawList, sortOrd);
            let filtered = query
                ? sorted.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    (c.mobile || '').includes(query))
                : sorted;

            // Apply Global Search filter at data level so slicing works correctly
            if (_state.globalSearchQuery) {
                const gq = _state.globalSearchQuery.toLowerCase().trim();
                filtered = filtered.filter(c => {
                    const cLoans = loans.filter(l => l.customerId === c.id || (c.mobile && l.mobile === c.mobile));
                    const loanMatched = cLoans.some(l => l.id.toLowerCase().includes(gq) || (l.lockerName || '').toLowerCase().includes(gq));
                    return (c.name || '').toLowerCase().includes(gq) ||
                           (c.mobile || '').includes(gq) ||
                           (c.address || '').toLowerCase().includes(gq) ||
                           (c.caste || '').toLowerCase().includes(gq) ||
                           (c.gstin || '').toLowerCase().includes(gq) ||
                           loanMatched;
                });
            }

            if (filtered.length === 0) return; // Skip rendering this village entirely if no matches

            const displayed = (isExpanded || filtered.length <= 5)
                ? filtered
                : filtered.slice(0, 5);

            // Village-level stats
            const villageLoans  = loans.filter(l =>
                rawList.some(c =>
                    l.customerId === c.id ||
                    (c.mobile && c.mobile.length === 10 && l.mobile === c.mobile)
                ) && l.status !== 'closed'
            );
            const totalLent = villageLoans.reduce((s, l) => s + l.loanAmount, 0);

            sectionsHtml += `
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
                ${filtered.length > 5 ? `
                <div class="village-footer">
                    <button class="btn btn-outline btn-sm" onclick="CustomersPage.toggleExpand('${_esc(village)}')">
                        ${isExpanded
                            ? `▲ Show Less`
                            : `▼ View All ${filtered.length} Customers`}
                    </button>
                </div>` : ''}
            </div>`;
        });

        const sectionsContainer = container.querySelector('#village-sections');
        if (sectionsContainer) {
            sectionsContainer.innerHTML = sectionsHtml || `<div style="text-align:center; padding: 40px; color: var(--text-muted);">No customers found matching "${_state.globalSearchQuery}"</div>`;
        }

        // Apply highlighting to the newly rendered cards if a global search is active
        if (_state.globalSearchQuery) {
            document.querySelectorAll('.vc-card').forEach(card => card.classList.add('search-highlight'));
        }

        // ── Restore selection & scroll after render ──────────────────────────
        _restoreSelectionAfterRender();
    }

    // ── Auto-expand village + scroll to previously selected customer ─────
    function _restoreSelectionAfterRender() {
        const savedId = _state.selectedCustomerId;
        if (!savedId) return;

        // Check if the card is already rendered
        let card = document.querySelector(`.vc-card[data-id="${savedId}"]`);

        // If not visible, check if it's in a collapsed village group
        if (!card) {
            // Find which village contains this customer and expand it
            const allCustomers = DB.getCustomers();
            const cust = allCustomers.find(c => c.id === savedId);
            if (cust) {
                const village = (cust.address && cust.address.trim()) ? cust.address.trim() : 'Unknown / No Address';
                if (!_state.expanded[village]) {
                    _state.expanded[village] = true;
                    // Re-render to expand, then try again
                    render(document.getElementById('page-container'));
                    return; // render will call this function again
                }
            }
        }

        // Apply visual selection and scroll
        if (card || (card = document.querySelector(`.vc-card[data-id="${savedId}"]`))) {
            card.classList.add('vc-selected');
            // Use a short delay so the DOM is fully laid out
            setTimeout(() => _scrollToSelectedCard(savedId, 'auto'), 100);
        }
    }

    // ── Single Customer Card ───────────────────────────────────────────────
    function _customerCard(c, loans) {
        let firmBadge = '';
        if (c._allFirmIds && c._allFirmIds.length > 0) {
            firmBadge = c._allFirmIds.map(fid => FirmManager.getBadgeHtml(fid)).join(' ');
        } else {
            firmBadge = FirmManager.getBadgeHtml(c?.firm_id);
        }
        const activeLoans = loans.filter(l =>
            (l.customerId === c.id ||
             (c.mobile && c.mobile.length === 10 && l.mobile === c.mobile)) &&
            l.status !== 'closed'
        );
        const hasSettlements = c.settlements && c.settlements.length > 0;

        const isSelected = _state.selectedCustomerId === c.id;
        return `
        <div class="vc-card kn-focusable${isSelected ? ' vc-selected' : ''}" data-id="${c.id}" onclick="CustomersPage.selectAndOpen('${c.id}')" style="cursor:pointer;">
            <div class="vc-top">
                <div class="vc-avatar">
                    ${c.photo
                        ? `<img src="${c.photo}" class="vc-avatar-img" />`
                        : `<div class="vc-avatar-placeholder">${(c.name||'?')[0].toUpperCase()}</div>`}
                </div>
                <div class="vc-info">
                    <div class="vc-name">${c.name} ${firmBadge}</div>
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
                    onclick="event.stopPropagation(); CustomersPage.selectAndOpen('${c.id}')">📒 Khata</button>
                <button class="btn btn-sm" style="flex:1;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.4);color:var(--gold-dark);"
                    onclick="event.stopPropagation(); CustomersPage.openHisab('${c.id}')">🤝 Hisab</button>
                <button class="btn btn-ghost btn-sm text-danger"
                    onclick="event.stopPropagation(); CustomersPage.del('${c.id}')">🗑️</button>
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

    let _searchDebounceTimer = null;
    let _searchSuggestions = [];
    let _searchSelectedIndex = -1;

    function globalSearch(query) {
        _state.globalSearchQuery = query; 
        
        // Re-render sections immediately to apply the filter to the lists
        // Since we separated the header, this won't lose input focus!
        render(document.getElementById('page-container'));

        clearTimeout(_searchDebounceTimer);
        const dd = document.getElementById('global-search-dropdown');
        if (!dd) return;

        const q = query.toLowerCase().trim();
        if (!q) {
            dd.style.display = 'none';
            dd.classList.remove('show');
            _searchSuggestions = [];
            _searchSelectedIndex = -1;
            return;
        }

        _searchDebounceTimer = setTimeout(() => {
            const customers = DB.getCustomers();
            const loans = DB.getLoans();
            
            // Powerful string matching
            _searchSuggestions = customers.filter(cust => {
                const cLoans = loans.filter(l => l.customerId === cust.id || (cust.mobile && l.mobile === cust.mobile));
                const loanMatched = cLoans.some(l => l.id.toLowerCase().includes(q) || (l.lockerName || '').toLowerCase().includes(q));
                
                return (cust.name || '').toLowerCase().includes(q) ||
                       (cust.mobile || '').includes(q) ||
                       (cust.address || '').toLowerCase().includes(q) ||
                       (cust.caste || '').toLowerCase().includes(q) ||
                       (cust.gstin || '').toLowerCase().includes(q) ||
                       loanMatched;
            });

            if (_searchSuggestions.length === 0) {
                dd.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);">No matching customers found.</div>`;
                dd.style.display = 'block';
                
                // Hide all cards since no match
                document.querySelectorAll('.vc-card').forEach(c => c.style.display = 'none');
                document.querySelectorAll('.village-section').forEach(s => s.style.display = 'none');
                return;
            }

            // Priority sorting: Exact Name > Exact Village > Partial Name > Partial Addr > Mobile
            _searchSuggestions.sort((a, b) => {
                const aN = (a.name || '').toLowerCase(), bN = (b.name || '').toLowerCase();
                const aA = (a.address || '').toLowerCase(), bA = (b.address || '').toLowerCase();
                const aM = a.mobile || '', bM = b.mobile || '';
                
                const getScore = (name, addr, mob) => {
                    if (name === q) return 100;
                    if (addr === q) return 90;
                    if (name.includes(q)) return 80;
                    if (addr.includes(q)) return 70;
                    if (mob.includes(q)) return 60;
                    return 50;
                };
                return getScore(bN, bA, bM) - getScore(aN, aA, aM);
            });

            const topResults = _searchSuggestions.slice(0, 7);
            
            dd.innerHTML = topResults.map((cust, idx) => {
                const cLoans = loans.filter(l => (l.customerId === cust.id || (cust.mobile && l.mobile === cust.mobile)) && l.status !== 'closed');
                const badge = cLoans.length > 0 ? `<span class="badge badge-primary" style="margin-left:8px;font-size:0.7rem;">${cLoans.length} Active</span>` : '';
                return `
                    <div class="search-dropdown-item" data-idx="${idx}" data-id="${cust.id}" onclick="UI.navigateTo('customer-ledger', '${cust.id}')"
                         style="padding:12px 16px; border-bottom:1px solid var(--border-color); cursor:pointer; display:flex; align-items:center; transition:background 0.2s;">
                        <div style="flex:1;">
                            <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">
                                ${cust.name.replace(new RegExp(q, 'gi'), match => `<span style="color:var(--primary);">${match}</span>`)}
                                ${badge}
                            </div>
                            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
                                📞 ${cust.mobile ? cust.mobile.replace(new RegExp(q, 'gi'), match => `<span style="font-weight:bold;color:var(--text-primary);">${match}</span>`) : 'No Mobile'} 
                                ${cust.address ? ` • 📍 ${cust.address.replace(new RegExp(q, 'gi'), match => `<span style="font-weight:bold;color:var(--text-primary);">${match}</span>`)}` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            _searchSelectedIndex = -1;
            dd.style.display = 'block';
            setTimeout(() => dd.classList.add('show'), 10);
            
            // Note: Background filtering is now handled natively by render() above!

        }, 150);
    }

    function handleSearchKey(e) {
        const dd = document.getElementById('global-search-dropdown');
        if (!dd || dd.style.display === 'none' || _searchSuggestions.length === 0) return;

        const items = dd.querySelectorAll('.search-dropdown-item');
        const max = Math.min(_searchSuggestions.length, 7);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _searchSelectedIndex = (_searchSelectedIndex + 1) % max;
            _updateSearchHighlight(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _searchSelectedIndex = (_searchSelectedIndex - 1 + max) % max;
            _updateSearchHighlight(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_searchSelectedIndex >= 0 && _searchSelectedIndex < max) {
                items[_searchSelectedIndex].click();
            } else if (max === 1) {
                items[0].click();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            dd.style.display = 'none';
            document.getElementById('cust-global-search').blur();
        }
    }

    function _updateSearchHighlight(items) {
        items.forEach((item, idx) => {
            if (idx === _searchSelectedIndex) {
                item.style.background = 'rgba(59, 130, 246, 0.1)';
                item.style.borderLeft = '3px solid var(--primary)';
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.style.background = 'transparent';
                item.style.borderLeft = 'none';
            }
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
        const firms = FirmManager.getAll();
        const defaultFirmId = FirmManager.getDefaultFirmId();
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
            ${firms.length > 0 ? `
            <div class="form-group mb-2">
                <label class="form-label">🏢 Select Firm *</label>
                <select class="form-select" id="add-cust-firm">
                    ${firms.map(f => `<option value="${f.id}" ${f.id === defaultFirmId ? 'selected' : ''}>${f.name}${f.isMain ? ' (Main)' : ''}</option>`).join('')}
                </select>
            </div>` : ''}
            
            <div style="border-top: 1px solid var(--border-color); margin: 12px 0; padding-top: 12px;">
                <h4 style="font-size: 0.9rem; color: var(--primary); margin-bottom: 8px;">🏛️ GST Details (Optional)</h4>
                <div class="form-group mb-2">
                    <label class="form-label">GSTIN</label>
                    <input type="text" class="form-input" id="add-cust-gstin" maxlength="15" placeholder="15-digit GSTIN" style="text-transform:uppercase">
                </div>
                <div class="form-group mb-2">
                    <label class="form-label">Billing State Code</label>
                    <select class="form-select" id="add-cust-state">
                        <option value="">-- Select State --</option>
                        ${typeof GST !== 'undefined' ? Object.entries(GST.STATE_CODES).map(([code, name]) => `<option value="${code}">${code} - ${name}</option>`).join('') : ''}
                    </select>
                </div>
            </div>
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
        const firmEl  = document.getElementById('add-cust-firm');
        const firm_id = firmEl ? firmEl.value : FirmManager.getDefaultFirmId();
        
        const gstin = document.getElementById('add-cust-gstin')?.value.toUpperCase().trim() || '';
        const stateCode = document.getElementById('add-cust-state')?.value || '';

        const newCust = DB.saveCustomer({ name, mobile, address, photo: photo || '', totalLoans: 0, firm_id, gstin, stateCode });

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

    // ── Select and navigate to customer ledger ─────────────────────────────
    function selectAndOpen(customerId) {
        _selectCustomer(customerId);
        UI.navigateTo('customer-ledger', customerId);
    }

    return {
        render, filter, globalSearch, handleSearchKey,
        toggleSort, toggleExpand, villageSearch,
        showAdd, saveNew, del,
        openHisab, updateSettlementDiff, processSettlement,
        selectAndOpen
    };
})();
