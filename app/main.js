/* ============================================
   Main App Entry Point
   ============================================ */
(function () {
    'use strict';

    // --- Init ---
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        // Check if PIN is set
        if (!DB.hasPin()) {
            showPinSetup();
        } else if (DB.isSessionValid()) {
            DB.setSession();
            showApp();
        } else {
            showPinLogin();
        }

        // Setup event listeners
        setupNav();
        setupDarkMode();
        setupTimeMode();
        setupSessionTimer();
    }

    // --- PIN Setup ---
    function showPinSetup() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('pin-setup').style.display = 'block';
        document.getElementById('pin-login').style.display = 'none';

        document.getElementById('set-pin-btn').onclick = async () => {
            const pin = document.getElementById('new-pin').value;
            const confirm = document.getElementById('confirm-pin').value;
            const err = document.getElementById('pin-setup-error');

            if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
                err.textContent = 'PIN must be exactly 4 digits';
                return;
            }
            if (pin !== confirm) {
                err.textContent = 'PINs do not match';
                return;
            }

            await DB.setPin(pin);
            DB.setSession();
            // Set default market rates
            DB.addMarketEntry(7200, 85);
            showApp();
        };
    }

    // --- PIN Login ---
    function showPinLogin() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('pin-setup').style.display = 'none';
        document.getElementById('pin-login').style.display = 'block';

        const loginBtn = document.getElementById('login-btn');
        const pinInput = document.getElementById('login-pin');

        loginBtn.onclick = async () => {
            const pin = pinInput.value;
            const err = document.getElementById('pin-login-error');

            if (!pin || pin.length !== 4) {
                err.textContent = 'Enter your 4-digit PIN';
                return;
            }

            const valid = await DB.verifyPin(pin);
            if (valid) {
                DB.setSession();
                showApp();
            } else {
                err.textContent = 'Incorrect PIN. Try again.';
                pinInput.value = '';
            }
        };

        // Enter key support
        pinInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    }

    // --- Show App ---
    function showApp() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';

        // Apply theme (FH_theme takes priority for hub consistency)
        const savedTheme = localStorage.getItem('FH_theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const settings = DB.getSettings();
        if (settings.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        // ★ Sync all existing GV customers to master on boot
        setTimeout(() => {
            try { DB.syncAllToMaster(); } catch(e) {}
            try {
                if (typeof JewelleryDataService !== 'undefined') JewelleryDataService.init();
            } catch(e) {}
        }, 300);

        // Update market ticker
        Market.updateTicker();

        // Try to fetch live rates
        Market.autoRefresh();

        // Navigate to dashboard
        UI.navigateTo('dashboard');
    }


    // --- Navigation ---
    function setupNav() {
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                UI.navigateTo(item.dataset.page);
            });
        });

        // Bottom navigation
        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                UI.navigateTo(item.dataset.page);
            });
        });

        // Menu toggle (mobile)
        const sidebar = document.getElementById('sidebar');
        const overlay = document.createElement('div');
        overlay.id = 'sidebar-overlay';
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        document.getElementById('menu-toggle').addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        // Sidebar close
        document.getElementById('sidebar-close').addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Tap outside overlay to close
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Close sidebar after nav click on mobile
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                }
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            DB.clearSession();
            DB.logActivity('User locked app');
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
            document.getElementById('pin-setup').style.display = 'none';
            document.getElementById('pin-login').style.display = 'block';
            document.getElementById('login-pin').value = '';
            document.getElementById('pin-login-error').textContent = '';
        });
    }

    // --- Dark Mode ---
    function setupDarkMode() {
        const toggle = document.getElementById('dark-mode-toggle');
        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            DB.saveSettings({ darkMode: newTheme === 'dark' });
            toggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }

    // --- Time Mode Toggle (Normal / Tithi) ---
    function setupTimeMode() {
        const settings = DB.getSettings();
        const btn = document.getElementById('time-mode-toggle');
        if (btn) {
            btn.textContent = settings.timeMode === 'tithi' ? '🌙' : '📅';
            btn.title = settings.timeMode === 'tithi' ? 'Tithi Mode Active (Click for Normal)' : 'Normal Mode Active (Click for Tithi)';
        }

        window._toggleTimeMode = () => {
            const s = DB.getSettings();
            const newMode = s.timeMode === 'tithi' ? 'normal' : 'tithi';
            DB.saveSettings({ timeMode: newMode });
            const b = document.getElementById('time-mode-toggle');
            if (b) {
                b.textContent = newMode === 'tithi' ? '🌙' : '📅';
                b.title = newMode === 'tithi' ? 'Tithi Mode Active (Click for Normal)' : 'Normal Mode Active (Click for Tithi)';
            }
            UI.toast(newMode === 'tithi' ? '🌙 Tithi Mode Activated' : '📅 Normal Mode Activated', 'info');
        };
    }

    // --- Session Timer ---
    function setupSessionTimer() {
        // Reset session on user activity
        ['click', 'keydown', 'mousemove', 'touchstart'].forEach(event => {
            document.addEventListener(event, () => {
                if (document.getElementById('app').style.display !== 'none') {
                    DB.setSession();
                }
            }, { passive: true });
        });

        // Check session every minute
        setInterval(() => {
            if (document.getElementById('app').style.display !== 'none') {
                if (!DB.isSessionValid()) {
                    DB.clearSession();
                    document.getElementById('login-screen').style.display = 'flex';
                    document.getElementById('app').style.display = 'none';
                    document.getElementById('pin-login').style.display = 'block';
                    document.getElementById('pin-setup').style.display = 'none';
                    UI.toast('Session expired. Please log in again.', 'warning');
                }
            }
        }, 60000);
    }
})();
