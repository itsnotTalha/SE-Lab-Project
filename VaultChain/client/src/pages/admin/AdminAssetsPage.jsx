import { AlertTriangle, Clock3, FileCheck2, Images, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { assets } from '../../admin/adminData';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AssetTable from '../../components/admin/AssetTable';
import StatCard from '../../components/admin/StatCard';

export default function AdminAssetsPage() {
	const [query, setQuery] = useState(''); const [status, setStatus] = useState('All assets');
	const rows = useMemo(() => assets.filter((asset) => (status === 'All assets' || asset.status === status) && `${asset.title} ${asset.owner} ${asset.id}`.toLowerCase().includes(query.toLowerCase())), [query, status]);
	return <><AdminPageHeader eyebrow="Trust & safety" title="Asset monitoring" description="Review the integrity, verification state, and market status of every asset." exportName="vaultchain-assets"/><div className="admin-stats-grid"><StatCard label="Total assets" value="185,420" change="8.2%" detail="12,418 added this month" icon={Images}/><StatCard label="Verified assets" value="172,890" change="4.8%" detail="93.2% of all assets" icon={FileCheck2} tone="green"/><StatCard label="Suspicious assets" value="245" change="-7.4%" detail="0.13% detection rate" icon={AlertTriangle} tone="red"/><StatCard label="Pending review" value="1,832" change="3.1%" detail="Median wait: 8 minutes" icon={Clock3} tone="amber"/></div><section className="admin-card"><div className="admin-table-toolbar"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search asset, owner, or reference"/></label><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All assets</option><option>Verified</option><option>Review</option><option>Suspicious</option></select></div><AssetTable rows={rows}/></section></>;
}

