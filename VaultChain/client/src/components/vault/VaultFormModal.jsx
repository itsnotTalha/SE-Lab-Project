import { FolderPlus, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../ui/Button';

export default function VaultFormModal({ open, vault, onClose, onSubmit }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (open) {
			setName(vault?.name || '');
			setDescription(vault?.description || '');
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
		setLoading(true);
		setError('');
		try {
			await onSubmit({ name: name.trim(), description: description.trim() });
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
