import { Search, ShieldCheck, UserCheck, UserPlus, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { users as seedUsers } from '../../admin/adminData';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatCard from '../../components/admin/StatCard';
import UserTable from '../../components/admin/UserTable';
import { adminService } from '../../services/adminService';

export default function AdminUsersPage() {
	const [users, setUsers] = useState(seedUsers); const [query, setQuery] = useState(''); const [status, setStatus] = useState('All users');
	useEffect(() => { adminService.getUsers().then((data) => setUsers(data.map((user) => ({ id: String(user.id), name: user.full_name, email: user.email, role: user.role, assets: user.assets, transactions: user.transactions, revenue: user.revenue_generated, status: user.status === 'active' ? 'Active' : user.status === 'review' ? 'Review' : 'Suspended', initials: user.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('') })))).catch(() => {}); }, []);
	const rows = useMemo(() => users.filter((user) => (status === 'All users' || user.status === status) && `${user.name} ${user.email} ${user.id}`.toLowerCase().includes(query.toLowerCase())), [users, query, status]);
	function updateRole(id, role) { setUsers((current) => current.map((user) => user.id === id ? { ...user, role } : user)); adminService.updateUser(id, { role }).catch(() => {}); }
	return <><AdminPageHeader eyebrow="Management" title="Users" description="Manage accounts, access roles, trust status, and customer activity." exportName="vaultchain-users" actions={<button className="admin-button" type="button"><UserPlus size={15}/> Invite admin</button>}/><div className="admin-stats-grid"><StatCard label="Total users" value="24,532" change="12.5%" detail="2,412 joined this month" icon={UsersRound}/><StatCard label="Active users" value="18,924" change="9.1%" detail="77.1% active rate" icon={UserCheck} tone="green"/><StatCard label="Admin accounts" value="12" detail="Across 4 access roles" icon={ShieldCheck} tone="blue"/><StatCard label="Under review" value="38" change="-5.2%" detail="Requires moderation" icon={UsersRound} tone="amber"/></div><section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by user, email, or ID"/></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All users</option><option>Active</option><option>Review</option></select></div><UserTable rows={rows} canManage onRoleChange={updateRole}/></section></>;
}
