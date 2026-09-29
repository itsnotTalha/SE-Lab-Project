import { ArrowRight, FileText, Store, CircleDollarSign, FileImage, Fingerprint, LockKeyhole, Plus, ShieldCheck, Sparkles, UploadCloud } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardAnalytics from '../../components/dashboard/DashboardAnalytics';

import AssetInspector from '../../components/assets/AssetInspector';
import UploadAssetModal from '../../components/assets/UploadAssetModal';
import VaultChainWrappedModal from '../../components/dashboard/VaultChainWrappedModal';
import ActivityTimeline from '../../components/ui/ActivityTimeline';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { getDashboardSummary } from '../../services/dashboardService';

function greeting() {
	const hour = new Date().getHours();
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [summary, setSummary] = useState(null);
	const [error, setError] = useState('');
	const [uploadOpen, setUploadOpen] = useState(false);
	const [wrappedOpen, setWrappedOpen] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState(null);

	const loadSummary = useCallback(async () => {
		setError('');
		try {
			setSummary(await getDashboardSummary());
		} catch (loadError) {
			setError(loadError.message);
		}
	}, []);

	useEffect(() => { loadSummary(); }, [loadSummary]);

	const stats = [
		{ label: 'Total assets', value: summary?.totalAssets ?? 0, helper: 'Originals in your library', icon: FileImage, tone: 'blue', trend: 'Yours' },
		{ label: 'Verification reports', value: summary?.totalVerificationReports ?? 0, helper: 'Saved image and document checks', icon: Fingerprint, tone: 'violet', trend: 'Live' },
		{ label: 'Assets in vaults', value: summary?.totalOrganizedAssets ?? 0, helper: `Across ${summary?.totalVaults ?? 0} secure vaults`, icon: LockKeyhole, tone: 'green', trend: 'Secure' },
		{ label: 'Wallet balance', value: `${(summary?.walletBalance ?? 0).toLocaleString()} cr`, helper: `${summary?.activeListings ?? 0} active listings`, icon: CircleDollarSign, tone: 'amber', trend: 'Available' },
	];
	const activities = (summary?.recentActivity || []).slice(0, 6);
	const firstName = user?.fullName?.split(' ')[0] || 'there';

	function openActivity(activity) {
		if (activity.type === 'asset_upload' && activity.assetId) return setSelectedAsset({ id: activity.assetId, title: activity.title });
		navigate(activity.type === 'verification' ? '/verification' : activity.type === 'document_upload' ? '/documents' : '/earnings');
	}

	return (
		<>
			<PageHeader
				eyebrow="Control center"
				title={`${greeting()}, ${firstName}`}
				description="A clear view of your ownership, verification evidence, and asset performance."
				action={
					<div style={{ display: 'flex', gap: '8px' }}>
						<Button variant="secondary" icon={Sparkles} onClick={() => setWrappedOpen(true)}>
							2026 Wrapped
						</Button>
						<Button icon={Plus} onClick={() => setUploadOpen(true)}>
							Upload asset
						</Button>
					</div>
				}
			/>
			{error ? <div className="error-banner">{error}</div> : null}
			<section className="dashboard-compact-banner">
				<div>
					<strong>Your workspace at a glance</strong>
					<p>Track your collection, document processing and marketplace activity in one place.</p>
				</div>
				<Button variant="secondary" icon={UploadCloud} onClick={() => navigate('/upload')}>
					Upload image or document
				</Button>
			</section>
			<nav className="studio-shortcuts" aria-label="Quick actions">
				{[
					{ title: 'Add an original', hint: 'Start with an image', icon: UploadCloud, tone: 'violet', action: () => setUploadOpen(true) },
					{ title: 'Your documents', hint: 'Read, extract, compare', icon: FileText, tone: 'mint', action: () => navigate('/documents') },
					{ title: 'Check an asset', hint: 'Find the full picture', icon: Fingerprint, tone: 'peach', action: () => navigate('/verification') },
					{ title: 'Explore the market', hint: 'Find your next favourite', icon: Store, tone: 'blue', action: () => navigate('/marketplace') },
				].map(({ title, hint, icon: Icon, tone, action }) => (
					<button key={title} className={`studio-shortcut studio-shortcut--${tone}`} onClick={action}>
						<span className="studio-shortcut__icon"><Icon size={23}/></span>
						<span><strong>{title}</strong><small>{hint}</small></span>
						<ArrowRight size={17}/>
					</button>
				))}
			</nav>

			<div className="dashboard-stats">
				{stats.map((stat) => <StatCard key={stat.label} {...stat} pending={!summary && !error}/>)}
			</div>

			{summary ? <DashboardAnalytics summary={summary}/> : error ? <Button variant="secondary" onClick={loadSummary}>Retry dashboard</Button> : <LoadingState label="Loading workspace analytics"/>}

			<div className="dashboard-lower-grid">
				<SectionCard title="Recent activity" description="Your latest ownership and verification events" action={<button type="button" className="text-button" onClick={() => navigate('/activity')}>View all <ArrowRight size={13}/></button>}>
					{!summary && !error ? <LoadingState label="Loading activity"/> : activities.length ? <ActivityTimeline compact items={activities} onSelect={openActivity}/> : <EmptyState icon={Fingerprint} title="No activity yet" description="Your verified asset journey will appear here."/>}
				</SectionCard>
				<SectionCard className="dashboard-upload-card">
					<div className="dashboard-upload-card__icon"><UploadCloud size={25}/></div>
					<h2>Protect your next original</h2>
					<p>Upload once. VaultChain extracts metadata, generates fingerprints, checks duplicates, and creates a reusable ownership record.</p>
					<div className="dashboard-upload-card__chips"><span>SHA-256</span><span>pHash</span><span>EXIF</span><span>Duplicate scan</span></div>
					<Button icon={UploadCloud} onClick={() => setUploadOpen(true)}>Choose an image</Button>
				</SectionCard>
			</div>

			{selectedAsset ? <AssetInspector asset={selectedAsset} onClose={() => setSelectedAsset(null)}/> : null}
			<UploadAssetModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={() => { loadSummary(); setUploadOpen(false); }}/>
			<VaultChainWrappedModal open={wrappedOpen} onClose={() => setWrappedOpen(false)}/>
		</>
	);
}
