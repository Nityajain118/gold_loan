/* ============================================
   GST Settings Page
   ============================================ */
const GSTSettingsPage = (() => {

    function render(container) {
        const s = GST.getSettings();
        const states = GST.STATE_CODES;
        const stateOpts = Object.entries(states).map(([code, name]) =>
            `<option value="${code}" ${s.stateCode === code ? 'selected' : ''}>${code} - ${name}</option>`
        ).join('');

        container.innerHTML = `
            <button class="btn btn-ghost mb-2" onclick="UI.navigateTo('settings')">← Back to Settings</button>

            <!-- GST Master Toggle -->
            <div class="card mb-2" style="border-left:4px solid ${s.enabled ? 'var(--safe)' : 'var(--danger)'}">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div>
                        <h3 style="margin:0;font-size:1.1rem;">🏛️ GST Management</h3>
                        <p style="color:var(--text-secondary);font-size:0.82rem;margin-top:4px;">Enable GST calculations, invoicing and reporting</p>
                    </div>
                    <div class="toggle-group">
                        <label class="toggle"><input type="checkbox" id="gst-enabled" ${s.enabled ? 'checked' : ''} onchange="GSTSettingsPage.toggleGST()"><span class="toggle-slider"></span></label>
                    </div>
                </div>
                <div id="gst-status" style="margin-top:10px;padding:8px 12px;border-radius:8px;font-size:0.82rem;font-weight:600;background:${s.enabled ? 'var(--safe-bg)' : 'var(--danger-bg)'};color:${s.enabled ? 'var(--safe)' : 'var(--danger)'}">
                    ${s.enabled ? '✅ GST is ACTIVE — All configured charges will include GST' : '❌ GST is DISABLED — No GST will be applied'}
                </div>
            </div>

            <!-- Business GST Profile -->
            <div class="card mb-2">
                <h3 class="card-title mb-2">🏢 Business GST Profile</h3>
                <div class="form-grid">
                    ${UI.formGroup('GSTIN Number *', '<input type="text" class="form-input" id="gst-gstin" value="' + (s.gstin||'') + '" maxlength="15" placeholder="e.g. 08ABCDE1234F1Z5" style="text-transform:uppercase" oninput="GSTSettingsPage.validateGSTINLive()">', 'Format: 2-digit state + 10-digit PAN + 3 chars')}
                    <div class="form-group">
                        <label class="form-label">Validation</label>
                        <div id="gst-gstin-status" style="padding:8px 12px;border-radius:8px;font-size:0.8rem;background:var(--bg-input);min-height:36px;display:flex;align-items:center;">
                            ${s.gstin ? '—' : 'Enter GSTIN to validate'}
                        </div>
                    </div>
                </div>
                <div class="form-grid mt-2">
                    ${UI.formGroup('Business Name *', '<input type="text" class="form-input" id="gst-biz-name" value="' + (s.businessName||'') + '" placeholder="Your Business Name">')}
                    ${UI.formGroup('PAN Number', '<input type="text" class="form-input" id="gst-pan" value="' + (s.pan||'') + '" maxlength="10" placeholder="ABCDE1234F" style="text-transform:uppercase">')}
                </div>
                ${UI.formGroup('Business Address', '<textarea class="form-textarea" id="gst-biz-addr" rows="2" placeholder="Full registered address">' + (s.businessAddress||'') + '</textarea>', '', true)}
                <div class="form-grid mt-1">
                    ${UI.formGroup('State *', '<select class="form-select" id="gst-state"><option value="">-- Select State --</option>' + stateOpts + '</select>')}
                </div>
                <button class="btn btn-primary mt-2" onclick="GSTSettingsPage.saveProfile()">💾 Save Business Profile</button>
            </div>

            <!-- GST Configuration -->
            <div class="card mb-2">
                <h3 class="card-title mb-2">⚙️ GST Configuration</h3>
                <div class="form-grid">
                    ${UI.formGroup('GST Type', `
                        <div class="segment-control" id="gst-type-group">
                            <button type="button" class="segment-btn ${s.gstType==='exclusive'?'active':''}" data-value="exclusive" onclick="GSTSettingsPage.setGSTType('exclusive')">Exclusive GST</button>
                            <button type="button" class="segment-btn ${s.gstType==='inclusive'?'active':''}" data-value="inclusive" onclick="GSTSettingsPage.setGSTType('inclusive')">Inclusive GST</button>
                        </div>
                    `, 'Exclusive: GST added on top. Inclusive: GST included in amount.')}
                    ${UI.formGroup('Default GST Rate (%)', '<input type="number" class="form-input" id="gst-rate" value="' + (s.defaultRate||18) + '" min="0" max="28" step="0.5">', 'Standard: 18% for financial services')}
                    ${UI.formGroup('SAC Code', '<input type="text" class="form-input" id="gst-sac" value="' + (s.sacCode||'997113') + '" maxlength="8">', '997113 = Financial intermediation services')}
                </div>

                <h4 style="margin-top:20px;font-size:0.9rem;color:var(--primary);">Taxable Charges</h4>
                <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Select which charges should attract GST</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                    ${_taxToggle('interest', '📈 Interest Amount', s.taxableCharges.interest)}
                    ${_taxToggle('processingFee', '🏷️ Processing Fees', s.taxableCharges.processingFee)}
                    ${_taxToggle('serviceCharge', '🔧 Service Charges', s.taxableCharges.serviceCharge)}
                    ${_taxToggle('penalty', '⚠️ Penalty Charges', s.taxableCharges.penalty)}
                </div>
                <button class="btn btn-primary mt-2" onclick="GSTSettingsPage.saveConfig()">💾 Save Configuration</button>
            </div>

            <!-- Invoice Settings -->
            <div class="card mb-2">
                <h3 class="card-title mb-2">📄 Invoice Settings</h3>
                <div class="form-grid">
                    ${UI.formGroup('Invoice Prefix', '<input type="text" class="form-input" id="gst-inv-prefix" value="' + (s.invoicePrefix||'INV') + '" maxlength="10">', 'e.g. INV, TAX, GST')}
                    ${UI.formGroup('Next Seq #', '<input type="number" class="form-input" id="gst-inv-seq" value="' + (s.nextInvoiceSeq||1) + '" min="1">', 'Auto-increments per invoice')}
                </div>
                ${UI.formGroup('Invoice Logo URL', '<input type="text" class="form-input" id="gst-inv-logo" value="' + (s.invoiceLogo||'') + '" placeholder="https://example.com/logo.png">', '', true)}
                ${UI.formGroup('Terms & Conditions', '<textarea class="form-textarea" id="gst-inv-terms" rows="2">' + (s.invoiceTerms||'') + '</textarea>', '', true)}
                <button class="btn btn-primary mt-2" onclick="GSTSettingsPage.saveInvoice()">💾 Save Invoice Settings</button>
            </div>

            <!-- Preview -->
            <div class="card mb-2">
                <h3 class="card-title mb-2">🧮 GST Calculator Preview</h3>
                <p style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:12px;">Test your GST configuration with a sample amount</p>
                <div class="form-grid">
                    ${UI.formGroup('Amount (₹)', '<input type="number" class="form-input" id="gst-preview-amt" value="10000" min="1" oninput="GSTSettingsPage.previewCalc()">')}
                    <div class="form-group">
                        <label class="form-label">Inter-State?</label>
                        <label class="toggle"><input type="checkbox" id="gst-preview-inter" onchange="GSTSettingsPage.previewCalc()"><span class="toggle-slider"></span></label>
                    </div>
                </div>
                <div id="gst-preview-result" style="background:var(--bg-input);border-radius:10px;padding:14px;margin-top:10px;"></div>
            </div>

            <!-- GST Logs -->
            <div class="card mb-2">
                <h3 class="card-title mb-2">📋 Recent GST Activity</h3>
                <div id="gst-logs-list"></div>
            </div>
        `;

        if (s.gstin) validateGSTINLive();
        previewCalc();
        renderLogs();
    }

    function _taxToggle(key, label, checked) {
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-input);border-radius:8px;border:1px solid var(--border-color);">
            <label class="toggle"><input type="checkbox" id="gst-tax-${key}" ${checked ? 'checked' : ''}><span class="toggle-slider"></span></label>
            <span style="font-size:0.85rem;font-weight:600;">${label}</span>
        </div>`;
    }

    function toggleGST() {
        const enabled = document.getElementById('gst-enabled').checked;
        GST.saveSettings({ enabled });
        const el = document.getElementById('gst-status');
        if (el) {
            el.style.background = enabled ? 'var(--safe-bg)' : 'var(--danger-bg)';
            el.style.color = enabled ? 'var(--safe)' : 'var(--danger)';
            el.textContent = enabled ? '✅ GST is ACTIVE — All configured charges will include GST' : '❌ GST is DISABLED — No GST will be applied';
        }
        UI.toast(enabled ? 'GST Enabled' : 'GST Disabled', enabled ? 'success' : 'warning');
    }

    function validateGSTINLive() {
        const gstin = (document.getElementById('gst-gstin')?.value || '').toUpperCase();
        const el = document.getElementById('gst-gstin-status');
        if (!el) return;
        if (!gstin) { el.innerHTML = '<span style="color:var(--text-muted)">Enter GSTIN to validate</span>'; return; }
        const result = GST.validateGSTIN(gstin);
        if (result.valid) {
            el.innerHTML = `<span style="color:var(--safe)">✅ Valid GSTIN | State: ${result.stateName} (${result.stateCode}) | PAN: ${result.pan}</span>`;
            const stateEl = document.getElementById('gst-state');
            if (stateEl && !stateEl.value) stateEl.value = result.stateCode;
            const panEl = document.getElementById('gst-pan');
            if (panEl && !panEl.value) panEl.value = result.pan;
        } else {
            el.innerHTML = `<span style="color:var(--danger)">❌ ${result.error}</span>`;
        }
    }

    function saveProfile() {
        const gstin = (document.getElementById('gst-gstin')?.value || '').toUpperCase().trim();
        const businessName = document.getElementById('gst-biz-name')?.value?.trim() || '';
        const businessAddress = document.getElementById('gst-biz-addr')?.value?.trim() || '';
        const stateCode = document.getElementById('gst-state')?.value || '';
        const pan = (document.getElementById('gst-pan')?.value || '').toUpperCase().trim();
        if (gstin && !GST.validateGSTIN(gstin).valid) { UI.toast('Invalid GSTIN format', 'error'); return; }
        GST.saveSettings({ gstin, businessName, businessAddress, stateCode, pan });
        UI.toast('Business profile saved!', 'success');
    }

    function setGSTType(type) {
        document.getElementById('gst-type-group')?.querySelectorAll('.segment-btn').forEach(b => b.classList.toggle('active', b.dataset.value === type));
        GST.saveSettings({ gstType: type });
        previewCalc();
    }

    function saveConfig() {
        const rate = parseFloat(document.getElementById('gst-rate')?.value) || 18;
        const sacCode = document.getElementById('gst-sac')?.value?.trim() || '997113';
        const taxableCharges = {
            interest: document.getElementById('gst-tax-interest')?.checked || false,
            processingFee: document.getElementById('gst-tax-processingFee')?.checked || false,
            serviceCharge: document.getElementById('gst-tax-serviceCharge')?.checked || false,
            penalty: document.getElementById('gst-tax-penalty')?.checked || false
        };
        GST.saveSettings({ defaultRate: rate, sacCode, taxableCharges });
        UI.toast('GST configuration saved!', 'success');
        previewCalc();
    }

    function saveInvoice() {
        const invoicePrefix = document.getElementById('gst-inv-prefix')?.value?.trim() || 'INV';
        const nextInvoiceSeq = parseInt(document.getElementById('gst-inv-seq')?.value) || 1;
        const invoiceLogo = document.getElementById('gst-inv-logo')?.value?.trim() || '';
        const invoiceTerms = document.getElementById('gst-inv-terms')?.value?.trim() || '';
        GST.saveSettings({ invoicePrefix, nextInvoiceSeq, invoiceLogo, invoiceTerms });
        UI.toast('Invoice settings saved!', 'success');
    }

    function previewCalc() {
        const amt = parseFloat(document.getElementById('gst-preview-amt')?.value) || 0;
        const inter = document.getElementById('gst-preview-inter')?.checked || false;
        const result = GST.calculateGST(amt, { isInterState: inter });
        const el = document.getElementById('gst-preview-result');
        if (!el) return;
        const s = GST.getSettings();
        el.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;text-align:center;">
                <div style="padding:10px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color);">
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px">Taxable Amount</div>
                    <div style="font-weight:700;font-size:1rem;">₹${result.taxableAmount.toLocaleString('en-IN')}</div>
                </div>
                ${inter ? `
                <div style="padding:10px;background:rgba(99,102,241,0.08);border-radius:8px;border:1px solid rgba(99,102,241,0.2);grid-column:span 2">
                    <div style="font-size:0.72rem;color:var(--primary);margin-bottom:4px">IGST (${s.defaultRate}%)</div>
                    <div style="font-weight:700;font-size:1rem;color:var(--primary)">₹${result.igst.toLocaleString('en-IN')}</div>
                </div>` : `
                <div style="padding:10px;background:rgba(5,150,105,0.08);border-radius:8px;border:1px solid rgba(5,150,105,0.2);">
                    <div style="font-size:0.72rem;color:var(--safe);margin-bottom:4px">CGST (${s.defaultRate/2}%)</div>
                    <div style="font-weight:700;font-size:1rem;color:var(--safe)">₹${result.cgst.toLocaleString('en-IN')}</div>
                </div>
                <div style="padding:10px;background:rgba(5,150,105,0.08);border-radius:8px;border:1px solid rgba(5,150,105,0.2);">
                    <div style="font-size:0.72rem;color:var(--safe);margin-bottom:4px">SGST (${s.defaultRate/2}%)</div>
                    <div style="font-weight:700;font-size:1rem;color:var(--safe)">₹${result.sgst.toLocaleString('en-IN')}</div>
                </div>`}
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:12px;padding:10px 14px;background:var(--safe-bg);border-radius:8px;font-weight:700;">
                <span>Final Amount</span><span style="font-size:1.1rem;color:var(--safe)">₹${result.finalAmount.toLocaleString('en-IN')}</span>
            </div>
            <div style="font-size:0.72rem;color:var(--text-muted);text-align:center;margin-top:8px">
                Type: ${s.gstType.toUpperCase()} | Rate: ${s.defaultRate}% | ${inter ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST+SGST)'}
            </div>`;
    }

    function renderLogs() {
        const el = document.getElementById('gst-logs-list');
        if (!el) return;
        const logs = GST.getLogs(15);
        if (!logs.length) { el.innerHTML = '<p class="text-muted" style="font-size:0.85rem">No GST activity recorded yet.</p>'; return; }
        el.innerHTML = `<div class="table-container"><table class="data-table"><thead><tr><th>Action</th><th>Invoice</th><th>Time</th></tr></thead><tbody>
            ${logs.map(l => `<tr><td style="font-size:0.82rem">${l.action.replace(/_/g,' ')}</td><td style="font-size:0.78rem">${l.invoiceId||'—'}</td><td style="font-size:0.75rem;color:var(--text-muted)">${UI.formatDate(l.timestamp)}</td></tr>`).join('')}
        </tbody></table></div>`;
    }

    return { render, toggleGST, validateGSTINLive, saveProfile, setGSTType, saveConfig, saveInvoice, previewCalc };
})();
