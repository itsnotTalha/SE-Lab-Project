import { CircleCheck, FileImage, FileText, Fingerprint, LockKeyhole, Plus, ShieldCheck, Store, UploadCloud, WalletCards } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import AssetInspector from '../../components/assets/AssetInspector';
import UploadAssetModal from '../../components/assets/UploadAssetModal';
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

function relativeTime(date) {
	if (!date) return 'Recently';
	const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
	if (minutes < 10080) return `${Math.round(minutes / 1440)}d ago`;
	return new Date(date).toLocaleDateString();
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const { user } = useAuth();
	const [summary, setSummary] = useState(null);
	const [summaryError, setSummaryError] = useState('');
	const [uploadOpen, setUploadOpen] = useState(false);
	const [selectedAsset, setSelectedAsset] = useState(null);

	const loadSummary = useCallback(async () => {
		setSummaryError('');
		try { setSummary(await getDashboardSummary()); }
		catch (error) { setSummaryError(error.message); }
	}, []);
	useEffect(() => { loadSummary(); }, [loadSummary]);

	function handleUploaded(response) {
		setSelectedAsset(response.asset);
		loadSummary();
	}

	function openActivity(activity) {
		if (activity.type === 'asset_upload' && activity.assetId) {
			setSelectedAsset({ id: activity.assetId, title: activity.title });
			return;
		}
		if (activity.type === 'document_upload') {
			navigate('/documents');
			return;
		}
		navigate(activity.type === 'verification' ? '/verification' : '/wallet');
	}

	const firstName = user?.fullName?.split(' ')[0] || 'there';
	const stats = [
		{ label: 'Total Assets', value: summary?.totalAssets ?? 0, helper: 'Stored in your collection', icon: FileImage, tone: 'blue' },
		{ label: 'Documents', value: summary?.totalDocuments ?? 0, helper: 'Stored private documents', icon: FileText, tone: 'blue' },
		{ label: 'Verifications', value: summary?.totalVerificationReports ?? 0, helper: 'Verification reports', icon: Fingerprint, tone: 'violet' },
		{ label: 'Vaults', value: summary?.totalVaults ?? 0, helper: `${summary?.totalOrganizedAssets ?? 0} organized assets`, icon: LockKeyhole, tone: 'green' },
		{ label: 'Active Listings', value: summary?.activeListings ?? 0, helper: 'Marketplace offers', icon: Store, tone: 'blue' },
		{ label: 'Wallet Balance', value: `${(summary?.walletBalance ?? 0).toLocaleString()} credits`, helper: 'Available account balance', icon: WalletCards, tone: 'amber' },
	];
	const recentAssets = summary?.recentAssets || [];
	const recentDocuments = summary?.recentDocuments || [];
	const recentActivity = summary?.recentActivity || [];

	return (
		<>
			<PageHeader eyebrow="Overview" title={`${greeting()}, ${firstName}`} description="Here’s what’s happening inside your VaultChain." action={<Button icon={Plus} onClick={() => setUploadOpen(true)}>Upload asset</Button>} />
			{summaryError ? <div className="error-banner">{summaryError}</div> : null}
			<div className="dashboard-stats dashboard-page-stats">{stats.map((stat) => <StatCard key={stat.label} {...stat} pending={!summary && !summaryError} />)}</div>
			<div className="dashboard-grid">
				<div className="dashboard-stack">
					<SectionCard title="Create a protected asset" description="Upload an image to generate its identity and inspect its embedded information.">
						<div className="quick-upload"><div className="quick-upload__content"><span className="quick-upload__icon"><UploadCloud size={23}/></span><h3>Fingerprint a digital image</h3><p>VaultChain generates SHA-256 and perceptual hashes, extracts available metadata, and checks for duplicate images.</p><Button icon={UploadCloud} onClick={() => setUploadOpen(true)}>Choose image</Button></div></div>
					</SectionCard>
					<SectionCard title="Recent assets" description="Your five newest owned assets." action={<Button size="sm" variant="ghost" onClick={() => navigate('/assets')}>View library</Button>}>
						{!summary && !summaryError ? <LoadingState label="Loading recent assets"/> : recentAssets.length === 0 ? <EmptyState icon={FileImage} title="Your recent uploads will appear here" description="Upload your first supported image to generate its digital fingerprint." action={<Button size="sm" icon={Plus} onClick={() => setUploadOpen(true)}>Upload asset</Button>} /> : <div className="activity-list">{recentAssets.map((asset)=><button type="button" className="activity-item" key={asset.id} onClick={() => setSelectedAsset(asset)}><span className="activity-item__icon"><FileImage size={16}/></span><div><strong>{asset.title}</strong><span>Asset #{asset.id} · {asset.category || asset.mimeType || 'Digital asset'}</span></div><time>{relativeTime(asset.createdAt)}</time></button>)}</div>}
					</SectionCard>
					<SectionCard title="Recent documents" description="Your five newest private documents." action={<Button size="sm" variant="ghost" onClick={() => navigate('/documents')}>View documents</Button>}>
						{!summary && !summaryError ? <LoadingState label="Loading recent documents"/> : recentDocuments.length === 0 ? <EmptyState icon={FileText} title="No documents yet" description="Uploaded PDF and image documents will appear here." action={<Button size="sm" onClick={() => navigate('/documents')}>Open documents</Button>}/> : <div className="activity-list">{recentDocuments.map((document) => <button type="button" className="activity-item" key={document.id} onClick={() => navigate('/documents')}><span className="activity-item__icon"><FileText size={16}/></span><div><strong>{document.originalName}</strong><span>{document.mimeType === 'application/pdf' ? 'PDF' : 'Image'} · OCR {document.ocrStatus}</span></div><time>{relativeTime(document.createdAt)}</time></button>)}</div>}
					</SectionCard>
				</div>
				<div className="dashboard-stack">
					<SectionCard title="Protection status" description="Systems currently active for supported image uploads."><div className="security-score"><div className="security-score__ring"><div><strong>Active</strong><span>Core protection</span></div></div></div><div className="security-list"><div><CircleCheck size={14}/> SHA-256 fingerprinting active</div><div><CircleCheck size={14}/> Perceptual matching active</div><div><CircleCheck size={14}/> Metadata inspection active</div><div><ShieldCheck size={14}/> JWT access protection active</div></div></SectionCard>
					<SectionCard title="Recent activity" description="Latest asset and document uploads, verifications, purchases, and sales.">
						{!summary && !summaryError ? <LoadingState label="Loading recent activity"/> : recentActivity.length === 0 ? <EmptyState icon={Fingerprint} title="No recent activity" description="Uploads, verification reports, purchases, and sales will appear here."/> : <div className="activity-list">{recentActivity.map((activity, index)=>{const Icon=activity.type==='asset_upload'?FileImage:activity.type==='verification'?Fingerprint:WalletCards;const detail=activity.type==='verification'?(activity.status||'completed').replaceAll('_',' '):activity.amount!=null?`${activity.type==='sale'?'+':'−'}${activity.amount.toLocaleString()} credits${activity.reference?` · ${activity.reference}`:''}`:activity.reference;return <button type="button" className="activity-item" key={`${activity.type}-${activity.reference||activity.assetId||index}`} onClick={()=>openActivity(activity)}><span className="activity-item__icon"><Icon size={16}/></span><div><strong>{activity.title}</strong><span>{detail || activity.type.replaceAll('_',' ')}</span></div><time>{relativeTime(activity.createdAt)}</time></button>;})}</div>}
						{!summary && !summaryError ? <LoadingState label="Loading recent activity"/> : recentActivity.length === 0 ? <EmptyState icon={Fingerprint} title="No recent activity" description="Uploads, verification reports, purchases, and sales will appear here."/> : <div className="activity-list">{recentActivity.map((activity, index)=>{const Icon=activity.type==='asset_upload'?FileImage:activity.type==='document_upload'?FileText:activity.type==='verification'?Fingerprint:WalletCards;const detail=activity.type==='verification'?(activity.status||'completed').replaceAll('_',' '):activity.type==='document_upload'?`OCR ${(activity.status||'pending').replaceAll('_',' ')}${activity.reference?` · ${activity.reference}`:''}`:activity.amount!=null?`${activity.type==='sale'?'+':'−'}${activity.amount.toLocaleString()} credits${activity.reference?` · ${activity.reference}`:''}`:activity.reference;return <button type="button" className="activity-item" key={`${activity.type}-${activity.reference||activity.assetId||index}`} onClick={()=>openActivity(activity)}><span className="activity-item__icon"><Icon size={16}/></span><div><strong>{activity.title}</strong><span>{detail || activity.type.replaceAll('_',' ')}</span></div><time>{relativeTime(activity.createdAt)}</time></button>;})}</div>}
					</SectionCard>
				</div>
			</div>
			{selectedAsset ? <AssetInspector asset={selectedAsset} onClose={() => setSelectedAsset(null)} /> : null}
			<UploadAssetModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />
		</>
	);
}
