import { AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';

import { marketplaceService } from '../../services/marketplaceService';
import Button from '../ui/Button';

export default function GrantAccessModal({ request, onClose, onGranted }) {
	const [accessType, setAccessType] = useState('all');
	const [singlePage, setSinglePage] = useState('1');
	const [selectedPages, setSelectedPages] = useState('1');
	const [canView, setCanView] = useState(true);
	const [canDownload, setCanDownload] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	if (!request) return null;

	async function handleSubmit(event) {
		event.preventDefault();
		setError('');

		let pages = [];
		if (accessType === 'single') {
			const p = parseInt(singlePage, 10);
			if (isNaN(p) || p < 1) {
				setError('Please enter a valid page number (greater than 0)');
				return;
			}
			pages = [p];
		} else if (accessType === 'selected') {
			const parsed = selectedPages
				.split(',')
				.map((s) => parseInt(s.trim(), 10))
				.filter((n) => !isNaN(n) && n > 0);
			if (parsed.length === 0) {
				setError('Please specify at least one valid page number (e.g. 1, 2, 3)');
				return;
			}
			pages = parsed;
		}

		if (!canView && !canDownload) {
			setError('At least one permission (View or Download) must be granted');
			return;
		}

		setLoading(true);
		try {
			const result = await marketplaceService.approveAccessRequest(request.id, {
				accessType,
				pages,
				canView,
				canDownload,
			});
			onGranted?.(result);
			onClose();
		} catch (err) {
			setError(err.message || 'Failed to grant access');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="grant-access-title">
			<button className="modal__backdrop" aria-label="Close" onClick={onClose} />
			<section className="modal__card" style={{ maxWidth: '520px' }}>
				<header className="modal__header">
					<div>
						<span className="modal__icon">
							<ShieldCheck size={19} />
						</span>
						<div>
							<h2 id="grant-access-title">Grant Document Access</h2>
							<p className="mono">{request.listingReference}</p>
						</div>
					</div>
					<button className="icon-button" type="button" onClick={onClose}>
						<X size={18} />
					</button>
				</header>

				<form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
					<div style={{ background: 'var(--surface-subtle, #f8fafc)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.875rem' }}>
						<div><strong>Requester:</strong> {request.requesterName} ({request.requesterEmail})</div>
						<div style={{ marginTop: '0.35rem' }}><strong>Listing:</strong> {request.listingTitle}</div>
						{request.message ? (
							<div style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-secondary, #64748b)' }}>
								"{request.message}"
							</div>
						) : null}
					</div>

					<div className="field">
						<label>Access Scope</label>
						<div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
							<button
								type="button"
								className={`button ${accessType === 'all' ? 'button--primary' : 'button--secondary'}`}
								style={{ flex: 1 }}
								onClick={() => setAccessType('all')}
							>
								All Pages
							</button>
							<button
								type="button"
								className={`button ${accessType === 'selected' ? 'button--primary' : 'button--secondary'}`}
								style={{ flex: 1 }}
								onClick={() => setAccessType('selected')}
							>
								Selected Pages
							</button>
							<button
								type="button"
								className={`button ${accessType === 'single' ? 'button--primary' : 'button--secondary'}`}
								style={{ flex: 1 }}
								onClick={() => setAccessType('single')}
							>
								Single Page
							</button>
						</div>
					</div>

					{accessType === 'single' ? (
						<div className="field">
							<label htmlFor="single-page-num">Allowed Page Number</label>
							<input
								id="single-page-num"
								className="input"
								type="number"
								min="1"
								value={singlePage}
								onChange={(e) => setSinglePage(e.target.value)}
								required
							/>
						</div>
					) : null}

					{accessType === 'selected' ? (
						<div className="field">
							<label htmlFor="selected-pages-input">Page Numbers (comma-separated)</label>
							<input
								id="selected-pages-input"
								className="input"
								type="text"
								placeholder="e.g. 1, 2, 4"
								value={selectedPages}
								onChange={(e) => setSelectedPages(e.target.value)}
								required
							/>
						</div>
					) : null}

					<div className="field">
						<label>Permissions Granted</label>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.35rem' }}>
							<label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
								<input
									type="checkbox"
									checked={canView}
									onChange={(e) => setCanView(e.target.checked)}
								/>
								<span><strong>View Permission:</strong> Allow buyer to inspect allowed pages</span>
							</label>
							<label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
								<input
									type="checkbox"
									checked={canDownload}
									onChange={(e) => setCanDownload(e.target.checked)}
								/>
								<span><strong>Download Permission:</strong> Allow buyer to download document file</span>
							</label>
						</div>
					</div>

					{error ? (
						<div className="error-banner" role="alert">
							<AlertCircle size={16} />
							<span>{error}</span>
						</div>
					) : null}

					<footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
						<Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
							Cancel
						</Button>
						<Button variant="primary" className="button--vault" icon={CheckCircle2} type="submit" disabled={loading}>
							{loading ? 'Approving…' : 'Accept Request & Grant Access'}
						</Button>
					</footer>
				</form>
			</section>
		</div>
	);
}
