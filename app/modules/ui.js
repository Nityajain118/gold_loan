/* ============================================
   UI Module — DOM Helpers & Utilities
   ============================================ */
const UI = (() => {

    /**
     * Show a toast notification
     */
    function toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `
            <span>${icons[type] || ''}</span>
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(50px)';
            setTimeout(() => el.remove(), 300);
        }, duration);
    }

    /**
     * Navigate to a page
     */
    function navigateTo(page, data = null) {
        const container = document.getElementById('page-container');
        const title = document.getElementById('page-title');

        // Update nav active states
        document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');

        // Page titles
        const titles = {
            'dashboard': 'Dashboard',
            'new-loan': 'New Loan Entry',
            'old-loan': 'Old Loan Entry (Migration)',
            'loans': 'All Loans',
            'loan-detail': 'Loan Details',
            'loan-detail': 'Loan Details',
            'customers': 'Customers',
            'customer-profile': 'Customer Profile',
            'customer-ledger': 'Customer Ledger',
            'khata': 'Khata Ledger',
            'inventory': 'Inventory',
            'market': 'Market Rates',
            'settings': 'Settings',
            'common-customers': '🔗 Common Customers',
            'hisab-kitaab': 'Hisab Kitaab'
        };

        title.textContent = titles[page] || 'GoldVault';

        // Render page
        const renderers = {
            'dashboard': () => DashboardPage.render(container),
            'new-loan': () => NewLoanPage.render(container),
            'old-loan': () => OldLoanPage.render(container),
            'loans': () => LoanListPage.render(container),
            'loan-detail': () => LoanDetailPage.render(container, data),
            'customers': () => CustomersPage.render(container),
            'customer-profile': () => CustomerProfilePage.render(container, data),
            'customer-ledger': () => CustomerLedgerPage.render(container, data),
            'khata': () => KhataPage.render(container),
            'inventory': () => InventoryPage.render(container),
            'market': () => MarketPage.render(container),
            'settings': () => SettingsPage.render(container),
            'common-customers': () => CommonCustomersPage.render(container),
            'hisab-kitaab': () => HisabKitaabPage.render(container, data)
        };

        if (renderers[page]) {
            container.innerHTML = '';
            container.className = 'page-container animate-in';
            renderers[page]();
            if (typeof I18n !== 'undefined') I18n.apply(container);
        }

        // Update session
        DB.setSession();
    }

    /**
     * Format currency (INR)
     */
    function currency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
        return '₹' + Math.round(amount).toLocaleString('en-IN');
    }

    /**
     * Format date
     */
    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }

    /**
     * Format percentage
     */
    function pct(value) {
        if (value === null || value === undefined || isNaN(value)) return '0%';
        return value.toFixed(1) + '%';
    }

    /**
     * Create an HTML element from string
     */
    function html(htmlStr) {
        const template = document.createElement('template');
        template.innerHTML = htmlStr.trim();
        return template.content.firstChild;
    }

    /**
     * Create a confirmation modal
     */
    function confirm(title, message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal">
                    <h3 class="modal-title">${title}</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">${message}</p>
                    <div class="modal-actions">
                        <button class="btn btn-outline" id="modal-cancel">Cancel</button>
                        <button class="btn btn-danger" id="modal-confirm">Confirm</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector('#modal-confirm').onclick = () => {
                overlay.remove();
                resolve(true);
            };

            overlay.querySelector('#modal-cancel').onclick = () => {
                overlay.remove();
                resolve(false);
            };

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            };
        });
    }

    /**
     * Build a form group HTML
     */
    function formGroup(label, inputHtml, hint = '', fullWidth = false) {
        return `
            <div class="form-group ${fullWidth ? 'full-width' : ''}">
                <label class="form-label">${label}</label>
                ${inputHtml}
                ${hint ? `<span class="form-hint">${hint}</span>` : ''}
            </div>
        `;
    }

    /**
     * Format Tithi info for display
     */
    function formatTithi(tithiInfo) {
        if (!tithiInfo) return '';
        return tithiInfo.formatted || `${tithiInfo.tithi} (${tithiInfo.paksha}) · ${tithiInfo.lunarMonth}`;
    }

    /**
     * Format duration based on time mode
     */
    function formatDuration(months, tithiDuration, timeMode) {
        if (timeMode === 'tithi' && tithiDuration) {
            return tithiDuration.display || `${tithiDuration.tithis} tithis`;
        }
        if (months >= 12) {
            const y = Math.floor(months / 12);
            const m = Math.round(months % 12);
            return m > 0 ? `${y}y ${m}m` : `${y} year${y > 1 ? 's' : ''}`;
        }
        return `${Math.round(months)} month${months !== 1 ? 's' : ''}`;
    }

    /**
     * Enlarge an image in a fullscreen modal
     */
    function enlargeImage(src) {
        if (!src) return;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '9999';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.cursor = 'pointer';
        overlay.innerHTML = `
            <div style="position:relative; max-width:90%; max-height:90%; cursor:default;" onclick="event.stopPropagation()">
                <img src="${src}" style="max-width:100%; max-height:90vh; border-radius:8px; box-shadow:0 10px 30px rgba(0,0,0,0.5);" />
                <button onclick="this.parentElement.parentElement.remove()" style="position:absolute; top:-15px; right:-15px; width:30px; height:30px; border-radius:50%; background:var(--danger); color:white; border:none; cursor:pointer; font-weight:bold; font-size:16px; box-shadow:0 2px 10px rgba(0,0,0,0.3);">✕</button>
            </div>
        `;
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
        document.body.appendChild(overlay);
    }

    /**
     * Show image interaction options (Bottom Sheet style)
     */
    function showImageOptions(hasImage) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.alignItems = 'flex-end'; // bottom sheet
            
            const optionsHtml = hasImage ? `
                <button class="btn btn-outline full-width mb-2" id="img-opt-view" style="justify-content:flex-start;">🖼️ View Full Image</button>
                <button class="btn btn-outline full-width mb-2" id="img-opt-change" style="justify-content:flex-start;">📸 Change Photo</button>
                <button class="btn btn-outline full-width mb-3 text-danger" id="img-opt-remove" style="justify-content:flex-start;border-color:var(--danger);color:var(--danger);">🗑️ Remove Photo</button>
            ` : `
                <button class="btn btn-outline full-width mb-3" id="img-opt-upload" style="justify-content:flex-start;">📸 Upload / Capture Photo</button>
            `;

            overlay.innerHTML = `
                <div class="modal-content" style="margin-bottom:0; border-bottom-left-radius:0; border-bottom-right-radius:0; animation: slideUp 0.3s ease-out;">
                    <h3 class="mb-3">Photo Options</h3>
                    ${optionsHtml}
                    <button class="btn btn-ghost full-width" id="img-opt-cancel">Cancel</button>
                </div>
            `;
            
            // Add keyframes for slideUp if not exists
            if (!document.getElementById('slideUp-keyframe')) {
                const style = document.createElement('style');
                style.id = 'slideUp-keyframe';
                style.innerHTML = '@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }';
                document.head.appendChild(style);
            }

            document.body.appendChild(overlay);

            const close = (action) => { overlay.remove(); resolve(action); };

            if (hasImage) {
                overlay.querySelector('#img-opt-view').onclick = () => close('view');
                overlay.querySelector('#img-opt-change').onclick = () => close('change');
                overlay.querySelector('#img-opt-remove').onclick = () => close('remove');
            } else {
                overlay.querySelector('#img-opt-upload').onclick = () => close('upload');
            }
            overlay.querySelector('#img-opt-cancel').onclick = () => close(null);
            overlay.onclick = (e) => { if (e.target === overlay) close(null); };
        });
    }

    /**
     * Prompt for image upload and return compressed base64
     */
    function promptImageUpload(profile = 'default') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/webp';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.onchange = () => {
                const file = input.files[0];
                if (!file) { input.remove(); return resolve(null); }
                
                if (file.size > 5 * 1024 * 1024) {
                    toast('Image too large. Max 5MB allowed.', 'error');
                    input.remove();
                    return resolve(null);
                }

                if (typeof ImageUpload !== 'undefined') {
                    ImageUpload.compressImage(file, profile, (result) => {
                        input.remove();
                        resolve(result ? result.base64 : null);
                    });
                } else {
                    toast('ImageUpload module not loaded', 'error');
                    input.remove();
                    resolve(null);
                }
            };
            
            // Handle cancellation (not perfectly supported in all browsers, but cleans up)
            window.addEventListener('focus', function onFocus() {
                setTimeout(() => { if (!input.files.length) input.remove(); }, 1000);
                window.removeEventListener('focus', onFocus);
            });

            input.click();
        });
    }

    return {
        toast, navigateTo, currency, formatDate, pct, html, confirm, formGroup,
        formatTithi, formatDuration, enlargeImage, showImageOptions, promptImageUpload
    };
})();
