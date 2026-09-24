import { AlertCircle, CheckCircle2, ChevronRight, FileCheck, HelpCircle, Loader2, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';

export default function DocumentVerificationModal({ open, document, allDocuments = [], onClose }) {
	const [targetId, setTargetId] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [verification, setVerification] = useState(null);

	const availableTargets = (allDocuments || []).filter((d) => d.id !== document?.id);

	useEffect(() => {
		if (!open || !document) return;
		setTargetId(availableTargets[0]?.id ? String(availableTargets[0].id) : '');
		setError('');
		setVerification(null);
		setLoading(false);
	}, [open, document]);

	if (!open || !document) return null;

	async function handleVerify(e) {
		e?.preventDefault?.();
		if (!targetId) {
			setError('Please select a comparison document from your library.');
			return;
		}
		setError('');
		setLoading(true);
		try {
			const res = await documentService.verify(document.id, targetId);
			setVerification(res);
		} catch (err) {
			setError(err.message || 'Verification failed');
		} finally {
			setLoading(false);
		}
	}

	const statusColor = verification?.status === 'original'
		? '#22c55e'
		: verification?.status === 'modified'
			? '#eab308'
			: '#ef4444';

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="verification-modal-title">
			<button className="modal__backdrop" aria-label="Close" onClick={loading ? undefined : onClose} />
			<section className="modal__card" style={{ maxWidth: '640px' }}>
				<header className="modal__header">
					<div>
						<span className="modal__icon"><FileCheck size={19} /></span>
						<div>
							<h2 id="verification-modal-title">Document Integrity Verification</h2>
							<p>Compare against reference document using SHA-256 and Semantic Analysis.</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				<div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					{/* Document Identity Banner */}
					<div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.9rem', borderRadius: '8px', fontSize: '0.85rem' }}>
						<div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem' }}>{document.originalName}</div>
						<div style={{ color: 'var(--text-muted, #94a3b8)', wordBreak: 'break-all' }}>
							<div>Reference: <code>{document.reference}</code></div>
							<div>File SHA-256: <code>{document.sha256}</code></div>
							{document.textSha256 ? <div>Text SHA-256: <code>{document.textSha256}</code></div> : null}
						</div>
					</div>

					{/* Comparison selection */}
					<div>
						<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem' }}>
							Compare against reference document:
						</label>
						{availableTargets.length === 0 ? (
							<p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
								You need at least one other document in your library to run a comparison.
							</p>
						) : (
							<select
								value={targetId}
								onChange={(e) => setTargetId(e.target.value)}
								style={{
									width: '100%',
									padding: '0.6rem 0.8rem',
									borderRadius: '6px',
									background: 'var(--surface-color, #1e293b)',
									border: '1px solid var(--border-color, #334155)',
									color: 'inherit',
								}}
								disabled={loading}
							>
								{availableTargets.map((d) => (
									<option key={d.id} value={d.id}>
										{d.originalName} ({d.reference})
									</option>
								))}
							</select>
						)}
					</div>

					{error ? (
						<div className="error-banner" role="alert">
							<AlertCircle size={16} />
							{error}
						</div>
					) : null}

					{/* Verification Results Panel */}
					{verification ? (
						<div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '8px', border: `1px solid ${statusColor}` }}>
							<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									{verification.status === 'original' ? <ShieldCheck size={22} color={statusColor} /> : verification.status === 'modified' ? <ShieldAlert size={22} color={statusColor} /> : <HelpCircle size={22} color={statusColor} />}
									<strong style={{ color: statusColor, fontSize: '1rem', textTransform: 'uppercase' }}>
										{verification.report?.evidence?.classification || verification.status}
									</strong>
								</div>
								<div style={{ fontWeight: 700, fontSize: '1.1rem', color: statusColor }}>
									{verification.report?.evidence?.similarityPercentage || `${Math.round(verification.similarityScore * 100)}%`} Match
								</div>
							</div>

							<div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
								<div><strong>File SHA-256 Match:</strong> {verification.sha256Match ? '✅ Exact Match' : '❌ Different'}</div>
								<div><strong>Text Content Match:</strong> {verification.report?.evidence?.textMatch ? '✅ Exact Content Match' : '❌ Content Differs'}</div>

								{verification.report?.evidence?.differences?.addedWords?.length > 0 ? (
									<div style={{ marginTop: '0.4rem' }}>
										<strong>Added wording:</strong>{' '}
										<span style={{ color: '#22c55e' }}>{verification.report.evidence.differences.addedWords.slice(0, 10).join(', ')}</span>
									</div>
								) : null}

								{verification.report?.evidence?.differences?.removedWords?.length > 0 ? (
									<div>
										<strong>Removed wording:</strong>{' '}
										<span style={{ color: '#ef4444' }}>{verification.report.evidence.differences.removedWords.slice(0, 10).join(', ')}</span>
									</div>
								) : null}

								{verification.report?.evidence?.semanticExplanation ? (
									<div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
										<strong>Gemini Semantic Summary:</strong>
										<p style={{ margin: '0.2rem 0 0', fontStyle: 'italic' }}>
											{verification.report.evidence.semanticExplanation}
										</p>
									</div>
								) : null}
							</div>
						</div>
					) : null}
				</div>

				<footer className="modal__footer">
					<Button variant="secondary" onClick={onClose} disabled={loading}>
						Close
					</Button>
					<Button onClick={handleVerify} disabled={loading || availableTargets.length === 0} icon={FileCheck}>
						{loading ? 'Verifying with Gemini & Hashes…' : 'Run Verification'}
					</Button>
				</footer>
			</section>
		</div>
	);
}
