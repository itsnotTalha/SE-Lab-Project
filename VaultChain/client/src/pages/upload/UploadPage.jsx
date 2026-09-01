import { Check, Fingerprint, Image, Info, ScanSearch, ShieldCheck, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import SectionCard from '../../components/ui/SectionCard';
import Toast from '../../components/ui/Toast';
import UploadBox from '../../components/ui/UploadBox';
import { assetService } from '../../services/assetService';

const stages = [
	{ label: 'Uploading source', icon: UploadCloud },
	{ label: 'Extracting metadata', icon: Image },
	{ label: 'Generating fingerprints', icon: Fingerprint },
	{ label: 'Checking for duplicates', icon: ScanSearch },
	{ label: 'Creating ownership record', icon: ShieldCheck },
];

export default function UploadPage() {
	const navigate = useNavigate();
	const [file, setFile] = useState(null);
	const [preview, setPreview] = useState('');
	const [title, setTitle] = useState('');
	const [category, setCategory] = useState('image');
	const [description, setDescription] = useState('');
	const [stage, setStage] = useState(-1);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);
	useEffect(() => {
		if (!file) { setPreview(''); return undefined; }
		const url = URL.createObjectURL(file);
		setPreview(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	function chooseFile(next) {
		setError(''); setResult(null);
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) return setError('Choose a JPG, PNG, or WebP image.');
		if (next.size > 20 * 1024 * 1024) return setError('Image size exceeds the 20 MB limit.');
		setFile(next); setTitle(next.name.replace(/\.[^.]+$/, ''));
	}

	async function submit(event) {
		event.preventDefault();
		if (!file) return setError('Choose an image to continue.');
		setError(''); setResult(null); setStage(0);
		const timer = window.setInterval(() => setStage((current) => Math.min(3, current + 1)), 550);
		try { const response = await assetService.uploadAsset({ title, category, description, file }); window.clearInterval(timer); setStage(5); setResult(response); }
		catch (uploadError) { window.clearInterval(timer); setStage(-1); setError(uploadError.message); }
	}

	return <>
		<PageHeader eyebrow="Asset registration" title="Upload & protect" description="Turn an image into inspectable verification evidence and an ownership-ready asset record."/>
		<div className="upload-page-grid">
			<SectionCard title="Source asset" description="Your original file is fingerprinted exactly as provided.">
				<form className="upload-page-form" onSubmit={submit}><UploadBox file={file} onFile={chooseFile} onRemove={() => { setFile(null); setResult(null); setStage(-1); }}/>{file ? <div className="upload-file-preview"><img src={preview} alt="Selected asset preview"/><div><span>Original source</span><strong>{file.name}</strong><small>{file.type} · {(file.size / 1024 / 1024).toFixed(2)} MB</small></div></div> : null}<div className="form-row"><div className="field"><label htmlFor="upload-title">Asset title</label><input id="upload-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name this asset" required/></div><div className="field"><label htmlFor="upload-category">Category</label><select id="upload-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="image">Image</option><option value="photography">Photography</option><option value="artwork">Artwork</option><option value="document-image">Document image</option></select></div></div><div className="field"><label htmlFor="upload-description">Description <span className="field-hint">Optional context strengthens provenance</span></label><textarea id="upload-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the origin, creator, or purpose of this asset"/></div>{error ? <div className="error-banner">{error}</div> : null}<Button type="submit" icon={ShieldCheck} disabled={!file || (stage >= 0 && stage < 5)}>{stage >= 0 && stage < 5 ? 'Building evidence…' : 'Upload & create identity'}</Button></form>
			</SectionCard>
			<div className="upload-side-stack"><SectionCard title="What happens next" description="A transparent, repeatable pipeline"><div className="upload-stages">{stages.map((item, index) => { const Icon = item.icon; const complete = stage > index; const active = stage === index; return <div className={`${complete ? 'is-complete' : ''} ${active ? 'is-active' : ''}`} key={item.label}><span>{complete ? <Check size={15}/> : <Icon size={16}/>}</span><p><strong>{item.label}</strong><small>{complete ? 'Completed' : active ? 'Processing securely…' : 'Waiting'}</small></p>{active ? <i/> : null}</div>; })}</div></SectionCard><div className="trust-note"><Info size={17}/><div><strong>Your source stays yours.</strong><p>VaultChain stores the asset under your authenticated account and exposes technical evidence only through protected endpoints.</p></div></div>{result ? <SectionCard className="upload-result-card"><span><Check size={22}/></span><h2>Asset identity created</h2><p>Asset #{result.asset?.id} is now registered with hashes and metadata.</p><code>{result.hash?.sha256}</code><Button onClick={() => navigate('/assets')}>View in asset library</Button></SectionCard> : null}</div>
		</div>
		<Toast message={result ? 'Asset uploaded and fingerprinted successfully.' : ''} onClose={() => {}}/>
	</>;
}
