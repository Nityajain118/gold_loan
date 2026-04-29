/* ============================================
   Market Module — Metal Price Fetching
   ============================================ */
const Market = (() => {
    // Free API for metal prices (fallback to manual)
    // Using metals-api.com free tier or manual override
    const API_URL = 'https://api.metalpriceapi.com/v1/latest';
    const API_KEY = ''; // User can set their own key in settings

    /**
     * Fetch live gold & silver prices in INR per gram
     * Falls back to stored rates if API fails
     */
    async function fetchLiveRates() {
        const settings = DB.getSettings();

        // Try fetching from a free API
        try {
            // Using exchangerate-style free API
            const response = await fetch(
                `https://www.goldapi.io/api/XAU/INR`,
                {
                    headers: { 'x-access-token': 'goldapi-demo' },
                    signal: AbortSignal.timeout(5000)
                }
            );

            if (response.ok) {
                const data = await response.json();
                if (data.price_gram_24k) {
                    const goldRate = Math.round(data.price_gram_24k);
                    // Approximate silver from gold ratio (typically 1:80)
                    const silverRate = settings.currentSilverRate || Math.round(goldRate / 80);

                    DB.addMarketEntry(goldRate, silverRate);
                    return { gold: goldRate, silver: silverRate, source: 'live' };
                }
            }
        } catch (e) {
            // API failed, use stored rates
        }

        // Fallback: return stored rates
        return {
            gold: settings.currentGoldRate || 7200,
            silver: settings.currentSilverRate || 85,
            source: 'stored'
        };
    }

    /**
     * Get current rates (from settings)
     */
    function getCurrentRates() {
        const settings = DB.getSettings();
        return {
            gold: settings.currentGoldRate || 7200,
            silver: settings.currentSilverRate || 85,
            lastUpdate: settings.lastRateUpdate
        };
    }

    /**
     * Manually set rates
     */
    function setManualRates(goldRate, silverRate) {
        DB.addMarketEntry(goldRate, silverRate);
        return { gold: goldRate, silver: silverRate, source: 'manual' };
    }

    /**
     * Get rate for specific metal type
     */
    function getRate(metalType) {
        const rates = getCurrentRates();
        return metalType === 'gold' ? rates.gold : rates.silver;
    }

    /**
     * Update ticker display
     */
    function updateTicker() {
        const rates = getCurrentRates();
        const goldEl = document.getElementById('ticker-gold');
        const silverEl = document.getElementById('ticker-silver');
        if (goldEl) goldEl.textContent = `₹${rates.gold.toLocaleString('en-IN')}`;
        if (silverEl) silverEl.textContent = `₹${rates.silver.toLocaleString('en-IN')}`;
    }

    /**
     * Auto-refresh rates (if enabled)
     */
    async function autoRefresh() {
        const settings = DB.getSettings();
        if (settings.autoFetchRates) {
            const rates = await fetchLiveRates();
            updateTicker();
            return rates;
        }
        return getCurrentRates();
    }

    /**
     * Show modal to update market rates manually from the ticker
     */
    function showUpdateModal() {
        document.getElementById('market-rate-modal')?.remove();
        
        const rates = getCurrentRates();
        const isHi = (typeof I18n !== 'undefined') && I18n.getLang() === 'hi';
        const t = {
            title: isHi ? '📈 मार्केट रेट अपडेट करें' : '📈 Update Market Rates',
            gold: isHi ? 'गोल्ड रेट (₹/ग्राम)' : 'Gold Rate (₹/gram)',
            silver: isHi ? 'सिल्वर रेट (₹/ग्राम)' : 'Silver Rate (₹/gram)',
            cancel: isHi ? 'रद्द करें' : 'Cancel',
            save: isHi ? 'सेव करें' : 'Save Rates',
            success: isHi ? 'मार्केट रेट अपडेट हो गए!' : 'Market rates updated successfully!'
        };

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'market-rate-modal';
        overlay.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <h3 class="modal-title">${t.title}</h3>
                
                <div class="form-group mb-2">
                    <label class="form-label">🥇 ${t.gold}</label>
                    <input type="number" class="form-input" id="modal-gold-rate" value="${rates.gold}" min="1">
                </div>
                
                <div class="form-group mb-3">
                    <label class="form-label">🥈 ${t.silver}</label>
                    <input type="number" class="form-input" id="modal-silver-rate" value="${rates.silver}" min="1">
                </div>
                
                <div class="modal-actions">
                    <button class="btn btn-outline" onclick="document.getElementById('market-rate-modal').remove()">${t.cancel}</button>
                    <button class="btn btn-primary" id="modal-save-rates">${t.save}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Click outside to close
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };

        // Save action
        document.getElementById('modal-save-rates').onclick = () => {
            const newGold = parseFloat(document.getElementById('modal-gold-rate').value);
            const newSilver = parseFloat(document.getElementById('modal-silver-rate').value);
            
            if (!newGold || !newSilver || newGold <= 0 || newSilver <= 0) {
                if (typeof UI !== 'undefined') UI.toast('Please enter valid rates', 'error');
                return;
            }

            setManualRates(newGold, newSilver);
            updateTicker();
            overlay.remove();
            
            if (typeof UI !== 'undefined') UI.toast(t.success, 'success');
            
            // If we are on the Market page, refresh it
            const pageTitle = document.getElementById('page-title');
            if (pageTitle && (pageTitle.textContent === 'Market Rates' || pageTitle.textContent === 'मार्केट रेट')) {
                const container = document.getElementById('page-container');
                if (typeof MarketPage !== 'undefined' && container) {
                    MarketPage.render(container);
                }
            }
        };
    }

    return {
        fetchLiveRates, getCurrentRates, setManualRates,
        getRate, updateTicker, autoRefresh, showUpdateModal
    };
})();
