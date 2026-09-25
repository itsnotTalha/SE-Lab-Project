import { AlertCircle, Download, FileText, Files, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';
import LoadingState from '../ui/LoadingState';

export default function DocumentPreviewModal({ document, onClose }) {
	const isPdf = !document.mimeType || document.mimeType === 'application/pdf' || document.category === 'pdf';
	const [viewMode, setViewMode] = useState(isPdf ? 'all' : 'first');
	const [imageUrl, setImageUrl] = useState('');
	const [downloadUrl, setDownloadUrl] = useState('');
	const [error, setError] = useState('');
	const [zoom, setZoom] = useState(1);
	const contentRef = useRef(null);

	useEffect(() => {
		let thumbObjectUrl = '';
		let downloadObjectUrl = '';
		let active = true;

		// Load thumbnail for first-page zoom view
		documentService
			.getThumbnailObjectUrl(document.id)
			.then((url) => {
				thumbObjectUrl = url;
				if (active) setImageUrl(url);
				else URL.revokeObjectURL(url);
			})
			.catch((loadError) => {
				if (active) setError(loadError.message || 'Unable to load document preview');
			});

		// Load full original document content (PDF/image) for all-page viewing
		documentService
			.getContentObjectUrl(document.id)
			.then((url) => {
				downloadObjectUrl = url;
				if (active) setDownloadUrl(url);
				else URL.revokeObjectURL(url);
			})
			.catch((contentError) => {
				if (active && !downloadObjectUrl) {
					console.warn('Failed to load full content object url:', contentError.message);
				}
			});

		return () => {
			active = false;
			if (thumbObjectUrl) URL.revokeObjectURL(thumbObjectUrl);
			if (downloadObjectUrl) URL.revokeObjectURL(downloadObjectUrl);
		};
	}, [document.id]);

	function handleZoomIn() {
		setZoom((prev) => Math.min(3.5, Number((prev + 0.25).toFixed(2))));
	}

	function handleZoomOut() {
		setZoom((prev) => Math.max(0.75, Number((prev - 0.25).toFixed(2))));
	}

	function handleResetZoom() {
		setZoom(1);
	}

	function handleToggleZoom() {
		setZoom((prev) => (prev > 1.2 ? 1 : 2));
	}

	return (
		<div className="modal document-preview" role="dialog" aria-modal="true" aria-labelledby="document-preview-title">
			<button className="modal__backdrop" aria-label="Close" onClick={onClose} />
			<section className="modal__card document-preview__card" style={{ width: 'min(98vw, 1100px)' }}>
				<header className="modal__header">
					<div>
						<span className="modal__icon">
							<FileText size={19} />
						</span>
						<div>
							<h2 id="document-preview-title">{document.originalName}</h2>
							<p className="document-preview__subtitle">
								{viewMode === 'all'
									? `Full Document Viewer · All Pages ${document.pageCount ? `(${document.pageCount} pages)` : ''}`
									: `First Page Zoom View · Page 1 ${document.pageCount ? `of ${document.pageCount}` : ''}`}
							</p>
						</div>
					</div>

					<div className="document-modal-actions">
						{/* Mode Switcher for PDFs: All Pages vs First Page */}
						{isPdf ? (
							<div className="doc-view-mode-toggle" role="tablist" aria-label="View modes">
								<button
									type="button"
									className={`doc-mode-btn ${viewMode === 'all' ? 'active' : ''}`}
									onClick={() => setViewMode('all')}
									title="View all pages in full PDF scrollable viewer"
								>
									<Files size={14} />
									<span>All Pages {document.pageCount ? `(${document.pageCount})` : ''}</span>
								</button>
								<button
									type="button"
									className={`doc-mode-btn ${viewMode === 'first' ? 'active' : ''}`}
									onClick={() => setViewMode('first')}
									title="Inspect first page with zoom controls"
								>
									<FileText size={14} />
									<span>First Page</span>
								</button>
							</div>
						) : null}

						{/* Interactive Zoom Toolbar (shown in first-page mode or images) */}
						{viewMode === 'first' || !isPdf ? (
							<div className="doc-zoom-toolbar" role="toolbar" aria-label="Zoom controls">
								<button
									type="button"
									className="doc-zoom-btn"
									onClick={handleZoomOut}
									disabled={zoom <= 0.75}
									title="Zoom Out"
									aria-label="Zoom out"
								>
									<ZoomOut size={15} />
								</button>
								<button
									type="button"
									className="doc-zoom-label"
									onClick={handleResetZoom}
									title="Reset to 100%"
								>
									{Math.round(zoom * 100)}%
								</button>
								<button
									type="button"
									className="doc-zoom-btn"
									onClick={handleZoomIn}
									disabled={zoom >= 3.5}
									title="Zoom In"
									aria-label="Zoom in"
								>
									<ZoomIn size={15} />
								</button>
								{zoom !== 1 && (
									<button
										type="button"
										className="doc-zoom-btn"
										onClick={handleResetZoom}
										title="Reset Zoom"
										aria-label="Reset zoom"
									>
										<RotateCcw size={13} />
									</button>
								)}
							</div>
						) : null}

						{downloadUrl ? (
							<a
								className="button button--secondary button--sm"
								href={downloadUrl}
								download={document.originalName}
								title="Download original file"
							>
								<Download size={16} />
								<span>Download</span>
							</a>
						) : null}

						<button type="button" className="icon-button" onClick={onClose} aria-label="Close">
							<X size={18} />
						</button>
					</div>
				</header>

				<div className="document-preview__content" ref={contentRef} style={{ height: 'min(78vh, 820px)', padding: 0 }}>
					{error && !downloadUrl && !imageUrl ? (
						<div className="assets-error" style={{ padding: '2rem' }}>
							<span>
								<AlertCircle size={22} />
							</span>
							<h2>Preview unavailable</h2>
							<p>{error}</p>
						</div>
					) : viewMode === 'all' && isPdf ? (
						!downloadUrl ? (
							<LoadingState label="Loading complete PDF with all pages…" />
						) : (
							<div className="doc-full-pdf-stage" style={{ width: '100%', height: '100%' }}>
								<iframe
									src={`${downloadUrl}#toolbar=1&navpanes=1&view=FitH`}
									title={`Complete PDF preview of ${document.originalName}`}
									className="doc-pdf-viewer-frame"
									style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
								/>
							</div>
						)
					) : !imageUrl ? (
						<LoadingState label="Loading page preview…" />
					) : (
						<div
							className="doc-first-page-stage"
							onDoubleClick={handleToggleZoom}
							title="Double-click to toggle zoom · Drag/scroll to inspect"
							style={{ padding: '24px', overflow: 'auto' }}
						>
							<img
								src={imageUrl}
								alt={`Preview of ${document.originalName}`}
								className="doc-first-page-img"
								style={{
									transform: `scale(${zoom})`,
									transformOrigin: 'top center',
									transition: 'transform 0.15s ease-out',
								}}
							/>
						</div>
					)}
				</div>
			</section>
		</div>
	);
}
