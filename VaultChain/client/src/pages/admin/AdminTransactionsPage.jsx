import { BadgeCheck, CircleDollarSign, Clock3, Search, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatInteger, formatMoney, formatPercent, mapTransaction } from '../../admin/adminUtils';
import useAdminData from '../../admin/useAdminData';
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminDataState';
import AdminPageHeader, { downloadReport } from '../../components/admin/AdminPageHeader';
import StatCard from '../../components/admin/StatCard';
import TransactionTable from '../../components/admin/TransactionTable';
import { adminService } from '../../services/adminService';

export default function AdminTransactionsPage() {
	const { range, setRange, data, loading, error, reload } = useAdminData(adminService.getTransactions); const [query, setQuery] = useState(''); const [status, setStatus] = useState('All statuses');
	const sourceRows = useMemo(() => (data?.rows || []).map(mapTransaction), [data]); const rows = useMemo(() => sourceRows.filter((row) => (status === 'All statuses' || row.status === status) && Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase())), [sourceRows, query, status]);
	const header = <AdminPageHeader eyebrow="Finance" title="Transactions" description="Every marketplace settlement recorded by VaultChain." range={range} onRangeChange={setRange} exportName={data ? 'vaultchain-transactions' : undefined} onExport={() => downloadReport('vaultchain-transactions', rows)}/>;
	if (error) return <>{header}<AdminError message={error} onRetry={reload}/></>; if (loading || !data) return <>{header}<AdminLoading/></>;
	const summary = data.summary;
	return <>{header}<div className="admin-stats-grid"><StatCard label="Gross volume" value={formatMoney(summary.gross_volume)} detail={`Across ${formatInteger(summary.total)} transactions`} icon={CircleDollarSign}/><StatCard label="Completed" value={formatInteger(summary.completed)} detail={`${formatPercent(summary.successRate)} success rate`} icon={BadgeCheck} tone="green" delay={.05}/><StatCard label="Pending" value={formatInteger(summary.pending)} detail="Payments processing" icon={Clock3} tone="amber" delay={.1}/><StatCard label="Refunded" value={formatInteger(summary.refunded)} detail={`${formatMoney(summary.refunded_value)} total value`} icon={Undo2} tone="red" delay={.15}/></div><section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transaction ID, asset, buyer, or seller"/></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option><option>Completed</option><option>Pending</option><option>Refunded</option><option>Failed</option></select></div>{rows.length ? <TransactionTable rows={rows}/> : <AdminEmpty title="No matching transactions" description="Try another filter or date range."/>}</section></>;
}
