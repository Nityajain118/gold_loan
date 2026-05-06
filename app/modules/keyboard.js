/* ============================================
   KeyNav — Keyboard Navigation System
   Power-user keyboard-first navigation controller
   ============================================ */
const KeyNav = (() => {
    // ── State ─────────────────────────────────────────────────────────────────
    let _focusedIndex = -1;
    let _focusableEls = [];
    let _isCompactMode = localStorage.getItem('GV_compactMode') === 'true';
    let _enabled = true;
    let _lastPage = '';

    // ── Init — attach global listener ─────────────────────────────────────────
    function init() {
        document.addEventListener('keydown', _handleKey);
        // Re-scan after any page render settles
        const origNav = UI.navigateTo;
        const wrappedNav = function(page, data) {
            origNav.call(this, page, data);
            _lastPage = page;
            // Let DOM settle, then scan for focusables
            setTimeout(() => _scanFocusables(), 120);
        };
        UI.navigateTo = wrappedNav;
    }

    // ── Scan page for focusable elements ──────────────────────────────────────
    function _scanFocusables() {
        _focusableEls = Array.from(document.querySelectorAll('.kn-focusable'));
        _focusedIndex = -1;
        _clearFocus();
    }

    // Manually trigger a rescan (called by pages after dynamic renders)
    function rescan() {
        _focusableEls = Array.from(document.querySelectorAll('.kn-focusable'));
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

    // ── Key Handler ───────────────────────────────────────────────────────────
    function _handleKey(e) {
        if (!_enabled) return;

        // Don't intercept when user is typing in inputs (except Escape and shortcuts)
        const tag = document.activeElement?.tagName;
        const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');

        // ── Global shortcuts (always active) ──────────────────────────────────
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
            }
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            UI.navigateTo('customers');
            return;
        }

        // If typing, only let Escape through
        if (isTyping && e.key !== 'Escape') return;

        // ── Navigation keys ───────────────────────────────────────────────────
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                _moveDown();
                break;

            case 'ArrowUp':
                e.preventDefault();
                _moveUp();
                break;

            case 'Enter':
                e.preventDefault();
                _activateFocused();
                break;

            case 'Escape':
                e.preventDefault();
                _goBack();
                break;

            case '/':
                // Don't trigger if already in input
                if (!isTyping) {
                    e.preventDefault();
                    _focusSearch();
                }
                break;
        }
    }

    // ── Movement ──────────────────────────────────────────────────────────────
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
        // Trigger click
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
            return;
        }

        // Try to click a back button
        const backBtn = document.querySelector('[onclick*="goBack"]') ||
                        document.querySelector('[onclick*="navigateTo(\'loans\')"]') ||
                        document.querySelector('[onclick*="navigateTo(\'dashboard\')"]') ||
                        document.querySelector('.btn-ghost[onclick*="Back"]');
        if (backBtn) { backBtn.click(); return; }

        // Default: go to dashboard
        UI.navigateTo('dashboard');
    }

    // ── Search Focus (/ or Ctrl+K) ────────────────────────────────────────────
    function _focusSearch() {
        const searchInputs = [
            document.getElementById('loan-search'),
            document.getElementById('cust-global-search'),
            document.querySelector('.search-input')
        ];
        for (const inp of searchInputs) {
            if (inp && inp.offsetParent !== null) {
                inp.focus();
                inp.select();
                return;
            }
        }
        // No search on this page — show a toast hint
        UI.toast('💡 Press Ctrl+L for Loans, Ctrl+Shift+C for Customers', 'info', 2000);
    }

    // ── Compact Mode ──────────────────────────────────────────────────────────
    function isCompact() {
        return _isCompactMode;
    }

    function toggleCompact() {
        _isCompactMode = !_isCompactMode;
        localStorage.setItem('GV_compactMode', _isCompactMode ? 'true' : 'false');
        _applyCompactMode();
        UI.toast(_isCompactMode ? '📐 Compact Mode ON — Showing essentials only' : '📋 Full Mode — All sections visible', 'info', 2000);
    }

    function _applyCompactMode() {
        document.querySelectorAll('.kn-compact-section').forEach(el => {
            el.style.display = _isCompactMode ? 'none' : '';
        });
        // Re-scan focusables after toggling (hidden items are no longer navigable)
        setTimeout(() => _scanFocusables(), 100);
    }

    // Call after Loan Detail renders to apply compact state
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
