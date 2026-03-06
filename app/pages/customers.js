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
                    <th>Name</th><th>Mobile</th><th>Active Loans</th><th>Total Lent</th><th>Actions</th>
                </tr></thead><tbody id="cust-tbody">
                ${customers.map(c => {
                    const custLoans = loans.filter(l => l.customerName.toLowerCase() === c.name.toLowerCase() && l.status !== 'closed');
                    const totalLent = custLoans.reduce((s, l) => s + l.loanAmount, 0);
                    return `<tr data-search="${(c.name + ' ' + (c.mobile || '')).toLowerCase()}">
                        <td><strong>${c.name}</strong></td>
                        <td>${c.mobile || '—'}</td>
                        <td>${custLoans.length}</td>
                        <td>${UI.currency(totalLent)}</td>
                        <td><button class="btn btn-ghost btn-xs text-danger" onclick="CustomersPage.del('${c.id}')">🗑️</button></td>
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

    function showAdd() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">
            <h3 class="modal-title">➕ Add Customer</h3>
            <div class="form-group mb-2"><label class="form-label">Name *</label><input type="text" class="form-input" id="add-cust-name"></div>
            <div class="form-group mb-2"><label class="form-label">Mobile</label><input type="tel" class="form-input" id="add-cust-mobile" maxlength="10"></div>
            <div class="form-group mb-2"><label class="form-label">Address</label><textarea class="form-textarea" id="add-cust-address"></textarea></div>
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
        if (!name) { UI.toast('Enter name', 'error'); return; }
        DB.saveCustomer({
            name, mobile: document.getElementById('add-cust-mobile').value.trim(),
            address: document.getElementById('add-cust-address').value.trim(), totalLoans: 0
        });
        document.querySelector('.modal-overlay').remove();
        UI.toast('Customer added', 'success');
        render(document.getElementById('page-container'));
    }

    async function del(id) {
        if (await UI.confirm('Delete', 'Remove this customer?')) {
            DB.deleteCustomer(id); UI.toast('Deleted', 'success');
            render(document.getElementById('page-container'));
        }
    }

    return { render, filter, showAdd, saveNew, del };
})();
