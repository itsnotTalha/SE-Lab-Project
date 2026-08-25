import { AlertCircle, CalendarDays, CheckCircle2, KeyRound, Mail, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
	const { user, updateProfile, changePassword } = useAuth();
	const [profile, setProfile] = useState({ fullName: '', email: '' });
	const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
	const [profileState, setProfileState] = useState({ loading: false, error: '', success: '' });
	const [passwordState, setPasswordState] = useState({ loading: false, error: '', success: '' });

	useEffect(() => {
		setProfile({ fullName: user?.fullName || '', email: user?.email || '' });
	}, [user]);

	async function submitProfile(event) {
		event.preventDefault();
		const fullName = profile.fullName.trim();
		const email = profile.email.trim();
		setProfileState({ loading: false, error: '', success: '' });
		if (!fullName || !email) {
			setProfileState({ loading: false, error: 'Full name and email are required.', success: '' });
			return;
		}
		setProfileState({ loading: true, error: '', success: '' });
		try {
			await updateProfile({ fullName, email });
			setProfileState({ loading: false, error: '', success: 'Profile updated successfully.' });
		} catch (error) {
			setProfileState({ loading: false, error: error.message, success: '' });
		}
	}

	async function submitPassword(event) {
		event.preventDefault();
		setPasswordState({ loading: false, error: '', success: '' });
		if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
			setPasswordState({ loading: false, error: 'Complete all password fields.', success: '' });
			return;
		}
		if (passwords.newPassword.length < 8) {
			setPasswordState({ loading: false, error: 'New password must be at least 8 characters long.', success: '' });
			return;
		}
		if (passwords.newPassword !== passwords.confirmPassword) {
			setPasswordState({ loading: false, error: 'New passwords do not match.', success: '' });
			return;
		}
		setPasswordState({ loading: true, error: '', success: '' });
		try {
			await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
			setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
			setPasswordState({ loading: false, error: '', success: 'Password changed successfully.' });
		} catch (error) {
			setPasswordState({ loading: false, error: error.message, success: '' });
		}
	}

	const name = user?.fullName || 'VaultChain member';
	const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unavailable';

	return (
		<>
			<PageHeader eyebrow="Account" title="Profile & settings" description="Manage your VaultChain identity and account password." />
			<div className="profile-grid">
				<SectionCard className="profile-summary"><div className="profile-avatar">{name.charAt(0).toUpperCase()}</div><h2>{name}</h2><p>{user?.email}</p><div className="profile-summary__meta"><StatusBadge tone="success">Authenticated</StatusBadge><StatusBadge>{user?.role || 'user'}</StatusBadge></div></SectionCard>
				<SectionCard title="Account details" description="Your current authenticated account information."><div className="profile-details"><div className="profile-detail"><span><UserRound size={16}/></span><div><small>Full name</small><strong>{name}</strong></div></div><div className="profile-detail"><span><Mail size={16}/></span><div><small>Email address</small><strong>{user?.email || 'Unavailable'}</strong></div></div><div className="profile-detail"><span><ShieldCheck size={16}/></span><div><small>Account role</small><strong>{user?.role || 'user'}</strong></div></div><div className="profile-detail"><span><CalendarDays size={16}/></span><div><small>Member since</small><strong>{joined}</strong></div></div></div></SectionCard>
			</div>
			<div className="account-settings-grid">
				<SectionCard title="Edit profile" description="Update the name and email shown across your workspace.">
					<form className="form-grid" onSubmit={submitProfile} noValidate>
						<div className="field"><label htmlFor="profile-name">Full name</label><input id="profile-name" className="input" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} maxLength={100} autoComplete="name" required /></div>
						<div className="field"><label htmlFor="profile-email">Email address</label><input id="profile-email" className="input" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} autoComplete="email" required /></div>
						{profileState.error ? <div className="error-banner" role="alert"><AlertCircle size={16}/><span>{profileState.error}</span></div> : null}
						{profileState.success ? <div className="success-banner" role="status"><CheckCircle2 size={16}/><span>{profileState.success}</span></div> : null}
						<Button type="submit" icon={Save} disabled={profileState.loading}>{profileState.loading ? 'Saving…' : 'Save profile'}</Button>
					</form>
				</SectionCard>
				<SectionCard title="Change password" description="Confirm your current password before choosing a new one.">
					<form className="form-grid" onSubmit={submitPassword} noValidate>
						<div className="field"><label htmlFor="current-password">Current password</label><input id="current-password" className="input" type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} autoComplete="current-password" required /></div>
						<div className="field"><label htmlFor="new-password">New password</label><input id="new-password" className="input" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} minLength={8} autoComplete="new-password" required /><span className="field-hint">Use at least 8 characters.</span></div>
						<div className="field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" className="input" type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} minLength={8} autoComplete="new-password" required /></div>
						{passwordState.error ? <div className="error-banner" role="alert"><AlertCircle size={16}/><span>{passwordState.error}</span></div> : null}
						{passwordState.success ? <div className="success-banner" role="status"><CheckCircle2 size={16}/><span>{passwordState.success}</span></div> : null}
						<Button type="submit" icon={KeyRound} disabled={passwordState.loading}>{passwordState.loading ? 'Changing…' : 'Change password'}</Button>
					</form>
				</SectionCard>
			</div>
		</>
	);
}
