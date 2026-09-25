import { AlertCircle, Download, FileText, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { documentService } from '../../services/documentService';
import LoadingState from '../ui/LoadingState';

export default function DocumentPreviewModal({ document, onClose }) {
	const [imageUrl, setImageUrl] = useState('');
	const [downloadUrl, setDownloadUrl] = useState('');
	const [error, setError] = useState('');
	const [zoom, setZoom] = useState(1);
	const contentRef = useRef(null);

	useEffect(() => {
		let thumbObjectUrl = '';
		let downloadObjectUrl = '';
		let active = true;

		// Load ONLY the first page (front page) image
		documentService
			.getThumbnailObjectUrl(document.id)
			.then((url) => {
				thumbObjectUrl = url;
				if (active) setImageUrl(url);
				else URL.revokeObjectURL(url);
			})
			.catch((loadError) => {
				if (active) setError(loadError.message || 'Unable to load first page preview');
			});

		// Also prepare download URL for full original PDF
		documentService
			.getContentObjectUrl(document.id)
			.then((url) => {
				downloadObjectUrl = url;
				if (active) setDownloadUrl(url);
				else URL.revokeObjectURL(url);
			})
			.catch(() => {});

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
			<section className="modal__card document-preview__card">
				<header className="modal__header">
					<div>
						<span className="modal__icon">
							<FileText size={19} />
						</span>
						<div>
							<h2 id="document-preview-title">First Page Zoom Preview</h2>
							<p className="document-preview__subtitle">
								Showing page 1 only · {document.originalName} {document.pageCount ? `(1 of ${document.pageCount} pages)` : ''}
							</p>
						</div>
					</div>

					<div className="document-modal-actions">
						{/* Interactive Zoom Toolbar for First Page */}
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

						{downloadUrl ? (
							<a
								className="button button--secondary button--sm"
								href={downloadUrl}
								download={document.originalName}
								title="Download original document"
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

				<div className="document-preview__content" ref={contentRef}>
					{error ? (
						<div className="assets-error">
							<span>
								<AlertCircle size={22} />
							</span>
							<h2>Preview unavailable</h2>
							<p>{error}</p>
						</div>
					) : !imageUrl ? (
						<LoadingState label="Loading first page preview…" />
					) : (
						<div
							className="doc-first-page-stage"
							onDoubleClick={handleToggleZoom}
							title="Double-click to toggle zoom · Drag/scroll to inspect"
						>
							<img
								src={imageUrl}
								alt={`First page of ${document.originalName}`}
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
