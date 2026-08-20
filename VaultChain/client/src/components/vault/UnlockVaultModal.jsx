import { KeyRound, LockKeyhole, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../ui/Button';

export default function UnlockVaultModal({ open, vault, onClose, onUnlock, onReset }) {
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) return undefined;
		setPassword('');
		setLoading(false);
		setError('');
		const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
		document.addEventListener('keydown', closeOnEscape);
		return () => document.removeEventListener('keydown', closeOnEscape);
	}, [open, onClose]);

	if (!open) return null;

	async function submit(event) {
		event.preventDefault();
		if (!password) { setError('Enter the Vault password.'); return; }
		setLoading(true);
		setError('');
		try {
			await onUnlock(password);
			onClose();
		} catch (unlockError) {
			setError(unlockError.message);
		} finally {
			setLoading(false);
		}
	}

	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="unlock-vault-title"><button type="button" className="modal__backdrop" onClick={onClose} aria-label="Cancel unlock"/><div className="modal__card vault-form-modal"><header className="modal__header"><div><span className="modal__icon"><LockKeyhole size={18}/></span><div><h2 id="unlock-vault-title">Unlock {vault.name}</h2><p>Access auto-locks after {vault.autoLockMinutes || 10} minutes.</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={17}/></button></header><form className="modal__form" style={{ display: 'grid', gap: 16 }} onSubmit={submit}><label className="field"><span className="field-label">Vault password</span><input className="input" type="password" autoComplete="current-password" autoFocus maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter Vault password"/></label><p className="vault-password-note">This unlock applies only to your current signed-in session. Repeated incorrect attempts are temporarily limited.</p>{error ? <div className="error-banner" role="alert">{error}</div> : null}<div className="modal__footer vault-unlock-footer">{onReset ? <Button type="button" variant="ghost" onClick={() => { onClose(); onReset(); }}>Reset with account password</Button> : <span/>}<div><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" icon={KeyRound} disabled={loading}>{loading ? 'Unlocking…' : 'Unlock Vault'}</Button></div></div></form></div></div>;
}
