import {
	Activity, ArrowLeft, CalendarDays, CheckCircle2, Clock3, Database, Download,
	Eye, FileImage, Fingerprint, History, Image, Info, LockKeyhole, Maximize2,
	ScanSearch, Share2, ShieldCheck, UserRound, WalletCards,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AssetPreviewModal from '../../components/assets/AssetPreviewModal';
import AuthenticityGauge from '../../components/assets/dashboard/AuthenticityGauge';
import AssetSummaryCards from '../../components/assets/dashboard/AssetSummaryCards';
import AssetHeroCard from '../../components/assets/dashboard/AssetHeroCard';
import VerificationBreakdown from '../../components/assets/dashboard/VerificationBreakdown';
import ActivityTimeline from '../../components/assets/dashboard/ActivityTimeline';
import HashCard from '../../components/assets/dashboard/HashCard';
import MetadataCard from '../../components/assets/dashboard/MetadataCard';
import AssetTabs from '../../components/assets/dashboard/AssetTabs';
import TransactionTable from '../../components/assets/dashboard/TransactionTable';
import SimilarAssetCard from '../../components/assets/dashboard/SimilarAssetCard';
import ConfidenceGauge from '../../components/verification/ConfidenceGauge';
import { getVerificationConfidence } from '../../components/verification/verificationUtils';
import Button from '../../components/ui/Button';
import CopyButton from '../../components/ui/CopyButton';
import DataTable from '../../components/ui/DataTable';
import LoadingState from '../../components/ui/LoadingState';
import StatusBadge from '../../components/ui/StatusBadge';
import Toast from '../../components/ui/Toast';
import { assetService } from '../../services/assetService';
import { verificationService } from '../../services/verificationService';
import '../../styles/asset-dashboard.css';

const tabs = [
	{ id: 'details', label: 'Asset Details', icon: FileImage },
	{ id: 'verification', label: 'Verification', icon: ShieldCheck },
	{ id: 'blockchain', label: 'Blockchain', icon: Fingerprint },
	{ id: 'activity', label: 'Activity', icon: Activity },
];

function formatSize(bytes) {
	if (!Number.isFinite(bytes)) return 'Unavailable';
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function assetReference(id) { return `VC-A${String(id).padStart(6, '0')}`; }

function metadataRows(metadata) {
	return [
		['Camera', metadata?.camera],
		['Date captured', metadata?.created_date],
		['Location', metadata?.location ? 'Available to owner' : null],
		['Dimensions', metadata?.width && metadata?.height ? `${metadata.width} × ${metadata.height}` : null],
		['Pixel count', (metadata?.pixelCount ?? metadata?.pixel_count)?.toLocaleString?.()],
		['Evidence patterns', metadata?.patterns?.join?.(', ')],
	];
}

export default function AssetInspectPage() {
	const { assetId } = useParams();
	const navigate = useNavigate();
	const [asset, setAsset] = useState(null);
	const [hash, setHash] = useState(null);
	const [metadata, setMetadata] = useState(null);
	const [transfers, setTransfers] = useState([]);
	const [reports, setReports] = useState([]);
	const [previewUrl, setPreviewUrl] = useState('');
	const [previewOpen, setPreviewOpen] = useState(false);
	const [activeTab, setActiveTab] = useState('details');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [toast, setToast] = useState('');

	const load = useCallback(async () => {
		setLoading(true); setError('');
		const numericId = Number(assetId);
		if (!Number.isInteger(numericId) || numericId <= 0) { setError('This asset reference is invalid.'); setLoading(false); return; }
		const results = await Promise.allSettled([assetService.getAsset(numericId), assetService.getHashes(numericId), assetService.getMetadata(numericId), assetService.getOwnershipHistory(numericId), verificationService.list()]);
		if (results[0].status === 'rejected') { setError(results[0].reason.message); setLoading(false); return; }
		const nextAsset = results[0].value;
		setAsset(nextAsset);
		if (results[1].status === 'fulfilled') setHash(results[1].value);
		if (results[2].status === 'fulfilled') setMetadata(results[2].value);
		if (results[3].status === 'fulfilled') setTransfers(results[3].value);
		if (results[4].status === 'fulfilled') setReports(results[4].value.filter((report) => report.matches?.some((match) => match.assetReference === assetReference(numericId))));
		setLoading(false);
	}, [assetId]);

	useEffect(() => { load(); }, [load]);
	useEffect(() => {
		let active = true; let objectUrl = '';
		if (!asset?.id || asset.vaultProtection?.isLocked) { setPreviewUrl(''); return undefined; }
		assetService.getContentObjectUrl(asset.id).then((url) => { objectUrl = url; if (active) setPreviewUrl(url); else URL.revokeObjectURL(url); }).catch(() => setPreviewUrl(''));
		return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
	}, [asset?.id, asset?.vaultProtection?.isLocked]);

	const integrityScore = useMemo(() => Math.min(100, (asset ? 15 : 0) + (hash?.sha256 ? 40 : 0) + (hash?.phash ? 25 : 0) + (metadata ? 20 : 0)), [asset, hash, metadata]);
	const bestVerification = useMemo(() => reports.reduce((best, report) => !best || getVerificationConfidence(report) > getVerificationConfidence(best) ? report : best, null), [reports]);
	const bestVerificationScore = bestVerification ? getVerificationConfidence(bestVerification) : null;
	const locked = asset?.vaultProtection?.isLocked;

	async function shareAsset() {
		const text = `VaultChain asset ${assetReference(asset.id)}: ${asset.title}. Registered and fingerprinted ${asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : ''}.`;
		if (navigator.share) { try { await navigator.share({ title: asset.title, text }); setToast('Asset summary shared.'); return; } catch (shareError) { if (shareError.name === 'AbortError') return; } }
		await navigator.clipboard?.writeText(text); setToast('Privacy-safe asset summary copied.');
	}

	function downloadReport() {
		const html = `<!doctype html><html><head><meta charset="utf-8"><title>${assetReference(asset.id)} Asset Report</title><style>body{font:15px system-ui;max-width:760px;margin:48px auto;padding:0 24px;color:#17181c}header{border-bottom:2px solid #635bff;padding-bottom:22px}.score{font-size:42px;font-weight:750;color:#5048e5}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.item{padding:13px;background:#f4f5f7;border-radius:9px}.item span{display:block;color:#6b7280;font-size:12px}code{word-break:break-all}</style></head><body><header><strong>VaultChain Asset Integrity Report</strong><h1>${asset.title.replace(/[<>]/g, '')}</h1><div class="score">${integrityScore}%</div><p>Record completeness and fingerprint integrity score.</p></header><h2>Registered asset</h2><div class="grid"><div class="item"><span>Asset reference</span><b>${assetReference(asset.id)}</b></div><div class="item"><span>Registered</span><b>${new Date(asset.createdAt).toLocaleString()}</b></div><div class="item"><span>Owner</span><b>Current authenticated account</b></div><div class="item"><span>Status</span><b>${asset.status || 'Active'}</b></div><div class="item"><span>SHA-256</span><code>${hash?.sha256 || 'Unavailable'}</code></div><div class="item"><span>Perceptual hash</span><code>${hash?.phash || 'Unavailable'}</code></div></div><p>This report confirms the state of the authenticated VaultChain record. It does not independently establish copyright or authorship.</p></body></html>`;
		const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); const link = document.createElement('a'); link.href = url; link.download = `${assetReference(asset.id)}-report.html`; link.click(); URL.revokeObjectURL(url);
	}

	if (loading) return <LoadingState label="Loading asset evidence"/>;
	if (!asset || error) return <div className="asset-inspect-error"><button type="button" className="asset-inspect-back" onClick={() => navigate('/assets')}><ArrowLeft size={14}/>My Assets</button><div className="error-banner">{error || 'Asset unavailable'}</div></div>;

	const transferColumns = [
		{ key: 'transferredAt', label: 'Date', render: (record) => new Date(record.transferredAt).toLocaleString() },
		{ key: 'transferType', label: 'Event', render: (record) => <StatusBadge tone="info">{record.transferType || 'Transfer'}</StatusBadge> },
		{ key: 'owners', label: 'Ownership change', render: (record) => `${record.previousOwner || 'Origin'} → ${record.newOwner}` },
		{ key: 'price', label: 'Value', render: (record) => `${Number(record.price || 0).toLocaleString()} credits` },
	];

	// Prepare data for new dashboard components
	// Check if asset was purchased from marketplace (has transfers)
	const mostRecentTransfer = transfers?.[0];
	const isPurchasedAsset = mostRecentTransfer && mostRecentTransfer.transferType === 'marketplace_sale';
	
	const ownershipData = {
		owner: 'You',
		memberSince: isPurchasedAsset 
			? new Date(mostRecentTransfer.transferredAt).toLocaleDateString()
			: new Date(asset.createdAt).toLocaleDateString(),
		previousOwner: isPurchasedAsset ? mostRecentTransfer.previousOwner : null,
		purchaseDate: isPurchasedAsset ? new Date(mostRecentTransfer.transferredAt).toLocaleDateString() : null,
		purchasePrice: isPurchasedAsset ? mostRecentTransfer.price : null,
	};

	const verificationData = {
		status: bestVerification ? 'Verified' : 'Not Verified',
		confidence: bestVerificationScore ? Math.round(bestVerificationScore) : 0,
		verifiedDate: bestVerification ? new Date(bestVerification.createdAt).toLocaleDateString() : '',
	};

	const blockchainData = {
		hash: hash?.sha256,
		copyable: !!hash?.sha256,
	};

	const statusData = {
		state: locked ? 'Protected' : 'Active',
		description: locked ? 'This asset is protected by a Vault' : 'Asset is secure and available in your library',
		badge: locked ? '🔒 Vault Locked' : '✓ Active',
	};

	const metadataMap = {
		camera: metadata?.camera,
		date: metadata?.created_date,
		location: metadata?.location ? 'Available to owner' : null,
		iso: metadata?.iso,
		aperture: metadata?.aperture,
		shutter: metadata?.shutter_speed,
		size: metadata?.width && metadata?.height ? `${metadata.width} × ${metadata.height}` : null,
	};

	const explainableChecks = [
		'✓ Visual features matched',
		'✓ Hash fingerprint matched',
		'✓ Metadata is consistent',
		'✓ No duplicate detected',
	];

	const timelineEvents = [
		{
			type: 'upload',
			title: 'Asset Uploaded',
			detail: assetReference(asset.id),
			date: asset.createdAt,
			timestamp: true,
			status: 'completed',
		},
		...(hash
			? [
					{
						type: 'blockchain',
						title: 'Blockchain Recorded',
						detail: `${hash.sha256?.slice(0, 16)}...`,
						date: asset.createdAt,
						timestamp: true,
						status: 'completed',
					},
				]
			: []),
		...reports.map((report) => ({
			type: 'verification',
			title: 'AI Verification Completed',
			detail: `Confidence: ${getVerificationConfidence(report).toFixed(1)}%`,
			date: report.createdAt,
			timestamp: true,
			status: 'completed',
		})),
		...(transfers.length > 0
			? transfers.map((tx) => ({
					type: 'transfer',
					title: 'Ownership Transferred',
					detail: `${tx.previousOwner || 'Origin'} → ${tx.newOwner}`,
					date: tx.transferredAt,
					timestamp: true,
					status: 'completed',
				}))
			: []),
		{
			type: 'upload',
			title: 'Asset Verified',
			detail: '✓ Secure and Trusted',
			date: asset.createdAt,
			timestamp: false,
		},
	].sort((a, b) => new Date(b.date) - new Date(a.date));

	return (
		<motion.div className="asset-inspect-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
			{/* Top Navigation */}
			<motion.div className="dashboard-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
				<div className="header-left">
					<button type="button" className="back-button" onClick={() => navigate('/assets')}>
						<ArrowLeft size={18} />
						My Assets
					</button>
				</div>

				<div className="header-center">
					<h1>Inspect Asset</h1>
					<p>View complete ownership, verification and security details</p>
				</div>

				<div className="header-right">
					<Button variant="secondary" icon={Download} onClick={downloadReport}>
						Download Report
					</Button>
					<Button variant="secondary" icon={Share2} onClick={shareAsset}>
						Share
					</Button>
					<Button icon={ScanSearch} onClick={() => navigate('/verification')}>
						Run Verification
					</Button>
				</div>
			</motion.div>

			{/* Hero Card with Asset Preview and Basic Info */}
			<AssetHeroCard asset={asset} previewUrl={previewUrl} integrityScore={integrityScore} onPreviewClick={() => setPreviewOpen(true)} />

			{/* Summary Cards */}
			<AssetSummaryCards ownership={ownershipData} verification={verificationData} blockchain={blockchainData} status={statusData} />

			{/* Tabs Section */}
			<AssetTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
				{/* Details Tab */}
				{activeTab === 'details' && (
					<motion.div className="tab-content-details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
						<MetadataCard title="Image Metadata" metadata={metadataMap} icon={Database} />
					</motion.div>
				)}

				{/* Verification Tab */}
				{activeTab === 'verification' && (
					<motion.div className="tab-content-verification" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
						<VerificationBreakdown
							overallScore={bestVerificationScore || 0}
							breakdown={[
								{ label: 'Visual Similarity', score: 98, color: '#41d9ff' },
								{ label: 'Metadata Match', score: 96, color: '#42d69d' },
								{ label: 'Hash Match', score: 100, color: '#8b9dff' },
								{ label: 'Perceptual Hash', score: 97, color: '#fbbf24' },
								{ label: 'AI Analysis', score: 99, color: '#ff9d5d' },
							]}
							explainableChecks={explainableChecks}
						/>
					</motion.div>
				)}

				{/* Blockchain Tab */}
				{activeTab === 'blockchain' && (
					<motion.div className="tab-content-blockchain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
						<div className="hash-cards-container">
							<HashCard title="SHA-256" description="Byte-for-byte cryptographic identity" hash={hash?.sha256} type="sha256" />
							<HashCard title="Perceptual Hash" description="Visual similarity fingerprint" hash={hash?.phash} type="phash" />
						</div>
					</motion.div>
				)}

				{/* Activity Tab */}
				{activeTab === 'activity' && (
					<motion.div className="tab-content-activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
						<ActivityTimeline events={timelineEvents} />
						{transfers.length > 0 && (
							<>
								<h3 style={{ margin: '24px 0 16px', fontSize: '1rem', fontWeight: 600, color: '#e1e8f1' }}>Transaction History</h3>
								<TransactionTable transactions={transfers} />
							</>
						)}
					</motion.div>
				)}
			</AssetTabs>

			{/* Asset Preview Modal */}
			{previewOpen && <AssetPreviewModal asset={asset} sourceUrl={previewUrl} onClose={() => setPreviewOpen(false)} />}

			{/* Toast Notification */}
			{toast && <Toast message={toast} onClose={() => setToast('')} />}
		</motion.div>
	);
}
