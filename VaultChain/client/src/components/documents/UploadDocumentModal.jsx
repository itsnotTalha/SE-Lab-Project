import { AlertCircle, CheckCircle2, FileText, Trash2, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';

const ACCEPTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

export default function UploadDocumentModal({ open, onClose, onUploaded, onDeleted }) {
	const inputRef = useRef(null);
	const [file, setFile] = useState(null);
	const [ocrMode, setOcrMode] = useState('printed');
	const [loading, setLoading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);

	useEffect(() => {
		if (!open) return;
		setFile(null); setError(''); setResult(null); setLoading(false); setDeleting(false); setOcrMode('printed');
	}, [open]);

	if (!open) return null;

	async function submit(event) {
		event.preventDefault(); setError('');
		if (!file) { setError('Choose a PDF, PNG, JPG, JPEG, or WEBP document.'); return; }
		if (!ACCEPTED_TYPES.has(file.type)) { setError('Only PDF, PNG, JPG, JPEG, and WEBP documents are supported.'); return; }
		if (file.size > 20 * 1024 * 1024) { setError('Document size must not exceed 20 MB.'); return; }
		setLoading(true);
		try {
			const document = await documentService.upload(file, ocrMode);
			setResult(document);
			if (!document.duplicateInfo?.isDuplicate) {
				onUploaded?.(document);
			}
		} catch (uploadError) { setError(uploadError.message); }
		finally { setLoading(false); }
	}

	async function handleDeleteDuplicate() {
		if (!result?.id) return;
		setDeleting(true);
		setError('');
		try {
			await documentService.remove(result.id);
			onDeleted?.(result);
			onClose();
			window.alert('Duplicate document deleted');
		} catch (err) {
			setError(err.message || 'Failed to delete duplicate document');
			setDeleting(false);
		}
	}

	const isDuplicate = Boolean(result?.duplicateInfo?.isDuplicate);

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
			<button
				className="modal__backdrop"
				aria-label="Close"
				onClick={loading || deleting ? undefined : isDuplicate ? handleDeleteDuplicate : onClose}
			/>
			<section className="modal__card">
				<header className="modal__header">
					<div>
						<span className="modal__icon"><UploadCloud size={19} /></span>
						<div>
							<h2 id="document-upload-title">Upload document</h2>
							<p>Store the file, fingerprint it, and extract available text.</p>
						</div>
					</div>
					<button
						type="button"
						className="icon-button"
						onClick={isDuplicate ? handleDeleteDuplicate : onClose}
						disabled={loading || deleting}
						aria-label="Close"
					>
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
									background: result.duplicateInfo.status === 'original' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
									textAlign: 'left',
									fontSize: '0.74rem',
									display: 'grid',
									gap: '6px',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
									<strong style={{ color: result.duplicateInfo.status === 'original' ? '#10b981' : '#f59e0b', fontSize: '0.8rem' }}>
										{result.duplicateInfo.matchType === 'exact_sha256'
											? '⚠️ Duplicate Document (Exact Match)'
											: result.duplicateInfo.status === 'original'
											? 'ℹ️ Duplicate Document (100% Text Match)'
											: 'ℹ️ Similar / Modified Document Found'}
									</strong>
									<span
										style={{
											padding: '2px 8px',
											borderRadius: '6px',
											fontWeight: 700,
											fontSize: '0.68rem',
											background: result.duplicateInfo.status === 'original' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
											color: result.duplicateInfo.status === 'original' ? '#10b981' : '#f59e0b',
										}}
									>
										{result.duplicateInfo.status === 'original' ? 'Original (100%)' : `${result.duplicateInfo.modificationPercent}% Modified`}
									</span>
								</div>

								<div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px', fontSize: '0.7rem' }}>
									<span>
										<strong>SHA-256:</strong>{' '}
										<span style={{ color: result.duplicateInfo.sha256Match ? '#10b981' : 'var(--text-muted)' }}>
											{result.duplicateInfo.sha256Match ? 'Identical (Match)' : 'Different'}
										</span>
									</span>
									<span>
										<strong>OCR Match:</strong>{' '}
										<span style={{ color: result.duplicateInfo.ocrMatchPercent >= 90 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
											{result.duplicateInfo.ocrMatchPercent}%
										</span>
									</span>
								</div>

								<p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
									{result.duplicateInfo.message}
								</p>

								{result.duplicateInfo.matchedDocument ? (
									<div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border)', paddingTop: '5px' }}>
										Matched with existing: <strong>{result.duplicateInfo.matchedDocument.originalName}</strong> ({result.duplicateInfo.matchedDocument.reference})
									</div>
								) : null}
							</div>
						) : (
							<div style={{ margin: '12px 0 6px', fontSize: '0.7rem', color: '#10b981' }}>
								✨ Unique document — no duplicate found on server.
							</div>
						)}

						{result.duplicateInfo?.isDuplicate ? (
							<div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
								<Button
									type="button"
									variant="danger"
									icon={Trash2}
									disabled={deleting}
									onClick={handleDeleteDuplicate}
									style={{ width: '100%', justifyContent: 'center' }}
								>
									{deleting ? 'Deleting duplicate…' : 'Delete duplicate'}
								</Button>
							</div>
						) : (
							<Button onClick={onClose} style={{ marginTop: '8px' }}>Done</Button>
						)}
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

						<div style={{ display: 'grid', gap: '8px', margin: '4px 0 2px' }}>
							<label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
								Recognition Mode:
							</label>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
								<button
									type="button"
									onClick={() => setOcrMode('printed')}
									style={{
										padding: '9px 12px',
										borderRadius: '8px',
										border: ocrMode === 'printed' ? '2px solid #3b82f6' : '1px solid var(--border)',
										background: ocrMode === 'printed' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
										color: ocrMode === 'printed' ? '#60a5fa' : 'var(--text-secondary)',
										cursor: 'pointer',
										textAlign: 'left',
										display: 'grid',
										gap: '2px',
										transition: 'all 0.15s ease',
									}}
								>
									<strong style={{ fontSize: '0.78rem' }}>📄 Standard OCR</strong>
									<span style={{ fontSize: '0.66rem', opacity: 0.8 }}>Printed text & scanned forms</span>
								</button>

								<button
									type="button"
									onClick={() => setOcrMode('handwritten')}
									style={{
										padding: '9px 12px',
										borderRadius: '8px',
										border: ocrMode === 'handwritten' ? '2px solid #8b5cf6' : '1px solid var(--border)',
										background: ocrMode === 'handwritten' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-secondary)',
										color: ocrMode === 'handwritten' ? '#a78bfa' : 'var(--text-secondary)',
										cursor: 'pointer',
										textAlign: 'left',
										display: 'grid',
										gap: '2px',
										transition: 'all 0.15s ease',
									}}
								>
									<strong style={{ fontSize: '0.78rem' }}>✍️ TrOCR (Handwritten)</strong>
									<span style={{ fontSize: '0.66rem', opacity: 0.8 }}>Local Apple Silicon MPS</span>
								</button>
							</div>
						</div>

						{error ? <div className="error-banner" role="alert"><AlertCircle size={16} />{error}</div> : null}
						<footer className="modal__footer">
							<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
							<Button type="submit" icon={UploadCloud} disabled={loading}>
								{loading ? (ocrMode === 'handwritten' ? 'Running TrOCR HTR…' : 'Uploading & extracting…') : 'Upload document'}
							</Button>
						</footer>
					</form>
				)}
			</section>
		</div>
	);
}
