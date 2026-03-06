/* ============================================
   Risk Module — Hold/Sell Decision Engine
   ============================================ */
const Risk = (() => {

    /**
     * Analyze all loans and return risk summary
     */
    function analyzePortfolio() {
        const loans = DB.getLoans().filter(l => l.status !== 'closed');
        const settings = DB.getSettings();

        let totalLoans = loans.length;
        let totalLoanAmount = 0;
        let totalMetalValue = 0;
        let totalPayable = 0;
        let expectedInterest = 0;
        let nearMaturity = 0;
        let riskZone = 0;
        let lossZone = 0;
        let safeZone = 0;
        const alerts = [];

        loans.forEach(loan => {
            const rate = loan.metalType === 'gold'
                ? settings.currentGoldRate
                : settings.currentSilverRate;

            const details = Calculator.calcLoanDetails(loan, rate);

            totalLoanAmount += loan.loanAmount;
            totalMetalValue += details.metalValue;
            totalPayable += details.totalPayable;
            expectedInterest += details.totalInterest;

            if (details.isNearMaturity) {
                nearMaturity++;
                alerts.push({
                    type: 'warning',
                    title: `Loan maturing soon`,
                    desc: `${loan.customerName} — ${details.daysToMaturity} days left`,
                    time: new Date().toISOString()
                });
            }

            if (details.isOverdue) {
                alerts.push({
                    type: 'danger',
                    title: `Loan overdue`,
                    desc: `${loan.customerName} — loan has passed maturity date`,
                    time: new Date().toISOString()
                });
            }

            if (details.riskLevel === 'danger') {
                lossZone++;
                alerts.push({
                    type: 'danger',
                    title: `SELL recommended`,
                    desc: `${loan.customerName} — Metal value below total payable`,
                    time: new Date().toISOString()
                });
            } else if (details.riskLevel === 'monitor') {
                riskZone++;
                alerts.push({
                    type: 'warning',
                    title: `Monitor closely`,
                    desc: `${loan.customerName} — Safety buffer is thin`,
                    time: new Date().toISOString()
                });
            } else {
                safeZone++;
            }
        });

        const portfolioProfitLoss = totalMetalValue - totalPayable;
        const overallLTV = totalMetalValue > 0 ? (totalLoanAmount / totalMetalValue) * 100 : 0;

        return {
            totalLoans,
            totalLoanAmount,
            totalMetalValue,
            totalPayable,
            expectedInterest,
            nearMaturity,
            riskZone,
            lossZone,
            safeZone,
            portfolioProfitLoss,
            overallLTV,
            alerts: alerts.slice(0, 20) // max 20 alerts
        };
    }

    /**
     * Get risk distribution data for charts
     */
    function getRiskDistribution() {
        const summary = analyzePortfolio();
        return {
            labels: ['Safe', 'Monitor', 'At Risk'],
            data: [summary.safeZone, summary.riskZone, summary.lossZone],
            colors: ['#10b981', '#f59e0b', '#ef4444']
        };
    }

    /**
     * Get portfolio value over time for trend chart
     */
    function getPortfolioTrend() {
        const marketLog = DB.getMarketLog();
        const loans = DB.getLoans().filter(l => l.status !== 'closed');

        // Use last 30 market entries
        const recentLog = marketLog.slice(-30);

        return recentLog.map(entry => {
            let totalValue = 0;
            loans.forEach(loan => {
                const rate = loan.metalType === 'gold' ? entry.goldPrice : entry.silverPrice;
                totalValue += Calculator.calcMetalValue(
                    loan.weightGrams, loan.metalSubType, rate
                );
            });

            return {
                date: entry.date,
                metalValue: totalValue,
                goldRate: entry.goldPrice,
                silverRate: entry.silverPrice
            };
        });
    }

    return {
        analyzePortfolio, getRiskDistribution, getPortfolioTrend
    };
})();
