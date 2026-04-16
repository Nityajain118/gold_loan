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
                        <td>${it.photo ? `<img src="${it.photo}" class="img-thumb" style="width:32px;height:32px;margin-right:6px;vertical-align:middle;" />` : ''}<strong>${it.itemType}</strong></td>
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
                        <small class="text-muted">${loan.mobile || 'No mobile'} | ${loan.lockerName || 'No locker'}</small>
                        ${loan.address ? `<div style="font-size:0.85rem;color:var(--text-secondary);margin-top:4px;">📍 ${loan.address}</div>` : ''}
                    </div>
                    <div class="flex gap-1">
                        ${loan.customerPhoto ? `<img src="${loan.customerPhoto}" class="img-thumb" style="width:40px;height:40px;border-radius:50%;" alt="" />` : ''}
                        <span class="status-badge ${loan.status || 'active'}">${loan.isMigrated ? '📥 Migrated' : (loan.status || 'active')}</span>
                        <span class="risk-badge ${d.riskLevel}">${d.riskLabel}</span>
                    </div>
                </div>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-label">Address</div><div class="detail-value">${loan.address || '—'}</div></div>
                    <div class="detail-item"><div class="detail-label">Locker</div><div class="detail-value">${loan.lockerName || '—'}</div></div>
                    <div class="detail-item"><div class="detail-label">Metal Type</div><div class="detail-value">${icon} ${loan.metalType} ${loan.metalSubType}</div></div>
                    <div class="detail-item"><div class="detail-label">Total Weight</div><div class="detail-value">${loan.weightGrams}g</div></div>
                    <div class="detail-item"><div class="detail-label">Metal Value</div><div class="detail-value text-gold">${UI.currency(d.metalValue)}</div></div>
                    <div class="detail-item"><div class="detail-label">Loan Amount</div><div class="detail-value">${UI.currency(loan.loanAmount)}</div></div>
                    <div class="detail-item"><div class="detail-label">Interest Rate</div><div class="detail-value">${loan.interestRate}% ${loan.interestPeriod}</div></div>
                    <div class="detail-item"><div class="detail-label">Interest Type</div><div class="detail-value">${loan.interestType === 'compound' ? 'Compound' : 'Simple'}${loan.interestType === 'compound' ? ' (' + ({1:'Yearly',2:'Half-Yearly',4:'Quarterly',12:'Monthly'}[d.compoundingFrequency] || 'Monthly') + ')' : ''}</div></div>
                    <div class="detail-item"><div class="detail-label">Effective Annual Rate</div><div class="detail-value">${UI.pct(d.effectiveRate || d.annualRate)}</div></div>
                    <div class="detail-item"><div class="detail-label">Time Mode</div><div class="detail-value">${(d.timeMode || 'normal') === 'tithi' ? '🌙 Tithi' : '📅 Normal'}</div></div>
                    <div class="detail-item"><div class="detail-label">Start Date</div><div class="detail-value">${UI.formatDate(loan.loanStartDate)}${d.startTithi ? '<br/><small class="tithi-inline">' + UI.formatTithi(d.startTithi) + '</small>' : ''}</div></div>
                    <div class="detail-item"><div class="detail-label">Maturity</div><div class="detail-value">${UI.formatDate(d.maturityDate)}${d.maturityTithi ? '<br/><small class="tithi-inline">' + UI.formatTithi(d.maturityTithi) + '</small>' : ''}</div></div>
                    <div class="detail-item"><div class="detail-label">Duration</div><div class="detail-value">${UI.formatDuration(d.monthsElapsed, d.tithiDuration, d.timeMode)}</div></div>
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
                    <div class="calc-item"><div class="calc-item-label">Remaining Principal</div><div class="calc-item-value">${UI.currency(d.remainingPrincipal)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Penalty</div><div class="calc-item-value">${UI.currency(d.manualPenalty)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Total Payable</div><div class="calc-item-value" style="font-size:1.4rem;color:var(--gold);">${UI.currency(d.totalPayable)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">LTV</div><div class="calc-item-value ${d.ltv > 80 ? 'danger' : d.ltv > 60 ? 'monitor' : 'safe'}">${UI.pct(d.ltv)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Break-even</div><div class="calc-item-value">${UI.currency(d.breakEvenPrice)}/g</div></div>
                    <div class="calc-item"><div class="calc-item-label">Profit/Loss</div><div class="calc-item-value ${d.profitLoss >= 0 ? 'safe' : 'danger'}">${UI.currency(d.profitLoss)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Safety Buffer</div><div class="calc-item-value ${d.safetyBuffer >= 20 ? 'safe' : d.safetyBuffer > 0 ? 'monitor' : 'danger'}">${UI.pct(d.safetyBuffer)}</div></div>
                    <div class="calc-item"><div class="calc-item-label">Profit Margin</div><div class="calc-item-value ${d.profitMargin >= 0 ? 'safe' : 'danger'}">${UI.pct(d.profitMargin)}</div></div>
                </div>
            </div>

            ${(loan.status === 'closed' && loan.settlement) ? `
            <div class="card mb-2" style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.3);">
                <div class="flex-between mb-2">
                    <h4 style="font-size:0.9rem;color:var(--safe);">🤝 Settlement Details</h4>
                    <span class="badge" style="background:var(--safe);color:#fff;">CLOSED</span>
                </div>
                <div class="detail-grid">
                    <div class="detail-item"><div class="detail-label">Total Amount</div><div class="detail-value text-danger font-semibold">${UI.currency(loan.settlement.totalAmount)}</div></div>
                    <div class="detail-item"><div class="detail-label">Paid Amount</div><div class="detail-value text-gold font-bold">${UI.currency(loan.settlement.paidAmount)}</div></div>
                    ${loan.settlement.discount > 0 ? `<div class="detail-item"><div class="detail-label">Discount Given</div><div class="detail-value text-danger font-bold">${UI.currency(loan.settlement.discount)}</div></div>` : ''}
                    ${loan.settlement.adjustment > 0 ? `<div class="detail-item"><div class="detail-label">Adjustment</div><div class="detail-value text-muted">${UI.currency(loan.settlement.adjustment)}</div></div>` : ''}
                    <div class="detail-item"><div class="detail-label">Final Status</div><div class="detail-value font-bold text-safe">${loan.settlement.status}</div></div>
                </div>
            </div>
            ` : ''}

            <!-- Payment History Section -->
            <div class="card mb-2">
                <div class="flex-between mb-2">
                    <h4 style="font-size:0.9rem;color:var(--primary);">📜 Payment History</h4>
                    ${loan.status !== 'closed' ? `<button class="btn btn-gold btn-sm" onclick="LoanDetailPage.showPaymentModal('${loan.id}', ${d.totalPayable}, ${d.remainingInterest})">💵 Make Payment</button>` : ''}
                </div>
                ${(!loan.paymentHistory || loan.paymentHistory.length === 0) ? '<p class="text-muted" style="font-size:0.85rem;">No payments made yet.</p>' : `
                <div class="table-container"><table class="data-table"><thead><tr>
                    <th>Date</th><th>Paid Amount</th><th>Interest Deducted</th><th>Principal Reduced</th><th>Remaining Principal</th>
                </tr></thead><tbody>
                ${loan.paymentHistory.slice().reverse().map(p => `<tr>
                    <td>${UI.formatDate(p.date)}</td>
                    <td class="text-gold font-semibold">${UI.currency(p.paidAmount)}</td>
                    <td>${UI.currency(p.interestDeducted)}</td>
                    <td>${UI.currency(p.principalReduced)}</td>
                    <td class="font-semibold">${UI.currency(p.remainingPrincipal)}</td>
                </tr>`).join('')}
                </tbody></table></div>`}
            </div>

            <div class="flex gap-2">
                <button class="btn btn-primary" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 Export PDF</button>
                <button class="btn btn-success" onclick="LoanDetailPage.sendWhatsApp('${loan.id}')">💬 Send WhatsApp</button>
                <button class="btn btn-outline" onclick="LoanDetailPage.closeLoan('${loan.id}')">✅ Mark Closed</button>
                <button class="btn btn-danger" onclick="LoanDetailPage.del('${loan.id}')">🗑️ Delete</button>
            </div>`;

        // --- Append Loan Risk Analysis Panel ---
        const ratesNow = Market.getCurrentRates();
        const currentPrice = loan.metalType === 'gold' ? ratesNow.gold : ratesNow.silver;

        // Compute pure gold/silver weight from items (or fallback to legacy single-item)
        let pureWeight = 0;
        if (items.length > 0) {
            items.forEach(it => {
                const w = it.weightGrams || 0;
                const pf = it.purity === 'custom'
                    ? (it.customPurity || 0) / 100
                    : Calculator.getPurityFactor(it.purity || loan.metalSubType || '22K');
                pureWeight += w * pf;
            });
        } else {
            const pf = Calculator.getPurityFactor(loan.metalSubType || '22K');
            pureWeight = (loan.weightGrams || 0) * pf;
        }

        const riskWrapper = document.createElement('div');
        riskWrapper.innerHTML = Risk.renderRiskPanel({
            pureGoldWeight: pureWeight,
            goldValue: d.metalValue,
            loanAmount: loan.loanAmount,
            currentPrice
        });
        container.appendChild(riskWrapper);

        // Re-append action buttons below risk panel
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex gap-2 mt-3';
        actionsDiv.innerHTML = `
            <button class="btn btn-primary" onclick="Export.exportLoanPDF(DB.getLoan('${loan.id}'))">📄 Export PDF</button>
            <button class="btn btn-success" onclick="LoanDetailPage.sendWhatsApp('${loan.id}')">💬 Send WhatsApp</button>
            <button class="btn btn-outline" onclick="LoanDetailPage.closeLoan('${loan.id}')">✅ Mark Closed</button>
            <button class="btn btn-danger" onclick="LoanDetailPage.del('${loan.id}')">🗑️ Delete</button>`;
        container.appendChild(actionsDiv);
    }

    async function sendWhatsApp(loanId) {
        const loan = DB.getLoan(loanId);
        if (!loan) return;

        const customer = loan.customerId ? DB.getCustomer(loan.customerId) : null;
        const phone = (customer && customer.mobile) ? customer.mobile : loan.mobile;
        
        if (!phone) {
            UI.toast('No mobile number available for this customer', 'error');
            return;
        }

        const settings = DB.getSettings();
        const shopName = settings.shopName || "GOLD LOAN";
        
        UI.toast('Generating PDF...', 'info');

        try {
            // 1) Generate the PDF blob using html2pdf
            const blob = await Export.generateLoanPDFBlob(loan);
            
            const cleanName = loan.customerName.replace(/\s+/g, '');
            const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
            const filename = `${cleanName}_GoldLoan_${dateStr}.pdf`;

            const file = new File([blob], filename, { type: "application/pdf" });
            const messageText = `Hello ${loan.customerName},\n\nYour Gold Loan Bill from ${shopName} is ready.\n\nLoan Amount: ${UI.currency(loan.loanAmount)}\nMetal Weight: ${loan.items.reduce((sum, item) => sum + parseFloat(item.weight), 0)}g\nInterest: ${loan.interestRate}% ${loan.interestRateType}`;

            // Helper for fallback link sharing
            function fallbackShare() {
                const pdfLink = `https://${window.location.hostname || 'yourwebsite.com'}/bills/${loan.id}.pdf`;
                const fallbackMessage = `${messageText}\n\nDownload Bill PDF:\n${pdfLink}`;
                
                let formattedPhone = phone.replace(/\D/g, '');
                if (formattedPhone.length === 10) formattedPhone = '91' + formattedPhone;
                
                const whatsappURL = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(fallbackMessage)}`;
                window.open(whatsappURL, "_blank");
            }

            // 2) Try Web Share API with file attachment
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: "Gold Loan Bill",
                        text: messageText,
                        files: [file]
                    });
                    UI.toast('Shared successfully', 'success');
                } catch (e) {
                    // If user cancelled, it throws AbortError. Do not fallback on abort.
                    if (e.name !== 'AbortError') fallbackShare();
                }
            } else {
                // 3) Fallback if sharing files is not supported (Desktop/Old browsers)
                fallbackShare();
            }

        } catch (err) {
            console.error(err);
            UI.toast('Error preparing PDF for WhatsApp', 'error');
        }
    }

    function showPaymentModal(loanId, totalPayable, remainingInterest) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `<div class="modal">
            <h3 class="modal-title">💵 Make Partial Payment</h3>
            <p class="text-muted mb-2" style="font-size:0.85rem">Total Due: <strong>${UI.currency(totalPayable)}</strong><br />Outstanding Interest: <strong>${UI.currency(remainingInterest)}</strong></p>
            
            <div class="form-group mb-2">
                <label class="form-label">Payment Amount (₹) *</label>
                <input type="number" class="form-input" id="pay-amount" placeholder="Enter amount" min="1" max="${totalPayable}" />
            </div>
            <div class="form-group mb-3">
                <label class="form-label">Date of Payment *</label>
                <input type="date" class="form-input" id="pay-date" value="${new Date().toISOString().split('T')[0]}" />
            </div>

            <div class="callout callout-info mb-3">
                ℹ️ <strong>How it works:</strong> Payment is first applied to outstanding interest. Any remaining amount reduces the <strong>principal</strong>. The interest calculation date will be reset to this payment date, and future interest will apply <strong>only to the new principal</strong>.
            </div>

            <div class="modal-actions">
                <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-gold" onclick="LoanDetailPage.processPayment('${loanId}')">Confirm Payment</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    }

    function processPayment(loanId) {
        const amountStr = document.getElementById('pay-amount').value;
        const dateStr = document.getElementById('pay-date').value;
        const amount = parseFloat(amountStr);

        if (!amount || amount <= 0) { UI.toast('Enter a valid amount', 'error'); return; }
        if (!dateStr) { UI.toast('Select payment date', 'error'); return; }

        const loan = DB.getLoan(loanId);
        if (!loan) { UI.toast('Loan not found', 'error'); return; }

        const settings = DB.getSettings();
        const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        const d = Calculator.calcLoanDetails(loan, rate);

        if (amount > d.totalPayable) { UI.toast('Payment exceeds total payable', 'error'); return; }

        // Logic:
        // Payment goes to interest first, then principal.
        let interestDeducted = 0;
        let principalReduced = 0;

        if (amount >= d.remainingInterest) {
            interestDeducted = d.remainingInterest;
            principalReduced = amount - d.remainingInterest;
        } else {
            interestDeducted = amount;
            principalReduced = 0;
        }

        const newPrincipal = d.remainingPrincipal - principalReduced;

        // Save history record
        if (!loan.paymentHistory) loan.paymentHistory = [];
        loan.paymentHistory.push({
            date: dateStr,
            paidAmount: amount,
            interestDeducted,
            principalReduced,
            remainingPrincipal: newPrincipal
        });

        // Update Loan State
        // It's critical to preserve original values for records
        if (!loan.originalLoanAmount) loan.originalLoanAmount = loan.loanAmount;
        if (!loan.originalStartDate) loan.originalStartDate = loan.loanStartDate;

        // Reset the loan "start date" to the payment date so new interest calculates from here
        // Update the principal to the new remaining amount
        loan.loanStartDate = dateStr;
        loan.loanAmount = newPrincipal;
        
        // Reset paid interest/repayment fields as we've internalized them into the new principal/start date
        loan.paidInterest = 0;
        loan.partialRepayment = 0;
        loan.manualPenalty = 0; // Assuming penalty is paid off

        DB.saveLoan(loan);
        document.querySelector('.modal-overlay').remove();
        UI.toast('Payment recorded successfully', 'success');
        UI.navigateTo('loan-detail', loanId);
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
    return { render, showPaymentModal, processPayment, sendWhatsApp, closeLoan, del };
})();
