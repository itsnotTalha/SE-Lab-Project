import { CircleCheck, FileImage, Fingerprint, LockKeyhole, Plus, ShieldCheck, UploadCloud, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import AssetInspector from '../../components/assets/AssetInspector';
import UploadAssetModal from '../../components/assets/UploadAssetModal';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../context/AuthContext';
import { assetService } from '../../services/assetService';
import { getDashboardSummary } from '../../services/dashboardService';

function greeting() {
	const hour = new Date().getHours();
	if (hour < 12) return 'Good morning';
	if (hour < 18) return 'Good afternoon';
	return 'Good evening';
}

function relativeTime(date) {
	if (!date) return 'Recently';
	const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	return `${Math.round(minutes / 60)}h ago`;
}

export default function DashboardPage() {
	const { user } = useAuth();
	const [summary, setSummary] = useState(null);
	const [summaryError, setSummaryError] = useState('');
	const [uploadOpen, setUploadOpen] = useState(false);
	const [recentAssets, setRecentAssets] = useState([]);
	const [selectedAsset, setSelectedAsset] = useState(null);

	const loadSummary = useCallback(async () => {
		setSummaryError('');
		try { setSummary(await getDashboardSummary()); }
		catch (error) { setSummaryError(error.message); }
	}, []);
	const loadRecentAssets = useCallback(async () => {
		try { setRecentAssets(await assetService.getAssets()); }
		catch { setRecentAssets([]); }
	}, []);

	useEffect(() => { loadSummary(); loadRecentAssets(); }, [loadSummary, loadRecentAssets]);

	function handleUploaded(response) {
		loadRecentAssets();
		setSelectedAsset(response.asset);
		loadSummary();
	}

	const firstName = user?.fullName?.split(' ')[0] || 'there';
	const stats = [
		{ label: 'Total Assets', value: summary?.totalAssets ?? 0, helper: 'Stored in your collection', icon: FileImage, tone: 'blue' },
		{ label: 'Verifications', value: summary?.totalVerificationReports ?? 0, helper: 'Verification reports', icon: Fingerprint, tone: 'violet' },
		{ label: 'Vaults', value: summary?.totalVaults ?? 0, helper: `${summary?.totalOrganizedAssets ?? 0} organized assets`, icon: LockKeyhole, tone: 'green' },
		{ label: 'Wallet Balance', value: `${(summary?.walletBalance ?? 0).toLocaleString()} credits`, helper: 'Available account balance', icon: WalletCards, tone: 'amber' },
	];

	return (
		<>
			<PageHeader eyebrow="Overview" title={`${greeting()}, ${firstName}`} description="Here’s what’s happening inside your VaultChain." action={<Button icon={Plus} onClick={() => setUploadOpen(true)}>Upload asset</Button>} />
			{summaryError ? <div className="error-banner">{summaryError}</div> : null}
			<div className="dashboard-stats">{stats.map((stat) => <StatCard key={stat.label} {...stat} pending={!summary && !summaryError} />)}</div>
			<div className="dashboard-grid">
				<div className="dashboard-stack">
					<SectionCard title="Create a protected asset" description="Upload an image to generate its identity and inspect its embedded information.">
						<div className="quick-upload"><div className="quick-upload__content"><span className="quick-upload__icon"><UploadCloud size={23}/></span><h3>Fingerprint a digital image</h3><p>VaultChain generates SHA-256 and perceptual hashes, extracts available metadata, and checks for duplicate images.</p><Button icon={UploadCloud} onClick={() => setUploadOpen(true)}>Choose image</Button></div></div>
					</SectionCard>
					<SectionCard title="Recent assets" description="Your newest uploaded assets, loaded securely from VaultChain.">
						{recentAssets.length === 0 ? <EmptyState icon={FileImage} title="Your recent uploads will appear here" description="Upload your first supported image to generate its digital fingerprint." action={<Button size="sm" icon={Plus} onClick={() => setUploadOpen(true)}>Upload asset</Button>} /> : <div className="activity-list">{recentAssets.slice(0,5).map((asset)=><button type="button" className="activity-item" key={asset.id} onClick={() => setSelectedAsset(asset)}><span className="activity-item__icon"><FileImage size={16}/></span><div><strong>{asset.title}</strong><span>Asset #{asset.id} · {asset.category}</span></div><time>{relativeTime(asset.createdAt)}</time></button>)}</div>}
					</SectionCard>
				</div>
				<div className="dashboard-stack">
					<SectionCard title="Protection status" description="Systems currently active for supported image uploads."><div className="security-score"><div className="security-score__ring"><div><strong>Active</strong><span>Core protection</span></div></div></div><div className="security-list"><div><CircleCheck size={14}/> SHA-256 fingerprinting active</div><div><CircleCheck size={14}/> Perceptual matching active</div><div><CircleCheck size={14}/> Metadata inspection active</div><div><ShieldCheck size={14}/> JWT access protection active</div></div></SectionCard>
					<SectionCard title="Workspace modules" description="Organization and evidence tools available in your account."><div className="security-list"><div><LockKeyhole size={14}/> Private Vault collections active</div><div><Fingerprint size={14}/> Verification reports active</div></div></SectionCard>
				</div>
			</div>
			{selectedAsset ? <AssetInspector asset={selectedAsset} onClose={() => setSelectedAsset(null)} /> : null}
			<UploadAssetModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />
		</>
	);
}
