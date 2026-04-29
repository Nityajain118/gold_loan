/* ============================================
   Loan List Page — Customer-Grouped 3-Level Drill-Down
   ============================================ */
const LoanListPage = (() => {
    const _state = { view: 'customers', groupKey: null, metal: null, search: '', status: 'all' };
    let _groups = {}; // { groupKey: { info, loans[] } }

    // ── Group loans into customer buckets (crash-safe) ────────────────────────
    function _buildGroups() {
        const loans = DB.getLoans();
        _groups = {};

        loans.forEach(loan => {
            // Primary key: customerId. Fallback: mobile. Last resort: name.
            const key = loan.customerId
                ? loan.customerId
                : (loan.mobile ? 'mob:' + loan.mobile : 'name:' + (loan.customerName || 'Unknown'));

            if (!_groups[key]) {
                let info = null;
                if (loan.customerId) {
                    const dbCust = DB.getCustomer(loan.customerId);
                    if (dbCust) info = Object.assign({}, dbCust);
                }
                _groups[key] = {
                    info: info || {
                        id:      key,
                        name:    loan.customerName  || 'Unknown',
                        mobile:  loan.mobile        || '',
                        address: loan.address       || '',
                        caste:   loan.caste         || '',
                        photo:   loan.customerPhoto || ''
                    },
                    loans: []
                };
            }
            if (!_groups[key].info.photo && loan.customerPhoto) {
                _groups[key].info.photo = loan.customerPhoto;
            }
            _groups[key].loans.push(loan);
        });

        // ── Merge duplicate buckets sharing the same mobile number ────────────
        // This handles legacy loans (mob: key) alongside new loans (customerId key)
        // for the same physical person.
        const byMobile = {}; // mobile → canonical key
        Object.keys(_groups).forEach(key => {
            const mobile = (_groups[key].info.mobile || '').trim();
            if (!mobile || mobile.length !== 10) return; // skip blank/invalid
            if (!byMobile[mobile]) {
                byMobile[mobile] = key; // first bucket seen for this mobile = canonical
            } else {
                const canonical = byMobile[mobile];
                // Merge this bucket's loans into canonical
                _groups[canonical].loans.push(..._groups[key].loans);
                // Prefer the richer info (customer record data over loan data)
                const ci = _groups[canonical].info;
                const ki = _groups[key].info;
                if (!ci.photo && ki.photo)     ci.photo   = ki.photo;
                if (!ci.address && ki.address) ci.address = ki.address;
                if (!ci.caste && ki.caste)     ci.caste   = ki.caste;
                delete _groups[key]; // remove the duplicate bucket
            }
        });
    }

    // ── Status label for a set of loans ──────────────────────────────────────
    function _groupStatus(loans) {
        const statuses = [...new Set(loans.map(l => l.status || 'active'))];
        if (statuses.length === 1) return statuses[0];
        if (statuses.includes('active') && statuses.includes('closed')) return 'mixed';
        return statuses[0];
    }

    // ── Main render dispatcher ────────────────────────────────────────────────
    function render(container) {
        _buildGroups();
        if (_state.view === 'types') {
            _renderTypes(container);
        } else if (_state.view === 'loans') {
            _renderLoans(container);
        } else {
            _state.view = 'customers';
            _renderCustomers(container);
        }
    }

    // ── VIEW A: Customer Cards ────────────────────────────────────────────────
    function _renderCustomers(container) {
        const settings = DB.getSettings();
        const keys     = Object.keys(_groups);
        const q        = _state.search.toLowerCase().trim();
        const sf       = _state.status;

        let filtered = keys.filter(key => {
            const { info, loans } = _groups[key];
            const matchQ = !q ||
                (info.name    || '').toLowerCase().includes(q) ||
                (info.mobile  || '').includes(q) ||
                (info.address || '').toLowerCase().includes(q) ||
                (info.caste   || '').toLowerCase().includes(q) ||
                loans.some(l => (l.address || '').toLowerCase().includes(q) ||
                                (l.caste   || '').toLowerCase().includes(q));
            const gs = _groupStatus(loans);
            const matchS = sf === 'all' || gs === sf;
            return matchQ && matchS;
        });

        container.innerHTML = `
        <div class="flex-between mb-2" style="flex-wrap:wrap;gap:8px;">
            <span style="font-size:0.88rem;color:var(--text-secondary);">${keys.length} customer${keys.length !== 1 ? 's' : ''} · ${DB.getLoans().length} loans</span>
            <div class="flex gap-1">
                <button class="btn btn-gold btn-sm" onclick="UI.navigateTo('new-loan')" data-i18n="new_loan">${I18n.t('new_loan')}</button>
                <button class="btn btn-primary btn-sm" onclick="UI.navigateTo('old-loan')" data-i18n="nav_old_loan">${I18n.t('nav_old_loan')}</button>
            </div>
        </div>
        <div class="filter-bar mb-3" style="gap:8px;flex-wrap:wrap;">
            <input type="text" class="search-input" id="loan-search" placeholder="${I18n.t('search_placeholder')}"
                value="${_state.search}" oninput="LoanListPage.filter()">
            <select class="form-select" id="loan-filter-status" onchange="LoanListPage.filter()" style="width:auto;">
                <option value="all"   ${_state.status==='all'    ?'selected':''}>${I18n.t('all_status')}</option>
                <option value="active"  ${_state.status==='active'  ?'selected':''}>${I18n.t('active')}</option>
                <option value="closed"  ${_state.status==='closed'  ?'selected':''}>${I18n.t('closed')}</option>
                <option value="mixed"   ${_state.status==='mixed'   ?'selected':''}>${I18n.t('mixed')}</option>
                <option value="migrated"${_state.status==='migrated'?'selected':''}>${I18n.t('migrated')}</option>
            </select>
        </div>
        <div id="loans-container"></div>`;

        const loansContainer = document.getElementById('loans-container');
        if (!loansContainer) return;

        if (filtered.length === 0) {
            loansContainer.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><h3>${keys.length===0?I18n.t('no_loans_yet'):I18n.t('no_matches')}</h3>${keys.length===0?'<button class="btn btn-gold" onclick="UI.navigateTo(\'new-loan\')">➕ ' + I18n.t('new_loan') + '</button>':''}</div>`;
            return;
        }

        // Sort: active first, then alphabetically
        filtered.sort((a, b) => {
            const sa = _groupStatus(_groups[a].loans);
            const sb = _groupStatus(_groups[b].loans);
            if (sa !== sb) return sa === 'active' ? -1 : 1;
            return (_groups[a].info.name||'').localeCompare(_groups[b].info.name||'');
        });

        loansContainer.innerHTML = filtered.map(key => {
            const { info, loans } = _groups[key];
            const gs = _groupStatus(loans);
            const activeLoans = loans.filter(l => (l.status||'active') !== 'closed');
            const totalActive = activeLoans.reduce((s, l) => s + (l.loanAmount||0), 0);
            const goldCount   = loans.filter(l => l.metalType === 'gold').length;
            const silverCount = loans.filter(l => l.metalType === 'silver').length;
            const statusIcon  = gs === 'active' ? '🟢' : gs === 'closed' ? '⚫' : gs === 'mixed' ? '🔵' : '🔄';
            const avatar = info.photo
                ? `<img src="${info.photo}" onclick="event.stopPropagation(); UI.enlargeImage('${info.photo}')" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid var(--border);cursor:pointer;" title="Click to enlarge">`
                : `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--gold));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.1rem;flex-shrink:0;">${(info.name||'?')[0].toUpperCase()}</div>`;

            return `
            <div class="loan-card" data-key="${_esc(key)}" style="cursor:pointer;transition:transform .15s,box-shadow .15s;" onclick="LoanListPage.drillCustomer('${_esc(key)}')"
                 onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(0,0,0,0.25)'"
                 onmouseleave="this.style.transform='';this.style.boxShadow=''">
                <div class="loan-card-header">
                    <div style="display:flex;gap:12px;align-items:center;">
                        ${avatar}
                        <div>
                            <div style="font-weight:700;font-size:1rem;color:var(--text-primary);">${info.name}</div>
                            ${info.mobile ? `<div style="font-size:0.8rem;color:var(--text-secondary);">📱 ${info.mobile}</div>` : ''}
                            ${info.address ? `<div style="font-size:0.75rem;color:var(--text-secondary);">📍 ${info.address}</div>` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                        <span class="status-badge ${gs}">${statusIcon} ${gs.toUpperCase()}</span>
                        <span style="font-size:0.78rem;color:var(--text-secondary);">${loans.length} Loan${loans.length!==1?'s':''}</span>
                    </div>
                </div>
                <div class="loan-card-body">
                    <div class="loan-stat">
                        <span class="label" data-i18n="active_amount">${I18n.t('active_amount')}</span>
                        <span class="value" style="color:var(--gold);font-weight:700;">${UI.currency(totalActive)}</span>
                    </div>
                    <div class="loan-stat">
                        <span class="label">🥇 Gold:</span>
                        <span class="value">${goldCount} loan${goldCount!==1?'s':''}</span>
                    </div>
                    <div class="loan-stat">
                        <span class="label">🥈 Silver:</span>
                        <span class="value">${silverCount} loan${silverCount!==1?'s':''}</span>
                    </div>
                    <div class="loan-stat">
                        <span class="label" data-i18n="total_loans">${I18n.t('total_loans')}</span>
                        <span class="value">${loans.length}</span>
                    </div>
                </div>
                <div class="loan-card-footer">
                    <span style="font-size:0.78rem;color:var(--text-secondary);" data-i18n="view_loans">${I18n.t('view_loans')}</span>
                    <button class="btn btn-ghost btn-xs text-danger" onclick="event.stopPropagation();LoanListPage.delCustomer('${_esc(key)}')" data-i18n="delete_all">${I18n.t('delete_all')}</button>
                </div>
            </div>`;
        }).join('');
    }

    // ── VIEW B: Metal Type Breakdown ──────────────────────────────────────────
    function _renderTypes(container) {
        const group = _groups[_state.groupKey];
        if (!group) { _state.view='customers'; render(container); return; }
        const { info, loans } = group;
        const goldLoans   = loans.filter(l => l.metalType === 'gold');
        const silverLoans = loans.filter(l => l.metalType === 'silver');

        container.innerHTML = `
        <button class="btn btn-ghost mb-2" onclick="LoanListPage.goBack()">${I18n.t('back_to_customers')}</button>
        <div class="card mb-3" style="background:linear-gradient(135deg,var(--bg) 0%,rgba(246,211,101,0.05) 100%);">
            <div class="card-header pb-2" style="border-bottom:1px solid var(--border);">
                <div>
                    <h3 class="card-title">${info.name}</h3>
                    <span class="text-muted">${info.mobile||'No mobile'} ${info.address?'| 📍'+info.address:''}</span>
                </div>
                <span class="status-badge active">${loans.length} Total Loan${loans.length!==1?'s':''}</span>
            </div>
        </div>

        <h4 style="color:var(--primary);font-size:0.9rem;margin-bottom:12px;">${I18n.t('loan_types')}</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:24px;">
            ${goldLoans.length > 0 ? `
            <div onclick="LoanListPage.drillMetal('gold')"
                style="background:linear-gradient(135deg,rgba(212,175,55,0.12),rgba(212,175,55,0.05));border:1px solid rgba(212,175,55,0.35);border-radius:12px;padding:20px;cursor:pointer;transition:all .2s;"
                onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='var(--gold)'"
                onmouseleave="this.style.transform='';this.style.borderColor='rgba(212,175,55,0.35)'">
                <div style="font-size:2rem;margin-bottom:8px;">🥇</div>
                <div style="font-weight:700;font-size:1.1rem;color:var(--gold);">${I18n.t('gold_loans')}</div>
                <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary);margin:4px 0;">${goldLoans.length}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);">${goldLoans.filter(l=>(l.status||'active')==='active').length} Active · ${goldLoans.filter(l=>l.status==='closed').length} Closed</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">Total: ${UI.currency(goldLoans.reduce((s,l)=>s+(l.loanAmount||0),0))}</div>
            </div>` : ''}
            ${silverLoans.length > 0 ? `
            <div onclick="LoanListPage.drillMetal('silver')"
                style="background:linear-gradient(135deg,rgba(148,163,184,0.12),rgba(148,163,184,0.05));border:1px solid rgba(148,163,184,0.3);border-radius:12px;padding:20px;cursor:pointer;transition:all .2s;"
                onmouseenter="this.style.transform='translateY(-3px)';this.style.borderColor='#94a3b8'"
                onmouseleave="this.style.transform='';this.style.borderColor='rgba(148,163,184,0.3)'">
                <div style="font-size:2rem;margin-bottom:8px;">🥈</div>
                <div style="font-weight:700;font-size:1.1rem;color:#94a3b8;">${I18n.t('silver_loans')}</div>
                <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary);margin:4px 0;">${silverLoans.length}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);">${silverLoans.filter(l=>(l.status||'active')==='active').length} Active · ${silverLoans.filter(l=>l.status==='closed').length} Closed</div>
                <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px;">Total: ${UI.currency(silverLoans.reduce((s,l)=>s+(l.loanAmount||0),0))}</div>
            </div>` : ''}
            ${goldLoans.length===0&&silverLoans.length===0?'<p class="text-muted">' + I18n.t('no_matches') + '</p>':''}
        </div>`;
    }

    // ── VIEW C: Loan Cards Under Type ─────────────────────────────────────────
    function _renderLoans(container) {
        const group = _groups[_state.groupKey];
        if (!group) { _state.view='customers'; render(container); return; }
        const { info, loans } = group;
        const metal = _state.metal;
        const filtered = loans.filter(l => l.metalType === metal);
        const settings = DB.getSettings();
        const metalLabel = metal === 'gold' ? '🥇 Gold' : '🥈 Silver';

        container.innerHTML = `
        <button class="btn btn-ghost mb-2" onclick="LoanListPage.goBackTypes()">← Back to ${info.name}</button>
        <div style="margin-bottom:16px;">
            <h3 style="font-size:1rem;color:var(--text-primary);font-weight:700;">${metalLabel} Loans — ${info.name}</h3>
            <span class="text-muted" style="font-size:0.85rem;">${filtered.length} loan${filtered.length!==1?'s':''}</span>
        </div>
        <div id="loans-container">
        ${filtered.length === 0 ? '<div class="empty-state"><p class="text-muted">No loans found.</p></div>' :
            filtered.sort((a,b) => new Date(b.loanStartDate) - new Date(a.loanStartDate)).map(loan => {
                const rate = loan.metalType==='gold' ? settings.currentGoldRate : settings.currentSilverRate;
                let d;
                try { d = Calculator.calcLoanDetails(loan, rate); } catch(e) { d = {totalPayable:loan.loanAmount||0,ltv:0,riskLabel:'—',riskLevel:'safe'}; }
                const statusIcon = loan.status==='closed'?'✅':loan.status==='migrated'?'🔄':'🟢';
                const shortId = (loan.id||'').slice(-6).toUpperCase();
                return `
                <div class="loan-card" style="margin-bottom:12px;">
                    <div class="loan-card-header">
                        <div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:2px;">Loan #${shortId}</div>
                            <div style="font-weight:700;font-size:1rem;">${UI.currency(loan.loanAmount||0)}</div>
                            <div style="font-size:0.8rem;color:var(--text-secondary);">${loan.metalSubType||''} · ${loan.weightGrams||0}g · Started ${UI.formatDate(loan.loanStartDate)}</div>
                        </div>
                        <span class="status-badge ${loan.status||'active'}">${statusIcon} ${(loan.status||'active').toUpperCase()}</span>
                    </div>
                    <div class="loan-card-body">
                        <div class="loan-stat"><span class="label" data-i18n="payable">${I18n.t('payable')}</span><span class="value" style="color:var(--gold);font-weight:700;">${UI.currency(d.totalPayable)}</span></div>
                        <div class="loan-stat"><span class="label" data-i18n="weight">${I18n.t('weight')}</span><span class="value">${loan.weightGrams||0}g</span></div>
                        <div class="loan-stat ${d.ltv>80?'danger':d.ltv>60?'monitor':'safe'}"><span class="label" data-i18n="ltv">${I18n.t('ltv')}</span><span class="value">${UI.pct(d.ltv)}</span></div>
                        <div class="loan-stat"><span class="label" data-i18n="locker">${I18n.t('locker')}</span><span class="value">${loan.lockerName||'—'}</span></div>
                    </div>
                    ${loan.status==='closed'&&loan.settlement?`
                    <div style="background:rgba(16,185,129,0.06);padding:8px 12px;border-radius:6px;margin:8px 0;font-size:0.83rem;">
                        Settled — Paid: <strong>${UI.currency(loan.settlement.paidAmount)}</strong>
                        ${loan.settlement.discount>0?` · Discount: <strong>${UI.currency(loan.settlement.discount)}</strong>`:''}
                    </div>`:''}
                    <div class="loan-card-footer">
                        <button class="btn btn-gold btn-sm" onclick="UI.navigateTo('loan-detail','${loan.id}')" data-i18n="view_details">${I18n.t('view_details')}</button>
                        <button class="btn btn-ghost btn-xs" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 PDF</button>
                        <button class="btn btn-ghost btn-xs text-danger" onclick="LoanListPage.del('${loan.id}')" data-i18n="delete_loan">${I18n.t('delete_loan')}</button>
                    </div>
                </div>`;
            }).join('')
        }
        </div>`;
    }

    // ── Drill-down controls ────────────────────────────────────────────────────
    function drillCustomer(key) {
        _state.groupKey = key;
        _state.view = 'types';
        render(document.getElementById('page-container'));
    }

    function drillMetal(metal) {
        _state.metal = metal;
        _state.view  = 'loans';
        render(document.getElementById('page-container'));
    }

    function goBack() {
        _state.view     = 'customers';
        _state.groupKey = null;
        _state.metal    = null;
        render(document.getElementById('page-container'));
    }

    function goBackTypes() {
        _state.view  = 'types';
        _state.metal = null;
        render(document.getElementById('page-container'));
    }

    // ── Filter (View A only) ──────────────────────────────────────────────────
    function filter() {
        const q  = (document.getElementById('loan-search')?.value  || '').toLowerCase().trim();
        const sf = document.getElementById('loan-filter-status')?.value || 'all';
        _state.search = q;
        _state.status = sf;
        if (_state.view !== 'customers') return;

        const loansContainer = document.getElementById('loans-container');
        if (!loansContainer) { render(document.getElementById('page-container')); return; }

        let visibleCount = 0;
        loansContainer.querySelectorAll('.loan-card[data-key]').forEach(card => {
            const key   = card.dataset.key;
            const group = _groups[key];
            if (!group) { card.style.display = 'none'; return; }
            const { info, loans } = group;
            const matchQ = !q ||
                (info.name    || '').toLowerCase().includes(q) ||
                (info.mobile  || '').includes(q) ||
                (info.address || '').toLowerCase().includes(q) ||
                (info.caste   || '').toLowerCase().includes(q) ||
                loans.some(l => (l.address || '').toLowerCase().includes(q) ||
                                (l.caste   || '').toLowerCase().includes(q));
            const gs     = _groupStatus(loans);
            const matchS = sf === 'all' || gs === sf;
            const show   = matchQ && matchS;
            card.style.display = show ? '' : 'none';
            if (show) visibleCount++;
        });

        // Empty state
        let emptyEl = loansContainer.querySelector('.filter-empty-state');
        if (visibleCount === 0) {
            if (!emptyEl) {
                emptyEl = document.createElement('div');
                emptyEl.className = 'filter-empty-state empty-state';
                emptyEl.innerHTML = '<div class="empty-state-icon">📌</div><h3>No matches found</h3><p style="font-size:0.85rem;color:var(--text-secondary);">Try name, mobile, or village</p>';
                loansContainer.appendChild(emptyEl);
            }
        } else if (emptyEl) {
            emptyEl.remove();
        }
    }

    // ── Delete helpers ────────────────────────────────────────────────────────
    async function del(loanId) {
        if (await UI.confirm('Delete Loan', 'Are you sure? This cannot be undone.')) {
            DB.deleteLoan(loanId);
            UI.toast('Loan deleted', 'success');
            _buildGroups();
            render(document.getElementById('page-container'));
        }
    }

    async function delCustomer(key) {
        const group = _groups[key];
        if (!group) return;
        if (await UI.confirm('Delete Customer', `Delete all ${group.loans.length} loan(s) for ${group.info.name}? Cannot be undone.`)) {
            group.loans.forEach(l => DB.deleteLoan(l.id));
            UI.toast('All loans deleted', 'success');
            _buildGroups();
            render(document.getElementById('page-container'));
        }
    }

    function stopPropagation(e) { e.stopPropagation(); }

    function _esc(s) { return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

    return { render, filter, del, delCustomer, stopPropagation, drillCustomer, drillMetal, goBack, goBackTypes };
})();
