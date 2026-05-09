/* ============================================
   GST Module — Calculation, Invoices & Reports
   ============================================ */
const GST = (() => {
    const KEYS = {
        settings: 'gv_gst_settings',
        invoices: 'gv_gst_invoices',
        logs: 'gv_gst_logs'
    };

    const DEFAULT_SETTINGS = {
        enabled: false,
        gstin: '',
        businessName: '',
        businessAddress: '',
        stateCode: '',
        pan: '',
        gstType: 'exclusive',
        defaultRate: 18,
        sacCode: '997113',
        taxableCharges: { interest: true, processingFee: true, serviceCharge: true, penalty: true },
        invoicePrefix: 'INV',
        invoiceLogo: '',
        invoiceSignature: '',
        invoiceTerms: 'GST as applicable. E&OE.',
        nextInvoiceSeq: 1
    };

    // Indian State Codes
    const STATE_CODES = {
        '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
        '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
        '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
        '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
        '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
        '24':'Gujarat','25':'Daman & Diu','26':'Dadra & Nagar Haveli','27':'Maharashtra',
        '28':'Andhra Pradesh (Old)','29':'Karnataka','30':'Goa','31':'Lakshadweep',
        '32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar',
        '36':'Telangana','37':'Andhra Pradesh','38':'Ladakh'
    };

    function _get(key) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch { return null; } }
    function _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    function _uuid() { return 'gst-' + 'xxxx-xxxx'.replace(/x/g, () => ((Math.random()*16)|0).toString(16)); }

    // ── Settings ──────────────────────────────────
    function getSettings() { return { ...DEFAULT_SETTINGS, ...(_get(KEYS.settings) || {}) }; }
    function saveSettings(updates) { _set(KEYS.settings, { ...getSettings(), ...updates }); }
    function isEnabled() { return getSettings().enabled; }

    // ── GSTIN Validation ──────────────────────────
    function validateGSTIN(gstin) {
        if (!gstin || gstin.length !== 15) return { valid: false, error: 'GSTIN must be 15 characters' };
        const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!pattern.test(gstin)) return { valid: false, error: 'Invalid GSTIN format' };
        const sc = gstin.substring(0, 2);
        if (!STATE_CODES[sc]) return { valid: false, error: 'Invalid state code in GSTIN' };
        return { valid: true, stateCode: sc, pan: gstin.substring(2, 12), stateName: STATE_CODES[sc] };
    }

    // ── State Detection ───────────────────────────
    function isInterState(businessStateCode, customerStateCode) {
        if (!businessStateCode || !customerStateCode) return false;
        return businessStateCode !== customerStateCode;
    }

    function getStateFromGSTIN(gstin) {
        if (!gstin || gstin.length < 2) return '';
        return gstin.substring(0, 2);
    }

    // ── GST Calculations ──────────────────────────
    function _round(val) { return Math.round(val * 100) / 100; }

    function calculateGST(amount, options) {
        const s = getSettings();
        if (!s.enabled || !amount || amount <= 0) return { taxableAmount: amount||0, cgst:0, sgst:0, igst:0, totalGst:0, finalAmount: amount||0, gstRate:0 };
        const rate = (options && options.rate) || s.defaultRate || 18;
        const type = (options && options.gstType) || s.gstType || 'exclusive';
        const inter = (options && options.isInterState) || false;
        let taxable, totalGst, cgst=0, sgst=0, igst=0;

        if (type === 'inclusive') {
            taxable = _round(amount / (1 + rate / 100));
            totalGst = _round(amount - taxable);
        } else {
            taxable = _round(amount);
            totalGst = _round(taxable * rate / 100);
        }

        if (inter) { igst = totalGst; }
        else { cgst = _round(totalGst / 2); sgst = _round(totalGst - cgst); }

        const finalAmount = type === 'inclusive' ? _round(amount) : _round(taxable + totalGst);
        return { taxableAmount: taxable, cgst, sgst, igst, totalGst, finalAmount, gstRate: rate, gstType: type, isInterState: inter };
    }

    function calculateForCharge(chargeType, amount, customerStateCode) {
        const s = getSettings();
        if (!s.enabled || !s.taxableCharges[chargeType]) return calculateGST(0);
        const inter = isInterState(s.stateCode, customerStateCode);
        return calculateGST(amount, { isInterState: inter });
    }

    // ── Invoice Management ────────────────────────
    function getInvoices() { return _get(KEYS.invoices) || []; }

    function _getFY(date) {
        const d = new Date(date || Date.now());
        const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
        return `${y}-${(y+1).toString().slice(-2)}`;
    }

    function getNextInvoiceNumber() {
        const s = getSettings();
        const fy = _getFY();
        const seq = s.nextInvoiceSeq || 1;
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        return `${s.invoicePrefix || 'INV'}-${dateStr}-${String(seq).padStart(4, '0')}`;
    }

    function generateInvoice(data) {
        const s = getSettings();
        const inv = {
            id: _uuid(),
            invoiceNumber: getNextInvoiceNumber(),
            date: new Date().toISOString(),
            fy: _getFY(),
            loanId: data.loanId || '',
            customerId: data.customerId || '',
            customerName: data.customerName || '',
            customerGstin: data.customerGstin || '',
            customerState: data.customerState || '',
            isInterState: isInterState(s.stateCode, data.customerState),
            sacCode: data.sacCode || s.sacCode || '997113',
            chargeType: data.chargeType || 'interest',
            description: data.description || '',
            taxableAmount: data.gstCalc?.taxableAmount || 0,
            gstRate: data.gstCalc?.gstRate || s.defaultRate,
            cgst: data.gstCalc?.cgst || 0,
            sgst: data.gstCalc?.sgst || 0,
            igst: data.gstCalc?.igst || 0,
            totalGst: data.gstCalc?.totalGst || 0,
            finalAmount: data.gstCalc?.finalAmount || 0,
            gstType: data.gstCalc?.gstType || s.gstType,
            status: 'draft',
            firm_id: data.firm_id || '',
            createdAt: new Date().toISOString(),
            finalizedAt: null,
            editHistory: []
        };
        const invoices = getInvoices();
        invoices.push(inv);
        _set(KEYS.invoices, invoices);
        saveSettings({ nextInvoiceSeq: (s.nextInvoiceSeq || 1) + 1 });
        _log('invoice_created', inv.id, { invoiceNumber: inv.invoiceNumber, amount: inv.finalAmount });
        return inv;
    }

    function getInvoice(id) { return getInvoices().find(i => i.id === id); }

    function finalizeInvoice(id) {
        const invoices = getInvoices();
        const idx = invoices.findIndex(i => i.id === id);
        if (idx < 0) return null;
        if (invoices[idx].status === 'finalized') return invoices[idx];
        invoices[idx].status = 'finalized';
        invoices[idx].finalizedAt = new Date().toISOString();
        _set(KEYS.invoices, invoices);
        _log('invoice_finalized', id, {});
        return invoices[idx];
    }

    function cancelInvoice(id, reason) {
        const invoices = getInvoices();
        const idx = invoices.findIndex(i => i.id === id);
        if (idx < 0) return null;
        invoices[idx].status = 'cancelled';
        invoices[idx].editHistory.push({ action: 'cancelled', reason: reason || '', ts: new Date().toISOString() });
        _set(KEYS.invoices, invoices);
        _log('invoice_cancelled', id, { reason });
        return invoices[idx];
    }

    function filterInvoices(filters) {
        let inv = getInvoices();
        if (filters.status) inv = inv.filter(i => i.status === filters.status);
        if (filters.chargeType) inv = inv.filter(i => i.chargeType === filters.chargeType);
        if (filters.customerName) inv = inv.filter(i => i.customerName.toLowerCase().includes(filters.customerName.toLowerCase()));
        if (filters.loanId) inv = inv.filter(i => i.loanId === filters.loanId);
        if (filters.firm_id) inv = inv.filter(i => i.firm_id === filters.firm_id);
        if (filters.fromDate) inv = inv.filter(i => i.date >= filters.fromDate);
        if (filters.toDate) inv = inv.filter(i => i.date <= filters.toDate + 'T23:59:59Z');
        if (filters.fy) inv = inv.filter(i => i.fy === filters.fy);
        return inv;
    }

    // ── Audit Log ─────────────────────────────────
    function _log(action, invoiceId, details) {
        const logs = _get(KEYS.logs) || [];
        logs.push({ action, invoiceId, details, timestamp: new Date().toISOString() });
        if (logs.length > 2000) logs.splice(0, logs.length - 2000);
        _set(KEYS.logs, logs);
    }
    function getLogs(limit) { return (_get(KEYS.logs) || []).reverse().slice(0, limit || 100); }

    // ── Report Generators ─────────────────────────
    function getDailyReport(date) {
        const d = date || new Date().toISOString().split('T')[0];
        const inv = getInvoices().filter(i => i.date.startsWith(d) && i.status !== 'cancelled');
        let cgst=0, sgst=0, igst=0, taxable=0;
        inv.forEach(i => { cgst += i.cgst; sgst += i.sgst; igst += i.igst; taxable += i.taxableAmount; });
        return { date: d, invoiceCount: inv.length, taxableAmount: _round(taxable), cgst: _round(cgst), sgst: _round(sgst), igst: _round(igst), totalGst: _round(cgst+sgst+igst), invoices: inv };
    }

    function getMonthlyReport(month, year) {
        const m = String(month).padStart(2,'0');
        const prefix = `${year}-${m}`;
        const inv = getInvoices().filter(i => i.date.startsWith(prefix) && i.status !== 'cancelled');
        let cgst=0, sgst=0, igst=0, taxable=0;
        const byDay = {};
        inv.forEach(i => {
            cgst += i.cgst; sgst += i.sgst; igst += i.igst; taxable += i.taxableAmount;
            const day = i.date.split('T')[0];
            if (!byDay[day]) byDay[day] = { count:0, gst:0 };
            byDay[day].count++; byDay[day].gst += i.totalGst;
        });
        return { month: prefix, invoiceCount: inv.length, taxableAmount: _round(taxable), cgst: _round(cgst), sgst: _round(sgst), igst: _round(igst), totalGst: _round(cgst+sgst+igst), dailyBreakdown: byDay, invoices: inv };
    }

    function getFYReport(fy) {
        const inv = getInvoices().filter(i => i.fy === fy && i.status !== 'cancelled');
        let cgst=0, sgst=0, igst=0, taxable=0;
        const byMonth = {};
        inv.forEach(i => {
            cgst += i.cgst; sgst += i.sgst; igst += i.igst; taxable += i.taxableAmount;
            const m = i.date.substring(0,7);
            if (!byMonth[m]) byMonth[m] = { count:0, taxable:0, cgst:0, sgst:0, igst:0, gst:0 };
            byMonth[m].count++; byMonth[m].taxable += i.taxableAmount;
            byMonth[m].cgst += i.cgst; byMonth[m].sgst += i.sgst; byMonth[m].igst += i.igst; byMonth[m].gst += i.totalGst;
        });
        return { fy, invoiceCount: inv.length, taxableAmount: _round(taxable), cgst: _round(cgst), sgst: _round(sgst), igst: _round(igst), totalGst: _round(cgst+sgst+igst), monthlyBreakdown: byMonth };
    }

    function getChargeTypeReport(chargeType) {
        const inv = getInvoices().filter(i => i.chargeType === chargeType && i.status !== 'cancelled');
        let cgst=0, sgst=0, igst=0, taxable=0;
        inv.forEach(i => { cgst += i.cgst; sgst += i.sgst; igst += i.igst; taxable += i.taxableAmount; });
        return { chargeType, invoiceCount: inv.length, taxableAmount: _round(taxable), cgst: _round(cgst), sgst: _round(sgst), igst: _round(igst), totalGst: _round(cgst+sgst+igst) };
    }

    function getPendingGSTReport() {
        return getInvoices().filter(i => i.status === 'draft');
    }

    function getTaxableVsNonTaxable() {
        const loans = (typeof DB !== 'undefined') ? DB.getLoans() : [];
        const inv = getInvoices().filter(i => i.status !== 'cancelled');
        const taxableTotal = inv.reduce((s, i) => s + i.taxableAmount, 0);
        const s = getSettings();
        let nonTaxable = 0;
        loans.forEach(l => {
            if (!s.taxableCharges.interest) nonTaxable += l.loanAmount * (l.interestRate || 0) / 100;
        });
        return { taxable: _round(taxableTotal), nonTaxable: _round(nonTaxable) };
    }

    // ── GSTR-1 / GSTR-3B Data (Future Ready) ─────
    function getGSTR1Data(period) {
        const inv = getInvoices().filter(i => i.date.startsWith(period) && i.status === 'finalized');
        return {
            gstin: getSettings().gstin,
            fp: period.replace('-',''),
            b2b: inv.filter(i => i.customerGstin).map(i => ({
                ctin: i.customerGstin, inv: [{ inum: i.invoiceNumber, idt: i.date.split('T')[0].split('-').reverse().join('-'),
                    val: i.finalAmount, pos: i.customerState, itms: [{ num: 1, itm_det: { txval: i.taxableAmount, rt: i.gstRate, camt: i.cgst, samt: i.sgst, iamt: i.igst } }] }]
            })),
            b2cs: inv.filter(i => !i.customerGstin).map(i => ({
                sply_ty: i.isInterState ? 'INTER' : 'INTRA', pos: i.customerState || getSettings().stateCode,
                txval: i.taxableAmount, rt: i.gstRate, camt: i.cgst, samt: i.sgst, iamt: i.igst
            }))
        };
    }

    function getGSTR3BData(period) {
        const inv = getInvoices().filter(i => i.date.startsWith(period) && i.status !== 'cancelled');
        let taxable=0, igst=0, cgst=0, sgst=0;
        inv.forEach(i => { taxable += i.taxableAmount; igst += i.igst; cgst += i.cgst; sgst += i.sgst; });
        return { gstin: getSettings().gstin, ret_period: period.replace('-',''), sup_details: { osup_det: { txval: _round(taxable), iamt: _round(igst), camt: _round(cgst), samt: _round(sgst), csamt: 0 } } };
    }

    // ── Invoice HTML ──────────────────────────────
    function getInvoiceHTML(invoiceId) {
        const inv = getInvoice(invoiceId);
        if (!inv) return '<p>Invoice not found</p>';
        const s = getSettings();
        return `<style>
            .gst-inv{max-width:700px;margin:0 auto;padding:24px;font-family:'Inter',sans-serif;color:#1a1a2e}
            .gst-inv-hdr{text-align:center;border-bottom:3px solid #d4af37;padding-bottom:14px;margin-bottom:16px}
            .gst-inv-hdr h2{font-size:20px;font-weight:900;color:#1e3a5f}
            .gst-inv-hdr .sub{font-size:12px;color:#4b5563;margin-top:4px}
            .gst-inv-meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:12px}
            .gst-inv-meta div{line-height:1.8}
            .gst-inv-tbl{width:100%;border-collapse:collapse;margin:16px 0;font-size:12px}
            .gst-inv-tbl th{background:#1e3a5f;color:#fff;padding:8px;text-align:left;font-weight:600}
            .gst-inv-tbl td{padding:8px;border-bottom:1px solid #e5e7eb}
            .gst-inv-total{background:#f0fdf4;font-weight:700}
            .gst-inv-footer{text-align:center;font-size:10px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:10px}
            .gst-inv-sig{display:flex;justify-content:space-between;margin-top:40px}
            .gst-inv-sig div{text-align:center;width:180px}
            .gst-inv-sig .line{border-top:1.5px solid #1e3a5f;margin-bottom:4px}
            @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
        </style>
        <div class="gst-inv">
            <div class="gst-inv-hdr">
                ${s.invoiceLogo ? `<img src="${s.invoiceLogo}" style="max-height:50px;margin-bottom:6px" alt="Logo"><br>` : ''}
                <h2>${s.businessName || 'Business Name'}</h2>
                <div class="sub">${s.businessAddress || ''}</div>
                <div class="sub">GSTIN: <strong>${s.gstin || 'N/A'}</strong> | PAN: <strong>${s.pan || 'N/A'}</strong></div>
            </div>
            <div style="text-align:center;font-size:16px;font-weight:800;color:#1e3a5f;margin-bottom:12px">TAX INVOICE</div>
            <div class="gst-inv-meta">
                <div><strong>Invoice No:</strong> ${inv.invoiceNumber}<br><strong>Date:</strong> ${new Date(inv.date).toLocaleDateString('en-IN')}<br><strong>SAC Code:</strong> ${inv.sacCode}</div>
                <div style="text-align:right"><strong>Customer:</strong> ${inv.customerName}<br>${inv.customerGstin ? `<strong>GSTIN:</strong> ${inv.customerGstin}<br>` : ''}<strong>State:</strong> ${STATE_CODES[inv.customerState] || inv.customerState || 'N/A'}</div>
            </div>
            <table class="gst-inv-tbl">
                <thead><tr><th>Description</th><th>SAC</th><th>Taxable Amt</th><th>${inv.isInterState ? 'IGST' : 'CGST'}</th>${!inv.isInterState ? '<th>SGST</th>' : ''}<th>Total</th></tr></thead>
                <tbody>
                    <tr><td>${inv.description || inv.chargeType}</td><td>${inv.sacCode}</td><td>₹${inv.taxableAmount.toLocaleString('en-IN')}</td>
                    <td>₹${inv.isInterState ? inv.igst.toLocaleString('en-IN') : inv.cgst.toLocaleString('en-IN')} (${inv.isInterState ? inv.gstRate : inv.gstRate/2}%)</td>
                    ${!inv.isInterState ? `<td>₹${inv.sgst.toLocaleString('en-IN')} (${inv.gstRate/2}%)</td>` : ''}
                    <td>₹${inv.finalAmount.toLocaleString('en-IN')}</td></tr>
                </tbody>
                <tfoot>
                    <tr class="gst-inv-total"><td colspan="${inv.isInterState ? 4 : 5}" style="text-align:right">Total GST:</td><td>₹${inv.totalGst.toLocaleString('en-IN')}</td></tr>
                    <tr class="gst-inv-total" style="font-size:14px"><td colspan="${inv.isInterState ? 4 : 5}" style="text-align:right">Grand Total:</td><td>₹${inv.finalAmount.toLocaleString('en-IN')}</td></tr>
                </tfoot>
            </table>
            ${s.invoiceTerms ? `<div style="font-size:11px;color:#6b7280;margin-top:12px;padding:8px;background:#fffbeb;border-radius:6px">ℹ️ ${s.invoiceTerms}</div>` : ''}
            <div class="gst-inv-sig">
                <div><div style="height:40px"></div><div class="line"></div><div style="font-size:12px;font-weight:700">Customer Signature</div></div>
                <div>${s.invoiceSignature ? `<img src="${s.invoiceSignature}" style="max-height:40px">` : '<div style="height:40px"></div>'}<div class="line"></div><div style="font-size:12px;font-weight:700">Authorized Signatory</div></div>
            </div>
            <div class="gst-inv-footer">This is a computer-generated invoice. | Generated by GoldVault Finance</div>
        </div>`;
    }

    // ── Export Helpers ─────────────────────────────
    function exportCSV(invoices, filename) {
        const headers = ['Invoice No','Date','Customer','GSTIN','Charge Type','Taxable Amt','CGST','SGST','IGST','Total GST','Final Amt','Status'];
        const rows = invoices.map(i => [i.invoiceNumber, i.date.split('T')[0], i.customerName, i.customerGstin||'', i.chargeType, i.taxableAmount, i.cgst, i.sgst, i.igst, i.totalGst, i.finalAmount, i.status]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        _download(csv, filename || 'gst_report.csv', 'text/csv');
    }

    function exportJSON(data, filename) {
        _download(JSON.stringify(data, null, 2), filename || 'gstr_export.json', 'application/json');
    }

    function _download(content, filename, mime) {
        const blob = new Blob([content], { type: mime });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    }

    function getCurrentFY() { return _getFY(); }
    function getStateCodes() { return STATE_CODES; }

    return {
        getSettings, saveSettings, isEnabled,
        validateGSTIN, isInterState, getStateFromGSTIN,
        calculateGST, calculateForCharge, _round,
        getInvoices, getInvoice, generateInvoice, finalizeInvoice, cancelInvoice, filterInvoices,
        getNextInvoiceNumber, getInvoiceHTML,
        getLogs,
        getDailyReport, getMonthlyReport, getFYReport, getChargeTypeReport,
        getPendingGSTReport, getTaxableVsNonTaxable,
        getGSTR1Data, getGSTR3BData,
        exportCSV, exportJSON,
        getCurrentFY, getStateCodes, STATE_CODES
    };
})();
