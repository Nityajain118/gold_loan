/* ============================================
   Dashboard Page
   ============================================ */
const DashboardPage = (() => {
    let charts = {};

    function render(container) {
        try {
            const allLoans = DB.getLoans();
            const allCustomers = DB.getCustomers();
            // Filter by active firm (null = All Firms = no filter)
            const loans = FirmManager.filterLoans(allLoans);
            const activeFirm = FirmManager.getSelected();
            const firmLabel = activeFirm ? activeFirm.name : 'All Firms';
            const firmColor = activeFirm ? FirmManager.getColor(activeFirm) : null;
            const summary = Risk.analyzePortfolio(loans);
        
        // --- Smart Money Lending Engine Logic ---
        function calculateDashboard(loansList) {
            let totalGiven = 0;
            let totalInterest = 0;
            let activeLoans = 0;
            let overdueLoans = 0;

            const today = new Date();

            loansList.forEach(loan => {
                totalGiven += loan.loanAmount || 0;

                const loanDate = new Date(loan.loanStartDate || loan.createdAt);
                const days = Math.floor((today - loanDate) / (1000*60*60*24));

                // Safe calculation of interest for dashboard using calculator mod
                const annualRate = Calculator.toAnnualRate(loan.interestRate || 0, loan.interestPeriod || 'yearly');
                const interest = ((loan.loanAmount || 0) * (annualRate / 100) * Math.max(days, 1)) / 365;
                totalInterest += interest;

                // Active if not closed/completed (assume active if remaining Principal > 0 or no partialRepayment > loanAmount)
                const remaining = (loan.loanAmount || 0) - (loan.partialRepayment || 0);
                if (remaining > 0 || typeof loan.status === 'undefined' || loan.status === 'active') {
                    activeLoans++;
                    if (days > 90) overdueLoans++;
                }
            });

            return { totalGiven, totalInterest, activeLoans, overdueLoans };
        }
        
        const mlData = calculateDashboard(loans);

        container.innerHTML = `
            <!-- Firm Context Banner -->
            ${activeFirm ? `
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:${firmColor.bg}22;border:1px solid ${firmColor.bg}66;margin-bottom:16px;">
                <span class="firm-badge" style="background:${firmColor.bg};color:${firmColor.text};">🏢 ${activeFirm.name}</span>
                <span style="font-size:0.82rem;color:var(--text-secondary);">Showing data for this branch only · <button class="btn btn-ghost btn-xs" style="display:inline;padding:0;font-size:0.8rem;" onclick="UI.switchFirm(null)">Switch to All Firms</button></span>
            </div>` : ''}

            <!-- MONEY LENDING DASHBOARD -->
            <div class="section-header mt-2 mb-3">
                <h3 class="section-title" data-i18n="money_lending_dashboard">${I18n.t('money_lending_dashboard')}</h3>
            </div>
            
            <div class="kpi-grid">
                <div class="kpi-card blue">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-value">₹${UI.currency(mlData.totalGiven).replace('₹', '')}</div>
                    <div class="kpi-label" data-i18n="total_principal">${I18n.t('total_principal')}</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-value">₹${UI.currency(Math.floor(mlData.totalInterest)).replace('₹', '')}</div>
                    <div class="kpi-label" data-i18n="earned_interest">${I18n.t('earned_interest')}</div>
                </div>
                <div class="kpi-card gold">
                    <div class="kpi-icon">📋</div>
                    <div class="kpi-value">${mlData.activeLoans}</div>
                    <div class="kpi-label" data-i18n="active_loans">${I18n.t('active_loans')}</div>
                </div>
                <div class="kpi-card red">
                    <div class="kpi-icon">⚠️</div>
                    <div class="kpi-value">${mlData.overdueLoans}</div>
                    <div class="kpi-label" data-i18n="overdue">${I18n.t('overdue')}</div>
                </div>
            </div>

            <div class="section-header mt-4 mb-3">
                <h3 class="section-title" data-i18n="portfolio_summary">${I18n.t('portfolio_summary')}</h3>
            </div>
            <!-- KPI Cards (Original) -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-value">${summary.totalLoans}</div>
                    <div class="kpi-label" data-i18n="active_loans">${I18n.t('active_loans')}</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-icon">💵</div>
                    <div class="kpi-value">${UI.currency(summary.totalLoanAmount)}</div>
                    <div class="kpi-label" data-i18n="total_loan_amount">${I18n.t('total_loan_amount')}</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-icon">🏆</div>
                    <div class="kpi-value">${UI.currency(summary.totalMetalValue)}</div>
                    <div class="kpi-label" data-i18n="current_metal_value">${I18n.t('current_metal_value')}</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-value">${UI.currency(summary.expectedInterest)}</div>
                    <div class="kpi-label" data-i18n="expected_interest">${I18n.t('expected_interest')}</div>
                </div>
                <div class="kpi-card orange">
                    <div class="kpi-icon">⏰</div>
                    <div class="kpi-value">${summary.nearMaturity}</div>
                    <div class="kpi-label" data-i18n="near_maturity">${I18n.t('near_maturity')}</div>
                </div>
                <div class="kpi-card red">
                    <div class="kpi-icon">🔴</div>
                    <div class="kpi-value">${summary.lossZone}</div>
                    <div class="kpi-label" data-i18n="risk_loss_zone">${I18n.t('risk_loss_zone')}</div>
                </div>
            </div>

            <!-- Profit/Loss Summary -->
            <div class="kpi-grid mb-4">
                <div class="kpi-card ${summary.portfolioProfitLoss >= 0 ? 'green' : 'red'}">
                    <div class="kpi-icon">${summary.portfolioProfitLoss >= 0 ? '📈' : '📉'}</div>
                    <div class="kpi-value ${summary.portfolioProfitLoss >= 0 ? 'text-safe' : 'text-danger'}">${UI.currency(summary.portfolioProfitLoss)}</div>
                    <div class="kpi-label" data-i18n="portfolio_pl">${I18n.t('portfolio_pl')}</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-value">${UI.pct(summary.overallLTV)}</div>
                    <div class="kpi-label" data-i18n="overall_ltv">${I18n.t('overall_ltv')}</div>
                </div>
            </div>

            <!-- Charts -->
            <div class="charts-grid">
                <div class="chart-card">
                    <h3 data-i18n="risk_dist">${I18n.t('risk_dist')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="risk-chart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3 data-i18n="portfolio_overview">${I18n.t('portfolio_overview')}</h3>
                    <div class="chart-wrapper">
                        <canvas id="portfolio-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Firm-wise Breakdown (only when All Firms selected and multiple firms exist) -->
            ${!activeFirm && DB.getFirms().length > 1 ? `
            <div class="section-header mt-4 mb-3">
                <h3 class="section-title">🏢 Branch-wise Breakdown</h3>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:24px;">
                ${FirmManager.computeFirmStats(allLoans, allCustomers).map(s => `
                <div class="card" style="border-left:4px solid ${s.color.bg};padding:14px 16px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <span class="firm-badge" style="background:${s.color.bg};color:${s.color.text};">🏢 ${s.firm.name}</span>
                        ${s.firm.isMain ? '<span style="font-size:0.7rem;color:var(--text-secondary);">Main</span>' : ''}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.82rem;">
                        <div><div style="color:var(--text-secondary);">Active</div><div style="font-weight:700;color:var(--primary);">${s.activeLoans} loans</div></div>
                        <div><div style="color:var(--text-secondary);">Overdue</div><div style="font-weight:700;color:var(--danger);">${s.overdueLoans}</div></div>
                        <div><div style="color:var(--text-secondary);">Principal</div><div style="font-weight:700;">${UI.currency(s.totalPrincipal)}</div></div>
                        <div><div style="color:var(--text-secondary);">Interest</div><div style="font-weight:700;color:var(--safe);">${UI.currency(s.totalInterest)}</div></div>
                    </div>
                    <button class="btn btn-outline btn-xs full-width mt-2" onclick="UI.switchFirm('${s.firm.id}')">View Branch →</button>
                </div>`).join('')}
            </div>` : ''}

            <!-- Alerts -->
            <div class="section-header mt-2">
                <h3 class="section-title" data-i18n="alerts_warnings">${I18n.t('alerts_warnings')}</h3>
            </div>
            <div class="alert-panel" id="alert-panel">
                ${renderAlerts(summary.alerts)}
            </div>

            <!-- Quick Actions -->
            <div class="section-header mt-3">
                <h3 class="section-title" data-i18n="quick_actions">${I18n.t('quick_actions')}</h3>
            </div>
            <div class="flex gap-2" style="flex-wrap: wrap;">
                <button class="btn btn-gold kn-focusable" onclick="UI.navigateTo('new-loan')" data-i18n="new_loan">${I18n.t('new_loan')}</button>
                <button class="btn btn-outline kn-focusable" onclick="Export.exportLoansCSV()" data-i18n="export_csv">${I18n.t('export_csv')}</button>
                <button class="btn btn-outline kn-focusable" onclick="Export.exportBackup()" data-i18n="backup">${I18n.t('backup')}</button>
                <button class="btn btn-outline kn-focusable" onclick="UI.navigateTo('firms')">🏢 Manage Firms</button>
            </div>
        `;

        renderCharts(summary);
        } catch(e) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Dashboard Error</h3><p style="font-size:0.85rem;">${e.message}</p></div>`;
        }
    }

    function renderAlerts(alerts) {
        if (!alerts || alerts.length === 0) {
            return `<div class="empty-state" style="padding: 30px;">
                <div class="empty-state-icon">✅</div>
                <h3 data-i18n="all_clear">${I18n.t('all_clear')}</h3>
                <p data-i18n="no_warnings">${I18n.t('no_warnings')}</p>
            </div>`;
        }

        return alerts.map(alert => {
            const alertClass = alert.type === 'danger' ? 'danger-alert' :
                alert.type === 'warning' ? 'warning-alert' : 'safe-alert';
            const icon = alert.type === 'danger' ? '🔴' :
                alert.type === 'warning' ? '⚠️' : '✅';

            return `
                <div class="alert-item ${alertClass}">
                    <span class="alert-icon">${icon}</span>
                    <div class="alert-content">
                        <div class="alert-title">${alert.title}</div>
                        <div class="alert-desc">${alert.desc}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderCharts(summary) {
        // Destroy existing charts
        Object.values(charts).forEach(c => c.destroy && c.destroy());

        // Risk Distribution Doughnut
        const riskCtx = document.getElementById('risk-chart');
        if (riskCtx) {
            const dist = Risk.getRiskDistribution();
            charts.risk = new Chart(riskCtx, {
                type: 'doughnut',
                data: {
                    labels: dist.labels,
                    datasets: [{
                        data: dist.data,
                        backgroundColor: dist.colors,
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 16,
                                usePointStyle: true,
                                font: { family: 'Inter', size: 12 }
                            }
                        }
                    }
                }
            });
        }

        // Portfolio Bar Chart
        const portCtx = document.getElementById('portfolio-chart');
        if (portCtx) {
            charts.portfolio = new Chart(portCtx, {
                type: 'bar',
                data: {
                    labels: ['Loan Amount', 'Metal Value', 'Interest', 'Total Payable'],
                    datasets: [{
                        label: 'Amount (₹)',
                        data: [
                            summary.totalLoanAmount,
                            summary.totalMetalValue,
                            summary.expectedInterest,
                            summary.totalLoanAmount + summary.expectedInterest
                        ],
                        backgroundColor: [
                            'rgba(99, 102, 241, 0.7)',
                            'rgba(16, 185, 129, 0.7)',
                            'rgba(245, 158, 11, 0.7)',
                            'rgba(239, 68, 68, 0.7)'
                        ],
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => '₹' + ctx.raw.toLocaleString('en-IN')
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: {
                                callback: v => '₹' + (v / 1000).toFixed(0) + 'K',
                                font: { family: 'Inter', size: 11 }
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter', size: 11 } }
                        }
                    }
                }
            });
        }
    }

    return { render };
})();
