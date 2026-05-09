/* ============================================
   KeyNav — Keyboard Navigation System v2
   Power-user keyboard-first navigation controller
   with sidebar zone + content zone support
   ============================================ */
const KeyNav = (() => {
    // ── State ─────────────────────────────────────────────────────────────────
    let _focusedIndex = -1;
    let _focusableEls = [];
    let _zone = 'content';        // 'sidebar' | 'content'
    let _sidebarIndex = -1;
    let _sidebarItems = [];
    let _isCompactMode = localStorage.getItem('GV_compactMode') === 'true';
    let _enabled = true;

    // ── Init — attach global listener ─────────────────────────────────────────
    function init() {
        document.addEventListener('keydown', _handleKey);
        // Hook into UI.navigateTo to auto-rescan after page change
        const origNav = UI.navigateTo;
        UI.navigateTo = function(page, data) {
            origNav.call(this, page, data);
            _zone = 'content';
            setTimeout(() => {
                _scanFocusables();
                _scanSidebar();
            }, 150);
        };
        // Initial sidebar scan
        setTimeout(() => _scanSidebar(), 300);
    }

    // ── Scan sidebar items ────────────────────────────────────────────────────
    function _scanSidebar() {
        _sidebarItems = Array.from(document.querySelectorAll('.nav-list .nav-item'));
    }

    // ── Scan page for focusable elements ──────────────────────────────────────
    function _scanFocusables() {
        _focusableEls = Array.from(document.querySelectorAll('#page-container .kn-focusable'));
        _focusedIndex = -1;
        _clearFocus();
    }

    // Manually trigger a rescan (called by pages after dynamic renders)
    function rescan() {
        _focusableEls = Array.from(document.querySelectorAll('#page-container .kn-focusable'));
    }

    // ── Focus management ──────────────────────────────────────────────────────
    function _clearFocus() {
        document.querySelectorAll('.kn-focused').forEach(el => el.classList.remove('kn-focused'));
    }

    function _setFocus(idx) {
        if (idx < 0 || idx >= _focusableEls.length) return;
        _clearFocus();
        _focusedIndex = idx;
        const el = _focusableEls[idx];
        el.classList.add('kn-focused');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function _setSidebarFocus(idx) {
        if (idx < 0 || idx >= _sidebarItems.length) return;
        _clearFocus();
        _sidebarIndex = idx;
        const el = _sidebarItems[idx];
        el.classList.add('kn-focused');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // ── Key Handler ───────────────────────────────────────────────────────────
    function _handleKey(e) {
        if (!_enabled) return;

        // Don't intercept when user is typing in inputs (except Escape and shortcuts)
        const tag = document.activeElement?.tagName;
        const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

        // ── Global shortcuts (always active) ──────────────────────────────────
        // Alt Shortcuts
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    if (typeof UI.goBack === 'function') UI.goBack();
                    return;
                case 'ArrowRight':
                    e.preventDefault();
                    if (typeof UI.goForward === 'function') UI.goForward();
                    return;
                case 'h':
                case 'H':
                    e.preventDefault();
                    UI.navigateTo('dashboard');
                    return;
            }
        }

        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            switch (e.key.toLowerCase()) {
                case 'k':
                    e.preventDefault();
                    _focusSearch();
                    return;
                case 'l':
                    e.preventDefault();
                    UI.navigateTo('loans');
                    return;
                case 'n':
                    e.preventDefault();
                    UI.navigateTo('new-loan');
                    return;
                case 'c':
                    // Only intercept if user isn't copying text
                    if (!window.getSelection().toString()) {
                        e.preventDefault();
                        if (typeof CustomersPage !== 'undefined' && CustomersPage.showAddCustomerModal) {
                            UI.navigateTo('customers');
                            setTimeout(() => CustomersPage.showAddCustomerModal(), 200);
                        } else {
                            UI.navigateTo('customers');
                        }
                        return;
                    }
                    break;
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            UI.navigateTo('customers');
            return;
        }

        // If typing, only let Escape through
        if (isTyping && e.key !== 'Escape') return;

        // ── Zone-aware navigation ─────────────────────────────────────────────
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (_zone === 'sidebar') {
                    _sidebarDown();
                } else {
                    _moveDown();
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (_zone === 'sidebar') {
                    _sidebarUp();
                } else {
                    _moveUp();
                }
                break;

            case 'ArrowRight':
                e.preventDefault();
                if (_zone === 'sidebar') {
                    // Move from sidebar to content
                    _zone = 'content';
                    _clearFocus();
                    // Activate the selected sidebar page first
                    if (_sidebarIndex >= 0 && _sidebarIndex < _sidebarItems.length) {
                        const page = _sidebarItems[_sidebarIndex].dataset.page;
                        if (page) UI.navigateTo(page);
                    }
                    setTimeout(() => {
                        _scanFocusables();
                        if (_focusableEls.length > 0) _setFocus(0);
                    }, 200);
                }
                break;

            case 'ArrowLeft':
                e.preventDefault();
                // Move from content to sidebar
                _zone = 'sidebar';
                _clearFocus();
                _scanSidebar();
                // Find currently active sidebar item
                const activeIdx = _sidebarItems.findIndex(el => el.classList.contains('active'));
                _sidebarIndex = activeIdx >= 0 ? activeIdx : 0;
                _setSidebarFocus(_sidebarIndex);
                break;

            case 'Enter':
                e.preventDefault();
                if (_zone === 'sidebar') {
                    _activateSidebar();
                } else {
                    _activateFocused();
                }
                break;

            case 'Escape':
                e.preventDefault();
                _goBack();
                break;

            case '/':
                if (!isTyping) {
                    e.preventDefault();
                    _focusSearch();
                }
                break;
        }
    }

    // ── Sidebar movement ──────────────────────────────────────────────────────
    function _sidebarDown() {
        if (!_sidebarItems.length) _scanSidebar();
        if (!_sidebarItems.length) return;
        const next = _sidebarIndex < _sidebarItems.length - 1 ? _sidebarIndex + 1 : 0;
        _setSidebarFocus(next);
    }

    function _sidebarUp() {
        if (!_sidebarItems.length) _scanSidebar();
        if (!_sidebarItems.length) return;
        const prev = _sidebarIndex > 0 ? _sidebarIndex - 1 : _sidebarItems.length - 1;
        _setSidebarFocus(prev);
    }

    function _activateSidebar() {
        if (_sidebarIndex < 0 || _sidebarIndex >= _sidebarItems.length) return;
        const el = _sidebarItems[_sidebarIndex];
        const page = el.dataset.page;
        if (page) {
            _zone = 'content';
            UI.navigateTo(page);
        }
    }

    // ── Content movement ──────────────────────────────────────────────────────
    function _moveDown() {
        if (!_focusableEls.length) _scanFocusables();
        if (!_focusableEls.length) return;
        const next = _focusedIndex < _focusableEls.length - 1 ? _focusedIndex + 1 : 0;
        _setFocus(next);
    }

    function _moveUp() {
        if (!_focusableEls.length) _scanFocusables();
        if (!_focusableEls.length) return;
        const prev = _focusedIndex > 0 ? _focusedIndex - 1 : _focusableEls.length - 1;
        _setFocus(prev);
    }

    // ── Activate (Enter) ──────────────────────────────────────────────────────
    function _activateFocused() {
        if (_focusedIndex < 0 || _focusedIndex >= _focusableEls.length) return;
        const el = _focusableEls[_focusedIndex];
        el.click();
    }

    // ── Go Back (Escape) ──────────────────────────────────────────────────────
    function _goBack() {
        // If a modal is open, close it
        const modal = document.querySelector('.modal-overlay');
        if (modal) { modal.remove(); return; }

        // If search is focused, blur it
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            document.activeElement.blur();
            // Also hide customer search dropdown if exists
            const dd = document.getElementById('global-search-dropdown');
            if (dd) dd.style.display = 'none';
            return;
        }

        // If in sidebar zone, switch to content
        if (_zone === 'sidebar') {
            _zone = 'content';
            _clearFocus();
            return;
        }

        // Use UI history stack if available
        if (typeof UI.goBack === 'function') {
            UI.goBack();
            return;
        }

        // Try to click a back button fallback
        const backBtn = document.querySelector('[onclick*="goBack"]') ||
                        document.querySelector('.btn-ghost[onclick*="Back"]') ||
                        document.querySelector('[onclick*="navigateTo(\'loans\')"]') ||
                        document.querySelector('[onclick*="navigateTo(\'customers\')"]');
        if (backBtn) { backBtn.click(); return; }

        // Default: go to dashboard
        UI.navigateTo('dashboard');
    }

    // ── Search Focus (/ or Ctrl+K) ────────────────────────────────────────────
    function _focusSearch() {
        _zone = 'content';
        _clearFocus();
        const searchInputs = [
            document.getElementById('loan-search'),
            document.getElementById('cust-global-search'),
            document.querySelector('#page-container .search-input')
        ];
        for (const inp of searchInputs) {
            if (inp && inp.offsetParent !== null) {
                inp.focus();
                inp.select();
                return;
            }
        }
        UI.toast('💡 No search bar on this page. Try Ctrl+L for Loans', 'info', 2000);
    }

    // ── Compact Mode ──────────────────────────────────────────────────────────
    function isCompact() {
        return _isCompactMode;
    }

    function toggleCompact() {
        _isCompactMode = !_isCompactMode;
        localStorage.setItem('GV_compactMode', _isCompactMode ? 'true' : 'false');
        _applyCompactMode();
        UI.toast(_isCompactMode ? '📐 Compact Mode ON' : '📋 Full Mode ON', 'info', 2000);
    }

    function _applyCompactMode() {
        document.querySelectorAll('.kn-compact-section').forEach(el => {
            el.style.display = _isCompactMode ? 'none' : '';
        });
        setTimeout(() => _scanFocusables(), 100);
    }

    function applyCompactIfNeeded() {
        if (_isCompactMode) _applyCompactMode();
    }

    // ── Enable/Disable ────────────────────────────────────────────────────────
    function enable()  { _enabled = true; }
    function disable() { _enabled = false; }

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        init,
        rescan,
        isCompact,
        toggleCompact,
        applyCompactIfNeeded,
        enable,
        disable,
        get focusedIndex() { return _focusedIndex; }
    };
})();
