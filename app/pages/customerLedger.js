/* ============================================
   Customer Ledger Page
   ============================================ */
const CustomerLedgerPage = (() => {
    function render(container, customerId) {
        const customer = DB.getCustomer(customerId);
        if (!customer) {
            container.innerHTML = '<div class="empty-state"><h3>Customer not found</h3><button class="btn btn-primary" onclick="UI.navigateTo(\'customers\')">← Back</button></div>';
            return;
        }

        const allLoans = DB.getLoans().filter(l => 
            // Match exactly by mobile if available, else fallback to case-insensitive name match
            (customer.mobile && l.mobile === customer.mobile) || 
            (l.customerName.toLowerCase() === customer.name.toLowerCase())
        );

        const settings = DB.getSettings();
        
        // Calculate totals across all active loans
        let totalOutstanding = 0;
        let totalPrincipalLent = 0;
        let activeLoansCount = 0;
        let allPayments = [];

        // Calculate metrics and gather payment history
        allLoans.forEach(loan => {
            const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
            const d = Calculator.calcLoanDetails(loan, rate);
            
            if (loan.status !== 'closed') {
                totalOutstanding += d.totalPayable;
                totalPrincipalLent += d.remainingPrincipal;
                activeLoansCount++;
            }

            if (loan.paymentHistory && loan.paymentHistory.length > 0) {
                loan.paymentHistory.forEach(p => {
                    allPayments.push({
                        ...p,
                        loanId: loan.id,
                        metalType: loan.metalType,
                        metalSubType: loan.metalSubType
                    });
                });
            }
        });

        // Sort payments by date descending
        allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = `
            <button class="btn btn-ghost mb-2" onclick="UI.navigateTo('customers')">← Back to Customers</button>
            
            <div class="card mb-3" style="background: linear-gradient(135deg, var(--bg) 0%, rgba(246, 211, 101, 0.05) 100%);">
                <div class="card-header pb-2" style="border-bottom:1px solid var(--border);">
                    <div>
                        <h2 class="card-title" style="font-size:1.6rem;">${customer.name}</h2>
                        <span class="text-muted">📱 ${customer.mobile || 'No Mobile Provided'} | 🏠 ${customer.address || 'No Address Provided'}</span>
                    </div>
                    <div class="flex gap-1">
                        <span class="status-badge active">${activeLoansCount} Active Loan${activeLoansCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                
                <div class="calc-grid mt-2">
                    <div class="calc-item"><div class="calc-item-label">Total Principal Lent (Active)</div><div class="calc-item-value">${UI.currency(totalPrincipalLent)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Total Outstanding Due</div><div class="calc-item-value" style="font-size:1.4rem;color:var(--danger);">${UI.currency(totalOutstanding)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Total Payments Made</div><div class="calc-item-value safe">${allPayments.length} records</div></div>
                </div>
            </div>

            <!-- All Loans for this Customer -->
            <div class="card mb-3">
                <h3 class="card-title mb-2">📦 Loan History</h3>
                ${allLoans.length === 0 ? '<p class="text-muted">No loans found for this customer.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>Date</th><th>Metal</th><th>Value</th><th>Remaining Principal</th><th>Total Payable</th><th>Status</th><th>Action</th>
                </tr></thead><tbody>
                ${allLoans.sort((a,b) => new Date(b.loanStartDate) - new Date(a.loanStartDate)).map(loan => {
                    const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
                    const d = Calculator.calcLoanDetails(loan, rate);
                    return `<tr>
                        <td>${UI.formatDate(loan.loanStartDate)}</td>
                        <td>${loan.metalType === 'gold' ? '🥇 Gold' : '🥈 Silver'} ${loan.metalSubType}</td>
                        <td class="text-gold font-semibold">${UI.currency(d.metalValue)}</td>
                        <td>${loan.status === 'closed' ? '—' : UI.currency(d.remainingPrincipal)}</td>
                        <td class="font-semibold text-danger">${loan.status === 'closed' ? '—' : UI.currency(d.totalPayable)}</td>
                        <td><span class="status-badge ${loan.status}">${loan.status}</span></td>
                        <td><button class="btn btn-outline btn-xs" onclick="UI.navigateTo('loan-detail', '${loan.id}')">View</button></td>
                    </tr>`;
                }).join('')}
                </tbody></table></div>`}
            </div>

            <!-- Complete Payment History -->
            <div class="card mb-2">
                <h3 class="card-title mb-2">📜 Combined Payment Ledger</h3>
                ${allPayments.length === 0 ? '<p class="text-muted">No payments recorded for this customer yet.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>Payment Date</th><th>Loan Focus</th><th>Paid Amount</th><th>Interest Deducted</th><th>Principal Reduced</th>
                </tr></thead><tbody>
                ${allPayments.map(p => `<tr>
                    <td>${UI.formatDate(p.date)}</td>
                    <td>${p.metalType === 'gold' ? '🥇' : '🥈'} ${p.metalSubType}</td>
                    <td class="text-gold font-semibold">${UI.currency(p.paidAmount)}</td>
                    <td>${UI.currency(p.interestDeducted)}</td>
                    <td>${UI.currency(p.principalReduced)}</td>
                </tr>`).join('')}
                </tbody></table></div>`}
            </div>
        `;
    }

    return { render };
})();
