import { Building2, Check, ChevronsUpDown, Search, Settings2, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { organizationPath } from '../../services/organizationService';
import '../../styles/workspace-switcher.css';

export default function WorkspaceSwitcher({ workspace, organizations, collapsed, onNavigate }) {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const root = useRef(null);
 const trigger = useRef(null);
 const search = useRef(null);
 const navigate = useNavigate();
 const personal = workspace.type === 'personal';
 const Icon = personal ? UserRound : Building2;
 const filtered = organizations.filter((org) => org.name.toLowerCase().includes(query.trim().toLowerCase()));

 useEffect(() => {
  if (!open) return;
  search.current?.focus();
  function outside(event) { if (!root.current?.contains(event.target)) setOpen(false); }
  document.addEventListener('pointerdown', outside);
  return () => document.removeEventListener('pointerdown', outside);
 }, [open]);

 function close() { setOpen(false); trigger.current?.focus(); }
 function go(path) { close(); navigate(path); onNavigate?.(); }
 function onKeyDown(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
  if (!open || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const items = [...root.current.querySelectorAll('.ws-popover input, .ws-popover button')];
  const index = items.indexOf(document.activeElement);
  items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
 }

 return <div className="ws-switcher" ref={root} onKeyDown={onKeyDown} onBlur={(event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
 }}>
  <button ref={trigger} className="ws-trigger" type="button" aria-expanded={open} aria-controls="workspace-picker"
   aria-label={`Switch workspace. Current: ${workspace.name}`} title={collapsed ? workspace.name : undefined}
   onClick={() => { setQuery(''); setOpen(!open); }}>
   <span className={`ws-avatar ${personal ? '' : 'ws-avatar--organization'}`}><Icon size={19} aria-hidden="true"/></span>
   <span className="ws-trigger-copy"><strong>{workspace.name}</strong><small>{personal ? 'Your private workspace' : 'Organization workspace'}</small></span>
   <ChevronsUpDown className="ws-chevron" size={16} aria-hidden="true"/>
  </button>
  {open && <section id="workspace-picker" className="ws-popover" aria-label="Choose a workspace">
   <div className="ws-popover-heading">Switch workspace</div>
   <label className="ws-search"><Search size={16} aria-hidden="true"/><input ref={search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find an organization…" aria-label="Find an organization"/></label>
   <button type="button" className={`ws-option ${personal ? 'is-selected' : ''}`} aria-pressed={personal} onClick={() => go('/dashboard')}>
    <span className="ws-avatar"><UserRound size={18}/></span><span><strong>Personal workspace</strong><small>Only your assets and activity</small></span>{personal && <Check size={17} aria-hidden="true"/>}
   </button>
   <p className="ws-group-label">Organizations <span>{organizations.length}</span></p>
   <div className="ws-options">{filtered.map((org) => <button type="button" key={org.id} className={`ws-option ${workspace.id === org.id ? 'is-selected' : ''}`} aria-pressed={workspace.id === org.id} onClick={() => go(organizationPath(org.id))}>
    <span className="ws-avatar ws-avatar--organization"><Building2 size={18}/></span><span><strong>{org.name}</strong><small>{org.members?.length ?? 0} members</small></span>{workspace.id === org.id && <Check size={17} aria-hidden="true"/>}
   </button>)}{!filtered.length && <p className="ws-empty" role="status">{query ? 'No organizations match your search.' : 'No organizations yet.'}</p>}</div>
   <button type="button" className="ws-manage" onClick={() => go('/organizations')}><Settings2 size={16}/> Manage organizations</button>
  </section>}
 </div>;
}
