import { AlertCircle, CheckCircle2, FileText, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';

const ACCEPTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

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
		if (!file) { setError('Choose a PDF, PNG, JPG, JPEG, or WEBP document.'); return; }
		if (!ACCEPTED_TYPES.has(file.type)) { setError('Only PDF, PNG, JPG, JPEG, and WEBP documents are supported.'); return; }
		if (file.size > 20 * 1024 * 1024) { setError('Document size must not exceed 20 MB.'); return; }
		setLoading(true);
		try {
			const document = await documentService.upload(file);
			setResult(document);
			onUploaded(document);
		} catch (uploadError) { setError(uploadError.message); }
		finally { setLoading(false); }
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
			<button className="modal__backdrop" aria-label="Close" onClick={loading ? undefined : onClose} />
			<section className="modal__card">
				<header className="modal__header">
					<div>
						<span className="modal__icon"><UploadCloud size={19} /></span>
						<div>
							<h2 id="document-upload-title">Upload document</h2>
							<p>Store the file, fingerprint it, and extract available text.</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				{result ? (
					<div className="upload-success">
						<span><CheckCircle2 size={30} /></span>
						<h3>Document stored</h3>
						<p>{result.originalName} was uploaded and OCR status is <strong>{result.ocrStatus}</strong>.</p>
						
						<div className="upload-success__hash">
							<small>SHA-256</small>
							<code style={{ wordBreak: 'break-all' }}>{result.sha256}</code>
						</div>

						{result.duplicateInfo ? (
							<div
								style={{
									margin: '14px 0',
									padding: '12px 14px',
									borderRadius: '10px',
									border: '1px solid var(--border)',
									background: result.duplicateInfo.status === 'original' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
									textAlign: 'left',
									fontSize: '0.74rem',
									display: 'grid',
									gap: '6px',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
									<strong style={{ color: result.duplicateInfo.status === 'original' ? '#10b981' : '#f59e0b' }}>
										{result.duplicateInfo.matchType === 'exact_sha256'
											? '⚠️ Exact Duplicate File'
											: result.duplicateInfo.status === 'original'
											? 'ℹ️ Identical Content'
											: 'ℹ️ Modified Document Detected'}
									</strong>
									<span style={{ fontWeight: 700, color: result.duplicateInfo.status === 'original' ? '#10b981' : '#f59e0b' }}>
										{result.duplicateInfo.status === 'original' ? '100% Original' : `${result.duplicateInfo.modificationPercent}% Modified`}
									</span>
								</div>

								<p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
									{result.duplicateInfo.message}
								</p>

								{result.duplicateInfo.matchedDocument ? (
									<div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
										Existing match: <strong>{result.duplicateInfo.matchedDocument.originalName}</strong> ({result.duplicateInfo.matchedDocument.reference})
									</div>
								) : null}
							</div>
						) : (
							<div style={{ margin: '12px 0 6px', fontSize: '0.7rem', color: '#10b981' }}>
								✨ Unique document — no duplicate found.
							</div>
						)}

						<Button onClick={onClose} style={{ marginTop: '8px' }}>Done</Button>
					</div>
				) : (
					<form className="form-grid modal__form" onSubmit={submit}>
						<button
							type="button"
							className={`file-drop ${file ? 'has-file' : ''}`}
							onClick={() => inputRef.current?.click()}
						>
							<span className="file-drop__icon"><FileText size={24} /></span>
							<strong>{file ? file.name : 'Choose a document'}</strong>
							<span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : 'PDF, PNG, JPG, JPEG, or WEBP · maximum 20 MB'}</span>
						</button>
						<input
							ref={inputRef}
							className="sr-only"
							type="file"
							accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
							onChange={(event) => setFile(event.target.files?.[0] || null)}
						/>
						{error ? <div className="error-banner" role="alert"><AlertCircle size={16} />{error}</div> : null}
						<footer className="modal__footer">
							<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
							<Button type="submit" icon={UploadCloud} disabled={loading}>{loading ? 'Uploading & extracting…' : 'Upload document'}</Button>
						</footer>
					</form>
				)}
			</section>
		</div>
	);
}
