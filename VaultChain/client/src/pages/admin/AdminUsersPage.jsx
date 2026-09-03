import { Search, ShieldCheck, UserCheck, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatInteger, mapUser } from '../../admin/adminUtils';
import useAdminData from '../../admin/useAdminData';
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminDataState';
import AdminPageHeader, { downloadReport } from '../../components/admin/AdminPageHeader';
import StatCard from '../../components/admin/StatCard';
import UserTable from '../../components/admin/UserTable';
import { adminService } from '../../services/adminService';

export default function AdminUsersPage() {
	const { range, setRange, data, loading, error, reload } = useAdminData(adminService.getUsers); const [query, setQuery] = useState(''); const [status, setStatus] = useState('All users'); const [actionError, setActionError] = useState('');
	const users = useMemo(() => (data?.rows || []).map(mapUser), [data]); const rows = useMemo(() => users.filter((user) => (status === 'All users' || user.status === status) && `${user.name} ${user.email} ${user.id}`.toLowerCase().includes(query.toLowerCase())), [users, query, status]);
	async function update(id, changes) { setActionError(''); try { await adminService.updateUser(id, changes); await reload(); } catch (updateError) { setActionError(updateError.message); } }
	const header = <AdminPageHeader eyebrow="Management" title="Users" description="Accounts, roles, trust status, and marketplace contribution." range={range} onRangeChange={setRange} exportName={data ? 'vaultchain-users' : undefined} onExport={() => downloadReport('vaultchain-users', rows)}/>;
	if (error) return <>{header}<AdminError message={error} onRetry={reload}/></>; if (loading || !data) return <>{header}<AdminLoading/></>;
	const summary = data.summary;
	return <>{header}{actionError ? <div className="error-banner">{actionError}</div> : null}<div className="admin-stats-grid"><StatCard label="Total users" value={formatInteger(summary.total)} detail={`${formatInteger(summary.new_users)} joined in this period`} icon={UsersRound}/><StatCard label="Active users" value={formatInteger(summary.active)} detail={summary.total ? `${((summary.active / summary.total) * 100).toFixed(1)}% of accounts` : 'No accounts'} icon={UserCheck} tone="green"/><StatCard label="Admin accounts" value={formatInteger(summary.admins)} detail="Privileged roles" icon={ShieldCheck} tone="blue"/><StatCard label="Under review" value={formatInteger(summary.review)} detail="Requires moderation" icon={UsersRound} tone="amber"/></div><section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by user, email, or ID"/></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All users</option><option>Active</option><option>Review</option><option>Suspended</option></select></div>{rows.length ? <UserTable rows={rows} canManage onRoleChange={(id, role) => update(id, { role })} onStatusChange={(id, value) => update(id, { status: value.toLowerCase() })}/> : <AdminEmpty title="No matching users" description="Try another filter or search term."/>}</section></>;
}
