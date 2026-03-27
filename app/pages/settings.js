/* ============================================
   Settings Page
   ============================================ */
const SettingsPage = (() => {
    function render(container) {
        const settings = DB.getSettings();
        const actLog = DB.getActivityLog().slice(0, 20);

        container.innerHTML = `
            <div class="card mb-2">
                <h3 class="card-title mb-2">⚙️ General Settings</h3>
                <div class="form-grid">
                    ${UI.formGroup('LTV Percentage (%)', `<input type="number" class="form-input" id="set-ltv" value="${settings.ltvPercentage || 75}" min="10" max="100">`, 'Default 75%. Safe loan calculations use this.')}
                    ${UI.formGroup('Safety Margin (%)', `<input type="number" class="form-input" id="set-margin" value="${settings.safetyMargin}" min="5" max="50">`, 'Default 20%. Loans below this buffer trigger alerts.')}
                </div>
                <div class="toggle-group mt-2">
                    <label class="toggle"><input type="checkbox" id="set-auto-fetch" ${settings.autoFetchRates ? 'checked' : ''}><span class="toggle-slider"></span></label>
                    <span class="toggle-label">Auto-fetch live market rates</span>
                </div>
                <div class="toggle-group mt-2">
                    <label class="toggle"><input type="checkbox" id="set-time-mode" ${settings.timeMode === 'tithi' ? 'checked' : ''}><span class="toggle-slider"></span></label>
                    <span class="toggle-label">🌙 Hindu Tithi Mode</span>
                    <small style="display:block;color:var(--text-muted);font-size:0.75rem;margin-top:2px;">Uses Tithi-based duration for interest calculations</small>
                </div>
                <button class="btn btn-primary mt-2" onclick="SettingsPage.saveGeneral()">💾 Save Settings</button>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2">🏪 Shop Branding (For Bills)</h3>
                <div class="form-grid">
                    ${UI.formGroup('Shop Name', `<input type="text" class="form-input" id="set-shop-name" value="${settings.shopName || ''}">`)}
                    ${UI.formGroup('Phone Number', `<input type="text" class="form-input" id="set-shop-phone" value="${settings.shopPhone || ''}">`)}
                </div>
                ${UI.formGroup('Shop Address', `<textarea class="form-textarea mt-1" id="set-shop-address">${settings.shopAddress || ''}</textarea>`)}
                ${UI.formGroup('Shop Logo URL', `<input type="text" class="form-input mt-1" id="set-shop-logo" value="${settings.shopLogo || ''}" placeholder="https://example.com/logo.png">`)}
                <button class="btn btn-primary mt-2" onclick="SettingsPage.saveBranding()">💾 Save Shop Branding</button>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2">🔐 Change PIN</h3>
                <div class="form-grid">
                    ${UI.formGroup('Current PIN', '<input type="password" class="form-input" id="set-old-pin" maxlength="4" inputmode="numeric">')}
                    ${UI.formGroup('New PIN', '<input type="password" class="form-input" id="set-new-pin" maxlength="4" inputmode="numeric">')}
                </div>
                <button class="btn btn-warning mt-2" onclick="SettingsPage.changePin()">🔑 Change PIN</button>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2">💾 Backup & Restore</h3>
                <div class="flex gap-2" style="flex-wrap:wrap;">
                    <button class="btn btn-outline" onclick="Export.exportBackup()">📥 Export Backup (JSON)</button>
                    <button class="btn btn-outline" onclick="Export.exportLoansCSV()">📊 Export Loans (CSV)</button>
                    <button class="btn btn-outline" onclick="document.getElementById('restore-file').click()">📤 Restore Backup</button>
                    <input type="file" id="restore-file" accept=".json" style="display:none" onchange="SettingsPage.restore(this)">
                </div>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2">🕐 Activity Log</h3>
                ${actLog.length === 0 ? '<p class="text-muted">No activity recorded.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr><th>Action</th><th>Time</th></tr></thead><tbody>
                ${actLog.map(a => `<tr><td>${a.action}</td><td class="text-muted" style="font-size:0.78rem">${UI.formatDate(a.timestamp)} ${new Date(a.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td></tr>`).join('')}
                </tbody></table></div>`}
            </div>

            <div class="card" style="border-color:var(--danger)">
                <h3 class="card-title mb-2 text-danger">⚠️ Danger Zone</h3>
                <p class="text-muted" style="font-size:0.85rem;margin-bottom:12px;">This will permanently delete ALL data from the app.</p>
                <button class="btn btn-danger" onclick="SettingsPage.resetAll()">🗑️ Reset All Data</button>
            </div>
        `;
    }

    function saveGeneral() {
        const margin = parseInt(document.getElementById('set-margin').value) || 20;
        const ltv = parseInt(document.getElementById('set-ltv').value) || 75;
        const autoFetch = document.getElementById('set-auto-fetch').checked;
        const timeModeEl = document.getElementById('set-time-mode');
        const timeMode = timeModeEl && timeModeEl.checked ? 'tithi' : 'normal';
        DB.saveSettings({ safetyMargin: margin, ltvPercentage: ltv, autoFetchRates: autoFetch, timeMode });
        // Sync top-bar toggle
        const topBtn = document.getElementById('time-mode-toggle');
        if (topBtn) {
            topBtn.textContent = timeMode === 'tithi' ? '🌙' : '📅';
            topBtn.title = timeMode === 'tithi' ? 'Tithi Mode Active (Click for Normal)' : 'Normal Mode Active (Click for Tithi)';
        }
        UI.toast('General settings saved', 'success');
    }

    function saveBranding() {
        const shopName = document.getElementById('set-shop-name').value.trim();
        const shopPhone = document.getElementById('set-shop-phone').value.trim();
        const shopAddress = document.getElementById('set-shop-address').value.trim();
        const shopLogo = document.getElementById('set-shop-logo').value.trim();
        DB.saveSettings({ shopName, shopPhone, shopAddress, shopLogo });
        UI.toast('Shop branding saved', 'success');
    }

    async function changePin() {
        const oldPin = document.getElementById('set-old-pin').value;
        const newPin = document.getElementById('set-new-pin').value;
        if (!oldPin || !newPin || newPin.length !== 4) { UI.toast('Enter valid 4-digit PINs', 'error'); return; }
        const valid = await DB.verifyPin(oldPin);
        if (!valid) { UI.toast('Current PIN is incorrect', 'error'); return; }
        await DB.setPin(newPin);
        UI.toast('PIN changed', 'success');
    }

    async function restore(input) {
        if (!input.files[0]) return;
        try {
            await Export.importBackup(input.files[0]);
            UI.toast('Backup restored! Refreshing...', 'success');
            setTimeout(() => location.reload(), 1000);
        } catch (e) { UI.toast('Invalid backup file', 'error'); }
    }

    async function resetAll() {
        if (await UI.confirm('Reset All Data', 'This will delete ALL loans, customers, and settings. Export a backup first!')) {
            localStorage.clear();
            UI.toast('All data cleared. Reloading...', 'warning');
            setTimeout(() => location.reload(), 1000);
        }
    }

    return { render, saveGeneral, saveBranding, changePin, restore, resetAll };
})();
