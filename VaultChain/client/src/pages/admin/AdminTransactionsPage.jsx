import { BadgeCheck, CircleDollarSign, Clock3, Search, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { transactions } from '../../admin/adminData';
import AdminPageHeader, { downloadReport } from '../../components/admin/AdminPageHeader';
import StatCard from '../../components/admin/StatCard';
import TransactionTable from '../../components/admin/TransactionTable';
import { adminService } from '../../services/adminService';

export default function AdminTransactionsPage() {
	const [sourceRows, setSourceRows] = useState(transactions); const [query, setQuery] = useState(''); const [status, setStatus] = useState('All statuses');
	useEffect(() => { adminService.getTransactions().then((data) => { if (data.length) setSourceRows(data.map((row) => ({ id: row.transaction_id, asset: row.asset, seller: row.seller, buyer: row.buyer, amount: row.sale_amount, fee: row.platform_fee, date: new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }), status: row.status[0].toUpperCase() + row.status.slice(1) }))); }).catch(() => {}); }, []);
	const rows = useMemo(() => sourceRows.filter((row) => (status === 'All statuses' || row.status === status) && Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase())), [sourceRows, query, status]);
	return <><AdminPageHeader eyebrow="Finance" title="Transactions" description="Track every marketplace sale, commission, payout, and refund." exportName="vaultchain-transactions" onExport={() => downloadReport('vaultchain-transactions', rows)}/><div className="admin-stats-grid"><StatCard label="Gross volume" value="$2.49M" change="16.8%" detail="Across 8,920 transactions" icon={CircleDollarSign}/><StatCard label="Completed" value="8,742" change="9.7%" detail="98.0% success rate" icon={BadgeCheck} tone="green"/><StatCard label="Pending" value="132" detail="Payments processing" icon={Clock3} tone="amber"/><StatCard label="Refunded" value="46" change="-12.8%" detail="$5,000 total value" icon={Undo2} tone="red"/></div><section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transaction ID, asset, buyer, or seller"/></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Completed</option><option>Pending</option><option>Refunded</option></select></div><TransactionTable rows={rows}/></section></>;
}
