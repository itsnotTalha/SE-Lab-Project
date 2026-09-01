import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import AdminNavbar from '../components/admin/AdminNavbar';
import AdminSidebar from '../components/admin/AdminSidebar';
import { normalizeRole } from '../components/admin/PermissionManager';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminShell() {
	const { user, logout } = useAuth();
	const { theme, toggleTheme } = useTheme();
	const location = useLocation();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(() => localStorage.getItem('vaultchain-admin-sidebar') === 'collapsed');
	function toggleCollapsed() { setCollapsed((value) => { localStorage.setItem('vaultchain-admin-sidebar', value ? 'expanded' : 'collapsed'); return !value; }); }
	async function handleLogout() { await logout(); navigate('/login', { replace: true }); }
	return <div className={`admin-shell ${collapsed ? 'is-sidebar-collapsed' : ''}`}>
		<button className={`admin-scrim ${open ? 'is-open' : ''}`} type="button" onClick={() => setOpen(false)} aria-label="Close menu"/>
		<AdminSidebar open={open} collapsed={collapsed} role={normalizeRole(user?.role)} onClose={() => setOpen(false)} onCollapse={toggleCollapsed} onLogout={handleLogout}/>
		<div className="admin-shell__main"><AdminNavbar user={user} theme={theme} onMenu={() => setOpen(true)} onToggleTheme={toggleTheme}/><main className="admin-content"><AnimatePresence mode="wait"><motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}><Outlet/></motion.div></AnimatePresence></main></div>
	</div>;
}

