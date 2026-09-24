import { AlertTriangle, Clock3, FileCheck2, Images, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatInteger } from '../../admin/adminUtils';
import useAdminData from '../../admin/useAdminData';
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminDataState';
import AdminPageHeader, { downloadReport } from '../../components/admin/AdminPageHeader';
import AssetTable from '../../components/admin/AssetTable';
import StatCard from '../../components/admin/StatCard';
import { adminService } from '../../services/adminService';

function mapAsset(row) { const raw = String(row.asset_status || 'active').toLowerCase(); const status = raw === 'suspicious' ? 'Suspicious' : raw === 'review' ? 'Review' : raw === 'suspended' ? 'Suspended' : row.has_verification ? 'Verified' : 'Pending'; return { id: `AST-${String(row.id).padStart(6,'0')}`, databaseId: row.id, title: row.title, owner: row.owner, category: row.category, score: row.verification_score === null ? null : Number(row.verification_score), market: row.marketplace_status ? row.marketplace_status[0].toUpperCase()+row.marketplace_status.slice(1) : 'Unlisted', status, adminStatus: raw }; }

export default function AdminAssetsPage() {
	const { range, setRange, data, loading, error, reload } = useAdminData(adminService.getAssets); const [query, setQuery] = useState(''); const [status, setStatus] = useState('All assets'); const [actionError, setActionError] = useState('');
	const sourceRows = useMemo(() => (data?.rows || []).map(mapAsset), [data]); const rows = useMemo(() => sourceRows.filter((asset) => (status === 'All assets' || asset.status === status) && `${asset.title} ${asset.owner} ${asset.id}`.toLowerCase().includes(query.toLowerCase())), [sourceRows, query, status]);
	async function updateStatus(id, value) { const row = sourceRows.find((asset) => asset.id === id); if (!row) return; setActionError(''); try { await adminService.updateAsset(row.databaseId, value); await reload(); } catch (updateError) { setActionError(updateError.message); } }
	const header = <AdminPageHeader eyebrow="Trust & safety" title="Asset monitoring" description="Integrity, verification, and marketplace state from stored assets." range={range} onRangeChange={setRange} exportName={data ? 'vaultchain-assets' : undefined} onExport={() => downloadReport('vaultchain-assets', rows)}/>;
	if (error) return <>{header}<AdminError message={error} onRetry={reload}/></>; if (loading || !data) return <>{header}<AdminLoading/></>;
	const summary = data.summary;
	return <>{header}{actionError ? <div className="error-banner">{actionError}</div> : null}<div className="admin-stats-grid"><StatCard label="Assets created" value={formatInteger(summary.total)} detail="Within selected period" icon={Images}/><StatCard label="Verified assets" value={formatInteger(summary.verified)} detail={summary.total ? `${(summary.verified/summary.total*100).toFixed(1)}% coverage` : 'No assets'} icon={FileCheck2} tone="green" delay={.05}/><StatCard label="Flagged assets" value={formatInteger(summary.suspicious)} detail="Review or suspicious status" icon={AlertTriangle} tone="red" delay={.1}/><StatCard label="Pending verification" value={formatInteger(summary.pending)} detail="No verification report" icon={Clock3} tone="amber" delay={.15}/></div><section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search asset, owner, or reference"/></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All assets</option><option>Verified</option><option>Pending</option><option>Review</option><option>Suspicious</option><option>Suspended</option></select></div>{rows.length ? <AssetTable rows={rows} canManage onStatusChange={updateStatus}/> : <AdminEmpty title="No matching assets" description="Try another filter or date range."/>}</section></>;
}
