import { AlertCircle, CheckCircle2, Lock, Store, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../ui/Button';
import { documentService } from '../../services/documentService';

export default function AddMarketplaceModal({ document: doc, open, onClose, onSuccess }) {
	const navigate = useNavigate();
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [price, setPrice] = useState('50');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);

	useEffect(() => {
		if (open && doc) {
			setTitle(doc.originalName || '');
			setDescription(doc.description || 'Document listed from Secure Vault (Locked)');
			setPrice('50');
			setError('');
			setResult(null);
		}
	}, [open, doc]);

	if (!open || !doc) return null;

	async function handleSubmit(e) {
		e.preventDefault();
		setError('');
		setSubmitting(true);
		try {
			const listing = await documentService.addToMarketplace(doc.id, {
				title: title.trim(),
				description: description.trim(),
				price: Number(price),
			});
			setResult(listing);
			if (onSuccess) onSuccess(listing);
		} catch (err) {
			setError(err.message || 'Failed to add document to marketplace.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-mkt-title">
			<button className="modal__backdrop" aria-label="Close" onClick={onClose} />
			<section className="modal__card marketplace-form-modal" style={{ maxWidth: '520px' }}>
				<header className="modal__header">
					<div>
						<span className="modal__icon"><Store size={19} /></span>
						<div>
							<h2 id="add-mkt-title">Add to Market Place</h2>
							<p>List “{doc.originalName}” as a protected & locked marketplace asset.</p>
						</div>
					</div>
					<button className="icon-button" type="button" onClick={onClose} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				{result ? (
					<div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
						<div className="success-banner" role="status">
							<CheckCircle2 size={16} /> Listed successfully! Reference: {result.reference}
						</div>
						<div style={{ padding: '0.85rem', background: 'var(--surface-subtle, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.85rem', lineHeight: '1.5' }}>
							<p><strong>Status: Locked Asset</strong></p>
							<p style={{ color: 'var(--text-muted)' }}>This document is password-protected in VaultChain. Buyers and visitors cannot view or download it until access is requested and approved.</p>
						</div>
						<footer className="modal__footer" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
							<Button type="button" variant="secondary" onClick={onClose}>Close</Button>
							<Button type="button" icon={Store} onClick={() => { onClose(); navigate(`/marketplace/${result.reference}`); }}>
								View in Marketplace
							</Button>
						</footer>
					</div>
				) : (
					<form className="form-grid modal__form" onSubmit={handleSubmit}>
						<div style={{ padding: '0.75rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
							<Lock size={15} style={{ flexShrink: 0 }} />
							<span><strong>Locked File:</strong> This document will be listed in <strong>Locked</strong> state. Visitors cannot preview or download it directly.</span>
						</div>

						<div className="field">
							<label htmlFor="mkt-doc-title">Listing Title</label>
							<input
								id="mkt-doc-title"
								className="input"
								maxLength="120"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
							/>
						</div>

						<div className="field">
							<label htmlFor="mkt-doc-desc">Description <span className="field-hint">(optional)</span></label>
							<textarea
								id="mkt-doc-desc"
								className="textarea"
								maxLength="1000"
								rows={3}
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>

						<div className="field">
							<label htmlFor="mkt-doc-price">Price in VaultChain Credits</label>
							<input
								id="mkt-doc-price"
								className="input"
								type="number"
								min="0.01"
								max="1000000000"
								step="0.01"
								value={price}
								onChange={(e) => setPrice(e.target.value)}
								required
							/>
						</div>

						{error ? <div className="error-banner" role="alert"><AlertCircle size={16} />{error}</div> : null}

						<footer className="modal__footer">
							<Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
							<Button type="submit" icon={Store} disabled={submitting}>
								{submitting ? 'Listing…' : 'Add to Market Place'}
							</Button>
						</footer>
					</form>
				)}
			</section>
		</div>
	);
}
