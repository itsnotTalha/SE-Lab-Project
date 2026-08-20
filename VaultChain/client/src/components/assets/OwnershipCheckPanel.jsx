import { AlertCircle, ArrowRight, CalendarDays, CheckCircle2, Fingerprint, ImageUp, RefreshCw, ScanSearch, SearchCheck, UserRound } from 'lucide-react';
import { useRef, useState } from 'react';

import { assetService } from '../../services/assetService';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';
import SectionCard from '../ui/SectionCard';
import StatusBadge from '../ui/StatusBadge';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE = 20 * 1024 * 1024;

function HashResult({ label, value }) {
	return <div className="ownership-hash"><span>{label}</span><div><code>{value}</code><CopyButton value={value}/></div></div>;
}

function MatchDetails({ result, onViewAsset }) {
	const exact = result.matchType === 'exact';
	const similarityLabel = result.similarity === 'identical' ? 'Identical fingerprint' : result.similarity === 'strong' ? 'Strong' : 'Possible';
	return (
		<div className={`ownership-result ownership-result--${exact ? 'exact' : 'visual'}`}>
			<div className="ownership-result__heading"><span>{exact ? <CheckCircle2 size={22}/> : <ScanSearch size={22}/>}</span><div><StatusBadge tone={exact ? 'success' : 'warning'}>{exact ? 'Exact duplicate' : 'Perceptual match'}</StatusBadge><h3>{exact ? 'Matching asset found' : 'Potential visual match'}</h3><p>{exact ? 'The uploaded file has the same SHA-256 fingerprint as an existing VaultChain asset.' : 'This image is visually similar to an asset already registered in VaultChain, but the files are not byte-for-byte identical.'}</p></div></div>
			{!exact ? <div className="ownership-result__comparison"><div><span>Similarity</span><strong>{similarityLabel}</strong></div><div><span>Perceptual distance</span><strong>{result.distance} / {result.hashBits}</strong></div><div><span>SHA-256</span><strong>No exact match</strong></div></div> : null}
			<div className="ownership-result__details"><div><span><UserRound size={13}/> Registered owner</span><strong>{result.asset.owner.label}</strong></div><div><span><Fingerprint size={13}/> Asset reference</span><strong>{result.asset.reference}</strong></div><div><span><CalendarDays size={13}/> Registered</span><strong>{result.asset.registeredAt ? new Date(result.asset.registeredAt).toLocaleDateString() : 'Unavailable'}</strong></div></div>
			{!exact ? <p className="ownership-result__explanation">Perceptual hashing can detect similarity after resizing, recompression, or minor visual modification. The configured matching threshold is {result.threshold} bits.</p> : null}
			{result.asset.owner.isCurrentUser && result.asset.title ? <div className="ownership-result__owned"><span>Asset in your library</span><strong>{result.asset.title}</strong></div> : null}
			{result.asset.owner.isCurrentUser && result.asset.id ? <Button variant="secondary" icon={ArrowRight} onClick={() => onViewAsset(result.asset.id)}>View asset</Button> : null}
		</div>
	);
}

export default function OwnershipCheckPanel({ onAddToAssets, onViewAsset }) {
	const inputRef = useRef(null);
	const [file, setFile] = useState(null);
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [dragging, setDragging] = useState(false);

	function chooseFile(nextFile) {
		setError('');
		setResult(null);
		if (!nextFile) { setFile(null); return; }
		if (!ACCEPTED_TYPES.has(nextFile.type)) { setFile(null); setError('Choose a JPG, PNG, or WebP image.'); return; }
		if (nextFile.size > MAX_SIZE) { setFile(null); setError('Image size exceeds the 20 MB limit.'); return; }
		setFile(nextFile);
	}

	async function handleCheck(event) {
		event.preventDefault();
		if (!file) { setError('Choose an image to check.'); return; }
		setLoading(true); setError(''); setResult(null);
		try { setResult(await assetService.checkOwnership(file)); }
		catch (checkError) { setError(checkError.message); }
		finally { setLoading(false); }
	}

	function reset() {
		setFile(null); setResult(null); setError('');
		if (inputRef.current) inputRef.current.value = '';
	}

	return (
		<SectionCard className="ownership-check" title="Check image ownership" description="Upload an image to check whether it matches an asset already registered in VaultChain.">
			<div className={`ownership-check__layout ${result ? 'has-result' : ''}`}>
				<form className="ownership-check__form" onSubmit={handleCheck}>
					<button type="button" className={`ownership-dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files?.[0]); }}>
						<span><ImageUp size={24}/></span><strong>{file ? file.name : 'Drag and drop an image'}</strong><small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ready to check` : 'or choose a JPG, PNG, or WebP file · maximum 20 MB'}</small>
					</button>
					<input ref={inputRef} className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => chooseFile(event.target.files?.[0])}/>
					{error ? <div className="error-banner" role="alert"><AlertCircle size={16}/>{error}</div> : null}
					{loading ? <div className="ownership-processing" role="status"><span className="loading-state__spinner"/><div><strong>Analyzing image…</strong><p>Generating SHA-256 fingerprint · Comparing perceptual signature · Checking VaultChain records</p></div></div> : <div className="ownership-check__actions"><Button type="submit" icon={SearchCheck} disabled={!file}>Check image</Button>{file || result ? <Button type="button" variant="ghost" icon={RefreshCw} onClick={reset}>Clear</Button> : null}</div>}
				</form>

				{result ? <div className="ownership-check__result">{result.match ? <MatchDetails result={result} onViewAsset={onViewAsset}/> : <div className="ownership-result ownership-result--none"><div className="ownership-result__heading"><span><SearchCheck size={22}/></span><div><StatusBadge tone="info">No match</StatusBadge><h3>No matching asset found</h3><p>This image does not currently match an asset registered in VaultChain.</p></div></div><HashResult label="Generated SHA-256" value={result.checked.sha256}/><HashResult label="Perceptual fingerprint" value={result.checked.phash}/><Button icon={ImageUp} onClick={() => onAddToAssets(file)}>Add to my assets</Button></div>}</div> : null}
			</div>
		</SectionCard>
	);
}
