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

    /**
     * Render the "Loan Risk Analysis" HTML panel.
     * Call this from any page that has pureGoldWeight, goldValue, loanAmount & currentPrice.
     *
     * Returns an HTML string for insertion into the DOM.
     */
    function renderRiskPanel({ pureGoldWeight, goldValue, loanAmount, currentPrice }) {
        const settings = DB.getSettings();
        const ltvPercentage = settings.ltvPercentage || 75;

        if (!loanAmount || loanAmount <= 0 || !goldValue || goldValue <= 0) {
            return `<div class="risk-analysis-panel">
                <div class="risk-analysis-title">🔬 Loan Risk Analysis</div>
                <p style="color:var(--text-muted);font-size:0.88rem;">Enter loan amount and jewelry weight to see risk analysis.</p>
            </div>`;
        }

        const r = Calculator.calcGoldRiskAnalysis({ pureGoldWeight, goldValue, loanAmount, currentPrice });

        const dropRows = r.drops.map(d => `
            <tr>
                <td><span class="drop-pct-badge drop-${d.pct}">−${d.pct}%</span></td>
                <td>${UI.currency(d.newPrice)}/g</td>
                <td>${UI.currency(d.newValue)}</td>
                <td class="${d.covered ? 'drop-covered' : 'drop-not-covered'}">
                    ${d.covered ? '✅ Covered' : `⚠️ Short ${UI.currency(d.loss)}`}
                </td>
            </tr>`).join('');

        return `<div class="risk-analysis-panel">
            <div class="risk-analysis-title">🔬 Loan Risk Analysis <small style="font-size:0.72rem;font-weight:500;color:var(--text-muted);margin-left:4px;">NBFC Analytics</small></div>

            <!-- Risk Score Bar -->
            <div class="risk-score-section">
                <span class="risk-score-label">Risk Score</span>
                <div class="risk-score-bar"><div class="risk-score-fill ${r.riskClass}"></div></div>
                <span class="risk-score-badge ${r.riskClass}">${r.riskLabel}</span>
            </div>

            <!-- Core Metrics -->
            <div class="risk-metrics-grid">
                <div class="risk-metric-card ${r.ltvClass}">
                    <div class="risk-metric-label">LTV Ratio</div>
                    <div class="risk-metric-value">${r.ltv.toFixed(1)}%</div>
                    <div class="risk-metric-sub ${r.ltvClass === 'safe' ? 'text-safe' : r.ltvClass === 'monitor' ? 'text-monitor' : 'text-danger'}">${r.ltvCategory}</div>
                </div>
                <div class="risk-metric-card ${r.safetyClass}">
                    <div class="risk-metric-label">Safety Margin</div>
                    <div class="risk-metric-value">${UI.currency(Math.abs(r.safetyMargin))}</div>
                    <div class="risk-metric-sub">${r.safetyStatus}</div>
                </div>
                <div class="risk-metric-card ${r.ltv <= ltvPercentage ? 'safe' : 'monitor'}">
                    <div class="risk-metric-label">Break-Even Price</div>
                    <div class="risk-metric-value">${UI.currency(r.breakEvenPrice)}/g</div>
                    <div class="risk-metric-sub">Min. price to recover loan</div>
                </div>
                <div class="risk-metric-card safe">
                    <div class="risk-metric-label">Safe Loan Limit (${ltvPercentage}% LTV)</div>
                    <div class="risk-metric-value">${UI.currency(r.safeLoanAmount)}</div>
                    <div class="risk-metric-sub">Recommended maximum</div>
                </div>
            </div>

            <!-- Break-Even Note -->
            <div class="breakeven-note">
                💡 Gold price must remain above <strong>${UI.currency(r.breakEvenPrice)}/g</strong> to recover the loan safely.
                Current price: <strong>${UI.currency(currentPrice)}/g</strong>
            </div>

            <!-- Price Alert Banner -->
            <div class="price-alert-banner ${r.alertClass}">
                ${r.alertStatus}
            </div>

            <!-- Safe Loan Recommendation -->
            <div class="safe-loan-box">
                <div class="risk-metric-label" style="margin-bottom:6px;">📊 Recommended Safe Loan Amount</div>
                <div class="safe-amount">✅ ${UI.currency(r.safeLoanAmount)}</div>
                <div style="font-size:0.78rem;color:var(--text-muted);">Based on ${ltvPercentage}% LTV of gold value (${UI.currency(goldValue)})</div>
                ${r.exceedsSafe ? `<div class="safe-warning">⚠️ Warning: Entered loan amount exceeds recommended safe lending limit by ${UI.currency(loanAmount - r.safeLoanAmount)}</div>` : ''}
            </div>

            <!-- Gold Price Drop Simulation -->
            <div class="drop-simulation">
                <div class="drop-simulation-title">📉 Gold Price Drop Simulation</div>
                <div style="overflow-x:auto;">
                    <table class="drop-table">
                        <thead><tr>
                            <th>Price Drop</th>
                            <th>New Price/g</th>
                            <th>New Gold Value</th>
                            <th>Loan Coverage</th>
                        </tr></thead>
                        <tbody>${dropRows}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }

    return {
        analyzePortfolio, getRiskDistribution, getPortfolioTrend, renderRiskPanel
    };
})();
