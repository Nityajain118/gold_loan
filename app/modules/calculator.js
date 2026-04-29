/* ============================================
   Calculator Module — Financial Logic
   ============================================ */
const Calculator = (() => {
    // Purity factors
    const PURITY = {
        '24K': 1.0,
        '22K': 0.9167,
        '20K': 0.8333,
        '18K': 0.75,
        '14K': 0.585,
        '999': 0.999,
        '925': 0.925,
        '900': 0.900,
        '800': 0.800
    };

    const GOLD_TYPES = ['24K', '22K', '20K', '18K', '14K'];
    const SILVER_TYPES = ['999', '925', '900', '800'];

    const JEWELRY_TYPES = {
        gold: ['Ring', 'Necklace', 'Chain', 'Bangle', 'Bracelet', 'Earring', 'Pendant', 'Anklet', 'Mangalsutra', 'Coin', 'Bar', 'Nose Pin', 'Maang Tikka', 'Waist Belt', 'Other'],
        silver: ['Ring', 'Necklace', 'Chain', 'Bangle', 'Bracelet', 'Anklet', 'Coin', 'Bar', 'Payal', 'Plate', 'Glass', 'Idol', 'Utensil', 'Toe Ring', 'Other']
    };

    // ── Custom Item Type Persistence ───────────────
    const CUSTOM_ITEMS_KEY = 'gv_custom_item_types';
    const CUSTOM_PURITIES_KEY = 'gv_custom_purities';

    function getCustomItemTypes(metalType) {
        try {
            const all = JSON.parse(localStorage.getItem(CUSTOM_ITEMS_KEY)) || {};
            // Filter out any short/partial entries (< 2 chars) that may have been saved by mistake
            const clean = (all[metalType] || []).filter(t => t && t.trim().length >= 2);
            // If cleanup changed anything, persist it
            if (clean.length !== (all[metalType] || []).length) {
                all[metalType] = clean;
                localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(all));
            }
            return clean;
        } catch { return []; }
    }

    // Remove a specific custom item type (for settings management)
    function deleteCustomItemType(metalType, name) {
        try {
            const all = JSON.parse(localStorage.getItem(CUSTOM_ITEMS_KEY)) || {};
            if (all[metalType]) {
                all[metalType] = all[metalType].filter(t => t.toLowerCase() !== name.toLowerCase());
                localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(all));
            }
        } catch { /* silent fail */ }
    }

    function saveCustomItemType(metalType, name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        try {
            const all = JSON.parse(localStorage.getItem(CUSTOM_ITEMS_KEY)) || {};
            if (!all[metalType]) all[metalType] = [];
            // Avoid duplicates (case-insensitive)
            if (!all[metalType].some(t => t.toLowerCase() === trimmed.toLowerCase())) {
                all[metalType].push(trimmed);
                localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(all));
            }
        } catch { /* silent fail */ }
    }

    function getCustomPurities(metalType) {
        try {
            const all = JSON.parse(localStorage.getItem(CUSTOM_PURITIES_KEY)) || {};
            return (all[metalType] || []).filter(Boolean);
        } catch { return []; }
    }

    // Remove a specific custom purity value (for settings management)
    function deleteCustomPurity(metalType, purityPct) {
        const key = parseFloat(parseFloat(purityPct).toFixed(2));
        try {
            const all = JSON.parse(localStorage.getItem(CUSTOM_PURITIES_KEY)) || {};
            if (all[metalType]) {
                all[metalType] = all[metalType].filter(p => p !== key);
                localStorage.setItem(CUSTOM_PURITIES_KEY, JSON.stringify(all));
            }
        } catch { /* silent fail */ }
    }

    function saveCustomPurity(metalType, purityPct) {
        const val = parseFloat(purityPct);
        if (!val || val <= 0 || val > 100) return;
        const key = parseFloat(val.toFixed(2)); // normalize
        try {
            const all = JSON.parse(localStorage.getItem(CUSTOM_PURITIES_KEY)) || {};
            if (!all[metalType]) all[metalType] = [];
            if (!all[metalType].includes(key)) {
                all[metalType].push(key);
                all[metalType].sort((a, b) => b - a); // highest first
                localStorage.setItem(CUSTOM_PURITIES_KEY, JSON.stringify(all));
            }
        } catch { /* silent fail */ }
    }

    function getPurityFactor(subType) {
        if (subType === 'custom') return 1.0; // fallback; use customPurity field directly
        // If subType is a numeric string (e.g. "87.5"), treat as percentage
        const num = parseFloat(subType);
        if (!isNaN(num) && !PURITY[subType]) return Math.min(100, Math.max(0, num)) / 100;
        return PURITY[subType] || 1.0;
    }

    /**
     * Build purity <select> options for item rows (New Loan & Old Loan)
     * Includes a "Custom Purity" option at the end.
     */
    function buildItemPurityOptions(metal, selectedPurity) {
        const types = metal === 'gold' ? GOLD_TYPES : SILVER_TYPES;
        let opts = types.map(p => {
            const pct = (getPurityFactor(p) * 100).toFixed(1);
            return `<option value="${p}" ${selectedPurity === p ? 'selected' : ''}>${p} (${pct}%)</option>`;
        }).join('');
        // Saved custom purities — appear as selectable options
        const savedCustom = getCustomPurities(metal);
        if (savedCustom.length) {
            opts += savedCustom.map(cp => {
                const label = `${cp}% (Custom)`;
                const isSelected = selectedPurity === String(cp) || selectedPurity === cp;
                return `<option value="${cp}" ${isSelected ? 'selected' : ''}>${label}</option>`;
            }).join('');
        }
        opts += `<option value="custom" ${selectedPurity === 'custom' ? 'selected' : ''}>✏️ Custom Purity</option>`;
        return opts;
    }

    function getMetalSubTypes(metalType) {
        return metalType === 'gold' ? GOLD_TYPES : SILVER_TYPES;
    }

    function getJewelryTypes(metalType) {
        const base = JEWELRY_TYPES[metalType] || JEWELRY_TYPES.gold;
        const customs = getCustomItemTypes(metalType);
        if (!customs.length) return base;
        // Insert custom types before 'Other'
        const withoutOther = base.filter(t => t !== 'Other');
        return [...withoutOther, ...customs, 'Other'];
    }

    /**
     * Calculate metal value after purity deduction
     */
    function calcMetalValue(weightGrams, subType, pricePerGram) {
        const purityFactor = getPurityFactor(subType);
        return weightGrams * purityFactor * pricePerGram;
    }

    /**
     * Calculate total metal value from an array of jewelry items
     * Each item: { itemType, metalType, purity, weightGrams }
     */
    function calcItemsMetalValue(items, goldRate, silverRate) {
        let totalValue = 0;
        let totalGoldWeight = 0;
        let totalSilverWeight = 0;
        let goldItems = 0;
        let silverItems = 0;

        (items || []).forEach(item => {
            if (!item.weightGrams || item.weightGrams <= 0) return;
            const rate = item.metalType === 'gold' ? goldRate : silverRate;
            totalValue += calcMetalValue(item.weightGrams, item.purity, rate);
            if (item.metalType === 'gold') {
                totalGoldWeight += item.weightGrams;
                goldItems++;
            } else {
                totalSilverWeight += item.weightGrams;
                silverItems++;
            }
        });

        return { totalValue, totalGoldWeight, totalSilverWeight, goldItems, silverItems, totalItems: goldItems + silverItems };
    }

    /**
     * Simple Interest — month-based (kept for compound fallback + legacy)
     * SI = P × R × T where T is in years, R is annual rate as fraction
     */
    function calcSimpleInterest(principal, annualRate, months) {
        const timeYears = months / 12;
        return principal * (annualRate / 100) * timeYears;
    }

    /**
     * Simple Interest — Day-wise (accurate, primary method)
     * Legacy thin wrapper kept for any external callers.
     */
    function calcSimpleInterestByDays(principal, annualRate, days, basis) {
        basis = basis || 360;
        if (!principal || !annualRate || !days || days < 0) return 0;
        return principal * (annualRate / 100) * (days / basis);
    }

    // ── Jewellery-standard utility functions (360-day basis default) ───────────

    /**
     * Get exact calendar days between two dates (safe, never negative).
     */
    function getExactDays(startDate, endDate) {
        try {
            const oneDay = 1000 * 60 * 60 * 24;
            const start = new Date(startDate);
            const end   = new Date(endDate);
            if (isNaN(start) || isNaN(end)) return 0;
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return Math.max(0, Math.floor((end - start) / oneDay));
        } catch (e) { return 0; }
    }

    /**
     * Day-wise interest using jewellery standard (default 360-day basis).
     * Interest = (Principal × Annual Rate × Days) / Basis
     * @param {number} principal
     * @param {number} monthlyRate — monthly rate % (e.g. 2 for 2%)
     * @param {*} startDate
     * @param {*} endDate
     * @param {number} basis — 360 (default) or 365
     * @returns {{ days: number, interest: number }}
     */
    function calculateDayWiseInterest(principal, monthlyRate, startDate, endDate, basis) {
        basis = basis || 360;
        try {
            if (!principal || !monthlyRate) return { days: 0, interest: 0 };
            const days       = getExactDays(startDate, endDate);
            const annualRate = monthlyRate * 12;
            const interest   = (principal * annualRate / 100) * (days / basis);
            return { days, interest: parseFloat(interest.toFixed(2)) };
        } catch (e) { return { days: 0, interest: 0 }; }
    }

    /**
     * One full month's interest (mode-independent reference).
     * @param {number} principal
     * @param {number} monthlyRate — monthly rate % (e.g. 2)
     * @returns {number}
     */
    function calculateMonthlyInterest(principal, monthlyRate) {
        try {
            if (!principal || !monthlyRate) return 0;
            return parseFloat((principal * (monthlyRate / 100)).toFixed(2));
        } catch (e) { return 0; }
    }

    /**
     * Compound Interest (monthly compounding) — LEGACY, do not modify
     * CI = P × ((1 + r/12)^months - 1)
     */
    function calcCompoundInterest(principal, annualRate, months) {
        const monthlyRate = annualRate / 100 / 12;
        return principal * (Math.pow(1 + monthlyRate, months) - 1);
    }

    /**
     * Compound Interest with configurable compounding frequency
     * A = P × (1 + r/n)^(n×t)  →  CI = A - P
     * @param {number} principal
     * @param {number} annualRate — annual % (e.g. 24)
     * @param {number} months — duration in months
     * @param {number} frequency — compounding times per year: 1, 2, 4, or 12
     */
    function calcCompoundInterestWithFreq(principal, annualRate, months, frequency) {
        frequency = frequency || 12;
        const r = annualRate / 100;
        const t = months / 12;
        const amount = principal * Math.pow(1 + r / frequency, frequency * t);
        return amount - principal;
    }

    /**
     * Convert rate based on period
     */
    function toAnnualRate(rate, period) {
        return period === 'monthly' ? rate * 12 : rate;
    }

    /**
     * Calculate full loan details
     * @param {object} loan
     * @param {number} currentMarketRate
     * @param {object} [options]         — { basis: 360|365 }
     */
    function calcLoanDetails(loan, currentMarketRate, options) {
        options = options || {};
        const basis = options.basis || 360; // 360 = jewellery standard (default)
        const settings = DB.getSettings();
        const timeMode = loan.timeMode || settings.timeMode || 'normal';

        // Calculate metal value — use items array if available, else legacy single-item
        let metalValue, metalValueForLTV;
        if (loan.items && loan.items.length > 0) {
            const s = calcItemsMetalValue(loan.items, settings.currentGoldRate, settings.currentSilverRate);
            metalValue = s.totalValue;
            metalValueForLTV = s.totalValue;
        } else {
            metalValue = calcMetalValue(loan.weightGrams, loan.metalSubType, currentMarketRate);
            metalValueForLTV = metalValue;
        }

        const annualRate = toAnnualRate(loan.interestRate, loan.interestPeriod);

        // Calculate months elapsed — support Tithi mode
        const startDate = new Date(loan.loanStartDate);
        const endDate = options.endDate ? new Date(options.endDate) : new Date();
        const now = endDate;
        let monthsElapsed;
        let tithiDuration = null;

        if (timeMode === 'tithi' && typeof Tithi !== 'undefined') {
            try {
                tithiDuration = Tithi.getTithiDuration(startDate, now);
                monthsElapsed = tithiDuration ? Math.max(0, tithiDuration.months) : 0;
            } catch (e) {
                // Fallback to normal
                monthsElapsed = Math.max(0,
                    (now.getFullYear() - startDate.getFullYear()) * 12 +
                    (now.getMonth() - startDate.getMonth()) +
                    (now.getDate() >= startDate.getDate() ? 0 : -1)
                );
            }
        } else {
            monthsElapsed = Math.max(0,
                (now.getFullYear() - startDate.getFullYear()) * 12 +
                (now.getMonth() - startDate.getMonth()) +
                (now.getDate() >= startDate.getDate() ? 0 : -1)
            );
        }

        const durationMonths = loan.loanDuration || monthsElapsed;
        const monthsForCalc = Math.max(monthsElapsed, 1);

        // ── Exact day count ────────────────────────────────────────────────────
        const daysElapsed = getExactDays(loan.loanStartDate, endDate);

        // ── Interest calculation ──────────────────────────────────────────────
        let totalInterest;
        let dayInterest    = 0;   // accurate day-wise SI
        let monthlyInterest = 0;  // 1 full month's interest (reference / monthly mode)
        const compFreq = loan.compoundingFrequency || 12;
        // monthlyRatePct: monthly rate as a percent (e.g. 2 for 2% per month)
        const monthlyRatePct = annualRate / 12;

        if (loan.interestType === 'compound') {
            // Compound stays month-based (mathematically correct)
            totalInterest    = calcCompoundInterestWithFreq(loan.loanAmount, annualRate, monthsForCalc, compFreq);
            dayInterest      = totalInterest;
            monthlyInterest  = calculateMonthlyInterest(loan.loanAmount, monthlyRatePct);
        } else {
            // Simple Interest — day-wise with selected basis (360 or 365)
            const dwResult   = calculateDayWiseInterest(loan.loanAmount, monthlyRatePct, loan.loanStartDate, endDate, basis);
            dayInterest      = dwResult.interest;
            totalInterest    = dayInterest;   // day-wise is authoritative
            monthlyInterest  = calculateMonthlyInterest(loan.loanAmount, monthlyRatePct);
        }
        const monthlyInterestRef = monthlyInterest; // backward-compat alias

        // Adjustments for old loans
        const paidInterest = loan.paidInterest || 0;
        const partialRepayment = loan.partialRepayment || 0;
        const manualPenalty = loan.manualPenalty || 0;

        const remainingInterest = Math.max(0, totalInterest - paidInterest);
        const remainingPrincipal = Math.max(0, loan.loanAmount - partialRepayment);
        const totalPayable = remainingPrincipal + remainingInterest + manualPenalty;

        // Maturity date
        const maturityDate = new Date(startDate);
        maturityDate.setMonth(maturityDate.getMonth() + (loan.loanDuration || 12));

        // Tithi info for start and maturity
        let startTithi = null, maturityTithi = null;
        if (typeof Tithi !== 'undefined') {
            try {
                startTithi = Tithi.getTithiInfo(startDate);
                maturityTithi = Tithi.getTithiInfo(maturityDate);
            } catch (e) { /* ignore */ }
        }

        // LTV
        const ltv = metalValueForLTV > 0 ? (loan.loanAmount / metalValueForLTV) * 100 : 0;

        // Break-even price per gram
        const purityFactor = getPurityFactor(loan.metalSubType);
        const effectiveWeight = loan.weightGrams * purityFactor;
        const breakEvenPrice = effectiveWeight > 0 ? totalPayable / effectiveWeight : 0;

        // Profit / Loss
        const profitLoss = metalValue - totalPayable;
        const profitMargin = totalPayable > 0 ? (profitLoss / totalPayable) * 100 : 0;

        // Safety buffer
        const safetyBuffer = totalPayable > 0 ? ((metalValue - totalPayable) / totalPayable) * 100 : 0;
        const safetyMargin = settings.safetyMargin || 20;

        // Risk assessment
        let riskLevel, riskLabel;
        if (safetyBuffer >= safetyMargin) {
            riskLevel = 'safe';
            riskLabel = '✅ SAFE — HOLD';
        } else if (safetyBuffer > 0) {
            riskLevel = 'monitor';
            riskLabel = '⚠️ MONITOR CLOSELY';
        } else {
            riskLevel = 'danger';
            riskLabel = '🔴 SELL RECOMMENDED';
        }

        // Days to maturity
        const daysToMaturity = Math.max(0, Math.ceil((maturityDate - now) / (1000 * 60 * 60 * 24)));
        const isNearMaturity = daysToMaturity <= 30 && daysToMaturity > 0;
        const isOverdue = daysToMaturity === 0 && now > maturityDate;

        // Effective annual rate
        const effectiveRate = loan.interestType === 'compound'
            ? (Math.pow(1 + annualRate / 100 / compFreq, compFreq) - 1) * 100
            : annualRate;

        return {
            metalValue,
            totalInterest,
            dayInterest,
            monthlyInterest,
            monthlyInterestRef,  // alias kept for compat
            daysElapsed,
            basis,               // pass through so UI can display it
            paidInterest,
            remainingInterest,
            partialRepayment,
            manualPenalty,
            remainingPrincipal,
            totalPayable,
            maturityDate: maturityDate.toISOString(),
            ltv,
            breakEvenPrice,
            profitLoss,
            profitMargin,
            safetyBuffer,
            riskLevel,
            riskLabel,
            daysToMaturity,
            isNearMaturity,
            isOverdue,
            monthsElapsed,
            annualRate,
            effectiveRate,
            durationMonths,
            timeMode,
            tithiDuration,
            startTithi,
            maturityTithi,
            compoundingFrequency: compFreq
        };
    }

    /**
     * Quick preview calculation (for form auto-calc)
     */
    function quickCalc(formData) {
        const settings = DB.getSettings();
        const rate = formData.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        const metalValue = calcMetalValue(formData.weightGrams || 0, formData.metalSubType || '24K', rate);

        const annualRate = toAnnualRate(formData.interestRate || 0, formData.interestPeriod || 'yearly');
        const months = formData.loanDuration || 12;
        const principal = formData.loanAmount || 0;
        const compFreq = formData.compoundingFrequency || 12;

        let totalInterest;
        if (formData.interestType === 'compound') {
            totalInterest = calcCompoundInterestWithFreq(principal, annualRate, months, compFreq);
        } else {
            totalInterest = calcSimpleInterest(principal, annualRate, months);
        }

        const totalPayable = principal + totalInterest;
        const ltv = metalValue > 0 ? (principal / metalValue) * 100 : 0;
        const purityFactor = getPurityFactor(formData.metalSubType || '24K');
        const effectiveWeight = (formData.weightGrams || 0) * purityFactor;
        const breakEvenPrice = effectiveWeight > 0 ? totalPayable / effectiveWeight : 0;
        const profitLoss = metalValue - totalPayable;

        // Effective annual rate for compound
        const effectiveRate = formData.interestType === 'compound'
            ? (Math.pow(1 + annualRate / 100 / compFreq, compFreq) - 1) * 100
            : annualRate;

        return { metalValue, totalInterest, totalPayable, ltv, breakEvenPrice, profitLoss, effectiveRate };
    }

    /**
     * Professional NBFC-style Gold Loan Risk Analysis
     *
     * @param {object} params
     *   pureGoldWeight  — weight × (purity/100) in grams
     *   goldValue       — pureGoldWeight × currentMarketPrice
     *   loanAmount      — principal loan amount (₹)
     *   currentPrice    — current gold market price per gram (₹)
     *
     * @returns {object} Full risk analysis object
     */
    function calcGoldRiskAnalysis({ pureGoldWeight, goldValue, loanAmount, currentPrice }) {
        const loan = loanAmount || 0;
        const pgw  = pureGoldWeight || 0;
        const gv   = goldValue || 0;
        const cp   = currentPrice || 0;

        // --- 1. Safety Margin ---
        const safetyMargin = gv - loan;
        let safetyStatus, safetyClass;
        if (safetyMargin > 0)      { safetyStatus = '✅ Safe Loan';          safetyClass = 'safe'; }
        else if (safetyMargin === 0){ safetyStatus = '⚠️ No Safety Margin';  safetyClass = 'monitor'; }
        else                        { safetyStatus = '🔴 High Risk Loan';    safetyClass = 'danger'; }

        // --- 2. LTV Risk Indicator ---
        const settings = DB.getSettings();
        const ltvPercentage = settings.ltvPercentage || 75;

        const ltv = gv > 0 ? (loan / gv) * 100 : 0;
        let ltvCategory, ltvClass;
        if (ltv <= ltvPercentage)      { ltvCategory = 'Safe Loan';      ltvClass = 'safe'; }
        else if (ltv <= 90) { ltvCategory = 'Moderate Risk';  ltvClass = 'monitor'; }
        else                { ltvCategory = 'High Risk';       ltvClass = 'danger'; }

        // --- 3. Break-even Gold Price ---
        const breakEvenPrice = pgw > 0 ? loan / pgw : 0;
        let alertStatus, alertClass;
        if (cp > breakEvenPrice)      { alertStatus = '✅ Loan Safe — Price above recovery level'; alertClass = 'safe'; }
        else if (cp === breakEvenPrice){ alertStatus = '⚠️ Warning: No Safety Margin';           alertClass = 'monitor'; }
        else                           { alertStatus = '🔴 High Risk: Price below recovery level'; alertClass = 'danger'; }

        // --- 4. Price Drop Simulation ---
        const drops = [5, 10, 20].map(pct => {
            const newPrice = cp * (1 - pct / 100);
            const newValue = pgw * newPrice;
            const covered  = newValue >= loan;
            const loss     = loan - newValue;
            return { pct, newPrice, newValue, covered, loss };
        });

        // --- 5. Safe Loan Recommendation (Custom LTV) ---
        const safeLoanAmount = gv * (ltvPercentage / 100);
        const exceedsSafe    = loan > safeLoanAmount;

        // --- 6. Loan Risk Score (4-tier) ---
        let riskScore, riskLabel, riskClass;
        if (ltv <= 70)       { riskScore = 1; riskLabel = 'Low Risk';       riskClass = 'safe'; }
        else if (ltv <= 85)  { riskScore = 2; riskLabel = 'Medium Risk';    riskClass = 'monitor'; }
        else if (ltv <= 95)  { riskScore = 3; riskLabel = 'High Risk';      riskClass = 'danger'; }
        else                 { riskScore = 4; riskLabel = 'Very High Risk';  riskClass = 'very-danger'; }

        return {
            safetyMargin, safetyStatus, safetyClass,
            ltv, ltvCategory, ltvClass,
            breakEvenPrice, alertStatus, alertClass,
            drops,
            safeLoanAmount, exceedsSafe,
            riskScore, riskLabel, riskClass
        };
    }

    return {
        PURITY, GOLD_TYPES, SILVER_TYPES, JEWELRY_TYPES,
        getPurityFactor, getMetalSubTypes, getJewelryTypes, buildItemPurityOptions,
        getCustomItemTypes, saveCustomItemType, deleteCustomItemType,
        getCustomPurities, saveCustomPurity, deleteCustomPurity,
        calcMetalValue, calcItemsMetalValue,
        calcSimpleInterest, calcSimpleInterestByDays,
        calcCompoundInterest, calcCompoundInterestWithFreq,
        getExactDays, calculateDayWiseInterest, calculateMonthlyInterest,
        toAnnualRate, calcLoanDetails, quickCalc, calcGoldRiskAnalysis
    };
})();

