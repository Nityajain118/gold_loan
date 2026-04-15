/* ============================================
   Customers Page
   ============================================ */
const CustomersPage = (() => {
    function render(container) {
        const customers = DB.getCustomers();
        const loans = DB.getLoans();

        container.innerHTML = `
            <div class="flex-between mb-2">
                <span class="text-muted" style="font-size:0.88rem">${customers.length} customer${customers.length !== 1 ? 's' : ''}</span>
                <button class="btn btn-primary btn-sm" onclick="CustomersPage.showAdd()">➕ Add Customer</button>
            </div>
            <div class="filter-bar">
                <input type="text" class="search-input" id="cust-search" placeholder="Search customers..." oninput="CustomersPage.filter()">
            </div>
            ${customers.length === 0 ?
                '<div class="empty-state"><div class="empty-state-icon">👥</div><h3>No Customers</h3><p>Customers are auto-created with loans.</p></div>'
                :
                `<div class="table-container"><table class="data-table"><thead><tr>
                    <th></th><th>Name</th><th>Mobile</th><th>Active Loans</th><th>Total Lent</th><th>Actions</th>
                </tr></thead><tbody id="cust-tbody">
                ${customers.map(c => {
                    const custLoans = loans.filter(l => l.customerName.toLowerCase() === c.name.toLowerCase() && l.status !== 'closed');
                    const totalLent = custLoans.reduce((s, l) => s + l.loanAmount, 0);
                    return `<tr data-search="${(c.name + ' ' + (c.mobile || '')).toLowerCase()}">
                        <td>${c.photo ? `<img src="${c.photo}" class="img-thumb" style="width:36px;height:36px;border-radius:50%;" />` : '<div class="img-thumb-placeholder" style="width:36px;height:36px;border-radius:50%;font-size:1.2rem;">👤</div>'}</td>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.mobile || '—'}</td>
                        <td>${custLoans.length}</td>
                        <td>${UI.currency(totalLent)}</td>
                        <td>
                            <div class="flex gap-1">
                                <button class="btn btn-outline btn-xs" onclick="UI.navigateTo('customer-ledger', '${c.id}')">📘 Ledger</button>
                                <button class="btn btn-outline btn-xs" style="background:rgba(212,175,55,0.15);border-color:rgba(212,175,55,0.4);color:#D4AF37;"
                                    onclick="CustomersPage.openHisab('${c.id}','${(c.name||'').replace(/'/g,"\\'")}','${c.mobile||''}','${(c.address||'').replace(/'/g,"\\'")}')">👁️ Hisab</button>
                                <button class="btn btn-ghost btn-xs text-danger" onclick="CustomersPage.del('${c.id}')">🗑️</button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
                </tbody></table></div>`
            }
        `;
    }

    function filter() {
        const s = document.getElementById('cust-search').value.toLowerCase();
        document.querySelectorAll('#cust-tbody tr').forEach(r => {
            r.style.display = (!s || r.dataset.search.includes(s)) ? '' : 'none';
        });
    }

    // Open cross-module HisabModal
    function openHisab(gvCustomerId, name, mobile, address) {
        if (typeof JewelleryDataService === 'undefined' || typeof HisabModal === 'undefined') {
            UI.toast('Hisab service not loaded', 'error');
            return;
        }
        DB.syncAllToMaster();
        const master = JewelleryDataService.findInMaster(name, mobile);
        if (master) {
            HisabModal.open(master.id);
        } else {
            const mc = JewelleryDataService.upsertMaster({
                name, mobile, village: address,
                moduleId: 'gold', sourceId: gvCustomerId,
            });
            HisabModal.open(mc.id);
        }
    }

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
            <div class="form-group mb-2"><label class="form-label">Address</label><textarea class="form-textarea" id="add-cust-address" placeholder="Optional address"></textarea></div>
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
        const name = document.getElementById('add-cust-name').value.trim();
        if (!name) { UI.toast('Enter customer name', 'error'); return; }
        const mobile = document.getElementById('add-cust-mobile').value.trim();
        const mobileErr = document.getElementById('add-cust-mobile-err');
        if (mobile && !/^\d{10}$/.test(mobile)) {
            if (mobileErr) mobileErr.style.display = '';
            UI.toast('Mobile number must be exactly 10 digits', 'error');
            return;
        }
        if (mobileErr) mobileErr.style.display = 'none';
        const photo = ImageUpload.getImageData('add-cust-photo');
        const address = document.getElementById('add-cust-address').value.trim();
        const newCust = DB.saveCustomer({
            name, mobile, address, photo: photo || '', totalLoans: 0
        });

        // Sync to master immediately
        if (typeof JewelleryDataService !== 'undefined') {
            JewelleryDataService.upsertMaster({
                name, mobile, village: address,
                moduleId: 'gold', sourceId: newCust.id,
            });
        }

        document.querySelector('.modal-overlay').remove();
        UI.toast('✅ Customer added & synced', 'success');
        render(document.getElementById('page-container'));
    }

    async function del(id) {
        if (await UI.confirm('Delete', 'Remove this customer?')) {
            DB.deleteCustomer(id); UI.toast('Deleted', 'success');
            render(document.getElementById('page-container'));
        }
    }

    return { render, filter, showAdd, saveNew, del, openHisab };
})();
