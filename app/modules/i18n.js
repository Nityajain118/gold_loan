/* ============================================
   I18n Module — Localization Engine
   ============================================ */
const I18n = (() => {
    let currentLang = localStorage.getItem('GV_lang') || 'en';

    const dict = {
        en: {
            "nav_dashboard": "Dashboard",
            "nav_new_loan": "New Loan",
            "nav_old_loan": "Old Loan Entry",
            "nav_all_loans": "All Loans",
            "nav_customers": "Customers",
            "nav_khata": "Khata Ledger",
            "nav_inventory": "Inventory",
            "nav_market": "Market Rates",
            "nav_settings": "Settings",
            "nav_common": "Common Customers",
            "lock_app": "🔒 Lock App",
            "back_to_apps": "← Back to Apps",
            
            // Dashboard
            "money_lending_dashboard": "💰 Money Lending Dashboard",
            "total_principal": "Total Principal Given",
            "earned_interest": "Total Earned Interest",
            "active_loans": "Active Loans",
            "overdue": "Overdue (>90 days)",
            "portfolio_summary": "📊 Portfolio Summary",
            "total_loan_amount": "Total Loan Amount",
            "current_metal_value": "Current Metal Value",
            "expected_interest": "Expected Interest Income",
            "near_maturity": "Near Maturity",
            "risk_loss_zone": "In Risk/Loss Zone",
            "portfolio_pl": "Portfolio Profit/Loss",
            "overall_ltv": "Overall LTV",
            "risk_dist": "📊 Risk Distribution",
            "portfolio_overview": "💰 Loan Portfolio Overview",
            "alerts_warnings": "🔔 Alerts & Warnings",
            "quick_actions": "⚡ Quick Actions",
            "new_loan": "➕ New Loan",
            "add_old_loan": "🕰️ Add Old Loan",
            "export_csv": "📥 Export CSV",
            "backup": "💾 Backup Data",
            "all_clear": "All Clear!",
            "no_warnings": "No warnings or alerts at this time.",

            // Loan List
            "all_status": "All Status",
            "active": "Active",
            "closed": "Closed",
            "mixed": "Mixed",
            "migrated": "Migrated",
            "search_placeholder": "🔍 Search by name, mobile, village or address…",
            "no_loans_yet": "No Loans Yet",
            "no_matches": "No matches found",
            "active_amount": "Active Amount:",
            "total_loans": "Total Loans:",
            "view_loans": "Click to view loans →",
            "delete_all": "🗑️ Delete All",
            "gold_loans": "Gold Loans",
            "silver_loans": "Silver Loans",
            "back_to_customers": "← Back to Customers",
            "loan_types": "📂 Loan Types — Select to view",
            "payable": "Payable:",
            "weight": "Weight:",
            "ltv": "LTV:",
            "locker": "Locker:",
            "view_details": "👁️ View Details",
            "delete_loan": "🗑️",
            
            // Forms / General
            "customer_name": "Customer Name",
            "mobile_number": "Mobile Number (10 digits)",
            "locker_name": "Locker Name",
            "caste": "Customer Caste",
            "address": "Customer Address",
            "customer_photo": "📸 Customer Photo",
            "jewelry_items": "💍 Jewelry Items",
            "loan_details": "💰 Loan Details",
            "loan_amount": "Loan Amount (₹) *",
            "interest_rate": "Interest Rate (%) *",
            "interest_period": "Interest Period",
            "interest_type": "Interest Type",
            "monthly": "Monthly",
            "yearly": "Yearly",
            "simple": "Simple",
            "compound": "Compound",
            "compounding_freq": "🔁 Compounding Frequency",
            "loan_start_date": "Loan Start Date *",
            "loan_duration": "Loan Duration *",
            "months": "months",
            "calc_preview": "📊 Calculation Preview",
            "total_interest": "Total Interest",
            "total_payable": "Total Payable",
            "maturity_date": "Maturity Date",
            "save_loan": "💾 Save Loan",
            "metal": "Metal",
            "item_type": "Item Type",
            "purity": "Purity",
            "weight_g": "Weight (g)",
            "item_photo": "📸 Item Photo",
            "add_another_item": "➕ Add Another Item",
            "create_new_loan": "📝 Create New Loan",
            "customer_info": "👤 Customer Information",
            
            // Customers
            "customers": "Customers",
            "add_customer": "➕ Add Customer",
            "search_customers": "🔍 Search all customers by name or mobile…",
            "no_customers": "No Customers Yet",
            "no_customers_desc": "Customers are auto-created when you add loans.",
            "name": "Name",
            "mobile": "Mobile",
            "view_profile": "Profile",
            "delete": "Delete",
            
            // Settings
            "general_settings": "⚙️ General Settings",
            "ltv_pct": "LTV Percentage (%)",
            "safety_margin": "Safety Margin (%)",
            "auto_fetch_rates": "Auto-fetch live market rates",
            "tithi_mode": "🌙 Hindu Tithi Mode",
            "save_settings": "💾 Save Settings",
            "shop_branding": "🏪 Shop Branding (For Bills)",
            "shop_name": "Shop Name",
            "phone": "Phone Number",
            "shop_address": "Shop Address",
            "logo_url": "Shop Logo URL",
            "save_branding": "💾 Save Shop Branding",
            "change_pin": "🔑 Change PIN",
            "current_pin": "Current PIN",
            "new_pin": "New PIN",
            "backup_restore": "💾 Backup & Restore",
            "export_backup": "📥 Export Backup (JSON)",
            "restore_backup": "📤 Restore Backup",
            "activity_log": "🕐 Activity Log",
            "danger_zone": "⚠️ Danger Zone",
            "reset_all_data": "🗑️ Reset All Data",
            "action": "Action",
            "time_col": "Time",
            
            // Common
            "submit": "Submit",
            "cancel": "Cancel",
            "save": "Save",
            "success": "Success!",
            "error": "Error",
            // PIN / Auth
            "set_pin": "Set PIN & Enter",
            "enter_pin": "Enter PIN",
            "unlock": "Unlock",
            "pin_mismatch": "PINs do not match",
            "session_expired": "Session expired. Please log in again."
        },
        hi: {
            "nav_dashboard": "डैशबोर्ड",
            "nav_new_loan": "नया ऋण",
            "nav_old_loan": "पुरानी ऋण एंट्री",
            "nav_all_loans": "सभी ऋण",
            "nav_customers": "ग्राहक",
            "nav_khata": "खाता बही",
            "nav_inventory": "इन्वेंटरी",
            "nav_market": "बाज़ार भाव",
            "nav_settings": "सेटिंग्स",
            "nav_common": "साझा ग्राहक",
            "lock_app": "🔒 ऐप बंद करें",
            "back_to_apps": "← ऐप्स पर वापस",
            
            // Dashboard
            "money_lending_dashboard": "💰 ऋण डैशबोर्ड",
            "total_principal": "कुल मूलधन दिया",
            "earned_interest": "कुल अर्जित ब्याज",
            "active_loans": "सक्रिय ऋण",
            "overdue": "अतिदेय (>90 दिन)",
            "portfolio_summary": "📊 पोर्टफोलियो सारांश",
            "total_loan_amount": "कुल ऋण राशि",
            "current_metal_value": "वर्तमान धातु मूल्य",
            "expected_interest": "अपेक्षित ब्याज आय",
            "near_maturity": "परिपक्वता के करीब",
            "risk_loss_zone": "जोखिम/नुकसान क्षेत्र में",
            "portfolio_pl": "पोर्टफोलियो लाभ/हानि",
            "overall_ltv": "कुल LTV",
            "risk_dist": "📊 जोखिम वितरण",
            "portfolio_overview": "💰 ऋण पोर्टफोलियो अवलोकन",
            "alerts_warnings": "🔔 अलर्ट और चेतावनियां",
            "quick_actions": "⚡ त्वरित कार्रवाइयां",
            "new_loan": "➕ नया ऋण",
            "add_old_loan": "🕰️ पुराना ऋण जोड़ें",
            "export_csv": "📥 CSV निर्यात करें",
            "backup": "💾 डेटा बैकअप लें",
            "all_clear": "सब ठीक है!",
            "no_warnings": "इस समय कोई चेतावनी या अलर्ट नहीं है।",

            // Loan List
            "all_status": "सभी स्थिति",
            "active": "सक्रिय",
            "closed": "बंद",
            "mixed": "मिश्रित",
            "migrated": "माइग्रेट किया गया",
            "search_placeholder": "🔍 नाम, मोबाइल, गांव या पता खोजें…",
            "no_loans_yet": "अभी तक कोई ऋण नहीं",
            "no_matches": "कोई मेल नहीं मिला",
            "active_amount": "सक्रिय राशि:",
            "total_loans": "कुल ऋण:",
            "view_loans": "ऋण देखने के लिए क्लिक करें →",
            "delete_all": "🗑️ सभी हटाएं",
            "gold_loans": "स्वर्ण ऋण",
            "silver_loans": "रजत ऋण",
            "back_to_customers": "← ग्राहकों पर वापस",
            "loan_types": "📂 ऋण प्रकार — देखने के लिए चुनें",
            "payable": "देय:",
            "weight": "वजन:",
            "ltv": "LTV:",
            "locker": "लॉकर:",
            "view_details": "👁️ विवरण देखें",
            "delete_loan": "🗑️",
            
            // Forms / General
            "customer_name": "ग्राहक का नाम",
            "mobile_number": "मोबाइल नंबर (10 अंक)",
            "locker_name": "लॉकर का नाम",
            "caste": "ग्राहक की जाति",
            "address": "ग्राहक का पता",
            "customer_photo": "📸 ग्राहक का फोटो",
            "jewelry_items": "💍 आभूषण विवरण",
            "loan_details": "💰 ऋण विवरण",
            "loan_amount": "ऋण राशि (₹) *",
            "interest_rate": "ब्याज दर (%) *",
            "interest_period": "ब्याज अवधि",
            "interest_type": "ब्याज का प्रकार",
            "monthly": "मासिक",
            "yearly": "वार्षिक",
            "simple": "साधारण",
            "compound": "चक्रवृद्धि",
            "compounding_freq": "🔁 चक्रवृद्धि आवृत्ति",
            "loan_start_date": "ऋण प्रारंभ तिथि *",
            "loan_duration": "ऋण की अवधि *",
            "months": "महीने",
            "calc_preview": "📊 गणना पूर्वावलोकन",
            "total_interest": "कुल ब्याज",
            "total_payable": "कुल देय",
            "maturity_date": "परिपक्वता तिथि",
            "save_loan": "💾 ऋण सहेजें",
            "metal": "धातु",
            "item_type": "आइटम प्रकार",
            "purity": "शुद्धता",
            "weight_g": "वजन (ग्राम)",
            "item_photo": "📸 आइटम फोटो",
            "add_another_item": "➕ एक और आइटम जोड़ें",
            "create_new_loan": "📝 नया ऋण बनाएं",
            "customer_info": "👤 ग्राहक की जानकारी",
            
            // Customers
            "customers": "ग्राहक",
            "add_customer": "➕ ग्राहक जोड़ें",
            "search_customers": "🔍 नाम या मोबाइल द्वारा सभी ग्राहकों को खोजें…",
            "no_customers": "अभी तक कोई ग्राहक नहीं",
            "no_customers_desc": "जब आप ऋण जोड़ते हैं तो ग्राहक स्वतः बन जाते हैं।",
            "name": "नाम",
            "mobile": "मोबाइल",
            "view_profile": "प्रोफ़ाइल",
            "delete": "हटाएं",
            
            // Settings
            "general_settings": "⚙️ सामान्य सेटिंग्स",
            "ltv_pct": "LTV प्रतिशत (%)",
            "safety_margin": "सुरक्षा मार्जिन (%)",
            "auto_fetch_rates": "बाज़ार भाव स्वतः प्राप्त करें",
            "tithi_mode": "🌙 हिंदू तिथि मोड",
            "save_settings": "💾 सेटिंग्स सहेजें",
            "shop_branding": "🏪 दुकान की ब्रांडिंग (बिल के लिए)",
            "shop_name": "दुकान का नाम",
            "phone": "फोन नंबर",
            "shop_address": "दुकान का पता",
            "logo_url": "दुकान लोगो URL",
            "save_branding": "💾 दुकान की ब्रांडिंग सहेजें",
            "change_pin": "🔑 PIN बदलें",
            "current_pin": "वर्तमान PIN",
            "new_pin": "नया PIN",
            "backup_restore": "💾 बैकअप और पुनर्स्थापना",
            "export_backup": "📥 बैकअप निर्यात करें (JSON)",
            "restore_backup": "📤 बैकअप पुनर्स्थापित करें",
            "activity_log": "🕐 गतिविधि लॉग",
            "danger_zone": "⚠️ खतरे का क्षेत्र",
            "reset_all_data": "🗑️ सभी डेटा रीसेट करें",
            "action": "कार्य",
            "time_col": "समय",
            
            // Common
            "submit": "सबमिट करें",
            "cancel": "रद्द करें",
            "save": "सहेजें",
            "success": "सफल!",
            "error": "त्रुटि",
            // PIN / Auth
            "set_pin": "PIN सेट करें और दर्ज करें",
            "enter_pin": "PIN डालें",
            "unlock": "खोलें",
            "pin_mismatch": "PIN मेल नहीं खाते",
            "session_expired": "सत्र समाप्त। कृपया पुनः लॉगिन करें।"
        }
    };

    function init() {
        apply();
        updateToggleButton();
    }

    function toggle() {
        currentLang = currentLang === 'en' ? 'hi' : 'en';
        localStorage.setItem('GV_lang', currentLang);
        apply();
        updateToggleButton();
        
        // Re-render the currently active page so template strings get retranslated
        const activePage = document.querySelector('.nav-item.active, .bottom-nav-item.active');
        if (activePage && activePage.dataset.page && typeof UI !== 'undefined') {
            UI.navigateTo(activePage.dataset.page);
        }
    }

    function updateToggleButton() {
        const btn = document.getElementById('lang-toggle');
        if (btn) {
            btn.innerHTML = currentLang === 'en' ? '🌐 EN' : '🌐 हिंदी';
            btn.title = currentLang === 'en' ? 'Switch to Hindi' : 'Switch to English';
        }
    }

    function t(key) {
        return dict[currentLang][key] || key;
    }

    function apply(root = document) {
        // Text nodes
        root.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[currentLang][key]) {
                el.innerHTML = dict[currentLang][key]; // Using innerHTML to support emoji/icons in translations
            }
        });
        
        // Placeholders
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[currentLang][key]) {
                el.placeholder = dict[currentLang][key];
            }
        });
        
        // Titles
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (dict[currentLang][key]) {
                el.title = dict[currentLang][key];
            }
        });
    }

    function getLang() {
        return currentLang;
    }

    return { init, toggle, t, apply, getLang };
})();
