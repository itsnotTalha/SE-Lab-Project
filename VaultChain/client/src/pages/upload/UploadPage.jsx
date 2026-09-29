import { Check, FileText, Fingerprint, Image, Info, ScanSearch, ShieldCheck, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import UploadDocumentModal from '../../components/documents/UploadDocumentModal';
import '../../styles/upload-options.css';
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
	const [uploadType, setUploadType] = useState('image');
	const [documentOpen, setDocumentOpen] = useState(false);
	const [uploadedDocument, setUploadedDocument] = useState(null);
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
		<PageHeader eyebrow="Asset registration" title="Upload & protect" description="Upload an image to register an asset, or a document to store the original and extract searchable text."/>
		<div className="upload-type-options" role="group" aria-label="Upload type">
			<button type="button" aria-pressed={uploadType === 'image'} onClick={() => setUploadType('image')} disabled={stage >= 0 && stage < 5}><Image size={22}/><span><strong>Image asset</strong><small>Register images and create fingerprints</small></span></button>
			<button type="button" aria-pressed={uploadType === 'document'} onClick={() => setUploadType('document')} disabled={stage >= 0 && stage < 5}><FileText size={22}/><span><strong>Document</strong><small>Upload PDFs or scans and extract text</small></span></button>
		</div>
		{uploadType === 'document' ? <div className="upload-page-grid">
			<SectionCard title="Upload a document" description="Store a PDF or scanned document in your private document library.">
				<div className="upload-document-option"><FileText size={42} aria-hidden="true"/><h2>Keep the original. Make the text searchable.</h2><p>Choose a PDF, PNG, JPG, or JPEG document up to 20 MB. Add a name and description, then upload it for fingerprinting and text extraction.</p><Button icon={UploadCloud} onClick={() => { setUploadedDocument(null); setDocumentOpen(true); }}>Choose document</Button><Button variant="secondary" onClick={() => navigate('/documents')}>View document library</Button></div>
			</SectionCard>
			<SectionCard title="What happens next" description="Your document stays private to your account."><div className="upload-stages">{[
				{ label: 'Store your original', detail: 'Keep the uploaded PDF or image in your library.', icon: FileText },
				{ label: 'Generate fingerprints', detail: 'Create file and metadata hashes for comparison.', icon: Fingerprint },
				{ label: 'Extract searchable text', detail: 'Review extracted text and its processing status in Documents.', icon: ScanSearch },
			].map(({ label, detail, icon: Icon }) => <div key={label}><span><Icon size={16}/></span><p><strong>{label}</strong><small>{detail}</small></p></div>)}</div></SectionCard>
		</div> : <div className="upload-page-grid">
			<SectionCard title="Source asset" description="Your original file is fingerprinted exactly as provided.">
				<form className="upload-page-form" onSubmit={submit}><UploadBox file={file} onFile={chooseFile} onRemove={() => { setFile(null); setResult(null); setStage(-1); }}/>{file ? <div className="upload-file-preview"><img src={preview} alt="Selected asset preview"/><div><span>Original source</span><strong>{file.name}</strong><small>{file.type} · {(file.size / 1024 / 1024).toFixed(2)} MB</small></div></div> : null}<div className="form-row"><div className="field"><label htmlFor="upload-title">Asset title</label><input id="upload-title" className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Name this asset" required/></div><div className="field"><label htmlFor="upload-category">Category</label><select id="upload-category" className="select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="image">Image</option><option value="photography">Photography</option><option value="artwork">Artwork</option><option value="document-image">Document image</option></select></div></div><div className="field"><label htmlFor="upload-description">Description <span className="field-hint">Optional context strengthens provenance</span></label><textarea id="upload-description" className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the origin, creator, or purpose of this asset"/></div>{error ? <div className="error-banner">{error}</div> : null}<Button type="submit" icon={ShieldCheck} disabled={!file || (stage >= 0 && stage < 5)}>{stage >= 0 && stage < 5 ? 'Building evidence…' : 'Upload & create identity'}</Button></form>
			</SectionCard>
			<div className="upload-side-stack"><SectionCard title="What happens next" description="A transparent, repeatable pipeline"><div className="upload-stages">{stages.map((item, index) => { const Icon = item.icon; const complete = stage > index; const active = stage === index; return <div className={`${complete ? 'is-complete' : ''} ${active ? 'is-active' : ''}`} key={item.label}><span>{complete ? <Check size={15}/> : <Icon size={16}/>}</span><p><strong>{item.label}</strong><small>{complete ? 'Completed' : active ? 'Processing securely…' : 'Waiting'}</small></p>{active ? <i/> : null}</div>; })}</div></SectionCard><div className="trust-note"><Info size={17}/><div><strong>Your source stays yours.</strong><p>VaultChain stores the asset under your authenticated account and exposes technical evidence only through protected endpoints.</p></div></div>{result ? <SectionCard className="upload-result-card"><span><Check size={22}/></span><h2>Asset identity created</h2><p>Asset #{result.asset?.id} is now registered with hashes and metadata.</p><code>{result.hash?.sha256}</code><Button onClick={() => navigate('/assets')}>View in asset library</Button></SectionCard> : null}</div>
		</div>}
		<UploadDocumentModal open={documentOpen} onUploaded={setUploadedDocument} onClose={() => { setDocumentOpen(false); if (uploadedDocument) navigate('/documents'); }}/>
		<Toast message={result ? 'Asset uploaded and fingerprinted successfully.' : ''} onClose={() => {}}/>
	</>;
}
