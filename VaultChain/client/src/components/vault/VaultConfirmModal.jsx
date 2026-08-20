import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../ui/Button';

export default function VaultConfirmModal({ open, title, description, confirmLabel, onClose, onConfirm }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	useEffect(() => {
		if (open) { setLoading(false); setError(''); }
	}, [open]);
	if (!open) return null;
	async function confirm() {
		setLoading(true); setError('');
		try { await onConfirm(); onClose(); }
		catch (confirmError) { setError(confirmError.message); }
		finally { setLoading(false); }
	}
	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="vault-confirm-title"><button type="button" className="modal__backdrop" onClick={onClose} aria-label="Cancel"/><div className="modal__card vault-confirm-modal"><header className="modal__header"><div><span className="modal__icon vault-confirm-modal__icon"><AlertTriangle size={18}/></span><div><h2 id="vault-confirm-title">{title}</h2><p>{description}</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={17}/></button></header>{error ? <div className="error-banner">{error}</div> : null}<footer><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="button" variant="danger" disabled={loading} onClick={confirm}>{loading ? 'Working…' : confirmLabel}</Button></footer></div></div>;
}
