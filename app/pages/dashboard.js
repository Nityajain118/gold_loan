/* ============================================
   Dashboard Page
   ============================================ */
const DashboardPage = (() => {
    let charts = {};

    function render(container) {
        const summary = Risk.analyzePortfolio();
        const loans = DB.getLoans();
        
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
            <!-- MONEY LENDING DASHBOARD -->
            <div class="section-header mt-2" style="margin-bottom: 15px;">
                <h3 class="section-title">💰 Money Lending Dashboard</h3>
            </div>
            
            <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <div class="kpi-card blue">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-value">₹${UI.currency(mlData.totalGiven)}</div>
                    <div class="kpi-label">Total Principal Given</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-value">₹${UI.currency(Math.floor(mlData.totalInterest))}</div>
                    <div class="kpi-label">Total Earned Interest</div>
                </div>
                <div class="kpi-card gold">
                    <div class="kpi-icon">📋</div>
                    <div class="kpi-value">${mlData.activeLoans}</div>
                    <div class="kpi-label">Active Loans</div>
                </div>
                <div class="kpi-card red">
                    <div class="kpi-icon">⚠️</div>
                    <div class="kpi-value">${mlData.overdueLoans}</div>
                    <div class="kpi-label">Overdue (>90 days)</div>
                </div>
            </div>

            <div class="section-header mt-3">
                <h3 class="section-title">📊 Portfolio Summary</h3>
            </div>
            <!-- KPI Cards (Original) -->
            <div class="kpi-grid">
                    <div class="kpi-icon">💰</div>
                    <div class="kpi-value">${summary.totalLoans}</div>
                    <div class="kpi-label">Active Loans</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-icon">💵</div>
                    <div class="kpi-value">${UI.currency(summary.totalLoanAmount)}</div>
                    <div class="kpi-label">Total Loan Amount</div>
                </div>
                <div class="kpi-card green">
                    <div class="kpi-icon">🏆</div>
                    <div class="kpi-value">${UI.currency(summary.totalMetalValue)}</div>
                    <div class="kpi-label">Current Metal Value</div>
                </div>
                <div class="kpi-card purple">
                    <div class="kpi-icon">📈</div>
                    <div class="kpi-value">${UI.currency(summary.expectedInterest)}</div>
                    <div class="kpi-label">Expected Interest Income</div>
                </div>
                <div class="kpi-card orange">
                    <div class="kpi-icon">⏰</div>
                    <div class="kpi-value">${summary.nearMaturity}</div>
                    <div class="kpi-label">Near Maturity</div>
                </div>
                <div class="kpi-card red">
                    <div class="kpi-icon">🔴</div>
                    <div class="kpi-value">${summary.lossZone}</div>
                    <div class="kpi-label">In Risk/Loss Zone</div>
                </div>
            </div>

            <!-- Profit/Loss Summary -->
            <div class="kpi-grid" style="margin-bottom: 20px;">
                <div class="kpi-card ${summary.portfolioProfitLoss >= 0 ? 'green' : 'red'}">
                    <div class="kpi-icon">${summary.portfolioProfitLoss >= 0 ? '📈' : '📉'}</div>
                    <div class="kpi-value ${summary.portfolioProfitLoss >= 0 ? 'text-safe' : 'text-danger'}">${UI.currency(summary.portfolioProfitLoss)}</div>
                    <div class="kpi-label">Portfolio Profit/Loss</div>
                </div>
                <div class="kpi-card blue">
                    <div class="kpi-icon">📊</div>
                    <div class="kpi-value">${UI.pct(summary.overallLTV)}</div>
                    <div class="kpi-label">Overall LTV</div>
                </div>
            </div>

            <!-- Charts -->
            <div class="charts-grid">
                <div class="chart-card">
                    <h3>📊 Risk Distribution</h3>
                    <div class="chart-wrapper">
                        <canvas id="risk-chart"></canvas>
                    </div>
                </div>
                <div class="chart-card">
                    <h3>💰 Loan Portfolio Overview</h3>
                    <div class="chart-wrapper">
                        <canvas id="portfolio-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Alerts -->
            <div class="section-header mt-2">
                <h3 class="section-title">🔔 Alerts & Warnings</h3>
            </div>
            <div class="alert-panel" id="alert-panel">
                ${renderAlerts(summary.alerts)}
            </div>

            <!-- Quick Actions -->
            <div class="section-header mt-3">
                <h3 class="section-title">⚡ Quick Actions</h3>
            </div>
            <div class="flex gap-2" style="flex-wrap: wrap;">
                <button class="btn btn-gold" onclick="UI.navigateTo('new-loan')">➕ New Loan</button>
                <button class="btn btn-primary" onclick="UI.navigateTo('old-loan')">🕰️ Add Old Loan</button>
                <button class="btn btn-outline" onclick="Export.exportLoansCSV()">📥 Export CSV</button>
                <button class="btn btn-outline" onclick="Export.exportBackup()">💾 Backup Data</button>
            </div>
        `;

        renderCharts(summary);
    }

    function renderAlerts(alerts) {
        if (!alerts || alerts.length === 0) {
            return `<div class="empty-state" style="padding: 30px;">
                <div class="empty-state-icon">✅</div>
                <h3>All Clear!</h3>
                <p>No warnings or alerts at this time.</p>
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
