import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Navbar({ firstName, role, theme, onMenu, onSearch, onToggleTheme }) {
	return <header className="topbar">
		<button type="button" className="icon-button topbar__menu" aria-label="Open navigation" onClick={onMenu}><Menu size={19}/></button>
		<button type="button" className="topbar__search" onClick={onSearch}><Search size={16}/><span>Search workspace</span><kbd>⌘ K</kbd></button>
		<div className="topbar__actions"><span className="network-status"><i/> All systems operational</span><button type="button" className="icon-button theme-toggle" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button><button type="button" className="icon-button notification-button" aria-label="Notifications"><Bell size={17}/><i/></button><NavLink to="/profile" className="topbar__profile"><span>{firstName.charAt(0).toUpperCase()}</span><div><strong>{firstName}</strong><small>{role || 'Member'}</small></div></NavLink></div>
	</header>;
}
