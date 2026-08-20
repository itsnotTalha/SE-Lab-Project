import { CalendarDays, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
	const { user } = useAuth();
	const name = user?.fullName || 'VaultChain member';
	const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}) : 'Unavailable';
	return (
		<>
			<PageHeader eyebrow="Account" title="Profile" description="Your authenticated VaultChain account and security details." />
			<div className="profile-grid">
				<SectionCard className="profile-summary"><div className="profile-avatar">{name.charAt(0).toUpperCase()}</div><h2>{name}</h2><p>{user?.email}</p><div className="profile-summary__meta"><StatusBadge tone="success">Authenticated</StatusBadge><StatusBadge>{user?.role || 'user'}</StatusBadge></div></SectionCard>
				<SectionCard title="Account details" description="These details come from your authenticated user profile."><div className="profile-details"><div className="profile-detail"><span><UserRound size={16}/></span><div><small>Full name</small><strong>{name}</strong></div></div><div className="profile-detail"><span><Mail size={16}/></span><div><small>Email address</small><strong>{user?.email || 'Unavailable'}</strong></div></div><div className="profile-detail"><span><ShieldCheck size={16}/></span><div><small>Account role</small><strong>{user?.role || 'user'}</strong></div></div><div className="profile-detail"><span><CalendarDays size={16}/></span><div><small>Member since</small><strong>{joined}</strong></div></div></div></SectionCard>
			</div>
			<SectionCard title="Security & account settings" description="Profile editing, password changes, and two-factor authentication require additional backend endpoints." className="coming-soon-panel"><div><LockKeyhole size={34}/><h2>Account controls are in development</h2><p>Your current account remains protected by JWT authentication. Editable profile and security controls will appear here when the supporting API is available.</p><StatusBadge tone="warning">Backend required</StatusBadge></div></SectionCard>
		</>
	);
}
