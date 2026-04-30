/* ============================================
   Firms Management Page
   ============================================ */
const FirmsPage = (() => {

    function render(container) {
        try {
            const firms = FirmManager.getAll();
            const loans = DB.getLoans();
            const customers = DB.getCustomers();
            const stats = FirmManager.computeFirmStats(loans, customers);
            const activeFirmId = DB.getActiveFirm();

            let html = `
            <div class="flex justify-between align-center mb-4">
                <div>
                    <div class="page-title" style="margin-bottom:4px;">🏢 Firms & Branches</div>
                    <div style="font-size:0.85rem;color:var(--text-secondary);">${firms.length} firm${firms.length !== 1 ? 's' : ''} · Multi-branch management</div>
                </div>
                <button class="btn btn-primary btn-sm" onclick="FirmsPage.showAdd()">➕ Add Branch</button>
            </div>

            <div id="firms-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-bottom:32px;">`;

            if (firms.length === 0) {
                html += `
                <div class="empty-state" style="grid-column:1/-1;">
                    <div class="empty-state-icon">🏢</div>
                    <h3>No Firms Yet</h3>
                    <p>Create your first branch to get started.</p>
                    <button class="btn btn-primary mt-2" onclick="FirmsPage.showAdd()">➕ Add Branch</button>
                </div>`;
            } else {
                stats.forEach(s => {
                    const { firm, color, totalLoans, totalCustomers, totalPrincipal, totalInterest, activeLoans, overdueLoans } = s;
                    const isActive = firm.id === activeFirmId;
                    html += `
                    <div class="firm-card ${isActive ? 'firm-card-active' : ''}" id="firm-card-${firm.id}">
                        <div class="firm-card-header" style="background:${color.bg};color:${color.text};">
                            <div class="firm-card-name">
                                <span style="font-size:1.4rem;">🏢</span>
                                <div>
                                    <div style="font-weight:800;font-size:1.05rem;">${firm.name}</div>
                                    <div style="font-size:0.75rem;opacity:0.85;">${firm.isMain ? '⭐ Main Firm' : 'Branch'}</div>
                                </div>
                            </div>
                            <div class="firm-card-actions">
                                ${isActive
                                    ? `<span style="font-size:0.75rem;font-weight:700;padding:3px 8px;border-radius:12px;background:rgba(255,255,255,0.25);">ACTIVE</span>`
                                    : `<button class="btn btn-xs" style="background:rgba(255,255,255,0.2);color:${color.text};border:1px solid rgba(255,255,255,0.3);" onclick="FirmsPage.switchTo('${firm.id}')">Switch</button>`
                                }
                            </div>
                        </div>
                        <div class="firm-card-body">
                            <div class="firm-stat-grid">
                                <div class="firm-stat-item">
                                    <div class="firm-stat-label">Active Loans</div>
                                    <div class="firm-stat-value" style="color:var(--primary);">${activeLoans}</div>
                                </div>
                                <div class="firm-stat-item">
                                    <div class="firm-stat-label">Total Loans</div>
                                    <div class="firm-stat-value">${totalLoans}</div>
                                </div>
                                <div class="firm-stat-item">
                                    <div class="firm-stat-label">Customers</div>
                                    <div class="firm-stat-value">${totalCustomers}</div>
                                </div>
                                <div class="firm-stat-item">
                                    <div class="firm-stat-label">Overdue</div>
                                    <div class="firm-stat-value" style="color:var(--danger);">${overdueLoans}</div>
                                </div>
                            </div>
                            <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                                    <span style="font-size:0.78rem;color:var(--text-secondary);">Total Principal</span>
                                    <span style="font-weight:700;color:var(--text-primary);">${UI.currency(totalPrincipal)}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:0.78rem;color:var(--text-secondary);">Interest Earned</span>
                                    <span style="font-weight:700;color:var(--safe);">${UI.currency(totalInterest)}</span>
                                </div>
                            </div>
                        </div>
                        <div class="firm-card-footer">
                            <button class="btn btn-ghost btn-xs" onclick="FirmsPage.showEdit('${firm.id}')">✏️ Edit</button>
                            <button class="btn btn-ghost btn-xs" onclick="Export.exportFirmCSV('${firm.id}')">📥 Export CSV</button>
                            ${!firm.isMain
                                ? `<button class="btn btn-ghost btn-xs text-danger" onclick="FirmsPage.deleteFirm('${firm.id}')">🗑️ Delete</button>`
                                : `<span style="font-size:0.72rem;color:var(--text-secondary);">Main (protected)</span>`
                            }
                        </div>
                    </div>`;
                });
            }

            html += `</div>

            <!-- Firm-wise Summary Table -->
            ${stats.length > 1 ? `
            <div class="section-header mb-3">
                <h3 class="section-title">📊 Consolidated Firm Overview</h3>
            </div>
            <div class="card" style="overflow-x:auto;margin-bottom:24px;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead>
                        <tr style="background:var(--bg-input);border-bottom:2px solid var(--border);">
                            <th style="padding:10px 12px;text-align:left;font-weight:700;">Firm</th>
                            <th style="padding:10px 12px;text-align:right;">Customers</th>
                            <th style="padding:10px 12px;text-align:right;">Active Loans</th>
                            <th style="padding:10px 12px;text-align:right;">Principal</th>
                            <th style="padding:10px 12px;text-align:right;">Interest</th>
                            <th style="padding:10px 12px;text-align:right;">Overdue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stats.map(s => `
                        <tr style="border-bottom:1px solid var(--border);">
                            <td style="padding:10px 12px;">
                                <span class="firm-badge" style="background:${s.color.bg};color:${s.color.text};">🏢 ${s.firm.name}</span>
                                ${s.firm.isMain ? ' <span style="font-size:0.7rem;color:var(--text-secondary);">Main</span>' : ''}
                            </td>
                            <td style="padding:10px 12px;text-align:right;font-weight:600;">${s.totalCustomers}</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:600;color:var(--primary);">${s.activeLoans}</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:700;">${UI.currency(s.totalPrincipal)}</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:700;color:var(--safe);">${UI.currency(s.totalInterest)}</td>
                            <td style="padding:10px 12px;text-align:right;font-weight:700;color:${s.overdueLoans > 0 ? 'var(--danger)' : 'var(--text-secondary)'};">${s.overdueLoans}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>` : ''}`;

            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error loading firms</h3><p>${e.message}</p></div>`;
        }
    }

    function showAdd() {
        _showModal(null);
    }

    function showEdit(firmId) {
        const firm = FirmManager.getById(firmId);
        if (!firm) return;
        _showModal(firm);
    }

    function _showModal(firm) {
        const isEdit = !!firm;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'firm-modal';
        overlay.innerHTML = `
        <div class="modal card" style="max-width:420px;">
            <h3 class="modal-title">${isEdit ? '✏️ Edit Firm' : '🏢 Add New Branch'}</h3>
            <div class="form-group mb-3">
                <label class="form-label">Firm Name *</label>
                <input type="text" class="form-input" id="firm-modal-name"
                    value="${isEdit ? firm.name : ''}"
                    placeholder="e.g., Branch B or Shop Name">
            </div>
            ${isEdit && firm.isMain
                ? `<div class="alert alert-warning mb-3" style="font-size:0.82rem;">⭐ This is the Main Firm and cannot be demoted.</div>`
                : ''
            }
            <div class="modal-actions">
                <button class="btn btn-outline" onclick="document.getElementById('firm-modal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="FirmsPage.saveFirm('${isEdit ? firm.id : ''}')">
                    ${isEdit ? 'Update' : 'Add Branch'}
                </button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
        setTimeout(() => document.getElementById('firm-modal-name')?.focus(), 100);
    }

    function saveFirm(firmId) {
        const nameEl = document.getElementById('firm-modal-name');
        const name = (nameEl?.value || '').trim();
        if (!name) { UI.toast('Please enter firm name', 'error'); return; }

        try {
            const existing = firmId ? FirmManager.getById(firmId) : null;
            DB.saveFirm({ id: firmId || undefined, name, isMain: existing?.isMain || false });
            document.getElementById('firm-modal')?.remove();
            UI.toast(`✅ Firm ${firmId ? 'updated' : 'added'}!`, 'success');
            // Refresh firm selector and current page
            if (typeof UI.renderFirmSelector === 'function') UI.renderFirmSelector();
            render(document.getElementById('page-container'));
        } catch (e) {
            UI.toast('Error: ' + e.message, 'error');
        }
    }

    async function deleteFirm(firmId) {
        const firm = FirmManager.getById(firmId);
        if (!firm) return;
        if (firm.isMain) { UI.toast('Cannot delete the Main Firm', 'error'); return; }

        const loans = DB.getLoans().filter(l => l?.firm_id === firmId);
        const customers = DB.getCustomers().filter(c => c?.firm_id === firmId);

        const mainFirm = DB.getMainFirm();
        const msg = `Delete "${firm.name}"? ${loans.length} loan(s) and ${customers.length} customer(s) will be reassigned to "${mainFirm?.name || 'Main Firm'}". This cannot be undone.`;

        if (!await UI.confirm('Delete Branch Firm', msg)) return;
        try {
            DB.deleteFirm(firmId);
            UI.toast('Branch deleted and data reassigned.', 'success');
            if (typeof UI.renderFirmSelector === 'function') UI.renderFirmSelector();
            render(document.getElementById('page-container'));
        } catch (e) {
            UI.toast('Error: ' + e.message, 'error');
        }
    }

    function switchTo(firmId) {
        DB.setActiveFirm(firmId || null);
        if (typeof UI.renderFirmSelector === 'function') UI.renderFirmSelector();
        render(document.getElementById('page-container'));
        const firm = FirmManager.getById(firmId);
        UI.toast(`Switched to ${firm ? firm.name : 'All Firms'}`, 'info');
    }

    return { render, showAdd, showEdit, saveFirm, deleteFirm, switchTo };
})();
