import { AlertCircle, AlertTriangle, CheckCircle2, Copy, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';

const ACCEPTED_TYPES = new Set(['application/pdf']);

export default function UploadDocumentModal({ open, onClose, onUploaded }) {
	const inputRef = useRef(null);
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [processingStep, setProcessingStep] = useState('');
	const [error, setError] = useState('');
	const [duplicateInfo, setDuplicateInfo] = useState(null);
	const [result, setResult] = useState(null);

	useEffect(() => {
		if (!open) return;
		setFile(null);
		setError('');
		setDuplicateInfo(null);
		setResult(null);
		setLoading(false);
		setProcessingStep('');
	}, [open]);

	if (!open) return null;

	async function submit(event) {
		event.preventDefault();
		setError('');
		setDuplicateInfo(null);

		if (!file) {
			setError('Choose a PDF document.');
			return;
		}
		if (!ACCEPTED_TYPES.has(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
			setError('Only PDF documents are supported.');
			return;
		}
		if (file.size > 20 * 1024 * 1024) {
			setError('Document size must not exceed 20 MB.');
			return;
		}

		setLoading(true);
		setProcessingStep('Calculating SHA-256 & running Gemini OCR...');

		try {
			const document = await documentService.upload(file);
			setResult(document);
			onUploaded(document);
		} catch (uploadError) {
			if (uploadError.duplicate) {
				setDuplicateInfo(uploadError.duplicate);
			} else {
				setError(uploadError.message);
			}
		} finally {
			setLoading(false);
			setProcessingStep('');
		}
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
			<button className="modal__backdrop" aria-label="Close" onClick={loading ? undefined : onClose} />
			<section className="modal__card">
				<header className="modal__header">
					<div>
						<span className="modal__icon"><UploadCloud size={19} /></span>
						<div>
							<h2 id="document-upload-title">Upload PDF Document</h2>
							<p>Fingerprint with SHA-256, extract text with Gemini OCR, and check duplicates.</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				{duplicateInfo ? (
					<div className="upload-duplicate-panel" style={{ padding: '1.5rem', textAlign: 'left', background: 'var(--surface-color, #1a1e29)', borderRadius: '8px', border: '1px solid #eab308' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#eab308', marginBottom: '1rem' }}>
							<AlertTriangle size={28} />
							<div>
								<h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Duplicate Document Detected</h3>
								<p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
									{duplicateInfo.duplicateType === 'exact'
										? 'Exact file match: This identical PDF file is already stored in the system.'
										: 'Content duplicate: Different file metadata, but extracted text is 100% identical.'}
								</p>
							</div>
						</div>

						<div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.9rem', borderRadius: '6px', fontSize: '0.875rem', lineHeight: '1.6' }}>
							<div><strong>Exact File SHA-256 Match:</strong> <span style={{ color: duplicateInfo.exactMatch ? '#22c55e' : '#94a3b8' }}>{duplicateInfo.exactMatch ? 'YES' : 'NO'}</span></div>
							<div><strong>Text Content Match:</strong> <span style={{ color: duplicateInfo.textContentMatch ? '#22c55e' : '#94a3b8' }}>{duplicateInfo.textContentMatch ? 'YES' : 'NO'}</span></div>
							{duplicateInfo.existingDocument ? (
								<div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
									<div><strong>Existing Document:</strong> {duplicateInfo.existingDocument.originalName} ({duplicateInfo.existingDocument.reference})</div>
									{duplicateInfo.existingDocument.createdAt ? (
										<div><strong>Uploaded:</strong> {new Date(duplicateInfo.existingDocument.createdAt).toLocaleString()}</div>
									) : null}
								</div>
							) : null}
							{duplicateInfo.sha256 ? (
								<div style={{ marginTop: '0.4rem', wordBreak: 'break-all', fontSize: '0.75rem', color: '#94a3b8' }}>
									<code>File SHA-256: {duplicateInfo.sha256}</code>
								</div>
							) : null}
							{duplicateInfo.textSha256 ? (
								<div style={{ marginTop: '0.2rem', wordBreak: 'break-all', fontSize: '0.75rem', color: '#94a3b8' }}>
									<code>Text SHA-256: {duplicateInfo.textSha256}</code>
								</div>
							) : null}
						</div>

						<div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
							<Button variant="secondary" onClick={() => { setDuplicateInfo(null); setFile(null); }}>
								Choose Another File
							</Button>
							<Button onClick={onClose}>Close</Button>
						</div>
					</div>
				) : result ? (
					<div className="upload-success">
						<span><CheckCircle2 size={30} /></span>
						<h3>Document Stored Successfully</h3>
						<p>{result.originalName} has been verified and registered.</p>
						<div className="upload-success__hash">
							<small>File SHA-256</small>
							<code>{result.sha256}</code>
						</div>
						{result.textSha256 ? (
							<div className="upload-success__hash" style={{ marginTop: '0.5rem' }}>
								<small>Normalized Text SHA-256</small>
								<code>{result.textSha256}</code>
							</div>
						) : null}
						<div style={{ marginTop: '1rem' }}>
							<Button onClick={onClose}>Done</Button>
						</div>
					</div>
				) : (
					<form className="form-grid modal__form" onSubmit={submit}>
						<button
							type="button"
							className={`file-drop ${file ? 'has-file' : ''}`}
							onClick={() => inputRef.current?.click()}
							disabled={loading}
						>
							<span className="file-drop__icon">
								{loading ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
							</span>
							<strong>{file ? file.name : 'Choose a PDF document'}</strong>
							<span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : 'PDF documents only · maximum 20 MB'}</span>
						</button>

						<input
							ref={inputRef}
							className="sr-only"
							type="file"
							accept=".pdf,application/pdf"
							onChange={(event) => setFile(event.target.files?.[0] || null)}
							disabled={loading}
						/>

						{loading ? (
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color, #38bdf8)', fontSize: '0.875rem' }}>
								<Loader2 size={16} className="animate-spin" />
								<span>{processingStep || 'Processing document...'}</span>
							</div>
						) : null}

						{error ? (
							<div className="error-banner" role="alert">
								<AlertCircle size={16} />
								{error}
							</div>
						) : null}

						<footer className="modal__footer">
							<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
								Cancel
							</Button>
							<Button type="submit" icon={UploadCloud} disabled={loading}>
								{loading ? 'Processing & verifying…' : 'Upload document'}
							</Button>
						</footer>
					</form>
				)}
			</section>
		</div>
	);
}
