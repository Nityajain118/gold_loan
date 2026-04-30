/* ============================================
   FirmManager — Multi-Firm (Branch) Logic
   ============================================ */
const FirmManager = (() => {

    // Curated color palette for firm badges
    const FIRM_COLORS = [
        { bg: '#d4af37', text: '#1a1a2e', label: 'gold' },
        { bg: '#6366f1', text: '#ffffff', label: 'indigo' },
        { bg: '#10b981', text: '#ffffff', label: 'emerald' },
        { bg: '#f59e0b', text: '#1a1a2e', label: 'amber' },
        { bg: '#ef4444', text: '#ffffff', label: 'red' },
        { bg: '#8b5cf6', text: '#ffffff', label: 'violet' },
        { bg: '#06b6d4', text: '#ffffff', label: 'cyan' },
        { bg: '#f97316', text: '#ffffff', label: 'orange' }
    ];

    /**
     * Seeds the default "Main Firm" on first run using shopName from settings.
     * Called at app startup — safe to call multiple times (idempotent).
     */
    function seedDefaultFirm() {
        try {
            const firms = DB.getFirms();
            if (firms.length > 0) return; // already seeded

            const settings = DB.getSettings();
            const mainName = (settings.shopName && settings.shopName.trim())
                ? settings.shopName.trim()
                : 'Main Branch';

            DB.saveFirm({
                name: mainName,
                isMain: true,
                colorIndex: 0
            });

            // Migrate all existing loans & customers to main firm
            const mainFirm = DB.getMainFirm();
            if (!mainFirm) return;

            const loans = DB.getLoans();
            loans.forEach(loan => {
                if (!loan.firm_id) {
                    loan.firm_id = mainFirm.id;
                    DB.saveLoan(loan);
                }
            });

            const customers = DB.getCustomers();
            customers.forEach(cust => {
                if (!cust.firm_id) {
                    cust.firm_id = mainFirm.id;
                    DB.saveCustomer(cust);
                }
            });
        } catch (e) {
            // Never crash on seed
            console.warn('[FirmManager] seedDefaultFirm error:', e);
        }
    }

    /**
     * Get all firms
     */
    function getAll() {
        return DB.getFirms();
    }

    /**
     * Get a firm by ID (null-safe)
     */
    function getById(firmId) {
        if (!firmId) return null;
        return DB.getFirms().find(f => f.id === firmId) || null;
    }

    /**
     * Get the currently selected firm object (null = All Firms)
     */
    function getSelected() {
        const firmId = DB.getActiveFirm();
        if (!firmId) return null;
        const firm = getById(firmId);
        // If stored firm no longer exists, fall back to All
        if (!firm) {
            DB.setActiveFirm(null);
            return null;
        }
        return firm;
    }

    /**
     * Filter loans by active firm.
     * If "All Firms" selected returns all loans.
     * Old loans without firm_id are treated as belonging to main firm.
     */
    function filterLoans(loans) {
        try {
            const firmId = DB.getActiveFirm();
            if (!firmId) return loans || [];
            const mainFirm = DB.getMainFirm();
            return (loans || []).filter(loan => {
                const lFirmId = loan?.firm_id;
                if (!lFirmId && mainFirm) return mainFirm.id === firmId;
                return lFirmId === firmId;
            });
        } catch (e) {
            return loans || [];
        }
    }

    /**
     * Filter customers by active firm.
     */
    function filterCustomers(customers) {
        try {
            const firmId = DB.getActiveFirm();
            if (!firmId) return customers || [];
            const mainFirm = DB.getMainFirm();
            return (customers || []).filter(cust => {
                const cFirmId = cust?.firm_id;
                if (!cFirmId && mainFirm) return mainFirm.id === firmId;
                return cFirmId === firmId;
            });
        } catch (e) {
            return customers || [];
        }
    }

    /**
     * Get the color config for a firm by its colorIndex.
     */
    function getColor(firm) {
        if (!firm) return FIRM_COLORS[0];
        const idx = (firm.colorIndex || 0) % FIRM_COLORS.length;
        return FIRM_COLORS[idx];
    }

    /**
     * Render a colored badge HTML for a firm.
     */
    function getBadgeHtml(firmId) {
        try {
            const firm = getById(firmId);
            if (!firm) {
                // fallback: check main firm
                const main = DB.getMainFirm();
                if (!main) return '';
                const c = getColor(main);
                return `<span class="firm-badge" style="background:${c.bg};color:${c.text};">🏢 ${main.name}</span>`;
            }
            const c = getColor(firm);
            return `<span class="firm-badge" style="background:${c.bg};color:${c.text};">🏢 ${firm.name}</span>`;
        } catch (e) {
            return '';
        }
    }

    /**
     * Build the firm selector <select> options HTML.
     * selectedFirmId = '' means "All Firms".
     */
    function buildSelectOptions(selectedFirmId) {
        const firms = getAll();
        let html = `<option value="">🌐 All Firms</option>`;
        firms.forEach(f => {
            const sel = f.id === selectedFirmId ? 'selected' : '';
            html += `<option value="${f.id}" ${sel}>${f.name}${f.isMain ? ' (Main)' : ''}</option>`;
        });
        return html;
    }

    /**
     * Get default firm_id for a new loan/customer.
     * Returns active firm id, or main firm id if "All Firms" mode.
     */
    function getDefaultFirmId() {
        const firmId = DB.getActiveFirm();
        if (firmId) return firmId;
        const main = DB.getMainFirm();
        return main ? main.id : null;
    }

    /**
     * Compute per-firm summary stats for a list of loans.
     */
    function computeFirmStats(loans, customers) {
        const firms = getAll();
        const mainFirm = DB.getMainFirm();
        const settings = DB.getSettings();
        const today = new Date();

        return firms.map(firm => {
            const firmLoans = (loans || []).filter(l => {
                const lFirmId = l?.firm_id;
                if (!lFirmId && mainFirm) return mainFirm.id === firm.id;
                return lFirmId === firm.id;
            });

            const firmCustomers = (customers || []).filter(c => {
                const cFirmId = c?.firm_id;
                if (!cFirmId && mainFirm) return mainFirm.id === firm.id;
                return cFirmId === firm.id;
            });

            let totalPrincipal = 0, totalInterest = 0, activeLoans = 0, overdueLoans = 0;
            firmLoans.forEach(loan => {
                totalPrincipal += loan.loanAmount || 0;
                const loanDate = new Date(loan.loanStartDate || loan.createdAt);
                const days = Math.max(0, Math.floor((today - loanDate) / (1000 * 60 * 60 * 24)));
                const annualRate = (typeof Calculator !== 'undefined')
                    ? Calculator.toAnnualRate(loan.interestRate || 0, loan.interestPeriod || 'yearly')
                    : 0;
                const interest = ((loan.loanAmount || 0) * (annualRate / 100) * Math.max(days, 1)) / 365;
                totalInterest += interest;
                const remaining = (loan.loanAmount || 0) - (loan.partialRepayment || 0);
                if (remaining > 0 || typeof loan.status === 'undefined' || loan.status === 'active') {
                    activeLoans++;
                    if (days > 90) overdueLoans++;
                }
            });

            const color = getColor(firm);
            return {
                firm,
                color,
                totalLoans: firmLoans.length,
                totalCustomers: firmCustomers.length,
                totalPrincipal,
                totalInterest: Math.floor(totalInterest),
                activeLoans,
                overdueLoans,
                profitLoss: totalInterest - 0 // simplified
            };
        });
    }

    return {
        seedDefaultFirm,
        getAll, getById, getSelected,
        filterLoans, filterCustomers,
        getColor, getBadgeHtml, buildSelectOptions,
        getDefaultFirmId, computeFirmStats,
        FIRM_COLORS
    };
})();
