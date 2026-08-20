import { KeyRound, RotateCcwKey, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../ui/Button';

export default function VaultPasswordModal({ open, mode = 'change', vault, onClose, onSubmit }) {
	const [credential, setCredential] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [autoLockMinutes, setAutoLockMinutes] = useState(10);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const reset = mode === 'reset';

	useEffect(() => {
		if (!open) return undefined;
		setCredential(''); setNewPassword(''); setConfirmPassword(''); setAutoLockMinutes(vault?.autoLockMinutes || 10); setLoading(false); setError('');
		const closeOnEscape = (event) => { if (event.key === 'Escape') onClose(); };
		document.addEventListener('keydown', closeOnEscape);
		return () => document.removeEventListener('keydown', closeOnEscape);
	}, [mode, onClose, open, vault?.autoLockMinutes]);

	if (!open) return null;

	async function submit(event) {
		event.preventDefault();
		if (!credential) { setError(reset ? 'Enter your account password.' : 'Enter the current Vault password.'); return; }
		if (newPassword.length < 8) { setError('New Vault password must be at least 8 characters.'); return; }
		if (newPassword !== confirmPassword) { setError('New Vault passwords do not match.'); return; }
		setLoading(true); setError('');
		try {
			await onSubmit({ ...(reset ? { accountPassword: credential } : { currentPassword: credential }), newPassword, confirmPassword, autoLockMinutes });
			onClose();
		} catch (submitError) { setError(submitError.message); }
		finally { setLoading(false); }
	}

	const Icon = reset ? RotateCcwKey : KeyRound;
	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="vault-password-title"><button type="button" className="modal__backdrop" onClick={onClose} aria-label="Cancel password update"/><div className="modal__card vault-form-modal"><header className="modal__header"><div><span className="modal__icon"><Icon size={18}/></span><div><h2 id="vault-password-title">{reset ? 'Reset Vault password' : 'Change Vault password'}</h2><p>{reset ? 'Confirm your VaultChain account password to reset access.' : `Update the password for ${vault.name}.`}</p></div></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={17}/></button></header><form className="modal__form" style={{ display: 'grid', gap: 16 }} onSubmit={submit}><label className="field"><span className="field-label">{reset ? 'Account password' : 'Current Vault password'}</span><input className="input" type="password" autoComplete="current-password" autoFocus maxLength={72} value={credential} onChange={(event) => setCredential(event.target.value)}/></label><label className="field"><span className="field-label">New Vault password</span><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)}/></label><label className="field"><span className="field-label">Confirm new password</span><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}/></label><label className="field"><span className="field-label">Auto-lock after</span><select className="select" value={autoLockMinutes} onChange={(event) => setAutoLockMinutes(Number(event.target.value))}><option value={5}>5 minutes</option><option value={10}>10 minutes (default)</option><option value={30}>30 minutes</option></select></label><p className="vault-password-note">Changing or resetting the password locks every active session. Vault files are access-controlled, not encrypted at rest.</p>{error ? <div className="error-banner" role="alert">{error}</div> : null}<div className="modal__footer"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" icon={Icon} disabled={loading}>{loading ? 'Saving…' : reset ? 'Reset password' : 'Change password'}</Button></div></form></div></div>;
}
