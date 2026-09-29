import RouteContent from '../components/ui/RouteContent';
import {
	Activity, Link2, BarChart3, Building2, CircleDollarSign, EyeOff, FileText, Images, LayoutDashboard,
	LockKeyhole, PlusCircle, ScanSearch, ShieldCheck, Store, Users, WalletCards,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/useWorkspace';
import { organizationPath } from '../services/organizationService';
import LoadingState from '../components/ui/LoadingState';

import CommandMenu from '../components/layout/CommandMenu';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import '../styles/stealth-mode.css';

const navigation = [
	{ section: 'Workspace', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
	{ section: 'Workspace', label: 'My Assets', to: '/assets', icon: Images },
	{ section: 'Workspace', label: 'Upload', to: '/upload', icon: PlusCircle },
	{ section: 'Workspace', label: 'Verification Center', to: '/verification', icon: ScanSearch },
	{ section: 'Workspace', label: 'Vaults', to: '/vault', icon: LockKeyhole },
	{ section: 'Workspace', label: 'Organizations', to: '/organizations', icon: Building2 },
	{ section: 'Insights', label: 'Blockchain Explorer', to: '/blockchain', icon: Link2 },
	{ section: 'Insights', label: 'Analytics', to: '/analytics', icon: BarChart3 },
	{ section: 'Insights', label: 'Earnings', to: '/earnings', icon: CircleDollarSign },
	{ section: 'Insights', label: 'Activity History', to: '/activity', icon: Activity },
	{ section: 'More', label: 'Documents', to: '/documents', icon: FileText },
	{ section: 'More', label: 'Marketplace', to: '/marketplace', icon: Store },
	{ section: 'More', label: 'Wallet', to: '/wallet', icon: WalletCards },
];

export default function AppShell() {
	const navigate = useNavigate();
	const { workspace, organizations, ready, missingOrganization } = useWorkspace();
	const { user, logout } = useAuth();
	const { theme, toggleTheme, motionEnabled, toggleMotion } = useTheme();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('vaultchain-sidebar') === 'collapsed');
	const [searchOpen, setSearchOpen] = useState(false);
	const [stealthMode, setStealthMode] = useState(() => window.localStorage.getItem('vaultchain-stealth') === 'true');
	const firstName = user?.fullName?.split(' ')[0] || 'Member';
	const adminRoles = ['SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'];
 const visibleNavigation = useMemo(() => {
  if (workspace.type === 'organization') return [
   { section: 'Organization', label: 'Overview', to: organizationPath(workspace.id), icon: Building2 },
   { section: 'Organization', label: 'Inventory', to: organizationPath(workspace.id, 'inventory'), icon: Store },
   { section: 'Organization', label: 'Team & splits', to: organizationPath(workspace.id, 'contributors'), icon: Users },
   { section: 'Organization', label: 'Company vaults', to: organizationPath(workspace.id, 'vaults'), icon: LockKeyhole },
   { section: 'Finance', label: 'Treasury', to: organizationPath(workspace.id, 'treasury'), icon: WalletCards },
   { section: 'Finance', label: 'Revenue', to: organizationPath(workspace.id, 'revenue'), icon: BarChart3 },
  ];
  return adminRoles.includes(String(user?.role || '').toUpperCase()) ? [...navigation, { section: 'More', label: 'Admin Console', to: '/admin/dashboard', icon: ShieldCheck }] : navigation;
 }, [user?.role, workspace.id, workspace.type]);

	useEffect(() => {
		if (stealthMode) {
			document.body.classList.add('stealth-mode-active');
		} else {
			document.body.classList.remove('stealth-mode-active');
		}
		window.localStorage.setItem('vaultchain-stealth', String(stealthMode));
	}, [stealthMode]);

	useEffect(() => {
		function onKeyDown(event) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
			if (event.key === 'Escape') { setSearchOpen(false); setDrawerOpen(false); }
			if (
				(event.key === 'b' || event.key === 'B') &&
				!['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) &&
				!event.metaKey && !event.ctrlKey && !event.altKey
			) {
				setStealthMode((prev) => !prev);
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	function toggleCollapsed() {
		setCollapsed((current) => {
			window.localStorage.setItem('vaultchain-sidebar', current ? 'expanded' : 'collapsed');
			return !current;
		});
	}

	async function handleLogout() { await logout(); navigate('/login', { replace: true }); }

	return (
		<div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
			<span className="sr-only" role="status">{workspace.name} selected</span>
			<a className="workspace-skip" href="#workspace-main">Skip to content</a>
			<button type="button" aria-label="Close navigation" className={`app-shell__scrim ${drawerOpen ? 'is-open' : ''}`} onClick={() => setDrawerOpen(false)}/>
			<Sidebar workspace={workspace} organizations={organizations} navigation={visibleNavigation} open={drawerOpen} collapsed={collapsed} onClose={() => setDrawerOpen(false)} onCollapse={toggleCollapsed} onLogout={handleLogout}/>
			<div className="app-shell__body">
				<Navbar
					firstName={firstName}
					role={user?.role}
					theme={theme}
					onMenu={() => setDrawerOpen(true)}
					onSearch={() => setSearchOpen(true)}
					onToggleTheme={toggleTheme}
					motionEnabled={motionEnabled}
					onToggleMotion={toggleMotion}
					stealthMode={stealthMode}
					onToggleStealth={() => setStealthMode((s) => !s)}
				/>
				<main className="app-content" id="workspace-main" tabIndex={-1}>
     {workspace.type === 'organization' && <div className="workspace-context"><Building2 size={17}/><strong>{workspace.name}</strong><span>Organization workspace</span><small>Demo workspace · Changes saved in this browser</small></div>}
     {missingOrganization ? <section><h1>Organization unavailable</h1><p>This organization is not in your workspace list.</p><Link to="/organizations">Choose an organization</Link></section> : ready ? <RouteContent key={workspace.id}/> : <LoadingState label="Switching workspace"/>}
    </main>
			</div>
			{stealthMode && (
				<div className="stealth-indicator-floating">
					<EyeOff size={14} style={{ color: '#41d9ff' }} />
					<span>Stealth Mode Active (Frosted Blur)</span>
					<button
						type="button"
						onClick={() => setStealthMode(false)}
						style={{ background: 'none', border: 0, color: '#38bdf8', cursor: 'pointer', padding: '0 4px', fontWeight: 700 }}
					>
						Exit [B]
					</button>
				</div>
			)}
			{searchOpen ? <CommandMenu navigation={visibleNavigation} onClose={() => setSearchOpen(false)}/> : null}
		</div>
	);
}
