import {
	Activity, BarChart3, CircleDollarSign, FileText, Images, LayoutDashboard,
	LockKeyhole, PlusCircle, ScanSearch, Search, ShieldCheck, Store, WalletCards,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const navigation = [
	{ section: 'Workspace', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
	{ section: 'Workspace', label: 'My Assets', to: '/assets', icon: Images },
	{ section: 'Workspace', label: 'Upload', to: '/upload', icon: PlusCircle },
	{ section: 'Workspace', label: 'Verification Center', to: '/verification', icon: ScanSearch },
	{ section: 'Workspace', label: 'Vaults', to: '/vault', icon: LockKeyhole },
	{ section: 'Insights', label: 'Analytics', to: '/analytics', icon: BarChart3 },
	{ section: 'Insights', label: 'Earnings', to: '/earnings', icon: CircleDollarSign },
	{ section: 'Insights', label: 'Activity History', to: '/activity', icon: Activity },
	{ section: 'More', label: 'Documents', to: '/documents', icon: FileText },
	{ section: 'More', label: 'Marketplace', to: '/marketplace', icon: Store },
	{ section: 'More', label: 'Wallet', to: '/wallet', icon: WalletCards },
];

export default function AppShell() {
	const navigate = useNavigate();
	const location = useLocation();
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('vaultchain-sidebar') === 'collapsed');
	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState('');
	const firstName = user?.fullName?.split(' ')[0] || 'Member';
	const adminRoles = ['SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN'];
	const visibleNavigation = useMemo(() => adminRoles.includes(String(user?.role || '').toUpperCase()) ? [...navigation, { section: 'More', label: 'Admin Console', to: '/admin/dashboard', icon: ShieldCheck }] : navigation, [user?.role]);
	const results = useMemo(() => visibleNavigation.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [query, visibleNavigation]);

	useEffect(() => {
		function onKeyDown(event) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true); }
			if (event.key === 'Escape') setSearchOpen(false);
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

	return <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
		<button type="button" aria-label="Close navigation" className={`app-shell__scrim ${drawerOpen ? 'is-open' : ''}`} onClick={() => setDrawerOpen(false)}/>
		<Sidebar navigation={visibleNavigation} open={drawerOpen} collapsed={collapsed} onClose={() => setDrawerOpen(false)} onCollapse={toggleCollapsed} onLogout={handleLogout}/>
		<div className="app-shell__body">
			<Navbar firstName={firstName} role={user?.role} theme={theme} onMenu={() => setDrawerOpen(true)} onSearch={() => setSearchOpen(true)} onToggleTheme={toggleTheme}/>
			<main className="app-content"><AnimatePresence mode="wait"><motion.div className="page-transition" key={location.pathname} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: .18 }}><Outlet/></motion.div></AnimatePresence></main>
		</div>
		<AnimatePresence>{searchOpen ? <motion.div className="command-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><button className="command-menu__backdrop" onClick={() => setSearchOpen(false)} aria-label="Close search"/><motion.div className="command-menu__panel" initial={{ scale: .98, y: -8 }} animate={{ scale: 1, y: 0 }}><div className="command-menu__input"><Search size={18}/><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Where do you want to go?"/><kbd>esc</kbd></div><div className="command-menu__results">{results.map((item) => { const Icon = item.icon; return <button type="button" key={item.to} onClick={() => { navigate(item.to); setSearchOpen(false); setQuery(''); }}><span><Icon size={17}/></span><div><strong>{item.label}</strong><small>{item.section}</small></div></button>; })}</div></motion.div></motion.div> : null}</AnimatePresence>
	</div>;
}
