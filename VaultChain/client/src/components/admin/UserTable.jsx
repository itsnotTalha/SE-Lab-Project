import { MoreHorizontal } from 'lucide-react';

export default function UserTable({ rows, canManage = false, onRoleChange }) {
	return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Assets</th><th>Transactions</th><th>Revenue generated</th><th>Status</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="admin-user-cell"><span>{row.initials}</span><div><strong>{row.name}</strong><small>{row.email} · {row.id}</small></div></div></td><td>{canManage ? <select value={row.role} onChange={(event) => onRoleChange?.(row.id, event.target.value)}><option>USER</option><option>MODERATOR</option><option>FINANCE_ADMIN</option><option>VERIFICATION_ADMIN</option></select> : <span className="admin-role-pill">{row.role.replaceAll('_', ' ')}</span>}</td><td>{row.assets}</td><td>{row.transactions}</td><td className="admin-table__money">${row.revenue.toLocaleString()}</td><td><span className={`admin-status is-${row.status === 'Active' ? 'success' : 'warning'}`}>{row.status}</span></td><td><button type="button" className="admin-table__more"><MoreHorizontal size={16}/></button></td></tr>)}</tbody></table></div>;
}

