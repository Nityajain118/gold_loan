/* ============================================
   DB Module — localStorage CRUD
   ============================================ */
const DB = (() => {
    const KEYS = {
        loans: 'gv_loans',
        customers: 'gv_customers',
        inventory: 'gv_inventory',
        marketLog: 'gv_market_log',
        settings: 'gv_settings',
        activityLog: 'gv_activity_log',
        session: 'gv_session'
    };

    const DEFAULT_SETTINGS = {
        pin: null,
        safetyMargin: 20,
        darkMode: false,
        autoFetchRates: true,
        currentGoldRate: 7200,
        currentSilverRate: 85,
        lastRateUpdate: null,
        ltvPercentage: 75,
        timeMode: 'normal',
        shopName: 'GoldVault Finance',
        shopAddress: '123 Main Street, City',
        shopPhone: '',
        shopLogo: ''
    };

    function _get(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    function _set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function uuid() {
        return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
            ((Math.random() * 16) | 0).toString(16)
        );
    }

    // --- Settings ---
    function getSettings() {
        return { ...DEFAULT_SETTINGS, ...(_get(KEYS.settings) || {}) };
    }

    function saveSettings(updates) {
        const current = getSettings();
        _set(KEYS.settings, { ...current, ...updates });
    }

    // --- PIN ---
    function hasPin() {
        const s = getSettings();
        return !!s.pin;
    }

    async function hashPin(pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + '_goldvault_salt');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function setPin(pin) {
        const hashed = await hashPin(pin);
        saveSettings({ pin: hashed });
    }

    async function verifyPin(pin) {
        const hashed = await hashPin(pin);
        const settings = getSettings();
        return settings.pin === hashed;
    }

    // --- Session ---
    function setSession() {
        _set(KEYS.session, { loggedIn: true, lastActive: Date.now() });
    }

    function getSession() {
        return _get(KEYS.session);
    }

    function clearSession() {
        localStorage.removeItem(KEYS.session);
    }

    function isSessionValid() {
        const session = getSession();
        if (!session || !session.loggedIn) return false;
        const elapsed = Date.now() - session.lastActive;
        return elapsed < 15 * 60 * 1000; // 15 min timeout
    }

    // --- Loans ---
    function getLoans() {
        return _get(KEYS.loans) || [];
    }

    function getLoan(id) {
        return getLoans().find(l => l.id === id);
    }

    function saveLoan(loan) {
        const loans = getLoans();
        loan.id = loan.id || uuid();
        loan.createdAt = loan.createdAt || new Date().toISOString();
        const idx = loans.findIndex(l => l.id === loan.id);
        if (idx >= 0) {
            loans[idx] = { ...loans[idx], ...loan };
        } else {
            loans.push(loan);
        }
        _set(KEYS.loans, loans);
        logActivity(`Loan ${idx >= 0 ? 'updated' : 'created'}: ${loan.customerName}`);
        return loan;
    }

    function deleteLoan(id) {
        const loans = getLoans().filter(l => l.id !== id);
        _set(KEYS.loans, loans);
        logActivity(`Loan deleted: ${id}`);
    }

    // --- Customers ---
    function getCustomers() {
        return _get(KEYS.customers) || [];
    }

    function getCustomer(id) {
        return getCustomers().find(c => c.id === id);
    }

    function saveCustomer(customer) {
        const customers = getCustomers();
        customer.id = customer.id || uuid();
        const idx = customers.findIndex(c => c.id === customer.id);
        if (idx >= 0) {
            customers[idx] = { ...customers[idx], ...customer };
        } else {
            customers.push(customer);
        }
        _set(KEYS.customers, customers);
        return customer;
    }

    function deleteCustomer(id) {
        const customers = getCustomers().filter(c => c.id !== id);
        _set(KEYS.customers, customers);
    }

    // --- Inventory ---
    function getInventory() {
        return _get(KEYS.inventory) || [];
    }

    function getInventoryItem(id) {
        return getInventory().find(i => i.id === id);
    }

    function saveInventoryItem(item) {
        const inventory = getInventory();
        item.id = item.id || uuid();
        item.createdAt = item.createdAt || new Date().toISOString();
        item.updatedAt = new Date().toISOString();
        const idx = inventory.findIndex(i => i.id === item.id);
        if (idx >= 0) {
            inventory[idx] = { ...inventory[idx], ...item };
        } else {
            inventory.push(item);
        }
        _set(KEYS.inventory, inventory);
        logActivity(`Inventory item ${idx >= 0 ? 'updated' : 'added'}: ${item.itemName}`);
        return item;
    }

    function deleteInventoryItem(id) {
        const item = getInventoryItem(id);
        const inventory = getInventory().filter(i => i.id !== id);
        _set(KEYS.inventory, inventory);
        logActivity(`Inventory item deleted: ${item ? item.itemName : id}`);
    }

    // --- Market Log ---
    function getMarketLog() {
        return _get(KEYS.marketLog) || [];
    }

    function addMarketEntry(goldPrice, silverPrice) {
        const log = getMarketLog();
        const today = new Date().toISOString().split('T')[0];
        const existing = log.findIndex(e => e.date === today);
        const entry = { date: today, goldPrice, silverPrice };
        if (existing >= 0) {
            log[existing] = entry;
        } else {
            log.push(entry);
        }
        // Keep last 365 days
        if (log.length > 365) log.shift();
        _set(KEYS.marketLog, log);
        saveSettings({ currentGoldRate: goldPrice, currentSilverRate: silverPrice, lastRateUpdate: today });
    }

    // --- Activity Log ---
    function logActivity(action) {
        const log = _get(KEYS.activityLog) || [];
        log.push({ action, timestamp: new Date().toISOString() });
        if (log.length > 500) log.splice(0, log.length - 500);
        _set(KEYS.activityLog, log);
    }

    function getActivityLog() {
        return (_get(KEYS.activityLog) || []).reverse();
    }

    return {
        getSettings, saveSettings, hasPin, setPin, verifyPin,
        setSession, getSession, clearSession, isSessionValid,
        getLoans, getLoan, saveLoan, deleteLoan,
        getCustomers, getCustomer, saveCustomer, deleteCustomer,
        getInventory, getInventoryItem, saveInventoryItem, deleteInventoryItem,
        getMarketLog, addMarketEntry,
        logActivity, getActivityLog, uuid
    };
})();
