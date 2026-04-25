/* ============================================
   Settings Page
   ============================================ */
const SettingsPage = (() => {
    function render(container) {
        const settings = DB.getSettings();
        const actLog = DB.getActivityLog().slice(0, 20);

        container.innerHTML = `
            <div class="card mb-2">
                <h3 class="card-title mb-2" data-i18n="general_settings">${I18n.t('general_settings')}</h3>
                <div class="form-grid">
                    ${UI.formGroup(I18n.t('ltv_pct'), `<input type="number" class="form-input" id="set-ltv" value="${settings.ltvPercentage || 75}" min="10" max="100">`, 'Default 75%. Safe loan calculations use this.')}
                    ${UI.formGroup(I18n.t('safety_margin'), `<input type="number" class="form-input" id="set-margin" value="${settings.safetyMargin}" min="5" max="50">`, 'Default 20%. Loans below this buffer trigger alerts.')}
                </div>
                <div class="toggle-group mt-2">
                    <label class="toggle"><input type="checkbox" id="set-auto-fetch" ${settings.autoFetchRates ? 'checked' : ''}><span class="toggle-slider"></span></label>
                    <span class="toggle-label" data-i18n="auto_fetch_rates">${I18n.t('auto_fetch_rates')}</span>
                </div>
                <div class="toggle-group mt-2">
                    <label class="toggle"><input type="checkbox" id="set-time-mode" ${settings.timeMode === 'tithi' ? 'checked' : ''}><span class="toggle-slider"></span></label>
                    <span class="toggle-label" data-i18n="tithi_mode">${I18n.t('tithi_mode')}</span>
                    <small style="display:block;color:var(--text-muted);font-size:0.75rem;margin-top:2px;">Uses Tithi-based duration for interest calculations</small>
                </div>
                <button class="btn btn-primary mt-2" onclick="SettingsPage.saveGeneral()" data-i18n="save_settings">${I18n.t('save_settings')}</button>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2" data-i18n="shop_branding">${I18n.t('shop_branding')}</h3>
                <div class="form-grid">
                    ${UI.formGroup(I18n.t('shop_name'), `<input type="text" class="form-input" id="set-shop-name" value="${settings.shopName || ''}">`)}
                    ${UI.formGroup(I18n.t('phone'), `<input type="text" class="form-input" id="set-shop-phone" value="${settings.shopPhone || ''}" maxlength="10" inputmode="numeric" oninput="this.value=this.value.replace(/[^0-9]/g,'')">`)}
                </div>
                ${UI.formGroup(I18n.t('shop_address'), `<textarea class="form-textarea mt-1" id="set-shop-address">${settings.shopAddress || ''}</textarea>`)}
                ${UI.formGroup(I18n.t('logo_url'), `<input type="text" class="form-input mt-1" id="set-shop-logo" value="${settings.shopLogo || ''}" placeholder="https://example.com/logo.png">`)}
                <button class="btn btn-primary mt-2" onclick="SettingsPage.saveBranding()" data-i18n="save_branding">${I18n.t('save_branding')}</button>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2" data-i18n="change_pin">${I18n.t('change_pin')}</h3>
                <div class="form-grid">
                    ${UI.formGroup(I18n.t('current_pin'), '<input type="password" class="form-input" id="set-old-pin" maxlength="4" inputmode="numeric">')}
                    ${UI.formGroup(I18n.t('new_pin'), '<input type="password" class="form-input" id="set-new-pin" maxlength="4" inputmode="numeric">')}
                </div>
                <button class="btn btn-warning mt-2" onclick="SettingsPage.changePin()" data-i18n="change_pin">${I18n.t('change_pin')}</button>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2" data-i18n="backup_restore">${I18n.t('backup_restore')}</h3>
                <div class="flex gap-2" style="flex-wrap:wrap;">
                    <button class="btn btn-outline" onclick="Export.exportBackup()" data-i18n="export_backup">${I18n.t('export_backup')}</button>
                    <button class="btn btn-outline" onclick="Export.exportLoansCSV()" data-i18n="export_csv">${I18n.t('export_csv')}</button>
                    <button class="btn btn-outline" onclick="document.getElementById('restore-file').click()" data-i18n="restore_backup">${I18n.t('restore_backup')}</button>
                    <input type="file" id="restore-file" accept=".json" style="display:none" onchange="SettingsPage.restore(this)">
                </div>
            </div>

            <div class="card mb-2">
                <h3 class="card-title mb-2" data-i18n="activity_log">${I18n.t('activity_log')}</h3>
                ${actLog.length === 0 ? '<p class="text-muted">No activity recorded.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr><th data-i18n="action">${I18n.t('action')}</th><th data-i18n="time_col">${I18n.t('time_col')}</th></tr></thead><tbody>
                ${actLog.map(a => `<tr><td>${a.action}</td><td class="text-muted" style="font-size:0.78rem">${UI.formatDate(a.timestamp)} ${new Date(a.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td></tr>`).join('')}
                </tbody></table></div>`}
            </div>

            <div class="card" style="border-color:var(--danger)">
                <h3 class="card-title mb-2 text-danger" data-i18n="danger_zone">${I18n.t('danger_zone')}</h3>
                <p class="text-muted" style="font-size:0.85rem;margin-bottom:12px;">This will permanently delete ALL data from the app.</p>
                <button class="btn btn-danger" onclick="SettingsPage.resetAll()" data-i18n="reset_all_data">${I18n.t('reset_all_data')}</button>
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
        const logoUrl = document.getElementById('set-shop-logo').value.trim();
        DB.saveSettings({ shopName, shopPhone, shopAddress, shopLogo: logoUrl, logoUrl });
        UI.toast('Shop branding saved', 'success');
        // Refresh sidebar logo immediately
        if (typeof window._reloadSidebarLogo === 'function') window._reloadSidebarLogo();
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
