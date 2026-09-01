import { ArrowRight, CircleDollarSign, FileImage, Fingerprint, LockKeyhole, Plus, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import AssetInspector from '../../components/assets/AssetInspector';
import UploadAssetModal from '../../components/assets/UploadAssetModal';
import ActivityTimeline from '../../components/ui/ActivityTimeline';
import Button from '../../components/ui/Button';
import ChartCard from '../../components/ui/ChartCard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatCard from '../../components/ui/StatCard';
import VerificationTimeline from '../../components/verification/VerificationTimeline';
import { useAuth } from '../../context/AuthContext';
import { getDashboardSummary } from '../../services/dashboardService';

function greeting() {
	const hour = new Date().getHours();
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}

function buildActivityData(items = []) {
	const days = Array.from({ length: 7 }, (_, offset) => { const date = new Date(); date.setDate(date.getDate() - (6 - offset)); return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString(undefined, { weekday: 'short' }), assets: 0, verifications: 0 }; });
	items.forEach((item) => { const day = days.find((entry) => entry.key === new Date(item.createdAt).toISOString().slice(0, 10)); if (!day) return; if (item.type === 'asset_upload') day.assets += 1; if (item.type === 'verification') day.verifications += 1; });
	return days;
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [summary, setSummary] = useState(null);
	const [error, setError] = useState('');
	const [uploadOpen, setUploadOpen] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState(null);

	const loadSummary = useCallback(async () => { setError(''); try { setSummary(await getDashboardSummary()); } catch (loadError) { setError(loadError.message); } }, []);
	useEffect(() => { loadSummary(); }, [loadSummary]);

	const chartData = useMemo(() => buildActivityData(summary?.recentActivity), [summary]);
	const verificationCoverage = summary?.totalAssets ? Math.min(100, Math.round(((summary.totalVerificationReports || 0) / summary.totalAssets) * 100)) : 0;
	const stats = [
		{ label: 'Total assets', value: summary?.totalAssets ?? 0, helper: '+ Protected in your library', icon: FileImage, tone: 'blue', trend: '+18%' },
		{ label: 'Verification reports', value: summary?.totalVerificationReports ?? 0, helper: `${verificationCoverage}% verification coverage`, icon: Fingerprint, tone: 'violet', trend: 'Live' },
		{ label: 'Assets in vaults', value: summary?.totalOrganizedAssets ?? 0, helper: `Across ${summary?.totalVaults ?? 0} secure vaults`, icon: LockKeyhole, tone: 'green', trend: 'Secure' },
		{ label: 'Ownership value', value: `${(summary?.walletBalance ?? 0).toLocaleString()} cr`, helper: `${summary?.activeListings ?? 0} active listings`, icon: CircleDollarSign, tone: 'amber', trend: 'Available' },
	];
	const activities = (summary?.recentActivity || []).slice(0, 6);
	const firstName = user?.fullName?.split(' ')[0] || 'there';

	function openActivity(activity) {
		if (activity.type === 'asset_upload' && activity.assetId) return setSelectedAsset({ id: activity.assetId, title: activity.title });
		navigate(activity.type === 'verification' ? '/verification' : activity.type === 'document_upload' ? '/documents' : '/earnings');
	}

	return <>
		<PageHeader eyebrow="Control center" title={`${greeting()}, ${firstName}`} description="A clear view of your ownership, verification evidence, and asset performance." action={<Button icon={Plus} onClick={() => setUploadOpen(true)}>Upload asset</Button>}/>
		{error ? <div className="error-banner">{error}</div> : null}
		<div className="dashboard-stats">{stats.map((stat) => <StatCard key={stat.label} {...stat} pending={!summary && !error}/>)}</div>

		<section className="verification-journey-card">
			<header><div><span className="journey-kicker"><Sparkles size={13}/> How VaultChain builds trust</span><h2>From source image to verifiable ownership</h2><p>Every asset follows the same transparent evidence pipeline. Each result can be inspected, repeated, and compared.</p></div><Button variant="secondary" size="sm" onClick={() => navigate('/verification')}>Open Verification Center <ArrowRight size={15}/></Button></header>
			<VerificationTimeline compact/>
			<footer><ShieldCheck size={16}/><span><strong>Evidence, not a black box.</strong> Cryptographic fingerprints, visual similarity, and ownership records remain independently inspectable.</span></footer>
		</section>

		<div className="dashboard-main-grid">
			<ChartCard title="Asset activity" description="Uploads and verification events over the last 7 days" action={<div className="chart-legend"><span><i className="is-primary"/>Assets</span><span><i className="is-success"/>Verifications</span></div>}>
				<ResponsiveContainer width="100%" height={260}><AreaChart data={chartData} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity={.28}/><stop offset="1" stopColor="var(--primary)" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="var(--chart-grid)" vertical={false}/><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/><Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}/><Area type="monotone" dataKey="assets" stroke="var(--primary)" strokeWidth={2.4} fill="url(#assetGradient)"/><Area type="monotone" dataKey="verifications" stroke="var(--success)" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer>
			</ChartCard>
			<SectionCard title="Protection posture" description="Your active trust layers"><div className="protection-score"><div><strong>98</strong><span>/ 100</span></div><p>Excellent</p></div><div className="protection-list"><div><span><Fingerprint size={15}/></span><p><strong>Fingerprinting</strong><small>SHA-256 and perceptual hash</small></p><b>Active</b></div><div><span><ShieldCheck size={15}/></span><p><strong>Identity access</strong><small>Authenticated account protection</small></p><b>Active</b></div><div><span><LockKeyhole size={15}/></span><p><strong>Vault coverage</strong><small>{summary?.totalOrganizedAssets ?? 0} organized assets</small></p><b>{summary?.totalVaults ? 'Active' : 'Setup'}</b></div></div></SectionCard>
		</div>

		<div className="dashboard-lower-grid">
			<SectionCard title="Recent activity" description="Your latest ownership and verification events" action={<button type="button" className="text-button" onClick={() => navigate('/activity')}>View all <ArrowRight size={13}/></button>}>{!summary && !error ? <LoadingState label="Loading activity"/> : activities.length ? <ActivityTimeline compact items={activities} onSelect={openActivity}/> : <EmptyState icon={Fingerprint} title="No activity yet" description="Your verified asset journey will appear here."/>}</SectionCard>
			<SectionCard className="dashboard-upload-card"><div className="dashboard-upload-card__icon"><UploadCloud size={25}/></div><h2>Protect your next original</h2><p>Upload once. VaultChain extracts metadata, generates fingerprints, checks duplicates, and creates a reusable ownership record.</p><div className="dashboard-upload-card__chips"><span>SHA-256</span><span>pHash</span><span>EXIF</span><span>Duplicate scan</span></div><Button icon={UploadCloud} onClick={() => setUploadOpen(true)}>Choose an image</Button></SectionCard>
		</div>
		{selectedAsset ? <AssetInspector asset={selectedAsset} onClose={() => setSelectedAsset(null)}/> : null}
		<UploadAssetModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={() => { loadSummary(); setUploadOpen(false); }}/>
	</>;
}
