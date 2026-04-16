/* ============================================
   Export Module — PDF & Excel Generation
   ============================================ */
const Export = (() => {

    /**
     * Export loan details as a simple text report (downloadable)
     * For PDF, we generate an HTML page and use window.print()
     */

    function getLoanReportHTML(loan, details, settings) {
        return `
    <style>
        .report-body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
        .report-body h1 { color: #6366f1; font-size: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
        .report-body h2 { color: #374151; font-size: 16px; margin-top: 24px; }
        .report-body table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .report-body th, .report-body td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .report-body th { background: #f3f4f6; font-weight: 600; color: #6b7280; text-transform: uppercase; font-size: 12px; }
        .risk-safe { color: #10b981; font-weight: 700; }
        .risk-monitor { color: #f59e0b; font-weight: 700; }
        .risk-danger { color: #ef4444; font-weight: 700; }
        .footer { margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .header-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .amount { font-size: 20px; font-weight: 700; }
        .shop-header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; }
        .shop-name { font-size: 22px; font-weight: 800; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; }
        .shop-details { font-size: 14px; color: #4b5563; margin-top: 5px; }
        .shop-logo { max-height: 60px; margin-bottom: 10px; }
    </style>
    <div class="report-body">
        <div class="shop-header">
            ${settings.shopLogo ? `<img src="${settings.shopLogo}" class="shop-logo" alt="Logo">` : ''}
            <div class="shop-name">${settings.shopName || 'GOLD LOAN ACCOUNT'}</div>
            <div class="shop-details">${settings.shopAddress || ''} ${settings.shopPhone ? ` | Phone: ${settings.shopPhone}` : ''}</div>
        </div>
        <h1 style="border-bottom:0; margin-top:0; font-size:18px;">📋 Loan Report</h1>
        <div class="header-info">
            <div>
                <strong>Customer:</strong> ${loan.customerName}<br>
                <strong>Mobile:</strong> ${loan.mobile || 'N/A'}<br>
                <strong>Loan ID:</strong> ${loan.id}
            </div>
            <div style="text-align:right">
                <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}<br>
                <strong>Status:</strong> ${(loan.status || 'active').toUpperCase()}<br>
                ${loan.isMigrated ? '<strong>Type:</strong> Migrated Loan' : ''}
            </div>
        </div>

        <h2>Metal Details</h2>
        <table>
            <tr><th>Metal Type</th><td>${loan.metalType === 'gold' ? '🥇 Gold' : '🥈 Silver'}</td></tr>
            <tr><th>Purity</th><td>${loan.metalSubType}</td></tr>
            <tr><th>Weight</th><td>${loan.weightGrams} grams</td></tr>
            <tr><th>Locker</th><td>${loan.lockerName || 'N/A'}</td></tr>
            <tr><th>Current Metal Value</th><td class="amount">₹${details.metalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
        </table>

        <h2>Loan Details</h2>
        <table>
            <tr><th>Loan Amount</th><td class="amount">₹${loan.loanAmount.toLocaleString('en-IN')}</td></tr>
            <tr><th>Interest Rate</th><td>${loan.interestRate}% ${loan.interestPeriod}</td></tr>
            <tr><th>Interest Type</th><td>${loan.interestType === 'compound' ? 'Compound' : 'Simple'}</td></tr>
            <tr><th>Loan Start Date</th><td>${new Date(loan.loanStartDate).toLocaleDateString('en-IN')}</td></tr>
            <tr><th>Maturity Date</th><td>${new Date(details.maturityDate).toLocaleDateString('en-IN')}</td></tr>
            <tr><th>Duration</th><td>${details.monthsElapsed} months elapsed</td></tr>
        </table>

        <h2>Financial Summary</h2>
        <table>
            <tr><th>Total Interest</th><td>₹${details.totalInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><th>Paid Interest</th><td>₹${details.paidInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><th>Partial Repayment</th><td>₹${details.partialRepayment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><th>Penalty</th><td>₹${details.manualPenalty.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><th>Total Payable</th><td class="amount">₹${details.totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
        </table>

        ${(loan.status === 'closed' && loan.settlement) ? `
        <h2 style="color: #10b981;">Settlement Details</h2>
        <table>
            <tr><th>Total Amount</th><td>₹${loan.settlement.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><th>Paid Amount</th><td class="amount" style="color:#d4af37">₹${loan.settlement.paidAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            ${loan.settlement.discount > 0 ? `<tr><th>Discount Given</th><td style="color:#ef4444;">₹${loan.settlement.discount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>` : ''}
            ${loan.settlement.adjustment > 0 ? `<tr><th>Adjustment</th><td style="color:#6b7280;">₹${loan.settlement.adjustment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>` : ''}
            <tr><th>Final Status</th><td style="color: #10b981; font-weight:700;">${loan.settlement.status} ${loan.settlement.discount > 0 ? '(Closed by Discount)' : (loan.settlement.adjustment > 0 ? '(Closed by Adjustment)' : '')}</td></tr>
        </table>` : ''}

        <h2>Risk Analysis</h2>
        <table>
            <tr><th>LTV</th><td>${details.ltv.toFixed(1)}%</td></tr>
            <tr><th>Break-even Price</th><td>₹${details.breakEvenPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/g</td></tr>
            <tr><th>Profit/Loss</th><td class="${details.profitLoss >= 0 ? 'risk-safe' : 'risk-danger'}">₹${details.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td></tr>
            <tr><th>Safety Buffer</th><td>${details.safetyBuffer.toFixed(1)}%</td></tr>
            <tr><th>Risk Level</th><td class="risk-${details.riskLevel}">${details.riskLabel}</td></tr>
        </table>

        <div class="footer">
            Generated by GoldVault — Gold & Silver Loan Management System<br>
            Report generated on ${new Date().toLocaleString('en-IN')}
        </div>
    </div>`;
    }

    function exportLoanPDF(loan) {
        const settings = DB.getSettings();
        const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        const details = Calculator.calcLoanDetails(loan, rate);

        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Loan Report — ${loan.customerName}</title>
</head>
<body onload="window.print()" style="margin:0;">
    ${getLoanReportHTML(loan, details, settings)}
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
    }

    /**
     * Generates a PDF Blob using html2pdf
     */
    async function generateLoanPDFBlob(loan) {
        if (typeof html2pdf === 'undefined') {
            throw new Error('html2pdf library is not loaded');
        }

        const settings = DB.getSettings();
        const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
        const details = Calculator.calcLoanDetails(loan, rate);

        const container = document.createElement('div');
        container.innerHTML = getLoanReportHTML(loan, details, settings);

        const cleanName = loan.customerName.replace(/\s+/g, '');
        const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
        const filename = `${cleanName}_GoldLoan_${dateStr}.pdf`;

        const opt = {
            margin:       10,
            filename:     filename,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        return await html2pdf().set(opt).from(container).output('blob');
    }

    /**
     * Export all loans as CSV
     */
    function exportLoansCSV() {
        const loans = DB.getLoans();
        const settings = DB.getSettings();

        const headers = [
            'Customer Name', 'Mobile', 'Metal Type', 'Purity', 'Weight (g)',
            'Loan Amount', 'Interest Rate', 'Interest Period', 'Interest Type',
            'Start Date', 'Duration (months)', 'Status', 'Locker',
            'Total Interest', 'Total Payable', 'Metal Value', 'LTV%', 'Risk Level'
        ];

        const rows = loans.map(loan => {
            const rate = loan.metalType === 'gold' ? settings.currentGoldRate : settings.currentSilverRate;
            const details = Calculator.calcLoanDetails(loan, rate);
            return [
                loan.customerName, loan.mobile || '', loan.metalType, loan.metalSubType,
                loan.weightGrams, loan.loanAmount, loan.interestRate, loan.interestPeriod,
                loan.interestType, loan.loanStartDate, loan.loanDuration, loan.status || 'active',
                loan.lockerName || '', details.totalInterest.toFixed(0),
                details.totalPayable.toFixed(0), details.metalValue.toFixed(0),
                details.ltv.toFixed(1), details.riskLevel
            ];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        downloadFile(csvContent, `goldvault_loans_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }

    /**
     * Download helper
     */
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Export all data as JSON backup
     */
    function exportBackup() {
        const data = {
            loans: DB.getLoans(),
            customers: DB.getCustomers(),
            marketLog: DB.getMarketLog(),
            settings: DB.getSettings(),
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `goldvault_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
    }

    /**
     * Import backup from JSON file
     */
    function importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.loans) localStorage.setItem('gv_loans', JSON.stringify(data.loans));
                    if (data.customers) localStorage.setItem('gv_customers', JSON.stringify(data.customers));
                    if (data.marketLog) localStorage.setItem('gv_market_log', JSON.stringify(data.marketLog));
                    if (data.settings) {
                        const currentSettings = DB.getSettings();
                        localStorage.setItem('gv_settings', JSON.stringify({ ...data.settings, pin: currentSettings.pin }));
                    }
                    resolve(true);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    return {
        exportLoanPDF, generateLoanPDFBlob, exportLoansCSV, exportBackup, importBackup
    };
})();
