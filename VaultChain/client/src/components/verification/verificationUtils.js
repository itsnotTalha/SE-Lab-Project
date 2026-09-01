export function getVerificationConfidence(report) {
	const match = report?.matches?.[0];
	const thresholds = report?.thresholds || {};
	if (match?.sha256Match || match?.matchType === 'exact') return 100;
	if (match?.matchType === 'strong_visual') {
		const strong = Math.max(1, thresholds.strong ?? 6);
		return Math.min(99.4, 95 + Math.max(0, (strong - match.distance) / strong) * 4.4);
	}
	if (match?.matchType === 'possible_visual') {
		const strong = thresholds.strong ?? 6;
		const possible = Math.max(strong + 1, thresholds.possible ?? 12);
		return 70 + Math.max(0, (possible - match.distance) / (possible - strong)) * 24;
	}
	if (report?.nearestDistance != null) {
		const possible = thresholds.possible ?? 12;
		const bits = thresholds.hashBits ?? 256;
		return Math.max(0, 69 - ((report.nearestDistance - possible) / Math.max(1, bits - possible)) * 69);
	}
	return 0;
}

export function getPerceptualSimilarity(match) {
	if (!match) return null;
	if (match.sha256Match) return 100;
	return Math.max(0, (1 - match.distance / (match.hashBits || 256)) * 100);
}

export function getConfidenceState(score, hasMatch) {
	if (hasMatch && score >= 95) return { level: 'high', label: 'Strong Match Found', status: 'Verified registered asset', tone: 'success', explanation: 'This image closely matches a registered asset.' };
	if (hasMatch && score >= 70) return { level: 'medium', label: 'Possible Match Found', status: 'Additional verification recommended', tone: 'warning', explanation: 'Visual fingerprint features are similar, but the evidence is not conclusive.' };
	return { level: 'low', label: 'No Reliable Match Found', status: 'No sufficient registry match', tone: 'neutral', explanation: 'No registered asset reached the configured evidence threshold.' };
}

export function formatReportDate(value) {
	if (!value) return 'Unavailable';
	return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
