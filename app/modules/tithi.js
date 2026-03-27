/* ============================================
   Tithi Module — Hindu Lunar Calendar Engine
   ============================================
   Algorithmic approach using astronomical approximation.
   Provides: Tithi name, Paksha, Lunar Month, Tithi-based duration.
*/
const Tithi = (() => {
    // --- Constants ---
    const TITHI_NAMES = [
        'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima'
    ];

    const TITHI_NAMES_KRISHNA = [
        'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
        'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
        'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya'
    ];

    const LUNAR_MONTHS = [
        'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha',
        'Shravana', 'Bhadrapada', 'Ashwin', 'Kartik',
        'Margashirsha', 'Pausha', 'Magha', 'Phalguna'
    ];

    // Known New Moon (Amavasya) reference: Jan 6, 2000 18:14 UTC
    const REF_NEW_MOON_JD = 2451550.1;
    // Synodic month (new moon to new moon) in days
    const SYNODIC_MONTH = 29.530588853;

    /**
     * Convert a JS Date to Julian Day Number
     */
    function dateToJD(date) {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate() +
            (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) / 24;

        let yr = y, mo = m;
        if (mo <= 2) { yr -= 1; mo += 12; }

        const A = Math.floor(yr / 100);
        const B = 2 - A + Math.floor(A / 4);

        return Math.floor(365.25 * (yr + 4716)) +
            Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5;
    }

    /**
     * Get the lunar day (tithi number 0-29) for a given date
     */
    function getLunarDay(date) {
        const jd = dateToJD(date);
        const daysSinceRef = jd - REF_NEW_MOON_JD;
        const lunarAge = ((daysSinceRef % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
        const tithiDuration = SYNODIC_MONTH / 30;
        return Math.floor(lunarAge / tithiDuration);
    }

    /**
     * Get the approximate lunar month index (0-11) for a given date
     */
    function getLunarMonthIndex(date) {
        const jd = dateToJD(date);
        const daysSinceRef = jd - REF_NEW_MOON_JD;
        const lunarMonths = daysSinceRef / SYNODIC_MONTH;
        // Approximate: Chaitra starts around March/April
        // Reference: Chaitra 2000 started ~April 4, 2000 (JD ~2451639)
        const chaitraRefJD = 2451639.0;
        const monthsSinceChaitra = (jd - chaitraRefJD) / SYNODIC_MONTH;
        const idx = ((Math.floor(monthsSinceChaitra) % 12) + 12) % 12;
        return idx;
    }

    /**
     * Get full Tithi information for a date
     * @param {Date|string} dateInput — Date object or ISO string
     * @returns {object} { tithi, tithiNumber, paksha, lunarMonth, lunarMonthIndex, formatted }
     */
    function getTithiInfo(dateInput) {
        try {
            const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
            if (isNaN(date.getTime())) return null;

            const lunarDay = getLunarDay(date);
            const isShukla = lunarDay < 15;
            const paksha = isShukla ? 'Shukla' : 'Krishna';
            const tithiIndex = lunarDay % 15;
            const tithiName = isShukla ? TITHI_NAMES[tithiIndex] : TITHI_NAMES_KRISHNA[tithiIndex];
            const lunarMonthIdx = getLunarMonthIndex(date);
            const lunarMonth = LUNAR_MONTHS[lunarMonthIdx];
            
            // Standard Samvat calculation (approximate transition around mid-March)
            let samvat = date.getFullYear() + 57;
            if (date.getMonth() < 2 || (date.getMonth() === 2 && date.getDate() < 15)) {
                samvat -= 1;
            }

            return {
                tithi: tithiName,
                tithiNumber: lunarDay + 1, // 1-30
                paksha,
                pakshaEmoji: isShukla ? '🌒→🌕' : '🌕→🌑',
                lunarMonth,
                lunarMonthIndex: lunarMonthIdx,
                samvat,
                formatted: `📅 Samvat ${samvat} | ${lunarMonth}<br/>🌙 Tithi: ${paksha} ${tithiName}`
            };
        } catch (e) {
            console.warn('Tithi calculation failed:', e);
            return null;
        }
    }

    /**
     * Calculate Tithi-based duration between two dates
     * In Tithi mode: 1 Month = 30 Tithis, 1 Year = 360 Tithis
     * @param {Date|string} startDate
     * @param {Date|string} endDate
     * @returns {object} { tithis, months, years, display }
     */
    function getTithiDuration(startDate, endDate) {
        try {
            const start = startDate instanceof Date ? startDate : new Date(startDate);
            const end = endDate instanceof Date ? endDate : new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

            const jdStart = dateToJD(start);
            const jdEnd = dateToJD(end);
            const daysDiff = Math.abs(jdEnd - jdStart);

            // Each tithi = synodic month / 30
            const tithiDuration = SYNODIC_MONTH / 30; // ~0.9843 days per tithi
            const totalTithis = Math.round(daysDiff / tithiDuration);
            const months = totalTithis / 30;
            const years = totalTithis / 360;

            return {
                tithis: totalTithis,
                months: parseFloat(months.toFixed(4)),
                years: parseFloat(years.toFixed(4)),
                display: totalTithis >= 360
                    ? `${Math.floor(years)}y ${Math.round((years % 1) * 12)}m (${totalTithis} tithis)`
                    : totalTithis >= 30
                        ? `${Math.floor(months)}m ${totalTithis % 30}t (${totalTithis} tithis)`
                        : `${totalTithis} tithis`
            };
        } catch (e) {
            console.warn('Tithi duration calculation failed:', e);
            return null;
        }
    }

    /**
     * Get months for calculation based on time mode
     * @param {string} startDate
     * @param {string|null} endDate — null means "today"
     * @param {string} timeMode — 'normal' or 'tithi'
     * @returns {number} months (for use in interest calculations)
     */
    function getCalcMonths(startDate, endDate, timeMode) {
        const start = new Date(startDate);
        const end = endDate ? new Date(endDate) : new Date();

        if (timeMode === 'tithi') {
            const duration = getTithiDuration(start, end);
            return duration ? duration.months : 0;
        }

        // Normal mode — standard Gregorian months
        const monthsElapsed = (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth()) +
            (end.getDate() >= start.getDate() ? 0 : -1);
        return Math.max(0, monthsElapsed);
    }

    /**
     * Render a Tithi badge HTML for a date
     */
    function renderBadge(dateInput) {
        const info = getTithiInfo(dateInput);
        if (!info) return '<span class="tithi-badge tithi-na">Tithi N/A</span>';
        return `<span class="tithi-badge ${info.paksha.toLowerCase()}">${info.pakshaEmoji} ${info.tithi} · ${info.paksha} · ${info.lunarMonth}</span>`;
    }

    return {
        getTithiInfo,
        getTithiDuration,
        getCalcMonths,
        renderBadge,
        TITHI_NAMES,
        LUNAR_MONTHS
    };
})();
