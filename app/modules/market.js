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

    return {
        fetchLiveRates, getCurrentRates, setManualRates,
        getRate, updateTicker, autoRefresh
    };
})();
