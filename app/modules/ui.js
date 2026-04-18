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
            'common-customers': '🔗 Common Customers'
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
            'common-customers': () => CommonCustomersPage.render(container)
        };

        if (renderers[page]) {
            container.innerHTML = '';
            container.className = 'page-container animate-in';
            renderers[page]();
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

    return {
        toast, navigateTo, currency, formatDate, pct, html, confirm, formGroup,
        formatTithi, formatDuration
    };
})();
