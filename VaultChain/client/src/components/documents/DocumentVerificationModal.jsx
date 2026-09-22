import { AlertCircle, Check, FileCheck2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';
import LoadingState from '../ui/LoadingState';
import StatusBadge from '../ui/StatusBadge';
import DocumentThumbnail from './DocumentThumbnail';
import VerificationResult from './VerificationResult';
import { formatDhakaTime } from '../../utils/date';

export default function DocumentVerificationModal({ document, documents = [], open, onClose, onVerified }) {
	const [allDocuments, setAllDocuments] = useState([]);
	const [fetchingDocs, setFetchingDocs] = useState(true);
	const [referenceDocumentId, setReferenceDocumentId] = useState('');
	const [showPicker, setShowPicker] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [verification, setVerification] = useState(null);
	const [history, setHistory] = useState(null);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	// Load fresh complete document list immediately on open
	useEffect(() => {
		if (!open) return;
		let active = true;
		setFetchingDocs(true);
		documentService.list()
			.then((list) => {
				if (active && Array.isArray(list)) {
					setAllDocuments(list);
				}
			})
			.catch(() => {
				if (active && documents?.length) {
					setAllDocuments(documents);
				}
			})
			.finally(() => {
				if (active) setFetchingDocs(false);
			});
		return () => { active = false; };
	}, [open, documents]);

	// Filter and sort candidates. Matching search query automatically floats to the top!
	const references = useMemo(() => {
		const pool = (allDocuments.length > 0 ? allDocuments : documents)
			.filter((candidate) => candidate.id !== document?.id);

		const q = searchQuery.trim().toLowerCase();
		if (!q) {
			return pool.sort((a, b) => b.id - a.id);
		}

		// Calculate match priority: name exact/start = 3, name includes = 2, reference/hash includes = 1, else 0
		return pool
			.map((doc) => {
				const name = (doc.originalName || '').toLowerCase();
				const ref = (doc.reference || '').toLowerCase();
				const hash = (doc.sha256 || '').toLowerCase();
				let score = 0;
				if (name === q || name.startsWith(q)) score = 3;
				else if (name.includes(q)) score = 2;
				else if (ref.includes(q) || hash.includes(q)) score = 1;
				return { doc, score };
			})
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score || b.doc.id - a.doc.id)
			.map((item) => item.doc);
	}, [document?.id, allDocuments, documents, searchQuery]);

	const selectedReference = useMemo(() => {
		const pool = allDocuments.length > 0 ? allDocuments : documents;
		return pool.find((d) => String(d.id) === String(referenceDocumentId)) || null;
	}, [referenceDocumentId, allDocuments, documents]);

	useEffect(() => {
		if (!open || !document) return;
		setReferenceDocumentId('');
		setShowPicker(false);
		setSearchQuery('');
		setVerification(null);
		setHistory(null);
		setError('');
		setLoading(false);
		let active = true;
		documentService.getReport(document.id)
			.then((result) => { if (active) setHistory(result); })
			.catch(() => { if (active) setHistory([]); });
		return () => { active = false; };
	}, [open, document?.id]);

	if (!open || !document) return null;

	async function submit(event) {
		event.preventDefault();
		setError('');
		if (!referenceDocumentId) {
			setError('Choose a reference document.');
			return;
		}
		setLoading(true);
		try {
			const result = await documentService.verify(document.id, Number(referenceDocumentId));
			setVerification(result);
			setHistory((current) => [result, ...(current || [])]);
			onVerified?.(result);
		} catch (verificationError) {
			setError(verificationError.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-verification-title">
			<button className="modal__backdrop" aria-label="Close" onClick={loading ? undefined : onClose} />
			<section className="modal__card ocr-modal">
				<header className="modal__header">
					<div>
						<span className="modal__icon"><FileCheck2 size={19} /></span>
						<div>
							<h2 id="document-verification-title">Verify document</h2>
							<p>Compare {document.originalName} with a reference document.</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} disabled={loading} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				<div className="ocr-modal__body">
					{error ? <div className="error-banner" role="alert"><AlertCircle size={16} />{error}</div> : null}

					{verification ? (
						<VerificationResult verification={verification} />
					) : (
						<form className="form-grid" onSubmit={submit}>
							<div className="compare-selector">
								<div className="compare-selector__top">
									<label style={{ margin: 0, fontWeight: 600 }}>Reference document</label>
									<Button
										type="button"
										size="sm"
										variant={showPicker ? 'primary' : 'secondary'}
										icon={Search}
										onClick={() => setShowPicker((prev) => !prev)}
										disabled={loading}
									>
										{showPicker ? 'Close Search' : 'Compare'}
									</Button>
								</div>

								{showPicker ? (
									<div className="compare-picker">
										<div className="compare-picker__search">
											<Search size={15} color="var(--text-muted)" />
											<input
												autoFocus
												type="text"
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												placeholder="Type to search document (matching items float to top)..."
												aria-label="Search reference document"
											/>
											{searchQuery ? (
												<button type="button" className="icon-button" onClick={() => setSearchQuery('')} aria-label="Clear search">
													<X size={14} />
												</button>
											) : null}
										</div>

										{fetchingDocs ? (
											<LoadingState label="Loading available documents..." />
										) : references.length === 0 ? (
											<p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>
												{searchQuery ? 'No documents matched your search.' : 'No other documents available to compare.'}
											</p>
										) : (
											<div className="compare-picker__list">
												{references.map((reference) => {
													const isSelected = String(reference.id) === String(referenceDocumentId);
													return (
														<button
															type="button"
															key={reference.id}
															className={`compare-picker__item ${isSelected ? 'is-selected' : ''}`}
															onClick={() => {
																setReferenceDocumentId(reference.id);
																setShowPicker(false);
															}}
														>
															<DocumentThumbnail document={reference} size={36} />
															<div className="compare-picker__identity">
																<strong>{reference.originalName}</strong>
																<span>{reference.reference} · OCR {reference.ocrStatus} · {formatDhakaTime(reference.createdAt)}</span>
															</div>
															<StatusBadge tone={isSelected ? 'success' : 'neutral'}>
																{isSelected ? 'Selected' : 'Select'}
															</StatusBadge>
														</button>
													);
												})}
											</div>
										)}
									</div>
								) : (
									<>
										{selectedReference ? (
											<div className="selected-reference-card">
												<div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
													<DocumentThumbnail document={selectedReference} size={38} />
													<div style={{ minWidth: 0 }}>
														<strong style={{ display: 'block', fontSize: '0.76rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
															{selectedReference.originalName}
														</strong>
														<span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
															{selectedReference.reference} · OCR {selectedReference.ocrStatus}
														</span>
													</div>
												</div>
												<Button type="button" size="sm" variant="ghost" onClick={() => setShowPicker(true)}>
													Change
												</Button>
											</div>
										) : (
											<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
												<select
													value={referenceDocumentId}
													onChange={(e) => setReferenceDocumentId(e.target.value)}
													disabled={loading || fetchingDocs}
													style={{ flex: 1 }}
												>
													<option value="">Select a reference document or click Compare</option>
													{references.map((reference) => (
														<option key={reference.id} value={reference.id}>
															{reference.originalName} ({reference.reference}) · OCR {reference.ocrStatus}
														</option>
													))}
												</select>
											</div>
										)}
									</>
								)}
							</div>

							{!selectedReference && references.length === 0 && !fetchingDocs ? (
								<div className="info-banner">Upload another document before starting verification.</div>
							) : null}

							<footer>
								<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
									Cancel
								</Button>
								<Button type="submit" icon={FileCheck2} disabled={loading || !referenceDocumentId}>
									{loading ? 'Verifying…' : 'Verify'}
								</Button>
							</footer>
						</form>
					)}

					{verification ? (
						<footer>
							<Button variant="secondary" onClick={() => { setVerification(null); setReferenceDocumentId(''); }}>
								Compare again
							</Button>
							<Button onClick={onClose}>Done</Button>
						</footer>
					) : null}

					{history?.length ? (
						<section>
							<h3>Verification history</h3>
							<div className="document-list">
								{history.map((entry) => (
									<div className="document-item" key={entry.id}>
										<div className="document-item__identity">
											<strong>{entry.referenceDocumentName}</strong>
											<small>{formatDhakaTime(entry.createdAt)}</small>
										</div>
										<VerificationResult verification={entry} compact />
									</div>
								))}
							</div>
						</section>
					) : null}
				</div>
			</section>
		</div>
	);
}
