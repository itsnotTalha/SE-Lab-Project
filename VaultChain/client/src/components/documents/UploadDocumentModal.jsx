import { AlertCircle, AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, Loader2, ScanLine, Search, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { assetService } from '../../services/assetService';
import { documentService } from '../../services/documentService';
import Button from '../ui/Button';

const PDF_TYPES = new Set(['application/pdf']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function formatFileSize(bytes) {
	if (!bytes) return '0 KB';
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function UploadDocumentModal({ open, onClose, onUploaded }) {
	const inputRef = useRef(null);
	const [file, setFile] = useState(null);
	const [customName, setCustomName] = useState('');
	const [category, setCategory] = useState('pdf');
	const [description, setDescription] = useState('');
	const [loading, setLoading] = useState(false);
	const [progress, setProgress] = useState(0);
	const [searchingStage, setSearchingStage] = useState('');
	const [error, setError] = useState('');
	const [duplicateInfo, setDuplicateInfo] = useState(null);
	const [result, setResult] = useState(null);

	useEffect(() => {
		if (!open) return;
		setFile(null);
		setCustomName('');
		setCategory('pdf');
		setDescription('');
		setError('');
		setDuplicateInfo(null);
		setResult(null);
		setLoading(false);
		setProgress(0);
		setSearchingStage('');
	}, [open]);

	if (!open) return null;

	function handleFileSelect(selectedFile) {
		if (!selectedFile) return;
		setFile(selectedFile);
		setCustomName(selectedFile.name);
		setError('');
		setDuplicateInfo(null);

		const isImage = IMAGE_TYPES.has(selectedFile.type) || /\.(png|jpe?g|webp)$/i.test(selectedFile.name);
		if (isImage) {
			setCategory('image');
		} else if (PDF_TYPES.has(selectedFile.type) || /\.pdf$/i.test(selectedFile.name)) {
			setCategory('pdf');
		}
	}

	async function submit(event) {
		event.preventDefault();
		setError('');
		setDuplicateInfo(null);

		if (!file) {
			setError('Please choose a file to upload.');
			return;
		}

		const isPdf = PDF_TYPES.has(file.type) || file.name.toLowerCase().endsWith('.pdf');
		const isImage = IMAGE_TYPES.has(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);

		if (category === 'pdf' && !isPdf) {
			setError('Selected category is PDF, but the chosen file is not a PDF.');
			return;
		}
		if (category === 'image' && !isImage) {
			setError('Selected category is Image, but the chosen file is not an image (PNG, JPG, WebP).');
			return;
		}
		if (!isPdf && !isImage) {
			setError('Only PDF documents and images (PNG, JPG, WebP) are supported.');
			return;
		}
		if (file.size > 20 * 1024 * 1024) {
			setError('Document size must not exceed 20 MB.');
			return;
		}

		setLoading(true);
		setProgress(12);
		setSearchingStage('Generating SHA-256 cryptographic fingerprint...');

		// Simulated progress ticks during hashing, OCR & duplicate search
		const timer = setInterval(() => {
			setProgress((prev) => {
				if (prev < 32) {
					setSearchingStage('Searching vault archives for existing identical data & duplicate hashes...');
					return prev + 6;
				}
				if (prev < 68) {
					setSearchingStage('Running Gemini Multimodal OCR text & diagram analysis...');
					return prev + 5;
				}
				if (prev < 88) {
					setSearchingStage('Checking semantic content duplication against registered records...');
					return prev + 3;
				}
				if (prev < 95) {
					setSearchingStage('Finalizing cryptographic integrity & registering to library...');
					return prev + 1;
				}
				return prev;
			});
		}, 380);

		try {
			let uploadedItem;
			if (category === 'image') {
				const assetResponse = await assetService.uploadAsset({
					title: customName.trim() || file.name,
					category: 'image',
					description: description.trim(),
					file,
				});
				uploadedItem = {
					isAsset: true,
					id: assetResponse.asset?.id,
					originalName: assetResponse.asset?.title || customName.trim() || file.name,
					sha256: assetResponse.hash?.sha256,
					phash: assetResponse.hash?.phash,
					asset: assetResponse.asset,
				};
			} else {
				uploadedItem = await documentService.upload(file, {
					name: customName.trim() || file.name,
					description: description.trim(),
					category: 'pdf',
				});
			}

			clearInterval(timer);
			setProgress(100);
			setSearchingStage('Integrity check complete! Document verified & registered.');
			setTimeout(() => {
				setResult(uploadedItem);
				onUploaded(uploadedItem);
			}, 350);
		} catch (uploadError) {
			clearInterval(timer);
			if (uploadError.duplicate) {
				setDuplicateInfo(uploadError.duplicate);
			} else {
				setError(uploadError.message || 'Failed to upload document.');
			}
		} finally {
			clearInterval(timer);
			setLoading(false);
		}
	}

	const acceptedFilter = category === 'pdf' ? '.pdf,application/pdf' : '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-upload-title">
			<button className="modal__backdrop" aria-label="Close" onClick={loading ? undefined : onClose} />
			<section className="modal__card" style={{ maxWidth: '640px' }}>
				<header className="modal__header">
					<div>
						<span className="modal__icon"><UploadCloud size={19} /></span>
						<div>
							<h2 id="document-upload-title">Upload & Verify Document</h2>
							<p>Duplicate detection scan, Gemini Multimodal OCR, and SHA-256 registration.</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				{duplicateInfo ? (
					<div className="upload-duplicate-panel" style={{ padding: '1.5rem', textAlign: 'left', background: 'var(--surface)', borderRadius: '12px', border: '1px solid #eab308' }}>
						<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#eab308', marginBottom: '1rem' }}>
							<AlertTriangle size={28} />
							<div>
								<h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Duplicate Document Detected</h3>
								<p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
									{duplicateInfo.duplicateType === 'exact'
										? 'Exact file match: This identical file is already stored in the vault.'
										: 'Content duplicate: Extracted text is 100% identical to an existing document.'}
								</p>
							</div>
						</div>

						<div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.9rem', borderRadius: '8px', fontSize: '0.875rem', lineHeight: '1.6' }}>
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
						<h3>{result.isAsset ? 'Digital Asset Registered' : 'Document Stored Successfully'}</h3>
						<p>{result.originalName} has been verified, scanned, and registered.</p>
						<div className="upload-success__hash">
							<small>File SHA-256</small>
							<code>{result.sha256}</code>
						</div>
						{result.isAsset && result.phash ? (
							<div className="upload-success__hash" style={{ marginTop: '0.5rem' }}>
								<small>Perceptual Hash (pHash)</small>
								<code>{result.phash}</code>
							</div>
						) : null}
						{!result.isAsset && result.textSha256 ? (
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
						{/* Animated Searching & Duplicate Checking Scanner Area during Upload */}
						{loading ? (
							<div className="doc-scanner-box" aria-live="polite">
								<div className="doc-scanner-beam" />
								<div className="doc-scanner-radar">
									<div className="doc-scanner-radar__wave" />
									<ScanLine size={28} className="doc-scanner-radar__icon" />
								</div>
								<h4 className="doc-scanner-title">Searching Vault & Duplicate Records</h4>
								<p className="doc-scanner-status">{searchingStage}</p>

								{/* Animated 0% - 100% Progress Bar */}
								<div className="doc-progress-wrap">
									<div className="doc-progress-header">
										<span>Scanning & Verifying Pipeline</span>
										<strong>{progress}%</strong>
									</div>
									<div className="doc-progress-track">
										<div className="doc-progress-fill" style={{ width: `${progress}%` }} />
									</div>
								</div>

								{/* Selected File Badge right below the progress bar */}
								<div className="doc-progress-file">
									{category === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
									<span className="doc-progress-file__name">{customName || file?.name}</span>
									<span className="doc-progress-file__size">({formatFileSize(file?.size)})</span>
								</div>
							</div>
						) : (
							<>
								{/* File Selection Drop Area */}
								<button
									type="button"
									className={`file-drop ${file ? 'has-file' : ''}`}
									onClick={() => inputRef.current?.click()}
									disabled={loading}
								>
									<span className="file-drop__icon">
										{category === 'image' ? <ImageIcon size={24} /> : <FileText size={24} />}
									</span>
									<strong>{file ? file.name : `Choose a ${category === 'image' ? 'Image' : 'PDF'} document`}</strong>
									<span>
										{file
											? `${formatFileSize(file.size)} selected`
											: category === 'image'
											? 'PNG, JPG, WebP images · maximum 20 MB'
											: 'PDF documents only · maximum 20 MB'}
									</span>
								</button>

								<input
									ref={inputRef}
									className="sr-only"
									type="file"
									accept={acceptedFilter}
									onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
									disabled={loading}
								/>

								{/* Category Selection Dropdown */}
								<div className="doc-upload-grid">
									<div className="doc-upload-field">
										<label htmlFor="doc-category-select">Document Category</label>
										<select
											id="doc-category-select"
											value={category}
											onChange={(e) => {
												const newCat = e.target.value;
												setCategory(newCat);
												if (file) {
													const isPdf = file.name.toLowerCase().endsWith('.pdf');
													if (newCat === 'pdf' && !isPdf) setFile(null);
													if (newCat === 'image' && isPdf) setFile(null);
												}
											}}
										>
											<option value="pdf">PDF Document (.pdf)</option>
											<option value="image">Image Document (.png, .jpg, .jpeg, .webp)</option>
										</select>
									</div>

									{/* Editable File Name Input (Auto-filled on select, user can change) */}
									<div className="doc-upload-field">
										<label htmlFor="doc-name-input">File Name / Title</label>
										<input
											id="doc-name-input"
											type="text"
											value={customName}
											onChange={(e) => setCustomName(e.target.value)}
											placeholder="Auto-fills from file, edit if needed"
										/>
									</div>
								</div>

								{/* Description Option */}
								<div className="doc-upload-field">
									<label htmlFor="doc-description-input">Description (Optional)</label>
									<textarea
										id="doc-description-input"
										rows={2}
										value={description}
										onChange={(e) => setDescription(e.target.value)}
										placeholder="Add notes, subject details, or description about this document..."
									/>
								</div>
							</>
						)}

						{error ? (
							<div className="error-banner" role="alert" style={{ marginTop: '8px' }}>
								<AlertCircle size={16} />
								{error}
							</div>
						) : null}

						<footer className="modal__footer" style={{ marginTop: '14px' }}>
							<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
								Cancel
							</Button>
							<Button type="submit" icon={UploadCloud} disabled={loading || !file}>
								{loading ? 'Scanning & Verifying…' : 'Upload & Verify'}
							</Button>
						</footer>
					</form>
				)}
			</section>
		</div>
	);
}
