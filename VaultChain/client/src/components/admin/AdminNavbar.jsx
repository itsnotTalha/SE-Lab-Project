import { Bell, Check, ChevronDown, Menu, Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';

export default function AdminNavbar({ user, theme, onMenu, onToggleTheme }) {
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const initials = (user?.fullName || 'Admin User').split(' ').map((part) => part[0]).slice(0, 2).join('');
	return <header className="admin-navbar">
		<div className="admin-navbar__left"><button type="button" className="admin-icon-btn admin-mobile-menu" onClick={onMenu}><Menu size={19}/></button><button type="button" className="admin-global-search"><Search size={16}/><span>Search users, assets, transactions...</span><kbd>⌘ K</kbd></button></div>
		<div className="admin-navbar__right"><span className="admin-live"><i/>Live</span><button type="button" className="admin-icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><div className="admin-notifications"><button type="button" className="admin-icon-btn" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Notifications"><Bell size={17}/><b>3</b></button>{notificationsOpen ? <div className="admin-notification-popover"><header><strong>Notifications</strong><span>3 new</span></header><article><i className="is-danger"/><div><strong>Suspicious login blocked</strong><p>New device in Frankfurt · 2m ago</p></div></article><article><i className="is-warning"/><div><strong>Verification queue growing</strong><p>18 assets await review · 8m ago</p></div></article><article><i className="is-success"><Check size={9}/></i><div><strong>Payout batch completed</strong><p>$18,420 sent successfully · 1h ago</p></div></article><button type="button">View notification center</button></div> : null}</div><div className="admin-profile"><span>{initials}</span><div><strong>{user?.fullName || 'Alex Morgan'}</strong><small>{String(user?.role || 'SUPER_ADMIN').replaceAll('_', ' ')}</small></div><ChevronDown size={14}/></div></div>
	</header>;
}

