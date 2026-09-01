import { Download, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { activityLogs } from '../../admin/adminData';
import AdminPageHeader, { downloadReport } from '../../components/admin/AdminPageHeader';
import { adminService } from '../../services/adminService';

export default function AdminLogsPage() {
	const [sourceRows, setSourceRows] = useState(activityLogs); const [query, setQuery] = useState('');
	useEffect(() => { adminService.getLogs().then((data) => { if (data.length) setSourceRows(data.map((row) => ({ admin: row.admin, initials: row.admin.split(' ').map((part) => part[0]).slice(0, 2).join(''), action: row.action.replaceAll('_', ' '), target: `${row.target_type || 'record'} ${row.target_id || ''}`, time: new Date(row.created_at).toLocaleString(), ip: row.ip_address || '—' }))); }).catch(() => {}); }, []);
	const rows = useMemo(() => sourceRows.filter((row) => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase())), [sourceRows, query]);
	return <><AdminPageHeader eyebrow="System" title="Admin activity logs" description="An immutable record of privileged actions across the control center." actions={<button className="admin-button is-secondary" type="button" onClick={() => downloadReport('vaultchain-admin-logs', rows)}><Download size={15}/> Export logs</button>}/><section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search admin, action, target, or IP address"/></label><select><option>All actions</option><option>User management</option><option>Verification</option><option>Finance</option><option>Settings</option></select></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Admin</th><th>Action</th><th>Target</th><th>Time</th><th>IP address</th><th>Result</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.time}-${row.action}`}><td><div className="admin-user-cell"><span>{row.initials}</span><strong>{row.admin}</strong></div></td><td><strong>{row.action}</strong></td><td><code>{row.target}</code></td><td>{row.time}</td><td><code>{row.ip}</code></td><td><span className="admin-status is-success">Success</span></td></tr>)}</tbody></table></div></section></>;
}
