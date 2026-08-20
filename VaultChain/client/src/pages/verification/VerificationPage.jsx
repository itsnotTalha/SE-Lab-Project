import { AlertCircle, Play, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import AssetPreviewModal from '../../components/assets/AssetPreviewModal';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import ComparisonUploader from '../../components/verification/ComparisonUploader';
import VerificationHistory from '../../components/verification/VerificationHistory';
import VerificationProgress from '../../components/verification/VerificationProgress';
import VerificationReport from '../../components/verification/VerificationReport';
import { verificationService } from '../../services/verificationService';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE = 20 * 1024 * 1024;

export default function VerificationPage() {
	const [history, setHistory] = useState([]);
	const [comparisonFile, setComparisonFile] = useState(null);
	const [comparisonPreviewUrl, setComparisonPreviewUrl] = useState('');
	const [comparisonDimensions, setComparisonDimensions] = useState(null);
	const [report, setReport] = useState(null);
	const [preview, setPreview] = useState(null);
	const [loadingHistory, setLoadingHistory] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState('');

	async function loadHistory() {
		setLoadingHistory(true);
		try { setHistory(await verificationService.list()); }
		catch (loadError) { setError(loadError.message); }
		finally { setLoadingHistory(false); }
	}

	useEffect(() => { loadHistory(); }, []);
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

	async function findMatches() {
		if (!comparisonFile) return;
		setProcessing(true); setError('');
		try {
			setReport(await verificationService.create(comparisonFile));
			setHistory(await verificationService.list());
		} catch (verificationError) { setError(verificationError.message); }
		finally { setProcessing(false); }
	}

	async function openHistory(reference) {
		setError('');
		try { setComparisonFile(null); setReport(await verificationService.get(reference)); }
		catch (historyError) { setError(historyError.message); }
	}

	return <><PageHeader eyebrow="Evidence workspace" title="Verification" description="Upload an image to find the closest registered matches in VaultChain."/>{error?<div className="error-banner verification-error" role="alert"><AlertCircle size={16}/>{error}<button type="button" onClick={()=>setError('')} aria-label="Dismiss error">×</button></div>:null}{report?<VerificationReport report={report} onPreviewAsset={(asset)=>setPreview({asset})} onVerifyAnother={()=>{setReport(null);setComparisonFile(null);}}/>:<><SectionCard className="global-verification-upload" title="Upload image" description="The image is fingerprinted temporarily and searched against all registered assets."><ComparisonUploader file={comparisonFile} previewUrl={comparisonPreviewUrl} dimensions={comparisonDimensions} onFile={chooseFile} onRemove={()=>setComparisonFile(null)} onPreview={()=>setPreview({asset:{title:comparisonFile.name,mimeType:comparisonFile.type,...comparisonDimensions},sourceUrl:comparisonPreviewUrl})}/></SectionCard>{processing?<VerificationProgress/>:<div className="verification-run"><Button icon={Play} onClick={findMatches} disabled={!comparisonFile}>Find Matches</Button><p>Exact SHA-256 matches rank first, followed by the closest 256-bit visual fingerprints.</p></div>}</>}<SectionCard className="verification-history" title="Verification history" description="Saved global match reports and the thresholds used for each search." action={<Button type="button" size="sm" variant="ghost" icon={RefreshCw} onClick={loadHistory}>Refresh</Button>}><VerificationHistory reports={history} loading={loadingHistory} onOpen={openHistory}/></SectionCard>{preview?<AssetPreviewModal asset={preview.asset} sourceUrl={preview.sourceUrl} onClose={()=>setPreview(null)}/>:null}</>;
}
