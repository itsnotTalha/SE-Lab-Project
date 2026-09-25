import { AlertCircle, CheckCircle2, Download, Eye, EyeOff, Lock, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../ui/Button';
import { documentService } from '../../services/documentService';

export default function DocumentDownloadModal({ open, onClose, document: doc }) {
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (open) {
			setPassword('');
			setShowPassword(false);
			setError('');
			setSuccess(false);
		}
	}, [open]);

	if (!open || !doc) return null;

	async function handleSubmit(e) {
		e.preventDefault();
		if (!password) {
			setError('Please enter your account password');
			return;
		}

		setError('');
		setLoading(true);

		try {
			await documentService.downloadWithPassword(doc.id, password, doc.originalName);
			setSuccess(true);
			setTimeout(() => {
				onClose();
			}, 900);
		} catch (err) {
			setError(err.message || 'Incorrect account password. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="download-modal-title">
			<button className="modal__backdrop" aria-label="Close" onClick={onClose} />
			<section className="modal__card" style={{ maxWidth: '440px' }}>
				<header className="modal__header">
					<div>
						<span className="modal__icon">
							<Lock size={19} />
						</span>
						<div>
							<h2 id="download-modal-title">Confirm Password</h2>
							<p>Authorize download for “{doc.originalName}”</p>
						</div>
					</div>
					<button className="icon-button" type="button" onClick={onClose} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				<form className="form-grid modal__form" onSubmit={handleSubmit} style={{ padding: '18px 24px' }}>
					<div
						style={{
							padding: '10px 14px',
							background: 'var(--surface-subtle, #f8fafc)',
							borderRadius: '8px',
							border: '1px solid var(--border-color, #e2e8f0)',
							fontSize: '0.82rem',
							color: 'var(--text-secondary, #64748b)',
							display: 'flex',
							alignItems: 'center',
							gap: '10px',
						}}
					>
						<Lock size={16} style={{ color: 'var(--primary, #2563eb)', flexShrink: 0 }} />
						<span>Enter your VaultChain account password to securely decrypt & download this file.</span>
					</div>

					<div className="field">
						<label htmlFor="download-account-password">Account Password</label>
						<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
							<input
								id="download-account-password"
								className="input"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter account password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								autoFocus
								style={{ paddingRight: '40px' }}
							/>
							<button
								type="button"
								onClick={() => setShowPassword((prev) => !prev)}
								aria-label={showPassword ? 'Hide password' : 'Show password'}
								style={{
									position: 'absolute',
									right: '10px',
									background: 'transparent',
									border: 'none',
									cursor: 'pointer',
									color: 'var(--text-muted, #94a3b8)',
									display: 'grid',
									placeItems: 'center',
									padding: '2px',
								}}
							>
								{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
							</button>
						</div>
					</div>

					{error ? (
						<div className="error-banner" role="alert" style={{ fontSize: '0.8rem' }}>
							<AlertCircle size={15} />
							<span>{error}</span>
						</div>
					) : null}

					{success ? (
						<div className="success-banner" role="status" style={{ fontSize: '0.8rem' }}>
							<CheckCircle2 size={15} />
							<span>Password verified! Downloading document…</span>
						</div>
					) : null}

					<footer className="modal__footer" style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
						<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
							Cancel
						</Button>
						<Button type="submit" icon={Download} disabled={loading || !password || success}>
							{loading ? 'Verifying…' : 'Confirm & Download'}
						</Button>
					</footer>
				</form>
			</section>
		</div>
	);
}
