import {
	Bell, FileText, Images, LayoutDashboard, LockKeyhole, LogOut, Menu,
	ScanSearch, Search, Settings, Store, UserRound, WalletCards, X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import BrandLogo from '../components/ui/BrandLogo';
import StatusBadge from '../components/ui/StatusBadge';
import { useAuth } from '../context/AuthContext';

const primaryNav = [
	{ label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
	{ label: 'Assets', to: '/assets', icon: Images },
	{ label: 'Verification', to: '/verification', icon: ScanSearch },
	{ label: 'Vault', icon: LockKeyhole, soon: true },
	{ label: 'Documents', icon: FileText, soon: true },
	{ label: 'Wallet', to: '/wallet', icon: WalletCards },
	{ label: 'Marketplace', to: '/marketplace', icon: Store },
];

function SidebarItem({ item, onNavigate }) {
	const Icon = item.icon;
	if (item.soon) {
		return (
			<button type="button" className="sidebar-link sidebar-link--disabled" disabled title={`${item.label} is coming soon`}>
				<Icon size={17} /><span>{item.label}</span><span className="sidebar-link__soon">Soon</span>
			</button>
		);
	}
	return (
		<NavLink to={item.to} onClick={onNavigate} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
			<Icon size={17} /><span>{item.label}</span>
		</NavLink>
	);
}

export default function AppShell() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const firstName = user?.fullName?.split(' ')[0] || 'Member';

	function handleLogout() {
		logout();
		navigate('/login', { replace: true });
	}

	return (
		<div className="app-shell">
			<button type="button" aria-label="Close navigation" className={`app-shell__scrim ${drawerOpen ? 'is-open' : ''}`} onClick={() => setDrawerOpen(false)} />
			<aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`}>
				<div className="sidebar__brand">
					<BrandLogo />
					<button type="button" className="icon-button sidebar__close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><X size={18} /></button>
				</div>
				<div className="sidebar__workspace">
					<span className="sidebar__workspace-icon">V</span>
					<div><strong>Personal vault</strong><span>Secure workspace</span></div>
					<StatusBadge tone="success">Live</StatusBadge>
				</div>
				<nav className="sidebar__nav" aria-label="Application navigation">
					<span className="sidebar__label">Workspace</span>
					{primaryNav.map((item) => <SidebarItem key={item.label} item={item} onNavigate={() => setDrawerOpen(false)} />)}
				</nav>
				<div className="sidebar__bottom">
					<button type="button" className="sidebar-link sidebar-link--disabled" disabled title="Settings are coming soon"><Settings size={17} /><span>Settings</span><span className="sidebar-link__soon">Soon</span></button>
					<SidebarItem item={{ label: 'Profile', to: '/profile', icon: UserRound }} onNavigate={() => setDrawerOpen(false)} />
					<button type="button" className="sidebar-link" onClick={handleLogout}><LogOut size={17} /><span>Log out</span></button>
				</div>
			</aside>

			<div className="app-shell__body">
				<header className="topbar">
					<button type="button" className="icon-button topbar__menu" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}><Menu size={19} /></button>
					<div className="topbar__search"><Search size={15} /><span>Search workspace</span><kbd>⌘ K</kbd></div>
					<div className="topbar__actions">
						<button type="button" className="icon-button" aria-label="Notifications" title="Notifications are coming soon"><Bell size={17} /></button>
						<NavLink to="/profile" className="topbar__profile" aria-label="Open profile">
							<span>{firstName.charAt(0).toUpperCase()}</span><div><strong>{firstName}</strong><small>{user?.role || 'Member'}</small></div>
						</NavLink>
					</div>
				</header>
				<main className="app-content"><Outlet /></main>
			</div>
		</div>
	);
}
