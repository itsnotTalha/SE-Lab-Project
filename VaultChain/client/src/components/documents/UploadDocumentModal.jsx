import { AlertCircle, CheckCircle2, FileText, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';

const ACCEPTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export default function UploadDocumentModal({ open, onClose, onUploaded }) {
	const inputRef = useRef(null);
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);

	useEffect(() => {
		if (!open) return;
		setFile(null); setError(''); setResult(null); setLoading(false);
	}, [open]);

	if (!open) return null;

	async function submit(event) {
		event.preventDefault(); setError('');
		if (!file) { setError('Choose a PDF, PNG, JPG, or JPEG document.'); return; }
		if (!ACCEPTED_TYPES.has(file.type)) { setError('Only PDF, PNG, JPG, and JPEG documents are supported.'); return; }
		if (file.size > 20 * 1024 * 1024) { setError('Document size must not exceed 20 MB.'); return; }
		setLoading(true);
		try {
			const document = await documentService.upload(file);
			setResult(document);
			onUploaded(document);
		} catch (uploadError) { setError(uploadError.message); }
		finally { setLoading(false); }
	}

	return <div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-upload-title"><button className="modal__backdrop" aria-label="Close" onClick={loading?undefined:onClose}/><section className="modal__card"><header className="modal__header"><div><span className="modal__icon"><UploadCloud size={19}/></span><div><h2 id="document-upload-title">Upload document</h2><p>Store the file, fingerprint it, and extract available text.</p></div></div><button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="Close"><X size={18}/></button></header>{result?<div className="upload-success"><span><CheckCircle2 size={30}/></span><h3>Document stored</h3><p>{result.originalName} was uploaded and OCR status is <strong>{result.ocrStatus}</strong>.</p><div className="upload-success__hash"><small>SHA-256</small><code>{result.sha256}</code></div><Button onClick={onClose}>Done</Button></div>:<form className="form-grid modal__form" onSubmit={submit}><button type="button" className={`file-drop ${file?'has-file':''}`} onClick={()=>inputRef.current?.click()}><span className="file-drop__icon"><FileText size={24}/></span><strong>{file?file.name:'Choose a document'}</strong><span>{file?`${(file.size/1024/1024).toFixed(2)} MB selected`:'PDF, PNG, JPG or JPEG · maximum 20 MB'}</span></button><input ref={inputRef} className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event)=>setFile(event.target.files?.[0]||null)}/>{error?<div className="error-banner" role="alert"><AlertCircle size={16}/>{error}</div>:null}<footer className="modal__footer"><Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button type="submit" icon={UploadCloud} loading={loading} disabled={loading}>{loading?'Uploading & extracting…':'Upload document'}</Button></footer></form>}</section></div>;
}
