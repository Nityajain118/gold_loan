/* ============================================
   khata.js — Modern Gold Khata (T-Account)
   ============================================ */
const KhataPage = (() => {
    let activeCustomer = null;

    function render(container) {
        container.innerHTML = `
            <div class="khata-container animate-in" style="max-width: 1000px;">
                <div class="flex-between mb-3">
                    <div>
                        <h2 class="page-title" id="khata-header-title" data-i18n="nav_khata">💰 ${I18n.t('nav_khata')}</h2>
                        <p class="text-muted" id="khata-header-subtitle">Select a customer to view ledger</p>
                    </div>
                    <div class="bg-card" style="padding: 10px 16px; border-radius: var(--radius-md); border: 1px solid var(--monitor-border); background: var(--monitor-bg);">
                        <p style="font-size: 0.75rem; color: var(--monitor); font-weight: 700; text-transform: uppercase;">Live Gold (24K)</p>
                        <p style="font-size: 1.4rem; font-weight: 800; color: #b45309;" id="khata-live-rate">₹—<span style="font-size: 0.85rem; font-weight: 400;"> / 10g</span></p>
                    </div>
                </div>

                <!-- Customer Selection / Add New -->
                <div class="card mb-3">
                    <div class="flex-between mb-2">
                        <h3 class="card-title" data-i18n="nav_customers">👥 ${I18n.t('nav_customers')}</h3>
                        <button class="btn btn-primary btn-sm" onclick="KhataPage.showAddEntryModal()">➕ Add Entry</button>
                    </div>
                    <div id="customerList" style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px;">
                        <div class="text-muted" style="padding:10px;">Loading customers...</div>
                    </div>
                </div>

                <!-- Dashboard (Hidden until customer selected) -->
                <div id="khata-dashboard" style="display: none;">
                    <div class="khata-grid-3">
                        <div class="khata-summary-card">
                            <p class="k-label">Cash Pending</p>
                            <p class="k-value" id="k-cash-due">₹0</p>
                        </div>
                        <div class="khata-summary-card amber">
                            <p class="k-label">Metal Pending (24K)</p>
                            <p class="k-value" id="k-metal-due">0.000 g</p>
                        </div>
                        <div class="khata-summary-card green">
                            <p class="k-label">Total Risk Value (INR)</p>
                            <p class="k-value" id="k-total-value">₹0</p>
                        </div>
                    </div>

                    <!-- T-Account Layout -->
                    <div class="khata-grid-2 mb-3">
                        <!-- Debit / Given -->
                        <div class="t-account-panel">
                            <div class="t-account-header debit">
                                <h2 class="t-account-title">नामे (Debit / Given)</h2>
                            </div>
                            <div id="debit-list">
                                <!-- Entries render here -->
                            </div>
                        </div>

                        <!-- Credit / Received -->
                        <div class="t-account-panel">
                            <div class="t-account-header credit">
                                <h2 class="t-account-title">जमा (Credit / Received)</h2>
                            </div>
                            <div id="credit-list">
                                <!-- Entries render here -->
                            </div>
                        </div>
                    </div>

                    <div class="flex" style="justify-content: flex-end; gap: 12px; margin-top: 10px;">
                        <button class="btn btn-outline" style="border-color: var(--primary); color: var(--primary);" onclick="KhataPage.downloadPDF()">📄 Download PDF</button>
                        <button class="btn btn-outline" style="border-color: #10b981; color: #10b981;" onclick="KhataPage.sendWhatsApp()">💬 WhatsApp</button>
                        <button class="khata-action-btn" onclick="UI.toast('Settlement feature coming soon!', 'info')">Settle & Carry Forward ➔</button>
                    </div>
                </div>
                
                <!-- Empty State -->
                <div id="khata-empty-state" class="empty-state" style="margin-top: 40px;">
                    <div class="empty-state-icon">📒</div>
                    <h3>Select a Customer</h3>
                    <p>Or add a new entry to start a khata ledger.</p>
                </div>
            </div>
        `;

        // Initialize state
        activeCustomer = null; // start default
        updateLiveRateDisplay();
        loadCustomers();
    }

    // --- Core Data Logic ---
    function getKhata() {
        try {
            return JSON.parse(localStorage.getItem('gv_modern_khata')) || [];
        } catch { return []; }
    }

    function saveKhata(data) {
        localStorage.setItem('gv_modern_khata', JSON.stringify(data));
    }
    
    function updateLiveRateDisplay() {
        const settings = DB.getSettings();
        const ratePer10g = (settings.currentGoldRate || 7200) * 10;
        document.getElementById('khata-live-rate').innerHTML = `₹${ratePer10g.toLocaleString('en-IN')}<span style="font-size: 0.85rem; font-weight: 400;"> / 10g</span>`;
    }

    // Modal to add entry (since we have limited space for the complex form now)
    function showAddEntryModal() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const today = new Date().toISOString().split('T')[0];
        // Pre-fill customer name if one is active
        const prefillName = activeCustomer ? `value="${activeCustomer}"` : '';

        overlay.innerHTML = `
            <div class="modal">
                <h3 class="modal-title">➕ Add Ledger Entry</h3>
                
                <div class="form-group mb-2">
                    <label class="form-label">Customer Name</label>
                    <input type="text" class="form-input" id="ka-name" placeholder="Exact name" ${prefillName}>
                </div>
                
                <div class="form-grid mb-2">
                    <div class="form-group">
                        <label class="form-label">Entry Type</label>
                        <select class="form-select" id="ka-entry-type">
                            <option value="debit">नामे (Debit / Given)</option>
                            <option value="credit">जमा (Credit / Received)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Asset Type</label>
                        <select class="form-select" id="ka-asset-type" onchange="KhataPage.toggleAssetInput()">
                            <option value="CASH">Cash (₹)</option>
                            <option value="METAL">Metal (Gold 24K)</option>
                        </select>
                    </div>
                </div>

                <div class="form-group mb-2" id="ka-amount-container">
                    <label class="form-label">Amount (₹)</label>
                    <input type="number" class="form-input" id="ka-amount" placeholder="e.g. 50000">
                </div>

                <div class="form-group mb-2" id="ka-weight-container" style="display: none;">
                    <label class="form-label">Weight (Grams 24K)</label>
                    <input type="number" class="form-input" id="ka-weight" placeholder="e.g. 10.5" step="0.01">
                </div>

                <div class="form-group mb-2">
                    <label class="form-label">Date</label>
                    <input type="date" class="form-input" id="ka-date" value="${today}">
                </div>
                
                <div class="form-group mb-3">
                    <label class="form-label">Note (Optional)</label>
                    <input type="text" class="form-input" id="ka-note" placeholder="e.g. Initial Loan">
                </div>

                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="KhataPage.saveEntry()">Save Entry</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        // overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    function toggleAssetInput() {
        const type = document.getElementById('ka-asset-type').value;
        if (type === 'CASH') {
            document.getElementById('ka-amount-container').style.display = 'block';
            document.getElementById('ka-weight-container').style.display = 'none';
            document.getElementById('ka-weight').value = '';
        } else {
            document.getElementById('ka-amount-container').style.display = 'none';
            document.getElementById('ka-amount').value = '';
            document.getElementById('ka-weight-container').style.display = 'block';
        }
    }

    function saveEntry() {
        const name = document.getElementById('ka-name').value.trim();
        const entryType = document.getElementById('ka-entry-type').value; // debit or credit
        const assetType = document.getElementById('ka-asset-type').value; // CASH or METAL
        const rawAmount = parseFloat(document.getElementById('ka-amount').value);
        const rawWeight = parseFloat(document.getElementById('ka-weight').value);
        const date = document.getElementById('ka-date').value;
        const note = document.getElementById('ka-note').value.trim();

        if (!name) { UI.toast("Customer name required", "error"); return; }
        
        let amount = 0, weight = 0;
        if (assetType === 'CASH') {
            if (isNaN(rawAmount) || rawAmount <= 0) { UI.toast("Enter a valid amount", "error"); return; }
            amount = rawAmount;
        } else {
            if (isNaN(rawWeight) || rawWeight <= 0) { UI.toast("Enter a valid weight", "error"); return; }
            weight = rawWeight;
        }

        const entry = {
            id: DB.uuid(),
            name,
            entryType, // 'debit' or 'credit'
            assetType, // 'CASH' or 'METAL'
            amount: amount,
            weight: weight,
            date,
            note,
            createdAt: new Date().toISOString()
        };

        const records = getKhata();
        records.push(entry);
        saveKhata(records);

        UI.toast("Entry Saved", "success");
        document.querySelector('.modal-overlay').remove();
        
        loadCustomers();
        
        // Auto-select the customer we just added to
        openCustomerLedger(name);
    }

    function loadCustomers() {
        const records = getKhata();
        
        // Get unique customers
        const names = [...new Set(records.map(r => r.name))].sort((a,b) => a.localeCompare(b));
        
        const listEl = document.getElementById('customerList');

        if (names.length === 0) {
            listEl.innerHTML = '<div class="text-muted" style="padding:10px;">No customers yet. Click Add Entry.</div>';
            return;
        }

        listEl.innerHTML = names.map(n => {
            const isAct = activeCustomer && activeCustomer.toLowerCase() === n.toLowerCase();
            return `
                <div class="card ${isAct ? 'border-primary' : ''}" 
                     style="padding: 10px 16px; min-width: 120px; text-align: center; cursor: pointer; ${isAct ? 'background: var(--bg-primary); border: 2px solid var(--primary);' : ''}" 
                     onclick="KhataPage.openCustomerLedger('${n.replace(/'/g, "\\'")}')">
                    <strong style="${isAct ? 'color: var(--primary);' : ''}">${n}</strong>
                </div>
            `;
        }).join('');
    }

    function openCustomerLedger(customerName) {
        activeCustomer = customerName;
        
        // Update header
        document.getElementById('khata-header-title').innerText = `${customerName}'s Khata`;
        document.getElementById('khata-header-subtitle').innerText = 'Standard Billing';
        
        // Toggle view
        document.getElementById('khata-empty-state').style.display = 'none';
        document.getElementById('khata-dashboard').style.display = 'block';
        
        // Refresh customer pills
        loadCustomers();
        
        const records = getKhata().filter(r => r.name.toLowerCase() === customerName.toLowerCase());
        
        // Split Debits vs Credits and sort
        const debits = records.filter(r => r.entryType === 'debit').sort((a,b) => new Date(b.date) - new Date(a.date));
        const credits = records.filter(r => r.entryType === 'credit').sort((a,b) => new Date(b.date) - new Date(a.date));

        // Calculations
        const totalCashDebit = debits.filter(d => d.assetType === 'CASH').reduce((sum, d) => sum + d.amount, 0);
        const totalMetalDebit = debits.filter(d => d.assetType === 'METAL').reduce((sum, d) => sum + d.weight, 0);
        
        const totalCashCredit = credits.filter(c => c.assetType === 'CASH').reduce((sum, c) => sum + c.amount, 0);
        const totalMetalCredit = credits.filter(c => c.assetType === 'METAL').reduce((sum, c) => sum + c.weight, 0);

        const netCashDue = totalCashDebit - totalCashCredit;
        const netMetalDue = totalMetalDebit - totalMetalCredit;

        // Rate
        const settings = DB.getSettings();
        const ratePerGram = settings.currentGoldRate || 7200;
        const totalValueDue = netCashDue + (netMetalDue * ratePerGram);

        // Update Dashboard KPIs
        document.getElementById('k-cash-due').innerText = `₹${Math.round(netCashDue).toLocaleString('en-IN')}`;
        document.getElementById('k-metal-due').innerText = `${netMetalDue.toFixed(3)} g`;
        document.getElementById('k-total-value').innerText = `₹${Math.round(totalValueDue).toLocaleString('en-IN')}`;

        // Render Lists
        document.getElementById('debit-list').innerHTML = debits.length ? debits.map(renderEntry).join('') : '<div class="p-3 text-muted" style="text-align:center;">No given records.</div>';
        document.getElementById('credit-list').innerHTML = credits.length ? credits.map(renderEntry).join('') : '<div class="p-3 text-muted" style="text-align:center;">No received records.</div>';
    }

    function renderEntry(entry) {
        const isCash = entry.assetType === 'CASH';
        const tithiInfo = typeof Tithi !== 'undefined' ? Tithi.getTithiInfo(entry.date) : null;
        return `
            <div class="t-entry">
                <div>
                    <p class="t-date">${UI.formatDate(entry.date)}</p>
                    ${tithiInfo ? `<p class="t-tithi-sub">${tithiInfo.tithi} · ${tithiInfo.paksha}</p>` : ''}
                    <p class="t-note">${entry.note || '—'}</p>
                </div>
                <div style="text-align: right;">
                    ${isCash 
                        ? `<p class="t-amount ${entry.entryType === 'debit' ? 'cash-debit' : 'cash-credit'}">₹${entry.amount.toLocaleString('en-IN')}</p>` 
                        : `<p class="t-amount metal">${entry.weight.toFixed(2)} g (Au)</p>`
                    }
                    <div style="margin-top: 4px; display: flex; gap: 8px; justify-content: flex-end;">
                        <button onclick="KhataPage.editEntry('${entry.id}')" style="background:none; border:none; cursor:pointer; font-size: 0.85rem;">✏️ Edit</button>
                        <button onclick="KhataPage.deleteEntry('${entry.id}')" style="background:none; border:none; cursor:pointer; font-size: 0.85rem;">🗑️ Del</button>
                    </div>
                </div>
            </div>
        `;
    }

    function deleteEntry(id) {
        if (!confirm("Are you sure you want to delete this entry?")) return;
        const records = getKhata().filter(r => r.id !== id);
        saveKhata(records);
        UI.toast("Entry Deleted", "info");
        loadCustomers();
        if (activeCustomer) openCustomerLedger(activeCustomer);
    }

    function editEntry(id) {
        const entry = getKhata().find(r => r.id === id);
        if (!entry) return;
        
        showAddEntryModal();
        
        document.getElementById('ka-name').value = entry.name;
        document.getElementById('ka-entry-type').value = entry.entryType;
        document.getElementById('ka-asset-type').value = entry.assetType;
        
        toggleAssetInput();
        
        if (entry.assetType === 'CASH') {
            document.getElementById('ka-amount').value = entry.amount;
        } else {
            document.getElementById('ka-weight').value = entry.weight;
        }
        
        document.getElementById('ka-date').value = entry.date;
        document.getElementById('ka-note').value = entry.note || '';

        // Delete the old one so when they save it creates a new entry
        const records = getKhata().filter(r => r.id !== id);
        saveKhata(records);
    }

    function downloadPDF() {
        if (!activeCustomer) return;
        if (!window.jspdf) {
            UI.toast("PDF Library loading...", "info");
            return;
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text(`${activeCustomer}'s Khata Ledger`, 10, 15);
        doc.setFontSize(10);
        
        let y = 25;
        const records = getKhata().filter(r => r.name === activeCustomer).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        records.forEach(e => {
            const assetStr = e.assetType === 'CASH' ? `Rs.${e.amount}` : `${e.weight}g`;
            doc.text(
                `${e.date} | ${e.entryType === 'debit' ? 'Given/Debit' : 'Received/Jama'} | ${assetStr} | ${e.note || ''}`,
                10,
                y
            );
            y += 8;
        });

        const cashDue = document.getElementById('k-cash-due').innerText;
        const metalDue = document.getElementById('k-metal-due').innerText;
        const balText = document.getElementById('k-total-value').innerText;
        
        y += 10;
        doc.text(`Pending Cash: ${cashDue}`, 10, y);
        y += 8;
        doc.text(`Pending Metal: ${metalDue}`, 10, y);
        y += 8;
        doc.text(`Total Risk Value: ${balText}`, 10, y);

        doc.save(`${activeCustomer.replace(/\s+/g, '_')}_Khata.pdf`);
    }

    function sendWhatsApp() {
        if (!activeCustomer) return;
        const records = getKhata().filter(r => r.name === activeCustomer).sort((a,b) => new Date(b.date) - new Date(a.date));
        
        let message = `*Khata Details for ${activeCustomer}:*\n\n`;

        records.forEach(e => {
            const assetStr = e.assetType === 'CASH' ? `₹${e.amount}` : `${e.weight}g`;
            const typeStr = e.entryType === 'debit' ? '🔴 Given' : '🟢 Received';
            message += `${e.date} | ${typeStr} | ${assetStr}\n`;
            if (e.note) message += `   Note: ${e.note}\n`;
        });

        const balText = document.getElementById('k-total-value').innerText;
        message += `\n*Total Risk Value:* ${balText}\n`;

        const custPhone = records.find(r => r.phone)?.phone || '';

        const url = `https://wa.me/${custPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
    }

    return { render, showAddEntryModal, toggleAssetInput, saveEntry, openCustomerLedger, deleteEntry, editEntry, downloadPDF, sendWhatsApp };
})();
