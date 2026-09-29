import { preloadPage } from '../../utils/preloadPage';
import { ChevronLeft, LogOut, Settings, UserRound, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import BrandLogo from '../ui/BrandLogo';
import WorkspaceSwitcher from './WorkspaceSwitcher';

function SidebarLink({ item, collapsed, onNavigate }) {
 const Icon = item.icon;
 return <NavLink end title={collapsed ? item.label : undefined} aria-label={item.label} to={item.to}
  onMouseEnter={() => preloadPage(item.to)} onFocus={() => preloadPage(item.to)} onClick={onNavigate}
  className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
  <Icon size={18} aria-hidden="true"/><span>{item.label}</span>
 </NavLink>;
}

export default function Sidebar({ navigation, workspace, organizations, open, collapsed, onClose, onCollapse, onLogout }) {
 const sections = [...new Set(navigation.map((item) => item.section))];
 return <aside className={`sidebar ${open ? 'is-open' : ''}`}>
  <div className="sidebar__brand"><BrandLogo/><button type="button" className="icon-button sidebar__close" aria-label="Close menu" onClick={onClose}><X size={18}/></button></div>
  <WorkspaceSwitcher workspace={workspace} organizations={organizations} collapsed={collapsed} onNavigate={onClose}/>
  <nav className="sidebar__nav" aria-label={workspace.type === 'personal' ? 'Personal navigation' : 'Organization navigation'}>
   {sections.map((section) => <div className="sidebar__group" key={section}><span className="sidebar__label">{section}</span>{navigation.filter((item) => item.section === section).map((item) => <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onClose}/>)}</div>)}
  </nav>
  <div className="sidebar__bottom">
   <SidebarLink item={{ label: 'Profile', to: '/profile', icon: UserRound }} collapsed={collapsed} onNavigate={onClose}/>
   <SidebarLink item={{ label: 'Settings', to: '/settings', icon: Settings }} collapsed={collapsed} onNavigate={onClose}/>
   <button type="button" className="sidebar-link" onClick={onLogout} aria-label="Log out" title={collapsed ? 'Log out' : undefined}><LogOut size={18}/><span>Log out</span></button>
  </div>
  <button type="button" className="sidebar__collapse" onClick={onCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><ChevronLeft size={15}/></button>
 </aside>;
}
