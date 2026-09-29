import { useLayoutEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { organizationService, PERSONAL_WORKSPACE } from '../services/organizationService';

// URL selection controls the viewed workspace, not backend authorization.
export function useWorkspace() {
 const { pathname } = useLocation();
 const [, refresh] = useState(0);
 const organizations = organizationService.getOrganizations();
 const match = matchPath('/organizations/:orgId/:section', pathname);
 const org = match ? organizations.find((item) => item.id === match.params.orgId) : null;
 const globalPage = ['/profile', '/settings'].includes(pathname);
 const workspace = org ? { id: org.id, name: org.name, type: 'organization' }
  : globalPage ? organizationService.getActiveWorkspace() : PERSONAL_WORKSPACE;
 const stored = organizationService.getActiveWorkspace();
 const ready = stored.id === workspace.id && stored.name === workspace.name;
 useLayoutEffect(() => {
  const update = () => refresh((value) => value + 1);
  const events = ['vaultchain:workspace_changed', 'vaultchain:organizations_changed', 'storage'];
  events.forEach((name) => window.addEventListener(name, update));
  return () => events.forEach((name) => window.removeEventListener(name, update));
 }, []);
 useLayoutEffect(() => {
  if (!ready) organizationService.setActiveWorkspace(workspace);
 }, [ready, workspace.id, workspace.name]);
 return { workspace, organizations, ready, missingOrganization: Boolean(match && !org) };
}
