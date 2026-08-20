import { FolderPlus, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../ui/Button';

export default function VaultFormModal({ open, vault, onClose, onSubmit }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [autoLockMinutes, setAutoLockMinutes] = useState(10);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open) {
			setName(vault?.name || '');
			setDescription(vault?.description || '');
			setPassword('');
			setConfirmPassword('');
			setAutoLockMinutes(vault?.autoLockMinutes || 10);
			setError('');
			setLoading(false);
		}
	}, [open, vault]);

	if (!open) return null;

	async function submit(event) {
		event.preventDefault();
		if (!name.trim()) {
			setError('Vault name is required.');
			return;
		}
		const needsPassword = !vault || !vault.passwordProtected;
		if (needsPassword && password.length < 8) {
			setError('Vault password must be at least 8 characters.');
			return;
		}
		if (needsPassword && password !== confirmPassword) {
			setError('Vault passwords do not match.');
			return;
		}
		setLoading(true);
		setError('');
		try {
			await onSubmit({ name: name.trim(), description: description.trim(), ...(needsPassword ? { password, autoLockMinutes } : {}) });
			onClose();
		} catch (submitError) {
			setError(submitError.message);
		} finally {
			setLoading(false);
		}
	}

	const editing = Boolean(vault);
	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="vault-form-title">
			<button type="button" className="modal__backdrop" onClick={onClose} aria-label="Close Vault form" />
			<div className="modal__card vault-form-modal">
				<header className="modal__header">
					<div>
						<span className="modal__icon">{editing ? <Pencil size={18} /> : <FolderPlus size={18} />}</span>
						<div>
							<h2 id="vault-form-title">{editing ? 'Edit Vault' : 'Create Vault'}</h2>
							<p>Vaults organize assets without creating additional file copies.</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={17} /></button>
				</header>
				<form className="modal__form" style={{ display: 'grid', gap: 16 }} onSubmit={submit}>
					<label className="field">
						<span className="field-label">Vault name</span>
						<input className="input" autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Photography" />
					</label>
					{!editing || !vault.passwordProtected ? <>
						<label className="field">
							<span className="field-label">Vault password</span>
							<input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
						</label>
						<label className="field">
							<span className="field-label">Confirm password</span>
							<input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat Vault password" />
						</label>
						<label className="field">
							<span className="field-label">Auto-lock after</span>
							<select className="select" value={autoLockMinutes} onChange={(event) => setAutoLockMinutes(Number(event.target.value))}><option value={5}>5 minutes</option><option value={10}>10 minutes (default)</option><option value={30}>30 minutes</option></select>
						</label>
						<p className="vault-password-note">{editing ? 'Set a password to protect this legacy Vault. Files are not encrypted.' : 'The password protects access to this Vault. Files are not encrypted.'}</p>
					</> : null}
					<label className="field">
						<span className="field-label">Description <small className="field-hint">(optional)</small></span>
						<textarea className="textarea" maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Original photography and edited exports" />
					</label>
					{error ? <div className="error-banner" role="alert">{error}</div> : null}
					<div className="modal__footer">
						<Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
						<Button type="submit" icon={editing ? Pencil : FolderPlus} disabled={loading}>{loading ? 'Saving…' : editing ? 'Save changes' : 'Create Vault'}</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
