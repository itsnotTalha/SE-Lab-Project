import { AlertCircle, CheckCircle2, FileText, Fingerprint, LoaderCircle, LockKeyhole, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';
import '../../styles/document-upload.css';

const ACCEPTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const formatSize = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function UploadDocumentModal({ open, onClose, onUploaded }) {
	const dialogRef = useRef(null);
	const inputRef = useRef(null);
	const browseRef = useRef(null);
	const [file, setFile] = useState(null);
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [loading, setLoading] = useState(false);
	const [dragging, setDragging] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);

	useEffect(() => {
		if (!open) return;
		setFile(null); setName(''); setDescription(''); setError(''); setResult(null); setLoading(false); setDragging(false);
		const dialog = dialogRef.current;
		const previousFocus = document.activeElement;
		dialog.showModal();
		browseRef.current?.focus();
		return () => { dialog.close(); previousFocus?.focus(); };
	}, [open]);

	if (!open) return null;

	function selectFile(selected) {
		if (!selected || loading) return;
		setError('');
		if (!ACCEPTED_TYPES.has(selected.type)) { setError('Choose a PDF, PNG, JPG, or JPEG document.'); return; }
		if (selected.size > 20 * 1024 * 1024) { setError('This file is too large. Choose a document under 20 MB.'); return; }
		setFile(selected); setName(selected.name);
	}

	async function submit(event) {
		event.preventDefault();
		if (!file || loading) return;
		setError(''); setLoading(true);
		try {
			const document = await documentService.upload(file, { name: name.trim() || file.name, description });
			setResult(document);
			onUploaded(document);
		} catch (uploadError) { setError(uploadError.message); }
		finally { setLoading(false); }
	}

	const duplicate = /already.*library/i.test(error);
	return <dialog ref={dialogRef} className="document-upload" aria-labelledby="document-upload-title" aria-describedby="document-upload-description" onCancel={(event) => { event.preventDefault(); if (!loading) onClose(); }} onClick={(event) => { if (event.target === dialogRef.current && !loading) onClose(); }}>
		<div className="document-upload__panel">
			<header className="document-upload__header">
				<span className="document-upload__emblem"><UploadCloud size={23}/></span>
				<div><span className="document-upload__eyebrow">YOUR DOCUMENT LIBRARY</span><h2 id="document-upload-title">A home for your documents.</h2><p id="document-upload-description">Auto OCR tries local recognition first. Unclear images use online handwriting transcription when available.</p></div>
				<button type="button" className="document-upload__close" onClick={onClose} disabled={loading} aria-label="Close upload dialog"><X size={19}/></button>
			</header>
			{result ? <div className="document-upload__success" role="status">
				<span><CheckCircle2 size={34}/></span><h3>Your document is in.</h3><p><strong>{result.originalName}</strong></p><p>{result.ocrStatus === 'completed' ? 'Your original is saved and the extracted text is ready to explore.' : 'Your original is saved. Open Text in your library to review or retry extraction.'}</p>
				<details><summary>View document fingerprints</summary>{[['File', result.sha256], ['Metadata', result.metadataSha256], ['Text', result.textSha256]].map(([label, value]) => <div key={label}><small>{label} SHA-256</small><code>{value || 'Not available'}</code></div>)}</details>
				<Button onClick={onClose}>Back to my library</Button>
			</div> : <form className="document-upload__form" onSubmit={submit} aria-busy={loading}>
				<div className={`document-upload__drop ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); if (!loading) setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length > 1) setError('Please choose one document at a time.'); else selectFile(event.dataTransfer.files[0]); }}>
					{file ? <><span className="document-upload__file-icon"><FileText size={26}/></span><div className="document-upload__file-info"><strong title={file.name}>{file.name}</strong><span>{file.type === 'application/pdf' ? 'PDF document' : 'Image document'} <i/> {formatSize(file.size)}</span></div><button ref={browseRef} type="button" className="document-upload__change" onClick={() => inputRef.current?.click()} disabled={loading}>Change file</button></> : <button ref={browseRef} type="button" className="document-upload__browse" onClick={() => inputRef.current?.click()} disabled={loading}><span className="document-upload__file-icon"><UploadCloud size={27}/></span><strong>Drop your document here</strong><span>or <b>browse files</b> from your device</span><small>PDF, PNG, JPG · Up to 20 MB</small></button>}
				</div>
				<input ref={inputRef} className="sr-only" tabIndex={-1} aria-label="Choose document file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={loading} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ''; }}/>
				<div className="document-upload__field"><label htmlFor="document-upload-name">Document name</label><input id="document-upload-name" placeholder="Give your document a recognizable name" value={name} maxLength={180} onChange={(event) => setName(event.target.value)} disabled={loading}/></div>
				<div className="document-upload__field"><div className="document-upload__label"><label htmlFor="document-upload-notes">Description <span>Optional</span></label><small>{description.length}/1000</small></div><textarea id="document-upload-notes" placeholder="A little context, a reminder, or a note for later…" rows={3} value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} disabled={loading}/></div>
				{error ? <div className={`document-upload__notice ${duplicate ? 'is-duplicate' : ''}`} role="alert"><AlertCircle size={19}/><div><strong>{duplicate ? 'Already in your library' : 'Let’s try that again'}</strong><p>{duplicate ? 'This exact file has already been uploaded. Choose a different file, or close this window to find the original in your library.' : error}</p></div></div> : null}
				{loading ? <div className="document-upload__processing" role="status"><LoaderCircle size={18}/><span>Saving your document and extracting its text…</span></div> : <p className="document-upload__privacy"><LockKeyhole size={14}/><span>Private to your account.</span><Fingerprint size={14}/><span>Fingerprinted on upload.</span></p>}
				<footer className="document-upload__footer"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button type="submit" icon={UploadCloud} disabled={loading || !file}>{loading ? 'Processing document…' : 'Upload document'}</Button></footer>
			</form>}
		</div>
	</dialog>;
}
