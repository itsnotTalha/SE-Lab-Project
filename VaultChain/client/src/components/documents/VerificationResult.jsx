import { CheckCircle2, CircleHelp, TriangleAlert } from 'lucide-react';

import StatusBadge from '../ui/StatusBadge';

const RESULT_DETAILS = {
	original: { tone: 'success', icon: CheckCircle2, label: 'Original', description: 'The normalized OCR text matches the reference document.' },
	modified: { tone: 'warning', icon: TriangleAlert, label: 'Modified', description: 'The normalized OCR text differs from the reference document.' },
	unknown: { tone: 'info', icon: CircleHelp, label: 'Unknown', description: 'Both documents need completed OCR with extracted text before they can be compared.' },
};

function percent(score) {
	return score == null ? 'Unavailable' : `${Math.round(score * 100)}%`;
}

export default function VerificationResult({ verification, compact = false }) {
	const detail = RESULT_DETAILS[verification.status] || RESULT_DETAILS.unknown;
	const Icon = detail.icon;
	if (compact) return <StatusBadge tone={detail.tone}>{detail.label}</StatusBadge>;

	return <section className="inspector__timeline" aria-label="Document verification result">
		<span><Icon size={18}/></span>
		<div>
			<small>Verification result</small>
			<strong>{detail.label} · Similarity {percent(verification.similarityScore)}</strong>
			<small>{verification.report?.reason || detail.description}</small>
		</div>
	</section>;
}
