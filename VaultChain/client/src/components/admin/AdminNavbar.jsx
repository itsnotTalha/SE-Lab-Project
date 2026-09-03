import { Bell, ChevronDown, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { formatDate } from '../../admin/adminUtils';
import { adminService } from '../../services/adminService';

export default function AdminNavbar({ user, theme, onMenu, onToggleTheme }) {
	const [notificationsOpen, setNotificationsOpen] = useState(false); const [notifications, setNotifications] = useState([]);
	useEffect(() => { adminService.getNotifications().then(setNotifications).catch(() => setNotifications([])); }, []);
	const initials = String(user?.fullName || '?').split(' ').map((part) => part[0]).slice(0,2).join(''); const unread = notifications.filter((item) => !item.is_read).length;
	async function toggleNotifications() { const opening = !notificationsOpen; setNotificationsOpen(opening); if (opening && unread) { setNotifications((items) => items.map((item) => ({ ...item, is_read:1 }))); await adminService.markNotificationsRead().catch(() => {}); } }
	return <header className="admin-navbar"><div className="admin-navbar__left"><button type="button" className="admin-icon-btn admin-mobile-menu" onClick={onMenu}><Menu size={19}/></button><span className="admin-navbar__context">Admin control center</span></div><div className="admin-navbar__right"><button type="button" className="admin-icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><div className="admin-notifications"><button type="button" className="admin-icon-btn" onClick={toggleNotifications} aria-label="Notifications"><Bell size={17}/>{unread ? <b>{unread}</b> : null}</button>{notificationsOpen ? <div className="admin-notification-popover"><header><strong>Notifications</strong><span>{unread ? `${unread} unread` : 'All read'}</span></header>{notifications.length ? notifications.map((item) => <article key={item.id}><i className={item.is_read ? '' : 'is-warning'}/><div><strong>{item.title}</strong><p>{item.message} · {formatDate(item.created_at)}</p></div></article>) : <div className="admin-notification-empty">No notifications</div>}</div> : null}</div><div className="admin-profile"><span>{initials}</span><div><strong>{user?.fullName}</strong><small>{String(user?.role || '').replaceAll('_',' ')}</small></div><ChevronDown size={14}/></div></div></header>;
}
