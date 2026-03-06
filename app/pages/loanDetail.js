/* ============================================
   Loan Detail Page — Shows Jewelry Items
   ============================================ */
const LoanDetailPage = (() => {
    function render(container, loanId) {
        const loan = DB.getLoan(loanId);
        if (!loan) {
            container.innerHTML = '<div class="empty-state"><h3>Loan not found</h3><button class="btn btn-primary" onclick="UI.navigateTo(\'loans\')">← Back</button></div>';
            return;
        }
        const settings = DB.getSettings();
        const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        const d = Calculator.calcLoanDetails(loan, rate);
        const icon = loan.metalType === 'gold' ? '🥇' : '🥈';
        const items = loan.items || [];

        // Build items table if there are items
        let itemsHtml = '';
        if (items.length > 0) {
            const rates = Market.getCurrentRates();
            itemsHtml = `
            <div class="card mb-2">
                <h4 style="font-size:0.9rem;margin-bottom:12px;color:var(--primary);">💍 Jewelry Items (${items.length})</h4>
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>#</th><th>Item</th><th>Metal</th><th>Purity</th><th>Weight</th><th>Value</th>
                </tr></thead><tbody>
                ${items.map((it, i) => {
                const r = it.metalType === 'gold' ? rates.gold : rates.silver;
                const v = Calculator.calcMetalValue(it.weightGrams, it.purity, r);
                return `<tr>
                        <td>${i + 1}</td>
                        <td><strong>${it.itemType}</strong></td>
                        <td>${it.metalType === 'gold' ? '🥇 Gold' : '🥈 Silver'}</td>
                        <td>${it.purity}</td>
                        <td>${it.weightGrams}g</td>
                        <td class="text-gold font-semibold">${UI.currency(v)}</td>
                    </tr>`;
            }).join('')}
                </tbody></table></div>
                <div class="items-summary mt-1">
                    <div class="items-summary-item"><div class="items-summary-label">Gold Items</div><div class="items-summary-value">${items.filter(i => i.metalType === 'gold').length}</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Silver Items</div><div class="items-summary-value">${items.filter(i => i.metalType === 'silver').length}</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Total Weight</div><div class="items-summary-value">${items.reduce((s, i) => s + i.weightGrams, 0).toFixed(2)}g</div></div>
                    <div class="items-summary-item"><div class="items-summary-label">Total Value</div><div class="items-summary-value">${UI.currency(d.metalValue)}</div></div>
                </div>
            </div>`;
        }

        container.innerHTML = `
            <button class="btn btn-ghost mb-2" onclick="UI.navigateTo('loans')">← Back to Loans</button>
            <div class="card mb-2">
                <div class="card-header">
                    <div><h3 class="card-title">${icon} ${loan.customerName}</h3>
                        <small class="text-muted">${loan.mobile || 'No mobile'} | ${loan.lockerName || 'No locker'}</small></div>
                    <div class="flex gap-1">
                        <span class="status-badge ${loan.status || 'active'}">${loan.isMigrated ? '📥 Migrated' : (loan.status || 'active')}</span>
                        <span class="risk-badge ${d.riskLevel}">${d.riskLabel}</span>
                    </div>
                </div>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-label">Metal Type</div><div class="detail-value">${icon} ${loan.metalType} ${loan.metalSubType}</div></div>
                    <div class="detail-item"><div class="detail-label">Total Weight</div><div class="detail-value">${loan.weightGrams}g</div></div>
                    <div class="detail-item"><div class="detail-label">Metal Value</div><div class="detail-value text-gold">${UI.currency(d.metalValue)}</div></div>
                    <div class="detail-item"><div class="detail-label">Loan Amount</div><div class="detail-value">${UI.currency(loan.loanAmount)}</div></div>
                    <div class="detail-item"><div class="detail-label">Interest Rate</div><div class="detail-value">${loan.interestRate}% ${loan.interestPeriod}</div></div>
                    <div class="detail-item"><div class="detail-label">Interest Type</div><div class="detail-value">${loan.interestType === 'compound' ? 'Compound' : 'Simple'}</div></div>
                    <div class="detail-item"><div class="detail-label">Start Date</div><div class="detail-value">${UI.formatDate(loan.loanStartDate)}</div></div>
                    <div class="detail-item"><div class="detail-label">Maturity</div><div class="detail-value">${UI.formatDate(d.maturityDate)}</div></div>
                    <div class="detail-item"><div class="detail-label">Months Elapsed</div><div class="detail-value">${d.monthsElapsed}</div></div>
                    <div class="detail-item"><div class="detail-label">Days to Maturity</div><div class="detail-value ${d.isNearMaturity ? 'text-monitor' : d.isOverdue ? 'text-danger' : ''}">${d.isOverdue ? 'OVERDUE' : d.daysToMaturity + ' days'}</div></div>
                    <div class="detail-item"><div class="detail-label">Items Count</div><div class="detail-value">${items.length} item${items.length !== 1 ? 's' : ''}</div></div>
                </div>
            </div>
            ${itemsHtml}
            <div class="calc-panel mb-2">
                <h4 style="font-size:0.9rem;margin-bottom:16px;color:var(--primary);">💰 Financial Summary</h4>
                <div class="calc-grid">
                    <div class="calc-item"><div class="calc-item-label">Total Interest</div><div class="calc-item-value">${UI.currency(d.totalInterest)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Paid Interest</div><div class="calc-item-value">${UI.currency(d.paidInterest)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Partial Repayment</div><div class="calc-item-value">${UI.currency(d.partialRepayment)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Penalty</div><div class="calc-item-value">${UI.currency(d.manualPenalty)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Total Payable</div><div class="calc-item-value" style="font-size:1.4rem;">${UI.currency(d.totalPayable)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">LTV</div><div class="calc-item-value ${d.ltv > 80 ? 'danger' : d.ltv > 60 ? 'monitor' : 'safe'}">${UI.pct(d.ltv)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Break-even</div><div class="calc-item-value">${UI.currency(d.breakEvenPrice)}/g</div></div>
                    <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value ${d.profitLoss >= 0 ? 'safe' : 'danger'}">${UI.currency(d.profitLoss)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Safety Buffer</div><div class="calc-item-value ${d.safetyBuffer >= 20 ? 'safe' : d.safetyBuffer > 0 ? 'monitor' : 'danger'}">${UI.pct(d.safetyBuffer)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Profit Margin</div><div class="calc-item-value ${d.profitMargin >= 0 ? 'safe' : 'danger'}">${UI.pct(d.profitMargin)}</div></div>
                </div>
            </div>
            <div class="flex gap-2">
                <button class="btn btn-primary" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 Export PDF</button>
                <button class="btn btn-outline" onclick="LoanDetailPage.closeLoan('${loan.id}')">✅ Mark Closed</button>
                <button class="btn btn-danger" onclick="LoanDetailPage.del('${loan.id}')">🗑️ Delete</button>
            </div>`;
    }

    async function closeLoan(id) {
        if (await UI.confirm('Close Loan', 'Mark as closed?')) {
            const loan = DB.getLoan(id); loan.status = 'closed'; DB.saveLoan(loan);
            UI.toast('Loan closed', 'success'); UI.navigateTo('loan-detail', id);
        }
    }
    async function del(id) {
        if (await UI.confirm('Delete', 'Cannot be undone.')) {
            DB.deleteLoan(id); UI.toast('Deleted', 'success'); UI.navigateTo('loans');
        }
    }
    return { render, closeLoan, del };
})();
