/* ============================================
   Calculator Module — Financial Logic
   ============================================ */
const Calculator = (() => {
    // Purity factors
    const PURITY = {
        '24K': 1.0,
        '22K': 0.9167,
        '18K': 0.75,
        '14K': 0.585,
        '999': 0.999,
        '925': 0.925,
        '900': 0.900,
        '800': 0.800
    };

    const GOLD_TYPES = ['24K', '22K', '18K', '14K'];
    const SILVER_TYPES = ['999', '925', '900', '800'];

    const JEWELRY_TYPES = {
        gold: ['Ring', 'Necklace', 'Chain', 'Bangle', 'Bracelet', 'Earring', 'Pendant', 'Anklet', 'Mangalsutra', 'Coin', 'Bar', 'Nose Pin', 'Maang Tikka', 'Waist Belt', 'Other'],
        silver: ['Ring', 'Necklace', 'Chain', 'Bangle', 'Bracelet', 'Anklet', 'Coin', 'Bar', 'Payal', 'Plate', 'Glass', 'Idol', 'Utensil', 'Toe Ring', 'Other']
    };

    function getPurityFactor(subType) {
        return PURITY[subType] || 1.0;
    }

    function getMetalSubTypes(metalType) {
        return metalType === 'gold' ? GOLD_TYPES : SILVER_TYPES;
    }

    function getJewelryTypes(metalType) {
        return JEWELRY_TYPES[metalType] || JEWELRY_TYPES.gold;
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
     * Simple Interest
     * SI = P × R × T where T is in years, R is annual rate as fraction
     */
    function calcSimpleInterest(principal, annualRate, months) {
        const timeYears = months / 12;
        return principal * (annualRate / 100) * timeYears;
    }

    /**
     * Compound Interest (monthly compounding)
     * CI = P × ((1 + r/12)^months - 1)
     */
    function calcCompoundInterest(principal, annualRate, months) {
        const monthlyRate = annualRate / 100 / 12;
        return principal * (Math.pow(1 + monthlyRate, months) - 1);
    }

    /**
     * Convert rate based on period
     */
    function toAnnualRate(rate, period) {
        return period === 'monthly' ? rate * 12 : rate;
    }

    /**
     * Calculate full loan details
     */
    function calcLoanDetails(loan, currentMarketRate) {
        const settings = DB.getSettings();

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

        // Calculate months elapsed
        const startDate = new Date(loan.loanStartDate);
        const now = new Date();
        const monthsElapsed = Math.max(0,
            (now.getFullYear() - startDate.getFullYear()) * 12 +
            (now.getMonth() - startDate.getMonth()) +
            (now.getDate() >= startDate.getDate() ? 0 : -1)
        );

        const durationMonths = loan.loanDuration || monthsElapsed;
        const monthsForCalc = Math.max(monthsElapsed, 1);

        // Interest calculation
        let totalInterest;
        if (loan.interestType === 'compound') {
            totalInterest = calcCompoundInterest(loan.loanAmount, annualRate, monthsForCalc);
        } else {
            totalInterest = calcSimpleInterest(loan.loanAmount, annualRate, monthsForCalc);
        }

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

        return {
            metalValue,
            totalInterest,
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
            durationMonths
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

        let totalInterest;
        if (formData.interestType === 'compound') {
            totalInterest = calcCompoundInterest(principal, annualRate, months);
        } else {
            totalInterest = calcSimpleInterest(principal, annualRate, months);
        }

        const totalPayable = principal + totalInterest;
        const ltv = metalValue > 0 ? (principal / metalValue) * 100 : 0;
        const purityFactor = getPurityFactor(formData.metalSubType || '24K');
        const effectiveWeight = (formData.weightGrams || 0) * purityFactor;
        const breakEvenPrice = effectiveWeight > 0 ? totalPayable / effectiveWeight : 0;
        const profitLoss = metalValue - totalPayable;

        return { metalValue, totalInterest, totalPayable, ltv, breakEvenPrice, profitLoss };
    }

    return {
        PURITY, GOLD_TYPES, SILVER_TYPES, JEWELRY_TYPES,
        getPurityFactor, getMetalSubTypes, getJewelryTypes,
        calcMetalValue, calcItemsMetalValue,
        calcSimpleInterest, calcCompoundInterest,
        toAnnualRate, calcLoanDetails, quickCalc
    };
})();
