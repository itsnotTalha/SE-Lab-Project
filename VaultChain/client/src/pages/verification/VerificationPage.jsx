import { AlertCircle, Play, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import AssetPreviewModal from '../../components/assets/AssetPreviewModal';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import AssetSelector from '../../components/verification/AssetSelector';
import ComparisonUploader from '../../components/verification/ComparisonUploader';
import VerificationHistory from '../../components/verification/VerificationHistory';
import VerificationProgress from '../../components/verification/VerificationProgress';
import VerificationReport from '../../components/verification/VerificationReport';
import { assetService } from '../../services/assetService';
import { verificationService } from '../../services/verificationService';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE = 20 * 1024 * 1024;

export default function VerificationPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const [assets, setAssets] = useState([]);
	const [history, setHistory] = useState([]);
	const [selectedAsset, setSelectedAsset] = useState(null);
	const [comparisonFile, setComparisonFile] = useState(null);
	const [comparisonPreviewUrl, setComparisonPreviewUrl] = useState('');
	const [comparisonDimensions, setComparisonDimensions] = useState(null);
	const [report, setReport] = useState(null);
	const [preview, setPreview] = useState(null);
	const [loadingAssets, setLoadingAssets] = useState(true);
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState('');

	async function loadAssets() {
		setLoadingAssets(true);
		try { const nextAssets = await assetService.getAssets(); setAssets(nextAssets); setSelectedAsset((current) => { const requestedId = current?.id || location.state?.assetId; return nextAssets.find((asset) => asset.id === requestedId && !asset.vaultProtection?.isLocked) || null; }); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoadingAssets(false); }
	}

	async function loadHistory() {
		setLoadingHistory(true);
		try { setHistory(await verificationService.list()); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoadingHistory(false); }
	}

	useEffect(() => { loadAssets(); loadHistory(); }, []);
	useEffect(() => {
		const expirations = assets.map((asset) => asset.vaultProtection?.unlockExpiresAt).filter(Boolean).map((value) => new Date(value).getTime());
		if (!expirations.length) return undefined;
		const timeout = window.setTimeout(loadAssets, Math.max(0, Math.min(...expirations) - Date.now()) + 250);
		return () => window.clearTimeout(timeout);
	}, [assets]);
	useEffect(() => {
		if (!comparisonFile) { setComparisonPreviewUrl(''); setComparisonDimensions(null); return undefined; }
		const url = URL.createObjectURL(comparisonFile);
		setComparisonPreviewUrl(url);
		const image = new Image();
		image.onload = () => setComparisonDimensions({ width: image.naturalWidth, height: image.naturalHeight });
		image.src = url;
		return () => URL.revokeObjectURL(url);
	}, [comparisonFile]);

	function chooseFile(file) {
		setError('');
		if (!file) return;
		if (!ACCEPTED_TYPES.has(file.type)) { setError('Choose a JPG, PNG, or WebP image.'); return; }
		if (file.size > MAX_SIZE) { setError('Image size exceeds the 20 MB limit.'); return; }
		setComparisonFile(file);
		setReport(null);
	}

	async function runVerification() {
		if (!selectedAsset || !comparisonFile) return;
		setProcessing(true); setError('');
		try {
			const nextReport = await verificationService.create(selectedAsset.id, comparisonFile);
			setReport(nextReport);
			setHistory(await verificationService.list());
		} catch (verificationError) { setError(verificationError.message); }
		finally { setProcessing(false); }
	}

	async function openHistory(reference) {
		setError('');
		try { setComparisonFile(null); setReport(await verificationService.get(reference)); }
		catch (historyError) { setError(historyError.message); }
	}

	return <><PageHeader eyebrow="Evidence workspace" title="Verification" description="Compare an image against a registered VaultChain asset."/>{error ? <div className="error-banner verification-error" role="alert"><AlertCircle size={16}/>{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error">×</button></div> : null}{report ? <VerificationReport report={report} comparisonPreviewUrl={comparisonPreviewUrl} onPreviewAsset={(asset) => setPreview({ asset })} onPreviewComparison={() => setPreview({ asset: { ...report.comparison, title: report.comparison.fileName }, sourceUrl: comparisonPreviewUrl })} onVerifyAnother={() => { setReport(null); setComparisonFile(null); }} onViewAsset={() => navigate('/assets')}/> : <><div className="verification-workspace"><SectionCard title="1. Select registered asset" description="Choose one of your fingerprinted assets.">{loadingAssets ? <div className="verification-panel-loading">Loading your assets…</div> : <AssetSelector assets={assets} selected={selectedAsset} onSelect={setSelectedAsset} onPreview={(asset) => setPreview({ asset })}/>}</SectionCard><SectionCard title="2. Upload image to verify" description="The comparison image is processed temporarily and is not registered."><ComparisonUploader file={comparisonFile} previewUrl={comparisonPreviewUrl} dimensions={comparisonDimensions} onFile={chooseFile} onRemove={() => setComparisonFile(null)} onPreview={() => setPreview({ asset: { title: comparisonFile.name, mimeType: comparisonFile.type, ...comparisonDimensions }, sourceUrl: comparisonPreviewUrl })}/></SectionCard></div>{processing ? <VerificationProgress/> : <div className="verification-run"><Button icon={Play} onClick={runVerification} disabled={!selectedAsset || !comparisonFile}>Run verification</Button><p>Select a registered asset and comparison image to generate a saved evidence report.</p></div>}</>}<SectionCard className="verification-history" title="Verification history" description="Server-backed reports from your previous comparisons." action={<Button type="button" size="sm" variant="ghost" icon={RefreshCw} onClick={loadHistory}>Refresh</Button>}><VerificationHistory reports={history} loading={loadingHistory} onOpen={openHistory}/></SectionCard>{preview ? <AssetPreviewModal asset={preview.asset} sourceUrl={preview.sourceUrl} onClose={() => setPreview(null)}/> : null}</>;
}
