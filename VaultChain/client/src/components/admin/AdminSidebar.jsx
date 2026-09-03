import { Activity, BadgeDollarSign, BarChart3, ChevronLeft, CircleDollarSign, FileSearch, LayoutDashboard, ListChecks, LogOut, Settings, ShieldCheck, Store, UsersRound, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import BrandLogo from '../ui/BrandLogo';
import { hasPermission } from './PermissionManager';

const navItems = [
	{ label: 'Overview', to: '/admin/dashboard', icon: LayoutDashboard, section: 'Control center' },
	{ label: 'Revenue', to: '/admin/revenue', icon: CircleDollarSign, section: 'Control center', permission: 'revenue.view' },
	{ label: 'Marketplace', to: '/admin/marketplace', icon: Store, section: 'Management' },
	{ label: 'Transactions', to: '/admin/transactions', icon: BadgeDollarSign, section: 'Management', permission: 'transactions.view' },
	{ label: 'Users', to: '/admin/users', icon: UsersRound, section: 'Management', roles: ['SUPER_ADMIN'] },
	{ label: 'Assets', to: '/admin/assets', icon: FileSearch, section: 'Trust & safety' },
	{ label: 'Verification', to: '/admin/verification', icon: ShieldCheck, section: 'Trust & safety' },
	{ label: 'Analytics', to: '/admin/analytics', icon: BarChart3, section: 'Intelligence' },
	{ label: 'Security', to: '/admin/security', icon: Activity, section: 'Intelligence' },
	{ label: 'Activity logs', to: '/admin/logs', icon: ListChecks, section: 'System', roles: ['SUPER_ADMIN'] },
	{ label: 'Settings', to: '/admin/settings', icon: Settings, section: 'System', roles: ['SUPER_ADMIN'] },
];

function allowed(item, role) {
	if (item.roles && !item.roles.includes(role)) return false;
	if (item.permission && !hasPermission(role, item.permission)) return false;
	return true;
}

export default function AdminSidebar({ open, collapsed, role, onClose, onCollapse, onLogout }) {
	const visible = navItems.filter((item) => allowed(item, role));
	return <aside className={`admin-sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
		<header><BrandLogo/><button type="button" className="admin-icon-btn admin-sidebar__close" onClick={onClose} aria-label="Close navigation"><X size={18}/></button></header>
		<div className="admin-workspace"><span>VC</span><div><strong>VaultChain Admin</strong><small>Protected workspace</small></div></div>
		<nav>{[...new Set(visible.map((item) => item.section))].map((section) => <div className="admin-nav-group" key={section}><p>{section}</p>{visible.filter((item) => item.section === section).map((item) => { const Icon = item.icon; return <NavLink end={item.to === '/admin/dashboard'} to={item.to} key={item.to} title={collapsed ? item.label : undefined} onClick={onClose} className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}><Icon size={17}/><span>{item.label}</span></NavLink>; })}</div>)}</nav>
		<footer><button type="button" className="admin-nav-link" onClick={onLogout}><LogOut size={17}/><span>Log out</span></button></footer>
		<button type="button" className="admin-sidebar__collapse" onClick={onCollapse} aria-label="Collapse sidebar"><ChevronLeft size={15}/></button>
	</aside>;
}
