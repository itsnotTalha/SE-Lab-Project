import { AlertCircle, CheckCircle2, KeyRound, Send, X } from 'lucide-react';
import { useState } from 'react';

import { marketplaceService } from '../../services/marketplaceService';
import Button from '../ui/Button';

export default function RequestAccessModal({ listing, onClose, onRequested }) {
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	if (!listing) return null;

	async function handleSubmit(event) {
		event.preventDefault();
		setLoading(true);
		setError('');

		try {
			const req = await marketplaceService.createAccessRequest(listing.reference, message);
			setSuccess(true);
			onRequested?.(req);
		} catch (err) {
			setError(err.message || 'Failed to submit access request');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="request-access-title">
			<button className="modal__backdrop" aria-label="Close" onClick={onClose} />
			<section className="modal__card" style={{ maxWidth: '480px' }}>
				<header className="modal__header">
					<div>
						<span className="modal__icon">
							{success ? <CheckCircle2 size={19} /> : <KeyRound size={19} />}
						</span>
						<div>
							<h2 id="request-access-title">{success ? 'Request Submitted' : 'Request Document Access'}</h2>
							<p className="mono">{listing.reference}</p>
						</div>
					</div>
					<button className="icon-button" type="button" onClick={onClose}>
						<X size={18} />
					</button>
				</header>

				<div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
					{success ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							<div className="info-banner" style={{ background: 'var(--success-bg, #ecfdf5)', color: 'var(--success-text, #065f46)', borderColor: 'var(--success-border, #a7f3d0)' }}>
								Your access request for <strong>{listing.title}</strong> has been sent to the document owner. You will gain access once they approve your request.
							</div>
							<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
								<Button onClick={onClose}>Close</Button>
							</div>
						</div>
					) : (
						<form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
							<p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)' }}>
								Request access to view pages or download <strong>{listing.title}</strong> from the seller.
							</p>

							<div className="field">
								<label htmlFor="request-message">Message to Owner (Optional)</label>
								<textarea
									id="request-message"
									className="input"
									rows={3}
									placeholder="e.g. Requesting access to review document pages..."
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									maxLength={500}
								/>
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
								<Button variant="primary" className="button--vault" icon={Send} type="submit" disabled={loading}>
									{loading ? 'Sending…' : 'Send Request'}
								</Button>
							</footer>
						</form>
					)}
				</div>
			</section>
		</div>
	);
}
