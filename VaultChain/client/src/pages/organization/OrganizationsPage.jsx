import { ArrowRight, Building2, Plus, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import { organizationPath, organizationService } from '../../services/organizationService';
import '../../styles/organization-workspaces.css';

export default function OrganizationsPage() {
 const navigate = useNavigate();
 const [organizations, setOrganizations] = useState(() => organizationService.getOrganizations());
 const [creating, setCreating] = useState(false);
 const [name, setName] = useState('');
 const [error, setError] = useState('');
 useEffect(() => {
  const refresh = () => setOrganizations(organizationService.getOrganizations());
  window.addEventListener('vaultchain:organizations_changed', refresh);
  window.addEventListener('storage', refresh);
  return () => { window.removeEventListener('vaultchain:organizations_changed', refresh); window.removeEventListener('storage', refresh); };
 }, []);
 function create(event) {
  event.preventDefault();
  const trimmed = name.trim();
  if (!trimmed) { setError('Enter an organization name.'); return; }
  if (organizations.some((org) => org.name.toLowerCase() === trimmed.toLowerCase())) { setError('An organization with this name already exists.'); return; }
  try {
   const org = organizationService.createOrganization({ name: trimmed, jurisdiction: '', splitPercent: 80 });
   navigate(organizationPath(org.id));
  } catch { setError('Could not save the organization. Check browser storage and try again.'); }
 }
 return <div className="organization-directory">
  <PageHeader eyebrow="Workspaces" title="Organizations" description="Choose a shared workspace. Your personal assets and wallet stay in your personal workspace." action={<Button icon={Plus} onClick={() => setCreating(true)}>Create organization</Button>}/>
  <p className="organization-demo-note">Organization features currently use demo data saved in this browser. They are separate from your personal account’s assets and wallet.</p>
  {creating && <form className="organization-create" onSubmit={create}>
   <div className="organization-section-heading"><h2>Create an organization</h2><button type="button" className="icon-button" aria-label="Cancel organization creation" onClick={() => { setCreating(false); setError(''); }}><X size={18}/></button></div>
   <label htmlFor="organization-name">Organization name</label>
   <input autoFocus id="organization-name" className="input" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} placeholder="e.g. Northstar Studio" aria-invalid={Boolean(error)} aria-describedby={error ? 'organization-error' : undefined}/>
   {error && <p id="organization-error" role="alert">{error}</p>}
   <Button type="submit">Create workspace</Button>
  </form>}
  <div className="organization-section-heading"><h2>Your organizations</h2><span>{organizations.length} workspaces</span></div>
  <div className="organization-workspace-grid">{organizations.map((org) => <article className="organization-workspace-card" key={org.id}>
   <span className="organization-mark"><Building2 size={24}/></span><h3>{org.name}</h3>
   <p><Users size={15}/> {org.members?.length ?? 0} members <span>·</span> Demo workspace</p>
   <Link to={organizationPath(org.id)} aria-label={`Open ${org.name}`}>Open workspace <ArrowRight size={16}/></Link>
  </article>)}</div>
  {!organizations.length && <p>No organizations yet. Create one to start organizing your team’s work.</p>}
 </div>;
}
