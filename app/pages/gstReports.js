/* ============================================
   GST Reports Page
   ============================================ */
const GSTReportsPage = (() => {
    let currentTab = 'monthly';
    let charts = {};
    let filteredInvoices = [];

    function render(container) {
        if (!GST.isEnabled()) {
            container.innerHTML = `
                <div class="empty-state" style="margin-top:40px;">
                    <div class="empty-state-icon" style="font-size:3rem;">🏛️</div>
                    <h3 style="margin-top:16px;">GST is Disabled</h3>
                    <p style="color:var(--text-secondary);max-width:400px;margin:10px auto;">Enable GST in Settings to view reports and generate invoices.</p>
                    <button class="btn btn-primary mt-3" onclick="UI.navigateTo('gst-settings')">Go to GST Settings</button>
                </div>
            `;
            return;
        }

        const fy = GST.getCurrentFY();
        const fyReport = GST.getFYReport(fy);
        filteredInvoices = GST.getInvoices();

        container.innerHTML = `
            <div class="section-header mb-3" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <h3 class="section-title m-0">📊 GST Reports</h3>
                <div class="flex gap-2" style="flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm kn-focusable" onclick="GSTReportsPage.exportReport('csv')">📥 Export CSV</button>
                    <button class="btn btn-outline btn-sm kn-focusable" onclick="GSTReportsPage.exportReport('pdf')">📄 Export PDF</button>
                    <button class="btn btn-outline btn-sm kn-focusable" onclick="GSTReportsPage.exportReport('gstr1')" style="color:var(--primary);border-color:var(--primary);">📤 GSTR-1 JSON</button>
                </div>
            </div>

            <!-- Summary KPIs -->
            <div class="kpi-grid mb-3">
                <div class="kpi-card blue" style="padding:20px;">
                    <div class="kpi-icon" style="font-size:1.5rem;width:40px;height:40px;">💰</div>
                    <div class="kpi-value" style="font-size:1.6rem;">₹${UI.currency(fyReport.totalGst).replace('₹', '')}</div>
                    <div class="kpi-label">Total GST Collected (FY ${fy})</div>
                </div>
                <div class="kpi-card" style="padding:20px;">
                    <div class="kpi-icon" style="font-size:1.5rem;width:40px;height:40px;">📄</div>
                    <div class="kpi-value" style="font-size:1.6rem;">${fyReport.invoiceCount}</div>
                    <div class="kpi-label">Total Invoices</div>
                </div>
                <div class="kpi-card green" style="padding:20px;">
                    <div class="kpi-icon" style="font-size:1.5rem;width:40px;height:40px;">📈</div>
                    <div class="kpi-value" style="font-size:1.6rem;">₹${UI.currency(fyReport.taxableAmount).replace('₹', '')}</div>
                    <div class="kpi-label">Total Taxable Amount</div>
                </div>
                <div class="kpi-card gold" style="padding:20px;">
                    <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:6px;"><span>CGST:</span> <strong>₹${UI.currency(fyReport.cgst).replace('₹', '')}</strong></div>
                    <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:6px;"><span>SGST:</span> <strong>₹${UI.currency(fyReport.sgst).replace('₹', '')}</strong></div>
                    <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:6px;"><span>IGST:</span> <strong>₹${UI.currency(fyReport.igst).replace('₹', '')}</strong></div>
                    <div class="kpi-label mt-2">Tax Breakdown</div>
                </div>
            </div>

            <!-- Filters -->
            <div class="card mb-3" style="padding:16px;">
                <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
                    <div style="flex:1;min-width:140px;">
                        <label class="form-label" style="margin-bottom:4px;font-size:0.75rem;">From Date</label>
                        <input type="date" class="form-input" id="gst-filter-from" style="padding:6px 10px;font-size:0.85rem;" onchange="GSTReportsPage.applyFilters()">
                    </div>
                    <div style="flex:1;min-width:140px;">
                        <label class="form-label" style="margin-bottom:4px;font-size:0.75rem;">To Date</label>
                        <input type="date" class="form-input" id="gst-filter-to" style="padding:6px 10px;font-size:0.85rem;" onchange="GSTReportsPage.applyFilters()">
                    </div>
                    <div style="flex:1;min-width:140px;">
                        <label class="form-label" style="margin-bottom:4px;font-size:0.75rem;">Charge Type</label>
                        <select class="form-select" id="gst-filter-charge" style="padding:6px 10px;font-size:0.85rem;" onchange="GSTReportsPage.applyFilters()">
                            <option value="">All Charges</option>
                            <option value="interest">Interest</option>
                            <option value="processingFee">Processing Fee</option>
                            <option value="penalty">Penalty</option>
                        </select>
                    </div>
                    <div style="flex:1;min-width:140px;">
                        <label class="form-label" style="margin-bottom:4px;font-size:0.75rem;">Status</label>
                        <select class="form-select" id="gst-filter-status" style="padding:6px 10px;font-size:0.85rem;" onchange="GSTReportsPage.applyFilters()">
                            <option value="">All Status</option>
                            <option value="finalized">Finalized</option>
                            <option value="draft">Draft</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <button class="btn btn-outline" style="padding:6px 12px;" onclick="GSTReportsPage.clearFilters()">Clear</button>
                </div>
            </div>

            <!-- Report Tabs -->
            <div class="segment-control mb-3" style="overflow-x:auto;white-space:nowrap;justify-content:flex-start;">
                <button class="segment-btn ${currentTab==='monthly'?'active':''}" onclick="GSTReportsPage.switchTab('monthly')">Monthly Trend</button>
                <button class="segment-btn ${currentTab==='invoices'?'active':''}" onclick="GSTReportsPage.switchTab('invoices')">Invoice Register</button>
                <button class="segment-btn ${currentTab==='hsn'?'active':''}" onclick="GSTReportsPage.switchTab('hsn')">HSN/SAC Summary</button>
            </div>

            <!-- Tab Content -->
            <div id="gst-tab-content" class="card" style="min-height:400px;padding:20px;"></div>
        `;

        // Initialize dates to current month
        const today = new Date();
        const fday = new Date(today.getFullYear(), today.getMonth(), 1);
        document.getElementById('gst-filter-from').value = fday.toISOString().split('T')[0];
        document.getElementById('gst-filter-to').value = today.toISOString().split('T')[0];

        applyFilters(false);
    }

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
        event.target.classList.add('active');
        renderTabContent();
    }

    function applyFilters(render = true) {
        const fromDate = document.getElementById('gst-filter-from').value;
        const toDate = document.getElementById('gst-filter-to').value;
        const chargeType = document.getElementById('gst-filter-charge').value;
        const status = document.getElementById('gst-filter-status').value;

        filteredInvoices = GST.filterInvoices({ fromDate, toDate, chargeType, status });
        if (render) renderTabContent();
    }

    function clearFilters() {
        document.getElementById('gst-filter-from').value = '';
        document.getElementById('gst-filter-to').value = '';
        document.getElementById('gst-filter-charge').value = '';
        document.getElementById('gst-filter-status').value = '';
        applyFilters();
    }

    function renderTabContent() {
        const el = document.getElementById('gst-tab-content');
        if (!el) return;

        // Destroy old charts
        Object.values(charts).forEach(c => c.destroy && c.destroy());
        charts = {};

        if (filteredInvoices.length === 0) {
            el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><h3>No Data Found</h3><p>Try adjusting your filters.</p></div>';
            return;
        }

        if (currentTab === 'monthly') {
            el.innerHTML = `
                <div style="height:300px;width:100%;"><canvas id="gst-monthly-chart"></canvas></div>
                <div class="table-container mt-4">
                    <table class="data-table">
                        <thead><tr><th>Month</th><th>Invoices</th><th>Taxable (₹)</th><th>CGST (₹)</th><th>SGST (₹)</th><th>IGST (₹)</th><th>Total GST (₹)</th></tr></thead>
                        <tbody id="gst-monthly-tbody"></tbody>
                    </table>
                </div>
            `;
            setTimeout(() => _renderMonthlyTab(), 10);
        } else if (currentTab === 'invoices') {
            el.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Charge</th><th>Taxable</th><th>GST</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                        <tbody>
                            ${filteredInvoices.map(i => `
                                <tr>
                                    <td style="font-size:0.8rem;font-weight:600;">${i.invoiceNumber}</td>
                                    <td style="font-size:0.8rem;">${UI.formatDate(i.date.split('T')[0])}</td>
                                    <td style="font-size:0.85rem;">${i.customerName}<br><span style="font-size:0.7rem;color:var(--text-muted);">${i.customerGstin||'Unregistered'}</span></td>
                                    <td style="font-size:0.8rem;text-transform:capitalize;">${i.chargeType}</td>
                                    <td style="font-size:0.85rem;">₹${i.taxableAmount.toLocaleString('en-IN')}</td>
                                    <td style="font-size:0.85rem;color:var(--primary);">₹${i.totalGst.toLocaleString('en-IN')}</td>
                                    <td style="font-size:0.85rem;font-weight:700;">₹${i.finalAmount.toLocaleString('en-IN')}</td>
                                    <td><span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:var(--${i.status==='finalized'?'safe':i.status==='cancelled'?'danger':'monitor'}-bg);color:var(--${i.status==='finalized'?'safe':i.status==='cancelled'?'danger':'monitor'})">${i.status}</span></td>
                                    <td>
                                        <button class="btn btn-ghost btn-xs" onclick="GSTReportsPage.viewInvoice('${i.id}')">👁️</button>
                                        ${i.status==='draft' ? `<button class="btn btn-ghost btn-xs text-safe" onclick="GSTReportsPage.finalizeInvoice('${i.id}')">✅</button>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else if (currentTab === 'hsn') {
            const hsn = {};
            filteredInvoices.forEach(i => {
                if(!hsn[i.sacCode]) hsn[i.sacCode] = { taxable:0, cgst:0, sgst:0, igst:0, total:0 };
                hsn[i.sacCode].taxable += i.taxableAmount;
                hsn[i.sacCode].cgst += i.cgst; hsn[i.sacCode].sgst += i.sgst; hsn[i.sacCode].igst += i.igst; hsn[i.sacCode].total += i.totalGst;
            });
            el.innerHTML = `
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>HSN/SAC Code</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total Tax</th></tr></thead>
                        <tbody>
                            ${Object.entries(hsn).map(([code, data]) => `
                                <tr>
                                    <td style="font-weight:600;">${code}</td>
                                    <td>₹${data.taxable.toLocaleString('en-IN')}</td>
                                    <td>₹${data.cgst.toLocaleString('en-IN')}</td>
                                    <td>₹${data.sgst.toLocaleString('en-IN')}</td>
                                    <td>₹${data.igst.toLocaleString('en-IN')}</td>
                                    <td style="font-weight:700;color:var(--primary);">₹${data.total.toLocaleString('en-IN')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }

    function _renderMonthlyTab() {
        const byMonth = {};
        filteredInvoices.forEach(i => {
            const m = i.date.substring(0,7); // YYYY-MM
            if(!byMonth[m]) byMonth[m] = { count:0, taxable:0, cgst:0, sgst:0, igst:0, total:0 };
            byMonth[m].count++; byMonth[m].taxable += i.taxableAmount;
            byMonth[m].cgst += i.cgst; byMonth[m].sgst += i.sgst; byMonth[m].igst += i.igst; byMonth[m].total += i.totalGst;
        });

        const sortedMonths = Object.keys(byMonth).sort();
        const tbody = document.getElementById('gst-monthly-tbody');
        if(tbody) {
            tbody.innerHTML = sortedMonths.map(m => `
                <tr>
                    <td>${m}</td><td>${byMonth[m].count}</td>
                    <td>₹${byMonth[m].taxable.toLocaleString('en-IN')}</td>
                    <td>₹${byMonth[m].cgst.toLocaleString('en-IN')}</td>
                    <td>₹${byMonth[m].sgst.toLocaleString('en-IN')}</td>
                    <td>₹${byMonth[m].igst.toLocaleString('en-IN')}</td>
                    <td style="font-weight:700;color:var(--primary);">₹${byMonth[m].total.toLocaleString('en-IN')}</td>
                </tr>
            `).join('');
        }

        const ctx = document.getElementById('gst-monthly-chart');
        if (ctx && typeof Chart !== 'undefined') {
            charts.monthly = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sortedMonths,
                    datasets: [
                        { label: 'CGST', data: sortedMonths.map(m => byMonth[m].cgst), backgroundColor: 'rgba(5, 150, 105, 0.6)' },
                        { label: 'SGST', data: sortedMonths.map(m => byMonth[m].sgst), backgroundColor: 'rgba(16, 185, 129, 0.6)' },
                        { label: 'IGST', data: sortedMonths.map(m => byMonth[m].igst), backgroundColor: 'rgba(99, 102, 241, 0.6)' }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                    plugins: { tooltip: { mode: 'index' } }
                }
            });
        }
    }

    function viewInvoice(id) {
        const html = GST.getInvoiceHTML(id);
        UI.showModal('GST Invoice Preview', `
            <div style="background:#fff;border-radius:8px;padding:10px;border:1px solid #eee;margin-bottom:16px;">${html}</div>
            <div style="display:flex;justify-content:flex-end;gap:10px;">
                <button class="btn btn-outline" onclick="UI.hideModal()">Close</button>
                <button class="btn btn-primary" onclick="GSTReportsPage.printInvoice('${id}')">🖨️ Print / PDF</button>
            </div>
        `);
    }

    function printInvoice(id) {
        const inv = GST.getInvoice(id);
        if(!inv) return;
        const html = GST.getInvoiceHTML(id);
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Invoice ${inv.invoiceNumber}</title></head><body>${html}</body></html>`);
        win.document.close();
        setTimeout(() => { win.print(); }, 500);
    }

    function finalizeInvoice(id) {
        if(confirm('Are you sure you want to finalize this invoice? It cannot be edited later.')) {
            GST.finalizeInvoice(id);
            UI.toast('Invoice finalized successfully', 'success');
            applyFilters(true); // refresh
        }
    }

    function exportReport(type) {
        if (filteredInvoices.length === 0) { UI.toast('No data to export', 'warning'); return; }
        
        const periodStr = document.getElementById('gst-filter-from').value.substring(0,7) || new Date().toISOString().substring(0,7);
        
        if (type === 'csv') {
            GST.exportCSV(filteredInvoices, `gst_report_${periodStr}.csv`);
            UI.toast('CSV exported', 'success');
        } else if (type === 'gstr1') {
            const data = GST.getGSTR1Data(periodStr);
            GST.exportJSON(data, `gstr1_${periodStr}.json`);
            UI.toast('GSTR-1 JSON exported', 'success');
        } else if (type === 'pdf') {
            // Setup temp print view
            const win = window.open('', '_blank');
            const hsn = {};
            filteredInvoices.forEach(i => {
                if(!hsn[i.sacCode]) hsn[i.sacCode] = { taxable:0, total:0 };
                hsn[i.sacCode].taxable += i.taxableAmount; hsn[i.sacCode].total += i.totalGst;
            });
            
            const html = `
                <style>body{font-family:sans-serif;padding:20px} table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#f4f4f4}</style>
                <h2>GST Report Summary</h2>
                <p>Period: ${document.getElementById('gst-filter-from').value} to ${document.getElementById('gst-filter-to').value}</p>
                <table>
                    <thead><tr><th>Invoice No</th><th>Date</th><th>Customer</th><th>Taxable</th><th>GST</th><th>Total</th></tr></thead>
                    <tbody>${filteredInvoices.map(i => `<tr><td>${i.invoiceNumber}</td><td>${i.date.split('T')[0]}</td><td>${i.customerName}</td><td>${i.taxableAmount}</td><td>${i.totalGst}</td><td>${i.finalAmount}</td></tr>`).join('')}</tbody>
                </table>
                <h3 style="margin-top:30px">HSN/SAC Summary</h3>
                <table>
                    <thead><tr><th>SAC Code</th><th>Taxable Value</th><th>Total Tax</th></tr></thead>
                    <tbody>${Object.entries(hsn).map(([k,v]) => `<tr><td>${k}</td><td>${v.taxable}</td><td>${v.total}</td></tr>`).join('')}</tbody>
                </table>
            `;
            win.document.write(`<html><head><title>GST Report</title></head><body>${html}</body></html>`);
            win.document.close();
            setTimeout(() => { win.print(); }, 500);
        }
    }

    return { render, switchTab, applyFilters, clearFilters, viewInvoice, printInvoice, finalizeInvoice, exportReport };
})();
