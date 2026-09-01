import { ChevronLeft, LogOut, Settings, UserRound, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import BrandLogo from '../ui/BrandLogo';

function SidebarLink({ item, collapsed, onNavigate }) {
	const Icon = item.icon;
	return <NavLink title={collapsed ? item.label : undefined} to={item.to} onClick={onNavigate} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}><Icon size={18}/><span>{item.label}</span></NavLink>;
}

export default function Sidebar({ navigation, open, collapsed, onClose, onCollapse, onLogout }) {
	return <aside className={`sidebar ${open ? 'is-open' : ''}`}>
		<div className="sidebar__brand"><BrandLogo/><button type="button" className="icon-button sidebar__close" aria-label="Close menu" onClick={onClose}><X size={18}/></button></div>
		<div className="sidebar__workspace"><span className="sidebar__workspace-icon">V</span><div><strong>Personal workspace</strong><span>VaultChain Cloud</span></div><span className="workspace-status"/></div>
		<nav className="sidebar__nav" aria-label="Application navigation">{['Workspace', 'Insights', 'More'].map((section) => <div className="sidebar__group" key={section}><span className="sidebar__label">{section}</span>{navigation.filter((item) => item.section === section).map((item) => <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onClose}/>)}</div>)}</nav>
		<div className="sidebar__bottom"><SidebarLink item={{ label: 'Profile', to: '/profile', icon: UserRound }} collapsed={collapsed}/><SidebarLink item={{ label: 'Settings', to: '/settings', icon: Settings }} collapsed={collapsed}/><button type="button" className="sidebar-link" onClick={onLogout} title={collapsed ? 'Log out' : undefined}><LogOut size={18}/><span>Log out</span></button></div>
		<button type="button" className="sidebar__collapse" onClick={onCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><ChevronLeft size={15}/></button>
	</aside>;
}
