import { CheckCircle2, CircleHelp, Fingerprint, TriangleAlert } from 'lucide-react';

import CopyButton from '../ui/CopyButton';
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
	if (compact) {
		return (
			<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
				<StatusBadge tone={detail.tone}>{detail.label}</StatusBadge>
				{verification.similarityScore != null ? (
					<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
						{percent(verification.similarityScore)}
					</span>
				) : null}
				{verification.report?.sha256Match ? (
					<StatusBadge tone="success">SHA Match</StatusBadge>
				) : null}
			</div>
		);
	}

	const report = verification.report || {};
	const sha256Match = report.sha256Match;

	return (
		<div style={{ display: 'grid', gap: '12px' }}>
			<section className="inspector__timeline" aria-label="Document verification result">
				<span><Icon size={18} /></span>
				<div>
					<small>Text & Content Verification</small>
					<strong>{detail.label} · Similarity {percent(verification.similarityScore)}</strong>
					<small>{report.reason || detail.description}</small>
				</div>
			</section>

			{report.targetSha256 || report.referenceSha256 ? (
				<section
					style={{
						padding: '12px',
						borderRadius: '10px',
						border: '1px solid var(--border)',
						background: 'rgba(5, 7, 13, 0.45)',
						display: 'grid',
						gap: '8px',
						fontSize: '0.72rem',
					}}
					aria-label="Binary SHA-256 comparison"
				>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
						<span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
							<Fingerprint size={15} /> Binary SHA-256 Integrity
						</span>
						<StatusBadge tone={sha256Match ? 'success' : 'neutral'}>
							{sha256Match ? 'Exact Byte Match (SHA-256 Same)' : 'Different File Hashes'}
						</StatusBadge>
					</div>

					{report.targetSha256 ? (
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
							<span style={{ minWidth: '100px', color: 'var(--text-muted)' }}>Target SHA:</span>
							<code style={{ fontSize: '0.66rem', wordBreak: 'break-all', flex: 1 }}>{report.targetSha256}</code>
							<CopyButton value={report.targetSha256} label="Copy target SHA" />
						</div>
					) : null}

					{report.referenceSha256 ? (
						<div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
							<span style={{ minWidth: '100px', color: 'var(--text-muted)' }}>Reference SHA:</span>
							<code style={{ fontSize: '0.66rem', wordBreak: 'break-all', flex: 1 }}>{report.referenceSha256}</code>
							<CopyButton value={report.referenceSha256} label="Copy ref SHA" />
						</div>
					) : null}

					<div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '2px', lineHeight: 1.4 }}>
						{sha256Match
							? '✅ Exact Duplicate: The files are 100% byte-for-byte identical.'
							: 'ℹ️ Different Binary Files: The files have different SHA-256 hashes (e.g. edited, different PDF metadata, or different text), but their text content is compared above.'}
					</div>
				</section>
			) : null}
		</div>
	);
}
