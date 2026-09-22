/**
 * Formats a timestamp into Bangladesh Standard Time (Asia/Dhaka).
 * Handles SQLite strings, ISO timestamps, and UTC offsets correctly.
 *
 * @param {string|number|Date} dateValue
 * @returns {string} Formatted date time string in Dhaka time (e.g. "22 Sep 2026, 06:02 AM")
 */
export function formatDhakaTime(dateValue) {
	if (!dateValue) return '—';
	try {
		let dateStr = String(dateValue).trim();
		// If string has date & time without timezone offset (e.g. SQLite "YYYY-MM-DD HH:MM:SS"),
		// ensure it is treated as UTC so local conversion to Dhaka (+6) is accurate.
		if (!dateStr.includes('T') && dateStr.includes(' ') && !dateStr.endsWith('Z')) {
			dateStr = `${dateStr.replace(' ', 'T')}Z`;
		} else if (dateStr.includes('T') && !dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
			dateStr = `${dateStr}Z`;
		}

		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return String(dateValue);

		return new Intl.DateTimeFormat('en-GB', {
			timeZone: 'Asia/Dhaka',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		}).format(date);
	} catch {
		return String(dateValue);
	}
}
