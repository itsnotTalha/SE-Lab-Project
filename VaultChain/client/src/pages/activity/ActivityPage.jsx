import { Activity, FileImage, Filter, Fingerprint, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ActivityTimeline from '../../components/ui/ActivityTimeline';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatCard from '../../components/ui/StatCard';
import { getDashboardSummary } from '../../services/dashboardService';

export default function ActivityPage() {
	const navigate = useNavigate();
	const [summary, setSummary] = useState(null);
	const [query, setQuery] = useState('');
	const [type, setType] = useState('all');
	const [error, setError] = useState('');
	useEffect(() => { getDashboardSummary().then(setSummary).catch((loadError) => setError(loadError.message)); }, []);
	const activities = useMemo(() => (summary?.recentActivity || []).filter((item) => (type === 'all' || item.type === type) && (!query || `${item.title} ${item.reference} ${item.type}`.toLowerCase().includes(query.toLowerCase()))), [summary, query, type]);
	return <><PageHeader eyebrow="Audit trail" title="Activity history" description="A chronological record of uploads, verification checks, ownership events, and wallet movement."/>{error ? <div className="error-banner">{error}</div> : null}<div className="dashboard-stats activity-stats"><StatCard label="Recorded events" value={(summary?.recentActivity || []).length} helper="Latest authenticated actions" icon={Activity}/><StatCard label="Asset uploads" value={summary?.totalAssets || 0} helper="Registered source files" icon={FileImage} tone="violet"/><StatCard label="Verification reports" value={summary?.totalVerificationReports || 0} helper="Saved technical evidence" icon={Fingerprint} tone="green"/></div><SectionCard><div className="activity-toolbar"><label className="search-field"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search activity"/></label><label className="activity-filter"><Filter size={15}/><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All events</option><option value="asset_upload">Asset uploads</option><option value="document_upload">Documents</option><option value="verification">Verifications</option><option value="sale">Sales</option><option value="purchase">Purchases</option></select></label></div>{activities.length ? <ActivityTimeline items={activities} onSelect={(item) => navigate(item.type === 'verification' ? '/verification' : item.type === 'asset_upload' ? '/assets' : '/earnings')}/> : <EmptyState icon={Activity} title="No matching activity" description="Try another keyword or event type."/>}</SectionCard></>;
}
