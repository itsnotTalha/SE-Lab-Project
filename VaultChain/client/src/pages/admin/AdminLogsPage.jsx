import { Download, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatDate } from '../../admin/adminUtils';
import useAdminData from '../../admin/useAdminData';
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminDataState';
import AdminPageHeader, { downloadReport } from '../../components/admin/AdminPageHeader';
import { adminService } from '../../services/adminService';

export default function AdminLogsPage() {
	const { data, loading, error, reload } = useAdminData(adminService.getLogs, { ranged:false }); const [query, setQuery] = useState('');
	const rows = useMemo(() => (data || []).map((row) => ({ ...row, initials: row.admin.split(' ').map((part) => part[0]).slice(0,2).join('') })).filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase())), [data, query]);
	const header = <AdminPageHeader eyebrow="System" title="Admin activity logs" description="Persisted privileged actions across the control center." showRange={false} actions={data ? <button className="admin-button is-secondary" type="button" onClick={() => downloadReport('vaultchain-admin-logs', rows)}><Download size={15}/> Export logs</button> : null}/>;
	if (error) return <>{header}<AdminError message={error} onRetry={reload}/></>; if (loading || !data) return <>{header}<AdminLoading/></>;
	return <>{header}<section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search admin, action, target, or IP address"/></label></div>{rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Time</th><th>IP address</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="admin-user-cell"><span>{row.initials}</span><strong>{row.admin}</strong></div></td><td><strong>{row.action.replaceAll('_',' ')}</strong></td><td><code>{row.target_type || 'system'} {row.target_id || ''}</code></td><td>{formatDate(row.created_at)}</td><td><code>{row.ip_address || 'Not recorded'}</code></td><td><span className="admin-status is-success">Recorded</span></td></tr>)}</tbody></table></div> : <AdminEmpty title="No admin activity recorded" description="Role, user, asset, listing, and commission changes will appear here."/>}</section></>;
}
